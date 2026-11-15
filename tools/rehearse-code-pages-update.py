"""Rehearse the active-content transaction on local Git-derived fixture directories only."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BASE = '0cec9853877d06eb1ffee21bba296b76553828c2'
PREFIX = 'staging/wp-content/mu-plugins/'
ENGINE = ROOT / 'tools/code-pages-update-engine.php'
DRIVER = r'''<?php
define('KTK_UPDATE_ENGINE_ALLOWED', true);
require $argv[1];
$c = json_decode(file_get_contents($argv[2]), true, 512, JSON_THROW_ON_ERROR);
$guard = static fn() => hash_file('sha256', $c['protected']);
$observer = static function ($event, $name) use ($argv) { if (($argv[4] ?? '') === 'crash' && $event === 'after-rename') { exit(73); } };
$transaction = new KTK_Active_Content_Transaction($c['source'], $c['target'], $c['private'], $c['plan'], $guard, $observer);
if (!in_array($argv[3], array('prepare', 'apply', 'rollback', 'inspect'), true)) { throw new RuntimeException('Fixture action required'); }
$action = $argv[3]; echo json_encode($transaction->$action(), JSON_THROW_ON_ERROR);
'''


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def tree(directory):
    return {p.relative_to(directory).as_posix(): sha(p.read_bytes()) for p in directory.rglob('*') if p.is_file()}


def write(directory, name, data):
    p = directory / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', required=True, help='Existing read-only planner receipt; no connection is made')
    parser.add_argument('--report', required=True, help='Fresh local evidence path')
    args = parser.parse_args()
    planner = load('ktk_fixture_planner', 'plan-code-pages-update.py')
    inventory_path = planner.inside_workspace(args.inventory)
    destination = planner.inside_workspace(args.report)
    if destination.exists():
        raise ValueError('Preserve prior fixture evidence')
    inventory = json.loads(inventory_path.read_bytes())
    if inventory.get('mode') != 'read-only-production-update-plan' or inventory.get('phase') != 'inventory-complete' or inventory.get('remoteWrites') != 0 or inventory.get('productionInventoryVerified') is not True or inventory.get('canPublish') is not False:
        raise ValueError('Completed read-only inventory required')
    pages = load('ktk_fixture_pages', 'publish-code-pages.py')
    legacy = load('ktk_fixture_legacy', 'promote-code-pages-production.py')
    files = pages.local_payload(full=True)
    expected = {n: sha(b) for n, b in files.items()}
    if expected != inventory['payloadChecksums']:
        raise ValueError('Current local bytes must match the immutable rehearsed application')
    planner.validate_source_commit(expected, inventory['applicationCommit'])
    prior = inventory['productionExistingChecksums']
    changes = planner.change_plan(expected, prior, sha(legacy.ACTIVATION_SOURCE))
    if changes != inventory['changes']:
        raise ValueError('Inventory change set differs')
    engine_sha = sha(ENGINE.read_bytes())
    runner_sha = sha(Path(__file__).read_bytes())
    result = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'scope': 'Offline local filesystem fixtures, no website operations',
              'remoteWrites': 0, 'productionBackupCreated': False, 'productionWordPressStateVerified': False, 'canPublish': False,
              'applicationCommit': inventory['applicationCommit'], 'engineSha256': engine_sha, 'runnerSha256': runner_sha,
              'inventorySha256': sha(inventory_path.read_bytes()), 'priorGitCommit': BASE, 'payloadFiles': len(expected),
              'priorFiles': len(prior), 'changedFiles': len(changes['changedFiles']), 'newFiles': len(changes['newFiles']),
              'requiredPriorFileBackups': len(changes['requiredPriorFileBackups']), 'runs': []}
    with tempfile.TemporaryDirectory(prefix='ktk-full-update-fixture-') as temporary:
        root = Path(temporary)
        source, target, private = (root / n for n in ('staging-fixture', 'active-fixture', 'private'))
        for p in (source, target, private):
            p.mkdir()
        for name, data in files.items():
            write(source, name, data)
        # Do not extract a tar tree into the workspace. Select only known, exact-hash owned files.
        process = subprocess.Popen(['git', 'archive', '--format=tar', BASE, PREFIX], cwd=ROOT, stdout=subprocess.PIPE)
        archive_complete = False
        try:
            with tarfile.open(fileobj=process.stdout, mode='r|') as archive:
                for entry in archive:
                    name = entry.name.removeprefix(PREFIX)
                    if name in prior and entry.isfile():
                        planner.payload_name(name)
                        data = archive.extractfile(entry).read()
                        if name == 'ktk-code-pages-assets/runtime.js':
                            # Reconstruct only the separately verified production endpoint hotfix, then require its actual prior SHA.
                            old = b"fetch(cf7?form.dataset.feedbackEndpoint:form.action,{method:'POST'"
                            new = b"fetch(cf7?form.dataset.feedbackEndpoint:form.getAttribute('action'),{method:'POST'"
                            if sha(data) != '38cdaa565d7fabc7f58e05cd8697dd79996c9c755d0beca9fda9e2503b2fc9e3' or data.count(old) != 1:
                                raise ValueError('Exact original native form endpoint anchor required')
                            data = data.replace(old, new)
                        if sha(data) != prior[name]:
                            raise ValueError('Historical fixture bytes differ from actual inventory: ' + name)
                        write(target, name, data)
                archive_complete = True
        finally:
            process.stdout.close()
            if process.wait() != 0 and archive_complete:
                raise RuntimeError('Git fixture archive failed')
        write(target, planner.ACTIVATION, legacy.ACTIVATION_SOURCE)
        if tree(source) != expected or tree(target) != prior:
            raise ValueError('Complete initial fixture inventories differ')
        protected = root / 'protected-state.json'
        protected.write_bytes(b'ISOLATED FIXTURE ONLY: no real WordPress/account state')
        driver = root / 'fixture.php'
        driver.write_bytes(DRIVER.encode())
        config = root / 'config.json'
        for identity, crash in (('a' * 32, False), ('b' * 32, True)):
            config.write_bytes(json.dumps({'source': str(source), 'target': str(target), 'private': str(private), 'protected': str(protected),
                                          'plan': {'transactionId': identity, 'applicationCommit': inventory['applicationCommit'],
                                                   'protectedStateSha256': sha(protected.read_bytes()), 'expected': expected, 'prior': prior}}).encode())

            def call(action, die=False):
                row = subprocess.run(['php', '-d', 'allow_url_fopen=0', str(driver), str(ENGINE), str(config), action, 'crash' if die else ''],
                                     capture_output=True, text=True, timeout=300)
                if die:
                    if row.returncode != 73:
                        raise RuntimeError('Fixture did not stop after an actual replacement: ' + row.stderr)
                    return None
                if row.returncode:
                    raise RuntimeError('Fixture ' + action + ' failed: ' + row.stderr)
                return json.loads(row.stdout)

            prepared = call('prepare')
            if prepared['verifiedBackupFiles'] != len(changes['requiredPriorFileBackups']) or tree(target) != prior:
                raise ValueError('Fixture prior backup count or pre-write inventory differs')
            applied = call('apply', crash)
            if crash:
                applied = call('inspect')
                if applied['phase'] != 'applying' or len(applied['intentFiles']) != 1 or tree(target) == prior:
                    raise ValueError('Expected one actual interrupted replacement and retained intent')
            elif tree(target) != expected | {planner.ACTIVATION: sha(legacy.ACTIVATION_SOURCE)} or applied['phase'] != 'applied':
                raise ValueError('Complete installed fixture inventory differs')
            rolled = call('rollback')
            if rolled['phase'] != 'rolled-back' or tree(target) != prior or tree(source) != expected or not rolled['protectedStateVerified']:
                raise ValueError('Exact fixture rollback/source/protected state mismatch')
            result['runs'].append({'scenario': 'process-death-after-first-replacement' if crash else 'complete-apply-and-rollback',
                                   'preparedBackupFiles': prepared['verifiedBackupFiles'], 'recordedIntentFiles': len(applied['intentFiles']),
                                   'finalPhase': rolled['phase'], 'exactPriorInventory': True, 'exactStagingInventory': True,
                                   'retainedActivation': True, 'protectedFixtureStateVerified': True})
            print(json.dumps(result['runs'][-1]), flush=True)
    if sha(ENGINE.read_bytes()) != engine_sha or sha(Path(__file__).read_bytes()) != runner_sha:
        raise RuntimeError('Engine/runner changed during rehearsal; evidence rejected')
    result.update(finishedAt=datetime.now(timezone.utc).isoformat(), fixtureDirectoriesRemoved=True)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes((json.dumps(result, indent=2) + '\n').encode())


if __name__ == '__main__':
    main()
