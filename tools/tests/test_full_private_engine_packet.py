import copy,json,subprocess,time,unittest
from unittest import mock
from pathlib import Path
from tools import content_update_backup as backup
from tools import full_private_engine_packet as packet
from tools import full_private_seed_packet as full
from tools.full_private_engine_client import FullPrivateEngineClient
from tools.tests import test_full_private_engine_preparation as bridge
from tools.tests import test_private_entry_probe as observed
from tools.tests import test_staging_protected_state as state

DRIVER=observed.DRIVER.replace('HTTP_X_KTK_ENTRY_PROBE_TOKEN','HTTP_X_KTK_FULL_ENGINE_TOKEN').replace("$_GET=array('entry'=>$c['profile'],'ktk_private_entry_probe'=>$c['identifier']);","$_GET=array('ktk_full_private_engine'=>$c['identifier']);")

@unittest.skipUnless(bridge.old.PHP,'Real PHP required for compiled early full engine helper')
class FullPrivateEnginePacketTests(unittest.TestCase):
 def setUp(self):
  self.case=bridge.FullPrivatePreparationIntegrationTests('runTest');self.case.setUp();self.addCleanup(self.case.doCleanups)
  plugin=self.case.mu.parent/'plugins/fixture-ecwid/entry.php';plugin.parent.mkdir(exist_ok=True);plugin.write_bytes(b'<?php $GLOBALS["ordinary_marker"]=true;');self.case.cfg['operation']='snapshot';baseline=self.case.case.call(self.case.root,self.case.driver,self.case.cfg)['state'];self.case.plan,_,self.case.overrides=full.plan(bridge.old.ID,bridge.old.APP,self.case.owned,self.case.sizes,baseline['protectedStateSha256']);self.case.binding=full.binding(self.case.plan)
  self.expires=int(time.time())+300;self.source=packet.helper_source(Path(self.case.cfg['helper']).name,bridge.old.TOKEN,self.expires,bridge.old.APP,self.case.owned,self.case.sizes,self.case.plan['protectedStateSha256'],bridge.old.KEY)
 def boot(self,**changes):
  c=copy.deepcopy(self.case.cfg);c.update(stage=(self.case.root/'public_html/staging').as_posix(),token=bridge.old.TOKEN,missingNoCache=False,identifier=bridge.old.ID,body=backup.encode({'privateProfile':'full-private-engine-v1','request':{'schemaVersion':1,'action':'inspect-preparation',**self.case.binding},'originalArchive':None}).decode());c.update(changes)
  plugin=self.case.mu.parent/'plugins/fixture-ecwid/entry.php';plugin.parent.mkdir(exist_ok=True);plugin.write_bytes(b'<?php $GLOBALS["ordinary_marker"]=true;')
  # This fixture injects a local request string only. It is never a hosted helper.
  needle=b"file_get_contents('php://input',false,null,0,4097)";self.assertEqual(self.source.count(needle),1);source=self.source.replace(needle,b"($GLOBALS['c']['body']??'')")
  if c.pop('expired',False):source=source.replace(str(self.expires).encode(),b'1',1)
  Path(c['helper']).write_bytes(source);config=self.case.root/'boot.json';config.write_text(json.dumps(c),encoding='utf-8');driver=self.case.root/'boot.php';driver.write_text(DRIVER,encoding='utf-8');p=subprocess.run([bridge.old.PHP,str(driver),str(config)],capture_output=True,timeout=45);self.assertEqual(p.returncode,0,p.stderr.decode());self.assertFalse(p.stderr,p.stderr.decode());return json.loads(p.stdout),source
 def test_compiled_source_embeds_only_reviewed_components_and_early_private_guard(self):
  s=self.source;self.assertNotIn(b'__KTK_FULL_ENGINE_',s);self.assertIn(b"add_action('muplugins_loaded',",s);self.assertIn(b'final class KTK_Full_Private_Engine_Controller',s);self.assertIn(b'final class KTK_Full_Private_Engine_Streaming_Seeds',s)
  for name,filename in packet.COMPONENTS.items():self.assertIn((packet.ROOT/'tools'/filename).read_bytes()[6:],s)
  self.assertLess(s.index(b'HTTP_X_KTK_FULL_ENGINE_TOKEN'),s.index(b'ktk_capture_staging_original_state(__FILE__)'));p=subprocess.run([bridge.old.PHP,'-l'],input=s,capture_output=True);self.assertEqual(p.returncode,0,p.stderr)
 def test_valid_early_inspection_prepare_and_original_export_preserve_normal_plugin_boundary(self):
  out,source=self.boot();self.assertEqual(out['status'],200);self.assertFalse(out['ordinaryMarker']);self.assertEqual(len(out['queries']),7);self.assertFalse(out['body']['controller']['preparation']['rootExists'])
  body=lambda action:backup.encode({'privateProfile':'full-private-engine-v1','request':{'schemaVersion':1,'action':action,**self.case.binding},'originalArchive':None}).decode()
  out,source=self.boot(body=body('prepare'));self.assertEqual(out['status'],200);self.assertFalse(out['ordinaryMarker']);self.assertTrue(out['body']['controller']['preparation']['recordsComplete']);self.assertFalse(self.case.engine.exists());self.assertTrue(all(q.startswith('SELECT ') for q in out['queries']))
  client=FullPrivateEngineClient(self.case.plan,self.case.sizes,self.case.overrides,self.case.mu,backup.sha(source),bridge.old.KEY,lambda _:None,lambda _:b'');client.validate_preparation(out['body'])
  out,_=self.boot(body=body('original'));self.assertEqual(out['status'],200);full.validate_manifest(out['body']['originalCapsule'],self.case.plan);self.assertFalse((self.case.private/'source').exists());self.assertFalse((self.case.private/'target').exists())
 def test_missing_wrong_expired_and_wrong_identifier_continue_ordinary_flow(self):
  for changes in ({'token':''},{'token':'x'*43},{'expired':True},{'identifier':'f'*32}):
   out,_=self.boot(**changes);self.assertTrue(out['noProbe']);self.assertTrue(out['ordinaryMarker']);self.assertEqual(out['queries'],[])
 def test_compiled_early_wire_original_archive_full_preparation_apply_rollback_and_closure(self):
  acknowledgment=None;helper_sha=backup.sha(self.source.replace(b"file_get_contents('php://input',false,null,0,4097)",b"($GLOBALS['c']['body']??'')"))
  def transport(raw):
   envelope={'privateProfile':'full-private-engine-v1','request':backup.decode(raw),'originalArchive':acknowledgment if backup.decode(raw)['action']=='recover-preparation' else None};out,_=self.boot(body=backup.encode(envelope).decode());self.assertEqual(out['status'],200,out);self.assertFalse(out['ordinaryMarker']);self.assertTrue(all(q.startswith('SELECT ') for q in out['queries']));return out['body']
  client=FullPrivateEngineClient(self.case.plan,self.case.sizes,self.case.overrides,self.case.mu,helper_sha,bridge.old.KEY,transport,lambda n:(self.case.private/n).read_bytes());client.prepare();before=self.case.public()
  out,_=self.boot(body=backup.encode({'privateProfile':'full-private-engine-v1','request':{'schemaVersion':1,'action':'original',**self.case.binding},'originalArchive':None}).decode());manifest=out['body']['originalCapsule'];destination=self.case.root/'deploy-backups/wire-original.zip';destination.parent.mkdir(exist_ok=True)
  with mock.patch.object(full,'ROOT',self.case.root):receipt=full.build_archive(manifest,lambda n:(self.case.private/n).read_bytes(),self.case.plan,bridge.old.KEY,helper_sha,destination)
  acknowledgment={'originalManifestSha256':manifest['manifestSha256'],'originalArchiveSha256':receipt['sha256']};count=0
  while client.state is None:
   client.recover_preparation();count+=1;self.assertLess(count,10)
  with mock.patch.object(backup,'ROOT',self.case.root):client.export_and_acknowledge(self.case.root/'deploy-backups/wire-rollback.zip')
  while client.state['engine']['phase']!='applied':client.step('apply')
  while client.state['engine']['phase']!='rolled-back':client.step('rollback')
  result=client.close();self.assertTrue(result['closed']);self.assertTrue(result['engine']['currentPriorInventoryVerified']);self.assertEqual(self.case.public(),before)
 def test_wrong_method_host_site_and_indexing_refuse_before_private_capture(self):
  for changes in ({'method':'GET'},{'host':'other.invalid'},{'home':'https://krawlthroughkrakow.com/'},{'siteurl':'https://other.invalid/'},{'public':1}):
   out,_=self.boot(**changes);self.assertEqual(out['status'],403);self.assertEqual(out['queries'],[]);self.assertFalse(out['ordinaryMarker'])
 def test_noncanonical_wrong_profile_and_unknown_envelope_refuse_before_private_capture(self):
  value={'privateProfile':'full-private-engine-v1','request':{'schemaVersion':1,'action':'inspect-preparation',**self.case.binding},'originalArchive':None};cases=[backup.encode(value).decode()+' ',backup.encode({**value,'privateProfile':'production'}).decode(),backup.encode({**value,'unknown':True}).decode()]
  for body in cases:
   out,_=self.boot(body=body);self.assertEqual(out['status'],409);self.assertEqual(out['queries'],[]);self.assertFalse(out['ordinaryMarker']);self.assertEqual(out['body'],{'error':'full_private_engine_operation_failed'})
 def test_explicit_lifetime_and_scope_inputs_cannot_infer_production_or_implicit_flags(self):
  args=(Path(self.case.cfg['helper']).name,bridge.old.TOKEN,self.expires,bridge.old.APP,self.case.owned,self.case.sizes,self.case.plan['protectedStateSha256'],bridge.old.KEY)
  for index,value in ((0,'production.php'),(1,'bad'),(2,int(time.time())+7201),(2,1),(7,'not-a-key')):
   changed=list(args);changed[index]=value
   with self.assertRaises(ValueError):packet.helper_source(*changed)
  with self.assertRaises(ValueError):packet.helper_source(*args,interrupt_original=1)

if __name__=='__main__':unittest.main()
