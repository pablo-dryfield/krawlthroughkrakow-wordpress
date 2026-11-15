"""Execute the real PHP transaction component against isolated filesystem fixtures."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
ENGINE = ROOT / 'tools/code-pages-update-engine.php'
ASSETS = 'ktk-code-pages-assets/'
MARKER = 'ktk-code-pages-production.php'
ACTIVATION = b"<?php\n/** Plugin Name: KTK Production Content Activation */\nif (!defined('ABSPATH')) { exit; }\nif (!defined('KTK_CODE_PAGES_PRODUCTION_ENABLED')) { define('KTK_CODE_PAGES_PRODUCTION_ENABLED', true); }\n"


def sha(data):
    return hashlib.sha256(data).hexdigest()


DRIVER = r'''<?php
define('KTK_UPDATE_ENGINE_ALLOWED', true);
require $argv[1];
$config = json_decode(file_get_contents($argv[2]), true, 512, JSON_THROW_ON_ERROR);
$fault = $argv[4] ?? '';
$used = false;
$guard = static function () use ($config) { return hash_file('sha256', $config['protected']); };
$observer = static function ($event, $name) use ($config, $fault, &$used) {
    if ($used) { return; }
    if ($event === 'before-rename' && in_array($fault, array('source-change', 'target-change', 'protected-change', 'marker-change', 'target-equal-change'), true)) {
        $used = true;
        $path = $fault === 'source-change' ? $config['source'].'/'.$name : ($fault === 'target-change' ? $config['target'].'/'.$name :
            ($fault === 'protected-change' ? $config['protected'] : $config['target'].'/ktk-code-pages-production.php'));
        if ($fault === 'target-equal-change') { copy($config['source'].'/'.$name, $config['target'].'/'.$name); }
        else { file_put_contents($path, 'external concurrent bytes'); }
    }
    if ($event === 'after-rename' && $fault === 'lost-response') { $used = true; throw new RuntimeException('fixture response lost after actual replacement'); }
    if ($event === 'after-rename' && $fault === 'crash') { exit(73); }
    if ($event === 'after-rename' && $fault === 'future-target-change') {
        $used = true; file_put_contents($config['target'].'/ktk-code-pages.php', 'unrelated renderer change');
    }
    if ($event === 'after-rename' && $fault === 'future-equal-install') {
        $used = true; copy($config['source'].'/ktk-code-pages.php', $config['target'].'/ktk-code-pages.php');
    }
    if ($event === 'before-rename' && $fault === 'private-root-swap') {
        $used = true; $path = $config['private'].'/'.$config['plan']['transactionId'];
        rename($path, $config['private'].'/moved'); symlink($config['private'].'/moved', $path);
    }
    if ($event === 'before-delete' && $fault === 'delete-race') { $used = true; file_put_contents($config['target'].'/'.$name, 'concurrent new-file change'); }
};
try {
    $transaction = new KTK_Active_Content_Transaction($config['source'], $config['target'], $config['private'], $config['plan'], $guard, $observer);
    if ($argv[3] === 'double-lock') {
        $other = $config['plan']; $other['transactionId'] = str_repeat('b', 32);
        new KTK_Active_Content_Transaction($config['source'], $config['target'], $config['private'], $other, $guard);
        throw new RuntimeException('second transaction unexpectedly acquired lock');
    }
    $action = $argv[3];
    if (!in_array($action, array('prepare','apply','rollback','inspect'), true)) { throw new RuntimeException('No default write action'); }
    echo json_encode(array('ok'=>true, 'result'=>$transaction->$action()), JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    echo json_encode(array('ok'=>false, 'error'=>$error->getMessage()), JSON_THROW_ON_ERROR); exit(2);
}
'''


@unittest.skipUnless(shutil.which('php'), 'PHP is required for isolated transaction integration fixtures')
class ActiveContentTransactionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ktk-active-update-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source, self.target, self.private = (self.root / n for n in ('staging', 'production-fixture', 'private'))
        for p in (self.source, self.target, self.private):
            p.mkdir()
        self.old = {'ktk-code-pages.php': b'old renderer', ASSETS + 'registry.php': b'old registry', ASSETS + 'runtime.css': b'old css',
                    ASSETS + 'runtime.js': b'unchanged runtime', ASSETS + 'content/held-medical.html': b'held article unchanged', MARKER: ACTIVATION}
        self.new = {**self.old, 'ktk-code-pages.php': b'new renderer', ASSETS + 'registry.php': b'new registry', ASSETS + 'runtime.css': b'new css',
                    ASSETS + 'content/new.html': b'new content', ASSETS + 'shells/new.php': b'new shell'}
        del self.new[MARKER]
        for directory, files in ((self.target, self.old), (self.source, self.new)):
            for name, data in files.items():
                self.write(directory, name, data)
        self.protected = self.root / 'protected-state.json'
        self.protected.write_bytes(b'posts/meta/forms/options/homepage/storefront retained')
        self.plan = {'transactionId': 'a' * 32, 'applicationCommit': 'c' * 40, 'protectedStateSha256': sha(self.protected.read_bytes()),
                     'expected': {n: sha(b) for n, b in self.new.items()}, 'prior': {n: sha(b) for n, b in self.old.items()}}
        self.config = self.root / 'config.json'
        self.driver = self.root / 'driver.php'
        self.driver.write_bytes(DRIVER.encode())
        self.save_config()

    def write(self, root, name, data):
        p = root / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)

    def save_config(self):
        self.config.write_bytes(json.dumps({'source': str(self.source), 'target': str(self.target), 'private': str(self.private),
                                           'protected': str(self.protected), 'plan': self.plan}).encode())

    def run_action(self, action, fault='', success=True):
        result = subprocess.run(['php', '-d', 'allow_url_fopen=0', str(self.driver), str(ENGINE), str(self.config), action, fault],
                                capture_output=True, text=True, timeout=30)
        if fault == 'crash':
            self.assertEqual(result.returncode, 73, result.stderr)
            return None
        self.assertEqual(result.returncode, 0 if success else 2, result.stdout + result.stderr)
        data = json.loads(result.stdout)
        self.assertIs(data['ok'], success)
        return data.get('result') if success else data['error']

    def tree(self, root=None):
        root = root or self.target
        return {p.relative_to(root).as_posix(): p.read_bytes() for p in root.rglob('*') if p.is_file()}

    def test_direct_execution_cannot_register_endpoint_or_mutate(self):
        before = self.tree()
        result = subprocess.run(['php', str(ENGINE)], capture_output=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.tree(), before)
        self.assertFalse(list(self.private.iterdir()))

    def test_prepare_copies_verified_priors_without_changing_application(self):
        result = self.run_action('prepare')
        self.assertEqual(result['phase'], 'prepared')
        self.assertEqual(result['verifiedBackupFiles'], 4)
        self.assertEqual(self.tree(), self.old)
        backup = self.private / ('a' * 32) / 'prior'
        for name in (MARKER, 'ktk-code-pages.php', ASSETS + 'registry.php', ASSETS + 'runtime.css'):
            self.assertEqual((backup / name).read_bytes(), self.old[name])

    def test_complete_install_and_exact_rollback_keep_activation_and_held_text(self):
        self.run_action('prepare')
        result = self.run_action('apply')
        self.assertEqual(self.tree(), {**self.new, MARKER: ACTIVATION})
        installed = [v.removeprefix('installed:') for v in result['events'] if v.startswith('installed:')]
        self.assertEqual(installed[-2:], [ASSETS + 'registry.php', 'ktk-code-pages.php'])
        self.assertEqual(result['activationWrites'], 0)
        self.assertEqual(self.run_action('apply')['phase'], 'applied')
        self.assertEqual(self.run_action('rollback')['phase'], 'rolled-back')
        self.assertEqual(self.tree(), self.old)
        self.run_action('apply', success=False)

    def test_lost_response_is_inspected_and_resumes_same_transaction(self):
        self.run_action('prepare')
        self.run_action('apply', 'lost-response', success=False)
        status = self.run_action('inspect')
        self.assertEqual(status['phase'], 'uncertain')
        self.assertEqual(len(status['intentFiles']), 1)
        self.assertNotEqual(self.tree(), self.old)
        self.assertEqual(self.run_action('apply')['phase'], 'applied')
        self.run_action('rollback')
        self.assertEqual(self.tree(), self.old)

    def test_process_death_after_rename_preserves_intent_for_exact_rollback(self):
        self.run_action('prepare')
        self.run_action('apply', 'crash')
        self.assertEqual(self.run_action('inspect')['phase'], 'applying')
        self.run_action('rollback')
        self.assertEqual(self.tree(), self.old)

    def test_unknown_owned_file_blocks_before_any_application_write(self):
        self.write(self.target, ASSETS + 'unreviewed.php', b'unknown')
        before = self.tree()
        self.run_action('prepare', success=False)
        self.assertEqual(self.tree(), before)

    def test_source_drift_blocks_preparation(self):
        self.write(self.source, ASSETS + 'runtime.css', b'unreviewed')
        self.run_action('prepare', success=False)
        self.assertEqual(self.tree(), self.old)

    def test_changed_or_missing_activation_cannot_be_repaired_by_engine(self):
        for value in (b'unknown activation', None):
            path = self.target / MARKER
            if value is None:
                path.unlink()
            else:
                path.write_bytes(value)
            before = self.tree()
            self.run_action('prepare', success=False)
            self.assertEqual(self.tree(), before)

    def test_changed_prior_blocks_prepare_without_overwriting_concurrent_bytes(self):
        self.write(self.target, ASSETS + 'runtime.css', b'concurrent')
        before = self.tree()
        self.run_action('prepare', success=False)
        self.assertEqual(self.tree(), before)

    def test_invalid_late_target_ancestor_is_found_before_first_write(self):
        self.write(self.target, ASSETS + 'shells', b'file instead of directory')
        before = self.tree()
        self.run_action('prepare', success=False)
        self.assertEqual(self.tree(), before)

    def test_traversal_activation_and_case_collision_plans_are_rejected(self):
        for name in ('../escape.php', MARKER, ASSETS + 'a/../../escape.php', ASSETS + 'Runtime.css'):
            with self.subTest(name=name):
                self.plan['expected'][name] = sha(b'wrong')
                self.save_config()
                self.run_action('prepare', success=False)
                self.assertEqual(self.tree(), self.old)
                del self.plan['expected'][name]

    def test_source_changes_during_copy_leave_old_target_and_no_temp(self):
        self.run_action('prepare')
        self.run_action('apply', 'source-change', success=False)
        self.assertEqual(self.tree(), self.old)
        self.assertFalse(list(self.target.rglob('.ktk-content-*')))
        self.run_action('rollback')  # Restoring our old state does not depend on modified staging.
        self.assertEqual(self.tree(), self.old)

    def test_equal_foreign_install_detected_before_rename_is_not_owned_for_rollback(self):
        self.run_action('prepare')
        self.run_action('apply', 'target-equal-change', success=False)
        before = self.tree()
        self.run_action('rollback', success=False)
        self.assertEqual(self.tree(), before)
        self.assertFalse(self.run_action('inspect')['intentFiles'])

    def test_target_changes_during_copy_are_never_overwritten_or_restored(self):
        self.run_action('prepare')
        self.run_action('apply', 'target-change', success=False)
        before = self.tree()
        self.run_action('rollback', success=False)
        self.assertEqual(self.tree(), before)
        self.assertIn(b'external concurrent bytes', before.values())

    def test_protected_state_change_stops_without_database_restore(self):
        self.run_action('prepare')
        self.run_action('apply', 'protected-change', success=False)
        self.assertEqual(self.tree(), self.old)
        self.run_action('rollback', success=False)
        self.assertEqual(self.protected.read_bytes(), b'external concurrent bytes')

    def test_marker_change_during_copy_is_never_disabled_or_replaced(self):
        self.run_action('prepare')
        self.run_action('apply', 'marker-change', success=False)
        self.assertEqual((self.target / MARKER).read_bytes(), b'external concurrent bytes')
        self.run_action('rollback', success=False)
        self.assertEqual((self.target / MARKER).read_bytes(), b'external concurrent bytes')

    def test_future_file_conflict_stops_then_requires_manual_review(self):
        self.run_action('prepare')
        self.run_action('apply', 'future-target-change', success=False)
        before = self.tree()
        self.run_action('rollback', success=False)
        self.assertEqual(self.tree(), before)

    def test_concurrent_equal_bytes_without_own_intent_are_not_claimed(self):
        self.run_action('prepare')
        self.run_action('apply', 'future-equal-install', success=False)
        before = self.tree()
        self.run_action('rollback', success=False)
        self.assertEqual(self.tree(), before)

    def test_new_file_cleanup_refuses_concurrent_change_before_delete(self):
        self.run_action('prepare')
        self.run_action('apply')
        self.run_action('rollback', 'delete-race', success=False)
        self.assertEqual((self.target / (ASSETS + 'content/new.html')).read_bytes(), b'concurrent new-file change')
        self.assertEqual((self.target / MARKER).read_bytes(), ACTIVATION)

    def test_corrupt_backup_blocks_apply_and_rollback(self):
        self.run_action('prepare')
        backup = self.private / ('a' * 32) / 'prior' / 'ktk-code-pages.php'
        backup.write_bytes(b'corrupted backup')
        status = self.run_action('inspect')
        self.assertIs(status['backupVerified'], False)
        self.assertEqual(status['verifiedBackupFiles'], 0)
        self.run_action('apply', success=False)
        self.run_action('rollback', success=False)
        self.assertEqual(self.tree(), self.old)

    def test_different_transaction_or_commit_cannot_reuse_receipt(self):
        self.run_action('prepare')
        self.plan['applicationCommit'] = 'd' * 40
        self.save_config()
        self.run_action('apply', success=False)
        self.assertEqual(self.tree(), self.old)

    def test_distinct_transaction_ids_share_exclusive_target_lock(self):
        error = self.run_action('double-lock', success=False)
        self.assertIn('holds this lock', error)
        self.assertEqual(self.tree(), self.old)

    def test_default_and_repeat_preparation_do_not_write_application(self):
        self.run_action('default', success=False)
        self.run_action('apply', success=False)
        self.run_action('prepare')
        self.run_action('prepare', success=False)
        self.assertEqual(self.tree(), self.old)

    def test_private_directory_cannot_be_inside_public_content(self):
        self.private = self.target / 'private'
        self.private.mkdir()
        self.save_config()
        self.run_action('prepare', success=False)
        self.assertEqual(self.tree(), self.old)

    def test_symlink_target_root_and_content_ancestor_are_rejected(self):
        link = self.root / 'linked-target'
        try:
            link.symlink_to(self.target, target_is_directory=True)
        except OSError as error:
            self.skipTest('OS does not permit fixture symlinks: ' + type(error).__name__)
        self.target = link
        self.save_config()
        self.run_action('prepare', success=False)
        self.assertEqual(self.tree(), self.old)

    def test_symlink_source_ancestor_and_backup_are_rejected(self):
        outside = self.root / 'outside'
        outside.mkdir()
        probe = self.root / 'probe'
        try:
            probe.symlink_to(outside, target_is_directory=True)
        except OSError as error:
            self.skipTest('OS does not permit fixture symlinks: ' + type(error).__name__)
        probe.unlink()
        content = self.source / ASSETS / 'content'
        content.rename(outside / 'content')
        content.symlink_to(outside / 'content', target_is_directory=True)
        self.run_action('prepare', success=False)
        self.assertEqual(self.tree(), self.old)
        content.unlink()
        (outside / 'content').rename(content)
        self.run_action('prepare')
        backup = self.private / ('a' * 32) / 'prior' / 'ktk-code-pages.php'
        saved = outside / 'renderer.php'
        backup.rename(saved)
        backup.symlink_to(saved)
        self.run_action('apply', success=False)
        self.run_action('rollback', success=False)
        self.assertEqual(self.tree(), self.old)

    def test_symlink_target_content_ancestor_is_rejected(self):
        content = self.target / ASSETS / 'content'
        outside = self.root / 'outside'
        try:
            outside.symlink_to(content, target_is_directory=True)
        except OSError as error:
            self.skipTest('OS does not permit fixture symlinks: ' + type(error).__name__)
        outside.unlink()
        content.rename(outside)
        content.symlink_to(outside, target_is_directory=True)
        self.run_action('prepare', success=False)
        self.assertEqual((outside / 'held-medical.html').read_bytes(), b'held article unchanged')

    def test_journal_manifest_tampering_is_rejected(self):
        self.run_action('prepare')
        path = self.private / ('a' * 32) / 'journal.json'
        data = json.loads(path.read_bytes())
        data['backups'].pop('ktk-code-pages.php')
        path.write_bytes(json.dumps(data).encode())
        self.run_action('apply', success=False)
        self.run_action('rollback', success=False)
        self.assertEqual(self.tree(), self.old)

    def test_private_root_swapped_during_copy_stops_before_application_write(self):
        probe = self.root / 'probe'
        try:
            probe.symlink_to(self.private, target_is_directory=True)
        except OSError as error:
            self.skipTest('OS does not permit fixture symlinks: ' + type(error).__name__)
        probe.unlink()
        self.run_action('prepare')
        self.run_action('apply', 'private-root-swap', success=False)
        self.assertEqual(self.tree(), self.old)

    def test_inspection_does_not_treat_historical_phase_as_current_hash_proof(self):
        self.run_action('prepare')
        self.run_action('apply')
        self.write(self.target, ASSETS + 'runtime.css', b'concurrent after completed update')
        status = self.run_action('inspect')
        self.assertEqual(status['phase'], 'applied')
        self.assertIs(status['currentExpectedInventoryVerified'], False)
        self.assertIs(status['currentPriorInventoryVerified'], False)
        before = self.tree()
        self.run_action('rollback', success=False)
        self.assertEqual(self.tree(), before)

    def test_unexpected_file_after_prepare_blocks_all_copying(self):
        self.run_action('prepare')
        self.write(self.target, ASSETS + 'unknown.php', b'external')
        before = self.tree()
        self.run_action('apply', success=False)
        self.run_action('rollback', success=False)
        self.assertEqual(self.tree(), before)


if __name__ == '__main__':
    unittest.main()
