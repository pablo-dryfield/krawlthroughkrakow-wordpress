import importlib.util
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('clarity_publisher', Path(__file__).resolve().parents[1] / 'publish-clarity.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FTP:
    def __init__(self): self.files = {'/mu/existing.php': b'original'}
    def storbinary(self, command, stream): self.files[command[5:]] = stream.read()
    def retrbinary(self, command, callback): callback(self.files[command[5:]])
    def rename(self, source, target): self.files[target] = self.files.pop(source)
    def delete(self, target): del self.files[target]
    def mlsd(self, root): return [(key.rsplit('/',1)[1], {'type':'file'}) for key in self.files if key.rsplit('/',1)[0] == root]


class PublisherTests(unittest.TestCase):
    def test_exact_integration_allowlist(self):
        self.assertEqual(len(module.local_payload()), 5)
        self.assertFalse(any('storefront/' in name for name in module.FILES))
        self.assertEqual(module.remote_root('production'), '/public_html/wp-content/mu-plugins')
        self.assertEqual(module.remote_root('staging'), '/public_html/staging/wp-content/mu-plugins')
        with self.assertRaises(ValueError): module.remote_root('../other')

    def test_helper_auth_host_expiry_and_database_immutable(self):
        for environment in ('production', 'staging'):
            source = module.helper_source(environment, 'test-token', True)
            for value in (b'hash_equals', b'HTTP_X_KTK_DEPLOY_TOKEN', b'time() >', b'HTTP_HOST', b'home_url', b'rocket_clean_domain', b'wordpress_state_sha256', b'protected'):
                self.assertIn(value, source)
            for value in (b'update_option', b'wp_update_post', b'DELETE FROM', b'UPDATE ', b'INSERT '):
                self.assertNotIn(value, source)
            result = subprocess.run(['php', '-l'], input=source, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_atomic_upload_verified_and_temporary_removed(self):
        ftp = FTP()
        module.atomic_upload(ftp, '/mu/existing.php', b'new')
        self.assertEqual(ftp.files, {'/mu/existing.php': b'new'})

    def test_corruption_preserves_active_file(self):
        ftp = FTP()
        with patch.object(module.common, 'retrieve_file', return_value=b'corrupt'):
            with self.assertRaises(RuntimeError): module.atomic_upload(ftp, '/mu/existing.php', b'new')
        self.assertEqual(ftp.files, {'/mu/existing.php': b'original'})


if __name__ == '__main__': unittest.main()
