"""Read-only preparation inspection timing, never preparation/recovery acceptance."""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import statistics
import subprocess
import tempfile
import time
from unittest import mock
import zipfile

from tools import calibrate_staging_capture as calibration
from tools import content_update_backup as backup
from tools import full_private_engine_client as client_module
from tools import full_private_engine_controller as compiler
from tools import full_private_seed_packet as full
from tools import preparation_inspection_diagnostics as diagnostic
from tools import private_termination_fixture_support as support
from tools import staging_state_fast_capture as fast
from tools.tests import test_full_private_engine_preparation as native

ROOT = Path(__file__).resolve().parents[1]
APP = '00dfa3134db9028f76fe01039ff961ef52180693'
PUBLIC_BYTES = 550639063
PRIVATE_BYTES = 1101099599
MEMORY = '256M'
OBSERVATION_SECONDS = 600
HTTP_COMPARISON_SECONDS = 60


def helper_source_hashes():
    spec = importlib.util.spec_from_file_location('preparation_inspection_source_inputs', ROOT / 'tools/verify-private-termination-fixture.py')
    previous = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(previous)
    return previous.source_fingerprints()


def source_hashes():
    hashes = helper_source_hashes()
    paths = set(calibration.SOURCE_PATHS) | {
        '.gitignore',
        '.github/workflows/preparation-inspection-calibration.yml',
        'tools/calibrate_preparation_inspection.py', 'tools/preparation_inspection_diagnostics.py',
        'tools/tests/test_preparation_inspection_calibration.py',
        'docs/seo/preparation-inspection-profile-2026-11-18/README.md',
    }
    for name in sorted(paths):
        hashes[name] = support.digest(ROOT / name)
    return dict(sorted(hashes.items()))


def verify_observer_sources(commit, hashes):
    """Keep the helper's96-input guard; verify the extra observer domain too."""
    base = helper_source_hashes()
    support.require(len(base) == 90 and len(hashes) == 104 and set(hashes) == set(source_hashes())
                    and all(hashes.get(name) == sha for name, sha in base.items()), 'exact-helper-and-observer-input-domains-required')
    support.verify_reviewed_sources(ROOT, commit, base)
    extra = {name: sha for name, sha in hashes.items() if name not in base}
    support.require(len(extra) == 14, 'exact-additional-observer-inputs-required')
    for name, expected in extra.items():
        data = calibration.git('show', commit + ':' + name)
        support.require(backup.digest(expected) and backup.sha(data) == expected
                        and support.digest(ROOT / name) == expected, 'additional-observer-source-differs:' + name)


def owned_root(root):
    root = Path(root)
    support.require(root.is_absolute() and root.resolve() == root and root.is_dir()
                    and root.name.startswith('ktk-production-state-fixture-')
                    and not root.is_symlink() and not root.is_junction(), 'owned-calibration-fixture-required')


def tree_witness(root):
    root = Path(root)
    support.require(root.is_dir() and not root.is_symlink() and not root.is_junction(), 'canonical-witness-root-required')
    files, directories = {}, []
    for parent, dirs, names in os.walk(root, followlinks=False):
        for name in dirs:
            p = Path(parent, name)
            support.require(not p.is_symlink() and not p.is_junction() and p.resolve().is_relative_to(root.resolve()), 'witness-directory-link-refused')
            directories.append(p.relative_to(root).as_posix())
        for name in sorted(names):
            p = Path(parent, name)
            before = p.lstat()
            support.require(p.is_file() and not p.is_symlink() and not p.is_junction() and before.st_nlink == 1, 'witness-file-link-refused')
            sha = support.digest(p)
            after = p.lstat()
            fields = ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns', 'st_nlink')
            support.require(all(getattr(before, n) == getattr(after, n) for n in fields), 'witness-file-changed-during-read')
            files[p.relative_to(root).as_posix()] = {'bytes': after.st_size, 'sha256': sha,
                'device': after.st_dev, 'inode': after.st_ino, 'mtimeNs': after.st_mtime_ns,
                'ctimeNs': after.st_ctime_ns, 'links': after.st_nlink}
    return {'files': dict(sorted(files.items())), 'directories': sorted(directories)}


