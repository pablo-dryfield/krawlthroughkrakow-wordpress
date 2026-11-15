import hashlib,json,os,shutil,subprocess,tempfile,unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2];PHP=shutil.which('php');CORE=ROOT/'tools/content-update-private-store.php';ID='a'*32;KEY='b'*64
DRIVER=r'''<?php
$c=json_decode(file_get_contents($argv[1]),true,512,JSON_THROW_ON_ERROR);if($c['allowed']){define('KTK_CONTENT_UPDATE_STORE_ALLOWED',true);}
$results=array();$store=null;
try{require $c['core'];}catch(Throwable $error){if(!$c['reenter']){echo json_encode(array(array('ok'=>false,'message'=>$error->getMessage())));exit;}}
foreach($c['operations'] as $op){
 try{
  if($op['action']==='release'){$store=null;$result=true;}
  elseif($op['action']==='create'||$op['action']==='open'){
   $store=null;$observer=empty($op['fault'])?null:static function($event,$path,$blob)use($op){
    if($event==='after-temporary-open'&&$op['fault']==='partial-exit'){file_put_contents($path,substr($blob,0,23));exit(73);}
    if($event==='after-temporary-open'&&$op['fault']==='changed-before-write'){file_put_contents($path,'changed by external owner');}
    if($event==='before-record-rename'&&$op['fault']==='full-before-rename'){throw new RuntimeException('fixture interrupted before rename');}
    if($event==='before-record-rename'&&$op['fault']==='corrupt-before-rename'){file_put_contents($path,'changed by external owner');}
    if($event==='after-record-rename'&&$op['fault']==='lost-reply'){throw new RuntimeException('fixture reply lost');}
   };
   $args=array($op['root']??$c['root'],$op['public']??$c['public'],$op['id']??$c['id'],$op['key']??$c['key'],$observer);
   $store=$op['action']==='create'?KTK_Content_Update_Private_Store::create(...$args):new KTK_Content_Update_Private_Store(...$args);$result=true;
  }
  elseif($op['action']==='write'){$result=$store->writeOnce($op['name'],$op['bytes']);}
  elseif($op['action']==='read'){$result=$store->read($op['name']);}
  elseif($op['action']==='inventory'){$result=$store->inventory();}
  elseif($op['action']==='second-lock'){$second=new KTK_Content_Update_Private_Store($c['root'],$c['public'],$c['id'],$c['key']);$result=true;}
  else{throw new RuntimeException('Unknown fixture operation');}
  $results[]=array('ok'=>true,'action'=>$op['action'],'result'=>$result);
 }catch(Throwable $error){$results[]=array('ok'=>false,'action'=>$op['action'],'message'=>$error->getMessage());}
}
echo json_encode($results,JSON_THROW_ON_ERROR);
'''

