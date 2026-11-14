"""Compare original production semantics, indexing and resources across all device caches."""
import argparse
import hashlib
import importlib.util
import json
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


def normalized_resource(value):
    url = urlsplit(value)
    if url.path == SCRIPT:
        return urlunsplit(url._replace(query=urlencode([(k, 'FORM_HOTFIX_VERSION' if k == 'v' else v) for k, v in parse_qsl(url.query)])))
    return value


class Semantics(HTMLParser):
    def __init__(self):
        super().__init__()
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
        if tag in ('meta', 'link', 'img', 'source', 'iframe', 'form', 'input', 'textarea', 'select', 'option', 'a', 'body'):
            # Exactly these two server-generated security values may vary per response.
            if tag == 'input' and a.get('name') in ('_ktk_nonce', '_ktk_challenge'):
                a['value'] = 'EPHEMERAL_FORM_TOKEN'
            self.rows.append([tag, sorted((k, normalized_resource(v or '')) for k, v in a.items())])

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
    parser.add_argument('--candidate', required=True, type=Path)
    parser.add_argument('--cache-bust', action='store_true')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Fresh evidence path required')
    prior = json.loads(args.baseline.read_text()) if args.baseline else None
    expected = digest(args.candidate.read_bytes()) if prior else '38cdaa565d7fabc7f58e05cd8697dd79996c9c755d0beca9fda9e2503b2fc9e3'
    if prior and (prior['passed'] != prior['total'] or len(prior['responses']) != 348):
        raise ValueError('Complete original production baseline required')
    originals = {(row['device'], row['route']): row for row in prior['responses']} if prior else {}
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
