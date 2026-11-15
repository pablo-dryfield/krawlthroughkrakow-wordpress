import copy
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest import mock
import zipfile

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('ktk_state_snapshot_test', ROOT / 'tools/snapshot-staging-update-state.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
PHP = shutil.which('php')
NAME = 'ktk-state-snapshot-' + 'a' * 32 + '.php'
TOKEN = 'b' * 43

DRIVER = r'''<?php
$c=json_decode(file_get_contents($argv[1]),true,512,JSON_THROW_ON_ERROR);
define('ABSPATH',$c['stage'].'/'); define('WP_CONTENT_DIR',$c['stage'].'/wp-content'); define('ARRAY_A','ARRAY_A');
$_SERVER['HTTP_X_KTK_SNAPSHOT_TOKEN']=$c['token']; $_SERVER['HTTP_HOST']=$c['host']; $_SERVER['REQUEST_METHOD']=$c['method'];
function add_action($hook,$callback,$priority){$GLOBALS['snapshot_callback']=$callback;}
function nocache_headers(){}
function home_url($path){return $GLOBALS['c']['home'];}
function site_url($path){return $GLOBALS['c']['siteurl'];}
function get_option($name){return $name==='blog_public'?$GLOBALS['c']['public']:278;}
function wp_get_environment_type(){return 'production';}
function wp_send_json($value,$status=200){echo json_encode(array('status'=>$status,'body'=>$value,'queries'=>$GLOBALS['wpdb']->queries),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;}
class FixtureDB {
 public $posts='fixture_posts',$postmeta='fixture_postmeta',$options='fixture_options',$terms='fixture_terms',$term_taxonomy='fixture_term_taxonomy',$term_relationships='fixture_term_relationships',$termmeta='fixture_termmeta',$last_error='',$queries=array();
 public function get_results($query,$format){
  $this->queries[]=$query;
  if($GLOBALS['c']['dbError']){$this->last_error='private diagnostic must not be disclosed';return null;}
  preg_match('/^SELECT \* FROM ([A-Za-z0-9_]+)/',$query,$match);$table=substr($match[1]??'',8);
  return $GLOBALS['c']['rows'][$table]??array();
 }
}
$GLOBALS['c']=$c;$wpdb=new FixtureDB();if($c['unsafeTable']){$wpdb->posts='bad; DELETE';}
require $c['helper'];($GLOBALS['snapshot_callback'])();echo json_encode(array('noSnapshot'=>true,'queries'=>$wpdb->queries));
'''


@unittest.skipUnless(PHP, 'PHP is required for authenticated snapshot fixtures')
class SnapshotPHPTests(unittest.TestCase):
    def fixture(self, mutate=None, expired=False, symlink=False):
        with tempfile.TemporaryDirectory(prefix='ktk-state-snapshot-') as directory:
            root = Path(directory); stage = root / 'public_html/staging'; mu = stage / 'wp-content/mu-plugins'
            store = stage / 'wp-content/plugins/ktk-storefront'
            mu.mkdir(parents=True); store.mkdir(parents=True)
            files = {'ktk-code-pages.php': b'original renderer', 'ktk-code-pages-assets/registry.php': b'original registry',
                     'ktk-homepage-shortcode.php': b'original homepage', 'ktk-homepage-assets/hero.svg': b'original artwork'}
            for name, data in files.items():
                p = mu / name; p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(data)
            (store / 'ktk-storefront.php').write_bytes(b'commerce unchanged')
            expiry = int(time.time()) + 500
            source = module.helper_source(NAME, TOKEN, expiry)
            if expired:
                source = source.replace(str(expiry).encode(), b'1')
            helper = mu / NAME; helper.write_bytes(source)
            config = {'stage': str(stage), 'helper': str(helper), 'token': TOKEN, 'host': 'krawlthroughkrakow.com', 'method': 'POST',
                      'home': module.URL, 'siteurl': module.URL, 'public': 0, 'dbError': False, 'unsafeTable': False,
                      'rows': {'posts': [{'ID': '278', 'post_content': 'Kraków   unchanged', 'post_type': 'page'}],
                               'postmeta': [{'meta_id': '1', 'post_id': '278', 'meta_key': '_source', 'meta_value': 'saved'}],
                               'options': [{'option_name': 'home', 'option_value': module.URL.rstrip('/')}, {'option_name': 'siteurl', 'option_value': module.URL.rstrip('/')}, {'option_name': 'blog_public', 'option_value': '0'}],
                               'terms': [], 'term_taxonomy': [], 'term_relationships': [], 'termmeta': []}}
            if mutate: mutate(config, mu, store)
            if symlink:
                link = mu / 'unexpected-link'; link.symlink_to(store, target_is_directory=True)
            before = {p.relative_to(root).as_posix(): p.read_bytes() for p in root.rglob('*') if p.is_file() and not p.is_symlink()}
            path = root / 'config.json'; path.write_bytes(module.encode(config))
            driver = root / 'driver.php'; driver.write_bytes(DRIVER.encode())
            result = subprocess.run([PHP, str(driver), str(path)], capture_output=True, check=True)
            output = json.loads(result.stdout)
            for name, data in before.items(): self.assertEqual((root / name).read_bytes(), data)
            return output, source

    def test_complete_staging_snapshot_round_trips_unicode_hashes_and_keeps_all_files(self):
        output, source = self.fixture()
        self.assertEqual(output['status'], 200)
        module.validate_snapshot(output['body'], module.sha(source))
        self.assertEqual(len(output['queries']), 7)
        self.assertTrue(all(q.startswith('SELECT ') for q in output['queries']))
        self.assertEqual(output['body']['rowCounts']['posts'], 1)
        self.assertEqual(len(output['body']['ownedContentFiles']), 2)
        self.assertTrue(all(not any(word in q for word in ('users', 'comments', 'orders', 'payments')) for q in output['queries']))

    def test_missing_or_wrong_authentication_reads_no_database(self):
        for token in ('', 'x' * 43):
            output, _ = self.fixture(lambda c, *_: c.update(token=token))
            self.assertTrue(output['noSnapshot']); self.assertEqual(output['queries'], [])

    def test_expired_helper_reads_no_database(self):
        output, _ = self.fixture(expired=True)
        self.assertTrue(output['noSnapshot']); self.assertEqual(output['queries'], [])

    def test_wrong_site_method_host_and_indexing_stop_before_queries(self):
        for change in ({'home': 'https://krawlthroughkrakow.com/'}, {'siteurl': 'https://example.invalid/staging/'}, {'host': 'other.invalid'}, {'method': 'GET'}, {'public': 1}):
            output, _ = self.fixture(lambda c, *_, change=change: c.update(change))
            self.assertEqual(output['status'], 403); self.assertEqual(output['queries'], [])

    def test_raw_saved_identity_mismatch_is_not_hidden_by_wordpress_filters(self):
        output, _ = self.fixture(lambda c, *_: c['rows']['options'][0].update(option_value='https://krawlthroughkrakow.com'))
        self.assertEqual(output['status'], 409)
        self.assertEqual(output['body'], {'error': 'protected_snapshot_failed'})

    def test_query_failure_discloses_no_private_diagnostic(self):
        output, _ = self.fixture(lambda c, *_: c.update(dbError=True))
        self.assertEqual(output['status'], 409)
        self.assertNotIn('private diagnostic', json.dumps(output['body']))

    def test_unsafe_table_stops_before_any_query(self):
        output, _ = self.fixture(lambda c, *_: c.update(unsafeTable=True))
        self.assertEqual(output['status'], 409); self.assertEqual(output['queries'], [])

    def test_missing_homepage_or_commerce_root_fails_closed(self):
        for mutation in (lambda c, mu, store: (mu / 'ktk-homepage-shortcode.php').unlink(), lambda c, mu, store: shutil.rmtree(store)):
            output, _ = self.fixture(mutation)
            self.assertEqual(output['status'], 409)

    @unittest.skipIf(sys.platform == 'win32', 'Windows account cannot create these symlinks; Linux CI covers this case')
    def test_symlink_in_protected_tree_is_rejected(self):
        output, _ = self.fixture(symlink=True)
        self.assertEqual(output['status'], 409)


class SnapshotClientTests(unittest.TestCase):
    def value(self, source_sha='a'*64):
        value={'schemaVersion':1,'scope':'staging-protected-original-state','helperSha256':source_sha,
               'identity':{'home':module.URL,'siteurl':module.URL,'blogPublic':0},
               'database':{name:[] for name in ('posts','postmeta','options','terms','term_taxonomy','term_relationships','termmeta')},
               'protectedFiles':{'mu/home.php':'b'*64},'ownedContentFiles':{'ktk-code-pages.php':'c'*64},
               'databaseWrites':0,'applicationWrites':0,'cachePurges':0}
        value['database']['posts']=[{'ID':'1','post_content':'private fixture'}]
        value['database']['options']=[{'option_name':'home','option_value':module.URL.rstrip('/')}]
        value['rowCounts']={name:len(rows) for name,rows in value['database'].items()}
        value['databaseSha256']=module.sha(module.encode(value['database']))
        value['protectedStateSha256']=module.sha(module.encode({'identity':value['identity'],'databaseSha256':value['databaseSha256'],'files':value['protectedFiles']}))
        return value

    def test_helper_contains_only_token_hash_and_bounded_expiry(self):
        source = module.helper_source(NAME, TOKEN, int(time.time()) + 500)
        self.assertNotIn(TOKEN.encode(), source); self.assertIn(module.sha(TOKEN.encode()).encode(), source)
        for name, token, expiry in (('../bad.php', TOKEN, int(time.time())+500), (NAME, 'bad', int(time.time())+500), (NAME, TOKEN, int(time.time())-1), (NAME, TOKEN, int(time.time())+1000)):
            with self.assertRaises(ValueError): module.helper_source(name, token, expiry)

    def test_adapter_rejects_production_and_unowned_mutations_before_delegation(self):
        raw = mock.Mock(); ftp = module.TemporaryHelperFTP(raw, NAME)
        for target in ('/public_html/wp-content/mu-plugins/'+NAME, module.REMOTE+'/ktk-code-pages.php', ftp.path+'/../other.php', ftp.path+'.tmp'):
            for method, args in ((ftp.storbinary, ('STOR '+target, io.BytesIO(b'fixture'))), (ftp.delete, (target,)), (ftp.retrbinary, ('RETR '+target, lambda _: None))):
                with self.assertRaises(ValueError): method(*args)
        self.assertEqual(raw.mock_calls, [])
        temporary=ftp.path+'.upload-'+('a'*16)+'.tmp'
        ftp.storbinary('STOR '+temporary, io.BytesIO(b'fixture')); ftp.rename(temporary, ftp.path); ftp.delete(ftp.path)
        self.assertEqual(len(raw.mock_calls), 3)

    def test_redirect_is_refused_without_forwarding_authentication(self):
        with self.assertRaises(ValueError): module.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.invalid/')

    def test_default_cli_never_loads_transport(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'docs/seo', prefix='state-offline-fixture-') as directory:
            report=Path(directory)/'report.json'
            with mock.patch.object(module, 'load_common', side_effect=AssertionError('No transport')), mock.patch.object(sys,'argv',['snapshot','--report',str(report)]):
                module.main()
            self.assertEqual(json.loads(report.read_bytes())['phase'], 'offline-validated')

    def test_private_archive_has_exact_full_records_manifest_and_crc(self):
        with tempfile.TemporaryDirectory() as directory:
            raw={'database':{'private-fixture':'not for public reports'}}
            receipt=module.write_private_backup(directory, raw, raw, 'a'*64)
            with zipfile.ZipFile(receipt['path']) as archive:
                self.assertIsNone(archive.testzip()); self.assertEqual(json.loads(archive.read('before.json')), raw)
                manifest=json.loads(archive.read('manifest.json'))
                self.assertEqual(manifest['files']['before.json'], module.sha(archive.read('before.json')))
            self.assertEqual(receipt['entries'],3)

    def test_mutated_or_incomplete_snapshot_is_rejected(self):
        value=self.value(); module.validate_snapshot(value,'a'*64)
        changes=[lambda v:v.update(helperSha256='d'*64),lambda v:v['database']['posts'][0].update(post_content='changed'),
                 lambda v:v['database'].pop('termmeta'),lambda v:v['rowCounts'].update(posts=99),lambda v:v.update(databaseWrites=1),
                 lambda v:v['protectedFiles'].update({'mu/home.php':'d'*64}),lambda v:v['identity'].update(home='https://krawlthroughkrakow.com/')]
        for change in changes:
            candidate=copy.deepcopy(value);change(candidate)
            with self.assertRaises(ValueError):module.validate_snapshot(candidate,'a'*64)
        candidate=copy.deepcopy(value);candidate['database']['posts'][0]['post_content']='changed'
        self.assertFalse(module.same_state(value,candidate))

    def test_client_requires_exact_uncached_response_and_uses_post(self):
        value=self.value()
        def response(status=200,cache='DYNAMIC',control='private, no-store',url=None):
            obj=mock.MagicMock();obj.status=status
            obj.headers={'CF-Cache-Status':cache,'Cache-Control':control,'Content-Type':'application/json'}
            obj.geturl.return_value=url or (module.URL+'?ktk_protected_snapshot='+('f'*32));obj.read.return_value=module.encode(value)
            obj.__enter__.return_value=obj;return obj
        with mock.patch.object(module.secrets,'token_hex',return_value='f'*32):
            opener=mock.Mock();opener.open.return_value=response()
            self.assertEqual(module.fetch_snapshot(TOKEN,'a'*64,opener),value)
            request=opener.open.call_args.args[0]
            self.assertEqual(request.method,'POST');self.assertEqual(request.data,b'{}')
            for changed in (response(status=403),response(cache='HIT'),response(control='public'),response(url='https://other.invalid/')):
                opener.open.return_value=changed
                with self.assertRaises(RuntimeError):module.fetch_snapshot(TOKEN,'a'*64,opener)

    def main_fixture(self, mode):
        with tempfile.TemporaryDirectory(dir=ROOT/'docs/seo',prefix='state-client-fixture-') as directory:
            destination=Path(directory)/'report.json';path=module.REMOTE+'/'+NAME
            files={path:b'preexisting foreign helper'} if mode=='collision' else {}
            deleted=[];connection=mock.Mock()
            def retrieve(ftp,name):return files.get(name)
            def upload(ftp,name,data):files[name]=data
            def remove(ftp,name):
                if mode=='cleanup-error':raise OSError('fixture removal failure')
                deleted.append(name);files.pop(name,None)
            counter=0
            def fetch(token,source_sha):
                nonlocal counter
                counter+=1
                if mode=='snapshot-error':raise RuntimeError('fixture snapshot failure')
                if mode=='changed-helper' and counter==2:files[path]=b'changed foreign helper'
                return self.value(source_sha)
            common=SimpleNamespace(common=SimpleNamespace(StagingFTP=lambda:connection,retrieve_file=retrieve),atomic_upload=upload,remove_file=remove)
            argv=['snapshot','--snapshot-staging','--report',str(destination)]
            with contextlib.redirect_stdout(io.StringIO()),mock.patch.object(module,'load_common',return_value=common),mock.patch.object(module,'local_owned_checksums',return_value=self.value()['ownedContentFiles']),mock.patch.object(module,'fetch_snapshot',side_effect=fetch),mock.patch.object(module,'write_private_backup',return_value={'fixture':True}),mock.patch.object(module.secrets,'token_hex',return_value='a'*32),mock.patch.object(sys,'argv',argv):
                if mode=='success':module.main()
                else:
                    with self.assertRaises((RuntimeError,OSError)):module.main()
            return json.loads(destination.read_bytes()),files,deleted,connection

    def test_actual_client_success_removes_only_owned_helper_and_records_complete(self):
        report,files,deleted,connection=self.main_fixture('success')
        self.assertEqual(report['phase'],'complete');self.assertTrue(report['helperRemoved'])
        self.assertEqual(files,{});self.assertEqual(len(deleted),1);connection.close.assert_called_once()

    def test_preexisting_helper_collision_is_preserved(self):
        report,files,deleted,_=self.main_fixture('collision')
        self.assertEqual(report['phase'],'snapshot-failed');self.assertFalse(report['helperInstallationAttempted'])
        self.assertEqual(len(files),1);self.assertEqual(deleted,[])

    def test_snapshot_failure_still_removes_its_helper_and_records_failure(self):
        report,files,_,_=self.main_fixture('snapshot-error')
        self.assertEqual(report['phase'],'snapshot-failed');self.assertTrue(report['helperRemoved']);self.assertEqual(files,{})

    def test_changed_helper_is_preserved_and_cleanup_failure_is_explicit(self):
        for mode in ('changed-helper','cleanup-error'):
            report,files,deleted,_=self.main_fixture(mode)
            self.assertEqual(report['phase'],'helper-cleanup-failed');self.assertFalse(report['helperRemoved']);self.assertEqual(len(files),1)
            self.assertEqual(deleted,[])


if __name__=='__main__': unittest.main()
