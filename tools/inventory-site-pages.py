#!/usr/bin/env python3
"""Read-only public WordPress/sitemap/link inventory; never deploys or edits a site."""
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import io
import json
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://krawlthroughkrakow.com'
SITEMAP_NS = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
USER_AGENT = 'Mozilla/5.0 (compatible; KTK-owner-read-only-page-inventory/1.0)'


def checked_at():
    try:
        return datetime.now(ZoneInfo('Europe/Warsaw')).isoformat()
    except ZoneInfoNotFoundError:
        # Windows Python may omit IANA tzdata; use Windows' own DST-aware zone.
        value = subprocess.check_output(['powershell', '-NoProfile', '-Command',
            "[TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTimeOffset]::UtcNow, 'Central European Standard Time').ToString('o')"], text=True)
        return value.strip()


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'text/html,application/json,application/xml;q=0.9,*/*;q=0.8'})
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return {'status': response.status, 'final_url': response.url, 'content_type': response.headers.get('Content-Type', ''),
                    'cache': response.headers.get('CF-Cache-Status'), 'total': response.headers.get('X-WP-Total'),
                    'total_pages': response.headers.get('X-WP-TotalPages'), 'text': response.read(8_000_000).decode('utf-8', errors='replace')}
    except urllib.error.HTTPError as error:
        return {'status': error.code, 'final_url': error.url, 'content_type': error.headers.get('Content-Type', ''),
                'text': error.read(500_000).decode('utf-8', errors='replace')}


def api_collection(base, endpoint):
    result = []
    page = 1
    while True:
        url = base + '/wp-json/wp/v2/' + endpoint + '?' + urllib.parse.urlencode({'per_page': 100, 'page': page, '_fields': 'id,title,slug,link,status,parent,template,count,name'})
        response = fetch(url)
        if response['status'] != 200 or 'json' not in response['content_type']:
            raise RuntimeError(f'Cannot inventory {url}: HTTP {response["status"]}')
        entries = json.loads(response['text'])
        if not isinstance(entries, list):
            raise RuntimeError(f'Expected API list for {endpoint}')
        result.extend(entries)
        if page >= int(response.get('total_pages') or 1):
            if response.get('total') and len(result) != int(response['total']):
                raise RuntimeError(f'Incomplete API pagination: {endpoint}')
            return result
        page += 1


def normalize(url):
    parsed = urllib.parse.urlsplit(url)
    if parsed.hostname not in ('krawlthroughkrakow.com', 'www.krawlthroughkrakow.com'):
        return None
    path = parsed.path or '/'
    if path.startswith(('/staging/', '/wp-', '/cdn-cgi/', '/feed/', '/comments/', '/xmlrpc.php')):
        return None
    if re.search(r'\.(?:jpe?g|png|webp|gif|svg|avif|ico|pdf|woff2?|ttf|eot|css|js|xml|txt|mp4|webm|zip|json)$', path, re.I):
        return None
    return ORIGIN + urllib.parse.quote(urllib.parse.unquote(path), safe="/!$&'()*+,;=:@~._-")