def populate(case, phase):
    """Explicit manual fixture construction, never controller progress/recovery."""
    support.require(phase in ('source-prefix', 'complete-seeds'), 'explicit-fixture-phase-required')
    owned_root(case.root)
    largest = max(case.sizes, key=case.sizes.get)
    prefix = case.private / 'source' / largest
    if phase == 'source-prefix':
        support.require(not (case.private / 'source').exists() and not (case.private / 'target').exists(), 'fresh-source-prefix-construction-required')
        inventories = [('source', case.plan['expected'])]
    else:
        support.require(prefix.is_file() and not (case.private / 'target').exists(), 'separate-complete-construction-required')
        inventories = [('source', {largest: case.plan['expected'][largest]}), ('target', case.plan['prior'])]
    writes = 0
    for folder, inventory in inventories:
        for name, expected in inventory.items():
            target = case.private / folder / name
            support.require(target.resolve().is_relative_to(case.private.resolve()) and not target.is_symlink()
                            and not target.is_junction(), 'owned-fixture-payload-path-required')
            support.require(not target.exists() or (phase == 'complete-seeds' and target == prefix), 'unknown-fixture-payload-preserved')
            target.parent.mkdir(parents=True, exist_ok=True)
            if phase == 'source-prefix' and name == largest:
                with (case.mu / name).open('rb') as stream:
                    data = stream.read(65536)
                support.require(len(data) == 65536 and len(data) < case.sizes[name], 'actual-incomplete-prefix-required')
                target.write_bytes(data)
            elif folder == 'target' and name in case.overrides:
                target.write_bytes(base64.b64decode(case.overrides[name], validate=True))
            else:
                shutil.copyfile(case.mu / name, target)
            if not (phase == 'source-prefix' and name == largest):
                support.require(support.digest(target) == expected, 'constructed-payload-sha256-differs')
            writes += 1
    return {'phase': phase, 'manuallyWrittenPayloadFiles': writes, 'largest': largest,
            'partialBytes': 65536 if phase == 'source-prefix' else None,
            'preparationOrRecoveryProgressClaimed': False}


