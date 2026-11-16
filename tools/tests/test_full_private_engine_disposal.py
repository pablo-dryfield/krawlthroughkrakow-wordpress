import copy,json,os,shutil,subprocess,time,unittest
from pathlib import Path
from unittest import mock
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools import full_private_engine_recovery as recovery
from tools import full_private_engine_disposal as disposal
from tools.full_private_engine_client import FullPrivateEngineClient
from tools.tests import test_full_private_engine_preparation as bridge
from tools.tests import test_private_entry_probe as observed

DRIVER=bridge.old.PREFIX+r'''
$wpdb=new FixtureDB();define('KTK_STAGING_STATE_ALLOWED',true);define('KTK_CONTENT_UPDATE_STORE_ALLOWED',true);define('KTK_FULL_PRIVATE_ENGINE_DISPOSAL_ALLOWED',true);
require $c['captureComponent'];require $c['storeComponent'];require $c['disposalComponent'];
try {
 $guard=static function()use($c){$s=ktk_capture_staging_original_state($c['helper']);if($s['protectedStateSha256']!==$c['protectedSha']||$s['ownedContentFiles']!==$c['owned']){throw new RuntimeException('Exact original state required without restoration');}};
 $observer=static function($event,$name,$path)use($c){if($c['interrupt']&&$event==='after-full-engine-delete'){exit(75);}};
 $d=new KTK_Full_Private_Engine_Disposal($c['disposal'],$guard,$observer);$result=$d->run($c['request'],$c['method'],$c['host'],$c['token'],$c['now']);echo json_encode(array('ok'=>true,'value'=>$result),JSON_THROW_ON_ERROR);
}catch(Throwable $error){echo json_encode(array('ok'=>false,'message'=>$error->getMessage()),JSON_THROW_ON_ERROR);}
'''

