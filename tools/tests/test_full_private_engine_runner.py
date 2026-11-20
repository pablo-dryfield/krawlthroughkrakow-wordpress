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
   self.assertIs(runner.compiler.helper_source.call_args.kwargs['hosted_runtime_bounds'],True)
   self.assertEqual(report['hostedRuntimeBounds'],{'profile':runner.bounds.PROFILE,'memoryCeilingBytes':268435456,'executionCeilingSeconds':60,'stepBytes':16777216,'stepFiles':64})
   with mock.patch.object(runner.bounds,'fetch_snapshot',return_value={'fixture':True}) as bounded:
    self.assertEqual(runner.shared.capture.call_args.kwargs['snapshot_fetcher']('t'*43,'a'*64),{'fixture':True})
    bounded.assert_called_once_with(runner.shared.snapshot,'t'*43,'a'*64,observe=mock.ANY)
 def test_expired_recovery_refuses_before_connection_or_helper_reinstallation(self):
  with self.case() as (v,path,argv),mock.patch.object(runner.shared.snapshot,'load_common',return_value=mock.Mock()),mock.patch.object(runner.recovery.FullPrivateEngineVault,'load',return_value={**v,'expires':1}),mock.patch.object(runner,'BoundedStagingFTPS') as connection,mock.patch.object(runner.shared,'HelperLease') as lease:
   with self.assertRaises(RuntimeError):runner.main(argv+['--inspect-recovery',v['transactionId']])
   connection.assert_not_called();lease.assert_not_called();self.assertEqual(json.loads(path.read_text())['failureType'],'ValueError')
 def test_wrapper_keeps_offline_before_secret_access_and_clears_native_secret(self):
  text=(ROOT/'tools/rehearse-staging-full-private-engine.ps1').read_text();self.assertLess(text.index("-notcontains '--rehearse-staging'"),text.index('Import-Clixml'));self.assertLess(text.index("-notcontains '--resume-engine-recovery'"),text.index('Import-Clixml'));self.assertLess(text.index("-notcontains '--resume-preparation-recovery'"),text.index('Import-Clixml'));self.assertIn('ZeroFreeBSTR($fullEnginePasswordPointer)',text);self.assertIn('Remove-Item Env:KTK_FTP_PASSWORD',text);self.assertIn('finally {',text)
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
 def test_preparation_resume_original_archive_preflight_precedes_connection_or_helper_install(self):
  with self.case() as (v,path,argv),mock.patch.object(runner.shared.snapshot,'load_common',return_value=mock.Mock()),mock.patch.object(runner.recovery.FullPrivateEngineVault,'load',return_value=v),mock.patch.object(runner.recovery_resume,'attach_verified_original',side_effect=ValueError('Synthetic invalid original')) as archive,mock.patch.object(runner,'BoundedStagingFTPS') as connection,mock.patch.object(runner.shared,'HelperLease') as lease:
   with self.assertRaises(RuntimeError):runner.main(argv+['--resume-preparation-recovery',v['transactionId']])
   archive.assert_called_once();connection.assert_not_called();lease.assert_not_called()
 def test_preparation_engine_stop_requires_original_saved_engine_interruption_before_connection(self):
  with self.case() as (v,path,argv),mock.patch.object(runner.shared.snapshot,'load_common',return_value=mock.Mock()),mock.patch.object(runner.recovery.FullPrivateEngineVault,'load',return_value={**v,'interruptEngine':False}),mock.patch.object(runner.recovery_resume,'attach_verified_original',return_value=({}, {}, {})),mock.patch.object(runner,'BoundedStagingFTPS') as connection,mock.patch.object(runner.shared,'HelperLease') as lease:
   with self.assertRaises(RuntimeError):runner.main(argv+['--resume-preparation-recovery',v['transactionId'],'--stop-after-engine-cut'])
   connection.assert_not_called();lease.assert_not_called()
 def test_preparation_stop_cannot_enable_recovery_or_conflict_with_engine_stop(self):
  for extra in (['--stop-after-preparation'],['--resume-preparation-recovery','a'*32,'--stop-after-preparation'],['--rehearse-staging','--interrupt-engine','--stop-after-preparation','--stop-after-engine-cut']):
   with self.subTest(extra=extra),self.case() as (_,path,argv),mock.patch.object(runner.shared.snapshot,'load_common') as common:
    with self.assertRaises(ValueError):runner.main(argv+extra)
    common.assert_not_called();self.assertFalse(path.exists())

 def test_new_modes_choose_exact_archive_gate_before_connection(self):
  for mode,expected in (('--resume-prepared-engine-recovery','attach_verified_original'),('--resume-first-rollback-recovery','attach_verified_archives')):
   with self.subTest(mode=mode),self.case() as (v,path,argv),mock.patch.object(runner.recovery.FullPrivateEngineVault,'load',return_value=v),mock.patch.object(runner.recovery_resume,expected,side_effect=ValueError('Synthetic invalid saved archive')) as archive,mock.patch.object(runner.shared.snapshot,'load_common') as common,mock.patch.object(runner,'BoundedStagingFTPS') as connection,mock.patch.object(runner.shared,'HelperLease') as lease:
    with self.assertRaises(RuntimeError):runner.main(argv+[mode,v['transactionId']])
    archive.assert_called_once();common.assert_not_called();connection.assert_not_called();lease.assert_not_called()

 def test_new_modes_reject_expiry_and_source_drift_before_archive_or_connector(self):
  for mode in ('--resume-prepared-engine-recovery','--resume-first-rollback-recovery'):
   for change in ({'toolingCommit':'f'*40},{'expires':1}):
    with self.subTest(mode=mode,change=change),self.case() as (v,path,argv),mock.patch.object(runner.recovery.FullPrivateEngineVault,'load',return_value={**v,**change}),mock.patch.object(runner.recovery_resume,'attach_verified_original') as original,mock.patch.object(runner.recovery_resume,'attach_verified_archives') as both,mock.patch.object(runner.shared.snapshot,'load_common') as common:
     with self.assertRaises(RuntimeError):runner.main(argv+[mode,v['transactionId']])
     original.assert_not_called();both.assert_not_called();common.assert_not_called()

 def test_new_modes_verify_exact_compiled_helper_before_loading_connector(self):
  for mode,expected in (('--resume-prepared-engine-recovery','attach_verified_original'),('--resume-first-rollback-recovery','attach_verified_archives')):
   with self.subTest(mode=mode),self.case() as (v,path,argv),mock.patch.object(runner.recovery.FullPrivateEngineVault,'load',return_value=v),mock.patch.object(runner.recovery_resume,expected,return_value=({}, {}, {})),mock.patch.object(runner.compiler,'helper_source',return_value=b'changed synthetic helper') as compile_helper,mock.patch.object(runner.shared.snapshot,'load_common') as common:
    with self.assertRaises(RuntimeError):runner.main(argv+[mode,v['transactionId'],'--hosted-runtime-bounds'])
    self.assertIs(compile_helper.call_args.kwargs['hosted_runtime_bounds'],True);common.assert_not_called()

 def test_new_modes_cannot_add_interruption_or_preparation_stop(self):
  for mode in ('--resume-prepared-engine-recovery','--resume-first-rollback-recovery'):
   for flag in ('--interrupt-engine','--interrupt-original','--stop-after-preparation'):
    with self.subTest(mode=mode,flag=flag),self.case() as (v,path,argv),mock.patch.object(runner.shared.snapshot,'load_common') as common:
     with self.assertRaises(ValueError):runner.main(argv+[mode,v['transactionId'],flag])
     common.assert_not_called();self.assertFalse(path.exists())

 def test_new_gate_module_is_fingerprinted_and_wrapper_routes_both_explicit_modes(self):
  hashes=runner.fingerprints();self.assertEqual(hashes['tools/full_private_engine_continuations.py'],backup.sha((ROOT/'tools/full_private_engine_continuations.py').read_bytes()))
  text=(ROOT/'tools/rehearse-staging-full-private-engine.ps1').read_text()
  for name in ('--resume-prepared-engine-recovery','--resume-first-rollback-recovery'):
   self.assertLess(text.index("-notcontains '"+name+"'"),text.index('Import-Clixml'))

if __name__=='__main__':unittest.main()
