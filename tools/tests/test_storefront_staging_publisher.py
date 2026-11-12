import copy
import importlib.util
import json
import tempfile
import unittest
import zipfile
from datetime import datetime,timedelta,timezone
from pathlib import Path
from unittest.mock import patch

SPEC=importlib.util.spec_from_file_location('public_staging_publisher',Path(__file__).resolve().parents[1]/'publish-storefront-staging.py')
module=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(module)


class PublicPublisherTests(unittest.TestCase):
    def test_exact_local_payload_is_only_twelve_owned_plugin_files(self):
        files=module.payload()
        self.assertEqual(len(files),12)
        self.assertTrue(all('/frontend/' not in name for name in files))
        for name in files: self.assertTrue(module.remote_path(name).startswith('/public_html/staging/wp-content/plugins/ktk-storefront/'))
        for bad in ['../wp-config.php','frontend/src/main.jsx','/public_html/robots.txt']:
            with self.assertRaises(ValueError):module.remote_path(bad)

    def test_dependency_order_cannot_activate_template_before_class_and_data(self):
        order=module.ordered_files()
        self.assertEqual(set(order),set(module.FILES));self.assertEqual(len(order),len(module.FILES))
        self.assertLess(order.index('includes/product-content-fallbacks.json'),order.index('includes/class-ktk-storefront.php'))
        self.assertLess(order.index('includes/class-ktk-storefront-public-content.php'),order.index('includes/class-ktk-storefront.php'))
        self.assertLess(order.index('includes/class-ktk-storefront.php'),order.index('templates/storefront.php'))

    def test_browser_proof_is_complete_fresh_and_bound_without_mutations(self):
        expected={'file':'sha'}
        good={'checkedAt':datetime.now(timezone.utc).isoformat(),'summary':{'passed':811,'total':811},'payloadChecksums':expected,'realMutations':0,'errors':[]}
        module.validate_qa(good,expected)
        for field,value in [('checkedAt',(datetime.now(timezone.utc)-timedelta(days=2)).isoformat()),('summary',{'passed':810,'total':811}),('summary',{'passed':1,'total':1}),('payloadChecksums',{}),('realMutations',1),('errors',['failure'])]:
            broken=copy.deepcopy(good);broken[field]=value
            with self.subTest(field=field),self.assertRaises(RuntimeError):module.validate_qa(broken,expected)

    def test_backup_preserves_previous_bytes_and_tracks_new_files(self):
        existing={'ktk-storefront.php':b'old entrypoint'}
        with tempfile.TemporaryDirectory() as directory,patch.object(module,'ROOT',Path(directory)):
            (Path(directory)/'deploy-backups').mkdir()
            checkpoint=module.backup(existing,{'owned':{}})
            with zipfile.ZipFile(checkpoint) as archive:
                self.assertEqual(archive.read('ktk-storefront.php'),b'old entrypoint')
                manifest=json.loads(archive.read('release-manifest.json'))
                self.assertEqual(manifest['remoteRoot'],module.REMOTE)
                self.assertIn('includes/class-ktk-storefront-public-content.php',manifest['newFiles'])

    def test_rollback_restores_dependents_before_removing_new_dependencies(self):
        events=[]
        existing={'templates/storefront.php':b'old template','includes/class-ktk-storefront.php':b'old class','ktk-storefront.php':b'old main'}
        with patch.object(module.base,'atomic_upload',side_effect=lambda _,name,value:events.append(('restore',name))),patch.object(module.base,'remove_file',side_effect=lambda _,name:events.append(('remove',name))):
            module.rollback(object(),existing)
        restored=[name for action,name in events if action=='restore']
        self.assertEqual(restored[:2],[module.remote_path('templates/storefront.php'),module.remote_path('includes/class-ktk-storefront.php')])
        self.assertTrue(all(action=='restore' for action,_ in events[:3]))
        self.assertIn(('remove',module.remote_path('includes/class-ktk-storefront-public-content.php')),events[3:])

    def test_protected_saved_state_and_production_changes_fail(self):
        before={'protected':{},'production_checksums':{},'wordpress_state_sha256':'state','blog_public':0}
        self.assertTrue(module.protected_unchanged(before,copy.deepcopy(before)))
        for field in before:
            after=copy.deepcopy(before);after[field]='changed'
            self.assertFalse(module.protected_unchanged(before,after))

    def test_followup_baseline_requires_completed_matching_staging_evidence(self):
        expected={module.PREFIX+name:'hash' for name in module.FILES}
        good={'phase':'complete','stagingOnly':True,'protectedUnchanged':True,'productionFilesUnchanged':True,'expected':expected,'after':{'owned':expected}}
        with tempfile.TemporaryDirectory() as directory:
            report=Path(directory)/'previous.json';report.write_text(json.dumps(good))
            self.assertEqual(module.baseline_hashes(report),expected)
            for field,value in [('phase','rolled-back'),('stagingOnly',False),('protectedUnchanged',False),('productionFilesUnchanged',False),('expected',{}),('after',{'owned':{}})]:
                broken=copy.deepcopy(good);broken[field]=value;report.write_text(json.dumps(broken))
                with self.subTest(field=field),self.assertRaises(RuntimeError):module.baseline_hashes(report)

    def test_followup_rollback_restores_the_previously_existing_public_class(self):
        events=[];name='includes/class-ktk-storefront-public-content.php'
        with patch.object(module.base,'atomic_upload',side_effect=lambda _,target,value:events.append((target,value))),patch.object(module.base,'remove_file'):
            module.rollback(object(),{name:b'prior public class'})
        self.assertIn((module.remote_path(name),b'prior public class'),events)


if __name__=='__main__':unittest.main()