class Facts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = []
        self.headings = []
        self.current_heading = None
        self.in_title = False
        self.hidden_text = 0
        self.text = []
        self.links = []
        self.body_class = ''
        self.ids = set()
        self.scripts = []
        self.canonical = ''
        self.features = set()
        self.sections = 0
        self.form_count = 0
        self.map_count = 0
        self.iframes = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get('class', '').split()
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'body':
            self.body_class = attrs.get('class', '')
        if tag == 'title':
            self.in_title = True
        if tag in ('script', 'style', 'noscript'):
            self.hidden_text += 1
        if tag == 'script' and attrs.get('src'):
            self.scripts.append(attrs['src'])
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href', '')
        if tag in ('h1', 'h2', 'h3'):
            self.current_heading = {'level': tag, 'text': []}
        if 'et_pb_section' in classes:
            self.sections += 1
        if tag == 'form':
            self.form_count += 1
            self.features.add('form')
        if any('wpcf7' in value for value in classes):
            self.features.add('Contact Form 7')
        if any('gallery' in value for value in classes):
            self.features.add('gallery')
        if any('accordion' in value or 'et_pb_toggle' in value for value in classes):
            self.features.add('accordion/toggle')
        if any('countdown' in value for value in classes):
            self.features.add('countdown')
        if any('slider' in value for value in classes):
            self.features.add('slider')
        if tag == 'video':
            self.features.add('video')
        if tag == 'iframe':
            src = attrs.get('data-ktk-map-src') or attrs.get('data-lazy-src') or attrs.get('data-suppressedsrc') or attrs.get('src', '')
            self.iframes.append(src)
            if 'google.com/maps' in src:
                self.map_count += 1
                self.features.add('Google Maps')
            if any(host in src for host in ('youtube', 'vimeo')):
                self.features.add('embedded video')

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag in ('script', 'style', 'noscript'):
            self.hidden_text = max(0, self.hidden_text - 1)
        if self.current_heading and tag == self.current_heading['level']:
            value = ' '.join(' '.join(self.current_heading['text']).split())
            if value:
                self.headings.append({'level': tag, 'text': value})
            self.current_heading = None

    def handle_data(self, value):
        if self.in_title:
            self.title.append(value)
        if self.current_heading:
            self.current_heading['text'].append(value)
        if not self.hidden_text:
            self.text.append(value)


def inspect(url):
    response = fetch(url)
    parser = Facts()
    parser.feed(response['text'])
    if 'ktk-homepage-standalone' in parser.body_class:
        renderer = 'code-managed homepage'
    elif 'ktk-code-page' in parser.body_class:
        renderer = 'code-managed page'
    elif 'ktk-storefront-root' in parser.ids:
        renderer = 'code-managed storefront'
    elif urllib.parse.urlsplit(response['final_url']).path.startswith(('/store/', '/staging/store/')):
        renderer = 'legacy Ecwid store (not KTK code-managed)'
    elif response['status'] != 200:
        renderer = 'unverified/error'
    elif parser.sections or any('/themes/Divi/' in src for src in parser.scripts):
        renderer = 'WordPress/Divi'
    else:
        renderer = 'WordPress/theme or unverified'
    if 'imunify' in response['text'].lower() and 'bot-protection' in response['text'].lower():
        renderer = 'unverified/hosting challenge'
    return {
        'status': response['status'], 'final_url': response['final_url'], 'cache': response.get('cache'),
        'renderer': renderer, 'html_title': html.unescape(''.join(parser.title).strip()),
        'body_class': parser.body_class, 'canonical': parser.canonical, 'sections': parser.sections,
        'features': sorted(parser.features), 'form_count': parser.form_count, 'map_count': parser.map_count,
        'headings': parser.headings, 'text_length': len(' '.join(' '.join(parser.text).split())),
        'html_sha256': hashlib.sha256(response['text'].encode()).hexdigest(), 'links': parser.links,
    }


def clean_title(entry):
    title = entry.get('title', {})
    return html.unescape(title.get('rendered', '') if isinstance(title, dict) else title or entry.get('name', ''))


