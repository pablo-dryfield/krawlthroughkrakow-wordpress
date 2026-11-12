import importlib.util
import unittest
from datetime import date
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('catalog_audit',Path(__file__).resolve().parents[1] / 'audit-seo-catalog.py')
module = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(module)


class CatalogAuditTests(unittest.TestCase):
    def test_empty_ambiguous_invalid_catalog_fails(self):
        product = {'id':28,'slug':'pub-crawl-28'}
        for catalog in [{}, {'products':[]}, {'products':[product,product]}, {'products':[{'id':True,'slug':'x'}]}, {'products':[{'id':28,'slug':'../cart'}]}]:
            with self.subTest(catalog=catalog), self.assertRaises(ValueError): module.validate_catalog(catalog)
        self.assertEqual(module.validate_catalog({'products':[product]}),[product])

    def test_missing_content_is_not_replaced_with_invented_copy(self):
        for config in [None, [], {}, {'content':[]}]:
            facts = module.content_facts({'config':config},date(2026,11,12))
            self.assertEqual((facts['summary'],facts['description'],facts['highlights']),('','',[]))

    def test_expired_dates_are_observations_not_indexing_changes(self):
        product = {'config':{'availability':{'allowedDates':['2026-10-29','2026-10-31']}}}
        facts = module.content_facts(product,date(2026,11,12))
        self.assertTrue(facts['allAllowedDatesPast'])
        self.assertEqual(facts['allowedDates'],['2026-10-29','2026-10-31'])
        product['config']['availability']['allowedDates'].append('2027-10-31')
        self.assertFalse(module.content_facts(product,date(2026,11,12))['allAllowedDatesPast'])

    def test_date_today_is_not_marked_expired(self):
        self.assertFalse(module.content_facts({'config':{'availability':{'allowedDates':['2026-11-12']}}},date(2026,11,12))['allAllowedDatesPast'])

    def test_content_facts_keep_conflicting_visible_stat_evidence(self):
        facts = module.content_facts({'config':{'content':{'description':' Actual  copy ', 'highlights':['13-14 tastings'], 'card':{'stats':[{'count':10,'label':'Food tastings'}]}}}},date(2026,11,12))
        self.assertEqual(facts['description'],'Actual copy')
        self.assertEqual(facts['highlights'],['13-14 tastings'])
        self.assertEqual(facts['cardStats'][0]['count'],10)

    def test_html_parser_keeps_initial_heading_and_metadata_without_execution(self):
        parser = module.HeadingsAndMetadata()
        parser.feed('<title>Food &amp; Drinks</title><meta name="robots" content="noindex"><link rel="canonical" href="https://example.com/"><h1>Food <span>tour</span></h1>')
        self.assertEqual(parser.title,'Food & Drinks')
        self.assertEqual(parser.h1,['Food tour'])
        self.assertEqual(parser.robots,['noindex'])
        self.assertEqual(parser.canonicals,['https://example.com/'])

    def test_reviewed_sources_require_real_final_self_canonical_and_stage_noindex(self):
        production={'status':200,'url':'https://example.com/product/','finalUrl':'https://example.com/product/','canonical':['https://example.com/product/'],'noindex':False}
        staging={**production,'noindex':True}
        self.assertTrue(module.check_reviewed_sources({'production':production,'staging':staging}))
        for field,value in [('status',404),('finalUrl','https://example.com/'),('canonical',[]),('noindex',True)]:
            with self.subTest(field=field): self.assertFalse(module.check_reviewed_sources({'production':{**production,field:value},'staging':staging}))
        self.assertFalse(module.check_reviewed_sources({'production':production,'staging':{**staging,'noindex':False}}))


if __name__ == '__main__': unittest.main()
