import copy
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('plugin_audit', ROOT / 'tools/audit-plugins.py')
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class PluginAuditTests(unittest.TestCase):
    def test_report_does_not_authorize_or_perform_removal(self):
        data = {'plugins': [{'file': 'plugin/main.php', 'active': True}], 'redirects': [], 'rendered_dependencies': []}
        self.assertEqual(module.assess(data)['active_plugin_count'], 1)
        self.assertFalse(module.assess(data)['removal_authorized'])
        for command in ('deactivate_plugins(', 'delete_option(', 'update_option(', 'wp_remote_post(', 'wp_mail('):
            self.assertNotIn(command, module.EXTENSION)
        self.assertIn("unset($extension['private_wpcode_backup'])", module.EXTENSION)

    def test_dependency_counts_are_not_stored_form_counts(self):
        data = {'plugins': [{'file': 'insert-headers-and-footers/plugin.php', 'active': False}],
                'home_url': 'https://example.com/', 'code_redirects': {},
                'redirects': [{'status': 'inactive'},
                              {'id': 1, 'status': '301', 'url_from': 'a/', 'resolved_target': 'https://example.com/b/'},
                              {'id': 2, 'status': '302', 'url_from': 'c/', 'resolved_target': 'https://example.com/d/'}],
                'rendered_dependencies': [{'route': '/a/', 'cf7_ids': ['12'], 'native_form_count': 0},
                                          {'route': '/b/', 'cf7_ids': [], 'native_form_count': 2}]}
        original = copy.deepcopy(data)
        report = module.assess(data)
        self.assertTrue(report['wpcode_present'])
        self.assertEqual(report['active_redirect_count'], 2)
        self.assertEqual(report['cf7_rendered_routes'], ['/a/'])
        self.assertEqual(report['native_form_routes'], ['/b/'])
        self.assertEqual(data, original)

    def test_redirect_coverage_does_not_claim_variant_parity(self):
        data = {'home_url': 'https://example.com/staging/',
                'redirects': [{'id': 1, 'url_from': 'old/', 'status': '301', 'resolved_target': 'https://example.com/staging/new/'}],
                'code_redirects': {'/old/': {'status': 301, 'target': '/new/'}}}
        self.assertTrue(module.redirect_coverage(data)[0]['exact_stored_source_covered'])
        for key, value in [('status', '302'), ('resolved_target', 'https://example.com/new/'), ('url_from', 'OLD/')]:
            changed = copy.deepcopy(data); changed['redirects'][0][key] = value
            self.assertFalse(module.redirect_coverage(changed)[0]['exact_stored_source_covered'])

    def test_any_protected_configuration_change_blocks_stability(self):
        keys = ('protected', 'wordpress_state_sha256', 'wpcode_state_sha256', 'plugins',
                'plugin_audit_state_sha256', 'mu_plugins', 'rendered_dependencies', 'code_redirects')
        before = dict.fromkeys(keys, 'same')
        self.assertTrue(module.unchanged(before, before.copy()))
        for key in keys:
            after = before.copy(); after[key] = 'different'
            self.assertFalse(module.unchanged(before, after), key)


if __name__ == '__main__':
    unittest.main()
