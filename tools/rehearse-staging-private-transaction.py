"""Default offline. Explicitly rehearse a small private active fixture on staging, never production."""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import re
import secrets
import subprocess
import time
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://krawlthroughkrakow.com/staging/'
REMOTE = '/public_html/staging/wp-content/mu-plugins'
TEMPLATE = ROOT / 'tools/staging-private-rehearsal-template.php'
COMPONENTS = {'state': ROOT / 'tools/staging-protected-state-core.php', 'engine': ROOT / 'tools/code-pages-update-engine.php',
              'fixture': ROOT / 'tools/staging-private-fixture.php'}


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


snapshot = load('ktk_private_fixture_snapshot', 'snapshot-staging-update-state.py')
sha = snapshot.sha
encode = snapshot.encode


def safe_name(name):
    if not isinstance(name, str) or not re.fullmatch(r'[A-Za-z0-9._/-]+', name) or any(p in ('', '.', '..') for p in name.split('/')):
        raise ValueError('Exact relative private member required')
    return name


def helper_source(name, token, expires, application_commit, owned):
    match = re.fullmatch(r'ktk-transaction-rehearsal-([a-f0-9]{32})\.php', name)
    if not match or not re.fullmatch(r'[A-Za-z0-9_-]{43}', token) or type(expires) is not int or not int(time.time()) < expires <= int(time.time()) + 900 or not re.fullmatch(r'[a-f0-9]{40}', application_commit):
        raise ValueError('Exact expiring staging fixture bindings required')
    if not isinstance(owned, dict) or not owned or len(owned) > 10000:
        raise ValueError('Bounded owned content map required')
    for n, h in owned.items():
        safe_name(n)
        if (n != 'ktk-code-pages.php' and not n.startswith('ktk-code-pages-assets/')) or not isinstance(h, str) or not re.fullmatch(r'[a-f0-9]{64}', h):
            raise ValueError('Exact owned content checksums required')
    legacy = load('ktk_private_fixture_activation', 'promote-code-pages-production.py')
    if sha(legacy.ACTIVATION_SOURCE) != 'b8a99198a1d910ea2c7266bf5ad1cafc9bc89844f0313b0aeb80a1e1c520d833':
        raise ValueError('Exact retained activation fixture required')
    values = {b'__KTK_REHEARSAL_EXPIRES__': str(expires).encode(), b'__KTK_REHEARSAL_TOKEN_SHA__': sha(token.encode()).encode(),
              b'__KTK_REHEARSAL_HELPER__': name.encode(), b'__KTK_REHEARSAL_TRANSACTION__': match[1].encode(),
              b'__KTK_REHEARSAL_COMMIT__': application_commit.encode(), b'__KTK_REHEARSAL_OWNED_MAP__': base64.b64encode(encode(dict(sorted(owned.items())))),
              b'__KTK_REHEARSAL_ACTIVATION__': base64.b64encode(legacy.ACTIVATION_SOURCE)}
    markers = {'state': b'/* __KTK_REHEARSAL_STATE_CORE__ */', 'engine': b'/* __KTK_REHEARSAL_UPDATE_ENGINE__ */', 'fixture': b'/* __KTK_REHEARSAL_PRIVATE_FIXTURE__ */'}
    source = TEMPLATE.read_bytes()
    for key, value in values.items():
        if source.count(key) != 1: raise ValueError('Rehearsal binding markers require review')
        source = source.replace(key, value)
    for key, path in COMPONENTS.items():
        body = path.read_bytes(); marker = markers[key]
        if not body.startswith(b'<?php\n') or source.count(marker) != 1: raise ValueError('Exact component embedding required')
        source = source.replace(marker, body[len(b'<?php\n'):])
    return source


