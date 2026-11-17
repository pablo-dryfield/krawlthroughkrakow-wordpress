import hashlib,unittest
from tools import full_private_engine_controller as compiler
from tools.tests import test_content_update_controller as old

EXTRA=r'''
 define('KTK_CONTENT_UPDATE_SEEDS_ALLOWED',true);require $c['seedComponent'];
 $fixtureSeeds=array('source'=>$c['new'],'target'=>$c['old']);$seed=new KTK_Content_Update_Preparation_Seeds($fixtureSeeds,$c['packet']['plan']);
 $initialize=static function($private,$store)use($seed){$seed->inspect($store);};
 $inspect=static function($store)use($seed,$c){$s=$seed->inspect($store);if($c['fault']==='bad-next-seed'&&count($s['files'])){$s['sourceComplete']='not-a-bool';}return $s;};
 $complete=static function($store,$fence)use($seed,$fixtureSeeds,$c){
  $s=$seed->inspect($store);if(!hash_equals($s['stateSha256'],$fence)){throw new RuntimeException('Fixture bounded state fence differs');}
  if($c['fault']==='no-progress'){return;}
  foreach($fixtureSeeds as $folder=>$files){foreach($files as $name=>$encoded){
   $relative=$folder.'/'.$name;if(isset($s['files'][$relative])){continue;}$path=$store->privateRoot().'/'.$relative;
   if(!is_dir(dirname($path))){mkdir(dirname($path),0700,true);}file_put_contents($path,base64_decode($encoded,true));return;
  }}
 };
 if($c['fault']==='missing-callback'){$complete=null;}
 $controller=new KTK_Full_Private_Engine_Controller($c['packet'],$capture,$fingerprint,$initialize,$observer,$inspect,$complete);
'''
ANCHOR=" $controller=new KTK_Content_Update_Controller($c['packet'],$capture,$fingerprint,$initialize,$observer);"

class FullPrivateControllerCompilerTests(unittest.TestCase):
 def test_frozen_legacy_input_and_critical_non_preparation_guards_remain_exact(self):
  raw=compiler.LEGACY.read_bytes();source=compiler.controller_source();self.assertEqual(hashlib.sha256(raw).hexdigest(),compiler.LEGACY_SHA);self.assertIn(b'final class KTK_Full_Private_Engine_Controller',source)
  for a,b in [(b'    private function stateCheck(',b'    private function preparation('),(b'    private function lockTarget(',b'    private function stateCheck('),(b"        $store=new KTK_Content_Update_Private_Store($this->root,$this->packet['publicRoot'],$this->binding['transactionId'],$this->packet['ownershipKey']);\n        $planRaw=",b'\n}\n')]:
   self.assertEqual(raw[raw.index(a):raw.index(b,raw.index(a))],source[source.index(a):source.index(b,source.index(a))])
 def test_unknown_or_changed_legacy_controller_refused_before_output(self):
  for value in (b'',b'<?php\n',compiler.LEGACY.read_bytes()+b' ','not-bytes'):
   with self.assertRaises(ValueError):compiler.controller_source(value)

