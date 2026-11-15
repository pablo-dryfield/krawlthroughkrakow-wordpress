#!/usr/bin/env python3
"""Build and publish the code-managed homepage to staging only."""

from __future__ import annotations

import argparse
import ftplib
import hashlib
import importlib.util
import io
import json
import posixpath
import re
import secrets
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


WORKSPACE = Path(__file__).resolve().parents[1]
STORE2_PUBLISHER = Path(__file__).resolve().with_name("publish-store2.py")
PRODUCTION_MU_PLUGINS = "/public_html/wp-content/mu-plugins"
STAGING_MU_PLUGINS = "/public_html/staging/wp-content/mu-plugins"
LOCAL_MU_PLUGINS = WORKSPACE / "staging/wp-content/mu-plugins"
PLUGIN_TEMPLATE = Path(__file__).resolve().with_name("homepage-shortcode-plugin-template.php")
SHORTCODE_FILE = "ktk-homepage-shortcode.php"
CONTENT_FILE = "ktk-homepage-shortcode-content.php"
ASSETS_DIRECTORY = "ktk-homepage-assets"
PAGE_SLUG = "homepage-shortcode"
PAGE_TITLE = "Homepage Shortcode Replica"
SHORTCODE = "[ktk_homepage]"


def load_store2_publisher() -> Any:
    spec = importlib.util.spec_from_file_location("ktk_publish_store2", STORE2_PUBLISHER)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {STORE2_PUBLISHER}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


store2 = load_store2_publisher()


class StagingFTP:
    """Bound data-transfer sessions and retry interrupted transfers from byte zero."""

    def __init__(self, factory=None, transfer_limit=32):
        self.factory = factory or store2.connect
        self.connection = self.factory()
        self.transfer_limit = transfer_limit
        self.transfers = 0

    def reconnect(self):
        self.connection.close()
        self.connection = self.factory()
        self.transfers = 0

    def run(self, operation, transfer=False):
        for attempt in range(3):
            try:
                if transfer and self.transfers >= self.transfer_limit:
                    self.reconnect()
                result = operation(self.connection)
                if transfer:
                    self.transfers += 1
                return result
            except (OSError, EOFError, ftplib.error_temp):
                if attempt == 2:
                    raise
                print(f"FTPS transfer interrupted; reconnecting for retry {attempt + 1}/2...", file=sys.stderr)
                time.sleep(attempt + 1)
                self.reconnect()

    def retrbinary(self, command, callback):
        def receive(connection):
            buffer = io.BytesIO()
            connection.retrbinary(command, buffer.write)
            return buffer.getvalue()
        callback(self.run(receive, transfer=True))

    def storbinary(self, command, stream):
        start = stream.tell()
        def send(connection):
            stream.seek(start)
            return connection.storbinary(command, stream)
        return self.run(send, transfer=True)

    def mlsd(self, directory):
        return self.run(lambda connection: list(connection.mlsd(directory)), transfer=True)

    def mkd(self, directory):
        return self.run(lambda connection: connection.mkd(directory))

    def rmd(self, directory):
        return self.run(lambda connection: connection.rmd(directory))

    def delete(self, remote):
        return self.run(lambda connection: connection.delete(remote))

    def rename(self, source, destination):
        return self.run(lambda connection: connection.rename(source, destination))

    def quit(self):
        return self.connection.quit()

    def close(self):
        return self.connection.close()


def http_json(url: str, timeout: int = 60) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "User-Agent": "KTK homepage shortcode publisher/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def retrieve_file(ftp: ftplib.FTP_TLS, remote_path: str) -> bytes | None:
    buffer = io.BytesIO()
    try:
        ftp.retrbinary(f"RETR {remote_path}", buffer.write)
    except ftplib.error_perm as exc:
        if str(exc).startswith("550"):
            return None
        raise
    return buffer.getvalue()


def staging_path(name: str) -> str:
    path = posixpath.normpath(name)
    if path != name or "\\" in name or name.startswith("/"):
        raise ValueError(f"Invalid homepage payload path: {name}")
    if name not in (SHORTCODE_FILE, CONTENT_FILE) and not name.startswith(ASSETS_DIRECTORY + "/"):
        raise ValueError(f"Unexpected homepage payload path: {name}")
    return posixpath.join(STAGING_MU_PLUGINS, name)


