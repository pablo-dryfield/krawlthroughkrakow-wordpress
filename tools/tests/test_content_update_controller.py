import base64,contextlib,json,subprocess,time,unittest
from pathlib import Path
from unittest.mock import patch
from tools import content_update_backup as backup
from tools.tests import test_production_protected_state as capture_fixtures

ROOT=capture_fixtures.ROOT;PHP=capture_fixtures.PHP;ID='a'*32;APP='c'*40;KEY='b'*64;TOKEN='t'*43
PREFIX=capture_fixtures.DRIVER.split('$wpdb=new FixtureDB();')[0]
DRIVER=PREFIX+r'''
$wpdb=new FixtureDB();
define('KTK_STAGING_STATE_ALLOWED',true);define('KTK_PRODUCTION_STATE_ALLOWED',true);
foreach(array('REQUEST','STORE','BACKUP','CONTROLLER') as $part){if($part!=='CONTROLLER'||$c['allowed']){define('KTK_CONTENT_UPDATE_'.$part.'_ALLOWED',true);}}
define('KTK_UPDATE_ENGINE_ALLOWED',true);
try{
 require $c['captureComponent'];if($c['production']){require $c['fingerprintComponent'];}
 $capture=static function()use($c){if($c['fault']==='hold-global-lock'){file_put_contents($c['readyPath'],'locked');fgets(STDIN);}$value=$c['production']?ktk_capture_production_original_state($c['helper']):ktk_capture_staging_original_state($c['helper']);if($c['captureMutation']==='fingerprint'){$value['scope']='production-protected-fingerprint';$value['ownedInventoryIncluded']=false;$value['ownedContentFiles']=array();}return $value;};
 if($c['operation']==='snapshot'){echo json_encode(array('ok'=>true,'state'=>$capture()),JSON_THROW_ON_ERROR);exit;}
 foreach($c['components'] as $component){require $component;}
 if($c['productionAuthorized']){define('KTK_CONTENT_UPDATE_PRODUCTION_AUTHORIZATION',array('transactionId'=>$c['packet']['plan']['transactionId'],'planSha256'=>$c['binding']['planSha256'],'approvalSha256'=>$c['packet']['productionAuthorizationSha256']));}
 $initialize=$c['production']?null:static function($private)use($c){foreach(array('source'=>$c['new'],'target'=>$c['old']) as $folder=>$files){mkdir($private.'/'.$folder,0700);if($c['fault']==='exit-initialization'){exit(74);}foreach($files as $name=>$encoded){$path=$private.'/'.$folder.'/'.$name;if(!is_dir(dirname($path))){mkdir(dirname($path),0700,true);}file_put_contents($path,base64_decode($encoded,true));}}};
 $fingerprint=$c['production']?static fn()=>ktk_capture_production_protected_fingerprint($c['helper']):$capture;
 $observer=$c['fault']==='exit-after-rename'?static function($event,$name){if($event==='after-rename'){exit(73);}}:null;
 $controller=new KTK_Content_Update_Controller($c['packet'],$capture,$fingerprint,$initialize,$observer);
 $value=$controller->run($c['request'],$c['method'],$c['host'],$c['token'],$c['now']);echo json_encode(array('ok'=>true,'value'=>$value),JSON_THROW_ON_ERROR);
}catch(Throwable $error){echo json_encode(array('ok'=>false,'message'=>$error->getMessage()),JSON_THROW_ON_ERROR);}
'''

