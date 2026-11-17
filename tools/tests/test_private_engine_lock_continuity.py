"""Native continuous lock custody; fixture closure writes are not a profile writer."""
import copy
from pathlib import Path
import unittest

from tools import content_update_backup as backup
from tools.tests import test_private_engine_fenced_inspection as prior

BRANCH=r'''
 if($c['operation']==='lock-continuity'){
  $captures=0;$drift=false;
  $fresh=static function()use($c,$capture,&$captures,&$drift){
   $captures++;if($drift){$GLOBALS['c']['rows']['options'][]=array('option_name'=>'ecwid_last_api_cache_check','option_value'=>'new raw value between held inspections');$drift=false;}
   $v=$capture();return array('ownedContentFiles'=>$v['ownedContentFiles'],'protectedStateSha256'=>$v['protectedStateSha256']);
  };
  $root=dirname($c['packet']['publicRoot']).'/.ktk-content-update-'.$c['packet']['plan']['transactionId'];$path=$root.'/engine/target-'.hash('sha256',$root.'/target').'.lock';
  $store=new KTK_Content_Update_Private_Store($root,$c['packet']['publicRoot'],$c['packet']['plan']['transactionId'],$c['packet']['ownershipKey']);
  $mode=$c['continuityMode'];$owner=null;$reader=null;$extra=null;
  $check=static function($path,$busy){$h=fopen($path,'r+b');if(!$h){throw new RuntimeException('Fixture cannot open existing probe');}$got=flock($h,LOCK_EX|LOCK_NB);if($got){flock($h,LOCK_UN);}fclose($h);if($got===$busy){throw new RuntimeException('Native lock custody probe disagrees');}};
  try{
   if($mode!=='owned-repeat'){
    $cfg=array('publicRoot'=>$c['packet']['publicRoot'],'plan'=>$c['packet']['plan'],'sizes'=>$c['sizes'],'overrides'=>$c['overrides'],'ownershipKey'=>$c['packet']['ownershipKey'],'originalHelperSha256'=>$c['packet']['helperSha256'],'originalManifestSha256'=>$c['fencedConfig']['initialInspection']['originalManifestSha256'],'freshProtectedStateSha256'=>$c['fencedConfig']['freshProtectedStateSha256']);
    $owner=new KTK_Private_Engine_Abandonment_Inspection($cfg,$fresh);$initial=$owner->inspect($store);
    if($initial['stateSha256']!==$c['fencedConfig']['initialInspection']['stateSha256']){throw new RuntimeException('Initial native/archive census differs');}
   }
   $hasBorrowed=$owner!==null&&is_resource($owner->borrowEngineLock());
   if($mode==='released-before'){$owner->releaseEngineLock();$extra=fopen($path,'r+b');if(!$extra||!flock($extra,LOCK_EX|LOCK_NB)){throw new RuntimeException('Fixture interloper must hold released lock');}}
   $argument=$owner;
   if($mode==='raw-resource'){$extra=fopen($path,'r+b');$argument=$extra;}
   $reader=new KTK_Private_Engine_Fenced_Inspection($c['fencedConfig'],$fresh,$argument);
   $before=$reader->inspect($store);$check($path,true);
   if($mode==='released-between'){$owner->releaseEngineLock();$extra=fopen($path,'r+b');if(!$extra||!flock($extra,LOCK_EX|LOCK_NB)){throw new RuntimeException('Fixture interloper must own released lock');}}
   if($mode==='raw-drift'){$drift=true;}
   if($mode==='metadata-drift'){file_put_contents($root.'/engine/'.$c['packet']['plan']['transactionId'].'/journal.json','external owner journal evidence');}
   if($mode==='fixture-close'){$parts=explode("\n",base64_decode($c['fencedConfig']['closureBlob'],true),3);$store->writeOnce('closed.json',$parts[2]);}
   $after=$reader->inspect($store);$check($path,true);$reader->releaseEngineLock();
   $check($path,$hasBorrowed);if($owner!==null){$owner->releaseEngineLock();}$check($path,false);
   $value=array('ok'=>true,'before'=>$before,'after'=>$after,'borrowed'=>$hasBorrowed,'readerReleasePreservedOwnerLock'=>$hasBorrowed,'finalLockFree'=>true,'captures'=>$captures);
  }finally{
   if($reader!==null){$reader->releaseEngineLock();}if($owner!==null){$owner->releaseEngineLock();}
   if(is_resource($extra)){flock($extra,LOCK_UN);fclose($extra);}
  }
  echo json_encode($value,JSON_THROW_ON_ERROR);exit;
 }
'''


