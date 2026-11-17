"""Real private-only disposal, distinct authorization and early-entry profile contracts."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from unittest import mock

from tools import content_update_backup as backup
from tools import content_update_recovery as crypto
from tools import early_private_entry as early
from tools import private_seed_disposal as legacy
from tools import unprepared_engine_seed_disposal as disposal
from tools.tests import test_full_private_engine_recovery as engine_recovery
from tools.tests import test_private_seed_disposal as protocol
from tools.tests import test_private_entry_probe as entry
from tools.tests import test_staging_protected_state as snapshot


def packet():
    return {'schemaVersion': 1, 'scope': disposal.SCOPE, 'entryProfile': 'early',
            'disposalId': '7' * 32, 'transactionId': 'd' * 32,
            'applicationCommit': 'c' * 40, 'toolingCommit': 'e' * 40,
            'originalToolingCommit': 'c' * 40,
            'sourceHashes': {'tools/unprepared_engine_seed_disposal.py': 'f' * 64},
            'expires': int(time.time()) + 600, 'token': 'N' * 43,
            'helperSha256': 'e' * 64, 'freshProtectedStateSha256': 'f' * 64,
            'witnessArchiveSha256': '9' * 64,
            'witnessArchiveName': 'staging-protected-state-20261116-220000-000000.zip',
            'originalArchiveSha256': 'a' * 64}


def compiler_inputs():
    """Synthetic valid descriptor for compilation, not an archived-state acceptance."""
    old = engine_recovery.fixture()
    value = packet()
    members = {name: {'source': 'control/' + name, 'sha256': 'a' * 64,
                      'bytes': 1, 'payloadSha256': 'b' * 64}
               for name in ('original-state.json', 'controller-plan.json')}
    manifest = {'schemaVersion': 1, 'scope': 'full-private-seeds-original-capsule',
                **legacy.full.binding(old['plan']), 'rootBinding': 'b' * 64,
                'protectedStateSha256': old['plan']['protectedStateSha256'],
                'members': members, 'bytes': 2}
    manifest['manifestSha256'] = backup.sha(backup.encode(manifest, sort=True))
    return value, old, manifest


class DistinctDisposalValidationTests(unittest.TestCase):
    def test_exact_distinct_scope_and_early_profile_validate_without_crypto_or_connection(self):
        value = packet()
        with mock.patch.object(crypto, '_dpapi', side_effect=AssertionError('offline validation')):
            self.assertEqual(disposal.validate_packet(value), value)
        for change in ({'scope': 'witnessed-private-seed-disposal'}, {'entryProfile': 'late'},
                       {'production': True}, {'originalToolingCommit': 'wrong'},
                       {'witnessArchiveName': '../original.zip'}):
            with self.assertRaises(ValueError):
                disposal.validate_packet({**value, **change}, time.time())

    def test_foreign_magic_bad_identity_and_changed_cipher_refuse_before_decryption(self):
        for blob in (legacy.MAGIC + b'7' * 32 + b'\n' + b'f' * 64 + b'\nopaque',
                     disposal.MAGIC + b'8' * 32 + b'\n' + b'f' * 64 + b'\nopaque',
                     disposal.MAGIC + b'7' * 32 + b'\n' + b'f' * 64 + b'\nopaque'):
            with mock.patch.object(crypto, '_dpapi', side_effect=AssertionError('no decryption')):
                with self.assertRaises(ValueError):
                    disposal.unseal(blob, '7' * 32)

    def test_encryption_failure_creates_no_plaintext_or_vault_directory(self):
        with tempfile.TemporaryDirectory(prefix='ktk-empty-engine-vault-') as folder:
            with mock.patch.object(crypto, '_dpapi', side_effect=RuntimeError('Unavailable')):
                with self.assertRaises(RuntimeError):
                    disposal.UnpreparedEngineDisposalVault(Path(folder).resolve()).save(packet())
            self.assertEqual(list(Path(folder).iterdir()), [])


@unittest.skipUnless(os.name == 'nt', 'Current-user native Windows DPAPI')
class UnpreparedEngineDisposalNativeTests(unittest.TestCase):
    def test_distinct_native_durable_context_cannot_overwrite_or_enter_old_vaults(self):
        with tempfile.TemporaryDirectory(prefix='ktk-empty-engine-native-') as folder:
            value = packet()
            vault = disposal.UnpreparedEngineDisposalVault(Path(folder).resolve())
            receipt = vault.save(value)
            self.assertTrue(receipt['durableDecryptReadbackVerified'])
            self.assertFalse(receipt['productionAuthorized'])
            self.assertEqual(vault.load(value['disposalId']), value)
            raw = vault.path(value['disposalId']).read_bytes()
            self.assertNotIn(value['token'].encode(), raw)
            self.assertNotIn(b'freshProtectedStateSha256', raw)
            with self.assertRaises(ValueError):
                vault.save(value)
            with self.assertRaises(ValueError):
                legacy.unseal(raw, value['disposalId'])
            self.assertEqual(vault.path(value['disposalId']).read_bytes(), raw)

    def test_expired_context_is_readable_evidence_and_cannot_be_saved_as_current_authority(self):
        value = packet()
        value['expires'] = 1
        raw = disposal.seal(value)
        self.assertEqual(disposal.unseal(raw, value['disposalId']), value)
        with tempfile.TemporaryDirectory(prefix='ktk-empty-engine-expired-') as folder:
            with self.assertRaises(ValueError):
                disposal.UnpreparedEngineDisposalVault(Path(folder).resolve()).save(value)
            self.assertEqual(list(Path(folder).iterdir()), [])


@unittest.skipUnless(protocol.full.store.PHP, 'Real PHP required for unprepared-engine disposal')
class UnpreparedEngineControllerTests(unittest.TestCase):
    def setUp(self):
        self.case = protocol.PrivateSeedDisposalTests('runTest')
        self.case.setUp()
        self.addCleanup(self.case.doCleanups)
        fixture = self.case.fixture
        self.engine = fixture.private / 'engine'
        self.engine.mkdir(mode=0o700)
        self.component = fixture.base / 'empty-engine-disposal.php'
        self.component.write_bytes(disposal.controller_source())
        self.case.config['disposal'] = self.component.as_posix()
        driver = protocol.DRIVER.replace(
            "if($c['fault']==='delete-reply'&&$event==='after-disposal-delete'){exit(76);}",
            "if($c['fault']==='delete-reply'&&$event==='after-disposal-delete'){exit(76);}\n"
            "if($c['fault']==='engine-change'&&$event==='before-empty-engine-rmdir'){file_put_contents($path.'/owner.keep','external owner bytes');}\n"
            "if($c['fault']==='engine-reply'&&$event==='after-empty-engine-rmdir'){exit(77);}")
        self.assertNotEqual(driver, protocol.DRIVER)
        self.case.driver.write_bytes(driver.encode())

    def test_fresh_witness_removes_only_known_payload_and_empty_engine_retaining_five_records(self):
        case = self.case
        state = case.abandon()
        state = case.call('cleanup', stateSha256=state['stateSha256'],
                          abandonedSeedStateSha256=case.abandoned)
        self.assertEqual(state['phase'], 'disposed')
        self.assertFalse(self.engine.exists())
        self.assertLessEqual(state['operation']['payloadFilesDeleted'], 256)
        self.assertLessEqual(state['operation']['payloadDirectoriesRemoved'], 256)
        remaining = case.fixture.private_bytes()
        self.assertEqual(len(remaining), 5)
        for name in ('control/original-state.json', 'control/controller-plan.json',
                     'owner.marker', 'controller.lock'):
            self.assertEqual(remaining[name], case.original[name])
        self.assertIn(b'new live timestamp', backup.encode(case.config['snapshot']))

    def test_missing_engine_unknown_engine_files_and_prepared_artifacts_are_preserved(self):
        before = self.case.fixture.private_bytes()
        self.engine.rmdir()
        self.assertIn('Missing unprepared engine', self.case.call(success=False))
        self.assertEqual(self.case.fixture.private_bytes(), before)
        self.engine.mkdir()
        for relative in ('owner.keep', 'transaction/journal.json'):
            file = self.engine / relative
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(b'unknown engine artifacts')
            before = self.case.fixture.private_bytes()
            self.assertIn('exactly empty', self.case.call(success=False))
            self.assertEqual(self.case.fixture.private_bytes(), before)
            file.unlink()
            if file.parent != self.engine:
                file.parent.rmdir()

    def test_default_disposal_still_refuses_the_engine_namespace(self):
        before = self.case.fixture.private_bytes()
        error = self.case.call(success=False, changes={
            'disposal': (disposal.ROOT / 'tools/private-seed-disposal.php').as_posix()})
        self.assertIn('Unknown disposal namespace', error)
        self.assertEqual(self.case.fixture.private_bytes(), before)
        self.assertTrue(self.engine.is_dir())

    def test_regular_file_or_symlink_cannot_replace_the_empty_engine_directory(self):
        self.engine.rmdir()
        self.engine.write_bytes(b'external owner file')
        before = self.case.fixture.private_bytes()
        self.case.call(success=False)
        self.assertEqual(self.case.fixture.private_bytes(), before)
        self.engine.unlink()
        try:
            self.engine.symlink_to(self.case.fixture.public, target_is_directory=True)
        except (OSError, NotImplementedError):
            self.engine.mkdir()
            self.skipTest('Native directory symlink creation unavailable; regular-file refusal passed')
        before = self.case.fixture.sentinel.read_bytes()
        self.case.call(success=False)
        self.assertEqual(self.case.fixture.sentinel.read_bytes(), before)
        self.assertTrue(self.engine.is_symlink())

    def test_fresh_raw_state_drift_refuses_before_any_private_deletion(self):
        changed = copy.deepcopy(self.case.config['snapshot'])
        changed['database']['options'][-1]['option_value'] = 'later live state'
        self.case.rehash(changed)
        before = self.case.fixture.private_bytes()
        self.case.call(success=False, changes={'snapshot': changed})
        self.assertEqual(self.case.fixture.private_bytes(), before)
        self.assertTrue(self.engine.is_dir())

    def test_engine_changed_at_final_removal_preserves_external_owner_bytes(self):
        state = self.case.abandon()
        error = self.case.call('cleanup', success=False, stateSha256=state['stateSha256'],
                               abandonedSeedStateSha256=self.case.abandoned,
                               changes={'fault': 'engine-change'})
        self.assertIn('Changed empty engine', error)
        self.assertEqual((self.engine / 'owner.keep').read_bytes(), b'external owner bytes')
        self.assertEqual(len(self.case.fixture.private_bytes()), 6)

    def test_lost_reply_after_empty_engine_removal_needs_fresh_inspection_and_keeps_records(self):
        state = self.case.abandon()
        self.case.call('cleanup', stateSha256=state['stateSha256'],
                       abandonedSeedStateSha256=self.case.abandoned,
                       changes={'fault': 'engine-reply'}, exit_code=77)
        self.assertFalse(self.engine.exists())
        state = self.case.call('inspect-abandoned', abandonedSeedStateSha256=self.case.abandoned)
        self.assertEqual(state['phase'], 'disposed')
        before = self.case.fixture.private_bytes()
        state = self.case.call('cleanup', stateSha256=state['stateSha256'],
                               abandonedSeedStateSha256=self.case.abandoned)
        self.assertEqual(state['operation']['payloadFilesDeleted'], 0)
        self.assertEqual(state['operation']['payloadDirectoriesRemoved'], 0)
        self.assertEqual(self.case.fixture.private_bytes(), before)


@unittest.skipUnless(snapshot.PHP, 'Real PHP required for compiled early disposal profile')
class CompiledUnpreparedEngineDisposalTests(unittest.TestCase):
    def test_old_expiry_is_provenance_only_and_old_token_or_identity_cannot_be_reused(self):
        value, old, manifest = compiler_inputs()
        source = disposal.helper_source(value, old, manifest)
        expired = {**old, 'expires': 1}
        self.assertEqual(disposal.helper_source(value, expired, manifest), source)
        for change in ({'token': old['token']}, {'disposalId': old['transactionId']},
                       {'originalToolingCommit': 'a' * 40}):
            with self.assertRaises(ValueError):
                disposal.helper_source({**value, **change}, old, manifest)

    def test_exact_profile_inverse_preserves_default_core_store_stream_and_no_engine_or_copy_route(self):
        value, old, manifest = compiler_inputs()
        source = disposal.helper_source(value, old, manifest)
        before = (disposal.ROOT / 'tools/private-seed-disposal.php').read_bytes()[6:]
        after = disposal.controller_source()[6:]
        recovered = source.replace(early.GUARD, b'', 1).replace(early.EARLY_HOOK, early.OLD_HOOK, 1)
        self.assertEqual(recovered.replace(after, before, 1),
                         legacy.helper_source(disposal.legacy_packet(value), old, manifest))
        for name in ('staging-protected-state-core.php', 'content-update-private-store.php',
                     'content-update-streaming-seeds.php'):
            self.assertIn((disposal.ROOT / 'tools' / name).read_bytes()[6:], source)
        self.assertNotIn(b'new KTK_Active_Content_Transaction', source)
        self.assertIn(b'if($removed>=255){break;}', source)
        self.assertIn(b"$operation['payloadDirectoriesRemoved']>=256", source)
        result = subprocess.run([snapshot.PHP, '-l'], input=source, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_missing_wrong_expired_auth_and_wrong_method_preserve_ordinary_plugin_boundary(self):
        value, old, manifest = compiler_inputs()
        source = disposal.helper_source(value, old, manifest)
        driver = entry.DRIVER.replace('HTTP_X_KTK_ENTRY_PROBE_TOKEN', 'HTTP_X_KTK_DISPOSAL_TOKEN')
        for changes in ({'token': ''}, {'token': 'x' * 43}, {'expired': True}, {'method': 'GET'}):
            def mutate(config, mu, store):
                config.update(profile='early', identifier=old['transactionId'], body='{}',
                              missingNoCache=False, token=value['token'])
                config.update(changes)
                plugin = store.parent / 'fixture-ecwid/entry.php'
                plugin.parent.mkdir()
                plugin.write_bytes(b'<?php $GLOBALS["ordinary_marker"]=true;')
                compiled = source
                if config.pop('expired', False):
                    compiled = compiled.replace(str(value['expires']).encode(), b'1', 1)
                helper = mu / ('ktk-transaction-rehearsal-' + old['transactionId'] + '.php')
                helper.write_bytes(compiled)
                config['helper'] = str(helper)
            with mock.patch.object(snapshot, 'DRIVER', driver):
                result, _ = snapshot.SnapshotPHPTests().fixture(mutate)
            self.assertEqual(result['queries'], [])
            if changes.get('method'):
                self.assertEqual(result['status'], 403)
                self.assertFalse(result['ordinaryMarker'])
            else:
                self.assertTrue(result['noProbe'])
                self.assertTrue(result['ordinaryMarker'])


class UnpreparedEngineDisposalRunnerTests(unittest.TestCase):
    def runner(self):
        spec = importlib.util.spec_from_file_location(
            'ktk_empty_engine_disposal_runner_tests',
            disposal.ROOT / 'tools/dispose-staging-unprepared-engine-seeds.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_default_offline_mode_uses_no_vault_connection_compiler_or_credential(self):
        module = self.runner()
        with tempfile.TemporaryDirectory(prefix='ktk-empty-engine-offline-') as folder:
            root = Path(folder).resolve()
            report = root / 'docs/seo/offline.json'
            args = ['--transaction', 'd' * 32, '--application-commit', 'c' * 40,
                    '--tooling-commit', 'e' * 40, '--report', str(report)]
            with mock.patch.object(module, 'ROOT', root), \
                    mock.patch.object(module.engine_runner, 'reviewed_source', return_value=(
                        {'ktk-code-pages.php': 'e' * 64}, {'ktk-code-pages.php': 7}, {})), \
                    mock.patch.object(module, 'fingerprints', return_value={
                        'tools/unprepared_engine_seed_disposal.py': 'f' * 64}), \
                    mock.patch.object(module.original_recovery.FullPrivateEngineVault, 'load',
                                      side_effect=AssertionError('no vault')), \
                    mock.patch.object(module.shared.snapshot, 'load_common',
                                      side_effect=AssertionError('no connection')), \
                    mock.patch.object(module.disposal, 'helper_source',
                                      side_effect=AssertionError('no compiler')):
                module.main(args)
            result = json.loads(report.read_bytes())
            self.assertEqual(result['phase'], 'offline-validated')
            self.assertFalse(result['fullHostTransactionAcceptance'])
            self.assertFalse(result['fullPrivateCopyVerified'])

    def test_invalid_identity_and_unscoped_resume_fence_refuse_before_source_or_vault(self):
        module = self.runner()
        common = ['--transaction', 'd' * 32, '--application-commit', 'c' * 40,
                  '--tooling-commit', 'e' * 40, '--report', 'docs/seo/not-written.json']
        with mock.patch.object(module.engine_runner, 'reviewed_source',
                               side_effect=AssertionError('no source or connection')):
            for extra in (['--transaction', '../outside'], ['--abandoned-state', 'f' * 64],
                          ['--resume-disposal', 'wrong']):
                with self.assertRaises(ValueError):
                    module.main(common + extra)

    def test_changed_original_source_provenance_refuses_before_any_connection_or_helper(self):
        module = self.runner()
        old = engine_recovery.fixture()
        with tempfile.TemporaryDirectory(prefix='ktk-empty-engine-provenance-') as folder:
            root = Path(folder).resolve()
            report = root / 'docs/seo/refused.json'
            args = ['--dispose-staging', '--transaction', old['transactionId'],
                    '--application-commit', old['applicationCommit'],
                    '--tooling-commit', 'e' * 40, '--report', str(report)]
            with mock.patch.object(module, 'ROOT', root), \
                    mock.patch.object(module.engine_runner, 'reviewed_source', return_value=(
                        old['publicOwned'], old['publicSizes'], {})), \
                    mock.patch.object(module, 'fingerprints', return_value={
                        'tools/unprepared_engine_seed_disposal.py': 'f' * 64}), \
                    mock.patch.object(module.original_recovery.FullPrivateEngineVault, 'load',
                                      return_value=old), \
                    mock.patch.object(module.subprocess, 'check_output', return_value=b'changed'), \
                    mock.patch.object(module.shared.snapshot, 'load_common',
                                      side_effect=AssertionError('no connection')):
                with self.assertRaises(RuntimeError):
                    module.main(args)
            result = json.loads(report.read_bytes())
            self.assertEqual(result['failureType'], 'ValueError')
            self.assertEqual(result['failedAtPhase'], 'offline-validated')
            self.assertNotIn('helper', result)


if __name__ == '__main__':
    unittest.main()
