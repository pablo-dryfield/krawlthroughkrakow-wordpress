"""Read-only native private engine phase inspection under a distinct raw witness."""
import hashlib
import json
from pathlib import Path
import unittest
from unittest import mock

from tools import content_update_backup as backup
from tools.private_engine_readonly import read_only_source
from tools.content_update_client import UncertainRequest
from tools.tests import test_full_private_engine_preparation as bridge

BRANCH = r'''
 if($c['operation']==='abandon-inspect'){
  $freshCalls=0;
  $fresh=static function()use($capture,$c,&$freshCalls){
   $freshCalls++;
   if(!empty($c['inspectionDrift'])&&$freshCalls===2){$GLOBALS['c']['rows']['options'][]=array('option_name'=>'ecwid_last_api_cache_check','option_value'=>'changed-during-inspection');}
   $v=$capture();return array('ownedContentFiles'=>$v['ownedContentFiles'],'protectedStateSha256'=>$v['protectedStateSha256']);
  };
  $config=array('publicRoot'=>$c['packet']['publicRoot'],'plan'=>$c['packet']['plan'],'sizes'=>$c['sizes'],'overrides'=>$c['overrides'],'ownershipKey'=>$c['packet']['ownershipKey'],'originalHelperSha256'=>$c['packet']['helperSha256'],'originalManifestSha256'=>$c['inspectionManifest'],'freshProtectedStateSha256'=>$c['inspectionWitness']);
  $inspector=new KTK_Private_Engine_Abandonment_Inspection($config,$fresh);
  $store=new KTK_Content_Update_Private_Store(dirname($c['packet']['publicRoot']).'/.ktk-content-update-'.$c['packet']['plan']['transactionId'],$c['packet']['publicRoot'],$c['packet']['plan']['transactionId'],$c['packet']['ownershipKey']);
  $result=$inspector->inspect($store);$lifetime=false;
  if(!empty($c['inspectionVerifyHeldEngineLock'])){
   $root=$store->privateRoot();$original=json_decode($store->read('controller-plan.json'),true,64,JSON_THROW_ON_ERROR)['enginePlan'];
   try{$other=new KTK_Read_Only_Private_Engine($root.'/source',$root.'/target',$root.'/engine',$original,static fn()=>$original['protectedStateSha256']);unset($other);throw new RuntimeException('Inspector released its lock before its caller completed');}
   catch(RuntimeException $e){if($e->getMessage()!=='Existing read-only engine lock cannot be held'){throw $e;}}
   $inspector->releaseEngineLock();unset($inspector);
   $other=new KTK_Read_Only_Private_Engine($root.'/source',$root.'/target',$root.'/engine',$original,static fn()=>$original['protectedStateSha256']);unset($other);$lifetime=true;
  }
  echo json_encode(array('ok'=>true,'inspection'=>$result,'engineLockLifetimeVerified'=>$lifetime),JSON_THROW_ON_ERROR);exit;
 }
'''

CUT_OBSERVER = r'''
 $previousObserver=$observer;
 $receiptWrites=0;
 $observer=static function($event,$name)use($c,$previousObserver,&$receiptWrites){
  if(!empty($c['inspectionReceiptFailureAndCut'])&&$name==='journal.json'){
   if($event==='after-private-temporary-create'&&++$receiptWrites===2){throw new RuntimeException('Controlled intent receipt write failure');}
   if($event==='before-private-receipt-rename'&&$receiptWrites===3){exit(83);}
  }
  if(!empty($c['inspectionCutEvent'])&&$event===$c['inspectionCutEvent']&&($c['inspectionCutName']??$name)===$name){
   if(!empty($c['inspectionPartialContent'])){
    $pending=glob(dirname($c['packet']['publicRoot']).'/.ktk-content-update-'.$c['packet']['plan']['transactionId'].'/engine/'.$c['packet']['plan']['transactionId'].'/pending/.ktk-content-*');
    if(count($pending)!==1){throw new RuntimeException('Exactly one owned test temporary required');}
    $source=dirname($c['packet']['publicRoot']).'/.ktk-content-update-'.$c['packet']['plan']['transactionId'].'/source/'.$name;
    file_put_contents($pending[0],substr(file_get_contents($source),0,4));
   }
   exit(83);
  }
  if(!empty($c['inspectionThrowBeforeRename'])&&$event==='before-rename'){throw new RuntimeException('Controlled native exception before replacement');}
  if($previousObserver!==null){$previousObserver($event,$name);}
 };
'''


