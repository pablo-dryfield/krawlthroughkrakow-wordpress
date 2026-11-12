import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('probe_cleanup', ROOT / 'tools/cleanup-expired-page-probes.py')
cleanup = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cleanup)


class ExpiredProbeCleanupTests(unittest.TestCase):
    def test_only_exact_known_expired_payloads_are_recognized(self):
        manifest = cleanup.json.loads((ROOT / 'docs/code-pages/full-migration/manifest.json').read_text())
        payload = cleanup.pages.probe_helper('a' * 48, manifest)
        payload = cleanup.re.sub(rb'time\(\) > \d+', b'time() > 100', payload)
        self.assertTrue(cleanup.recognized(payload, 90, 110))
        self.assertFalse(cleanup.recognized(payload, 101, 110))
        self.assertFalse(cleanup.recognized(payload, 90, 99))
        self.assertFalse(cleanup.recognized(payload + b'changed', 90, 110))
        self.assertFalse(cleanup.recognized(payload.replace(b"'/staging'", b"'/'"), 90, 110))


if __name__ == '__main__':
    unittest.main()
