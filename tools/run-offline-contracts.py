"""Two exhaustive, disjoint offline unittest module groups; no test limits change."""
from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
PARTS = 2


def digest(value):
    return hashlib.sha256(json.dumps(value, separators=(',', ':'), ensure_ascii=True).encode()).hexdigest()


def partition(identities):
    ids = sorted(identities)
    if not ids or len(set(ids)) != len(ids):
        raise ValueError('A nonempty unique complete test inventory is required')
    modules = defaultdict(list)
    for name in ids:
        if not isinstance(name, str) or not name.startswith('test_') or name.count('.') < 2:
            raise ValueError('Only discovered offline test identities are allowed')
        modules[name.split('.', 1)[0]].append(name)
    groups = [[], []]
    for name, members in sorted(modules.items(), key=lambda item: (-len(item[1]), item[0])):
        index = min(range(PARTS), key=lambda i: (len(groups[i]), i))
        groups[index].extend(members)
    groups = [sorted(group) for group in groups]
    if not all(groups) or set(groups[0]) & set(groups[1]) or sorted(groups[0] + groups[1]) != ids:
        raise ValueError('Both module groups must be nonempty, disjoint and exhaustive')
    return groups


def flatten(suite):
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            yield from flatten(item)
        else:
            yield item


def run_cases(cases, identities, part, report_path, stream=None, source=None):
    if type(part) is not int or part not in range(PARTS):
        raise ValueError('Exact part zero or one required')
    if not identities or [case.id() for case in cases] != identities or len(set(identities)) != len(identities):
        raise ValueError('Every selected identity must bind one actual test case')
    path = Path(report_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    report = dict(source or {}, schemaVersion=1, part=part, parts=PARTS,
                  selectedIDs=identities, selectedIDsSHA256=digest(sorted(identities)),
                  selectedCount=len(identities), startedAt=datetime.now(timezone.utc).isoformat(),
                  complete=False, passed=False, startedIDs=[], completedIDs=[], durations=[])
    with path.open('x', encoding='utf8', newline='\n') as handle:
        json.dump(report, handle, indent=2)
    began = time.monotonic()

    class ObservedResult(unittest.TextTestResult):
        def startTest(self, test):
            report['startedIDs'].append(test.id())
            self.started = time.monotonic()
            self.stream.writeln('START ' + test.id())
            self.stream.flush()
            super().startTest(test)

        def stopTest(self, test):
            report['completedIDs'].append(test.id())
            report['durations'].append({'id': test.id(), 'seconds': time.monotonic() - self.started})
            super().stopTest(test)

    try:
        result = unittest.TextTestRunner(stream=stream, verbosity=1, resultclass=ObservedResult).run(unittest.TestSuite(cases))
        report.update(testsRun=result.testsRun, failures=len(result.failures), errors=len(result.errors),
                      skipped=[{'id': test.id(), 'reason': reason} for test, reason in result.skipped],
                      expectedFailures=len(result.expectedFailures), unexpectedSuccesses=len(result.unexpectedSuccesses))
        report['complete'] = (result.testsRun == len(identities) and
                              report['startedIDs'] == identities and report['completedIDs'] == identities)
        report['passed'] = report['complete'] and result.wasSuccessful()
    finally:
        report['elapsedSeconds'] = time.monotonic() - began
        report['finishedAt'] = datetime.now(timezone.utc).isoformat()
        path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf8', newline='\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--part', type=int, choices=range(PARTS), required=True)
    parser.add_argument('--report', required=True)
    args = parser.parse_args()
    target = (ROOT / args.report).resolve()
    allowed = (ROOT / 'deploy-backups').resolve()
    if allowed not in target.parents or any(p.is_symlink() for p in [target, *target.parents] if p == allowed or allowed in p.parents):
        raise ValueError('A fresh report inside deploy-backups is required')
    sys.path.insert(0, str(ROOT))
    loader = unittest.TestLoader()
    cases = list(flatten(loader.discover(str(ROOT / 'tools/tests'), pattern='test_*.py')))
    if loader.errors:
        raise RuntimeError('Test discovery errors cannot become a smaller passing suite')
    ids = [case.id() for case in cases]
    groups = partition(ids)
    selected = set(groups[args.part])
    chosen = [case for case in cases if case.id() in selected]
    files = {'tools/' + Path(__file__).name: hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    for module in sorted({name.split('.', 1)[0] for name in ids}):
        relative = 'tools/tests/' + module + '.py'
        files[relative] = hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()
    source = {'allIDs': sorted(ids), 'allIDsSHA256': digest(sorted(ids)), 'allCount': len(ids),
              'groupIDsSHA256': [digest(group) for group in groups], 'groupCounts': [len(group) for group in groups],
              'sourceFilesSHA256': files,
              'actualCheckout': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'actualTree': subprocess.check_output(['git', 'rev-parse', 'HEAD^{tree}'], cwd=ROOT, text=True).strip()}
    report = run_cases(chosen, [case.id() for case in chosen], args.part, target, source=source)
    print(json.dumps({k: report[k] for k in ['part', 'allCount', 'selectedCount', 'testsRun', 'complete', 'passed', 'failures', 'errors', 'elapsedSeconds']}), flush=True)
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