def table(rows):
    lines = ['| # | Page | URL | Renderer / Notes |', '| ---: | --- | --- | --- |']
    for index, row in enumerate(rows, 1):
        live = row.get('production', {})
        note = live.get('renderer', '')
        if live.get('status') != 200:
            note += f'; HTTP {live.get("status")}'
        if row.get('alias_target'):
            note += '; alias/redirect to ' + row['alias_target'] + ' (not a separate rebuild)'
        if row.get('staging', {}).get('renderer') == 'code-managed page':
            note += '; staging replica complete, production pending'
        features = [] if row.get('alias_target') else live.get('features', [])
        if features:
            note += '; ' + ', '.join(features)
        label = (row.get('title') or live.get('html_title') or '(untitled)').replace('|', '\\|')
        url = row['url'].replace('|', '%7C')
        lines.append(f'| {index} | {label} | [{urllib.parse.urlsplit(url).path}]({url}) | {note} |')
    return lines


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='docs/code-pages/site-inventory-' + checked_at()[:10])
    parser.add_argument('--delay', type=float, default=0.25)
    parser.add_argument('--max-extra', type=int, default=150)
    parser.add_argument('--expand-existing', action='store_true', help='Follow remaining links from the saved public audit, without refetching previously inspected routes.')
    args = parser.parse_args()
    out = ROOT / args.output
    out.mkdir(parents=True, exist_ok=True)
    if args.expand_existing:
        report = json.loads((out / 'inventory.json').read_text(encoding='utf-8'))
        expand_existing(report, args)
        render_reports(report, out)
        return
    report = {'checked_at': checked_at(),
              'method': 'Read-only public REST API + complete WordPress sitemap index + internal-link discovery + rendered HTML ownership markers. No authentication, uploads, content edits, code deployment, order submission or cache purge.',
              'unpublished_scope': 'Draft/private/pending/future/trashed pages are not enumerable through the public API; their totals are unverified, not zero.',
              'sources': [], 'entries': [], 'staging_pages': [], 'sitemaps': [], 'errors': []}
    by_url = {}
    for endpoint, kind in [('pages', 'page'), ('posts', 'blog post'), ('project', 'project'), ('categories', 'category archive'), ('tags', 'tag archive')]:
        items = api_collection(ORIGIN, endpoint)
        report['sources'].append({'source': ORIGIN + '/wp-json/wp/v2/' + endpoint, 'count': len(items)})
        for entry in items:
            url = normalize(entry['link'])
            if url:
                by_url[url] = {'url': url, 'id': entry['id'], 'kind': kind, 'title': clean_title(entry),
                               'wordpress_status': entry.get('status', 'generated archive'), 'parent': entry.get('parent', 0),
                               'sources': ['REST ' + endpoint]}
    report['staging_pages'] = api_collection(ORIGIN + '/staging', 'pages')
    index_response = fetch(ORIGIN + '/wp-sitemap.xml')
    index = ET.fromstring(index_response['text'])
    for loc in index.findall('s:sitemap/s:loc', SITEMAP_NS):
        response = fetch(loc.text)
        sitemap = ET.fromstring(response['text'])
        urls = [item.text for item in sitemap.findall('s:url/s:loc', SITEMAP_NS)]
        report['sitemaps'].append({'url': loc.text, 'count': len(urls), 'urls': urls})
        for value in urls:
            url = normalize(value)
            if not url:
                continue
            if url not in by_url:
                by_url[url] = {'url': url, 'id': None, 'kind': 'legacy store URL' if '/wp-sitemap-ecstore-' in loc.text else 'sitemap URL',
                               'title': '', 'sources': []}
            by_url[url]['sources'].append(loc.text)
    initial = sorted(by_url)
    # The code-owned storefront is routed by plugin, not a WordPress Page post.
    by_url.setdefault(ORIGIN + '/store2/', {'url': ORIGIN + '/store2/', 'kind': 'code-owned route', 'title': 'KTK storefront', 'sources': ['owned renderer route']})
    discovered = {}
    for index, row in enumerate(list(by_url.values()), 1):
        try:
            row['production'] = inspect(row['url'])
            for href in row['production']['links']:
                candidate = normalize(urllib.parse.urljoin(row['production']['final_url'], href))
                if candidate and candidate not in by_url:
                    discovered.setdefault(candidate, []).append(row['url'])
        except Exception as error:
            row['production'] = {'renderer': 'unverified/error', 'status': None, 'error': str(error)}
            report['errors'].append({'url': row['url'], 'error': str(error)})
        if index % 20 == 0:
            print(f'Inspected {index}/{len(by_url)} indexed routes...', flush=True)
        time.sleep(args.delay)
    if len(discovered) > args.max_extra:
        report['errors'].append({'error': 'Extra-link safety limit reached', 'found': len(discovered), 'limit': args.max_extra})
    for index, (url, links) in enumerate(sorted(discovered.items())[:args.max_extra], 1):
        row = {'url': url, 'kind': 'linked URL outside sitemap/API', 'title': '', 'sources': sorted(set(links))}
        try:
            row['production'] = inspect(url)
        except Exception as error:
            row['production'] = {'renderer': 'unverified/error', 'status': None, 'error': str(error)}
            report['errors'].append({'url': url, 'error': str(error)})
        by_url[url] = row
        if index % 20 == 0:
            print(f'Inspected {index}/{len(discovered)} additional linked routes...', flush=True)
        time.sleep(args.delay)
    for path in ['/', '/about-us/how-to-join/', '/store2/']:
        staging_url = ORIGIN + '/staging' + path
        report.setdefault('staging_ownership_checks', {})[path] = inspect(staging_url)
        production_url = ORIGIN + path
        if production_url in by_url:
            by_url[production_url]['staging'] = report['staging_ownership_checks'][path]
    report['entries'] = sorted(by_url.values(), key=lambda row: (row['kind'], row['url']))
    report['initial_sitemap_union'] = len(initial)
    expand_existing(report, args)
    render_reports(report, out)


