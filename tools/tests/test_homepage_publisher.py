import contextlib
import ftplib
import importlib.util
import io
import json
import posixpath
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    "homepage_publisher", Path(__file__).resolve().parents[1] / "publish-homepage-shortcode.py"
)
publisher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publisher)


class FakeFTP:
    def __init__(self, files=None, corrupt=None):
        self.files = files or {}
        self.writes = []
        self.corrupt = corrupt
        self.reads = []
        self.listings = []
        self.renames = []
        self.deletes = []
        self.events = []

    def mlsd(self, directory):
        self.listings.append(directory)
        for path in self.files:
            if posixpath.dirname(path) == directory:
                yield posixpath.basename(path), {"type": "file"}

    def mkd(self, path):
        pass

    def close(self):
        pass

    def storbinary(self, command, stream):
        path = command.removeprefix("STOR ")
        self.writes.append(path)
        self.events.append(("upload", path))
        self.files[path] = stream.read()

    def retrbinary(self, command, callback):
        path = command.removeprefix("RETR ")
        self.reads.append(path)
        self.events.append(("read", path))
        if path not in self.files:
            raise ftplib.error_perm("550 Not found")
        callback(b"corrupt" if path == self.corrupt else self.files[path])

    def rename(self, source, destination):
        self.renames.append((source, destination))
        self.events.append(("rename", destination))
        if source not in self.files:
            raise ftplib.error_perm("550 Not found")
        self.files[destination] = self.files.pop(source)

    def delete(self, path):
        self.deletes.append(path)
        self.events.append(("delete", path))
        if path not in self.files:
            raise ftplib.error_perm("550 Not found")
        del self.files[path]


