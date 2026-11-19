"""Reserved final verification and fresh-context cleanup under synthetic time."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from tools.tests import test_private_engine_payload_cleanup as native
from tools import private_termination_fixture_support as support

ROOT = Path(__file__).resolve().parents[2]
RUNNER = r'''<?php
define('KTK_PRIVATE_ENGINE_PAYLOAD_CLEANUP_ALLOWED',true);require $argv[1];
$c=json_decode(file_get_contents($argv[2]),true,32,JSON_THROW_ON_ERROR);$GLOBALS['now']=$c['start'];$answers=array();
try{
 $b=new KTK_Private_Engine_Cleanup_Budget(static fn()=>$GLOBALS['now']);
 foreach($c['steps'] as $s){
  if($s['op']==='advance'){$GLOBALS['now']+=$s['ns'];}
  elseif($s['op']==='set'){$GLOBALS['now']=$s['value'];}
  elseif($s['op']==='witness'){$t=$b->now();$GLOBALS['now']+=$s['ns'];$b->witness($t);}
  elseif($s['op']==='census'){$v=$b->census(static function()use($s){$GLOBALS['now']+=$s['ns'];return array('complete'=>'all files');});if($v!==array('complete'=>'all files')){throw new RuntimeException('Complete census result changed');}}
  elseif($s['op']==='unit'){$t=$b->now();$GLOBALS['now']+=$s['ns'];$b->completed($t,$s['excluded']??0);}
  elseif($s['op']==='begin'){$answers[]=$b->begin($s['bytes']??0,$s['first']??false);}
  else{throw new RuntimeException('Unknown timer fixture step');}
 }
 echo json_encode(array('ok'=>true,'answers'=>$answers,'stopped'=>$b->stopped(),'elapsedNs'=>$GLOBALS['now']-$c['start']),JSON_THROW_ON_ERROR);
}catch(Throwable $error){echo json_encode(array('ok'=>false,'class'=>get_class($error),'answers'=>$answers),JSON_THROW_ON_ERROR);}
'''


class CleanupBudgetPolicyTests(unittest.TestCase):
    def run_steps(self, steps, start=1000000000):
        php = shutil.which('php')
        self.assertTrue(php, 'Real PHP required; no skipped cleanup scheduling proof')
        with tempfile.TemporaryDirectory(prefix='ktk-cleanup-budget-policy-') as folder:
            root = Path(folder)
            driver = root / 'timer.php'
            driver.write_text(RUNNER)
            config = root / 'timer.json'
            config.write_text(json.dumps({'start': start, 'steps': steps}))
            result = subprocess.run([php, str(driver), str(ROOT / 'tools/private-engine-payload-cleanup.php'), str(config)],
                                    capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr.decode(errors='replace'))
            self.assertFalse(result.stderr)
            return json.loads(result.stdout)

    def test_reserves_complete_final_census_and_witnesses_before_next_work(self):
        result = self.run_steps([{'op': 'witness', 'ns': 1000000000}, {'op': 'census', 'ns': 5000000000},
                                 {'op': 'advance', 'ns': 36000000000}, {'op': 'begin'},
                                 {'op': 'witness', 'ns': 1000000000}, {'op': 'census', 'ns': 5000000000},
                                 {'op': 'witness', 'ns': 1000000000}, {'op': 'begin'}])
        self.assertTrue(result['ok'])
        self.assertEqual(result['answers'], [False, False])
        self.assertTrue(result['stopped'])
        self.assertEqual(result['elapsedNs'], 49000000000)
        self.assertLess(result['elapsedNs'], 55000000000)

    def test_first_payload_accounts_for_its_additional_full_reinspection(self):
        steps = [{'op': 'witness', 'ns': 1000000000}, {'op': 'census', 'ns': 10000000000},
                 {'op': 'advance', 'ns': 20000000000}, {'op': 'begin'}, {'op': 'begin', 'first': True}]
        result = self.run_steps(steps)
        self.assertTrue(result['ok'])
        self.assertEqual(result['answers'], [True, False])

    def test_startup_cost_cannot_be_hidden_and_large_clock_jump_stops(self):
        for elapsed in [54000000000, 55000000000, 2**62]:
            with self.subTest(elapsed=elapsed):
                result = self.run_steps([{'op': 'advance', 'ns': elapsed}, {'op': 'begin'}])
                self.assertTrue(result['ok'])
                self.assertEqual(result['answers'], [False])

    def test_slower_observed_work_is_not_replaced_by_later_fast_sample(self):
        result = self.run_steps([{'op': 'unit', 'ns': 10000000000}, {'op': 'unit', 'ns': 1},
                                 {'op': 'advance', 'ns': 32000000000}, {'op': 'begin'}])
        self.assertTrue(result['ok'])
        self.assertEqual(result['answers'], [False])

    def test_invalid_or_backward_monotonic_clocks_refuse(self):
        for start in [False, None, -1, 1.5, 2**63 - 1]:
            with self.subTest(start=start):
                self.assertFalse(self.run_steps([], start=start)['ok'])
        self.assertFalse(self.run_steps([{'op': 'set', 'value': 0}, {'op': 'begin'}])['ok'])

    def test_unknown_work_size_and_impossible_excluded_census_refuse(self):
        for size in [-1, 1073741825]:
            with self.subTest(size=size):
                self.assertFalse(self.run_steps([{'op': 'begin', 'bytes': size}])['ok'])
        self.assertFalse(self.run_steps([{'op': 'unit', 'ns': 1, 'excluded': 2}])['ok'])


class CleanupBudgetNativeTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(shutil.which('php'), 'Real PHP required; no skipped native scheduling proof')
        self.fixture = native.PrivateEnginePayloadCleanupTests('runTest')
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.case = self.fixture.case
        source = self.case.driver.read_text()
        changes = [
            ("  $captures=0;$clock=$c['terminationNow'];", "  $GLOBALS['cleanupBudgetNowNs']=1000000000;$captures=0;$clock=$c['terminationNow'];"),
            ("$captures++;$v=$capture();", "$GLOBALS['cleanupBudgetNowNs']+=$c['budgetCaptureNs']??0;$captures++;$v=$capture();"),
            ("$observer,static function()use(&$clock){return $clock;});$result=$ctl->run",
             "$observer,static function()use(&$clock){return $clock;},static fn()=>$GLOBALS['cleanupBudgetNowNs']);$result=$ctl->run"),
            ("$result=$ctl->run($c['terminationRaw'],$c['terminationMethod'],$c['terminationHost'],$c['terminationToken'],$c['terminationNow']);echo",
             "$result=$ctl->run($c['terminationRaw'],$c['terminationMethod'],$c['terminationHost'],$c['terminationToken'],$c['terminationNow']);$result['fixtureBudgetElapsedNs']=$GLOBALS['cleanupBudgetNowNs']-1000000000;echo"),
        ]
        for old, new in changes:
            self.assertEqual(source.count(old), 1)
            source = source.replace(old, new, 1)
        anchor = "   if($event==='after-private-claim-mkdir'"
        extra = """   if($event==='after-private-payload-delete'&&$c['terminationFault']==='budget-final-raw'){$GLOBALS['c']['rows']['options'][]=array('option_name'=>'ecwid_last_api_cache_check','option_value'=>'changed-after-budgeted-delete');}
   if($event==='before-private-payload-directory'&&$c['terminationFault']==='directory-filled-after-precheck'){file_put_contents($blob.'/unknown-raced-evidence','preserve this new private evidence');}
