#!/usr/bin/env python3
"""Promote the verified homepage payload without changing WordPress content/settings."""

from __future__ import annotations

import argparse
import ftplib
import hashlib
import importlib.util
import io
import json
import posixpath
import secrets
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path


SPEC = importlib.util.spec_from_file_location(
    "ktk_homepage_staging_publisher", Path(__file__).with_name("publish-homepage-shortcode.py")
)
homepage = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(homepage)
WORKSPACE = homepage.WORKSPACE
ROOT = homepage.PRODUCTION_MU_PLUGINS
URL = "https://krawlthroughkrakow.com/"
RENDERER = homepage.SHORTCODE_FILE
ASSETS = homepage.ASSETS_DIRECTORY
REQUIRED = {
    RENDERER, homepage.CONTENT_FILE,
    *(ASSETS + "/" + name for name in (
        "integrations.php", "reviews.php", "hero.php", "hero.css", "parity-seasonal-content.php",
        "parity.css", "font-resilience.css", "parity-runtime.css", "parity.js", "hero-statue-regular.svg", "hero-statue-seasonal.svg",
    )),
}


def digest(content):
    return hashlib.sha256(content).hexdigest()


def production_path(name):
    homepage.staging_path(name)
    return posixpath.join(ROOT, name)


def local_payload():
    root = homepage.LOCAL_MU_PLUGINS.resolve()
    paths = [root / RENDERER, root / homepage.CONTENT_FILE]
    asset_root = root / ASSETS
    if asset_root.is_symlink():
        raise RuntimeError("Homepage assets cannot be a symbolic link")
    paths.extend(sorted(asset_root.rglob("*")))
    files = {}
    for path in paths:
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise RuntimeError("Homepage payload must remain inside the local MU directory")
        if path.is_file():
            name = path.relative_to(root).as_posix()
            production_path(name)
            files[name] = path.read_bytes()
    if not REQUIRED.issubset(files):
        raise RuntimeError("Required compiled homepage payload files are missing")
    return files


def read_owned_files(ftp, remote_root):
    if remote_root not in (ROOT, homepage.STAGING_MU_PLUGINS):
        raise ValueError("Unexpected homepage root")
    files = {}

    def walk(relative=""):
        directory = posixpath.join(remote_root, relative) if relative else remote_root
        for name, facts in ftp.mlsd(directory):
            kind = facts.get("type", "")
            if name in (".", ".."):
                continue
            if "/" in name or "\\" in name or name in ("", ".", ".."):
                raise RuntimeError("Unsafe remote directory entry")
            child = posixpath.join(relative, name) if relative else name
            if not relative and child not in (RENDERER, homepage.CONTENT_FILE, ASSETS):
                continue
            if child != ASSETS:
                production_path(child)
            if kind == "dir" and (child == ASSETS or child.startswith(ASSETS + "/")):
                walk(child)
            elif kind == "file":
                value = homepage.retrieve_file(ftp, posixpath.join(remote_root, child))
                if value is None:
                    raise RuntimeError("A listed homepage file could not be backed up")
                files[child] = value
            else:
                raise RuntimeError("Unexpected remote homepage entry type")
    walk()
    return files


def staging_matches(ftp, files):
    remote = read_owned_files(ftp, homepage.STAGING_MU_PLUGINS)
    expected = {name: digest(content) for name, content in files.items()}
    actual = {name: digest(content) for name, content in remote.items()}
    if actual != expected:
        changed = sorted(name for name in set(actual) | set(expected) if actual.get(name) != expected.get(name))
        raise RuntimeError("Local/staging payload mismatch: " + ", ".join(changed))
    return actual


