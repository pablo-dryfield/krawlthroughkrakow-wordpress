"""Closed-scope SVG pilot primitives. Importing this module never loads credentials.

The live caller must obtain explicit approval, verify current complete CI and
hold the exact edge-rule receipt before constructing a network namespace.
"""
from __future__ import annotations

import copy
import ftplib
import hashlib
import importlib.util
import io
import json
import re
import subprocess
import time
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = 'pablo-dryfield/krawlthroughkrakow-wordpress'
ZONE = '4303f6a45f815c5570bb4bba5f86a423'
ACCOUNT = 'ddfd57890e03c243c120f480d65f15de'
PARENT = '/public_html/staging'
HOST = 'https://krawlthroughkrakow.com'
ORIGINAL_PATHS = {
    PARENT + '/wp-content/mu-plugins/ktk-homepage-assets/hero-statue-regular.svg': '95ae7ee6a4c5fc951a20493c159427598d3f28b810a95191ca846f72548e4c7c',
    PARENT + '/wp-content/mu-plugins/ktk-homepage-assets/hero-statue-seasonal.svg': 'a6071047938e6dc52afd0fadb026d85496f7d3d744b602b9a27a798567e07aa7',
}


def sha(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical(value) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()


@lru_cache(maxsize=1)
def load_compiler():
    spec = importlib.util.spec_from_file_location('ktk_svg_pilot_compiler', ROOT / 'tools/svg-negotiation-payload.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_plan(plan: dict, files: dict[str, bytes], now: int) -> None:
    if type(now) is not int or not isinstance(plan, dict):
        raise ValueError('Explicit integer clock and plan required')
    keys = {'schemaVersion', 'scope', 'token', 'mode', 'createdAt', 'expiresAt', 'sourceCommit', 'sourceTree', 'sourceHashes', 'manifest', 'payloadHashes', 'edgeRule', 'planId'}
    if set(plan) != keys or plan['schemaVersion'] != 1 or plan['scope'] != 'ktk-isolated-svg-pilot':
        raise ValueError('Exact closed pilot plan required')
    compiler = load_compiler()
    token = compiler.checked_token(plan['token'])
    if plan['mode'] not in ('no-store', 'public') or type(plan['createdAt']) is not int or type(plan['expiresAt']) is not int or plan['expiresAt'] != plan['createdAt'] + 3600 or not plan['createdAt'] <= now < plan['expiresAt']:
        raise ValueError('Fresh one-hour mode-specific plan required')
    for key in ['sourceCommit', 'sourceTree']:
        if not isinstance(plan[key], str) or not re.fullmatch('[a-f0-9]{40}', plan[key]):
            raise ValueError('Exact source commit/tree required')
    if not isinstance(plan['sourceHashes'], dict) or not plan['sourceHashes'] or any(not isinstance(p, str) or not p.startswith('tools/') or '..' in p.split('/') or not re.fullmatch('[a-f0-9]{64}', h) for p, h in plan['sourceHashes'].items()):
        raise ValueError('Bound source fingerprints required')
    expected, manifest = compiler.payload(token, plan['mode'], plan['createdAt'])
    if files != expected or plan['manifest'] != manifest or set(files) != compiler.FILES or plan['payloadHashes'] != {p: {'bytes': len(b), 'sha256': sha(b)} for p, b in files.items()}:
        raise ValueError('All ten compiled payloads and source bindings required')
    rule = compiler.cache_policy(token)
    rule['ref'] = 'ktk_svg_pilot_' + token
    if plan['edgeRule'] != rule:
        raise ValueError('Only the exact two-path policy is permitted')
    unsigned = {k: v for k, v in plan.items() if k != 'planId'}
    if plan['planId'] != sha(canonical(unsigned)):
        raise ValueError('Plan identity changed')


def make_plan(token: str, mode: str, created_at: int, source_commit: str, source_tree: str, source_hashes: dict) -> tuple[dict, dict[str, bytes]]:
    compiler = load_compiler()
    files, manifest = compiler.payload(token, mode, created_at)
    rule = compiler.cache_policy(token)
    rule['ref'] = 'ktk_svg_pilot_' + token
    plan = {'schemaVersion': 1, 'scope': 'ktk-isolated-svg-pilot', 'token': token, 'mode': mode, 'createdAt': created_at, 'expiresAt': created_at + 3600, 'sourceCommit': source_commit, 'sourceTree': source_tree, 'sourceHashes': source_hashes, 'manifest': manifest, 'payloadHashes': {p: {'bytes': len(b), 'sha256': sha(b)} for p, b in files.items()}, 'edgeRule': rule}
    plan['planId'] = sha(canonical(plan))
    validate_plan(plan, files, created_at)
    return plan, files


def validate_approval(approval: dict, plan: dict, now: int) -> None:
    # This is the operator's record of conversation approval, not a credential or
    # an authority inferred from a file. The agent must have that approval first.
    expected = {'schemaVersion', 'planId', 'approvedBy', 'approvedAt', 'expiresAt', 'exactTwoPathRule', 'ownNamespaceFiles', 'ownPrefixPurge', 'exclusiveAccountWindow', 'allowEntrypointCreation', 'retainCreatedEmptyEntrypoint'}
    if not isinstance(approval, dict) or set(approval) != expected or approval['schemaVersion'] != 1 or approval['planId'] != plan['planId'] or not isinstance(approval['approvedBy'], str) or not approval['approvedBy'].strip():
        raise ValueError('Explicit recorded approval for this exact plan required')
    if any(approval[k] is not True for k in ['exactTwoPathRule', 'ownNamespaceFiles', 'ownPrefixPurge', 'exclusiveAccountWindow']):
        raise ValueError('All scoped actions and coordination must be approved')
    if any(type(approval[k]) is not bool for k in ['allowEntrypointCreation', 'retainCreatedEmptyEntrypoint']) or approval['allowEntrypointCreation'] != approval['retainCreatedEmptyEntrypoint']:
        raise ValueError('Creation requires explicit retention of the empty shared entrypoint')
    if type(approval['approvedAt']) is not int or type(approval['expiresAt']) is not int or not plan['createdAt'] <= approval['approvedAt'] <= now < approval['expiresAt'] <= plan['expiresAt']:
        raise ValueError('Approval window is not current')


def gh_read(path: str):
    if not re.fullmatch(r'repos/pablo-dryfield/krawlthroughkrakow-wordpress/(?:actions/runs/[0-9]+(?:/jobs\?filter=latest&per_page=100)?|git/commits/[a-f0-9]{40})', path):
        raise ValueError('Only exact read-only repository CI paths permitted')
    result = subprocess.run(['gh', 'api', '--method', 'GET', path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45)
    if result.returncode:
        raise RuntimeError('GitHub CI read failed; no hosting connection permitted')
    if len(result.stdout) > 2000000:
        raise RuntimeError('Oversized CI response')
    return json.loads(result.stdout)


def gh_read_log(job_id: int) -> bytes:
    if type(job_id) is not int or job_id < 1:
        raise ValueError('Exact job identifier required')
    result = subprocess.run(['gh', 'api', '--method', 'GET', f'repos/{REPO}/actions/jobs/{job_id}/logs', '--allow-escape-sequences'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45)
    if result.returncode or len(result.stdout) > 4000000:
        raise RuntimeError('Complete bounded checkout log unavailable; no hosting connection')
    return result.stdout


def verify_ci(run_id: int, plan: dict, now: int, read=gh_read, read_log=gh_read_log) -> dict:
    if type(run_id) is not int or run_id < 1:
        raise ValueError('Explicit current source CI run required')
    run = read(f'repos/{REPO}/actions/runs/{run_id}')
    if run.get('id') != run_id or run.get('head_sha') != plan['sourceCommit'] or run.get('name') != 'Repository Checks' or run.get('path') != '.github/workflows/checks.yml' or run.get('status') != 'completed' or run.get('conclusion') != 'success' or run.get('repository', {}).get('full_name') != REPO:
        raise ValueError('Complete successful CI for the exact source is required')
    if type(run.get('run_attempt')) is not int or run['run_attempt'] < 1:
        raise ValueError('Current CI attempt required')
    result = read(f'repos/{REPO}/actions/runs/{run_id}/jobs?filter=latest&per_page=100')
    jobs = result.get('jobs', [])
    if result.get('total_count') != len(jobs) or not 3 <= len(jobs) <= 100:
        raise ValueError('Complete bounded job list required')
    names = ['Offline Tests and Build', 'Windows Recovery Contracts', 'Secret Scan', 'Offline Contract Part Two']
    selected = []
    for name in names:
        matching = [j for j in jobs if j.get('name') == name]
        if len(matching) != 1 or matching[0].get('run_id') != run_id or matching[0].get('status') != 'completed' or matching[0].get('conclusion') != 'success':
            raise ValueError('Both offline parts, Windows and secret scanning must pass')
        selected.append(matching[0])
    if any(j.get('status') != 'completed' or j.get('conclusion') not in ('success', 'skipped') for j in jobs):
        raise ValueError('Unfinished or failed additional job')
    quality = selected[0]
    for name in ['Isolated SVG HTTP negotiation contracts (loopback only)', 'Check dependency security advisories (no deployment)', 'Build storefront (never uploads or deploys)']:
        steps = [s for s in quality.get('steps', []) if s.get('name') == name]
        if len(steps) != 1 or steps[0].get('status') != 'completed' or steps[0].get('conclusion') != 'success':
            raise ValueError('SVG contracts, dependency audit and final build must all pass')
    from datetime import datetime
    finished = max(int(datetime.fromisoformat(j['completed_at'].replace('Z', '+00:00')).timestamp()) for j in selected)
    if not 0 <= now - finished < 3600:
        raise ValueError('CI completion is outside the one-hour release window')
    checkouts, log_hashes = set(), {}
    for job in selected:
        log = read_log(job['id'])
        if not isinstance(log, bytes) or len(log) > 4000000:
            raise ValueError('Raw bounded job log required')
        commits = set(re.findall(rb'^\d{4}-\d{2}-\d{2}T\S+[ \t]+([a-f0-9]{40})\r?$', log, re.M))
        if len(commits) != 1:
            raise ValueError('One actual checkout commit per job is required')
        checkouts.add(next(iter(commits)).decode())
        log_hashes[str(job['id'])] = sha(log)
    if len(checkouts) != 1:
        raise ValueError('The required actual checkout commits differ')
    checkout = next(iter(checkouts))
    commit = read(f'repos/{REPO}/git/commits/{checkout}')
    if commit.get('sha') != checkout or commit.get('tree', {}).get('sha') != plan['sourceTree']:
        raise ValueError('Actual CI checkout tree differs from the reviewed tree')
    return {'schemaVersion': 1, 'planId': plan['planId'], 'sourceCommit': plan['sourceCommit'], 'sourceTree': plan['sourceTree'], 'runId': run_id, 'runAttempt': run.get('run_attempt'), 'verifiedAt': now, 'allRequiredJobsPassed': True, 'auditAndFinalBuildPassed': True, 'jobIds': [j['id'] for j in selected], 'actualCheckout': checkout, 'actualCheckoutTreeExact': True, 'rawJobLogHashes': log_hashes}


class Namespace:
    """Ten known files in one fresh staging directory; no recursive operations."""
    def __init__(self, ftp, plan: dict, files: dict[str, bytes], record):
        validate_plan(plan, files, plan.get('createdAt'))
        self.ftp, self.plan, self.files, self.record = ftp, copy.deepcopy(plan), dict(files), record
        self.name = 'ktk-svg-encoding-probe-' + plan['token']
        self.directory = PARENT + '/' + self.name
        self.created = False
        self.expected: dict[str, bytes] = {}
        self.attempted_temps: set[str] = set()
        self.baseline = None

    def fresh(self):
        if not self.plan['createdAt'] <= int(time.time()) < self.plan['expiresAt']:
            raise RuntimeError('Expired/future plan cannot create or activate resources')

    def path(self, name: str) -> str:
        valid_name = name in self.files or any(re.fullmatch(re.escape(base) + r'\.upload-[a-f0-9]{16}\.tmp', name) for base in self.files)
        if not valid_name or not re.fullmatch('ktk-svg-encoding-probe-[a-f0-9]{32}', self.name) or self.directory != PARENT + '/' + self.name or name not in self.expected and name not in self.files:
            raise ValueError('Exact declared namespace member required')
        return self.directory + '/' + name

    def entries(self, path: str) -> list:
        if path not in (PARENT, self.directory):
            raise ValueError('Only exact staging parent and owned namespace can be listed')
        rows = []
        for name, facts in self.ftp.mlsd(path):
            if (name, facts.get('type')) in (('.', 'cdir'), ('..', 'pdir')):
                continue
            rows.append((name, facts))
            if len(rows) > 4096:
                raise RuntimeError('Oversized listing; stop this connection')
        if len({n for n, _ in rows}) != len(rows):
            raise RuntimeError('Ambiguous directory listing')
        return rows

    def listing(self) -> set[str]:
        if not self.created:
            raise RuntimeError('No owned namespace has been created')
        rows = self.entries(self.directory)
        if any(f.get('type') != 'file' or 'unix.slink' in f for _, f in rows):
            raise RuntimeError('Unknown/non-file member preserved')
        return {n for n, _ in rows}

    def read(self, path: str, limit: int) -> bytes:
        if path not in ORIGINAL_PATHS and path != PARENT + '/.htaccess' and not any(path == self.path(name) for name in self.expected):
            raise ValueError('Read outside protected originals or registered namespace')
        if type(limit) is not int or not 1 <= limit <= 1000000:
            raise ValueError('Bounded read required')
        data = bytearray()
        def append(chunk):
            if len(data) + len(chunk) > limit:
                raise RuntimeError('Remote bytes exceed the bound; stop this connection')
            data.extend(chunk)
        self.ftp.retrbinary('RETR ' + path, append)
        return bytes(data)

    def protected(self) -> dict:
        result = {}
        for path in [PARENT + '/.htaccess', *ORIGINAL_PATHS]:
            body = self.read(path, 1000000)
            if path in ORIGINAL_PATHS and sha(body) != ORIGINAL_PATHS[path]:
                raise RuntimeError('Golden original artwork changed')
            result[path] = {'bytes': len(body), 'sha256': sha(body)}
        return result

    def create(self):
        self.fresh()
        if self.created or any(n == self.name for n, _ in self.entries(PARENT)):
            raise RuntimeError('Existing namespace must never be adopted')
        self.baseline = self.protected()
        self.fresh()
        self.record({'action': 'mkdir-attempt', 'path': self.directory, 'protectedBaseline': self.baseline, 'namespaceAbsentBefore': True})
        self.fresh()
        try:
            self.ftp.mkd(self.directory)
        except (ftplib.error_perm, ftplib.error_temp):
            self.record({'action': 'mkdir-definite-refusal', 'path': self.directory})
            raise
        except Exception:
            if not any(n == self.name and f.get('type') == 'dir' for n, f in self.entries(PARENT)) or self.entries(self.directory):
                raise
        self.created = True
        self.record({'action': 'mkdir-verified', 'path': self.directory})

    def upload(self, name: str):
        self.fresh()
        if not self.created or name not in self.files:
            raise ValueError('Created namespace and exact payload required')
        names = self.listing()
        if name in names or not names.issubset(self.expected):
            raise RuntimeError('Existing/unknown member preserved')
        import secrets
        temporary = name + '.upload-' + secrets.token_hex(8) + '.tmp'
        value = self.files[name]
        if temporary in names:
            raise RuntimeError('Temporary name collision; preserve existing file')
        if name == '.htaccess' and self.protected() != self.baseline:
            raise RuntimeError('Protected source changed before activation')
        self.record({'action': 'upload-attempt', 'temporary': temporary, 'final': name, 'bytes': len(value), 'sha256': sha(value)})
        self.fresh()
        self.expected[temporary] = value
        self.attempted_temps.add(temporary)
        self.ftp.storbinary('STOR ' + self.path(temporary), io.BytesIO(value))
        if self.read(self.path(temporary), len(value)) != value:
            raise RuntimeError('Uploaded temporary changed')
        current = self.listing()
        if name in current or not current.issubset(self.expected):
            raise RuntimeError('Activation target appeared; do not overwrite or adopt it')
        self.record({'action': 'rename-attempt', 'temporary': temporary, 'final': name})
        self.fresh()
        self.expected[name] = value
        try:
            self.ftp.rename(self.path(temporary), self.path(name))
        except (ftplib.error_perm, ftplib.error_temp):
            self.expected.pop(name, None)
            self.record({'action': 'rename-definite-refusal', 'name': name})
            raise
        except Exception:
            if name not in self.listing() or self.read(self.path(name), len(value)) != value:
                raise
        if self.read(self.path(name), len(value)) != value:
            raise RuntimeError('Activated payload changed')
        self.record({'action': 'upload-verified', 'name': name, 'sha256': sha(value)})

    def upload_all(self):
        for name in sorted(set(self.files) - {'.htaccess'}) + ['.htaccess']:
            self.upload(name)
        if self.listing() != set(self.files) or any(self.read(self.path(n), len(v)) != v for n, v in self.files.items()):
            raise RuntimeError('Exact ten-file readback failed')
        if self.protected() != self.baseline:
            raise RuntimeError('Protected source changed during publication')
        self.record({'action': 'all-ten-payloads-verified'})

    def cleanup(self) -> bool:
        if not self.created:
            return False
        names = self.listing()
        if not names.issubset(self.expected):
            raise RuntimeError('Unknown member preserved; no cleanup')
        def verify(name):
            value, expected = self.read(self.path(name), max(1, len(self.expected[name]))), self.expected[name]
            if value != expected and not (name in self.attempted_temps and len(value) < len(expected) and expected.startswith(value)):
                raise RuntimeError('Changed member preserved; cleanup refused')
        for name in names:
            verify(name)
        for name in sorted(names, key=lambda n: (n == '.htaccess', n)):
            current = self.listing()
            if not current.issubset(self.expected) or name not in current:
                raise RuntimeError('Cleanup census changed; preserve remaining files')
            verify(name)
            self.record({'action': 'delete-attempt', 'name': name})
            self.ftp.delete(self.path(name))
            self.record({'action': 'delete-returned', 'name': name})
        if self.listing():
            raise RuntimeError('Namespace is not empty; no rmdir')
        self.record({'action': 'rmdir-attempt', 'path': self.directory})
        self.ftp.rmd(self.directory)
        if any(n == self.name for n, _ in self.entries(PARENT)):
            raise RuntimeError('Namespace removal not verified')
        self.created = False
        self.record({'action': 'namespace-absence-verified'})
        return True
