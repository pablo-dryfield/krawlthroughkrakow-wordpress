"""Noncreating native reinspection; test closure inputs use the frozen store only."""
import base64
import copy
from pathlib import Path
import unittest

from tools import content_update_backup as backup
from tools.tests import test_private_engine_termination_binding as bound

BRANCH=r'''
 if($c['operation']==='fenced-inspect'||$c['operation']==='fixture-closure-write'){
  $captures=0;$fresh=static function()use($c,$capture,&$captures){
   $captures++;
   if($captures===2&&($c['fencedFault']??'')==='raw'){$GLOBALS['c']['rows']['options'][]=array('option_name'=>'ecwid_last_api_cache_check','option_value'=>'changed-during-fenced-inspection');}
   if($captures===2&&($c['fencedFault']??'')==='metadata'){file_put_contents($c['fencedConfig']['publicRoot'].'/../.ktk-content-update-'.$c['packet']['plan']['transactionId'].'/engine/'.$c['packet']['plan']['transactionId'].'/journal.json','changed private journal evidence');}
   if($captures===2&&($c['fencedFault']??'')==='public'){file_put_contents($c['fencedConfig']['publicRoot'].'/staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css','new public bytes during inspection');}
   $v=$capture();return array('ownedContentFiles'=>$v['ownedContentFiles'],'protectedStateSha256'=>$v['protectedStateSha256']);
  };
  $observer=static function($event,$path,$blob)use($c){
   if($event==='after-temporary-open'&&($c['closureCut']??'')==='prefix'){file_put_contents($path,substr($blob,0,$c['prefixBytes']));exit(86);}
   if($event==='before-record-rename'&&($c['closureCut']??'')==='full-pending'){exit(87);}
   if($event==='after-record-rename'&&($c['closureCut']??'')==='lost-reply'){exit(88);}
  };
  $root=dirname($c['packet']['publicRoot']).'/.ktk-content-update-'.$c['packet']['plan']['transactionId'];
  $store=new KTK_Content_Update_Private_Store($root,$c['packet']['publicRoot'],$c['packet']['plan']['transactionId'],$c['packet']['ownershipKey'],$observer);
  if($c['operation']==='fixture-closure-write'){$parts=explode("\n",base64_decode($c['fencedConfig']['closureBlob'],true),3);$store->writeOnce('closed.json',$parts[2]);echo json_encode(array('ok'=>true));exit;}
  $reader=new KTK_Private_Engine_Fenced_Inspection($c['fencedConfig'],$fresh);
  try{
   if(!empty($c['fencedVerifyHeldLock'])){$refused=false;try{$reader->assertHeldEngineLock($store);}catch(RuntimeException $e){$refused=true;}if(!$refused){throw new RuntimeException('Uninspected reader cannot certify a held inspection lock');}}
   $result=$reader->inspect($store);$lifetime=false;
   if(!empty($c['fencedVerifyHeldLock'])){
    $reader->assertHeldEngineLock($store);
    $path=$root.'/engine/target-'.hash('sha256',$root.'/target').'.lock';$other=fopen($path,'r+b');if(!$other||flock($other,LOCK_EX|LOCK_NB)){throw new RuntimeException('Fenced reader did not retain existing engine lock');}fclose($other);
    $reader->releaseEngineLock();$refused=false;try{$reader->assertHeldEngineLock($store);}catch(RuntimeException $e){$refused=true;}if(!$refused){throw new RuntimeException('Released inspection lock must not be silently reacquired');}$other=fopen($path,'r+b');if(!$other||!flock($other,LOCK_EX|LOCK_NB)){throw new RuntimeException('Explicit fenced reader release did not unlock engine');}flock($other,LOCK_UN);fclose($other);$lifetime=true;
   }
   echo json_encode(array('ok'=>true,'inspection'=>$result,'captures'=>$captures,'engineLockLifetimeVerified'=>$lifetime),JSON_THROW_ON_ERROR);exit;
  }finally{$reader->releaseEngineLock();}
 }
'''