def snapshot_helper(token):
    expires = int(time.time()) + 900
    return f"""<?php
if ( ! defined( 'ABSPATH' ) ) {{ exit; }}
add_action( 'wp_loaded', function () {{
    if ( time() > {expires} || ! isset( $_SERVER['HTTP_X_KTK_DEPLOY_TOKEN'] )
        || ! hash_equals( '{token}', (string) $_SERVER['HTTP_X_KTK_DEPLOY_TOKEN'] ) ) {{ return; }}
    nocache_headers();
    $id = (int) get_option( 'page_on_front' );
    $post = $id ? get_post( $id ) : null;
    $keys = array( 'home', 'siteurl', 'blog_public', 'show_on_front', 'page_on_front',
        'page_for_posts', 'template', 'stylesheet', 'active_plugins', 'et_divi',
        'wpcode_snippets', 'wpcode_settings', 'iubenda', 'iubenda_options', 'iubenda_settings' );
    global $wpdb;
    $keys = array_unique( array_merge( $keys, $wpdb->get_col(
        "SELECT option_name FROM {{$wpdb->options}} WHERE option_name LIKE 'iubenda%'
        OR option_name LIKE 'wpcode%' OR option_name LIKE 'et\\_%'" ) ) );
    sort( $keys );
    $options = array();
    foreach ( $keys as $key ) {{ $options[ $key ] = get_option( $key, null ); }}
    $state = array( 'front_page' => $post instanceof WP_Post ? $post->to_array() : null,
        'front_page_meta' => $post instanceof WP_Post ? get_post_meta( $id ) : array(), 'options' => $options );
    status_header( 200 );
    wp_send_json( array( 'home_url' => home_url( '/' ), 'site_url' => site_url( '/' ),
        'content_url' => content_url( '/' ), 'environment' => wp_get_environment_type(),
        'blog_public' => (int) get_option( 'blog_public' ),
        'captured_at' => gmdate( 'c' ), 'state' => $state,
        'state_sha256' => hash( 'sha256', wp_json_encode( $state ) ) ) );
}}, -999 );
""".encode()


def cache_purge_helper(token):
    expires = int(time.time()) + 900
    guard = f"""<?php
if ( ! defined( 'ABSPATH' ) || time() > {expires}
    || ! isset( $_SERVER['HTTP_X_KTK_DEPLOY_TOKEN'] )
    || ! hash_equals( '{token}', (string) $_SERVER['HTTP_X_KTK_DEPLOY_TOKEN'] ) ) {{ return; }}
$_GET['_ktk_homepage_cache_purge'] = '{token}';
"""
    return guard.encode() + homepage.cache_purge_helper(token).removeprefix(b"<?php")


def remove_transient_file(ftp, path):
    try:
        ftp.delete(path)
    except ftplib.error_perm as exc:
        if not str(exc).startswith("550"):
            raise
    # FTP 550 may mean permission denied, not absence; listing is authoritative.
    entries = ftp.mlsd(posixpath.dirname(path))
    if any(name == posixpath.basename(path) for name, _ in entries):
        raise RuntimeError("Temporary production helper remains: " + path)


def transient_helper(ftp, kind, source, token):
    # Temporary MU entrypoints are the only exception to the owned-payload allowlist.
    if kind not in ("snapshot", "cache-purge"):
        raise ValueError("Unexpected temporary helper")
    path = ROOT + "/ktk-homepage-production-" + kind + "-" + secrets.token_hex(8) + ".php"
    temporary = path + ".upload-" + secrets.token_hex(8) + ".tmp"
    try:
        ftp.storbinary("STOR " + temporary, io.BytesIO(source))
        uploaded = homepage.retrieve_file(ftp, temporary)
        if uploaded is None or digest(uploaded) != digest(source):
            raise RuntimeError("Production temporary helper checksum mismatch")
        ftp.rename(temporary, path)
        activated = homepage.retrieve_file(ftp, path)
        if activated is None or digest(activated) != digest(source):
            raise RuntimeError("Production activated helper checksum mismatch")
        address = URL + "?" + urllib.parse.urlencode({"ktk_deploy_helper": secrets.token_hex(8)})
        request = urllib.request.Request(address, headers={
            "X-KTK-Deploy-Token": token, "Cache-Control": "no-cache", "Pragma": "no-cache",
            "User-Agent": "KTK production homepage promotion/1.0",
        })
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except Exception:
            # HTTP exceptions can contain the private helper query; never expose them.
            raise RuntimeError("Production " + kind + " helper request failed") from None
        if not isinstance(payload, dict) or "error" in payload and payload["error"]:
            raise RuntimeError("Production " + kind + " helper returned an error")
        return payload
    finally:
        # A failure to remove an authenticated temporary helper is a release failure.
        cleanup_errors = []
        for cleanup_path in (path, temporary):
            try:
                remove_transient_file(ftp, cleanup_path)
            except Exception:
                cleanup_errors.append(cleanup_path)
        if cleanup_errors:
            raise RuntimeError("Production helper cleanup could not be verified: " + ", ".join(cleanup_errors)) from None


