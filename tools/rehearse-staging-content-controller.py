"""Default offline; explicitly rehearse interrupted controller initialization in a private staging fixture."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import secrets
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from tools import content_update_backup as backup
from tools import content_update_recovery as recovery
from tools import content_update_staging_packet as staging
from tools.content_update_client import ContentUpdateClient, UncertainRequest
from tools.content_update_staging_transport import StagingControllerTransport, PrivateBackupReader
from tools.content_update_staging_disposal import PrivateStagingDisposer


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


snapshot = load('ktk_controller_snapshot', 'snapshot-staging-update-state.py')
legacy = load('ktk_controller_helper_scope', 'rehearse-staging-private-transaction.py')
SOURCE_FILES = sorted({
    'rehearse-staging-content-controller.py', 'rehearse-staging-content-controller.ps1',
    'rehearse-staging-private-transaction.py', 'snapshot-staging-update-state.py',
    'staging-protected-state-template.php', 'staging-protected-state-core.php',
    'content-update-staging-template.php', 'content_update_staging_packet.py',
    'content_update_client.py', 'content_update_recovery.py', 'content_update_backup.py',
    'content_update_staging_transport.py', 'content_update_staging_disposal.py',
    'promote-code-pages-production.py', 'publish-clarity.py', 'publish-homepage-shortcode.py',
    'invoke-ktk-native.ps1', 'publish-store2.py', *staging.COMPONENTS.values(),
})
STATE_KEYS = ('identity', 'database', 'databaseSha256', 'protectedFiles',
              'ownedContentFiles', 'protectedStateSha256', 'rowCounts')


def source_hashes():
    paths = [ROOT / 'tools' / name for name in SOURCE_FILES]
    if any(path.is_symlink() or not path.is_file() for path in paths):
        raise ValueError('Exact non-symlink reviewed source required')
    return {path.relative_to(ROOT).as_posix(): backup.sha(path.read_bytes()) for path in paths}


def reviewed_source(application_commit, tooling_commit):
    if not backup.identifier(application_commit, 40) or not backup.identifier(tooling_commit, 40):
        raise ValueError('Exact reviewed application and tooling commits required')
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=ROOT, stderr=subprocess.DEVNULL)
    if git('rev-parse', 'HEAD').decode().strip() != tooling_commit or git('status', '--porcelain'):
        raise ValueError('Clean exact tooling commit required before any connection')
    git('diff', '--exit-code', application_commit, '--', 'staging')
    owned = snapshot.local_owned_checksums()
    tracked = set(git('ls-tree', '-r', '--name-only', tooling_commit, '--', 'staging/wp-content/mu-plugins').decode().splitlines())
    if any('staging/wp-content/mu-plugins/' + name not in tracked for name in owned):
        raise ValueError('Every public owned file must belong to the reviewed Git tree')
    return owned, source_hashes()


def unchanged(owned, hashes):
    if source_hashes() != hashes or snapshot.local_owned_checksums() != owned:
        raise ValueError('Reviewed source or immutable public build changed; stop without retry')


class HelperLease:
    """Install/remove only exact fresh helper bytes, preserving unknown or changed remote files."""
    def __init__(self, common, connection, scope, source):
        self.common, self.connection, self.scope, self.source = common, connection, scope, source
        self.attempted = False
        self.cleanup_attempted = False
        self.removed = False

    def install(self):
        if self.common.common.retrieve_file(self.scope, self.scope.path) is not None:
            raise ValueError('Fresh helper path required; existing data preserved')
        self.attempted = True
        self.common.atomic_upload(self.scope, self.scope.path, self.source)
        if self.common.common.retrieve_file(self.scope, self.scope.path) != self.source:
            raise ValueError('Exact installed helper required')

    def remove(self):
        if not self.attempted:
            return
        current = self.common.common.retrieve_file(self.scope, self.scope.path)
        if self.cleanup_attempted:
            if current is None:
                self.removed = True
                return
            raise ValueError('Prior helper cleanup was not confirmed; inspect without retrying deletion')
        self.cleanup_attempted = True
        if current is not None and current != self.source:
            raise ValueError('Changed helper preserved; automatic cleanup refused')
        self.common.remove_file(self.scope, self.scope.path)
        self.removed = self.common.common.retrieve_file(self.scope, self.scope.path) is None
        if not self.removed:
            raise ValueError('Exact helper absence not verified')


def capture(common, connection, owned, hashes, receipt, checkpoint):
    unchanged(owned, hashes)
    name = 'ktk-state-snapshot-' + secrets.token_hex(16) + '.php'
    token = secrets.token_urlsafe(32)
    source = snapshot.helper_source(name, token, int(time.time()) + 900)
    lease = HelperLease(common, connection, snapshot.TemporaryHelperFTP(connection, name), source)
    receipt.update({'helper': name, 'helperSha256': backup.sha(source), 'helperRemoved': False})
    checkpoint()
    try:
        lease.install()
        first = snapshot.fetch_snapshot(token, backup.sha(source))
        second = snapshot.fetch_snapshot(token, backup.sha(source))
        unchanged(owned, hashes)
        if not snapshot.same_state(first, second) or first['ownedContentFiles'] != owned:
            raise ValueError('Complete stable protected/public staging state required')
        receipt['privateBackup'] = snapshot.write_private_backup(ROOT / 'deploy-backups', first, second, backup.sha(source))
    finally:
        lease.remove()
        receipt['helperRemoved'] = lease.removed
        checkpoint()
    receipt.update({'rowCounts': first['rowCounts'], 'protectedFileCount': len(first['protectedFiles']),
                    'ownedContentFileCount': len(first['ownedContentFiles']),
                    'databaseSha256': first['databaseSha256'], 'protectedStateSha256': first['protectedStateSha256']})
    return first


def exercise(client, archive_path, checkpoint=lambda phase: None):
    """One controlled exit, explicit fenced recovery, durable archive, five apply/rollback steps, closure."""
    try:
        client.prepare()
    except UncertainRequest:
        pass
    else:
        raise ValueError('Compiler-bound initialization exit did not occur; no apply allowed')
    checkpoint('initialization-response-unverified')
    inspected = client.inspect_preparation()
    p = inspected['preparation']
    if not p['rootExists'] or not p['recordsComplete'] or p['seedsComplete'] or p['enginePhase'] is not None:
        raise ValueError('Expected owned private initialization cut required; no blind repeat')
    recovered = client.recover_preparation()
    checkpoint('preparation-recovered')
    if recovered['engine']['phase'] != 'prepared' or recovered['archiveAcknowledged']:
        raise ValueError('Unacknowledged prepared prior state required')
    client.export_and_acknowledge(archive_path)
    checkpoint('rollback-archive-acknowledged')
    for _ in range(5):
        client.step('apply')
    if client.state['engine']['phase'] != 'applied' or not client.state['engine']['currentExpectedInventoryVerified']:
        raise ValueError('Exact five-change private application not verified')
    checkpoint('private-fixture-applied')
    for _ in range(5):
        client.step('rollback')
    if client.state['engine']['phase'] != 'rolled-back' or not client.state['engine']['currentPriorInventoryVerified']:
        raise ValueError('Exact five-change private rollback not verified')
    closed = client.close()
    checkpoint('private-fixture-closed')
    return {'originalCaptureTime': p['originalCaptureTime'], 'recoveryStateSha256': recovered['stateSha256'],
            'privateApplySteps': 5, 'privateRollbackSteps': 5, 'terminalPhase': closed['engine']['phase'],
            'closed': closed['closed'], 'archive': client.verified_archive()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rehearse-staging', action='store_true')
    parser.add_argument('--application-commit', required=True)
    parser.add_argument('--tooling-commit', required=True)
    parser.add_argument('--report', required=True)
    args = parser.parse_args()
    destination = Path(args.report).resolve()
    if not destination.is_relative_to(ROOT / 'docs/seo') or destination.exists() or destination.is_symlink():
        raise ValueError('Fresh local SEO evidence path required')
    owned, hashes = reviewed_source(args.application_commit, args.tooling_commit)
    report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'phase': 'offline-validated',
              'scope': 'five-change-private-staging-controller-initialization-rehearsal',
              'applicationCommit': args.application_commit, 'toolingCommit': args.tooling_commit,
              'sourceHashes': hashes, 'publicOwnedFileCount': len(owned),
              'publicOwnedMapSha256': backup.sha(backup.encode(owned, sort=True)),
              'publicApplicationWrites': 0, 'databaseWrites': 0, 'activationWrites': 0,
              'cachePurges': 0, 'productionOperations': 0, 'fullPublicInventoryTransactionTested': False}
    def checkpoint(phase):
        report['phase'] = phase
        report['updatedAt'] = datetime.now(timezone.utc).isoformat()
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes((json.dumps(report, indent=2) + '\n').encode())
    if not args.rehearse_staging:
        checkpoint('offline-validated')
        print(json.dumps({'phase': report['phase'], 'publicOwnedFileCount': len(owned)}))
        return
    common = snapshot.load_common()
    connection = None
    lease = None
    try:
        checkpoint('snapshot-before')
        # Raw FTPS deliberately avoids the older transfer wrapper's automatic mutation retries.
        connection = common.common.store2.connect()
        report['before'] = {}
        before = capture(common, connection, owned, hashes, report['before'], lambda: checkpoint('snapshot-before'))
        tx, token, key = secrets.token_hex(16), secrets.token_urlsafe(32), secrets.token_hex(32)
        name, expires = 'ktk-transaction-rehearsal-' + tx + '.php', int(time.time()) + 3600
        plan = staging.fixture_plan(tx, args.application_commit, before['protectedStateSha256'])
        source = staging.helper_source(name, token, expires, args.application_commit, owned,
                                       before['protectedStateSha256'], key, preparation_fault=True)
        packet = {'schemaVersion': 1, 'mode': 'private-staging-rehearsal', 'transactionId': tx,
                  'applicationCommit': args.application_commit, 'toolingCommit': args.tooling_commit,
                  'helperSha256': backup.sha(source), 'sourceHashes': hashes, 'expires': expires,
                  'token': token, 'ownershipKey': key, 'plan': plan, 'publicOwned': owned, 'preparationFault': True}
        report['encryptedRecoveryPacket'] = recovery.RecoveryPacketVault().save(packet)
        report['transactionId'], report['helperSha256'], report['expires'] = tx, backup.sha(source), expires
        checkpoint('encrypted-packet-persisted')
        lease = HelperLease(common, connection, legacy.TemporaryHelperFTP(connection, name), source)
        unchanged(owned, hashes)
        lease.install()
        checkpoint('controller-installed')
        transport = StagingControllerTransport(staging.binding(plan), backup.sha(source), token, expires)
        reader = None
        client = None
        def request(raw):
            nonlocal reader
            unchanged(owned, hashes)
            envelope = transport(raw)
            if backup.decode(raw)['action'] == 'export':
                validated = client.validate(envelope)
                manifest = client.bind_manifest(validated.get('export'))
                reader = PrivateBackupReader(connection, tx, manifest)
            return envelope
        def read(source_path):
            unchanged(owned, hashes)
            if reader is None:
                raise ValueError('Authenticated export must precede private reads')
            return reader(source_path)
        client = ContentUpdateClient(staging.binding(plan), backup.sha(source), key, request, read)
        archive_path = ROOT / 'deploy-backups' / ('staging-content-controller-' + tx + '.zip')
        report['controller'] = exercise(client, archive_path, checkpoint)
        lease.remove()
        report['controllerHelperRemoved'] = lease.removed
        unchanged(owned, hashes)
        disposer = PrivateStagingDisposer(connection, packet, archive_path,
                                        observer=lambda event, path: unchanged(owned, hashes))
        report['privateDisposal'] = disposer.dispose()
        checkpoint('private-payload-disposed')
        report['after'] = {}
        after = capture(common, connection, owned, hashes, report['after'], lambda: checkpoint('snapshot-after'))
        if any(before[k] != after[k] for k in STATE_KEYS):
            raise ValueError('Protected or public staging state differs after rehearsal')
        unchanged(owned, hashes)
        report['allProtectedAndPublicStateExact'] = True
        checkpoint('complete')
    except Exception:
        report['failedAtPhase'] = report['phase']
        checkpoint('failed-preserve-packet-archive-and-private-state')
        raise RuntimeError('Private staging rehearsal stopped; inspect the sanitized report and encrypted recovery packet; no automatic retry') from None
    finally:
        try:
            if lease is not None:
                lease.remove()
                report['controllerHelperRemoved'] = lease.removed
        except Exception:
            checkpoint('helper-cleanup-failed-preserve-unknown-bytes')
            raise RuntimeError('Exact helper cleanup could not be verified; preserve evidence for explicit recovery') from None
        finally:
            try:
                if connection is not None:
                    connection.close()
            finally:
                report['finishedAt'] = datetime.now(timezone.utc).isoformat()
                checkpoint(report['phase'])
                print(json.dumps({key: report.get(key) for key in ('phase', 'transactionId', 'controllerHelperRemoved', 'allProtectedAndPublicStateExact')}))


if __name__ == '__main__':
    main()
