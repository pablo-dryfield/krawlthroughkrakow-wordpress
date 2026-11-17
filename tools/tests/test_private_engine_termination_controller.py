"""Native private fence/closure-only protocol; no HTTP helper or hosted acceptance."""
import copy
from pathlib import Path
import secrets
import time
import unittest

from tools import content_update_backup as backup
from tools import private_engine_termination_config as factory
from tools.tests import test_private_engine_fenced_inspection as prior

BRANCH=r'''
 if($c['operation']==='termination-controller'){
  $captures=0;$clock=$c['terminationNow'];$afterClaimCapture=-1;
  $captureCurrent=static function()use($capture,&$captures,&$clock,&$afterClaimCapture,$c){$captures++;$v=$capture();if($afterClaimCapture>=0){$afterClaimCapture++;if($c['terminationFault']==='expiry-during-final-capture'&&$afterClaimCapture===5){$clock=$c['terminationConfig']['authority']['expires'];}}return array('ownedContentFiles'=>$v['ownedContentFiles'],'protectedStateSha256'=>$v['protectedStateSha256']);};
  $observer=static function($event,$path,$blob=null)use($c,&$clock,&$afterClaimCapture){
   if($event==='after-private-claim-mkdir'&&$c['terminationFault']==='claim-directory'){exit(83);}
   if($event==='after-temporary-open'&&$c['terminationFault']==='closure-prefix'&&str_contains($path,'closed.json')){file_put_contents($path,substr($blob,0,23));exit(84);}
   if($event==='before-record-rename'&&$c['terminationFault']==='closure-full'&&str_contains($path,'closed.json')){exit(85);}
   if($event==='after-record-rename'&&$c['terminationFault']==='closure-reply'&&str_contains($path,'closed.json')){exit(86);}
   if($event==='after-private-claim-synced'){$afterClaimCapture=0;}
   if($event==='after-private-claim-synced'&&$c['terminationFault']==='expire-after-claim'){$clock=$c['terminationConfig']['authority']['expires'];}
  };
  try{$ctl=new KTK_Private_Engine_Termination($c['terminationConfig'],$captureCurrent,$observer,static function()use(&$clock){return $clock;});$result=$ctl->run($c['terminationRaw'],$c['terminationMethod'],$c['terminationHost'],$c['terminationToken'],$c['terminationNow']);echo json_encode(array('ok'=>true,'value'=>$result,'captures'=>$captures),JSON_THROW_ON_ERROR);}
  catch(Throwable $e){echo json_encode(array('ok'=>false,'message'=>$e->getMessage(),'captures'=>$captures),JSON_THROW_ON_ERROR);}
  exit;
 }
'''


