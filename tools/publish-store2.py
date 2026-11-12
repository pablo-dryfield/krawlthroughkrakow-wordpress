#!/usr/bin/env python3
"""Promote the deployed staging KTK Storefront plugin to production over FTPS."""

from __future__ import annotations

import argparse
import ftplib
import hashlib
import io
import json
import os
import posixpath
import secrets
import ssl
import sys
import urllib.parse
import urllib.request
from urllib.error import HTTPError
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath


STAGING_PLUGIN = "/public_html/staging/wp-content/plugins/ktk-storefront"
PRODUCTION_PLUGIN = "/public_html/wp-content/plugins/ktk-storefront"
MU_PLUGINS = "/public_html/wp-content/mu-plugins"
CACHE_TARGETS = (
    "/public_html/wp-content/cache/wp-rocket/krawlthroughkrakow.com/store2",
    "/public_html/wp-content/cache/wp-rocket/krawlthroughkrakow.com/store2/",
)
REQUIRED_FILES = {
    "ktk-storefront.php",
    "includes/class-ktk-storefront.php",
    "includes/class-ktk-storefront-public-content.php",
    "includes/product-content-fallbacks.json",
    "templates/storefront.php",
    "assets/storefront.js",
    "assets/storefront.css",
}
DEPLOY_FILES = {
    "ktk-storefront.php",
    "README.md",
    "includes/class-ktk-storefront.php",
    "includes/class-ktk-storefront-public-content.php",
    "includes/product-content-fallbacks.json",
    "templates/storefront.php",
    "assets/storefront.js",
    "assets/storefront.css",
    "assets/storefront-montserrat-latin-ext.woff2",
    "assets/storefront-montserrat-latin.woff2",
    "assets/storefront-oswald-latin-ext.woff2",
    "assets/storefront-oswald-latin.woff2",
}


def connect() -> ftplib.FTP_TLS:
    host = os.environ.get("KTK_FTP_HOST", "nl1-tr101.supercp.com")
    user = os.environ.get("KTK_FTP_USER", "krawlthroughkrak")
    password = os.environ.get("KTK_FTP_PASSWORD")
    if not password:
        raise RuntimeError("KTK_FTP_PASSWORD is required")

    ftp = ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=45)
    ftp.connect(host, 21)
    ftp.login(user, password)
    ftp.prot_p()
    return ftp


def list_entries(ftp: ftplib.FTP_TLS, remote_dir: str) -> list[tuple[str, str]]:
    try:
        return [(name, facts.get("type", "")) for name, facts in ftp.mlsd(remote_dir)]
    except ftplib.error_perm as exc:
        if not str(exc).startswith("550"):
            raise
        return []


def read_tree(ftp: ftplib.FTP_TLS, root: str) -> dict[str, bytes]:
    files: dict[str, bytes] = {}

    def walk(remote_dir: str, relative_dir: str = "") -> None:
        for name, entry_type in list_entries(ftp, remote_dir):
            if name in {".", ".."}:
                continue
            remote_path = posixpath.join(remote_dir, name)
            relative_path = posixpath.join(relative_dir, name)
            if entry_type == "dir":
                walk(remote_path, relative_path)
            elif entry_type == "file":
                buffer = io.BytesIO()
                ftp.retrbinary(f"RETR {remote_path}", buffer.write)
                files[relative_path] = buffer.getvalue()

    walk(root)
    return files


def ensure_dir(ftp: ftplib.FTP_TLS, remote_dir: str) -> None:
    current = ""
    for part in PurePosixPath(remote_dir).parts:
        if part == "/":
            current = "/"
            continue
        current = posixpath.join(current, part)
        try:
            ftp.mkd(current)
        except ftplib.error_perm as exc:
            if not str(exc).startswith("550"):
                raise


def upload_file(ftp: ftplib.FTP_TLS, remote_path: str, content: bytes) -> None:
    ensure_dir(ftp, posixpath.dirname(remote_path))
    ftp.storbinary(f"STOR {remote_path}", io.BytesIO(content))


def remove_tree(ftp: ftplib.FTP_TLS, root: str) -> bool:
    entries = list_entries(ftp, root)
    if not entries:
        try:
            ftp.delete(root)
            return True
        except ftplib.error_perm:
            try:
                ftp.rmd(root)
                return True
            except ftplib.error_perm:
                return False

    for name, entry_type in entries:
        if name in {".", ".."}:
            continue
        path = posixpath.join(root, name)
        if entry_type == "dir":
            remove_tree(ftp, path)
        else:
            ftp.delete(path)
    ftp.rmd(root)
    return True


