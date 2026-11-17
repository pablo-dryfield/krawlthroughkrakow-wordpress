"""Coordinator fault tests use a modeled API/FTP; no credentials or hosting."""
import argparse
import copy
import importlib.util
import json
import tempfile
import time
import unittest
from email.message import Message
from pathlib import Path
from unittest.mock import patch

from tools.tests.test_svg_pilot_core import FTP

spec = importlib.util.spec_from_file_location('svg_pilot_runner', Path(__file__).resolve().parents[1] / 'svg-pilot-runner.py')
runner = importlib.util.module_from_spec(spec); spec.loader.exec_module(runner)


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='ktk-svg-pilot-contract-')
        self.addCleanup(self.temporary.cleanup)
        self.evidence = Path(self.temporary.name)
        self.addCleanup(patch.stopall)
        patch.object(runner, 'EVIDENCE', self.evidence).start()
        now = int(time.time()) - 1
        hashes = {p: runner.core.sha((runner.ROOT / p).read_bytes()) for p in runner.SOURCES}
        self.plan, self.files = runner.core.make_plan('ca' * 16, 'no-store', now, '1' * 40, '2' * 40, hashes)
        self.directory = self.evidence / ('pilot-' + self.plan['token']); self.directory.mkdir()
        runner.write_new(self.directory / 'plan.json', self.plan)
        self.pilot = runner.Pilot(self.directory)
        self.approval = {'schemaVersion': 1, 'planId': self.plan['planId'], 'approvedBy': 'Modeled fixture only', 'approvedAt': now, 'expiresAt': now + 300, 'exactTwoPathRule': True, 'ownNamespaceFiles': True, 'ownPrefixPurge': True, 'exclusiveAccountWindow': True, 'allowEntrypointCreation': True, 'retainCreatedEmptyEntrypoint': True}
        runner.write_new(self.directory / 'approval.json', self.approval)

    def bound(self, **other):
        return {**{k: self.plan[k] for k in ['schemaVersion', 'planId', 'token', 'mode', 'sourceCommit', 'sourceTree']}, **other}

    def ftp(self):
        ftp = FTP(); ftp.close = lambda: None
        return ftp

    def test_journal_retains_write_ahead_chain_and_refuses_overwrite_or_tamper(self):
        event = self.pilot.journal.append({'kind': 'intent', 'notExecutedEvidence': True})
        self.assertEqual(event['previous'], None)
        self.pilot.journal.append({'kind': 'result'})
        self.assertEqual(runner.Journal(self.directory).events[1]['previous'], event['sha256'])
        with self.assertRaises(FileExistsError): runner.write_new(self.directory / 'event-000001.json', {})
        path = self.directory / 'event-000001.json'; value = json.loads(path.read_text()); value['data']['kind'] = 'forged'; path.write_text(json.dumps(value))
        with self.assertRaisesRegex(ValueError, 'chain'): runner.Journal(self.directory)

    def test_partial_or_missing_journal_event_blocks_recovery(self):
        (self.directory / 'event-000002.json').write_text('{')
        with self.assertRaises(ValueError): runner.Journal(self.directory)

    def test_current_ci_failure_or_missing_edge_proof_never_opens_ftp(self):
        with patch.object(runner, 'verify_source'), patch.object(runner.core, 'verify_ci', side_effect=ValueError('audit failed')):
            with self.assertRaisesRegex(ValueError, 'audit'):
                self.pilot.hosting('upload', lambda: self.fail('must not connect'), 7, 'not-used')
        with patch.object(runner, 'verify_source'), patch.object(runner.core, 'verify_ci', return_value={}):
            with self.assertRaisesRegex(ValueError, 'evidence'):
                self.pilot.hosting('upload', lambda: self.fail('must not connect'), 7, 'not-used')

    def test_failed_preflight_wrapper_does_not_read_dpapi(self):
        # Execute the real Windows wrapper against an invalid owned path, with
        # Import-Clixml shadowed by a sentinel. Never access the actual secret.
        import os
        import subprocess
        if os.name != 'nt':
            # The platform-neutral assertion still verifies ordering on Linux.
            text = (runner.ROOT / 'tools/svg-pilot-runner.ps1').read_text()
            self.assertLess(text.index('preflight-'), text.index('Import-Clixml'))
            return
        command = "function Import-Clixml { throw 'DPAPI_SENTINEL_MUST_NOT_RUN' }; & './tools/svg-pilot-runner.ps1' upload --directory 'docs/seo/svg-pilot-runner-2026-11-18/pilot-invalid'"
        run = subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-Command', command], cwd=runner.ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        self.assertNotEqual(run.returncode, 0)
        self.assertNotIn(b'DPAPI_SENTINEL_MUST_NOT_RUN', run.stdout + run.stderr)
        self.assertIn(b'failed', run.stdout)

    def test_restart_reconstructs_only_written_intents_and_cleans_exact_payload(self):
        ftp = self.ftp(); namespace = self.pilot.namespace(ftp)
        namespace.create(); namespace.upload_all()
        before = dict(ftp.files)
        restarted = runner.Pilot(self.directory)
        result = restarted.hosting('cleanup', lambda: ftp)
        self.assertTrue(result['cleanupVerified'])
        self.assertFalse(any(p.startswith(namespace.directory + '/') for p in ftp.files))
        self.assertTrue(all(ftp.files[p] == before[p] for p in ftp.files))
        self.assertEqual(restarted.latest('namespace-proof')['value']['state'], 'namespace-absence-verified')

    def assert_restart_preserves(self, unknown):
        ftp = self.ftp(); namespace = self.pilot.namespace(ftp)
        namespace.create(); namespace.upload('regular.br')
        path = namespace.directory + ('/foreign.txt' if unknown else '/regular.br')
        ftp.files[path] = b'Foreign bytes, preserve'
        count = len(ftp.writes)
        with self.assertRaises(RuntimeError): runner.Pilot(self.directory).hosting('cleanup', lambda: ftp)
        self.assertEqual(ftp.files[path], b'Foreign bytes, preserve'); self.assertEqual(len(ftp.writes), count)

    def test_restart_preserves_unknown_members(self): self.assert_restart_preserves(True)

    def test_restart_preserves_changed_members(self): self.assert_restart_preserves(False)

    def test_modeled_full_upload_and_independent_restart_cleanup(self):
        ftp = self.ftp()
        self.pilot.journal.append({'kind': 'edge-result', 'action': 'verify', 'value': self.bound(state='edge-lease-verified', safeToPublish=True, verifiedAt=int(time.time()))})
        preflight = {'parentConfigSHA256': runner.core.sha(ftp.files[runner.core.PARENT + '/.htaccess'])}
        with patch.object(self.pilot, 'preflight', return_value=preflight):
            result = self.pilot.hosting('upload', lambda: ftp)
        self.assertEqual(result['state'], 'all-ten-payloads-verified')
        self.assertEqual([p for action, p in ftp.writes if action == 'rename'][-1].rsplit('/', 1)[-1], '.htaccess')
        self.assertTrue(runner.Pilot(self.directory).hosting('cleanup', lambda: ftp)['cleanupVerified'])

    def test_partial_upload_failure_cleans_only_its_registered_prefix(self):
        ftp = self.ftp(); ftp.partial_upload = True
        self.pilot.journal.append({'kind': 'edge-result', 'action': 'verify', 'value': self.bound(state='edge-lease-verified', safeToPublish=True, verifiedAt=int(time.time()))})
        preflight = {'parentConfigSHA256': runner.core.sha(ftp.files[runner.core.PARENT + '/.htaccess'])}
        with patch.object(self.pilot, 'preflight', return_value=preflight), self.assertRaises(ConnectionResetError): self.pilot.hosting('upload', lambda: ftp)
        self.assertEqual(self.pilot.latest('namespace-proof')['value']['state'], 'namespace-absence-verified')
        self.assertFalse(any('ktk-svg-encoding-probe-' in p for p in ftp.files))

    def test_unverified_mkdir_is_not_adopted_after_process_loss(self):
        ftp = self.ftp(); namespace = self.pilot.namespace(ftp)
        self.pilot.journal.append({'kind': 'ftp-event', 'action': 'mkdir-attempt', 'path': namespace.directory, 'protectedBaseline': namespace.protected(), 'namespaceAbsentBefore': True})
        ftp.dirs.add(namespace.directory)
        with self.assertRaisesRegex(ValueError, 'Uncertain'): self.pilot.hosting('cleanup', lambda: ftp)
        self.assertIn(namespace.directory, ftp.dirs); self.assertFalse(ftp.writes)

    def test_cleanup_is_allowed_after_expiry_without_ci_but_checks_source_and_protected_bytes(self):
        ftp = self.ftp(); namespace = self.pilot.namespace(ftp); namespace.create(); namespace.upload('regular.br')
        with patch.object(runner.time, 'time', return_value=self.plan['expiresAt'] + 100), patch.object(runner.core, 'verify_ci', side_effect=AssertionError('not a cleanup prerequisite')):
            self.assertTrue(runner.Pilot(self.directory).hosting('cleanup', lambda: ftp)['cleanupVerified'])

    def test_edge_request_is_saved_before_execution_and_acquisition_cannot_repeat(self):
        with patch.object(runner, 'verify_source'), patch.object(self.pilot, 'ci', return_value={}):
            request = self.pilot.edge_request('inspect')
            self.assertFalse(request['executed'])
            self.pilot.edge_result(request['requestId'], self.bound(state='inspected', before=None))
            request = self.pilot.edge_request('acquire', 7)
            code = runner.read_json(request['requestFile'])['code']
            self.assertIn('cloudflare.request(args)', code); self.assertNotIn('KTK_FTP_PASSWORD', code)
            with self.assertRaises(ValueError): self.pilot.edge_request('acquire', 7)
            self.assertEqual(sum(e.get('action') == 'acquire' for e in self.pilot.journal.data()), 1)

    def test_wrong_plan_and_duplicate_edge_result_are_refused(self):
        with patch.object(runner, 'verify_source'):
            request = self.pilot.edge_request('inspect')
            with self.assertRaises(ValueError): self.pilot.edge_result(request['requestId'], self.bound(token='cb' * 16))
            self.pilot.edge_result(request['requestId'], self.bound(state='inspected', before=None))
            with self.assertRaises(ValueError): self.pilot.edge_result(request['requestId'], self.bound(state='inspected', before=None))

    def test_rejected_actual_transport_response_is_retained_before_validation(self):
        self.pilot.proof('all-ten-payloads-verified')
        self.pilot.journal.append({'kind': 'edge-result', 'action': 'verify', 'value': self.bound(state='edge-lease-verified', safeToPublish=True, verifiedAt=int(time.time()))})
        self.pilot.journal.append({'kind': 'edge-result', 'action': 'purge', 'value': self.bound(state='owned-prefix-purge-accepted-not-cache-proof')})
        with patch.object(runner, 'verify_source'), patch.object(runner.http, 'request', side_effect=lambda url, method, headers: {'url': url, 'status': 503, 'headers': Message(), 'body': b'Failed origin'}):
            with self.assertRaises(ValueError): self.pilot.observe()
        row = self.pilot.latest('http-raw-observation')['value']
        self.assertEqual(row['status'], 503); self.assertEqual(row['wireSHA256'], runner.core.sha(b'Failed origin'))
        with self.assertRaises(ValueError): self.pilot.latest('http-complete')

    def test_public_prerequisite_cannot_be_an_unbound_or_same_nonce_claim(self):
        now = int(time.time()) - 1
        plan, _ = runner.core.make_plan('cb' * 16, 'public', now, self.plan['sourceCommit'], self.plan['sourceTree'], self.plan['sourceHashes'])
        directory = self.evidence / ('pilot-' + plan['token']); directory.mkdir(); runner.write_new(directory / 'plan.json', plan)
        approval = {**self.approval, 'planId': plan['planId'], 'approvedAt': now, 'expiresAt': now + 300}; runner.write_new(directory / 'approval.json', approval)
        pilot = runner.Pilot(directory)
        pilot.journal.append({'kind': 'edge-result', 'action': 'verify', 'value': {**self.bound(state='edge-lease-verified', safeToPublish=True, verifiedAt=int(time.time())), 'planId': plan['planId'], 'token': plan['token'], 'mode': 'public'}})
        forged = {'planId': '0' * 64, 'token': plan['token'], 'sourceCommit': plan['sourceCommit'], 'mode': 'no-store', 'cleanupVerified': True, 'allStrictHTTPChecksPassed': True, 'completedAt': now}
        runner.write_new(self.directory / 'completed.json', forged)
        runner.write_new(directory / 'no-store-prerequisite.json', {'path': str(self.directory / 'completed.json'), 'value': forged, 'sha256': runner.core.sha(runner.core.canonical(forged))})
        fake = argparse.Namespace(validate_capability=lambda _: {'parentConfigBeforeSha256': 'a' * 64})
        with patch.object(runner, 'verify_source'), patch.object(pilot, 'ci'), patch.object(runner, 'load', return_value=fake):
            with self.assertRaisesRegex(ValueError, 'receipt changed'): pilot.preflight('upload', 7, 'modeled')

    def test_finalize_requires_post_cleanup_purge_and_actual_public_absence(self):
        self.pilot.journal.append({'kind': 'http-complete', 'value': {'allStrictHTTPChecksPassed': True}})
        self.pilot.journal.append({'kind': 'edge-result', 'action': 'purge', 'value': self.bound(state='owned-prefix-purge-accepted-not-cache-proof')})
        self.pilot.proof('namespace-absence-verified')
        self.pilot.journal.append({'kind': 'edge-result', 'action': 'release', 'value': self.bound(ownRuleAbsent=True, foreignRulesUnchanged=True, createdEmptyEntrypointRetained=True)})
        with self.assertRaisesRegex(ValueError, 'Post-cleanup'): self.pilot.finalize(lambda *args: self.fail('no request yet'))
        self.pilot.journal.append({'kind': 'edge-result', 'action': 'purge', 'value': self.bound(state='owned-prefix-purge-accepted-not-cache-proof')})
        fields = Message()
        result = self.pilot.finalize(lambda url, method, headers: {'url': url, 'status': 404, 'body': b'', 'headers': fields})
        self.assertTrue(result['cleanupVerified']); self.assertTrue(result['createdEmptyEntrypointRetained'])
        self.assertFalse(result['accountRestoredToAbsent']); self.assertFalse(result['speedGainEstablished'])

    def test_local_coordinator_lock_excludes_another_process_context(self):
        with runner.operation_lock(self.directory):
            with self.assertRaises(OSError):
                with runner.operation_lock(self.directory): self.fail('second writer acquired lock')


if __name__ == '__main__': unittest.main()