@unittest.skipUnless(prior.bound.native.bridge.old.PHP,'Real PHP required for private fence/closure-only operations')
class PrivateEngineTerminationControllerTests(unittest.TestCase):
    def setUp(self):
        self.fixture=prior.PrivateEngineFencedInspectionTests('runTest');self.fixture.setUp();self.addCleanup(self.fixture.doCleanups);self.case=self.fixture.case;self.binding=self.fixture.binding
        self.case.cfg['components'].extend([str(prior.bound.native.bridge.old.ROOT/'tools/private-engine-termination-claim.php'),str(prior.bound.native.bridge.old.ROOT/'tools/private-engine-termination.php')])
        text=self.case.driver.read_text();flag="define('KTK_PRIVATE_ENGINE_FENCED_INSPECTION_ALLOWED',true);";self.assertEqual(text.count(flag),1);text=text.replace(flag,flag+"define('KTK_PRIVATE_ENGINE_TERMINATION_CLAIM_ALLOWED',true);define('KTK_PRIVATE_ENGINE_TERMINATION_ALLOWED',true);",1)
        original=prior.bound.native.BRANCH;self.assertEqual(text.count(original),1);text=text.replace(original,'',1);anchor=' $controller=new KTK_Full_Private_Engine_Controller(';self.assertEqual(text.count(anchor),1);self.case.driver.write_text(text.replace(anchor,original+BRANCH+anchor,1));self.sequence=3

    def helper(self,identifier):
        old=Path(self.case.cfg['helper']);self.assertTrue(old.resolve().is_relative_to(self.case.root.resolve()));data=old.read_bytes();new=self.case.mu/('ktk-transaction-rehearsal-'+identifier+'.php');self.assertFalse(new.exists());self.assertTrue(new.resolve().is_relative_to(self.case.root.resolve()));new.write_bytes(data+('\n/* current synthetic termination helper '+identifier+' */\n').encode());old.unlink();self.case.cfg['helper']=new.as_posix()

    def configure(self,prepared=True,closed=False):
        if prepared:self.fixture.native.prepared()
        if closed:
            self.fixture.native.acknowledge()
            for action,phase in [('apply','applied'),('rollback','rolled-back')]:
                for _ in range(10):
                    if self.case.client.state['engine']['phase']==phase:break
                    self.case.client.step(action)
                self.assertEqual(self.case.client.state['engine']['phase'],phase)
            self.case.client.close()
        self.original_helper=Path(self.case.cfg['helper']);self.original_helper_bytes=self.original_helper.read_bytes();self.helper('2'*32);self.fixture.configure(prepared=False);self.fence=self.binding.fence_packet

    def config(self,value,predecessor=None):
        kw=dict(source_root=self.case.mu,original_path=self.binding.original,witness_path=self.binding.fence_witness,public_root=self.case.cfg['packet']['publicRoot'])
        if value['operation']=='inspect':kw['witness_path']=self.binding.inspection_witness
        else:kw.update(metadata_path=self.binding.metadata,rollback_path=self.binding.rollback,predecessor=predecessor or self.binding.inspection_packet,fence_packet=None if value['operation']=='fence' else self.fence)
        if value['operationId'] in getattr(self,'witnesses',{}):kw['witness_path']=self.witnesses[value['operationId']]
        return factory.configuration(value,self.binding.old,**kw)

    def later(self,operation,predecessor):
        self.sequence+=1;identifier=format(self.sequence,'032x');self.helper(identifier);state,witness=self.binding.witness();value={**self.fence,'operation':operation,'operationId':identifier,'token':secrets.token_urlsafe(32),'expires':int(time.time())+600,'freshProtectedStateSha256':state['protectedStateSha256'],'freshPublicOwnedSha256':backup.sha(backup.encode(state['ownedContentFiles'],sort=True)),'witnessArchiveSha256':witness['sha256'],'witnessArchiveName':Path(witness['path']).name,'predecessorOperationId':predecessor['operationId']}
        if not hasattr(self,'witnesses'):self.witnesses={}
        self.witnesses[identifier]=Path(witness['path']);return value

    def marker(self,value):return self.case.root/('.ktk-engine-termination-'+value['operationId'])

    def call(self,value,action=None,predecessor=None,state=None,success=True,fault='',exit_code=0,changes=None,config=None):
        action=action or value['operation'];cfg=config or self.config(value,predecessor);raw=factory.request(value,action,state).decode();now=int(time.time());arguments=dict(operation='termination-controller',terminationConfig=cfg,terminationRaw=raw,terminationMethod='POST',terminationHost='krawlthroughkrakow.com',terminationToken=value['token'],terminationNow=now,terminationFault=fault);arguments.update(changes or {});self.case.cfg.update(arguments)
        before_public=self.fixture.native.files(self.case.root/'public_html');before_private=self.fixture.native.files(self.case.private);out=self.case.case.call(self.case.root,self.case.driver,self.case.cfg,exit_code=exit_code);self.assertEqual(self.fixture.native.files(self.case.root/'public_html'),before_public)
        if exit_code:return
        self.assertIs(out['ok'],success,out)
        if success:
            result=out['value'];self.assertFalse(result['fullHostTransactionAcceptance'])
            for n in ('payloadDeletes','applicationWrites','databaseWrites','cachePurges','productionOperations'):self.assertEqual(result[n],0)
            for n,h in before_private.items():
                if '/.ktk-control-closed.json-' not in n:self.assertEqual(self.fixture.native.files(self.case.private)[n],h)
            return result
        self.assertEqual(self.fixture.native.files(self.case.private),before_private);return out

    def observe(self,predecessor):
        value=self.later('inspect-fenced',predecessor);result=self.call(value,predecessor=predecessor);return value,result

    def test_initial_and_fenced_readonly_modes_create_no_claim_or_closure(self):
        self.configure();initial=self.call(self.binding.inspection_packet);self.assertTrue(initial['state']['readOnly']);self.assertFalse(self.marker(self.binding.inspection_packet).exists());view,result=self.observe(self.fence);self.assertEqual(result['state']['closureState'],'absent');self.assertFalse(self.marker(view).exists());self.assertFalse((self.case.private/'control/closed.json').exists())

    def test_fence_writes_only_expected_signed_closure_and_one_private_claim(self):
        self.configure();result=self.call(self.fence);self.assertEqual(result['closureWrites'],1);self.assertTrue(result['initialNativeInspectionVerified']);self.assertTrue(result['state']['signedClosureComplete']);self.assertEqual((self.case.private/'control/closed.json').read_bytes(),self.fixture.closure);raw=(self.marker(self.fence)/'claim.json').read_bytes();self.assertNotIn(self.fence['token'].encode(),raw);self.assertNotIn(self.binding.old['ownershipKey'].encode(),raw)

    def test_accepted_original_rolledback_closure_is_not_rewritten(self):
        self.configure(closed=True);before=(self.case.private/'control/closed.json').read_bytes();result=self.call(self.fence);self.assertEqual(result['closureWrites'],0);self.assertEqual(result['state']['closureState'],'original-rolled-back');self.assertEqual((self.case.private/'control/closed.json').read_bytes(),before)

    def test_wrong_auth_and_cross_role_requests_refuse_before_capture_or_claim(self):
        self.configure();cfg=self.config(self.fence)
        for changes in ({'terminationMethod':'GET'},{'terminationHost':'www.krawlthroughkrakow.com'},{'terminationToken':self.binding.old['token']},{'terminationNow':self.fence['expires']},{'terminationRaw':backup.encode({'schemaVersion':1,'action':'apply'}).decode()}):
            with self.subTest(changes=changes):out=self.call(self.fence,success=False,changes=changes,config=cfg);self.assertEqual(out['captures'],0);self.assertFalse(self.marker(self.fence).exists())
        bad=copy.deepcopy(cfg);bad['authority']['originalTokenSha256']=bad['authority']['tokenSha256'];out=self.call(self.fence,success=False,config=bad);self.assertEqual(out['captures'],0)

    def test_consumed_fence_is_never_replayed(self):
        self.configure();self.call(self.fence);before=(self.case.private/'control/closed.json').read_bytes();self.call(self.fence,success=False);self.assertEqual((self.case.private/'control/closed.json').read_bytes(),before)

    def test_empty_claim_cut_recovers_only_with_new_witnessed_readonly_then_cleanup_context(self):
        self.configure();self.call(self.fence,fault='claim-directory',exit_code=83);self.assertEqual(list(self.marker(self.fence).iterdir()),[]);self.call(self.fence,success=False);view,state=self.observe(self.fence);self.assertEqual(state['state']['closureState'],'absent');cleanup=self.later('cleanup',view);result=self.call(cleanup,'complete-closure',view,state['state']['stateSha256']);self.assertEqual(result['closureWrites'],1);self.assertTrue(result['state']['signedClosureComplete']);self.assertEqual(list(self.marker(self.fence).iterdir()),[])

    def test_partial_signed_closure_recovers_same_bytes_under_new_raw_state_and_context(self):
        self.configure();self.call(self.fence,fault='closure-prefix',exit_code=84);self.fixture.native.change_cache_row();view,state=self.observe(self.fence);self.assertEqual(state['state']['closureState'],'known-prefix');self.assertFalse(state['state']['originalProtectedStateStillExact']);cleanup=self.later('cleanup',view);result=self.call(cleanup,'complete-closure',view,state['state']['stateSha256']);self.assertEqual(result['closureWrites'],1);self.assertEqual((self.case.private/'control/closed.json').read_bytes(),self.fixture.closure);self.assertEqual(self.case.cfg['rows']['options'][-1]['option_value'],'new-preserved-value')

    def test_full_pending_record_is_completed_without_payload_deletion(self):
        self.configure();self.call(self.fence,fault='closure-full',exit_code=85);view,state=self.observe(self.fence);self.assertEqual(state['state']['closureState'],'known-prefix');cleanup=self.later('cleanup',view);result=self.call(cleanup,'complete-closure',view,state['state']['stateSha256']);self.assertEqual(result['payloadDeletes'],0);self.assertEqual((self.case.private/'control/closed.json').read_bytes(),self.fixture.closure)

    def test_lost_closure_reply_is_readonly_verified_and_cannot_trigger_completion_again(self):
        self.configure();self.call(self.fence,fault='closure-reply',exit_code=86);view,state=self.observe(self.fence);self.assertTrue(state['state']['signedClosureComplete']);cleanup=self.later('cleanup',view);self.call(cleanup,'complete-closure',view,state['state']['stateSha256'],success=False);self.assertFalse(self.marker(cleanup).exists())

    def test_expiry_after_claim_preserves_consumed_marker_and_no_closure(self):
        self.configure();self.call(self.fence,success=False,fault='expire-after-claim');self.assertTrue(self.marker(self.fence).exists());self.assertFalse((self.case.private/'control/closed.json').exists())

    def test_expiry_during_last_prewrite_capture_preserves_payload_and_consumed_context(self):
        self.configure();out=self.call(self.fence,success=False,fault='expiry-during-final-capture');self.assertIn('lifetime ended',out['message']);self.assertTrue(self.marker(self.fence).exists());self.assertFalse((self.case.private/'control/closed.json').exists())

    def test_stale_remaining_state_refuses_before_new_cleanup_claim(self):
        self.configure();self.call(self.fence,fault='closure-prefix',exit_code=84);view,state=self.observe(self.fence);cleanup=self.later('cleanup',view);self.call(cleanup,'complete-closure',view,'0'*64,success=False);self.assertFalse(self.marker(cleanup).exists())

    def test_reintroduced_original_helper_blocks_closure_only_mutation_under_complete_current_pair(self):
        self.configure();self.call(self.fence,fault='closure-prefix',exit_code=84);self.original_helper.write_bytes(self.original_helper_bytes);view,state=self.observe(self.fence);self.assertFalse(state['state']['originalExecutionHelperAbsent']);cleanup=self.later('cleanup',view);out=self.call(cleanup,'complete-closure',view,state['state']['stateSha256'],success=False);self.assertIn('Original execution helper must remain absent',out['message']);self.assertFalse(self.marker(cleanup).exists());self.assertEqual(self.original_helper.read_bytes(),self.original_helper_bytes)


if __name__=='__main__':unittest.main()
