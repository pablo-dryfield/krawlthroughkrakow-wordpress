import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('public_verifier', ROOT / 'tools/verify-storefront-public-html.py')
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class PublicParserTests(unittest.TestCase):
    def test_reads_optimizer_contract_without_collecting_other_page_text(self):
        parser = module.PublicHTML()
        parser.feed('<link rel="stylesheet" data-no-minify="1" href="/assets/storefront.css">'
                    '<aside>Outside</aside><main id="ktk-storefront-public-content" data-public-content="2026.11.12.2">'
                    '<h1>Actual title</h1><img src="photo.jpg" data-no-lazy="1"><a href="/store2/">Catalog</a>'
                    '</main><div id="ktk-storefront-root" hidden></div><footer>Other</footer>')
        self.assertEqual(parser.version, '2026.11.12.2')
        self.assertEqual(parser.styles[0]['data-no-minify'], '1')
        self.assertEqual(parser.images[0]['data-no-lazy'], '1')
        self.assertEqual(parser.h1, ['Actual title'])
        self.assertTrue(parser.hidden_root)
        self.assertNotIn('Outside', parser.text)
        self.assertNotIn('Other', parser.text)

    def test_missing_version_and_exclusion_are_not_invented(self):
        parser = module.PublicHTML()
        parser.feed('<div id="ktk-storefront-public-content"><h1>Old</h1></div><div id="ktk-storefront-root"></div>')
        self.assertIsNone(parser.version)
        self.assertFalse(parser.hidden_root)
        self.assertEqual(parser.styles, [])

    def test_version_is_bound_to_one_explicit_source_constant(self):
        self.assertEqual(module.renderer_version("\tconst VERSION = '2026.11.13.2';\n"), '2026.11.13.2')
        for source in ['', "const VERSION = 'unknown';", "const VERSION = '2026.11.13.2';\nconst VERSION = '2026.11.13.3';"]:
            with self.subTest(source=source), self.assertRaises(ValueError):
                module.renderer_version(source)

    def test_stale_version_or_missing_optimizer_exclusion_still_fails(self):
        parser = module.PublicHTML()
        parser.feed('<link rel="stylesheet" data-no-minify="1" href="/assets/storefront.css">'
                    '<main id="ktk-storefront-public-content" data-public-content="2026.11.13.2"></main>')
        self.assertTrue(module.current_renderer(parser, '2026.11.13.2'))
        self.assertFalse(module.current_renderer(parser, '2026.11.12.2'))
        parser.styles[0].pop('data-no-minify')
        self.assertFalse(module.current_renderer(parser, '2026.11.13.2'))


if __name__ == '__main__':
    unittest.main()
