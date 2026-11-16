"""Actual compiled PHP protocol through the new host runner, plus exact-helper cleanup fault contracts."""
import importlib.util
import contextlib
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from tools import content_update_backup as backup
from tools import content_update_staging_packet as packet
from tools.tests import test_content_update_staging_packet as compiled
from tools.tests import test_content_update_controller as fixtures
from tools.tests import test_content_update_recovery as recovery_fixtures
from tools.tests import test_content_update_staging_disposal as disposal_fixtures

spec = importlib.util.spec_from_file_location('ktk_new_controller_rehearsal', Path(__file__).resolve().parents[1] / 'rehearse-staging-content-controller.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class HelperCommon:
    def __init__(self, data=None):
        self.data = data
        self.common = self
        self.calls = []
    def retrieve_file(self, scope, path):
        self.calls.append(('read', path))
        return self.data
    def atomic_upload(self, scope, path, data):
        self.calls.append(('upload', path))
        self.data = data
    def remove_file(self, scope, path):
        self.calls.append(('delete', path))
        self.data = None


class HelperLeaseTests(unittest.TestCase):
    def lease(self, common):
        scope = type('Scope', (), {'path': '/public_html/staging/wp-content/mu-plugins/ktk-transaction-rehearsal-' + 'a' * 32 + '.php'})()
        return runner.HelperLease(common, None, scope, b'known helper')
    def test_existing_helper_is_preserved_without_upload_or_cleanup(self):
        common = HelperCommon(b'unknown');lease = self.lease(common)
        with self.assertRaises(ValueError):lease.install()
        lease.remove()
        self.assertEqual(common.data, b'unknown');self.assertFalse(any(c[0] in ('upload', 'delete') for c in common.calls))
    def test_changed_installed_helper_is_preserved(self):
        common = HelperCommon();lease = self.lease(common);lease.install();common.data = b'changed'
        with self.assertRaises(ValueError):lease.remove()
        self.assertEqual(common.data, b'changed');self.assertFalse(any(c[0] == 'delete' for c in common.calls))
    def test_exact_installed_helper_removed_and_absence_read_back(self):
        common = HelperCommon();lease = self.lease(common);lease.install();lease.remove()
        self.assertIsNone(common.data);self.assertTrue(lease.removed);self.assertEqual(common.calls[-1][0], 'read')
    def test_changed_local_source_or_build_stops_before_host_mutation(self):
        for source, owned in [({'new': 'hash'}, {'file': 'old'}), ({'old': 'hash'}, {'file': 'new'})]:
            with patch.object(runner, 'source_hashes', return_value=source), patch.object(runner.snapshot, 'local_owned_checksums', return_value=owned):
                with self.assertRaises(ValueError):runner.unchanged({'file': 'old'}, {'old': 'hash'})
    def test_lost_helper_delete_reply_is_only_followed_by_absence_inspection(self):
        common = HelperCommon();lease = self.lease(common);lease.install()
        def lost(scope, path):
            common.calls.append(('delete', path));common.data = None;raise EOFError('lost reply')
        common.remove_file = lost
        with self.assertRaises(EOFError):lease.remove()
        lease.remove();self.assertTrue(lease.removed)
        self.assertEqual(sum(c[0] == 'delete' for c in common.calls), 1)
    def test_uncertain_unexecuted_helper_delete_is_not_retried(self):
        common = HelperCommon();lease = self.lease(common);lease.install()
        def failed(scope, path):
            common.calls.append(('delete', path));raise EOFError('unknown execution')
        common.remove_file = failed
        with self.assertRaises(EOFError):lease.remove()
        with self.assertRaises(ValueError):lease.remove()
        self.assertEqual(common.data, b'known helper');self.assertEqual(sum(c[0] == 'delete' for c in common.calls), 1)


class ReviewedSourceTests(unittest.TestCase):
    @contextlib.contextmanager
    def repository(self):
        with tempfile.TemporaryDirectory(prefix='ktk-git-') as directory:
            root = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', *args], cwd=root, stderr=subprocess.DEVNULL).decode().strip()
            git('init', '-q')
            mu = root / 'staging/wp-content/mu-plugins';(mu / 'ktk-code-pages-assets').mkdir(parents=True)
            (mu / 'ktk-code-pages.php').write_bytes(b'fixture renderer')
            (mu / 'ktk-code-pages-assets/registry.php').write_bytes(b'fixture registry')
            git('add', '.');git('commit', '-qm', 'application fixture');app = git('rev-parse', 'HEAD')
            (root / 'tooling.txt').write_bytes(b'reviewed tooling fixture')
            git('add', '.');git('commit', '-qm', 'tooling fixture');head = git('rev-parse', 'HEAD')
            owned = {p.relative_to(mu).as_posix(): backup.sha(p.read_bytes()) for p in mu.rglob('*') if p.is_file()}
            with patch.object(runner, 'ROOT', root), patch.object(runner.snapshot, 'local_owned_checksums', return_value=owned), patch.object(runner, 'source_hashes', return_value={'tools/fixture.py': 'a' * 64}):
                yield root, mu, app, head, owned
    def test_clean_exact_source_accepts_dynamic_complete_inventory(self):
        with self.repository() as (root, mu, app, head, owned):
            result, hashes = runner.reviewed_source(app, head)
            self.assertEqual(result, owned);self.assertEqual(len(result), 2);self.assertEqual(hashes, {'tools/fixture.py': 'a' * 64})
    def test_wrong_tooling_head_is_refused(self):
        with self.repository() as (root, mu, app, head, owned):
            with self.assertRaises(ValueError):runner.reviewed_source(app, app)
    def test_dirty_tracked_or_untracked_source_is_refused(self):
        for name in ('tooling.txt', 'untracked.txt'):
            with self.subTest(name=name), self.repository() as (root, mu, app, head, owned):
                (root / name).write_bytes(b'changed')
                with self.assertRaises(ValueError):runner.reviewed_source(app, head)
    def test_ignored_owned_file_cannot_be_laundered_through_a_local_manifest(self):
        with self.repository() as (root, mu, app, head, owned):
            extra = 'ktk-code-pages-assets/extra.html';(mu / extra).write_bytes(b'not in reviewed Git')
            (root / '.git/info/exclude').write_bytes(b'extra.html\n')
            owned[extra] = backup.sha((mu / extra).read_bytes())
            with self.assertRaises(ValueError):runner.reviewed_source(app, head)


@unittest.skipUnless(fixtures.PHP, 'PHP required for the actual compiled rehearsal protocol')
class ControllerRehearsalTests(unittest.TestCase):
    def test_runner_recovers_actual_exit_archives_acknowledges_applies_rolls_back_closes_then_disposes(self):
        server = compiled.StagingControllerPacketTests(methodName='runTest');original = packet.helper_source
        with patch.object(packet, 'helper_source', lambda *a, **kw: original(*a, **kw, preparation_fault=True)):
            context = server.fixture();values = context.__enter__()
        try:
            root, mu, private, config, source, binding, client, request, calls, owned, expires = values
            phases = [];archive = root / 'deploy-backups/runner.zip'
            result = runner.exercise(client, archive, phases.append)
            self.assertTrue(result['closed']);self.assertEqual(result['terminalPhase'], 'rolled-back')
            self.assertEqual(calls.count('prepare'), 1);self.assertEqual(calls.count('recover-preparation'), 1)
            self.assertEqual(calls.count('apply'), 5);self.assertEqual(calls.count('rollback'), 5)
            self.assertEqual(phases[-1], 'private-fixture-closed');self.assertEqual(result['archive'], client.verified_archive())
            recovered_packet = recovery_fixtures.packet(expires)
            recovered_packet.update(helperSha256=backup.sha(source), ownershipKey=client.key, publicOwned=owned,
                                    plan=packet.fixture_plan(fixtures.ID, fixtures.APP, client.manifest['protectedStateSha256']), preparationFault=True)
            ftp = disposal_fixtures.TreeFTP(client.manifest, private)
            disposed = runner.PrivateStagingDisposer(ftp, recovered_packet, archive).dispose()
            self.assertEqual(disposed['removedPayloadFiles'], 19);self.assertEqual(len(disposed['retainedMetadata']), 7)
            self.assertFalse((private / 'control/original-state.json').exists());self.assertFalse((mu / backup.ACTIVATION).exists())
        finally:context.__exit__(None, None, None)
    def test_unexpected_normal_preparation_never_proceeds_to_archive_or_apply(self):
        server = compiled.StagingControllerPacketTests(methodName='runTest')
        with server.fixture() as values:
            root, mu, private, config, source, binding, client, request, calls, owned, expires = values
            with self.assertRaises(ValueError):runner.exercise(client, root / 'deploy-backups/unexpected.zip')
            self.assertEqual(calls, ['prepare']);self.assertFalse((root / 'deploy-backups/unexpected.zip').exists())


if __name__ == '__main__':unittest.main()