@unittest.skipUnless(prior.bound.native.bridge.old.PHP,'Real PHP required for continuous existing engine locks')
class PrivateEngineLockContinuityTests(unittest.TestCase):
    def setUp(self):
        self.fixture=prior.PrivateEngineFencedInspectionTests('runTest');self.fixture.setUp();self.addCleanup(self.fixture.doCleanups);self.case=self.fixture.case
        text=self.case.driver.read_text();anchor=" if($c['operation']==='fenced-inspect'||$c['operation']==='fixture-closure-write'){";self.assertEqual(text.count(anchor),1);self.case.driver.write_text(text.replace(anchor,BRANCH+anchor,1))

    def configure(self,lock_only=False):
        if lock_only:
            state=self.case.client.inspect_preparation()
            for _ in range(10):
                if state['preparation']['seedsComplete']:break
                state=self.case.client.recover_preparation()
            self.assertTrue(state['preparation']['seedsComplete']);engine=self.case.private/'engine';engine.mkdir(exist_ok=True);path=engine/('target-'+backup.sha((self.case.private/'target').as_posix().encode())+'.lock');self.assertFalse(path.exists());path.write_bytes(b'')
        self.fixture.configure(prepared=not lock_only)

    def call(self,mode,success=True):
        state=self.fixture.native.snapshot();packet=copy.deepcopy(self.fixture.config);packet.update(freshProtectedStateSha256=state['protectedStateSha256'],freshPublicOwnedSha256=backup.sha(backup.encode(state['ownedContentFiles'],sort=True)))
        before_private=self.fixture.native.files(self.case.private);before_public=self.fixture.native.files(self.case.root/'public_html');self.case.cfg.update(operation='lock-continuity',fencedConfig=packet,continuityMode=mode)
        out=self.case.case.call(self.case.root,self.case.driver,self.case.cfg);self.assertIs(out['ok'],success,out);after=self.fixture.native.files(self.case.private)
        if mode=='fixture-close':
            self.assertEqual(set(after)-set(before_private),{'control/closed.json'});self.assertEqual((self.case.private/'control/closed.json').read_bytes(),self.fixture.closure)
            for n,h in before_private.items():self.assertEqual(after[n],h)
        elif mode=='metadata-drift':
            name='engine/'+self.case.plan['transactionId']+'/journal.json';self.assertEqual((self.case.private/name).read_bytes(),b'external owner journal evidence')
            self.assertEqual({n:h for n,h in after.items() if n!=name},{n:h for n,h in before_private.items() if n!=name})
        else:self.assertEqual(after,before_private)
        self.assertEqual(self.fixture.native.files(self.case.root/'public_html'),before_public)
        if success:
            self.assertTrue(out['finalLockFree'])
            for view in (out['before'],out['after']):
                self.assertTrue(view['readOnly'] and view['freshWitnessVerified'])
                for n in ('closureWrites','payloadDeletes','applicationWrites','databaseWrites','cachePurges','productionOperations'):self.assertEqual(view[n],0)
            return out
        return out['message']

    def test_borrowed_reader_repeats_without_unlocking_owner_and_explicit_owner_release_frees_lock(self):
        self.configure();v=self.call('borrowed-repeat');self.assertTrue(v['borrowed'] and v['readerReleasePreservedOwnerLock']);self.assertEqual(v['before']['stateSha256'],v['after']['stateSha256'])

    def test_owned_reader_repeats_while_holding_existing_lock(self):
        self.configure();v=self.call('owned-repeat');self.assertFalse(v['borrowed']);self.assertEqual(v['before']['stateSha256'],v['after']['stateSha256'])

    def test_fixture_closure_write_is_verified_before_and_after_under_continuous_borrowed_lock(self):
        self.configure();v=self.call('fixture-close');self.assertTrue(v['borrowed']);self.assertEqual(v['before']['closureState'],'absent');self.assertEqual(v['after']['closureState'],'complete')

    def test_released_owner_before_first_reader_inspection_is_never_reacquired(self):
        self.configure();self.assertIn('never reacquire implicitly',self.call('released-before',False))

    def test_owner_release_between_inspections_refuses_without_reopening_descriptor(self):
        self.configure();self.assertIn('lock lost',self.call('released-between',False))

    def test_raw_resource_cannot_be_injected_instead_of_trusted_final_owner(self):
        self.configure();self.assertIn('KTK_Private_Engine_Abandonment_Inspection',self.call('raw-resource',False))

    def test_lock_only_phase_retains_own_lock_without_creating_transaction_directory(self):
        self.configure(lock_only=True);v=self.call('borrowed-repeat');self.assertFalse(v['borrowed']);self.assertFalse(self.case.engine.exists())

    def test_new_complete_raw_state_between_repeated_inspections_is_refused_without_restore(self):
        self.configure();self.assertIn('current protected/public witness changed',self.call('raw-drift',False))

    def test_changed_private_metadata_between_repeated_inspections_is_preserved(self):
        self.configure();self.assertIn('size differs before hashing',self.call('metadata-drift',False))


if __name__=='__main__':unittest.main()