def write_backup(
    files: dict[str, bytes],
    existed: bool,
    environment: str = "production",
    remote_path: str = PRODUCTION_PLUGIN,
) -> Path:
    workspace = Path(__file__).resolve().parents[1]
    backup_dir = workspace / "deploy-backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = backup_dir / f"ktk-storefront-{environment}-{stamp}.zip"
    manifest = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "remote_path": remote_path,
        "plugin_existed": existed,
        "file_count": len(files),
        "files": {
            name: hashlib.sha256(content).hexdigest() for name, content in sorted(files.items())
        },
    }
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("release-manifest.json", json.dumps(manifest, indent=2))
        for name, content in sorted(files.items()):
            archive.writestr(f"ktk-storefront/{name}", content)
    return path


def activation_helper(token: str, status_name: str) -> bytes:
    source = f"""<?php
if ( ! defined( 'ABSPATH' ) ) {{ exit; }}
$ktk_release_status = WP_CONTENT_DIR . '/mu-plugins/{status_name}';
register_shutdown_function( function () use ( $ktk_release_status ) {{
    $error = error_get_last();
    if ( $error && in_array( $error['type'], array( E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR ), true ) ) {{
        file_put_contents( $ktk_release_status, wp_json_encode( array( 'fatal' => $error ) ) );
    }}
}} );
add_action( 'plugins_loaded', function () {{
    if ( ! isset( $_GET['_ktk_release'] ) || ! hash_equals( '{token}', (string) $_GET['_ktk_release'] ) ) {{
        return;
    }}
    require_once ABSPATH . 'wp-admin/includes/plugin.php';
    $plugin = 'ktk-storefront/ktk-storefront.php';
    $before = is_plugin_active( $plugin );
    // Skip the activation hook here because plugins_loaded runs before $wp_rewrite exists.
    $result = $before ? true : activate_plugin( $plugin, '', false, true );
    $after = is_plugin_active( $plugin );
    add_action( 'wp_loaded', function () use ( $before, $after, $result ) {{
        if ( $after ) {{
            KTK_Storefront::register_rewrite_rules();
            flush_rewrite_rules( false );
        }}
        nocache_headers();
        status_header( $after ? 200 : 500 );
        header( 'Content-Type: application/json; charset=utf-8' );
        echo wp_json_encode( array(
            'active_before' => $before,
            'active_after' => $after,
            'error' => is_wp_error( $result ) ? $result->get_error_message() : null,
        ) );
        exit;
    }}, 999 );
}}, 1 );
"""
    return source.encode("utf-8")


def activate_plugin(ftp: ftplib.FTP_TLS) -> dict[str, object]:
    token = secrets.token_urlsafe(32)
    helper_name = f"ktk-storefront-release-{secrets.token_hex(8)}.php"
    status_name = f"ktk-storefront-release-{secrets.token_hex(8)}.json"
    helper_path = posixpath.join(MU_PLUGINS, helper_name)
    status_path = posixpath.join(MU_PLUGINS, status_name)
    upload_file(ftp, helper_path, activation_helper(token, status_name))
    try:
        url = "https://krawlthroughkrakow.com/?" + urllib.parse.urlencode(
            {"_ktk_release": token}
        )
        request = urllib.request.Request(
            url,
            headers={"Cache-Control": "no-cache", "User-Agent": "KTK release/1.0"},
        )
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            try:
                payload = json.loads(body)
            except json.JSONDecodeError as parse_error:
                diagnostic = ""
                try:
                    buffer = io.BytesIO()
                    ftp.retrbinary(f"RETR {status_path}", buffer.write)
                    diagnostic = buffer.getvalue().decode("utf-8", "replace")
                except ftplib.error_perm:
                    pass
                raise RuntimeError(
                    f"Activation returned HTTP {exc.code}: {body[:1000]} {diagnostic[:2000]}"
                ) from parse_error
        if not payload.get("active_after"):
            raise RuntimeError(f"Plugin activation failed: {payload}")
        return payload
    finally:
        try:
            ftp.delete(helper_path)
        except ftplib.error_perm:
            pass
        try:
            ftp.delete(status_path)
        except ftplib.error_perm:
            pass


