"""Authenticated controller executes the real shared capture and private fixture with mock WordPress data."""
import base64
import contextlib
import ftplib
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import unittest
from unittest import mock
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('ktk_host_rehearsal_test', ROOT / 'tools/rehearse-staging-private-transaction.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
PHP = shutil.which('php')
NAME = 'ktk-transaction-rehearsal-' + 'a' * 32 + '.php'
TOKEN = 'b' * 43

DRIVER = r'''<?php
$c=json_decode(file_get_contents($argv[1]),true,512,JSON_THROW_ON_ERROR);$GLOBALS['c']=$c;
define('ABSPATH',$c['stage'].'/');define('WP_CONTENT_DIR',$c['stage'].'/wp-content');define('ARRAY_A','ARRAY_A');
$_SERVER['HTTP_X_KTK_REHEARSAL_TOKEN']=$c['token'];$_SERVER['HTTP_HOST']=$c['host'];$_SERVER['REQUEST_METHOD']=$c['method'];
function add_action($hook,$callback,$priority){$GLOBALS['callback']=$callback;}function nocache_headers(){}
function home_url($path){return $GLOBALS['c']['home'];}function site_url($path){return $GLOBALS['c']['siteurl'];}
function get_option($name){return $name==='blog_public'?$GLOBALS['c']['public']:278;}function wp_get_environment_type(){return 'production';}
function wp_send_json($body,$status=200){echo json_encode(array('status'=>$status,'body'=>$body,'queries'=>$GLOBALS['wpdb']->queries),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;}
class FixtureDB{public $posts='fixture_posts',$postmeta='fixture_postmeta',$options='fixture_options',$terms='fixture_terms',$term_taxonomy='fixture_term_taxonomy',$term_relationships='fixture_term_relationships',$termmeta='fixture_termmeta',$last_error='',$queries=array();
 public function get_results($q,$format){$this->queries[]=$q;preg_match('/^SELECT \* FROM ([A-Za-z0-9_]+)/',$q,$m);return $GLOBALS['c']['rows'][substr($m[1]??'',8)]??array();}}
class FixtureInput{public $context;private $position=0;public function stream_open($path,$mode,$options,&$opened){return $path==='php://input';}
 public function stream_read($count){$s=substr($GLOBALS['c']['body'],$this->position,$count);$this->position+=strlen($s);return $s;}
 public function stream_eof(){return $this->position>=strlen($GLOBALS['c']['body']);}public function stream_stat(){return array();}}
$wpdb=new FixtureDB();stream_wrapper_unregister('php');stream_wrapper_register('php',FixtureInput::class);
require $c['helper'];($GLOBALS['callback'])();echo json_encode(array('noRehearsal'=>true,'queries'=>$wpdb->queries));
'''


@unittest.skipUnless(PHP, 'PHP is required for isolated authenticated host fixtures')
class HostControllerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ktk-host-controller-'); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); self.stage = self.root / 'public_html/staging'; self.mu = self.stage / 'wp-content/mu-plugins'
        self.store = self.stage / 'wp-content/plugins/ktk-storefront'; self.mu.mkdir(parents=True); self.store.mkdir(parents=True)
        files = {'ktk-code-pages.php': b'original public renderer', 'ktk-code-pages-assets/registry.php': b'original public registry',
                 'ktk-homepage-shortcode.php': b'original public homepage', 'ktk-homepage-assets/hero.svg': b'original artwork'}
        for n,b in files.items():
            p=self.mu/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
        (self.store/'ktk-storefront.php').write_bytes(b'commerce unchanged')
        self.owned = {n:module.sha(b) for n,b in sorted(files.items()) if n=='ktk-code-pages.php' or n.startswith('ktk-code-pages-assets/')}
        self.expiry=int(time.time())+600;self.source=module.helper_source(NAME,TOKEN,self.expiry,'c'*40,self.owned)
        self.helper=self.mu/NAME;self.helper.write_bytes(self.source)
        self.config={'stage':str(self.stage),'helper':str(self.helper),'token':TOKEN,'host':'krawlthroughkrakow.com','method':'POST',
                     'home':module.URL,'siteurl':module.URL,'public':0,'body':'{}','rows':{'posts':[{'ID':'278','post_type':'page','post_content':'Kraków unchanged'}],
                     'postmeta':[{'meta_id':'1','post_id':'278','meta_key':'saved','meta_value':'unchanged'}],
                     'options':[{'option_name':'home','option_value':module.URL.rstrip('/')},{'option_name':'siteurl','option_value':module.URL.rstrip('/')},{'option_name':'blog_public','option_value':'0'}],
                     'terms':[],'term_taxonomy':[],'term_relationships':[],'termmeta':[]}}
        self.driver=self.root/'driver.php';self.driver.write_bytes(DRIVER.encode());self.path=self.root/'request.json'
        self.private=self.root/('.ktk-staging-rehearsal-'+'a'*32);self.before=self.tree()

    def tree(self):
        return {p.relative_to(self.stage).as_posix():p.read_bytes() for p in self.stage.rglob('*') if p.is_file()}

    def call(self,action=None,body=None,interrupt=False,extra=None):
        value={'action':action}
        if extra:value.update(extra)
        self.config['body']=body if body is not None else module.encode(value).decode()
        self.path.write_bytes(module.encode(self.config))
        r=subprocess.run([PHP,str(self.driver),str(self.path)],capture_output=True,timeout=30)
        self.assertEqual(r.returncode,73 if interrupt else 0,r.stdout+r.stderr)
        self.assertEqual(self.tree(),self.before)
        return None if interrupt else json.loads(r.stdout)

    def test_missing_auth_and_expiry_do_not_query_or_create_private_files(self):
        self.config['token']='wrong'
        result=self.call('prepare');self.assertTrue(result['noRehearsal']);self.assertFalse(result['queries']);self.assertFalse(self.private.exists())
        self.config['token']=TOKEN;self.helper.write_bytes(self.source.replace(str(self.expiry).encode(),b'1'));self.before=self.tree()
        result=self.call('prepare');self.assertTrue(result['noRehearsal']);self.assertFalse(result['queries']);self.assertFalse(self.private.exists())

    def test_wrong_method_host_site_or_indexing_stop_before_queries(self):
        for key,value in [('method','GET'),('host','example.com'),('home','https://krawlthroughkrakow.com/'),('siteurl','https://krawlthroughkrakow.com/'),('public',1)]:
            old=self.config[key];self.config[key]=value
            result=self.call('prepare');self.assertEqual(result['status'],403);self.assertFalse(result['queries']);self.assertFalse(self.private.exists())
            self.config[key]=old

    def test_unknown_duplicate_noncanonical_or_extra_fields_are_rejected(self):
        for raw in ['{}','[]','{"action":"other"}','{"action":"prepare","path":"/public_html"}','{"action":"prepare","action":"prepare"}','{ "action":"prepare"}']:
            result=self.call(body=raw);self.assertEqual(result['status'],400);self.assertFalse(result['queries']);self.assertFalse(self.private.exists())

    def test_actual_authenticated_private_transport_recovery_archive_and_closure(self):
        baseline=self.call('prepare');self.assertEqual(baseline['status'],200);self.assertEqual(baseline['body']['status']['phase'],'prepared')
        self.call('interrupt',interrupt=True)
        result=self.call('inspect');self.assertEqual(result['body']['status']['phase'],'applying');self.assertEqual(len(result['body']['status']['intentFiles']),1)
        for _ in range(4):self.assertEqual(self.call('apply')['status'],200)
        for _ in range(5):self.assertEqual(self.call('rollback')['status'],200)
        exported=self.call('export')['body']
        with mock.patch.object(module,'ROOT',self.root):
            receipt=module.write_archive(self.root/'deploy-backups',exported,module.sha(self.source),self.owned,'a'*32)
        self.assertTrue(receipt['zipCRC'] and receipt['allMemberBytesVerified'])
        cleaned=self.call('cleanup',extra={'exportSha256':receipt['serverExportSha256'],'archiveSha256':receipt['sha256']})
        self.assertEqual(cleaned['status'],200)
        closed=self.call('inspect')['body'];self.assertEqual(closed['status']['phase'],'closed')
        self.assertEqual(set(closed['status']['retainedPrivateFiles']),{'lifecycle.lock','closed.json'})
        self.assertEqual(closed['realProtectedStateSha256'],baseline['body']['realProtectedStateSha256'])
        self.assertEqual(closed['rowCounts'],baseline['body']['rowCounts'])
        self.assertEqual(len([p for p in self.private.rglob('*') if p.is_file()]),2)
        self.assertTrue(all(q.startswith('SELECT ') and not any(k in q for k in ['users','orders','payments','comments']) for q in baseline['queries']))

    def test_private_collision_error_reveals_no_path_and_preserves_bytes(self):
        self.private.write_bytes(b'foreign collision')
        result=self.call('prepare');self.assertEqual(result['status'],409);self.assertEqual(result['body'],{'error':'private_staging_fixture_failed'})
        self.assertNotIn(str(self.root),json.dumps(result['body']));self.assertEqual(self.private.read_bytes(),b'foreign collision')

    def client_main(self, failure=None):
        controller=self;remote=module.REMOTE+'/'+NAME;events=[]
        class FTP:
            def __init__(self):self.files={};self.deleted=[];self.closed=False
            def retrbinary(self,command,callback):
                path=command[5:]
                if path not in self.files:raise ftplib.error_perm('550 absent')
                callback(self.files[path])
            def storbinary(self,command,stream):self.files[command[5:]]=stream.read()
            def rename(self,source,target):
                self.files[target]=self.files.pop(source);controller.helper.write_bytes(self.files[target]);controller.source=self.files[target];controller.before=controller.tree()
            def delete(self,path):self.deleted.append(path);self.files.pop(path);controller.helper.unlink(missing_ok=True)
            def mlsd(self,directory):return [(p.rsplit('/',1)[1],{'type':'file'}) for p in self.files]
            def close(self):self.closed=True
        ftp=FTP()
        if failure=='collision':ftp.files[remote]=b'foreign helper collision'
        else:self.helper.unlink();self.before=self.tree()
        def retrieve(adapter,path):
            chunks=[]
            try:adapter.retrbinary('RETR '+path,chunks.append)
            except ftplib.error_perm:return None
            return b''.join(chunks)
        def upload(adapter,path,data):
            temporary=path+'.upload-'+'0'*16+'.tmp';adapter.storbinary('STOR '+temporary,io.BytesIO(data));adapter.rename(temporary,path)
        common=SimpleNamespace(common=SimpleNamespace(StagingFTP=lambda:ftp,retrieve_file=retrieve),atomic_upload=upload)
        def rpc(action,token,source_sha,transaction,commit,owned_sha,baseline=None,extra=None,opener=None):
            events.append(action)
            if failure=='changed-helper':
                ftp.files[remote]=b'foreign helper bytes';self.helper.write_bytes(b'foreign helper bytes')
                raise module.RPCFailure('injected request failure')
            if action=='interrupt':self.call(action,interrupt=True);raise module.RPCFailure('controlled fixture response lost')
            value=self.call(action,extra=extra)
            if value['status']!=200:raise module.RPCFailure('fixture controller failed')
            module.validate_response(value['body'],action,source_sha,transaction,commit,owned_sha,baseline)
            return value['body']
        actual_archive=module.write_archive
        def archive(directory,*args):
            events.append('archive-verified')
            with mock.patch.object(module,'ROOT',self.root):return actual_archive(self.root/'deploy-backups',*args)
        with tempfile.TemporaryDirectory(prefix='client-private-main-',dir=ROOT/'docs/seo') as folder:
            report=Path(folder)/'receipt.json'
            argv=['rehearsal','--rehearse-staging','--application-commit','c'*40,'--tooling-commit','d'*40,'--report',str(report)]
            with mock.patch('sys.argv',argv),mock.patch.object(module,'immutable_owned',return_value=self.owned),mock.patch.object(module.snapshot,'local_owned_checksums',return_value=self.owned),mock.patch.object(module.snapshot,'load_common',return_value=common),mock.patch.object(module,'rpc',side_effect=rpc),mock.patch.object(module,'write_archive',side_effect=archive),mock.patch.object(module.secrets,'token_hex',return_value='a'*32),mock.patch.object(module.secrets,'token_urlsafe',return_value=TOKEN),contextlib.redirect_stdout(io.StringIO()):
                unexpected=None
                if failure:
                    with self.assertRaises(RuntimeError):module.main()
                else:
                    try:module.main()
                    except RuntimeError as error:unexpected=type(error).__name__
            result=json.loads(report.read_bytes())
            if unexpected:raise AssertionError({'receipt':result,'events':events,'ftpPaths':list(ftp.files)})
        return result,ftp,events

    def test_actual_client_orchestration_verifies_archive_before_cleanup_and_helper_absence(self):
        report,ftp,events=self.client_main()
        self.assertEqual(report['phase'],'complete');self.assertTrue(report['privateFixtureCleanupVerified']);self.assertTrue(report['helperRemoved'])
        self.assertTrue(report['privateArchive']['zipCRC']);self.assertLess(events.index('archive-verified'),events.index('cleanup'))
        self.assertFalse(ftp.files);self.assertTrue(ftp.closed);self.assertEqual(ftp.deleted,[module.REMOTE+'/'+NAME])
        self.assertEqual(set(report['retainedPrivateClosureFiles']),{'closed.json','lifecycle.lock'})

    def test_actual_client_preserves_helper_collision(self):
        report,ftp,events=self.client_main('collision')
        self.assertEqual(report['phase'],'host-fixture-failed');self.assertFalse(report['helperInstallationAttempted'])
        self.assertEqual(ftp.files[module.REMOTE+'/'+NAME],b'foreign helper collision');self.assertFalse(ftp.deleted);self.assertFalse(events)

    def test_actual_client_preserves_changed_helper_and_records_cleanup_failure(self):
        report,ftp,events=self.client_main('changed-helper')
        self.assertEqual(report['phase'],'helper-cleanup-failed');self.assertTrue(report['helperCleanupFailed'])
        self.assertIn(module.REMOTE+'/'+NAME,ftp.files,(report,events,list(ftp.files)))
        self.assertFalse(report['helperRemoved']);self.assertEqual(ftp.files[module.REMOTE+'/'+NAME],b'foreign helper bytes');self.assertFalse(ftp.deleted)


class HostClientTests(unittest.TestCase):
    def test_rendered_source_contains_only_token_hash_and_all_components(self):
        source=module.helper_source(NAME,TOKEN,int(time.time())+500,'c'*40,{'ktk-code-pages.php':'d'*64})
        self.assertNotIn(TOKEN.encode(),source);self.assertIn(module.sha(TOKEN.encode()).encode(),source)
        self.assertIn(b'class KTK_Staging_Private_Fixture',source);self.assertIn(b'class KTK_Active_Content_Transaction',source)
        for bad in ('ktk-homepage-shortcode.php','../escape','/public_html/wp-content'):
            with self.assertRaises(ValueError):module.helper_source(NAME,TOKEN,int(time.time())+500,'c'*40,{bad:'d'*64})

    def test_adapter_rejects_production_other_helpers_and_private_paths_before_delegation(self):
        underlying=mock.Mock();adapter=module.TemporaryHelperFTP(underlying,NAME)
        for path in ['/public_html/wp-content/mu-plugins/'+NAME,module.REMOTE+'/unrelated.php','/private/fixture']:
            for operation in [lambda p=path:adapter.storbinary('STOR '+p,io.BytesIO(b'x')),lambda p=path:adapter.delete(p),lambda p=path:adapter.retrbinary('RETR '+p,lambda b:None)]:
                with self.assertRaises(ValueError):operation()
        self.assertFalse(underlying.mock_calls)

    def test_default_cli_never_loads_transport_or_immutable_network_inputs(self):
        with tempfile.TemporaryDirectory(prefix='offline-private-fixture-',dir=ROOT/'docs/seo') as d,mock.patch.object(module,'immutable_owned',side_effect=AssertionError('no live preflight')):
            report=Path(d)/'offline.json'
            with mock.patch.object(module.snapshot,'load_common',side_effect=AssertionError('no FTP')):
                with mock.patch('sys.argv',['rehearsal','--application-commit','c'*40,'--report',str(report)]),contextlib.redirect_stdout(io.StringIO()):
                    module.main();self.assertEqual(json.loads(report.read_bytes())['phase'],'offline-validated')

    def test_redirect_is_refused_without_forwarding_authentication(self):
        with self.assertRaises(ValueError):module.snapshot.NoRedirect().redirect_request(None,None,302,'redirect',{},'https://example.com/')

    def test_rpc_uses_post_and_refuses_cached_or_wrong_destination_responses(self):
        class Response(io.BytesIO):
            status=200
            headers={'CF-Cache-Status':'HIT','Cache-Control':'private, no-store','Content-Type':'application/json'}
            def geturl(self):return self.url
        class Opener:
            def open(self,request,timeout):
                self.request=request;r=Response(b'{"private":"not logged"}');r.url=request.full_url;return r
        opener=Opener()
        with self.assertRaises(module.RPCFailure) as error:module.rpc('prepare',TOKEN,'d'*64,'a'*32,'c'*40,'e'*64,opener=opener)
        self.assertEqual(opener.request.get_method(),'POST')
        self.assertEqual(opener.request.data,b'{"action":"prepare"}')
        self.assertNotIn(TOKEN,str(error.exception));self.assertNotIn('not logged',str(error.exception))
        Response.headers={**Response.headers,'CF-Cache-Status':'DYNAMIC'}
        class WrongDestination(Opener):
            def open(self,request,timeout):
                r=super().open(request,timeout);r.url='https://example.com/';return r
        with self.assertRaises(module.RPCFailure):module.rpc('prepare',TOKEN,'d'*64,'a'*32,'c'*40,'e'*64,opener=WrongDestination())

    def test_response_scope_and_real_state_drift_are_rejected(self):
        good={'schemaVersion':1,'scope':'staging-private-active-transaction-fixture','action':'inspect','helperSha256':'d'*64,'transactionId':'a'*32,'applicationCommit':'c'*40,
              'realOwnedMapSha256':'e'*64,'identity':{'home':module.URL,'siteurl':module.URL,'blogPublic':0},'privateRootOutsideCompletePublicRoot':True,
              'privateRootName':'.ktk-staging-rehearsal-'+'a'*32,'fixtureChangedFiles':5,'fixturePriorBackupFiles':4,'publicApplicationWrites':0,'publicActivationWrites':0,
              'databaseWrites':0,'cachePurges':0,'status':{'phase':'prepared'},'realProtectedStateSha256':'f'*64}
        module.validate_response(good,'inspect','d'*64,'a'*32,'c'*40,'e'*64)
        for changes in ({'databaseWrites':1},{'helperSha256':'0'*64},{'privateRootOutsideCompletePublicRoot':False},{'identity':{'home':'https://krawlthroughkrakow.com/'}}):
            with self.assertRaises(ValueError):module.validate_response({**good,**changes},'inspect','d'*64,'a'*32,'c'*40,'e'*64)
        with self.assertRaises(ValueError):module.validate_response({**good,'realProtectedStateSha256':'0'*64},'inspect','d'*64,'a'*32,'c'*40,'e'*64,baseline=good)

    def test_archive_rejects_traversal_before_any_backup_is_written(self):
        manifest={'files':{'../outside':{'bytes':1,'sha256':module.sha(b'x')}},'directories':[],'bytes':1}
        exported={'privateExport':{'manifest':manifest,'sha256':module.sha(module.encode(manifest)),'fileBytesBase64':{'../outside':base64.b64encode(b'x').decode()}}}
        with tempfile.TemporaryDirectory() as d,mock.patch.object(module,'ROOT',Path(d)):
            with self.assertRaises(ValueError):module.write_archive(Path(d)/'deploy-backups',exported,'d'*64,{},'a'*32)
            self.assertFalse((Path(d)/'deploy-backups').exists())


if __name__=='__main__':unittest.main()
