import importlib.util
import unittest
import copy
import json
from pathlib import Path
from unittest.mock import patch

FILE = Path(__file__).resolve().parents[1] / 'publish-code-pages.py'
SPEC = importlib.util.spec_from_file_location('pages_publisher', FILE)
publisher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publisher)


class PublisherTests(unittest.TestCase):
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
