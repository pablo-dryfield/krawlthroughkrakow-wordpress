import json,subprocess,unittest
from unittest import mock
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools import full_private_engine_exercise as exercise
from tools.full_private_engine_client import FullPrivateEngineClient
from tools.content_update_client import UncertainRequest
from tools.tests import test_full_private_engine_preparation as bridge

class ExerciseInputTests(unittest.TestCase):
 def test_implicit_interruption_flags_cannot_start_a_rehearsal(self):
  with self.assertRaises(ValueError):exercise.prepare(None,None,None,None,None,interrupt_original=1)
  with self.assertRaises(ValueError):exercise.transact(None,None,interrupt_engine=1)

@unittest.skipUnless(bridge.old.PHP,'Real PHP required for private exercise ordering and engine interruption')
class FullPrivateEngineExerciseTests(unittest.TestCase):
 def fixture(self):
  c=bridge.FullPrivatePreparationIntegrationTests('runTest');c.setUp();self.addCleanup(c.doCleanups);c.source['ktk-code-pages-assets/media/large.bin']=b'small exercise fixture';c.install_source(c.source);c.cfg['operation']='snapshot';s=c.case.call(c.root,c.driver,c.cfg)['state'];c.owned={n:backup.sha(b) for n,b in sorted(c.source.items())};c.sizes={n:len(b) for n,b in sorted(c.source.items())};c.plan,_,c.overrides=full.plan(bridge.old.ID,bridge.old.APP,c.owned,c.sizes,s['protectedStateSha256']);c.binding=full.binding(c.plan);c.cfg['packet'].update(plan=c.plan,publicOwnedSha256=backup.sha(backup.encode(c.owned,sort=True)));c.cfg.update(operation='controller',binding=c.binding,sizes=c.sizes,overrides=c.overrides);c.before=c.public();return c
 def run_case(self,interrupt):
  c=self.fixture();events=[];faulted=False
  def transport(raw):
   nonlocal faulted
   action=backup.decode(raw)['action'];c.cfg.update(operation='controller',request=raw.decode(),fault='exit-after-rename' if interrupt and not faulted and action=='apply' else '')
   c.requests.append(action);out=c.case.call(c.root,c.driver,c.cfg,exit_code=73 if c.cfg['fault'] else 0)
   if out is None:faulted=True;raise TimeoutError('Exact owned engine rename interruption')
   if not out['ok']:raise RuntimeError('Native exercise fixture refused')
   return {'privateProfile':'full-private-engine-v1','helperSha256':c.cfg['packet']['helperSha256'],'controller':out['value']}
  client=FullPrivateEngineClient(c.plan,c.sizes,c.overrides,c.mu,c.cfg['packet']['helperSha256'],bridge.old.KEY,transport,lambda n:(c.private/n).read_bytes())
  class OriginalTransport:
   def original_manifest(self):
    c.cfg['operation']='capsule';out=c.case.call(c.root,c.driver,c.cfg);self.manifest=out['capsule'];return self.manifest
   def acknowledge_original(self,path,key,manifest):
    receipt=full.verify_archive(path,c.plan,key,c.cfg['packet']['helperSha256'],manifest);c.cfg['originalArchive']={'originalManifestSha256':manifest['manifestSha256'],'originalArchiveSha256':receipt['sha256']}
  dest=c.root/'deploy-backups';dest.mkdir()
  with mock.patch.object(full,'ROOT',c.root):m,r,prepared=exercise.prepare(client,OriginalTransport(),dest/'original.zip',lambda n:(c.private/n).read_bytes(),full.build_archive,observe=lambda *v:events.append(v[0]))
  self.assertTrue(prepared['prepared']);self.assertLess(events.index('original-archived'),events.index('preparation-progress'))
  with mock.patch.object(backup,'ROOT',c.root):result=exercise.transact(client,dest/'rollback.zip',interrupt_engine=interrupt,observe=lambda *v:events.append(v[0]))
  self.assertTrue(result['rolledBackClosureVerified']);self.assertEqual(result['controlledEngineCutInspected'],interrupt);self.assertEqual(result['privateChangedFiles'],5);self.assertEqual(c.public(),c.before)
  if interrupt:self.assertIn('inspect-engine-cut',events);self.assertEqual(c.requests[c.requests.index('apply')+1],'inspect')
 def test_real_native_complete_archive_order_and_private_rollback(self):self.run_case(False)
 def test_real_native_planned_engine_cut_is_inspected_before_another_apply(self):self.run_case(True)

if __name__=='__main__':unittest.main()
