"""Real-PHP equivalence, bounded fallback and refusal tests for a local prototype."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

from tools import calibrate_preparation_inspection as calibration
from tools import complete_prefix_hash_profile as prototype
from tools import full_private_engine_controller as compiler
from tools import preparation_inspection_diagnostics as diagnostic
from tools import private_termination_fixture_support as support
from tools.content_update_client import UncertainRequest
from tools.tests import test_full_private_engine_preparation as native


PROBE = r'''<?php
define('KTK_CONTENT_UPDATE_STREAMING_SEEDS_ALLOWED',true);
require $argv[1];
$c=json_decode(file_get_contents($argv[2]),true,64,JSON_THROW_ON_ERROR);
if (($c['digestFailure']??false) && !function_exists('openssl_digest')) {
    function openssl_digest($bytes,$algorithm){return false;}
}
$class=new ReflectionClass('KTK_Full_Private_Engine_Streaming_Seeds');
$method=$class->getMethod($c['operation']==='buffer'?'completeBufferDigest':'prefix');
try {
    if ($c['operation']==='buffer') {
        $h=fopen($c['path'],'rb');
        $value=$method->invoke(null,$h,$c['bytes']);
        $extra=array('position'=>ftell($h),'stillOpen'=>is_resource($h));fclose($h);
    } else {
        $object=$class->newInstanceWithoutConstructor();
        $class->getProperty('files')->setValue($object,array('source/item.bin'=>array('bytes'=>$c['bytes'],'sha256'=>$c['sha256'])));
        $value=$method->invoke($object,$c['path'],'source/item.bin');$extra=array();
    }
    echo json_encode(array('ok'=>true,'value'=>$value,'extra'=>$extra,'peak'=>memory_get_peak_usage(true),'memory'=>ini_get('memory_limit')),JSON_THROW_ON_ERROR);
} catch(Throwable $error) {
    echo json_encode(array('ok'=>false,'class'=>get_class($error),'message'=>$error->getMessage()),JSON_THROW_ON_ERROR);
}
'''


class CompletePrefixPrototypeContracts(unittest.TestCase):
    def probe(self, data, *, size=None, operation='buffer', memory='256M', disable=False, failed=False, linked=False, candidate=True):
        with tempfile.TemporaryDirectory(prefix='ktk-prefix-probe-') as folder:
            root = Path(folder)
            path = root / 'item.bin'; path.write_bytes(data)
            if linked:
                os.link(path, root / 'second-link.bin')
            source = prototype.apply(compiler.stream_source()) if candidate else compiler.stream_source()
            (root / 'component.php').write_bytes(source)
            (root / 'probe.php').write_bytes(PROBE.encode())
            cfg = {'path': path.as_posix(), 'operation': operation, 'bytes': len(data) if size is None else size,
                   'sha256': hashlib.sha256(data).hexdigest(), 'digestFailure': failed}
            (root / 'config.json').write_text(json.dumps(cfg), encoding='utf-8')
            args = [native.old.PHP, '-d', 'memory_limit=' + memory]
            if disable:
                args += ['-d', 'disable_functions=openssl_digest']
            result = subprocess.run(args + [str(root / 'probe.php'), str(root / 'component.php'), str(root / 'config.json')],
                                    capture_output=True, timeout=60, check=True)
            self.assertEqual(result.stderr, b'')
            self.assertEqual(path.read_bytes(), data)
            return json.loads(result.stdout)

    def test_complete_inverse_keeps_every_old_guard_and_refuses_changed_source(self):
        source = compiler.stream_source(); candidate = prototype.apply(source)
        self.assertEqual(prototype.restore(candidate), source)
        self.assertEqual(prototype.restore_timed(prototype.timed(source)), source)
        start = source.index(b'    private function prefix(')
        end = source.index(b'    public function inspect(', start)
        self.assertEqual(candidate[:start], source[:start])
        self.assertEqual(candidate[candidate.index(b'    public function inspect('):], source[end:])
        for bad in [source + b' ', candidate, b'<?php\n', source.decode()]:
            with self.assertRaises(ValueError): prototype.apply(bad)
        with self.assertRaises(ValueError): prototype.restore(candidate + b' ')
        with self.assertRaises(ValueError): prototype.restore(candidate.replace(b'67108864', b'67108865', 1))

    def test_held_handle_empty_binary_and_multichunk_complete_sha256(self):
        for data in [b'', bytes(range(256)), bytes(range(256)) * 4097]:
            result = self.probe(data)
            self.assertTrue(result['ok'], result)
            self.assertEqual(result['value'], hashlib.sha256(data).hexdigest())
            self.assertEqual(result['extra'], {'position': len(data), 'stillOpen': True})
            self.assertEqual(result['memory'], '256M')
            self.assertLess(result['peak'], 268435456)

    def test_unsupported_memory_and_openssl_fallback_do_not_consume_handle(self):
        for options in [{'disable': True}, {'memory': '-1'}, {'memory': '16M'}, {'size': 67108865}]:
            result = self.probe(b'complete current private bytes', **options)
            self.assertTrue(result['ok'], result)
            self.assertIsNone(result['value'])
            self.assertEqual(result['extra'], {'position': 0, 'stillOpen': True})

    def test_openssl_failure_rewinds_for_original_streaming_sha256(self):
        data = bytes(range(256)) * 1025
        result = self.probe(data, disable=True, failed=True)
        self.assertTrue(result['ok'], result); self.assertIsNone(result['value'])
        self.assertEqual(result['extra'], {'position': 0, 'stillOpen': True})
        result = self.probe(data, operation='prefix', disable=True, failed=True)
        self.assertEqual(result['value'], {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})

    def test_short_and_growing_complete_handle_reads_refuse_without_repair(self):
        for size in [2, 4]:
            result = self.probe(b'abc', size=size)
            self.assertFalse(result['ok'], result)
            self.assertEqual(result['class'], 'RuntimeException')
            self.assertEqual(result['message'], 'Changed streaming prefix preserved')

    def test_complete_prefix_guard_and_bounded_streaming_fallback_match_original(self):
        data = bytes(range(256)) * 1025
        for options in [{}, {'disable': True}, {'disable': True, 'failed': True}, {'memory': '16M'}]:
            candidate = self.probe(data, operation='prefix', **options)
            original = self.probe(data, operation='prefix', candidate=False, **options)
            self.assertEqual(candidate['value'], original['value'])
        for options in [{'linked': True}, {'size': len(data) - 1}]:
            candidate = self.probe(data, operation='prefix', **options)
            original = self.probe(data, operation='prefix', candidate=False, **options)
            self.assertEqual(candidate, original)
            self.assertFalse(candidate['ok'])

    def fixture(self):
        case = native.FullPrivatePreparationIntegrationTests('runTest');case.setUp()
        self.addCleanup(case.doCleanups)
        directory = tempfile.TemporaryDirectory(prefix='ktk-prefix-observer-unit-')
        self.addCleanup(directory.cleanup)
        observer = calibration.Observer(case, Path(directory.name), lambda: None)
        timed = prototype.timed(compiler.stream_source())
        self.assertEqual(prototype.restore_timed(timed), compiler.stream_source())
        p = observer.streams['instrumented'];p.write_bytes(timed)
        observer.component_hashes[p.as_posix()] = support.digest(p)
        case.case.call = observer.call;case.client.prepare();case.original()
        return case, observer

    def test_native_whole_partial_and_complete_values_and_file_identities_equal(self):
        case, observer = self.fixture()
        public = calibration.tree_witness(Path(case.cfg['packet']['publicRoot']))
        for phase in ['source-prefix', 'complete-seeds']:
            calibration.populate(case, phase);private = calibration.tree_witness(case.private)
            values = []
            for arm in ['original', 'instrumented']:
                observer.phase = phase + '-measurement';observer.set_arm(arm)
                values.append(case.client.inspect_preparation())
                self.assertEqual(calibration.tree_witness(case.private), private)
                self.assertEqual(calibration.tree_witness(Path(case.cfg['packet']['publicRoot'])), public)
                self.assertFalse(case.engine.exists())
            self.assertEqual(values[0], values[1])

    def test_native_corrupt_partial_and_complete_seeds_refuse_without_repair(self):
        for phase in ['source-prefix', 'complete-seeds']:
            case, observer = self.fixture();construction = calibration.populate(case, 'source-prefix')
            if phase == 'complete-seeds': calibration.populate(case, phase)
            p = case.private / 'source' / construction['largest']
            with p.open('r+b') as stream:stream.write(b'!')
            bad = calibration.tree_witness(case.private)
            for arm in ['original', 'instrumented']:
                observer.phase = phase + '-measurement';observer.set_arm(arm)
                with self.assertRaises(UncertainRequest):case.client.inspect_preparation()
                self.assertEqual(calibration.tree_witness(case.private), bad)
                self.assertFalse(case.engine.exists())


if __name__ == '__main__':
    unittest.main()
