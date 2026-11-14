"""Offline safeguards; no network, real forms or credentials."""
import copy
import importlib.util
import json
import subprocess
import tempfile
import unittest
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('endpoint_hotfix_test', ROOT / 'tools/publish-form-endpoint-hotfix.py')
hotfix = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hotfix)


class EndpointHotfix(unittest.TestCase):
    def setUp(self):
        self.original = b'unchanged before\n' + hotfix.OLD + b",body:new FormData(form)});\nunchanged after"
        self.patched = self.original.replace(hotfix.OLD, hotfix.NEW)
        self.state = {key: key for key in ('protected', 'additional_protected', 'wordpress_state_sha256',
                                         'post_meta_sha256', 'production_enabled', 'home_url',
                                         'blog_public', 'project_id', 'policy_enabled')}
        self.before = {**self.state, 'owned': {hotfix.TARGET: hotfix.sha(self.original)}}
        self.after = {**self.state, 'owned': {hotfix.TARGET: hotfix.sha(self.patched)}, 'origin_cache_cleared': True}

    def test_pinned_actual_production_baseline(self):
        self.assertEqual(hotfix.OLD_SHA, '38cdaa565d7fabc7f58e05cd8697dd79996c9c755d0beca9fda9e2503b2fc9e3')
        with self.assertRaises(ValueError):
            hotfix.candidate(self.original)

    def test_exact_reversible_expression_only(self):
        with patch.object(hotfix, 'OLD_SHA', hotfix.sha(self.original)):
            actual = hotfix.candidate(self.original)
            self.assertEqual(actual, self.patched)
            self.assertEqual(actual.replace(hotfix.NEW, hotfix.OLD), self.original)

    def test_duplicate_missing_already_patched_and_drift_fail(self):
        for value in (self.original + hotfix.OLD, b'no endpoint', self.patched, self.original + b'changed'):
            with self.subTest(value=value[:20]), patch.object(hotfix, 'OLD_SHA', hotfix.sha(self.original)):
                with self.assertRaises(ValueError):
                    hotfix.candidate(value)

    def test_complete_scoped_routes_exclude_home_stores_and_staging(self):
        routes = hotfix.content_routes()
        self.assertEqual(len(routes), 116)
        self.assertNotIn('/', routes)
        self.assertFalse(any(route.startswith(('/staging/', '/store', '/wp-')) for route in routes))

    def test_every_protected_dimension_matters(self):
        self.assertTrue(hotfix.same_protected(self.before, self.after))
        for key in self.state:
            changed = {**self.after, key: 'changed'}
            self.assertFalse(hotfix.same_protected(self.before, changed), key)

    def test_success_writes_only_target_and_requires_final_snapshot(self):
        report = {}
        with patch.object(hotfix.base.common, 'retrieve_file', return_value=self.original), \
             patch.object(hotfix.base, 'atomic_upload') as upload, \
             patch.object(hotfix, 'snapshot', return_value=self.after):
            hotfix.publish(object(), self.before, self.original, self.patched, report)
        self.assertEqual(report['phase'], 'complete')
        self.assertEqual(upload.call_count, 1)
        self.assertEqual(upload.call_args.args[1:], (hotfix.REMOTE + hotfix.TARGET, self.patched))

    def test_mismatch_rolls_back_only_owned_js_not_database(self):
        report = {}
        failed = {**self.after, 'post_meta_sha256': 'concurrent change'}
        with patch.object(hotfix.base.common, 'retrieve_file', side_effect=[self.original, self.patched]), \
             patch.object(hotfix.base, 'atomic_upload') as upload, \
             patch.object(hotfix, 'snapshot', side_effect=[failed, self.before]):
            with self.assertRaises(RuntimeError):
                hotfix.publish(object(), self.before, self.original, self.patched, report)
        self.assertEqual(report['phase'], 'rolled-back')
        self.assertEqual([call.args[1:] for call in upload.call_args_list], [
            (hotfix.REMOTE + hotfix.TARGET, self.patched), (hotfix.REMOTE + hotfix.TARGET, self.original)])

    def test_concurrent_target_is_never_overwritten(self):
        report = {}
        with patch.object(hotfix.base.common, 'retrieve_file', return_value=b'someone else changed it'), \
             patch.object(hotfix.base, 'atomic_upload') as upload:
            with self.assertRaises(RuntimeError):
                hotfix.publish(object(), self.before, self.original, self.patched, report)
        upload.assert_not_called()
        self.assertEqual(report['phase'], 'rollback-needs-review')

    def test_failed_purge_requires_rollback(self):
        report = {}
        with patch.object(hotfix.base.common, 'retrieve_file', side_effect=[self.original, self.patched]), \
             patch.object(hotfix.base, 'atomic_upload'), \
             patch.object(hotfix, 'snapshot', side_effect=[{**self.after, 'origin_cache_cleared': False}, self.before]):
            with self.assertRaises(RuntimeError):
                hotfix.publish(object(), self.before, self.original, self.patched, report)
        self.assertTrue(report['rollback_verified'])

    def test_browser_evidence_binding_and_archive(self):
        (ROOT / 'deploy-backups').mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT / 'deploy-backups') as folder:
            file = Path(folder) / 'fixture.zip'
            with zipfile.ZipFile(file, 'w') as archive:
                archive.writestr('original/runtime.js', self.original)
                archive.writestr('candidate/runtime.js', self.patched)
            prepared = {'phase': 'prepared', 'original_sha256': hotfix.sha(self.original),
                        'candidate_sha256': hotfix.sha(self.patched), 'backup': file.relative_to(ROOT).as_posix(),
                        'backup_sha256': hotfix.sha(file.read_bytes())}
            evidence = {'finishedAt': datetime.now(timezone.utc).isoformat(), 'candidateSha256': hotfix.sha(self.patched),
                        'baselineSha256': hotfix.sha(self.original), 'phase': 'candidate', 'base': hotfix.URL,
                        'passed': 250, 'total': 250, 'errors': [], 'unexpectedWrites': [], 'nativeForms': 5,
                        'cf7Forms': 2, 'widths': [390, 1440], 'allPostsIntercepted': True}
            evidence.update(harnessSha256=hotfix.sha((ROOT / 'tools/test-production-form-hotfix.mjs').read_bytes()),
                            checks=[{'pass': True}] * 250, payloads=[{'pass': True}] * 118, wrongEndpoints=[],
                            scripts=[{'key': str(key), 'width': width, 'sha256': hotfix.sha(self.patched)} for key in range(7) for width in (390, 1440)])
            with patch.object(hotfix, 'OLD_SHA', hotfix.sha(self.original)):
                self.assertEqual(hotfix.verified_candidate(prepared, evidence, self.original), self.patched)
                changes = ({'candidateSha256': 'bad'}, {'baselineSha256': 'bad'}, {'phase': 'live'},
                           {'passed': 249}, {'total': 199, 'passed': 199}, {'base': 'https://example.test/'},
                           {'errors': ['failure']}, {'unexpectedWrites': ['wrong endpoint']}, {'nativeForms': 4},
                           {'cf7Forms': 1}, {'widths': [1440]}, {'allPostsIntercepted': False},
                           {'harnessSha256': 'changed'}, {'checks': []}, {'payloads': []}, {'scripts': []},
                           {'wrongEndpoints': ['incorrect']},
                           {'finishedAt': (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()})
                for change in changes:
                    with self.subTest(change=change), self.assertRaises(ValueError):
                        hotfix.verified_candidate(prepared, {**evidence, **change}, self.original)
                with self.assertRaises(ValueError):
                    hotfix.verified_candidate({**prepared, 'backup_sha256': 'wrong'}, evidence, self.original)

    def test_helper_never_uses_domain_purge_or_activation_write(self):
        source = Path(hotfix.__file__).read_text()
        self.assertIn("base.helper_source('production', token, False", source)
        self.assertIn('rocket_clean_files(array_map', source)
        self.assertIn("source = source.replace(disabled_domain_purge, b'', 1)", source)
        self.assertNotIn('disable_activation(', source)
        self.assertIn('base.remove_file(ftp, path)', source)
        self.assertIn('post_meta_sha256', source)

    def test_generated_php_lints_and_expiring_helper_cleanup_runs(self):
        sources = []
        def capture(_ftp, _path, value):
            sources.append(value)
            raise RuntimeError('Offline stop before network')
        with patch.object(hotfix.base, 'atomic_upload', side_effect=capture), \
             patch.object(hotfix.base, 'remove_file') as remove:
            with self.assertRaisesRegex(RuntimeError, 'Offline stop'):
                hotfix.snapshot(object(), purge=True)
        self.assertEqual(remove.call_count, 1)
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'generated.php'
            file.write_bytes(sources[0])
            result = subprocess.run(['php', '-l', str(file)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn(b"home_url('/') !== 'https://krawlthroughkrakow.com/'", sources[0])
        self.assertIn(b"hash_equals('", sources[0])
        self.assertIn(b'rocket_clean_files(array_map', sources[0])
        self.assertNotIn(b'rocket_clean_domain();', sources[0])


if __name__ == '__main__':
    unittest.main()
