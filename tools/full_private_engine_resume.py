"""Explicit continuation of one archived, freshly verified private first-replacement cut.

No connection, helper installation, preparation/copy, new acknowledgment or retry.
The caller must separately enforce unexpired encrypted context and pinned source.
"""
from __future__ import annotations
from pathlib import Path
import zipfile
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full


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
