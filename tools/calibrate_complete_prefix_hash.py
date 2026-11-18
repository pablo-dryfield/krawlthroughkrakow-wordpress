"""Complete-cohort read-only comparison of a reversible private SHA256 prototype."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from unittest import mock

from tools import calibrate_preparation_inspection as base
from tools import complete_prefix_hash_profile as prototype
from tools import full_private_engine_controller as compiler
from tools import private_termination_fixture_support as support

ADDITIONAL = (
    '.github/workflows/complete-prefix-hash-calibration.yml',
    'tools/calibrate_complete_prefix_hash.py',
    'tools/complete_prefix_hash_profile.py',
    'tools/tests/test_complete_prefix_hash_profile.py',
    'docs/seo/complete-prefix-hash-profile-2026-11-18/README.md',
)
OriginalObserver = base.Observer


def bindings(commit):
    primary = base.source_hashes()
    extra = {name: support.digest(base.ROOT / name) for name in ADDITIONAL}
    support.require(len(primary) == 104 and len(extra) == 5 and not set(primary) & set(extra), 'exact104-plus5-profile-inputs-required')
    base.verify_observer_sources(commit, primary)
    for name, expected in extra.items():
        support.require(base.backup.sha(base.calibration.git('show', commit + ':' + name)) == expected,
                        'additional-profile-source-not-reviewed:' + name)
    def check():
        for name, sha in (primary | extra).items():
            support.require(support.digest(base.ROOT / name) == sha, 'frozen-complete-prefix-profile-input-changed:' + name)
    check()
    return {'schemaVersion': 1, 'profile': 'complete-prefix-bounded64MiB-openssl-same-SHA256',
            'sourceCommit': commit, 'sourceTree': base.calibration.git('rev-parse', 'HEAD^{tree}').decode().strip(),
            'baseObserverSourceHashes': primary, 'additionalProfileSourceHashes': extra, 'totalSourceInputs': 109,
            'originalArm': 'original compiled stream with common public-capture observer',
            'instrumentedArm': 'temporary bounded complete-prefix digest plus original reversible leaf timers',
            'unchangedMemoryLimit': '256M', 'unchangedHTTPComparisonSeconds': 60,
            'actualPreparationOrRecoveryProgressClaimed': False, 'hostingAccepted': False}, check


def observer_factory(profile, check):
    def create(case, output, source_check):
        def combined():
            source_check();check()
        combined()
        binding_path = Path(output) / 'complete-prefix-profile-binding.json'
        support.require(not binding_path.exists(), 'fresh-complete-prefix-profile-binding-required')
        binding_path.write_bytes(base.calibration.encode(profile))
        observer = OriginalObserver(case, output, combined)
        path = observer.streams['instrumented']
        source = prototype.timed(compiler.stream_source())
        support.require(prototype.restore_timed(source) == compiler.stream_source(), 'complete-timed-prototype-inverse-required')
        path.write_bytes(source)
        observer.component_hashes[path.as_posix()] = base.backup.sha(source)
        combined()
        return observer
    return create


def run(output, commit):
    profile, check = bindings(commit)
    support.require(base.calibration.git('rev-parse', 'HEAD').decode().strip() == commit
                    and not base.calibration.git('status', '--porcelain'), 'clean-exact-profile-checkout-required')
    success = False
    try:
        with mock.patch.object(base, 'Observer', observer_factory(profile, check)):
            result = base.run(output, commit)
        check()
        success = True
        return result
    finally:
        path = Path(output) / 'report.json'
        if path.is_file():
            report = json.loads(path.read_bytes())
            report['completePrefixHashExperiment'] = profile
            report['all109ProfileSourcesExactAtSuccessfulReturn'] = success
            report['profileFinishedAt'] = datetime.now(timezone.utc).isoformat()
            temporary = path.with_name('report-complete-prefix-profile.tmp')
            with temporary.open('xb') as stream:
                stream.write(base.calibration.encode(report))
            temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-commit', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = run(args.output, args.source_commit)
    print(json.dumps({'status': result['status'], 'profile': 'complete-prefix-bounded64MiB-openssl-same-SHA256',
                      'source': args.source_commit, 'fullPreparationAccepted': False,
                      'fullRecoveryAccepted': False, 'hostingAccepted': False}))


if __name__ == '__main__':
    main()