def backup_existing(
    ftp: ftplib.FTP_TLS, names: Iterable[str] = (SHORTCODE_FILE, CONTENT_FILE)
) -> Path | None:
    files: dict[str, bytes] = {}
    directories: dict[str, set[str]] = {}
    for name in names:
        remote = staging_path(name)
        directory = posixpath.dirname(remote)
        if directory not in directories:
            directories[directory] = {entry for entry, kind in store2.list_entries(ftp, directory) if kind == "file"}
        if posixpath.basename(remote) not in directories[directory]:
            continue
        content = retrieve_file(ftp, remote)
        if content is not None:
            files[name] = content
    if not files:
        return None

    backup_dir = WORKSPACE / "deploy-backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = backup_dir / f"ktk-homepage-shortcode-staging-{stamp}.zip"
    manifest = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "remote_path": STAGING_MU_PLUGINS,
        "file_count": len(files),
        "files": {name: hashlib.sha256(content).hexdigest() for name, content in files.items()},
    }
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("release-manifest.json", json.dumps(manifest, indent=2))
        for name, content in sorted(files.items()):
            archive.writestr(name, content)
    return path


def export_helper(token: str) -> bytes:
    source = f"""<?php
if ( ! defined( 'ABSPATH' ) ) {{ exit; }}
add_action( 'template_redirect', function () {{
    if ( ! isset( $_GET['_ktk_homepage_export'] ) || ! hash_equals( '{token}', (string) $_GET['_ktk_homepage_export'] ) ) {{
        return;
    }}

    nocache_headers();
    $post = get_queried_object();
    if ( ! $post instanceof WP_Post || 'page' !== $post->post_type ) {{
        $front_page_id = (int) get_option( 'page_on_front' );
        $post = $front_page_id ? get_post( $front_page_id ) : null;
    }}

    if ( ! $post instanceof WP_Post ) {{
        status_header( 404 );
        wp_send_json( array( 'error' => 'front_page_not_found' ) );
    }}

    $meta = array();
    foreach ( get_post_meta( $post->ID ) as $key => $values ) {{
        if ( 0 === strpos( $key, '_et_' ) || '_wp_page_template' === $key ) {{
            $meta[ $key ] = array_map( 'maybe_unserialize', $values );
        }}
    }}

    status_header( 200 );
    wp_send_json( array(
        'site_url' => site_url(),
        'home_url' => home_url(),
        'exported_at' => gmdate( 'c' ),
        'page_id' => $post->ID,
        'post_title' => $post->post_title,
        'post_name' => $post->post_name,
        'post_content' => $post->post_content,
        'content_sha256' => hash( 'sha256', $post->post_content ),
        'meta' => $meta,
    ) );
}}, 0 );
"""
    return source.encode("utf-8")


def nowdoc_php_return(content: str) -> bytes:
    marker = "KTK_HOMEPAGE_CONTENT_" + secrets.token_hex(8).upper()
    while marker in content:
        marker = "KTK_HOMEPAGE_CONTENT_" + secrets.token_hex(8).upper()
    source = f"<?php\nreturn <<<'{marker}'\n{content}\n{marker};\n"
    return source.encode("utf-8")


def shortcode_plugin(exported: dict[str, Any]) -> bytes:
    source_hash = str(exported["content_sha256"])
    source_title = str(exported.get("post_title", "Homepage"))
    source_time = str(exported.get("exported_at", ""))
    source = PLUGIN_TEMPLATE.read_text(encoding="utf-8")
    replacements = {
        "__CONTENT_FILE__": CONTENT_FILE,
        "__PAGE_SLUG__": PAGE_SLUG,
        "__SHORTCODE__": SHORTCODE,
        "__SOURCE_TITLE_JSON__": json.dumps(source_title),
        "__SOURCE_EXPORTED_AT_JSON__": json.dumps(source_time),
        "__SOURCE_SHA256__": source_hash,
    }
    for token, value in replacements.items():
        source = source.replace(token, value)
    return source.encode("utf-8")