class HomepagePublisherTests(unittest.TestCase):
    def test_origin_cache_helper_refuses_production_and_never_calls_edge_integration(self):
        source = publisher.cache_purge_helper('fixture-token')
        self.assertNotIn(b'purge_by_url', source)
        self.assertNotIn(b'check_connection', source)
        for site in ['https://krawlthroughkrakow.com/staging/', 'https://krawlthroughkrakow.com/']:
            with self.subTest(site=site):
                stubs = '''<?php
define('ABSPATH', '.'); $GLOBALS['calls'] = array();
$_GET['_ktk_homepage_cache_purge'] = 'fixture-token';
function add_action($hook, $callback, $priority = 10) { $callback(); }
function nocache_headers() {}
function home_url($path) { return SITE_ROOT . ltrim($path, '/'); }
function site_url($path) { return home_url($path); }
function get_option($name) { return 123; }
class WP_Post { public $ID = 123; public $post_type = 'page'; }
function get_post($id) { return new WP_Post(); }
function get_page_by_path(...$args) { throw new Exception('Unexpected lookup'); }
function get_permalink($page) { return SITE_ROOT; }
function untrailingslashit($value) { return rtrim($value, '/'); }
function rocket_clean_post($id) { $GLOBALS['calls'][] = 'post:' . $id; }
function rocket_clean_home() { $GLOBALS['calls'][] = 'home'; }
function apply_filters(...$args) { throw new Exception('Edge integration must not be consulted'); }
function status_header($status) {}
function wp_send_json($data, $status = 200) { echo json_encode(array('status'=>$status,'data'=>$data,'calls'=>$GLOBALS['calls'])); exit; }
'''
                program = stubs.replace("define('ABSPATH', '.');", "define('ABSPATH', '.'); define('SITE_ROOT', '" + site + "');") + source.decode().removeprefix('<?php')
                result = subprocess.run(['php'], input=program, text=True, capture_output=True, check=True)
                value = json.loads(result.stdout)
                if '/staging/' in site:
                    self.assertEqual(value['status'], 200)
                    self.assertEqual(value['calls'], ['post:123', 'home'])
                    self.assertTrue(value['data']['origin_cache_cleared'])
                    self.assertFalse(value['data']['cloudflare_attempted'])
                    self.assertFalse(value['data']['cloudflare_purged'])
                    self.assertEqual(value['data']['edge_cache_strategy'], 'separate-authorized-mcp')
                    self.assertTrue(all(url == site.rstrip('/') or url.startswith(site) for url in value['data']['urls']))
                else:
                    self.assertEqual(value['status'], 403)
                    self.assertEqual(value['calls'], [])
                    self.assertEqual(value['data']['error'], 'exact_staging_identity_required')

    def test_assets_only_never_rewrites_posts_or_exports_production(self):
        with tempfile.TemporaryDirectory() as directory:
            ftp = FakeFTP()
            root = Path(directory)
            with (
                patch.object(publisher, 'WORKSPACE', root),
                patch.object(publisher, 'local_source', return_value=({'content_sha256': 'a' * 64}, b'original')),
                patch.object(publisher, 'write_local_files', return_value={'ktk-homepage-shortcode.php': b'owned'}),
                patch.object(publisher, 'StagingFTP', return_value=ftp),
                patch.object(publisher, 'backup_existing', return_value=None),
                patch.object(publisher, 'publish_staging_files', return_value={'ktk-homepage-shortcode.php': 'verified'}),
                patch.object(publisher, 'purge_staging_page_cache', return_value={'success': True}),
                patch.object(publisher, 'smoke_test', return_value={'status': 200}),
                patch.object(publisher, 'create_or_update_staging_page', side_effect=AssertionError('Post/settings writes prohibited')),
                patch.object(publisher, 'export_production_homepage', side_effect=AssertionError('Production prohibited')),
                patch('sys.argv', ['publisher', '--local-source', '--assets-only', '--report', 'report.json']),
                contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()),
            ):
                self.assertEqual(publisher.main(), 0)
            report = json.loads((root / 'report.json').read_text(encoding='utf-8'))
            self.assertTrue(report['staging_page']['posts_and_settings_not_rewritten'])
            self.assertEqual(report['source'], 'local')

    def test_assets_only_requires_explicit_local_source(self):
        with patch('sys.argv', ['publisher', '--assets-only']), contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as result:
                publisher.main()
            self.assertEqual(result.exception.code, 2)

    def test_local_build_never_connects_and_preserves_export(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            content = b"<?php\nreturn 'existing reference';\n"
            (root / publisher.CONTENT_FILE).write_bytes(content)
            metadata = """<?php
function ktk_homepage_shortcode_source_metadata() {
    return array(
        'source_title' => "Homepage",
        'source_exported_at' => "2026-10-06T09:46:30+00:00",
        'source_sha256' => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
}
"""
            (root / publisher.SHORTCODE_FILE).write_text(metadata, encoding="utf-8")
            template = root / "template.php"
            template.write_text(metadata, encoding="utf-8")
            assets = root / publisher.ASSETS_DIRECTORY / "images"
            assets.mkdir(parents=True)
            (assets / "hero.webp").write_bytes(b"image")
            output = io.StringIO()
            with (
                patch.object(publisher, "LOCAL_MU_PLUGINS", root),
                patch.object(publisher, "PLUGIN_TEMPLATE", template),
                patch.object(publisher.store2, "connect", side_effect=AssertionError("Network prohibited")),
                patch.object(publisher, "export_production_homepage", side_effect=AssertionError("Production prohibited")),
                patch("sys.argv", ["publisher", "--build-only"]),
                contextlib.redirect_stdout(output),
            ):
                self.assertEqual(publisher.main(), 0)
            summary = json.loads(output.getvalue())
            self.assertEqual(summary["source"], "local")
            self.assertIn("ktk-homepage-assets/images/hero.webp", summary["local_files"])
            self.assertEqual((root / publisher.CONTENT_FILE).read_bytes(), content)

    def test_assets_are_uploaded_and_verified_before_renderer(self):
        ftp = FakeFTP()
        files = {
            publisher.SHORTCODE_FILE: b"renderer",
            "ktk-homepage-assets/images/hero.webp": b"image",
            "ktk-homepage-assets/site.css": b"styles",
            publisher.CONTENT_FILE: b"reference",
        }
        hashes = publisher.publish_staging_files(ftp, files)
        self.assertEqual(len(hashes), len(files))
        renderer = publisher.staging_path(publisher.SHORTCODE_FILE)
        temporary = ftp.writes[-1]
        self.assertTrue(temporary.startswith(renderer + ".upload-"))
        self.assertTrue(temporary.endswith(".tmp"))
        self.assertNotIn(renderer, ftp.writes)
        self.assertEqual(ftp.renames[-1], (temporary, renderer))
        self.assertEqual([destination for _, destination in ftp.renames], [
            publisher.staging_path(publisher.CONTENT_FILE), renderer,
        ])
        upload_index = ftp.events.index(("upload", temporary))
        rename_index = ftp.events.index(("rename", renderer))
        for name in files:
            if name != publisher.SHORTCODE_FILE:
                self.assertLess(ftp.events.index(("read", publisher.staging_path(name))), upload_index)
        self.assertLess(ftp.events.index(("read", temporary)), rename_index)
        self.assertEqual(ftp.files[renderer], b"renderer")
        self.assertNotIn(temporary, ftp.files)
        self.assertTrue(all(path.startswith(publisher.STAGING_MU_PLUGINS + "/") for path in ftp.writes))

    def test_interrupted_renderer_upload_keeps_live_file_and_cleans_temporary(self):
        class InterruptedFTP(FakeFTP):
            def storbinary(self, command, stream):
                super().storbinary(command, io.BytesIO(stream.read(3)))
                raise ftplib.error_temp("451 Upload interrupted")
        renderer = publisher.staging_path(publisher.SHORTCODE_FILE)
        ftp = InterruptedFTP({renderer: b"old renderer"})
        with self.assertRaisesRegex(ftplib.error_temp, "Upload interrupted"):
            publisher.publish_staging_files(ftp, {publisher.SHORTCODE_FILE: b"new renderer"})
        self.assertEqual(ftp.files, {renderer: b"old renderer"})
        self.assertEqual(ftp.renames, [])
        self.assertEqual(ftp.deletes, ftp.writes)

    def test_corrupt_temporary_renderer_never_replaces_live_file(self):
        renderer = publisher.staging_path(publisher.SHORTCODE_FILE)
        temporary = renderer + ".upload-fixed.tmp"
        ftp = FakeFTP({renderer: b"old renderer"}, corrupt=temporary)
        with patch.object(publisher.secrets, "token_hex", return_value="fixed"):
            with self.assertRaisesRegex(RuntimeError, "checksum mismatch"):
                publisher.publish_staging_files(ftp, {publisher.SHORTCODE_FILE: b"new renderer"})
        self.assertEqual(ftp.files, {renderer: b"old renderer"})
        self.assertEqual(ftp.renames, [])
        self.assertEqual(ftp.deletes, [temporary])

    def test_failed_rename_keeps_live_renderer_without_delete_first_fallback(self):
        class RejectedRenameFTP(FakeFTP):
            def rename(self, source, destination):
                raise ftplib.error_perm("550 Rename rejected")
        renderer = publisher.staging_path(publisher.SHORTCODE_FILE)
        ftp = RejectedRenameFTP({renderer: b"old renderer"})
        with self.assertRaisesRegex(ftplib.error_perm, "Rename rejected"):
            publisher.publish_staging_files(ftp, {publisher.SHORTCODE_FILE: b"new renderer"})
        self.assertEqual(ftp.files, {renderer: b"old renderer"})
        self.assertEqual(ftp.deletes, ftp.writes)
        self.assertNotIn(renderer, ftp.deletes)

    def test_lost_rename_reply_accepts_verified_live_renderer(self):
        class LostReplyFTP(FakeFTP):
            def rename(self, source, destination):
                super().rename(source, destination)
                raise ConnectionResetError("Rename reply lost")
        renderer = publisher.staging_path(publisher.SHORTCODE_FILE)
        ftp = LostReplyFTP({renderer: b"old renderer"})
        hashes = publisher.publish_staging_files(ftp, {publisher.SHORTCODE_FILE: b"new renderer"})
        self.assertEqual(len(hashes), 1)
        self.assertEqual(ftp.files, {renderer: b"new renderer"})
        self.assertNotIn(renderer, ftp.writes)
        self.assertEqual(ftp.deletes, [])

    def test_staging_ftp_delegates_renderer_rename(self):
        connection = FakeFTP({"/temporary": b"renderer", "/live": b"old renderer"})
        ftp = publisher.StagingFTP(factory=lambda: connection)
        ftp.rename("/temporary", "/live")
        self.assertEqual(connection.files, {"/live": b"renderer"})
        self.assertEqual(connection.renames, [("/temporary", "/live")])

    def test_corrupt_asset_prevents_renderer_replacement(self):
        asset = "ktk-homepage-assets/site.js"
        ftp = FakeFTP(corrupt=publisher.staging_path(asset))
        with self.assertRaisesRegex(RuntimeError, "checksum mismatch"):
            publisher.publish_staging_files(ftp, {publisher.SHORTCODE_FILE: b"new", asset: b"script"})
        self.assertNotIn(publisher.staging_path(publisher.SHORTCODE_FILE), ftp.writes)

    def test_php_dependency_is_atomically_replaced_before_renderer(self):
        dependency = "ktk-homepage-assets/integrations.php"
        destination = publisher.staging_path(dependency)
        renderer = publisher.staging_path(publisher.SHORTCODE_FILE)
        ftp = FakeFTP({destination: b"old integrations", renderer: b"old renderer"})
        publisher.publish_staging_files(ftp, {dependency: b"new integrations", publisher.SHORTCODE_FILE: b"new renderer"})
        self.assertEqual([target for _, target in ftp.renames], [destination, renderer])
        self.assertNotIn(destination, ftp.writes)
        self.assertNotIn(destination, ftp.deletes)
        self.assertEqual(ftp.files[destination], b"new integrations")

    def test_corrupt_temporary_php_dependency_keeps_active_php_intact(self):
        dependency = "ktk-homepage-assets/integrations.php"
        destination = publisher.staging_path(dependency)
        renderer = publisher.staging_path(publisher.SHORTCODE_FILE)
        temporary = destination + ".upload-fixed.tmp"
        original = {destination: b"old integrations", renderer: b"old renderer"}
        ftp = FakeFTP(dict(original), corrupt=temporary)
        with patch.object(publisher.secrets, "token_hex", return_value="fixed"):
            with self.assertRaisesRegex(RuntimeError, "[Cc]hecksum mismatch"):
                publisher.publish_staging_files(ftp, {dependency: b"new integrations", publisher.SHORTCODE_FILE: b"new renderer"})
        self.assertEqual(ftp.files, original)
        self.assertEqual(ftp.renames, [])
        self.assertEqual(ftp.deletes, [temporary])

    def test_backup_includes_overwritten_assets(self):
        asset = "ktk-homepage-assets/site.css"
        ftp = FakeFTP({publisher.staging_path(asset): b"old styles"})
        with tempfile.TemporaryDirectory() as directory, patch.object(publisher, "WORKSPACE", Path(directory)):
            backup = publisher.backup_existing(ftp, [asset, publisher.SHORTCODE_FILE])
            with zipfile.ZipFile(backup) as archive:
                self.assertEqual(archive.read(asset), b"old styles")
                self.assertEqual(json.loads(archive.read("release-manifest.json"))["file_count"], 1)

    def test_invalid_payload_is_rejected_before_any_upload(self):
        for name in ("../production.php", "ktk-homepage-assets/../../escape.php", "/public_html/production.php", "other-plugin.php"):
            with self.subTest(name=name):
                ftp = FakeFTP()
                with self.assertRaises(ValueError):
                    publisher.publish_staging_files(ftp, {publisher.SHORTCODE_FILE: b"new", name: b"unexpected"})
                self.assertEqual(ftp.writes, [])

    def test_backup_does_not_request_each_new_asset(self):
        asset = "ktk-homepage-assets/site.css"
        ftp = FakeFTP({publisher.staging_path(asset): b"old styles"})
        names = [asset] + [f"ktk-homepage-assets/parity/font-{index}.woff2" for index in range(180)]
        with tempfile.TemporaryDirectory() as directory, patch.object(publisher, "WORKSPACE", Path(directory)):
            publisher.backup_existing(ftp, names)
        self.assertEqual(ftp.reads, [publisher.staging_path(asset)])
        self.assertEqual(len(ftp.listings), 2)

    def test_upload_creates_each_parent_only_once(self):
        ftp = FakeFTP()
        files = {publisher.SHORTCODE_FILE: b"renderer"}
        files.update({f"ktk-homepage-assets/parity/font-{index}.woff2": b"font" for index in range(20)})
        with patch.object(publisher.store2, "ensure_dir") as ensure:
            publisher.publish_staging_files(ftp, files)
        self.assertEqual(ensure.call_count, 2)

    def test_download_retry_discards_partial_bytes(self):
        class InterruptedFTP(FakeFTP):
            def retrbinary(self, command, callback):
                callback(b"partial")
                raise ConnectionResetError("interrupted")
        connections = iter([InterruptedFTP(), FakeFTP({"/test": b"complete"})])
        ftp = publisher.StagingFTP(factory=lambda: next(connections))
        output = io.BytesIO()
        with patch.object(publisher.time, "sleep"):
            ftp.retrbinary("RETR /test", output.write)
        self.assertEqual(output.getvalue(), b"complete")

    def test_upload_retry_rewinds_stream(self):
        class InterruptedFTP(FakeFTP):
            def storbinary(self, command, stream):
                stream.read(3)
                raise ConnectionResetError("interrupted")
        complete = FakeFTP()
        connections = iter([InterruptedFTP(), complete])
        ftp = publisher.StagingFTP(factory=lambda: next(connections))
        with patch.object(publisher.time, "sleep"):
            ftp.storbinary("STOR /test", io.BytesIO(b"complete"))
        self.assertEqual(complete.files["/test"], b"complete")

    def test_transfer_limit_renews_connection(self):
        first = FakeFTP({"/test": b"first"})
        second = FakeFTP({"/test": b"second"})
        connections = iter([first, second])
        ftp = publisher.StagingFTP(factory=lambda: next(connections), transfer_limit=1)
        received = []
        ftp.retrbinary("RETR /test", received.append)
        ftp.retrbinary("RETR /test", received.append)
        self.assertEqual(received, [b"first", b"second"])

    def test_matching_files_are_verified_without_rewriting(self):
        files = {publisher.SHORTCODE_FILE: b"renderer", "ktk-homepage-assets/site.css": b"styles"}
        ftp = FakeFTP({publisher.staging_path(name): content for name, content in files.items()})
        hashes = publisher.publish_staging_files(ftp, files)
        self.assertEqual(len(hashes), 2)
        self.assertEqual(ftp.writes, [])


if __name__ == "__main__":
    unittest.main()
