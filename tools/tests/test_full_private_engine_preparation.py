import base64,copy,hashlib,json,subprocess,unittest
from pathlib import Path
from unittest import mock
from tools import content_update_backup as backup
from tools import full_private_engine_controller as compiler
from tools import full_private_engine_client as client_module
from tools import full_private_seed_packet as full
from tools.content_update_client import UncertainRequest
from tools.tests import test_content_update_controller as old

ANCHOR=" $controller=new KTK_Content_Update_Controller($c['packet'],$capture,$fingerprint,$initialize,$observer);"
BRIDGE=r'''
 $streamObserver=static function($event,$name,$path)use($c){if($c['seedFault']==='prefix'&&$event==='after-stream-chunk'&&$name==='source/ktk-code-pages-assets/media/large.bin'){clearstatcache(true,$path);if(filesize($path)===65536){exit(74);}}};
 $preparation=new KTK_Full_Private_Engine_Preparation($c['packet']['publicRoot'],$c['packet']['plan'],$c['sizes'],$c['overrides'],$c['packet']['ownershipKey'],$c['packet']['helperSha256'],static function()use($capture){return $capture()['protectedStateSha256'];},$streamObserver);
 $initialize=static fn($private,$store)=>$preparation->initialize($private,$store);
 $inspect=static fn($store)=>$preparation->inspect($store);
 $complete=static fn($store,$fence)=>$preparation->advance($store,$fence,$c['originalArchive']);
 $controller=new KTK_Full_Private_Engine_Controller($c['packet'],$capture,$fingerprint,$initialize,$observer,$inspect,$complete);
 if($c['operation']==='capsule'){$s=new KTK_Content_Update_Private_Store(dirname($c['packet']['publicRoot']).'/.ktk-content-update-'.$c['packet']['plan']['transactionId'],$c['packet']['publicRoot'],$c['packet']['plan']['transactionId'],$c['packet']['ownershipKey']);echo json_encode(array('ok'=>true,'capsule'=>$preparation->capsule($s)),JSON_THROW_ON_ERROR);exit;}
'''
DEFINE=" define('KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED',true);define('KTK_CONTENT_UPDATE_FULL_HOST_STREAMING_ALLOWED',true);define('KTK_FULL_PRIVATE_ENGINE_PREPARATION_ALLOWED',true);\n"

class FullPrivateStreamCompilerTests(unittest.TestCase):
 def test_exact_legacy_stream_kept_and_only_full_work_budget_reduced(self):
  raw=compiler.STREAM.read_bytes();compiled=compiler.stream_source();self.assertEqual(backup.sha(raw),compiler.STREAM_SHA);self.assertEqual(compiled.replace(b'KTK_Full_Private_Engine_Streaming_Seeds',b'KTK_Content_Update_Streaming_Seeds',1).replace(b"$this->stepBytes=$profile==='default'?self::STEP_BYTES:33554432; $this->stepFiles=$profile==='default'?self::STEP_FILES:128;",b"$this->stepBytes=$profile==='default'?self::STEP_BYTES:67108864; $this->stepFiles=$profile==='default'?self::STEP_FILES:256;",1),raw)
  with self.assertRaises(ValueError):compiler.stream_source(raw+b' ')

