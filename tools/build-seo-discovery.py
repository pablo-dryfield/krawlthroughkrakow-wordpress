"""Build a canonical-URL sitemap preview from owned page definitions and public data."""
import hashlib
import json
import subprocess
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://krawlthroughkrakow.com'
ASSETS = ROOT / 'staging/wp-content/mu-plugins/ktk-code-pages-assets'
OUTPUT = ROOT / 'staging/wp-content/mu-plugins/ktk-seo-sitemap-assets/data.json'
REPORT = ROOT / 'docs/seo/staging-discovery-2026-11-12/build.json'
CATALOG_URL = ORIGIN + '/staging/wp-json/ktk-storefront/v1/products'


def sha(value):
    return hashlib.sha256(value).hexdigest()


def canonical_url(value):
    url = urllib.parse.urlsplit(value)
    if (url.scheme != 'https' or url.netloc != 'krawlthroughkrakow.com' or url.query or url.fragment
            or not url.path.startswith('/') or not url.path.endswith('/')
            or '//' in url.path or '%' in url.path or '..' in url.path.split('/')
            or url.path.split('/')[1] in ('staging', 'wp-admin', 'wp-json', 'store')
            or url.path.startswith(('/store2/cart/', '/store2/checkout/'))):
        raise ValueError('Invalid preferred discovery URL: ' + value)
    return value


class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.robots = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href'))
        if tag == 'meta' and attrs.get('name', '').lower() in ('robots', 'googlebot', 'bingbot'):
            self.robots.append(attrs.get('content', '').lower())


def read_public(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 KTK public SEO audit/1.0'})
    with urllib.request.urlopen(request, timeout=60) as response:
        if response.status != 200 or response.url != url:
            raise RuntimeError('Expected final HTTP 200 without redirect: ' + url)
        return response.read(), dict(response.headers.items())


def read_definitions():
    code = "define('ABSPATH', '.'); $r=require $argv[1].'/registry.php'; $p=array(); foreach($r['routes'] as $route=>$entry){$p[$route]=require $argv[1].'/'.$entry['file'];} echo json_encode(array('registry'=>$r,'pages'=>$p));"
    result = subprocess.run(['php', '-r', code, str(ASSETS)], capture_output=True, check=True)
    return json.loads(result.stdout)


def select_content(registry, definitions):
    selected = [ORIGIN + '/']
    excluded = []
    if not registry.get('complete') or len(registry['routes']) != 116:
        raise ValueError('Complete owned content registry required')
    for route, entry in registry['routes'].items():
        url = canonical_url(ORIGIN + route)
        page = definitions[route]
        policy = page.get('production_seo', {})
        if policy.get('source_url') != url:
            raise ValueError('Page source identity mismatch: ' + route)
        robots = ' '.join(row.get('content', '') for row in policy.get('robots', [])) + ' ' + str(policy.get('x_robots_tag') or '')
        reason = None
        if 'noindex' in robots.lower():
            reason = 'Existing production noindex policy'
        elif policy.get('canonical') != [url]:
            reason = 'Missing or different declared canonical; review before inclusion'
        if reason:
            excluded.append({'route': route, 'reason': reason})
        else:
            selected.append(url)
    if set(selected) & {ORIGIN + route for route in registry.get('redirects', {})}:
        raise ValueError('Redirect leaked into content sitemap')
    return sorted(set(selected)), excluded


def select_products(catalog, policy):
    products = catalog.get('products')
    if not isinstance(products, list) or not products:
        raise ValueError('Complete public catalog response required; never treat an outage as empty')
    by_id = {}
    for product in products:
        identity = product.get('id')
        if not isinstance(identity, int) or identity in by_id:
            raise ValueError('Invalid or duplicate public product ID')
        by_id[identity] = product
    result = [ORIGIN + '/store2/']
    for product in policy['products']:
        if product['id'] not in by_id or by_id[product['id']].get('slug') != product['slug']:
            raise ValueError('Reviewed product is no longer at its expected public URL')
        result.append(canonical_url(ORIGIN + '/store2/' + product['slug'] + '/'))
    if len(set(result)) != len(result):
        raise ValueError('Duplicate reviewed product URL')
    return sorted(result)


def main():
    policy = json.loads((ROOT / 'tools/seo-discovery-policy.json').read_text())
    if policy.get('schemaVersion') != 1 or policy.get('targetOrigin') != ORIGIN:
        raise ValueError('Reviewed target-origin policy required')
    definitions = read_definitions()
    content, excluded = select_content(definitions['registry'], definitions['pages'])
    catalog_bytes, _ = read_public(CATALOG_URL)
    catalog = json.loads(catalog_bytes)
    storefront = select_products(catalog, policy)
    verified = []
    for url in content + storefront:
        body, headers = read_public(url)
        head = Head(); head.feed(body.decode('utf-8'))
        lower = {key.lower(): value for key, value in headers.items()}
        if head.canonicals != [url] or 'noindex' in ' '.join(head.robots) + lower.get('x-robots-tag', '').lower():
            raise RuntimeError('URL is not an intended current production canonical: ' + url)
        verified.append({'url': url, 'status': 200, 'canonical': url})
        if len(verified) % 25 == 0:
            print('Verified canonical discovery URLs: ' + str(len(verified)), flush=True)
    robots_bytes, _ = read_public(ORIGIN + '/robots.txt')
    robots = robots_bytes.decode('utf-8')
    if len(robots_bytes) > 32000 or '<' in robots or 'User-agent:' not in robots:
        raise ValueError('Expected existing plain-text robots file')
    additions = [ORIGIN + '/wp-sitemap.xml', ORIGIN + '/sitemap-ktk.xml']
    preview = robots + ('' if robots.endswith('\n') else '\n')
    for url in additions:
        if url not in robots:
            preview += 'Sitemap: ' + url + '\n'
    source_hashes = {'ktk-code-pages-assets/registry.php': sha((ASSETS / 'registry.php').read_bytes())}
    for entry in definitions['registry']['routes'].values():
        source_hashes['ktk-code-pages-assets/' + entry['file']] = sha((ASSETS / entry['file']).read_bytes())
    data = {'schemaVersion': 1, 'targetOrigin': ORIGIN, 'content': [{'loc': url} for url in content],
            'storefront': [{'loc': url} for url in storefront], 'robotsPreview': preview,
            'sourceHashes': source_hashes, 'products': policy['products']}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
    report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'scope': 'Read-only public canonical/source audit; no scripts or submissions.',
              'contentCount': len(content), 'storefrontCount': len(storefront), 'verified': verified, 'excluded': excluded,
              'deferredProductIds': [p['id'] for p in catalog['products'] if p['id'] not in {p['id'] for p in policy['products']}],
              'catalogSha256': sha(catalog_bytes), 'robotsSha256': sha(robots_bytes), 'policySha256': sha((ROOT / 'tools/seo-discovery-policy.json').read_bytes()),
              'dataSha256': sha(OUTPUT.read_bytes())}
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: report[key] for key in ('contentCount', 'storefrontCount', 'excluded', 'dataSha256')}))


if __name__ == '__main__':
    main()