def snapshot(ftp):
    token = secrets.token_urlsafe(32)
    return transient_helper(ftp, "snapshot", snapshot_helper(token), token)


def validate_snapshot(value):
    if value.get("home_url") != URL or value.get("site_url") != URL:
        raise RuntimeError("Production WordPress home/site URL is not the root domain")
    if value.get("content_url") != URL + "wp-content/":
        raise RuntimeError("Production WordPress content URL is unexpected")
    if value.get("environment") != "production" or value.get("blog_public") != 1:
        raise RuntimeError("Production must be indexable and use the production environment")
    state = value.get("state", {})
    options = state.get("options", {})
    post = state.get("front_page") or {}
    for key in ("home", "siteurl"):
        if str(options.get(key, "")).rstrip("/") != URL.rstrip("/"):
            raise RuntimeError("Production database URL points outside the root domain")
    if options.get("show_on_front") != "page" or post.get("post_type") != "page" or post.get("post_status") != "publish":
        raise RuntimeError("A published static production front page is required")
    if int(options.get("page_on_front", 0)) != int(post.get("ID", -1)):
        raise RuntimeError("Production front-page pointer does not match the snapshot")
    if not value.get("state_sha256"):
        raise RuntimeError("Production state snapshot hash is missing")


def write_backup(files, state, planned):
    directory = WORKSPACE / "deploy-backups"
    directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
    path = directory / ("ktk-homepage-production-" + stamp + ".zip")
    manifest = {
        "created_at": datetime.now(timezone.utc).isoformat(), "remote_path": ROOT,
        "files": {name: digest(content) for name, content in files.items()},
        "new_files": sorted(set(planned) - set(files)),
        "state_sha256": state["state_sha256"], "database_mutated": False,
        "rollback": [
            "Keep the live production WordPress homepage/options/meta unchanged; this release never changes them.",
            "If the previous renderer was absent, rename the new renderer to a non-PHP .disabled sibling first to return to Divi.",
            "Restore archived dependency files to remote_path and verify every SHA-256, then atomically restore the archived renderer last.",
            "For an existing renderer, restore its dependencies and renderer from this archive without deleting the active renderer first.",
            "Remove only newly introduced owned files listed in new_files after rollback and checksum verification.",
            "Clear production home origin cache and Cloudflare home device variants; do not restore the DB snapshot unless separately authorized.",
        ],
    }
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("release-manifest.json", json.dumps(manifest, indent=2))
        archive.writestr("production-wordpress-snapshot.json", json.dumps(state, indent=2))
        for name, content in sorted(files.items()):
            archive.writestr(name, content)
    with zipfile.ZipFile(path) as archive:
        for name, expected in manifest["files"].items():
            if digest(archive.read(name)) != expected:
                raise RuntimeError("Production backup checksum mismatch")
        if json.loads(archive.read("production-wordpress-snapshot.json")) != state:
            raise RuntimeError("Production database snapshot backup mismatch")
    return path


def publish_files(ftp, files):
    for name in files:
        production_path(name)
    directories = {posixpath.dirname(production_path(name)) for name in files}
    for directory in sorted(directories, key=lambda value: (value.count("/"), value)):
        homepage.store2.ensure_dir(ftp, directory)
    verified = {}
    for name in sorted(files, key=lambda value: (value == RENDERER, value)):
        content = files[name]
        path = production_path(name)
        expected = digest(content)
        existing = homepage.retrieve_file(ftp, path)
        if existing is None or digest(existing) != expected:
            if name.lower().endswith(".php"):
                homepage.replace_renderer_atomically(ftp, path, content)
            else:
                ftp.storbinary("STOR " + path, io.BytesIO(content))
            existing = homepage.retrieve_file(ftp, path)
        if existing is None or digest(existing) != expected:
            raise RuntimeError("Production checksum mismatch: " + name)
        verified[name] = expected
        if len(verified) % 25 == 0:
            print(f"Verified {len(verified)}/{len(files)} production files...", file=sys.stderr)
    return verified