@unittest.skipUnless(bridge.old.PHP, 'Real PHP required for read-only private phase inspection')
class PrivateEngineAbandonmentInspectionTests(unittest.TestCase):
    def setUp(self):
        self.case = bridge.FullPrivatePreparationIntegrationTests('runTest')
        self.case.setUp()
        self.addCleanup(self.case.doCleanups)
        reader = self.case.root/'readonly-engine.php'
        reader.write_bytes(read_only_source())
        self.case.cfg['components'].extend([reader.as_posix(),str(bridge.old.ROOT/'tools/private-engine-abandonment-artifacts.php'),str(bridge.old.ROOT/'tools/private-engine-abandonment-inspection.php')])
        text = self.case.driver.read_text(encoding='utf-8')
        flag = "define('KTK_FULL_PRIVATE_ENGINE_PREPARATION_ALLOWED',true);"
        self.assertEqual(text.count(flag), 1)
        text = text.replace(flag, flag+"define('KTK_PRIVATE_ENGINE_ABANDONMENT_INSPECTION_ALLOWED',true);", 1)
        controller = ' $controller=new KTK_Full_Private_Engine_Controller('
        self.assertEqual(text.count(controller),1)
        text = text.replace(controller,CUT_OBSERVER+controller,1)
        anchor = " $value=$controller->run("
        self.assertEqual(text.count(anchor), 1)
        self.case.driver.write_text(text.replace(anchor, BRANCH+anchor, 1), encoding='utf-8')
        self.case.client.prepare()
        self.original_archive = self.case.original()

    def files(self, directory):
        return {p.relative_to(directory).as_posix():hashlib.sha256(p.read_bytes()).hexdigest()
                for p in directory.rglob('*') if p.is_file()}

    def prepared(self):
        state = self.case.client.inspect_preparation()
        for _ in range(10):
            if 'engine' in state:
                self.assertEqual(state['engine']['phase'], 'prepared')
                return
            state = self.case.client.recover_preparation()
        self.fail('Bounded private preparation did not complete')

    def acknowledge(self):
        with mock.patch.object(backup, 'ROOT', self.case.root):
            self.case.client.export_and_acknowledge(self.case.root/'deploy-backups/rollback.zip')

    def change_cache_row(self):
        self.case.cfg['rows']['options'].append(dict(option_name='ecwid_last_api_cache_check',option_value='new-preserved-value'))

    def snapshot(self):
        self.case.cfg['operation'] = 'snapshot'
        return self.case.case.call(self.case.root,self.case.driver,self.case.cfg)['state']

    def inspect(self, success=True, **changes):
        state = self.snapshot()
        self.case.cfg.update(operation='abandon-inspect',inspectionWitness=state['protectedStateSha256'],inspectionManifest=self.case.cfg['originalArchive']['originalManifestSha256'],inspectionDrift=False)
        self.case.cfg.update(changes)
        before_private = self.files(self.case.private)
        before_public = self.files(self.case.root/'public_html')
        result = self.case.case.call(self.case.root,self.case.driver,self.case.cfg)
        self.assertIs(result['ok'], success, result)
        if changes.get('inspectionVerifyHeldEngineLock'):self.assertTrue(result['engineLockLifetimeVerified'])
        self.assertEqual(self.files(self.case.private), before_private)
        self.assertEqual(self.files(self.case.root/'public_html'), before_public)
        if success:
            view = result['inspection']
            self.assertTrue(view['readOnly'] and view['freshWitnessVerified'])
            self.assertEqual(view['freshWitnessProtectedStateSha256'], state['protectedStateSha256'])
            for name in ('closureWrites','payloadWrites','applicationWrites','databaseWrites','cachePurges','productionOperations'):
                self.assertEqual(view[name], 0)
            self.assertNotIn('protectedStateVerified', view['engine'] or {})
            return view
        return result['message']

    def test_signed_empty_seed_census_does_not_initialize_engine(self):
        before = self.case.engine.exists()
        view = self.inspect()
        self.assertEqual(view['phase'], 'seeding')
        self.assertTrue(view['originalProtectedStateStillExact'])
        self.assertEqual(self.case.engine.exists(), before)

    def test_actual_stream_prefix_cut_remains_inspectable_under_new_raw_witness(self):
        self.case.cfg['seedFault']='prefix';self.case.expected_exit=74
        with self.assertRaises(UncertainRequest):self.case.client.recover_preparation()
        self.case.expected_exit=0;self.case.cfg['seedFault']=''
        self.change_cache_row()
        view=self.inspect()
        self.assertEqual(view['phase'],'seeding')
        self.assertFalse(view['originalProtectedStateStillExact'])
        self.assertEqual(view['files']['source/ktk-code-pages-assets/media/large.bin']['bytes'],65536)

    def test_actual_pristine_plan_process_cut_is_read_only_under_new_witness(self):
        state=self.case.client.inspect_preparation()
        for _ in range(10):
            self.assertIn('preparation',state)
            if state['preparation']['seedsComplete']:break
            state=self.case.client.recover_preparation()
        else:self.fail('Separate complete seed boundary absent')
        self.case.cfg.update(inspectionCutEvent='after-private-temporary-create',inspectionCutName='plan.json')
        self.case.expected_exit=83
        with self.assertRaises(UncertainRequest):self.case.client.recover_preparation()
        self.case.expected_exit=0
        self.change_cache_row()
        view=self.inspect()
        self.assertEqual(view['phase'],'unprepared')
        self.assertFalse(view['originalProtectedStateStillExact'])
        self.assertFalse((self.case.engine/'plan.json').exists())
        self.assertFalse((self.case.engine/'journal.json').exists())
        self.assertEqual(len(view['engine']['pendingReceipts']),1)

    def test_prepared_engine_inspection_preserves_new_raw_cache_value(self):
        self.prepared()
        self.change_cache_row()
        original_view = self.case.client.inspect()
        self.assertFalse(original_view['engine']['protectedStateVerified'])
        view = self.inspect()
        self.assertEqual(view['phase'], 'prepared')
        self.assertFalse(view['originalProtectedStateStillExact'])
        self.assertFalse(view['originalRollbackAcknowledged'])
        self.assertEqual(self.case.cfg['rows']['options'][-1]['option_value'], 'new-preserved-value')

    def test_engine_lock_is_retained_through_caller_until_explicit_release(self):
        self.prepared()
        self.assertEqual(self.inspect(inspectionVerifyHeldEngineLock=True)['phase'],'prepared')

    def test_partly_applied_engine_is_read_only_under_fresh_witness(self):
        self.prepared()
        self.acknowledge()
        state = self.case.client.step('apply')
        self.assertEqual(state['engine']['phase'], 'applying')
        self.change_cache_row()
        view = self.inspect()
        self.assertEqual(view['phase'], 'applying')
        self.assertFalse(view['originalProtectedStateStillExact'])
        self.assertTrue(view['originalRollbackAcknowledged'])

    def test_actual_applied_partial_rollback_rolled_back_and_closed_phases(self):
        self.prepared()
        self.acknowledge()
        for _ in range(10):
            state=self.case.client.step('apply')
            if state['engine']['phase']=='applied':break
        else:self.fail('Bounded fixture apply did not finish')
        self.assertEqual(self.inspect()['phase'],'applied')
        self.assertEqual(self.case.client.step('rollback')['engine']['phase'],'rolling-back')
        self.assertEqual(self.inspect()['phase'],'rolling-back')
        for _ in range(10):
            state=self.case.client.step('rollback')
            if state['engine']['phase']=='rolled-back':break
        else:self.fail('Bounded fixture rollback did not finish')
        self.assertEqual(self.inspect()['phase'],'rolled-back')
        self.case.client.close()
        self.change_cache_row()
        view=self.inspect()
        self.assertEqual(view['phase'],'rolled-back')
        self.assertTrue(view['originalRolledBackClosurePresent'])
        self.assertFalse(view['originalProtectedStateStillExact'])

    def test_caught_native_exception_produces_inspectable_uncertain_phase(self):
        self.prepared();self.acknowledge()
        self.case.cfg['inspectionThrowBeforeRename']=True
        with self.assertRaises(UncertainRequest):self.case.client.step('apply')
        self.assertEqual(self.inspect()['phase'],'uncertain')

    def cut_apply(self,event,partial=False,name=None,failure=False):
        self.prepared();self.acknowledge()
        self.case.cfg.update(inspectionCutEvent=event,inspectionPartialContent=partial,inspectionReceiptFailureAndCut=failure)
        if name is not None:self.case.cfg['inspectionCutName']=name
        state=self.case.client.state
        raw=backup.encode({'schemaVersion':1,'action':'apply',**self.case.binding,'stateSha256':state['stateSha256'],'archiveSha256':self.case.client.verified_archive()['archiveSha256']})
        self.case.cfg.update(operation='controller',request=raw.decode())
        self.case.case.call(self.case.root,self.case.driver,self.case.cfg,exit_code=83)

    def test_process_cut_leaves_known_empty_content_prefix(self):
        self.cut_apply('after-temporary-create')
        view=self.inspect()
        self.assertEqual(view['phase'],'applying')
        self.assertEqual(len(view['validatedArtifacts']),1)
        self.assertEqual(next(iter(view['validatedArtifacts'].values()))['kind'],'known-content-prefix')

    def test_process_cut_leaves_known_partial_content_prefix(self):
        self.cut_apply('after-temporary-create',partial=True)
        self.assertEqual(len(self.inspect()['validatedArtifacts']),1)

    def test_process_cut_leaves_known_complete_content_temporary(self):
        self.cut_apply('before-rename')
        self.assertEqual(len(self.inspect()['validatedArtifacts']),1)

    def test_process_cut_leaves_known_empty_next_journal_receipt(self):
        self.cut_apply('after-private-temporary-create',name='journal.json')
        view=self.inspect()
        self.assertEqual(view['phase'],'prepared')
        self.assertEqual(next(iter(view['validatedArtifacts'].values()))['kind'],'known-next-journal-prefix')

    def test_process_cut_leaves_known_complete_next_journal_receipt(self):
        self.cut_apply('before-private-receipt-rename',name='journal.json')
        self.assertEqual(len(self.inspect()['validatedArtifacts']),1)

    def test_failed_intent_write_then_cut_during_failure_recording_preserves_two_known_receipts(self):
        self.cut_apply('',failure=True)
        view=self.inspect()
        self.assertEqual(view['phase'],'applying')
        self.assertEqual(len(view['validatedArtifacts']),2)
        self.assertTrue(all(row['kind']=='known-next-journal-prefix' for row in view['validatedArtifacts'].values()))
        whole=[p for p in (self.case.engine/'receipts').iterdir() if p.stat().st_size]
        self.assertEqual(len(whole),1)
        journal=json.loads(whole[0].read_bytes())
        journal['events'].append('interruption-inspect-before-recovery')
        changed=json.dumps(journal,indent=4).encode()+b'\n'
        whole[0].write_bytes(changed)
        self.assertIn('Changed or unsupported private receipt preserved',self.inspect(success=False))
        self.assertEqual(whole[0].read_bytes(),changed)

    def test_foreign_content_temporary_bytes_are_preserved(self):
        self.cut_apply('after-temporary-create')
        pending=list((self.case.engine/'pending').iterdir());self.assertEqual(len(pending),1)
        pending[0].write_bytes(b'foreign owner evidence')
        self.assertIn('Changed private temporary prefix preserved',self.inspect(success=False))
        self.assertEqual(pending[0].read_bytes(),b'foreign owner evidence')

    def test_foreign_next_journal_receipt_bytes_are_preserved(self):
        self.cut_apply('after-private-temporary-create',name='journal.json')
        pending=list((self.case.engine/'receipts').iterdir());self.assertEqual(len(pending),1)
        pending[0].write_bytes(b'foreign owner receipt')
        self.assertIn('Changed or unsupported private receipt preserved',self.inspect(success=False))
        self.assertEqual(pending[0].read_bytes(),b'foreign owner receipt')

    def test_wrong_original_capsule_refuses_without_writes(self):
        self.assertIn('Original archived capsule differs', self.inspect(success=False,inspectionManifest='f'*64))

    def test_intra_inspection_raw_drift_refuses_without_private_writes(self):
        self.assertIn('fresh protected/public witness changed', self.inspect(success=False,inspectionDrift=True))

    def test_missing_engine_lock_is_not_recreated(self):
        self.prepared()
        locks=list((self.case.private/'engine').glob('target-*.lock'))
        self.assertEqual(len(locks),1)
        self.assertTrue(locks[0].resolve().is_relative_to(self.case.root.resolve()))
        locks[0].unlink()
        self.assertIn('Existing engine lock required',self.inspect(success=False))
        self.assertFalse(locks[0].exists())

    def test_unknown_private_source_is_preserved(self):
        self.prepared()
        path=self.case.private/'source/ktk-code-pages-assets/owner-note.txt'
        path.write_bytes(b'Unknown owner bytes remain')
        self.inspect(success=False)
        self.assertEqual(path.read_bytes(),b'Unknown owner bytes remain')

    def test_unknown_signed_control_file_is_preserved(self):
        path=self.case.private/'control/owner-note'
        path.write_bytes(b'Unknown control bytes remain')
        self.inspect(success=False)
        self.assertEqual(path.read_bytes(),b'Unknown control bytes remain')

    def test_unknown_journal_event_is_preserved(self):
        self.prepared()
        path=self.case.engine/'journal.json'
        journal=json.loads(path.read_bytes());journal['events'].append('unknown-owner-event')
        path.write_text(json.dumps(journal),encoding='utf-8')
        self.assertIn('Unknown private event preserved',self.inspect(success=False))
        self.assertEqual(json.loads(path.read_bytes())['events'][-1],'unknown-owner-event')

    def test_activation_mutation_event_is_refused_and_preserved(self):
        self.prepared()
        path=self.case.engine/'journal.json'
        journal=json.loads(path.read_bytes());journal['events'].append('installed:ktk-code-pages-production.php')
        path.write_text(json.dumps(journal),encoding='utf-8')
        self.assertIn('Unknown private event preserved',self.inspect(success=False))
        self.assertEqual(json.loads(path.read_bytes())['events'][-1],'installed:ktk-code-pages-production.php')


if __name__=='__main__':
    unittest.main()
