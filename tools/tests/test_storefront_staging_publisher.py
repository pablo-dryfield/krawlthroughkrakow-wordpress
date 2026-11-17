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
    def test_exact_local_payload_is_twelve_owned_plugin_files_plus_reviewed_photos(self):
        files=module.payload()
        self.assertEqual(len(files),37)
        self.assertEqual(len(module.BASE_FILES),12)
        self.assertEqual(set(files)-set(module.BASE_FILES),set(module.image_payload.files()))
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
        for name in module.image_payload.files():
            self.assertLess(order.index(name),order.index('includes/class-ktk-storefront-public-content.php'))
        for name in module.image_payload.files()[1:]:
            self.assertLess(order.index(name),order.index('assets/storefront.js'))

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
            checkpoint=module.backup(existing,{'owned':{}})
            with zipfile.ZipFile(checkpoint) as archive:
                self.assertEqual(archive.read('ktk-storefront.php'),b'old entrypoint')
                manifest=json.loads(archive.read('release-manifest.json'))
                self.assertEqual(manifest['remoteRoot'],module.REMOTE)
                self.assertIn('includes/class-ktk-storefront-public-content.php',manifest['newFiles'])

    def test_new_image_namespace_is_prepared_before_any_file_can_be_uploaded(self):
        class FTP:
            def __init__(self):
                self.directories={module.REMOTE:{'assets':{'type':'dir'}},module.REMOTE+'/assets':{}}
                self.created=[]
            def mlsd(self,path):return list(self.directories[path].items())
            def mkd(self,path):
                parent,name=path.rsplit('/',1)
                self.directories[parent][name]={'type':'dir'};self.directories[path]={};self.created.append(path)
        ftp=FTP();expected=['assets/product-images']
        self.assertEqual(module.prepare_image_directories(ftp),expected)
        self.assertEqual(ftp.created,[module.REMOTE+'/'+name for name in expected])
        self.assertEqual(module.prepare_image_directories(ftp),[])
        self.assertEqual(ftp.directories[module.REMOTE+'/assets/product-images'],{})

    def test_image_directory_file_and_symlink_collisions_refuse_without_writes(self):
        for directory_type in ['file','OS.unix=slink','cdir']:
            for parent,name in [(module.REMOTE+'/assets','product-images')]:
                entries={module.REMOTE:[('assets',{'type':'dir'})],module.REMOTE+'/assets':[('product-images',{'type':'dir'})],parent:[(name,{'type':directory_type})]}
                class FTP:
                    def mlsd(self,path):return entries[path]
                    def mkd(self,path):raise AssertionError('No creation allowed on a colliding namespace')
                with self.subTest(directory_type=directory_type,parent=parent),self.assertRaises(RuntimeError):
                    module.prepare_image_directories(FTP())

    def test_missing_or_linked_original_assets_parent_refuses_without_creation(self):
        for entries in [[],[('assets',{'type':'file'})],[('assets',{'type':'OS.unix=slink'})]]:
            class FTP:
                def mlsd(self,path):
                    return entries
                def mkd(self,path):raise AssertionError('Existing parent required before any creation')
            with self.subTest(entries=entries),self.assertRaises(RuntimeError):
                module.prepare_image_directories(FTP())

    def test_directory_preparation_refusal_never_starts_activation_or_rollback(self):
        files={'assets/storefront.js':b'new runtime'}
        before={'owned':{module.PREFIX+'assets/storefront.js':module.sha(b'old runtime')}}
        with tempfile.TemporaryDirectory() as directory,patch.object(module,'ROOT',Path(directory)),patch.object(module,'payload',return_value=files),patch.object(module,'FILES',tuple(files)),patch.object(module,'validate_qa'),patch.object(module,'baseline_hashes',return_value=before['owned']),patch.object(module,'snapshot',return_value=before),patch.object(module.common,'StagingFTP') as ftp,patch.object(module.common.store2,'read_tree',return_value={'assets/storefront.js':b'old runtime'}),patch.object(module.common,'retrieve_file',return_value=b'old runtime'),patch.object(module,'prepare_image_directories',side_effect=RuntimeError('directory refused')),patch.object(module.base,'atomic_upload') as upload,patch.object(module,'rollback') as rollback,patch('sys.argv',['publisher','--publish','--qa-report','qa.json','--report','result.json']):
            (Path(directory)/'qa.json').write_text('{}')
            with self.assertRaisesRegex(RuntimeError,'directory refused'):module.main()
            upload.assert_not_called();rollback.assert_not_called();ftp.return_value.close.assert_called_once()
            result=json.loads((Path(directory)/'result.json').read_text())
            self.assertEqual(result['phase'],'backed-up');self.assertEqual(result['error'],'directory refused')
            with zipfile.ZipFile(Path(directory)/result['backup']) as archive:
                self.assertEqual(archive.read('assets/storefront.js'),b'old runtime')
                self.assertIsNone(archive.testzip())

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

    def test_previous_twelve_file_release_adds_only_absent_reviewed_photo_paths(self):
        expected={module.PREFIX+name:'reviewed-old-hash' for name in module.BASE_FILES}
        good={'phase':'complete','stagingOnly':True,'protectedUnchanged':True,'productionFilesUnchanged':True,'expected':expected,'after':{'owned':expected}}
        with tempfile.TemporaryDirectory() as directory:
            report=Path(directory)/'previous.json';report.write_text(json.dumps(good))
            result=module.baseline_hashes(report)
            self.assertEqual({k:v for k,v in result.items() if v is not None},expected)
            self.assertEqual({k for k,v in result.items() if v is None},{module.PREFIX+n for n in module.image_payload.files()})
            bad=copy.deepcopy(good);bad['expected'][module.PREFIX+'unknown.jpg']='hash';bad['after']['owned']=bad['expected'];report.write_text(json.dumps(bad))
            with self.assertRaises(RuntimeError):module.baseline_hashes(report)

    def test_changed_image_and_incomplete_runtime_cohort_refuse_before_connection(self):
        files=module.payload()
        for name in module.image_payload.files()[1:]:
            changed=dict(files);changed[name]=files[name]+b'changed'
            with self.subTest(name=name),self.assertRaises(ValueError):module.image_payload.validate(changed)
        changed=dict(files);manifest=json.loads(changed[module.image_payload.MANIFEST]);manifest['images'].pop(next(iter(manifest['images'])));changed[module.image_payload.MANIFEST]=json.dumps(manifest).encode()
        with self.assertRaises(ValueError):module.image_payload.validate(changed)

    def test_followup_rollback_restores_the_previously_existing_public_class(self):
        events=[];name='includes/class-ktk-storefront-public-content.php'
        with patch.object(module.base,'atomic_upload',side_effect=lambda _,target,value:events.append((target,value))),patch.object(module.base,'remove_file'):
            module.rollback(object(),{name:b'prior public class'})
        self.assertIn((module.remote_path(name),b'prior public class'),events)


if __name__=='__main__':unittest.main()