@unittest.skipUnless(PHP,'PHP required for isolated controller lifecycle fixtures')
class ContentUpdateControllerTests(unittest.TestCase):
 @contextlib.contextmanager
 def fixture(self,production=False):
  capture=capture_fixtures.ProductionCapturePHPTests()
  with capture.fixture(nested=not production) as (root,mu,cfg,unused):
   activation=(mu/backup.ACTIVATION).read_bytes();(mu/capture_fixtures.NAME).unlink()
   if not production:
    (mu/backup.ACTIVATION).unlink();(mu/'ktk-consent-fixture.php').write_bytes(b'protected fixture consent boundary')
   for name,value in [('runtime.css',b'public css'),('runtime.js',b'public js')]: (mu/'ktk-code-pages-assets'/name).write_bytes(value)
   helper=mu/(('ktk-production-transaction-update-' if production else 'ktk-transaction-rehearsal-')+ID+'.php');helper.write_bytes(b'<?php /* exact local controller helper; no hook */')
   cfg.update(helper=helper.as_posix(),home='https://krawlthroughkrakow.com/'+('' if production else 'staging/'),siteurl='https://krawlthroughkrakow.com/'+('' if production else 'staging/'),public=1 if production else 0,production=production,productionAuthorized=production,allowed=True,captureMutation='',operation='snapshot',captureComponent=(ROOT/'tools'/('production-protected-state-core.php' if production else 'staging-protected-state-core.php')).as_posix(),fingerprintComponent=(ROOT/'tools/production-protected-fingerprint.php').as_posix(),components=[(ROOT/'tools'/name).as_posix() for name in ['content-update-request.php','content-update-private-store.php','content-update-backup-manifest.php','code-pages-update-engine.php','content-update-controller.php']],request='',method='POST',host='krawlthroughkrakow.com',token=TOKEN,now=1000,fault='')
   cfg['rows']['options']=[{'option_name':'home','option_value':cfg['home']},{'option_name':'siteurl','option_value':cfg['siteurl']},{'option_name':'blog_public','option_value':str(cfg['public'])}]
   cfg['rows']['posts'][0]['post_content']='Private original content must never enter controller responses'
   driver=root/'controller-driver.php';driver.write_bytes(DRIVER.encode());captured=self.call(root,driver,cfg);self.assertTrue(captured['ok'],captured);state=captured['state']
   if production:old={name:(mu/name).read_bytes() for name in state['ownedContentFiles']}
   else:old={'ktk-code-pages.php':b'private old renderer','ktk-code-pages-assets/registry.php':b'private old registry','ktk-code-pages-assets/runtime.css':b'private old css','ktk-code-pages-assets/runtime.js':b'private unchanged js'}
   old[backup.ACTIVATION]=activation;new={k:v for k,v in old.items() if k!=backup.ACTIVATION};new.update({'ktk-code-pages.php':b'private candidate renderer','ktk-code-pages-assets/registry.php':b'private candidate registry','ktk-code-pages-assets/runtime.css':b'private candidate css','ktk-code-pages-assets/introduced.html':b'private introduced body'})
   if production:
    source=root/'public_html/staging/wp-content/mu-plugins'
    for name,value in new.items():p=source/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(value)
   plan={'transactionId':ID,'applicationCommit':APP,'protectedStateSha256':state['protectedStateSha256'],'expected':{name:backup.sha(value) for name,value in new.items()},'prior':{name:backup.sha(value) for name,value in old.items()}}
   binding={'transactionId':ID,'applicationCommit':APP,'planSha256':backup.sha(backup.encode(plan,sort=True))}
   packet={'mode':'production' if production else 'private-staging-rehearsal','plan':plan,'publicRoot':(root/'public_html').as_posix(),'helperPath':helper.as_posix(),'helperSha256':backup.sha(helper.read_bytes()),'tokenSha256':backup.sha(TOKEN.encode()),'expires':2000,'ownershipKey':KEY,'stepLimit':1,'publicOwnedSha256':None if production else backup.sha(backup.encode(state['ownedContentFiles'],sort=True)),'productionAuthorizationSha256':'e'*64 if production else None}
   cfg.update(operation='controller',packet=packet,binding=binding,old={k:base64.b64encode(v).decode() for k,v in old.items()},new={k:base64.b64encode(v).decode() for k,v in new.items()});yield root,mu,driver,cfg
 def call(self,root,driver,cfg,exit_code=0):
  path=root/'controller-config.json';path.write_bytes(json.dumps(cfg).encode());process=subprocess.run([PHP,str(driver),str(path)],capture_output=True,text=True);self.assertEqual(process.returncode,exit_code,process.stderr);self.assertEqual(process.stderr,'')
  if exit_code:return None
  self.assertNotIn('Private original content must never enter controller responses',process.stdout if cfg['operation']!='snapshot' else '')
  return json.loads(process.stdout)
 def run_action(self,root,driver,cfg,action,**extra):
  cfg['request']=backup.encode({'schemaVersion':1,'action':action,**cfg['binding'],**extra}).decode();return self.call(root,driver,cfg)
 def ok(self,result):self.assertTrue(result['ok'],result);return result['value']
 def prepare(self,root,driver,cfg):return self.ok(self.run_action(root,driver,cfg,'prepare'))
 def archive_and_ack(self,root,driver,cfg):
  exported=self.ok(self.run_action(root,driver,cfg,'export'));manifest=exported['export'];private=root/('.ktk-content-update-'+ID)
  with patch.object(backup,'ROOT',root):receipt=backup.build_archive(manifest,lambda source:(private/source).read_bytes(),KEY,root/'deploy-backups/controller.zip')
  state=self.ok(self.run_action(root,driver,cfg,'acknowledge',stateSha256=exported['stateSha256'],exportSha256=receipt['manifestSha256'],archiveSha256=receipt['archiveSha256']));return state,receipt
 def advance(self,root,driver,cfg,action,state,receipt):return self.ok(self.run_action(root,driver,cfg,action,stateSha256=state['stateSha256'],archiveSha256=receipt['archiveSha256']))
 def test_private_lifecycle_requires_verified_zip_ack_then_bounded_apply_exact_rollback_and_close(self):
  with self.fixture() as (root,mu,driver,cfg):
   before={p.relative_to(mu).as_posix():backup.sha(p.read_bytes()) for p in mu.rglob('*') if p.is_file()};state=self.prepare(root,driver,cfg);self.assertEqual(state['engine']['phase'],'prepared');self.assertFalse(state['archiveAcknowledged']);state,receipt=self.archive_and_ack(root,driver,cfg)
   counts=[]
   while state['engine']['phase']!='applied':
    old_count=len(state['engine']['pendingApplyFiles']);state=self.advance(root,driver,cfg,'apply',state,receipt);counts.append(old_count-len(state['engine']['pendingApplyFiles']))
   self.assertEqual(counts,[1,1,1,1]);self.assertTrue(state['engine']['currentExpectedInventoryVerified'])
   while state['engine']['phase']!='rolled-back':state=self.advance(root,driver,cfg,'rollback',state,receipt)
   self.assertTrue(state['engine']['currentPriorInventoryVerified']);state=self.ok(self.run_action(root,driver,cfg,'close',stateSha256=state['stateSha256'],exportSha256=receipt['manifestSha256'],archiveSha256=receipt['archiveSha256']));self.assertTrue(state['closed']);self.assertEqual({p.relative_to(mu).as_posix():backup.sha(p.read_bytes()) for p in mu.rglob('*') if p.is_file()},before)
 def test_invalid_auth_canonical_request_or_client_approval_never_creates_private_state(self):
  for change in [{'token':'wrong'},{'method':'GET'},{'host':'other.example'},{'now':2000}]:
   with self.fixture() as (root,mu,driver,cfg):cfg.update(change);self.assertFalse(self.run_action(root,driver,cfg,'prepare')['ok']);self.assertFalse((root/('.ktk-content-update-'+ID)).exists())
  with self.fixture() as (root,mu,driver,cfg):self.assertFalse(self.run_action(root,driver,cfg,'prepare',ownerApproved=True)['ok']);self.assertFalse((root/('.ktk-content-update-'+ID)).exists())
 def test_missing_caller_flag_or_rejected_production_authorization_never_initializes_store(self):
  for production in (False,True):
   with self.fixture(production) as (root,mu,driver,cfg):
    if production:cfg['productionAuthorized']=False
    else:cfg['allowed']=False
    self.assertFalse(self.run_action(root,driver,cfg,'prepare')['ok']);self.assertFalse((root/('.ktk-content-update-'+ID)).exists())
 def test_simulated_production_uses_full_original_then_separate_fingerprint_during_mutation(self):
  with self.fixture(True) as (root,mu,driver,cfg):
   self.prepare(root,driver,cfg);state,receipt=self.archive_and_ack(root,driver,cfg)
   while state['engine']['phase']!='applied':state=self.advance(root,driver,cfg,'apply',state,receipt)
   self.assertTrue(state['engine']['currentExpectedInventoryVerified']);self.assertEqual(backup.sha((mu/backup.ACTIVATION).read_bytes()),backup.ACTIVATION_SHA)
   while state['engine']['phase']!='rolled-back':state=self.advance(root,driver,cfg,'rollback',state,receipt)
   self.assertTrue(state['engine']['currentPriorInventoryVerified'])
 def test_no_apply_without_ack_or_with_wrong_archive_or_stale_state(self):
  with self.fixture() as (root,mu,driver,cfg):
   prepared=self.prepare(root,driver,cfg);self.assertFalse(self.run_action(root,driver,cfg,'apply',stateSha256=prepared['stateSha256'],archiveSha256='f'*64)['ok']);state,receipt=self.archive_and_ack(root,driver,cfg)
   for fence,archive in [(prepared['stateSha256'],receipt['archiveSha256']),(state['stateSha256'],'f'*64)]:self.assertFalse(self.run_action(root,driver,cfg,'apply',stateSha256=fence,archiveSha256=archive)['ok'])
   current=self.ok(self.run_action(root,driver,cfg,'inspect'));self.assertEqual(current['stateSha256'],state['stateSha256']);self.assertTrue(current['engine']['currentPriorInventoryVerified'])
 def test_wrong_export_cannot_acknowledge_or_create_receipt(self):
  with self.fixture() as (root,mu,driver,cfg):
   state=self.prepare(root,driver,cfg);self.assertFalse(self.run_action(root,driver,cfg,'acknowledge',stateSha256=state['stateSha256'],exportSha256='f'*64,archiveSha256='e'*64)['ok']);self.assertFalse((root/('.ktk-content-update-'+ID)/'control/backup-ack.json').exists())
 def test_lost_reply_after_real_replacement_requires_inspection_and_resumes_exactly(self):
  with self.fixture() as (root,mu,driver,cfg):
   self.prepare(root,driver,cfg);state,receipt=self.archive_and_ack(root,driver,cfg);cfg['fault']='exit-after-rename';cfg['request']=backup.encode({'schemaVersion':1,'action':'apply',**cfg['binding'],'stateSha256':state['stateSha256'],'archiveSha256':receipt['archiveSha256']}).decode();self.call(root,driver,cfg,exit_code=73);cfg['fault']=''
   self.assertFalse(self.run_action(root,driver,cfg,'apply',stateSha256=state['stateSha256'],archiveSha256=receipt['archiveSha256'])['ok']);state=self.ok(self.run_action(root,driver,cfg,'inspect'));self.assertEqual(len(state['engine']['pendingApplyFiles']),3)
   while state['engine']['phase']!='applied':state=self.advance(root,driver,cfg,'apply',state,receipt)
   while state['engine']['phase']!='rolled-back':state=self.advance(root,driver,cfg,'rollback',state,receipt)
   self.assertTrue(state['engine']['currentPriorInventoryVerified'])
 def test_protected_public_state_or_helper_change_refuses_before_private_preparation(self):
  for mutation in ('database','helper','owned'):
   with self.fixture() as (root,mu,driver,cfg):
    if mutation=='database':cfg['rows']['posts'][0]['post_content']='externally changed private text'
    elif mutation=='helper':Path(cfg['helper']).write_bytes(b'changed helper')
    else:(mu/'ktk-code-pages-assets/runtime.css').write_bytes(b'external public edit')
    self.assertFalse(self.run_action(root,driver,cfg,'prepare')['ok']);self.assertFalse((root/('.ktk-content-update-'+ID)).exists())
 def test_changed_protected_state_after_ack_blocks_application_and_does_not_restore_database(self):
  with self.fixture() as (root,mu,driver,cfg):
   self.prepare(root,driver,cfg);state,receipt=self.archive_and_ack(root,driver,cfg);cfg['rows']['posts'][0]['post_content']='externally changed private text';self.assertFalse(self.run_action(root,driver,cfg,'apply',stateSha256=state['stateSha256'],archiveSha256=receipt['archiveSha256'])['ok']);current=self.ok(self.run_action(root,driver,cfg,'inspect'));self.assertFalse(current['engine']['protectedStateVerified']);self.assertTrue(current['engine']['currentPriorInventoryVerified']);self.assertEqual(cfg['rows']['posts'][0]['post_content'],'externally changed private text')
 def test_closed_transaction_rejects_mutation_and_retains_private_original_and_archive(self):
  with self.fixture() as (root,mu,driver,cfg):
   self.prepare(root,driver,cfg);state,receipt=self.archive_and_ack(root,driver,cfg);state=self.advance(root,driver,cfg,'rollback',state,receipt);state=self.ok(self.run_action(root,driver,cfg,'close',stateSha256=state['stateSha256'],exportSha256=receipt['manifestSha256'],archiveSha256=receipt['archiveSha256']));self.assertFalse(self.run_action(root,driver,cfg,'apply',stateSha256=state['stateSha256'],archiveSha256=receipt['archiveSha256'])['ok']);self.assertTrue((root/('.ktk-content-update-'+ID)/'control/original-state.json').exists());self.assertTrue((root/'deploy-backups/controller.zip').exists())
 def test_unsafe_plan_and_packet_paths_are_rejected_before_private_writes(self):
  for mutation in ('private-path','marker','step-budget'):
   with self.fixture() as (root,mu,driver,cfg):
    if mutation=='private-path':cfg['packet']['publicRoot']=root.as_posix()
    elif mutation=='marker':cfg['packet']['plan']['expected'][backup.ACTIVATION]=backup.ACTIVATION_SHA
    else:cfg['packet']['stepLimit']=0
    self.assertFalse(self.run_action(root,driver,cfg,'prepare')['ok']);self.assertFalse((root/('.ktk-content-update-'+ID)).exists())
 def test_repeat_prepare_preserves_existing_transaction_and_requires_inspection(self):
  with self.fixture() as (root,mu,driver,cfg):
   first=self.prepare(root,driver,cfg);self.assertFalse(self.run_action(root,driver,cfg,'prepare')['ok']);second=self.ok(self.run_action(root,driver,cfg,'inspect'));self.assertEqual(first,second)
 def test_changed_prior_after_archive_ack_blocks_apply_and_preserves_external_bytes(self):
  with self.fixture() as (root,mu,driver,cfg):
   self.prepare(root,driver,cfg);state,receipt=self.archive_and_ack(root,driver,cfg);path=root/('.ktk-content-update-'+ID)/'engine'/ID/'prior/ktk-code-pages.php';path.write_bytes(b'external backup change');self.assertFalse(self.run_action(root,driver,cfg,'apply',stateSha256=state['stateSha256'],archiveSha256=receipt['archiveSha256'])['ok']);self.assertEqual(path.read_bytes(),b'external backup change');current=self.ok(self.run_action(root,driver,cfg,'inspect'));self.assertFalse(current['engine']['backupVerified']);self.assertTrue(current['engine']['currentPriorInventoryVerified'])
 def test_external_target_edit_is_never_overwritten_by_apply_or_rollback(self):
  with self.fixture() as (root,mu,driver,cfg):
   self.prepare(root,driver,cfg);state,receipt=self.archive_and_ack(root,driver,cfg);path=root/('.ktk-content-update-'+ID)/'target/ktk-code-pages-assets/runtime.css';path.write_bytes(b'external target edit');state=self.ok(self.run_action(root,driver,cfg,'inspect'))
   for action in ('apply','rollback'):
    self.assertFalse(self.run_action(root,driver,cfg,action,stateSha256=state['stateSha256'],archiveSha256=receipt['archiveSha256'])['ok']);self.assertEqual(path.read_bytes(),b'external target edit');state=self.ok(self.run_action(root,driver,cfg,'inspect'))
 def test_partial_inventory_cannot_be_closed(self):
  with self.fixture() as (root,mu,driver,cfg):
   self.prepare(root,driver,cfg);state,receipt=self.archive_and_ack(root,driver,cfg);state=self.advance(root,driver,cfg,'apply',state,receipt);self.assertEqual(state['engine']['phase'],'applying');self.assertFalse(self.run_action(root,driver,cfg,'close',stateSha256=state['stateSha256'],exportSha256=receipt['manifestSha256'],archiveSha256=receipt['archiveSha256'])['ok']);self.assertFalse((root/('.ktk-content-update-'+ID)/'control/closed.json').exists())
 def test_interrupted_initialization_retains_private_records_and_requires_manual_review(self):
  with self.fixture() as (root,mu,driver,cfg):
   cfg['fault']='exit-initialization';cfg['request']=backup.encode({'schemaVersion':1,'action':'prepare',**cfg['binding']}).decode();self.call(root,driver,cfg,exit_code=74);cfg['fault']='';private=root/('.ktk-content-update-'+ID);before={p.relative_to(private).as_posix():backup.sha(p.read_bytes()) for p in private.rglob('*') if p.is_file()}
   self.assertFalse(self.run_action(root,driver,cfg,'prepare')['ok']);self.assertFalse(self.run_action(root,driver,cfg,'inspect')['ok']);self.assertEqual({p.relative_to(private).as_posix():backup.sha(p.read_bytes()) for p in private.rglob('*') if p.is_file()},before);self.assertTrue((private/'control/original-state.json').exists());self.assertFalse((private/'target').exists())
 def test_fingerprint_cannot_initialize_production_original_backup(self):
  with self.fixture(True) as (root,mu,driver,cfg):
   cfg['captureMutation']='fingerprint';self.assertFalse(self.run_action(root,driver,cfg,'prepare')['ok']);self.assertFalse((root/('.ktk-content-update-'+ID)).exists())
 def test_wrong_plan_authorization_does_not_initialize_production_store(self):
  with self.fixture(True) as (root,mu,driver,cfg):
   cfg['binding']['planSha256']='f'*64;self.assertFalse(self.run_action(root,driver,cfg,'prepare')['ok']);self.assertFalse((root/('.ktk-content-update-'+ID)).exists())
 def test_distinct_production_transactions_contend_on_one_actual_target_lock(self):
  with self.fixture(True) as (root,mu,driver,cfg):
   second=json.loads(json.dumps(cfg));second_id='d'*32;second_helper=mu/('ktk-production-transaction-update-'+second_id+'.php');second_helper.write_bytes(Path(cfg['helper']).read_bytes());second['helper']=second_helper.as_posix();second['packet']['helperPath']=second_helper.as_posix();second['packet']['plan']['transactionId']=second_id;second['binding']['transactionId']=second_id
   for current in (cfg,second):
    current['operation']='snapshot';snapshot=self.call(root,driver,current);self.assertTrue(snapshot['ok'],snapshot);current['operation']='controller';current['packet']['plan']['protectedStateSha256']=snapshot['state']['protectedStateSha256'];current['binding']['planSha256']=backup.sha(backup.encode(current['packet']['plan'],sort=True))
   cfg['fault']='hold-global-lock';ready=root/'target-lock-ready';cfg['readyPath']=ready.as_posix();cfg['request']=backup.encode({'schemaVersion':1,'action':'prepare',**cfg['binding']}).decode();config=root/'held-controller.json';config.write_bytes(json.dumps(cfg).encode());process=subprocess.Popen([PHP,str(driver),str(config)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
   try:
    deadline=time.monotonic()+10
    while not ready.exists() and time.monotonic()<deadline:
     if process.poll() is not None:break
     time.sleep(.02)
    self.assertTrue(ready.exists(),'First request never acquired shared target lock');result=self.run_action(root,driver,second,'prepare');self.assertFalse(result['ok']);self.assertIn('holds the shared target lock',result['message']);self.assertFalse((root/('.ktk-content-update-'+second_id)).exists())
   finally:
    stdout,stderr=process.communicate(b'\n',timeout=10);self.assertEqual(process.returncode,0,stderr);self.assertEqual(stderr,b'')
 def test_unknown_shared_target_lock_is_preserved_without_private_initialization(self):
  with self.fixture(True) as (root,mu,driver,cfg):
   path=root/'.ktk-content-update-production-target.lock';path.write_bytes(b'foreign lock');self.assertFalse(self.run_action(root,driver,cfg,'prepare')['ok']);self.assertEqual(path.read_bytes(),b'foreign lock');self.assertFalse((root/('.ktk-content-update-'+ID)).exists())
 def test_invalid_production_identity_never_creates_even_the_shared_private_lock(self):
  with self.fixture(True) as (root,mu,driver,cfg):
   cfg['home']='https://krawlthroughkrakow.com/staging/';self.assertFalse(self.run_action(root,driver,cfg,'prepare')['ok']);self.assertFalse((root/'.ktk-content-update-production-target.lock').exists());self.assertFalse((root/('.ktk-content-update-'+ID)).exists())
 def test_simulated_production_inspection_survives_changed_protected_rows_but_blocks_mutations(self):
  with self.fixture(True) as (root,mu,driver,cfg):
   self.prepare(root,driver,cfg);state,receipt=self.archive_and_ack(root,driver,cfg);cfg['rows']['posts'][0]['post_content']='externally changed production fixture row';current=self.ok(self.run_action(root,driver,cfg,'inspect'));self.assertFalse(current['engine']['protectedStateVerified']);self.assertTrue(current['engine']['currentPriorInventoryVerified'])
   for action in ('apply','rollback'):self.assertFalse(self.run_action(root,driver,cfg,action,stateSha256=current['stateSha256'],archiveSha256=receipt['archiveSha256'])['ok'])
   self.assertEqual(cfg['rows']['posts'][0]['post_content'],'externally changed production fixture row')

if __name__=='__main__':unittest.main()