def cloudflare_purge_helper(token: str, status_name: str) -> bytes:
    source = f"""<?php
if ( ! defined( 'ABSPATH' ) ) {{ exit; }}
$ktk_release_status = WP_CONTENT_DIR . '/mu-plugins/{status_name}';
register_shutdown_function( function () use ( $ktk_release_status ) {{
    $error = error_get_last();
    if ( $error && in_array( $error['type'], array( E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR ), true ) ) {{
        file_put_contents( $ktk_release_status, wp_json_encode( array( 'fatal' => $error ) ) );
    }}
}} );
add_filter( 'cloudflare_purge_everything_actions', function ( $actions ) {{
    $actions[] = 'ktk_storefront_release_purge';
    return array_values( array_unique( $actions ) );
}} );
add_action( 'plugins_loaded', function () {{
    if ( ! isset( $_GET['_ktk_cf_purge'] ) || ! hash_equals( '{token}', (string) $_GET['_ktk_cf_purge'] ) ) {{
        return;
    }}
    add_action( 'wp_loaded', function () {{
        $registered = false !== has_action( 'ktk_storefront_release_purge' );
        $rocket_available = function_exists( 'rocket_clean_domain' );
		$rocket_cloudflare_available = false;
        $strategy = '';
		$error = null;
        if ( $registered ) {{
            ob_start();
            do_action( 'ktk_storefront_release_purge' );
            ob_end_clean();
            $strategy = 'cloudflare_plugin';
		}} else {{
			$container = apply_filters( 'rocket_container', null );
			$rocket_cloudflare_available = is_object( $container )
				&& method_exists( $container, 'has' )
				&& $container->has( 'cloudflare' );
			if ( $rocket_cloudflare_available ) {{
				$cloudflare = $container->get( 'cloudflare' );
				$connection = $cloudflare->check_connection();
				if ( is_wp_error( $connection ) ) {{
					$error = $connection->get_error_message();
				}} else {{
					$result = $cloudflare->purge_cloudflare();
					if ( is_wp_error( $result ) ) {{
						$error = $result->get_error_message();
					}} else {{
						$strategy = 'wp_rocket_cloudflare';
					}}
				}}
			}}
		}}
		if ( $rocket_available ) {{
            ob_start();
            rocket_clean_domain();
            ob_end_clean();
        }}
        $requested = '' !== $strategy;
        nocache_headers();
        status_header( 200 );
        header( 'Content-Type: application/json; charset=utf-8' );
        echo wp_json_encode( array(
            'hook_registered' => $registered,
            'wp_rocket_available' => $rocket_available,
			'wp_rocket_cloudflare_available' => $rocket_cloudflare_available,
			'origin_cache_cleared' => $rocket_available,
            'strategy' => $strategy,
            'purge_requested' => $requested,
			'error' => $error,
        ) );
        exit;
    }}, 999 );
}}, 1 );
"""
    return source.encode("utf-8")


