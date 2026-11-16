"""Exercise real private-seed completion with compiler-bound bytes and intact public sentinels."""
import base64,json,os,subprocess,tempfile,unittest
from pathlib import Path
from tools import content_update_staging_packet as packet
from tools.tests import test_content_update_private_store as store

ROOT=store.ROOT;ID=store.ID;KEY=store.KEY
DRIVER=r'''<?php
$c=json_decode(file_get_contents($argv[1]),true,64,JSON_THROW_ON_ERROR);define('KTK_CONTENT_UPDATE_STORE_ALLOWED',true);if($c['allowed']){define('KTK_CONTENT_UPDATE_SEEDS_ALLOWED',true);}
try{require $c['store'];require $c['seedComponent'];$s=$c['create']?KTK_Content_Update_Private_Store::create($c['root'],$c['public'],$c['id'],$c['key']):new KTK_Content_Update_Private_Store($c['root'],$c['public'],$c['id'],$c['key']);
$observer=empty($c['fault'])?null:static function($event,$name,$path)use($c){if($c['fault']==='exit-open'&&$event==='after-seed-file-open'){exit(73);}if($c['fault']==='exit-complete'&&$event==='after-seed-file-complete'){exit(74);}if($c['fault']==='change-open'&&$event==='after-seed-file-open'){file_put_contents($path,'external seed bytes');}};
$seed=new KTK_Content_Update_Preparation_Seeds($c['seeds'],$c['plan'],$observer);$v=$c['action']==='inspect'?$seed->inspect($s):$seed->complete($s,$c['fence']);echo json_encode(array('ok'=>true,'value'=>$v),JSON_THROW_ON_ERROR);
}catch(Throwable $e){echo json_encode(array('ok'=>false,'error'=>$e->getMessage()),JSON_THROW_ON_ERROR);}
'''

