"""Default-offline, restartable coordinator for one isolated original-SVG pilot.

Cloudflare operations go through the existing authenticated MCP connection.
An emitted request is an intent, not evidence it ran. No OAuth token is exported.
Only upload/cleanup can connect to FTPS, after their separate preflight checks.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import secrets
import subprocess
import sys
import time
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/seo/svg-pilot-runner-2026-11-18'
SOURCES = ('tools/svg-pilot-runner.py', 'tools/svg-pilot-runner.ps1', 'tools/svg-pilot-core.py', 'tools/svg-pilot-http.py', 'tools/svg-pilot-edge.mjs', 'tools/svg-negotiation-payload.py', 'tools/svg-negotiation-origin.php')


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), ROOT / 'tools' / (name + '.py'))
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


core, http = load('svg-pilot-core'), load('svg-pilot-http')


def read_json(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 2000000:
        raise ValueError('Bounded ordinary JSON file required')
    return json.loads(path.read_text(encoding='utf-8'))


def write_new(path, value):
    """Exclusive create + fsync. A partial file is retained and fails closed."""
    raw = core.canonical(value) + b'\n'
    if len(raw) > 2000000:
        raise ValueError('Oversized local evidence')
    with Path(path).open('xb') as stream:
        stream.write(raw); stream.flush(); os.fsync(stream.fileno())


def git(*args):
    run = subprocess.run(['git', '-C', str(ROOT), *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45)
    if run.returncode: raise RuntimeError('Read-only source verification failed')
    return run.stdout


def verify_source(plan=None):
    if git('status', '--porcelain', '--untracked-files=normal').strip():
        raise ValueError('Current reviewed source must be committed and clean')
    commit, tree = git('rev-parse', 'HEAD').decode().strip(), git('rev-parse', 'HEAD^{tree}').decode().strip()
    hashes = {}
    for source in SOURCES:
        path = ROOT / source
        if path.is_symlink() or not path.is_file(): raise ValueError('Exact ordinary pilot source required')
        raw = path.read_bytes()
        if git('show', commit + ':' + source) != raw: raise ValueError('Pilot source differs from its Git blob')
        hashes[source] = core.sha(raw)
    if plan and (plan['sourceCommit'] != commit or plan['sourceTree'] != tree or plan['sourceHashes'] != hashes):
        raise ValueError('Plan no longer matches the complete reviewed source')
    return commit, tree, hashes


def verify_cleanup_source(plan):
    for source in SOURCES:
        path = ROOT / source
        if path.is_symlink() or core.sha(path.read_bytes()) != plan['sourceHashes'].get(source): raise ValueError('Cleanup implementation changed; preserve resources for review')


@contextmanager
def operation_lock(directory):
    """One local coordinator at a time; this is not an account-wide API lock."""
    path = Path(directory) / 'operation.lock'
    if path.is_symlink(): raise ValueError('Ordinary local lock required')
    with path.open('a+b') as stream:
        stream.seek(0, 2)
        if stream.tell() == 0: stream.write(b'0'); stream.flush()
        stream.seek(0)
        if os.name == 'nt':
            import msvcrt
            msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        try: yield
        finally:
            stream.seek(0)
            if os.name == 'nt': msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else: fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


class Journal:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.events = []
        self.reload()

    def reload(self):
        self.events = []
        paths = sorted(self.directory.glob('event-*.json'))
        for number, path in enumerate(paths, 1):
            if path.name != f'event-{number:06d}.json': raise ValueError('Journal sequence is incomplete')
            item = read_json(path)
            unsigned = {k: v for k, v in item.items() if k != 'sha256'}
            previous = self.events[-1]['sha256'] if self.events else None
            if set(item) != {'sequence', 'at', 'previous', 'data', 'sha256'} or item['sequence'] != number or item['previous'] != previous or item['sha256'] != core.sha(core.canonical(unsigned)):
                raise ValueError('Journal chain is invalid; preserve it for review')
            self.events.append(item)
        return self.events

    def append(self, data):
        self.reload()
        item = {'sequence': len(self.events) + 1, 'at': int(time.time()), 'previous': self.events[-1]['sha256'] if self.events else None, 'data': data}
        item['sha256'] = core.sha(core.canonical(item))
        write_new(self.directory / f"event-{item['sequence']:06d}.json", item)
        self.events.append(item)
        return item

    def data(self):
        return [e['data'] for e in self.reload()]


class Pilot:
    def __init__(self, directory):
        self.directory = Path(directory).resolve()
        if self.directory.parent != EVIDENCE.resolve() or not re.fullmatch('pilot-[a-f0-9]{32}', self.directory.name) or any(p.is_symlink() for p in [self.directory, *self.directory.parents]):
            raise ValueError('Exact ordinary pilot evidence directory required')
        self.plan = read_json(self.directory / 'plan.json')
        self.files, _ = core.load_compiler().payload(self.plan['token'], self.plan['mode'], self.plan['createdAt'])
        core.validate_plan(self.plan, self.files, self.plan['createdAt'])
        if self.directory.name != 'pilot-' + self.plan['token']: raise ValueError('Directory and nonce differ')
        self.journal = Journal(self.directory)

    def approval(self, fresh=True):
        value = read_json(self.directory / 'approval.json')
        core.validate_approval(value, self.plan, int(time.time()) if fresh else value['approvedAt'])
        return value

    def latest(self, kind, action=None):
        matches = [e for e in self.journal.data() if e.get('kind') == kind and (action is None or e.get('action') == action)]
        if not matches: raise ValueError('Required prior evidence missing: ' + kind + '/' + str(action))
        return matches[-1]

    def bound(self, value):
        if any(value.get(k) != self.plan[k] for k in ['planId', 'token', 'mode', 'sourceCommit', 'sourceTree']):
            raise ValueError('Evidence belongs to another pilot')
        return value

    def ci(self, run_id):
        verify_source(self.plan)
        proof = core.verify_ci(run_id, self.plan, int(time.time()))
        self.journal.append({'kind': 'ci-proof', 'value': proof})
        return proof

    def edge_request(self, action, run_id=None):
        if action not in ('inspect', 'validate', 'acquire', 'verify', 'reconcile', 'release', 'purge'): raise ValueError('Closed edge action required')
        if action in ('release', 'reconcile', 'purge'):
            verify_cleanup_source(self.plan)
            self.approval(False)
        else:
            verify_source(self.plan)
        events = self.journal.data()
        pending = [e for e in events if e.get('kind') == 'edge-intent' and not any(r.get('kind') == 'edge-result' and (r.get('requestId') == e['requestId'] or r.get('resolvedIntent') == e['requestId']) for r in events)]
        if pending and action not in ('inspect', 'reconcile', 'release', 'verify'): raise ValueError('Uncertain prior operation requires read-only reconciliation')
        payload = {'plan': self.plan}
        if action == 'acquire':
            if any(e.get('kind') == 'edge-intent' and e.get('action') == 'acquire' for e in events): raise ValueError('Acquisition is one-shot; reconcile instead of retrying it')
            payload.update(approval=self.approval(), ciProof=self.ci(run_id), expectedBefore=self.latest('edge-result', 'inspect')['value']['before'])
        elif action == 'reconcile':
            intent = self.latest('edge-intent', 'acquire')['input']
            payload['intent'] = {'planId': self.plan['planId'], 'mutationAttempted': True, 'expectedBefore': intent['expectedBefore'], 'originalApproval': intent['approval']}
        elif action in ('verify', 'release', 'purge'):
            leases = [e['value'].get('lease') for e in events if e.get('kind') == 'edge-result' and e.get('action') in ('acquire', 'reconcile') and e['value'].get('lease')]
            if not leases: raise ValueError('Prior exact edge ownership receipt required')
            payload['lease'] = leases[-1]
            if action == 'purge':
                payload.update(namespaceProof=self.latest('namespace-proof')['value'], originalApproval=self.approval(False))
        request_id = secrets.token_hex(8)
        intent = {'kind': 'edge-intent', 'requestId': request_id, 'action': action, 'input': payload}
        self.journal.append(intent)
        source = (ROOT / 'tools/svg-pilot-edge.mjs').read_text(encoding='utf-8').replace('export async function svgPilotEdge', 'async function svgPilotEdge', 1)
        # Reviewed source + JSON only. No shell interpolation or account token.
        code = 'async () => {\n' + source + '\nreturn await svgPilotEdge(' + json.dumps(action) + ',' + json.dumps(payload, ensure_ascii=True) + ', args => cloudflare.request(args));\n}'
        write_new(self.directory / ('edge-' + request_id + '.json'), {'account_id': core.ACCOUNT, 'code': code})
        return {'requestId': request_id, 'requestFile': str(self.directory / ('edge-' + request_id + '.json')), 'executed': False}

    def edge_result(self, request_id, result):
        intents = [e for e in self.journal.data() if e.get('kind') == 'edge-intent' and e.get('requestId') == request_id]
        if len(intents) != 1 or any(e.get('kind') == 'edge-result' and e.get('requestId') == request_id for e in self.journal.data()): raise ValueError('One saved intent and one result per request required')
        self.bound(result)
        item = {'kind': 'edge-result', 'requestId': request_id, 'action': intents[0]['action'], 'value': result}
        if intents[0]['action'] == 'reconcile' and result.get('lease'):
            item['resolvedIntent'] = self.latest('edge-intent', 'acquire')['requestId']
        self.journal.append(item)

    def namespace(self, ftp, guard_writes=False):
        def record(value):
            if guard_writes and value['action'] in ('mkdir-attempt', 'upload-attempt', 'rename-attempt'):
                self.approval()
                if value['action'] == 'mkdir-attempt' or value.get('final') == '.htaccess':
                    self.check_edge_fresh()
            self.journal.append({'kind': 'ftp-event', **value})
        namespace = core.Namespace(ftp, self.plan, self.files, record)
        events = [e for e in self.journal.data() if e.get('kind') == 'ftp-event']
        for event in events:
            action = event['action']
            if action == 'mkdir-attempt':
                if event.get('path') != namespace.directory or event.get('namespaceAbsentBefore') is not True: raise ValueError('Invalid original namespace intent')
                namespace.baseline = event['protectedBaseline']
            elif action == 'mkdir-verified': namespace.created = True
            elif action == 'upload-attempt':
                name, temporary = event['final'], event['temporary']
                if name not in self.files or not re.fullmatch(re.escape(name) + r'[.]upload-[a-f0-9]{16}[.]tmp', temporary) or event['bytes'] != len(self.files[name]) or event['sha256'] != core.sha(self.files[name]): raise ValueError('Invalid recorded upload identity')
                namespace.expected[temporary] = self.files[name]; namespace.attempted_temps.add(temporary)
            elif action == 'rename-attempt':
                if event['temporary'] not in namespace.expected or event['final'] not in self.files or namespace.expected[event['temporary']] != self.files[event['final']]: raise ValueError('Invalid recorded activation identity')
                namespace.expected[event['final']] = self.files[event['final']]
            elif action == 'rename-definite-refusal': namespace.expected.pop(event['name'], None)
            elif action == 'namespace-absence-verified': namespace.created = False
        return namespace

    def check_edge_fresh(self):
        edge = self.bound(self.latest('edge-result', 'verify')['value'])
        age = int(time.time()) - edge.get('verifiedAt', 0)
        if edge.get('state') != 'edge-lease-verified' or edge.get('safeToPublish') is not True or not 0 <= age <= 120: raise ValueError('Fresh exact MCP edge verification required')

    def preflight(self, action, run_id=None, capability=None):
        if action not in ('upload', 'cleanup'): raise ValueError('Exact hosting phase required')
        if action == 'cleanup':
            # Old owned resources must remain removable after expiry/CI failure.
            # The same reviewed cleanup implementation must still be present.
            verify_cleanup_source(self.plan)
            self.approval(False)
            if not any(e.get('kind') == 'ftp-event' and e.get('action') == 'mkdir-attempt' for e in self.journal.data()): raise ValueError('No prior attempted namespace operation')
            return {'preflightPassed': True, 'action': action, 'planId': self.plan['planId']}
        core.validate_plan(self.plan, self.files, int(time.time()))
        self.approval(); self.ci(run_id)
        if any(e.get('kind') == 'ftp-event' for e in self.journal.data()): raise ValueError('Upload cannot be resumed or repeated; use cleanup')
        self.check_edge_fresh()
        if capability is None: raise ValueError('Fresh cleaned header/rewrite capability evidence required')
        checked = load('probe-staging-svg-variants').validate_capability(capability)
        if self.plan['mode'] == 'public':
            saved = read_json(self.directory / 'no-store-prerequisite.json')
            path = Path(saved['path']).resolve()
            if path.name != 'completed.json': raise ValueError('Original completed no-store receipt required')
            predecessor = Pilot(path.parent)
            prior = read_json(path)
            if core.sha(core.canonical(prior)) != saved['sha256'] or prior != saved['value'] or predecessor.plan['planId'] != prior['planId']: raise ValueError('Original no-store receipt changed')
            predecessor.latest('http-complete')
            if predecessor.latest('namespace-proof')['value']['state'] != 'namespace-absence-verified' or predecessor.latest('edge-result', 'release')['value'].get('ownRuleAbsent') is not True: raise ValueError('No-store cleanup chain incomplete')
            if prior.get('token') == self.plan['token'] or prior.get('sourceCommit') != self.plan['sourceCommit'] or prior.get('mode') != 'no-store' or prior.get('allStrictHTTPChecksPassed') is not True or prior.get('cleanupVerified') is not True or not 0 <= int(time.time()) - prior.get('completedAt', 0) < 3600: raise ValueError('Fresh distinct fully cleaned no-store pilot required')
        return {'preflightPassed': True, 'action': action, 'planId': self.plan['planId'], 'parentConfigSHA256': checked['parentConfigBeforeSha256']}

    def proof(self, state):
        proof = {k: self.plan[k] for k in ['schemaVersion', 'planId', 'token', 'mode', 'sourceCommit', 'sourceTree']}
        proof.update(state=state, verifiedAt=int(time.time()))
        self.journal.append({'kind': 'namespace-proof', 'value': proof})
        return proof

    def hosting(self, action, connect, run_id=None, capability=None):
        preflight = self.preflight(action, run_id, capability)
        self.journal.append({'kind': 'hosting-connect-intent', 'action': action})
        ftp = connect()
        try:
            namespace = self.namespace(ftp, guard_writes=action == 'upload')
            if action == 'upload':
                if namespace.protected()[core.PARENT + '/.htaccess']['sha256'] != preflight['parentConfigSHA256']: raise ValueError('Parent configuration differs from fresh capability proof')
                try:
                    namespace.create(); namespace.upload_all()
                    return self.proof('all-ten-payloads-verified')
                except Exception:
                    if namespace.created:
                        namespace.cleanup()
                        self.proof('namespace-absence-verified')
                    raise
            current = namespace.entries(core.PARENT)
            present = any(name == namespace.name for name, _ in current)
            if present and not namespace.created: raise ValueError('Uncertain unverified mkdir preserved; do not adopt existing resources')
            if present: namespace.cleanup()
            if not namespace.baseline or namespace.protected() != namespace.baseline: raise ValueError('Protected parent/original after-check failed')
            if any(name == namespace.name for name, _ in namespace.entries(core.PARENT)): raise ValueError('Namespace absence not established')
            self.proof('namespace-absence-verified')
            return {'cleanupVerified': True}
        finally:
            ftp.close()

    def observe(self):
        verify_source(self.plan)
        core.validate_plan(self.plan, self.files, int(time.time()))
        if any(e.get('kind') == 'http-start' for e in self.journal.data()): raise ValueError('HTTP matrix is one-shot; preserve failed/cold evidence')
        self.check_edge_fresh()
        if self.latest('namespace-proof')['value']['state'] != 'all-ten-payloads-verified': raise ValueError('Verified payload required')
        purge = self.latest('edge-result', 'purge')['value']
        if purge.get('state') != 'owned-prefix-purge-accepted-not-cache-proof': raise ValueError('Initial exact owned-prefix purge acceptance required')
        self.journal.append({'kind': 'http-start'})
        def observed(url, method, headers):
            response = http.request(url, method, headers)
            keys = ('Content-Type', 'Content-Length', 'Content-Encoding', 'ETag', 'Last-Modified', 'Vary', 'Cache-Control', 'CF-Cache-Status', 'Age', 'X-KTK-Encoding-Probe', 'X-KTK-Accept-Encoding-SHA256', 'X-KTK-Accept-Encoding-Present', 'X-Robots-Tag')
            # Record bounded metadata before strict validation so a rejected
            # response survives too. Do not save arbitrary cookie/server fields.
            self.journal.append({'kind': 'http-raw-observation', 'value': {'url': url, 'method': method, 'requestHeaders': headers, 'status': response['status'], 'headers': {k: response['headers'].get_all(k, []) for k in keys}, 'wireBytes': len(response['body']), 'wireSHA256': core.sha(response['body'])}})
            return response
        result = http.matrix(self.plan, send=observed, record=lambda row: self.journal.append({'kind': 'http-row', 'value': row}))
        self.journal.append({'kind': 'http-complete', 'value': result})
        return {'requests': result['requests'], 'allStrictHTTPChecksPassed': True}

    def finalize(self, send=http.request):
        absent = self.latest('namespace-proof')['value']
        if absent['state'] != 'namespace-absence-verified': raise ValueError('Independent FTP cleanup proof required')
        release, purge = self.latest('edge-result', 'release')['value'], self.latest('edge-result', 'purge')['value']
        if release.get('ownRuleAbsent') is not True or release.get('foreignRulesUnchanged') is not True or purge.get('state') != 'owned-prefix-purge-accepted-not-cache-proof': raise ValueError('Exact own-rule removal and post-cleanup prefix purge required')
        # Sequence proves this purge follows FTP absence, rather than reusing the
        # initial accepted purge. Read actual HEAD responses after that result.
        rows = self.journal.reload()
        absence_index = max(e['sequence'] for e in rows if e['data'].get('kind') == 'namespace-proof' and e['data']['value'].get('state') == 'namespace-absence-verified')
        purge_index = max(e['sequence'] for e in rows if e['data'].get('kind') == 'edge-result' and e['data'].get('action') == 'purge')
        if purge_index <= absence_index: raise ValueError('Post-cleanup purge is missing')
        for stem in ('regular', 'seasonal'):
            url = core.HOST + '/staging/ktk-svg-encoding-probe-' + self.plan['token'] + '/' + stem + '.svg'
            response = send(url, 'HEAD', {'Accept-Encoding': 'identity'})
            if response['url'] != url or response['status'] != 404 or response['body'] or response['headers'].get('X-KTK-Encoding-Probe') is not None or response['headers'].get('ETag') in ['"' + a['sha256'] + '"' for a in self.plan['manifest']['assets'][stem].values()]: raise ValueError('Public namespace absence/cache eviction not established')
            self.journal.append({'kind': 'public-absence', 'value': {'url': url, 'status': response['status'], 'headers': dict(response['headers'])}})
        complete = self.latest('http-complete')['value']
        result = {k: self.plan[k] for k in ['schemaVersion', 'planId', 'token', 'mode', 'sourceCommit', 'sourceTree']}
        result.update(allStrictHTTPChecksPassed=complete.get('allStrictHTTPChecksPassed') is True, cleanupVerified=True, completedAt=int(time.time()), createdEmptyEntrypointRetained=release.get('createdEmptyEntrypointRetained') is True, accountRestoredToAbsent=False, speedGainEstablished=False)
        write_new(self.directory / 'completed.json', result)
        return result


def connect_ftps():
    # Fixed host/user. No environment override can redirect the DPAPI secret.
    import ftplib
    import ssl
    password = os.environ.get('KTK_FTP_PASSWORD')
    if not password: raise ValueError('The protected wrapper must supply the hosting secret')
    ftp = ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=45)
    try:
        ftp.connect('nl1-tr101.supercp.com', 21); ftp.login('krawlthroughkrak', password); ftp.prot_p()
        return ftp
    except Exception:
        ftp.close(); raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'record-approval', 'edge-request', 'edge-result', 'preflight-upload', 'upload', 'observe', 'preflight-cleanup', 'cleanup', 'finalize'])
    parser.add_argument('--directory'); parser.add_argument('--mode', choices=['no-store', 'public'], default='no-store')
    parser.add_argument('--input'); parser.add_argument('--request-id'); parser.add_argument('--edge-action'); parser.add_argument('--run-id', type=int); parser.add_argument('--capability'); parser.add_argument('--no-store-prerequisite')
    args = parser.parse_args()
    if args.action == 'prepare':
        commit, tree, hashes = verify_source()
        token = secrets.token_hex(16)
        directory = EVIDENCE / ('pilot-' + token)
        directory.mkdir(exist_ok=False)
        plan, _ = core.make_plan(token, args.mode, int(time.time()), commit, tree, hashes)
        write_new(directory / 'plan.json', plan)
        if args.mode == 'public':
            if not args.no_store_prerequisite: raise ValueError('A completed no-store receipt is required')
            predecessor_path = Path(args.no_store_prerequisite).resolve()
            predecessor = Pilot(predecessor_path.parent)
            prior = read_json(predecessor_path)
            if predecessor_path.name != 'completed.json' or predecessor.plan['mode'] != 'no-store': raise ValueError('Original completed no-store receipt required')
            write_new(directory / 'no-store-prerequisite.json', {'path': str(predecessor_path), 'sha256': core.sha(core.canonical(prior)), 'value': prior})
        result = {'directory': str(directory), 'planId': plan['planId'], 'mode': args.mode, 'hostingOrAccountOperation': False}
    else:
        if not args.directory: raise ValueError('Explicit owned evidence directory required')
        pilot = Pilot(args.directory)
        with operation_lock(pilot.directory):
            result = run_action(pilot, args)
    print(json.dumps(result))


def run_action(pilot, args):
    if args.action == 'record-approval':
        value = read_json(args.input); core.validate_approval(value, pilot.plan, int(time.time())); write_new(pilot.directory / 'approval.json', value)
        result = {'recorded': True, 'authority': 'Operator must already have actual conversation approval; this file does not grant it'}
    elif args.action == 'edge-request': result = pilot.edge_request(args.edge_action, args.run_id)
    elif args.action == 'edge-result': pilot.edge_result(args.request_id, read_json(args.input)); result = {'recorded': True}
    elif args.action.startswith('preflight-'): result = pilot.preflight(args.action.removeprefix('preflight-'), args.run_id, args.capability)
    elif args.action in ('upload', 'cleanup'): result = pilot.hosting(args.action, connect_ftps, args.run_id, args.capability)
    elif args.action == 'observe': result = pilot.observe()
    else: result = pilot.finalize()
    return result


if __name__ == '__main__':
    try: main()
    except Exception as error:
        # Do not print arbitrary FTP/server exceptions or secret-bearing values.
        print(json.dumps({'failed': True, 'errorType': type(error).__name__, 'next': 'Preserve the complete journal; inspect the failed phase and reconcile ownership before retrying.'}))
        sys.exit(1)
