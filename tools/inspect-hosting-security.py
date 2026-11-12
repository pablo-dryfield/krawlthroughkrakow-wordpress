"""Read-only FTPS inventory for hosting-level security diagnostics."""

from __future__ import annotations

import ftplib
import io
import json
import os
import re
import ssl


HOST = os.environ.get("KTK_FTP_HOST", "nl1-tr101.supercp.com")
USER = os.environ.get("KTK_FTP_USER", "krawlthroughkrak")
INTERESTING = re.compile(r"(?:imunify|audit|log)", re.IGNORECASE)


def connect() -> ftplib.FTP_TLS:
    password = os.environ.get("KTK_FTP_PASSWORD")
    if not password:
        raise RuntimeError("KTK_FTP_PASSWORD is required")
    ftp = ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=45)
    ftp.connect(HOST, 21)
    ftp.login(USER, password)
    ftp.prot_p()
    return ftp


def list_names(ftp: ftplib.FTP_TLS, path: str) -> dict[str, object]:
    try:
        names = [name.rsplit("/", 1)[-1] for name in ftp.nlst(path)]
        return {"accessible": True, "interesting_entries": sorted(name for name in names if INTERESTING.search(name))}
    except ftplib.error_perm as exc:
        return {"accessible": False, "ftp_status": str(exc).split(maxsplit=1)[0]}


def count_imunify_references(ftp: ftplib.FTP_TLS, path: str) -> dict[str, object]:
    content = io.BytesIO()
    try:
        ftp.retrbinary(f"RETR {path}", content.write)
    except ftplib.error_perm as exc:
        return {"accessible": False, "ftp_status": str(exc).split(maxsplit=1)[0]}
    text = content.getvalue().decode("utf-8", errors="replace")
    return {"accessible": True, "imunify_reference_count": len(re.findall(r"imunify", text, re.IGNORECASE))}


def account_marker_facts(ftp: ftplib.FTP_TLS) -> dict[str, dict[str, str]]:
    wanted = {".myimunify_id", ".imunify_patch_id"}
    try:
        entries = ftp.mlsd("/")
        return {
            name: {key: value for key, value in facts.items() if key in {"modify", "size", "type", "unix.mode"}}
            for name, facts in entries
            if name in wanted
        }
    except ftplib.error_perm:
        return {}


def main() -> None:
    ftp = connect()
    try:
        result = {
            "transport": "explicit FTPS, read-only inventory",
            "server": HOST,
            "account_root": ftp.pwd(),
            "imunify_account_markers": account_marker_facts(ftp),
            "account_paths": {
                path: list_names(ftp, path)
                for path in ("/", "/.cpanel", "/logs", "/public_html/wp-content/plugins")
            },
            "system_paths": {
                path: list_names(ftp, path)
                for path in ("/var/log/imunify360", "/usr/share/imunify360", "/etc/imunify360")
            },
            "htaccess": {
                path: count_imunify_references(ftp, path)
                for path in ("/public_html/.htaccess", "/public_html/staging/.htaccess")
            },
        }
        print(json.dumps(result, indent=2, sort_keys=True))
    finally:
        try:
            ftp.quit()
        except OSError:
            ftp.close()


if __name__ == "__main__":
    main()
