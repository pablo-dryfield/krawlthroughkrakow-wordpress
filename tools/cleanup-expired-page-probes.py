"""Remove only expired, byte-recognized staging probes from an interrupted publisher."""
import argparse
from datetime import datetime, timezone
import ftplib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import time
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('pages_publisher', ROOT / 'tools/publish-code-pages.py')
pages = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pages)


def normalize(source):
    return re.sub(rb'time\(\) > \d+', b'time() > EXPIRY', source)


def recognized(source, not_before, now):
    expiry = re.search(rb'time\(\) > (\d+)', source)
    token = re.search(rb"hash_equals\('([a-f0-9]{48})'", source)
    if not expiry or not token or not not_before <= int(expiry[1]) < now:
        return False
    manifest = json.loads((ROOT / 'docs/code-pages/full-migration/manifest.json').read_text())
    expected = pages.probe_helper(token[1].decode(), manifest)
    # The initial interrupted run predated the approved exact legacy cache URL.
    earlier = expected.replace(b',"/store/Bottomless-Brunch-p661114244"', b'')
    return normalize(source) in (normalize(expected), normalize(earlier))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--not-before', required=True)
    parser.add_argument('--report', required=True)
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    not_before = datetime.fromisoformat(args.not_before.replace('Z', '+00:00')).timestamp()
    now = time.time()
    if not 0 < now - not_before < 86400:
        raise RuntimeError('Cleanup must be bounded to the current task day')
    report_path = ROOT / args.report
    if report_path.exists():
        raise RuntimeError('Preserve earlier evidence')
    publisher = pages.load_publisher()
    ftp = publisher.StagingFTP()
    report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'publish': args.publish, 'removed': [], 'unrecognized': []}
    try:
        eligible = {}
        for name, facts in ftp.mlsd(pages.REMOTE):
            if facts.get('type') != 'file' or not re.fullmatch(r'ktk-pages-probe-[a-f0-9]{16}\.php', name):
                continue
            content = io.BytesIO()
            ftp.retrbinary('RETR ' + pages.REMOTE + '/' + name, content.write)
            if recognized(content.getvalue(), not_before, now):
                eligible[name] = content.getvalue()
            else:
                report['unrecognized'].append(name)
        report['recognizedCount'] = len(eligible)
        if args.publish and eligible:
            archive = ROOT / 'deploy-backups' / ('expired-page-probes-' + datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S') + '.zip')
            with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED) as backup:
                for name, content in eligible.items():
                    backup.writestr(name, content)
            with zipfile.ZipFile(archive) as backup:
                if any(backup.read(name) != content for name, content in eligible.items()):
                    raise RuntimeError('Probe checkpoint failed verification')
            report['backup'] = str(archive.relative_to(ROOT))
            report['backupSha256'] = hashlib.sha256(archive.read_bytes()).hexdigest()
            for name, content in eligible.items():
                fresh = io.BytesIO()
                ftp.retrbinary('RETR ' + pages.REMOTE + '/' + name, fresh.write)
                if fresh.getvalue() != content:
                    raise RuntimeError('Probe changed since inspection; refusing cleanup')
                ftp.delete(pages.REMOTE + '/' + name)
                report['removed'].append(name)
            remaining = {name for name, _ in ftp.mlsd(pages.REMOTE)}
            if remaining.intersection(eligible):
                raise RuntimeError('Probe removal not verified')
    finally:
        ftp.close()
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
