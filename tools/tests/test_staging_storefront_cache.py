import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location('native_staging_cache', Path(__file__).parents[1] / 'staging-storefront-cache.py')
cache = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cache)

PHP = r'''
$mode = $argv[2];
define('ABSPATH', $mode === 'wrong-root' ? dirname($argv[1], 4) . '/production/' : dirname($argv[1], 3) . '/');
$GLOBALS['hooks'] = array(); $GLOBALS['calls'] = array();
function add_action($name, $fn, $priority = 10) { $GLOBALS['hooks'][$name][] = $fn; }
function nocache_headers() {}
function home_url($path) { global $mode; return $mode === 'wrong-home' ? 'https://krawlthroughkrakow.com/' : 'https://krawlthroughkrakow.com/staging/'; }
function site_url($path) { global $mode; return $mode === 'wrong-site' ? 'https://krawlthroughkrakow.com/' : 'https://krawlthroughkrakow.com/staging/'; }
function wp_send_json($data, $status = 200) { echo json_encode(array('status'=>$status, 'data'=>$data, 'calls'=>$GLOBALS['calls'])); exit; }
NATIVE_STUB
$_SERVER['REQUEST_METHOD'] = $mode === 'wrong-method' ? 'POST' : 'GET';
$_SERVER['REQUEST_URI'] = $mode === 'wrong-path' ? '/' : '/staging/?_ktk_storefront_cache=1';
$_SERVER['HTTP_X_KTK_CACHE_TOKEN'] = $mode === 'wrong-token' ? str_repeat('b', 64) : str_repeat('a', 64);
$_GET = $mode === 'ordinary' ? array() : array('_ktk_storefront_cache'=>'1');
require $argv[1];
foreach ($GLOBALS['hooks']['wp_loaded'] as $fn) { $fn(); }
echo json_encode(array('ordinary'=>true, 'calls'=>$GLOBALS['calls']));
'''


class NativeCachePHPTests(unittest.TestCase):
    def invoke(self, mode):
        prefix = 'ktk-native-cache-'
        with tempfile.TemporaryDirectory(prefix=prefix) as folder:
            root = Path(folder).resolve()
            self.assertTrue(root.is_relative_to(Path(tempfile.gettempdir()).resolve()))
            self.assertTrue(root.name.startswith(prefix))
            (root / 'production').mkdir()
            file = root / 'staging/wp-content/mu-plugins/cache.php'
            file.parent.mkdir(parents=True)
            now = int(time.time())
            issued, expires = (now - 601, now - 1) if mode == 'expired' else (now + 120, now + 720) if mode == 'future' else (now, now + 600)
            file.write_bytes(cache.helper_source('a' * 64, issued, expires))
            stub = '' if mode == 'missing-native' else "function rocket_clean_files($urls) { $GLOBALS['calls'][] = $urls; if ($GLOBALS['mode'] === 'native-failure') { throw new RuntimeException('fixture'); } }"
            result = subprocess.run(['php', '-r', PHP.replace('NATIVE_STUB', stub), str(file), mode], capture_output=True, check=True, timeout=10)
            self.assertEqual(result.stderr, b'')
            return json.loads(result.stdout)

    def test_exact_staging_call_uses_only_one_recursive_storefront_url(self):
        result = self.invoke('valid')
        self.assertEqual(result['status'], 200)
        self.assertEqual(result['calls'], [[cache.URL]])
        self.assertEqual(result['data']['cache_targets'], [cache.TARGET])

    def test_normal_website_requests_do_nothing(self):
        self.assertEqual(self.invoke('ordinary'), {'ordinary': True, 'calls': []})

    def test_auth_method_and_both_site_identity_guards_prevent_native_call(self):
        for mode in ['wrong-token', 'wrong-method', 'wrong-home', 'wrong-site', 'wrong-root', 'wrong-path']:
            with self.subTest(mode=mode):
                result = self.invoke(mode)
                self.assertEqual(result['status'], 403)
                self.assertEqual(result['calls'], [])

    def test_expired_and_future_authority_do_not_call_native_api(self):
        for mode in ['expired', 'future']:
            with self.subTest(mode=mode):
                result = self.invoke(mode)
                self.assertEqual(result['status'], 410)
                self.assertEqual(result['calls'], [])

    def test_missing_native_function_fails_without_global_or_ftp_fallback(self):
        result = self.invoke('missing-native')
        self.assertEqual(result['status'], 503)
        self.assertEqual(result['calls'], [])

    def test_native_exception_is_not_reported_as_completed(self):
        result = self.invoke('native-failure')
        self.assertEqual(result['status'], 500)
        self.assertNotIn('native_call_completed', result['data'])

    def test_factory_rejects_bad_tokens_or_lifetime_extension(self):
        for token, issued, expires in [('bad', 1, 2), ('a'*64, 1, 602), ('a'*64, 1, 1), ('a'*64, True, 2)]:
            with self.subTest(values=(token, issued, expires)), self.assertRaises(ValueError):
                cache.helper_source(token, issued, expires)


