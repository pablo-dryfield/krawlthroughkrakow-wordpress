import copy
import datetime
import ftplib
import importlib.util
import io
import time
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('ktk_svg_pilot_core', Path(__file__).resolve().parents[1] / 'svg-pilot-core.py')
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)
NOW = int(time.time()) - 1
TOKEN = 'b8' * 16
PLAN, FILES = core.make_plan(TOKEN, 'no-store', NOW, '1' * 40, '2' * 40, {'tools/svg-pilot-core.py': core.sha(Path(core.__file__).read_bytes())})


class FTP:
    def __init__(self):
        self.dirs = {core.PARENT}
        self.files = {core.PARENT + '/.htaccess': b'Protected staging configuration\n'}
        for remote in core.ORIGINAL_PATHS:
            self.files[remote] = (core.ROOT / 'staging/wp-content/mu-plugins/ktk-homepage-assets' / remote.rsplit('/', 1)[1]).read_bytes()
        self.writes, self.reads, self.facts = [], [], {}
        self.mkdir_lost = self.rename_lost = self.partial_upload = False
        self.before_mkdir = self.before_rename = self.before_delete = None

    def mlsd(self, directory):
        if directory not in self.dirs:
            raise ftplib.error_perm('550 Missing')
        return [(p.rsplit('/', 1)[1], {'type': 'dir'}) for p in self.dirs if p != directory and p.rsplit('/', 1)[0] == directory] + [(p.rsplit('/', 1)[1], self.facts.get(p, {'type': 'file'})) for p in self.files if p.rsplit('/', 1)[0] == directory]

    def mkd(self, path):
        if self.before_mkdir:
            self.before_mkdir(path)
        if path in self.dirs:
            raise ftplib.error_perm('550 Exists')
        self.writes.append(('mkdir', path)); self.dirs.add(path)
        if self.mkdir_lost:
            raise ConnectionResetError('reply lost')

    def storbinary(self, command, stream):
        path = command.removeprefix('STOR ')
        self.writes.append(('upload', path)); body = stream.read()
        self.files[path] = body[:9] if self.partial_upload else body
        if self.partial_upload:
            raise ConnectionResetError('interrupted upload')

    def retrbinary(self, command, append):
        path = command.removeprefix('RETR '); self.reads.append(path)
        if path not in self.files:
            raise ftplib.error_perm('550 Missing')
        append(self.files[path])

    def rename(self, source, target):
        if self.before_rename:
            self.before_rename(source, target)
        self.writes.append(('rename', target)); self.files[target] = self.files.pop(source)
        if self.rename_lost:
            raise ConnectionResetError('reply lost')

    def delete(self, path):
        if self.before_delete:
            self.before_delete(path)
        self.writes.append(('delete', path)); del self.files[path]

    def rmd(self, path):
        if self.mlsd(path):
            raise RuntimeError('Not empty')
        self.writes.append(('rmdir', path)); self.dirs.remove(path)


def ci_fixture():
    finished = datetime.datetime.fromtimestamp(NOW, datetime.timezone.utc).isoformat()
    run = {'id': 7, 'head_sha': PLAN['sourceCommit'], 'name': 'Repository Checks', 'path': '.github/workflows/checks.yml', 'status': 'completed', 'conclusion': 'success', 'repository': {'full_name': core.REPO}, 'run_attempt': 1}
    steps = [{'name': n, 'status': 'completed', 'conclusion': 'success'} for n in ['Isolated SVG HTTP negotiation contracts (loopback only)', 'Check dependency security advisories (no deployment)', 'Build storefront (never uploads or deploys)']]
    jobs = [{'id': i + 10, 'run_id': 7, 'name': n, 'status': 'completed', 'conclusion': 'success', 'completed_at': finished, 'steps': steps if i == 0 else []} for i, n in enumerate(['Offline Tests and Build', 'Windows Recovery Contracts', 'Secret Scan'])]
    calls = []
    def read(path):
        calls.append(path)
        if path.endswith('/actions/runs/7'):
            return copy.deepcopy(run)
        if path.endswith('/jobs?filter=latest&per_page=100'):
            return {'jobs': copy.deepcopy(jobs), 'total_count': len(jobs)}
        if path.endswith('/git/commits/' + '3' * 40):
            return {'sha': '3' * 40, 'tree': {'sha': PLAN['sourceTree']}}
        raise AssertionError(path)
    def log(job):
        return b'2026-11-17T23:00:00Z ' + b'3' * 40 + b'\n'
    return run, jobs, read, log, calls