class PageFacts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals, self.robots, self.staging_links = [], [], []

    def handle_starttag(self, tag, pairs):
        attrs = dict(pairs)
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href"))
        if tag == "meta" and attrs.get("name", "").lower() in ("robots", "googlebot"):
            self.robots.append(attrs.get("content", "").lower())
        for key in ("href", "src", "action"):
            if attrs.get(key):
                parsed = urllib.parse.urlparse(urllib.parse.urljoin(URL, attrs[key]))
                if parsed.hostname == "krawlthroughkrakow.com" and (parsed.path == "/staging" or parsed.path.startswith("/staging/")):
                    self.staging_links.append(attrs[key])


def check_smoke(body, status, headers):
    page = PageFacts()
    page.feed(body)
    checks = {
        "status_200": status == 200,
        "seasonal_hero": all(marker in body for marker in (
            'id="ktk-seasonal-hero"',
            'data-campaign="nye"',
            "31 December 2026",
            ">2027</text>",
            "/store2/nye-pub-crawl-32/#book",
        )),
        "canonical_root": page.canonicals == [URL],
        "indexable": bool(page.robots) and any("index" in item for item in page.robots)
            and not any("noindex" in item or "none" == item.strip() for item in page.robots)
            and "noindex" not in headers.get("X-Robots-Tag", "").lower(),
        "no_staging_links": not page.staging_links,
        "shortcode_rendered": "[ktk_homepage]" not in body,
    }
    if not all(checks.values()):
        raise RuntimeError("Production smoke failed: " + ", ".join(key for key, ok in checks.items() if not ok))
    return checks


def smoke_test():
    request = urllib.request.Request(URL + "?ktk_production_smoke=" + secrets.token_hex(8), headers={
        "Cache-Control": "no-cache", "User-Agent": "KTK production homepage smoke/1.0",
    })
    with urllib.request.urlopen(request, timeout=90) as response:
        return check_smoke(response.read().decode("utf-8", "replace"), response.status, response.headers)


def checkpoint(path, report):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(report, indent=2), encoding="utf-8")
    temporary.replace(path)


def promote(ftp, files, publish, report_path):
    report = {"mode": "publish-production" if publish else "dry-run", "production_url": URL,
        "started_at": datetime.now(timezone.utc).isoformat(), "phase": "verifying-staging", "database_mutated": False}
    checkpoint(report_path, report)
    try:
        report["staging_checksums"] = staging_matches(ftp, files)
        report["local_matches_staging"] = True
        before = snapshot(ftp)
        validate_snapshot(before)
        report["production_state"] = {key: before[key] for key in (
            "home_url", "site_url", "content_url", "environment", "blog_public", "state_sha256")}
        if not publish:
            report["phase"] = "dry-run-complete"
            checkpoint(report_path, report)
            return report
        previous = read_owned_files(ftp, ROOT)
        backup = write_backup(previous, before, files)
        report["backup"] = str(backup)
        report["backup_sha256"] = digest(backup.read_bytes())
        report["previous_renderer_present"] = RENDERER in previous
        report["phase"] = "backup-verified-before-upload"
        checkpoint(report_path, report)
        report["production_checksums"] = publish_files(ftp, files)
        report["phase"] = "payload-activated"
        checkpoint(report_path, report)
        after = snapshot(ftp)
        validate_snapshot(after)
        if after["state_sha256"] != before["state_sha256"]:
            raise RuntimeError("Production homepage/settings snapshot changed during release")
        report["wordpress_state_unchanged"] = True
        token = secrets.token_urlsafe(32)
        report["cache_purge"] = transient_helper(ftp, "cache-purge", cache_purge_helper(token), token)
        report["smoke_checks"] = smoke_test()
        report["phase"] = "complete"
        report["finished_at"] = datetime.now(timezone.utc).isoformat()
        checkpoint(report_path, report)
        return report
    except Exception as exc:
        report["failed_phase"] = report["phase"]
        report["phase"] = "failed"
        report["error"] = str(exc)
        checkpoint(report_path, report)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--publish", action="store_true", help="replace the production homepage after backup and verification")
    parser.add_argument("--report", type=Path, default=WORKSPACE / "docs/homepage-production-promotion/latest-report.json")
    args = parser.parse_args()
    files = local_payload()
    ftp = homepage.StagingFTP()
    try:
        report = promote(ftp, files, args.publish, args.report)
        print(json.dumps(report, indent=2))
        return 0
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print("Homepage production promotion failed: " + str(exc), file=sys.stderr)
        raise SystemExit(1)
