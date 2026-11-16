import contextlib,io,json,unittest
from unittest import mock
from tools import content_update_backup as backup
from tools.tests import test_full_private_seed_runner as old
from tools.tests.test_early_private_recovery import early_packet
from tools.tests.test_full_private_seed_recovery import fixture

runner=old.runner

class EarlyPrivateRunnerTests(unittest.TestCase):
 setUp=old.FullSeedRunnerTests.setUp
 run_main=old.FullSeedRunnerTests.run_main
 def test_both_default_and_explicit_early_offline_paths_make_no_connection_compilation_or_vault_access(self):
  for profile in ('late','early'):
   args=self.args+['--entry-profile',profile]
   with mock.patch.object(runner,'reviewed_source',return_value=(self.owned,self.sizes,self.hashes)),mock.patch.object(runner.shared.snapshot,'load_common',side_effect=AssertionError('offline connection forbidden')),mock.patch.object(runner.full,'helper_source',side_effect=AssertionError('offline compiler forbidden')),mock.patch.object(runner.recovery,'FullSeedPacketVault',side_effect=AssertionError('offline vault forbidden')):self.run_main(args)
   r=json.loads(self.report.read_bytes());self.assertEqual(r['entryProfile'],profile);self.assertEqual(r['phase'],'offline-validated');self.assertFalse(r['fullHostTransactionAcceptance']);self.report.unlink()
 def test_early_prepare_binds_snapshot_compiler_and_profile_before_encryption_failure_prevents_install(self):
  connection=mock.Mock();connection.statistics.return_value={};common=mock.Mock()
  with mock.patch.object(runner,'reviewed_source',return_value=(self.owned,self.sizes,self.hashes)),mock.patch.object(runner.shared.snapshot,'load_common',return_value=common),mock.patch.object(runner,'BoundedStagingFTPS',return_value=connection),mock.patch.object(runner,'unchanged'),mock.patch.object(runner.shared,'capture',return_value={'protectedStateSha256':'f'*64}) as capture,mock.patch.object(runner.full,'helper_source',return_value=b'synthetic early helper') as compiler,mock.patch.object(runner.recovery,'FullSeedPacketVault') as vault,mock.patch.object(runner.shared,'HelperLease',side_effect=AssertionError('No helper before encryption')):
   vault.return_value.save.side_effect=RuntimeError('Synthetic unavailable DPAPI')
   with self.assertRaises(RuntimeError):self.run_main(self.args+['--rehearse-staging','--entry-profile','early'])
  packet=vault.return_value.save.call_args.args[0];self.assertEqual(packet['entryProfile'],'early');self.assertEqual(packet['scope'],'full-private-seed-early-caller-recovery');self.assertIs(capture.call_args.kwargs['source_compiler'],runner.early_entry.snapshot_source);self.assertEqual(compiler.call_args.kwargs,{'entry_profile':'early'});self.assertNotIn('encryptedRecoveryPacket',json.loads(self.report.read_bytes()));connection.close.assert_called_once()
 def test_implicit_or_mismatched_resume_profile_stops_before_compilation_or_helper_install(self):
  for value,requested in ((early_packet(),'late'),(fixture(),'early')):
   connection=mock.Mock();connection.statistics.return_value={};common=mock.Mock()
   with mock.patch.object(runner,'reviewed_source',return_value=(self.owned,self.sizes,self.hashes)),mock.patch.object(runner.shared.snapshot,'load_common',return_value=common),mock.patch.object(runner,'BoundedStagingFTPS',return_value=connection),mock.patch.object(runner.recovery,'FullSeedPacketVault') as vault,mock.patch.object(runner.full,'helper_source',side_effect=AssertionError('No mismatched compiler')),mock.patch.object(runner.shared,'HelperLease',side_effect=AssertionError('No mismatched helper')):
    vault.return_value.load.return_value=value
    with self.assertRaises(RuntimeError):self.run_main(self.args+['--resume',value['transactionId'],'--entry-profile',requested])
   self.assertEqual(json.loads(self.report.read_bytes())['failureType'],'ValueError');connection.close.assert_called_once();self.report.unlink()
 def test_explicit_matching_resume_recompiles_exact_early_helper_before_any_install(self):
  value=early_packet();compiled=b'synthetic early helper';value.update(applicationCommit='c'*40,toolingCommit='d'*40,sourceHashes=self.hashes,helperSha256=backup.sha(compiled));connection=mock.Mock();connection.statistics.return_value={};common=mock.Mock();common.common.retrieve_file.return_value=None;lease=mock.Mock();lease.removed=False
  def remove():lease.removed=True
  lease.remove.side_effect=remove;lease.install.side_effect=RuntimeError('Synthetic stop before install')
  with mock.patch.object(runner,'reviewed_source',return_value=(self.owned,self.sizes,self.hashes)),mock.patch.object(runner.shared.snapshot,'load_common',return_value=common),mock.patch.object(runner,'BoundedStagingFTPS',return_value=connection),mock.patch.object(runner.recovery,'FullSeedPacketVault') as vault,mock.patch.object(runner.full,'helper_source',return_value=compiled) as compiler,mock.patch.object(runner,'unchanged'),mock.patch.object(runner.shared,'HelperLease',return_value=lease),mock.patch.object(runner.shared.legacy,'TemporaryHelperFTP'):
   vault.return_value.load.return_value=value
   with self.assertRaises(RuntimeError):self.run_main(self.args+['--resume',value['transactionId'],'--entry-profile','early'])
  self.assertEqual(compiler.call_args.kwargs,{'entry_profile':'early'});lease.install.assert_called_once();lease.remove.assert_called_once();self.assertTrue(json.loads(self.report.read_bytes())['helperRemoved'])
 def test_unknown_entry_profile_is_refused_before_source_or_connection(self):
  with mock.patch.object(runner,'reviewed_source',side_effect=AssertionError('No source for invalid CLI')),contextlib.redirect_stderr(io.StringIO()):
   with self.assertRaises(SystemExit):self.run_main(self.args+['--entry-profile','production'])
  self.assertFalse(self.report.exists())

if __name__=='__main__':unittest.main()
