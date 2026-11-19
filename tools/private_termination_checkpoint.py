"""Atomic, explicitly incomplete synthetic evidence; never recovery authority."""
from pathlib import Path
import hashlib
import json
import os
import tempfile
import zipfile

from tools.private_termination_fixture_support import require, digest


def _directory(path):
    require(path.is_absolute() and path.is_dir() and path.resolve() == path
            and not path.is_symlink() and not path.is_junction(), 'canonical-checkpoint-directory-required')


def _prior(destination, previous):
    require(not destination.is_symlink() and not destination.is_junction(), 'checkpoint-link-preserved')
    if previous is None:
        require(not destination.exists(), 'existing-unowned-checkpoint-preserved')
    else:
        require(isinstance(previous, dict) and previous.get('name') == destination.name
                and destination.is_file() and destination.stat().st_size == previous.get('bytes')
                and digest(destination) == previous.get('sha256'), 'changed-checkpoint-preserved')


def retain(root, destination, report, previous=None):
    """Keep a closed previous ZIP until the next complete ZIP passes readback.

    Only exact observed replies/closed diagnostic archives are copied. No private
    tree, helper source, context replay or completion certificate is synthesized.
    The caller supplies its exclusive synthetic fixture and scoped report path.
    """
    root, destination = Path(root), Path(destination)
    _directory(root)
    _directory(destination.parent)
    require(root.name.startswith('ktk-production-state-fixture-')
            and destination.name.endswith('.checkpoint.zip'), 'owned-partial-checkpoint-path-required')
    _prior(destination, previous)
    require(isinstance(report, dict) and report.get('fullHostTransactionAcceptance') is False
            and report.get('fullActualHelperRecoveryComplete') is False, 'incomplete-evidence-only')
    steps = report.get('steps')
    require(isinstance(steps, list) and len(steps) < 100000, 'bounded-completed-steps-required')
    members = {}
    numbers = []
    for step in steps:
        require(isinstance(step, dict), 'typed-checkpoint-step-required')
        if step.get('kind') != 'new-helper':
            continue
        n = step.get('number')
        require(type(n) is int and 1 <= n <= 99999 and (not numbers or n > numbers[-1]), 'ordered-unique-helper-call-required')
        numbers.append(n)
        if 'replyRelativePath' in step:
            name = f'observed-replies/reply-{n:05d}.json'
            require(step['replyRelativePath'] == name, 'exact-numbered-reply-required')
            members[name] = (root / name, step.get('replyBytes'), step.get('replySHA256'))
        else:
            require(step.get('observationTimedOut') is True, 'missing-raw-reply-not-a-completed-result')
        if 'diagnosticStream' in step:
            stream = step['diagnosticStream']
            name = f'local-diagnostic-call-{n:05d}.zip'
            require(stream.get('archive') == name, 'exact-numbered-stream-required')
            p = root / name
            require(p.is_file() and not p.is_symlink() and not p.is_junction(), 'closed-owned-stream-required')
            with zipfile.ZipFile(p) as z:
                require(z.namelist() == ['checkpoints.jsonl'] and z.testzip() is None,
                        'complete-diagnostic-archive-required')
                raw = z.read('checkpoints.jsonl')
                require(len(raw) == stream.get('rawBytes') and hashlib.sha256(raw).hexdigest() == stream.get('rawSHA256'),
                        'complete-diagnostic-stream-bytes-required')
            members['diagnostics/' + name] = (p, p.stat().st_size, stream.get('archiveSHA256'))
    require(bool(numbers), 'observed-helper-evidence-required')
    for p, size, sha in members.values():
        _directory(p.parent)
        require(p.resolve().is_relative_to(root) and p.is_file() and not p.is_symlink()
                and not p.is_junction() and type(size) is int and 0 <= size <= 16777216
                and p.stat().st_size == size and digest(p) == sha, 'exact-closed-evidence-bytes-required')
    snapshot = {k: v for k, v in report.items() if k != 'partialEvidenceArchive'}
    raw_report = (json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n').encode()
    require(len(raw_report) <= 67108864, 'bounded-checkpoint-report-required')
    manifest = {'scope': 'Incomplete synthetic observation evidence only; final state and recovery NOT certified',
                'fullRecoveryAccepted': False, 'hostingAccepted': False,
                'observedHelperCalls': numbers, 'unfinishedCall': report.get('activeCall'),
                'files': {n: {'bytes': size, 'sha256': sha} for n, (_, size, sha) in members.items()}}
    manifest['files']['checkpoint-report.json'] = {'bytes': len(raw_report), 'sha256': hashlib.sha256(raw_report).hexdigest()}
    handle, name = tempfile.mkstemp(prefix=destination.name + '.', suffix='.pending', dir=destination.parent)
    os.close(handle)
    pending = Path(name)
    try:
        with zipfile.ZipFile(pending, 'w', zipfile.ZIP_DEFLATED, compresslevel=3) as z:
            z.writestr('checkpoint-report.json', raw_report)
            for member, (p, _, _) in members.items():
                z.write(p, member)
            z.writestr('checkpoint-manifest.json', json.dumps(manifest, indent=2) + '\n')
        with zipfile.ZipFile(pending) as z:
            require(z.testzip() is None and set(z.namelist()) == set(manifest['files']) | {'checkpoint-manifest.json'},
                    'checkpoint-members-and-crcs-required')
            require(json.loads(z.read('checkpoint-manifest.json')) == manifest, 'complete-checkpoint-manifest-readback-required')
            for member, row in manifest['files'].items():
                with z.open(member) as stream:
                    actual = hashlib.file_digest(stream, 'sha256').hexdigest()
                require(z.getinfo(member).file_size == row['bytes'] and actual == row['sha256'],
                        'checkpoint-complete-readback-required')
        _prior(destination, previous)
        receipt = {'name': destination.name, 'bytes': pending.stat().st_size, 'sha256': digest(pending),
                   'lastObservedHelperCall': numbers[-1], 'observedHelperCalls': len(numbers),
                   'allMembersReadbackAndCRCVerified': True, 'fullRecoveryAccepted': False, 'hostingAccepted': False}
        os.replace(pending, destination)
        return receipt
    finally:
        if pending.exists():
            require(pending.parent == destination.parent and pending.name.startswith(destination.name + '.')
                    and pending.name.endswith('.pending') and not pending.is_symlink(), 'owned-pending-file-required')
            pending.unlink()
