import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

FILE = Path(__file__).resolve().parents[1] / 'inventory-site-pages.py'
SPEC = importlib.util.spec_from_file_location('site_inventory', FILE)
inventory = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(inventory)


class InventoryTests(unittest.TestCase):
    def test_only_internal_content_urls(self):
        for url in ['https://example.com/a/', 'mailto:a@example.com', inventory.ORIGIN + '/staging/contact/', inventory.ORIGIN + '/wp-admin/', inventory.ORIGIN + '/a.jpg']:
            self.assertIsNone(inventory.normalize(url))
        self.assertEqual(inventory.normalize(inventory.ORIGIN + '/contact/?utm_source=qa#x'), inventory.ORIGIN + '/contact/')

    def test_code_marker_has_priority_over_retained_divi_classes(self):
        document = '<body class="et_divi_theme ktk-homepage-standalone"><div class="et_pb_section"></div></body>'
        with patch.object(inventory, 'fetch', return_value={'text': document, 'status': 200, 'final_url': inventory.ORIGIN + '/', 'content_type': 'text/html'}):
            self.assertEqual(inventory.inspect(inventory.ORIGIN + '/')['renderer'], 'code-managed homepage')

    def test_storefront_root_marker(self):
        with patch.object(inventory, 'fetch', return_value={'text': '<div id="ktk-storefront-root"></div>', 'status': 200, 'final_url': inventory.ORIGIN + '/store2/', 'content_type': 'text/html'}):
            self.assertEqual(inventory.inspect(inventory.ORIGIN + '/store2/')['renderer'], 'code-managed storefront')

    def test_html_facts_do_not_execute_or_count_script_as_content(self):
        parser = inventory.Facts()
        parser.feed('<title>Example &amp; Title</title><script>fetch("https://example.test/")</script><h1>Main</h1><iframe data-ktk-map-src="https://www.google.com/maps/a" src="about:blank"></iframe>')
        self.assertEqual(''.join(parser.title), 'Example & Title')
        self.assertNotIn('fetch', ''.join(parser.text))
        self.assertEqual(parser.map_count, 1)
        self.assertEqual(parser.headings[0]['text'], 'Main')

    def test_rest_pagination_and_total_are_verified(self):
        replies = [
            {'status': 200, 'content_type': 'application/json', 'text': '[{"id":1}]', 'total_pages': '2', 'total': '2'},
            {'status': 200, 'content_type': 'application/json', 'text': '[{"id":2}]', 'total_pages': '2', 'total': '2'},
        ]
        with patch.object(inventory, 'fetch', side_effect=replies):
            self.assertEqual(len(inventory.api_collection(inventory.ORIGIN, 'pages')), 2)
        with patch.object(inventory, 'fetch', return_value={'status': 200, 'content_type': 'application/json', 'text': '[{"id":1}]', 'total_pages': '1', 'total': '2'}):
            with self.assertRaises(RuntimeError):
                inventory.api_collection(inventory.ORIGIN, 'pages')


if __name__ == '__main__':
    unittest.main()
