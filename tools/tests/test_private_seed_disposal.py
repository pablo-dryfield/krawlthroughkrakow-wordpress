"""Real-PHP disposal of an incomplete private copy after independently witnessed selected-state drift."""
import copy,json,subprocess,unittest
from tools import content_update_backup as backup
from tools.tests import test_full_private_seed_rehearsal as full

DRIVER=r'''<?php
$c=json_decode(file_get_contents($argv[1]),true,64,JSON_THROW_ON_ERROR);define('KTK_CONTENT_UPDATE_STORE_ALLOWED',true);define('KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED',true);define('KTK_CONTENT_UPDATE_FULL_HOST_STREAMING_ALLOWED',true);if($c['allowed']){define('KTK_PRIVATE_SEED_DISPOSAL_ALLOWED',true);}
$calls=0;try{require $c['store'];require $c['seeds'];require $c['disposal'];$observer=static function($event,$name,$path)use($c){
if($c['fault']==='close-prefix'&&$event==='after-temporary-open'&&str_contains($name,'closed.json')){file_put_contents($name,substr($path,0,23));exit(74);}
if($c['fault']==='changed-delete'&&$event==='before-disposal-delete'){file_put_contents($path,'external owner bytes');}
if($c['fault']==='delete-reply'&&$event==='after-disposal-delete'){exit(76);}
};$ctl=new KTK_Private_Seed_Disposal($c['packet'],static function()use($c,&$calls){$calls++;return $c['snapshot'];},$observer);$v=$ctl->run($c['raw'],$c['method'],$c['host'],$c['token'],$c['now']);echo json_encode(array('ok'=>true,'value'=>$v,'captures'=>$calls,'peak'=>memory_get_peak_usage(true)),JSON_THROW_ON_ERROR);
}catch(Throwable $e){echo json_encode(array('ok'=>false,'error'=>$e->getMessage(),'captures'=>$calls),JSON_THROW_ON_ERROR);}
'''

