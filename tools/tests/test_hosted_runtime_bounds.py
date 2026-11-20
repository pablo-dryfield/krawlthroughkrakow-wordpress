"""Real PHP HTTP proof of request-local ceilings, stricter settings and fail-closed behavior."""
from pathlib import Path
import hashlib,json,shutil,socket,subprocess,tempfile,time,unittest,urllib.request,urllib.error
from unittest import mock
from tools import hosted_runtime_bounds as bounds
from tools.tests import test_full_private_engine_packet as native_packet

class HostedRuntimeBoundsTests(unittest.TestCase):
    def test_real_engine_compiler_preserves_every_other_byte_and_full_plan(self):
        from tools import full_private_engine_packet as engine
        from tools.tests import test_private_preparation_fast_capture as fixtures
        args=fixtures.arguments()
        for profile in ['raw','bounded-sha256','bounded-complete-sha256']:
            legacy=engine.helper_source(*args,capture_profile=profile)
            guarded=engine.helper_source(*args,capture_profile=profile,hosted_runtime_bounds=True)
            inverse=guarded.replace(bounds.GUARD,b'',1).replace(b"$this->stepBytes=$profile==='default'?self::STEP_BYTES:16777216; $this->stepFiles=$profile==='default'?self::STEP_FILES:64;",b"$this->stepBytes=$profile==='default'?self::STEP_BYTES:33554432; $this->stepFiles=$profile==='default'?self::STEP_FILES:128;",1)
            self.assertEqual(inverse,legacy)
            self.assertEqual(legacy,engine.helper_source(*args,capture_profile=profile,hosted_runtime_bounds=False))
            lint=subprocess.run([shutil.which('php'),'-l'],input=guarded,capture_output=True)
            self.assertEqual(lint.returncode,0,lint.stderr)
        for flag in [None,1,'true']:
            with self.assertRaises(ValueError):engine.helper_source(*args,hosted_runtime_bounds=flag)

    def test_real_snapshot_and_disposal_compilers_preserve_other_bytes(self):
        from tools import early_private_entry as early
        from tools import full_private_engine_disposal as disposal
        from tools.tests import test_full_private_engine_disposal_support as fixtures
        v=fixtures.fixture()
        snapshot=early.snapshot_source('ktk-state-snapshot-'+v['transactionId']+'.php',v['token'],int(time.time())+300)
        guarded=bounds.bind(snapshot,'snapshot')
        self.assertEqual(guarded.replace(bounds.GUARD,b'',1),snapshot)
        args=(v['authority'],v['publicRoot'],v['ownershipKey'],v['token'],v['expires'])
        legacy=disposal.helper_source(*args);bounded=disposal.helper_source(*args,hosted_runtime_bounds=True)
        self.assertEqual(bounded.replace(bounds.GUARD,b'',1),legacy)
        for source in [guarded,bounded]:
            lint=subprocess.run([shutil.which('php'),'-l'],input=source,capture_output=True)
            self.assertEqual(lint.returncode,0,lint.stderr)

    def test_source_binding_is_authenticated_unique_and_reversible(self):
        source=b"<?php\n$token=$_SERVER['HTTP_X_KTK_FULL_ENGINE_TOKEN']??null;\nif($token!=='test'){exit;}\n    nocache_headers();\necho 'operation';\n"
        guarded=bounds.bind(source,'engine')
        self.assertEqual(guarded.replace(bounds.GUARD,b'',1),source)
        for bad in [source.replace(b'    nocache_headers();',b''),source+source,guarded]:
            with self.assertRaises(ValueError):bounds.bind(bad,'engine')
        with self.assertRaises(ValueError):bounds.bind(source,'snapshot')

    def test_transport_rejects_missing_unlimited_or_excessive_runtime_witness(self):
        headers={'X-KTK-Enforced-Runtime':bounds.PROFILE,'X-KTK-Memory-Limit':'256M','X-KTK-Execution-Limit':'60'}
        self.assertTrue(bounds.verify_response(headers,268435456))
        self.assertTrue(bounds.verify_response({**headers,'X-KTK-Memory-Limit':'64M','X-KTK-Execution-Limit':'10'},100000))
        for key,value in [('X-KTK-Enforced-Runtime',''),('X-KTK-Memory-Limit','768M'),('X-KTK-Memory-Limit','-1'),('X-KTK-Execution-Limit','300'),('X-KTK-Execution-Limit','0')]:
            with self.assertRaises(ValueError):bounds.verify_response({**headers,key:value},1)
        with self.assertRaises(ValueError):bounds.verify_response(headers,268435457)

    def test_real_disposal_transport_requires_consistent_enforced_runtime(self):
        from tools.tests import test_full_private_engine_disposal_support as fixture
        from tools.full_private_engine_disposal_transport import FullEngineDisposalTransport
        from tools.content_update_client import UncertainRequest
        from tools import content_update_backup as backup
        value=fixture.fixture()
        def response(change=None):
            def alter(r):
                r.headers['X-KTK-Enforced-Runtime']=bounds.PROFILE;r.headers['X-KTK-Memory-Limit']='256M';r.headers['X-KTK-Execution-Limit']='60'
                body=backup.decode(r.body);body['runtime']['maxExecutionTime']='60';r.body=backup.encode(body)
                if change:change(r)
            return fixture.Opener(value,alter)
        opener=response();wire=FullEngineDisposalTransport(value,lambda:True,opener=opener,hosted_runtime_bounds=True)
        self.assertEqual(wire.request('inspect'),fixture.state(value));self.assertEqual(len(opener.calls),1);self.assertEqual(opener.calls[0][1],60)
        def bad_body(r):
            body=backup.decode(r.body);body['runtime']['maxExecutionTime']='300';r.body=backup.encode(body)
        for opener in [fixture.Opener(value),response(bad_body)]:
            wire=FullEngineDisposalTransport(value,lambda:True,opener=opener,hosted_runtime_bounds=True)
            with self.assertRaises(UncertainRequest):wire.request('inspect')
            self.assertEqual(len(opener.calls),1)
        opener=response();wire=FullEngineDisposalTransport(value,lambda:True,opener=opener,hosted_runtime_bounds=True)
        with mock.patch('tools.full_private_engine_disposal_transport.time.perf_counter',side_effect=[10.0,70.01,70.02]):
            with self.assertRaises(UncertainRequest):wire.request('inspect')
        self.assertEqual(len(opener.calls),1)

    def test_real_engine_transport_requires_witness_and_rejects_late_reply_once(self):
        from tools.tests import test_full_private_engine_transport as fixture
        from tools.content_update_client import UncertainRequest
        from tools import content_update_backup as backup
        plan=fixture.fixture()['plan'];value={'privateProfile':'full-private-engine-v1','helperSha256':'e'*64,'controller':{'schemaVersion':1}}
        raw=backup.encode({'schemaVersion':1,'action':'inspect-preparation',**fixture.wire.full.binding(plan)})
        headers={'X-KTK-Enforced-Runtime':bounds.PROFILE,'X-KTK-Memory-Limit':'256M','X-KTK-Execution-Limit':'60'}
        opener=fixture.Opener(value,headers=headers);wire=fixture.wire.FullPrivateEngineTransport(plan,'e'*64,'T'*43,2000,opener,lambda:1000,hosted_runtime_bounds=True)
        self.assertEqual(wire(raw),value);self.assertEqual(opener.calls[0][1],60)
        for late in [False,True]:
            opener=fixture.Opener(value,headers=headers if late else {})
            wire=fixture.wire.FullPrivateEngineTransport(plan,'e'*64,'T'*43,2000,opener,lambda:1000,hosted_runtime_bounds=True)
            with mock.patch('tools.full_private_engine_transport.time.perf_counter',side_effect=[10.0,70.01,70.02]):
                with self.assertRaises(UncertainRequest):wire(raw)
            self.assertEqual(len(opener.calls),1)

    def http_case(self,memory,execution,disabled=False):
        with tempfile.TemporaryDirectory(prefix='ktk-php-boundary-') as directory:
            root=Path(directory);php=root/'fixture.php';marker=root/'operation.txt'
            source=b"<?php\nfunction nocache_headers(){}\n$token=$_SERVER['HTTP_X_KTK_FULL_ENGINE_TOKEN']??null;\nif($token!=='local-fixture'){http_response_code(404);exit;}\n    nocache_headers();\nfile_put_contents(__DIR__.'/operation.txt','one owned local operation');header('Content-Type: application/json');echo json_encode(array('memory'=>ini_get('memory_limit'),'execution'=>ini_get('max_execution_time')));\n"
            php.write_bytes(bounds.bind(source,'engine'))
            with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
            command=[shutil.which('php'),'-d','memory_limit='+memory,'-d','max_execution_time='+execution]
            if disabled:command+=['-d','disable_functions=ini_set,set_time_limit']
            command+=['-S','127.0.0.1:'+str(port),str(php)]
            with tempfile.TemporaryFile() as log:
                process=subprocess.Popen(command,cwd=root,stdout=log,stderr=log,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
                def get(token=None):
                    req=urllib.request.Request('http://127.0.0.1:'+str(port)+'/',headers={'X-KTK-Full-Engine-Token':token} if token else {})
                    try:response=urllib.request.urlopen(req,timeout=3)
                    except urllib.error.HTTPError as error:response=error
                    with response:return response.status,response.headers,response.read()
                try:
                    for _ in range(60):
                        try:anonymous=get();break
                        except urllib.error.URLError:time.sleep(.05)
                    else:self.fail('Owned local PHP server failed to start')
                    self.assertEqual(anonymous[0],404);self.assertFalse(marker.exists())
                    status,headers,raw=get('local-fixture')
                    if disabled:
                        self.assertEqual(status,503);self.assertEqual(json.loads(raw),{'error':'private_runtime_bounds_unavailable'});self.assertFalse(marker.exists());self.assertIn('no-store',headers['Cache-Control'])
                    else:
                        self.assertEqual(status,200);bounds.verify_response(headers)
                        value=json.loads(raw);self.assertEqual(bounds.memory_bytes(value['memory']),min(bounds.memory_bytes(memory),268435456));self.assertEqual(int(value['execution']),min(int(execution),60));self.assertEqual(marker.read_text(),'one owned local operation')
                finally:process.terminate();process.wait(timeout=5)

    def test_real_php_lowers_larger_request_limits(self):self.http_case('768M','300')
    def test_real_php_preserves_stricter_limits(self):self.http_case('64M','10')
    def test_real_php_unavailable_controls_refuse_before_operation(self):self.http_case('768M','300',True)

class HostedBoundedPacketNativeTests(native_packet.FullPrivateEnginePacketTests):
    def setUp(self):
        super().setUp()
        p=native_packet.packet;b=native_packet.bridge
        self.source=p.helper_source(Path(self.case.cfg['helper']).name,b.old.TOKEN,self.expires,b.old.APP,self.case.owned,self.case.sizes,self.case.plan['protectedStateSha256'],b.old.KEY,capture_profile='bounded-complete-sha256',hosted_runtime_bounds=True)

    def test_compiled_source_embeds_only_reviewed_components_and_early_private_guard(self):
        p=native_packet.packet;b=native_packet.bridge
        legacy=p.helper_source(Path(self.case.cfg['helper']).name,b.old.TOKEN,self.expires,b.old.APP,self.case.owned,self.case.sizes,self.case.plan['protectedStateSha256'],b.old.KEY,capture_profile='bounded-complete-sha256')
        inverse=self.source.replace(bounds.GUARD,b'',1).replace(b"$this->stepBytes=$profile==='default'?self::STEP_BYTES:16777216; $this->stepFiles=$profile==='default'?self::STEP_FILES:64;",b"$this->stepBytes=$profile==='default'?self::STEP_BYTES:33554432; $this->stepFiles=$profile==='default'?self::STEP_FILES:128;",1)
        self.assertEqual(inverse,legacy)
        self.assertLess(self.source.index(bounds.GUARD),self.source.index(b'ktk_capture_staging_original_state(__FILE__)'))

    def test_hosted_caps_split_full_inventory_and_large_file_without_losing_data(self):
        p=native_packet.packet;b=native_packet.bridge
        folder=self.case.mu/'ktk-code-pages-assets/content';folder.mkdir(parents=True,exist_ok=True)
        for index in range(130):(folder/('hosted-fixture-'+str(index).zfill(3)+'.html')).write_bytes(('fixture '+str(index)).encode())
        (folder/'hosted-large.html').write_bytes(b'x'*(17*1024*1024))
        self.case.cfg['operation']='snapshot';baseline=self.case.case.call(self.case.root,self.case.driver,self.case.cfg)['state']
        self.case.owned=baseline['ownedContentFiles'];self.case.sizes={n:(self.case.mu/n).stat().st_size for n in self.case.owned}
        self.case.plan,_,self.case.overrides=native_packet.full.plan(b.old.ID,b.old.APP,self.case.owned,self.case.sizes,baseline['protectedStateSha256']);self.case.binding=native_packet.full.binding(self.case.plan)
        self.source=p.helper_source(Path(self.case.cfg['helper']).name,b.old.TOKEN,self.expires,b.old.APP,self.case.owned,self.case.sizes,self.case.plan['protectedStateSha256'],b.old.KEY,capture_profile='bounded-complete-sha256',hosted_runtime_bounds=True)
        observations=[];original_boot=self.boot
        def observed_boot(**changes):
            result,source=original_boot(**changes)
            seed=result.get('body',{}).get('controller',{}).get('preparation',{}).get('fullSeed')
            if seed is not None:observations.append((len(seed['files']),seed['copiedBytes']))
            return result,source
        self.boot=observed_boot
        from tools import full_private_engine_exercise as exercise
        acknowledgment=None
        helper_sha=native_packet.backup.sha(self.source.replace(b"file_get_contents('php://input',false,null,0,4097)",b"($GLOBALS['c']['body']??'')"))
        def transport(raw):
            request=native_packet.backup.decode(raw)
            envelope={'privateProfile':'full-private-engine-v1','request':request,'originalArchive':acknowledgment if request['action']=='recover-preparation' else None}
            out,_=self.boot(body=native_packet.backup.encode(envelope).decode());self.assertEqual(out['status'],200,out);self.assertFalse(out['ordinaryMarker']);self.assertTrue(all(q.startswith('SELECT ') for q in out['queries']));return out['body']
        client=native_packet.FullPrivateEngineClient(self.case.plan,self.case.sizes,self.case.overrides,self.case.mu,helper_sha,b.old.KEY,transport,lambda n:(self.case.private/n).read_bytes())
        test=self
        class Gate:
            def original_manifest(self):
                out,_=test.boot(body=native_packet.backup.encode({'privateProfile':'full-private-engine-v1','request':{'schemaVersion':1,'action':'original',**test.case.binding},'originalArchive':None}).decode())
                test.assertEqual(out['status'],200,out);return out['body']['originalCapsule']
            def acknowledge_original(self,path,key,manifest):
                nonlocal acknowledgment
                receipt=native_packet.full.verify_archive(path,test.case.plan,key,helper_sha,manifest)
                acknowledgment={'originalManifestSha256':manifest['manifestSha256'],'originalArchiveSha256':receipt['sha256']}
        destination=self.case.root/'deploy-backups';destination.mkdir(exist_ok=True);preinstall=self.case.public();before=None
        def capture_public_before(event,payload):
            nonlocal before
            if event=='prepare':
                before=self.case.public()
                changed={n for n in set(preinstall)|set(before) if preinstall.get(n)!=before.get(n)}
                self.assertLessEqual(changed,{Path(self.case.cfg['helper']).relative_to(self.case.mu).as_posix()})
        with mock.patch.object(native_packet.full,'ROOT',self.case.root),mock.patch.object(native_packet.backup,'ROOT',self.case.root):
            _,_,prepared=exercise.prepare(client,Gate(),destination/'hosted-original.zip',lambda n:(self.case.private/n).read_bytes(),native_packet.full.build_archive,observe=capture_public_before,step_bytes=bounds.STEP_BYTES,step_files=bounds.STEP_FILES)
            self.assertTrue(prepared['prepared'])
            closed=exercise.transact(client,destination/'hosted-rollback.zip')
        self.assertIsNotNone(before);self.assertTrue(closed['rolledBackClosureVerified']);self.assertEqual(self.case.public(),before)
        deltas=[(c[0]-a[0],c[1]-a[1]) for a,c in zip(observations,observations[1:])]
        self.assertGreater(len(self.case.owned),128)
        self.assertEqual(max(n for n,_ in deltas),bounds.STEP_FILES)
        self.assertEqual(max(n for _,n in deltas),bounds.STEP_BYTES)
        self.assertTrue(all(0<=n<=bounds.STEP_FILES and 0<=size<=bounds.STEP_BYTES for n,size in deltas))

if __name__=='__main__':unittest.main()
