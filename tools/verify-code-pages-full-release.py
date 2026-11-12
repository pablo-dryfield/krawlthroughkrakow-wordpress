"""Read-only checks for every audited staging content route and protected route family."""
import argparse
import hashlib
import html
import json
import re
import subprocess
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://krawlthroughkrakow.com/staging'
ASSETS = ROOT / 'staging/wp-content/mu-plugins/ktk-code-pages-assets'
DEVICES = {
    'desktop': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
    'android': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',
    'ipad': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
}


class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ''
        self.in_title = False
        self.meta = []
        self.links = []
        self.scripts = []
        self.body = {}
        self.targets = []
        self.all_urls = []
        self.script_blocks = []
        self.current_script = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.all_urls.extend(attrs[key] for key in ('href','src','action','data-parity-href') if attrs.get(key))
        if tag == 'title': self.in_title = True
        if tag == 'meta': self.meta.append(attrs)
        if tag == 'link': self.links.append(attrs)
        if tag == 'script':
            self.scripts.append(attrs)
            self.current_script = {'attrs':attrs,'text':''}
        if tag == 'body': self.body = attrs
        if tag == 'a' and attrs.get('href'): self.targets.append(attrs['href'])
        if tag == 'form' and attrs.get('action'): self.targets.append(attrs['action'])
        if attrs.get('data-parity-href'): self.targets.append(attrs['data-parity-href'])

    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'script' and self.current_script is not None:
            self.script_blocks.append(self.current_script)
            self.current_script = None

    def handle_data(self, value):
        if self.in_title: self.title += value
        if self.current_script is not None: self.current_script['text'] += value


def integration_bootstraps(parsed, clarity_project='z9d5iuilvn'):
    counts={'GTM':0,'Google Ads':0,'Clarity':0}
    for block in parsed.script_blocks:
        source=block['attrs'].get('src','')
        text=block['text']
        if ('googletagmanager.com/gtm.js' in text and 'GTM-PHXGRZ' in text) or ('googletagmanager.com/gtm.js' in source and urllib.parse.parse_qs(urllib.parse.urlparse(source).query).get('id') == ['GTM-PHXGRZ']): counts['GTM']+=1
        if 'googletagmanager.com/gtag/js' in source and urllib.parse.parse_qs(urllib.parse.urlparse(source).query).get('id') == ['AW-956184209']: counts['Google Ads']+=1
        if ('clarity.ms/tag/' in text and clarity_project in text) or ('clarity.ms/tag/' + clarity_project) in source: counts['Clarity']+=1
    return counts


def staging_clarity_policy(parsed):
    library = [block for block in parsed.script_blocks if 'clarity.ms/tag/' in block['attrs'].get('src','') or 'clarity.ms/tag/' in block['text']]
    return {
        'Clarity recording loader disabled on staging': not library and not any(s.get('id') == 'ktk-clarity-loader' for s in parsed.scripts),
        'one Clarity consent bridge retained': sum(s.get('id') == 'ktk-clarity-consent-bridge' for s in parsed.scripts) == 1,
    }


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, url):
        return None


def get(url, agent, redirect=True):
    opener = urllib.request.build_opener() if redirect else urllib.request.build_opener(NoRedirect())
    request = urllib.request.Request(url, headers={'User-Agent': agent})
    try:
        response = opener.open(request, timeout=60)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, dict(response.headers.items()), response.read()


