import contextlib,importlib.util,io,json,tempfile,unittest
from pathlib import Path
from unittest import mock
from tools import content_update_backup as backup
from tools import content_update_staging_packet as old

ROOT=Path(__file__).resolve().parents[2];spec=importlib.util.spec_from_file_location('ktk_entry_runner_test',ROOT/'tools/probe-staging-private-entry.py');runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)

class PrivateEntryRunnerTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix='ktk-entry-runner-',dir=ROOT/'docs/seo');self.addCleanup(self.tmp.cleanup);self.report=Path(self.tmp.name)/'report.json';source=old.seeds()['source'];self.owned={n:backup.sha(b) for n,b in source.items()};self.sizes={n:len(b) for n,b in source.items()};self.hashes={'tools/probe-staging-private-entry.py':'e'*64};self.args=['--application-commit','c'*40,'--tooling-commit','d'*40,'--report',str(self.report)]
 def run_main(self,args):
  with contextlib.redirect_stdout(io.StringIO()):runner.main(args)
 def test_default_offline_never_connects_compiles_captures_waits_or_opens_credentials(self):
  with mock.patch.object(runner.base,'reviewed_source',return_value=(self.owned,self.sizes,{})),mock.patch.object(runner,'fingerprints',return_value=self.hashes),mock.patch.object(runner.shared.snapshot,'load_common',side_effect=AssertionError('no connection')),mock.patch.object(runner.probe,'helper_source',side_effect=AssertionError('no compiler')),mock.patch.object(runner.time,'sleep',side_effect=AssertionError('no expiry wait')):self.run_main(self.args)
  r=json.loads(self.report.read_bytes());self.assertEqual(r['phase'],'offline-validated');self.assertEqual(r['publicOwnedFiles'],7);self.assertFalse(r['fullPrivateCopyVerified']);self.assertFalse(r['fullHostTransactionAcceptance'])
 def test_wrong_reviewed_source_stops_before_any_connection_or_report(self):
  with mock.patch.object(runner.base,'reviewed_source',side_effect=ValueError('wrong exact head')),mock.patch.object(runner.shared.snapshot,'load_common',side_effect=AssertionError('no connection')):
   with self.assertRaises(ValueError):self.run_main(self.args+['--probe-staging'])
  self.assertFalse(self.report.exists())
 def test_uncertain_entry_response_stops_without_retry_and_removes_exact_probe(self):
  connection=mock.Mock();connection.statistics.return_value={'connectionsOpened':0,'automaticRetries':0};common=mock.Mock();lease=mock.Mock();lease.removed=False
  def remove():lease.removed=True
  lease.remove.side_effect=remove;client=mock.Mock();client.normal.return_value={'status':200,'mime':'text/html','bytes':12,'sha256':'f'*64};client.last_request_seconds=1.25;client.last_failure={'type':'HTTPError','profile':'early','status':409,'headers':{},'responseBytes':None};client.inspect.side_effect=RuntimeError('Private diagnostic text must not enter report')
  with mock.patch.object(runner.base,'reviewed_source',return_value=(self.owned,self.sizes,{})),mock.patch.object(runner,'fingerprints',return_value=self.hashes),mock.patch.object(runner.shared.snapshot,'load_common',return_value=common),mock.patch.object(runner,'BoundedStagingFTPS',return_value=connection),mock.patch.object(runner,'unchanged'),mock.patch.object(runner.shared,'capture',return_value={'protectedStateSha256':'f'*64}),mock.patch.object(runner.probe,'helper_source',return_value=b'read-only probe'),mock.patch.object(runner.probe,'EntryProbeClient',return_value=client),mock.patch.object(runner.probe,'snapshot_metadata',return_value={}),mock.patch.object(runner.shared.snapshot,'TemporaryHelperFTP'),mock.patch.object(runner.shared,'HelperLease',return_value=lease),mock.patch.object(runner.time,'sleep',side_effect=AssertionError('no retry or expiry wait after failed response')):
   with self.assertRaises(RuntimeError):self.run_main(self.args+['--probe-staging'])
  r=json.loads(self.report.read_bytes());self.assertEqual(r['phase'],'failed-preserve-probe-and-state-evidence');self.assertEqual(r['lastRequestFailure']['status'],409);self.assertTrue(r['helperRemoved']);self.assertFalse(r['observations']);self.assertNotIn('Private diagnostic',self.report.read_text());client.inspect.assert_called_once_with('early');lease.remove.assert_called_once();connection.close.assert_called_once()

if __name__=='__main__':unittest.main()
