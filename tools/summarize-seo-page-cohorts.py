"""Aggregate retained by-page UI exports without exposing URLs or merging their keys."""
import argparse
import hashlib
import json
import re
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
COMMERCIAL = {'/krakow-hen-do/', '/krakow-stag-do/', '/new-years-eve/',
              '/other-tours/', '/stagshens/', '/student-trips-poland/'}
OVERRIDES = {**dict.fromkeys(COMMERCIAL, 'commercial_content'),
             '/about-us/how-to-join/': 'booking_guidance', '/meeting-point/': 'booking_guidance',
             '/krakow-nightlife/': 'editorial_hub', '/pub-crawl-drinking-games/': 'editorial_resource'}
VARIANTS = ('clean', 'query_only', 'fragment_only', 'query_and_fragment')


def build_roles(manifest, catalog):
    roles = {'/': 'homepage', '/store2/': 'code_catalog', '/store2': 'code_catalog'}
    for row in manifest['routes']:
        route, key = row['route'], row['key']
        if route in roles:
            raise ValueError('Duplicate route in role registry')
        roles[route] = OVERRIDES.get(route, 'editorial_articles' if key.startswith('post-')
                                     else 'editorial_archives' if key.startswith('archive-') else 'other_known_pages')
    for row in manifest['aliases']:
        roles.setdefault(row['route'], 'known_aliases')
    seen = set()
    for product in catalog['products']:
        slug = product['slug']
        if not isinstance(slug, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) or slug in seen:
            raise ValueError('Unique public product slugs required')
        seen.add(slug)
        roles['/store2/' + slug + '/'] = 'code_products'
    return roles


def parse_url(value):
    if not isinstance(value, str) or re.search(r'[\x00-\x1f\x7f]', value):
        raise ValueError('Invalid retained page URL')
    try:
        url = urlsplit(value)
        if url.scheme not in ('http', 'https') or not url.hostname or url.username or url.password:
            raise ValueError()
        return url
    except ValueError:
        raise ValueError('Invalid retained page URL; value withheld') from None


def role_for(url, roles):
    if url.netloc.casefold() != 'krawlthroughkrakow.com':
        return 'other_hosts'
    path = url.path
    if path == '/staging' or path.startswith('/staging/'):
        return 'staging_urls'
    if path.lower().endswith('.pdf'):
        return 'documents'
    if path in roles:
        return roles[path]
    if any(path.rstrip('/') == family or path.startswith(family + '/')
           for family in ('/store2/cart', '/store2/checkout', '/store2/orders', '/store2/saved-carts')):
        return 'code_utilities'
    if path.startswith('/store2/'):
        return 'unreviewed_storefront'
    if path.rstrip('/') == '/store' or path.startswith('/store/'):
        return 'legacy_ecwid'
    if path.endswith('/feed/'):
        return 'feeds'
    if path in ('/robots.txt', '/wp-sitemap.xml', '/sitemap_index.xml'):
        return 'discovery_resources'
    return 'unreviewed_urls'


def integer(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d+|\d{1,3}(?:,\d{3})+', value):
        raise ValueError('Exact nonnegative displayed integer required')
    return int(value.replace(',', ''))


def counters():
    return {'rows': 0, 'clicks': 0, 'impressions': 0}


def summarize(data, roles):
    rows, coverage = data.get('rows'), data.get('coverage', '')
    if not isinstance(rows, list) or not rows or not isinstance(coverage, str) or (
            'End of returned rows.' not in coverage or 'Detail aggregation: byPage' not in coverage):
        raise ValueError('Completed retained byPage UI export required')
    declared = re.search(r'([\d,]+)\s+ROWS\b', coverage)
    if declared and integer(declared[1]) != len(rows):
        raise ValueError('Coverage count does not match retained rows')
    ranges = re.findall(r'(\d{4}-\d{2}-\d{2}) TO (\d{4}-\d{2}-\d{2})', coverage)
    if len(ranges) != 1:
        raise ValueError('One explicit coverage date range required')
    start, end = map(date.fromisoformat, ranges[0])
    if start > end:
        raise ValueError('Coverage dates must be chronological')
    groups, variants, seen = {}, {name: counters() for name in VARIANTS}, set()
    non_https = 0
    for row in rows:
        if not isinstance(row, list) or len(row) != 5:
            raise ValueError('Unique five-column page rows required')
        url = parse_url(row[0])
        if row[0] in seen:
            raise ValueError('Duplicate exact page key; value withheld')
        seen.add(row[0])
        clicks, impressions = integer(row[1]), integer(row[2])
        role = role_for(url, roles)
        bucket = groups.setdefault(role, {**counters(), 'queryRows': 0, 'fragmentRows': 0})
        variant = 'query_and_fragment' if url.query and url.fragment else 'query_only' if url.query else 'fragment_only' if url.fragment else 'clean'
        for group in (bucket, variants[variant]):
            group['rows'] += 1
            group['clicks'] += clicks
            group['impressions'] += impressions
        bucket['queryRows'] += bool(url.query)
        bucket['fragmentRows'] += bool(url.fragment)
        non_https += url.scheme != 'https'
    return {
        'dates': {'start': ranges[0][0], 'end': ranges[0][1], 'timezone': 'Google Pacific dates'},
        'returnedRows': len(rows), 'groups': groups, 'variants': variants, 'nonHttpsRows': non_https,
        'returnedPageTotals': {key: sum(bucket[key] for bucket in groups.values()) for key in counters()},
        'limitations': 'Returned byPage UI rows, not whole-property totals, conversion totals or inferred query intent. Full URL keys, query strings and fragments remain separate before aggregation; no URL values are emitted. No CTR/position averages or whole-property share is calculated. End of returned rows is not a guarantee Google returned every possible row.',
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('files', nargs='+', type=Path)
    parser.add_argument('--manifest', type=Path, default=ROOT / 'docs/code-pages/full-migration/manifest.json')
    parser.add_argument('--catalog', required=True, type=Path, help='Retained public catalog snapshot; no network access')
    parser.add_argument('--output', type=Path, help='New generated aggregate report, without raw URL values')
    args = parser.parse_args()
    if args.output and args.output.exists():
        raise ValueError('Preserve earlier cohort evidence; choose a new output path')
    manifest_bytes, catalog_bytes = args.manifest.read_bytes(), args.catalog.read_bytes()
    roles = build_roles(json.loads(manifest_bytes), json.loads(catalog_bytes))
    results = []
    for file in args.files:
        raw = file.read_bytes()
        results.append({'file': file.name, 'sha256': hashlib.sha256(raw).hexdigest(),
                        **summarize(json.loads(raw), roles)})
    report = {'checkedAt': datetime.now(timezone.utc).isoformat(),
                      'manifestSha256': hashlib.sha256(manifest_bytes).hexdigest(),
                      'catalogSha256': hashlib.sha256(catalog_bytes).hexdigest(),
                      'roleRegistrySha256': hashlib.sha256(json.dumps(roles, sort_keys=True).encode()).hexdigest(),
                      'periods': results}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'report': str(args.output), 'periods': len(results), 'returnedRows': [item['returnedRows'] for item in results]}))
    else:
        print(json.dumps(report, indent=2))
