import importlib.util
import unittest
import copy
import json
import tempfile
import types
import sys
from pathlib import Path
from unittest.mock import patch

FILE = Path(__file__).resolve().parents[1] / 'publish-code-pages.py'
SPEC = importlib.util.spec_from_file_location('pages_publisher', FILE)
publisher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publisher)


class PublisherTests(unittest.TestCase):
    def test_new_image_is_verified_before_live_content_can_reference_it(self):
        assets = publisher.ASSETS
        image = assets + '/media/z-photo.avif'
        body = assets + '/content/a-article.html'
        registry = assets + '/registry.php'
        shell = assets + '/shells/z-shell.html'
        css = assets + '/styles/z-style.css'
        page = assets + '/pages/a-article.php'
        payload = {publisher.RENDERER: b'new renderer', body: b'new body', image: b'new image', registry: b'new registry', shell: b'shell', css: b'css', page: b'new page definition'}
        ordered = sorted(payload, key=publisher.publication_order)
        remote = {publisher.remote_path(body): b'old body', publisher.remote_path(registry): b'old registry', publisher.remote_path(publisher.RENDERER): b'old renderer'}
        writes = []
        class FTP:
            closed = False
            def storbinary(self, command, stream):
                name = command.removeprefix('STOR ')
                writes.append(name)
                remote[name] = b'corrupted image' if name == publisher.remote_path(image) else stream.read()
            def delete(self, name):
                del remote[name]
            def close(self):
                self.closed = True
        ftp = FTP()
        def atomic(_ftp, name, content):
            writes.append(name)
            remote[name] = content
        fake = types.SimpleNamespace(StagingFTP=lambda: ftp, replace_renderer_atomically=atomic,
            retrieve_file=lambda _ftp, name: remote.get(name), http_json=lambda endpoint: {'permalink': publisher.URL},
            store2=types.SimpleNamespace(ensure_dir=lambda *_: None, read_tree=lambda *_: {
                'content/a-article.html': b'old body', 'registry.php': b'old registry'}))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'deploy-backups').mkdir()
            with patch.object(publisher, 'ROOT', root), patch.object(publisher, 'local_payload', return_value=payload), patch.object(publisher, 'load_publisher', return_value=fake), patch.object(sys, 'argv', ['publish-code-pages.py', '--report', 'report.json']):
                with self.assertRaisesRegex(RuntimeError, 'Staging checksum mismatch: ' + image):
                    publisher.main()
            report = json.loads((root / 'report.json').read_bytes())
            self.assertTrue(report['helper_removed'])
            self.assertTrue(ftp.closed)
            self.assertEqual(report['phase'], 'backed-up')
        self.assertNotIn(publisher.remote_path(body), writes)
        self.assertNotIn(publisher.remote_path(registry), writes)
        self.assertNotIn(publisher.remote_path(page), writes)
        self.assertNotIn(publisher.remote_path(publisher.RENDERER), writes)
        self.assertEqual(remote[publisher.remote_path(body)], b'old body')
        self.assertEqual(remote[publisher.remote_path(registry)], b'old registry')
        self.assertEqual(remote[publisher.remote_path(publisher.RENDERER)], b'old renderer')
        self.assertTrue(all(ordered.index(name) < ordered.index(body) for name in [image, shell, css]))
        self.assertLess(ordered.index(body), ordered.index(registry))
        self.assertLess(ordered.index(body), ordered.index(page))
        self.assertLess(ordered.index(page), ordered.index(registry))
        self.assertEqual(ordered[-1], publisher.RENDERER)

    def test_paths_are_staging_only(self):
        for path in ['ktk-code-pages.php', 'ktk-code-pages-assets/runtime.js', 'ktk-code-pages-assets/media/a.woff2']:
            self.assertTrue(publisher.remote_path(path).startswith('/public_html/staging/wp-content/mu-plugins/'))

    def test_rejects_unowned_paths(self):
        for path in ['../wp-config.php', '/public_html/wp-content/a.php', 'ktk-homepage-shortcode.php', 'ktk-code-pages-assets/../a', 'ktk-code-pages-assets//a', 'ktk-code-pages-assets/a\\b']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                publisher.remote_path(path)

    def test_payload_excludes_homepage_and_storefront(self):
        files = publisher.local_payload()
        self.assertIn(publisher.RENDERER, files)
        self.assertGreater(len(files), 6)
        for path in files:
            publisher.remote_path(path)
            self.assertNotIn('ktk-homepage', path)
            self.assertNotIn('ktk-storefront', path)

    def test_probe_is_read_only_except_targeted_cache(self):
        source = publisher.probe_helper('a' * 48).decode()
        self.assertIn("!== '/staging'", source)
        self.assertIn("get_page_by_path('about-us/how-to-join'", source)
        self.assertIn('hash_equals', source)
        self.assertIn('time() >', source)
        self.assertIn('rocket_clean_post($page->ID)', source)
        for forbidden in ['update_option', 'wp_update_post', 'wp_insert_post', 'rocket_clean_home', 'rocket_clean_domain']:
            self.assertNotIn(forbidden, source)

    def test_full_registry_is_complete_and_excludes_store(self):
        registry = publisher.registry_data()
        manifest = publisher.validate_full_registry(registry)
        self.assertEqual(len(manifest['routes']), 116)
        broken = copy.deepcopy(registry)
        broken['complete'] = False
        with self.assertRaises(RuntimeError):
            publisher.validate_full_registry(broken)
        broken = copy.deepcopy(registry)
        broken['redirects']['/store/cart/'] = {'status': 301, 'target': '/contact/'}
        with self.assertRaises(RuntimeError):
            publisher.validate_full_registry(broken)

    def test_full_probe_is_staging_and_exact_cache_only(self):
        manifest = publisher.validate_full_registry(publisher.registry_data())
        source = publisher.probe_helper('a' * 48, manifest).decode()
        self.assertIn("!== '/staging'", source)
        self.assertIn('rocket_clean_files($urls)', source)
        self.assertIn("get_page_by_path('store'", source)
        self.assertIn("hash('sha256', serialize($post))", source)
        self.assertNotIn('rocket_clean_post', source)
        self.assertNotIn('rocket_clean_domain', source)
        for forbidden in ['update_option', 'wp_update_post', 'wp_insert_post', 'rocket_clean_home']:
            self.assertNotIn(forbidden, source)

    def test_full_publish_rejects_recorded_redirect_finalization_failure(self):
        original_read = Path.read_text
        build_path = publisher.ROOT / 'docs/code-pages/full-migration/build-report.json'
        verification_path = publisher.ROOT / 'docs/code-pages/full-migration/build-verification.json'

        def read_evidence(file, *args, **kwargs):
            if file == build_path:
                return json.dumps({'built': list(range(116)), 'missing': [], 'errors': [
                    {'key': 'build-finalization', 'error': 'Expected observed redirect: 522'},
                ]})
            if file == verification_path:
                return json.dumps({'passed': 1, 'total': 1})
            return original_read(file, *args, **kwargs)

        with patch.object(Path, 'read_text', new=read_evidence):
            with self.assertRaisesRegex(RuntimeError, 'Successful full build and verification required'):
                publisher.local_payload(full=True)


if __name__ == '__main__':
    unittest.main()
