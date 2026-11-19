"""Original private race checks survive an exact bounded-hash derivation."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from tools import private_state_fast_census as candidate
from tools import staging_state_fast_capture as public
from tools.tests import test_private_engine_fenced_inspection as original


class PrivateFastCensusTests(unittest.TestCase):
    def test_complete_inverse_keeps_every_original_census_and_race_guard(self):
        source = candidate.SOURCE.read_bytes()
        rendered = candidate.render(source)
        self.assertEqual(candidate.inverse(rendered), source)
        self.assertEqual(rendered, candidate.TARGET.read_bytes())
        self.assertEqual(hashlib.sha256(source).hexdigest(), candidate.SOURCE_SHA)
        for guard in [b"$before['dev']!==$after['dev']", b"$before['ino']!==$after['ino']", b"($after['nlink']??0)!==1",
                      b"$before['size']!==$after['size']", b"$before['mtime']!==$after['mtime']", b"$before['ctime']!==$after['ctime']",
                      b"$this->census($root,$store)!==$before", b"$this->fresh();$store->rootBinding();"]:
            self.assertGreater(source.count(guard), 0)
            self.assertEqual(source.count(guard), rendered.count(guard))

    def test_unknown_source_or_partial_scope_changes_refuse(self):
        original = candidate.SOURCE.read_bytes()
        with self.assertRaises(ValueError):
            candidate.render(original + b'changed')
        rendered = candidate.render(original)
        for changed in [rendered + b'changed', rendered.replace(b"$before['ino']!==$after['ino']", b'false', 1),
                        rendered.replace(b'33554432', b'67108864', 1)]:
            with self.assertRaises(ValueError):
                candidate.inverse(changed)

    def test_private_hash_body_is_the_same_reviewed_public_implementation(self):
        method = candidate.method()
        recovered = method.replace('    private static function hashCurrentFile(string $path, $size) {',
                                   '    $hashCurrentFile = static function (string $path, $size) {', 1)
        recovered = recovered.removesuffix('    }\n') + '    };\n'
        self.assertEqual(recovered, public.BLOCK)

    def test_actual_native_private_hash_reads_complete_current_bytes_without_cache(self):
        php = shutil.which('php')
        self.assertTrue(php, 'Real native PHP required; no skipped private candidate proof')
        with tempfile.TemporaryDirectory(prefix='ktk-private-fast-hash-') as folder:
            root = Path(folder)
            path = root / 'current.bin'
            initial = bytes(range(256)) * 32768
            path.write_bytes(initial)
            driver = root / 'driver.php'
            driver.write_text("<?php\ndefine('KTK_PRIVATE_ENGINE_FENCED_INSPECTION_ALLOWED',true);"
                              "require $argv[1];$method=new ReflectionMethod('KTK_Private_Engine_Fenced_Inspection','hashCurrentFile');"
                              "$first=$method->invoke(null,$argv[2],filesize($argv[2]));file_put_contents($argv[2],'changed current bytes');"
                              "clearstatcache(true,$argv[2]);$second=$method->invoke(null,$argv[2],filesize($argv[2]));"
                              "echo json_encode(array($first,$second,memory_get_peak_usage(true),ini_get('memory_limit')),JSON_THROW_ON_ERROR);")
            process = subprocess.run([php, '-d', 'memory_limit=256M', str(driver), str(candidate.TARGET), str(path)],
                                     capture_output=True, timeout=15)
            self.assertEqual(process.returncode, 0, process.stderr.decode(errors='replace'))
            self.assertFalse(process.stderr)
            first, second, peak, limit = json.loads(process.stdout)
            self.assertEqual(first, hashlib.sha256(initial).hexdigest())
            self.assertEqual(second, hashlib.sha256(b'changed current bytes').hexdigest())
            self.assertEqual(limit, '256M')
            self.assertLess(peak, 256 * 1024 * 1024)


class DerivedFencedInspectionTests(original.PrivateEngineFencedInspectionTests):
    """Exercise every original native race/phase case with the derived reader."""
    __unittest_skip__ = False

    def setUp(self):
        self.assertTrue(shutil.which('php'), 'Real native PHP required; no skipped derived census proof')
        super().setUp()
        raw = str(candidate.SOURCE)
        components = self.case.cfg['components']
        self.assertEqual(components.count(raw), 1)
        self.case.cfg['components'] = [str(candidate.TARGET) if path == raw else path for path in components]


if __name__ == '__main__':
    unittest.main()
