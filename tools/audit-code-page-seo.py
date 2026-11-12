"""Read-only production metadata/indexability baseline for the staging migration."""
import json
import time
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Head(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ''
        self.in_title = False
        self.meta = []
        self.links = []

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == 'title': self.in_title = True
        if tag == 'meta': self.meta.append(attributes)
        if tag == 'link': self.links.append(attributes)

    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False

    def handle_data(self, value):
        if self.in_title: self.title += value


def main():
    manifest = json.loads((ROOT / 'docs/code-pages/full-migration/manifest.json').read_text(encoding='utf-8'))
    report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'readOnly': True, 'routes': [], 'errors': []}
    for number, route in enumerate(manifest['routes'], 1):
        try:
            request = urllib.request.Request(route['sourceUrl'], headers={'User-Agent': 'Mozilla/5.0 (KTK owner read-only SEO baseline)'})
            with urllib.request.urlopen(request, timeout=45) as response:
                parsed = Head(); parsed.feed(response.read().decode('utf-8'))
                row = {'key': route['key'], 'url': route['sourceUrl'], 'finalUrl': response.url, 'status': response.status,
                       'title': parsed.title, 'robots': [m for m in parsed.meta if m.get('name', '').lower() in ('robots', 'googlebot', 'bingbot')],
                       'xRobotsTag': response.headers.get('X-Robots-Tag'), 'canonical': [l.get('href') for l in parsed.links if l.get('rel') == 'canonical'],
                       'description': [m.get('content') for m in parsed.meta if m.get('name') == 'description'],
                       'social': [m for m in parsed.meta if m.get('property', '').startswith('og:') or m.get('name', '').startswith('twitter:')],
                       'pagination': [l for l in parsed.links if l.get('rel') in ('prev', 'next')]}
                report['routes'].append(row)
        except Exception as error:
            report['errors'].append({'key': route['key'], 'error': str(error)})
        if number % 20 == 0: print(f'SEO baseline: {number}/{len(manifest["routes"])}', flush=True)
        time.sleep(0.15)
    report['checkedAt'] = datetime.now(timezone.utc).isoformat()
    report['summary'] = {'routes': len(report['routes']), 'errors': len(report['errors']),
                         'sourceNoindexRoutes': [r['key'] for r in report['routes'] if 'noindex' in json.dumps(r['robots']).lower() or 'noindex' in str(r['xRobotsTag']).lower()]}
    destination = ROOT / 'docs/code-pages/production-readiness/production-seo-baseline.json'
    destination.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report['summary'], indent=2))
    return bool(report['errors'])


if __name__ == '__main__':
    raise SystemExit(main())
