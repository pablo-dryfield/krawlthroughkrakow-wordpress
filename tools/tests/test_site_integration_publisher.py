import importlib.util
import subprocess
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('site_release',Path(__file__).resolve().parents[1]/'publish-site-integrations.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PublisherTests(unittest.TestCase):
    def test_scope_dependencies_before_activation(self):
        self.assertEqual(len(module.FILES),3)
        self.assertEqual(module.FILES[-1],'ktk-site-integrations.php')
        self.assertTrue(all('ktk-site-integrations' in name for name in module.FILES))
        self.assertEqual(module.PROTECTED,('ktk-clarity.php','ktk-homepage-shortcode.php','ktk-code-pages.php'))

    def test_authenticated_helper_is_read_only_and_private_backup_redacted(self):
        for environment in ('staging','production'):
            source=module.base.helper_source(environment,'test-token',True,owned_files=module.FILES,extra_protected=module.PROTECTED,snapshot_extension=module.extension())
            for value in (b'hash_equals',b'HTTP_X_KTK_DEPLOY_TOKEN',b'time() >',b'HTTP_HOST',b'legacy_profile',b'get_post_meta',b'ktk-clarity.php'):
                self.assertIn(value,source)
            for value in (b'update_option',b'wp_update_post',b'DELETE FROM',b'INSERT ',b'UPDATE '):self.assertNotIn(value,source)
            result=subprocess.run(['php','-l'],input=source,capture_output=True)
            self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(module.public_snapshot({'private_legacy_backup':{'secret':'original'},'safe':True}),{'safe':True})


if __name__=='__main__':unittest.main()
