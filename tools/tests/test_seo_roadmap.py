import copy
import importlib.util
import json
from html.parser import HTMLParser
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
        self.assertIn('**Website SEO production releases:** '+str(self.data['websiteProductionReleases']),result)
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

    def test_visual_model_preserves_every_status_and_acceptance_criterion(self):
        result=module.build_model(self.data,self.plan)
        self.assertEqual(result['total'],40)
        self.assertEqual(sum(result['counts'].values()),40)
        expected={key:sum(module.BUCKETS[item['status']]==key for item in self.data['tickets'].values()) for key in ('complete','in_progress','not_started','deferred')}
        self.assertEqual(result['counts'],expected)
        self.assertEqual(result['verifiedMilestones'],sum(row['status'] in ('source_verified','staging_verified','live_verified') for row in self.data['milestones']))
        self.assertEqual(result['websiteProductionReleases'],self.data['websiteProductionReleases'])
        self.assertEqual({row['id'] for row in result['tickets']},set(self.data['tickets']))
        for row in result['tickets']:
            self.assertEqual(row['status'],self.data['tickets'][row['id']]['status'])
            self.assertTrue(row['acceptance'])
            self.assertTrue(row['work'])
            self.assertTrue(row['remaining'])

    def test_visual_view_rejects_incomplete_or_invented_information(self):
        for change in ['title','remaining','extra','focus','completed_focus','deferred_focus','duplicate_focus','milestone','evidence']:
            data=copy.deepcopy(self.data)
            if change=='title': del data['view']['tickets']['T02']
            elif change=='remaining': data['view']['tickets']['T02']['remaining']=' '
            elif change=='extra': data['view']['tickets']['T99']=data['view']['tickets']['T02']
            elif change=='focus': data['view']['focus']=['T99']
            elif change=='completed_focus': data['view']['focus']=['M01']
            elif change=='deferred_focus': data['view']['focus']=['D08']
            elif change=='duplicate_focus': data['view']['focus']=['D02','D02']
            elif change=='milestone': data['view']['milestoneTitles']=[]
            else: data['view']['evidence']['T02']='../../../../outside.md'
            with self.subTest(change=change),self.assertRaises(ValueError): module.build_model(data,self.plan)

    def test_duplicate_plan_workstream_fails(self):
        row=next(line for line in self.plan.splitlines() if line.startswith('| T02 [ ]'))
        with self.assertRaises(ValueError): module.render(self.data,self.plan+'\n'+row)

    def test_future_updates_flow_from_data_without_frozen_status_counters(self):
        data=copy.deepcopy(self.data)
        data['tickets']['M03']['status']='live_verified'
        data['websiteProductionReleases']=1
        result=module.build_model(data,self.plan)
        self.assertEqual(result['counts']['complete'],sum(row['status']=='live_verified' for row in data['tickets'].values()))
        self.assertEqual(result['websiteProductionReleases'],1)
        self.assertIn('**Website SEO production releases:** 1',module.render(data,self.plan))
        for invalid in (-1,True,'1'):
            data['websiteProductionReleases']=invalid
            with self.assertRaises(ValueError): module.build_model(data,self.plan)

    def test_standalone_html_has_no_remote_runtime_resources(self):
        class Resources(HTMLParser):
            def __init__(self): super().__init__(); self.resources=[]
            def handle_starttag(self,tag,attrs):
                attributes=dict(attrs)
                if tag in ('img','script','link'):
                    reference=attributes.get('src') or attributes.get('href')
                    if reference: self.resources.append(reference)
        result=module.render_html(self.data,self.plan)
        parser=Resources(); parser.feed(result)
        self.assertTrue(parser.resources)
        self.assertTrue(all(reference.startswith('data:image/webp;base64,') for reference in parser.resources))
        self.assertNotIn('__KTK_',result)

    def test_script_data_and_noscript_fallback_escape_content(self):
        data=copy.deepcopy(self.data)
        attack='</script><script>alert(1)</script>'
        data['view']['tickets']['T02']['title']=attack
        data['deliveries'][1]['summary']=attack
        result=module.render_html(data,self.plan)
        self.assertNotIn(attack,result)
        self.assertIn('\\u003c/script>',result)
        self.assertIn('&lt;/script&gt;',result)

    def test_checked_in_visual_dashboard_matches_source(self):
        self.assertEqual((ROOT / 'docs/seo/ROADMAP.html').read_text(encoding='utf-8'),module.render_html(self.data,self.plan))

    def test_deliveries_do_not_complete_or_double_count_workstreams(self):
        model=module.build_model(self.data,self.plan)
        self.assertEqual(len(model['deliveries']['items']),len(self.data['deliveries']))
        self.assertEqual(sum(model['deliveries']['counts'].values()),len(self.data['deliveries']))
        self.assertEqual(model['total'],40)
        self.assertEqual(next(row for row in model['tickets'] if row['id']=='C04')['bucket'],'in_progress')
        self.assertEqual(next(row for row in model['deliveries']['items'] if row['id']=='budget-guide')['stage'],'staging_verified')
        self.assertIn('## Delivery Progress',module.render(self.data,self.plan))

    def test_delivery_fields_and_evidence_fail_closed(self):
        for change in ['missing','duplicate','id','stage','title','scope','duplicate_scope','path','missing_evidence','future','unfinished_date','environment','live_website','unknown_field']:
            data=copy.deepcopy(self.data)
            row=data['deliveries'][1]
            if change=='missing': del data['deliveries']
            elif change=='duplicate': data['deliveries'].append(copy.deepcopy(row))
            elif change=='id': row['id']='../bad'
            elif change=='stage': row['stage']='complete-ish'
            elif change=='title': row['title']=' '
            elif change=='scope': row['workstreams']=['T99']
            elif change=='duplicate_scope': row['workstreams']=['C04','C04']
            elif change=='path': row['evidence']='../../../../outside.md'
            elif change=='missing_evidence': row['evidence']='not-found/README.md'
            elif change=='future': row['verifiedOn']='2099-01-01'
            elif change=='unfinished_date': row['stage']='in_progress'
            elif change=='environment': row['environment']='omnilodge'
            elif change=='live_website': row['stage']='live_verified'
            else: row['complete']=True
            with self.subTest(change=change),self.assertRaises(ValueError): module.build_model(data,self.plan)

    def test_future_delivery_progress_uses_data_not_notes_or_frozen_counts(self):
        data=copy.deepcopy(self.data)
        before=module.delivery_model(data)['counts']
        row=data['deliveries'][0]
        row['stage']='staging_verified';row['verifiedOn']=data['updatedOn']
        after=module.delivery_model(data)['counts']
        self.assertEqual(after['staging_verified'],before['staging_verified']+1)
        self.assertEqual(after['in_progress'],before['in_progress']-1)
        data['tickets']['C05']['note']='Every task is done!'
        self.assertEqual(module.delivery_model(data)['counts'],after)
        self.assertEqual(data['tickets']['C05']['status'],'in_progress')


if __name__=='__main__': unittest.main()
