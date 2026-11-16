import json, os, subprocess, sys, tempfile, unittest
from pathlib import Path
from unittest import mock
from tools import content_update_backup as backup
from tools import full_private_engine_resume as resume
from tools.tests import test_full_private_engine_exercise as exercise_tests

ROOT = Path(__file__).resolve().parents[2]
CHILD = r'''
import json,os,subprocess,sys
from pathlib import Path
from unittest import mock
sys.path.insert(0,str(Path.cwd()))
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools import full_private_engine_exercise as exercise
from tools import full_private_engine_resume as resume
from tools.full_private_engine_client import FullPrivateEngineClient
from tools.content_update_client import UncertainRequest
from tools.tests.test_full_private_engine_preparation import old
config=Path(sys.argv[1]);mode=sys.argv[2];root=config.parent;c=json.loads(config.read_text());mu=Path(c['fixtureMu']);private=Path(c['fixturePrivate']);driver=Path(c['fixtureDriver']);plan=c['packet']['plan'];actions=[]
def call():
 config.write_text(json.dumps(c));p=subprocess.run([old.PHP,str(driver),str(config)],capture_output=True,text=True,timeout=180)
 if p.returncode==73 and mode=='cut' and c.get('fault')=='exit-after-rename':
  actions.append({'nativeExit':73});(root/'first-process-actions.json').write_text(json.dumps(actions));raise TimeoutError('Controlled native first replacement cut')
 if p.returncode or p.stderr:raise RuntimeError('Native child fixture process failed')
 v=json.loads(p.stdout)
 if not v['ok']:raise RuntimeError(v['message'])
 return v
def transport(raw):
 action=backup.decode(raw)['action'];actions.append(action);c.update(operation='controller',request=raw.decode(),fault='exit-after-rename' if mode=='cut' and action=='apply' else '')
 if mode=='resume':(root/'second-process-actions.json').write_text(json.dumps(actions))
 return {'privateProfile':'full-private-engine-v1','helperSha256':c['packet']['helperSha256'],'controller':call()['value']}
client=FullPrivateEngineClient(plan,c['sizes'],c['overrides'],mu,c['packet']['helperSha256'],old.KEY,transport,lambda n:(private/n).read_bytes())
assert client.state is None and client.archive_path is None
directory=root/'deploy-backups';directory.mkdir(exist_ok=True);original=directory/('staging-full-engine-original-'+old.ID+'.zip');rollback=directory/('staging-full-engine-rollback-'+old.ID+'.zip')
class Original:
 def original_manifest(self):c['operation']='capsule';return call()['capsule']
 def acknowledge_original(self,path,key,m):r=full.verify_archive(path,plan,key,c['packet']['helperSha256'],m);c['originalArchive']={'originalManifestSha256':m['manifestSha256'],'originalArchiveSha256':r['sha256']}
if mode in ('cut','prepared'):
 with mock.patch.object(full,'ROOT',root):exercise.prepare(client,Original(),original,lambda n:(private/n).read_bytes(),full.build_archive)
 with mock.patch.object(backup,'ROOT',root):client.export_and_acknowledge(rollback)
 if mode=='prepared':print('Prepared without any private apply');sys.exit(0)
 try:client.step('apply')
 except UncertainRequest:os._exit(75)
 raise AssertionError('First process did not stop at the native cut')
else:
 with mock.patch.object(backup,'ROOT',root):result=resume.continue_first_engine_cut(client,original,rollback)
 (root/'second-process-actions.json').write_text(json.dumps(actions));print(json.dumps(result))
'''


class FullPrivateEngineResumeArchiveGates(unittest.TestCase):
    def test_missing_wrong_namespace_symlink_and_oversize_archive_refuse_before_transport(self):
        transaction = 'a' * 32
        client = mock.Mock(plan={'transactionId': transaction})
        with tempfile.TemporaryDirectory(prefix='ktk-resume-gates-') as temporary:
            root = Path(temporary)
            with mock.patch.object(backup, 'ROOT', root):
                original = root/'deploy-backups'/('staging-full-engine-original-'+transaction+'.zip')
                rollback = root/'deploy-backups'/('staging-full-engine-rollback-'+transaction+'.zip')
                for first, second in [(original, rollback), (root/'foreign.zip', rollback)]:
                    with self.assertRaises(ValueError):
                        resume.continue_first_engine_cut(client, first, second)
                original.parent.mkdir();original.write_bytes(b'not an archive');rollback.write_bytes(b'not an archive')
                with mock.patch.object(Path, 'is_symlink', return_value=True):
                    with self.assertRaises(ValueError):
                        resume.continue_first_engine_cut(client, original, rollback)
                with original.open('wb') as stream:
                    stream.truncate(33554433)
                with self.assertRaises(ValueError):
                    resume.continue_first_engine_cut(client, original, rollback)
                client.inspect.assert_not_called();client.attach_archive.assert_not_called()


