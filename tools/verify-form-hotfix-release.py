"""Compare original production semantics, indexing and resources across all device caches."""
import argparse
import copy
import hashlib
import importlib.util
import json
import re
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('ktk_form_hotfix_reads', ROOT / 'tools/verify-code-pages-full-release.py')
http = importlib.util.module_from_spec(spec)
spec.loader.exec_module(http)
SCRIPT = '/wp-content/mu-plugins/ktk-code-pages-assets/runtime.js'


def digest(value):
    return hashlib.sha256(value).hexdigest()


def decoded_email(value):
    if not re.fullmatch(r'(?:[a-fA-F0-9]{2}){2,}', value):
        raise ValueError('Invalid Cloudflare protected email')
    data = bytes.fromhex(value)
    return bytes(part ^ data[0] for part in data[1:]).decode('utf-8')


def normalized_resource(value, email_identity=True):
    url = urlsplit(value)
    if email_identity and url.netloc in ('', 'krawlthroughkrakow.com') and url.path == '/cdn-cgi/l/email-protection' and url.fragment:
        return 'mailto:' + decoded_email(url.fragment)
    if url.path == SCRIPT:
        return urlunsplit(url._replace(query=urlencode([(k, 'FORM_HOTFIX_VERSION' if k == 'v' else v) for k, v in parse_qsl(url.query)])))
    return value


def legacy_identity(rows, expected):
    fingerprint = lambda: digest(json.dumps(rows, sort_keys=True, ensure_ascii=True).encode())
    if fingerprint() == expected:
        return {'matched': True, 'mode': 'exact-original'}
    candidates = []
    for index, row in enumerate(rows):
        if len(row) != 2 or row[0] not in ('a', 'span'):
            continue
        fields = []
        for field, value in row[1]:
            url = urlsplit(value)
            if field == 'data-cfemail':
                fields.append((field, value, decoded_email(value)))
            elif field == 'href' and url.netloc in ('', 'krawlthroughkrakow.com') and url.path == '/cdn-cgi/l/email-protection' and url.fragment:
                fields.append((field, value, decoded_email(url.fragment)))
        if fields:
            candidates.append((index, fields))
    if len(candidates) != 1:
        return {'matched': False, 'mode': 'not-exactly-one-variable-email-node', 'variableNodes': len(candidates)}
    index, fields = candidates[0]
    original = copy.deepcopy(rows[index])
    try:
        # Cloudflare uses one public XOR byte. Require the complete old SHA to
        # match under that byte alone; never mask a changed decoded address/node.
        for key in range(256):
            updates = {}
            for field, value, address in fields:
                encoded = bytes([key, *(part ^ key for part in address.encode('utf-8'))]).hex()
                updates[field] = encoded if field == 'data-cfemail' else value.split('#', 1)[0] + '#' + encoded
            rows[index] = [original[0], [(field, updates.get(field, value)) for field, value in original[1]]]
            if fingerprint() == expected:
                return {'matched': True, 'mode': 'exact-original-under-public-email-salt'}
    finally:
        rows[index] = original
    return {'matched': False, 'mode': 'original-SHA-not-reproduced'}


