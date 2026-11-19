"""Small real-PHP diagnostic seams; not full inventory or hosted acceptance."""
from pathlib import Path
import copy
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from unittest import mock

from tools import private_termination_diagnostics as diagnostics


def fixture_source():
    root = diagnostics.ROOT / 'tools'
    parts = [b'<?php\n', b"define('ABSPATH',__DIR__);define('KTK_PRIVATE_ENGINE_PAYLOAD_CLEANUP_ALLOWED',true);define('KTK_PRIVATE_ENGINE_TERMINATION_ALLOWED',true);function add_action($hook,$callback,$priority){}\n"]
    for name in ('private-engine-payload-cleanup.php', 'private-engine-termination.php', 'private-engine-termination-staging-template.php'):
        raw = (root / name).read_bytes()
        if not raw.startswith(b'<?php\n'): raise AssertionError('Exact original PHP opening required')
        parts.append(raw[6:])
    return b'\n'.join(parts)


class PrivateTerminationDiagnosticTests(unittest.TestCase):
    def php(self, body):
        php = shutil.which('php')
        if not php: self.fail('Real PHP required; do not skip diagnostic contracts')
        with tempfile.TemporaryDirectory(prefix='ktk-local-diagnostic-unit-') as folder:
            path = Path(folder) / 'diagnostic-fixture.php'; path.write_bytes(body)
            lint = subprocess.run([php, '-l', str(path)], capture_output=True, timeout=15)
            self.assertEqual(lint.returncode, 0, lint.stderr.decode(errors='replace'))
            run = subprocess.run([php, str(path)], capture_output=True, timeout=15)
            self.assertEqual(run.returncode, 0, run.stderr.decode(errors='replace'))
            self.assertFalse(run.stderr)
            return json.loads(run.stdout)

    def test_actual_frozen_components_have_a_complete_exact_instrumentation_inverse(self):
        source = fixture_source(); changed, receipt = diagnostics.instrument(source)
        self.assertNotEqual(source, changed)
        self.assertEqual(diagnostics.restore(changed), source)
        self.assertTrue(receipt['exactInverseVerified'])
        self.assertEqual(receipt['unmodifiedFixtureSHA256'], diagnostics.sha(source))
        self.assertEqual(receipt['instrumentedFixtureSHA256'], diagnostics.sha(changed))
        # Every original control-flow call remains inside its timer wrapper.
        for anchor in (b'$reader->inspect($store)', b'$this->claim($store)', b"hash_update_stream($hash,$h,$row['bytes']+1)"):
            self.assertEqual(source.count(anchor), changed.count(anchor))

    def test_late_missing_duplicate_or_changed_anchor_cannot_produce_a_partial_helper(self):
        source = fixture_source()
        for old, new in [(b'}catch(Throwable $error){restore_error_handler();wp_send_json(', b'}catch(Throwable $changed){restore_error_handler();wp_send_json('), (b'$reader->inspect($store)', b'$reader->inspect($changed)')]:
            changed = source.replace(old, new, 1)
            with self.assertRaises(ValueError): diagnostics.instrument(changed)
            self.assertNotIn(diagnostics.MARKER, changed)
        with self.assertRaises(ValueError): diagnostics.instrument(source + source)
        instrumented, _ = diagnostics.instrument(source)
        with self.assertRaises(ValueError): diagnostics.instrument(instrumented)
        with self.assertRaises(ValueError): diagnostics.restore(instrumented.replace(b'public-capture', b'changed-capture', 1))

    def test_real_php_preserves_return_value_and_counts_inclusive_spans_and_events(self):
        source, _ = diagnostics.instrument(fixture_source())
        result = self.php(source + b"\n$value=ktk_fixture_diag_span('public-capture',static function(){usleep(1000);return array('unchanged'=>17);});ktk_fixture_diag_event('before-private-payload-delete','NEVER_EXPORT_NAME','NEVER_EXPORT_PATH');ktk_fixture_diag_event('after-private-payload-delete','NEVER_EXPORT_NAME','NEVER_EXPORT_PATH');echo json_encode(array('value'=>$value,'diagnostics'=>ktk_fixture_diag_report()),JSON_THROW_ON_ERROR);")
        self.assertEqual(result['value'], {'unchanged': 17})
        value = diagnostics.validate(result['diagnostics'])
        self.assertEqual(value['spans']['public-capture']['count'], 1)
        self.assertEqual(value['spans']['public-capture']['failures'], 0)
        self.assertGreater(value['spans']['public-capture']['totalNs'], 0)
        self.assertEqual(value['events']['after-private-payload-delete']['count'], 1)
        self.assertNotIn('NEVER_EXPORT', json.dumps(value))

    def test_real_php_rethrows_the_same_error_and_keeps_generic_response_and_safe_failure(self):
        source, _ = diagnostics.instrument(fixture_source())
        tail = b"\n$original=new RuntimeException('Current bounded cleanup lifetime ended; preserve consumed context');try{ktk_fixture_diag_span('cleanup-claim',static function()use($original){throw $original;});}catch(Throwable $error){$same=$error===$original;ktk_fixture_diag_failure($error);$wire=json_encode(array('error'=>'private_termination_operation_failed'));}echo json_encode(array('same'=>$same,'wire'=>$wire,'diagnostics'=>ktk_fixture_diag_report()),JSON_THROW_ON_ERROR);"
        result = self.php(source + tail)
        self.assertTrue(result['same']); self.assertEqual(result['wire'], '{"error":"private_termination_operation_failed"}')
        value = diagnostics.validate(result['diagnostics'])
        self.assertEqual(value['failure']['reason'], 'cleanup-lifetime')
        self.assertEqual(value['spans']['cleanup-claim']['failures'], 1)
        self.assertNotIn('preserve consumed context', json.dumps(value))

    def test_real_php_unknown_error_arguments_and_paths_never_appear_in_diagnostics(self):
        source, _ = diagnostics.instrument(fixture_source())
        tail = b"\nfunction fixture_secret_argument($secret){throw new RuntimeException($secret);}try{ktk_fixture_diag_span('payload-hash',static fn()=>fixture_secret_argument('NEVER_EXPORT_PRIVATE_DB_TOKEN_VALUE'));}catch(Throwable $error){ktk_fixture_diag_failure($error);}echo json_encode(ktk_fixture_diag_report(),JSON_THROW_ON_ERROR);"
        value = diagnostics.validate(self.php(source + tail))
        self.assertEqual(value['failure']['reason'], 'unclassified')
        self.assertNotIn('NEVER_EXPORT', json.dumps(value))
        self.assertNotIn('diagnostic-fixture.php', json.dumps(value))

    def test_event_samples_stay_bounded_and_original_payload_names_are_discarded(self):
        source, _ = diagnostics.instrument(fixture_source())
        tail = b"\nfor($i=0;$i<1000;$i++){ktk_fixture_diag_event('before-private-payload-directory','PRIVATE_FILENAME','PRIVATE_PATH');}echo json_encode(ktk_fixture_diag_report(),JSON_THROW_ON_ERROR);"
        value = diagnostics.validate(self.php(source + tail))
        self.assertEqual(len(value['firstEvents']), 16); self.assertEqual(len(value['lastEvents']), 32)
        self.assertEqual(value['events']['before-private-payload-directory']['count'], 1000)

    def test_anonymous_exception_class_cannot_export_its_generated_filename(self):
        source, _ = diagnostics.instrument(fixture_source())
        value = diagnostics.validate(self.php(source + b"\ntry{throw new class('NEVER_EXPORT_PRIVATE') extends RuntimeException{};}catch(Throwable $error){ktk_fixture_diag_failure($error);}echo json_encode(ktk_fixture_diag_report(),JSON_THROW_ON_ERROR);"))
        self.assertEqual(value['failure']['class'], 'UnclassifiedThrowable')
        self.assertNotIn('diagnostic-fixture.php', json.dumps(value)); self.assertNotIn('NEVER_EXPORT_PRIVATE', json.dumps(value))

    def test_reader_refuses_unqualified_raw_exceptions_trace_arguments_and_fake_timings(self):
        source, _ = diagnostics.instrument(fixture_source())
        value = self.php(source + b"\necho json_encode(ktk_fixture_diag_report(),JSON_THROW_ON_ERROR);")
        diagnostics.validate(value)
        for key, changed in [('rawException', 'private'), ('elapsedNs', True), ('localInstrumentedFixtureOnly', False), ('spans', {'public-capture': {'count': 1, 'totalNs': 1, 'maxNs': 1, 'failures': 0, 'arguments': ['private']}})]:
            bad = copy.deepcopy(value); bad[key] = changed
            with self.subTest(key=key), self.assertRaises(ValueError): diagnostics.validate(bad)

    def test_actual_local_observation_timeout_retains_last_checkpoint_without_success(self):
        source, _ = diagnostics.instrument(fixture_source())
        with tempfile.TemporaryDirectory(prefix='ktk-local-diagnostic-timeout-') as folder:
            root=Path(folder).resolve();path=root/'owned-diagnostic.php'
            path.write_bytes(source+b"\nktk_fixture_diag_span('public-capture',static function(){usleep(5000000);});")
            with self.assertRaises(subprocess.TimeoutExpired) as caught:
                subprocess.run([shutil.which('php'),str(path)],capture_output=True,timeout=0.4,env={**os.environ,'KTK_LOCAL_DIAGNOSTIC_STREAM':'1'})
            raw=caught.exception.stderr or b''
            result=diagnostics.retain_stream(root,1,raw,incomplete=True)
            self.assertGreater(result['records'],0)
            self.assertEqual(result['lastCheckpoint']['event'],'span-start')
            self.assertEqual(result['lastCheckpoint']['label'],'public-capture')
            self.assertIn('never grants a success',result['scope'])
            with self.assertRaises(FileExistsError):diagnostics.retain_stream(root,1,raw,incomplete=True)

    def test_checkpoint_reader_preserves_unknown_stderr_and_rejects_partial_success(self):
        row={'schemaVersion':1,'sequence':1,'atNs':1,'event':'span-start','label':'payload-hash'}
        raw=(diagnostics.STREAM+json.dumps(row)+'\n').encode()
        self.assertEqual(diagnostics.read_stream(raw)['records'],1)
        partial=raw+diagnostics.STREAM.encode()+b'{"schemaVersion":'
        with self.assertRaises(ValueError):diagnostics.read_stream(partial)
        self.assertGreater(diagnostics.read_stream(partial,incomplete=True)['truncatedTailBytes'],0)
        for bad in [b'Unrelated PHP warning\n',raw+raw,raw.replace(b'payload-hash',b'unknown-span'),raw.replace(b'"sequence": 1',b'"sequence": true')]:
            with self.assertRaises(ValueError):diagnostics.read_stream(bad)
        with tempfile.TemporaryDirectory(prefix='ktk-local-diagnostic-stderr-') as folder:
            root=Path(folder).resolve()
            with self.assertRaises(ValueError):diagnostics.retain_stream(root,2,b'Unrelated PHP warning\n')
            import zipfile
            with zipfile.ZipFile(root/'local-diagnostic-call-00002.zip') as archive:self.assertEqual(archive.read('checkpoints.jsonl'),b'Unrelated PHP warning\n')


