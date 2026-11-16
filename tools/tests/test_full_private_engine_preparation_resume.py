import json, os, subprocess, sys, tempfile, unittest
from pathlib import Path
from unittest import mock
from tools import content_update_backup as backup
from tools import full_private_engine_resume as resume
from tools.tests import test_full_private_engine_preparation as bridge

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
config=Path(sys.argv[1]);mode=sys.argv[2];root=config.parent;c=json.loads(config.read_text())
mu=Path(c['fixtureMu']);private=Path(c['fixturePrivate']);driver=Path(c['fixtureDriver']);plan=c['packet']['plan'];actions=[]
resuming=mode in ('resume','fail-resume')
if resuming:c['originalArchive']=None
action_file=root/('preparation-second-actions.json' if resuming else 'preparation-first-actions.json')
def remember():action_file.write_text(json.dumps(actions))
def call():
 config.write_text(json.dumps(c));p=subprocess.run([old.PHP,str(driver),str(config)],capture_output=True,text=True,timeout=180)
 if p.returncode==74 and mode=='prefix-cut':
  actions.append({'nativeExit':74});remember();raise TimeoutError('Controlled native original prefix cut')
 if p.returncode or p.stderr:raise RuntimeError('Native preparation child failed')
 out=json.loads(p.stdout)
 if not out['ok']:raise RuntimeError(out['message'])
 return out
def transport(raw):
 action=backup.decode(raw)['action'];actions.append(action);remember()
 c.update(operation='controller',request=raw.decode(),fault='',seedFault='prefix' if mode=='prefix-cut' else '')
 if mode=='fail-resume' and action=='recover-preparation':raise TimeoutError('Synthetic unverified transport; must not retry')
 return {'privateProfile':'full-private-engine-v1','helperSha256':c['packet']['helperSha256'],'controller':call()['value']}
client=FullPrivateEngineClient(plan,c['sizes'],c['overrides'],mu,c['packet']['helperSha256'],old.KEY,transport,lambda n:(private/n).read_bytes())
assert client.state is None and client.preparation_state is None and client.archive_path is None
directory=root/'deploy-backups';directory.mkdir(exist_ok=True)
original=directory/('staging-full-engine-original-'+old.ID+'.zip');rollback=directory/('staging-full-engine-rollback-'+old.ID+'.zip')
class Original:
 def original_manifest(self):c['operation']='capsule';return call()['capsule']
 def acknowledge_original(self,path,key,manifest):
  receipt=full.verify_archive(path,plan,key,c['packet']['helperSha256'],manifest)
  actions.append('local-original-archive-ack');remember()
  c['originalArchive']={'originalManifestSha256':manifest['manifestSha256'],'originalArchiveSha256':receipt['sha256']}
def observe(event,value):
 if event=='preparation-progress' and mode=='complete-seed-cut' and 'preparation' in value and value['preparation']['seedsComplete']:
  boundary=resume.inspect_complete_seed_boundary(client,value)
  assert boundary['engineAbsent'] and not (private/'engine'/old.ID).exists()
  remember();os._exit(77)
with mock.patch.object(backup,'ROOT',root),mock.patch.object(full,'ROOT',root):
 if not resuming:
  try:exercise.prepare(client,Original(),original,lambda n:(private/n).read_bytes(),full.build_archive,observe=observe)
  except UncertainRequest:
   if mode=='prefix-cut':os._exit(76)
   raise
  assert mode=='prepared';print('Prepared engine without rollback archive');sys.exit(0)
 manifest,receipt,prepared=resume.continue_preparation(client,Original(),original,rollback)
 transaction=exercise.transact(client,rollback)
 remember();print(json.dumps({'preparation':prepared,'transaction':transaction}))
