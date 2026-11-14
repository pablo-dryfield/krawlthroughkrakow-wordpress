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

    def test_different_cloudflare_salts_retain_exact_decoded_identity(self):
        def encode(email, key):
            return bytes([key, *(b ^ key for b in email.encode())]).hex()
        first, second = encode('public@example.test', 0x38), encode('public@example.test', 0xe4)
        for template in ('<a href="/cdn-cgi/l/email-protection#{}">Email</a>',
                         '<a class="__cf_email__" data-cfemail="{}" href="/cdn-cgi/l/email-protection">Protected</a>',
                         '<span class="__cf_email__" data-cfemail="{}">Protected</span>'):
            with self.subTest(template=template):
                self.assertEqual(self.parse(template.format(first))['signature'], self.parse(template.format(second))['signature'])
                self.assertNotEqual(self.parse(template.format(first))['signature'], self.parse(template.format(encode('changed@example.test', 0xe4)))['signature'])
        self.assertEqual(audit.decoded_email(first), 'public@example.test')
        for invalid in ('abc', '', 'xyz123', '00'):
            with self.assertRaises(ValueError):
                audit.decoded_email(invalid)

    def test_legacy_mode_preserves_the_exact_original_obfuscated_comparison(self):
        first = audit.Semantics(email_identity=False)
        first.feed('<a href="/cdn-cgi/l/email-protection#380a">Email</a>')
        second = audit.Semantics(email_identity=False)
        second.feed('<a href="/cdn-cgi/l/email-protection#e4d6">Email</a>')
        self.assertNotEqual(first.summary()['signature'], second.summary()['signature'])
        self.assertEqual(audit.normalized_resource('/cdn-cgi/l/email-protection#380a', False), '/cdn-cgi/l/email-protection#380a')
        self.assertEqual(audit.normalized_resource('https://example.test/cdn-cgi/l/email-protection#380a'), 'https://example.test/cdn-cgi/l/email-protection#380a')

    def test_original_complete_sha_is_reproduced_by_only_the_public_salt(self):
        def parsed(address, key, text='Original text'):
            encoded = bytes([key, *(b ^ key for b in address.encode())]).hex()
            value = audit.Semantics(email_identity=False)
            value.feed('<p>'+text+'</p><a class="unchanged" href="/cdn-cgi/l/email-protection#'+encoded+'">Email</a>')
            return value
        old, new = parsed('public@example.test', 0x38), parsed('public@example.test', 0xe4)
        before = new.summary()
        self.assertEqual(audit.legacy_identity(new.rows, old.summary()['signature']), {'matched': True, 'mode': 'exact-original-under-public-email-salt'})
        self.assertEqual(new.summary(), before)
        for value in (parsed('changed@example.test', 0xe4), parsed('public@example.test', 0xe4, 'Changed text')):
            self.assertFalse(audit.legacy_identity(value.rows, old.summary()['signature'])['matched'])
        self.assertEqual(audit.legacy_identity(old.rows, old.summary()['signature'])['mode'], 'exact-original')

    def test_legal_alternative_is_explicit_source_identity_not_false_old_cache_identity(self):
        import copy
        target = 'ktk-code-pages-assets/runtime.js'
        protected = {name: 'a'*64 for name in ('ktk-code-pages-assets/content/privacy-policy.html', 'ktk-code-pages-assets/pages/privacy-policy.php', 'ktk-code-pages-assets/registry.php', 'ktk-code-pages-assets/shells/example.html')}
        before = {key: key for key in ('wordpress_state_sha256', 'post_meta_sha256', 'metadata_rows', 'production_enabled', 'home_url', 'blog_public', 'project_id', 'policy_enabled')}
        before.update(protected=protected, additional_protected={'production-mu/ktk-code-pages.php': 'b'*64}, owned={target: '38cdaa565d7fabc7f58e05cd8697dd79996c9c755d0beca9fda9e2503b2fc9e3'})
        after = copy.deepcopy(before)
        after['owned'] = {target: '47ae06b74471bef02205bd07e18958cddf1cccabed5a2aa2466463051491937f'}
        release = {'phase': 'complete', 'target': target, 'before': before, 'after': after}
        identity = {'mode': 'not-exactly-one-variable-email-node', 'variableNodes': 2}
        self.assertTrue(audit.legal_source_proof(release, '/privacy-policy/', identity))
        self.assertFalse(audit.legal_source_proof(release, '/contact/', identity))
        self.assertFalse(audit.legal_source_proof(release, '/privacy-policy/', {**identity, 'variableNodes': 3}))
        for key in before:
            changed = copy.deepcopy(release)
            changed['after'][key] = 'changed'
            self.assertFalse(audit.legal_source_proof(changed, '/privacy-policy/', identity), key)
        self.assertFalse(audit.legal_source_proof({**release, 'phase': 'prepared'}, '/privacy-policy/', identity))


if __name__ == '__main__':
    unittest.main()
