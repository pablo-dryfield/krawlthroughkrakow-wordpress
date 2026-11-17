"""Real PHP preservation of an old signed closure under a distinct raw witness."""
import copy
import json
import os
from pathlib import Path
import tempfile
import time
import unittest
from unittest import mock

from tools import abandoned_engine_seed_continuation as batch
from tools import content_update_backup as backup
from tools import content_update_recovery as crypto
from tools import unprepared_engine_seed_disposal as prior
from tools.tests import test_unprepared_engine_seed_disposal as protocol


def inputs():
    predecessor, old, manifest = protocol.compiler_inputs()
    value = {**predecessor, 'scope': batch.SCOPE, 'disposalId': '8' * 32,
             'token': 'Q' * 43, 'predecessorDisposalId': predecessor['disposalId'],
             'abandonedSeedStateSha256': '6' * 64}
    return value, predecessor, old, manifest


class BatchAuthorityTests(unittest.TestCase):
    def test_invalid_batch_mode_refuses_before_source_vault_or_connection(self):
        module = protocol.UnpreparedEngineDisposalRunnerTests('runTest').runner()
        args = ['--transaction', 'd' * 32, '--application-commit', 'c' * 40,
                '--tooling-commit', 'e' * 40, '--report', 'docs/seo/not-written.json']
        with mock.patch.object(module.engine_runner, 'reviewed_source', side_effect=AssertionError('no source or connection')):
            for extra in (['--continue-abandoned', '7' * 32],
                          ['--continue-abandoned', '../outside', '--abandoned-state', '6' * 64]):
                with self.assertRaises(ValueError):
                    module.main(args + extra)

    def test_wrong_predecessor_source_is_refused_before_connection_or_helper(self):
        module = protocol.UnpreparedEngineDisposalRunnerTests('runTest').runner()
        value, predecessor, old, _ = inputs()
        with tempfile.TemporaryDirectory(prefix='ktk-abandoned-batch-provenance-') as folder:
            root = Path(folder).resolve(); report = root / 'docs/seo/refused.json'
            args = ['--continue-abandoned', predecessor['disposalId'], '--abandoned-state', '6' * 64,
                    '--transaction', old['transactionId'], '--application-commit', old['applicationCommit'],
                    '--tooling-commit', 'e' * 40, '--report', str(report)]
            with mock.patch.object(module, 'ROOT', root), \
                    mock.patch.object(module.engine_runner, 'reviewed_source', return_value=(old['publicOwned'], old['publicSizes'], {})), \
                    mock.patch.object(module, 'fingerprints', return_value={'tools/abandoned_engine_seed_continuation.py': 'f' * 64}), \
                    mock.patch.object(module.original_recovery.FullPrivateEngineVault, 'load', return_value=old), \
                    mock.patch.object(prior.UnpreparedEngineDisposalVault, 'load', return_value=predecessor), \
                    mock.patch.object(module.subprocess, 'check_output', return_value=b'changed'), \
                    mock.patch.object(module.shared.snapshot, 'load_common', side_effect=AssertionError('no connection')):
                with self.assertRaises(RuntimeError):
                    module.main(args)
            result = json.loads(report.read_bytes())
            self.assertEqual(result['failureType'], 'ValueError')
            self.assertEqual(result['failedAtPhase'], 'offline-validated')
            self.assertNotIn('helper', result)

    def test_fresh_separate_scope_and_expired_predecessor_are_provenance_only(self):
        value, predecessor, old, manifest = inputs()
        predecessor['expires'] = 1
        batch.validate_packet(value, time.time())
        batch.validate_predecessor(value, predecessor, old)
        source = batch.helper_source(value, predecessor, old, manifest)
        self.assertIn(b"add_action('muplugins_loaded',", source)
        self.assertNotIn(b"add_action('wp_loaded',", source)
        self.assertIn(b'Existing signed abandonment required', source)
        self.assertNotIn(b"'abandon'=>array('stateSha256'", source)
        for change in ({'token': predecessor['token']}, {'token': old['token']},
                       {'disposalId': predecessor['disposalId']},
                       {'predecessorDisposalId': '9' * 32}, {'originalArchiveSha256': '0' * 64}):
            with self.assertRaises(ValueError):
                batch.validate_predecessor({**value, **change}, predecessor, old)

    def test_foreign_ciphertext_refuses_before_decryption_and_failed_encryption_creates_no_file(self):
        value, _, _, _ = inputs()
        with mock.patch.object(crypto, '_dpapi', side_effect=AssertionError('no decrypt')):
            with self.assertRaises(ValueError):
                batch.unseal(prior.MAGIC + b'opaque', value['disposalId'])
        with tempfile.TemporaryDirectory(prefix='ktk-abandoned-batch-offline-') as folder:
            with mock.patch.object(crypto, '_dpapi', side_effect=RuntimeError('unavailable')):
                with self.assertRaises(RuntimeError):
                    batch.BatchVault(Path(folder).resolve()).save(value)
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_transport_refuses_abandon_copy_and_apply_without_network(self):
        value, predecessor, old, manifest = inputs()
        client = batch.BatchTransport(value, predecessor, old, manifest, backup.ROOT / 'staging/wp-content/mu-plugins')
        for action in ('inspect', 'abandon', 'advance', 'apply', 'rollback'):
            with self.assertRaises(ValueError):
                client.request(action)


