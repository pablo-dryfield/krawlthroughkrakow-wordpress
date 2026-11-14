"""Verify real native-form token/configuration endpoints without submitting messages."""
import json
import argparse
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
arguments=argparse.ArgumentParser(description=__doc__)
arguments.add_argument('--production',action='store_true')
arguments.add_argument('--output',type=Path)
args=arguments.parse_args()
base='https://krawlthroughkrakow.com' + ('' if args.production else '/staging')
destination=args.output or ROOT / ('docs/code-pages/production-release/form-contracts.json' if args.production else 'docs/code-pages/full-migration/staging-form-contracts.json')
if not destination.is_absolute():
    destination=ROOT / destination
if destination.exists():
    raise SystemExit('Preserve earlier evidence; provide a fresh --output path')


class Forms(HTMLParser):
    def __init__(self):
        super().__init__()
        self.native = []
        self.cf7 = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'form' and attrs.get('data-ktk-form') == 'contact':
            self.native.append((attrs['data-route-key'], attrs['data-form-index']))
        if tag == 'input' and attrs.get('name') == '_wpcf7':
            self.cf7.append(attrs['value'])


checks = []
forms = set()
cf7 = set()
for file in (ROOT / 'staging/wp-content/mu-plugins/ktk-code-pages-assets/content').glob('*.html'):
    parser = Forms(); parser.feed(file.read_text(encoding='utf-8'))
    forms.update(parser.native); cf7.update(parser.cf7)
for key, index in sorted(forms):
    url = base + '/wp-admin/admin-ajax.php?' + urllib.parse.urlencode(dict(action='ktk_pages_form_token', route_key=key, form_index=index))
    try:
        request = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0','Cache-Control':'no-cache'})
        with urllib.request.urlopen(request,timeout=60) as response:
            data = json.load(response)
            valid = response.status == 200 and data.get('success') is True and bool(data['data']['nonce']) and bool(data['data']['challenge']['token']) and data['data']['challenge']['expires'] > time.time()
        checks.append(dict(key=key,index=index,passed=valid))
    except Exception as error:
        checks.append(dict(key=key,index=index,passed=False,error=str(error)))
for form_id in sorted(cf7):
    url = base + '/wp-json/contact-form-7/v1/contact-forms/' + form_id + '/feedback'
    try:
        request = urllib.request.Request(url,method='OPTIONS',headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(request,timeout=60) as response:
            schema = json.load(response)
            valid = response.status == 200 and any('POST' in endpoint.get('methods',[]) for endpoint in schema.get('endpoints',[]))
        checks.append(dict(cf7_id=form_id,passed=valid,note='OPTIONS confirms existing API method; no message submitted.'))
    except Exception as error:
        checks.append(dict(cf7_id=form_id,passed=False,error=str(error)))
report = dict(checkedAt=datetime.now(timezone.utc).isoformat(),passed=sum(c['passed'] for c in checks),total=len(checks),checks=checks,noMessagesSubmitted=True)
destination.parent.mkdir(parents=True,exist_ok=True)
destination.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
raise SystemExit(int(report['passed'] != report['total']))
