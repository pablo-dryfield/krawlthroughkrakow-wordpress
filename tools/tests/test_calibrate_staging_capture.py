"""Contracts for retained, complete calibration evidence, not performance claims."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

from tools import calibrate_staging_capture as calibration


class CalibrationEvidenceTests(unittest.TestCase):
    def test_balanced_order_and_explicit_bounded_pair_count(self):
        self.assertEqual(calibration.ordered_arms(3), ['original', 'candidate', 'candidate', 'original', 'original', 'candidate'])
        for invalid in [0, 4, True, None]:
            with self.subTest(value=invalid), self.assertRaises(ValueError):
                calibration.ordered_arms(invalid)

    def test_comparison_removes_only_timestamp_without_mutating_raw_observation(self):
        state = {'capturedAt': 'actual-time', 'database': {'raw': ['complete']}, 'identity': {'public': 0}}
        before = copy.deepcopy(state)
        self.assertEqual(calibration.comparable(state), {'database': {'raw': ['complete']}, 'identity': {'public': 0}})
        self.assertEqual(state, before)
        for invalid in [{}, {'capturedAt': None}]:
            with self.assertRaises(ValueError):
                calibration.comparable(invalid)

    def test_capture_validator_refuses_changed_state_queries_or_memory_bound(self):
        golden = {'database': {'seven': 'raw tables'}}
        queries = ['SELECT * FROM fixture_' + str(n) for n in range(7)]
        value = {'ok': True, 'state': {'capturedAt': 'actual', **golden}, 'queries': queries,
                 'metrics': {'captureNanoseconds': 1, 'peakAllocatedBytes': 1024, 'memoryLimit': '256M',
                             'phpVersion': 'native', 'platform': 'native', 'opensslAvailable': True, 'opensslVersion': 'native'}}
        calibration.validate_capture(value, golden, queries)
        variants = []
        for key, changed in [('state', {'capturedAt': 'actual', 'database': {}}), ('queries', queries[:-1]), ('ok', False)]:
            variants.append({**value, key: changed})
        variants += [{**value, 'queries': ['SELECT * FROM fixture_other'] * 7},
                     {**value, 'metrics': {**value['metrics'], 'memoryLimit': '512M'}},
                     {**value, 'metrics': {**value['metrics'], 'peakAllocatedBytes': calibration.MEMORY_BYTES}},
                     {**value, 'metrics': {**value['metrics'], 'captureNanoseconds': 0}}]
        for variant in variants:
            with self.subTest(value=variant), self.assertRaises(ValueError):
                calibration.validate_capture(variant, golden, queries)

    def test_new_archive_contains_exact_complete_raw_members_and_cannot_overwrite(self):
        with tempfile.TemporaryDirectory(prefix='ktk-calibration-evidence-') as folder:
            path = Path(folder) / 'evidence.zip'
            payloads = {'01-original.json': b'complete\x00original', '02-candidate.json': b'complete candidate'}
            receipt = calibration.artifact_write(path, payloads)
            self.assertTrue(receipt['completeMemberReadbackAndCRCVerified'])
            with zipfile.ZipFile(path) as archive:
                self.assertEqual({name: archive.read(name) for name in archive.namelist()}, payloads)
            original = path.read_bytes()
            with self.assertRaises(ValueError):
                calibration.artifact_write(path, {'replacement': b'refused'})
            self.assertEqual(path.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
