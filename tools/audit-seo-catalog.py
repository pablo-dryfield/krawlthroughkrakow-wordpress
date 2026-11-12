"""Read-only catalog/source review; never executes website scripts or booking actions."""
import argparse
import hashlib
import json
import re
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://krawlthroughkrakow.com'
AGENT = 'Mozilla/5.0 KTK public SEO audit/1.0'


def normalized(value):
    return re.sub(r'\s+', ' ', value).strip() if isinstance(value, str) else ''


class HeadingsAndMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []; self.robots = []; self.descriptions = []
        self.title = ''; self.h1 = []; self.capture = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href'))
        if tag == 'meta':
            name = attrs.get('name', '').lower()
            if name in ('robots', 'googlebot', 'bingbot'): self.robots.append(attrs.get('content', ''))
            if name == 'description': self.descriptions.append(attrs.get('content', ''))
        if tag in ('title', 'h1'):
            self.capture = tag
            if tag == 'h1': self.h1.append('')

    def handle_endtag(self, tag):
        if tag == self.capture: self.capture = None

    def handle_data(self, data):
        if self.capture == 'title': self.title += data
        if self.capture == 'h1': self.h1[-1] += data


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': AGENT, 'Accept': 'application/json,text/html;q=0.9'})
    try: response = urllib.request.urlopen(request, timeout=60)
    except urllib.error.HTTPError as error: response = error
    with response:
        body = response.read()
        return response.status, response.url, {key.lower():value for key,value in response.headers.items()}, body


def content_facts(product, today):
    config = product.get('config') if isinstance(product.get('config'), dict) else {}
    content = config.get('content') if isinstance(config.get('content'), dict) else {}
    availability = config.get('availability') if isinstance(config.get('availability'), dict) else {}
    highlights = [normalized(item) for item in content.get('highlights', []) if normalized(item)]
    dates = availability.get('allowedDates', [])
    dates = [date.fromisoformat(item) for item in dates]
    return {
        'summary': normalized(content.get('summary')),
        'description': normalized(content.get('description')),
        'highlights': highlights,
        'images': len(product.get('images') or []),
        'hasImageUrl': bool(product.get('imageUrl')),
        'cardStats': content.get('card', {}).get('stats', []) if isinstance(content.get('card'), dict) else [],
        'allowedDates': [item.isoformat() for item in dates],
        'allAllowedDatesPast': bool(dates) and all(item < today for item in dates),
    }


def source_facts(url):
    status, final_url, headers, body = fetch(url)
    parsed = HeadingsAndMetadata(); parsed.feed(body.decode('utf-8'))
    robots = ','.join(parsed.robots + [headers.get('x-robots-tag', '')]).lower()
    return {'url': url, 'status': status, 'finalUrl': final_url,
            'canonical': parsed.canonicals, 'robots': parsed.robots, 'xRobotsTag': headers.get('x-robots-tag'),
            'title': normalized(parsed.title), 'descriptions': parsed.descriptions,
            'h1': [normalized(item) for item in parsed.h1], 'noindex': 'noindex' in robots,
            'cache': headers.get('cf-cache-status'), 'sha256': hashlib.sha256(body).hexdigest()}


def validate_catalog(catalog):
    products = catalog.get('products')
    if not isinstance(products, list) or not products: raise ValueError('Complete public catalog required')
    seen = set()
    for product in products:
        identity = product.get('id'); slug = product.get('slug')
        if type(identity) is not int or identity <= 0 or identity in seen or not isinstance(slug, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
            raise ValueError('Invalid/ambiguous public product identity')
        seen.add(identity)
    return products


def check_reviewed_sources(row):
    production = row['production']; staging = row['staging']
    return (all(source['status'] == 200 and source['finalUrl'] == source['url'] and source['canonical'] == [source['url']] for source in (production, staging))
            and not production['noindex'] and staging['noindex'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    parser.add_argument('--review-date', required=True, type=date.fromisoformat)
    args = parser.parse_args()
    output = ROOT / args.output
    if output.exists(): raise RuntimeError('Preserve earlier audit; choose a new output filename')
    status, final_url, _, body = fetch(ORIGIN + '/staging/wp-json/ktk-storefront/v1/products')
    if status != 200 or final_url != ORIGIN + '/staging/wp-json/ktk-storefront/v1/products': raise RuntimeError('Public catalog unavailable')
    products = validate_catalog(json.loads(body))
    policy = json.loads((ROOT / 'tools/seo-discovery-policy.json').read_text())
    selected = {item['id']:item['slug'] for item in policy['products']}
    rows = []; errors = []
    for product in products:
        route = '/store2/' + product['slug'] + '/'
        row = {'id':product['id'], 'slug':product['slug'], 'name':product['name'],
               'content':content_facts(product, args.review_date), 'selected':product['id'] in selected}
        try:
            row['production'] = source_facts(ORIGIN + route)
            row['staging'] = source_facts(ORIGIN + '/staging' + route)
            if row['selected'] and (selected[row['id']] != row['slug'] or not check_reviewed_sources(row)):
                errors.append({'id':row['id'], 'error':'Reviewed product identity/canonical/indexing contract failed'})
        except Exception as error:
            errors.append({'id':row['id'], 'error':str(error)})
        rows.append(row)
        print('Reviewed public catalog product: ' + str(product['id']), flush=True)
    missing = set(selected) - {item['id'] for item in products}
    if missing: errors.append({'error':'Selected products missing from public catalog', 'ids':sorted(missing)})
    descriptions = {}
    for row in rows:
        if row['content']['description']:
            descriptions.setdefault(row['content']['description'], []).append(row['id'])
    article = {environment:source_facts(ORIGIN + prefix + '/krakow-team-building-activities/') for environment,prefix in [('production',''),('staging','/staging')]}
    report = {'checkedAt':datetime.now(timezone.utc).isoformat(), 'reviewDate':args.review_date.isoformat(),
              'scope':'Read-only public API and initial HTML; no JS, availability, quote, cart, payment, login or account writes.',
              'catalogSha256':hashlib.sha256(body).hexdigest(), 'products':rows,
              'duplicateDescriptions':[ids for ids in descriptions.values() if len(ids)>1],
              'teamBuildingArticle':article, 'errors':errors}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=True)+'\n', encoding='utf-8')
    print(json.dumps({'products':len(rows), 'selected':len(selected), 'errors':errors}))
    return int(bool(errors))


if __name__ == '__main__': raise SystemExit(main())
