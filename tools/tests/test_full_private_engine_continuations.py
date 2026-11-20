"""Real private PHP recovery plus negative admission gates; no hosting connector."""
import copy
import unittest
from unittest import mock
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools import full_private_engine_continuations as adapter
from tools import full_private_engine_exercise as exercise
from tools.full_private_engine_client import FullPrivateEngineClient
from tools.content_update_client import UncertainRequest
from tools.tests import test_full_private_engine_exercise as native


class PreparedOnlyGateTests(unittest.TestCase):
    def case(self, change=None, receipt_changed=False):
        expected = {'source/file': {'bytes': 3, 'sha256': 'a'*64}, 'target/file': {'bytes': 3, 'sha256': 'b'*64}}
        p = {'rootExists': True, 'recordsComplete': True, 'seedsComplete': True, 'enginePhase': 'prepared',
             'rootBinding': 'c'*64, 'fullSeed': {'sourceComplete': True, 'targetComplete': True,
                 'files': copy.deepcopy(expected), 'copiedBytes': 6}}
        e = {'closed': False, 'archiveAcknowledged': False,
             'engine': {'phase': 'prepared', 'currentPriorInventoryVerified': True, 'protectedStateVerified': True}}
        if change:
            change(p, e)
        client = mock.Mock(plan={}, sizes={}, overrides={}, key='k', helper_sha256='d'*64)
        client.inspect_preparation.return_value = {'preparation': p}
        client.inspect.return_value = e
        transport = mock.Mock()
        receipt = {'sha256': 'e'*64}
        with mock.patch.object(adapter.frozen_resume, 'attach_verified_original', return_value=({'rootBinding': 'c'*64}, receipt, {})), \
             mock.patch.object(adapter.full, 'expected_seed_files', return_value=(expected, [])), \
             mock.patch.object(adapter.full, 'verify_archive', return_value={} if receipt_changed else receipt):
            if change or receipt_changed:
                with self.assertRaises(ValueError):
                    adapter.continue_prepared_engine(client, transport, 'original', 'rollback', step_bytes=16777216, step_files=64)
            else:
                result = adapter.continue_prepared_engine(client, transport, 'original', 'rollback', step_bytes=16777216, step_files=64)
                self.assertTrue(result[2]['prepared'])
                self.assertEqual(result[2]['initializationMutationCallsThisProcess'], 0)
        client.recover_preparation.assert_not_called()
        client.step.assert_not_called()
        client.export_and_acknowledge.assert_not_called()
        client.close.assert_not_called()
        self.assertEqual(transport.mock_calls, [])

    def test_complete_prepared_state_admitted_without_mutation(self):
        self.case()

    def test_incomplete_or_advanced_states_refuse(self):
        changes = [lambda p,e:p.update(rootExists=False), lambda p,e:p.update(recordsComplete=False),
            lambda p,e:p.update(seedsComplete=False), lambda p,e:p.update(enginePhase=None),
            lambda p,e:p.update(enginePhase='unprepared'), lambda p,e:p.update(rootBinding='f'*64),
            lambda p,e:p['fullSeed'].update(sourceComplete=False), lambda p,e:p['fullSeed'].update(targetComplete=False),
            lambda p,e:p['fullSeed'].update(copiedBytes=5), lambda p,e:p['fullSeed']['files'].pop('source/file'),
            lambda p,e:e.update(closed=True), lambda p,e:e.update(archiveAcknowledged=True),
            lambda p,e:e['engine'].update(phase='applied'), lambda p,e:e['engine'].update(currentPriorInventoryVerified=False),
            lambda p,e:e['engine'].update(protectedStateVerified=False)]
        for index, change in enumerate(changes):
            with self.subTest(index=index):
                self.case(change)

    def test_changed_archive_refuses(self):
        self.case(receipt_changed=True)

    def test_unreviewed_work_profile_refuses_before_archive_or_inspection(self):
        client = mock.Mock()
        with mock.patch.object(adapter.frozen_resume, 'attach_verified_original') as archive:
            with self.assertRaises(ValueError):
                adapter.continue_prepared_engine(client, mock.Mock(), 'o', 'r', step_bytes=67108864, step_files=256)
            archive.assert_not_called()
            client.inspect_preparation.assert_not_called()