@unittest.skipUnless(full.store.PHP,'Real PHP required for drift-safe private disposal')
class PrivateSeedDisposalTests(unittest.TestCase):
 def setUp(self):
  self.fixture=full.FullPrivateSeedRehearsalTests('runTest');self.fixture.setUp();self.addCleanup(self.fixture.doCleanups);f=self.fixture
  s=f.begin();self.manifest=s['capsule'];f.call('advance',stateSha256=s['stateSha256'],**f.archive,changes={'fault':'stream-prefix'},exit_code=75)
  self.original=f.private_bytes();self.old_helper=f.packet['helperSha256'];f.helper.write_bytes(b'<?php /* distinct disposal operation */\n');snapshot=copy.deepcopy(f.config['snapshot']);snapshot['helperSha256']=backup.sha(f.helper.read_bytes());snapshot['database']['options'].append({'option_name':'ecwid_last_api_cache_check','option_value':'new live timestamp, never restored'});self.rehash(snapshot)
  self.binding={**f.binding,'disposalId':'7'*32};packet={**f.packet,'helperSha256':snapshot['helperSha256'],'originalHelperSha256':self.old_helper,'originalManifest':self.manifest,'originalArchiveSha256':'a'*64,'freshProtectedStateSha256':snapshot['protectedStateSha256'],'witnessArchiveSha256':'9'*64,'disposalId':'7'*32}
  packet.pop('priorOverrides',None);packet['priorOverrides']=f.packet['priorOverrides']
  self.config={**f.config,'packet':packet,'snapshot':snapshot,'disposal':(full.ROOT/'tools/private-seed-disposal.php').as_posix()};self.driver=f.base/'dispose.php';self.driver.write_bytes(DRIVER.encode());self.abandoned=None
 def rehash(self,s):
  s['rowCounts']={n:len(v) for n,v in s['database'].items()};s['databaseSha256']=backup.sha(backup.encode(s['database']));s['protectedStateSha256']=backup.sha(backup.encode({'identity':s['identity'],'databaseSha256':s['databaseSha256'],'files':s['protectedFiles']}))
 def call(self,action='inspect',success=True,changes=None,exit_code=0,**fields):
  f=self.fixture;c={**self.config,'raw':backup.encode({'schemaVersion':1,'action':action,**self.binding,**fields}).decode(),**(changes or {})};p=f.base/'dispose-config.json';p.write_bytes(json.dumps(c).encode());before=f.sentinel.read_bytes();r=subprocess.run([full.store.PHP,'-d','memory_limit=32M',str(self.driver),str(p)],capture_output=True,text=True,timeout=90);self.assertEqual(r.returncode,exit_code,r.stdout+r.stderr);self.assertFalse(r.stderr,r.stderr);self.assertEqual(f.sentinel.read_bytes(),before)
  for n,b in f.source.items():self.assertEqual((f.mu/n).read_bytes(),b)
  if exit_code:return
  v=json.loads(r.stdout);self.assertIs(v['ok'],success,v);self.captures=v['captures']
  if success:self.assertLessEqual(v['peak'],33554432);return v['value']
  return v['error']
 def abandon(self):
  s=self.call();self.abandoned=s['seed']['stateSha256'];return self.call('abandon',stateSha256=s['stateSha256'],abandonedSeedStateSha256=self.abandoned)
 def test_fresh_witness_abandons_only_private_payload_preserving_original_records_and_both_selected_states(self):
  s=self.abandon();s=self.call('cleanup',stateSha256=s['stateSha256'],abandonedSeedStateSha256=self.abandoned);self.assertEqual(s['phase'],'disposed');self.assertFalse(s['fullPrivateCopyVerified']);self.assertFalse(s['fullHostTransactionAcceptance']);self.assertNotEqual(s['originalProtectedStateSha256'],s['freshProtectedStateSha256']);remaining=self.fixture.private_bytes();self.assertEqual(len(remaining),5)
  for n in ('control/original-state.json','control/controller-plan.json','owner.marker','controller.lock'):self.assertEqual(remaining[n],self.original[n])
  self.assertIn(b'full-private-seeds-abandoned-with-fresh-guard',remaining['control/closed.json']);self.assertIn(b'new live timestamp',backup.encode(self.config['snapshot']))
 def test_auth_scope_expiry_and_copy_apply_actions_are_refused_before_queries_or_mutation(self):
  for c in [{'token':'wrong'},{'host':'www.krawlthroughkrakow.com'},{'method':'GET'},{'now':2000},{'allowed':False},{'raw':backup.encode({'schemaVersion':1,'action':'advance',**self.binding}).decode()}]:
   before=self.fixture.private_bytes();self.call(success=False,changes=c);self.assertEqual(self.captures,0);self.assertEqual(self.fixture.private_bytes(),before)
 def test_fresh_selected_state_drift_never_restores_or_deletes(self):
  s=copy.deepcopy(self.config['snapshot']);s['database']['options'][-1]['option_value']='newer real value';self.rehash(s);before=self.fixture.private_bytes();self.call(success=False,changes={'snapshot':s});self.assertEqual(self.fixture.private_bytes(),before);self.assertEqual(s['database']['options'][-1]['option_value'],'newer real value')
 def test_wrong_original_archive_capsule_or_helper_binding_is_refused(self):
  for key,value in [('originalHelperSha256','e'*64),('originalManifest',{**self.manifest,'manifestSha256':'e'*64})]:
   before=self.fixture.private_bytes();self.call(success=False,changes={'packet':{**self.config['packet'],key:value}});self.assertEqual(self.fixture.private_bytes(),before)
 def test_stale_fence_and_unclosed_cleanup_never_delete(self):
  s=self.call();before=self.fixture.private_bytes();self.call('abandon',success=False,stateSha256='e'*64,abandonedSeedStateSha256=s['seed']['stateSha256']);self.call('cleanup',success=False,stateSha256=s['stateSha256'],abandonedSeedStateSha256=s['seed']['stateSha256']);self.assertEqual(self.fixture.private_bytes(),before)
 def test_unknown_members_and_changed_delete_bytes_are_preserved(self):
  note=self.fixture.private/'owner-note';note.write_bytes(b'owner');before=self.fixture.private_bytes();self.call(success=False);self.assertEqual(self.fixture.private_bytes(),before);note.unlink();s=self.abandon();self.call('cleanup',success=False,stateSha256=s['stateSha256'],abandonedSeedStateSha256=self.abandoned,changes={'fault':'changed-delete'});self.assertIn(b'external owner bytes',self.fixture.private_bytes().values())
 def test_interrupted_signed_abandonment_is_read_only_inspectable_and_recovers_with_matching_fence(self):
  s=self.call();self.abandoned=s['seed']['stateSha256'];self.call('abandon',stateSha256=s['stateSha256'],abandonedSeedStateSha256=self.abandoned,changes={'fault':'close-prefix'},exit_code=74);before=self.fixture.private_bytes();s=self.call('inspect-abandoned',abandonedSeedStateSha256=self.abandoned);self.assertEqual(before,self.fixture.private_bytes());s=self.call('abandon',stateSha256=s['stateSha256'],abandonedSeedStateSha256=self.abandoned);self.assertTrue(s['closed'])
 def test_lost_cleanup_reply_requires_fresh_inspection_and_preserves_retained_records(self):
  s=self.abandon();self.call('cleanup',stateSha256=s['stateSha256'],abandonedSeedStateSha256=self.abandoned,changes={'fault':'delete-reply'},exit_code=76);s=self.call('inspect-abandoned',abandonedSeedStateSha256=self.abandoned);s=self.call('cleanup',stateSha256=s['stateSha256'],abandonedSeedStateSha256=self.abandoned);self.assertEqual(s['phase'],'disposed');before=self.fixture.private_bytes();s=self.call('cleanup',stateSha256=s['stateSha256'],abandonedSeedStateSha256=self.abandoned);self.assertEqual(before,self.fixture.private_bytes());self.assertEqual(s['operation']['payloadFilesDeleted'],0)

if __name__=='__main__':unittest.main()
