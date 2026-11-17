"""Native private stream sync failures and process-death prefix recovery."""
import json
import subprocess
import unittest

from tools import full_private_engine_controller as compiler
from tools.tests import test_streaming_preparation_seeds as stream

PHP = stream.store.PHP
HAS_FSYNC = bool(PHP and subprocess.run(
    [PHP, '-r', "echo function_exists('fsync')?'1':'0';"],
    capture_output=True, text=True, timeout=10).stdout == '1')
LARGE = 'ktk-code-pages-assets/media/sync-original.bin'
CHUNK = 65536
MIB = 1048576
TRACE = r'''
function ktk_test_real_sync($handle) {
    $c=$GLOBALS['c'];$path=str_replace('\\','/',stream_get_meta_data($handle)['uri']);$position=ftell($handle);
    $large=str_ends_with($path,'/media/sync-original.bin');
    $failed=$large&&($c['failSyncOffset']??0)===$position;
    $ok=$failed?false:fsync($handle);
    if($large){file_put_contents($c['syncTrace'],json_encode(array('offset'=>$position,'ok'=>$ok,'source'=>str_contains($path,'/source/')),JSON_THROW_ON_ERROR)."\n",FILE_APPEND);}
    return $ok;
}
'''


@unittest.skipUnless(HAS_FSYNC, 'Real native PHP fsync required')
class PrivateStreamSyncTests(unittest.TestCase):
    def setUp(self):
        self.case = stream.StreamingPreparationSeedTests('runTest')
        self.case.setUp()
        self.addCleanup(self.case.doCleanups)
        self.data = b'0123456789abcdef' * ((2*MIB+160*1024)//16)
        self.case.source[LARGE] = self.data
        self.case.prior[LARGE] = self.data
        self.case.write_public(LARGE, self.data)
        self.case.refresh()
        self.case.rebuild_records()
        self.trace = self.case.base/'sync-events.jsonl'
        self.case.config.update(syncTrace=self.trace.as_posix(), failSyncOffset=0,
                                profile='full-private-host', hostAllowed=True)
        compiled = compiler.stream_source()
        self.assertEqual(compiled.count(b'!fsync($h)'), 2)
        # The fixture delegates to the real fsync; only call observation/failure
        # injection changes. No deployed compiler or kernel is instrumented.
        compiled = compiled.replace(b'!fsync($h)', b'!ktk_test_real_sync($h)')
        component = self.case.base/'compiled-sync-stream.php'
        component.write_bytes(compiled)
        self.case.config['component'] = component.as_posix()
        driver = self.case.driver.read_text(encoding='utf-8')
        self.assertEqual(driver.count('<?php'), 1)
        driver = driver.replace('<?php', '<?php\n'+TRACE, 1)
        driver = driver.replace('new KTK_Content_Update_Streaming_Seeds(',
                                'new KTK_Full_Private_Engine_Streaming_Seeds(', 1)
        cut = "if($c['fault']==='exit-chunk'&&$event==='after-stream-chunk'){exit(74);}"
        replacement = "if($c['fault']==='exit-chunk'&&$event==='after-stream-chunk'&&$name==='source/"+LARGE+"'){clearstatcache(true,$path);if(filesize($path)===($c['stopOffset']??65536)){exit(74);}}"
        self.assertEqual(driver.count(cut), 1)
        self.case.driver.write_text(driver.replace(cut, replacement, 1), encoding='utf-8')
        self.public_before = self.public()

    def public(self):
        return {p.relative_to(self.case.public).as_posix():p.read_bytes()
                for p in self.case.public.rglob('*') if p.is_file()}

    def events(self):
        return [json.loads(line) for line in self.trace.read_text(encoding='utf-8').splitlines()]

    def advance(self, **changes):
        state = self.case.call()
        return self.case.call('advance', fence=state['stateSha256'], **changes)

    def cut(self, offset):
        self.case.config.update(fault='exit-chunk', stopOffset=offset)
        self.advance(exit_code=74)
        self.case.config['fault'] = ''
        path = self.case.private/'source'/LARGE
        self.assertEqual(path.read_bytes(), self.data[:offset])
        self.assertEqual(self.public(), self.public_before)
        return path

    def finish(self):
        self.case.complete()
        for folder in ('source', 'target'):
            self.assertEqual((self.case.private/folder/LARGE).read_bytes(), self.data)
        self.assertEqual(self.public(), self.public_before)

    def test_full_profile_reduces_native_sync_calls_with_first_boundary_and_eof_durable(self):
        state = self.advance()
        self.assertTrue(state['sourceComplete'])
        self.assertLessEqual(state['stepBytesWritten'], 33554432)
        self.assertLessEqual(state['stepFilesOpened'], 128)
        rows = self.events()
        self.assertTrue(all(r['ok'] and r['source'] for r in rows))
        offsets = [r['offset'] for r in rows]
        self.assertEqual(offsets[0], CHUNK)
        self.assertEqual(offsets[-2:], [len(self.data), len(self.data)])
        self.assertTrue(all(b-a <= MIB for a,b in zip(offsets,offsets[1:])))
        self.assertTrue(all(p % MIB == 0 for p in offsets[1:-2]))
        self.assertLess(len(offsets), len(self.data)//CHUNK//4)
        self.finish()

    def test_default_profile_still_syncs_every_native_chunk_and_file_end(self):
        self.case.config['profile'] = 'default'
        self.advance()
        offsets = [r['offset'] for r in self.events()]
        chunks = (len(self.data)+CHUNK-1)//CHUNK
        self.assertEqual(offsets, [min(i*CHUNK,len(self.data)) for i in range(1,chunks+1)]+[len(self.data)])
        self.finish()

    def test_acknowledged_partial_step_syncs_its_exact_prefix_before_returning(self):
        # A smaller fixture-only budget forces a partial last chunk without
        # allocating a larger file or changing the real 32MiB work limit.
        component = self.case.base/'compiled-sync-stream.php'
        source = component.read_bytes()
        anchor = b"$this->stepBytes=$profile==='default'?self::STEP_BYTES:33554432;"
        self.assertEqual(source.count(anchor), 1)
        component.write_bytes(source.replace(anchor, b"$this->stepBytes=$profile==='default'?self::STEP_BYTES:2097169;", 1))
        state = self.advance()
        prefix = (self.case.private/'source'/LARGE).read_bytes()
        self.assertFalse(state['sourceComplete'])
        self.assertLessEqual(state['stepBytesWritten'], 2*MIB+17)
        self.assertGreater(len(prefix), MIB)
        self.assertLess(len(prefix), len(self.data))
        self.assertNotEqual(len(prefix) % MIB, 0)
        self.assertEqual(prefix, self.data[:len(prefix)])
        self.assertEqual(self.events()[-1], dict(offset=len(prefix),ok=True,source=True))
        self.assertEqual(self.public(), self.public_before)
        self.finish()

    def test_process_death_after_first_chunk_preserves_synced_prefix_for_fresh_process(self):
        self.cut(CHUNK)
        self.assertEqual(self.events(), [dict(offset=CHUNK,ok=True,source=True)])
        inspected = self.case.call()
        self.assertEqual(inspected['files']['source/'+LARGE]['bytes'], CHUNK)
        self.finish()

    def test_process_death_between_sync_boundaries_recovers_only_exact_flushed_prefix(self):
        self.cut(2*CHUNK)
        self.assertEqual(self.events(), [dict(offset=CHUNK,ok=True,source=True)])
        inspected = self.case.call()
        self.assertEqual(inspected['files']['source/'+LARGE]['bytes'], 2*CHUNK)
        self.finish()

    def test_failed_native_sync_stops_then_requires_fresh_prefix_inspection(self):
        self.case.config['failSyncOffset'] = MIB
        error = self.advance(success=False)
        self.assertEqual(error, 'Private streaming flush failed')
        self.assertEqual(self.events()[-1], dict(offset=MIB,ok=False,source=True))
        self.assertEqual((self.case.private/'source'/LARGE).read_bytes(), self.data[:MIB])
        self.assertEqual(self.public(), self.public_before)
        self.case.config['failSyncOffset'] = 0
        inspected = self.case.call()
        self.assertEqual(inspected['files']['source/'+LARGE]['bytes'], MIB)
        self.finish()

    def test_changed_intermediate_prefix_is_preserved_and_refused_before_append(self):
        path = self.cut(2*CHUNK)
        path.write_bytes(b'X'+path.read_bytes()[1:])
        before = self.case.snapshot()
        error = self.case.call(success=False)
        self.assertIn('Changed streaming prefix', error)
        self.assertEqual(self.case.snapshot(), before)
        self.assertEqual(self.public(), self.public_before)

    def test_guard_drift_during_copy_still_refuses_without_public_restoration(self):
        self.case.config['fault'] = 'drift-chunk'
        error = self.advance(success=False)
        self.assertIn('protected state differs', error)
        self.assertEqual(self.public(), self.public_before)


if __name__ == '__main__':
    unittest.main()
