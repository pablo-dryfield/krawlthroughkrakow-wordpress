"""Authenticate original capture timestamps and partial-record recovery without refreshing saved state."""
import hashlib,hmac,json,os,unittest
from tools.tests import test_content_update_private_store as base

DRIVER=base.DRIVER.replace("  elseif($op['action']==='inventory')", "  elseif($op['action']==='preparation-time'){$result=$store->preparationTimestamp();}\n  elseif($op['action']==='preparation-records'){$result=$store->inspectPreparationRecords($op['records']);}\n  elseif($op['action']==='inventory')")

@unittest.skipUnless(base.PHP,'PHP required for signed preparation-record fixtures')
class PreparationRecordTests(unittest.TestCase):
 def setUp(self):
  self.case=base.ContentUpdatePrivateStoreTests(methodName='runTest');self.case.setUp();self.addCleanup(self.case.tearDown);self.case.driver.write_bytes(DRIVER.encode());self.raw=json.dumps({'capturedAt':'2026-11-16T03:44:00+00:00','selectedRows':'Original private fixture rows; never a public response.'},separators=(',',':'));self.records={'original-state.json':self.raw,'controller-plan.json':'{"immutable":"fixture plan"}'}
 def ops(self,*ops,**kwargs):return self.case.run_ops(list(ops),**kwargs)
 def partial_original(self):
  self.ops({'action':'create','fault':'partial-exit'},{'action':'write','name':'original-state.json','bytes':self.raw},exit_code=73);pending=list((self.case.private/'control').iterdir());self.assertEqual(len(pending),1);self.assertEqual(len(pending[0].read_bytes()),23);return pending[0]
 def test_original_time_is_recoverable_even_when_payload_and_header_are_partial(self):
  pending=self.partial_original();self.assertIn('-20261116034400-',pending.name);before=pending.read_bytes();rows=self.ops({'action':'open'},{'action':'preparation-time'},{'action':'preparation-records','records':self.records});self.assertTrue(all(r['ok'] for r in rows),rows);self.assertEqual(rows[1]['result'],'2026-11-16T03:44:00+00:00');self.assertEqual(pending.read_bytes(),before);self.assertNotIn('selectedRows',json.dumps(rows));self.assertFalse(rows[2]['result']['originalComplete'])
 def test_original_record_resumes_exactly_and_is_not_refreshed_to_current_capture_time(self):
  self.partial_original();rows=self.ops({'action':'open'},{'action':'write','name':'original-state.json','bytes':self.raw},{'action':'write','name':'controller-plan.json','bytes':self.records['controller-plan.json']},{'action':'preparation-time'},{'action':'preparation-records','records':self.records},{'action':'read','name':'original-state.json'});self.assertTrue(all(r['ok'] for r in rows),rows);self.assertEqual(rows[-1]['result'],self.raw);self.assertEqual(rows[3]['result'],'2026-11-16T03:44:00+00:00');self.assertTrue(rows[4]['result']['planComplete']);self.assertEqual(set(rows[4]['result']['files']),set(self.records))
 def test_different_snapshot_or_timestamp_cannot_claim_pending_record(self):
  pending=self.partial_original();before=pending.read_bytes()
  for raw in [self.raw.replace('03:44:00','03:44:01'),self.raw.replace('Original private','Changed private')]:
   records={**self.records,'original-state.json':raw};rows=self.ops({'action':'open'},{'action':'preparation-records','records':records},{'action':'write','name':'original-state.json','bytes':raw});self.assertFalse(rows[1]['ok']);self.assertFalse(rows[2]['ok']);self.assertEqual(pending.read_bytes(),before)
 def test_timestamp_filename_tampering_is_not_trusted(self):
  pending=self.partial_original();changed=pending.with_name(pending.name.replace('20261116034400','20261116034401'));pending.rename(changed);before=changed.read_bytes();rows=self.ops({'action':'open'},{'action':'preparation-time'},{'action':'preparation-records','records':self.records});self.assertFalse(rows[1]['ok']);self.assertFalse(rows[2]['ok']);self.assertEqual(changed.read_bytes(),before)
 def test_changed_partial_bytes_are_preserved_even_with_a_valid_time_bound_name(self):
  pending=self.partial_original();pending.write_bytes(b'foreign private bytes');rows=self.ops({'action':'open'},{'action':'preparation-records','records':self.records},{'action':'write','name':'original-state.json','bytes':self.raw});self.assertFalse(rows[1]['ok']);self.assertFalse(rows[2]['ok']);self.assertEqual(pending.read_bytes(),b'foreign private bytes')
 def test_later_lifecycle_receipts_prevent_preparation_recovery_inspection(self):
  rows=self.ops({'action':'create'},{'action':'write','name':'backup-ack.json','bytes':'later archive acknowledgment'},{'action':'preparation-records','records':self.records});self.assertFalse(rows[-1]['ok']);self.assertTrue((self.case.private/'control/backup-ack.json').exists())
 def test_plan_before_original_or_redundant_original_temporary_is_rejected(self):
  rows=self.ops({'action':'create'},{'action':'write','name':'controller-plan.json','bytes':self.records['controller-plan.json']},{'action':'preparation-records','records':self.records});self.assertFalse(rows[-1]['ok'])
 def test_unknown_or_empty_unowned_control_file_never_becomes_a_record(self):
  self.ops({'action':'create'});path=self.case.private/'control/owner-note';path.write_bytes(b'');rows=self.ops({'action':'open'},{'action':'preparation-records','records':self.records});self.assertFalse(rows[-1]['ok']);self.assertEqual(path.read_bytes(),b'')
 def test_complete_legacy_snapshot_temporary_keeps_backward_compatibility(self):
  self.ops({'action':'create','fault':'full-before-rename'},{'action':'write','name':'original-state.json','bytes':self.raw});pending=list((self.case.private/'control').iterdir())[0];blob=pending.read_bytes();digest=hashlib.sha256(blob).hexdigest();mac=hmac.new(base.KEY.encode(),('original-state.json|'+digest).encode(),hashlib.sha256).hexdigest()[:16];legacy=pending.with_name('.ktk-control-original-state.json-'+digest+'-'+mac+'.tmp');pending.rename(legacy)
  rows=self.ops({'action':'open'},{'action':'preparation-time'},{'action':'preparation-records','records':self.records},{'action':'write','name':'original-state.json','bytes':self.raw},{'action':'read','name':'original-state.json'});self.assertTrue(all(r['ok'] for r in rows),rows);self.assertEqual(rows[-1]['result'],self.raw);self.assertFalse(legacy.exists())
 def test_partial_legacy_record_has_no_guessable_capture_timestamp(self):
  self.ops({'action':'create','fault':'partial-exit'},{'action':'write','name':'original-state.json','bytes':'legacy raw original snapshot'},exit_code=73);pending=list((self.case.private/'control').iterdir())[0];before=pending.read_bytes();rows=self.ops({'action':'open'},{'action':'preparation-time'});self.assertFalse(rows[-1]['ok']);self.assertIn('no authenticated timestamp',rows[-1]['message']);self.assertEqual(pending.read_bytes(),before)
 def test_hardlinked_control_record_is_preserved_without_appending_to_its_other_name(self):
  pending=self.partial_original();outside=self.case.base/'outside-record'
  try:os.link(pending,outside)
  except OSError as e:self.skipTest('Host disallows isolated hardlink: '+type(e).__name__)
  before=outside.read_bytes();rows=self.ops({'action':'open'},{'action':'preparation-records','records':self.records},{'action':'write','name':'original-state.json','bytes':self.raw});self.assertFalse(rows[1]['ok']);self.assertFalse(rows[2]['ok']);self.assertEqual(outside.read_bytes(),before)

if __name__=='__main__':unittest.main()