@unittest.skipUnless(bound.native.bridge.old.PHP,'Real PHP required for noncreating fenced private inspection')
class PrivateEngineFencedInspectionTests(unittest.TestCase):
    def setUp(self):
        self.binding=bound.PrivateEngineTerminationBindingTests('runTest');self.binding.setUp();self.addCleanup(self.binding.doCleanups);self.native=self.binding.base;self.case=self.binding.case
        self.case.cfg['components'].append(str(bound.native.bridge.old.ROOT/'tools/private-engine-fenced-inspection.php'))
        text=self.case.driver.read_text();flag="define('KTK_PRIVATE_ENGINE_ABANDONMENT_INSPECTION_ALLOWED',true);";self.assertEqual(text.count(flag),1);text=text.replace(flag,flag+"define('KTK_PRIVATE_ENGINE_FENCED_INSPECTION_ALLOWED',true);",1)
        anchor=' $controller=new KTK_Full_Private_Engine_Controller(';self.assertEqual(text.count(anchor),1);self.case.driver.write_text(text.replace(anchor,BRANCH+anchor,1))

    def configure(self,prepared=True,original_closed=False):
        if prepared:self.native.prepared()
        if original_closed:
            self.native.acknowledge()
            for action,phase in [('apply','applied'),('rollback','rolled-back')]:
                for _ in range(10):
                    if self.case.client.state['engine']['phase']==phase:break
                    self.case.client.step(action)
                self.assertEqual(self.case.client.state['engine']['phase'],phase)
            self.case.client.close()
        self.binding.fence();verified=self.binding.validate();self.closure=verified['closureBlob'];f=self.binding.fence_packet
        self.config=dict(schemaVersion=1,scope='immutable-archive-fenced-private-inspection',publicRoot=self.case.cfg['packet']['publicRoot'],ownershipKey=self.binding.old['ownershipKey'],plan=self.case.plan,sizes=self.case.sizes,initialInspection=self.binding.inspection,retained=verified['retained'],payload=verified['payload'],closureBlob=base64.b64encode(self.closure).decode(),fence={n:f[n] for n in ('operationId','metadataArchiveSha256','originalArchiveSha256','witnessArchiveSha256')},freshProtectedStateSha256=f['freshProtectedStateSha256'],freshPublicOwnedSha256=f['freshPublicOwnedSha256'])

    def inspect(self,success=True,config=None,fault='',verify_lock=False):
        state=self.native.snapshot();packet=copy.deepcopy(config or self.config);packet.update(freshProtectedStateSha256=state['protectedStateSha256'],freshPublicOwnedSha256=backup.sha(backup.encode(state['ownedContentFiles'],sort=True)))
        before_private=self.native.files(self.case.private);before_public=self.native.files(self.case.root/'public_html');self.case.cfg.update(operation='fenced-inspect',fencedConfig=packet,fencedFault=fault,fencedVerifyHeldLock=verify_lock)
        out=self.case.case.call(self.case.root,self.case.driver,self.case.cfg);self.assertIs(out['ok'],success,out)
        if fault!='metadata':self.assertEqual(self.native.files(self.case.private),before_private)
        if fault!='public':self.assertEqual(self.native.files(self.case.root/'public_html'),before_public)
        if success:
            view=out['inspection'];self.assertEqual(out['captures'],3);self.assertTrue(view['readOnly'] and view['freshWitnessVerified']);self.assertFalse(view['originalPrivateTreeFullyRemoved']);self.assertTrue(view['operationClaimsNotTraversed'])
            for n in ('closureWrites','payloadDeletes','applicationWrites','databaseWrites','cachePurges','productionOperations'):self.assertEqual(view[n],0)
            self.assertEqual(view['stateSha256'],backup.sha(backup.encode({k:v for k,v in view.items() if k!='stateSha256'},sort=True)))
            if verify_lock:self.assertTrue(out['engineLockLifetimeVerified'])
            return view
        return out['message']

    def applied(self):
        self.native.prepared();self.native.acknowledge()
        for _ in range(10):
            if self.case.client.state['engine']['phase']=='applied':return
            self.case.client.step('apply')
        self.fail('Bounded native fixture application did not finish')

    def closure_fixture(self,cut='',prefix_bytes=23):
        self.case.cfg.update(operation='fixture-closure-write',fencedConfig=self.config,closureCut=cut,prefixBytes=prefix_bytes)
        code={'':0,'prefix':86,'full-pending':87,'lost-reply':88}[cut];out=self.case.case.call(self.case.root,self.case.driver,self.case.cfg,exit_code=code)
        if not cut:self.assertTrue(out['ok'])

    def test_initial_cold_and_prepared_censuses_are_readonly_without_closure_initialization(self):
        self.configure(prepared=False);view=self.inspect();self.assertEqual(view['closureState'],'absent');self.assertEqual(view['remainingPayloadFiles'],0);self.assertFalse(self.case.engine.exists())

    def test_prepared_reader_retains_existing_engine_lock_until_explicit_release(self):
        self.configure();view=self.inspect(verify_lock=True);self.assertEqual(view['closureState'],'absent');self.assertTrue(view['closureOnlyRecoveryRequired'])

    def test_empty_and_partial_signed_closure_temporary_cuts_remain_readonly_inspectable(self):
        self.configure();self.closure_fixture('prefix',prefix_bytes=0);view=self.inspect();self.assertEqual(view['closureState'],'known-prefix');self.assertFalse(view['signedClosureComplete'])

    def test_actual_partial_signed_record_prefix_is_preserved_without_completing_it(self):
        self.configure();self.closure_fixture('prefix');view=self.inspect();self.assertEqual(view['closureState'],'known-prefix');self.assertFalse((self.case.private/'control/closed.json').exists())

    def test_full_pending_record_and_lost_rename_reply_are_classified_without_writes(self):
        self.configure();self.closure_fixture('full-pending');self.assertEqual(self.inspect()['closureState'],'known-prefix')
        # Fixture recovery uses the frozen store, not an accepted profile writer.
        self.closure_fixture('lost-reply');view=self.inspect();self.assertEqual(view['closureState'],'complete');self.assertEqual((self.case.private/'control/closed.json').read_bytes(),self.closure)

    def test_known_payload_subsets_after_signed_closure_do_not_recreate_removed_seed_root(self):
        self.configure();self.closure_fixture();removed=0
        for name in self.config['payload']:
            if name.startswith('source/'):
                p=self.case.private/name;self.assertTrue(p.resolve().is_relative_to(self.case.root.resolve()));p.unlink();removed+=1
        root=self.case.private/'source'
        for p in sorted(root.rglob('*'),key=lambda p:len(p.parts),reverse=True):
            self.assertTrue(p.resolve().is_relative_to(self.case.root.resolve()));self.assertTrue(p.is_dir());p.rmdir()
        root.rmdir();self.native.change_cache_row();public=self.case.mu/'ktk-code-pages-assets/runtime.css';public.write_bytes(b'explicitly newer complete public fixture')
        view=self.inspect();self.assertEqual(view['remainingPayloadFiles'],len(self.config['payload'])-removed);self.assertFalse(root.exists());self.assertFalse(view['originalProtectedStateStillExact']);self.assertEqual(public.read_bytes(),b'explicitly newer complete public fixture')
        # Explicit fixture removal only: the profile still has no cleanup writer.
        for name in self.config['payload']:
            p=self.case.private/name;self.assertTrue(p.resolve().is_relative_to(self.case.root.resolve()))
            if p.exists():self.assertTrue(p.is_file());p.unlink()
        for name in sorted(self.config['initialInspection']['directories'],key=lambda n:len(n),reverse=True):
            if name in ('source','target') or name.startswith(('source/','target/')):
                p=self.case.private/name;self.assertTrue(p.resolve().is_relative_to(self.case.root.resolve()))
                if p.exists():self.assertTrue(p.is_dir());p.rmdir()
        final=self.inspect();self.assertEqual(final['remainingPayloadFiles'],0);self.assertEqual(final['remainingPayloadBytes'],0);self.assertTrue(final['signedClosureComplete']);self.assertFalse(final['originalPrivateTreeFullyRemoved']);self.assertFalse((self.case.private/'source').exists());self.assertFalse((self.case.private/'target').exists())
        for name,descriptor in self.config['retained'].items():self.assertEqual(backup.sha((self.case.private/name).read_bytes()),descriptor['sha256'])

    def test_original_rolledback_closure_and_all_prior_metadata_stay_exact(self):
        self.configure(original_closed=True);before=(self.case.private/'control/closed.json').read_bytes();view=self.inspect();self.assertEqual(view['closureState'],'original-rolled-back');self.assertEqual((self.case.private/'control/closed.json').read_bytes(),before)

    def test_missing_payload_before_complete_fence_is_preserved_and_refused(self):
        self.configure();path=self.case.private/next(iter(self.config['payload']));path.unlink();self.assertIn('before complete signed closure',self.inspect(False));self.assertFalse(path.exists())

    def test_unknown_file_and_empty_directory_are_preserved(self):
        self.configure();note=self.case.private/'owner-note';note.write_bytes(b'unknown owner evidence');self.inspect(False);self.assertEqual(note.read_bytes(),b'unknown owner evidence');note.unlink();directory=self.case.private/'unknown-empty';directory.mkdir();self.inspect(False);self.assertTrue(directory.is_dir())

    def test_changed_closure_prefix_metadata_and_archive_partition_are_refused(self):
        self.configure();bad=copy.deepcopy(self.config);bad['closureBlob']=base64.b64encode(self.closure+b'changed').decode();self.inspect(False,config=bad)
        bad=copy.deepcopy(self.config);bad['payload'].pop(next(iter(bad['payload'])));self.inspect(False,config=bad)
        self.closure_fixture('prefix');pending=list((self.case.private/'control').glob('.ktk-control-closed.json-*.tmp'));self.assertEqual(len(pending),1);pending[0].write_bytes(b'changed owner bytes');self.inspect(False);self.assertEqual(pending[0].read_bytes(),b'changed owner bytes')

    def test_raw_and_public_drift_are_preserved_without_filter_or_restore(self):
        self.configure();self.assertIn('current protected/public witness changed',self.inspect(False,fault='raw'));self.assertIn('current protected/public witness changed',self.inspect(False,fault='public'));self.assertEqual((self.case.mu/'ktk-code-pages-assets/runtime.css').read_bytes(),b'new public bytes during inspection')

    def test_private_metadata_race_is_preserved_and_second_census_refuses(self):
        self.configure();self.inspect(False,fault='metadata');self.assertEqual((self.case.engine/'journal.json').read_bytes(),b'changed private journal evidence')

    def test_missing_engine_lock_is_never_recreated_by_readonly_inspection(self):
        self.configure();locks=list((self.case.private/'engine').glob('target-*.lock'));self.assertEqual(len(locks),1);locks[0].unlink();self.inspect(False);self.assertFalse(locks[0].exists())

    def test_real_original_seed_prefix_is_readonly_without_initializing_engine(self):
        self.case.cfg['seedFault']='prefix';self.case.expected_exit=74
        with self.assertRaises(bound.native.UncertainRequest):self.case.client.recover_preparation()
        self.case.expected_exit=0;self.case.cfg['seedFault']='';self.native.change_cache_row();self.configure(prepared=False)
        self.assertEqual(self.binding.inspection['phase'],'seeding');self.assertEqual(self.inspect()['closureState'],'absent');self.assertFalse(self.case.engine.exists())

    def test_real_pristine_plan_cut_retains_unprepared_backup_and_receipt_prefixes(self):
        self.native.test_actual_pristine_plan_process_cut_is_read_only_under_new_witness();self.configure(prepared=False)
        self.assertEqual(self.binding.inspection['phase'],'unprepared');self.assertEqual(self.inspect()['closureState'],'absent')

    def test_known_existing_lock_only_gap_after_actual_complete_seeds_stays_noncreating(self):
        state=self.case.client.inspect_preparation()
        for _ in range(10):
            if state['preparation']['seedsComplete']:break
            state=self.case.client.recover_preparation()
        self.assertTrue(state['preparation']['seedsComplete']);self.assertFalse(self.case.engine.exists());engine=self.case.private/'engine';engine.mkdir(exist_ok=True)
        path=engine/('target-'+backup.sha((self.case.private/'target').as_posix().encode())+'.lock');self.assertFalse(path.exists());path.write_bytes(b'')
        self.configure(prepared=False);self.assertEqual(self.binding.inspection['phase'],'engine-lock-only');self.inspect(verify_lock=True);self.assertFalse(self.case.engine.exists())

    def test_native_applying_phase_is_archived_and_reinspected_under_new_raw_witness(self):
        self.native.prepared();self.native.acknowledge();self.assertEqual(self.case.client.step('apply')['engine']['phase'],'applying');self.native.change_cache_row();self.configure(prepared=False)
        self.assertEqual(self.binding.inspection['phase'],'applying');self.assertFalse(self.inspect()['originalProtectedStateStillExact'])

    def test_native_applied_phase_remains_exact_without_creating_a_closure(self):
        self.applied();self.configure(prepared=False);self.assertEqual(self.binding.inspection['phase'],'applied');self.assertEqual(self.inspect()['closureState'],'absent')

    def test_native_caught_uncertain_phase_is_reinspected_without_recovery_or_replay(self):
        self.native.test_caught_native_exception_produces_inspectable_uncertain_phase();self.configure(prepared=False)
        self.assertEqual(self.binding.inspection['phase'],'uncertain');self.inspect()

    def test_native_rolling_back_phase_retains_all_metadata_and_payload(self):
        self.applied();self.assertEqual(self.case.client.step('rollback')['engine']['phase'],'rolling-back');self.configure(prepared=False)
        self.assertEqual(self.binding.inspection['phase'],'rolling-back');self.inspect()

    def test_native_rolled_back_without_original_closure_stays_separate_from_accepted_closure(self):
        self.applied()
        for _ in range(10):
            if self.case.client.state['engine']['phase']=='rolled-back':break
            self.case.client.step('rollback')
        self.assertEqual(self.case.client.state['engine']['phase'],'rolled-back');self.configure(prepared=False);self.assertFalse(self.binding.inspection['originalRolledBackClosurePresent']);self.assertEqual(self.inspect()['closureState'],'absent')

    def test_real_pending_content_prefix_stays_known_payload_without_being_removed(self):
        self.native.cut_apply('after-temporary-create',partial=True);self.configure(prepared=False)
        self.assertTrue(any('/pending/.ktk-content-' in n for n in self.config['payload']));self.inspect()

    def test_real_double_journal_receipt_cut_stays_retained_metadata(self):
        self.native.cut_apply('',failure=True);self.configure(prepared=False)
        self.assertEqual(sum('/receipts/.ktk-receipt-journal-' in n for n in self.config['retained']),2);self.inspect()

    def test_changed_declared_size_is_refused_before_payload_hashing(self):
        self.configure();p=self.case.private/'source/ktk-code-pages-assets/media/large.bin';self.assertTrue(p.is_file())
        with p.open('r+b') as stream:stream.truncate(64*1024*1024)
        self.assertIn('size differs before hashing',self.inspect(False));self.assertEqual(p.stat().st_size,64*1024*1024)


if __name__=='__main__':unittest.main()
