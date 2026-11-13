import copy
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('wpcode_audit', ROOT / 'tools/audit-wpcode.py')
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class WPCodeAuditTests(unittest.TestCase):
    def clean(self):
        return {'snippets': [], 'global_injections': {key: {'code_bytes': 0} for key in ['header', 'body', 'footer']},
                'cached_snippets': [], 'published_shortcode_reference_ids': [], 'page_meta_count': 0,
                'shared_integrations_version': '2026.11.06.1'}

    def test_empty_plugin_is_a_candidate_not_an_uninstall(self):
        self.assertTrue(module.assess(self.clean())['removal_candidate'])
        self.assertNotIn('deactivate_plugins(', module.EXTENSION)
        self.assertNotIn('delete_option(', module.EXTENSION)
        self.assertNotIn('update_option(', module.EXTENSION)

    def test_all_other_active_code_and_global_fields_block(self):
        cases = [
            {'snippets': [{'id': 1, 'status': 'publish', 'code_bytes': 10, 'replaced_by_owned_code': False}]},
            {'snippets': [{'id': 1, 'status': 'future', 'code_bytes': 10, 'replaced_by_owned_code': False}]},
            {'cached_snippets': [{'id': 1, 'code_bytes': 10, 'replaced_by_owned_code': False}]},
            {'published_shortcode_reference_ids': [1]}, {'page_meta_count': 1},
            {'shared_integrations_version': 'unknown'},
        ]
        cases += [{'global_injections': {field: {'code_bytes': 10}}} for field in ['header', 'body', 'footer']]
        for change in cases:
            data = self.clean(); data.update(change)
            with self.subTest(change=change):
                self.assertFalse(module.assess(data)['removal_candidate'])

    def test_only_verified_replacement_with_empty_effective_code_is_accepted(self):
        data = self.clean()
        data['snippets'] = [{'id': 9132, 'status': 'publish', 'code_bytes': 10, 'replaced_by_owned_code': True, 'effective_code_bytes': 0}]
        original = copy.deepcopy(data)
        self.assertTrue(module.assess(data)['removal_candidate'])
        self.assertEqual(data, original)
        data['snippets'][0]['effective_code_bytes'] = 10
        self.assertFalse(module.assess(data)['removal_candidate'])


if __name__ == '__main__':
    unittest.main()
