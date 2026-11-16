"""Explicit, separately inspected private preparation and first-replacement continuation.

No connection/helper installation, implicit phase choice or uncertain-request retry.
Preparation reopens the original and reuses its local copy acknowledgement;
first-replacement continuation requires both archives and never copies or re-acknowledges.
The caller must separately enforce unexpired encrypted context and pinned source.
"""
from __future__ import annotations
from pathlib import Path
import math
import zipfile
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full


def inspect_complete_seed_boundary(client, previous):
    """Read-only proof for a controlled caller stop before engine preparation."""
    state = client.inspect_preparation()
    p = state['preparation']
    seed = p['fullSeed']
    if (state['stateSha256'] != previous['stateSha256'] or not p['recordsComplete']
            or p['enginePhase'] is not None or seed is None
            or not seed['sourceComplete'] or not seed['targetComplete']):
        raise ValueError('Fresh unchanged complete seeds without an engine required before caller stop')
    return {'privateFiles':len(seed['files']),'privateBytes':seed['copiedBytes'],
            'seedStateSha256':seed['stateSha256'],'engineAbsent':True}


def attach_verified_original(client, original_path, rollback_path):
    """Reopen the original before any connection; a rollback archive must not yet exist."""
    directory = backup.ROOT / 'deploy-backups'
    transaction = client.plan['transactionId']
    original_path, rollback_path = Path(original_path), Path(rollback_path)
    if (original_path != directory / ('staging-full-engine-original-' + transaction + '.zip')
            or rollback_path != directory / ('staging-full-engine-rollback-' + transaction + '.zip')
            or original_path.parent.resolve() != directory.absolute()
            or original_path.is_symlink() or not original_path.is_file()
            or not 0 < original_path.stat().st_size <= 33554432
            or rollback_path.is_symlink() or rollback_path.exists()):
        raise ValueError('Exact existing original and absent rollback archives required before preparation recovery')
    with zipfile.ZipFile(original_path) as archive:
        if archive.getinfo('manifest.json').file_size > 65536:
            raise ValueError('Bounded original archive manifest required')
        manifest = full.validate_manifest(backup.decode(archive.read('manifest.json')), client.plan)
    receipt = full.verify_archive(original_path, client.plan, client.key, client.helper_sha256, manifest)
    with zipfile.ZipFile(original_path) as archive:
        original = full.validate_records({n:archive.read(n) for n in manifest['members']},
                                         manifest, client.plan, client.key, client.helper_sha256)
    return manifest, receipt, original


def continue_preparation(client, transport, original_path, rollback_path, observe=lambda *args: None):
    """Explicit resume of complete records and no completed engine; never retries."""
    manifest, receipt, _ = attach_verified_original(client, original_path, rollback_path)
    state = client.inspect_preparation()
    preparation = state['preparation']
    if (not preparation['rootExists'] or not preparation['recordsComplete']
            or preparation['enginePhase'] not in (None, 'unprepared') or preparation['fullSeed'] is None
            or preparation['rootBinding'] != manifest['rootBinding']):
        raise ValueError('Only archived complete-record preparation without a completed engine may continue')
    observe('resume-preparation-inspected', state)
    transport.acknowledge_original(original_path, client.key, manifest)
    expected, _ = full.expected_seed_files(client.plan, client.sizes, client.overrides)
    limit = math.ceil(sum(r['bytes'] for r in expected.values()) / 33554432) + math.ceil(len(expected) / 128) + 16
    calls, complete_boundary = 0, False
    for _ in range(limit):
        seed = state['preparation']['fullSeed']
        before = (seed['copiedBytes'], len(seed['files']))
        complete_boundary = complete_boundary or (seed['sourceComplete'] and seed['targetComplete'])
        state = client.recover_preparation()
        calls += 1
        observe('resumed-preparation-progress', state)
        if 'preparation' not in state:
            break
        next_seed = state['preparation']['fullSeed']
        if (next_seed['copiedBytes'], len(next_seed['files'])) <= before:
            raise ValueError('Recovered preparation made no independently verified progress')
    else:
        raise ValueError('Recovered preparation exceeded the deterministic full-profile bound')
    if (not complete_boundary or state['engine']['phase'] != 'prepared' or state['closed']
            or state['archiveAcknowledged'] or not state['engine']['currentPriorInventoryVerified']):
        raise ValueError('Separately prepared, complete, unacknowledged private engine required')
    if full.verify_archive(original_path, client.plan, client.key, client.helper_sha256, manifest) != receipt:
        raise ValueError('Recovered original archive changed')
    return manifest, receipt, {'prepared':True, 'freshPreparationInspected':True,
        'separateCallerPreparationContinuationVerified':True, 'enginePreparationSeparateRequestVerified':True,
        'recoverPreparationCallsThisProcess':calls}


