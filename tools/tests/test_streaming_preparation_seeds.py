"""Real PHP streaming faults, fences, memory/step bounds and exact private ownership."""
import base64,copy,hashlib,json,os,subprocess,tempfile,unittest
from pathlib import Path
from tools import content_update_staging_packet as packet
from tools.tests import test_content_update_private_store as store

ROOT=store.ROOT; ID=store.ID; KEY=store.KEY
DRIVER=r'''<?php
$c=json_decode(file_get_contents($argv[1]),true,64,JSON_THROW_ON_ERROR);define('KTK_CONTENT_UPDATE_STORE_ALLOWED',true);if($c['allowed']){define('KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED',true);}if(!empty($c['hostAllowed'])){define('KTK_CONTENT_UPDATE_FULL_HOST_STREAMING_ALLOWED',true);}
try{require $c['store'];require $c['component'];$s=$c['create']?KTK_Content_Update_Private_Store::create($c['root'],$c['public'],$c['id'],$c['key']):new KTK_Content_Update_Private_Store($c['root'],$c['public'],$c['id'],$c['key']);
if($c['create']){$original=json_encode(array('protectedStateSha256'=>$c['plan']['protectedStateSha256']));$s->writeOnce('original-state.json',$original);$s->writeOnce('controller-plan.json',json_encode(array('mode'=>$c['mode'],'transactionId'=>$c['id'],'applicationCommit'=>$c['plan']['applicationCommit'],'originalStateSha256'=>hash('sha256',$original),'enginePlan'=>$c['plan'])));}
$guard=$c['guard'];$calls=0;$observer=static function($event,$name,$path)use($c,&$guard){
if($c['fault']==='exit-open'&&$event==='after-stream-open'){exit(73);}if($c['fault']==='exit-chunk'&&$event==='after-stream-chunk'){exit(74);}if($c['fault']==='exit-file'&&$event==='after-stream-file'){exit(75);}
if($c['fault']==='change-open'&&$event==='after-stream-open'){file_put_contents($path,'external owner bytes');}
if($c['fault']==='replace-open'&&$event==='after-stream-open'){rename($path,$path.'.original');file_put_contents($path,'');}
if($c['fault']==='drift-chunk'&&$event==='after-stream-chunk'){$guard='e'.str_repeat('f',63);}
};$seed=new KTK_Content_Update_Streaming_Seeds($c['public'],$c['plan'],$c['sizes'],$c['overrides'],static function()use(&$guard,&$calls){$calls++;return $guard;},$observer,$c['profile']??'default');
$v=$c['action']==='inspect'?$seed->inspect($s):$seed->advance($s,$c['fence']);echo json_encode(array('ok'=>true,'value'=>$v,'peak'=>memory_get_peak_usage(true),'guardCalls'=>$calls),JSON_THROW_ON_ERROR);
}catch(Throwable $e){echo json_encode(array('ok'=>false,'error'=>$e->getMessage()),JSON_THROW_ON_ERROR);}
'''

