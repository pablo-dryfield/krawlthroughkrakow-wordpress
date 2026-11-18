"""Opt-in preparation capture; legacy defaults and every state field remain."""
import copy
import hashlib
from pathlib import Path
import shutil
import tempfile
import time
import types
import unittest
from unittest import mock

from tools import full_private_seed_packet as seed
from tools import full_private_engine_packet as engine
from tools import staging_state_fast_capture as fast
from tools.tests import test_full_private_engine_preparation as native

ROOT = Path(__file__).resolve().parents[2]
FROZEN = {'full_private_seed_packet.py': '4b9e329c431a0e8bbc6e7ba5560515d39ccde047b9da43ba8b766fe38c9cf256',
          'full_private_engine_packet.py': '422506ccee365d1b1cb48119b705350ee7c7f2d3832f98520ace477c925fbea3'}


def arguments():
    owned = {name: hashlib.sha256(name.encode()).hexdigest() for name in
             ['ktk-code-pages.php', 'ktk-code-pages-assets/registry.php', 'ktk-code-pages-assets/runtime.css',
              'ktk-code-pages-assets/runtime.js', 'ktk-code-pages-assets/content/example.html']}
    return ('ktk-transaction-rehearsal-' + 'a' * 32 + '.php', 't' * 43, int(time.time()) + 120,
            'c' * 40, owned, {name: 1 for name in owned}, 'e' * 64, 'b' * 64)


def frozen_factory(name):
    path = 'tools/' + name
    raw = (ROOT / path).read_bytes()
    changes = [
        (b",capture_profile='raw'):", b'):'),
        (b"    if capture_profile not in ('raw','bounded-sha256'):raise ValueError('Explicit reviewed private capture profile required')\n", b''),
    ]
    if name == 'full_private_seed_packet.py':
        changes += [(b'from tools import staging_state_fast_capture as fast_capture\n', b''),
                    (b"        if part=='STATE' and capture_profile=='bounded-sha256':body=fast_capture.embedded(body)\n", b'')]
    else:
        changes += [(b"        if name=='STATE' and capture_profile=='bounded-sha256':body=full.fast_capture.embedded(body)\n", b'')]
    for current, previous in changes:
        if raw.count(current) != 1:
            raise ValueError('Exact complete preparation compiler inverse required')
        raw = raw.replace(current, previous, 1)
    if hashlib.sha256(raw).hexdigest() != FROZEN[name]:
        raise ValueError('Preparation compiler changed outside its explicit capture profile')
    module = types.ModuleType('ktk_frozen_preparation_factory')
    module.__file__ = str(ROOT / path)
    exec(compile(raw, module.__file__, 'exec'), module.__dict__)
    return module


class PrivatePreparationCaptureCompilerTests(unittest.TestCase):
    def test_both_legacy_defaults_reproduce_frozen_helper_bytes(self):
        args = arguments()
        for module, name in [(seed, 'full_private_seed_packet.py'), (engine, 'full_private_engine_packet.py')]:
            with self.subTest(factory=name):
                old = frozen_factory(name).helper_source(*args)
                self.assertTrue(module.helper_source(*args) == old, 'Legacy default helper bytes must remain exact')
                self.assertTrue(module.helper_source(*args, capture_profile='raw') == old, 'Explicit raw helper bytes must remain exact')

    def test_opt_in_changes_only_the_complete_capture_component(self):
        args = arguments()
        original = fast.SOURCE.read_bytes()[6:]
        derived = fast.TARGET.read_bytes()[6:]
        for module in [seed, engine]:
            raw = module.helper_source(*args)
            bounded = module.helper_source(*args, capture_profile='bounded-sha256')
            self.assertEqual(raw.count(original), 1)
            self.assertEqual(bounded.count(derived), 1)
            self.assertTrue(bounded.replace(derived, original, 1) == raw, 'Complete helper inverse must preserve every other byte')
        for profile in ['late', 'early']:
            raw = seed.helper_source(*args, entry_profile=profile)
            bounded = seed.helper_source(*args, entry_profile=profile, capture_profile='bounded-sha256')
            self.assertTrue(bounded.replace(derived, original, 1) == raw, 'Entry profile and all other components must remain exact')

    def test_unknown_profile_refuses_before_compilation(self):
        args = arguments()
        for module in [seed, engine]:
            for invalid in [None, True, 'production', 'fast', ['raw']]:
                with self.subTest(factory=module.__name__, profile=invalid), self.assertRaises(ValueError):
                    module.helper_source(*args, capture_profile=invalid)

    def test_changed_or_missing_derived_output_cannot_be_embedded_or_overwritten(self):
        args = arguments()
        with tempfile.TemporaryDirectory(prefix='ktk-private-preparation-capture-') as folder:
            path = Path(folder) / 'derived.php'
            for content in [None, b'preserve unreviewed existing output']:
                if content is not None:
                    path.write_bytes(content)
                with mock.patch.object(fast, 'TARGET', path):
                    for module in [seed, engine]:
                        with self.assertRaises(ValueError):
                            module.helper_source(*args, capture_profile='bounded-sha256')
                        # The old explicit default remains independent of an optional output.
                        self.assertTrue(module.helper_source(*args).startswith(b'<?php\n'))
                if content is None:
                    self.assertFalse(path.exists())
                else:
                    self.assertEqual(path.read_bytes(), content)

    def test_changed_raw_scope_refuses_the_embedding(self):
        with self.assertRaises(ValueError):
            fast.embedded(fast.SOURCE.read_bytes() + b'changed')
        self.assertEqual(fast.inverse(fast.embedded(fast.SOURCE.read_bytes())), fast.SOURCE.read_bytes())


class PrivatePreparationCaptureNativeTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(shutil.which('php'), 'Real PHP required; no skipped opt-in preparation proof')
        self.case = native.FullPrivatePreparationIntegrationTests('runTest')
        self.case.setUp()
        self.addCleanup(self.case.doCleanups)
        self.case.cfg['operation'] = 'snapshot'
        old = self.case.case.call(self.case.root, self.case.driver, self.case.cfg)
        self.case.cfg['captureComponent'] = fast.TARGET.as_posix()
        new = self.case.case.call(self.case.root, self.case.driver, self.case.cfg)
        self.assertTrue(old['ok'] and new['ok'])
        a, b = copy.deepcopy(old['state']), copy.deepcopy(new['state'])
        self.assertIsInstance(a.pop('capturedAt'), str)
        self.assertIsInstance(b.pop('capturedAt'), str)
        self.assertEqual(a, b)
        self.case.cfg['operation'] = 'controller'

    def test_original_archive_still_precedes_every_payload_copy(self):
        self.case.test_real_stream_is_gated_by_independent_original_archive_before_any_payload()

    def test_partial_original_copy_resumes_into_complete_private_preparation(self):
        self.case.test_real_original_prefix_inspection_resume_and_complete_engine_preparation()

    def test_final_preparation_rejects_and_preserves_unknown_private_evidence(self):
        self.case.test_final_full_preparation_inspection_rejects_and_preserves_unknown_private_prior()


if __name__ == '__main__':
    unittest.main()
