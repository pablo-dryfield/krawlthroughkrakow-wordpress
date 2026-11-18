"""Read-only synthetic comparison of complete staging capture implementations.

Uses current Git-verified public bytes and seven fake database tables. This is
capture calibration, never cleanup, hosting acceptance or a speed requirement.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import statistics
import subprocess
import sys
import time
import zipfile

from tools import full_private_seed_packet as full
from tools import staging_state_fast_capture as fast
from tools.tests import test_content_update_controller as native

ROOT = Path(__file__).resolve().parents[1]
MU = ROOT / 'staging/wp-content/mu-plugins'
MANIFEST = ROOT / 'docs/code-pages/full-migration/build-verification.json'
MEMORY_BYTES = 256 * 1024 * 1024
SOURCE_PATHS = (
    '.github/workflows/hash-capture-calibration.yml',
    'tools/calibrate_staging_capture.py',
    'tools/staging_state_fast_capture.py',
    'tools/staging-protected-state-core.php',
    'tools/staging-protected-state-fast-core.php',
    'tools/tests/test_staging_state_fast_capture.py',
    'tools/tests/test_calibrate_staging_capture.py',
    'tools/tests/test_content_update_controller.py',
    'tools/tests/test_production_protected_state.py',
    'tools/full_private_seed_packet.py',
    'tools/full_inventory_capacity.py',
    'tools/content_update_backup.py',
    'tools/content_update_staging_packet.py',
    'tools/build-production-state-core.py',
    'tools/promote-code-pages-production.py',
    'tools/production-protected-state-core.php',
    'tools/production-protected-fingerprint.php',
    'tools/snapshot-staging-update-state.py',
    'docs/code-pages/full-migration/build-verification.json',
    'docs/seo/fast-capture-local-2026-11-18/README.md',
)
SNAPSHOT = "echo json_encode(array('ok'=>true,'state'=>$capture()),JSON_THROW_ON_ERROR);"
MEASURED = r'''$start=hrtime(true);$state=$capture();$elapsed=hrtime(true)-$start;
echo json_encode(array('ok'=>true,'state'=>$state,'queries'=>$wpdb->queries,
 'metrics'=>array('captureNanoseconds'=>$elapsed,'peakAllocatedBytes'=>memory_get_peak_usage(true),
 'memoryLimit'=>ini_get('memory_limit'),'phpVersion'=>PHP_VERSION,'platform'=>PHP_OS_FAMILY,
 'opensslAvailable'=>function_exists('openssl_digest'),
 'opensslVersion'=>defined('OPENSSL_VERSION_TEXT')?OPENSSL_VERSION_TEXT:null)),JSON_THROW_ON_ERROR);'''


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encode(value):
    return json.dumps(value, ensure_ascii=False, indent=2).encode() + b'\n'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def ordered_arms(pairs):
    require(type(pairs) is int and 1 <= pairs <= 3, 'One to three balanced pairs required')
    return [arm for pair in range(pairs) for arm in
            (('original', 'candidate') if pair % 2 == 0 else ('candidate', 'original'))]


def comparable(state):
    require(isinstance(state, dict) and isinstance(state.get('capturedAt'), str), 'Complete timestamped state required')
    return {key: value for key, value in state.items() if key != 'capturedAt'}


def file_hash(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def tree_hashes(root):
    paths = list(root.rglob('*'))
    require(not any(path.is_symlink() for path in paths), 'Synthetic public symlink refused')
    return {path.relative_to(root).as_posix(): file_hash(path) for path in paths if path.is_file()}


def git(*args):
    run = subprocess.run(['git', '-C', str(ROOT), *args], capture_output=True, check=True, timeout=60)
    require(not run.stderr, 'Unexpected Git diagnostic')
    return run.stdout


def source_hashes(commit, local):
    require(re.fullmatch(r'[a-f0-9]{40}', commit) is not None, 'Exact source commit required')
    require(git('rev-parse', 'HEAD').decode().strip() == commit, 'Actual checkout must equal source commit')
    result = {}
    names = set(SOURCE_PATHS)
    # Include every imported repository module, in addition to dynamic source reads.
    for module in tuple(sys.modules.values()):
        location = getattr(module, '__file__', None)
        if location:
            path = Path(location).resolve()
            if path.is_relative_to(ROOT / 'tools') and path.suffix == '.py':
                names.add(path.relative_to(ROOT).as_posix())
    for name in sorted(names):
        data = (ROOT / name).read_bytes()
        if not local:
            require(git('show', commit + ':' + name) == data, 'Source differs from reviewed Git commit: ' + name)
        result[name] = {'bytes': len(data), 'sha256': sha(data)}
    require(fast.inverse(fast.TARGET.read_bytes()) == fast.SOURCE.read_bytes(), 'Complete raw capture inverse required')
    return result


def public_inventory(commit):
    proof = json.loads(MANIFEST.read_bytes())
    expected = proof.get('payloadChecksums')
    require(isinstance(expected, dict) and bool(expected) and proof.get('passed') == proof.get('total'), 'Verified full public manifest required')
    actual = full.snapshot.local_owned_checksums()
    require(actual == expected, 'Complete current public inventory differs')
    raw = git('ls-tree', '-rz', commit, '--', 'staging/wp-content/mu-plugins')
    objects = {}
    for row in raw.split(b'\0'):
        if not row:
            continue
        meta, name = row.split(b'\t', 1)
        mode, kind, object_id = meta.split()
        objects[name.decode()] = (mode, kind, object_id.decode())
    sizes = {}
    for name, digest in actual.items():
        part = PurePosixPath(name)
        require(not part.is_absolute() and '..' not in part.parts and str(part) == name, 'Exact relative public name required')
        path = MU / name
        data = path.read_bytes()
        blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        require(objects.get('staging/wp-content/mu-plugins/' + name) == (b'100644', b'blob', blob), 'Public source differs from Git: ' + name)
        require(sha(data) == digest, 'Public source changed during read')
        sizes[name] = len(data)
    return actual, sizes


def validate_capture(value, expected_state, expected_queries=None):
    require(isinstance(value, dict) and set(value) == {'ok', 'state', 'queries', 'metrics'} and value['ok'] is True, 'Complete successful capture required')
    state = value['state']
    require(comparable(state) == expected_state, 'Complete state differs beyond separately retained timestamp')
    queries = value['queries']
    require(isinstance(queries, list) and len(queries) == 7 and all(isinstance(q, str) and q.startswith('SELECT * FROM fixture_') for q in queries), 'Exactly seven selected reads required')
    if expected_queries is not None:
        require(queries == expected_queries, 'Exact original SQL scope required')
    metrics = value['metrics']
    require(set(metrics) == {'captureNanoseconds', 'peakAllocatedBytes', 'memoryLimit', 'phpVersion', 'platform', 'opensslAvailable', 'opensslVersion'}, 'Complete native metrics required')
    require(type(metrics['captureNanoseconds']) is int and metrics['captureNanoseconds'] > 0, 'Positive native elapsed time required')
    require(type(metrics['peakAllocatedBytes']) is int and 0 < metrics['peakAllocatedBytes'] < MEMORY_BYTES and metrics['memoryLimit'] == '256M', 'Original memory bound required')


def artifact_write(path, payloads):
    require(not path.exists(), 'New exclusive calibration archive required')
    with zipfile.ZipFile(path, 'x', zipfile.ZIP_DEFLATED) as archive:
        for name, data in payloads.items():
            archive.writestr(name, data)
    with zipfile.ZipFile(path) as archive:
        require(archive.testzip() is None and archive.namelist() == list(payloads), 'Exact calibration ZIP members and CRC required')
        for name, data in payloads.items():
            require(archive.read(name) == data, 'Complete calibration ZIP readback differs')
    return {'name': path.name, 'bytes': path.stat().st_size, 'sha256': file_hash(path),
            'members': {name: {'bytes': len(data), 'sha256': sha(data)} for name, data in payloads.items()},
            'completeMemberReadbackAndCRCVerified': True}


def run_calibration(output, commit, *, pairs=3, local=False):
    require(native.PHP is not None, 'Real native PHP required; no skipped calibration')
    require(not output.exists(), 'New exclusive calibration directory required')
    output.mkdir(parents=True)
    report = {'schemaVersion': 1, 'scope': 'complete-read-only-synthetic-capture-calibration',
              'at': datetime.now(timezone.utc).isoformat(), 'sourceCommit': commit,
              'actualCheckoutCommit': git('rev-parse', 'HEAD').decode().strip(),
              'localDevelopment': local, 'allSourceBytesVerifiedAgainstGit': not local,
              'platform': platform.platform(), 'status': 'started',
              'fullRecoveryAccepted': False, 'hostingAccepted': False, 'runs': []}
    report_path = output / 'report.json'
    try:
        arms = ordered_arms(pairs)
        report['sourceFiles'] = source_hashes(commit, local)
        owned, sizes = public_inventory(commit)
        report['publicInventory'] = {'files': len(owned), 'bytes': sum(sizes.values()),
                                     'mapSHA256': sha(full.snapshot.encode(owned))}
        payloads = {}
        case = native.ContentUpdateControllerTests('runTest')
        with case.fixture() as (root, mu, driver, config):
            for name in owned:
                target = mu / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(MU / name, target)
            config = {**config, 'operation': 'snapshot'}
            config['rows']['posts'][0]['post_content'] = 'Synthetic database bytes only. ' + 'x' * (9 * 1024 * 1024)
            source = driver.read_text(encoding='utf-8')
            require(source.count(SNAPSHOT) == 1, 'Exact owned snapshot driver required')
            driver.write_text(source.replace(SNAPSHOT, MEASURED, 1), encoding='utf-8')
            config_path = root / 'calibration-config.json'
            site = Path(config['site'])
            before = tree_hashes(site)
            require({name: before['wp-content/mu-plugins/' + name] for name in owned} == owned, 'Complete copied public bytes differ')
            require({name.removeprefix('wp-content/mu-plugins/'): digest for name, digest in before.items()
                     if name == 'wp-content/mu-plugins/ktk-code-pages.php' or name.startswith('wp-content/mu-plugins/ktk-code-pages-assets/')} == owned,
                    'Copied owned inventory has unknown additions')
            expected_protected = {}
            helper = Path(config['helper']).relative_to(mu).as_posix()
            for name, digest in before.items():
                if name.startswith('wp-content/mu-plugins/'):
                    suffix = name.removeprefix('wp-content/mu-plugins/')
                    if suffix != helper and suffix not in owned:
                        expected_protected['mu/' + suffix] = digest
                elif name.startswith('wp-content/plugins/ktk-storefront/'):
                    suffix = name.removeprefix('wp-content/plugins/ktk-storefront/')
                    if not suffix.startswith('frontend/'):
                        expected_protected['storefront/' + suffix] = digest
            expected_protected = dict(sorted(expected_protected.items()))
            require(set(expected_protected) == {'mu/ktk-homepage-shortcode.php', 'mu/ktk-consent-fixture.php', 'storefront/plugin.php'},
                    'Exact original synthetic protected fixture inventory required')
            golden = None
            queries = None
            for index, arm in enumerate(arms):
                config['captureComponent'] = (fast.SOURCE if arm == 'original' else fast.TARGET).as_posix()
                config_path.write_bytes(json.dumps(config).encode())
                start = time.perf_counter()
                process = subprocess.run([native.PHP, '-d', 'memory_limit=256M', '-d', 'allow_url_fopen=0', str(driver), str(config_path)],
                                         capture_output=True, timeout=90)
                wall = time.perf_counter() - start
                name = f'{index + 1:02d}-{arm}.json'
                # Preserve every observed byte before validation, including failed output.
                (output / name).write_bytes(process.stdout)
                (output / (name + '.stderr')).write_bytes(process.stderr)
                require(process.returncode == 0 and not process.stderr, 'Native capture exited with a diagnostic; observations retained')
                value = json.loads(process.stdout)
                if golden is None:
                    require(arm == 'original' and isinstance(value.get('state'), dict), 'Complete original baseline first required')
                    state = value['state']
                    full.snapshot.validate_snapshot(state, file_hash(Path(config['helper'])))
                    require(state['database'] == config['rows'] and state['rowCounts'] == {k: len(v) for k, v in config['rows'].items()}, 'All seven raw synthetic tables required')
                    require(state['ownedContentFiles'] == owned and state['protectedFiles'] == expected_protected, 'Independent complete public/protected maps differ')
                    require(state['identity'] == {'home': config['home'], 'siteurl': config['siteurl'], 'blogPublic': 0,
                                                 'frontPageId': 278, 'wordpressEnvironment': 'production'}, 'Exact synthetic identity required')
                    golden = comparable(state)
                    queries = value['queries']
                validate_capture(value, golden, queries)
                require(tree_hashes(site) == before, 'Any synthetic public mutation refuses calibration')
                require(not (root / ('.ktk-content-update-' + native.ID)).exists(), 'Snapshot must not initialize a private transaction')
                payloads[name] = process.stdout
                report['runs'].append({'arm': arm, 'pair': index // 2 + 1, 'wallSeconds': wall,
                                       'capturedAt': value['state']['capturedAt'], **value['metrics'],
                                       'rawMember': name, 'rawSHA256': sha(process.stdout),
                                       'completeStateAndQueriesExact': True, 'publicBeforeAfterExact': True})
                report_path.write_bytes(encode(report))
                print(json.dumps({'arm': arm, 'pair': index // 2 + 1, 'captureSeconds': value['metrics']['captureNanoseconds'] / 1e9,
                                  'wallSeconds': wall, 'peakBytes': value['metrics']['peakAllocatedBytes']}), flush=True)
            report['allSevenRawSyntheticTablesAndAllOtherFieldsExact'] = True
            report['allActualTimestampsRetained'] = True
        require(public_inventory(commit) == (owned, sizes), 'Repository public bytes changed during calibration')
        require(source_hashes(commit, local) == report['sourceFiles'], 'Calibration sources changed during observation')
        report['medianCaptureSeconds'] = {arm: statistics.median(row['captureNanoseconds'] / 1e9 for row in report['runs'] if row['arm'] == arm)
                                           for arm in ('original', 'candidate')}
        report['medianWallSeconds'] = {arm: statistics.median(row['wallSeconds'] for row in report['runs'] if row['arm'] == arm)
                                       for arm in ('original', 'candidate')}
        report['evidence'] = artifact_write(output / 'capture-evidence.zip', payloads)
        report['status'] = 'equivalence-verified-measurements-retained'
    except BaseException as error:
        report['status'] = 'failed'
        report['failureClass'] = type(error).__name__
        report_path.write_bytes(encode(report))
        raise
    report_path.write_bytes(encode(report))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--source-commit', required=True)
    parser.add_argument('--pairs', type=int, default=3)
    parser.add_argument('--local-development', action='store_true')
    args = parser.parse_args()
    report = run_calibration(args.output, args.source_commit, pairs=args.pairs, local=args.local_development)
    print(json.dumps({key: report[key] for key in ('status', 'sourceCommit', 'medianCaptureSeconds', 'fullRecoveryAccepted', 'hostingAccepted')}))


if __name__ == '__main__':
    main()