class DiagnosticNativeHelperTests(unittest.TestCase):
    def test_actual_native_helper_keeps_inspection_state_queries_and_generic_failure_exact(self):
        from tools.tests import test_private_engine_termination_helper as native
        self.assertTrue(native.OLD.PHP, 'Real PHP required; do not skip native diagnostic proof')
        helper = native.PrivateEngineTerminationHelperTests('runTest'); helper.setUp()
        self.addCleanup(helper.doCleanups)
        helper.configure(prepared=False); packet = helper.inspection_packet()
        before = helper.invoke(packet); self.assertEqual(before['status'], 200)
        failed_before = helper.invoke(packet, dbError=True); self.assertEqual(failed_before['status'], 409)
        path = Path(helper.case.cfg['helper']); original = path.read_bytes()
        self.assertTrue(path.resolve().is_relative_to(helper.case.root.resolve()))
        instrumented, receipt = diagnostics.instrument(original)
        old = b"file_get_contents('php://input',false,null,0,2049)"; new = b"($GLOBALS['c']['terminationBody']??'')"
        self.assertEqual(diagnostics.restore(instrumented).replace(new, old, 1), helper.production_source)
        anchor = "'oldControllerClass'=>class_exists('KTK_Full_Private_Engine_Controller',false)"
        self.assertEqual(native.DRIVER.count(anchor), 1)
        driver = native.DRIVER.replace(anchor, anchor + ",'localFixtureDiagnostics'=>ktk_fixture_diag_report()", 1)
        try:
            path.write_bytes(instrumented); helper.fixture_sha = diagnostics.sha(instrumented)
            with mock.patch.object(native, 'DRIVER', driver):
                after = helper.invoke(packet); failed_after = helper.invoke(packet, dbError=True)
            self.assertEqual(after['status'], 200)
            self.assertEqual(after['body']['controller'], before['body']['controller'])
            self.assertEqual(after['queries'], before['queries'])
            self.assertEqual(after['body']['helperSha256'], receipt['instrumentedFixtureSHA256'])
            self.assertEqual(failed_after['status'], failed_before['status'])
            self.assertEqual(failed_after['wire'], failed_before['wire'])
            self.assertNotIn('private-db-diagnostic-never-export', json.dumps(failed_after['localFixtureDiagnostics']))
            value = diagnostics.validate(after['localFixtureDiagnostics'])
            self.assertGreater(value['spans']['public-capture']['count'], 0)
            self.assertEqual(value['spans']['initial-inspect']['count'], 1)
            diagnostics.validate(failed_after['localFixtureDiagnostics'])
            self.assertEqual(helper.last_private_before, helper.last_private_after)
        finally:
            path.write_bytes(original)
        self.assertEqual(diagnostics.restore(instrumented), path.read_bytes())


if __name__ == '__main__': unittest.main()
