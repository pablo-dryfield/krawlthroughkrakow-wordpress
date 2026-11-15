import copy
from datetime import datetime, timedelta, timezone
import ftplib
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('ktk_update_plan_test', ROOT / 'tools/plan-code-pages-update.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FakeFTP:
    def __init__(self, files, directories):
        self.files, self.directories, self.calls = files, directories, []

    def retrbinary(self, command, callback):
        self.calls.append(command)
        name = command.removeprefix('RETR ')
        if name not in self.files:
            raise ftplib.error_perm('550 Missing fixture')
        callback(self.files[name])

    def mlsd(self, directory):
        self.calls.append('MLSD ' + directory)
        return self.directories[directory]

    def close(self):
        self.calls.append('CLOSE')


class UpdatePlanTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 15, 10, 0, tzinfo=timezone.utc)
        self.routes = {'/fixture-' + str(i) + '/' for i in range(116)}
        self.expected = {name: module.sha(name.encode()) for name in (module.RENDERER, module.ASSETS + '/registry.php', module.ASSETS + '/runtime.css', module.ASSETS + '/runtime.js')}
        state = {'posts': {'1': {'content_sha256': 'retained'}}, 'options_sha256': 'settings', 'ecwid_page_sha256': 'ecwid'}
        self.staging = {'mode': 'publish-staging-only', 'phase': 'complete', 'url': 'https://krawlthroughkrakow.com/staging/about-us/how-to-join/',
                        'file_count': len(self.expected), 'local_checksums': self.expected.copy(), 'remote_checksums': self.expected.copy(),
                        'before': dict(state, owned_checksums={'old': 'old'}, origin_cache_cleared=False),
                        'after': dict(state, owned_checksums=self.expected.copy(), origin_cache_cleared=True),
                        'finished_at': (self.now - timedelta(hours=2)).isoformat(), 'smoke_checks': {'http_200': True}}
        self.staging.update({k: True for k in ('wordpress_state_unchanged', 'homepage_unchanged', 'storefront_unchanged', 'all_remote_owned_checksums_match', 'helper_removed')})
        self.phases = {}
        for i, phase in enumerate(('origin', 'normal', 'repeat')):
            rows = [{'route': r, 'device': d, 'status': 200, 'cfCacheStatus': ('DYNAMIC', 'MISS', 'HIT')[i]} for r in self.routes for d in module.DEVICES]
            self.phases[phase] = {'environment': 'staging', 'checkedAt': (self.now - timedelta(minutes=90 - i * 20)).isoformat(), 'cacheBusted': phase == 'origin',
                                  'retries': [], 'responses': rows, 'checks': [{'passed': True} for _ in rows],
                                  'summary': {'passed': len(rows), 'total': len(rows), 'routes': 116, 'assets': 119}}

    def validate(self):
        return module.validate_release(self.expected, self.routes, self.staging, self.phases, self.now)

    def test_complete_three_phase_evidence_accepts_mixed_normal_cache(self):
        self.phases['normal']['responses'][0]['cfCacheStatus'] = 'HIT'
        self.assertEqual(self.validate()['warmedHITs'], 348)

    def test_local_remote_or_after_hash_substitution_rejected(self):
        for key in ('local_checksums', 'remote_checksums', 'after'):
            with self.subTest(key=key):
                original = copy.deepcopy(self.staging)
                target = self.staging[key]['owned_checksums'] if key == 'after' else self.staging[key]
                target[module.RENDERER] = 'f' * 64
                with self.assertRaises(ValueError): self.validate()
                self.staging = original

    def test_each_missing_protected_flag_and_changed_state_rejected(self):
        for key in ('wordpress_state_unchanged', 'homepage_unchanged', 'storefront_unchanged', 'all_remote_owned_checksums_match', 'helper_removed'):
            with self.subTest(key=key):
                self.staging[key] = False
                with self.assertRaises(ValueError): self.validate()
                self.staging[key] = True
        self.staging['after']['options_sha256'] = 'changed'
        with self.assertRaises(ValueError): self.validate()

    def test_missing_failed_or_truncated_release_phase_rejected(self):
        for phase in ('origin', 'normal', 'repeat'):
            for mutation in ('missing', 'failed', 'truncated', 'wrong-environment', 'retry', 'wrong-cache-mode'):
                with self.subTest(phase=phase, mutation=mutation):
                    original = copy.deepcopy(self.phases)
                    if mutation == 'missing': del self.phases[phase]
                    elif mutation == 'failed': self.phases[phase]['checks'][-1]['passed'] = False
                    elif mutation == 'truncated': self.phases[phase]['checks'] = [{'passed': True}]
                    elif mutation == 'wrong-environment': self.phases[phase]['environment'] = 'production'
                    elif mutation == 'retry': self.phases[phase]['retries'] = [{'interrupted': True}]
                    else: self.phases[phase]['cacheBusted'] = phase != 'origin'
                    with self.assertRaises(ValueError): self.validate()
                    self.phases = original

    def test_duplicate_missing_or_failed_device_response_rejected(self):
        for mutation in ('duplicate', 'missing', 'status'):
            with self.subTest(mutation=mutation):
                original = copy.deepcopy(self.phases)
                rows = self.phases['repeat']['responses']
                if mutation == 'duplicate': rows[-1] = rows[0].copy()
                elif mutation == 'missing': rows.pop()
                else: rows[0]['status'] = 503
                with self.assertRaises(ValueError): self.validate()
                self.phases = original

    def test_incomplete_warming_or_asset_drift_rejected(self):
        self.phases['repeat']['responses'][0]['cfCacheStatus'] = 'MISS'
        with self.assertRaises(ValueError): self.validate()
        self.phases['repeat']['responses'][0]['cfCacheStatus'] = 'HIT'
        self.phases['repeat']['summary']['assets'] = 118
        with self.assertRaises(ValueError): self.validate()

    def test_stale_naive_future_or_out_of_order_times_rejected(self):
        original = self.phases['repeat']['checkedAt']
        for t in (self.now - timedelta(days=2), self.now + timedelta(minutes=2), self.now.replace(tzinfo=None), self.now - timedelta(hours=3)):
            with self.subTest(t=t):
                self.phases['repeat']['checkedAt'] = t.isoformat()
                with self.assertRaises(ValueError): self.validate()
        self.phases['repeat']['checkedAt'] = original

    def test_activation_stores_traversal_and_ambiguous_names_rejected(self):
        for name in (module.ACTIVATION, '../ktk-code-pages.php', module.ASSETS + '/../ktk-homepage-shortcode.php', module.ASSETS + '//runtime.css', module.ASSETS + '\\runtime.css', module.ASSETS + '/%2e%2e/file', 'ktk-storefront/runtime.js'):
            with self.subTest(name=name):
                with self.assertRaises(ValueError): module.payload_name(name)
        self.routes.remove('/fixture-1/')
        self.routes.add('/store2/product/')
        with self.assertRaises(ValueError): self.validate()

    def test_read_only_ftp_exposes_no_mutation_or_cross_scope_read(self):
        raw = FakeFTP({}, {})
        ftp = module.ReadOnlyOwnedFTP(raw, self.expected)
        for method in ('storbinary', 'rename', 'delete', 'rmd', 'mkd', 'cwd', 'sendcmd', 'voidcmd'):
            with self.subTest(method=method):
                with self.assertRaises(PermissionError): getattr(ftp, method)
        for command in ('STOR ' + module.REMOTE + '/' + module.RENDERER, 'RETR /public_html/wp-config.php', 'RETR /public_html/staging/wp-content/mu-plugins/ktk-code-pages.php', 'RETR ' + module.REMOTE + '/' + module.ASSETS + '/unreviewed.php'):
            with self.subTest(command=command):
                with self.assertRaises(PermissionError): ftp.retrbinary(command, lambda _: None)
        with self.assertRaises(PermissionError): ftp.mlsd('/public_html/wp-content/plugins')
        self.assertEqual(raw.calls, [])

    def test_symlink_and_ambiguous_directory_entries_reject_before_retrieval(self):
        directory = module.REMOTE + '/' + module.ASSETS
        for entry in [('link', {'type': 'OS.unix=slink'}), ('link', {'type': 'file', 'unix.slink': '/elsewhere'}), ('../private', {'type': 'dir'}), ('nested/file', {'type': 'file'})]:
            with self.subTest(entry=entry):
                raw = FakeFTP({}, {directory: [entry]})
                ftp = module.ReadOnlyOwnedFTP(raw, self.expected)
                with self.assertRaises((ValueError, PermissionError)): module.inspect_owned(ftp)
                self.assertFalse(any(c.startswith('RETR ') for c in raw.calls))

    def test_exact_owned_inventory_and_change_set_retain_activation(self):
        activation = b'unchanged activation fixture'
        payload = {module.RENDERER: b'old renderer', module.ASSETS + '/registry.php': b'old registry', module.ASSETS + '/runtime.css': b'old css', module.ACTIVATION: activation}
        directory = module.REMOTE + '/' + module.ASSETS
        raw = FakeFTP({module.REMOTE + '/' + n: b for n, b in payload.items()}, {directory: [(n.split('/')[-1], {'type': 'file'}) for n in payload if n.startswith(module.ASSETS + '/')]})
        existing = module.inspect_owned(module.ReadOnlyOwnedFTP(raw, self.expected))
        plan = module.change_plan(self.expected, existing, module.sha(activation))
        self.assertEqual(plan['newFiles'], [module.ASSETS + '/runtime.js'])
        self.assertNotIn(module.ACTIVATION, plan['changedFiles'])
        self.assertIn(module.ACTIVATION, plan['requiredPriorFileBackups'])
        self.assertEqual((plan['activationWrites'], plan['deletions'], plan['rollbackCreated']), (0, 0, False))
        self.assertTrue(all(c.startswith(('RETR ', 'MLSD ')) for c in raw.calls))

    def test_missing_or_changed_activation_and_unknown_owned_file_fail_closed(self):
        existing = {**self.expected, module.ACTIVATION: module.sha(b'activation')}
        for mutation in ('missing', 'changed', 'unexpected'):
            with self.subTest(mutation=mutation):
                rows = existing.copy()
                if mutation == 'missing': rows.pop(module.ACTIVATION)
                elif mutation == 'changed': rows[module.ACTIVATION] = 'f' * 64
                else: rows[module.ASSETS + '/unknown.php'] = 'f' * 64
                with self.assertRaises(ValueError): module.change_plan(self.expected, rows, module.sha(b'activation'))

    def test_listed_but_unreadable_file_cannot_be_reported_as_absent(self):
        directory = module.REMOTE + '/' + module.ASSETS
        raw = FakeFTP({}, {directory: [('registry.php', {'type': 'file'})]})
        with self.assertRaises(PermissionError): module.inspect_owned(module.ReadOnlyOwnedFTP(raw, self.expected))

    def test_duplicate_listing_rejects_before_any_read(self):
        directory = module.REMOTE + '/' + module.ASSETS
        entry = ('registry.php', {'type': 'file'})
        raw = FakeFTP({}, {directory: [entry, entry]})
        with self.assertRaises(PermissionError): module.inspect_owned(module.ReadOnlyOwnedFTP(raw, self.expected))
        self.assertFalse(any(c.startswith('RETR ') for c in raw.calls))

    def test_bounded_transport_retry_never_duplicates_partial_bytes_or_progress(self):
        transport_module = module.load_module('ktk_update_read_retry_test', 'publish-homepage-shortcode.py')
        directory = module.REMOTE + '/' + module.ASSETS
        payload = {module.RENDERER: b'renderer', module.ASSETS + '/registry.php': b'whole file', module.ACTIVATION: b'activation'}
        files = {module.REMOTE + '/' + n: b for n, b in payload.items()}
        listings = {directory: [('registry.php', {'type': 'file'})]}
        class Interrupted(FakeFTP):
            def retrbinary(self, command, callback):
                self.calls.append(command)
                callback(b'partial bytes that must not reach the consumer')
                raise ConnectionResetError('isolated fixture interruption')
        first, second = Interrupted(files, listings), FakeFTP(files, listings)
        connections = iter([first, second])
        transport = transport_module.StagingFTP(factory=lambda: next(connections))
        progress = []
        with mock.patch.object(transport_module.time, 'sleep'):
            result = module.inspect_owned(module.ReadOnlyOwnedFTP(transport, self.expected), lambda name, size: progress.append((name, size)))
        self.assertEqual(result, {n: module.sha(b) for n, b in payload.items()})
        self.assertEqual(len(progress), len(payload))
        self.assertEqual(sum(size for _, size in progress), sum(map(len, payload.values())))
        self.assertIn('CLOSE', first.calls)

    def test_default_is_offline_and_publish_argument_does_not_exist(self):
        args = sum((['--' + n, 'fixture'] for n in ('staging-report', 'origin-report', 'normal-report', 'repeat-report', 'application-commit', 'report')), [])
        self.assertFalse(module.parser().parse_args(args).inspect_production)
        with mock.patch('sys.stderr'), self.assertRaises(SystemExit): module.parser().parse_args(args + ['--publish'])

    def test_workspace_escape_and_invalid_commit_reject_before_git(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            with self.assertRaises(ValueError): module.inside_workspace('../escape.json', root)
        with mock.patch.object(module.subprocess, 'check_output') as call:
            with self.assertRaises(ValueError): module.validate_source_commit(self.expected, '--untrusted-revision')
            call.assert_not_called()

    def test_immutable_commit_binding_rejects_changed_local_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            subprocess.run(['git', 'init', '--quiet', str(root)], check=True)
            file = root / 'staging/wp-content/mu-plugins' / module.RENDERER
            file.parent.mkdir(parents=True)
            file.write_bytes(b'verified fixture')
            subprocess.run(['git', 'add', '.'], cwd=root, check=True)
            subprocess.run(['git', '-c', 'user.name=KTK Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'fixture'], cwd=root, check=True)
            commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
            expected = {module.RENDERER: module.sha(file.read_bytes())}
            module.validate_source_commit(expected, commit, root)
            file.write_bytes(b'changed fixture')
            with self.assertRaises(ValueError): module.validate_source_commit(expected, commit, root)


if __name__ == '__main__':
    unittest.main()
