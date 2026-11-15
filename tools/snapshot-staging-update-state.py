"""Default offline; explicitly snapshot staging data with one expiring helper, never publish content."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import secrets
import time
import urllib.error
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / 'tools/staging-protected-state-template.php'
REMOTE = '/public_html/staging/wp-content/mu-plugins'
URL = 'https://krawlthroughkrakow.com/staging/'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encode(value):
    # PHP escapes Unicode line separators even with JSON_UNESCAPED_UNICODE.
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('\u2028', '\\u2028').replace('\u2029', '\\u2029').encode()


def helper_source(name, token, expires):
    if not re.fullmatch(r'ktk-state-snapshot-[a-f0-9]{32}\.php', name) or not re.fullmatch(r'[A-Za-z0-9_-]{43}', token) or not isinstance(expires, int) or not int(time.time()) < expires <= int(time.time()) + 900:
        raise ValueError('Exact short-lived staging helper required')
    source = TEMPLATE.read_bytes()
    values = {b'__KTK_SNAPSHOT_EXPIRES__': str(expires).encode(), b'__KTK_SNAPSHOT_TOKEN_SHA__': sha(token.encode()).encode(), b'__KTK_SNAPSHOT_HELPER__': name.encode()}
    if any(source.count(key) != 1 for key in values):
        raise ValueError('Snapshot template markers require review')
    for key, value in values.items():
        source = source.replace(key, value)
    return source


class TemporaryHelperFTP:
    """Permit only this new staging helper and its verified upload temporary."""
    def __init__(self, connection, name):
        if not re.fullmatch(r'ktk-state-snapshot-[a-f0-9]{32}\.php', name):
            raise ValueError('Exact helper name required')
        self.connection, self.path = connection, REMOTE + '/' + name

    def allowed(self, path):
        if path != self.path and not re.fullmatch(re.escape(self.path) + r'\.upload-[a-f0-9]{16}\.tmp', path):
            raise ValueError('Only the exact staging snapshot helper is writable')

    def storbinary(self, command, stream):
        if not command.startswith('STOR '):
            raise ValueError('STOR required')
        self.allowed(command[5:]); return self.connection.storbinary(command, stream)

    def retrbinary(self, command, callback):
        if not command.startswith('RETR '):
            raise ValueError('RETR required')
        self.allowed(command[5:]); return self.connection.retrbinary(command, callback)

    def rename(self, source, destination):
        self.allowed(source)
        if source == self.path or destination != self.path:
            raise ValueError('Only verified helper activation is allowed')
        return self.connection.rename(source, destination)

    def delete(self, path):
        self.allowed(path); return self.connection.delete(path)

    def mlsd(self, directory):
        if directory != REMOTE:
            raise ValueError('Only staging MU directory inspection is allowed')
        return self.connection.mlsd(directory)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise ValueError('Snapshot redirects are forbidden')


def fetch_snapshot(token, source_sha, opener=None):
    request = urllib.request.Request(URL + '?ktk_protected_snapshot=' + secrets.token_hex(16), data=b'{}', method='POST', headers={
        'X-KTK-Snapshot-Token': token, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'User-Agent': 'KTK staging protected-state snapshot/1.0'})
    opener = opener or urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(request, timeout=180) as response:
            if response.status != 200 or response.geturl() != request.full_url or response.headers.get('CF-Cache-Status', '').upper() not in ('DYNAMIC', 'BYPASS') or 'no-store' not in response.headers.get('Cache-Control', '').lower() or 'application/json' not in response.headers.get('Content-Type', ''):
                raise ValueError('Uncached exact staging response required')
            value = json.loads(response.read())
    except Exception:
        raise RuntimeError('Authenticated staging snapshot failed; no response data logged') from None
    validate_snapshot(value, source_sha)
    return value


def validate_snapshot(value, source_sha):
    if value.get('schemaVersion') != 1 or value.get('scope') != 'staging-protected-original-state' or value.get('helperSha256') != source_sha or value.get('identity', {}).get('home') != URL or value['identity'].get('siteurl') != URL or value['identity'].get('blogPublic') != 0:
        raise ValueError('Unexpected staging snapshot identity or helper')
    if any(value.get(key) != 0 for key in ('databaseWrites', 'applicationWrites', 'cachePurges')):
        raise ValueError('Snapshot mutation is forbidden')
    tables = {'posts', 'postmeta', 'options', 'terms', 'term_taxonomy', 'term_relationships', 'termmeta'}
    if set(value.get('database', {})) != tables or any(not isinstance(rows, list) for rows in value['database'].values()) or value.get('rowCounts') != {key: len(rows) for key, rows in value['database'].items()}:
        raise ValueError('Complete protected database snapshot required')
    if not value['database']['posts'] or not value['database']['options'] or value.get('databaseSha256') != sha(encode(value['database'])):
        raise ValueError('Protected database hash differs')
    for key in ('protectedFiles', 'ownedContentFiles'):
        if not isinstance(value.get(key), dict) or not value[key] or any(not isinstance(name, str) or not isinstance(digest, str) or not re.fullmatch(r'[a-f0-9]{64}', digest) for name, digest in value[key].items()):
            raise ValueError('Complete checksum maps required')
    binding = {'identity': value['identity'], 'databaseSha256': value['databaseSha256'], 'files': value['protectedFiles']}
    if value.get('protectedStateSha256') != sha(encode(binding)):
        raise ValueError('Protected-state binding differs')


def same_state(before, after):
    return all(before[key] == after[key] for key in ('identity', 'helperSha256', 'database', 'databaseSha256', 'protectedFiles', 'ownedContentFiles', 'protectedStateSha256', 'rowCounts'))


def write_private_backup(directory, before, after, source_sha):
    directory = Path(directory).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / ('staging-protected-state-' + datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f') + '.zip')
    raw = {'before.json': encode(before), 'after.json': encode(after)}
    manifest = {'scope': 'Private staging WordPress state; no production backup or changed-file rollback payload', 'helperSha256': source_sha, 'files': {name: sha(data) for name, data in raw.items()}}
    with zipfile.ZipFile(target, 'x', zipfile.ZIP_DEFLATED) as archive:
        for name, data in raw.items():
            archive.writestr(name, data)
        archive.writestr('manifest.json', encode(manifest))
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None or set(archive.namelist()) != set(raw) | {'manifest.json'} or any(archive.read(name) != data for name, data in raw.items()) or json.loads(archive.read('manifest.json')) != manifest:
            raise RuntimeError('Private staging snapshot archive verification failed')
    return {'path': str(target), 'sha256': sha(target.read_bytes()), 'bytes': target.stat().st_size, 'entries': 3, 'zipCRC': True, 'allSnapshotBytesVerified': True}


def load_common():
    spec = importlib.util.spec_from_file_location('ktk_protected_snapshot_common', ROOT / 'tools/publish-clarity.py')
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def local_owned_checksums():
    proof = json.loads((ROOT / 'docs/code-pages/full-migration/build-verification.json').read_bytes())
    expected = proof.get('payloadChecksums')
    if not isinstance(expected, dict) or not expected or proof.get('passed') != proof.get('total'):
        raise ValueError('Verified complete content manifest required')
    root = ROOT / 'staging/wp-content/mu-plugins'
    assets = root / 'ktk-code-pages-assets'
    paths = [root / 'ktk-code-pages.php', *assets.rglob('*')]
    if any(p.is_symlink() for p in paths):
        raise ValueError('Symlink local content is forbidden')
    actual = {p.relative_to(root).as_posix(): sha(p.read_bytes()) for p in paths if p.is_file()}
    if actual != expected:
        raise ValueError('Local content differs from verified build')
    return actual


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot-staging', action='store_true')
    parser.add_argument('--report', required=True)
    args = parser.parse_args()
    destination = Path(args.report).resolve()
    if not destination.is_relative_to(ROOT / 'docs/seo') or destination.exists():
        raise ValueError('New local SEO evidence path required')
    destination.parent.mkdir(parents=True, exist_ok=True)
    report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'mode': 'staging-original-state-snapshot', 'phase': 'offline-validated', 'applicationWrites': 0, 'databaseWrites': 0, 'cachePurges': 0, 'productionBackupCreated': False, 'templateSha256': sha(TEMPLATE.read_bytes()), 'runnerSha256': sha(Path(__file__).read_bytes())}
    name = 'ktk-state-snapshot-' + secrets.token_hex(16) + '.php'
    token = secrets.token_urlsafe(32)
    source = helper_source(name, token, int(time.time()) + 900)
    if not args.snapshot_staging:
        destination.write_bytes((json.dumps(report, indent=2) + '\n').encode()); print(json.dumps(report)); return
    common = load_common()
    expected_owned = local_owned_checksums()
    report['expectedOwnedContentFiles'] = len(expected_owned)
    report['expectedOwnedContentMapSha256'] = sha(encode(expected_owned))
    connection = None
    report.update({'phase': 'snapshot-in-progress', 'helper': name, 'helperSha256': sha(source), 'helperRemoved': False, 'helperInstallationAttempted': False})
    try:
        connection = common.common.StagingFTP()
        ftp = TemporaryHelperFTP(connection, name)
        if common.common.retrieve_file(ftp, ftp.path) is not None:
            raise RuntimeError('Fresh helper path required')
        report['helperInstallationAttempted'] = True
        common.atomic_upload(ftp, ftp.path, source)
        before = fetch_snapshot(token, sha(source))
        after = fetch_snapshot(token, sha(source))
        if before['ownedContentFiles'] != expected_owned or after['ownedContentFiles'] != expected_owned or local_owned_checksums() != expected_owned:
            raise RuntimeError('Staging/local content differs from the verified immutable build')
        if not same_state(before, after):
            raise RuntimeError('Protected staging state changed between snapshots')
        if report['templateSha256'] != sha(TEMPLATE.read_bytes()) or report['runnerSha256'] != sha(Path(__file__).read_bytes()):
            raise RuntimeError('Snapshot source changed during execution')
        report['privateBackup'] = write_private_backup(ROOT / 'deploy-backups', before, after, sha(source))
        report.update({'phase': 'snapshots-verified', 'identity': before['identity'], 'rowCounts': before['rowCounts'], 'protectedFileCount': len(before['protectedFiles']), 'ownedContentFileCount': len(before['ownedContentFiles']), 'databaseSha256': before['databaseSha256'], 'protectedStateSha256': before['protectedStateSha256'], 'allComparedStateExact': True})
    except Exception:
        report['phase'] = 'snapshot-failed'
        raise
    finally:
        try:
            if connection is not None and report['helperInstallationAttempted']:
                ftp = TemporaryHelperFTP(connection, name)
                current = common.common.retrieve_file(ftp, ftp.path)
                if current is not None and current != source:
                    raise RuntimeError('Changed helper preserved for review; automatic removal refused')
                common.remove_file(ftp, ftp.path)
                report['helperRemoved'] = common.common.retrieve_file(ftp, ftp.path) is None
                if not report['helperRemoved']:
                    raise RuntimeError('Snapshot helper removal failed')
                if report['phase'] == 'snapshots-verified': report['phase'] = 'complete'
        except Exception:
            report['phase'] = 'helper-cleanup-failed'
            raise
        finally:
            try:
                if connection is not None: connection.close()
            except Exception:
                report['phase'] = 'transport-close-failed'
                raise RuntimeError('Snapshot transport close failed; inspect the saved receipt') from None
            finally:
                token = None
                report['finishedAt'] = datetime.now(timezone.utc).isoformat()
                destination.write_bytes((json.dumps(report, indent=2) + '\n').encode())
                print(json.dumps({key: report.get(key) for key in ('phase', 'rowCounts', 'protectedFileCount', 'ownedContentFileCount', 'helperRemoved', 'privateBackup')}))


if __name__ == '__main__':
    main()