def legal_source_proof(release, route, identity):
    allowed = {'/privacy-policy/': ('privacy-policy', 2), '/terms-and-conditions/': ('terms-and-conditions', 7)}
    if route not in allowed or not release or identity.get('mode') != 'not-exactly-one-variable-email-node' or identity.get('variableNodes') != allowed[route][1]:
        return False
    before, after = release.get('before', {}), release.get('after', {})
    if release.get('phase') != 'complete' or release.get('target') != 'ktk-code-pages-assets/runtime.js':
        return False
    original = '38cdaa565d7fabc7f58e05cd8697dd79996c9c755d0beca9fda9e2503b2fc9e3'
    candidate = '47ae06b74471bef02205bd07e18958cddf1cccabed5a2aa2466463051491937f'
    if before.get('owned') != {release['target']: original} or after.get('owned') != {release['target']: candidate}:
        return False
    for key in ('protected', 'additional_protected', 'wordpress_state_sha256', 'post_meta_sha256', 'metadata_rows', 'production_enabled', 'home_url', 'blog_public', 'project_id', 'policy_enabled'):
        if key not in before or before[key] != after.get(key):
            return False
    key = allowed[route][0]
    protected = before['protected']
    required = ['ktk-code-pages-assets/content/'+key+'.html', 'ktk-code-pages-assets/pages/'+key+'.php', 'ktk-code-pages-assets/registry.php']
    shells = [name for name in protected if name.startswith('ktk-code-pages-assets/shells/') and name.endswith('.html')]
    renderer = before['additional_protected'].get('production-mu/ktk-code-pages.php', '')
    return bool(shells) and bool(re.fullmatch('[a-f0-9]{64}', renderer)) and all(re.fullmatch('[a-f0-9]{64}', protected.get(name, '')) for name in required + shells)