def expand_existing(report, args):
    by_url = {row['url']: row for row in report['entries']}
    inspected = set()
    extra_count = len([row for row in by_url.values() if row['kind'] == 'linked URL outside sitemap/API'])
    while True:
        pending = {}
        for row in list(by_url.values()):
            if row['url'] in inspected:
                continue
            inspected.add(row['url'])
            live = row['production']
            for href in live.get('links', []):
                candidate = normalize(urllib.parse.urljoin(live.get('final_url', row['url']), href))
                if candidate and candidate not in by_url:
                    pending.setdefault(candidate, []).append(row['url'])
        if not pending:
            report['public_link_closure_complete'] = True
            break
        if extra_count + len(pending) > args.max_extra:
            report['public_link_closure_complete'] = False
            report['errors'].append({'error': 'Recursive extra-link safety limit reached', 'remaining': len(pending)})
            break
        for url, sources in sorted(pending.items()):
            row = {'url': url, 'kind': 'linked URL outside sitemap/API', 'title': '', 'sources': sorted(set(sources))}
            try:
                row['production'] = inspect(url)
            except Exception as error:
                row['production'] = {'renderer': 'unverified/error', 'status': None, 'error': str(error)}
                report['errors'].append({'url': url, 'error': str(error)})
            by_url[url] = row
            extra_count += 1
            print(f'Inspected additional linked route {extra_count}: {url}', flush=True)
            time.sleep(args.delay)
    report['entries'] = sorted(by_url.values(), key=lambda row: (row['kind'], row['url']))
    report['completed_at'] = checked_at()


def route_key(url):
    value = urllib.parse.urlsplit(url)
    return value.hostname, urllib.parse.unquote(value.path).rstrip('/') or '/'