class Observer:
    def __init__(self, case, output, source_check):
        owned_root(case.root)
        self.case, self.output, self.source_check = case, Path(output), source_check
        self.calls, self.phase, self.prepare_calls = [], 'construction', 0
        self.driver = diagnostic.instrument_driver(case.driver.read_text(encoding='utf-8'))
        case.driver.write_text(self.driver, encoding='utf-8')
        self.driver_sha = support.digest(case.driver)
        self.public_root = case.cfg['packet']['publicRoot']
        self.site = case.cfg['site']
        self.helper = case.cfg['helper']
        self.helper_sha = support.digest(Path(self.helper))
        self.streams = {}
        self.component_hashes = {p: support.digest(Path(p)) for p in case.cfg['components']}
        for arm, data in [('original', compiler.stream_source()), ('instrumented', diagnostic.instrument_stream(compiler.stream_source()))]:
            p = case.root / ('measurement-' + arm + '-stream.php')
            p.write_bytes(data)
            self.streams[arm] = p
            self.component_hashes[p.as_posix()] = backup.sha(data)
        old_stream = case.root / 'engine-stream.php'
        support.require(case.cfg['components'].count(old_stream.as_posix()) == 1, 'one-owned-stream-component-required')
        self.stream_index = case.cfg['components'].index(old_stream.as_posix())
        self.components = list(case.cfg['components'])
        case.cfg['captureComponent'] = fast.TARGET.as_posix()
        support.require(fast.embedded(fast.SOURCE.read_bytes()) == fast.TARGET.read_bytes(), 'complete-reviewed32MiB-capture-required')
        self.set_arm('original')

    def set_arm(self, arm):
        support.require(arm in self.streams, 'known-measurement-arm-required')
        self.arm = arm
        self.case.cfg['components'][self.stream_index] = self.streams[arm].as_posix()

    def call(self, root, driver, cfg, exit_code=0):
        self.source_check()
        support.require(Path(root) == self.case.root and Path(driver) == self.case.driver and exit_code == 0,
                        'one-owned-observation-driver-required')
        support.require(cfg.get('production') is False and cfg.get('productionAuthorized') is False
                        and cfg.get('fault') == '' and cfg.get('seedFault') == ''
                        and cfg['packet']['mode'] == 'private-staging-rehearsal', 'synthetic-private-only-observation-required')
        support.require(cfg['packet']['publicRoot'] == self.public_root and cfg['site'] == self.site
                        and cfg['helper'] == self.helper and cfg['packet']['helperPath'] == self.helper
                        and support.digest(Path(self.helper)) == self.helper_sha, 'exact-owned-public-fixture-and-helper-required')
        support.require(support.digest(driver) == self.driver_sha and cfg['captureComponent'] == fast.TARGET.as_posix(), 'frozen-observer-driver-and-capture-required')
        expected_components = list(self.components)
        expected_components[self.stream_index] = self.streams[self.arm].as_posix()
        support.require(cfg['components'] == expected_components, 'exact-observer-components-required')
        for p in expected_components:
            support.require(support.digest(Path(p)) == self.component_hashes[p], 'frozen-observer-component-changed')
        kind = cfg['operation']
        action = json.loads(cfg['request'])['action'] if kind == 'controller' else kind
        support.require((kind == 'controller' and action in ('prepare', 'inspect-preparation')) or kind in ('snapshot', 'capsule'), 'no-recovery-or-application-action-in-profiler')
        if action == 'prepare':
            support.require(self.phase == 'construction' and self.prepare_calls == 0 and not self.case.private.exists(), 'one-fresh-fixture-initialization-required')
            self.prepare_calls += 1
        number = len(self.calls) + 1
        stem = f'call-{number:03d}-{action}'
        config = root / 'inspection-observer-config.json'
        config.write_bytes(json.dumps(cfg).encode())
        started = time.perf_counter()
        try:
            process = subprocess.run([native.old.PHP, '-d', 'memory_limit=256M', '-d', 'allow_url_fopen=0', str(driver), str(config)], capture_output=True, timeout=OBSERVATION_SECONDS)
        except subprocess.TimeoutExpired as error:
            (self.output / (stem + '.json')).write_bytes(error.stdout or b'')
            (self.output / (stem + '.stderr')).write_bytes(error.stderr or b'')
            self.calls.append({'number': number, 'action': action, 'phase': self.phase, 'arm': self.arm,
                               'observationTimedOut': True, 'stateUncertainNoReplay': True})
            raise
        seconds = time.perf_counter() - started
        (self.output / (stem + '.json')).write_bytes(process.stdout)
        (self.output / (stem + '.stderr')).write_bytes(process.stderr)
        row = {'number': number, 'phase': self.phase, 'arm': self.arm, 'action': action,
               'seconds': seconds, 'returnCode': process.returncode, 'rawMember': stem + '.json',
               'rawBytes': len(process.stdout), 'rawSHA256': backup.sha(process.stdout),
               'stderrBytes': len(process.stderr), 'stderrSHA256': backup.sha(process.stderr)}
        self.calls.append(row)
        support.require(process.returncode == 0 and not process.stderr, 'native-observer-failed-raw-bytes-retained')
        value = json.loads(process.stdout)
        support.require(value.get('ok') is True, 'native-readonly-inspection-refused-raw-reply-retained')
        if kind != 'snapshot':
            support.require(b'Private original content must never enter controller responses' not in process.stdout, 'private-row-entered-response')
        if 'observer' in value:
            row['observer'] = diagnostic.validate(value['observer'])
        support.require(support.digest(driver) == self.driver_sha, 'observer-driver-changed-during-call')
        for p in expected_components:
            support.require(support.digest(Path(p)) == self.component_hashes[p], 'observer-component-changed-during-call')
        self.source_check()
        support.require(seconds <= HTTP_COMPARISON_SECONDS, 'observation-exceeds-original60-second-comparison-no-replay')
        return value