@unittest.skipUnless(store.PHP,'PHP required for private seed recovery fixtures')
class PreparationSeedsTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix='ktk-seed-recovery-');self.addCleanup(self.tmp.cleanup);self.base=Path(self.tmp.name);self.public=self.base/'public_html';self.public.mkdir();self.sentinel=self.public/'real-application.keep';self.sentinel.write_bytes(b'Original public application/forms/consent retained');self.private=self.base/('.ktk-content-update-'+ID);self.driver=self.base/'driver.php';self.driver.write_bytes(DRIVER.encode());self.seeds=packet.seeds();self.plan=packet.fixture_plan(ID,'c'*40,'f'*64);self.config={'store':store.CORE.as_posix(),'seedComponent':(ROOT/'tools/content-update-preparation-seeds.php').as_posix(),'allowed':True,'root':self.private.as_posix(),'public':self.public.as_posix(),'id':ID,'key':KEY,'plan':self.plan,'seeds':{folder:{name:base64.b64encode(data).decode() for name,data in files.items()} for folder,files in self.seeds.items()},'fault':'','fence':''};self.state=self.call(create=True)
 def call(self,action='inspect',success=True,create=False,exit_code=0,**changes):
  c={**self.config,'action':action,'create':create,**changes};path=self.base/'config.json';path.write_bytes(json.dumps(c).encode());before=self.sentinel.read_bytes();r=subprocess.run([store.PHP,str(self.driver),str(path)],capture_output=True,text=True,timeout=30);self.assertEqual(r.returncode,exit_code,r.stdout+r.stderr);self.assertEqual(r.stderr,'');self.assertEqual(self.sentinel.read_bytes(),before)
  if exit_code:return None
  value=json.loads(r.stdout);self.assertIs(value['ok'],success,value);return value.get('value') if success else value['error']
 def snapshot(self):return {p.relative_to(self.private).as_posix():p.read_bytes() for p in self.private.rglob('*') if p.is_file()}
 def write(self,name,data):
  path=self.private/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data);return path
 def complete(self):
  state=self.call();result=self.call('complete',fence=state['stateSha256']);self.assertTrue(result['sourceComplete'] and result['targetComplete'])
  for folder,files in self.seeds.items():
   for name,data in files.items():self.assertEqual((self.private/folder/name).read_bytes(),data)
  return result
 def test_empty_seed_namespace_completes_exact_compiler_bytes_and_repeated_completion_is_idempotent(self):
  result=self.complete();before=self.snapshot();self.call('complete',fence=result['stateSha256']);self.assertEqual(self.snapshot(),before)
 def test_known_candidate_and_prior_prefixes_complete_without_rewriting_full_files(self):
  name=next(iter(self.seeds['source']));self.write('source/'+name,self.seeds['source'][name][:7]);self.complete()
 def test_partial_prior_seed_requires_completed_candidate_inventory(self):
  for name,data in self.seeds['source'].items():self.write('source/'+name,data)
  name=next(iter(self.seeds['target']));self.write('target/'+name,self.seeds['target'][name][:5]);self.complete()
 def test_prior_directory_cannot_precede_complete_candidate(self):
  (self.private/'target').mkdir();before=self.snapshot();self.call(success=False);self.assertEqual(self.snapshot(),before)
 def test_changed_prefix_unknown_file_and_unknown_directory_are_preserved(self):
  name=next(iter(self.seeds['source']));path=self.write('source/'+name,b'foreign seed bytes');before=self.snapshot();self.call(success=False);self.assertEqual(self.snapshot(),before);path.unlink();path=self.write('source/owner-note',b'keep');self.call(success=False);self.assertEqual(path.read_bytes(),b'keep');path.unlink();(self.private/'source/owner-folder').mkdir();self.call(success=False);self.assertTrue((self.private/'source/owner-folder').is_dir())
 def test_wrong_or_stale_fence_never_appends(self):
  name=next(iter(self.seeds['source']));path=self.write('source/'+name,self.seeds['source'][name][:1]);before=self.snapshot();self.call('complete',success=False,fence=self.state['stateSha256']);self.assertEqual(self.snapshot(),before);state=self.call();path.write_bytes(self.seeds['source'][name][:2]);before=self.snapshot();self.call('complete',success=False,fence=state['stateSha256']);self.assertEqual(self.snapshot(),before)
 def test_lost_open_and_completed_file_responses_require_fresh_inspection_then_resume(self):
  self.call('complete',fence=self.state['stateSha256'],fault='exit-open',exit_code=73);state=self.call();self.call('complete',fence=state['stateSha256'],fault='exit-complete',exit_code=74);self.complete()
 def test_file_change_after_open_is_not_overwritten(self):
  self.call('complete',success=False,fence=self.state['stateSha256'],fault='change-open');self.assertEqual((self.private/'source/ktk-code-pages.php').read_bytes(),b'external seed bytes')
 def test_wrong_plan_bytes_unsafe_name_or_missing_caller_never_initializes_seeds(self):
  for changes in [{'allowed':False},{'plan':{**self.plan,'transactionId':'d'*32}},{'seeds':{**self.config['seeds'],'source':{**self.config['seeds']['source'],'../escape':'eA=='}}},{'seeds':{**self.config['seeds'],'source':{**self.config['seeds']['source'],'ktk-code-pages.php':'eA=='}}}]:
   before=self.snapshot();self.call(success=False,**changes);self.assertEqual(self.snapshot(),before);self.assertFalse((self.private/'source').exists())
 def test_hardlinked_partial_seed_never_changes_its_other_name(self):
  name=next(iter(self.seeds['source']));outside=self.base/'outside';outside.write_bytes(self.seeds['source'][name][:2]);path=self.private/'source'/name;path.parent.mkdir(parents=True,exist_ok=True)
  try:os.link(outside,path)
  except OSError as e:self.skipTest('Host disallows isolated hardlink: '+type(e).__name__)
  before=outside.read_bytes();self.call(success=False);self.assertEqual(outside.read_bytes(),before)
 def test_symlink_seed_root_is_never_followed(self):
  outside=self.base/'outside';outside.mkdir();(outside/'owner-note').write_bytes(b'keep')
  try:(self.private/'source').symlink_to(outside,target_is_directory=True)
  except OSError as e:self.skipTest('Host disallows isolated symlink: '+type(e).__name__)
  self.call(success=False);self.assertEqual((outside/'owner-note').read_bytes(),b'keep')

if __name__=='__main__':unittest.main()