class Semantics(HTMLParser):
    def __init__(self, email_identity=True):
        super().__init__()
        self.email_identity = email_identity
        self.hidden = 0
        self.in_json = False
        self.rows = []
        self.runtimes = []
        self.canonical = []
        self.robots = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style'):
            self.hidden += 1
            if tag == 'script' and a.get('type') == 'application/ld+json':
                self.in_json = True
            if tag == 'script' and urlsplit(a.get('src', '')).path == SCRIPT:
                self.runtimes.append(a['src'])
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonical.append(a.get('href', ''))
        if tag == 'meta' and a.get('name') == 'robots':
            self.robots.append(a.get('content', ''))
        if tag in ('meta', 'link', 'img', 'source', 'iframe', 'form', 'input', 'textarea', 'select', 'option', 'a', 'body') or self.email_identity and 'data-cfemail' in a:
            # Exactly these two server-generated security values may vary per response.
            if tag == 'input' and a.get('name') in ('_ktk_nonce', '_ktk_challenge'):
                a['value'] = 'EPHEMERAL_FORM_TOKEN'
            if self.email_identity and 'data-cfemail' in a:
                a['data-cfemail'] = decoded_email(a['data-cfemail'])
            self.rows.append([tag, sorted((k, normalized_resource(v or '', self.email_identity)) for k, v in a.items())])

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.hidden = max(0, self.hidden - 1)
            self.in_json = False

    def handle_data(self, text):
        if self.in_json:
            self.rows.append(['schema', json.loads(text)])
        elif not self.hidden and text.strip():
            self.rows.append(['text', ' '.join(text.split())])

    def summary(self):
        return {'signature': digest(json.dumps(self.rows, sort_keys=True, ensure_ascii=True).encode()),
                'nodes': len(self.rows), 'canonical': self.canonical, 'robots': self.robots, 'runtimes': self.runtimes}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--upgrade-baseline', type=Path)
    parser.add_argument('--source-proof', type=Path)
    parser.add_argument('--candidate', required=True, type=Path)
    parser.add_argument('--cache-bust', action='store_true')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Fresh evidence path required')
    if args.baseline and args.upgrade_baseline or args.upgrade_baseline and args.cache_bust:
        parser.error('Baseline upgrade must read original normal cached URLs only')
    if args.source_proof and not args.upgrade_baseline:
        parser.error('Source proof is only for the explicit pre-purge legal-page baseline upgrade')
    prior = json.loads(args.baseline.read_text()) if args.baseline else None
    legacy = json.loads(args.upgrade_baseline.read_text()) if args.upgrade_baseline else None
    source_proof = json.loads(args.source_proof.read_text()) if args.source_proof else None
    expected = digest(args.candidate.read_bytes()) if prior else '38cdaa565d7fabc7f58e05cd8697dd79996c9c755d0beca9fda9e2503b2fc9e3'
    if prior and (prior['passed'] != prior['total'] or len(prior['responses']) != 348):
        raise ValueError('Complete original production baseline required')
    originals = {(row['device'], row['route']): row for row in prior['responses']} if prior else {}
    old_signatures = {(row['device'], row['route']): row for row in legacy['responses']} if legacy else {}
    if legacy and (legacy['passed'] != legacy['total'] or len(old_signatures) != 348):
        raise ValueError('Complete successful original capture required for upgrade')
    manifest = json.loads((ROOT / 'docs/code-pages/full-migration/manifest.json').read_text())
    report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'expectedRuntime': expected,
              'scope': 'Production116 content routes x3 devices, original semantics/metadata/resources; GET only',
              'checks': [], 'responses': [], 'errors': []}
    def check(name, passed, **context):
        report['checks'].append({'name': name, 'passed': bool(passed), **context})
    try:
        for device, agent in http.DEVICES.items():
            for index, row in enumerate(manifest['routes'], 1):
                route = row['route']
                if route == '/' or route.startswith(('/store', '/staging', '/wp-')):
                    raise ValueError('Protected route')
                url = 'https://krawlthroughkrakow.com' + route
                if args.cache_bust:
                    url += '?ktk_form_hotfix_verify=' + datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')
                status, headers, body = http.get(url, agent)
                parsed = Semantics()
                parsed.feed(body.decode('utf-8'))
                summary = parsed.summary()
                if legacy:
                    old_parser = Semantics(email_identity=False)
                    old_parser.feed(body.decode('utf-8'))
                    old = old_parser.summary()
                    previous = old_signatures[(device, route)]
                    identity = legacy_identity(old_parser.rows, previous['signature'])
                    source_bound = legal_source_proof(source_proof, route, identity)
                    retained = all(old[k] == previous[k] for k in ('nodes', 'canonical', 'robots'))
                    check('Original legal source unchanged; decoded cached baseline retained' if source_bound else 'Entire original legacy SHA retained under only its public email salt',
                          retained and (identity['matched'] or source_bound), route=route, device=device,
                          comparison='independent-unchanged-legal-source-not-old-CDN-hash' if source_bound else identity['mode'])
                lower = {k.lower(): v for k, v in headers.items()}
                record = {'device': device, 'route': route, 'status': status, 'cfCacheStatus': lower.get('cf-cache-status'), **summary}
                report['responses'].append(record)
                check('Successful production response', status == 200, route=route, device=device)
                check('Exactly current runtime version', len(parsed.runtimes) == 1 and dict(parse_qsl(urlsplit(parsed.runtimes[0]).query)).get('v') == expected[:12], route=route, device=device)
                check('No staging resource or canonical', not any('/staging/' in str(item) for item in parsed.rows), route=route, device=device)
                if prior:
                    old = originals[(device, route)]
                    check('Original text, schema, metadata, media, links and form contracts retained',
                          all(record[k] == old[k] for k in ('signature', 'nodes', 'canonical', 'robots')), route=route, device=device)
                if index % 40 == 0:
                    print(f'{device}: {index}/116', flush=True)
            status, headers, body = http.get('https://krawlthroughkrakow.com' + SCRIPT + '?v=' + expected[:12], agent)
            check('Actual runtime SHA-256', status == 200 and digest(body) == expected, device=device)
    except Exception as error:
        report['errors'].append(type(error).__name__ + ': ' + str(error))
    check('Complete116 route/device inventory', len(report['responses']) == 348)
    check('No transport/parser/harness failure', not report['errors'])
    report['passed'] = sum(row['passed'] for row in report['checks'])
    report['total'] = len(report['checks'])
    report['finishedAt'] = datetime.now(timezone.utc).isoformat()
    report['retries'] = http.TRANSPORT_RETRIES
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({'passed': report['passed'], 'total': report['total'],
                      'cache': dict(Counter(row['cfCacheStatus'] for row in report['responses'])),
                      'failed': [row for row in report['checks'] if not row['passed']][:10], 'errors': report['errors']}, indent=2))
    if report['passed'] != report['total']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
