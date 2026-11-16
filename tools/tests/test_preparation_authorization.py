"""New recovery actions retain production authorization, canonical requests and zero public writes."""
import copy,json,shutil,unittest
from tools import content_update_backup as backup
from tools.content_update_client import UncertainRequest
from tools.tests import test_content_update_controller as fixtures
from tools.tests import test_content_update_staging_packet as compiled

@unittest.skipUnless(fixtures.PHP,'PHP required for preparation authorization fixtures')
class PreparationAuthorizationTests(unittest.TestCase):
 def test_simulated_production_partial_engine_preparation_recovers_without_mutating_target_or_activation(self):
  server=fixtures.ContentUpdateControllerTests(methodName='runTest')
  with server.fixture(True) as (root,mu,driver,cfg):
   server.prepare(root,driver,cfg);private=root/('.ktk-content-update-'+fixtures.ID);original=(private/'control/original-state.json').read_bytes();engine=private/'engine';self.assertTrue(engine.resolve().is_relative_to(root.resolve()));shutil.rmtree(engine);engine.mkdir();before={p.relative_to(mu).as_posix():p.read_bytes() for p in mu.rglob('*') if p.is_file()};state=server.ok(server.run_action(root,driver,cfg,'inspect-preparation'));self.assertTrue(state['productionAuthorizationProvided']);result=server.ok(server.run_action(root,driver,cfg,'recover-preparation',stateSha256=state['stateSha256']));self.assertTrue(result['engine']['backupVerified'] and result['engine']['currentPriorInventoryVerified']);self.assertFalse(result['archiveAcknowledged']);self.assertEqual((private/'control/original-state.json').read_bytes(),original);self.assertEqual({p.relative_to(mu).as_posix():p.read_bytes() for p in mu.rglob('*') if p.is_file()},before);self.assertEqual(backup.sha((mu/backup.ACTIVATION).read_bytes()),backup.ACTIVATION_SHA)
 def test_missing_server_side_production_authorization_never_creates_recovery_state(self):
  server=fixtures.ContentUpdateControllerTests(methodName='runTest')
  with server.fixture(True) as (root,mu,driver,cfg):
   cfg['productionAuthorized']=False
   for action in ('inspect-preparation','recover-preparation'):
    result=server.run_action(root,driver,cfg,action,**({'stateSha256':'f'*64} if action=='recover-preparation' else {}));self.assertFalse(result['ok']);self.assertFalse((root/('.ktk-content-update-'+fixtures.ID)).exists());self.assertFalse((root/'.ktk-content-update-production-target.lock').exists())
 def test_new_actions_reject_client_approval_extra_paths_and_bad_auth_before_initialization(self):
  server=fixtures.ContentUpdateControllerTests(methodName='runTest')
  with server.fixture() as (root,mu,driver,cfg):
   for action,extra in [('inspect-preparation',{'ownerApproved':True}),('recover-preparation',{'stateSha256':'f'*64,'privateRoot':'/tmp/other'})]:self.assertFalse(server.run_action(root,driver,cfg,action,**extra)['ok'])
   cfg['token']='wrong';self.assertFalse(server.run_action(root,driver,cfg,'inspect-preparation')['ok']);self.assertFalse((root/('.ktk-content-update-'+fixtures.ID)).exists())
 def test_caller_rejects_unbound_extra_sensitive_or_mutating_preparation_envelopes(self):
  server=compiled.StagingControllerPacketTests(methodName='runTest')
  with server.fixture() as (root,mu,private,config,source,binding,client,request,calls,owned,expires):
   original=client.transport;raw=backup.encode({'schemaVersion':1,'action':'inspect-preparation',**binding});value=original(raw)
   mutations=[]
   for field,new in [('helperSha256','f'*64)]:
    bad=copy.deepcopy(value);bad[field]=new;mutations.append(bad)
   for key,new in [('applicationWrites',1),('productionAuthorizationProvided',True),('applicationCommit','f'*40),('selectedRows','private data'),('stateSha256','bad')]:
    bad=copy.deepcopy(value);bad['controller'][key]=new;mutations.append(bad)
   bad=copy.deepcopy(value);bad['controller']['preparation']['enginePhase']='applied';mutations.append(bad)
   bad=copy.deepcopy(value);bad['controller']['preparation']['originalCaptureTime']='2026-02-31T00:00:00+00:00';mutations.append(bad)
   bad=copy.deepcopy(value);bad['controller']['preparation']['controlFiles']={'backup-ack.json':{'sha256':'f'*64,'bytes':3}};mutations.append(bad)
   before={p.relative_to(private).as_posix():p.read_bytes() for p in private.rglob('*') if p.is_file()}
   try:
    for bad in mutations:
     client.transport=lambda payload,bad=bad:bad
     with self.assertRaises(UncertainRequest):client.inspect_preparation()
     self.assertIsNone(client.state);self.assertIsNone(client.preparation_state)
   finally:client.transport=original
   self.assertEqual({p.relative_to(private).as_posix():p.read_bytes() for p in private.rglob('*') if p.is_file()},before)
 def test_snapshot_time_cannot_be_changed_by_client_payload(self):
  server=compiled.StagingControllerPacketTests(methodName='runTest')
  with server.fixture() as (root,mu,private,config,source,binding,client,request,calls,owned,expires):
   value=request(backup.encode({'schemaVersion':1,'action':'inspect-preparation',**binding,'capturedAt':'2026-11-16T00:00:00+00:00'}));self.assertEqual(value['status'],409);self.assertFalse(private.exists())

if __name__=='__main__':unittest.main()
