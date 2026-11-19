"""Retained partial bytes must survive interruption without claiming recovery."""
from pathlib import Path
from unittest import mock
import copy
import hashlib
import json
import tempfile
import unittest
import zipfile
import subprocess

from tools import private_termination_checkpoint as checkpoint
from tools import private_termination_fixture_support as support


class PartialCheckpointTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='ktk-production-state-fixture-')
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name).resolve()
        self.destination = self.root / 'out/partial.checkpoint.zip'
        self.destination.parent.mkdir()
        self.report = {'steps': [], 'phase': 'synthetic-returned', 'fullActualHelperRecoveryComplete': False,
                       'fullHostTransactionAcceptance': False, 'sourceHashes': {'synthetic': 'a' * 64}}

    def reply(self, number):
        row = {'kind': 'new-helper', 'action': 'inspect-fenced', 'number': number,
               **support.retain_helper_reply(self.root, number, json.dumps({'synthetic': number, 'privateWrites': 0}))}
        p = self.root / f'local-diagnostic-call-{number:05d}.zip'
        raw = b'synthetic diagnostic bytes\n'
        with zipfile.ZipFile(p, 'x') as z:
            z.writestr('checkpoints.jsonl', raw)
        row['diagnosticStream'] = {'archive': p.name, 'archiveSHA256': support.digest(p),
                                   'rawBytes': len(raw), 'rawSHA256': hashlib.sha256(raw).hexdigest()}
        self.report['steps'].append(row)
        return row

    def test_closed_checkpoint_keeps_all_raw_replies_streams_and_unknown_active_call(self):
        self.reply(4)
        first = checkpoint.retain(self.root, self.destination, self.report)
        self.reply(7)
        self.report['activeCall'] = {'number': 8, 'action': 'cleanup-payload'}
        second = checkpoint.retain(self.root, self.destination, self.report, first)
        with zipfile.ZipFile(self.destination) as z:
            self.assertIsNone(z.testzip())
            manifest = json.loads(z.read('checkpoint-manifest.json'))
            self.assertEqual(manifest['observedHelperCalls'], [4, 7])
            self.assertEqual(manifest['unfinishedCall'], self.report['activeCall'])
            self.assertFalse(manifest['fullRecoveryAccepted'])
            self.assertFalse(manifest['hostingAccepted'])
            self.assertEqual(json.loads(z.read('checkpoint-report.json')), self.report)
            for number in [4, 7]:
                name = f'observed-replies/reply-{number:05d}.json'
                self.assertEqual(z.read(name), (self.root / name).read_bytes())
        self.assertEqual(second['observedHelperCalls'], 2)
        self.assertFalse(list(self.destination.parent.glob('*.pending')))

    def test_wrong_reply_hash_path_or_stream_preserves_previous_archive(self):
        row = self.reply(4)
        previous = checkpoint.retain(self.root, self.destination, self.report)
        saved = self.destination.read_bytes()
        for update in [{'replySHA256': 'b' * 64}, {'replyRelativePath': '../unowned'},
                       {'diagnosticStream': {**row['diagnosticStream'], 'archive': '../unowned.zip'}},
                       {'diagnosticStream': {**row['diagnosticStream'], 'rawSHA256': 'b' * 64}}]:
            altered = copy.deepcopy(self.report)
            altered['steps'][0].update(update)
            with self.assertRaises(support.FixtureRefusal):
                checkpoint.retain(self.root, self.destination, altered, previous)
            self.assertEqual(self.destination.read_bytes(), saved)

    def test_interruption_before_atomic_replace_preserves_last_closed_checkpoint(self):
        self.reply(4)
        previous = checkpoint.retain(self.root, self.destination, self.report)
        saved = self.destination.read_bytes()
        self.reply(7)
        with mock.patch.object(checkpoint.os, 'replace', side_effect=InterruptedError('synthetic interruption')):
            with self.assertRaises(InterruptedError):
                checkpoint.retain(self.root, self.destination, self.report, previous)
        self.assertEqual(self.destination.read_bytes(), saved)
        self.assertFalse(list(self.destination.parent.glob('*.pending')))

    def test_unowned_or_changed_destination_and_false_completion_refuse(self):
        self.reply(4)
        previous = checkpoint.retain(self.root, self.destination, self.report)
        saved = self.destination.read_bytes()
        with self.assertRaises(support.FixtureRefusal):
            checkpoint.retain(self.root, self.destination, self.report)
        for field in ['fullHostTransactionAcceptance', 'fullActualHelperRecoveryComplete']:
            with self.assertRaises(support.FixtureRefusal):
                checkpoint.retain(self.root, self.destination, {**self.report, field: True}, previous)
        self.assertEqual(self.destination.read_bytes(), saved)
        self.destination.write_bytes(b'unowned changed bytes')
        with self.assertRaises(support.FixtureRefusal):
            checkpoint.retain(self.root, self.destination, self.report, previous)
        self.assertEqual(self.destination.read_bytes(), b'unowned changed bytes')

    def test_timeout_stream_is_kept_without_inventing_a_raw_reply(self):
        row = self.reply(4)
        for key in ['replyRelativePath', 'replyBytes', 'replySHA256']:
            row.pop(key)
        with self.assertRaises(support.FixtureRefusal):
            checkpoint.retain(self.root, self.destination, self.report)
        row['observationTimedOut'] = True
        checkpoint.retain(self.root, self.destination, self.report)
        with zipfile.ZipFile(self.destination) as z:
            self.assertNotIn('observed-replies/reply-00004.json', z.namelist())
            self.assertIn('diagnostics/local-diagnostic-call-00004.zip', z.namelist())

    def test_report_paths_refuses_an_existing_checkpoint_before_creating_a_fixture(self):
        argument = 'docs/seo/private-engine-early-termination-2026-11-17/actual-inventory-checkpoint.json'
        destination, _ = support.report_paths(self.root, argument)
        partial = destination.with_suffix('.checkpoint.zip')
        partial.write_bytes(b'old retained checkpoint')
        with self.assertRaises(support.FixtureRefusal):
            support.report_paths(self.root, argument)
        self.assertEqual(partial.read_bytes(), b'old retained checkpoint')

    def test_actual_native_helper_raw_stdout_survives_closed_partial_archive(self):
        from tools.tests import test_private_engine_termination_helper as native
        helper = native.PrivateEngineTerminationHelperTests('runTest')
        helper.setUp()
        self.addCleanup(helper.doCleanups)
        helper.configure(prepared=True)
        packet = helper.inspection_packet()
        original_run = subprocess.run
        observed = []

        def recording(*args, **kwargs):
            result = original_run(*args, **kwargs)
            if args and args[0][0] == native.OLD.PHP:
                observed.append(result.stdout)
            return result

        with mock.patch.object(subprocess, 'run', side_effect=recording):
            result = helper.invoke(packet)
        self.assertEqual(len(observed), 1)
        self.assertEqual(result['status'], 200)
        raw = observed[0]
        self.assertIsInstance(raw, str)
        self.assertEqual(json.loads(raw), result)
        root = helper.case.root
        destination = self.destination.parent / 'native.checkpoint.zip'
        report = {**self.report, 'steps': [{'number': 1, 'kind': 'new-helper', 'action': 'inspect',
                   **support.retain_helper_reply(root, 1, raw)}]}
        checkpoint.retain(root, destination, report)
        with zipfile.ZipFile(destination) as z:
            self.assertEqual(z.read('observed-replies/reply-00001.json'), raw.encode('utf-8'))
            self.assertFalse(json.loads(z.read('checkpoint-manifest.json'))['fullRecoveryAccepted'])


if __name__ == '__main__':
    unittest.main()
