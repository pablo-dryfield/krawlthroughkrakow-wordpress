"""Read-only clean-URL verification of the staged homepage incoming-booking fix."""
import argparse
import importlib.util
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('full_release', ROOT / 'tools/verify-code-pages-full-release.py')
release = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(release)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--label', default='homepage-clean-cache')
    args = parser.parse_args()
    if not re.fullmatch('[a-z0-9-]+', args.label): raise ValueError('Invalid report label')
    checks, responses = [], []
    url = release.BASE + '/'
    for device, agent in release.DEVICES.items():
        status, headers, body = release.get(url, agent)
        parsed = release.Head(); parsed.feed(body.decode('utf-8'))
        headers = {key.lower(): value for key, value in headers.items()}
        legacy = [target for target in parsed.targets if re.search(r'krawlthroughkrakow\.com/(?:staging/)?store(?:/|$)|fareharbor\.com/embeds/book/krawlthroughkrakow/', target)]
        for name, passed in [('HTTP 200', status == 200), ('one staging canonical', [l.get('href') for l in parsed.links if l.get('rel') == 'canonical'] == [url]),
                             ('staging noindex', any(m.get('name') == 'robots' and 'noindex' in m.get('content', '') for m in parsed.meta)),
                             ('no legacy booking links', not legacy), ('brunch links to current product 29', url + 'store2/bottomless-brunch-29/#book' in parsed.targets),
                             ('NYE links to current product 32', url + 'store2/nye-pub-crawl-32/#book' in parsed.targets)]:
            checks.append({'device': device, 'name': name, 'passed': passed})
        responses.append({'device': device, 'status': status, 'cfCacheStatus': headers.get('cf-cache-status'), 'age': headers.get('age')})
    report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'url': url, 'passed': sum(c['passed'] for c in checks), 'total': len(checks), 'checks': checks, 'responses': responses}
    (ROOT / f'docs/code-pages/production-readiness/{args.label}.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({'passed': report['passed'], 'total': report['total'], 'responses': responses}, indent=2))
    return report['passed'] != report['total']


if __name__ == '__main__': raise SystemExit(main())