@unittest.skipUnless(store.PHP,'PHP required for real streaming preparation fixtures')
class StreamingPreparationSeedTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix='ktk-stream-');self.addCleanup(self.tmp.cleanup);self.base=Path(self.tmp.name);self.public=self.base/'public_html';self.mu=self.public/'staging/wp-content/mu-plugins';self.mu.mkdir(parents=True);self.private=self.base/('.ktk-content-update-'+ID);self.driver=self.base/'driver.php';self.driver.write_bytes(DRIVER.encode());self.sentinel=self.public/'production-protected.keep';self.sentinel.write_bytes(b'Production/commerce/forms/consent retained')
  seeds=packet.seeds();self.source=seeds['source'];self.prior=seeds['target']
  for name,data in self.source.items():self.write_public(name,data)
  self.config={'store':store.CORE.as_posix(),'component':(ROOT/'tools/content-update-streaming-seeds.php').as_posix(),'allowed':True,'root':self.private.as_posix(),'public':self.public.as_posix(),'id':ID,'key':KEY,'guard':'f'*64,'fault':'','fence':'','mode':'private-staging-rehearsal'};self.refresh();self.initial=self.call(create=True)
 def write_public(self,name,data):
  p=self.mu/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
 def refresh(self):
  self.config.update(plan={'transactionId':ID,'applicationCommit':'c'*40,'protectedStateSha256':'f'*64,'expected':{n:hashlib.sha256(b).hexdigest() for n,b in self.source.items()},'prior':{n:hashlib.sha256(b).hexdigest() for n,b in self.prior.items()}},sizes={n:len(b) for n,b in self.source.items()},overrides={n:base64.b64encode(b).decode() for n,b in self.prior.items() if self.source.get(n)!=b})
 def call(self,action='inspect',success=True,create=False,exit_code=0,**changes):
  c={**self.config,'action':action,'create':create,**changes};path=self.base/'config.json';path.write_bytes(json.dumps(c).encode());before=self.sentinel.read_bytes();r=subprocess.run([store.PHP,'-d','memory_limit=32M',str(self.driver),str(path)],capture_output=True,text=True,timeout=90);self.assertEqual(r.returncode,exit_code,r.stdout+r.stderr);self.assertEqual(r.stderr,'');self.assertEqual(self.sentinel.read_bytes(),before)
  if exit_code:return None
  value=json.loads(r.stdout);self.assertIs(value['ok'],success,value)
  if success:self.assertLessEqual(value['peak'],32*1024*1024);self.assertLessEqual(value['guardCalls'],4);return value['value']
  return value['error']
 def snapshot(self):return {p.relative_to(self.private).as_posix():p.read_bytes() for p in self.private.rglob('*') if p.is_file()}
 def write_private(self,name,data):
  p=self.private/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);return p
 def complete(self):
  for _ in range(30):
   state=self.call()
   if state['sourceComplete'] and state['targetComplete']:return state
   result=self.call('advance',fence=state['stateSha256']);self.assertLessEqual(result['stepBytesWritten'],8388608);self.assertLessEqual(result['stepFilesOpened'],32);self.assertGreaterEqual(result['copiedBytes'],state['copiedBytes'])
  self.fail('Bounded fixture did not complete')
 def rebuild_records(self):
  for p in (self.private/'control').iterdir():p.unlink()
  (self.private/'control').rmdir();(self.private/'owner.marker').unlink();(self.private/'controller.lock').unlink();self.private.rmdir();return self.call(create=True)
 def test_complete_exact_inventory_with_immutable_private_marker_and_idempotent_final_step(self):
  result=self.complete();before=self.snapshot();again=self.call('advance',fence=result['stateSha256']);self.assertEqual(again['stepBytesWritten'],0);self.assertEqual(self.snapshot(),before)
  for folder,files in [('source',self.source),('target',self.prior)]:
   for n,b in files.items():self.assertEqual((self.private/folder/n).read_bytes(),b)
 def test_large_original_above_embedded_seed_cap_streams_under_32MiB_and_eightMiB_per_step(self):
  name='ktk-code-pages-assets/media/original.mp4';data=b'0123456789abcdef'*(1048576+1);self.source[name]=data;self.prior[name]=data;self.write_public(name,data);self.refresh();self.rebuild_records();state=self.call();result=self.call('advance',fence=state['stateSha256']);self.assertEqual(result['stepBytesWritten'],8388608);self.assertFalse(result['sourceComplete']);self.complete();self.assertEqual((self.private/'target'/name).stat().st_size,len(data))
 def test_file_count_budget_is_separate_from_byte_budget(self):
  for i in range(72):n=f'ktk-code-pages-assets/content/part-{i:03}.html';self.source[n]=self.prior[n]=b'p';self.write_public(n,b'p')
  self.refresh();self.rebuild_records();state=self.call();r=self.call('advance',fence=state['stateSha256']);self.assertEqual(r['stepFilesOpened'],32);self.assertLess(r['stepBytesWritten'],1024);self.complete()
 def test_known_zero_and_nonempty_prefixes_resume_after_fresh_inspection(self):
  self.write_private('source/ktk-code-pages.php',self.source['ktk-code-pages.php'][:5]);self.write_private('source/ktk-code-pages-assets/runtime.js',b'');self.complete()
 def test_stale_fence_preserves_new_private_prefix(self):
  self.write_private('source/ktk-code-pages.php',self.source['ktk-code-pages.php'][:2]);before=self.snapshot();self.call('advance',success=False,fence=self.initial['stateSha256']);self.assertEqual(self.snapshot(),before)
 def test_stale_fence_after_previously_inspected_prefix_is_changed_preserves_bytes(self):
  p=self.write_private('source/ktk-code-pages.php',self.source['ktk-code-pages.php'][:2]);state=self.call();p.write_bytes(self.source['ktk-code-pages.php'][:3]);before=self.snapshot();self.call('advance',success=False,fence=state['stateSha256']);self.assertEqual(self.snapshot(),before)
 def test_changed_unknown_and_oversized_private_files_are_preserved(self):
  for name,data in [('source/ktk-code-pages.php',b'foreign'),('source/owner-note',b'keep'),('source/ktk-code-pages.php',b'x'*100)]:
   p=self.write_private(name,data);before=self.snapshot();self.call(success=False);self.assertEqual(self.snapshot(),before);p.unlink()
 def test_unknown_directory_is_preserved(self):
  p=self.private/'source/owner-folder';p.mkdir(parents=True);self.call(success=False);self.assertTrue(p.is_dir())
 def test_target_cannot_precede_complete_source(self):
  (self.private/'target').mkdir();before=self.snapshot();self.call(success=False);self.assertEqual(self.snapshot(),before)
 def test_public_source_changed_or_missing_or_extended_never_allocates_seed_payload(self):
  p=self.mu/'ktk-code-pages.php';data=p.read_bytes();p.write_bytes(b'x'*len(data));self.call(success=False);self.assertFalse((self.private/'source').exists());p.write_bytes(data);p.unlink();self.call(success=False);p.write_bytes(data);self.write_public('ktk-code-pages-assets/owner-note',b'keep');self.call(success=False);self.assertFalse((self.private/'source').exists())
 def test_lost_reply_after_open_requires_inspection_then_recovers_zero_prefix(self):
  self.call('advance',fence=self.initial['stateSha256'],fault='exit-open',exit_code=73);state=self.call();self.assertTrue(any(v['bytes']==0 for v in state['files'].values()));self.complete()
 def test_lost_reply_after_flushed_chunk_requires_inspection_then_exact_resume(self):
  self.call('advance',fence=self.initial['stateSha256'],fault='exit-chunk',exit_code=74);state=self.call();self.assertGreater(state['copiedBytes'],0);self.complete()
 def test_lost_reply_after_complete_file_does_not_rewrite_it(self):
  self.call('advance',fence=self.initial['stateSha256'],fault='exit-file',exit_code=75);state=self.call();p=self.private/next(iter(state['files']));before=p.stat().st_mtime_ns;self.complete();self.assertEqual(p.stat().st_mtime_ns,before)
 def test_changed_file_after_open_is_preserved(self):
  self.call('advance',success=False,fence=self.initial['stateSha256'],fault='change-open');self.assertTrue(any(p.read_bytes()==b'external owner bytes' for p in (self.private/'source').rglob('*') if p.is_file()))
 def test_open_file_replacement_is_preserved_and_not_appended(self):
  self.call('advance',success=False,fence=self.initial['stateSha256'],fault='replace-open');self.assertTrue(any(p.suffix=='.original' for p in (self.private/'source').rglob('*')));self.call(success=False)
 def test_protected_drift_before_step_prevents_allocation_and_drift_after_chunk_preserves_for_inspection(self):
  before=self.snapshot();self.call('advance',success=False,fence=self.initial['stateSha256'],guard='e'*64);self.assertEqual(self.snapshot(),before);self.call('advance',success=False,fence=self.initial['stateSha256'],fault='drift-chunk');self.assertTrue((self.private/'source').exists());self.complete()
 def test_wrong_scope_caller_plan_hash_size_and_override_are_refused(self):
  plan=copy.deepcopy(self.config['plan']);plan['expected']['ktk-code-pages.php']='e'*64
  cases=[{'allowed':False},{'public':self.public.parent.as_posix()},{'plan':plan},{'sizes':{**self.config['sizes'],'ktk-code-pages.php':True}},{'overrides':{**self.config['overrides'],'ktk-code-pages.php':'eA=='}},{'plan':{**self.config['plan'],'unexpected':True}}]
  for c in cases:
   before=self.snapshot();self.call(success=False,**c);self.assertEqual(self.snapshot(),before)
 def test_missing_signed_original_or_plan_prevents_private_seed_write(self):
  p=self.private/'control/controller-plan.json';data=p.read_bytes();p.unlink();before=self.snapshot();self.call('advance',success=False,fence=self.initial['stateSha256']);self.assertEqual(self.snapshot(),before);p.write_bytes(data)
 def test_hardlinked_private_prefix_is_refused_without_changing_other_name(self):
  outside=self.base/'outside';outside.write_bytes(self.source['ktk-code-pages.php'][:2]);p=self.private/'source/ktk-code-pages.php';p.parent.mkdir()
  try:os.link(outside,p)
  except OSError as e:self.skipTest('Host disallows isolated hardlink: '+type(e).__name__)
  self.call(success=False);self.assertEqual(outside.read_bytes(),self.source['ktk-code-pages.php'][:2])
 def test_symlink_private_root_is_never_followed(self):
  outside=self.base/'outside';outside.mkdir();(outside/'keep').write_bytes(b'keep')
  try:(self.private/'source').symlink_to(outside,target_is_directory=True)
  except OSError as e:self.skipTest('Host disallows isolated symlink: '+type(e).__name__)
  self.call(success=False);self.assertEqual((outside/'keep').read_bytes(),b'keep')
 def test_case_alias_and_file_directory_collision_in_declared_inventory_are_refused(self):
  for added in [{'ktk-code-pages-assets/A/a.html':'e'*64,'ktk-code-pages-assets/a/b.html':'e'*64},{'ktk-code-pages-assets/content':'e'*64}]:
   plan=copy.deepcopy(self.config['plan']);plan['expected'].update(added);sizes={**self.config['sizes'],**{n:1 for n in added}};before=self.snapshot();self.call(success=False,plan=plan,sizes=sizes);self.assertEqual(self.snapshot(),before)
 def test_production_control_record_is_not_streaming_authorization(self):
  self.config['mode']='production';before=self.sentinel.read_bytes()
  for p in (self.private/'control').iterdir():p.unlink()
  (self.private/'control').rmdir();(self.private/'owner.marker').unlink();(self.private/'controller.lock').unlink();self.private.rmdir();self.call(create=True,success=False);self.assertFalse((self.private/'source').exists());self.assertEqual(self.sentinel.read_bytes(),before)
 def test_hardlinked_staging_source_is_refused_before_private_copy(self):
  p=self.mu/'ktk-code-pages.php';outside=self.base/'source-link'
  try:os.link(p,outside)
  except OSError as e:self.skipTest('Host disallows isolated hardlink: '+type(e).__name__)
  before=outside.read_bytes();self.call(success=False);self.assertFalse((self.private/'source').exists());self.assertEqual(outside.read_bytes(),before)

 def test_host_profile_requires_explicit_separate_caller_and_binds_a_different_fence(self):
  self.call(success=False,profile='full-private-host');self.call(success=False,profile='production',hostAllowed=True);state=self.call(profile='full-private-host',hostAllowed=True);self.assertNotEqual(state['stateSha256'],self.initial['stateSha256'])
 def test_host_profile_opens_at_most_256_files_while_default_keeps_32(self):
  for i in range(270):n=f'ktk-code-pages-assets/content/host-{i:03}.html';self.source[n]=self.prior[n]=b'p';self.write_public(n,b'p')
  self.refresh();self.rebuild_records();state=self.call(profile='full-private-host',hostAllowed=True);r=self.call('advance',fence=state['stateSha256'],profile='full-private-host',hostAllowed=True);self.assertEqual(r['stepFilesOpened'],256);self.assertFalse(r['sourceComplete'])
 def test_host_profile_streams_no_more_than_64MiB_with_bounded_memory(self):
  data=b'0123456789abcdef'*(33*65536)
  for suffix in ['a','b']:
   name='ktk-code-pages-assets/media/host-'+suffix+'.mp4';self.source[name]=self.prior[name]=data;self.write_public(name,data)
  self.refresh();self.rebuild_records();state=self.call(profile='full-private-host',hostAllowed=True);r=self.call('advance',fence=state['stateSha256'],profile='full-private-host',hostAllowed=True);self.assertEqual(r['stepBytesWritten'],67108864);self.assertFalse(r['sourceComplete'])

if __name__=='__main__':unittest.main()
