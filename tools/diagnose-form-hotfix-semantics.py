"""Read-only cached/origin semantic diff; never form submissions."""
import argparse
import difflib
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('hotfix_diagnostic', ROOT / 'tools/verify-form-hotfix-release.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
if args.output.exists():
    raise SystemExit('Preserve earlier evidence')
rows = []
for route in ('/contact/', '/about-us/', '/spooktacular-krakow-unveil-the-mysteries-of-halloween/', '/stag-do-costume/'):
    values = []
    for suffix in ('', '?ktk_form_semantics=' + datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')):
        status, headers, body = audit.http.get('https://krawlthroughkrakow.com'+route+suffix, audit.http.DEVICES['desktop'])
        parsed = audit.Semantics()
        parsed.feed(body.decode('utf-8'))
        values.append((parsed, {**parsed.summary(), 'status': status, 'cache': {k.lower():v for k,v in headers.items()}.get('cf-cache-status')}))
    cached, origin = values
    changes = []
    a = [json.dumps(row, sort_keys=True) for row in cached[0].rows]
    b = [json.dumps(row, sort_keys=True) for row in origin[0].rows]
    for kind, left, right, start, end in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if kind != 'equal':
            changes.append({'kind': kind, 'cached': cached[0].rows[left:right], 'origin': origin[0].rows[start:end]})
    rows.append({'route': route, 'cached': cached[1], 'origin': origin[1], 'changes': changes})
report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'scope': 'Public HTML GETs only; public parsed nodes, no cookies/headers/tokens saved', 'rows': rows}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps([{'route': row['route'], 'cached': row['cached']['cache'], 'origin': row['origin']['cache'], 'changedGroups': len(row['changes']), 'changes': row['changes'][:3]} for row in rows], indent=2))