def install_helper(token: str, source_hash: str) -> bytes:
    source = f"""<?php
if ( ! defined( 'ABSPATH' ) ) {{ exit; }}
add_action( 'template_redirect', function () {{
    if ( ! isset( $_GET['_ktk_homepage_install'] ) || ! hash_equals( '{token}', (string) $_GET['_ktk_homepage_install'] ) ) {{
        return;
    }}

    nocache_headers();

    $previous_show_on_front = (string) get_option( 'show_on_front' );
    $previous_page_on_front = (int) get_option( 'page_on_front' );
    $page = $previous_page_on_front ? get_post( $previous_page_on_front ) : null;
    if ( ! $page instanceof WP_Post || 'page' !== $page->post_type ) {{
        $page = get_page_by_path( 'home', OBJECT, 'page' );
    }}

    $admin_ids = get_users( array(
        'role__in' => array( 'administrator' ),
        'number' => 1,
        'fields' => 'ids',
    ) );
    $author_id = ! empty( $admin_ids ) ? (int) $admin_ids[0] : 1;
    $postarr = array(
        'post_title' => $page instanceof WP_Post && '' !== $page->post_title ? $page->post_title : 'Home',
        'post_name' => $page instanceof WP_Post && '' !== $page->post_name ? $page->post_name : 'home',
        'post_type' => 'page',
        'post_status' => 'publish',
        'post_author' => $author_id,
        'post_content' => '{SHORTCODE}',
        'comment_status' => 'closed',
        'ping_status' => 'closed',
    );

    if ( $page instanceof WP_Post ) {{
        $postarr['ID'] = $page->ID;
        $page_id = wp_update_post( $postarr, true );
    }} else {{
        $page_id = wp_insert_post( $postarr, true );
    }}

    if ( is_wp_error( $page_id ) ) {{
        status_header( 500 );
        wp_send_json( array(
            'error' => $page_id->get_error_message(),
        ) );
    }}

    update_post_meta( $page_id, '_wp_page_template', 'page-template-blank.php' );
    update_post_meta( $page_id, '_et_pb_use_builder', 'on' );
    update_post_meta( $page_id, '_et_pb_page_layout', 'et_no_sidebar' );
    update_post_meta( $page_id, '_et_pb_side_nav', 'off' );
    update_post_meta( $page_id, '_ktk_homepage_shortcode', '{SHORTCODE}' );
    update_post_meta( $page_id, '_ktk_homepage_shortcode_source_hash', '{source_hash}' );
    update_option( 'show_on_front', 'page' );
    update_option( 'page_on_front', $page_id );

    $preview_page_id = 0;
    $preview_previous_status = null;
    $preview = get_page_by_path( '{PAGE_SLUG}', OBJECT, 'page' );
    if ( $preview instanceof WP_Post && (int) $preview->ID !== (int) $page_id ) {{
        $preview_page_id = (int) $preview->ID;
        $preview_previous_status = $preview->post_status;
        if ( 'draft' !== $preview->post_status ) {{
            wp_update_post( array(
                'ID' => $preview->ID,
                'post_status' => 'draft',
            ) );
        }}
    }}

    if ( function_exists( 'rocket_clean_post' ) ) {{
        rocket_clean_post( $page_id );
        if ( $preview_page_id ) {{
            rocket_clean_post( $preview_page_id );
        }}
    }}
    if ( function_exists( 'rocket_clean_home' ) ) {{
        rocket_clean_home();
    }}
    flush_rewrite_rules( false );

    status_header( 200 );
    wp_send_json( array(
        'page_id' => $page_id,
        'page_url' => home_url( '/' ),
        'page_permalink' => get_permalink( $page_id ),
        'shortcode' => '{SHORTCODE}',
        'source_sha256' => '{source_hash}',
        'previous_show_on_front' => $previous_show_on_front,
        'previous_page_on_front' => $previous_page_on_front,
        'drafted_preview_page_id' => $preview_page_id,
        'drafted_preview_previous_status' => $preview_previous_status,
    ) );
}}, 0 );
"""
    return source.encode("utf-8")


