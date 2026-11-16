import contextlib,copy,json,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
from tools import content_update_backup as backup
from tools.content_update_client import ContentUpdateClient,UncertainRequest
from tools.tests import test_content_update_controller as server_fixtures

@unittest.skipUnless(server_fixtures.PHP,'PHP required for injected caller/controller integration')
class ContentUpdateClientTests(unittest.TestCase):
 @contextlib.contextmanager
 def fixture(self):
  server=server_fixtures.ContentUpdateControllerTests()
  with server.fixture() as (root,mu,driver,cfg):
   log=[];fault={'action':None,'kind':None};private=root/('.ktk-content-update-'+server_fixtures.ID)
   def transport(raw):
    request=backup.decode(raw);log.append(request);cfg['request']=raw.decode();result=server.call(root,driver,cfg)
    if not result['ok']:raise RuntimeError('Fixture server rejected request')
    envelope={'helperSha256':cfg['packet']['helperSha256'],'controller':result['value']}
    if fault['action']==request['action']:
     if fault['kind']=='lost-reply':raise TimeoutError('Sensitive response details must not be forwarded')
     if fault['kind']=='wrong-helper':envelope['helperSha256']='e'*64
     if fault['kind']=='wrong-plan':envelope['controller']['planSha256']='e'*64
     if fault['kind']=='mutation-claim':envelope['controller']['databaseWrites']=1
     if fault['kind']=='stale-after-export':(private/'target/ktk-code-pages-assets/runtime.css').write_bytes(b'externally changed after export')
     if fault['kind']=='archive-after-inspect':
      with zipfile.ZipFile(root/'deploy-backups/caller.zip','a') as archive:archive.writestr('external-after-inspect',b'archive changed during server read')
    return envelope
   reader=lambda source:(private/source).read_bytes()
   client=ContentUpdateClient(cfg['binding'],cfg['packet']['helperSha256'],server_fixtures.KEY,transport,reader)
   with patch.object(backup,'ROOT',root):yield root,private,client,log,fault,transport,reader
 def ack(self,root,client):client.prepare();return client.export_and_acknowledge(root/'deploy-backups/caller.zip')
 def test_actual_php_controller_roundtrip_download_crc_ack_bounded_apply_rollback_and_close(self):
  with self.fixture() as (root,private,client,log,fault,transport,reader):
   state=self.ack(root,client);self.assertTrue(state['archiveAcknowledged']);self.assertTrue(client.archive_receipt['allMemberChecksumsAndCRCVerified'])
   while state['engine']['phase']!='applied':state=client.step('apply')
   while state['engine']['phase']!='rolled-back':state=client.step('rollback')
   state=client.close();self.assertTrue(state['closed']);self.assertTrue(state['engine']['currentPriorInventoryVerified']);self.assertTrue((root/'deploy-backups/caller.zip').exists())
   actions=[r['action'] for r in log];self.assertEqual(actions[:4],['prepare','export','inspect','acknowledge']);self.assertEqual(actions.count('apply'),4);self.assertEqual(actions.count('rollback'),4)
   for index,action in enumerate(actions):
    if action in ('apply','rollback','close'):self.assertEqual(actions[index-1],'inspect')
 def test_corrupt_reader_cannot_send_acknowledgment_or_application_write(self):
  with self.fixture() as (root,private,client,log,fault,transport,reader):
   client.prepare();client.reader=lambda source:b'changed download'
   with self.assertRaises(ValueError):client.export_and_acknowledge(root/'deploy-backups/corrupt.zip')
   self.assertEqual([r['action'] for r in log],['prepare','export']);self.assertTrue((root/'deploy-backups/corrupt.zip').exists());self.assertFalse((private/'control/backup-ack.json').exists())
 def test_server_drift_during_archive_download_preserves_archive_and_blocks_ack(self):
  with self.fixture() as (root,private,client,log,fault,transport,reader):
   client.prepare();fault.update(action='export',kind='stale-after-export')
   with self.assertRaises(ValueError):client.export_and_acknowledge(root/'deploy-backups/stale.zip')
   self.assertEqual([r['action'] for r in log],['prepare','export','inspect']);self.assertEqual((private/'target/ktk-code-pages-assets/runtime.css').read_bytes(),b'externally changed after export');self.assertFalse((private/'control/backup-ack.json').exists())
 def test_bad_source_binding_or_boundary_response_stops_without_retry_or_ack(self):
  for kind in ('wrong-helper','wrong-plan','mutation-claim'):
   with self.fixture() as (root,private,client,log,fault,transport,reader):
    fault.update(action='prepare',kind=kind)
    with self.assertRaises(UncertainRequest):client.prepare()
    self.assertEqual([r['action'] for r in log],['prepare']);self.assertIsNone(client.state);self.assertFalse((private/'control/backup-ack.json').exists())
 def test_lost_apply_response_never_retries_and_subsequent_explicit_inspection_supports_resume(self):
  with self.fixture() as (root,private,client,log,fault,transport,reader):
   self.ack(root,client);fault.update(action='apply',kind='lost-reply')
   with self.assertRaises(UncertainRequest) as caught:client.step('apply')
   self.assertNotIn('Sensitive',str(caught.exception));self.assertIsNone(client.state);self.assertEqual([r['action'] for r in log].count('apply'),1);fault.update(action=None,kind=None);state=client.inspect();self.assertEqual(len(state['engine']['pendingApplyFiles']),3)
   while state['engine']['phase']!='applied':state=client.step('apply')
   self.assertEqual([r['action'] for r in log].count('apply'),4)
 def test_lost_ack_reply_preserves_verified_zip_and_inspection_can_confirm_ack(self):
  with self.fixture() as (root,private,client,log,fault,transport,reader):
   client.prepare();fault.update(action='acknowledge',kind='lost-reply')
   with self.assertRaises(UncertainRequest):client.export_and_acknowledge(root/'deploy-backups/ack-lost.zip')
   self.assertEqual([r['action'] for r in log].count('acknowledge'),1);self.assertTrue(client.verified_archive()['fullOriginalAndPriorSetVerified']);fault.update(action=None,kind=None);self.assertTrue(client.inspect()['archiveAcknowledged']);self.assertEqual(client.step('apply')['engine']['phase'],'applying')
 def test_restart_must_reopen_saved_archive_before_using_an_existing_server_ack(self):
  with self.fixture() as (root,private,client,log,fault,transport,reader):
   self.ack(root,client);restarted=ContentUpdateClient(client.binding,client.helper_sha256,client.key,transport,reader);before=len(log)
   with self.assertRaises(ValueError):restarted.step('apply')
   self.assertEqual(len(log),before);restarted.attach_archive(root/'deploy-backups/caller.zip');self.assertEqual(restarted.step('apply')['engine']['phase'],'applying')
 def test_saved_archive_modification_is_detected_before_any_new_request(self):
  with self.fixture() as (root,private,client,log,fault,transport,reader):
   self.ack(root,client);path=root/'deploy-backups/caller.zip';before=len(log)
   with zipfile.ZipFile(path,'a') as archive:archive.writestr('unexpected',b'external archive change')
   with self.assertRaises(ValueError):client.step('apply')
   self.assertEqual(len(log),before);self.assertTrue(client.inspect()['engine']['currentPriorInventoryVerified'])
 def test_foreign_release_archive_and_wrong_key_never_attach(self):
  with self.fixture() as (root,private,client,log,fault,transport,reader):
   self.ack(root,client);foreign=dict(client.binding);foreign['applicationCommit']='e'*40;wrong=ContentUpdateClient(foreign,client.helper_sha256,client.key,transport,reader)
   with self.assertRaises(ValueError):wrong.attach_archive(root/'deploy-backups/caller.zip')
   wrong=ContentUpdateClient(client.binding,client.helper_sha256,'e'*64,transport,reader)
   with self.assertRaises(ValueError):wrong.attach_archive(root/'deploy-backups/caller.zip')
 def test_closed_server_transaction_cannot_be_advanced(self):
  with self.fixture() as (root,private,client,log,fault,transport,reader):
   self.ack(root,client);client.step('rollback');client.close();before=[r['action'] for r in log].count('apply')
   with self.assertRaises(ValueError):client.step('apply')
   self.assertEqual([r['action'] for r in log].count('apply'),before)
 def test_unacknowledged_server_state_blocks_apply_even_with_a_valid_attached_archive(self):
  with self.fixture() as (root,private,client,log,fault,transport,reader):
   client.prepare();exported=client.call('export');manifest=exported['export'];path=root/'deploy-backups/unacknowledged.zip';backup.build_archive(manifest,reader,client.key,path);client.attach_archive(path)
   with self.assertRaises(ValueError):client.step('apply')
   self.assertEqual([r['action'] for r in log],['prepare','export','inspect']);self.assertFalse((private/'control/backup-ack.json').exists())
 def test_archive_tampering_during_fresh_inspection_still_blocks_mutation(self):
  with self.fixture() as (root,private,client,log,fault,transport,reader):
   self.ack(root,client);fault.update(action='inspect',kind='archive-after-inspect')
   with self.assertRaises(ValueError):client.step('apply')
   self.assertNotIn('apply',[r['action'] for r in log]);self.assertTrue((private/'target/ktk-code-pages.php').exists())
 def test_caller_rejects_arbitrary_paths_limits_and_approval_arguments_before_transport(self):
  with self.fixture() as (root,private,client,log,fault,transport,reader):
   for extra in ({'ownerApproved':True},{'path':'../wp-config.php'},{'limit':100000}):
    with self.assertRaises(ValueError):client.call('prepare',**extra)
   self.assertEqual(log,[]);self.assertFalse(private.exists())

if __name__=='__main__':unittest.main()