@unittest.skipUnless(exercise_tests.bridge.old.PHP, 'Real PHP required for separate Python process continuation')
class FullPrivateEngineSeparateProcessTests(unittest.TestCase):
    def fixture(self):
        factory = exercise_tests.FullPrivateEngineExerciseTests('runTest')
        case = factory.fixture();self.addCleanup(factory.doCleanups)
        case.cfg.update(fixtureMu=str(case.mu),fixturePrivate=str(case.private),fixtureDriver=str(case.driver))
        config = case.root/'separate-process-config.json';config.write_text(json.dumps(case.cfg))
        driver = case.root/'separate-python-caller.py';driver.write_text(CHILD)
        return case,config,driver

    def child(self,driver,config,mode):
        return subprocess.run([sys.executable,str(driver),str(config),mode],cwd=ROOT,capture_output=True,text=True,timeout=240)

    def test_actual_process_death_then_fresh_client_resumes_exact_first_replacement_and_rolls_back(self):
        factory = exercise_tests.FullPrivateEngineExerciseTests('runTest')
        case = factory.fixture();self.addCleanup(factory.doCleanups)
        before = case.public();case.cfg['operation'] = 'snapshot'
        selected_before = case.case.call(case.root,case.driver,case.cfg)['state']
        case.cfg.update(fixtureMu=str(case.mu),fixturePrivate=str(case.private),fixtureDriver=str(case.driver))
        config = case.root/'separate-process-config.json';config.write_text(json.dumps(case.cfg))
        driver = case.root/'separate-python-caller.py';driver.write_text(CHILD)
        first = subprocess.run([sys.executable,str(driver),str(config),'cut'],cwd=ROOT,capture_output=True,text=True,timeout=240)
        self.assertEqual(first.returncode,75,first.stderr)
        actions = json.loads((case.root/'first-process-actions.json').read_text())
        self.assertEqual(actions[-2:],['apply',{'nativeExit':73}])
        second = subprocess.run([sys.executable,str(driver),str(config),'resume'],cwd=ROOT,capture_output=True,text=True,timeout=240)
        self.assertEqual(second.returncode,0,second.stderr)
        result = json.loads(second.stdout)
        self.assertTrue(result['separateCallerContinuationVerified']);self.assertTrue(result['rolledBackClosureVerified'])
        self.assertEqual(result['privateApplyCallsThisProcess'],4);self.assertEqual(result['privateRollbackCalls'],5)
        actions = json.loads((case.root/'second-process-actions.json').read_text())
        self.assertEqual(actions[:2],['inspect','export']);self.assertEqual(actions.count('apply'),4);self.assertEqual(actions.count('rollback'),5)
        self.assertFalse({'prepare','recover-preparation','acknowledge'} & set(actions))
        self.assertEqual(case.public(),before)
        case.cfg['operation']='snapshot';after=case.case.call(case.root,case.driver,case.cfg)['state']
        for key in ('identity','database','databaseSha256','protectedFiles','ownedContentFiles','protectedStateSha256','rowCounts'):
            self.assertEqual(selected_before[key],after[key])

    def test_fresh_prepared_state_is_refused_without_apply_rollback_or_new_acknowledgment(self):
        case,config,driver = self.fixture();before=case.public()
        first=self.child(driver,config,'prepared');self.assertEqual(first.returncode,0,first.stderr)
        second=self.child(driver,config,'resume');self.assertNotEqual(second.returncode,0)
        self.assertIn('Only the exact archived first owned replacement may continue',second.stderr)
        self.assertEqual(json.loads((case.root/'second-process-actions.json').read_text()),['inspect'])
        self.assertEqual(case.public(),before)

    def test_corrupted_saved_rollback_archive_blocks_fresh_process_before_any_server_request(self):
        case,config,driver = self.fixture();before=case.public()
        first=self.child(driver,config,'cut');self.assertEqual(first.returncode,75,first.stderr)
        rollback=case.root/'deploy-backups'/('staging-full-engine-rollback-'+exercise_tests.bridge.old.ID+'.zip')
        rollback.write_bytes(b'corrupted local fixture archive')
        second=self.child(driver,config,'resume');self.assertNotEqual(second.returncode,0)
        self.assertIn('BadZipFile',second.stderr);self.assertFalse((case.root/'second-process-actions.json').exists())
        self.assertEqual(case.public(),before)


if __name__ == '__main__':
    unittest.main()
