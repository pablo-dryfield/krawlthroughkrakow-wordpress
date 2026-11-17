"""One separately witnessed cleanup batch, retaining an existing signed abandonment.

No original authority is renewed. Each explicit invocation needs a new complete
raw witness and distinct encrypted authorization. Default disposal stays exact.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import subprocess
import time
from pathlib import Path

from tools import content_update_backup as backup
from tools import content_update_recovery as crypto
from tools import unprepared_engine_seed_disposal as prior

SCOPE = 'fresh-witness-signed-abandonment-cleanup-batch'
MAGIC = b'KTK-DPAPI-SIGNED-ABANDONMENT-CLEANUP-BATCH-1\n'
FIELDS = prior.FIELDS | {'predecessorDisposalId', 'abandonedSeedStateSha256'}


def projection(value):
    return {**{k: value[k] for k in prior.FIELDS}, 'scope': prior.SCOPE}


def validate_packet(value, now=None):
    if (not isinstance(value, dict) or set(value) != FIELDS
            or value['scope'] != SCOPE
            or not backup.identifier(value['predecessorDisposalId'], 32)
            or not backup.digest(value['abandonedSeedStateSha256'])
            or value['disposalId'] == value['predecessorDisposalId']):
        raise ValueError('Distinct signed-abandonment batch context required')
    prior.validate_packet(projection(value), now)
    if len(backup.encode(value)) > crypto.LIMIT:
        raise ValueError('Bounded signed-abandonment context required')
    return value


def validate_predecessor(value, predecessor, old):
    validate_packet(value)
    prior.validate_packet(predecessor)  # Expired evidence is not execution authority.
    prior.validate_original_binding(predecessor, old)
    prior.validate_original_binding(projection(value), old)
    if (value['predecessorDisposalId'] != predecessor['disposalId']
            or value['token'] == predecessor['token']
            or value['originalArchiveSha256'] != predecessor['originalArchiveSha256']):
        raise ValueError('Exact predecessor provenance and new token required')


def controller_source(closure):
    """Overlay only the existing closure bytes, closed-only gate and action list."""
    source = prior.controller_source()
    start = source.index(b'    private function closure(')
    end = source.index(b'    private function inspect(', start)
    previous = source[start:end]
    replacement = (b'    private function closure(KTK_Content_Update_Private_Store $store,string $seed): string\n'
                   b'    {\n'
                   b"        if($seed!=='" + closure['abandonedSeedStateSha256'].encode() + b"'){throw new RuntimeException('Exact prior abandonment inventory required');}\n"
                   b"        return base64_decode('" + base64.b64encode(backup.encode(closure)) + b"',true);\n"
                   b'    }\n')
    changes = [(previous, replacement),
               (b"$closed=$store->read('closed.json');",
                b"$closed=$store->read('closed.json');if($closed===null){throw new RuntimeException('Existing signed abandonment required; no new closure may be written');}"),
               (b"'abandon'=>array('stateSha256','abandonedSeedStateSha256'),", b'')]
    for before, after in changes:
        if source.count(before) != 1:
            raise ValueError('Exact signed-abandonment overlay boundary required')
        source = source.replace(before, after, 1)
    recovered = source
    # Empty action replacement is inverted at its exact adjacent action boundary.
    recovery_anchor = b"'inspect-abandoned'=>array('abandonedSeedStateSha256'),'cleanup'=>"
    original_anchor = b"'inspect-abandoned'=>array('abandonedSeedStateSha256'),'abandon'=>array('stateSha256','abandonedSeedStateSha256'),'cleanup'=>"
    if recovered.count(recovery_anchor) != 1:
        raise ValueError('Exact closed-only action inverse required')
    recovered = recovered.replace(recovery_anchor, original_anchor, 1)
    for before, after in reversed(changes[:2]):
        if recovered.count(after) != 1:
            raise ValueError('Exact signed-abandonment inverse required')
        recovered = recovered.replace(after, before, 1)
    if recovered != prior.controller_source():
        raise ValueError('Default raw capture, guard and cleanup must remain exact')
    return source


def helper_source(value, predecessor, old, manifest):
    validate_packet(value, time.time())
    validate_predecessor(value, predecessor, old)
    closure = prior.legacy.closure(prior.legacy_packet(predecessor), old, manifest,
                                   value['abandonedSeedStateSha256'])
    source = prior.helper_source(projection(value), old, manifest)
    before, after = prior.controller_source()[6:], controller_source(closure)[6:]
    if source.count(before) != 1:
        raise ValueError('Exact private continuation embedding required')
    result = source.replace(before, after, 1)
    if result.replace(after, before, 1) != source:
        raise ValueError('Exact compiled continuation inverse required')
    return result


def seal(value):
    validate_packet(value)
    raw = backup.encode(value)
    inner = backup.encode({'scope': SCOPE, 'disposalId': value['disposalId'],
                           'payloadSha256': backup.sha(raw), 'packet': value})
    cipher = crypto._dpapi(inner, value['disposalId'], True)
    return MAGIC + value['disposalId'].encode() + b'\n' + backup.sha(cipher).encode() + b'\n' + cipher


def unseal(blob, identifier):
    if not backup.identifier(identifier, 32) or not isinstance(blob, bytes) or len(blob) > crypto.LIMIT + 16384:
        raise ValueError('Bounded distinct cleanup ciphertext required')
    parts = blob.split(b'\n', 3)
    if (len(parts) != 4 or parts[0] + b'\n' != MAGIC or parts[1] != identifier.encode()
            or parts[2] != backup.sha(parts[3]).encode()):
        raise ValueError('Distinct cleanup ciphertext identity/checksum differs')
    raw = crypto._dpapi(parts[3], identifier, False)
    inner = backup.decode(raw)
    if (not isinstance(inner, dict) or set(inner) != {'scope', 'disposalId', 'payloadSha256', 'packet'}
            or inner['scope'] != SCOPE or inner['disposalId'] != identifier
            or backup.encode(inner) != raw
            or inner['payloadSha256'] != backup.sha(backup.encode(inner['packet']))):
        raise ValueError('Distinct cleanup decrypted context differs')
    value = validate_packet(inner['packet'])
    if value['disposalId'] != identifier:
        raise ValueError('Distinct cleanup recovered identity differs')
    return value


class BatchVault(crypto.RecoveryPacketVault):
    def load(self, identifier):
        path = self.path(identifier)
        self.directory(path.parent)
        if path.is_symlink() or not path.is_file() or path.stat().st_size > crypto.LIMIT + 16384:
            raise ValueError('Exact encrypted cleanup context required')
        before = path.stat()
        with path.open('rb') as stream:
            held = os.fstat(stream.fileno()); data = stream.read(crypto.LIMIT + 16385)
            after = path.lstat(); final = os.fstat(stream.fileno())
            if (path.is_symlink()
                    or any(getattr(before, k) != getattr(after, k) or getattr(held, k) != getattr(final, k)
                           for k in ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns'))
                    or any(getattr(after, k) != getattr(final, k)
                           for k in ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns'))):
                raise ValueError('Distinct cleanup ciphertext changed during read')
        self.directory(path.parent)
        return unseal(data, identifier)

    def save(self, value, now=None):
        validate_packet(value, time.time() if now is None else now)
        blob = seal(value); path = self.path(value['disposalId'], True)
        self.directory(path.parent)
        if path.exists() or path.is_symlink():
            raise ValueError('Existing cleanup context preserved')
        with path.open('xb') as stream:
            held = os.fstat(stream.fileno()); current = path.lstat()
            if path.is_symlink() or (held.st_dev, held.st_ino) != (current.st_dev, current.st_ino):
                raise ValueError('Distinct cleanup ciphertext identity changed')
            os.chmod(path, 0o600)
            if stream.write(blob) != len(blob):
                raise ValueError('Distinct cleanup ciphertext short write')
            stream.flush(); os.fsync(stream.fileno())
        if self.load(value['disposalId']) != value:
            raise ValueError('Durable distinct cleanup decrypt/readback differs')
        return {'scope': SCOPE, 'disposalId': value['disposalId'], 'bytes': len(blob),
                'ciphertextSha256': backup.sha(blob), 'durableDecryptReadbackVerified': True,
                'productionAuthorized': False}


class BatchTransport(prior.legacy.DisposalTransport):
    def __init__(self, value, predecessor, old, manifest, source_root, opener=None, clock=time.time):
        validate_packet(value, clock()); validate_predecessor(value, predecessor, old)
        super().__init__(prior.legacy_packet(projection(value)), old, manifest, source_root, opener, clock)

    def request(self, action, **fields):
        if action not in ('inspect-abandoned', 'cleanup'):
            raise ValueError('Only fresh inspection and one fenced cleanup batch allowed')
        return super().request(action, **fields)


def run(args, owned, sizes, hashes, report, checkpoint, runner):
    """One explicit batch only. No loop, implicit retry, token renewal or old helper."""
    connection = lease = client = None
    try:
        old = runner.original_recovery.FullPrivateEngineVault().load(args.transaction)
        predecessor = prior.UnpreparedEngineDisposalVault().load(args.continue_abandoned)
        prior.validate_original_binding(predecessor, old)
        for packet in (old, predecessor):
            for name, digest in packet['sourceHashes'].items():
                if backup.sha(subprocess.check_output(['git', 'show', packet['toolingCommit'] + ':' + name])) != digest:
                    raise ValueError('Archived predecessor source provenance differs')
        if old['applicationCommit'] != args.application_commit or old['publicOwned'] != owned or old['publicSizes'] != sizes:
            raise ValueError('Frozen public application differs from abandoned copy')
        original_path = backup.ROOT / 'deploy-backups' / ('staging-full-engine-original-' + args.transaction + '.zip')
        manifest, original = runner.full_runner.archive_original(original_path, old['plan'], old['ownershipKey'], old['helperSha256'])
        receipt = runner.full_runner.full.verify_archive(original_path, old['plan'], old['ownershipKey'], old['helperSha256'], manifest)
        if receipt['sha256'] != predecessor['originalArchiveSha256']:
            raise ValueError('Predecessor original archive differs')
        predecessor_witness = prior.legacy.witness(backup.ROOT / 'deploy-backups' / predecessor['witnessArchiveName'], predecessor['witnessArchiveSha256'], predecessor['freshProtectedStateSha256'], owned)
        report.update(scope=__doc__, originalCapsuleArchive=receipt, predecessorDisposalId=predecessor['disposalId'], abandonedSeedStateSha256=args.abandoned_state)
        common = runner.shared.snapshot.load_common(); connection = runner.BoundedStagingFTPS(common.common.store2.connect)
        report['freshWitness'] = {}; checkpoint('capturing-separate-batch-witness')
        current = runner.shared.capture(common, connection, owned, runner.shared.source_hashes(), report['freshWitness'], checkpoint, source_compiler=runner.engine_runner.early.snapshot_source)
        if any(current[k] != original[k] for k in ('ownedContentFiles', 'protectedFiles', 'identity')):
            raise ValueError('Public/protected application or identity drift requires separate review')
        report['changedStateKeysSincePredecessorWitness'] = [k for k in runner.shared.STATE_KEYS if predecessor_witness[k] != current[k]]
        left = {r['option_name']: r for r in predecessor_witness['database']['options']}
        right = {r['option_name']: r for r in current['database']['options']}
        report['changedOptionsSincePredecessorWitness'] = [n for n in sorted(set(left) | set(right)) if left.get(n) != right.get(n)]
        witness = report['freshWitness']['privateBackup']
        value = {**predecessor, 'scope': SCOPE, 'predecessorDisposalId': predecessor['disposalId'],
                 'abandonedSeedStateSha256': args.abandoned_state, 'disposalId': secrets.token_hex(16),
                 'token': secrets.token_urlsafe(32), 'expires': int(time.time()) + 3600,
                 'toolingCommit': args.tooling_commit, 'sourceHashes': hashes, 'helperSha256': 'f' * 64,
                 'freshProtectedStateSha256': current['protectedStateSha256'],
                 'witnessArchiveSha256': witness['sha256'], 'witnessArchiveName': Path(witness['path']).name}
        value['helperSha256'] = backup.sha(helper_source(value, predecessor, old, manifest))
        report['encryptedBatchPacket'] = BatchVault().save(value)
        report.update(disposalId=value['disposalId'], expires=value['expires'], freshProtectedStateSha256=value['freshProtectedStateSha256'], witnessArchiveSha256=witness['sha256'])
        checkpoint('separate-batch-packet-persisted')
        name = 'ktk-transaction-rehearsal-' + args.transaction + '.php'; source = helper_source(value, predecessor, old, manifest)
        scope = runner.shared.legacy.TemporaryHelperFTP(connection, name)
        lease = runner.shared.HelperLease(common, connection, scope, source)
        report.update(helper=name, helperSha256=value['helperSha256'])
        runner.unchanged(owned, hashes); lease.install(); checkpoint('batch-helper-installed')
        client = BatchTransport(value, predecessor, old, manifest, backup.ROOT / 'staging/wp-content/mu-plugins')
        def request(action, **fields):
            runner.unchanged(owned, hashes)
            prior.legacy.witness(Path(witness['path']), witness['sha256'], value['freshProtectedStateSha256'], owned)
            if runner.full_runner.full.verify_archive(original_path, old['plan'], old['ownershipKey'], old['helperSha256'], manifest) != receipt:
                raise ValueError('Original archive changed before batch request')
            envelope = client.request(action, **fields); state = envelope['controller']
            report['steps'].append({'action': action, 'phase': state['phase'], 'seconds': client.last_request_seconds,
                                    'runtime': envelope['runtime'], 'privateFiles': len(state['seed']['files']),
                                    'privateBytes': state['seed']['copiedBytes'], 'seedStateSha256': state['seed']['stateSha256'], 'operation': state['operation']})
            checkpoint('batch-' + state['phase']); return state
        state = request('inspect-abandoned', abandonedSeedStateSha256=args.abandoned_state)
        if state['phase'] != 'disposed':
            state = request('cleanup', stateSha256=state['stateSha256'], abandonedSeedStateSha256=args.abandoned_state)
        report['oneBoundedBatchAccepted'] = True
        report['privatePayloadsAbsent'] = state['phase'] == 'disposed'
        lease.remove(); report['helperRemoved'] = lease.removed
        report['after'] = {}; checkpoint('capturing-after-batch')
        after = runner.shared.capture(common, connection, owned, runner.shared.source_hashes(), report['after'], checkpoint, source_compiler=runner.engine_runner.early.snapshot_source)
        report['changedStateKeysSinceBatchWitness'] = [k for k in runner.shared.STATE_KEYS if current[k] != after[k]]
        if report['changedStateKeysSinceBatchWitness']:
            raise ValueError('Fresh batch witness changed; preserve both raw pairs without restoration or success claim')
        report['freshWitnessStateAndPublicProtectedFilesExact'] = True
        if report['privatePayloadsAbsent']:
            report['independentRetainedMetadataAudit'] = prior.verify_retained_metadata(connection, original_path, predecessor, old, manifest, args.abandoned_state)
        runner.unchanged(owned, hashes)
        checkpoint('signed-abandonment-batch-verified-payloads-absent' if report['privatePayloadsAbsent'] else 'signed-abandonment-one-batch-verified-more-remain')
    except Exception as error:
        report.update(failedAtPhase=report['phase'], failureType=type(error).__name__)
        if client is not None:
            report.update(lastRequestFailure=client.last_failure, lastRequestSeconds=client.last_request_seconds)
        checkpoint('failed-preserve-predecessor-fresh-batch-witness-and-private-state')
        raise RuntimeError('Cleanup batch stopped; inspect without automatic retry, authority renewal or data restoration') from None
    finally:
        try:
            if lease is not None and not lease.removed:
                lease.remove(); report['helperRemoved'] = lease.removed
        finally:
            if connection is not None:
                report['ftpsStatistics'] = connection.statistics(); connection.close()
            from datetime import datetime, timezone
            report['finishedAt'] = datetime.now(timezone.utc).isoformat(); checkpoint()