def install_actual_source(case, owned, sizes):
    owned_root(case.root)
    expected_dirs = {p.as_posix() for name in owned for p in Path(name).parents if p.as_posix() != '.'}
    for p in sorted((case.mu / 'ktk-code-pages-assets').rglob('*'), key=lambda p: len(p.parts), reverse=True):
        support.require(p.resolve().is_relative_to(case.root), 'owned-old-fixture-source-path-required')
        name = p.relative_to(case.mu).as_posix()
        if p.is_file() and name not in owned:
            p.unlink()
        elif p.is_dir() and name not in expected_dirs:
            p.rmdir()
    for name, sha in owned.items():
        p = case.mu / name
        support.require(p.resolve().is_relative_to(case.root), 'owned-current-fixture-source-path-required')
        p.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(calibration.MU / name, p)
        support.require(support.digest(p) == sha, 'complete-public-fixture-copy-differs')
    case.source = None
    case.cfg['rows']['posts'][0]['post_content'] = 'Private original content must never enter controller responses\n' + 'Synthetic private source record.\n' * (9 * 1024 * 1024 // 33)
    case.cfg['operation'] = 'snapshot'
    state = case.case.call(case.root, case.driver, case.cfg)['state']
    full.snapshot.validate_snapshot(state, support.digest(Path(case.cfg['helper'])))
    support.require(state['ownedContentFiles'] == owned and state['database'] == case.cfg['rows'], 'complete-initial-state-and-seven-raw-tables-required')
    case.plan, _, case.overrides = full.plan(native.old.ID, APP, owned, sizes, state['protectedStateSha256'])
    case.binding, case.owned, case.sizes = full.binding(case.plan), dict(owned), dict(sizes)
    case.cfg['packet'].update(plan=case.plan, publicOwnedSha256=backup.sha(backup.encode(owned, sort=True)))
    case.cfg.update(binding=case.binding, sizes=case.sizes, overrides=case.overrides, operation='controller', seedFault='', originalArchive=None)
    case.before = case.public()
    case.client = client_module.FullPrivateEngineClient(case.plan, case.sizes, case.overrides, case.mu,
        case.cfg['packet']['helperSha256'], native.old.KEY, case.transport, lambda name: (case.private / name).read_bytes())
    return state


def snapshot(case):
    case.cfg['operation'] = 'snapshot'
    out = case.case.call(case.root, case.driver, case.cfg)
    state = out['state']
    full.snapshot.validate_snapshot(state, support.digest(Path(case.cfg['helper'])))
    support.require(state['database'] == case.cfg['rows'] and state['ownedContentFiles'] == case.owned, 'complete-public-and-raw-table-witness-required')
    return state


def write_archive(path, files):
    support.require(not path.exists(), 'fresh-observation-archive-required')
    rows = {}
    with zipfile.ZipFile(path, 'x', zipfile.ZIP_DEFLATED, compresslevel=3) as z:
        for name, p in sorted(files.items()):
            rows[name] = {'bytes': p.stat().st_size, 'sha256': support.digest(p)}
            z.write(p, name)
    with zipfile.ZipFile(path) as z:
        support.require(z.testzip() is None and set(z.namelist()) == set(rows), 'closed-observation-archive-members-required')
        for name, row in rows.items():
            with z.open(name) as stream:
                digest = hashlib.file_digest(stream, 'sha256').hexdigest()
            support.require(z.getinfo(name).file_size == row['bytes'] and digest == row['sha256'], 'complete-observation-readback-required')
    return {'name': path.name, 'bytes': path.stat().st_size, 'sha256': support.digest(path), 'members': rows}


def run(output, commit, *, local=False):
    output = Path(output).absolute()
    allowed = ROOT / 'docs/seo/preparation-inspection-profile-2026-11-18'
    support.require(not allowed.is_symlink() and not allowed.is_junction() and allowed.resolve() == allowed
                    and output.parent == allowed and output.name in ('ubuntu-calibration', 'local-calibration')
                    and not output.exists() and not output.is_symlink() and not output.is_junction(), 'fresh-scoped-observer-output-required')
    hashes = source_hashes()
    support.require(calibration.git('rev-parse', 'HEAD').decode().strip() == commit, 'exact-calibration-checkout-required')
    if not local:
        verify_observer_sources(commit, hashes)
        support.require(not calibration.git('status', '--porcelain'), 'clean-reviewed-inspection-calibration-source-required')
    def source_check():
        for name, sha in hashes.items():
            support.require(support.digest(ROOT / name) == sha, 'frozen-inspection-calibration-source-changed:' + name)
    owned, sizes = calibration.public_inventory(commit)
    support.require(len(owned) == 2074 and sum(sizes.values()) == PUBLIC_BYTES, 'all2074-current-public-source-files-required')
    output.mkdir(parents=True)
    report = {'scope': 'Complete synthetic read-only preparation inspection calibration; manually assembled payload; NOT preparation/engine/recovery/hosting acceptance',
        'startedAt': datetime.now(timezone.utc).isoformat(), 'sourceCommit': commit, 'applicationCommit': APP,
        'actualCheckoutCommit': calibration.git('rev-parse', 'HEAD').decode().strip(),
        'actualCheckoutTree': calibration.git('rev-parse', 'HEAD^{tree}').decode().strip(),
        'sourceHashes': hashes, 'localDevelopment': local, 'publicFiles': len(owned), 'publicBytes': sum(sizes.values()),
        'originalHelperSourceInputs': 90, 'additionalObserverSourceInputs': 14,
        'expectedCompletePrivatePayloadFiles': 4149, 'expectedCompletePrivatePayloadBytes': PRIVATE_BYTES,
        'memoryLimit': MEMORY, 'localSubprocessObservationSeconds': OBSERVATION_SECONDS,
        'unchangedHTTPComparisonSeconds': HTTP_COMPARISON_SECONDS, 'fullPreparationAccepted': False,
        'fullRecoveryAccepted': False, 'hostingAccepted': False, 'phases': [], 'calls': []}
    case, observer, retained = None, None, []
    original_temp = tempfile.TemporaryDirectory
    success = False
    def preserve(*args, **kwargs):
        selected = kwargs.get('prefix') == 'ktk-production-state-fixture-'
        if selected:
            kwargs['delete'] = False
        value = original_temp(*args, **kwargs)
        if selected:
            retained.append(value)
        return value
    def checkpoint():
        report['calls'] = observer.calls if observer else []
        (output / 'report.json').write_bytes(calibration.encode(report))
    try:
        report['localDisk'] = support.ensure_space(tempfile.gettempdir(), PUBLIC_BYTES, PRIVATE_BYTES)
        report['evidenceDisk'] = support.ensure_space(output, PUBLIC_BYTES, PRIVATE_BYTES)
        with mock.patch.object(tempfile, 'TemporaryDirectory', preserve):
            case = native.FullPrivatePreparationIntegrationTests('runTest')
            case.setUp()
        owned_root(case.root)
        support.require(any(Path(t.name).resolve() == case.root for t in retained), 'factory-owned-preserved-fixture-required')
        observer = Observer(case, output, source_check)
        case.case.call = observer.call
        initial = install_actual_source(case, owned, sizes)
        case.client.prepare()
        report['originalArchive'] = case.original()
        report['fixtureRoot'] = str(case.root)
        report['streamOriginalSHA256'] = support.digest(observer.streams['original'])
        report['streamInstrumentedSHA256'] = support.digest(observer.streams['instrumented'])
        report['driverSHA256'] = observer.driver_sha
        report['observerComponentHashes'] = observer.component_hashes
        public_root = Path(case.cfg['packet']['publicRoot'])
        first_public = tree_witness(public_root)
        metadata = None
        for phase in ('source-prefix', 'complete-seeds'):
            observer.phase = 'construction-' + phase
            construction = populate(case, phase)
            if phase == 'source-prefix':
                prefix = case.private / 'source' / construction['largest']
                (output / 'source-prefix.bin').write_bytes(prefix.read_bytes())
            before = tree_witness(case.private)
            current_metadata = {n: row for n, row in before['files'].items() if not n.startswith(('source/', 'target/'))}
            if metadata is None:
                metadata = current_metadata
            else:
                support.require(current_metadata == metadata, 'original-metadata-changed-between-construction-phases')
            (output / (phase + '-private-before.json')).write_bytes(calibration.encode(before))
            row = {'phase': phase, 'construction': construction, 'runs': [], 'partialStateIsNotRecoveryProgress': True}
            report['phases'].append(row)
            golden = None
            for index, label in enumerate(calibration.ordered_arms(3)):
                arm = 'original' if label == 'original' else 'instrumented'
                observer.set_arm(arm)
                observer.phase = phase + '-before'
                a = snapshot(case)
                support.require(calibration.comparable(a) == calibration.comparable(initial), 'complete-before-public/raw-witness-drift')
                observer.phase = phase + '-measurement'
                value = case.client.inspect_preparation()
                observed = observer.calls[-1]
                seed = value['preparation']['fullSeed']
                expected_complete = phase == 'complete-seeds'
                support.require(seed['sourceComplete'] is expected_complete and seed['targetComplete'] is expected_complete
                                and value['preparation']['seedsComplete'] is expected_complete and not case.engine.exists(), 'exact-manual-inspection-state-required')
                if expected_complete:
                    support.require(len(seed['files']) == 4149 and seed['copiedBytes'] == PRIVATE_BYTES, 'all4149-complete-seed-prefixes-required')
                else:
                    support.require(len(seed['files']) == 2074 and seed['files']['source/' + construction['largest']]['bytes'] == 65536, 'all2074-source-prefixes-required')
                if golden is None:
                    golden = value
                support.require(value == golden, 'whole-inspection-response-changed-between-arms')
                support.require(tree_witness(case.private) == before and tree_witness(public_root) == first_public, 'inspection-mutated-public-private-bytes-or-identity')
                observer.phase = phase + '-after'
                b = snapshot(case)
                support.require(calibration.comparable(b) == calibration.comparable(a), 'complete-after-public/raw-witness-drift')
                row['runs'].append({'arm': arm, 'pair': index // 2 + 1, 'call': observed['number'],
                    'seconds': observed['seconds'], 'observer': observed['observer'], 'rawMember': observed['rawMember'],
                    'rawSHA256': observed['rawSHA256'], 'allPublicPrivateMetadataAndRawRowsUnchanged': True})
                checkpoint()
                print(json.dumps({'inspectionPhase': phase, 'arm': arm, 'pair': index // 2 + 1,
                                  'controllerSeconds': observed['observer']['controllerNs'] / 1e9}), flush=True)
            row['allWholeResponsesExact'] = True
            row['privateWitnessSHA256'] = support.digest(output / (phase + '-private-before.json'))
            row['medianControllerSeconds'] = {arm: statistics.median(r['observer']['controllerNs'] / 1e9 for r in row['runs'] if r['arm'] == arm) for arm in ('original', 'instrumented')}
            checkpoint()
        files = {p.name: p for p in output.iterdir() if p.is_file() and p.name != 'report.json'}
        files.update({'source/observer-driver.php': case.driver,
                      'source/controller-original.php': case.root / 'full-controller.php',
                      'source/stream-original.php': observer.streams['original'],
                      'source/stream-instrumented.php': observer.streams['instrumented']})
        observations = case.root / 'inspection-observations.zip'
        report['observationsArchive'] = write_archive(observations, files)
        evidence = output / 'inspection-fixture-evidence.zip'
        report['fixtureEvidence'] = support.preserve_fixture(case.private,
            [observations, case.root / 'deploy-backups/original.zip'], case.root, APP, owned, sizes, evidence,
            lambda name: ((calibration.MU / name).stat().st_size, support.digest(calibration.MU / name)))
        source_check()
        support.require(calibration.public_inventory(commit) == (owned, sizes), 'repository-source-inventory-changed')
        report['allBeforeAfterSourcesExact'] = True
        report['status'] = 'complete-readonly-inspection-observations-retained; no full recovery acceptance'
        success = True
    except BaseException as error:
        report['status'] = 'failed-no-replay'
        report['failure'] = {'type': type(error).__name__, 'messageSHA256': backup.sha(str(error).encode())}
        raise
    finally:
        if case is not None:
            case.doCleanups()
        if success:
            for directory in retained:
                owned_root(Path(directory.name))
                directory.cleanup()
            report['ownedTemporaryFixtureRemoved'] = all(not Path(t.name).exists() for t in retained)
        else:
            report['ownedTemporaryFixturesPreserved'] = [t.name for t in retained]
        report['finishedAt'] = datetime.now(timezone.utc).isoformat()
        checkpoint()
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-commit', required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--local-development', action='store_true')
    args = parser.parse_args()
    value = run(args.output, args.source_commit, local=args.local_development)
    print(json.dumps({'status': value['status'], 'source': value['sourceCommit'], 'phases': len(value['phases']),
                      'fullPreparationAccepted': False, 'fullRecoveryAccepted': False, 'hostingAccepted': False}))


if __name__ == '__main__':
    main()