class FirstRollbackGateTests(unittest.TestCase):
    def fixture(self):
        changed = ['assets/about.html', 'assets/registry.php', 'assets/runtime.css', 'assets/runtime.js', 'plugin.php']
        # The engine puts activation assets last; this differs from lexical order.
        ordered = [changed[0], changed[2], changed[3], changed[1], changed[4]]
        return changed, {'closed': False, 'archiveAcknowledged': True, 'engine': {
            'phase': 'rolling-back', 'intentFiles': ordered, 'pendingApplyFiles': [changed[0]],
            'pendingRollbackFiles': ordered[1:], 'currentExpectedInventoryVerified': False,
            'currentPriorInventoryVerified': False, 'backupVerified': True, 'protectedStateVerified': True,
            'privateTemporaryInspectionVerified': True, 'privateReceiptInspectionVerified': True,
            'retainedPrivateTemporaryArtifacts': [], 'retainedPrivateReceiptArtifacts': []}}

    def test_activation_order_differs_from_lexical_plan_but_exact_sets_pass(self):
        changed, state = self.fixture()
        self.assertNotEqual(state['engine']['intentFiles'], changed)
        adapter.require_first_rollback(state, changed)

    def test_changed_or_duplicate_inventory_and_unhealthy_state_refuse(self):
        changed, state = self.fixture()
        variants = [('closed', True), ('archiveAcknowledged', False), ('engine.phase', 'applied'),
            ('engine.intentFiles', changed[1:]), ('engine.intentFiles', [changed[0]]*5),
            ('engine.pendingApplyFiles', []), ('engine.pendingRollbackFiles', changed),
            ('engine.pendingRollbackFiles', [changed[1]]*4), ('engine.currentExpectedInventoryVerified', True),
            ('engine.currentPriorInventoryVerified', True), ('engine.backupVerified', False),
            ('engine.protectedStateVerified', False), ('engine.privateTemporaryInspectionVerified', False),
            ('engine.privateReceiptInspectionVerified', False), ('engine.retainedPrivateTemporaryArtifacts', ['x']),
            ('engine.retainedPrivateReceiptArtifacts', ['x'])]
        for key, value in variants:
            with self.subTest(key=key, value=value):
                candidate = copy.deepcopy(state)
                keys = key.split('.')
                target = candidate
                for name in keys[:-1]:
                    target = target[name]
                target[keys[-1]] = value
                with self.assertRaises(ValueError):
                    adapter.require_first_rollback(candidate, changed)


@unittest.skipUnless(native.bridge.old.PHP, 'Real PHP required for private continuation')
class NativeContinuationTests(unittest.TestCase):
    def fixture(self):
        factory = native.FullPrivateEngineExerciseTests('runTest')
        c = factory.fixture()
        self.addCleanup(factory.doCleanups)
        actions = []
        cut = {'rollback': False}

        def transport(raw):
            action = backup.decode(raw)['action']
            actions.append(action)
            fault = action == 'rollback' and cut['rollback']
            c.cfg.update(operation='controller', request=raw.decode(), fault='exit-after-rename' if fault else '')
            out = c.case.call(c.root, c.driver, c.cfg, exit_code=73 if fault else 0)
            if out is None:
                cut['rollback'] = False
                raise TimeoutError('Native private rollback after-rename cut')
            if not out['ok']:
                raise RuntimeError('Native private continuation refused')
            return {'privateProfile': 'full-private-engine-v1', 'helperSha256': c.cfg['packet']['helperSha256'], 'controller': out['value']}

        def fresh_client():
            return FullPrivateEngineClient(c.plan, c.sizes, c.overrides, c.mu, c.cfg['packet']['helperSha256'],
                native.bridge.old.KEY, transport, lambda n: (c.private/n).read_bytes())

        class Original:
            def original_manifest(self):
                c.cfg['operation'] = 'capsule'
                return c.case.call(c.root, c.driver, c.cfg)['capsule']

            def acknowledge_original(self, path, key, manifest):
                receipt = full.verify_archive(path, c.plan, key, c.cfg['packet']['helperSha256'], manifest)
                c.cfg['originalArchive'] = {'originalManifestSha256': manifest['manifestSha256'], 'originalArchiveSha256': receipt['sha256']}

        directory = c.root/'deploy-backups'
        directory.mkdir()
        original = directory/('staging-full-engine-original-'+c.plan['transactionId']+'.zip')
        rollback = directory/('staging-full-engine-rollback-'+c.plan['transactionId']+'.zip')
        client = fresh_client()
        with mock.patch.object(full, 'ROOT', c.root):
            exercise.prepare(client, Original(), original, lambda n: (c.private/n).read_bytes(), full.build_archive)
        return c, actions, cut, fresh_client, original, rollback

    def test_real_prepared_engine_is_inspected_without_initialization_or_copy(self):
        c, actions, cut, fresh_client, original, rollback = self.fixture()
        actions.clear()
        client = fresh_client()
        unused_transport = mock.Mock()
        with mock.patch.object(backup, 'ROOT', c.root):
            manifest, receipt, result = adapter.continue_prepared_engine(client, unused_transport, original, rollback)
        self.assertEqual(actions, ['inspect-preparation', 'inspect'])
        self.assertEqual(result['initializationMutationCallsThisProcess'], 0)
        self.assertTrue(result['freshPreparedEngineInspectionVerified'])
        self.assertEqual(c.public(), c.before)
        unused_transport.assert_not_called()
        self.assertFalse(rollback.exists())

    def test_real_rollback_process_death_then_fresh_client_restores_and_closes(self):
        c, actions, cut, fresh_client, original, rollback = self.fixture()
        client = fresh_client()
        with mock.patch.object(backup, 'ROOT', c.root):
            client.export_and_acknowledge(rollback)
            for _ in range(5):
                client.step('apply')
            self.assertEqual(client.state['engine']['phase'], 'applied')
            cut['rollback'] = True
            with self.assertRaises(UncertainRequest):
                client.step('rollback')
            actions.clear()
            result = adapter.continue_first_rollback_cut(fresh_client(), original, rollback)
        self.assertEqual(actions[:2], ['inspect', 'export'])
        self.assertEqual(actions.count('rollback'), 4)
        self.assertFalse({'apply', 'prepare', 'recover-preparation', 'acknowledge'} & set(actions))
        self.assertEqual(result['privateApplyCallsThisProcess'], 0)
        self.assertTrue(result['rolledBackClosureVerified'])
        self.assertEqual(c.public(), c.before)


if __name__ == '__main__':
    unittest.main()