def attach_verified_archives(client, original_path, rollback_path):
    plan = client.plan
    transaction = plan['transactionId']
    paths = [Path(original_path), Path(rollback_path)]
    directory = backup.ROOT / 'deploy-backups'
    for path, role in zip(paths, ('original', 'rollback')):
        expected = directory / ('staging-full-engine-' + role + '-' + transaction + '.zip')
        if (path != expected or path.is_symlink() or not path.is_file()
                or path.parent.resolve() != directory.absolute() or not 0 < path.stat().st_size <= 33554432):
            raise ValueError('Exact existing owned original and rollback archives required before recovery')
    with zipfile.ZipFile(paths[0]) as archive:
        if archive.getinfo('manifest.json').file_size > 65536:
            raise ValueError('Bounded original archive manifest required')
        original_manifest = full.validate_manifest(backup.decode(archive.read('manifest.json')), plan)
    original_receipt = full.verify_archive(paths[0], plan, client.key, client.helper_sha256, original_manifest)
    client.attach_archive(paths[1])
    if client.manifest['rootBinding'] != original_manifest['rootBinding']:
        raise ValueError('Both archived private root bindings must agree')
    with zipfile.ZipFile(paths[0]) as original, zipfile.ZipFile(paths[1]) as rollback:
        for name, row in original_manifest['members'].items():
            member = 'records/' + name
            if client.manifest['members'].get(member) != row or original.read(name) != rollback.read(member):
                raise ValueError('Both independently archived original records must match')
        original_state = full.validate_records({name: original.read(name) for name in original_manifest['members']},
                                               original_manifest, plan, client.key, client.helper_sha256)
    return original_manifest, original_receipt, original_state


def continue_first_engine_cut(client, original_path, rollback_path, observe=lambda *args: None):
    original_manifest, original_receipt, _ = attach_verified_archives(client, original_path, rollback_path)
    plan = client.plan
    changed = sorted(name for name, digest in plan['expected'].items() if digest != plan['prior'].get(name))
    if len(changed) != 5:
        raise ValueError('Exact five-change private fixture required')

    def first_cut(state):
        client.healthy(state)
        engine = state['engine']
        if (state['closed'] or not state['archiveAcknowledged'] or engine['phase'] != 'applying'
                or engine['intentFiles'] != [changed[0]]
                or set(engine['pendingApplyFiles']) != set(changed[1:])):
            raise ValueError('Only the exact archived first owned replacement may continue')

    state = client.inspect()
    first_cut(state)
    exported = client.call('export')
    first_cut(exported)
    if exported['stateSha256'] != state['stateSha256'] or exported.get('export') != client.manifest:
        raise ValueError('Fresh server export must equal the reopened rollback archive and inspected state')
    observe('resume-first-engine-cut-inspected', exported)
    for index in range(4):
        state = client.step('apply')
        if len(state['engine']['pendingApplyFiles']) != 3 - index:
            raise ValueError('Recovery did not advance exactly one known private replacement')
        observe('resumed-private-apply', state)
    if state['engine']['phase'] != 'applied' or not state['engine']['currentExpectedInventoryVerified']:
        raise ValueError('Complete expected private inventory required before recovered rollback')
    for index in range(5):
        state = client.step('rollback')
        if len(state['engine']['pendingRollbackFiles']) != 4 - index:
            raise ValueError('Recovery did not roll back exactly one known private replacement')
        observe('resumed-private-rollback', state)
    if state['engine']['phase'] != 'rolled-back' or not state['engine']['currentPriorInventoryVerified']:
        raise ValueError('Exact complete prior private inventory required before recovered closure')
    state = client.close()
    observe('resumed-private-closed', state)
    if not state['closed'] or state['engine']['phase'] != 'rolled-back' or not state['engine']['currentPriorInventoryVerified']:
        raise ValueError('Signed rolled-back recovered closure required')
    if (full.verify_archive(original_path, plan, client.key, client.helper_sha256, original_manifest) != original_receipt
            or client.verified_archive() != client.archive_receipt):
        raise ValueError('Recovered original or rollback archive changed')
    return {'privateChangedFiles': 5, 'previousOwnedReplacementVerified': 1,
            'privateApplyCallsThisProcess': 4, 'privateRollbackCalls': 5,
            'privateOwnedReplacementCount': 5, 'firstCutFreshlyInspected': True,
            'separateCallerContinuationVerified': True, 'rolledBackClosureVerified': True,
            'publicApplicationWrites': 0, 'databaseWrites': 0, 'cachePurges': 0, 'productionOperations': 0}
