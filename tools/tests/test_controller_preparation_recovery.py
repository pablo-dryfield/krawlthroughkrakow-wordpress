"""Use the compiled WordPress helper and real caller to recover owned private initialization cuts."""
import hashlib,hmac,json,shutil,time,unittest
from unittest.mock import patch
from tools import content_update_backup as backup
from tools.content_update_client import UncertainRequest
from tools.tests import test_content_update_staging_packet as compiled
from tools.tests import test_content_update_controller as fixtures
from tools.tests import test_production_protected_state as capture_fixtures

@unittest.skipUnless(fixtures.PHP,'PHP required for compiled preparation-recovery integration')
class ControllerPreparationRecoveryTests(unittest.TestCase):
 def setUp(self):
  self.server=compiled.StagingControllerPacketTests(methodName='runTest');self.context=self.server.fixture();temporary=capture_fixtures.tempfile.TemporaryDirectory
  # Python's Windows path handling needs space for the authenticated pending filename.
  # Only this new fixture's directory prefix changes; product names/bytes/guards stay exact.
  def compact_temporary(*args,**kwargs):kwargs['prefix']='ktk-r-';return temporary(*args,**kwargs)
  with patch.object(capture_fixtures.tempfile,'TemporaryDirectory',compact_temporary):values=self.context.__enter__()
  self.addCleanup(self.context.__exit__,None,None,None);self.root,self.mu,self.private,self.config,self.source,self.binding,self.client,self.request,self.calls,self.owned,self.expires=values;self.initial=self.client.prepare();self.files=self.snapshot();self.control={n:b for n,b in self.files.items() if n.startswith('control/')};self.seeds={n:b for n,b in self.files.items() if n.startswith(('source/','target/'))};self.backups={n:b for n,b in self.files.items() if '/prior/' in n};self.engine='engine/'+fixtures.ID+'/';self.engine_lock=next(n for n in self.files if n.startswith('engine/target-'));self.original=backup.decode(self.files['control/original-state.json'].split(b'\n',2)[2]);self.original_time=self.original['capturedAt']
 def snapshot(self):return {p.relative_to(self.private).as_posix():p.read_bytes() for p in self.private.rglob('*') if p.is_file()}
 def cut(self,files=None,dirs=(),absent=False):
  path=self.private.resolve();self.assertTrue(path.is_relative_to(self.root.resolve()) and not path.is_relative_to((self.root/'public_html').resolve()));self.assertFalse(self.private.is_symlink());shutil.rmtree(path)
  if absent:return
  self.private.mkdir(mode=0o700);(self.private/'control').mkdir(mode=0o700)
  for name in ('owner.marker','controller.lock'):self.write(name,self.files[name])
  for name in dirs:(self.private/name).mkdir(parents=True,exist_ok=True,mode=0o700)
  for name,data in (files or {}).items():self.write(name,data)
 def write(self,name,data):
  path=self.private/name;path.parent.mkdir(parents=True,exist_ok=True,mode=0o700);path.write_bytes(data);return path
 def pending(self,name,blob):
  digest=backup.sha(blob);stamp=self.original_time[:19].replace('-','').replace('T','').replace(':','') if name=='original-state.json' else '';signed=name+'|'+(stamp+'|' if stamp else '')+digest;mac=hmac.new(fixtures.KEY.encode(),signed.encode(),hashlib.sha256).hexdigest()[:16];return 'control/.ktk-control-'+name+'-'+(stamp+'-' if stamp else '')+digest+'-'+mac+'.tmp'
 def recover(self):
  state=self.client.recover_preparation();self.assertEqual(state['engine']['phase'],'prepared');self.assertTrue(state['engine']['backupVerified'] and state['engine']['currentPriorInventoryVerified']);self.assertFalse(state['archiveAcknowledged']);self.assertNotIn('Private original content must never enter controller responses',json.dumps(state));return state
 def test_existing_completed_preparation_inspects_and_recovers_idempotently(self):
  before=self.snapshot();state=self.client.inspect_preparation();self.assertTrue(state['preparation']['recordsComplete']);self.assertEqual(state['preparation']['enginePhase'],'prepared');self.recover();self.assertEqual(self.snapshot(),before)
 def test_request_not_executed_or_owned_empty_store_recovers_without_blind_prepare_retry(self):
  for absent in (True,False):
   with self.subTest(absent=absent):self.cut(absent=absent);state=self.client.inspect_preparation();self.assertIs(state['preparation']['rootExists'],not absent);time.sleep(1.05);value=self.client.call('recover-preparation',stateSha256=state['stateSha256']);self.assertEqual(value['engine']['phase'],'prepared');self.assertTrue(value['engine']['currentPriorInventoryVerified'])
 def test_partial_original_snapshot_recovers_its_original_time_and_exact_private_rows(self):
  blob=self.control['control/original-state.json'];name=self.pending('original-state.json',blob)
  for length in (0,23,len(blob)//2,len(blob)):
   with self.subTest(length=length):self.cut({name:blob[:length]});state=self.client.inspect_preparation();self.assertEqual(state['preparation']['originalCaptureTime'],self.original_time);time.sleep(1.05);self.recover();self.assertEqual((self.private/'control/original-state.json').read_bytes(),blob)
 def test_partial_plan_and_seed_initialization_cuts_recover(self):
  plan=self.control['control/controller-plan.json'];pending=self.pending('controller-plan.json',plan);source_name=next(n for n in self.seeds if n.startswith('source/'));target_name=next(n for n in self.seeds if n.startswith('target/'));all_source={n:b for n,b in self.seeds.items() if n.startswith('source/')}
  cases=[({'control/original-state.json':self.control['control/original-state.json'],pending:plan[:23]},()),(self.control,()),(self.control,('engine',)),({**self.control,source_name:self.seeds[source_name][:7]},('engine',)),({**self.control,**all_source,target_name:self.seeds[target_name][:9]},('engine',))]
  for files,dirs in cases:
   with self.subTest(names=list(files),dirs=dirs):self.cut(files,dirs);self.recover();self.assertEqual({n:b for n,b in self.snapshot().items() if n.startswith('control/')},self.control)
 def test_engine_backup_and_receipt_cuts_recover_with_unchanged_archive_format(self):
  prefix={**self.control,**self.seeds,self.engine_lock:b''};first=next(iter(self.backups));engine_plan=self.engine+'plan.json';engine_journal=self.engine+'journal.json'
  cases=[({**prefix,first:self.backups[first][:2]},()),({**prefix,**self.backups,self.engine+'receipts/.ktk-receipt-plan-'+('1'*32):self.files[engine_plan][:13]},()),({**prefix,**self.backups,engine_plan:self.files[engine_plan],self.engine+'receipts/.ktk-receipt-journal-'+('2'*32):self.files[engine_journal][:19]},())]
  for files,dirs in cases:
   with self.subTest(names=list(files)):self.cut(files,dirs);self.recover();self.assertEqual(self.snapshot(),self.files)
  self.client.export_and_acknowledge(self.root/'deploy-backups/recovered-controller.zip')
  while self.client.state['engine']['phase']!='applied':self.client.step('apply')
  while self.client.state['engine']['phase']!='rolled-back':self.client.step('rollback')
  self.assertTrue(self.client.close()['closed']);self.assertFalse((self.mu/backup.ACTIVATION).exists())
 def test_stale_fence_after_private_prefix_change_never_completes_files(self):
  name=next(n for n in self.seeds if n.startswith('source/'));self.cut({**self.control,name:self.seeds[name][:1]},('engine',));state=self.client.inspect_preparation();(self.private/name).write_bytes(self.seeds[name][:2]);before=self.snapshot()
  with self.assertRaises(UncertainRequest):self.client.call('recover-preparation',stateSha256=state['stateSha256'])
  self.assertEqual(self.snapshot(),before)
 def test_changed_real_protected_rows_refuse_before_any_private_recovery(self):
  self.cut(self.control,('engine',));self.config['rows']['posts'][0]['post_content']='External protected row change';before=self.snapshot()
  with self.assertRaises(UncertainRequest):self.client.inspect_preparation()
  self.assertEqual(self.snapshot(),before);self.assertEqual(self.config['rows']['posts'][0]['post_content'],'External protected row change')
 def test_unknown_private_member_or_changed_snapshot_is_preserved(self):
  self.cut(self.control,('engine',));path=self.write('owner-note',b'keep unknown data');before=self.snapshot()
  with self.assertRaises(UncertainRequest):self.client.inspect_preparation()
  self.assertEqual(self.snapshot(),before);path.unlink();path=self.private/'control/original-state.json';changed=path.read_bytes()[:-1]+b'!';path.write_bytes(changed);before=self.snapshot()
  with self.assertRaises(UncertainRequest):self.client.recover_preparation()
  self.assertEqual(self.snapshot(),before)
 def test_ordinary_prepare_still_refuses_and_archive_ack_blocks_preparation_recovery(self):
  self.cut(self.control,('engine',));before=self.snapshot()
  with self.assertRaises(UncertainRequest):self.client.prepare()
  self.assertEqual(self.snapshot(),before);self.recover();self.client.export_and_acknowledge(self.root/'deploy-backups/prepared-ack.zip');before=self.snapshot()
  with self.assertRaises(UncertainRequest):self.client.recover_preparation()
  self.assertEqual(self.snapshot(),before);self.assertTrue(self.client.inspect()['archiveAcknowledged'])
 def test_unknown_unowned_bootstrap_is_never_claimed_by_recovery(self):
  self.cut();(self.private/'owner.marker').unlink();before=self.snapshot()
  with self.assertRaises(UncertainRequest):self.client.recover_preparation()
  self.assertEqual(self.snapshot(),before);self.assertFalse((self.private/'owner.marker').exists())

if __name__=='__main__':unittest.main()
