"""Real PHP exit during compiler-bound private initialization, followed by the explicit recovery API."""
import json,unittest
from unittest.mock import patch
from tools import content_update_recovery as recovery
from tools import content_update_staging_packet as packet
from tools.content_update_client import UncertainRequest
from tools.tests import test_content_update_staging_packet as compiled
from tools.tests import test_content_update_controller as fixtures
from tools.tests import test_content_update_recovery as recovery_fixtures

@unittest.skipUnless(fixtures.PHP,'PHP required for the compiled private preparation fault')
class PreparationFaultTests(unittest.TestCase):
 def test_real_compiled_php_exit_leaves_owned_records_then_recovery_preserves_and_closes(self):
  server=compiled.StagingControllerPacketTests(methodName='runTest');original=packet.helper_source
  def faulted(*args,**kwargs):return original(*args,**kwargs,preparation_fault=True)
  with patch.object(packet,'helper_source',faulted):
   context=server.fixture();values=context.__enter__()
  try:
   root,mu,private,config,source,binding,client,request,calls,owned,expires=values
   with self.assertRaises(UncertainRequest):client.prepare()
   self.assertTrue((private/'control/original-state.json').is_file());self.assertTrue((private/'source').is_dir());self.assertFalse((private/'target').exists());before=(private/'control/original-state.json').read_bytes();state=client.inspect_preparation();self.assertFalse(state['preparation']['seedsComplete']);self.assertIsNone(state['preparation']['enginePhase']);prepared=client.recover_preparation();self.assertEqual(prepared['engine']['phase'],'prepared');self.assertEqual((private/'control/original-state.json').read_bytes(),before)
   client.export_and_acknowledge(root/'deploy-backups/preparation-fault-recovered.zip')
   while client.state['engine']['phase']!='applied':client.step('apply')
   while client.state['engine']['phase']!='rolled-back':client.step('rollback')
   self.assertTrue(client.close()['closed']);self.assertFalse((mu/'ktk-code-pages-production.php').exists());self.assertNotIn('Private original content must never enter controller responses',json.dumps(client.state))
  finally:context.__exit__(None,None,None)
 def test_fault_selection_is_server_side_compiler_input_not_a_client_request_or_production_mode(self):
  with self.assertRaises(ValueError):packet.helper_source('bad','bad',1,'bad',{},'bad','bad',preparation_fault='true')
  source=packet.TEMPLATE.read_bytes();self.assertEqual(source.count(b'__KTK_CONTROLLER_PREPARATION_FAULT__'),1);self.assertIn(b"if($folder==='source'",source);self.assertNotIn(b"$_GET['preparationFault']",source);self.assertNotIn(b"$_POST['preparationFault']",source)
 def test_encrypted_recovery_schema_binds_the_private_server_fault_choice_without_authorizing_production(self):
  for flag in (True,False):
   value={**recovery_fixtures.packet(),'preparationFault':flag};self.assertEqual(recovery.validate_packet(value),value)
   with patch.object(recovery,'_dpapi',recovery_fixtures.fake_dpapi):self.assertEqual(recovery.unseal(recovery.seal(value),value['transactionId']),value)
  for flag in ('true',1,None):
   with self.assertRaises(ValueError):recovery.validate_packet({**recovery_fixtures.packet(),'preparationFault':flag})

if __name__=='__main__':unittest.main()
