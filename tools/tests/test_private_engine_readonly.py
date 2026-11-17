"""Real PHP proves the compiled private reader cannot initialize or mutate."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import unittest

from tools import private_engine_readonly as compiler

PHP = shutil.which('php')
ID = 'a'*32
MARKER = 'b8a99198a1d910ea2c7266bf5ad1cafc9bc89844f0313b0aeb80a1e1c520d833'


class ReadOnlyPrivateCompilerTests(unittest.TestCase):
    def test_any_frozen_kernel_drift_is_refused(self):
        raw = compiler.SOURCE.read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), compiler.SOURCE_SHA256)
        for changed in (raw+b' ',raw.replace(b"fopen($lockPath, 'c+b')",b"fopen($lockPath, 'r+b')",1)):
            with self.subTest(changed=hashlib.sha256(changed).hexdigest()):
                with self.assertRaises(ValueError):
                    compiler.read_only_source(changed)
        result = compiler.read_only_source()
        self.assertIn(b"@fopen($lockPath,'r+b')",result)
        self.assertNotIn(b"fopen($lockPath, 'c+b')",result)
        self.assertNotIn(b'mkdir($directory, 0700)',result)


@unittest.skipUnless(PHP,'Real PHP required for read-only engine refusal tests')
class ReadOnlyPrivateNativeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ktk-readonly-engine-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.source,self.target,self.private = (self.root/n for n in ('source','target','engine'))
        for path in (self.source,self.target,self.private):
            path.mkdir()
        names = ('ktk-code-pages.php','ktk-code-pages-assets/registry.php','ktk-code-pages-assets/runtime.css','ktk-code-pages-assets/runtime.js')
        expected = {name:hashlib.sha256(name.encode()).hexdigest() for name in names}
        self.plan = dict(transactionId=ID,applicationCommit='b'*40,protectedStateSha256='c'*64,expected=expected,prior={**expected,'ktk-code-pages-production.php':MARKER})
        self.lock = self.private/('target-'+hashlib.sha256(self.target.as_posix().encode()).hexdigest()+'.lock')
        self.lock.write_bytes(b'')
        self.transaction = self.private/ID
        self.transaction.mkdir()
        self.compiled = self.root/'reader.php'
        self.compiled.write_bytes(compiler.read_only_source())
        self.driver = self.root/'driver.php'
        self.driver.write_text("""<?php
define('KTK_UPDATE_ENGINE_ALLOWED',true);
try{
 $c=json_decode(file_get_contents($argv[1]),true,512,JSON_THROW_ON_ERROR);require $c['component'];
 $reader=new KTK_Read_Only_Private_Engine($c['source'],$c['target'],$c['private'],$c['plan'],static fn()=>$c['plan']['protectedStateSha256']);
 if($c['method']==='resumePreparation'){$reader->resumePreparation(str_repeat('d',64));}
 elseif($c['method']!=='construct'){$reader->{$c['method']}();}
 echo json_encode(array('ok'=>true),JSON_THROW_ON_ERROR);
}catch(Throwable $e){echo json_encode(array('ok'=>false,'message'=>$e->getMessage()),JSON_THROW_ON_ERROR);}
""",encoding='utf-8')

    def inventory(self):
        return {base.name+'/'+p.relative_to(base).as_posix():('directory' if p.is_dir() else hashlib.sha256(p.read_bytes()).hexdigest())
                for base in (self.source,self.target,self.private) for p in base.rglob('*')}

    def call(self,method='construct'):
        config = self.root/'config.json'
        config.write_text(json.dumps(dict(component=self.compiled.as_posix(),source=self.source.as_posix(),target=self.target.as_posix(),private=self.private.as_posix(),plan=self.plan,method=method)),encoding='utf-8')
        result = subprocess.run([PHP,str(self.driver),str(config)],capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(result.stderr,'')
        return json.loads(result.stdout)

    def test_existing_pristine_constructor_writes_nothing(self):
        before = self.inventory()
        self.assertTrue(self.call()['ok'])
        self.assertEqual(self.inventory(),before)

    def test_all_four_mutating_public_methods_refuse_without_writes(self):
        before = self.inventory()
        for method in ('prepare','resumePreparation','apply','rollback'):
            with self.subTest(method=method):
                result = self.call(method)
                self.assertFalse(result['ok'])
                self.assertEqual(result['message'],method+' unavailable in read-only private profile')
                self.assertEqual(self.inventory(),before)

    def test_missing_engine_lock_is_never_created(self):
        self.assertTrue(self.lock.resolve().is_relative_to(self.root))
        self.lock.unlink()
        before = self.inventory()
        self.assertIn('Existing empty read-only engine lock required',self.call()['message'])
        self.assertEqual(self.inventory(),before)
        self.assertFalse(self.lock.exists())

    def test_lock_disappearing_after_validation_is_not_recreated(self):
        raw = self.compiled.read_bytes()
        anchor = b"        $this->lock=@fopen($lockPath,'r+b');"
        self.assertEqual(raw.count(anchor),1)
        # Fault injection removes only the known fixture lock after lstat.
        self.compiled.write_bytes(raw.replace(anchor,b'        unlink($lockPath);\n'+anchor,1))
        before = self.inventory()
        result = self.call()
        self.assertIn('Existing read-only engine lock cannot be held',result['message'])
        self.assertFalse(self.lock.exists())
        before.pop('engine/'+self.lock.name)
        self.assertEqual(self.inventory(),before)

    def test_missing_transaction_directory_is_never_created(self):
        self.assertTrue(self.transaction.resolve().is_relative_to(self.root))
        self.transaction.rmdir()
        before = self.inventory()
        self.assertIn('Existing private transaction directory required',self.call()['message'])
        self.assertFalse(self.transaction.exists())
        self.assertEqual(self.inventory(),before)

    def test_changed_nonempty_lock_is_preserved(self):
        self.lock.write_bytes(b'foreign lock bytes')
        before = self.inventory()
        self.assertIn('Existing empty read-only engine lock required',self.call()['message'])
        self.assertEqual(self.inventory(),before)

    def test_directory_disappearing_after_validation_is_not_recreated(self):
        raw=self.compiled.read_bytes();anchor=b'        $this->private = self::root($directory);'
        self.assertEqual(raw.count(anchor),1)
        self.compiled.write_bytes(raw.replace(anchor,b'        rmdir($directory);\n'+anchor,1))
        before=self.inventory();result=self.call()
        self.assertIn('Existing absolute directory required',result['message'])
        self.assertFalse(self.transaction.exists())
        before.pop('engine/'+ID)
        self.assertEqual(self.inventory(),before)

    def test_busy_real_engine_lock_refuses_without_writes(self):
        before=self.inventory();ready=self.root/'lock-held.txt'
        script="$h=fopen($argv[1],'r+b');if(!$h||!flock($h,LOCK_EX|LOCK_NB)){exit(7);}file_put_contents($argv[2],'held');fgets(STDIN);"
        process=subprocess.Popen([PHP,'-r',script,str(self.lock),str(ready)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        try:
            deadline=time.monotonic()+5
            while not ready.exists() and process.poll() is None and time.monotonic()<deadline:time.sleep(.025)
            self.assertTrue(ready.exists(),'Native lock holder did not become ready')
            result=self.call()
            self.assertIn('Existing read-only engine lock cannot be held',result['message'])
            stdout,stderr=process.communicate('\n',timeout=5)
            self.assertEqual((process.returncode,stdout,stderr),(0,'',''))
        finally:
            if process.poll() is None:process.kill();process.communicate(timeout=5)
        self.assertEqual(self.inventory(),before)


if __name__=='__main__':
    unittest.main()