@unittest.skipUnless(bridge.old.PHP,'Real PHP required for exact full private engine disposal')
class FullPrivateEngineDisposalTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  c=bridge.FullPrivatePreparationIntegrationTests('runTest');c.setUp();cls.case=c;cls.addClassCleanup(c.doCleanups)
  c.source['ktk-code-pages-assets/media/large.bin']=b'small disposal fixture; original full-shape run is separate'
  c.source.update({'ktk-code-pages-assets/content/fixture-%03d.html'%i:('fixture %s'%i).encode() for i in range(140)});c.install_source(c.source);c.cfg['operation']='snapshot';s=c.case.call(c.root,c.driver,c.cfg)['state'];c.owned={n:backup.sha(b) for n,b in sorted(c.source.items())};c.sizes={n:len(b) for n,b in sorted(c.source.items())};c.plan,_,c.overrides=full.plan(bridge.old.ID,bridge.old.APP,c.owned,c.sizes,s['protectedStateSha256']);c.binding=full.binding(c.plan);c.cfg['packet'].update(plan=c.plan,publicOwnedSha256=backup.sha(backup.encode(c.owned,sort=True)));c.cfg.update(operation='controller',binding=c.binding,sizes=c.sizes,overrides=c.overrides);c.before=c.public();c.client=FullPrivateEngineClient(c.plan,c.sizes,c.overrides,c.mu,c.cfg['packet']['helperSha256'],bridge.old.KEY,c.transport,lambda n:(c.private/n).read_bytes())
  c.ready();cls.original_manifest=None
  # The original capsule remains available after engine preparation.
  c.cfg['operation']='capsule';cls.original_manifest=c.case.call(c.root,c.driver,c.cfg)['capsule'];cls.rollback=c.root/'deploy-backups/rollback.zip'
  with mock.patch.object(backup,'ROOT',c.root):c.client.export_and_acknowledge(cls.rollback)
  while c.client.state['engine']['phase']!='applied':c.client.step('apply')
  while c.client.state['engine']['phase']!='rolled-back':c.client.step('rollback')
  c.client.close();cls.original=c.root/'deploy-backups/original.zip';cls.public_root=c.cfg['packet']['publicRoot'];cls.packet={'schemaVersion':1,'scope':recovery.SCOPE,'entryProfile':'early','transactionId':bridge.old.ID,'applicationCommit':bridge.old.APP,'toolingCommit':'d'*40,'helperSha256':c.cfg['packet']['helperSha256'],'sourceHashes':{'tools/full_private_engine_disposal.py':'e'*64},'expires':int(time.time())+300,'token':bridge.old.TOKEN,'ownershipKey':bridge.old.KEY,'plan':c.plan,'publicOwned':c.owned,'publicSizes':c.sizes,'interruptOriginal':False,'interruptEngine':False}
  cls.authority=disposal.authority(cls.packet,cls.original,cls.original_manifest,cls.rollback,c.client.manifest,lambda n:(c.private/n).read_bytes(),cls.public_root)
  cls.saved={p.relative_to(c.private).as_posix():p.read_bytes() for p in c.private.rglob('*') if p.is_file()};cls.saved_dirs=[p.relative_to(c.private).as_posix() for p in c.private.rglob('*') if p.is_dir()]
  cls.driver=c.root/'disposal-driver.php';cls.driver.write_text(DRIVER,encoding='utf-8')
 def setUp(self):
  c=self.case;self.assertTrue(c.private.resolve().is_relative_to(c.root.resolve()));self.assertTrue(c.root.name.startswith('ktk-production-state-fixture-'))
  shutil.rmtree(c.private)
  c.private.mkdir()
  for n in self.saved_dirs:(c.private/n).mkdir(parents=True,exist_ok=True)
  for n,b in self.saved.items():p=c.private/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
  self.cfg=copy.deepcopy(c.cfg);self.cfg.update(owned=c.owned,protectedSha=c.plan['protectedStateSha256'],storeComponent=(bridge.old.ROOT/'tools/content-update-private-store.php').as_posix(),disposalComponent=(bridge.old.ROOT/'tools/full-private-engine-disposal.php').as_posix(),interrupt=False,disposal={'authority':self.authority,'expires':2000,'ownershipKey':bridge.old.KEY,'publicRoot':self.public_root,'tokenSha256':backup.sha(bridge.old.TOKEN.encode())})
 def request(self,action='inspect',state=None,exit_code=0,**change):
  r={'schemaVersion':1,'action':action,'transactionId':bridge.old.ID,'applicationCommit':bridge.old.APP,'authoritySha256':self.authority['authoritySha256']}
  if state is not None:r['stateSha256']=state
  self.cfg.update(request=backup.encode(r).decode(),**change);p=self.case.root/'disposal-config.json';p.write_text(json.dumps(self.cfg),encoding='utf-8');result=subprocess.run([bridge.old.PHP,str(self.driver),str(p)],capture_output=True,timeout=45);self.assertEqual(result.returncode,exit_code,result.stderr.decode());self.assertFalse(result.stderr,result.stderr.decode())
  if exit_code:return None
  self.assertTrue(result.stdout.startswith(b'{"ok"'),repr(result.stdout[:1000]));return json.loads(result.stdout)
 def files(self):return {p.relative_to(self.case.private).as_posix():backup.sha(p.read_bytes()) for p in self.case.private.rglob('*') if p.is_file()}
 def test_complete_bounded_target_first_disposal_retains_exact_seven_and_public_state(self):
  out=self.request();self.assertTrue(out['ok'],out);state=out['value'];count=0
  while state['phase']!='disposed':
   out=self.request('cleanup',state['stateSha256']);self.assertTrue(out['ok'],out);state=out['value'];self.assertLessEqual(state['operation']['payloadFilesDeleted'],256);count+=1;self.assertLess(count,5)
   if count==1:self.assertFalse(any(n.startswith('target/') for n in self.files()));self.assertIn('control/original-state.json',self.files())
  self.assertGreater(count,1);self.assertEqual(self.files(),{n:r['sha256'] for n,r in self.authority['retained'].items()});self.assertEqual(self.case.public(),self.case.before);self.assertEqual(state['payloadFiles'],0)
 def test_interrupted_delete_requires_fresh_inspection_and_preserves_remaining_known_bytes(self):
  state=self.request()['value'];self.request('cleanup',state['stateSha256'],exit_code=75,interrupt=True);before=self.files();out=self.request('cleanup',state['stateSha256'],interrupt=False);self.assertFalse(out['ok']);self.assertEqual(self.files(),before);fresh=self.request()['value'];self.assertLess(fresh['payloadFiles'],state['payloadFiles']);self.assertTrue(self.request('cleanup',fresh['stateSha256'])['ok'])
 def test_unknown_file_or_changed_payload_refuses_before_any_deletion(self):
  p=self.case.private/'target/unknown.txt';p.write_bytes(b'preserve unknown');before=self.files();self.assertFalse(self.request()['ok']);self.assertEqual(self.files(),before);p.unlink();p=self.case.private/'source/ktk-code-pages.php';p.write_bytes(b'concurrent source');before=self.files();self.assertFalse(self.request()['ok']);self.assertEqual(self.files(),before)
 def test_missing_retained_and_nonempty_receipt_are_preserved(self):
  p=self.case.private/('engine/'+bridge.old.ID+'/receipts/unknown');p.parent.mkdir(exist_ok=True);p.write_bytes(b'unknown receipt');before=self.files();self.assertFalse(self.request()['ok']);self.assertEqual(self.files(),before)
 def test_authentication_expiry_host_and_stale_fence_refuse_without_mutation(self):
  before=self.files()
  for change in ({'token':'wrong'},{'now':2000},{'method':'GET'},{'host':'other.invalid'}):
   cfg=copy.deepcopy(self.cfg);self.assertFalse(self.request(**change)['ok']);self.assertEqual(self.files(),before);self.cfg=cfg
  self.assertFalse(self.request('cleanup','f'*64)['ok']);self.assertEqual(self.files(),before)
 def test_archive_or_terminal_metadata_change_cannot_authorize_disposal(self):
  p=self.case.private/('engine/'+bridge.old.ID+'/journal.json');p.write_bytes(p.read_bytes()+b' ');before=self.files();self.assertFalse(self.request()['ok']);self.assertEqual(self.files(),before)
  with self.assertRaises(ValueError):disposal.authority(self.packet,self.original,self.original_manifest,self.rollback,self.case.client.manifest,lambda n:(self.case.private/n).read_bytes(),self.public_root+'/other')
 def test_compiled_early_disposal_route_binds_authority_and_authentication(self):
  source=disposal.helper_source(self.authority,self.public_root,bridge.old.KEY,bridge.old.TOKEN,int(time.time())+300);self.assertIn(b"add_action('muplugins_loaded',",source);self.assertNotIn(b'__KTK_FULL_DISPOSAL_',source);p=subprocess.run([bridge.old.PHP,'-l'],input=source,capture_output=True);self.assertEqual(p.returncode,0,p.stderr)
  helper=Path(self.case.cfg['helper']);before=helper.read_bytes();self.addCleanup(helper.write_bytes,before);source=source.replace(b"file_get_contents('php://input',false,null,0,2049)",b"($GLOBALS['c']['body']??'')");helper.write_bytes(source)
  driver=observed.DRIVER.replace('HTTP_X_KTK_ENTRY_PROBE_TOKEN','HTTP_X_KTK_FULL_DISPOSAL_TOKEN').replace("$_GET=array('entry'=>$c['profile'],'ktk_private_entry_probe'=>$c['identifier']);","$_GET=array('ktk_full_private_disposal'=>$c['identifier']);").replace("require WP_PLUGIN_DIR.'/fixture-ecwid/entry.php';","$GLOBALS['ordinary_marker']=true;");path=self.case.root/'disposal-boot.php';path.write_text(driver,encoding='utf-8');cfg=copy.deepcopy(self.case.cfg);cfg.update(stage=(self.case.root/'public_html/staging').as_posix(),missingNoCache=False,identifier=bridge.old.ID,body=backup.encode({'schemaVersion':1,'action':'inspect','transactionId':bridge.old.ID,'applicationCommit':bridge.old.APP,'authoritySha256':self.authority['authoritySha256']}).decode())
  for token,valid in [(bridge.old.TOKEN,True),('',False)]:
   cfg['token']=token;config=self.case.root/'disposal-boot.json';config.write_text(json.dumps(cfg),encoding='utf-8');out=subprocess.run([bridge.old.PHP,str(path),str(config)],capture_output=True,timeout=45);self.assertEqual(out.returncode,0,out.stderr.decode());self.assertFalse(out.stderr,out.stderr.decode());value=backup.decode(out.stdout)
   if valid:self.assertEqual(value['status'],200,value);self.assertFalse(value['ordinaryMarker']);disposal.validate_state(value['body']['controller'],self.authority)
   else:self.assertTrue(value['noProbe']);self.assertTrue(value['ordinaryMarker']);self.assertEqual(value['queries'],[])
 def test_hard_link_payload_is_preserved_before_any_deletion(self):
  p=self.case.private/'source/ktk-code-pages.php';other=self.case.root/'hard-link-evidence';other.write_bytes(p.read_bytes());self.addCleanup(other.unlink);p.unlink();os.link(other,p);before=self.files();self.assertFalse(self.request()['ok']);self.assertEqual(self.files(),before)

if __name__=='__main__':unittest.main()