class TemporaryHelperFTP:
    """Only one new staging rehearsal helper and its atomic upload temporary are writable."""
    def __init__(self, connection, name):
        if not re.fullmatch(r'ktk-transaction-rehearsal-[a-f0-9]{32}\.php', name): raise ValueError('Exact own helper required')
        self.connection, self.path = connection, REMOTE + '/' + name

    def allowed(self, path):
        if path != self.path and not re.fullmatch(re.escape(self.path) + r'\.upload-[a-f0-9]{16}\.tmp', path): raise ValueError('Only the exact staging rehearsal helper is writable')

    def storbinary(self, command, stream):
        if not command.startswith('STOR '): raise ValueError('STOR required')
        self.allowed(command[5:]); return self.connection.storbinary(command, stream)

    def retrbinary(self, command, callback):
        if not command.startswith('RETR '): raise ValueError('RETR required')
        self.allowed(command[5:]); return self.connection.retrbinary(command, callback)

    def rename(self, source, destination):
        self.allowed(source)
        if source == self.path or destination != self.path: raise ValueError('Only verified own helper activation allowed')
        return self.connection.rename(source, destination)

    def delete(self, path):
        self.allowed(path); return self.connection.delete(path)

    def mlsd(self, directory):
        if directory != REMOTE: raise ValueError('Only staging MU directory inspection allowed')
        return self.connection.mlsd(directory)


class RPCFailure(RuntimeError):
    pass


def rpc(action, token, source_sha, transaction, commit, owned_sha, baseline=None, extra=None, opener=None):
    payload = {'action': action}
    if extra: payload.update(extra)
    request = urllib.request.Request(URL + '?ktk_private_rehearsal=' + secrets.token_hex(16), data=encode(payload), method='POST', headers={
        'X-KTK-Rehearsal-Token': token, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'User-Agent': 'KTK private staging fixture/1.0'})
    opener = opener or urllib.request.build_opener(snapshot.NoRedirect())
    try:
        with opener.open(request, timeout=180) as response:
            if response.status != 200 or response.geturl() != request.full_url or response.headers.get('CF-Cache-Status', '').upper() not in ('DYNAMIC','BYPASS') or 'no-store' not in response.headers.get('Cache-Control','').lower() or 'application/json' not in response.headers.get('Content-Type',''):
                raise ValueError('Exact uncached staging response required')
            data = response.read(48000001)
            if len(data) > 48000000: raise ValueError('Private response budget exceeded')
            value = json.loads(data)
        validate_response(value, action, source_sha, transaction, commit, owned_sha, baseline)
        return value
    except Exception:
        raise RPCFailure('Private staging request failed; no response data logged') from None


def validate_response(value, action, source_sha, transaction, commit, owned_sha, baseline=None):
    if value.get('schemaVersion') != 1 or value.get('scope') != 'staging-private-active-transaction-fixture' or value.get('action') != action or value.get('helperSha256') != source_sha or value.get('transactionId') != transaction or value.get('applicationCommit') != commit or value.get('realOwnedMapSha256') != owned_sha:
        raise ValueError('Private staging source/transaction identity differs')
    identity = value.get('identity', {})
    if identity.get('home') != URL or identity.get('siteurl') != URL or identity.get('blogPublic') != 0 or value.get('privateRootOutsideCompletePublicRoot') is not True or value.get('privateRootName') != '.ktk-staging-rehearsal-' + transaction:
        raise ValueError('Exact staging/private-root identity required')
    if value.get('fixtureChangedFiles') != 5 or value.get('fixturePriorBackupFiles') != 4 or any(value.get(k) != 0 for k in ['publicApplicationWrites','publicActivationWrites','databaseWrites','cachePurges']):
        raise ValueError('Unexpected private fixture mutation scope')
    if not isinstance(value.get('status'), dict) or not isinstance(value.get('realProtectedStateSha256'), str) or not re.fullmatch(r'[a-f0-9]{64}', value['realProtectedStateSha256']):
        raise ValueError('Complete private status required')
    if baseline and any(value.get(k) != baseline.get(k) for k in ['identity','rowCounts','realProtectedStateSha256','realOwnedMapSha256','protectedFileCount','ownedContentFileCount']):
        raise ValueError('Real staging state drifted during fixture')


