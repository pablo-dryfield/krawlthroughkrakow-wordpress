"""Execute explicit preparation recovery against real PHP and isolated prior/public fixtures."""
import json,os,shutil,subprocess,unittest
from pathlib import Path
from tools.tests import test_active_content_transaction as base

DRIVER=base.DRIVER.replace("if (!in_array($action, array('prepare','apply','rollback','inspect'), true))", "if (!in_array($action, array('prepare','apply','rollback','inspect','inspect-preparation','resume-preparation'), true))")
old="    $result = array_key_exists('limit', $config) && in_array($action, array('apply', 'rollback'), true) ? $transaction->$action($config['limit']) : $transaction->$action();"
assert DRIVER.count(old)==1
DRIVER=DRIVER.replace(old,"    if ($action === 'inspect-preparation') { $result=$transaction->inspectPreparation(); }\n    elseif ($action === 'resume-preparation') { $result=$transaction->resumePreparation($config['preparationFence'] ?? ''); }\n    else { "+old.strip()+" }")
old="    if ($used) { return; }"
assert DRIVER.count(old)==1
DRIVER=DRIVER.replace(old,old+"\n    if ($event === 'after-preparation-file-open' && $fault === 'preparation-crash') { exit(73); }\n    if ($event === 'after-preparation-file-open' && $fault === 'preparation-race') { $used=true;file_put_contents($config['racePath'],'foreign preparation bytes'); }")