@unittest.skipUnless(old.PHP,'Real PHP required for full private stream/controller/archive integration')
class FullPrivatePreparationIntegrationTests(unittest.TestCase):
 def setUp(self):
  self.case=old.ContentUpdateControllerTests('runTest');self.context=self.case.fixture();self.root,self.mu,self.driver,self.cfg=self.context.__enter__();self.addCleanup(self.context.__exit__,None,None,None);self.private=self.root/('.ktk-content-update-'+old.ID);self.engine=self.private/'engine'/old.ID;self.requests=[];self.expected_exit=0
  self.source={'ktk-code-pages.php':b'actual local candidate renderer','ktk-code-pages-assets/registry.php':b'actual local candidate registry','ktk-code-pages-assets/runtime.css':b'candidate css','ktk-code-pages-assets/runtime.js':b'candidate js','ktk-code-pages-assets/content/about.html':b'candidate body','ktk-code-pages-assets/media/large.bin':b'0123456789abcdef'*(18*1024*1024//16)}
  self.install_source(self.source)
  self.cfg['operation']='snapshot';state=self.case.call(self.root,self.driver,self.cfg)['state'];self.owned={n:backup.sha(b) for n,b in self.source.items()};self.sizes={n:len(b) for n,b in self.source.items()};self.assertEqual(state['ownedContentFiles'],self.owned)
  self.plan,_,self.overrides=full.plan(old.ID,old.APP,self.owned,self.sizes,state['protectedStateSha256']);self.binding=full.binding(self.plan);self.cfg['packet'].update(plan=self.plan,publicOwnedSha256=backup.sha(backup.encode(self.owned,sort=True)));self.cfg.update(binding=self.binding,sizes=self.sizes,overrides=self.overrides,operation='controller',seedFault='',originalArchive=None)
  stream=self.root/'engine-stream.php';stream.write_bytes(compiler.stream_source());controller=self.root/'full-controller.php';controller.write_bytes(compiler.controller_source());self.cfg['components']=self.cfg['components'][:-1]+[stream.as_posix(),(old.ROOT/'tools/full-private-engine-preparation.php').as_posix(),controller.as_posix()]
  text=old.DRIVER.replace(" foreach($c['components'] as $component){require $component;}",DEFINE+" foreach($c['components'] as $component){require $component;}").replace(ANCHOR,BRIDGE);self.driver.write_text(text,encoding='utf-8');self.before=self.public();self.client=client_module.FullPrivateEngineClient(self.plan,self.sizes,self.overrides,self.mu,self.cfg['packet']['helperSha256'],old.KEY,self.transport,lambda n:(self.private/n).read_bytes())
 def install_source(self,source):
  assets=self.mu/'ktk-code-pages-assets';expected_dirs={p.as_posix() for n in source for p in Path(n).parents if p.as_posix()!='.'}
  for p in sorted(assets.rglob('*'),key=lambda x:len(x.parts),reverse=True):
   self.assertTrue(p.resolve().is_relative_to(self.root.resolve()));n=p.relative_to(self.mu).as_posix()
   if p.is_file() and n not in source:p.unlink()
   elif p.is_dir() and n not in expected_dirs:p.rmdir()
  for n,b in source.items():p=self.mu/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 def public(self):return {p.relative_to(self.mu).as_posix():backup.sha(p.read_bytes()) for p in self.mu.rglob('*') if p.is_file()}
 def transport(self,raw):
  action=json.loads(raw)['action'];self.cfg.update(operation='controller',request=raw.decode());self.requests.append(action);out=self.case.call(self.root,self.driver,self.cfg,exit_code=self.expected_exit if action=='recover-preparation' else 0)
  if out is None:raise TimeoutError('Planned owned original prefix interruption')
  if not out['ok']:raise RuntimeError('Private fixture response refused')
  return {'privateProfile':client_module.PROFILE,'helperSha256':self.cfg['packet']['helperSha256'],'controller':out['value']}
 def original(self):
  self.cfg['operation']='capsule';out=self.case.call(self.root,self.driver,self.cfg);self.assertTrue(out['ok'],out);m=out['capsule'];p=self.root/'deploy-backups/original.zip';self.assertTrue(p.parent.resolve().is_relative_to(self.root.resolve()));p.parent.mkdir()
  with mock.patch.object(full,'ROOT',self.root):receipt=full.build_archive(m,lambda n:(self.private/n).read_bytes(),self.plan,old.KEY,self.cfg['packet']['helperSha256'],p)
  self.assertEqual(m['rootBinding'],self.client.root_binding);self.cfg['originalArchive']={'originalManifestSha256':m['manifestSha256'],'originalArchiveSha256':receipt['sha256']};return receipt
 def ready(self,prefix=False):
  state=self.client.prepare();self.assertFalse(self.engine.exists());self.original()
  if prefix:
   self.cfg['seedFault']='prefix';self.expected_exit=74
   with self.assertRaises(UncertainRequest):self.client.recover_preparation()
   self.expected_exit=0;self.cfg['seedFault']='';state=self.client.inspect_preparation();row=state['preparation']['seedFiles']['source/ktk-code-pages-assets/media/large.bin'];self.assertEqual(row['bytes'],65536);self.assertFalse(self.engine.exists())
  steps=0
  while 'preparation' in state:
   state=self.client.recover_preparation();steps+=1;self.assertLess(steps,10)
  self.assertEqual(state['engine']['phase'],'prepared');self.assertTrue(state['engine']['currentPriorInventoryVerified']);return state
 def test_real_stream_is_gated_by_independent_original_archive_before_any_payload(self):
  state=self.client.prepare();self.assertFalse(self.engine.exists())
  with self.assertRaises(UncertainRequest):self.client.recover_preparation()
  self.assertFalse((self.private/'source').exists());self.assertFalse((self.private/'target').exists());self.original();state=self.client.recover_preparation();self.assertIn('preparation',state);self.assertTrue(state['preparation']['fullSeed']['sourceComplete']);self.assertFalse(state['preparation']['fullSeed']['targetComplete']);self.assertFalse(self.engine.exists());self.assertEqual(self.public(),self.before)
 def test_bad_original_manifest_refuses_copy_and_preserves_original_records(self):
  self.client.prepare();self.original();original=(self.private/'control/original-state.json').read_bytes();self.cfg['originalArchive']['originalManifestSha256']='f'*64
  with self.assertRaises(UncertainRequest):self.client.recover_preparation()
  self.assertFalse((self.private/'source').exists());self.assertEqual((self.private/'control/original-state.json').read_bytes(),original);self.assertFalse(self.engine.exists())
 def test_real_original_prefix_inspection_resume_and_complete_engine_preparation(self):
  self.ready(prefix=True);self.assertTrue(self.engine.exists());self.assertEqual(self.public(),self.before);self.assertEqual((self.private/'source/ktk-code-pages-assets/media/large.bin').stat().st_size,18*1024*1024)
 def test_original_and_rollback_archives_then_apply_exact_rollback_and_close(self):
  self.ready();p=self.root/'deploy-backups/rollback.zip'
  with mock.patch.object(backup,'ROOT',self.root):self.client.export_and_acknowledge(p)
  receipt=self.client.verified_archive()
  applied=0
  while self.client.state['engine']['phase']!='applied':self.client.step('apply');applied+=1;self.assertLess(applied,10)
  rolled=0
  while self.client.state['engine']['phase']!='rolled-back':self.client.step('rollback');rolled+=1;self.assertLess(rolled,10)
  state=self.client.close();self.assertTrue(state['closed']);self.assertEqual((applied,rolled),(5,5));self.assertEqual(len(self.client.manifest['members']),8);self.assertTrue(receipt['allMemberChecksumsAndCRCVerified']);self.assertEqual(self.public(),self.before)

if __name__=='__main__':unittest.main()