@unittest.skipUnless(old.PHP,'Real PHP required for private deferred controller boundaries')
class FullPrivateDeferredControllerTests(unittest.TestCase):
 def setUp(self):
  self.case=old.ContentUpdateControllerTests('runTest');self.context=self.case.fixture();self.root,self.mu,self.driver,self.cfg=self.context.__enter__();self.addCleanup(self.context.__exit__,None,None,None)
  generated=self.root/'full-private-controller.php';generated.write_bytes(compiler.controller_source());self.cfg['components'][-1]=generated.as_posix();self.cfg['seedComponent']=(old.ROOT/'tools/content-update-preparation-seeds.php').as_posix();self.assertEqual(old.DRIVER.count(ANCHOR),1);self.driver.write_text(old.DRIVER.replace(ANCHOR,EXTRA),encoding='utf-8');self.private=self.root/('.ktk-content-update-'+old.ID);self.engine=self.private/'engine'/old.ID
  self.original_public=self.public()
 def public(self):return {p.relative_to(self.mu).as_posix():p.read_bytes() for p in self.mu.rglob('*') if p.is_file()}
 def action(self,action,**extra):return self.case.run_action(self.root,self.driver,self.cfg,action,**extra)
 def ok(self,result):return self.case.ok(result)
 def prepare(self):return self.ok(self.action('prepare'))
 def complete(self,state):
  steps=0
  while 'preparation' in state:
   self.assertFalse(self.engine.exists());state=self.ok(self.action('recover-preparation',stateSha256=state['stateSha256']));steps+=1;self.assertLess(steps,30)
  return state,steps
 def test_prepare_retains_original_signed_records_and_never_starts_engine_early(self):
  state=self.prepare();p=state['preparation'];self.assertTrue(p['recordsComplete']);self.assertFalse(p['seedsComplete']);self.assertIsNone(p['enginePhase']);self.assertFalse(self.engine.exists());self.assertTrue((self.private/'control/original-state.json').is_file());self.assertEqual(self.public(),self.original_public)
 def test_each_recovery_is_bounded_and_engine_starts_only_after_both_seed_inventories_complete(self):
  state=self.prepare();seen=[]
  while 'preparation' in state:
   before=state['preparation']['seedFiles'];before={} if before==[] else before;self.assertFalse(self.engine.exists());state=self.ok(self.action('recover-preparation',stateSha256=state['stateSha256']))
   if 'preparation' in state:self.assertEqual(len(state['preparation']['seedFiles'])-len(before),1);self.assertIsNone(state['preparation']['enginePhase']);seen.append(state['stateSha256'])
  self.assertEqual(state['engine']['phase'],'prepared');self.assertTrue(state['engine']['currentPriorInventoryVerified']);self.assertFalse(state['archiveAcknowledged']);self.assertGreater(len(seen),2);self.assertEqual(self.public(),self.original_public)
 def test_stale_fence_and_unknown_private_file_stop_without_an_engine(self):
  state=self.prepare();before=self.public();result=self.action('recover-preparation',stateSha256='f'*64);self.assertFalse(result['ok']);self.assertFalse(self.engine.exists());self.assertEqual(self.public(),before)
  (self.private/'source').mkdir();note=self.private/'source/owner-note';note.write_bytes(b'unknown owner bytes');result=self.action('inspect-preparation');self.assertFalse(result['ok']);self.assertEqual(note.read_bytes(),b'unknown owner bytes');self.assertFalse(self.engine.exists())
 def test_unverified_callback_result_refused_before_engine_preparation(self):
  state=self.prepare();self.cfg['fault']='bad-next-seed';result=self.action('recover-preparation',stateSha256=state['stateSha256']);self.assertFalse(result['ok']);self.assertIn('Verified bounded private seed result',result['message']);self.assertFalse(self.engine.exists());self.assertEqual(self.public(),self.original_public)
 def test_no_progress_callback_returns_same_inspected_fence_without_engine_or_loop(self):
  state=self.prepare();self.cfg['fault']='no-progress';after=self.ok(self.action('recover-preparation',stateSha256=state['stateSha256']));self.assertEqual(after['stateSha256'],state['stateSha256']);self.assertFalse(self.engine.exists())
 def test_production_mode_and_missing_callbacks_are_refused_without_private_or_public_writes(self):
  for changes in ('production','missing-callback'):
   if changes=='production':self.cfg['packet']['mode']='production'
   else:self.cfg['packet']['mode']='private-staging-rehearsal';self.cfg['fault']=changes
   result=self.action('prepare');self.assertFalse(result['ok']);self.assertIn('Explicit private deferred',result['message']);self.assertFalse(self.private.exists());self.assertEqual(self.public(),self.original_public)
 def test_existing_archive_ack_apply_rollback_and_close_guards_remain_operational(self):
  state,steps=self.complete(self.prepare());self.assertGreater(steps,2);unacked=self.action('apply',stateSha256=state['stateSha256'],archiveSha256='e'*64);self.assertFalse(unacked['ok'])
  state,receipt=self.case.archive_and_ack(self.root,self.driver,self.cfg)
  while state['engine']['phase']!='applied':state=self.case.advance(self.root,self.driver,self.cfg,'apply',state,receipt)
  while state['engine']['phase']!='rolled-back':state=self.case.advance(self.root,self.driver,self.cfg,'rollback',state,receipt)
  closed=self.ok(self.action('close',stateSha256=state['stateSha256'],exportSha256=receipt['manifestSha256'],archiveSha256=receipt['archiveSha256']));self.assertTrue(closed['closed']);self.assertTrue(closed['engine']['currentPriorInventoryVerified']);self.assertEqual(self.public(),self.original_public)

if __name__=='__main__':unittest.main()
