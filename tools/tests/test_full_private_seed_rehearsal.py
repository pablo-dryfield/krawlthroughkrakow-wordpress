"""Real-PHP full private copy protocol; synthetic WordPress state, unchanged public sentinels."""
import base64,copy,hashlib,json,subprocess,tempfile,unittest
from pathlib import Path
from tools import content_update_backup as backup
from tools import content_update_staging_packet as packet
from tools.tests import test_content_update_private_store as store

ROOT=store.ROOT;ID='d'*32;TOKEN='T'*43
DRIVER=r'''<?php
$c=json_decode(file_get_contents($argv[1]),true,64,JSON_THROW_ON_ERROR);define('KTK_CONTENT_UPDATE_STORE_ALLOWED',true);define('KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED',true);if($c['hostAllowed']){define('KTK_CONTENT_UPDATE_FULL_HOST_STREAMING_ALLOWED',true);}if($c['allowed']){define('KTK_FULL_PRIVATE_SEED_REHEARSAL_ALLOWED',true);}
$calls=0;try{require $c['store'];require $c['seeds'];require $c['controller'];
$observer=static function($event,$name,$path)use($c){
if($c['fault']==='original-prefix'&&$event==='after-temporary-open'&&str_contains($name,'original-state.json')){file_put_contents($name,substr($path,0,23));exit(73);}
if($c['fault']==='close-prefix'&&$event==='after-temporary-open'&&str_contains($name,'closed.json')){file_put_contents($name,substr($path,0,23));exit(74);}
if($c['fault']==='stream-prefix'&&$event==='after-stream-chunk'){exit(75);}if($c['fault']==='delete-reply'&&$event==='after-full-seed-delete'){exit(76);}
if($c['fault']==='changed-delete'&&$event==='before-full-seed-delete'){file_put_contents($path,'external owner changed bytes');}
};$ctl=new KTK_Full_Private_Seed_Rehearsal($c['packet'],static function()use($c,&$calls){$calls++;return $c['snapshot'];},$observer);$v=$ctl->run($c['raw'],$c['method'],$c['host'],$c['token'],$c['now']);echo json_encode(array('ok'=>true,'value'=>$v,'captures'=>$calls,'peak'=>memory_get_peak_usage(true)),JSON_THROW_ON_ERROR);
}catch(Throwable $e){echo json_encode(array('ok'=>false,'error'=>$e->getMessage(),'captures'=>$calls),JSON_THROW_ON_ERROR);}
'''

