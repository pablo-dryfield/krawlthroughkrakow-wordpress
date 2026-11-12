import copy
import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('discovery_builder', Path(__file__).resolve().parents[1] / 'build-seo-discovery.py')
module = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(module)


class BuilderTests(unittest.TestCase):
    def test_rejects_staging_private_query_and_foreign_urls(self):
        for url in ['http://krawlthroughkrakow.com/', module.ORIGIN+'/staging/', module.ORIGIN+'/store/', module.ORIGIN+'/store2/cart/', module.ORIGIN+'/store2/checkout/confirmation/', module.ORIGIN+'/?utm_source=test', module.ORIGIN+'/#book', 'https://other.com/']:
            with self.subTest(url=url), self.assertRaises(ValueError): module.canonical_url(url)

    def test_registry_selection_keeps_only_declared_canonicals(self):
        data = module.read_definitions()
        urls, excluded = module.select_content(data['registry'], data['pages'])
        self.assertEqual(len(urls), 116)
        self.assertIn(module.ORIGIN+'/', urls)
        self.assertEqual([row['route'] for row in excluded], ['/krakow-team-building-activities/'])
        self.assertNotIn(module.ORIGIN+'/krakow-pub-crawl/', urls)
        self.assertTrue(any('/page/2/' in url for url in urls))

    def test_rejects_incomplete_registry_and_source_identity_mismatch(self):
        data = module.read_definitions()
        data['registry']['complete'] = False
        with self.assertRaises(ValueError): module.select_content(data['registry'], data['pages'])
        data['registry']['complete'] = True
        first = next(iter(data['pages']))
        data['pages'][first]['production_seo']['source_url'] = module.ORIGIN+'/wrong/'
        with self.assertRaises(ValueError): module.select_content(data['registry'], data['pages'])

    def test_noindex_or_different_canonical_is_not_included(self):
        data = module.read_definitions()
        route = '/about-us/'
        for field, value in [('canonical',[module.ORIGIN+'/']), ('robots',[{'content':'NOINDEX, follow'}])]:
            pages = copy.deepcopy(data['pages']); pages[route]['production_seo'][field] = value
            urls, excluded = module.select_content(data['registry'], pages)
            self.assertNotIn(module.ORIGIN+route, urls)
            self.assertIn(route, [row['route'] for row in excluded])

    def test_product_selection_is_reviewed_and_never_treats_failure_as_empty(self):
        policy = {'products':[{'id':28,'slug':'pub-crawl-28'},{'id':32,'slug':'nye-pub-crawl-32'}]}
        catalog = {'products':policy['products']+[{'id':51,'slug':'halloween-pub-crawl-51'}]}
        urls = module.select_products(catalog,policy)
        self.assertEqual(len(urls),3)
        self.assertNotIn(module.ORIGIN+'/store2/halloween-pub-crawl-51/',urls)
        for broken in [{}, {'products':[]}, {'products':[{'id':28,'slug':'renamed-28'}]}, {'products':catalog['products']*2}]:
            with self.subTest(broken=broken), self.assertRaises(ValueError): module.select_products(broken,policy)


if __name__ == '__main__': unittest.main()