class PlanTests(unittest.TestCase):
    def test_complete_payload_is_recompiled_and_each_input_identity_is_bound(self):
        core.validate_plan(PLAN, FILES, NOW)
        for key, value in [('token', '../' + TOKEN), ('sourceCommit', 'main'), ('sourceTree', '2' * 39), ('expiresAt', NOW + 3601), ('scope', 'production'), ('planId', '0' * 64)]:
            bad = copy.deepcopy(PLAN); bad[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                core.validate_plan(bad, FILES, NOW)
        changed = dict(FILES); changed['origin.php'] += b'changed'
        with self.assertRaises(ValueError):
            core.validate_plan(PLAN, changed, NOW)
        widened = copy.deepcopy(PLAN); widened['edgeRule']['expression'] = 'true'
        with self.assertRaises(ValueError):
            core.validate_plan(widened, FILES, NOW)

    def test_expiry_and_unknown_fields_refuse_without_a_transport(self):
        for now in [NOW - 1, NOW + 3600]:
            with self.assertRaises(ValueError):
                core.validate_plan(PLAN, FILES, now)
        extra = copy.deepcopy(PLAN); extra['skipCI'] = True
        with self.assertRaises(ValueError):
            core.validate_plan(extra, FILES, NOW)

    def test_approval_records_exact_actions_window_and_explicit_shared_metadata_retention(self):
        approval = {'schemaVersion': 1, 'planId': PLAN['planId'], 'approvedBy': 'Offline fixture only', 'approvedAt': NOW, 'expiresAt': NOW + 300, 'exactTwoPathRule': True, 'ownNamespaceFiles': True, 'ownPrefixPurge': True, 'exclusiveAccountWindow': True, 'allowEntrypointCreation': False, 'retainCreatedEmptyEntrypoint': False}
        core.validate_approval(approval, PLAN, NOW)
        for key, value in [('planId', '0' * 64), ('approvedBy', ''), ('approvedAt', NOW + 1), ('expiresAt', NOW), ('exclusiveAccountWindow', False), ('exactTwoPathRule', False), ('retainCreatedEmptyEntrypoint', True)]:
            bad = dict(approval); bad[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                core.validate_approval(bad, PLAN, NOW)


class CITests(unittest.TestCase):
    def test_all_jobs_logs_actual_checkout_tree_and_freshness_are_independently_bound(self):
        run, jobs, read, log, calls = ci_fixture()
        proof = core.verify_ci(7, PLAN, NOW, read, log)
        self.assertTrue(proof['actualCheckoutTreeExact']); self.assertEqual(proof['actualCheckout'], '3' * 40)
        self.assertEqual(len(proof['rawJobLogHashes']), 3)
        self.assertIn('/git/commits/', calls[-1])

    def test_failed_incomplete_wrong_source_or_old_ci_never_reaches_job_logs(self):
        for key, value in [('head_sha', '4' * 40), ('status', 'in_progress'), ('conclusion', 'failure'), ('path', '.github/workflows/other.yml'), ('run_attempt', None)]:
            run, jobs, read, log, calls = ci_fixture(); run[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                core.verify_ci(7, PLAN, NOW, read, lambda _: self.fail('must not read logs'))
        run, jobs, read, log, calls = ci_fixture()
        with self.assertRaises(ValueError):
            core.verify_ci(7, PLAN, NOW + 3600, read, lambda _: self.fail('must not read logs'))

    def test_skipped_security_or_build_wrong_job_and_partial_pagination_are_not_green(self):
        for position in [1, 2]:
            run, jobs, read, log, calls = ci_fixture(); jobs[0]['steps'][position]['conclusion'] = 'skipped'
            with self.assertRaises(ValueError):
                core.verify_ci(7, PLAN, NOW, read, log)
        run, jobs, read, log, calls = ci_fixture(); jobs[1]['run_id'] = 8
        with self.assertRaises(ValueError):
            core.verify_ci(7, PLAN, NOW, read, log)
        run, jobs, read, log, calls = ci_fixture()
        def partial(path):
            result = read(path)
            if path.endswith('per_page=100'): result['total_count'] += 1
            return result
        with self.assertRaises(ValueError):
            core.verify_ci(7, PLAN, NOW, partial, log)

    def test_forged_or_differing_actual_checkouts_and_wrong_tree_fail(self):
        run, jobs, read, log, calls = ci_fixture()
        for altered in [lambda _: b'no checkout', lambda _: b'3' * 40 + b'\n', lambda j: b'2026-11-17T23:00:00Z ' + (b'3' if j == 10 else b'4') * 40 + b'\n']:
            with self.assertRaises(ValueError):
                core.verify_ci(7, PLAN, NOW, read, altered)
        def wrong(path):
            result = read(path)
            if '/git/commits/' in path: result['tree']['sha'] = '5' * 40
            return result
        with self.assertRaises(ValueError):
            core.verify_ci(7, PLAN, NOW, wrong, log)


class NamespaceTests(unittest.TestCase):
    def fresh(self):
        ftp, journal = FTP(), []
        return ftp, core.Namespace(ftp, PLAN, FILES, journal.append), journal

    def test_full_lifecycle_is_ten_file_scoped_config_last_and_protected_exact(self):
        ftp, ns, journal = self.fresh(); before = dict(ftp.files)
        ns.create(); ns.upload_all()
        verified = [r['name'] for r in journal if r['action'] == 'upload-verified']
        self.assertEqual(len(verified), 10); self.assertEqual(verified[-1], '.htaccess')
        self.assertTrue(ns.cleanup()); self.assertEqual(ftp.files, before); self.assertEqual(ftp.dirs, {core.PARENT})
        self.assertTrue(all(path.startswith(ns.directory + '/') or path == ns.directory for _, path in ftp.writes))
        self.assertEqual(journal[0]['action'], 'mkdir-attempt')

    def test_existing_or_racing_namespace_is_never_adopted_on_definite_refusal(self):
        ftp, ns, journal = self.fresh(); ftp.dirs.add(ns.directory)
        with self.assertRaises(RuntimeError): ns.create()
        self.assertEqual(ftp.writes, [])
        ftp, ns, journal = self.fresh(); ftp.before_mkdir = lambda path: ftp.dirs.add(path)
        with self.assertRaises(ftplib.error_perm): ns.create()
        self.assertFalse(ns.created); self.assertIn(ns.directory, ftp.dirs)
        self.assertFalse(ns.cleanup())

    def test_lost_mkdir_and_rename_replies_require_exact_readback(self):
        ftp, ns, journal = self.fresh(); ftp.mkdir_lost = ftp.rename_lost = True
        ns.create(); ns.upload('regular.svg'); self.assertEqual(ftp.files[ns.path('regular.svg')], FILES['regular.svg'])
        self.assertTrue(ns.cleanup())

    def test_partial_known_upload_can_be_cleaned_without_activating_anything(self):
        ftp, ns, journal = self.fresh(); ns.create(); ftp.partial_upload = True
        with self.assertRaises(ConnectionResetError): ns.upload('regular.identity')
        self.assertNotIn(ns.path('regular.identity'), ftp.files)
        self.assertTrue(ns.cleanup()); self.assertFalse(any(a == 'rename' for a, _ in ftp.writes))

    def test_unknown_or_changed_member_preserves_everything_and_refuses_cleanup(self):
        for kind in ['unknown', 'changed', 'link']:
            ftp, ns, journal = self.fresh(); ns.create(); ns.upload('regular.svg')
            if kind == 'unknown': ftp.files[ns.directory + '/foreign.txt'] = b'preserve'
            if kind == 'changed': ftp.files[ns.path('regular.svg')] += b'changed'
            if kind == 'link': ftp.facts[ns.path('regular.svg')] = {'type': 'file', 'unix.slink': '/foreign'}
            before = dict(ftp.files); writes = len(ftp.writes)
            with self.subTest(kind=kind), self.assertRaises(RuntimeError): ns.cleanup()
            self.assertEqual(ftp.files, before); self.assertEqual(len(ftp.writes), writes)

    def test_target_appearing_before_rename_is_not_overwritten_or_owned(self):
        ftp, ns, journal = self.fresh(); ns.create(); original_retrieve = ftp.retrbinary
        def inject(command, append):
            original_retrieve(command, append)
            if '.upload-' in command: ftp.files[ns.directory + '/regular.svg'] = FILES['regular.svg']
        ftp.retrbinary = inject
        with self.assertRaises(RuntimeError): ns.upload('regular.svg')
        self.assertNotIn('regular.svg', ns.expected)
        before = dict(ftp.files)
        with self.assertRaises(RuntimeError): ns.cleanup()
        self.assertEqual(ftp.files, before)

    def test_expired_plan_refuses_creation_but_existing_owned_cleanup_can_finish(self):
        ftp, ns, journal = self.fresh()
        with patch.object(core.time, 'time', return_value=NOW + 3600), self.assertRaises(RuntimeError): ns.create()
        self.assertEqual(ftp.writes, [])
        ns.create(); ns.upload('regular.svg')
        with patch.object(core.time, 'time', return_value=NOW + 3600): self.assertTrue(ns.cleanup())

    def test_protected_drift_blocks_activation_without_repairing_foreign_bytes(self):
        ftp, ns, journal = self.fresh(); ns.create(); ftp.files[core.PARENT + '/.htaccess'] = b'owner changed'
        with self.assertRaises(RuntimeError): ns.upload('.htaccess')
        self.assertFalse(any(a == 'upload' for a, _ in ftp.writes))
        self.assertTrue(ns.cleanup()); self.assertEqual(ftp.files[core.PARENT + '/.htaccess'], b'owner changed')

    def test_scope_and_write_ahead_failure_block_before_any_remote_mutation(self):
        ftp, ns, journal = self.fresh()
        for path in ['/public_html/production/wp-config.php', ns.directory + '/unknown']:
            with self.assertRaises(ValueError): ns.read(path, 1000)
        bad = copy.deepcopy(PLAN); bad['token'] = '../../production'
        with self.assertRaises(ValueError): core.Namespace(ftp, bad, FILES, journal.append)
        def fail(_): raise OSError('journal unavailable')
        ns.record = fail
        with self.assertRaises(OSError): ns.create()
        self.assertEqual(ftp.writes, [])

    def test_unknown_member_inserted_during_cleanup_stops_next_delete(self):
        ftp, ns, journal = self.fresh(); ns.create(); ns.upload('regular.svg'); ns.upload('seasonal.svg')
        ftp.before_delete = lambda _: ftp.files.setdefault(ns.directory + '/foreign.txt', b'preserve')
        with self.assertRaises(RuntimeError): ns.cleanup()
        self.assertEqual(ftp.files[ns.directory + '/foreign.txt'], b'preserve')
        self.assertEqual(sum(a == 'delete' for a, _ in ftp.writes), 1)


if __name__ == '__main__':
    unittest.main()
