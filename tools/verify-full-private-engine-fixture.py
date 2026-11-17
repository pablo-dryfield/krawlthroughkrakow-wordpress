#!/usr/bin/env python3
"""Run the actual full inventory in an owned local PHP fixture; never connect or deploy."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tools import content_update_backup as backup
from tools import full_private_engine_client as client_module
from tools import full_private_engine_exercise as exercise
from tools import full_private_seed_packet as full
from tools.tests import test_full_private_engine_preparation as integration

APPLICATION = '93aa88a19a3956788e80fe7e9c7c16bb986b980f'
OBSERVATION_SECONDS = 600  # Local subprocess observation only; no host timeout changes.
REPORT_DIRECTORY = ROOT / 'docs/seo/full-private-engine-2026-11-16'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def instrument_driver(source, largest):
    replacements = [
        ('source/ktk-code-pages-assets/media/large.bin', 'source/' + largest),
        ("array('ok'=>true,'value'=>$value)",
         "array('ok'=>true,'value'=>$value,'phpEnvelopeBytes'=>strlen(json_encode(array('privateProfile'=>'full-private-engine-v1','helperSha256'=>$c['packet']['helperSha256'],'controller'=>$value),JSON_THROW_ON_ERROR)),'peakAllocatedBytes'=>memory_get_peak_usage(true))"),
    ]
    for old, new in replacements:
        require(source.count(old) == 1, 'Exact local fixture driver anchor required')
        source = source.replace(old, new, 1)
    require(source.startswith('<?php'), 'Exact local PHP driver required')
    return source.replace('<?php', "<?php ini_set('memory_limit','256M');", 1)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--application-commit', required=True, choices=[APPLICATION])
    parser.add_argument('--report', required=True)
    args = parser.parse_args(argv)
    destination = (ROOT / args.report).absolute()
    require(destination.parent == REPORT_DIRECTORY and destination.suffix == '.json'
            and not destination.exists() and not destination.is_symlink(),
            'Fresh report in the exact SEO batch directory required')
    require(integration.old.PHP, 'Real PHP required; no skipped full fixture')
    subprocess.run(['git', 'diff', '--exit-code', args.application_commit, '--', 'staging'],
                   cwd=ROOT, check=True, capture_output=True)
    require(not subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard',
                                        '--', 'staging'], cwd=ROOT),
            'Untracked application files refused')
    spec = importlib.util.spec_from_file_location(
        'ktk_actual_inventory_fixture_snapshot', ROOT / 'tools/snapshot-staging-update-state.py')
    snapshot = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(snapshot)
    owned = snapshot.local_owned_checksums()
    public_source = ROOT / 'staging/wp-content/mu-plugins'
    sizes = {name: (public_source / name).stat().st_size for name in owned}
    largest = max(sizes, key=lambda name: (sizes[name], name))
    require(len(owned) == 2074 and sum(sizes.values()) == 550629558
            and sizes[largest] == 35437747, 'Exact frozen complete application inventory required')
    report = {
        'scope': 'LOCAL full actual-inventory private engine fixture; synthetic selected database; no hosting',
        'startedAt': datetime.now(timezone.utc).isoformat(),
        'toolingCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'applicationCommit': args.application_commit, 'actualPublicFiles': len(owned),
        'actualPublicBytes': sum(sizes.values()), 'largestUnchangedSourceBytes': sizes[largest],
        'subprocessObservationSeconds': OBSERVATION_SECONDS, 'phpMemoryLimit': '256M',
        'steps': [], 'fullHostTransactionAcceptance': False, 'applicationWrites': 0,
        'databaseWrites': 0, 'cachePurges': 0, 'productionOperations': 0,
    }

    def checkpoint(phase=None):
        if phase is not None:
            report['phase'] = phase
        report['updatedAt'] = datetime.now(timezone.utc).isoformat()
        destination.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')

    checkpoint('initializing-local-fixture')
    case = integration.FullPrivatePreparationIntegrationTests('runTest')
    fixture_root = None
    try:
        case.setUp()
        fixture_root = case.root
        require(fixture_root.resolve().is_relative_to(Path(tempfile.gettempdir()).resolve())
                and fixture_root.name.startswith('ktk-production-state-fixture-'),
                'Exact owned temporary fixture required')
        expected_dirs = {p.as_posix() for name in owned for p in Path(name).parents
                         if p.as_posix() != '.'}
        assets = case.mu / 'ktk-code-pages-assets'
        for path in sorted(assets.rglob('*'), key=lambda p: len(p.parts), reverse=True):
            require(path.resolve().is_relative_to(fixture_root.resolve()), 'Owned fixture path required')
            name = path.relative_to(case.mu).as_posix()
            if path.is_file() and name not in owned:
                path.unlink()
            elif path.is_dir() and name not in expected_dirs:
                path.rmdir()
        for index, (name, digest) in enumerate(owned.items()):
            target = case.mu / name
            require(target.resolve().is_relative_to(fixture_root.resolve()), 'Owned fixture target required')
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(public_source / name, target)
            require(backup.sha(target.read_bytes()) == digest, 'Actual source copy differs')
            if index % 256 == 0:
                report['localSourceFilesCopied'] = index + 1
                checkpoint('copying-actual-source-to-owned-temp')
        case.source = None
        private_marker = 'Private original content must never enter controller responses'
        case.cfg['rows']['posts'][0]['post_content'] = (
            private_marker + '\n' + 'Synthetic private source record.\n' * (9 * 1024 * 1024 // 33))
        case.cfg['operation'] = 'snapshot'
        before_state = case.case.call(case.root, case.driver, case.cfg)['state']
        require(before_state['ownedContentFiles'] == owned, 'Full fixture capture differs')
        plan, _, overrides = full.plan(integration.old.ID, args.application_commit, owned, sizes,
                                       before_state['protectedStateSha256'])
        case.plan = plan
        case.binding = full.binding(plan)
        case.owned, case.sizes, case.overrides = owned, sizes, overrides
        case.cfg['packet'].update(plan=plan, publicOwnedSha256=backup.sha(backup.encode(owned, sort=True)))
        case.cfg.update(binding=case.binding, sizes=sizes, overrides=overrides,
                        operation='controller', seedFault='prefix')
        case.driver.write_text(instrument_driver(case.driver.read_text(encoding='utf-8'), largest), encoding='utf-8')
        before_public = case.public()
        cuts = {'original': False, 'engine': False}

        def diagnostic(kind, **details):
            report.setdefault('diagnostics', []).append({'kind': kind, **details})
            checkpoint('local-diagnostic-' + kind)

        def transport(raw):
            action = json.loads(raw)['action']
            engine_cut = action == 'apply' and not cuts['engine']
            case.cfg.update(operation='controller', request=raw.decode(),
                            fault='exit-after-rename' if engine_cut else '')
            config = case.root / 'controller-config.json'
            config.write_text(json.dumps(case.cfg), encoding='utf-8')
            started = time.perf_counter()
            try:
                process = subprocess.run([integration.old.PHP, str(case.driver), str(config)],
                                         capture_output=True, text=True, timeout=OBSERVATION_SECONDS)
            except subprocess.TimeoutExpired:
                diagnostic('subprocess-timeout', action=action, seconds=time.perf_counter() - started,
                           observationLimitSeconds=OBSERVATION_SECONDS)
                raise
            seconds = time.perf_counter() - started
            if process.returncode == 74 and action == 'recover-preparation' and not cuts['original']:
                require(not process.stderr, 'Controlled original cut emitted unexpected stderr')
                cuts['original'] = True
                case.cfg['seedFault'] = ''
                report['plannedOriginalInterruption'] = {'returnCode': 74, 'seconds': seconds}
                checkpoint('planned-original-prefix-interrupted')
                raise TimeoutError('Controlled local original prefix interruption')
            if process.returncode == 73 and engine_cut:
                require(not process.stderr, 'Controlled engine cut emitted unexpected stderr')
                cuts['engine'] = True
                case.cfg['fault'] = ''
                report['plannedEngineInterruption'] = {'returnCode': 73, 'seconds': seconds}
                checkpoint('planned-engine-rename-interrupted')
                raise TimeoutError('Controlled local engine rename interruption')
            if process.returncode or process.stderr:
                diagnostic('php-process', action=action, returnCode=process.returncode,
                           stderrBytes=len(process.stderr.encode()), stderrSha256=backup.sha(process.stderr.encode()),
                           stderrFirst500=process.stderr[:500], seconds=seconds)
                raise RuntimeError('Fixture PHP process failed; details retained')
            try:
                value = json.loads(process.stdout)
            except Exception as error:
                diagnostic('php-json', action=action, exceptionType=type(error).__name__, seconds=seconds,
                           stdoutBytes=len(process.stdout.encode()), stdoutSha256=backup.sha(process.stdout.encode()),
                           stdoutFirst500=process.stdout[:500])
                raise
            if not value.get('ok'):
                diagnostic('php-refusal', action=action, seconds=seconds, phpMessage=value.get('message'))
                raise RuntimeError('Fixture PHP refused; details retained')
            require(private_marker not in process.stdout, 'Selected private content leaked into response')
            controller = value['value']
            envelope = {'privateProfile': client_module.PROFILE,
                        'helperSha256': case.cfg['packet']['helperSha256'], 'controller': controller}
            canonical_bytes = len(backup.encode(envelope))
            response_bytes = value.get('phpEnvelopeBytes')
            require(type(response_bytes) is int and 0 < response_bytes <= 2097152
                    and canonical_bytes <= 2097152, 'Full fixture exceeds the unchanged response cap')
            item = {'action': action, 'seconds': seconds, 'peakAllocatedBytes': value['peakAllocatedBytes'],
                    'responseBytes': response_bytes, 'canonicalEnvelopeBytes': canonical_bytes}
            if 'preparation' in controller:
                seed = controller['preparation']['fullSeed']
                item.update(phase='preparation', privateFiles=len(seed['files']) if seed else 0,
                            privateBytes=seed['copiedBytes'] if seed else 0)
                item['seedsComplete'] = controller['preparation']['seedsComplete']
                if seed and seed['sourceComplete'] and seed['targetComplete']:
                    require(controller['preparation']['enginePhase'] is None and not case.engine.exists(),
                            'Complete seed response must precede any engine preparation')
                    require(len(seed['files']) == 4149 and seed['copiedBytes'] == 1101087955,
                            'Exact full complete seed boundary required')
                    if action == 'recover-preparation':
                        report['fullSeedCompletionReturnedBeforeEngine'] = True
                        report['completeSeedBoundary'] = {**item, 'stateSha256': controller['stateSha256']}
            else:
                item.update(phase=controller['engine']['phase'],
                            pendingApply=len(controller['engine']['pendingApplyFiles']),
                            pendingRollback=len(controller['engine']['pendingRollbackFiles']))
                if not report.get('enginePreparationSeparateRequestVerified'):
                    previous = report['steps'][-1] if report['steps'] else {}
                    require(action == 'recover-preparation' and item['phase'] == 'prepared'
                            and report.get('fullSeedCompletionReturnedBeforeEngine') is True
                            and previous.get('action') == 'inspect-preparation'
                            and previous.get('seedsComplete') is True,
                            'Engine preparation must use a fresh request after complete-seed inspection')
                    report['enginePreparationSeparateRequestVerified'] = True
            report['steps'].append(item)
            checkpoint('local-' + item['phase'])
            print(json.dumps({'fixtureProgress': item}), flush=True)
            return envelope

        class DiagnosticClient(client_module.FullPrivateEngineClient):
            def validate_preparation(self, envelope):
                try:
                    return super().validate_preparation(envelope)
                except Exception as error:
                    diagnostic('preparation-validation', exceptionType=type(error).__name__, message=str(error)[:500])
                    raise

            def validate(self, envelope):
                try:
                    return super().validate(envelope)
                except Exception as error:
                    diagnostic('engine-validation', exceptionType=type(error).__name__, message=str(error)[:500])
                    raise

        client = DiagnosticClient(plan, sizes, overrides, case.mu, case.cfg['packet']['helperSha256'],
                                  integration.old.KEY, transport, lambda n: (case.private / n).read_bytes())
        archive_directory = case.root / 'deploy-backups'
        archive_directory.mkdir()
        original_path, rollback_path = archive_directory / 'original.zip', archive_directory / 'rollback.zip'

        class OriginalTransport:
            def original_manifest(self):
                case.cfg['operation'] = 'capsule'
                return case.case.call(case.root, case.driver, case.cfg)['capsule']

            def acknowledge_original(self, path, key, manifest):
                receipt = full.verify_archive(path, plan, key, case.cfg['packet']['helperSha256'], manifest)
                case.cfg['originalArchive'] = {'originalManifestSha256': manifest['manifestSha256'],
                                               'originalArchiveSha256': receipt['sha256']}
                empty = not (case.private / 'source').exists() and not (case.private / 'target').exists()
                require(empty, 'Original archive must precede all streamed payload')
                report['originalArchiveBeforeAnyPayload'] = True

        def observe(event, value):
            if event == 'original-archived':
                report['originalArchive'] = value
            elif event == 'inspect-original-cut':
                row = value['preparation']['fullSeed']['files']['source/' + largest]
                report['originalPrefixVerified'] = {'path': largest, **row}
            elif event == 'rollback-archived':
                report['rollbackArchive'] = value
            elif event == 'inspect-engine-cut':
                report['engineCutIndependentlyInspected'] = True
            checkpoint('local-' + event)

        with mock.patch.object(full, 'ROOT', case.root):
            original_manifest, _, prepared = exercise.prepare(
                client, OriginalTransport(), original_path, lambda n: (case.private / n).read_bytes(),
                full.build_archive, interrupt_original=True, observe=observe)
        expected, _ = full.expected_seed_files(plan, sizes, overrides)
        require(len(expected) == 4149 and sum(row['bytes'] for row in expected.values()) == 1101087955,
                'Exact complete private payload required')
        for name, row in expected.items():
            path = case.private / name
            require(path.stat().st_size == row['bytes'] and backup.sha(path.read_bytes()) == row['sha256'],
                    'Independent full private payload hash differs')
        report.update(fullPrivateFiles=len(expected), fullPrivateBytes=sum(r['bytes'] for r in expected.values()),
                      privatePreparationVerified=prepared['prepared'], allFullPrivatePayloadHashesVerified=True)
        checkpoint('local-full-private-prepared')
        with mock.patch.object(backup, 'ROOT', case.root):
            transaction = exercise.transact(client, rollback_path, interrupt_engine=True, observe=observe)
        require(transaction['privateApplyCalls'] == transaction['privateRollbackCalls'] == 5,
                'Exact five apply/rollback calls required')
        original_reopened = full.verify_archive(original_path, plan, integration.old.KEY,
                                                case.cfg['packet']['helperSha256'], original_manifest)
        rollback_reopened = backup.verify_archive(rollback_path, integration.old.KEY, client.manifest)
        require(original_reopened == report['originalArchive'] and rollback_reopened == client.verified_archive(),
                'Independent final archive reopen differs')
        require(case.public() == before_public, 'Fixture public state changed')
        case.cfg['operation'] = 'snapshot'
        after = case.case.call(case.root, case.driver, case.cfg)['state']
        keys = ('identity', 'database', 'databaseSha256', 'protectedFiles', 'ownedContentFiles',
                'protectedStateSha256', 'rowCounts')
        require(all(before_state[k] == after[k] for k in keys), 'Fixture selected/protected state changed')
        require(snapshot.local_owned_checksums() == owned, 'Repository application source changed')
        require(report.get('fullSeedCompletionReturnedBeforeEngine') is True
                and report.get('enginePreparationSeparateRequestVerified') is True,
                'Both separated complete preparation boundaries required')
        report.update(transaction, fullPrivateEngineLocalVerified=True, archivesReopenedAfterClosure=True,
                      allActualLocalSourceFilesRetained=True, allFixtureSelectedPublicProtectedStateExact=True,
                      maxPeakAllocatedBytes=max(x['peakAllocatedBytes'] for x in report['steps']),
                      maxResponseBytes=max(x['responseBytes'] for x in report['steps']),
                      maxRequestSeconds=max(x['seconds'] for x in report['steps']))
        checkpoint('local-full-shape-engine-verified')
    except BaseException as error:
        report.update(terminalFailureType=type(error).__name__, terminalFailureMessage=str(error)[:500])
        checkpoint('local-full-shape-failed')
        raise
    finally:
        case.doCleanups()
        report['ownedTemporaryFixtureRemoved'] = fixture_root is None or not fixture_root.exists()
        report['finishedAt'] = datetime.now(timezone.utc).isoformat()
        checkpoint()
        print('KTK_FULL_PRIVATE_FIXTURE_RESULT=' + json.dumps(report, separators=(',', ':')), flush=True)
    require(report['ownedTemporaryFixtureRemoved'], 'Owned temporary fixture cleanup failed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
