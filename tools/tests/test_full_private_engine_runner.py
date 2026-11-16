import contextlib,importlib.util,io,json,tempfile,unittest
from pathlib import Path
from unittest import mock
from tools import content_update_backup as backup
from tools.tests.test_full_private_engine_recovery import fixture

ROOT=Path(__file__).resolve().parents[2];spec=importlib.util.spec_from_file_location('ktk_full_engine_runner_test',ROOT/'tools/rehearse-staging-full-private-engine.py');runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)

class FullPrivateEngineRunnerTests(unittest.TestCase):
 @contextlib.contextmanager
 def case(self):
  with tempfile.TemporaryDirectory(prefix='full-engine-runner-test-',dir=ROOT/'docs/seo') as d:
   v=fixture();path=Path(d)/'report.json';argv=['--application-commit',v['applicationCommit'],'--tooling-commit',v['toolingCommit'],'--report',str(path)];hashes=v['sourceHashes']
   with mock.patch.object(runner,'reviewed_source',return_value=(v['publicOwned'],v['publicSizes'],hashes)),mock.patch.object(runner,'unchanged'),contextlib.redirect_stdout(io.StringIO()):yield v,path,argv
 def test_default_offline_never_loads_connection_installs_helper_or_reads_vault(self):
  with self.case() as (v,path,argv),mock.patch.object(runner.shared.snapshot,'load_common',side_effect=AssertionError('No connector offline')) as common,mock.patch.object(runner.recovery.FullPrivateEngineVault,'load',side_effect=AssertionError('No vault offline')),mock.patch.object(runner.shared,'HelperLease') as lease:
   runner.main(argv);report=json.loads(path.read_text());self.assertEqual(report['phase'],'offline-validated');self.assertEqual(report['productionOperations'],0);self.assertFalse(report['fullHostTransactionAcceptance']);common.assert_not_called();lease.assert_not_called()
 def test_dirty_or_wrong_source_refuses_before_loading_hosting_tools(self):
  with self.case() as (_,path,argv),mock.patch.object(runner,'reviewed_source',side_effect=ValueError('Synthetic source mismatch')),mock.patch.object(runner.shared.snapshot,'load_common') as common:
   with self.assertRaises(ValueError):runner.main(argv+['--rehearse-staging'])
   common.assert_not_called();self.assertFalse(path.exists())
 def test_encryption_failure_precedes_main_helper_install_and_preserves_sanitized_report(self):
  with self.case() as (v,path,argv),mock.patch.object(runner.shared.snapshot,'load_common',return_value=mock.Mock()),mock.patch.object(runner,'BoundedStagingFTPS',return_value=mock.Mock(statistics=mock.Mock(return_value={}))),mock.patch.object(runner.shared,'capture',return_value={'protectedStateSha256':v['plan']['protectedStateSha256']}),mock.patch.object(runner.compiler,'helper_source',return_value=b'owned synthetic test helper'),mock.patch.object(runner.recovery.FullPrivateEngineVault,'save',side_effect=RuntimeError('Synthetic unavailable encryption')) as save,mock.patch.object(runner.shared,'HelperLease') as lease:
   with self.assertRaises(RuntimeError):runner.main(argv+['--rehearse-staging'])
   save.assert_called_once();lease.assert_not_called();report=json.loads(path.read_text());self.assertEqual(report['phase'],'failed-preserve-encrypted-packets-and-archives');self.assertNotIn(v['token'],path.read_text());self.assertNotIn(v['ownershipKey'],path.read_text());self.assertNotIn('Synthetic unavailable encryption',path.read_text())
 def test_expired_recovery_refuses_before_connection_or_helper_reinstallation(self):
  with self.case() as (v,path,argv),mock.patch.object(runner.shared.snapshot,'load_common',return_value=mock.Mock()),mock.patch.object(runner.recovery.FullPrivateEngineVault,'load',return_value={**v,'expires':1}),mock.patch.object(runner,'BoundedStagingFTPS') as connection,mock.patch.object(runner.shared,'HelperLease') as lease:
   with self.assertRaises(RuntimeError):runner.main(argv+['--inspect-recovery',v['transactionId']])
   connection.assert_not_called();lease.assert_not_called();self.assertEqual(json.loads(path.read_text())['failureType'],'ValueError')
 def test_wrapper_keeps_offline_before_secret_access_and_clears_native_secret(self):
  text=(ROOT/'tools/rehearse-staging-full-private-engine.ps1').read_text();self.assertLess(text.index("-notcontains '--rehearse-staging'"),text.index('Import-Clixml'));self.assertLess(text.index("-notcontains '--resume-engine-recovery'"),text.index('Import-Clixml'));self.assertIn('ZeroFreeBSTR($fullEnginePasswordPointer)',text);self.assertIn('Remove-Item Env:KTK_FTP_PASSWORD',text);self.assertIn('finally {',text)
 def test_resume_archive_verification_precedes_connection_or_any_helper_installation(self):
  with self.case() as (v,path,argv),mock.patch.object(runner.shared.snapshot,'load_common',return_value=mock.Mock()),mock.patch.object(runner.recovery.FullPrivateEngineVault,'load',return_value=v),mock.patch.object(runner.recovery_resume,'attach_verified_archives',side_effect=ValueError('Synthetic corrupt saved archive')) as archive,mock.patch.object(runner,'BoundedStagingFTPS') as connection,mock.patch.object(runner.shared,'HelperLease') as lease:
   with self.assertRaises(RuntimeError):runner.main(argv+['--resume-engine-recovery',v['transactionId']])
   archive.assert_called_once();connection.assert_not_called();lease.assert_not_called();self.assertEqual(json.loads(path.read_text())['failureType'],'ValueError')
 def test_resume_wrong_tooling_or_expiry_refuses_before_archive_verification_or_connection(self):
  for change in ({'toolingCommit':'f'*40},{'expires':1}):
   with self.subTest(change=change),self.case() as (v,path,argv),mock.patch.object(runner.shared.snapshot,'load_common',return_value=mock.Mock()),mock.patch.object(runner.recovery.FullPrivateEngineVault,'load',return_value={**v,**change}),mock.patch.object(runner.recovery_resume,'attach_verified_archives') as archive,mock.patch.object(runner,'BoundedStagingFTPS') as connection,mock.patch.object(runner.shared,'HelperLease') as lease:
    with self.assertRaises(RuntimeError):runner.main(argv+['--resume-engine-recovery',v['transactionId']])
    archive.assert_not_called();connection.assert_not_called();lease.assert_not_called()
 def test_controlled_stop_cannot_enable_offline_inspection_or_resume_operations(self):
  for extra in (['--stop-after-engine-cut'],['--rehearse-staging','--stop-after-engine-cut'],['--resume-engine-recovery','a'*32,'--stop-after-engine-cut']):
   with self.subTest(extra=extra),self.case() as (_,path,argv),mock.patch.object(runner.shared.snapshot,'load_common') as common:
    with self.assertRaises(ValueError):runner.main(argv+extra)
    common.assert_not_called();self.assertFalse(path.exists())

if __name__=='__main__':unittest.main()
