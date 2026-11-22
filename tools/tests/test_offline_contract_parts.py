import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('offline_contract_parts', Path(__file__).resolve().parents[1] / 'run-offline-contracts.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class OfflineContractPartsTests(unittest.TestCase):
    def ids(self):
        return [f'test_{module}.Cases.test_{i}' for module, count in [('a', 5), ('b', 3), ('c', 2), ('d', 1)] for i in range(count)]

    def test_both_parts_preserve_the_complete_disjoint_inventory(self):
        ids = self.ids()
        left, right = runner.partition(ids)
        self.assertFalse(set(left) & set(right))
        self.assertEqual(sorted(left + right), sorted(ids))
        self.assertTrue(left and right)

    def test_module_lifecycles_stay_together_and_selection_is_order_independent(self):
        ids = self.ids()
        groups = runner.partition(ids)
        self.assertEqual(groups, runner.partition(list(reversed(ids))))
        for module in ['a', 'b', 'c', 'd']:
            self.assertEqual(sum(any(i.startswith('test_' + module + '.') for i in g) for g in groups), 1)

    def test_empty_duplicate_invalid_or_single_module_cannot_pass(self):
        for ids in [[], ['test_a.Cases.test_x'] * 2, ['other.Cases.test_x', 'test_a.Cases.test_x'], ['test_a.Cases.test_x']]:
            with self.subTest(ids=ids), self.assertRaises(ValueError):
                runner.partition(ids)

    def execute(self, status):
        class Fixture(unittest.TestCase):
            def test_case(self):
                if status == 'failure': self.fail('Intentional local fixture')
                if status == 'skip': self.skipTest('Intentional platform fixture')
        case = Fixture('test_case')
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'report.json'
            result = runner.run_cases([case], [case.id()], 0, path, stream=io.StringIO())
            self.assertEqual(json.loads(path.read_text()), result)
            return result

    def test_actual_success_binds_every_started_and_completed_identity(self):
        result = self.execute('success')
        self.assertTrue(result['passed'] and result['complete'])
        self.assertEqual(result['selectedIDs'], result['startedIDs'])
        self.assertEqual(result['selectedIDs'], result['completedIDs'])

    def test_actual_failure_still_records_complete_coverage_and_blocks_success(self):
        result = self.execute('failure')
        self.assertTrue(result['complete'])
        self.assertFalse(result['passed'])
        self.assertEqual(result['failures'], 1)

    def test_actual_platform_skip_remains_explicit_in_the_report(self):
        result = self.execute('skip')
        self.assertTrue(result['passed'])
        self.assertEqual(len(result['skipped']), 1)
        self.assertEqual(result['skipped'][0]['reason'], 'Intentional platform fixture')

    def test_mismatched_identities_or_invalid_part_refuse_before_execution(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'report.json'
            for part, ids in [(2, []), (True, []), (0, []), (0, ['test_a.Cases.test_missing'])]:
                with self.subTest(part=part), self.assertRaises(ValueError):
                    runner.run_cases([], ids, part, path, stream=io.StringIO())
            self.assertFalse(path.exists())

    def test_an_existing_receipt_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'report.json'
            path.write_text('retained')
            case = unittest.FunctionTestCase(lambda: self.fail('Retained receipt must stop before execution'))
            with self.assertRaises(FileExistsError):
                runner.run_cases([case], [case.id()], 0, path, stream=io.StringIO())
            self.assertEqual(path.read_text(), 'retained')
