import importlib.util
import pathlib
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('store_publisher', pathlib.Path(__file__).parents[1] / 'publish-store2.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class StorefrontCacheScopeTests(unittest.TestCase):
    def test_staging_never_clears_production_or_homepage(self):
        with patch.object(publisher, 'remove_tree', return_value=True) as remove:
            publisher.clear_store2_cache(object(), staging=True)
        paths = [call.args[1] for call in remove.call_args_list]
        self.assertEqual(paths, [
            '/public_html/staging/wp-content/cache/wp-rocket/krawlthroughkrakow.com/staging/store2',
            '/public_html/staging/wp-content/cache/wp-rocket/krawlthroughkrakow.com/store2',
        ])

    def test_production_only_clears_its_storefront(self):
        with patch.object(publisher, 'remove_tree', return_value=True) as remove:
            publisher.clear_store2_cache(object())
        self.assertTrue(all(call.args[1] == '/public_html/wp-content/cache/wp-rocket/krawlthroughkrakow.com/store2' for call in remove.call_args_list))

    def test_rejects_parent_traversal_before_deletion(self):
        with patch.object(publisher, 'CACHE_TARGETS', ('/public_html/wp-content/cache/wp-rocket/krawlthroughkrakow.com/../store2',)):
            with patch.object(publisher, 'remove_tree') as remove:
                with self.assertRaises(RuntimeError):
                    publisher.clear_store2_cache(object())
                remove.assert_not_called()


if __name__ == '__main__':
    unittest.main()