def main():
    global BASE
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-bust', action='store_true')
    parser.add_argument('--label', default='staging-full-release')
    parser.add_argument('--devices', default='desktop,android,ipad')
    parser.add_argument('--environment', choices=['staging','production'], default='staging')
    args = parser.parse_args()
    production = args.environment == 'production'
    if production: BASE = 'https://krawlthroughkrakow.com'
    policy = {row['url']:row for row in json.loads((ROOT / 'docs/code-pages/production-readiness/production-seo-baseline.json').read_text(encoding='utf-8'))['routes']} if production else {}
    manifest = json.loads((ROOT / 'docs/code-pages/full-migration/manifest.json').read_text(encoding='utf-8'))
    seo_overrides = json.loads((ROOT / 'tools/code-pages-seo.json').read_text(encoding='utf-8'))['pages']
    registry = json.loads(subprocess.run(['php','-r',"define('ABSPATH', __DIR__); echo json_encode(require $argv[1]);",str(ASSETS / 'registry.php')],capture_output=True,text=True,check=True).stdout)
    checks = []
    responses = []
    assets = set()
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    def check(route, device, name, passed, detail=None):
        checks.append(dict(route=route, device=device, name=name, passed=bool(passed), detail=detail))
    for device in args.devices.split(','):
        agent = DEVICES[device]
        for index, route in enumerate(manifest['routes'], 1):
            url = BASE + route['route']
            try:
                status, headers, body = get(url + ('?ktk_content_release=' + stamp if args.cache_bust else ''), agent)
                lower_headers = {key.lower():value for key,value in headers.items()}
                responses.append(dict(route=route['route'],device=device,status=status,cfCacheStatus=lower_headers.get('cf-cache-status'),age=lower_headers.get('age'),apo=lower_headers.get('cf-apo-via'),robotsHeader=lower_headers.get('x-robots-tag')))
                source = json.loads((ROOT / route['source'] / 'production-1920.json').read_text(encoding='utf-8'))
                markup = body.decode('utf-8')
                parsed = Head(); parsed.feed(markup)
                check(route['route'], device, 'HTTP 200', status == 200)
                check(route['route'], device, 'correct code route', parsed.body.get('data-ktk-page') == route['key'])
                check(route['route'], device, 'title preserved', parsed.title == source['title'])
                descriptions = [m.get('content', '') for m in parsed.meta if m.get('name') == 'description']
                description = source['metadata']['description'] if production else seo_overrides.get(route['route'], {}).get('description', source['metadata']['description'])
                check(route['route'], device, 'production description preserved' if production else 'reviewed staging description', descriptions == ([description] if description else []))
                expected_canonical = policy[url]['canonical'] if production else [url]
                check(route['route'], device, 'source production canonical policy' if production else 'one staging canonical', [l.get('href') for l in parsed.links if l.get('rel') == 'canonical'] == expected_canonical)
                robots = [m.get('content', '') for m in parsed.meta if m.get('name') == 'robots']
                if production:
                    actual_robots = [{'name':m.get('name'),'content':m.get('content')} for m in parsed.meta if m.get('name') in ('robots','googlebot','bingbot')]
                    check(route['route'], device, 'production indexable/source robots', actual_robots == policy[url]['robots'] and all('noindex' not in value for value in robots))
                    check(route['route'], device, 'production robots header preserved', lower_headers.get('x-robots-tag') == policy[url]['xRobotsTag'])
                    staging = [value for value in parsed.all_urls if urllib.parse.urlparse(urllib.parse.urljoin(url,value)).hostname in ('krawlthroughkrakow.com','www.krawlthroughkrakow.com') and re.match(r'^/staging(?:/|$)',urllib.parse.urlparse(urllib.parse.urljoin(url,value)).path)]
                    check(route['route'],device,'no staging navigation or resources',not staging,staging)
                else:
                    check(route['route'], device, 'HTML noindex', len(robots) == 1 and 'noindex' in robots[0])
                check(route['route'], device, 'no Divi renderer runtime', not any(re.search(r'themes/Divi|/et-cache/', s.get('src', '')) for s in parsed.scripts))
                check(route['route'], device, 'no captured QA attribution', not re.search(r'codex-test|test-click-id|utm_source=codex', markup))
                check(route['route'], device, 'no unresolved template tokens', '__KTK_' not in markup)
                unported = [target for target in parsed.targets if urllib.parse.urlparse(target).hostname in ('krawlthroughkrakow.com','www.krawlthroughkrakow.com') and not target.startswith(BASE + '/') and target != BASE]
                check(route['route'], device, 'internal navigation stays in production' if production else 'internal navigation stays in staging', not unported, unported)
                legacy = [target for target in parsed.targets if re.search(r'https?://(?:www\.)?fareharbor\.com/embeds/book/krawlthroughkrakow/', target) or re.search(r'https?://(?:www\.)?krawlthroughkrakow\.com/(?:staging/)?store(?:/|$)', target)]
                check(route['route'], device, 'booking links use the code-managed storefront', not legacy, legacy)
                if production:
                    for key,count in integration_bootstraps(parsed).items():
                        check(route['route'],device,'one logical '+key+' bootstrap',count == 1,count)
                else:
                    for key in ['ktk-gtm-loader', 'ktk-google-ads-loader']:
                        check(route['route'], device, 'one ' + key, sum(s.get('id') == key for s in parsed.scripts) == 1)
                    for name, passed in staging_clarity_policy(parsed).items():
                        check(route['route'], device, name, passed)
                check(route['route'], device, 'one existing-or-owned Iubenda bootstrap', sum(s.get('src','').split('?')[0] == 'https://embeds.iubenda.com/widgets/92c90d2a-9d50-4f09-9c21-bcb72ccc2897.js' for s in parsed.scripts) == 1)
                for link in parsed.links:
                    if link.get('rel') == 'stylesheet' and '/ktk-code-pages-assets/' in link.get('href', ''): assets.add(link['href'])
                for script in parsed.scripts:
                    if '/ktk-code-pages-assets/' in script.get('src', ''): assets.add(script['src'])
            except Exception as error:
                check(route['route'], device, 'request completed', False, str(error))
            if index % 20 == 0: print(f'{device}: checked {index}/{len(manifest["routes"])} routes', flush=True)
        for alias in manifest['aliases']:
            if alias['status'] == 'existing-homepage-canonical-alias':
                status, _, body = get(BASE + alias['route'], agent)
                parsed = Head(); parsed.feed(body.decode('utf-8'))
                check(alias['route'], device, 'existing homepage canonical alias', status == 200 and [l.get('href') for l in parsed.links if l.get('rel') == 'canonical'] == [BASE + '/'])
                continue
            status, headers, _ = get(BASE + alias['route'] + '?ktk_alias_check=1', agent, False)
            location = next((v for k, v in headers.items() if k.lower() == 'location'), '')
            check(alias['route'], device, 'redirect status/destination/query', status == registry['redirects'][alias['route']]['status'] and location == BASE + alias['target'] + '?ktk_alias_check=1', {'status':status,'location':location})
        for route in ['/', '/store/', '/store2/']:
            status, _, body = get(BASE + route, agent)
            parsed = Head(); parsed.feed(body.decode('utf-8'))
            check(route, device, 'protected route not intercepted', status == 200 and 'ktk-code-page' not in parsed.body.get('class', ''))
    for url in sorted(assets):
        relative = urllib.parse.urlparse(url).path.split('/ktk-code-pages-assets/',1)[1]
        status, _, body = get(url, DEVICES['desktop'])
        expected = hashlib.sha256((ASSETS / relative).read_bytes()).hexdigest()
        check(relative, 'asset', 'public SHA-256', status == 200 and hashlib.sha256(body).hexdigest() == expected)
        check(relative, 'asset', 'current version token', urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get('v') == [expected[:12]])
    for relative in ['content/contact.html','pages/contact.php','shells/' + next((ASSETS / 'shells').glob('*.html')).name]:
        status, _, _ = get(BASE + '/wp-content/mu-plugins/ktk-code-pages-assets/' + relative + '?ktk_template_check=' + stamp, DEVICES['desktop'])
        check(relative, 'template', 'raw templates cannot be indexed', status in (403,404))
    report = dict(checkedAt=datetime.now(timezone.utc).isoformat(), environment=args.environment, cacheBusted=args.cache_bust,
                  summary=dict(passed=sum(c['passed'] for c in checks),total=len(checks),routes=len(manifest['routes']),assets=len(assets)),responses=responses,checks=checks)
    directory = 'production-release' if production else 'full-migration'
    destination = ROOT / f'docs/code-pages/{directory}/{args.label}.json'
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(dict(summary=report['summary'],failed=[c for c in checks if not c['passed']]),indent=2))
    return int(any(not c['passed'] for c in checks))


if __name__ == '__main__':
    raise SystemExit(main())