def cache_purge_helper(token: str) -> bytes:
    source = f"""<?php
if ( ! defined( 'ABSPATH' ) ) {{ exit; }}
add_action( 'plugins_loaded', function () {{
    if ( ! isset( $_GET['_ktk_homepage_cache_purge'] ) || ! hash_equals( '{token}', (string) $_GET['_ktk_homepage_cache_purge'] ) ) {{
        return;
    }}

    add_action( 'wp_loaded', function () {{
        nocache_headers();

        if ( home_url( '/' ) !== 'https://krawlthroughkrakow.com/staging/' || site_url( '/' ) !== 'https://krawlthroughkrakow.com/staging/' ) {{
            wp_send_json( array( 'error' => 'exact_staging_identity_required' ), 403 );
        }}

        $front_page_id = (int) get_option( 'page_on_front' );
        $page = $front_page_id ? get_post( $front_page_id ) : null;
        if ( ! $page instanceof WP_Post || 'page' !== $page->post_type ) {{
            $page = get_page_by_path( '{PAGE_SLUG}', OBJECT, 'page' );
        }}
        if ( ! $page instanceof WP_Post ) {{
            status_header( 404 );
            wp_send_json( array( 'error' => 'page_not_found' ) );
        }}

        $page_url = home_url( '/' );
        $page_permalink = get_permalink( $page );
        $urls = array_values( array_unique( array_filter( array(
            $page_url,
            untrailingslashit( $page_url ),
            $page_permalink,
            untrailingslashit( $page_permalink ),
            home_url( '/{PAGE_SLUG}/' ),
            untrailingslashit( home_url( '/{PAGE_SLUG}/' ) ),
        ) ) ) );

        $origin_cache_cleared = false;
        if ( function_exists( 'rocket_clean_post' ) ) {{
            ob_start();
            rocket_clean_post( $page->ID );
            ob_end_clean();
            $origin_cache_cleared = true;
        }}
        if ( function_exists( 'rocket_clean_home' ) ) {{
            ob_start();
            rocket_clean_home();
            ob_end_clean();
            $origin_cache_cleared = true;
        }}

        status_header( 200 );
        wp_send_json( array(
            'page_id' => $page->ID,
            'page_url' => $page_url,
            'page_permalink' => $page_permalink,
            'urls' => $urls,
            'origin_cache_cleared' => $origin_cache_cleared,
            'cloudflare_attempted' => false,
            'cloudflare_purged' => false,
            'edge_cache_strategy' => 'separate-authorized-mcp',
            'error' => null,
        ) );
    }}, 999 );
}}, 1 );
"""
    return source.encode("utf-8")


def export_production_homepage(ftp: ftplib.FTP_TLS) -> dict[str, Any]:
    token = secrets.token_urlsafe(32)
    helper_name = f"ktk-homepage-export-{secrets.token_hex(8)}.php"
    helper_path = posixpath.join(PRODUCTION_MU_PLUGINS, helper_name)
    store2.upload_file(ftp, helper_path, export_helper(token))
    try:
        url = "https://krawlthroughkrakow.com/?" + urllib.parse.urlencode(
            {"_ktk_homepage_export": token}
        )
        payload = http_json(url)
        if "post_content" not in payload or not payload["post_content"]:
            raise RuntimeError(f"Production export returned no content: {payload}")
        return payload
    finally:
        try:
            ftp.delete(helper_path)
        except ftplib.error_perm:
            pass


def local_source() -> tuple[dict[str, Any], bytes]:
    content_path = LOCAL_MU_PLUGINS / CONTENT_FILE
    plugin_path = LOCAL_MU_PLUGINS / SHORTCODE_FILE
    if not content_path.is_file() or not plugin_path.is_file():
        raise RuntimeError("Local homepage content and generated plugin are required for --local-source.")

    # These values are generated JSON/string literals, never executable PHP input.
    plugin = plugin_path.read_text(encoding="utf-8")
    metadata = plugin.split("function ktk_homepage_shortcode_source_metadata()", 1)
    if len(metadata) != 2:
        raise RuntimeError("The local homepage plugin has no source metadata.")
    values: dict[str, Any] = {}
    for field in ("source_title", "source_exported_at"):
        match = re.search(r"'" + field + r"'\s*=>\s*(\"(?:\\.|[^\"\\])*\")", metadata[1])
        if match is None:
            raise RuntimeError(f"Missing local homepage metadata: {field}")
        values[field] = json.loads(match.group(1))
    source_hash = re.search(r"'source_sha256'\s*=>\s*'([a-f0-9]{64})'", metadata[1])
    if source_hash is None:
        raise RuntimeError("Missing local homepage source SHA-256.")

    return {
        "post_title": values["source_title"],
        "exported_at": values["source_exported_at"],
        "content_sha256": source_hash.group(1),
    }, content_path.read_bytes()


