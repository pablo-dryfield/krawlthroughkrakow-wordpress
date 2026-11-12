"""Verify unchanged captured visual assets against the readiness checkpoint."""
import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / 'deploy-backups/code-pages-before-booking-link-revisions-20261105-172108.zip'
with zipfile.ZipFile(BACKUP) as archive:
    entries = json.loads(archive.read('CHECKPOINT-MANIFEST.json'))
changes = []
visual_changes = []
homepage_changes = []
checked_visual = 0
for entry in entries:
    relative = entry['path']
    if not relative.startswith('staging/wp-content/mu-plugins/'): continue
    file = ROOT / relative
    actual = hashlib.sha256(file.read_bytes()).hexdigest() if file.is_file() else None
    changed = actual != entry['sha256']
    if changed: changes.append(relative)
    if '/ktk-code-pages-assets/styles/' in relative or '/ktk-code-pages-assets/media/' in relative or relative.endswith('/font-resilience.css'):
        checked_visual += 1
        if changed: visual_changes.append(relative)
    if '/ktk-homepage' in relative and changed: homepage_changes.append(relative)
report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'backup': str(BACKUP.relative_to(ROOT)),
          'changedOwnedFiles': changes, 'preservedVisualAssets': checked_visual, 'unexpectedVisualAssetChanges': visual_changes,
          'homepageChangedFiles': homepage_changes,
          'passed': not visual_changes and homepage_changes == ['staging/wp-content/mu-plugins/ktk-homepage-assets/parity-seasonal-content.php']}
(ROOT / 'docs/code-pages/production-readiness/revision-scope-audit.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({key: report[key] for key in ('passed', 'preservedVisualAssets', 'unexpectedVisualAssetChanges', 'homepageChangedFiles')}, indent=2))
raise SystemExit(not report['passed'])
