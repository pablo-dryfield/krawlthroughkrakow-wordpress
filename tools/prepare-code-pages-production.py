"""Read-only production target inventory and release plan. This tool cannot publish."""
import argparse
import hashlib
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REMOTE = '/public_html/wp-content/mu-plugins'
ASSETS = 'ktk-code-pages-assets'
RENDERER = 'ktk-code-pages.php'
ACTIVATION = 'ktk-code-pages-production.php'


def load_publisher():
    spec = importlib.util.spec_from_file_location('code_pages_publisher', ROOT / 'tools/publish-code-pages.py')
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def allowed_path(path):
    if any(part in ('', '.', '..') for part in path.lstrip('/').split('/')) or '\\' in path:
        return False
    return path in (REMOTE + '/' + RENDERER, REMOTE + '/' + ACTIVATION, REMOTE + '/' + ASSETS) or path.startswith(REMOTE + '/' + ASSETS + '/')


class ReadOnlyFTP:
    def __init__(self, connection): self.connection = connection
    def retrbinary(self, command, callback):
        if not command.startswith('RETR ') or not allowed_path(command[5:]): raise PermissionError('Only owned production payload reads are allowed')
        return self.connection.retrbinary(command, callback)
    def mlsd(self, directory):
        if not allowed_path(directory) or not (directory == REMOTE + '/' + ASSETS or directory.startswith(REMOTE + '/' + ASSETS + '/')):
            raise PermissionError('Only the owned production asset directory may be listed')
        return self.connection.mlsd(directory)
    def close(self): self.connection.close()
    def __getattr__(self, name): raise PermissionError('Read-only production inventory prohibits: ' + name)


def read_report(relative):
    return json.loads((ROOT / relative).read_text(encoding='utf-8'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true', help='prepare a plan without connecting; production inventory remains unverified')
    parser.add_argument('--report', default='docs/code-pages/production-readiness/production-dry-run.json')
    args = parser.parse_args()
    destination = (ROOT / args.report).resolve()
    if not destination.is_relative_to(ROOT): raise ValueError('Report must stay in the workspace')
    publisher = load_publisher()
    files = publisher.local_payload(full=True)
    hashes = {name: hashlib.sha256(content).hexdigest() for name, content in files.items()}
    staging = read_report('docs/code-pages/production-readiness/staging-pages-publish.json')
    if staging.get('phase') != 'complete' or not staging.get('all_remote_owned_checksums_match') or staging['local_checksums'] != hashes:
        raise RuntimeError('Current local payload must exactly match the verified staging release')
    seo = read_report('docs/code-pages/production-readiness/production-seo-baseline.json')
    if seo['errors'] or len(seo['routes']) != 116 or (datetime.now(timezone.utc) - datetime.fromisoformat(seo['checkedAt'])).total_seconds() > 86400:
        raise RuntimeError('A complete production SEO baseline less than 24 hours old is required')
    report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'mode': 'read-only-production-dry-run',
              'canPublish': False, 'remoteWrites': 0, 'productionInventoryVerified': False,
              'stagingMatchesLocal': True, 'payloadChecksums': hashes, 'productionExistingChecksums': {},
              'activationRequired': 'Explicit KTK_CODE_PAGES_PRODUCTION_ENABLED=true on the canonical production site only',
              'releaseOrder': ['Back up production owned files and WordPress posts/settings', 'Verify complete dependencies', 'Verify registry and renderer while activation remains disabled', 'Promote the separately verified homepage booking-link payload', 'Enable production activation last', 'Verify every route, indexing policy, forms/integrations and booking destination', 'Purge only approved production caches and verify clean device variants'],
              'rollback': 'Disable production activation first to restore original WordPress/Divi routing; restore verified owned-file backups, then clear scoped caches. Original posts/settings must remain intact.',
              'protected': ['Homepage outside its separately approved booking-link release', 'Ecwid store and fallback', 'Storefront plugin', 'OmniLodge', 'Global WordPress/Divi/WPCode/Iubenda settings'],
              'notPerformed': ['Production upload/activation', 'WordPress settings/post snapshot', 'Production cache purge', 'Production post-cutover verification']}
    if not args.offline:
        common = publisher.load_publisher()
        ftp = ReadOnlyFTP(common.store2.connect())
        try:
            existing = {ASSETS + '/' + name: content for name, content in common.store2.read_tree(ftp, REMOTE + '/' + ASSETS).items()}
            for name in (RENDERER, ACTIVATION):
                content = common.retrieve_file(ftp, REMOTE + '/' + name)
                if content is not None: existing[name] = content
            report['productionExistingChecksums'] = {name: hashlib.sha256(content).hexdigest() for name, content in existing.items()}
            report['productionInventoryVerified'] = True
        finally: ftp.close()
    report['newPayloadFiles'] = [name for name in hashes if name not in report['productionExistingChecksums']]
    report['changedPayloadFiles'] = [name for name in hashes if name in report['productionExistingChecksums'] and hashes[name] != report['productionExistingChecksums'][name]]
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({key: report[key] for key in ('mode', 'canPublish', 'remoteWrites', 'stagingMatchesLocal', 'productionInventoryVerified')}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
