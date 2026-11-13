import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('page_cohorts', ROOT / 'tools/summarize-seo-page-cohorts.py')
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


def data(rows):
    return {'coverage': f'2026-10-14 TO 2026-11-10\n{len(rows)} ROWS\nEnd of returned rows. Detail aggregation: byPage.', 'rows': rows}


def row(url, clicks='1', impressions='10'):
    return [url, clicks, impressions, '10.00%', '4.00']


class PageCohortTests(unittest.TestCase):
    def setUp(self):
        self.roles = module.build_roles({'routes': [
            {'key': 'post-guide', 'route': '/guide/'}, {'key': 'archive-example', 'route': '/category/example/'},
            {'key': 'new-years-eve', 'route': '/new-years-eve/'},
        ], 'aliases': [{'route': '/old-guide/'}]}, {'products': [{'slug': 'pub-crawl-28'}]})

    def test_full_url_variants_are_not_overwritten_or_printed(self):
        report = module.summarize(data([
            row('https://krawlthroughkrakow.com/guide/', '3', '100'),
            row('https://krawlthroughkrakow.com/guide/#section', '0', '7'),
            row('https://krawlthroughkrakow.com/store2/pub-crawl-28/?gclid=private-marker', '2', '20'),
        ]), self.roles)
        self.assertEqual(report['groups']['editorial_articles'], {'rows': 2, 'clicks': 3, 'impressions': 107, 'queryRows': 0, 'fragmentRows': 1})
        self.assertEqual(report['returnedPageTotals'], {'rows': 3, 'clicks': 5, 'impressions': 127})
        self.assertEqual(report['variants']['query_only']['clicks'], 2)
        self.assertNotIn('private-marker', json.dumps(report))
        self.assertNotIn('https://', json.dumps(report))

    def test_query_order_and_fragments_remain_distinct(self):
        report = module.summarize(data([
            row('https://krawlthroughkrakow.com/guide/?a=1&b=2#first'),
            row('https://krawlthroughkrakow.com/guide/?b=2&a=1#first'),
            row('https://krawlthroughkrakow.com/guide/?a=1&b=2#second'),
        ]), self.roles)
        self.assertEqual(report['returnedRows'], 3)
        self.assertEqual(report['variants']['query_and_fragment']['rows'], 3)

    def test_roles_respect_route_boundaries_and_do_not_infer_intent(self):
        cases = {'/': 'homepage', '/guide/': 'editorial_articles', '/new-years-eve/': 'commercial_content',
                 '/category/example/': 'editorial_archives', '/old-guide/': 'known_aliases',
                 '/store2/': 'code_catalog', '/store2/pub-crawl-28/': 'code_products',
                 '/store2/unknown/': 'unreviewed_storefront', '/store2/checkout/success/': 'code_utilities',
                 '/store/product': 'legacy_ecwid', '/store20/': 'unreviewed_urls',
                 '/staging/store2/': 'staging_urls', '/wp-content/uploads/games.pdf': 'documents',
                 '/guide/feed/': 'feeds', '/wp-sitemap.xml': 'discovery_resources', '/guide': 'unreviewed_urls'}
        for path, expected in cases.items():
            with self.subTest(path=path):
                self.assertEqual(module.role_for(module.parse_url('https://krawlthroughkrakow.com' + path), self.roles), expected)
        self.assertEqual(module.role_for(module.parse_url('https://example.com/guide/'), self.roles), 'other_hosts')

    def test_page_totals_are_never_called_property_totals_or_averaged(self):
        report = module.summarize(data([row('http://krawlthroughkrakow.com/guide/', '1,000', '2,000')]), self.roles)
        self.assertEqual(report['nonHttpsRows'], 1)
        self.assertNotIn('position', report['returnedPageTotals'])
        self.assertNotIn('ctr', report['returnedPageTotals'])
        self.assertIn('not whole-property totals', report['limitations'])

    def test_incomplete_duplicate_bad_count_and_wrong_aggregation_fail(self):
        good = data([row('https://krawlthroughkrakow.com/')])
        for bad in [
            {'coverage': good['coverage'].replace('End of returned rows.', ''), 'rows': good['rows']},
            {'coverage': good['coverage'].replace('byPage', 'byProperty'), 'rows': good['rows']},
            {'coverage': good['coverage'].replace('1 ROWS', '2 ROWS'), 'rows': good['rows']},
            {'coverage': good['coverage'].replace('2026-10-14', '2026-12-14'), 'rows': good['rows']},
            data(good['rows'] * 2), data([row('https://krawlthroughkrakow.com/', '-1')]),
            data([row('https://krawlthroughkrakow.com/', '1', '1,2')]),
            data([row('https://user:private-marker@krawlthroughkrakow.com/')]),
            data([row('javascript:private-marker')]),
        ]:
            with self.subTest(coverage=bad['coverage']), self.assertRaises(ValueError) as context:
                module.summarize(bad, self.roles)
            self.assertNotIn('private-marker', str(context.exception))

    def test_registry_rejects_duplicate_routes_or_unsafe_product_slugs(self):
        for manifest, catalog in [
            ({'routes': [{'key': 'a', 'route': '/' }], 'aliases': []}, {'products': []}),
            ({'routes': [], 'aliases': []}, {'products': [{'slug': '../checkout'}]}),
            ({'routes': [], 'aliases': []}, {'products': [{'slug': 'same'}, {'slug': 'same'}]}),
        ]:
            with self.assertRaises(ValueError):
                module.build_roles(manifest, catalog)


if __name__ == '__main__':
    unittest.main()