@unittest.skipUnless(PHP,'PHP required for immutable private-store fixtures')
class ContentUpdatePrivateStoreTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='ktk-store-');self.base=Path(self.temp.name);self.public=self.base/'public_html';self.public.mkdir();self.sentinel=self.public/'protected-application.keep';self.sentinel.write_bytes(b'Original application must remain exact');self.private=self.base/('.ktk-content-update-'+ID);self.driver=self.base/'driver.php';self.driver.write_bytes(DRIVER.encode())
 def tearDown(self):self.temp.cleanup()
 def run_ops(self,operations,allowed=True,reenter=False,exit_code=0):
  config={'core':CORE.as_posix(),'public':self.public.as_posix(),'root':self.private.as_posix(),'id':ID,'key':KEY,'allowed':allowed,'reenter':reenter,'operations':operations};path=self.base/'config.json';path.write_bytes(json.dumps(config).encode());before=self.sentinel.read_bytes();process=subprocess.run([PHP,str(self.driver),str(path)],capture_output=True,text=True);self.assertEqual(process.returncode,exit_code,process.stderr);self.assertEqual(process.stderr,'');self.assertEqual(self.sentinel.read_bytes(),before)
  return json.loads(process.stdout) if exit_code==0 else process.stdout
 def create(self):self.assertTrue(self.run_ops([{'action':'create'}])[0]['ok'])
 def test_all_four_records_are_signed_readable_immutable_and_private(self):
  ops=[{'action':'create'}]
  for name in ['original-state.json','controller-plan.json','backup-ack.json','closed.json']:ops += [{'action':'write','name':name,'bytes':'saved '+name},{'action':'read','name':name}]
  ops += [{'action':'inventory'}];rows=self.run_ops(ops);self.assertTrue(all(row['ok'] for row in rows));self.assertEqual(len(rows[-1]['result']),4)
  for row in rows:
   if row.get('action')=='read':self.assertTrue(row['result'].startswith('saved '))
  for p in self.private.rglob('*'):
   if p.is_file():self.assertNotIn(KEY.encode(),p.read_bytes())
  if os.name!='nt':self.assertEqual(self.private.stat().st_mode&0o777,0o700);self.assertEqual((self.private/'control/backup-ack.json').stat().st_mode&0o777,0o600)
 def test_same_record_is_idempotent_and_different_bytes_are_preserved(self):
  self.create();rows=self.run_ops([{'action':'open'},{'action':'write','name':'backup-ack.json','bytes':'one'},{'action':'write','name':'backup-ack.json','bytes':'one'},{'action':'write','name':'backup-ack.json','bytes':'two'},{'action':'read','name':'backup-ack.json'}]);self.assertEqual(rows[1]['result'],hashlib.sha256(b'one').hexdigest());self.assertTrue(rows[2]['ok']);self.assertFalse(rows[3]['ok']);self.assertEqual(rows[4]['result'],'one')
 def test_existing_namespace_is_never_claimed_or_modified(self):
  self.private.mkdir();marker=self.private/'owner-note';marker.write_bytes(b'preserve');rows=self.run_ops([{'action':'create'}]);self.assertFalse(rows[0]['ok']);self.assertEqual(marker.read_bytes(),b'preserve');self.assertEqual({p.name for p in self.private.iterdir()},{'owner-note'})
 def test_wrong_scope_or_missing_caller_flag_has_no_private_initialization(self):
  for changes in [{'root':(self.public/('.ktk-content-update-'+ID)).as_posix()},{'root':self.private.as_posix()+'/../escape'},{'public':self.base.as_posix()},{'id':'../'+ID},{'key':'not-a-key'}]:
   rows=self.run_ops([{'action':'create',**changes}]);self.assertFalse(rows[0]['ok']);self.assertFalse(self.private.exists())
  for reenter in (False,True):
   rows=self.run_ops([{'action':'create'}],allowed=False,reenter=reenter);self.assertFalse(rows[0]['ok']);self.assertFalse(self.private.exists())
 def test_ownership_key_and_marker_changes_refuse_without_repair(self):
  self.create();self.assertFalse(self.run_ops([{'action':'open','key':'c'*64}])[0]['ok']);marker=self.private/'owner.marker';marker.write_bytes(b'owner changed this');rows=self.run_ops([{'action':'open'}]);self.assertFalse(rows[0]['ok']);self.assertEqual(marker.read_bytes(),b'owner changed this')
 def test_partial_write_after_real_process_exit_recovers_only_matching_bytes(self):
  self.run_ops([{'action':'create','fault':'partial-exit'},{'action':'write','name':'original-state.json','bytes':'stable original selected data'}],exit_code=73);pending=list((self.private/'control').iterdir());self.assertEqual(len(pending),1);self.assertEqual(len(pending[0].read_bytes()),23)
  rows=self.run_ops([{'action':'open'},{'action':'write','name':'original-state.json','bytes':'stable original selected data'},{'action':'read','name':'original-state.json'},{'action':'inventory'}]);self.assertTrue(all(row['ok'] for row in rows));self.assertEqual(rows[2]['result'],'stable original selected data');self.assertEqual(set(rows[3]['result']),{'original-state.json'})
 def test_partial_write_of_different_data_is_preserved_and_not_activated(self):
  self.run_ops([{'action':'create','fault':'partial-exit'},{'action':'write','name':'controller-plan.json','bytes':'initial reviewed plan'}],exit_code=73);pending=next((self.private/'control').iterdir());before=pending.read_bytes();rows=self.run_ops([{'action':'open'},{'action':'write','name':'controller-plan.json','bytes':'different plan'}]);self.assertFalse(rows[1]['ok']);self.assertEqual(pending.read_bytes(),before);self.assertFalse((self.private/'control/controller-plan.json').exists())
 def test_full_temporary_before_rename_cannot_be_replaced_by_different_data(self):
  rows=self.run_ops([{'action':'create','fault':'full-before-rename'},{'action':'write','name':'controller-plan.json','bytes':'one'}]);self.assertFalse(rows[1]['ok']);pending=next((self.private/'control').iterdir());before=pending.read_bytes();rows=self.run_ops([{'action':'open'},{'action':'write','name':'controller-plan.json','bytes':'two'}]);self.assertFalse(rows[1]['ok']);self.assertEqual(pending.read_bytes(),before)
 def test_lost_reply_after_atomic_activation_is_idempotently_inspectable(self):
  rows=self.run_ops([{'action':'create','fault':'lost-reply'},{'action':'write','name':'backup-ack.json','bytes':'verified backup archive'}]);self.assertFalse(rows[1]['ok']);path=self.private/'control/backup-ack.json';before=path.read_bytes();rows=self.run_ops([{'action':'open'},{'action':'read','name':'backup-ack.json'},{'action':'write','name':'backup-ack.json','bytes':'verified backup archive'}]);self.assertTrue(all(row['ok'] for row in rows));self.assertEqual(path.read_bytes(),before)
 def assert_changed_temporary_preserved(self,fault):
  rows=self.run_ops([{'action':'create','fault':fault},{'action':'write','name':'backup-ack.json','bytes':'intended private record'}]);self.assertFalse(rows[1]['ok']);pending=next((self.private/'control').iterdir());self.assertEqual(pending.read_bytes(),b'changed by external owner');rows=self.run_ops([{'action':'open'},{'action':'write','name':'backup-ack.json','bytes':'intended private record'}]);self.assertFalse(rows[1]['ok']);self.assertEqual(pending.read_bytes(),b'changed by external owner')
 def test_changed_temporary_is_preserved_before_any_write(self):self.assert_changed_temporary_preserved('changed-before-write')
 def test_changed_temporary_is_preserved_before_activation(self):self.assert_changed_temporary_preserved('corrupt-before-rename')
 def test_complete_temporary_can_resume_the_same_immutable_write(self):
  rows=self.run_ops([{'action':'create','fault':'full-before-rename'},{'action':'write','name':'controller-plan.json','bytes':'one'}]);self.assertFalse(rows[1]['ok']);rows=self.run_ops([{'action':'open'},{'action':'write','name':'controller-plan.json','bytes':'one'},{'action':'inventory'}]);self.assertTrue(all(row['ok'] for row in rows));self.assertEqual(set(rows[2]['result']),{'controller-plan.json'})
 def test_lock_contention_never_overwrites_and_a_later_caller_can_open(self):
  rows=self.run_ops([{'action':'create'},{'action':'second-lock'},{'action':'release'},{'action':'open'},{'action':'write','name':'backup-ack.json','bytes':'one'}]);self.assertFalse(rows[1]['ok']);self.assertTrue(rows[3]['ok']);self.assertTrue(rows[4]['ok'])
 def test_only_fixed_record_names_are_accessible_and_budget_failure_creates_no_temporary(self):
  self.create();ops=[{'action':'open'}]
  for name in ['../owner.marker','owner.marker','/original-state.json','sub/backup-ack.json','controller.lock','closed.json\n']:
   ops += [{'action':'write','name':name,'bytes':'x'},{'action':'read','name':name}]
  ops += [{'action':'write','name':'backup-ack.json','bytes':'x'*16385}];rows=self.run_ops(ops);self.assertTrue(rows[0]['ok']);self.assertTrue(all(not row['ok'] for row in rows[1:]));self.assertEqual(list((self.private/'control').iterdir()),[])
 def test_unknown_control_file_is_preserved_before_any_new_write(self):
  self.create();unknown=self.private/'control/owner-note.txt';unknown.write_bytes(b'preserve owner note');rows=self.run_ops([{'action':'open'},{'action':'write','name':'backup-ack.json','bytes':'one'},{'action':'inventory'}]);self.assertFalse(rows[1]['ok']);self.assertFalse(rows[2]['ok']);self.assertEqual(unknown.read_bytes(),b'preserve owner note');self.assertEqual({p.name for p in unknown.parent.iterdir()},{'owner-note.txt'})
 def test_unknown_control_directory_is_preserved_before_any_new_write(self):
  self.create();unknown=self.private/'control/owner-directory';unknown.mkdir();rows=self.run_ops([{'action':'open'},{'action':'write','name':'backup-ack.json','bytes':'one'}]);self.assertFalse(rows[1]['ok']);self.assertTrue(unknown.is_dir());self.assertEqual({p.name for p in unknown.parent.iterdir()},{'owner-directory'})
 def test_modified_signed_record_is_never_returned_repaired_or_overwritten(self):
  rows=self.run_ops([{'action':'create'},{'action':'write','name':'original-state.json','bytes':'original selected rows'}]);self.assertTrue(all(row['ok'] for row in rows));path=self.private/'control/original-state.json';data=path.read_bytes();changed=data[:-1]+bytes([data[-1]^1]);path.write_bytes(changed);rows=self.run_ops([{'action':'open'},{'action':'read','name':'original-state.json'},{'action':'write','name':'original-state.json','bytes':'original selected rows'}]);self.assertFalse(rows[1]['ok']);self.assertFalse(rows[2]['ok']);self.assertEqual(path.read_bytes(),changed)
 def test_unowned_temporary_with_a_plausible_name_is_preserved(self):
  self.create();path=self.private/'control'/('.ktk-control-backup-ack.json-'+'0'*64+'-'+'0'*16+'.tmp');path.write_bytes(b'unknown bytes');rows=self.run_ops([{'action':'open'},{'action':'write','name':'backup-ack.json','bytes':'one'}]);self.assertFalse(rows[1]['ok']);self.assertEqual(path.read_bytes(),b'unknown bytes')
 def test_changed_lock_record_is_preserved_without_repair(self):
  self.create();path=self.private/'controller.lock';path.write_bytes(b'f'*64);rows=self.run_ops([{'action':'open'}]);self.assertFalse(rows[0]['ok']);self.assertEqual(path.read_bytes(),b'f'*64)
 def test_signed_record_cannot_be_replayed_into_a_different_public_private_root(self):
  self.create();self.assertTrue(self.run_ops([{'action':'open'},{'action':'write','name':'backup-ack.json','bytes':'reviewed archive'}])[1]['ok']);blob=(self.private/'control/backup-ack.json').read_bytes();other=self.base/'other';other_public=other/'public_html';other_public.mkdir(parents=True);other_private=other/('.ktk-content-update-'+ID);args={'root':other_private.as_posix(),'public':other_public.as_posix()};self.assertTrue(self.run_ops([{'action':'create',**args}])[0]['ok']);target=other_private/'control/backup-ack.json';target.write_bytes(blob);rows=self.run_ops([{'action':'open',**args},{'action':'read','name':'backup-ack.json'},{'action':'write','name':'backup-ack.json','bytes':'reviewed archive'}]);self.assertFalse(rows[1]['ok']);self.assertFalse(rows[2]['ok']);self.assertEqual(target.read_bytes(),blob)
 def test_final_record_symlink_never_touches_the_public_target(self):
  self.create();path=self.private/'control/backup-ack.json'
  try:path.symlink_to(self.sentinel)
  except OSError:self.skipTest('This host cannot create the symlink fixture')
  rows=self.run_ops([{'action':'open'},{'action':'write','name':'backup-ack.json','bytes':'one'},{'action':'read','name':'backup-ack.json'}]);self.assertFalse(rows[1]['ok']);self.assertFalse(rows[2]['ok']);self.assertTrue(path.is_symlink())
 def test_private_root_symlink_cannot_claim_another_directory(self):
  outside=self.base/'outside';outside.mkdir();(outside/'owner-note').write_bytes(b'preserve')
  try:self.private.symlink_to(outside,target_is_directory=True)
  except OSError:self.skipTest('This host cannot create the directory symlink fixture')
  rows=self.run_ops([{'action':'create'},{'action':'open'}]);self.assertFalse(rows[0]['ok']);self.assertFalse(rows[1]['ok']);self.assertEqual((outside/'owner-note').read_bytes(),b'preserve');self.assertEqual({p.name for p in outside.iterdir()},{'owner-note'})

if __name__=='__main__':unittest.main()