def purge_cloudflare(ftp: ftplib.FTP_TLS) -> dict[str, object]:
    token = secrets.token_urlsafe(32)
    helper_name = f"ktk-storefront-purge-{secrets.token_hex(8)}.php"
    status_name = f"ktk-storefront-purge-{secrets.token_hex(8)}.json"
    helper_path = posixpath.join(MU_PLUGINS, helper_name)
    status_path = posixpath.join(MU_PLUGINS, status_name)
    upload_file(ftp, helper_path, cloudflare_purge_helper(token, status_name))
    try:
        url = "https://krawlthroughkrakow.com/?" + urllib.parse.urlencode(
            {"_ktk_cf_purge": token}
        )
        request = urllib.request.Request(
            url,
            headers={"Cache-Control": "no-cache", "User-Agent": "KTK release/1.0"},
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            raise RuntimeError(f"Cloudflare purge returned HTTP {exc.code}: {body[:1000]}") from exc
        return payload
    finally:
        try:
            ftp.delete(helper_path)
        except ftplib.error_perm:
            pass
        try:
            ftp.delete(status_path)
        except ftplib.error_perm:
            pass


def sync_tree(
    ftp: ftplib.FTP_TLS,
    source: dict[str, bytes],
    existing: dict[str, bytes],
    target: str = PRODUCTION_PLUGIN,
) -> None:
    ensure_dir(ftp, target)
    ordered = sorted(source, key=lambda name: (name == "ktk-storefront.php", name))
    for relative_path in ordered:
        upload_file(
            ftp,
            posixpath.join(target, relative_path),
            source[relative_path],
        )

    for relative_path in sorted(set(existing) - set(source), reverse=True):
        ftp.delete(posixpath.join(target, relative_path))


def clear_store2_cache(ftp: ftplib.FTP_TLS, *, staging: bool = False) -> list[str]:
    cleared: list[str] = []
    expected_prefix = (
        "/public_html/staging/wp-content/cache/wp-rocket/krawlthroughkrakow.com/"
        if staging else "/public_html/wp-content/cache/wp-rocket/krawlthroughkrakow.com/"
    )
    targets = (
        (expected_prefix + "staging/store2", expected_prefix + "store2")
        if staging else CACHE_TARGETS
    )
    for target in dict.fromkeys(targets):
        normalized = str(PurePosixPath(target))
        allowed = {expected_prefix + "store2", expected_prefix + "staging/store2"} if staging else {expected_prefix + "store2"}
        if normalized not in allowed:
            raise RuntimeError(f"Refusing unsafe cache target: {target}")
        if remove_tree(ftp, normalized):
            cleared.append(normalized)
    return cleared


def hash_map(files: dict[str, bytes]) -> dict[str, str]:
    return {name: hashlib.sha256(content).hexdigest() for name, content in files.items()}


def main() -> int:
    parser = argparse.ArgumentParser()
    release_mode = parser.add_mutually_exclusive_group()
    release_mode.add_argument(
        "--publish", action="store_true", help="promote staging to production"
    )
    release_mode.add_argument(
        "--publish-staging",
        action="store_true",
        help="publish the local deployable payload to staging",
    )
    release_mode.add_argument(
        "--purge-cloudflare",
        action="store_true",
        help="purge Cloudflare APO using the configured WordPress integration",
    )
    args = parser.parse_args()

    ftp = connect()
    try:
        if args.purge_cloudflare:
            payload = purge_cloudflare(ftp)
            print(json.dumps(payload, indent=2))
            return 0 if payload.get("purge_requested") else 1

        local_root = Path(__file__).resolve().parents[1] / "staging/wp-content/plugins/ktk-storefront"
        local = {
            name: (local_root / Path(name)).read_bytes()
            for name in sorted(DEPLOY_FILES)
            if (local_root / Path(name)).is_file()
        }
        missing_local = DEPLOY_FILES - set(local)
        if missing_local:
            raise RuntimeError(f"Local plugin is incomplete: {sorted(missing_local)}")

        if args.publish_staging:
            existing_staging = read_tree(ftp, STAGING_PLUGIN)
            backup = write_backup(
                existing_staging,
                bool(existing_staging),
                environment="staging",
                remote_path=STAGING_PLUGIN,
            )
            sync_tree(ftp, local, existing_staging, target=STAGING_PLUGIN)
            deployed_staging = read_tree(ftp, STAGING_PLUGIN)
            if hash_map(deployed_staging) != hash_map(local):
                raise RuntimeError("Staging checksums do not match local payload after upload")
            print(
                json.dumps(
                    {
                        "mode": "publish-staging",
                        "backup": str(backup),
                        "staging_file_count_before": len(existing_staging),
                        "staging_file_count_after": len(deployed_staging),
                        "checksums_verified": len(deployed_staging),
                        "cache_paths_cleared": clear_store2_cache(ftp, staging=True),
                    },
                    indent=2,
                )
            )
            return 0

        staging = read_tree(ftp, STAGING_PLUGIN)
        missing = REQUIRED_FILES - set(staging)
        if missing:
            raise RuntimeError(f"Staging plugin is incomplete: {sorted(missing)}")
        if len(staging) > 100:
            raise RuntimeError(f"Unexpected staging plugin size: {len(staging)} files")

        local_hashes = {
            name: hashlib.sha256((local_root / Path(name)).read_bytes()).hexdigest()
            for name in staging
            if (local_root / Path(name)).is_file()
        }
        staging_hashes = hash_map(staging)
        local_matches = len(local_hashes) == len(staging_hashes) and local_hashes == staging_hashes

        existing = read_tree(ftp, PRODUCTION_PLUGIN)
        summary: dict[str, object] = {
            "mode": "publish" if args.publish else "dry-run",
            "staging_file_count": len(staging),
            "production_file_count_before": len(existing),
            "local_matches_staging": local_matches,
        }
        if not args.publish:
            print(json.dumps(summary, indent=2))
            return 0

        backup = write_backup(existing, bool(existing))
        summary["backup"] = str(backup)
        sync_tree(ftp, staging, existing)
        deployed = read_tree(ftp, PRODUCTION_PLUGIN)
        if hash_map(deployed) != staging_hashes:
            raise RuntimeError("Production checksums do not match staging after upload")

        summary["activation"] = activate_plugin(ftp)
        summary["cache_paths_cleared"] = clear_store2_cache(ftp)
        summary["cloudflare_purge"] = purge_cloudflare(ftp)
        summary["production_file_count_after"] = len(deployed)
        summary["checksums_verified"] = len(deployed)
        print(json.dumps(summary, indent=2))
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
        print(f"Release failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
