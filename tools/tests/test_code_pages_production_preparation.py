import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('preparation', Path(__file__).resolve().parents[1] / 'prepare-code-pages-production.py')
module = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(module)


class FakeFTP:
    def retrbinary(self, command, callback): callback(b'owned')
    def mlsd(self, directory): return []
    def close(self): pass


class PreparationTests(unittest.TestCase):
    def test_only_owned_production_reads(self):
        for path in [module.REMOTE + '/ktk-code-pages.php', module.REMOTE + '/ktk-code-pages-assets/pages/contact.php']:
            self.assertTrue(module.allowed_path(path))
        for path in ['/public_html/wp-config.php', module.REMOTE + '/ktk-homepage-shortcode.php', module.REMOTE + '/ktk-code-pages-assets/../private', module.REMOTE + '/ktk-code-pages-assets//private']:
            self.assertFalse(module.allowed_path(path))

    def test_proxy_rejects_all_mutations(self):
        ftp = module.ReadOnlyFTP(FakeFTP())
        for name in ['storbinary', 'delete', 'rename', 'mkd', 'sendcmd', 'voidcmd']:
            with self.assertRaises(PermissionError): getattr(ftp, name)

    def test_reads_are_path_scoped(self):
        ftp = module.ReadOnlyFTP(FakeFTP())
        result = []
        ftp.retrbinary('RETR ' + module.REMOTE + '/ktk-code-pages.php', result.append)
        self.assertEqual(result, [b'owned'])
        with self.assertRaises(PermissionError): ftp.retrbinary('STOR /public_html/wp-config.php', result.append)
        with self.assertRaises(PermissionError): ftp.mlsd('/public_html')


if __name__ == '__main__': unittest.main()
