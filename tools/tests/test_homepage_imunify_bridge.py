import importlib.util
import unittest
from pathlib import Path


TOOLS = Path(__file__).resolve().parents[1]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


bridge = load_module(
    "homepage_imunify_browser_bridge",
    TOOLS / "homepage-imunify-browser-bridge.py",
)
promotion = bridge.load_promotion_module()


class HomepageImunifyBridgeTests(unittest.TestCase):
    def assert_captured(self, source):
        result = bridge.capture_response(source, "bridge-status.json", "test-token")
        text = result.decode("utf-8")
        self.assertIn("$_GET['_ktk_browser_token']", text)
        self.assertIn("hash_equals( 'test-token'", text)
        self.assertNotIn("HTTP_X_KTK_DEPLOY_TOKEN", text)
        self.assertIn("bridge-status.json", text)
        self.assertEqual(text.count("ob_start( function ( $buffer )"), 1)
        self.assertEqual(text.count("nocache_headers();"), 1)

    def test_snapshot_helper_uses_expiring_query_guard_and_capture(self):
        self.assert_captured(promotion.snapshot_helper("test-token"))

    def test_cache_helper_uses_expiring_query_guard_and_capture(self):
        self.assert_captured(promotion.cache_purge_helper("test-token"))

    def test_unexpected_source_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "deploy-token guard"):
            bridge.capture_response(b"<?php nocache_headers();", "x.json", "token")


if __name__ == "__main__":
    unittest.main()