def render_reports(report, out):
    by_url = {row['url']: row for row in report['entries']}
    for row in by_url.values():
        live = row['production']
        final = live.get('final_url')
        canonical = live.get('canonical')
        if final and final != row['url']:
            row['alias_target'] = final
        elif canonical and route_key(canonical) != route_key(row['url']):
            row['alias_target'] = canonical
        else:
            row['alias_target'] = None
        if live.get('status') != 200:
            bucket = 'broken/unverified route'
        elif row['alias_target']:
            bucket = 'redirect or canonical alias'
        elif live['renderer'].startswith('code-managed'):
            bucket = 'already code-managed'
        elif live['renderer'].startswith('legacy Ecwid'):
            bucket = 'legacy store'
        elif row['kind'] == 'page':
            bucket = 'standalone WordPress page'
        elif row['kind'] == 'blog post':
            bucket = 'blog article'
        elif row['kind'] in ('category archive', 'tag archive') or re.search(r'/(?:author|category|tag)/', row['url']):
            bucket = 'generated archive'
        else:
            bucket = 'other content'
        row['migration_bucket'] = bucket
    report['summary'] = {'public_wordpress_pages': len([r for r in by_url.values() if r['kind'] == 'page']),
                         'public_blog_posts': len([r for r in by_url.values() if r['kind'] == 'blog post']),
                         'public_projects': len([r for r in by_url.values() if r['kind'] == 'project']),
                         'initial_sitemap_union': report.get('initial_sitemap_union', report.get('summary', {}).get('initial_sitemap_union')),
                         'additional_linked_routes': len([r for r in by_url.values() if r['kind'] == 'linked URL outside sitemap/API']),
                         'inspected_routes': len(by_url), 'by_kind': dict(Counter(r['kind'] for r in by_url.values())),
                         'by_renderer': dict(Counter(r['production']['renderer'] for r in by_url.values())),
                         'migration_buckets': dict(Counter(r['migration_bucket'] for r in by_url.values())),
                         'standalone_wordpress_pages_requiring_production_migration': len([r for r in by_url.values() if r['migration_bucket'] == 'standalone WordPress page']),
                         'standalone_pages_already_migrated_on_staging_only': len([r for r in by_url.values() if r['migration_bucket'] == 'standalone WordPress page' and r.get('staging', {}).get('renderer') == 'code-managed page'])}
    standalone = report['summary']['standalone_wordpress_pages_requiring_production_migration']
    staging_ready = report['summary']['standalone_pages_already_migrated_on_staging_only']
    published_pages = report['summary']['public_wordpress_pages']
    (out / 'inventory.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    columns = ['kind', 'title', 'url', 'wordpress_id', 'wordpress_status', 'http_status', 'final_url', 'production_renderer', 'staging_renderer', 'migration_bucket', 'alias_target', 'features']
    with (out / 'inventory.csv').open('w', encoding='utf-8-sig', newline='') as target:
        writer = csv.DictWriter(target, fieldnames=columns)
        writer.writeheader()
        for row in report['entries']:
            live = row['production']
            writer.writerow({'kind': row['kind'], 'title': row.get('title') or live.get('html_title', ''), 'url': row['url'],
                             'wordpress_id': row.get('id'), 'wordpress_status': row.get('wordpress_status', ''),
                             'http_status': live.get('status'), 'final_url': live.get('final_url'),
                             'production_renderer': live['renderer'], 'staging_renderer': row.get('staging', {}).get('renderer', ''),
                             'migration_bucket': row['migration_bucket'], 'alias_target': row.get('alias_target', ''),
                             'features': ', '.join(live.get('features', []))})
    lines = ['# Website Page Inventory', '', f'Checked: {report["checked_at"]} (Europe/Warsaw).', '',
             report['method'], '', '## Coverage and Limitations', '',
             '- Production is the authoritative website inventory; staging is checked separately for completed migration ownership.',
             '- All public REST collection pagination and every sitemap in the index were read. Every listed production route received a rendered-HTML GET; internal anchor links were then followed recursively to closure within the recorded safety limit. Closure complete: ' + str(report.get('public_link_closure_complete', False)) + '.',
             '- Draft, private, pending, scheduled and trashed content cannot be enumerated through the public API. Those counts are unverified, not zero. This is a complete public-index/API inventory plus the recorded link discovery, not a claim of complete database access or every possible query-string/pagination combination.',
             '- Blog posts/projects/archive URLs are separate from WordPress Page posts. Legacy Ecwid catalog URLs are platform-managed, not the new KTK code-managed storefront.',
             '- A redirect/error/hosting challenge is not counted as a successful new content migration. Generated archive families should normally be migrated as templates, not rebuilt once for every archive URL.',
             '', '## Migration Worklist', '',
             f'- The public API exposes {published_pages} published WordPress Page records; {standalone} resolve to standalone WordPress/Divi pages rather than code-managed routes, redirects or legacy store pages.',
             f'- {staging_ready} of those production Divi page designs have a verified staging-only code-managed replica. That leaves {standalone - staging_ready} standalone page designs not yet migrated to staging. This is not permission to migrate or promote them.',
             f'- The {report["summary"]["public_blog_posts"]} published blog Post records include {report["summary"]["migration_buckets"].get("blog article", 0)} independently rendered legacy article routes. Code-managed destinations and canonical aliases are separately classified; they are not necessarily migrated article templates.',
             '- The legacy `/store/` family is intentionally retained as the storefront availability fallback. Keep it separate from content-page migration and do not remove or replace it as part of this inventory.',
             '- Forms, maps, sliders, galleries, videos, FAQ interactions and countdowns are recorded per page below. These are raw HTML detections, not a complete functional browser test of every component.',
             '', '## Summary', '', '```json', json.dumps(report['summary'], indent=2), '```', '',
             '## Standalone Divi Pages Requiring Production Migration', '']
    lines += table([r for r in report['entries'] if r['migration_bucket'] == 'standalone WordPress page'])
    lines += ['', '## All Published Page Records Not Code-managed in Production', '']
    rows = [row for row in report['entries'] if row['kind'] == 'page' and not row['production']['renderer'].startswith('code-managed')]
    lines += table(rows)
    for kind, heading in [('blog post', 'Blog Articles'), ('project', 'Project Pages'), ('category archive', 'Category Archives'), ('tag archive', 'Tag Archives'), ('legacy store URL', 'Legacy Store Catalog URLs'), ('linked URL outside sitemap/API', 'Additional Linked Routes')]:
        lines += ['', '## ' + heading, ''] + table([r for r in report['entries'] if r['kind'] == kind])
    lines += ['', '## Redirects and Canonical Aliases', ''] + table([r for r in report['entries'] if r.get('alias_target')])
    lines += ['', '## Already Code-managed', ''] + table([r for r in report['entries'] if r['migration_bucket'] == 'already code-managed'])
    nye = next((r for r in report['entries'] if r['url'] == ORIGIN + '/new-years-eve/'), None)
    nye_heading = nye['production'].get('headings', [{}])[0].get('text', '') if nye else ''
    lines += ['', '## Review Flags', '',
              '- `/krakow-activities/` redirects to `/other-tours/`; preserve the route/redirect rather than count it as another independent design.',
              '- `/project/life-drawing-session/` redirects to `/krakow-hen-do/`; the project record is published, but it does not currently expose a separate project page.',
              '- `/krakow-pub-crawl/` is exposed as a published blog Post URL by the API/sitemap but serves the code-managed homepage and root canonical. Its article content is not currently independently visible at that route.',
              '- The legacy `/store/Bottomless-Brunch-p661114244` link returned HTTP 404. The current new-store routing is separate; this audit does not change the link.',
              '- The separate legacy NYE page currently begins with: `' + nye_heading.replace('`', '') + '`. Confirm the intended event-year/content treatment before a future migration; the current code-managed homepage NYE hero is a different route.',
              '- Archive pagination/author routes are listed explicitly, but they share templates. Redirect/canonical aliases and trailing-slash variants are not additional page designs.',
              '- No draft/private/archived database inventory was obtained; public absence must not be interpreted as deletion or nonexistence.', '']
    lines += ['', '## Evidence', '', '- `inventory.json`: source counts, full sitemap URLs, per-route HTTP/rendering facts, features and errors.',
              '- `inventory.csv`: flat sortable migration inventory.', '- Root `AGENTS.md` and the local renderer guards confirm the intended route ownership. Public HTML checks confirm the runtime markers actually served.',
              '- Repeat with `python tools/inventory-site-pages.py --output docs/code-pages/site-inventory-YYYY-MM-DD`.', '']
    (out / 'PAGE-INVENTORY.md').write_text('\n'.join(lines), encoding='utf-8')
    print(json.dumps({'output': str(out), 'summary': report['summary'], 'errors': report['errors']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
