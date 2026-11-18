"""Source-preserving observer, actual native read-only states and negative cases."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from tools import calibrate_preparation_inspection as calibration
from tools import full_private_engine_controller as compiler
from tools import preparation_inspection_diagnostics as diagnostic
from tools import private_termination_fixture_support as support
from tools.content_update_client import UncertainRequest
from tools.tests import test_full_private_engine_preparation as native


class PreparationObserverContracts(unittest.TestCase):
    def test_complete_stream_and_driver_inverses_refuse_unknown_or_changed_source(self):
        driver = diagnostic.native_driver()
        instrumented = diagnostic.instrument_driver(driver)
        self.assertEqual(diagnostic.restore_driver(instrumented), driver)
        stream = compiler.stream_source()
        timed = diagnostic.instrument_stream(stream)
        self.assertEqual(diagnostic.restore_stream(timed), stream)
        for value in [stream + b' ', timed, b'<?php\n']:
            with self.assertRaises(ValueError):
                diagnostic.instrument_stream(value)
        for value in [driver + ' ', instrumented, '<?php\n']:
            with self.assertRaises(ValueError):
                diagnostic.instrument_driver(value)
        with self.assertRaises(ValueError):
            diagnostic.restore_stream(timed.replace(b'private-prefix', b'unknown-prefix', 1))
        with self.assertRaises(ValueError):
            diagnostic.restore_driver(instrumented + ' ')

    def fixture(self):
        case = native.FullPrivatePreparationIntegrationTests('runTest')
        case.setUp()
        self.addCleanup(case.doCleanups)
        directory = tempfile.TemporaryDirectory(prefix='ktk-preparation-observer-unit-')
        self.addCleanup(directory.cleanup)
        output = Path(directory.name)
        observer = calibration.Observer(case, output, lambda: None)
        case.case.call = observer.call
        case.client.prepare()
        case.original()
        return case, observer, output

    def test_native_partial_and_complete_inspections_keep_every_value_and_byte(self):
        case, observer, _ = self.fixture()
        original_public = calibration.tree_witness(Path(case.cfg['packet']['publicRoot']))
        for phase in ['source-prefix', 'complete-seeds']:
            calibration.populate(case, phase)
            before = calibration.tree_witness(case.private)
            results = []
            for arm in ['original', 'instrumented']:
                observer.phase = phase + '-measurement'
                observer.set_arm(arm)
                results.append(case.client.inspect_preparation())
                metric = observer.calls[-1]['observer']
                diagnostic.validate(metric)
                self.assertEqual(metric['memoryLimit'], '256M')
                self.assertEqual(calibration.tree_witness(case.private), before)
                self.assertEqual(calibration.tree_witness(Path(case.cfg['packet']['publicRoot'])), original_public)
                self.assertFalse(case.engine.exists())
                if arm == 'instrumented':
                    self.assertGreater(metric['spans']['source-inventory']['count'], 0)
                    self.assertGreater(metric['spans']['private-prefix']['count'], 0)
                    self.assertGreater(metric['spans']['control-and-guard']['count'], 0)
            self.assertEqual(results[0], results[1])
            seed = results[0]['preparation']['fullSeed']
            self.assertEqual(seed['sourceComplete'], phase == 'complete-seeds')
            self.assertEqual(seed['targetComplete'], phase == 'complete-seeds')
            self.assertEqual(len(seed['files']), 6 if phase == 'source-prefix' else 13)

    def test_corrupt_partial_and_complete_bytes_are_refused_without_repair(self):
        for phase in ['source-prefix', 'complete-seeds']:
            case, observer, _ = self.fixture()
            construction = calibration.populate(case, 'source-prefix')
            if phase == 'complete-seeds':
                calibration.populate(case, phase)
            p = case.private / 'source' / construction['largest']
            with p.open('r+b') as stream:
                stream.write(b'!')
            bad = calibration.tree_witness(case.private)
            for arm in ['original', 'instrumented']:
                observer.phase = phase + '-measurement'
                observer.set_arm(arm)
                with self.assertRaises(UncertainRequest):
                    case.client.inspect_preparation()
                self.assertEqual(calibration.tree_witness(case.private), bad)
                self.assertFalse(case.engine.exists())

    def test_profiler_refuses_recovery_or_wrong_driver_before_php(self):
        case, observer, _ = self.fixture()
        cfg = copy.deepcopy(case.cfg)
        cfg.update(operation='controller', request=json.dumps({'action': 'recover-preparation'}))
        with mock.patch.object(calibration.subprocess, 'run') as process:
            with self.assertRaises(support.FixtureRefusal):
                observer.call(case.root, case.driver, cfg)
            process.assert_not_called()
        before = case.driver.read_bytes()
        case.driver.write_bytes(before + b'changed')
        with mock.patch.object(calibration.subprocess, 'run') as process:
            with self.assertRaises(support.FixtureRefusal):
                observer.call(case.root, case.driver, case.cfg)
            process.assert_not_called()

    def test_observer_schema_refuses_mutation_queries_changed_bounds_and_unknown_labels(self):
        case, observer, _ = self.fixture()
        case.client.inspect_preparation()
        value = observer.calls[-1]['observer']
        diagnostic.validate(value)
        for update in [{'memoryLimit': '512M'}, {'peakAllocatedBytes': 268435456},
                       {'queries': ['UPDATE synthetic']}, {'spans': {'unreviewed': {}}}, {'controllerNs': True}]:
            with self.assertRaises(ValueError):
                diagnostic.validate({**value, **update})

    def test_changed_generated_stream_refuses_before_php_without_restoring_it(self):
        case, observer, _ = self.fixture()
        path = observer.streams['instrumented']
        before = path.read_bytes()
        path.write_bytes(before + b'changed')
        observer.set_arm('instrumented')
        with mock.patch.object(calibration.subprocess, 'run') as process:
            with self.assertRaises(support.FixtureRefusal):
                observer.call(case.root, case.driver, case.cfg)
            process.assert_not_called()
        self.assertEqual(path.read_bytes(), before + b'changed')


if __name__ == '__main__':
    unittest.main()
