"""Isolated local candidate contracts; not an integrated/hosted recovery proof."""
from pathlib import Path
import copy
import hashlib
import json
import shutil
import subprocess
import tempfile
import unittest

from tools import staging_state_fast_capture as candidate
from tools.tests import test_content_update_controller as native

PHP = shutil.which('php')
RUNNER = r'''<?php
namespace KTKHashFixture;
$c=json_decode(\file_get_contents($argv[1]),true,32,JSON_THROW_ON_ERROR);$GLOBALS['case']=$c;$GLOBALS['reads']=array();$GLOBALS['digests']=0;$GLOBALS['fallbacks']=0;
function function_exists($name){return $name==='openssl_digest'&&$GLOBALS['case']['mode']==='unavailable'?false:\function_exists($name);}
function ini_get($name){return $GLOBALS['case']['setting'];}
function file_get_contents($path,$include=false,$context=null,$offset=0,$length=null){$GLOBALS['reads'][]=$length;if($GLOBALS['case']['mode']==='read-false'){return false;}$value=\file_get_contents($path,$include,$context,$offset,$length);return $GLOBALS['case']['mode']==='short'?substr($value,0,max(0,strlen($value)-1)):$value;}
function openssl_digest($bytes,$algorithm){$GLOBALS['digests']++;if($GLOBALS['case']['mode']==='invalid-digest'){return 'invalid';}if($GLOBALS['case']['mode']==='false-digest'){return false;}return \openssl_digest($bytes,$algorithm);}
function hash_file($algorithm,$path){$GLOBALS['fallbacks']++;return \hash_file($algorithm,$path);}
''' + candidate.BLOCK + r'''
$result=$hashCurrentFile($c['path'],$c['size']);$second=null;if($c['mode']==='mutate'){\file_put_contents($c['path'],'changed current bytes');$second=$hashCurrentFile($c['path'],\filesize($c['path']));}
echo json_encode(array('digest'=>$result,'second'=>$second,'readLimits'=>$GLOBALS['reads'],'opensslCalls'=>$GLOBALS['digests'],'fallbackCalls'=>$GLOBALS['fallbacks'],'actualOpenSSLAvailable'=>\function_exists('openssl_digest'),'peakAllocatedBytes'=>memory_get_peak_usage(true),'memoryLimit'=>\ini_get('memory_limit')),JSON_THROW_ON_ERROR);
'''


