import contextlib
import ftplib
import importlib.util
import io
import json
import posixpath
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    "homepage_production_publisher", Path(__file__).resolve().parents[1] / "promote-homepage-production.py"
)
publisher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publisher)


class FakeFTP:
    def __init__(self, files=None, corrupt=None):
        self.files = dict(files or {})
        self.events = []
        self.corrupt = corrupt

    def mlsd(self, directory):
        children = {}
        for path in self.files:
            if path.startswith(directory + "/"):
                rest = path[len(directory) + 1:]
                children[rest.split("/")[0]] = "dir" if "/" in rest else "file"
        return [(name, {"type": kind}) for name, kind in children.items()]

    def mkd(self, path):
        self.events.append(("mkdir", path))

    def storbinary(self, command, stream):
        path = command.removeprefix("STOR ")
        self.events.append(("write", path))
        self.files[path] = stream.read()

    def retrbinary(self, command, callback):
        path = command.removeprefix("RETR ")
        self.events.append(("read", path))
        if path not in self.files:
            raise ftplib.error_perm("550 Not found")
        callback(b"corrupt" if path == self.corrupt else self.files[path])

    def rename(self, source, destination):
        self.events.append(("rename", destination))
        self.files[destination] = self.files.pop(source)

    def delete(self, path):
        self.events.append(("delete", path))
        if path not in self.files:
            raise ftplib.error_perm("550 Not found")
        del self.files[path]

    def close(self):
        pass


def state():
    return {
        "home_url": publisher.URL, "site_url": publisher.URL,
        "content_url": publisher.URL + "wp-content/", "environment": "production", "blog_public": 1,
        "state_sha256": "a" * 64, "state": {
            "front_page": {"ID": 278, "post_type": "page", "post_status": "publish", "post_content": "original Divi"},
            "front_page_meta": {"_et_pb_use_builder": ["on"]},
            "options": {"home": publisher.URL.rstrip("/"), "siteurl": publisher.URL.rstrip("/"),
                "show_on_front": "page", "page_on_front": "278", "et_divi": {"integration": "original scripts"}},
        },
    }