@unittest.skipUnless(shutil.which('php'),'PHP required for isolated preparation recovery')
class PreparationRecoveryTests(unittest.TestCase):
 def setUp(self):
  self.case=base.ActiveContentTransactionTests(methodName='runTest');self.case.setUp();self.addCleanup(self.case.doCleanups);self.case.driver.write_bytes(DRIVER.encode());self.tx=self.case.private/('a'*32)
  self.prepared=self.call('prepare');self.complete=self.case.tree(self.tx);self.backups={n:b for n,b in self.complete.items() if n.startswith('prior/')};self.assertEqual(len(self.backups),4)
 def seed(self,files=None,directories=()):
  path=self.tx.resolve();self.assertTrue(path.is_relative_to(self.case.root.resolve()) and path.parent==self.case.private.resolve())
  shutil.rmtree(path);path.mkdir(mode=0o700)
  for name in directories:(path/name).mkdir(parents=True,mode=0o700)
  for name,data in (files or {}).items():self.case.write(path,name,data)
 def call(self,action,success=True,fault='',exit_code=None,**extra):
  config=json.loads(self.case.config.read_bytes());config.update(extra);self.case.config.write_bytes(json.dumps(config).encode());r=subprocess.run(['php','-d','allow_url_fopen=0',str(self.case.driver),str(base.ENGINE),str(self.case.config),action,fault],capture_output=True,text=True,timeout=30)
  self.assertEqual(r.returncode,exit_code if exit_code is not None else (0 if success else 2),r.stdout+r.stderr)
  if exit_code is not None:return None
  self.assertEqual(r.stderr,'',r.stderr);d=json.loads(r.stdout);self.assertIs(d['ok'],success);return d.get('result') if success else d['error']
 def recover(self):
  state=self.call('inspect-preparation');before=self.case.tree();result=self.call('resume-preparation',preparationFence=state['stateSha256']);self.assertEqual(result['phase'],'prepared');self.assertTrue(result['backupVerified'] and result['currentPriorInventoryVerified']);self.assertEqual(self.case.tree(),before);self.assertEqual(self.case.tree(self.tx),self.complete);return result
 def private_snapshot(self):return self.case.tree(self.tx)
 def test_empty_and_partial_backup_cuts_recover_then_existing_apply_rollback_still_work(self):
  names=list(self.backups)
  for cut in range(len(names)+1):
   with self.subTest(cut=cut):
    files={n:self.backups[n] for n in names[:cut]}
    if cut<len(names):files[names[cut]]=self.backups[names[cut]][:3]
    self.seed(files);self.recover()
  self.call('apply');self.assertTrue(self.call('inspect')['currentExpectedInventoryVerified']);self.call('rollback');self.assertEqual(self.case.tree(),self.case.old);self.assertEqual((self.case.target/base.MARKER).read_bytes(),base.ACTIVATION)
 def test_known_plan_receipt_empty_partial_and_complete_prefixes_recover(self):
  raw=self.complete['plan.json']
  for length in (0,13,len(raw)):
   with self.subTest(length=length):self.seed({**self.backups,'receipts/.ktk-receipt-plan-'+('1'*32):raw[:length]});self.recover();self.assertEqual(list((self.tx/'receipts').iterdir()),[])
 def test_empty_original_file_is_created_as_a_real_verified_backup(self):
  name=base.ASSETS+'runtime.css';self.case.old[name]=b'';(self.case.target/name).write_bytes(b'');self.case.plan['prior'][name]=base.sha(b'');self.case.save_config();self.seed();self.call('prepare');self.complete=self.private_snapshot();self.backups={n:b for n,b in self.complete.items() if n.startswith('prior/')};self.seed();self.recover();self.assertTrue((self.tx/'prior'/name).is_file());self.assertEqual((self.tx/'prior'/name).read_bytes(),b'')
 def test_known_journal_receipt_and_committed_plan_recover(self):
  raw=self.complete['journal.json']
  for length in (0,19,len(raw)):
   with self.subTest(length=length):self.seed({**self.backups,'plan.json':self.complete['plan.json'],'receipts/.ktk-receipt-journal-'+('2'*32):raw[:length]});self.recover()
 def test_completed_plan_without_journal_recovers_and_prepared_lost_reply_is_idempotent(self):
  self.seed({**self.backups,'plan.json':self.complete['plan.json']});self.recover();state=self.call('inspect-preparation');before=self.private_snapshot();self.call('resume-preparation',preparationFence=state['stateSha256']);self.assertEqual(self.private_snapshot(),before)
 def test_ordinary_prepare_still_refuses_partial_and_completed_namespaces(self):
  self.assertIn('inspected',self.call('prepare',success=False));self.seed(self.backups);before=self.private_snapshot();self.assertIn('Fresh private',self.call('prepare',success=False));self.assertEqual(self.private_snapshot(),before)
 def test_stale_private_inspection_never_appends_or_overwrites(self):
  name=next(iter(self.backups));self.seed({name:self.backups[name][:1]});state=self.call('inspect-preparation');(self.tx/name).write_bytes(self.backups[name][:2]);before=self.private_snapshot();self.assertIn('Stale preparation',self.call('resume-preparation',success=False,preparationFence=state['stateSha256']));self.assertEqual(self.private_snapshot(),before)
 def test_changed_source_target_protected_or_activation_refuses_before_recovery_writes(self):
  self.seed(self.backups);state=self.call('inspect-preparation')
  for path in (self.case.source/'ktk-code-pages.php',self.case.target/'ktk-code-pages.php',self.case.protected,self.case.target/base.MARKER):
   with self.subTest(path=str(path)):
    original=path.read_bytes();path.write_bytes(b'external preparation change');before=self.private_snapshot();self.call('resume-preparation',success=False,preparationFence=state['stateSha256']);self.assertEqual(path.read_bytes(),b'external preparation change');self.assertEqual(self.private_snapshot(),before);path.write_bytes(original)
 def test_unknown_members_and_changed_prefixes_are_preserved(self):
  cases=[({'unknown.txt':b'keep'},()),({},('unknown-directory',)),({next(iter(self.backups)):b'foreign backup'},()),({'receipts/.ktk-receipt-plan-'+('3'*32):b'partial'},()),({'plan.json':b'foreign plan'},()),({'journal.json':b'{"phase":'},())]
  for files,dirs in cases:
   with self.subTest(files=list(files),dirs=dirs):self.seed(files,dirs);before=self.private_snapshot();self.call('inspect-preparation',success=False);self.assertEqual(self.private_snapshot(),before);self.assertEqual(self.case.tree(),self.case.old)
 def test_ambiguous_or_redundant_receipts_are_preserved(self):
  raw=self.complete['plan.json']
  for extra in [{'receipts/.ktk-receipt-plan-'+('4'*32):raw[:2],'receipts/.ktk-receipt-plan-'+('5'*32):raw[:3]},{'plan.json':raw,'receipts/.ktk-receipt-plan-'+('4'*32):raw}]:
   self.seed({**self.backups,**extra});before=self.private_snapshot();self.call('inspect-preparation',success=False);self.assertEqual(self.private_snapshot(),before)
 def test_backup_truncation_after_receipts_started_is_not_reinterpreted_as_interruption(self):
  files={**self.backups,'receipts/.ktk-receipt-plan-'+('6'*32):self.complete['plan.json'][:4]};name=next(iter(self.backups));files[name]=files[name][:2];self.seed(files);before=self.private_snapshot();self.call('inspect-preparation',success=False);self.assertEqual(self.private_snapshot(),before)
 def test_recovery_after_application_is_refused(self):
  self.call('apply');before=self.private_snapshot();public=self.case.tree();self.call('inspect-preparation',success=False);self.assertEqual(self.private_snapshot(),before);self.assertEqual(self.case.tree(),public)
 def test_prepared_backup_change_is_preserved(self):
  name=next(iter(self.backups));(self.tx/name).write_bytes(self.backups[name][:2]);before=self.private_snapshot();self.call('inspect-preparation',success=False);self.assertEqual(self.private_snapshot(),before)
 def test_interrupted_recovery_requires_new_inspection_and_resumes(self):
  self.seed();state=self.call('inspect-preparation');self.call('resume-preparation',preparationFence=state['stateSha256'],fault='preparation-crash',exit_code=73);before=self.private_snapshot();self.assertTrue(before);self.assertEqual(self.case.tree(),self.case.old);self.recover()
 def test_private_file_change_after_open_is_not_overwritten(self):
  name=next(iter(self.backups));self.seed({name:self.backups[name][:1]});state=self.call('inspect-preparation');path=self.tx/name;self.call('resume-preparation',success=False,preparationFence=state['stateSha256'],fault='preparation-race',racePath=str(path));self.assertEqual(path.read_bytes(),b'foreign preparation bytes');self.assertEqual(self.case.tree(),self.case.old)
 def test_hardlinked_private_backup_is_refused_without_changing_either_name(self):
  name=next(iter(self.backups));self.seed();outside=self.case.root/'hardlink-original';outside.write_bytes(self.backups[name][:2]);path=self.tx/name;path.parent.mkdir(parents=True,exist_ok=True)
  try:os.link(outside,path)
  except OSError as e:self.skipTest('Host disallows isolated hardlink: '+type(e).__name__)
  self.call('inspect-preparation',success=False);self.assertEqual(outside.read_bytes(),self.backups[name][:2]);self.assertEqual(path.read_bytes(),outside.read_bytes())
 def test_symlink_private_backup_is_refused_without_following_it(self):
  name=next(iter(self.backups));self.seed();outside=self.case.root/'symlink-original';outside.write_bytes(self.backups[name][:2]);path=self.tx/name;path.parent.mkdir(parents=True,exist_ok=True)
  try:path.symlink_to(outside)
  except OSError as e:self.skipTest('Host disallows isolated symlink: '+type(e).__name__)
  self.call('inspect-preparation',success=False);self.assertEqual(outside.read_bytes(),self.backups[name][:2]);self.assertTrue(path.is_symlink())

if __name__=='__main__':unittest.main()
