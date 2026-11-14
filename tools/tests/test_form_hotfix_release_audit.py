"""Offline production-semantic comparison fixtures, never network reads."""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('hotfix_release_test', ROOT / 'tools/verify-form-hotfix-release.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class ReleaseAudit(unittest.TestCase):
    def parse(self, value):
        parser = audit.Semantics()
        parser.feed(value)
        return parser.summary()

    def setUp(self):
        self.html = '''<html><head><title>Original title</title><meta name="robots" content="index,follow"><link rel="canonical" href="https://krawlthroughkrakow.com/contact/"><script type="application/ld+json">{"name":"Original schema"}</script></head><body class="ktk-code-page"><h1>Contact</h1><p>Original copy.</p><img src="/photo.jpg" alt="Original photo"><a href="/store2/">Book</a><form action="/wp-admin/admin-ajax.php"><input name="action" value="ktk_pages_contact"><input name="_ktk_nonce" value="ephemeral-one"><input name="_ktk_challenge" value="ephemeral-two"></form><script src="/wp-content/mu-plugins/ktk-code-pages-assets/runtime.js?v=old"></script></body></html>'''

    def test_runtime_reference_is_recorded_separately(self):
        before = self.parse(self.html)
        after = self.parse(self.html.replace('?v=old', '?v=new'))
        self.assertEqual(before['signature'], after['signature'])
        self.assertNotEqual(before['runtimes'], after['runtimes'])
        self.assertEqual(len(before['runtimes']), 1)

    def test_only_exact_two_security_values_may_vary(self):
        self.assertEqual(self.parse(self.html)['signature'], self.parse(self.html.replace('ephemeral-one', 'different-one').replace('ephemeral-two', 'different-two'))['signature'])
        self.assertNotEqual(self.parse(self.html)['signature'], self.parse(self.html.replace('ktk_pages_contact', 'wrong_handler'))['signature'])

    def test_visible_copy_title_schema_metadata_links_media_and_forms_change_signature(self):
        for old, new in (('Original title', 'Staged title'), ('index,follow', 'noindex,follow'),
                         ('Original schema', 'Staged schema'), ('Original copy.', 'Staged copy.'),
                         ('/photo.jpg', '/different.jpg'), ('Original photo', 'New alt'),
                         ('href="/store2/"', 'href="/staging/store2/"'),
                         ('action="/wp-admin/admin-ajax.php"', 'action="/wrong/"'),
                         ('name="action"', 'name="missing-action"'), ('<h1>Contact</h1>', '<h1>Changed</h1>')):
            with self.subTest(old=old):
                self.assertNotEqual(self.parse(self.html)['signature'], self.parse(self.html.replace(old, new))['signature'])

    def test_canonical_and_robots_are_exact_not_optimistically_assumed(self):
        result = self.parse(self.html)
        self.assertEqual(result['canonical'], ['https://krawlthroughkrakow.com/contact/'])
        self.assertEqual(result['robots'], ['index,follow'])
        absent = self.parse('<head><title>No canonical</title></head><body>Text</body>')
        self.assertEqual(absent['canonical'], [])
        self.assertEqual(absent['robots'], [])

    def test_resource_normalization_only_known_runtime_version(self):
        self.assertEqual(audit.normalized_resource(audit.SCRIPT+'?v=abc&other=kept'), audit.SCRIPT+'?v=FORM_HOTFIX_VERSION&other=kept')
        self.assertEqual(audit.normalized_resource('/other.js?v=abc'), '/other.js?v=abc')

    def test_schema_parse_errors_are_not_silently_discarded(self):
        with self.assertRaises(ValueError):
            self.parse('<script type="application/ld+json">{invalid}</script>')


if __name__ == '__main__':
    unittest.main()
