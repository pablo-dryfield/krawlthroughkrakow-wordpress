import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
SPEC=importlib.util.spec_from_file_location('roadmap',ROOT / 'tools/build-seo-roadmap.py')
module=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(module)


class RoadmapTests(unittest.TestCase):
    def setUp(self):
        self.data=json.loads((ROOT / 'tools/seo-roadmap.json').read_text())
        self.plan=(ROOT / 'docs/seo/SEO-AND-WEBSITE-IMPROVEMENT-PLAN.md').read_text(encoding='utf-8')

    def test_all_plan_tickets_have_explicit_status_without_false_percent(self):
        result=module.render(self.data,self.plan)
        self.assertIn('| Total | 40 |',result)
        self.assertIn('not a time-based percentage',result)
        self.assertIn('**New SEO production releases:** 0',result)
        self.assertIn('D08',result)

    def test_missing_unknown_ticket_or_status_fails(self):
        for change in ['missing','extra','status','note']:
            data=copy.deepcopy(self.data)
            if change=='missing': del data['tickets']['T02']
            elif change=='extra': data['tickets']['T99']=data['tickets']['T02']
            elif change=='status': data['tickets']['T02']['status']='done-ish'
            else: data['tickets']['T02']['note']=''
            with self.subTest(change=change),self.assertRaises(ValueError): module.render(data,self.plan)

    def test_checked_in_dashboard_matches_source(self):
        self.assertEqual((ROOT / 'docs/seo/ROADMAP.md').read_text(encoding='utf-8'),module.render(self.data,self.plan))


if __name__=='__main__': unittest.main()
