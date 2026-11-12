#!/usr/bin/env python3
"""Bridge authenticated homepage release helpers through a verified browser.

Imunify360 can replace automation requests with an HTML challenge before
WordPress receives them. This tool uploads the existing short-lived release
helper, captures its JSON response to a temporary remote file, and lets a
normal browser trigger the helper with a short-lived deploy query token.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import io
import json
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path


WORKSPACE = Path(__file__).resolve().parents[1]
PROMOTION_PATH = Path(__file__).with_name("promote-homepage-production.py")


def load_promotion_module():
    spec = importlib.util.spec_from_file_location("ktk_homepage_promotion", PROMOTION_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load homepage promotion module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def digest(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def capture_response(source: bytes, status_name: str, token: str) -> bytes:
    text = source.decode("utf-8")
    header_guard = re.compile(
        r"! isset\( \$_SERVER\['HTTP_X_KTK_DEPLOY_TOKEN'\] \)\s*"
        r"\|\| ! hash_equals\( '" + re.escape(token)
        + r"', \(string\) \$_SERVER\['HTTP_X_KTK_DEPLOY_TOKEN'\] \)"
    )
    text, replacements = header_guard.subn(
        "! isset( $_GET['_ktk_browser_token'] ) "
        f"|| ! hash_equals( '{token}', (string) $_GET['_ktk_browser_token'] )",
        text,
        count=1,
    )
    if replacements != 1:
        raise RuntimeError("Expected exactly one deploy-token guard")
    source = text.encode("utf-8")
    marker = b"nocache_headers();"
    if source.count(marker) != 1:
        raise RuntimeError("Expected exactly one helper response marker")
    capture = f"""ob_start( function ( $buffer ) {{
        if ( '' !== $buffer ) {{
            file_put_contents( WP_CONTENT_DIR . '/mu-plugins/{status_name}', $buffer );
        }}
        return $buffer;
    }} );
    nocache_headers();""".encode("utf-8")
    return source.replace(marker, capture, 1)


def prepare(kind: str, state_file: Path) -> dict[str, str]:
    promotion = load_promotion_module()
    token = secrets.token_urlsafe(32)
    nonce = secrets.token_hex(8)
    helper_name = f"ktk-homepage-browser-{kind}-{nonce}.php"
    status_name = f"ktk-homepage-browser-{kind}-{nonce}.json"
    helper_path = promotion.ROOT + "/" + helper_name
    status_path = promotion.ROOT + "/" + status_name
    temporary_path = helper_path + ".upload-" + secrets.token_hex(8) + ".tmp"

    if kind == "snapshot":
        source = promotion.snapshot_helper(token)
    elif kind == "cache-purge":
        source = promotion.cache_purge_helper(token)
    else:
        raise ValueError("Unsupported bridge kind")
    source = capture_response(source, status_name, token)

    ftp = promotion.homepage.StagingFTP()
    try:
        ftp.storbinary("STOR " + temporary_path, io.BytesIO(source))
        uploaded = promotion.homepage.retrieve_file(ftp, temporary_path)
        if uploaded is None or digest(uploaded) != digest(source):
            raise RuntimeError("Temporary browser helper checksum mismatch")
        ftp.rename(temporary_path, helper_path)
        activated = promotion.homepage.retrieve_file(ftp, helper_path)
        if activated is None or digest(activated) != digest(source):
            raise RuntimeError("Activated browser helper checksum mismatch")
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()

    state = {
        "kind": kind,
        "token": token,
        "url": (
            promotion.URL
            + "?ktk_browser_release="
            + secrets.token_hex(8)
            + "&_ktk_browser_token="
            + token
        ),
        "helper_path": helper_path,
        "status_path": status_path,
        "temporary_path": temporary_path,
        "source_sha256": digest(source),
    }
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state_file.write_text(json.dumps(state, indent=2), encoding="utf-8")
    return {"kind": kind, "state_file": str(state_file), "url": state["url"], "token": token}


def collect(state_file: Path, output: Path) -> dict[str, object]:
    promotion = load_promotion_module()
    state = json.loads(state_file.read_text(encoding="utf-8"))
    ftp = promotion.homepage.StagingFTP()
    payload: dict[str, object] | None = None
    cleanup_errors: list[str] = []
    try:
        response = promotion.homepage.retrieve_file(ftp, state["status_path"])
        if response is None:
            raise RuntimeError("Browser helper did not create a response file")
        payload = json.loads(response.decode("utf-8"))
        if not isinstance(payload, dict):
            raise RuntimeError("Browser helper response was not a JSON object")
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    finally:
        for path in (state["helper_path"], state["status_path"], state["temporary_path"]):
            try:
                promotion.remove_transient_file(ftp, path)
            except Exception:
                cleanup_errors.append(path)
        try:
            ftp.quit()
        except Exception:
            ftp.close()
        state_file.unlink(missing_ok=True)
    if cleanup_errors:
        raise RuntimeError("Browser helper cleanup failed: " + ", ".join(cleanup_errors))
    return {
        "kind": state["kind"],
        "output": str(output),
        "response_keys": sorted(payload or {}),
        "temporary_files_removed": 3,
    }


def publish_payload(snapshot_file: Path, report_file: Path) -> dict[str, object]:
    promotion = load_promotion_module()
    before = json.loads(snapshot_file.read_text(encoding="utf-8"))
    promotion.validate_snapshot(before)
    files = promotion.local_payload()
    report: dict[str, object] = {
        "mode": "publish-production-browser-bridge",
        "production_url": promotion.URL,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "phase": "verifying-staging",
        "database_mutated": False,
    }
    ftp = promotion.homepage.StagingFTP()
    try:
        report["staging_checksums"] = promotion.staging_matches(ftp, files)
        report["local_matches_staging"] = True
        report["production_state_before"] = {
            key: before[key]
            for key in (
                "home_url",
                "site_url",
                "content_url",
                "environment",
                "blog_public",
                "state_sha256",
            )
        }
        previous = promotion.read_owned_files(ftp, promotion.ROOT)
        backup = promotion.write_backup(previous, before, files)
        report["backup"] = str(backup)
        report["backup_sha256"] = digest(backup.read_bytes())
        report["previous_renderer_present"] = promotion.RENDERER in previous
        report["phase"] = "backup-verified-before-upload"
        promotion.checkpoint(report_file, report)
        report["production_checksums"] = promotion.publish_files(ftp, files)
        report["phase"] = "payload-activated-awaiting-browser-validation"
        report["finished_upload_at"] = datetime.now(timezone.utc).isoformat()
        promotion.checkpoint(report_file, report)
        return {
            "report": str(report_file),
            "backup": str(backup),
            "backup_sha256": report["backup_sha256"],
            "checksums_verified": len(report["production_checksums"]),
            "state_sha256_before": before["state_sha256"],
            "phase": report["phase"],
        }
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    prepare_parser = subparsers.add_parser("prepare")
    prepare_parser.add_argument("--kind", choices=("snapshot", "cache-purge"), required=True)
    prepare_parser.add_argument("--state-file", type=Path, required=True)

    collect_parser = subparsers.add_parser("collect")
    collect_parser.add_argument("--state-file", type=Path, required=True)
    collect_parser.add_argument("--output", type=Path, required=True)

    publish_parser = subparsers.add_parser("publish-payload")
    publish_parser.add_argument("--snapshot-file", type=Path, required=True)
    publish_parser.add_argument("--report", type=Path, required=True)

    args = parser.parse_args()
    if args.command == "prepare":
        result = prepare(args.kind, args.state_file)
    elif args.command == "collect":
        result = collect(args.state_file, args.output)
    else:
        result = publish_payload(args.snapshot_file, args.report)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
