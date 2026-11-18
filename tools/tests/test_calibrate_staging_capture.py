"""Contracts for retained, complete calibration evidence, not performance claims."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
from unittest import mock

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


class CalibrationProfileTests(unittest.TestCase):
    def test_default_profile_is_the_complete_unchanged_raw_and_reviewed32_components(self):
        arms = calibration.profile_components('raw-vs-bounded32')
        self.assertEqual(arms, {'original': calibration.fast.SOURCE.read_bytes(),
                                'candidate': calibration.fast.TARGET.read_bytes()})

    def test64_profile_changes_only_the_single_file_eligibility_cap_and_keeps_raw_inverse(self):
        arms = calibration.profile_components('bounded32-vs-bounded64')
        self.assertEqual(arms['original'], calibration.fast.TARGET.read_bytes())
        self.assertEqual(arms['candidate'].replace(b'$size > 67108864', b'$size > 33554432', 1), arms['original'])
        self.assertEqual(calibration.fast.inverse(arms['original']), calibration.fast.SOURCE.read_bytes())
        self.assertEqual(arms['candidate'].count(b'$size > 67108864'), 1)
        self.assertIn(b'memory_get_usage(true) + 2 * $size + 16777216 > $limit', arms['candidate'])

    def test_unknown_or_implicit_profiles_refuse(self):
        for value in [None, True, 64, 'bounded128', '']:
            with self.subTest(profile=value), self.assertRaises(ValueError):
                calibration.profile_components(value)

    def _native64(self, **changes):
        from tools.tests import test_staging_state_fast_capture as native
        original = native.RUNNER
        block = calibration.fast.BLOCK
        self.assertEqual(original.count(block), 1)
        prototype = original.replace(block, block.replace('$size > 33554432', '$size > 67108864', 1), 1)
        video = calibration.MU / 'ktk-code-pages-assets/media/18854e1563e7-296000019_1966572713552259_6697817437301808173_n.mp4'
        data = video.read_bytes()
        self.assertEqual(len(data), 35437747)
        with mock.patch.object(native, 'RUNNER', prototype):
            result = native.StagingFastCaptureTests('runTest').run_hash(data, **changes)
        self.assertEqual(result['digest'], calibration.sha(data))
        self.assertEqual(result['memoryLimit'], '256M')
        self.assertLess(result['peakAllocatedBytes'], calibration.MEMORY_BYTES)
        return result

    def test_native64_reads_and_hashes_complete_newly_eligible_video(self):
        result = self._native64()
        if result['actualOpenSSLAvailable']:
            self.assertEqual(result['opensslCalls'], 1)
            self.assertEqual(result['fallbackCalls'], 0)
            self.assertEqual(result['readLimits'], [35437748])
        else:
            self.assertEqual(result['fallbackCalls'], 1)

    def test_native64_keeps_original_memory_guard_and_complete_streaming_fallback(self):
        result = self._native64(setting='40M')
        self.assertEqual(result['opensslCalls'], 0)
        self.assertEqual(result['fallbackCalls'], 1)
        self.assertEqual(result['readLimits'], [])


if __name__ == '__main__':
    unittest.main()