def write_local_files(
    exported: dict[str, Any], existing_content: bytes | None = None
) -> dict[str, bytes]:
    LOCAL_MU_PLUGINS.mkdir(parents=True, exist_ok=True)
    content_bytes = existing_content if existing_content is not None else nowdoc_php_return(str(exported["post_content"]))
    plugin_bytes = shortcode_plugin(exported)

    (LOCAL_MU_PLUGINS / CONTENT_FILE).write_bytes(content_bytes)
    (LOCAL_MU_PLUGINS / SHORTCODE_FILE).write_bytes(plugin_bytes)

    files = {
        CONTENT_FILE: content_bytes,
        SHORTCODE_FILE: plugin_bytes,
    }
    assets_path = LOCAL_MU_PLUGINS / ASSETS_DIRECTORY
    if assets_path.is_symlink():
        raise RuntimeError("The homepage assets directory must not be a symbolic link.")
    if assets_path.exists():
        for path in sorted(assets_path.rglob("*")):
            if path.is_symlink() or not path.resolve().is_relative_to(LOCAL_MU_PLUGINS.resolve()):
                raise RuntimeError(f"Homepage assets must remain inside the local MU plugin directory: {path}")
            if path.is_file():
                name = path.relative_to(LOCAL_MU_PLUGINS).as_posix()
                staging_path(name)
                files[name] = path.read_bytes()
    return files


def replace_renderer_atomically(ftp: ftplib.FTP_TLS, path: str, content: bytes) -> None:
    temporary = path + ".upload-" + secrets.token_hex(8) + ".tmp"
    digest = hashlib.sha256(content).hexdigest()
    renamed = False
    try:
        ftp.storbinary(f"STOR {temporary}", io.BytesIO(content))
        uploaded = retrieve_file(ftp, temporary)
        if uploaded is None or hashlib.sha256(uploaded).hexdigest() != digest:
            raise RuntimeError("Temporary homepage PHP checksum mismatch")
        try:
            ftp.rename(temporary, path)
        except ftplib.all_errors:
            # A dropped reply can conceal a successful rename; never delete the live renderer.
            deployed = retrieve_file(ftp, path)
            if deployed is None or hashlib.sha256(deployed).hexdigest() != digest:
                raise
        renamed = True
    finally:
        if not renamed:
            try:
                ftp.delete(temporary)
            except ftplib.all_errors:
                pass


def publish_staging_files(ftp: ftplib.FTP_TLS, files: dict[str, bytes]) -> dict[str, str]:
    for name in files:
        staging_path(name)
    directories = {posixpath.dirname(staging_path(name)) for name in files}
    for directory in sorted(directories, key=lambda path: (path.count("/"), path)):
        store2.ensure_dir(ftp, directory)
    existing = {
        posixpath.join(directory, name)
        for directory in directories
        for name, kind in store2.list_entries(ftp, directory)
        if kind == "file"
    }
    verified: dict[str, str] = {}
    # The renderer is activated only after every dependency has been verified.
    for name in sorted(files, key=lambda name: (name == SHORTCODE_FILE, name)):
        content = files[name]
        path = staging_path(name)
        digest = hashlib.sha256(content).hexdigest()
        deployed = retrieve_file(ftp, path) if path in existing else None
        if deployed is None or hashlib.sha256(deployed).hexdigest() != digest:
            if name.lower().endswith(".php"):
                replace_renderer_atomically(ftp, path, content)
            else:
                ftp.storbinary(f"STOR {path}", io.BytesIO(content))
            deployed = retrieve_file(ftp, path)
        if deployed is None or hashlib.sha256(deployed).hexdigest() != digest:
            raise RuntimeError(f"Staging checksum mismatch for {name}")
        verified[name] = digest
        if len(verified) % 25 == 0:
            print(f"Verified {len(verified)}/{len(files)} staging files...", file=sys.stderr)
    return verified


def create_or_update_staging_page(ftp: ftplib.FTP_TLS, source_hash: str) -> dict[str, Any]:
    token = secrets.token_urlsafe(32)
    helper_name = f"ktk-homepage-install-{secrets.token_hex(8)}.php"
    helper_path = posixpath.join(STAGING_MU_PLUGINS, helper_name)
    store2.upload_file(ftp, helper_path, install_helper(token, source_hash))
    try:
        url = "https://krawlthroughkrakow.com/staging/?" + urllib.parse.urlencode(
            {"_ktk_homepage_install": token}
        )
        return http_json(url)
    finally:
        try:
            ftp.delete(helper_path)
        except ftplib.error_perm:
            pass


