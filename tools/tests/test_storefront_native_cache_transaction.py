import contextlib
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
from datetime import datetime, timezone

spec = importlib.util.spec_from_file_location('native_cache_transaction', Path(__file__).parents[1] / 'publish-storefront-staging.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class NativeCacheTransactionTests(unittest.TestCase):
    def exercise(self, cache_fails):
        # Exercise real publisher ordering/state comparisons/rollback with an
        # in-memory remote filesystem. No connector, helper or HTTP request.
        candidate = publisher.payload()
        original = {name: (data + b'-old' if name in ['assets/storefront.js', 'assets/storefront.css'] else data)
                    for name, data in candidate.items()}
        remote = dict(original)
        original_hashes = {publisher.PREFIX + name: hashlib.sha256(data).hexdigest() for name, data in original.items()}
        expected = {publisher.PREFIX + name: hashlib.sha256(data).hexdigest() for name, data in candidate.items()}
        ftp = Mock()

        def snapshot(_):
            return {'owned': {publisher.PREFIX + name: hashlib.sha256(data).hexdigest() for name, data in remote.items()},
                    'protected': {'outside': 'unchanged'}, 'production_checksums': {'production': 'unchanged'},
                    'wordpress_state_sha256': 'unchanged', 'blog_public': 'unchanged',
                    'public_content_version': publisher.VERSION, 'public_method_available': True}

        def upload(connection, target, body):
            self.assertIs(connection, ftp)
            self.assertTrue(target.startswith(publisher.REMOTE + '/'))
            remote[target[len(publisher.REMOTE) + 1:]] = body

        def native(connection, atomic_upload):
            self.assertEqual(snapshot(connection)['owned'], expected)
            self.assertIs(atomic_upload, publisher.base.atomic_upload)
            if cache_fails:
                raise RuntimeError('native fixture refused')
            return {'cache_targets': [publisher.origin_cache.TARGET], 'helper_removed': True, 'request_count': 1}

        prefix = 'ktk-native-transaction-'
        with tempfile.TemporaryDirectory(prefix=prefix) as folder, contextlib.ExitStack() as stack:
            root = Path(folder).resolve()
            self.assertTrue(root.is_relative_to(Path(tempfile.gettempdir()).resolve()))
            self.assertTrue(root.name.startswith(prefix))
            qa = root / 'qa.json'
            qa.write_text(json.dumps({'checkedAt': datetime.now(timezone.utc).isoformat(), 'errors': [], 'realMutations': 0,
                                      'summary': {'passed': 812, 'total': 812},
                                      'payloadChecksums': {name: hashlib.sha256(data).hexdigest() for name, data in candidate.items()}}))
            backup = root / 'verified-backup.zip'; backup.write_bytes(b'backup function covered by separate archive contracts')
            output = root / 'result.json'
            mocks = [
                patch.object(publisher, 'ROOT', root),
                patch.object(publisher.common, 'StagingFTP', return_value=ftp),
                patch.object(publisher, 'snapshot', side_effect=snapshot),
                patch.object(publisher, 'baseline_hashes', return_value=original_hashes),
                patch.object(publisher.common.store2, 'read_tree', side_effect=lambda *args: dict(remote)),
                patch.object(publisher.common, 'retrieve_file', side_effect=lambda _, target: remote[target[len(publisher.REMOTE) + 1:]]),
                patch.object(publisher, 'backup', return_value=backup),
                patch.object(publisher, 'prepare_image_directories', return_value=[]),
                patch.object(publisher.base, 'atomic_upload', side_effect=upload),
                patch.object(publisher.origin_cache, 'purge', side_effect=native),
                patch.object(publisher.common.store2, 'clear_store2_cache'),
                patch.object(sys, 'argv', ['publisher', '--publish', '--qa-report', str(qa), '--report', str(output)]),
            ]
            entered = [stack.enter_context(mock) for mock in mocks]
            if cache_fails:
                with self.assertRaisesRegex(RuntimeError, 'native fixture refused'):
                    publisher.main()
            else:
                publisher.main()
            entered[-2].assert_not_called()  # Legacy FTP cache remover never runs.
            report = json.loads(output.read_bytes())
            ftp.close.assert_called_once()
            if cache_fails:
                self.assertEqual(report['phase'], 'rolled-back')
                self.assertTrue(report['rollbackOwnedVerified'])
                self.assertEqual(remote, original)
                self.assertNotIn('protectedUnchanged', report)
            else:
                self.assertEqual(report['phase'], 'complete')
                self.assertEqual(remote, candidate)
                self.assertTrue(report['protectedUnchanged'])
                self.assertTrue(report['productionFilesUnchanged'])
                self.assertEqual(report['cachePathsCleared'], [publisher.origin_cache.TARGET])
                self.assertTrue(report['originCachePurge']['helper_removed'])

    def test_success_preserves_transaction_guards_and_records_native_scope(self):
        self.exercise(False)

    def test_native_cache_failure_rolls_back_every_original_runtime_file(self):
        self.exercise(True)


if __name__ == '__main__':
    unittest.main()
