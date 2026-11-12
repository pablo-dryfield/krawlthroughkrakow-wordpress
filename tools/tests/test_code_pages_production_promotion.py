import copy
import importlib.util
import json
import subprocess
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('promotion', Path(__file__).resolve().parents[1] / 'promote-code-pages-production.py')
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class FTP:
    def __init__(self): self.files = {}; self.events = []
    def rename(self, source, target): self.events.append(('rename', source, target)); self.files[target] = self.files.pop(source)
    def mlsd(self, root): return [(name.split('/')[-1], {'type':'file'}) for name in self.files if name.rsplit('/',1)[0] == root]


class PromotionTests(unittest.TestCase):
    def setUp(self):
        self.manifest = module.pages.validate_full_registry(module.pages.registry_data())
        self.files = {module.pages.RENDERER: b'renderer', module.pages.ASSETS + '/runtime.css': b'css'}
        self.expected = {name: module.sha(value) for name, value in self.files.items()}
        options = {'home':module.URL.rstrip('/'),'siteurl':module.URL.rstrip('/'),'show_on_front':'page','page_on_front':278}
        self.before = {'home_url':module.URL,'site_url':module.URL,'content_url':module.URL+'wp-content/','environment':'production','blog_public':1,
                       'production_enabled':False,'staging_checksums':self.expected,'owned_checksums':{},'state_sha256':'stable',
                       'state':{'front_page':{'ID':278,'post_type':'page','post_status':'publish'},'options':options},'identities':{},'origin_cache_cleared':False}
        for row in self.manifest['routes']:
            if row.get('postId') and row['kind'] in ('page','blog post'):
                self.before['identities'][str(row['postId'])] = {'status':'publish','type':row['kind'],'permalink':module.URL.rstrip('/')+row['route']}

    def test_production_paths_only_owned(self):
        for name in [module.ACTIVATION,module.pages.RENDERER,module.pages.ASSETS+'/runtime.css']:
            self.assertTrue(module.production_path(name).startswith(module.REMOTE+'/'))
        for name in ['../wp-config.php','ktk-homepage-shortcode.php','ktk-code-pages-assets/../private','ktk-code-pages-production.php/../x']:
            with self.subTest(name=name), self.assertRaises(ValueError): module.production_path(name)

    def approved_evidence(self):
        now = datetime.now(timezone.utc)
        publish = {'phase':'complete', 'all_remote_owned_checksums_match':True,
                   'local_checksums':self.expected, 'finished_at':(now-timedelta(minutes=2)).isoformat()}
        evidence = {'summary':{'passed':5500,'total':5500,'routes':116,'assets':119},
                    'checkedAt':(now-timedelta(minutes=1)).isoformat(),
                    'responses':[{'cfCacheStatus':'HIT'} for _ in range(348)]}
        seo = {'errors':[], 'routes':[{} for _ in range(116)], 'checkedAt':now.isoformat()}
        def read(relative):
            if relative.endswith('staging-pages-publish.json'): return publish
            if relative.endswith('production-seo-baseline.json'): return seo
            return evidence
        return read, publish, evidence, seo

    def test_approved_payload_requires_matching_fresh_evidence(self):
        read, _, _, _ = self.approved_evidence()
        with patch.object(module.pages,'local_payload',return_value=self.files), patch.object(module,'report_data',side_effect=read):
            self.assertEqual(module.approved_payload(),self.files)

    def test_approved_payload_rejects_changed_or_unverified_release(self):
        for field, value in [('local_checksums',{}), ('all_remote_owned_checksums_match',False), ('phase','partial')]:
            read, publish, _, _ = self.approved_evidence()
            publish[field] = value
            with self.subTest(field=field), patch.object(module.pages,'local_payload',return_value=self.files), patch.object(module,'report_data',side_effect=read):
                with self.assertRaises(RuntimeError): module.approved_payload()

    def test_approved_payload_rejects_stale_seo_and_cache_failures(self):
        for failure in ['stale-seo','failed-check','old-check','stale-cache','missing-device']:
            read, publish, evidence, seo = self.approved_evidence()
            if failure == 'stale-seo': seo['checkedAt'] = (datetime.now(timezone.utc)-timedelta(days=2)).isoformat()
            elif failure == 'failed-check': evidence['summary']['passed'] -= 1
            elif failure == 'old-check': evidence['checkedAt'] = publish['finished_at']
            elif failure == 'stale-cache': evidence['responses'][0]['cfCacheStatus'] = 'MISS'
            else: evidence['responses'].pop()
            with self.subTest(failure=failure), patch.object(module.pages,'local_payload',return_value=self.files), patch.object(module,'report_data',side_effect=read):
                with self.assertRaises(RuntimeError): module.approved_payload()

    def test_helper_auth_host_expiry_and_no_database_mutations(self):
        source = module.snapshot_helper('a'*32,self.manifest,True)
        for required in [b'HTTP_X_KTK_DEPLOY_TOKEN',b'hash_equals',b'time() >',b"home_url('/') !== 'https://krawlthroughkrakow.com/'",b'rocket_clean_files',b'get_post_meta',b'staging_checksums']:
            self.assertIn(required,source)
        for forbidden in [b'update_option',b'wp_update_post',b'wp_insert_post',b'rocket_clean_domain',b'rocket_clean_home']:
            self.assertNotIn(forbidden,source)
        self.assertIn(b'return (object) $owned',source)
        result = subprocess.run(['php','-l'],input=source,capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)

    def test_identity_and_staging_guards(self):
        module.validate_snapshot(self.before,self.manifest,self.expected,False)
        for mutate in [lambda v:v.update(blog_public=0),lambda v:v.update(production_enabled=True),lambda v:v.update(staging_checksums={}),lambda v:v['identities'].clear()]:
            value=copy.deepcopy(self.before); mutate(value)
            with self.assertRaises(RuntimeError): module.validate_snapshot(value,self.manifest,self.expected,False)

    def test_backup_round_trip_preserves_state(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(module,'ROOT',Path(directory)):
            backup=module.backup(self.files,self.before,[*self.files,module.ACTIVATION])
            import zipfile
            with zipfile.ZipFile(backup) as archive:
                data=json.loads(archive.read('release-manifest.json'))
                self.assertEqual(data['new_files'],[module.ACTIVATION])
                self.assertFalse(data['database_mutated'])
                self.assertEqual(archive.read(module.pages.RENDERER),b'renderer')

    def test_activation_source_only_defines_flag(self):
        self.assertIn(b"define('KTK_CODE_PAGES_PRODUCTION_ENABLED', true)",module.ACTIVATION_SOURCE)
        self.assertNotIn(b'update_option',module.ACTIVATION_SOURCE)

    def test_copy_helper_lints_and_excludes_activation(self):
        source=module.copy_helper('a'*32,self.expected)
        result=subprocess.run(['php','-l'],input=source,capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)
        for text in [b'production_must_be_disabled',b'hash_file',b'is_link',b'tempnam',b'rename($temporary,$target)',b"$name === 'ktk-code-pages.php' ? 2",b'HTTP_X_KTK_DEPLOY_TOKEN']:
            self.assertIn(text,source)
        with self.assertRaises(ValueError): module.copy_helper('a'*32,{module.ACTIVATION:'a'*64})

    def test_server_copy_result_requires_every_checksum(self):
        with patch.object(module.home,'transient_helper',return_value={'checksums':{},'copied':2,'skipped':0,'activation_enabled':False}),self.assertRaises(RuntimeError):
            module.publish_dependencies(FTP(),self.files,{})

    def execute_copy(self,corrupt=False,enabled=False):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); target=root/'wp-content/mu-plugins'; source=root/'staging/wp-content/mu-plugins'
            target.mkdir(parents=True); source.mkdir(parents=True)
            for name,value in self.files.items():
                file=source/name; file.parent.mkdir(parents=True,exist_ok=True); file.write_bytes(value)
            if corrupt: (source/module.pages.RENDERER).write_bytes(b'corrupt')
            prefix="<?php define('ABSPATH',true); $_SERVER['HTTP_HOST']='krawlthroughkrakow.com'; function home_url($p){return 'https://krawlthroughkrakow.com/';} function site_url($p){return home_url($p);} function nocache_headers(){} function add_action($name,$cb,$priority){$cb();} function wp_send_json($value,$status=200){echo json_encode($value); exit;} "
            if enabled: prefix+="define('KTK_CODE_PAGES_PRODUCTION_ENABLED',true); "
            prefix+="$_SERVER['HTTP_X_KTK_DEPLOY_TOKEN']='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; "
            program=module.copy_helper('a'*32,self.expected).decode().replace('<?php',prefix,1).replace('__DIR__',"'"+target.as_posix()+"'")
            result=subprocess.run(['php'],input=program.encode(),capture_output=True)
            if corrupt:
                self.assertNotEqual(result.returncode,0)
                self.assertFalse(any(target.rglob('*')))
            elif enabled:
                self.assertEqual(json.loads(result.stdout)['error'],'production_must_be_disabled')
                self.assertFalse(any(target.rglob('*')))
            else:
                self.assertEqual(result.returncode,0,result.stderr)
                data=json.loads(result.stdout); self.assertEqual(data['checksums'],self.expected)
                for name,value in self.files.items(): self.assertEqual((target/name).read_bytes(),value)
                self.assertFalse(list(target.rglob('.ktk-content-*')))

    def test_server_copy_real_files_and_cleanup(self): self.execute_copy()
    def test_server_copy_rejects_corrupt_source_before_writing(self): self.execute_copy(corrupt=True)
    def test_server_copy_rejects_enabled_production_before_writing(self): self.execute_copy(enabled=True)

    def test_activation_rollback_does_not_delete_payload(self):
        ftp=FTP(); ftp.files[module.production_path(module.ACTIVATION)]=module.ACTIVATION_SOURCE
        with patch.object(module.common,'retrieve_file',side_effect=lambda ftp,path:ftp.files.get(path)):
            module.disable_activation(ftp)
        self.assertNotIn(module.production_path(module.ACTIVATION),ftp.files)
        self.assertEqual(len(ftp.events),1)
        self.assertIn('.disabled-',next(iter(ftp.files)))

    def test_unknown_activation_never_renamed(self):
        ftp=FTP()
        with patch.object(module.common,'retrieve_file',return_value=b'unknown'), self.assertRaises(RuntimeError): module.disable_activation(ftp)
        self.assertFalse(ftp.events)

    def run_promotion(self,fail_final=False):
        events=[]; ftp=FTP(); prepared=copy.deepcopy(self.before); prepared['owned_checksums']=self.expected
        after=copy.deepcopy(prepared); after.update(production_enabled=True,origin_cache_cleared=True)
        after['owned_checksums']={**self.expected,module.ACTIVATION:module.sha(module.ACTIVATION_SOURCE)}
        if fail_final: after['state_sha256']='unexpected'
        def atomic(ftp,path,value): events.append(('activation',path)); ftp.files[path]=value
        def dependencies(*args): events.append(('dependencies',None)); return self.expected
        def homepage(*args): events.append(('homepage',None)); return {'phase':'complete'}
        snapshots=[self.before,prepared,prepared,after]
        if fail_final: snapshots.append(prepared)
        with tempfile.TemporaryDirectory(dir=module.ROOT) as directory:
            destination=Path(directory)/'publish.json'
            with patch.object(module,'snapshot',side_effect=snapshots),patch.object(module,'owned_files',return_value={}),patch.object(module,'backup',return_value=Path(directory)/'backup.zip'),patch.object(module,'sha',side_effect=lambda value:hashlib_sha(value)),patch.object(module,'publish_dependencies',side_effect=dependencies),patch.object(module.home,'promote',side_effect=homepage),patch.object(module.common,'retrieve_file',side_effect=lambda ftp,path:ftp.files.get(path)),patch.object(module.common,'replace_renderer_atomically',side_effect=atomic),patch.object(Path,'read_bytes',return_value=b'backup'):
                if fail_final:
                    with self.assertRaises(RuntimeError): module.promote(ftp,self.files,True,destination)
                    report=json.loads(destination.read_text())
                    self.assertTrue(report['activation_rolled_back'])
                    self.assertNotIn(module.production_path(module.ACTIVATION),ftp.files)
                else:
                    report=module.promote(ftp,self.files,True,destination)
                    self.assertEqual(report['phase'],'complete')
                    self.assertTrue(report['wordpress_state_unchanged'])
        self.assertEqual([event[0] for event in events],['dependencies','homepage','activation'])

    def test_dependencies_and_homepage_verified_before_activation(self): self.run_promotion()
    def test_failure_after_activation_rolls_back_first(self): self.run_promotion(True)


def hashlib_sha(value):
    import hashlib
    return hashlib.sha256(value).hexdigest()


if __name__ == '__main__': unittest.main()