'''


class FullPrivatePreparationResumeArchiveGates(unittest.TestCase):
    def test_controlled_seed_boundary_refuses_changed_fence_or_existing_engine_after_read_only_inspection(self):
        seed={'sourceComplete':True,'targetComplete':True,'files':{},'copiedBytes':0,'stateSha256':'a'*64}
        previous={'stateSha256':'b'*64}
        for change in ({'stateSha256':'c'*64},{'phase':'prepared'},{'complete':False}):
            client=mock.Mock()
            client.inspect_preparation.return_value={'stateSha256':change.get('stateSha256',previous['stateSha256']),
                'preparation':{'recordsComplete':True,'enginePhase':change.get('phase'),
                    'fullSeed':{**seed,'targetComplete':change.get('complete',True)}}}
            with self.assertRaises(ValueError):resume.inspect_complete_seed_boundary(client,previous)
            client.inspect_preparation.assert_called_once();client.recover_preparation.assert_not_called()
    def test_missing_foreign_symlink_oversize_original_or_existing_rollback_refuse_before_inspection(self):
        transaction = 'a'*32
        client = mock.Mock(plan={'transactionId':transaction})
        with tempfile.TemporaryDirectory(prefix='ktk-preparation-resume-gates-') as temporary:
            root = Path(temporary); directory = root/'deploy-backups'; directory.mkdir()
            original = directory/('staging-full-engine-original-'+transaction+'.zip')
            rollback = directory/('staging-full-engine-rollback-'+transaction+'.zip')
            with mock.patch.object(backup,'ROOT',root):
                for first in (original,root/'foreign.zip'):
                    with self.assertRaises(ValueError):resume.attach_verified_original(client,first,rollback)
                original.write_bytes(b'bounded invalid original')
                rollback.write_bytes(b'preserve existing rollback')
                with self.assertRaises(ValueError):resume.attach_verified_original(client,original,rollback)
                rollback.unlink()
                with mock.patch.object(Path,'is_symlink',return_value=True):
                    with self.assertRaises(ValueError):resume.attach_verified_original(client,original,rollback)
                with original.open('wb') as stream:stream.truncate(33554433)
                with self.assertRaises(ValueError):resume.attach_verified_original(client,original,rollback)
        client.inspect_preparation.assert_not_called()


@unittest.skipUnless(bridge.old.PHP,'Real PHP required for separate-process preparation recovery')
class FullPrivatePreparationSeparateProcessTests(unittest.TestCase):
    def fixture(self):
        case = bridge.FullPrivatePreparationIntegrationTests('runTest'); case.setUp(); self.addCleanup(case.doCleanups)
        case.cfg.update(fixtureMu=str(case.mu),fixturePrivate=str(case.private),fixtureDriver=str(case.driver))
        config = case.root/'preparation-process-config.json'; config.write_text(json.dumps(case.cfg))
        driver = case.root/'preparation-python-caller.py'; driver.write_text(CHILD)
        return case,config,driver

    def child(self,driver,config,mode):
        return subprocess.run([sys.executable,str(driver),str(config),mode],cwd=ROOT,capture_output=True,text=True,timeout=240)

    def selected(self,case):
        case.cfg['operation']='snapshot';return case.case.call(case.root,case.driver,case.cfg)['state']

    def successful_resume(self,first_mode,expected_exit):
        case,config,driver = self.fixture(); before=case.public(); selected_before=self.selected(case)
        first=self.child(driver,config,first_mode);self.assertEqual(first.returncode,expected_exit,first.stderr)
        self.assertFalse(case.engine.exists())
        second=self.child(driver,config,'resume');self.assertEqual(second.returncode,0,second.stderr)
        result=json.loads(second.stdout)
        self.assertTrue(result['preparation']['separateCallerPreparationContinuationVerified'])
        self.assertTrue(result['preparation']['enginePreparationSeparateRequestVerified'])
        self.assertTrue(result['transaction']['rolledBackClosureVerified'])
        self.assertEqual(result['transaction']['privateApplyCalls'],5);self.assertEqual(result['transaction']['privateRollbackCalls'],5)
        actions=json.loads((case.root/'preparation-second-actions.json').read_text())
        self.assertEqual(actions[:2],['inspect-preparation','local-original-archive-ack']);self.assertNotIn('prepare',actions)
        self.assertEqual(actions.count('local-original-archive-ack'),1)
        for index,action in enumerate(actions):
            if action=='recover-preparation':self.assertEqual(actions[index-1],'inspect-preparation')
        self.assertEqual(case.public(),before)
        after=self.selected(case)
        for key in ('identity','database','databaseSha256','protectedFiles','ownedContentFiles','protectedStateSha256','rowCounts'):
            self.assertEqual(selected_before[key],after[key])
        return result,case

    def test_native_prefix_cut_then_different_python_process_verifies_archive_and_resumes_copy(self):
        result,case=self.successful_resume('prefix-cut',76)
        self.assertGreater(result['preparation']['recoverPreparationCallsThisProcess'],1)
        self.assertEqual(json.loads((case.root/'preparation-first-actions.json').read_text())[-2:],['recover-preparation',{'nativeExit':74}])

    def test_complete_seed_process_stop_then_one_separate_engine_preparation_request(self):
        result,_=self.successful_resume('complete-seed-cut',77)
        self.assertEqual(result['preparation']['recoverPreparationCallsThisProcess'],1)

    def test_prepared_engine_without_rollback_archive_refuses_before_copy_or_ack(self):
        case,config,driver=self.fixture();first=self.child(driver,config,'prepared');self.assertEqual(first.returncode,0,first.stderr)
        before=case.public();second=self.child(driver,config,'resume');self.assertNotEqual(second.returncode,0)
        self.assertIn('Only archived complete-record preparation without an engine may continue',second.stderr)
        self.assertEqual(json.loads((case.root/'preparation-second-actions.json').read_text()),['inspect-preparation'])
        self.assertEqual(case.public(),before)

    def test_corrupt_original_blocks_different_process_before_any_server_request(self):
        case,config,driver=self.fixture();first=self.child(driver,config,'complete-seed-cut');self.assertEqual(first.returncode,77,first.stderr)
        original=case.root/'deploy-backups'/('staging-full-engine-original-'+bridge.old.ID+'.zip');original.write_bytes(b'corrupt original')
        before=case.public();second=self.child(driver,config,'resume');self.assertNotEqual(second.returncode,0)
        self.assertIn('BadZipFile',second.stderr);self.assertFalse((case.root/'preparation-second-actions.json').exists())
        self.assertEqual(case.public(),before)

    def test_uncertain_resumed_copy_stops_after_one_request_without_retry(self):
        case,config,driver=self.fixture();first=self.child(driver,config,'prefix-cut');self.assertEqual(first.returncode,76,first.stderr)
        before=case.public();payload=(case.private/'source/ktk-code-pages-assets/media/large.bin').read_bytes()
        self.assertEqual(len(payload),65536)
        second=self.child(driver,config,'fail-resume');self.assertNotEqual(second.returncode,0);self.assertIn('UncertainRequest',second.stderr)
        actions=json.loads((case.root/'preparation-second-actions.json').read_text())
        self.assertEqual(actions,['inspect-preparation','local-original-archive-ack','inspect-preparation','recover-preparation'])
        self.assertEqual((case.private/'source/ktk-code-pages-assets/media/large.bin').read_bytes(),payload)
        self.assertEqual(case.public(),before)


if __name__ == '__main__':unittest.main()
