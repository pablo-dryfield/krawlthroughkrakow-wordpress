"""Execute the real PHP transaction component against isolated filesystem fixtures."""
import hashlib
import json
import os
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
    $receipts = $config['private'].'/'.$config['plan']['transactionId'].'/receipts';
    if ($event === 'after-private-temporary-create' && (in_array($fault, array('receipt-crash-empty', 'receipt-crash-partial'), true) ||
        ($fault === 'receipt-crash-after-install' && is_file($config['target'].'/ktk-code-pages-assets/content/new.html')))) {
        if ($fault !== 'receipt-crash-empty') {
            foreach (new DirectoryIterator($receipts) as $file) { if ($file->isFile()) { file_put_contents($file->getPathname(), 'partial'); break; } }
        }
        exit(73);
    }
    if ($event === 'before-private-receipt-rename' && $fault === 'receipt-crash-full') { exit(73); }
    if ($event === 'before-private-receipt-rename' && $fault === 'receipt-temporary-change') {
        $used = true;
        foreach (new DirectoryIterator($receipts) as $file) { if ($file->isFile()) { file_put_contents($file->getPathname(), 'foreign private receipt'); break; } }
    }
    if ($event === 'before-private-receipt-rename' && $fault === 'receipt-target-change') {
        $used = true; file_put_contents($config['private'].'/'.$config['plan']['transactionId'].'/'.$name, 'foreign committed receipt');
    }
    if ($event === 'before-private-receipt-rename' && $fault === 'receipt-root-swap') {
        $used = true; $path = $config['private'].'/'.$config['plan']['transactionId'];
        rename($path, $config['private'].'/moved'); symlink($config['private'].'/moved', $path);
    }
    if ($event === 'after-private-receipt-rename' && $fault === 'receipt-lost-response') { $used = true; throw new RuntimeException('fixture response lost after private receipt commit'); }
    if ($event === 'after-temporary-create' && in_array($fault, array('crash-before-copy', 'crash-partial-temp'), true)) {
        if ($fault === 'crash-partial-temp') {
            foreach (new DirectoryIterator($config['private'].'/'.$config['plan']['transactionId'].'/pending') as $file) {
                if ($file->isFile()) { file_put_contents($file->getPathname(), 'partial'); break; }
            }
        }
        exit(73);
    }
    if ($event === 'before-rename' && $fault === 'crash-before-rename') { exit(73); }
    if ($event === 'before-rename' && $fault === 'temporary-change') {
        foreach (new DirectoryIterator($config['private'].'/'.$config['plan']['transactionId'].'/pending') as $file) {
            if ($file->isFile()) { file_put_contents($file->getPathname(), 'unrelated private bytes'); break; }
        }
    }
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
    $result = array_key_exists('limit', $config) && in_array($action, array('apply', 'rollback'), true) ? $transaction->$action($config['limit']) : $transaction->$action();
    echo json_encode(array('ok'=>true, 'result'=>$result), JSON_THROW_ON_ERROR);
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

    def run_action(self, action, fault='', success=True, **options):
        config = json.loads(self.config.read_bytes())
        config.pop('limit', None)
        config.update(options)
        self.config.write_bytes(json.dumps(config).encode())
        result = subprocess.run(['php', '-d', 'allow_url_fopen=0', str(self.driver), str(ENGINE), str(self.config), action, fault],
                                capture_output=True, text=True, timeout=30)
        if fault in ('crash', 'crash-before-copy', 'crash-partial-temp', 'crash-before-rename', 'receipt-crash-empty', 'receipt-crash-partial', 'receipt-crash-full', 'receipt-crash-after-install'):
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

    def interrupted_private_temporary(self, fault, expected_bytes=None):
        self.run_action('prepare')
        self.run_action('apply', fault)
        status=self.run_action('inspect')
        self.assertEqual(status['phase'],'applying')
        self.assertTrue(status['currentPriorInventoryVerified'])
        self.assertTrue(status['privateTemporaryInspectionVerified'])
        artifacts=status['retainedPrivateTemporaryArtifacts']
        self.assertEqual(len(artifacts),1)
        if expected_bytes is not None:self.assertEqual(next(iter(artifacts.values()))['bytes'],expected_bytes)
        self.assertEqual(self.tree(),self.old)
        self.assertFalse(list(self.target.rglob('.ktk-content-*')))
        return artifacts

    def test_actual_process_death_before_copy_keeps_private_empty_artifact_and_safe_rollback(self):
        artifacts=self.interrupted_private_temporary('crash-before-copy',0)
        restored=self.run_action('rollback')
        self.assertEqual(self.tree(),self.old)
        self.assertEqual(restored['retainedPrivateTemporaryArtifacts'],artifacts)

    def test_partial_private_write_and_actual_process_death_do_not_block_target_rollback(self):
        artifacts=self.interrupted_private_temporary('crash-partial-temp',7)
        restored=self.run_action('rollback')
        self.assertEqual(self.tree(),self.old)
        self.assertEqual(restored['retainedPrivateTemporaryArtifacts'],artifacts)

    def test_actual_process_death_before_rename_can_resume_and_restore_without_public_orphans(self):
        artifacts=self.interrupted_private_temporary('crash-before-rename')
        installed=self.run_action('apply')
        self.assertTrue(installed['currentExpectedInventoryVerified'])
        self.assertEqual(self.tree(),{**self.new,MARKER:ACTIVATION})
        self.assertEqual(installed['retainedPrivateTemporaryArtifacts'],artifacts)
        restored=self.run_action('rollback')
        self.assertEqual(self.tree(),self.old)
        self.assertEqual(restored['retainedPrivateTemporaryArtifacts'],artifacts)

    def test_private_temporary_bytes_are_rechecked_and_unknown_bytes_are_preserved(self):
        self.run_action('prepare')
        error=self.run_action('apply','temporary-change',success=False)
        self.assertIn('private temporary changed',error)
        self.assertEqual(self.tree(),self.old)
        status=self.run_action('inspect')
        self.assertEqual(len(status['retainedPrivateTemporaryArtifacts']),1)
        self.assertEqual(next(iter(status['retainedPrivateTemporaryArtifacts'].values()))['sha256'],sha(b'unrelated private bytes'))
        self.run_action('rollback')
        self.assertEqual(self.tree(),self.old)

    def test_unexpected_private_pending_directory_blocks_before_application_write(self):
        self.run_action('prepare')
        pending=self.private/('a'*32)/'pending';pending.mkdir();(pending/'unknown-directory').mkdir()
        self.run_action('apply',success=False)
        self.assertEqual(self.tree(),self.old)
        status=self.run_action('inspect')
        self.assertFalse(status['privateTemporaryInspectionVerified'])
        self.assertIsNone(status['retainedPrivateTemporaryArtifacts'])

    def test_cross_filesystem_private_temporary_is_refused_without_changing_target(self):
        other=Path('/dev/shm')
        if not other.is_dir() or os.stat(other).st_dev==os.stat(self.root).st_dev:
            self.skipTest('A separate writable filesystem is required; Linux CI provides /dev/shm')
        try:temporary=tempfile.TemporaryDirectory(prefix='ktk-cross-filesystem-',dir=other)
        except OSError:self.skipTest('Separate filesystem is not writable')
        self.addCleanup(temporary.cleanup);self.private=Path(temporary.name);self.save_config()
        self.run_action('prepare')
        error=self.run_action('apply',success=False)
        self.assertIn('share one filesystem',error)
        self.assertEqual(self.tree(),self.old)
        self.run_action('rollback')
        self.assertEqual(self.tree(),self.old)

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

    def test_single_file_steps_resume_without_premature_completion(self):
        result = self.run_action('prepare')
        self.assertEqual(len(result['pendingApplyFiles']), 5)
        for remaining in range(4, -1, -1):
            before = self.tree()
            result = self.run_action('apply', limit=1)
            after = self.tree()
            self.assertEqual(sum(before.get(n) != after.get(n) for n in before.keys() | after.keys()), 1)
            self.assertEqual(len(result['pendingApplyFiles']), remaining)
            self.assertEqual(result['phase'], 'applying' if remaining else 'applied')
            self.assertIs(result['currentExpectedInventoryVerified'], remaining == 0)
            self.assertTrue(result['backupVerified'] and result['protectedStateVerified'])
        self.assertEqual(self.tree(), {**self.new, MARKER: ACTIVATION})
        for remaining in range(4, -1, -1):
            result = self.run_action('rollback', limit=1)
            self.assertEqual(len(result['pendingRollbackFiles']), remaining)
            self.assertEqual(result['phase'], 'rolling-back' if remaining else 'rolled-back')
            self.assertIs(result['currentPriorInventoryVerified'], remaining == 0)
        self.assertEqual(self.tree(), self.old)

    def test_rollback_restores_definitions_before_deleting_introduced_dependencies(self):
        self.run_action('prepare')
        self.run_action('apply', limit=100)
        for _ in range(3):
            result = self.run_action('rollback', limit=1)
            for name in self.new.keys() - self.old.keys():
                self.assertEqual((self.target / name).read_bytes(), self.new[name])
        self.assertEqual((self.target / 'ktk-code-pages.php').read_bytes(), self.old['ktk-code-pages.php'])
        self.assertEqual((self.target / (ASSETS + 'registry.php')).read_bytes(), self.old[ASSETS + 'registry.php'])
        self.assertEqual(len(result['pendingRollbackFiles']), 2)
        self.run_action('rollback', limit=2)
        self.assertEqual(self.tree(), self.old)

    def test_invalid_limits_do_not_change_application_or_journal(self):
        self.run_action('prepare')
        journal = self.private / ('a' * 32) / 'journal.json'
        before = journal.read_bytes()
        for action in ('apply', 'rollback'):
            for limit in (0, -1, 101, True, False, '1', 1.5, [], {}):
                with self.subTest(action=action, limit=limit):
                    self.assertIn('Step limit', self.run_action(action, success=False, limit=limit))
                    self.assertEqual(journal.read_bytes(), before)
                    self.assertEqual(self.tree(), self.old)

    def test_partial_apply_can_rollback_in_bounded_steps(self):
        self.run_action('prepare')
        self.run_action('apply', limit=2)
        self.assertEqual(self.run_action('rollback', limit=1)['phase'], 'rolling-back')
        self.assertEqual(self.run_action('rollback', limit=1)['phase'], 'rolled-back')
        self.assertEqual(self.tree(), self.old)

    def test_source_and_target_changes_between_steps_remain_blocking(self):
        self.run_action('prepare')
        self.run_action('apply', limit=1)
        self.write(self.source, ASSETS + 'runtime.css', b'new unrelated source')
        before = self.tree()
        self.run_action('apply', success=False, limit=1)
        self.assertEqual(self.tree(), before)
        self.write(self.target, 'ktk-code-pages.php', b'unrelated target')
        before = self.tree()
        self.run_action('rollback', success=False, limit=1)
        self.assertEqual(self.tree(), before)

    def test_protected_change_between_steps_never_restores_database(self):
        self.run_action('prepare')
        self.run_action('apply', limit=1)
        self.protected.write_bytes(b'owner changed protected data')
        before = self.tree()
        self.run_action('apply', success=False, limit=1)
        self.run_action('rollback', success=False, limit=1)
        self.assertEqual(self.tree(), before)
        self.assertEqual(self.protected.read_bytes(), b'owner changed protected data')

    def receipt_interruption(self, fault, size=None):
        self.run_action('prepare')
        journal = self.private / ('a' * 32) / 'journal.json'
        before = journal.read_bytes()
        self.run_action('apply', fault, limit=1)
        self.assertEqual(journal.read_bytes(), before)
        result = self.run_action('inspect')
        self.assertTrue(result['currentPriorInventoryVerified'])
        self.assertTrue(result['privateReceiptInspectionVerified'])
        artifacts = result['retainedPrivateReceiptArtifacts']
        self.assertEqual(len(artifacts), 1)
        if size is not None:
            self.assertEqual(next(iter(artifacts.values()))['bytes'], size)
        self.assertEqual(self.run_action('apply', limit=100)['phase'], 'applied')
        self.run_action('rollback', limit=100)
        self.assertEqual(self.tree(), self.old)
        self.assertEqual(self.run_action('inspect')['retainedPrivateReceiptArtifacts'], artifacts)

    def test_process_death_before_private_receipt_write_preserves_committed_journal(self):
        self.receipt_interruption('receipt-crash-empty', 0)

    def test_injected_partial_receipt_and_process_death_preserves_committed_journal(self):
        self.receipt_interruption('receipt-crash-partial', 7)

    def test_process_death_before_receipt_rename_preserves_committed_journal(self):
        self.receipt_interruption('receipt-crash-full')

    def test_receipt_process_death_after_install_retains_intent_for_resume_and_rollback(self):
        self.run_action('prepare')
        self.run_action('apply', 'receipt-crash-after-install', limit=1)
        result = self.run_action('inspect')
        self.assertEqual(len(result['intentFiles']), 1)
        self.assertEqual(len(result['pendingApplyFiles']), 4)
        self.assertEqual(len(result['retainedPrivateReceiptArtifacts']), 1)
        self.assertEqual(self.run_action('apply', limit=100)['phase'], 'applied')
        self.run_action('rollback')
        self.assertEqual(self.tree(), self.old)

    def test_lost_receipt_response_resumes_from_committed_receipt(self):
        self.run_action('prepare')
        self.run_action('apply', 'receipt-lost-response', success=False, limit=1)
        self.assertEqual(self.tree(), self.old)
        self.assertEqual(self.run_action('inspect')['phase'], 'applying')
        self.run_action('apply', limit=100)
        self.run_action('rollback', limit=100)
        self.assertEqual(self.tree(), self.old)

    def test_tampered_receipt_temporary_is_retained_without_application_write(self):
        self.run_action('prepare')
        journal = self.private / ('a' * 32) / 'journal.json'
        before = journal.read_bytes()
        self.run_action('apply', 'receipt-temporary-change', success=False)
        self.assertEqual(journal.read_bytes(), before)
        self.assertEqual(self.tree(), self.old)
        artifacts = self.run_action('inspect')['retainedPrivateReceiptArtifacts']
        self.assertEqual(next(iter(artifacts.values()))['sha256'], sha(b'foreign private receipt'))

    def test_concurrent_committed_receipt_is_never_overwritten(self):
        self.run_action('prepare')
        self.run_action('apply', 'receipt-target-change', success=False)
        self.assertEqual((self.private / ('a' * 32) / 'journal.json').read_bytes(), b'foreign committed receipt')
        self.assertEqual(self.tree(), self.old)

    def test_receipt_directory_file_has_no_fallback(self):
        self.run_action('prepare')
        area = self.private / ('a' * 32) / 'receipts'
        area.rmdir()
        area.write_bytes(b'foreign directory collision')
        self.run_action('apply', success=False)
        self.assertEqual(area.read_bytes(), b'foreign directory collision')
        self.assertFalse(self.run_action('inspect')['privateReceiptInspectionVerified'])
        self.assertEqual(self.tree(), self.old)

    def test_interrupted_preparation_preserves_private_plan_for_manual_inspection(self):
        self.run_action('prepare', 'receipt-lost-response', success=False)
        private = self.private / ('a' * 32)
        before = (private / 'plan.json').read_bytes()
        self.assertFalse((private / 'journal.json').exists())
        self.assertEqual(self.run_action('inspect')['phase'], 'unprepared')
        self.run_action('prepare', success=False)
        self.assertEqual((private / 'plan.json').read_bytes(), before)
        self.assertEqual(self.tree(), self.old)

    def test_lost_response_during_bounded_rollback_resumes_exact_prior(self):
        self.run_action('prepare')
        self.run_action('apply', limit=100)
        self.run_action('rollback', 'lost-response', success=False, limit=1)
        self.assertEqual(self.run_action('inspect')['phase'], 'rolling-back')
        self.assertEqual(self.run_action('rollback', limit=100)['phase'], 'rolled-back')
        self.assertEqual(self.tree(), self.old)

    def test_unsafe_receipt_artifacts_and_symlink_directory_are_preserved(self):
        probe = self.root / 'probe'
        try:
            probe.symlink_to(self.private, target_is_directory=True)
        except OSError as error:
            self.skipTest('OS does not permit fixture symlinks: ' + type(error).__name__)
        probe.unlink()
        self.run_action('prepare')
        area = self.private / ('a' * 32) / 'receipts'
        (area / 'foreign-directory').mkdir()
        self.run_action('apply', success=False)
        self.assertFalse(self.run_action('inspect')['privateReceiptInspectionVerified'])
        (area / 'foreign-directory').rmdir()
        outside = self.root / 'outside-receipts'
        area.rename(outside)
        area.symlink_to(outside, target_is_directory=True)
        self.run_action('apply', success=False)
        self.assertFalse(self.run_action('inspect')['privateReceiptInspectionVerified'])
        self.assertFalse(list(outside.iterdir()))
        self.assertEqual(self.tree(), self.old)

    def test_receipt_symlink_and_swapped_private_root_are_rejected(self):
        probe = self.root / 'probe'
        try:
            probe.symlink_to(self.private, target_is_directory=True)
        except OSError as error:
            self.skipTest('OS does not permit fixture symlinks: ' + type(error).__name__)
        probe.unlink()
        self.run_action('prepare')
        self.run_action('apply', 'receipt-root-swap', success=False)
        self.assertEqual(self.tree(), self.old)
        moved = self.private / 'moved'
        self.assertEqual(json.loads((moved / 'journal.json').read_bytes())['phase'], 'prepared')
        self.assertEqual(len(list((moved / 'receipts').iterdir())), 1)

    @unittest.skipIf(os.name == 'nt', 'POSIX private permissions')
    def test_private_receipts_have_restricted_posix_modes(self):
        self.run_action('prepare')
        private = self.private / ('a' * 32)
        self.assertEqual(private.stat().st_mode & 0o777, 0o700)
        self.assertEqual((private / 'receipts').stat().st_mode & 0o777, 0o700)
        for name in ('plan.json', 'journal.json'):
            self.assertEqual((private / name).stat().st_mode & 0o777, 0o600)


if __name__ == '__main__':
    unittest.main()