@unittest.skipUnless(os.name == 'nt', 'Current-user native Windows DPAPI')
class BatchNativeTests(unittest.TestCase):
    def test_native_durable_batch_context_is_distinct_and_cannot_overwrite(self):
        value, _, _, _ = inputs()
        with tempfile.TemporaryDirectory(prefix='ktk-abandoned-batch-native-') as folder:
            vault = batch.BatchVault(Path(folder).resolve())
            receipt = vault.save(value)
            self.assertTrue(receipt['durableDecryptReadbackVerified'])
            self.assertFalse(receipt['productionAuthorized'])
            self.assertEqual(vault.load(value['disposalId']), value)
            raw = vault.path(value['disposalId']).read_bytes()
            self.assertNotIn(value['token'].encode(), raw)
            with self.assertRaises(ValueError):
                prior.unseal(raw, value['disposalId'])
            with self.assertRaises(ValueError):
                vault.save(value)
            self.assertEqual(vault.path(value['disposalId']).read_bytes(), raw)

    def test_expired_batch_is_readable_evidence_but_not_fresh_authority(self):
        value, _, _, _ = inputs(); value['expires'] = 1
        self.assertEqual(batch.unseal(batch.seal(value), value['disposalId']), value)
        with tempfile.TemporaryDirectory(prefix='ktk-abandoned-batch-expired-') as folder:
            with self.assertRaises(ValueError):
                batch.BatchVault(Path(folder).resolve()).save(value)
            self.assertEqual(list(Path(folder).iterdir()), [])