def purge_staging_page_cache(ftp: ftplib.FTP_TLS) -> dict[str, Any]:
    token = secrets.token_urlsafe(32)
    helper_name = f"ktk-homepage-cache-purge-{secrets.token_hex(8)}.php"
    helper_path = posixpath.join(STAGING_MU_PLUGINS, helper_name)
    store2.upload_file(ftp, helper_path, cache_purge_helper(token))
    try:
        url = "https://krawlthroughkrakow.com/staging/?" + urllib.parse.urlencode(
            {"_ktk_homepage_cache_purge": token}
        )
        return http_json(url)
    finally:
        try:
            ftp.delete(helper_path)
        except ftplib.error_perm:
            pass


def smoke_test(url: str) -> dict[str, Any]:
    cache_buster = urllib.parse.urlencode({"ktk_smoke": secrets.token_hex(4)})
    separator = "&" if "?" in url else "?"
    request_url = f"{url}{separator}{cache_buster}"
    request = urllib.request.Request(
        request_url,
        headers={
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "User-Agent": "KTK homepage shortcode smoke/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        body = response.read().decode("utf-8", "replace")
        return {
            "status": response.status,
            "url": response.geturl(),
            "contains_shortcode": SHORTCODE in body,
            "contains_homepage_marker": "krawl" in body.lower()
            and "krakow" in body.lower(),
            "bytes": len(body.encode("utf-8")),
        }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="write local files without publishing (exports production unless --local-source is used)")
    parser.add_argument("--local-source", action="store_true", help="reuse local source content and metadata; never access production")
    parser.add_argument("--build-only", action="store_true", help="build using local source without any network or credentials")
    parser.add_argument("--assets-only", action="store_true", help="update the existing staging payload without rewriting homepage posts/settings; requires --local-source")
    parser.add_argument("--report", help="write the generated release report within this workspace")
    args = parser.parse_args()
    if args.assets_only and not args.local_source:
        parser.error('--assets-only requires --local-source')
    report_path = (WORKSPACE / args.report).resolve() if args.report else None
    if report_path and not report_path.is_relative_to(WORKSPACE.resolve()):
        parser.error('--report must stay within the workspace')

    ftp = None
    summary = None
    try:
        use_local_source = args.local_source or args.build_only
        existing_content = None
        if use_local_source:
            exported, existing_content = local_source()
        else:
            ftp = store2.connect()
            exported = export_production_homepage(ftp)
        files = write_local_files(exported, existing_content)
        summary: dict[str, Any] = {
            "mode": "build-only" if args.build_only else "dry-run" if args.dry_run else "publish-staging",
            "source": "local" if use_local_source else "production-export",
            "source_page_id": exported.get("page_id"),
            "source_page_title": exported.get("post_title"),
            "source_sha256": exported.get("content_sha256"),
            "local_files": {
                name: hashlib.sha256(content).hexdigest() for name, content in files.items()
            },
        }

        if args.dry_run or args.build_only:
            print(json.dumps(summary, indent=2))
            return 0

        if ftp is None:
            print("Connecting to the staging FTPS host...", file=sys.stderr)
            ftp = StagingFTP()
        print("Backing up existing staging homepage files...", file=sys.stderr)
        backup = backup_existing(ftp, files)
        summary["backup"] = str(backup) if backup else None
        print(f"Uploading and verifying {len(files)} staging files...", file=sys.stderr)
        summary["staging_checksums"] = publish_staging_files(ftp, files)
        print("Clearing the staging homepage origin cache...", file=sys.stderr)
        page = {"page_url": "https://krawlthroughkrakow.com/staging/", "posts_and_settings_not_rewritten": True} if args.assets_only else create_or_update_staging_page(ftp, str(exported["content_sha256"]))
        summary["staging_page"] = page
        summary["cache_purge"] = purge_staging_page_cache(ftp)
        summary["smoke_test"] = smoke_test(str(page["page_url"]))
        print(json.dumps(summary, indent=2))
        return 0
    except Exception as error:
        if summary is not None:
            summary['error'] = str(error)
        raise
    finally:
        if ftp is not None:
            try:
                ftp.quit()
            except Exception:
                ftp.close()
        if report_path and summary is not None:
            report_path.parent.mkdir(parents=True, exist_ok=True)
            report_path.write_text(json.dumps(summary, indent=2), encoding='utf-8')


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Homepage shortcode publish failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
