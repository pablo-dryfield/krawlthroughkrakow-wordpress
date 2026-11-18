"""Native complete hashing, fallback and full original preparation-profile contracts."""
import hashlib,json,os,subprocess,tempfile,unittest,sys
from pathlib import Path
from tools import full_private_recovery_hashing as prototype
from tools import full_private_engine_controller as compiler
from tools import staging_state_fast_capture as fast
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


class CompleteHashNativeContracts(unittest.TestCase):
    def probe(self, data, *, size=None, operation='buffer', memory='256M', disable=False, failed=False, linked=False, candidate=True):
        with tempfile.TemporaryDirectory(prefix='ktk-prefix-probe-') as folder:
            root = Path(folder)
            path = root / 'item.bin'; path.write_bytes(data)
            if linked:
                os.link(path, root / 'second-link.bin')
            source = prototype.stream_source() if candidate else compiler.stream_source()
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
        source = compiler.stream_source(); candidate = prototype.render_stream(source)
        self.assertEqual(prototype.restore_stream(candidate), source)
        start = source.index(b'    private function prefix(')
        end = source.index(b'    public function inspect(', start)
        self.assertEqual(candidate[:start], source[:start])
        self.assertEqual(candidate[candidate.index(b'    public function inspect('):], source[end:])
        for bad in [source + b' ', candidate, b'<?php\n', source.decode()]:
            with self.assertRaises(ValueError): prototype.render_stream(bad)
        with self.assertRaises(ValueError): prototype.restore_stream(candidate + b' ')
        with self.assertRaises(ValueError): prototype.restore_stream(candidate.replace(b'67108864', b'67108865', 1))

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


class RecoveryHashCompilerContracts(unittest.TestCase):
    def test_mixed_preparation_profiles_refuse_before_any_output_or_fixture(self):
        with tempfile.TemporaryDirectory(prefix='ktk-hash-profile-cli-refusal-') as folder:
            output=Path(folder)/'never-created.json'
            result=subprocess.run([sys.executable,str(compiler.ROOT/'tools/verify-private-termination-fixture.py'),
                '--helper-commit','a'*40,'--report',str(output),'--preparation-hashing','bounded-complete-sha256'],
                capture_output=True,timeout=30)
            self.assertNotEqual(result.returncode,0)
            self.assertEqual(result.stdout,b'')
            self.assertIn(b'bounded-preparation-capture-required-for-complete-hashing',result.stderr)
            self.assertEqual(list(Path(folder).iterdir()),[])

    def test_exact_accepted_capture64_and_full_legacy_inverse(self):
        source=fast.SOURCE.read_bytes();bounded=fast.embedded(source)
        candidate=prototype.capture_source(source)
        self.assertEqual(hashlib.sha256(candidate).hexdigest(),'3bc39c8524f252f9ad0266c94f126848f5d1cfd266e54c461bf710999b9871c6')
        self.assertEqual(prototype.restore_capture(candidate),bounded)
        self.assertEqual(fast.inverse(prototype.restore_capture(candidate)),source)
        for bad in [bounded+b' ',candidate,b'<?php\n']:
            with self.assertRaises(ValueError):prototype.enlarge_capture(bad)
        with self.assertRaises(ValueError):prototype.restore_capture(candidate+b' ')
        with self.assertRaises(ValueError):prototype.capture_source(source+b' ')

    def test_exact_accepted_complete_stream_and_no_default_compiler_change(self):
        old=compiler.stream_source();current=prototype.stream_source()
        self.assertEqual(hashlib.sha256(old).hexdigest(),'bbe94fcdba61fd33b1fc3bcd74a26cd765700b092c26bff62e0b906e6d9934db')
        self.assertEqual(hashlib.sha256(current).hexdigest(),'e272961799d84fbd551694826ac9ed46b71fd617d79230303af54a389d2f0cbc')
        self.assertEqual(prototype.restore_stream(current),old)
        self.assertEqual(compiler.stream_source(),old)
        self.assertEqual(hashlib.sha256(fast.TARGET.read_bytes()).hexdigest(),'cc98563838d020958e359d74c66a9e0ae495a327b1a706432a598f111b1b8c0b')


class FullHashedPreparationNativeContracts(native.FullPrivatePreparationIntegrationTests):
    def setUp(self):
        super().setUp()
        stream=self.root/'engine-stream.php';stream.write_bytes(prototype.stream_source())
        capture=self.root/'complete-hash-capture.php';capture.write_bytes(prototype.capture_source())
        self.cfg['captureComponent']=capture.as_posix()
        frozen={stream:stream.read_bytes(),capture:capture.read_bytes()}
        original_call=self.case.call
        def checked(*args,**kwargs):
            for p,b in frozen.items():self.assertEqual(p.read_bytes(),b)
            try:return original_call(*args,**kwargs)
            finally:
                for p,b in frozen.items():self.assertEqual(p.read_bytes(),b)
        self.case.call=checked

    def private_witness(self):
        result={}
        for p in self.private.rglob('*'):
            if p.is_file():
                before=p.stat();b=p.read_bytes();after=p.stat()
                fields=('st_dev','st_ino','st_size','st_nlink','st_mtime_ns','st_ctime_ns')
                self.assertEqual(tuple(getattr(before,n) for n in fields),tuple(getattr(after,n) for n in fields))
                result[p.relative_to(self.private).as_posix()]=(hashlib.sha256(b).hexdigest(),tuple(getattr(after,n) for n in fields))
        return result

    def test_new_profile_corrupt_partial_prefix_refuses_and_preserves_every_private_file(self):
        self.client.prepare();self.original();self.cfg['seedFault']='prefix';self.expected_exit=74
        with self.assertRaises(UncertainRequest):self.client.recover_preparation()
        self.cfg['seedFault']='';self.expected_exit=0
        p=self.private/'source/ktk-code-pages-assets/media/large.bin';self.assertEqual(p.stat().st_size,65536)
        with p.open('r+b') as f:f.write(b'!')
        private=self.private_witness();public=self.public()
        with self.assertRaises(UncertainRequest):self.client.inspect_preparation()
        self.assertEqual(self.private_witness(),private);self.assertEqual(self.public(),public)
        self.assertFalse(self.engine.exists())

    def test_new_profile_corrupt_complete_seed_refuses_and_preserves_every_private_file(self):
        self.complete_seeds_without_engine()
        p=self.private/'source/ktk-code-pages-assets/media/large.bin';self.assertEqual(p.stat().st_size,18*1024*1024)
        with p.open('r+b') as f:f.write(b'!')
        private=self.private_witness();public=self.public()
        with self.assertRaises(UncertainRequest):self.client.inspect_preparation()
        self.assertEqual(self.private_witness(),private);self.assertEqual(self.public(),public)
        self.assertFalse(self.engine.exists())


if __name__ == '__main__':unittest.main()