@unittest.skipUnless(store.PHP,'Real PHP required for full private seed protocol fixtures')
class FullPrivateSeedRehearsalTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix='ktk-host-');self.addCleanup(self.tmp.cleanup);self.base=Path(self.tmp.name);self.public=self.base/'public_html';self.mu=self.public/'staging/wp-content/mu-plugins';self.mu.mkdir(parents=True);self.private=self.base/('.ktk-content-update-'+ID);self.source=packet.seeds()['source'];self.prior=packet.seeds()['target']
  for n,b in self.source.items():p=self.mu/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
  self.helper=self.mu/('ktk-transaction-rehearsal-'+ID+'.php');self.helper.write_bytes(b'<?php /* local helper, never executed */\n');self.sentinel=self.public/'production-forms-consent.keep';self.sentinel.write_bytes(b'Protected production and commerce retained');self.driver=self.base/'driver.php';self.driver.write_bytes(DRIVER.encode());owned={n:backup.sha(b) for n,b in self.source.items()};identity={'home':'https://krawlthroughkrakow.com/staging/','siteurl':'https://krawlthroughkrakow.com/staging/','blogPublic':0,'frontPageId':278,'wordpressEnvironment':'production'};db={n:[] for n in ['posts','postmeta','options','terms','term_taxonomy','term_relationships','termmeta']};db['posts']=[{'ID':'1','post_content':'Original fixture'}];db['options']=[{'option_name':'blog_public','option_value':'0'}];dbsha=backup.sha(backup.encode(db));protected={'mu/protected.php':'e'*64};protectedsha=backup.sha(backup.encode({'identity':identity,'databaseSha256':dbsha,'files':protected}));plan=packet.fixture_plan(ID,'c'*40,protectedsha)
  self.packet={'expires':2000,'helperPath':self.helper.as_posix(),'helperSha256':backup.sha(self.helper.read_bytes()),'ownershipKey':'b'*64,'plan':plan,'priorOverrides':{n:base64.b64encode(b).decode() for n,b in self.prior.items() if self.source.get(n)!=b},'publicRoot':self.public.as_posix(),'sizes':{n:len(b) for n,b in self.source.items()},'tokenSha256':backup.sha(TOKEN.encode())};self.binding={'transactionId':ID,'applicationCommit':'c'*40,'planSha256':backup.sha(backup.encode(plan,sort=True))};snapshot={'schemaVersion':1,'scope':'staging-protected-original-state','capturedAt':'2026-11-16T09:00:00+00:00','helperSha256':self.packet['helperSha256'],'identity':identity,'database':db,'databaseSha256':dbsha,'protectedFiles':protected,'ownedContentFiles':owned,'protectedStateSha256':protectedsha,'rowCounts':{n:len(v) for n,v in db.items()},'databaseWrites':0,'applicationWrites':0,'cachePurges':0}
  self.config={'store':store.CORE.as_posix(),'seeds':(ROOT/'tools/content-update-streaming-seeds.php').as_posix(),'controller':(ROOT/'tools/full-private-seed-rehearsal.php').as_posix(),'packet':self.packet,'snapshot':snapshot,'allowed':True,'hostAllowed':True,'method':'POST','host':'krawlthroughkrakow.com','token':TOKEN,'now':1000,'fault':''};self.archive=None
 def raw(self,action,**fields):return backup.encode({'schemaVersion':1,'action':action,**self.binding,**fields}).decode()
 def call(self,action='inspect',success=True,exit_code=0,changes=None,**fields):
  c={**self.config,'raw':self.raw(action,**fields),**(changes or {})};p=self.base/'config.json';p.write_bytes(json.dumps(c).encode());before=self.sentinel.read_bytes();r=subprocess.run([store.PHP,'-d','memory_limit=32M',str(self.driver),str(p)],capture_output=True,text=True,timeout=90);self.assertEqual(r.returncode,exit_code,r.stdout+r.stderr);self.assertFalse(r.stderr,r.stderr);self.assertEqual(self.sentinel.read_bytes(),before)
  for n,b in self.source.items():self.assertEqual((self.mu/n).read_bytes(),b)
  if exit_code:return None
  v=json.loads(r.stdout);self.assertIs(v['ok'],success,v);self.captures=v['captures']
  if success:self.assertLessEqual(v['peak'],33554432);return v['value']
  return v['error']
 def private_bytes(self):return {p.relative_to(self.private).as_posix():p.read_bytes() for p in self.private.rglob('*') if p.is_file()} if self.private.exists() else {}
 def begin(self):
  s=self.call();self.assertEqual(s['phase'],'absent');s=self.call('begin',stateSha256=s['stateSha256']);self.assertEqual(s['phase'],'copying');self.archive={'originalManifestSha256':s['capsule']['manifestSha256'],'originalArchiveSha256':'a'*64};return self.call('inspect-archived',**self.archive)
 def advance(self,s):return self.call('advance',stateSha256=s['stateSha256'],**self.archive)
 def ready(self):
  s=self.begin()
  for _ in range(10):
   if s['phase']=='ready-to-close':return s
   s=self.advance(s);self.assertLessEqual(s['operation']['payloadBytesWritten'],67108864);self.assertLessEqual(s['operation']['payloadFilesOpened'],256)
  self.fail('Private fixture did not finish')
 def closed(self):
  s=self.ready();s=self.call('close',stateSha256=s['stateSha256'],**self.archive);self.assertTrue(s['closed']);return s
 def test_complete_copy_archive_gate_signed_close_and_exact_disposal_retain_only_five_metadata_files(self):
  s=self.closed();s=self.call('cleanup',stateSha256=s['stateSha256'],**self.archive);self.assertEqual(s['phase'],'disposed');self.assertEqual(s['operation']['payloadFilesDeleted'],13);self.assertEqual(set(self.private_bytes()),{'owner.marker','controller.lock','control/original-state.json','control/controller-plan.json','control/closed.json'});before=self.private_bytes();s=self.call('cleanup',stateSha256=s['stateSha256'],**self.archive);self.assertEqual(s['operation']['payloadFilesDeleted'],0);self.assertEqual(self.private_bytes(),before)
 def test_invalid_auth_method_host_expiry_canonical_body_and_binding_make_zero_queries_or_private_writes(self):
  for c in [{'token':'wrong'},{'method':'GET'},{'host':'www.krawlthroughkrakow.com'},{'now':2000},{'raw':self.raw('inspect')+' '},{'raw':self.raw('inspect').replace('c'*40,'e'*40)}]:
   self.call(success=False,changes=c);self.assertEqual(self.captures,0);self.assertFalse(self.private.exists())
 def test_unapproved_caller_host_profile_and_production_helper_path_are_refused_without_queries(self):
  for c in [{'allowed':False},{'hostAllowed':False},{'packet':{**self.packet,'helperPath':(self.public/'wp-content/mu-plugins'/self.helper.name).as_posix()}}]:
   self.call(success=False,changes=c);self.assertEqual(self.captures,0);self.assertFalse(self.private.exists())
 def test_archive_required_before_payload_copy_and_wrong_manifest_never_allocates(self):
  s=self.begin();before=self.private_bytes();self.call('advance',success=False,stateSha256=s['stateSha256']);self.call('advance',success=False,stateSha256=s['stateSha256'],originalManifestSha256='e'*64,originalArchiveSha256='a'*64);self.assertEqual(self.private_bytes(),before);self.assertFalse((self.private/'source').exists())
 def test_ordinary_begin_refuses_existing_owned_namespace_and_stale_requests_never_append(self):
  s=self.begin();before=self.private_bytes();self.call('begin',success=False,stateSha256=s['stateSha256']);self.assertEqual(self.private_bytes(),before);old=s;s=self.advance(s);before=self.private_bytes();self.call('advance',success=False,stateSha256=old['stateSha256'],**self.archive);self.assertEqual(self.private_bytes(),before)
 def test_original_capsule_prefix_preserves_capture_time_and_requires_fresh_explicit_recovery(self):
  s=self.call();self.call('begin',stateSha256=s['stateSha256'],changes={'fault':'original-prefix'},exit_code=73);snapshot=copy.deepcopy(self.config['snapshot']);snapshot['capturedAt']='2026-11-16T10:00:00+00:00';self.config['snapshot']=snapshot;s=self.call();self.assertEqual(s['phase'],'preparing-original');s=self.call('recover-begin',stateSha256=s['stateSha256']);blob=(self.private/'control/original-state.json').read_bytes();self.assertIn(b'2026-11-16T09:00:00+00:00',blob);self.assertNotIn(b'2026-11-16T10:00:00+00:00',blob);self.assertEqual(s['phase'],'copying')
 def test_lost_stream_reply_preserves_known_prefix_and_fresh_inspection_can_resume(self):
  s=self.begin();self.call('advance',stateSha256=s['stateSha256'],**self.archive,changes={'fault':'stream-prefix'},exit_code=75);s=self.call('inspect-archived',**self.archive);self.assertGreater(s['seed']['copiedBytes'],0)
  for _ in range(5):
   if s['phase']=='ready-to-close':break
   s=self.advance(s)
  self.assertEqual(s['phase'],'ready-to-close')
 def test_partial_signed_close_is_read_only_inspectable_and_recovers_without_rewriting_original(self):
  s=self.ready();original=(self.private/'control/original-state.json').read_bytes();self.call('close',stateSha256=s['stateSha256'],**self.archive,changes={'fault':'close-prefix'},exit_code=74);before=self.private_bytes();s=self.call('inspect-archived',**self.archive);self.assertEqual(s['phase'],'closing-interrupted');self.assertEqual(self.private_bytes(),before);s=self.call('close',stateSha256=s['stateSha256'],**self.archive);self.assertTrue(s['closed']);self.assertEqual((self.private/'control/original-state.json').read_bytes(),original)
 def test_cleanup_requires_closure_and_changed_file_at_delete_is_preserved(self):
  s=self.ready();before=self.private_bytes();self.call('cleanup',success=False,stateSha256=s['stateSha256'],**self.archive);self.assertEqual(self.private_bytes(),before);s=self.call('close',stateSha256=s['stateSha256'],**self.archive);self.call('cleanup',success=False,stateSha256=s['stateSha256'],**self.archive,changes={'fault':'changed-delete'});self.assertTrue(any(b==b'external owner changed bytes' for b in self.private_bytes().values()))
 def test_lost_cleanup_reply_requires_inspection_and_continues_known_remaining_files(self):
  s=self.closed();self.call('cleanup',stateSha256=s['stateSha256'],**self.archive,changes={'fault':'delete-reply'},exit_code=76);s=self.call('inspect-archived',**self.archive);self.assertEqual(s['phase'],'disposing');s=self.call('cleanup',stateSha256=s['stateSha256'],**self.archive);self.assertEqual(s['phase'],'disposed')
 def test_unknown_private_member_and_protected_database_drift_are_preserved(self):
  s=self.begin();p=self.private/'owner-note';p.write_bytes(b'keep');before=self.private_bytes();self.call('inspect-archived',success=False,**self.archive);self.assertEqual(self.private_bytes(),before);p.unlink();snapshot=copy.deepcopy(self.config['snapshot']);snapshot['database']['options'][0]['option_value']='1';before=self.private_bytes();self.call('advance',success=False,stateSha256=s['stateSha256'],**self.archive,changes={'snapshot':snapshot});self.assertEqual(self.private_bytes(),before)
 def test_unknown_request_paths_budgets_and_production_action_are_refused_before_queries(self):
  for raw in [self.raw('inspect',path='/public_html'),self.raw('inspect',limit=999),self.raw('apply'),self.raw('prepare-production')]:
   self.call(success=False,changes={'raw':raw});self.assertEqual(self.captures,0);self.assertFalse(self.private.exists())
 def test_closed_archive_binding_cannot_be_replaced(self):
  s=self.closed();before=self.private_bytes();self.call('inspect-archived',success=False,originalManifestSha256=self.archive['originalManifestSha256'],originalArchiveSha256='e'*64);self.assertEqual(self.private_bytes(),before)
 def test_known_incomplete_prefix_can_be_explicitly_abandoned_and_disposed_without_completion_claim(self):
  s=self.begin();self.call('advance',stateSha256=s['stateSha256'],**self.archive,changes={'fault':'stream-prefix'},exit_code=75);s=self.call('inspect-archived',**self.archive);args={**self.archive,'abandonedSeedStateSha256':s['seed']['stateSha256']};s=self.call('abandon',stateSha256=s['stateSha256'],**args);self.assertEqual(s['phase'],'abandoned');self.assertFalse(s['seed']['sourceComplete']);s=self.call('cleanup-abandoned',stateSha256=s['stateSha256'],**args);self.assertEqual(s['phase'],'disposed-abandoned');self.assertFalse(s['fullHostTransactionAcceptance']);self.assertEqual(len(self.private_bytes()),5)
 def test_stale_abandonment_and_completed_inventory_abandonment_never_write_closure(self):
  s=self.begin();before=self.private_bytes();self.call('abandon',success=False,stateSha256=s['stateSha256'],**self.archive,abandonedSeedStateSha256='e'*64);self.assertEqual(self.private_bytes(),before)
  while s['phase']!='ready-to-close':s=self.advance(s)
  before=self.private_bytes();self.call('abandon',success=False,stateSha256=s['stateSha256'],**self.archive,abandonedSeedStateSha256=s['seed']['stateSha256']);self.assertEqual(self.private_bytes(),before)
 def test_interrupted_abandonment_is_inspected_and_resumed_from_its_exact_original_partial_state(self):
  s=self.begin();self.call('advance',stateSha256=s['stateSha256'],**self.archive,changes={'fault':'stream-prefix'},exit_code=75);s=self.call('inspect-archived',**self.archive);args={**self.archive,'abandonedSeedStateSha256':s['seed']['stateSha256']};self.call('abandon',stateSha256=s['stateSha256'],**args,changes={'fault':'close-prefix'},exit_code=74);s=self.call('inspect-abandoned',**args);self.assertEqual(s['phase'],'abandoning-interrupted');s=self.call('abandon',stateSha256=s['stateSha256'],**args);self.assertEqual(s['phase'],'abandoned')

if __name__=='__main__':unittest.main()