class NativeCacheOperatorTests(unittest.TestCase):
    def response(self, data):
        result = Mock(status=200)
        result.read.return_value = json.dumps(data).encode()
        wrapper = Mock()
        wrapper.__enter__ = Mock(return_value=result)
        wrapper.__exit__ = Mock(return_value=False)
        return wrapper

    def expected(self):
        return {'staging': True, 'method': 'rocket_clean_files', 'native_call_completed': True, 'urls': [cache.URL], 'cache_targets': [cache.TARGET]}

    def test_one_request_no_auth_query_and_verified_cleanup(self):
        ftp, upload, opener = Mock(), Mock(), Mock()
        ftp.mlsd.return_value = []
        opener.open.return_value = self.response(self.expected())
        with patch.object(cache.urllib.request, 'build_opener', return_value=opener):
            result = cache.purge(ftp, upload)
        request = opener.open.call_args.args[0]
        self.assertEqual(opener.open.call_count, 1)
        self.assertEqual(request.get_method(), 'GET')
        self.assertTrue(request.full_url.startswith(cache.ORIGIN + '?'))
        self.assertNotIn(request.get_header('X-ktk-cache-token'), request.full_url)
        remote = upload.call_args.args[1]
        self.assertRegex(remote, r'^/public_html/staging/wp-content/mu-plugins/ktk-storefront-origin-cache-[a-f0-9]{16}\.php$')
        ftp.delete.assert_called_once_with(remote)
        ftp.mlsd.assert_called_once_with(cache.MU)
        self.assertTrue(result['helper_removed'])
        self.assertEqual(result['request_count'], 1)

    def test_unknown_response_scope_fails_and_removes_exact_helper(self):
        ftp, upload, opener = Mock(), Mock(), Mock()
        ftp.mlsd.return_value = []
        data = self.expected(); data['urls'] = ['https://krawlthroughkrakow.com/']
        opener.open.return_value = self.response(data)
        with patch.object(cache.urllib.request, 'build_opener', return_value=opener), self.assertRaises(RuntimeError):
            cache.purge(ftp, upload)
        ftp.delete.assert_called_once_with(upload.call_args.args[1])
        self.assertEqual(opener.open.call_count, 1)

    def test_partial_upload_failure_still_cleans_only_its_helper(self):
        ftp, upload = Mock(), Mock(side_effect=RuntimeError('interrupted fixture upload'))
        ftp.mlsd.return_value = []
        with self.assertRaisesRegex(RuntimeError, 'interrupted fixture upload'):
            cache.purge(ftp, upload)
        ftp.delete.assert_called_once_with(upload.call_args.args[1])

    def test_redirects_never_forward_the_private_header(self):
        with self.assertRaises(RuntimeError):
            cache.NoRedirect().redirect_request(None, None, 301, '', {}, 'https://krawlthroughkrakow.com/')


if __name__ == '__main__':
    unittest.main()
