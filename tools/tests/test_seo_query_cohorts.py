import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('cohorts', ROOT / 'tools/summarize-seo-query-cohorts.py')
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class QueryCohortTests(unittest.TestCase):
    def test_explicit_brand_and_ambiguous_variants_are_separate(self):
        self.assertEqual(module.classify('Krawl Through Krak\u00f3w reviews'), 'explicit_brand')
        self.assertEqual(module.classify('site:krawlthroughkrakow.com'), 'explicit_brand')
        self.assertEqual(module.classify('crawl through krakow'), 'brand_variant_review')
        for query in ['pub crawl krakow', 'krawl works', 'pub krawl', 'krakow nightlife']:
            self.assertEqual(module.classify(query), 'other_returned_queries')

    def test_counts_reconcile_only_to_returned_rows(self):
        data = {'end': True, 'rows': [['krawl through krakow', '2', '1,000', '0.20%', '4.00'],
                                    ['pub crawl krakow', '3', '200', '1.50%', '5.00']]}
        result = module.summarize(data)
        self.assertEqual(result['returnedRows'], 2)
        self.assertEqual(result['groups']['explicit_brand']['impressions'], 1000)
        self.assertEqual(sum(g['clicks'] for g in result['groups'].values()), 5)
        self.assertIn('not all Google queries', result['limitations'])
        self.assertNotIn('position', result['groups']['explicit_brand'])

    def test_incomplete_duplicate_and_invalid_integer_exports_fail(self):
        good = ['a', '1', '10', '10.00%', '4.00']
        for data in [{'end': False, 'rows': [good]}, {'end': True, 'rows': [good, good]},
                     {'end': True, 'rows': [['a', '-1', '10', '0%', '4.00']]},
                     {'end': True, 'rows': [['a', '1', '1,2', '0%', '4.00']]}]:
            with self.subTest(data=data), self.assertRaises(ValueError):
                module.summarize(data)


if __name__ == '__main__':
    unittest.main()