def write_archive(directory, exported, source_sha, owned, transaction):
    value = exported.get('privateExport', {}); manifest = value.get('manifest', {}); files = manifest.get('files', {}); blobs = value.get('fileBytesBase64', {})
    if not isinstance(files, dict) or not 1 <= len(files) <= 100 or set(files) != set(blobs) or sha(encode(manifest)) != value.get('sha256'):
        raise ValueError('Exact private export fingerprint required')
    decoded = {}; folded = set(); total = 0
    for name, row in files.items():
        safe_name(name)
        if name.casefold() in folded: raise ValueError('Ambiguous private export path')
        folded.add(name.casefold()); data = base64.b64decode(blobs[name], validate=True); total += len(data)
        if total > 33554432 or type(row.get('bytes')) is not int or len(data) != row['bytes'] or sha(data) != row.get('sha256'):
            raise ValueError('Private export member differs')
        decoded[name] = data
    if total != manifest.get('bytes'): raise ValueError('Complete private byte count required')
    original = json.loads(decoded['original-state.json']); snapshot.validate_snapshot(original, source_sha)
    if original['ownedContentFiles'] != owned or original['protectedStateSha256'] != exported['realProtectedStateSha256']:
        raise ValueError('Original real staging capture differs')
    directory = Path(directory).resolve()
    if directory != (ROOT / 'deploy-backups').resolve(): raise ValueError('Only private local deployment backups allowed')
    directory.mkdir(exist_ok=True)
    target = directory / ('staging-private-fixture-' + datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f') + '-' + transaction[:8] + '.zip')
    if target.exists(): raise ValueError('Fresh private archive required')
    context = {k: v for k, v in exported.items() if k != 'privateExport'}
    members = {'manifest.json': encode(manifest), 'context.json': encode(context), **{'private/' + n: b for n, b in decoded.items()}}
    with zipfile.ZipFile(target, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in members.items(): archive.writestr(name, data)
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None or set(archive.namelist()) != set(members) or any(archive.read(n) != b for n, b in members.items()):
            raise ValueError('Private archive CRC/member verification failed')
    return {'path': target.relative_to(ROOT).as_posix(), 'sha256': sha(target.read_bytes()), 'bytes': target.stat().st_size,
            'members': len(members), 'privateFiles': len(decoded), 'zipCRC': True, 'allMemberBytesVerified': True,
            'serverExportSha256': value['sha256'], 'originalSelectedWordPressCaptureVerified': True}


def immutable_owned(application_commit, tooling_commit):
    if not tooling_commit or not re.fullmatch(r'[a-f0-9]{40}', tooling_commit) or subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip() != tooling_commit or subprocess.check_output(['git','status','--porcelain'],cwd=ROOT).strip():
        raise ValueError('Clean exact committed tooling required before any host helper')
    owned = dict(sorted(snapshot.local_owned_checksums().items()))
    if len(owned) != 2073: raise ValueError('Complete2073-file immutable application required')
    planner = load('ktk_private_fixture_plan', 'plan-code-pages-update.py'); planner.validate_source_commit(owned, application_commit)
    return owned


def summary(value):
    status = value['status']
    return {'action': value['action'], 'phase': status['phase'], 'intents': len(status.get('intentFiles', [])),
            'pendingApply': len(status.get('pendingApplyFiles', [])), 'pendingRollback': len(status.get('pendingRollbackFiles', [])),
            'privateReceiptArtifacts': len(status.get('retainedPrivateReceiptArtifacts', {})),
            'realProtectedStateSha256': value['realProtectedStateSha256']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rehearse-staging', action='store_true')
    parser.add_argument('--application-commit', required=True)
    parser.add_argument('--tooling-commit')
    parser.add_argument('--report', required=True)
    args = parser.parse_args()
    destination = Path(args.report).resolve()
    if not re.fullmatch(r'[a-f0-9]{40}', args.application_commit) or not destination.is_relative_to(ROOT / 'docs/seo') or destination.exists():
        raise ValueError('Exact application commit and new local SEO report required')
    destination.parent.mkdir(parents=True, exist_ok=True)
    paths = [TEMPLATE, *COMPONENTS.values(), Path(__file__), ROOT/'tools/rehearse-staging-private-transaction.ps1',
             ROOT/'tools/snapshot-staging-update-state.py', ROOT/'tools/promote-code-pages-production.py',
             ROOT/'tools/publish-code-pages.py', ROOT/'tools/publish-homepage-shortcode.py', ROOT/'tools/publish-store2.py']
    hashes = {p.relative_to(ROOT).as_posix(): sha(p.read_bytes()) for p in paths}
    report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'mode': 'staging-private-active-fixture', 'phase': 'offline-validated',
              'applicationCommit': args.application_commit, 'toolingCommit': args.tooling_commit, 'sourceHashes': hashes,
              'publicApplicationWrites': 0, 'publicActivationWrites': 0, 'databaseWrites': 0, 'cachePurges': 0,
              'productionBackupCreated': False, 'productionWordPressStateVerified': False, 'canPublishProduction': False,
              'hostFixturePerformed': False, 'steps': [], 'requestTimings': []}
    if not args.rehearse_staging:
        destination.write_bytes((json.dumps(report, indent=2)+'\n').encode()); print(json.dumps(report)); return
    owned = immutable_owned(args.application_commit, args.tooling_commit)
    transaction = secrets.token_hex(16); name = 'ktk-transaction-rehearsal-' + transaction + '.php'; token = secrets.token_urlsafe(32)
    source = helper_source(name, token, int(time.time())+900, args.application_commit, owned); source_sha = sha(source); owned_sha = sha(encode(owned))
    report.update(transactionId=transaction, helper=name, helperSha256=source_sha, phase='host-rehearsal-in-progress', helperRemoved=False,
                  helperInstallationAttempted=False, privateFixtureCleanupVerified=False, realOwnedMapSha256=owned_sha)
    connection = None; failed = False
    try:
        common = snapshot.load_common(); connection = common.common.StagingFTP(); ftp = TemporaryHelperFTP(connection, name)
        if common.common.retrieve_file(ftp, ftp.path) is not None: raise RuntimeError('Fresh helper collision preserved')
        report['helperInstallationAttempted'] = True; common.atomic_upload(ftp, ftp.path, source)
        baseline = None
        def call(action, extra=None):
            started = time.monotonic(); validated = False
            try:
                result = rpc(action, token, source_sha, transaction, args.application_commit, owned_sha, baseline, extra)
                report['steps'].append(summary(result)); validated = True; return result
            finally:
                report['requestTimings'].append({'action': action, 'elapsedSeconds': round(time.monotonic()-started, 3), 'validatedResponse': validated})
        baseline = call('prepare')
        if baseline['status']['phase'] != 'prepared' or baseline['status']['verifiedBackupFiles'] != 4: raise ValueError('Exact prepared private fixture required')
        try:
            call('interrupt')
        except RPCFailure:
            report['controlledResponseFailureObserved'] = True
        else: raise RuntimeError('Controlled request interruption did not fail transport')
        interrupted = call('inspect'); state = interrupted['status']; artifacts = state.get('retainedPrivateReceiptArtifacts', {})
        if state['phase'] != 'applying' or len(state['intentFiles']) != 1 or len(state['pendingApplyFiles']) != 4 or len(artifacts) != 1 or next(iter(artifacts.values())) != {'sha256':sha(b'partial'),'bytes':7}:
            raise ValueError('Actual interrupted replacement/partial receipt proof required')
        report['interruptedPrivateReceiptArtifacts'] = artifacts
        for remaining in range(3, -1, -1):
            result = call('apply'); status = result['status']
            if len(status['pendingApplyFiles']) != remaining or status['phase'] != ('applying' if remaining else 'applied') or status['retainedPrivateReceiptArtifacts'] != artifacts:
                raise ValueError('One-file private resume differs')
        for remaining in range(4, -1, -1):
            result = call('rollback'); status = result['status']
            if len(status['pendingRollbackFiles']) != remaining or status['phase'] != ('rolling-back' if remaining else 'rolled-back'):
                raise ValueError('One-file private rollback differs')
        exported = call('export')
        report['privateArchive'] = write_archive(ROOT/'deploy-backups', exported, source_sha, owned, transaction)
        if any(sha((ROOT/n).read_bytes()) != h for n,h in hashes.items()) or snapshot.local_owned_checksums() != owned:
            raise RuntimeError('Local packet or application changed before private cleanup')
        archive = report['privateArchive']; cleaned = call('cleanup', {'exportSha256': archive['serverExportSha256'], 'archiveSha256': archive['sha256']})
        closed = call('inspect')
        for result in [cleaned, closed]:
            status = result['status']
            if status['phase'] != 'closed' or set(status['retainedPrivateFiles']) != {'closed.json','lifecycle.lock'} or status.get('rawOriginalStateRemoved') is not True or status.get('fixtureAndPriorPayloadRemoved') is not True or status.get('serverExportSha256') != archive['serverExportSha256'] or status.get('clientVerifiedArchiveSha256') != archive['sha256']:
                raise ValueError('Exact retained closure/archive cleanup proof required')
        if cleaned['status']['retainedPrivateFiles'] != closed['status']['retainedPrivateFiles']: raise ValueError('Private closure changed')
        report.update(privateFixtureCleanupVerified=True, retainedPrivateClosureFiles=closed['status']['retainedPrivateFiles'],
                      retainedPrivateRootName=closed['privateRootName'], originalRawWordPressRowsRemovedFromHost=True,
                      hostFixturePerformed=True, allComparedRealStateExact=True, rowCounts=baseline['rowCounts'], identity=baseline['identity'],
                      realProtectedStateSha256=baseline['realProtectedStateSha256'], protectedFileCount=baseline['protectedFileCount'],
                      ownedContentFileCount=baseline['ownedContentFileCount'], phase='host-fixture-verified')
    except Exception as error:
        failed = True; report.update(phase='host-fixture-failed', errorType=type(error).__name__, privateHostFixtureMayRemain=not report['privateFixtureCleanupVerified'])
    finally:
        if connection is not None:
            try:
                if report['helperInstallationAttempted']:
                    current = common.common.retrieve_file(ftp, ftp.path)
                    if current is None or sha(current) != source_sha: raise RuntimeError('Changed/missing helper requires inspection')
                    ftp.delete(ftp.path)
                    if any(n == name for n,_ in ftp.mlsd(REMOTE)) or common.common.retrieve_file(ftp, ftp.path) is not None: raise RuntimeError('Own helper still present')
                    report['helperRemoved'] = True
            except Exception:
                failed = True; report.update(phase='helper-cleanup-failed', helperCleanupFailed=True)
            finally: connection.close()
        report['finishedAt'] = datetime.now(timezone.utc).isoformat()
        if not failed and report.get('helperRemoved'): report['phase'] = 'complete'
        destination.write_bytes((json.dumps(report, indent=2)+'\n').encode())
    print(json.dumps({k: report.get(k) for k in ['phase','hostFixturePerformed','privateFixtureCleanupVerified','helperRemoved','publicApplicationWrites','publicActivationWrites','databaseWrites','cachePurges']}))
    if failed: raise RuntimeError('Staging private rehearsal failed; metadata evidence retained without raw response logging') from None


if __name__ == '__main__':
    main()