"""
        self.assertEqual(source.count(anchor), 1)
        source = source.replace(anchor, extra + anchor, 1)
        self.case.driver.write_text(source)

    def test_slow_current_captures_return_partial_progress_after_complete_final_checks(self):
        view, state = self.fixture.prepare()
        initial = state['state']['remainingPayloadFiles']
        self.case.cfg['budgetCaptureNs'] = 2000000000
        packet, result = self.fixture.cleanup(view, state)
        self.assertTrue(result['cleanupStoppedForRuntimeBudget'])
        self.assertGreater(result['payloadDeletes'], 0)
        self.assertLess(result['payloadDeletes'], initial)
        self.assertEqual(result['state']['remainingPayloadFiles'], initial - result['payloadDeletes'])
        self.assertTrue(result['state']['freshWitnessVerified'])
        self.assertLess(result['fixtureBudgetElapsedNs'], 55000000000)
        proof=support.verify_cleanup_progress(state['state'],result,self.case.cfg['terminationConfig']['fenced']['payload'])
        self.assertLess(proof['afterKnownObjects'],proof['beforeKnownObjects'])
        self.assertTrue(self.fixture.fixture.marker(packet).exists())
        # The consumed context cannot be reused. A distinct witnessed context finishes.
        _, refused = self.fixture.cleanup(view, state, packet=packet, success=False)
        self.assertFalse(refused['ok'])
        self.case.cfg['budgetCaptureNs'] = 0
        fresh, remaining = self.fixture.fixture.observe(packet)
        new, done = self.fixture.cleanup(fresh, remaining)
        self.assertNotEqual(new['operationId'], packet['operationId'])
        self.assertEqual(done['state']['remainingPayloadFiles'], 0)
        self.assertFalse(done['cleanupStoppedForRuntimeBudget'])

    def test_startup_budget_stop_still_verifies_state_without_deleting_payload(self):
        view, state = self.fixture.prepare()
        self.case.cfg['budgetCaptureNs'] = 4000000000
        packet, result = self.fixture.cleanup(view, state)
        self.assertTrue(result['cleanupStoppedForRuntimeBudget'])
        self.assertEqual(result['payloadDeletes'], 0)
        self.assertEqual(result['payloadDirectoriesRemoved'], 0)
        self.assertEqual(result['state']['remainingPayloadFiles'], state['state']['remainingPayloadFiles'])
        self.assertTrue(result['state']['freshWitnessVerified'])
        self.assertTrue(self.fixture.fixture.marker(packet).exists())
        with self.assertRaisesRegex(support.FixtureRefusal,'strict-progress'):
            support.verify_cleanup_progress(state['state'],result,self.case.cfg['terminationConfig']['fenced']['payload'])

    def test_final_witness_drift_after_partial_work_refuses_success(self):
        view, state = self.fixture.prepare()
        before = self.fixture.files(self.fixture.private)
        self.case.cfg['budgetCaptureNs'] = 2000000000
        packet, failed = self.fixture.cleanup(view, state, fault='budget-final-raw', success=False)
        self.assertFalse(failed['ok'])
        self.assertIn('witness changed', failed['message'])
        after = self.fixture.files(self.fixture.private)
        self.assertEqual(len(before) - len(after), 1)
        config = self.case.cfg['terminationConfig']['fenced']
        for name, digest in before.items():
            rel = Path(name).relative_to(self.fixture.private).as_posix() if Path(name).is_absolute() else name
            if rel not in config['payload']:
                self.assertEqual(after[name], digest)
        self.assertTrue(self.fixture.fixture.marker(packet).exists())

    def test_directory_becoming_nonempty_after_precheck_preserves_new_evidence(self):
        view, state = self.fixture.prepare()
        packet, failed = self.fixture.cleanup(view, state, fault='directory-filled-after-precheck', success=False)
        self.assertFalse(failed['ok'])
        evidence = list(self.fixture.private.rglob('unknown-raced-evidence'))
        self.assertGreater(len(evidence), 0)
        self.assertTrue(all(path.read_text() == 'preserve this new private evidence' for path in evidence))
        self.assertTrue(self.fixture.fixture.marker(packet).exists())


if __name__ == '__main__':
    unittest.main()
