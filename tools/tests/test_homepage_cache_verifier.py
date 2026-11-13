import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class HomepageCacheVerifierTests(unittest.TestCase):
    def test_offline_cache_and_blocked_request_policies(self):
        result = subprocess.run(['node', '--test', 'tools/tests/test_homepage_cache_verifier.mjs',
                                 'tools/tests/test_blocked_browser_request_policy.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
