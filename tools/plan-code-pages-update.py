"""Prepare an active-site content update plan. Cannot publish, upload helpers or purge."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import ftplib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
REMOTE = '/public_html/wp-content/mu-plugins'
ASSETS = 'ktk-code-pages-assets'
RENDERER = 'ktk-code-pages.php'
ACTIVATION = 'ktk-code-pages-production.php'
DEVICES = {'desktop', 'android', 'ipad'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def payload_name(name):
    if not isinstance(name, str) or not re.fullmatch(r'[A-Za-z0-9._/-]+', name):
        raise ValueError('An exact owned payload name is required')
    if any(p in ('', '.', '..') for p in name.split('/')):
        raise ValueError('Unsafe payload path')
    if name != RENDERER and not name.startswith(ASSETS + '/'):
        raise ValueError('Only content payload files may be planned; activation is immutable')
    return name


def inside_workspace(value, root=ROOT):
    p = Path(value)
    p = p if p.is_absolute() else root / p
    candidates = [p, *p.parents]
    if any(q.is_symlink() for q in candidates if q == root or root in q.parents) or not p.resolve().is_relative_to(root.resolve()):
        raise ValueError('Evidence paths must stay inside the workspace without symlinks')
    return p.resolve()


def reviewed_time(value, now):
    t = datetime.fromisoformat(value)
    if t.tzinfo is None or not -60 <= (now - t).total_seconds() <= 86400:
        raise ValueError('Current timezone-aware evidence within24 hours required')
    return t


def validate_release(expected, routes, staging, phases, now=None):
    now = now or datetime.now(timezone.utc)
    if not {RENDERER, ASSETS + '/registry.php', ASSETS + '/runtime.js', ASSETS + '/runtime.css'}.issubset(expected) or any(not isinstance(v, str) or not re.fullmatch(r'[a-f0-9]{64}', v) for v in expected.values()):
        raise ValueError('Complete SHA256 payload inventory required')
    for name in expected:
        payload_name(name)
    if len(routes) != 116 or len(set(routes)) != 116 or any(not isinstance(r, str) or not re.fullmatch(r'/(?:[a-z0-9][a-z0-9-]*/)+', r) or r.split('/')[1] in ('staging', 'store', 'store2', 'wp-admin', 'wp-json', 'wp-content', 'wp-includes') for r in routes):
        raise ValueError('Exact116 reviewed content routes required')
    if staging.get('mode') != 'publish-staging-only' or staging.get('phase') != 'complete' or staging.get('url') != 'https://krawlthroughkrakow.com/staging/about-us/how-to-join/':
        raise ValueError('Completed staging-only publication required')
    for key in ('wordpress_state_unchanged', 'homepage_unchanged', 'storefront_unchanged', 'all_remote_owned_checksums_match', 'helper_removed'):
        if staging.get(key) is not True:
            raise ValueError('Staging protected-state and helper-removal proof required')
    if staging.get('file_count') != len(expected) or any(staging.get(k) != expected for k in ('local_checksums', 'remote_checksums')) or staging.get('after', {}).get('owned_checksums') != expected:
        raise ValueError('Current local, staged and independent remote payloads must match')
    before, after = staging.get('before', {}), staging.get('after', {})
    state = lambda row: {k: v for k, v in row.items() if k not in ('owned_checksums', 'origin_cache_cleared')}
    if not {'posts', 'options_sha256', 'ecwid_page_sha256'}.issubset(before) or state(before) != state(after):
        raise ValueError('Original staging WordPress/commerce state must be exact')
    if not staging.get('smoke_checks') or not all(v is True for v in staging['smoke_checks'].values()):
        raise ValueError('All staging smoke checks must pass')
    previous = reviewed_time(staging['finished_at'], now)
    if set(phases) != {'origin', 'normal', 'repeat'}:
        raise ValueError('All three complete release phases required')
    coverage = {(r, d) for r in routes for d in DEVICES}
    assets = None
    for phase in ('origin', 'normal', 'repeat'):
        report = phases[phase]
        t = reviewed_time(report['checkedAt'], now)
        summary, checks, rows = report.get('summary', {}), report.get('checks', []), report.get('responses', [])
        if t < previous or report.get('environment') != 'staging' or report.get('cacheBusted') is not (phase == 'origin') or report.get('retries') != []:
            raise ValueError('Ordered staging phases with no retries and correct cache mode required')
        if len(checks) < len(coverage) or summary.get('passed') != len(checks) or summary.get('total') != len(checks) or summary.get('routes') != 116 or not all(c.get('passed') is True for c in checks):
            raise ValueError('Every full-release assertion must pass')
        if len(rows) != len(coverage) or {(r.get('route'), r.get('device')) for r in rows} != coverage or any(r.get('status') != 200 for r in rows):
            raise ValueError('Exactly348 successful unique route/device responses required')
        allowed = {'DYNAMIC', 'MISS', 'BYPASS'} if phase == 'origin' else {'HIT'} if phase == 'repeat' else {'HIT', 'MISS'}
        if any(r.get('cfCacheStatus') not in allowed for r in rows):
            raise ValueError('Complete origin/normal/warmed cache evidence required')
        count = summary.get('assets')
        if type(count) is not int or count < 1 or assets is not None and count != assets:
            raise ValueError('Consistent complete asset verification required')
        assets, previous = count, t
    return {'routes': 116, 'devices': 3, 'warmedHITs': 348, 'assets': assets, 'lastVerifiedAt': previous.isoformat()}


def validate_source_commit(expected, commit, root=ROOT):
    if not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('Immutable full application commit required')
    tree = {}
    for line in subprocess.check_output(['git', 'ls-tree', '-r', commit, '--', 'staging/wp-content/mu-plugins'], cwd=root, text=True).splitlines():
        entry, name = line.split('\t')
        tree[name] = entry.split()[2]
    for name, checksum in expected.items():
        relative = 'staging/wp-content/mu-plugins/' + payload_name(name)
        p = inside_workspace(relative, root)
        data = p.read_bytes()
        if sha(data) != checksum or hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() != tree.get(relative):
            raise ValueError('Application bytes differ from the verified immutable commit: ' + name)


class ReadOnlyOwnedFTP:
    """No mutation method is exposed, including indirect STOR/rename/SITE access."""
    def __init__(self, connection, expected_names):
        self._connection = connection
        self._names = {payload_name(n) for n in expected_names} | {ACTIVATION}

    def retrbinary(self, command, callback):
        if not command.startswith('RETR ') or command[5:] not in {REMOTE + '/' + n for n in self._names}:
            raise PermissionError('Only exact reviewed production payload reads allowed')
        return self._connection.retrbinary(command, callback)

    def mlsd(self, directory):
        if directory != REMOTE + '/' + ASSETS and not directory.startswith(REMOTE + '/' + ASSETS + '/'):
            raise PermissionError('Only the owned production asset namespace may be listed')
        payload_name(directory[len(REMOTE) + 1:] + '/__directory_check__')
        result = list(self._connection.mlsd(directory))
        seen = set()
        for name, facts in result:
            if name in ('.', '..') and facts.get('type') in ('cdir', 'pdir'):
                continue
            payload_name(directory[len(REMOTE) + 1:] + '/' + name)
            if name in seen or '/' in name or facts.get('type') not in ('file', 'dir') or 'unix.slink' in facts:
                raise PermissionError('Symlinks and ambiguous directory entries are prohibited')
            seen.add(name)
        return result

    def close(self):
        return self._connection.close()

    def __getattr__(self, name):
        raise PermissionError('Read-only production inventory prohibits: ' + name)


def inspect_owned(ftp, progress=None):
    result = {}

    def read(name, listed=False):
        output = io.BytesIO()
        try:
            ftp.retrbinary('RETR ' + REMOTE + '/' + name, output.write)
        except ftplib.error_perm as error:
            if str(error).startswith('550'):
                if listed:
                    raise PermissionError('A listed owned file could not be inventoried: ' + name) from error
                return
            raise
        data = output.getvalue()
        result[name] = sha(data)
        if progress:
            progress(name, len(data))

    def walk(relative):
        for name, facts in ftp.mlsd(REMOTE + '/' + relative):
            if facts.get('type') == 'dir':
                walk(relative + '/' + name)
            elif facts.get('type') == 'file':
                read(relative + '/' + name, listed=True)

    walk(ASSETS)
    for name in (RENDERER, ACTIVATION):
        read(name)
    return result


def change_plan(expected, existing, activation_sha):
    if existing.get(ACTIVATION) != activation_sha or RENDERER not in existing:
        raise ValueError('Exact existing active-production marker/renderer required; this tool cannot activate')
    if set(existing) - set(expected) - {ACTIVATION}:
        raise ValueError('Unexpected production-owned files need review; no automatic deletion')
    changed = sorted(n for n in expected if existing.get(n) != expected[n])
    new = sorted(n for n in changed if n not in existing)
    backups = sorted(({n for n in changed if n in existing} | {RENDERER, ASSETS + '/registry.php', ACTIVATION}) & set(existing))
    return {'changedFiles': changed, 'newFiles': new, 'unchangedFiles': sorted(n for n in expected if existing.get(n) == expected[n]),
            'requiredPriorFileBackups': {n: existing[n] for n in backups}, 'retainedActivationSha256': activation_sha,
            'activationWrites': 0, 'deletions': 0, 'rollbackCreated': False,
            'scope': 'Only the reviewed code-page payload; homepage/discovery/storefront/Ecwid/WordPress data excluded'}


def load_module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('staging-report', 'origin-report', 'normal-report', 'repeat-report', 'application-commit', 'report'):
        p.add_argument('--' + name, required=True)
    p.add_argument('--inspect-production', action='store_true', help='Read-only owned FTPS inventory; never uploads a helper')
    return p


def main():
    args = parser().parse_args()
    destination = inside_workspace(args.report)
    if destination.exists():
        raise ValueError('Preserve prior evidence; choose a fresh report')
    pages = load_module('ktk_update_plan_pages', 'publish-code-pages.py')
    files = pages.local_payload(full=True)
    expected = {n: sha(b) for n, b in files.items()}
    inputs = {phase: inside_workspace(getattr(args, phase + '_report')) for phase in ('staging', 'origin', 'normal', 'repeat')}
    data = {phase: json.loads(p.read_bytes()) for phase, p in inputs.items()}
    routes = {r['route'] for r in pages.validate_full_registry(pages.registry_data())['routes']}
    verification = validate_release(expected, routes, data['staging'], {k: data[k] for k in ('origin', 'normal', 'repeat')})
    validate_source_commit(expected, args.application_commit)
    backup = inside_workspace(data['staging']['backup'])
    with zipfile.ZipFile(backup) as archive:
        if sha(backup.read_bytes()) != data['staging']['backup_sha256'] or archive.testzip() is not None:
            raise ValueError('Verified staging rollback archive required')
    report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'mode': 'read-only-production-update-plan' if args.inspect_production else 'local-update-preparation',
              'canPublish': False, 'remoteWrites': 0, 'applicationCommit': args.application_commit, 'stagingVerification': verification,
              'inputEvidence': {k: {'path': p.relative_to(ROOT).as_posix(), 'sha256': sha(p.read_bytes())} for k, p in inputs.items()},
              'payloadChecksums': expected, 'productionInventoryVerified': False, 'productionExistingChecksums': None, 'changes': None,
              'productionWordPressStateVerified': False, 'productionBackupCreated': False, 'phase': 'local-prepared',
              'sourceHashes': {n: sha((ROOT / 'tools' / n).read_bytes()) for n in ('plan-code-pages-update.py', 'plan-code-pages-update.ps1', 'promote-code-pages-production.py', 'prepare-code-pages-production.py', 'publish-homepage-shortcode.py', 'publish-code-pages.py')},
              'remainingGates': ['Reviewed atomic updater and rollback', 'Fresh protected WordPress/meta/forms/settings snapshot', 'Verified production rollback',
                                 'Separate owner production authorization', 'Applicable homepage/discovery/storefront review as separate scopes', 'Approved cache/device/indexing checks']}
    if args.inspect_production:
        legacy = load_module('ktk_update_plan_legacy', 'promote-code-pages-production.py')
        progress_path = destination.with_suffix('.progress.json')
        if progress_path.exists():
            raise ValueError('Preserve prior inventory progress evidence')
        destination.parent.mkdir(parents=True, exist_ok=True)
        stats = {'startedAt': datetime.now(timezone.utc).isoformat(), 'verifiedFiles': 0, 'bytesRead': 0, 'remoteWrites': 0}
        def progress(name, size):
            stats['verifiedFiles'] += 1
            stats['bytesRead'] += size
            if stats['verifiedFiles'] % 100 == 0:
                row = dict(stats, checkedAt=datetime.now(timezone.utc).isoformat(), lastOwnedFile=name, phase='reading-not-yet-verified')
                progress_path.write_bytes((json.dumps(row, indent=2) + '\n').encode('utf-8'))
                print(json.dumps({'ownedFilesRead': stats['verifiedFiles'], 'bytesRead': stats['bytesRead'], 'remoteWrites': 0}), flush=True)
        # The existing transport buffers each retry from byte zero and reconnects
        # after32 transfers. The outer capability still exposes only scoped reads.
        connection = None
        try:
            connection = ReadOnlyOwnedFTP(pages.load_publisher().StagingFTP(), expected)
            existing = inspect_owned(connection, progress)
            report['changes'] = change_plan(expected, existing, sha(legacy.ACTIVATION_SOURCE))
            if any(sha((ROOT / 'tools' / n).read_bytes()) != h for n, h in report['sourceHashes'].items()):
                raise RuntimeError('Planner/legacy source changed during inventory; evidence rejected')
            report['productionExistingChecksums'] = existing
            report['productionInventoryVerified'] = True
            report['phase'] = 'inventory-complete'
        except Exception as error:
            report.update(phase='inventory-failed', errorType=type(error).__name__, inventoryReadStats=stats,
                          finishedAt=datetime.now(timezone.utc).isoformat())
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes((json.dumps(report, indent=2) + '\n').encode('utf-8'))
            raise
        finally:
            if connection is not None:
                connection.close()
        report['inventoryReadStats'] = dict(stats, finishedAt=datetime.now(timezone.utc).isoformat())
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes((json.dumps(report, indent=2) + '\n').encode('utf-8'))
    print(json.dumps({k: report[k] for k in ('mode', 'canPublish', 'remoteWrites', 'productionInventoryVerified', 'productionWordPressStateVerified', 'productionBackupCreated')}))


if __name__ == '__main__':
    main()