class ProductionPublisherTests(unittest.TestCase):
    def setUp(self):
        self.files = {publisher.RENDERER: b"new renderer", publisher.ASSETS + "/hero.css": b"styles"}

    def staging_ftp(self):
        return FakeFTP({publisher.homepage.staging_path(name): value for name, value in self.files.items()})

    def test_path_allowlist_prevents_other_plugins_or_traversal(self):
        for name in ("other.php", "../other.php", publisher.ASSETS + "/../other.php", "/root.php", "ktk-homepage-assets\\bad.php"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                publisher.production_path(name)
        self.assertEqual(publisher.production_path(publisher.RENDERER), publisher.ROOT + "/" + publisher.RENDERER)

    def test_invalid_payload_has_no_writes(self):
        ftp = FakeFTP()
        with self.assertRaises(ValueError):
            publisher.publish_files(ftp, {**self.files, "other.php": b"no"})
        self.assertEqual(ftp.events, [])

    def test_reads_all_owned_remote_assets_but_not_other_plugins(self):
        ftp = FakeFTP({
            publisher.production_path(publisher.RENDERER): b"renderer",
            publisher.production_path(publisher.ASSETS + "/legacy/nested.css"): b"old",
            publisher.ROOT + "/unrelated.php": b"untouched",
        })
        owned = publisher.read_owned_files(ftp, publisher.ROOT)
        self.assertEqual(set(owned), {publisher.RENDERER, publisher.ASSETS + "/legacy/nested.css"})
        self.assertNotIn(("read", publisher.ROOT + "/unrelated.php"), ftp.events)

    def test_staging_comparison_checks_exact_payload(self):
        ftp = self.staging_ftp()
        self.assertEqual(len(publisher.staging_matches(ftp, self.files)), 2)
        ftp.files[publisher.homepage.staging_path(publisher.ASSETS + "/extra.css")] = b"extra"
        with self.assertRaisesRegex(RuntimeError, "payload mismatch"):
            publisher.staging_matches(ftp, self.files)

    def test_remote_listing_permission_denied_does_not_create_empty_backup(self):
        class DeniedFTP(FakeFTP):
            def mlsd(self, directory):
                raise ftplib.error_perm("550 Permission denied")
        with self.assertRaisesRegex(ftplib.error_perm, "Permission denied"):
            publisher.read_owned_files(DeniedFTP(), publisher.ROOT)

    def test_staging_mismatch_stops_before_snapshot_or_production_write(self):
        ftp = self.staging_ftp()
        ftp.files[publisher.homepage.staging_path(publisher.RENDERER)] = b"different"
        with tempfile.TemporaryDirectory() as directory, patch.object(publisher, "snapshot") as snapshot:
            with self.assertRaisesRegex(RuntimeError, "payload mismatch"):
                publisher.promote(ftp, self.files, True, Path(directory) / "report.json")
            snapshot.assert_not_called()
        self.assertFalse(any(event[0] in ("write", "delete", "rename") for event in ftp.events))

    def test_default_dry_run_does_not_publish_backup_or_purge(self):
        ftp = self.staging_ftp()
        with tempfile.TemporaryDirectory() as directory, patch.object(publisher, "snapshot", return_value=state()), \
                patch.object(publisher, "publish_files") as publish, patch.object(publisher, "write_backup") as backup, \
                patch.object(publisher, "transient_helper") as helper:
            report = publisher.promote(ftp, self.files, False, Path(directory) / "report.json")
            self.assertEqual(report["phase"], "dry-run-complete")
            publish.assert_not_called()
            backup.assert_not_called()
            helper.assert_not_called()
        self.assertFalse(any(event[0] in ("write", "delete", "rename") for event in ftp.events))

    def test_cli_requires_explicit_publish_flag(self):
        with patch.object(publisher, "local_payload", return_value=self.files), \
                patch.object(publisher.homepage, "StagingFTP", return_value=FakeFTP()), \
                patch.object(publisher, "promote", return_value={}) as promote, \
                patch("sys.argv", ["publisher"]), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(publisher.main(), 0)
            self.assertIs(promote.call_args.args[2], False)

    def test_database_staging_pointer_is_rejected_even_when_filtered_url_is_root(self):
        invalid = state()
        invalid["state"]["options"]["home"] = publisher.URL + "staging/"
        with self.assertRaisesRegex(RuntimeError, "database URL"):
            publisher.validate_snapshot(invalid)

    def test_snapshot_guard_refuses_staging_or_noindex(self):
        for key, value in (("home_url", publisher.URL + "staging/"), ("site_url", publisher.URL + "staging/"),
                           ("content_url", publisher.URL + "staging/wp-content/"), ("environment", "staging"), ("blog_public", 0)):
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                publisher.validate_snapshot({**state(), key: value})
        publisher.validate_snapshot(state())

    def test_snapshot_source_has_no_database_mutators_and_runs_before_renderer(self):
        source = publisher.snapshot_helper("private-test-token").decode()
        for forbidden in ("update_option(", "update_post_meta(", "wp_update_post(", "wp_insert_post(", "delete_option("):
            self.assertNotIn(forbidden, source)
        self.assertIn("'wp_loaded'", source)
        self.assertIn("HTTP_X_KTK_DEPLOY_TOKEN", source)
        self.assertIn("time() >", source)

    def test_helper_cleanup_and_error_do_not_leak_token(self):
        ftp = FakeFTP()
        with patch.object(publisher.urllib.request, "urlopen", side_effect=RuntimeError("private-token in URL")):
            with self.assertRaisesRegex(RuntimeError, "helper request failed") as raised:
                publisher.transient_helper(ftp, "snapshot", b"php", "private-token")
        self.assertNotIn("private-token", str(raised.exception))
        self.assertEqual(ftp.files, {})
        self.assertTrue(all(not path.endswith(".php") for event, path in ftp.events if event == "write"))
        self.assertEqual(len([path for event, path in ftp.events if event == "rename"]), 1)

    def test_helper_verified_before_activation_and_token_only_in_header(self):
        ftp = FakeFTP()
        with patch.object(publisher.urllib.request, "urlopen", return_value=io.BytesIO(b'{"ok": true}')) as request:
            self.assertEqual(publisher.transient_helper(ftp, "snapshot", b"php", "private-token"), {"ok": True})
        target = next(path for event, path in ftp.events if event == "rename")
        temporary = next(path for event, path in ftp.events if event == "write")
        self.assertLess(ftp.events.index(("read", temporary)), ftp.events.index(("rename", target)))
        self.assertNotIn(("write", target), ftp.events)
        self.assertEqual(ftp.files, {})
        http_request = request.call_args.args[0]
        self.assertNotIn("private-token", http_request.full_url)
        self.assertEqual(dict(http_request.header_items())["X-ktk-deploy-token"], "private-token")

    def test_corrupt_helper_is_never_activated_or_called(self):
        class CorruptFTP(FakeFTP):
            def storbinary(self, command, stream):
                super().storbinary(command, stream)
                self.corrupt = command.removeprefix("STOR ")
        ftp = CorruptFTP()
        with patch.object(publisher.urllib.request, "urlopen") as request:
            with self.assertRaisesRegex(RuntimeError, "temporary helper checksum mismatch"):
                publisher.transient_helper(ftp, "snapshot", b"php", "private-token")
            request.assert_not_called()
        self.assertFalse(any(event == "rename" for event, _ in ftp.events))
        self.assertEqual(ftp.files, {})

    def test_helper_delete_permission_denied_is_not_mistaken_for_absence(self):
        class DeniedFTP(FakeFTP):
            def delete(self, path):
                if path in self.files:
                    raise ftplib.error_perm("550 Permission denied")
                super().delete(path)
        ftp = DeniedFTP()
        with patch.object(publisher.urllib.request, "urlopen", return_value=io.BytesIO(b'{"ok": true}')):
            with self.assertRaisesRegex(RuntimeError, "cleanup could not be verified"):
                publisher.transient_helper(ftp, "snapshot", b"php", "private-token")
        self.assertEqual(len(ftp.files), 1)

    def test_helper_cleanup_listing_error_is_a_release_failure(self):
        class DeniedFTP(FakeFTP):
            def mlsd(self, directory):
                raise ftplib.error_perm("550 Permission denied")
        ftp = DeniedFTP()
        with patch.object(publisher.urllib.request, "urlopen", return_value=io.BytesIO(b'{"ok": true}')):
            with self.assertRaisesRegex(RuntimeError, "cleanup could not be verified"):
                publisher.transient_helper(ftp, "snapshot", b"php", "private-token")

    def test_helper_failed_rename_cleans_unactivated_file(self):
        class DeniedFTP(FakeFTP):
            def rename(self, source, destination):
                raise ftplib.error_perm("550 Rename denied")
        ftp = DeniedFTP()
        with patch.object(publisher.urllib.request, "urlopen") as request:
            with self.assertRaisesRegex(ftplib.error_perm, "Rename denied"):
                publisher.transient_helper(ftp, "snapshot", b"php", "private-token")
            request.assert_not_called()
        self.assertEqual(ftp.files, {})

    def test_cache_helper_requires_header_and_expires_before_registering_hooks(self):
        with patch.object(publisher.time, "time", return_value=1000):
            source = publisher.cache_purge_helper("private-test-token").decode()
        self.assertEqual(source.count("<?php"), 1)
        self.assertIn("time() > 1900", source)
        self.assertIn("HTTP_X_KTK_DEPLOY_TOKEN", source)
        self.assertLess(source.index("hash_equals("), source.index("add_action("))
        self.assertLess(source.index("time() >"), source.index("add_action("))
        self.assertIn("$_GET['_ktk_homepage_cache_purge'] = 'private-test-token'", source)

    def test_backup_includes_remote_extras_and_frontpage_state(self):
        files = {publisher.ASSETS + "/legacy.css": b"previous", publisher.RENDERER: b"old renderer"}
        with tempfile.TemporaryDirectory() as directory, patch.object(publisher, "WORKSPACE", Path(directory)):
            backup = publisher.write_backup(files, state(), self.files)
            with zipfile.ZipFile(backup) as archive:
                self.assertEqual(archive.read(publisher.ASSETS + "/legacy.css"), b"previous")
                self.assertEqual(json.loads(archive.read("production-wordpress-snapshot.json")), state())
                manifest = json.loads(archive.read("release-manifest.json"))
                self.assertFalse(manifest["database_mutated"])
                self.assertTrue(manifest["rollback"])
                self.assertEqual(manifest["new_files"], [publisher.ASSETS + "/hero.css"])

    def test_dependencies_verified_before_renderer_atomically_renamed(self):
        ftp = FakeFTP({publisher.production_path(publisher.RENDERER): b"old renderer"})
        publisher.publish_files(ftp, self.files)
        target = publisher.production_path(publisher.RENDERER)
        rename_index = ftp.events.index(("rename", target))
        dependency_index = ftp.events.index(("read", publisher.production_path(publisher.ASSETS + "/hero.css")), 1)
        self.assertLess(dependency_index, rename_index)
        self.assertNotIn(("write", target), ftp.events)
        self.assertNotIn(("delete", target), ftp.events)
        self.assertEqual(ftp.files[target], b"new renderer")

    def test_corrupt_dependency_prevents_renderer_change(self):
        target = publisher.production_path(publisher.RENDERER)
        ftp = FakeFTP({target: b"old"}, corrupt=publisher.production_path(publisher.ASSETS + "/hero.css"))
        with self.assertRaisesRegex(RuntimeError, "checksum mismatch"):
            publisher.publish_files(ftp, self.files)
        self.assertEqual(ftp.files[target], b"old")
        self.assertFalse(any(event == "rename" for event, _ in ftp.events))

    def test_php_dependency_is_atomically_replaced_before_renderer(self):
        dependency = publisher.ASSETS + "/integrations.php"
        destination = publisher.production_path(dependency)
        renderer = publisher.production_path(publisher.RENDERER)
        ftp = FakeFTP({destination: b"old integrations", renderer: b"old renderer"})
        publisher.publish_files(ftp, {dependency: b"new integrations", publisher.RENDERER: b"new renderer"})
        self.assertEqual([target for event, target in ftp.events if event == "rename"], [destination, renderer])
        self.assertNotIn(("write", destination), ftp.events)
        self.assertNotIn(("delete", destination), ftp.events)
        self.assertEqual(ftp.files[destination], b"new integrations")

    def test_corrupt_temporary_php_dependency_keeps_active_php_intact(self):
        dependency = publisher.ASSETS + "/integrations.php"
        destination = publisher.production_path(dependency)
        renderer = publisher.production_path(publisher.RENDERER)
        temporary = destination + ".upload-fixed.tmp"
        original = {destination: b"old integrations", renderer: b"old renderer"}
        ftp = FakeFTP(original, corrupt=temporary)
        with patch.object(publisher.homepage.secrets, "token_hex", return_value="fixed"):
            with self.assertRaisesRegex(RuntimeError, "[Cc]hecksum mismatch"):
                publisher.publish_files(ftp, {dependency: b"new integrations", publisher.RENDERER: b"new renderer"})
        self.assertEqual(ftp.files, original)
        self.assertFalse(any(event == "rename" for event, _ in ftp.events))
        self.assertEqual([target for event, target in ftp.events if event == "delete"], [temporary])

    def test_failed_renderer_rename_never_deletes_active_file(self):
        class FailedFTP(FakeFTP):
            def rename(self, source, destination):
                raise ftplib.error_perm("550 Rename rejected")
        target = publisher.production_path(publisher.RENDERER)
        ftp = FailedFTP({target: b"old"})
        with self.assertRaises(ftplib.error_perm):
            publisher.publish_files(ftp, self.files)
        self.assertEqual(ftp.files[target], b"old")
        self.assertNotIn(("delete", target), ftp.events)
        self.assertFalse(any(".upload-" in name for name in ftp.files))

    def test_backup_report_checkpoint_exists_before_any_payload_upload(self):
        ftp = self.staging_ftp()
        with tempfile.TemporaryDirectory() as directory, patch.object(publisher, "WORKSPACE", Path(directory)), \
                patch.object(publisher, "snapshot", return_value=state()), \
                patch.object(publisher, "transient_helper", return_value={"origin_cache_cleared": True}), \
                patch.object(publisher, "smoke_test", return_value={"ok": True}):
            report_path = Path(directory) / "report.json"
            original = publisher.publish_files
            def checked_publish(*args):
                report = json.loads(report_path.read_text())
                self.assertEqual(report["phase"], "backup-verified-before-upload")
                self.assertTrue(Path(report["backup"]).exists())
                return original(*args)
            with patch.object(publisher, "publish_files", side_effect=checked_publish):
                report = publisher.promote(ftp, self.files, True, report_path)
            self.assertEqual(report["phase"], "complete")
            self.assertTrue(report["wordpress_state_unchanged"])

    def test_smoke_rejects_staging_links_duplicate_canonical_and_noindex(self):
        body = ('<link rel="canonical" href="https://krawlthroughkrakow.com/">'
                '<meta name="robots" content="index, follow">'
                '<div id="ktk-seasonal-hero" data-campaign="nye">'
                '31 December 2026<svg><text>2027</text></svg>'
                '<a href="https://krawlthroughkrakow.com/store2/nye-pub-crawl-32/#book">Book NYE</a></div>')
        self.assertTrue(all(publisher.check_smoke(body, 200, {}).values()))
        for addition in ('<a href="/staging/store2/">Book</a>', '<meta name="robots" content="noindex">',
                         '<link rel="canonical" href="https://krawlthroughkrakow.com/">'):
            with self.subTest(addition=addition), self.assertRaises(RuntimeError):
                publisher.check_smoke(body + addition, 200, {})
        with self.assertRaises(RuntimeError):
            publisher.check_smoke(body, 200, {"X-Robots-Tag": "noindex"})
        with self.assertRaises(RuntimeError):
            publisher.check_smoke(body.replace('data-campaign="nye"', 'data-campaign="halloween"'), 200, {})


if __name__ == "__main__":
    unittest.main()