class StagingFastCaptureTests(unittest.TestCase):
    def run_hash(self, data=b'complete current bytes', **changes):
        self.assertTrue(PHP, 'Real PHP required; do not skip candidate proof')
        with tempfile.TemporaryDirectory(prefix='ktk-local-hash-candidate-') as folder:
            root=Path(folder);path=root/'current.bin';path.write_bytes(data)
            config={'path':path.as_posix(),'size':len(data),'mode':'normal','setting':'256M',**changes}
            input_path=root/'input.json';input_path.write_text(json.dumps(config))
            driver=root/'hash.php';driver.write_text(RUNNER)
            run=subprocess.run([PHP,'-d','memory_limit=256M',str(driver),str(input_path)],capture_output=True,timeout=15)
            self.assertEqual(run.returncode,0,run.stderr.decode(errors='replace'));self.assertFalse(run.stderr)
            return json.loads(run.stdout)

    def test_exact_complete_inverse_preserves_raw_and_production_sources(self):
        source=candidate.SOURCE.read_bytes();rendered=candidate.render(source)
        self.assertEqual(candidate.inverse(rendered),source)
        self.assertEqual(rendered,candidate.TARGET.read_bytes())
        self.assertEqual(hashlib.sha256(source).hexdigest(),candidate.SOURCE_SHA)
        result=subprocess.run(['python',str(candidate.ROOT/'tools/build-production-state-core.py')],capture_output=True,timeout=20)
        self.assertEqual(result.returncode,0,result.stderr.decode(errors='replace'))

    def test_changed_base_partial_or_unknown_candidate_edits_refuse(self):
        source=candidate.SOURCE.read_bytes();rendered=candidate.render(source)
        with self.assertRaises(ValueError):candidate.render(source+b'changed')
        for bad in [rendered+b'changed',rendered.replace(b'33554432',b'67108864',1),rendered.replace(b'16777216',b'0',1)]:
            with self.assertRaises(ValueError):candidate.inverse(bad)

    def test_actual_sha256_for_empty_binary_and_multimegabyte_files(self):
        for value in [b'',b'\x00\xffbinary\r\n',bytes(range(256))*32768]:
            with self.subTest(bytes=len(value)):
                result=self.run_hash(value);self.assertEqual(result['digest'],hashlib.sha256(value).hexdigest())
                if result['actualOpenSSLAvailable']:
                    self.assertEqual(result['opensslCalls'],1);self.assertEqual(result['fallbackCalls'],0);self.assertEqual(result['readLimits'],[len(value)+1])
                else:self.assertEqual(result['fallbackCalls'],1)
                self.assertLess(result['peakAllocatedBytes'],256*1024*1024)

    def test_unavailable_provider_and_oversized_or_invalid_size_keep_original_streaming(self):
        for change in [{'mode':'unavailable'},{'size':33554433},{'size':-1},{'size':None},{'size':True}]:
            with self.subTest(change=change):
                result=self.run_hash(**change);self.assertEqual(result['digest'],hashlib.sha256(b'complete current bytes').hexdigest())
                self.assertEqual(result['readLimits'],[]);self.assertEqual(result['opensslCalls'],0);self.assertEqual(result['fallbackCalls'],1)

    def test_small_unknown_or_unlimited_memory_setting_never_raises_limit(self):
        for setting in ['1M','-1','unknown','9999999999G']:
            with self.subTest(setting=setting):
                result=self.run_hash(setting=setting);self.assertEqual(result['digest'],hashlib.sha256(b'complete current bytes').hexdigest())
                self.assertEqual(result['readLimits'],[]);self.assertEqual(result['fallbackCalls'],1);self.assertEqual(result['memoryLimit'],'256M')

    def test_short_failed_or_invalid_digest_uses_complete_original_hash(self):
        for mode in ['short','read-false','invalid-digest','false-digest']:
            with self.subTest(mode=mode):
                result=self.run_hash(mode=mode);self.assertEqual(result['digest'],hashlib.sha256(b'complete current bytes').hexdigest())
                self.assertEqual(result['fallbackCalls'],1)

    def test_a_later_invocation_reads_new_bytes_instead_of_reusing_a_digest(self):
        result=self.run_hash(mode='mutate');self.assertEqual(result['digest'],hashlib.sha256(b'complete current bytes').hexdigest());self.assertEqual(result['second'],hashlib.sha256(b'changed current bytes').hexdigest())
        self.assertNotEqual(result['digest'],result['second'])

    def test_actual_native_capture_keeps_all_fields_queries_and_public_files(self):
        case=native.ContentUpdateControllerTests('runTest')
        with case.fixture() as (root,mu,driver,config):
            config={**config,'operation':'snapshot'}
            old="echo json_encode(array('ok'=>true,'state'=>$capture()),JSON_THROW_ON_ERROR);"
            new="echo json_encode(array('ok'=>true,'state'=>$capture(),'queries'=>$wpdb->queries),JSON_THROW_ON_ERROR);"
            source=driver.read_text();self.assertEqual(source.count(old),1);driver.write_text(source.replace(old,new,1))
            before={p.relative_to(mu).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in mu.rglob('*') if p.is_file()}
            original=case.call(root,driver,config);fast=case.call(root,driver,{**config,'captureComponent':candidate.TARGET.as_posix()})
            self.assertTrue(original['ok']);self.assertTrue(fast['ok'])
            first=copy.deepcopy(original['state']);second=copy.deepcopy(fast['state'])
            self.assertIsInstance(first.pop('capturedAt'),str);self.assertIsInstance(second.pop('capturedAt'),str)
            self.assertEqual(first,second);self.assertEqual(original['queries'],fast['queries']);self.assertEqual(len(fast['queries']),7)
            after={p.relative_to(mu).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in mu.rglob('*') if p.is_file()};self.assertEqual(before,after)
            self.assertFalse((root/('.ktk-content-update-'+native.ID)).exists())


if __name__ == '__main__':unittest.main()
