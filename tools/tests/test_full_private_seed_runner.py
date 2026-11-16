import contextlib,importlib.util,io,json,tempfile,unittest
from pathlib import Path
from unittest import mock
from tools import content_update_staging_packet as old
from tools import content_update_backup as backup

ROOT=Path(__file__).resolve().parents[2];SPEC=importlib.util.spec_from_file_location('ktk_full_seed_runner_test',ROOT/'tools/rehearse-staging-full-seeds.py');runner=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(runner)

class FullSeedRunnerTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix='full-runner-',dir=ROOT/'docs/seo');self.addCleanup(self.tmp.cleanup);self.report=Path(self.tmp.name)/'report.json';source=old.seeds()['source'];self.owned={n:backup.sha(b) for n,b in source.items()};self.sizes={n:len(b) for n,b in source.items()};self.hashes={'tools/rehearse-staging-full-seeds.py':'e'*64};self.args=['--application-commit','c'*40,'--tooling-commit','d'*40,'--report',str(self.report)]
 def run_main(self,args):
  with contextlib.redirect_stdout(io.StringIO()):runner.main(args)
 def test_default_offline_never_connects_compiles_captures_or_opens_recovery_vault(self):
  with mock.patch.object(runner,'reviewed_source',return_value=(self.owned,self.sizes,self.hashes)),mock.patch.object(runner.shared.snapshot,'load_common',side_effect=AssertionError('offline must not load connection')),mock.patch.object(runner.full,'helper_source',side_effect=AssertionError('offline must not compile')),mock.patch.object(runner.recovery,'FullSeedPacketVault',side_effect=AssertionError('offline must not load vault')):
   self.run_main(self.args)
  report=json.loads(self.report.read_bytes());self.assertEqual(report['phase'],'offline-validated');self.assertEqual(report['publicOwnedFiles'],7);self.assertEqual(report['productionOperations'],0);self.assertFalse(report['fullHostTransactionAcceptance'])
 def test_wrong_reviewed_source_stops_before_any_connection_or_packet_write(self):
  with mock.patch.object(runner,'reviewed_source',side_effect=ValueError('wrong source')),mock.patch.object(runner.shared.snapshot,'load_common',side_effect=AssertionError('must stop before connection')):
   with self.assertRaises(ValueError):self.run_main(self.args+['--rehearse-staging'])
  self.assertFalse(self.report.exists())
 def test_packet_encryption_failure_prevents_full_copy_helper_installation(self):
  connection=mock.Mock();connection.statistics.return_value={'connectionsOpened':0,'automaticRetries':0};common=mock.Mock()
  with mock.patch.object(runner,'reviewed_source',return_value=(self.owned,self.sizes,self.hashes)),mock.patch.object(runner.shared.snapshot,'load_common',return_value=common),mock.patch.object(runner,'BoundedStagingFTPS',return_value=connection),mock.patch.object(runner,'unchanged'),mock.patch.object(runner.shared,'capture',return_value={'protectedStateSha256':'f'*64}),mock.patch.object(runner.full,'helper_source',return_value=b'compiled private helper'),mock.patch.object(runner.recovery,'FullSeedPacketVault') as vault,mock.patch.object(runner.shared,'HelperLease',side_effect=AssertionError('no helper before encrypted persistence')):
   vault.return_value.save.side_effect=ValueError('DPAPI failed')
   with self.assertRaises(RuntimeError):self.run_main(self.args+['--rehearse-staging'])
  report=json.loads(self.report.read_bytes());self.assertEqual(report['phase'],'failed-preserve-packet-archive-and-private-state');self.assertNotIn('encryptedRecoveryPacket',report);connection.close.assert_called_once()
 def test_bad_resume_packet_stops_before_compilation_or_helper_installation(self):
  connection=mock.Mock();connection.statistics.return_value={'connectionsOpened':0};common=mock.Mock()
  with mock.patch.object(runner,'reviewed_source',return_value=(self.owned,self.sizes,self.hashes)),mock.patch.object(runner.shared.snapshot,'load_common',return_value=common),mock.patch.object(runner,'BoundedStagingFTPS',return_value=connection),mock.patch.object(runner.recovery,'FullSeedPacketVault') as vault,mock.patch.object(runner.full,'helper_source',side_effect=AssertionError('bad packet must not compile')):
   vault.return_value.load.side_effect=ValueError('invalid encrypted packet')
   with self.assertRaises(RuntimeError):self.run_main(self.args+['--resume','e'*32])
  report=json.loads(self.report.read_bytes());self.assertEqual(report['phase'],'failed-preserve-packet-archive-and-private-state');connection.close.assert_called_once()
 def test_invalid_abandon_parameters_make_no_source_read_or_report(self):
  for extra in [['--abandon'],['--resume','bad'],['--resume','e'*32,'--interrupt-original'],['--abandoned-state','f'*64],['--resume','e'*32,'--abandon','--abandoned-state','bad']]:
   with mock.patch.object(runner,'reviewed_source',side_effect=AssertionError('invalid arguments must stop early')):
    with self.assertRaises(ValueError):self.run_main(self.args+extra)
  self.assertFalse(self.report.exists())

if __name__=='__main__':unittest.main()