@unittest.skipUnless(protocol.protocol.full.store.PHP, 'Real PHP required for signed-abandonment continuation')
class BatchControllerTests(unittest.TestCase):
    def setUp(self):
        setup = protocol.UnpreparedEngineControllerTests('runTest'); setup.setUp()
        self.addCleanup(setup.doCleanups)
        self.case = setup.case; self.engine = setup.engine
        state = self.case.abandon()
        self.abandoned = self.case.abandoned
        self.before = self.case.fixture.private_bytes()
        self.closure = json.loads(self.before['control/closed.json'].split(b'\n', 2)[2])
        self.component = self.case.fixture.base / 'signed-abandonment-batch.php'
        self.component.write_bytes(batch.controller_source(self.closure))
        self.case.config['disposal'] = self.component.as_posix()
        # A different helper and later full raw witness authorize this batch.
        self.case.fixture.helper.write_bytes(b'<?php /* new distinct one-batch helper */\n')
        snapshot = copy.deepcopy(self.case.config['snapshot'])
        snapshot['helperSha256'] = backup.sha(self.case.fixture.helper.read_bytes())
        snapshot['database']['options'][-1]['option_value'] = 'later live value; never restored'
        self.case.rehash(snapshot)
        self.case.config['snapshot'] = snapshot
        self.case.config['packet'] = {**self.case.config['packet'], 'disposalId': '8' * 32,
                                    'helperSha256': snapshot['helperSha256'],
                                    'freshProtectedStateSha256': snapshot['protectedStateSha256'],
                                    'witnessArchiveSha256': 'a' * 64}
        self.case.binding = {**self.case.binding, 'disposalId': '8' * 32}

    def inspect(self):
        return self.case.call('inspect-abandoned', abandonedSeedStateSha256=self.abandoned)

    def test_later_raw_witness_cleans_known_payload_without_rewriting_old_closure(self):
        state = self.inspect()
        self.assertTrue(state['closed'])
        self.assertEqual(state['freshProtectedStateSha256'], self.case.config['snapshot']['protectedStateSha256'])
        self.assertNotEqual(state['freshProtectedStateSha256'], self.closure['freshProtectedStateSha256'])
        state = self.case.call('cleanup', stateSha256=state['stateSha256'], abandonedSeedStateSha256=self.abandoned)
        self.assertEqual(state['phase'], 'disposed')
        self.assertFalse(self.engine.exists())
        remaining = self.case.fixture.private_bytes()
        self.assertEqual(len(remaining), 5)
        for name in remaining:
            self.assertEqual(remaining[name], self.before[name])
        self.assertIn(b'later live value', backup.encode(self.case.config['snapshot']))

    def test_absent_or_changed_signed_closure_is_preserved_and_never_recreated(self):
        file = self.case.fixture.private / 'control/closed.json'
        file.unlink(); before = self.case.fixture.private_bytes()
        error = self.case.call('inspect-abandoned', success=False, abandonedSeedStateSha256=self.abandoned)
        self.assertIn('Existing signed abandonment required', error)
        self.assertEqual(self.case.fixture.private_bytes(), before)
        file.write_bytes(self.before['control/closed.json'] + b'changed')
        before = self.case.fixture.private_bytes()
        self.case.call('inspect-abandoned', success=False, abandonedSeedStateSha256=self.abandoned)
        self.assertEqual(self.case.fixture.private_bytes(), before)

    def test_new_abandon_action_stale_fence_and_wrong_old_inventory_never_delete(self):
        state = self.inspect(); before = self.case.fixture.private_bytes()
        self.case.call('abandon', success=False, stateSha256=state['stateSha256'], abandonedSeedStateSha256=self.abandoned)
        self.case.call('cleanup', success=False, stateSha256='0' * 64, abandonedSeedStateSha256=self.abandoned)
        self.case.call('inspect-abandoned', success=False, abandonedSeedStateSha256='0' * 64)
        self.assertEqual(self.case.fixture.private_bytes(), before)

    def test_raw_state_changes_after_new_witness_still_refuse_before_deletion(self):
        state = self.inspect(); snapshot = copy.deepcopy(self.case.config['snapshot'])
        snapshot['database']['options'][-1]['option_value'] = 'even later value'
        self.case.rehash(snapshot); before = self.case.fixture.private_bytes()
        error = self.case.call('cleanup', success=False, stateSha256=state['stateSha256'],
                               abandonedSeedStateSha256=self.abandoned, changes={'snapshot': snapshot})
        self.assertIn('Fresh disposal witness changed', error)
        self.assertEqual(self.case.fixture.private_bytes(), before)

    def test_unknown_engine_and_changed_payload_bytes_are_preserved(self):
        unknown = self.engine / 'owner.keep'; unknown.write_bytes(b'owner bytes')
        before = self.case.fixture.private_bytes()
        self.case.call('inspect-abandoned', success=False, abandonedSeedStateSha256=self.abandoned)
        self.assertEqual(self.case.fixture.private_bytes(), before)
        unknown.unlink(); state = self.inspect()
        self.case.call('cleanup', success=False, stateSha256=state['stateSha256'],
                       abandonedSeedStateSha256=self.abandoned, changes={'fault': 'changed-delete'})
        self.assertIn(b'external owner bytes', self.case.fixture.private_bytes().values())
        self.assertEqual((self.case.fixture.private / 'control/closed.json').read_bytes(), self.before['control/closed.json'])

    def test_lost_reply_uses_read_only_inspection_and_keeps_all_old_metadata(self):
        state = self.inspect()
        self.case.call('cleanup', stateSha256=state['stateSha256'], abandonedSeedStateSha256=self.abandoned,
                       changes={'fault': 'delete-reply'}, exit_code=76)
        state = self.inspect()
        state = self.case.call('cleanup', stateSha256=state['stateSha256'], abandonedSeedStateSha256=self.abandoned)
        self.assertEqual(state['phase'], 'disposed')
        for name, raw in self.case.fixture.private_bytes().items():
            self.assertEqual(raw, self.before[name])


if __name__ == '__main__':
    unittest.main()
