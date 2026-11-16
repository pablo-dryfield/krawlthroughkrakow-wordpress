import ast,base64,contextlib,copy,hashlib,json,shutil,subprocess,tempfile,unittest,warnings,zipfile
from pathlib import Path
from unittest.mock import patch
from tools import content_update_backup as backup
from tools.tests import test_production_protected_state as capture_fixtures
ROOT=capture_fixtures.ROOT;PHP=capture_fixtures.PHP

ID='a'*32;KEY='b'*64;APP='c'*40
DRIVER=r'''<?php
$c=json_decode(file_get_contents($argv[1]),true,512,JSON_THROW_ON_ERROR);
define('KTK_CONTENT_UPDATE_STORE_ALLOWED',true);define('KTK_UPDATE_ENGINE_ALLOWED',true);if(!$c['denyBackup']){define('KTK_CONTENT_UPDATE_BACKUP_ALLOWED',true);}
try{
 require $c['storeComponent'];require $c['engineComponent'];require $c['backupComponent'];
 if($c['operation']==='prepare'){
  $store=KTK_Content_Update_Private_Store::create($c['private'],$c['public'],$c['plan']['transactionId'],$c['key']);mkdir($c['private'].'/source',0700);mkdir($c['private'].'/engine',0700);
  foreach($c['sources'] as $name=>$encoded){$path=$c['private'].'/source/'.$name;if(!is_dir(dirname($path))){mkdir(dirname($path),0700,true);}file_put_contents($path,base64_decode($encoded,true));}
  $state=json_decode(base64_decode($c['stateBase64'],true),true,64,JSON_THROW_ON_ERROR);
  if($c['mutation']==='fingerprint'){$state['scope']='production-protected-fingerprint';$state['ownedInventoryIncluded']=false;$state['ownedContentFiles']=array();}
  if($c['mutation']==='state-hash'){$state['database']['posts'][0]['post_content']='changed without updating the hash';}
  if($c['mutation']==='owned-map'){$state['ownedContentFiles']['ktk-code-pages-assets/unexpected.dat']=str_repeat('f',64);}
  $raw=json_encode($state,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);$store->writeOnce('original-state.json',$raw);
  $control=array('schemaVersion'=>1,'mode'=>$c['mutation']==='mode'?'private-staging-rehearsal':'production','transactionId'=>$c['plan']['transactionId'],'applicationCommit'=>$c['plan']['applicationCommit'],'originalStateSha256'=>$c['mutation']==='control-hash'?str_repeat('0',64):hash('sha256',$raw),'enginePlan'=>$c['plan']);$store->writeOnce('controller-plan.json',json_encode($control,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
  $engine=new KTK_Active_Content_Transaction($c['private'].'/source',$c['target'],$c['private'].'/engine',$c['plan'],static fn()=>$c['plan']['protectedStateSha256']);$engine->prepare();
  if($c['mutation']==='extra-prior'){file_put_contents($c['private'].'/engine/'.$c['plan']['transactionId'].'/prior/owner-note','preserve');}
  if($c['mutation']==='changed-prior'){file_put_contents($c['private'].'/engine/'.$c['plan']['transactionId'].'/prior/ktk-code-pages.php','changed externally');}
 }else{$store=new KTK_Content_Update_Private_Store($c['private'],$c['public'],$c['plan']['transactionId'],$c['key']);}
 $manifest=KTK_Content_Update_Backup_Manifest::build($store,$c['plan']);echo json_encode(array('ok'=>true,'manifest'=>$manifest),JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
}catch(Throwable $error){echo json_encode(array('ok'=>false,'message'=>$error->getMessage()),JSON_THROW_ON_ERROR);}
'''

@unittest.skipUnless(PHP,'PHP required for independent backup integration fixtures')
class ContentUpdateBackupTests(unittest.TestCase):
 @contextlib.contextmanager
 def fixture(self):
  capture=capture_fixtures.ProductionCapturePHPTests()
  with capture.fixture() as (root,mu,config,capture_driver):
   for name,value in [('runtime.css',b'old css'),('runtime.js',b'old js')]: (mu/'ktk-code-pages-assets'/name).write_bytes(value)
   config['rows']['posts'][0]['post_content']='Saved Żółw £ '+chr(0x2028)+' original'
   state=capture.run_capture(root,config,capture_driver)['value'];prior={**state['ownedContentFiles'],'ktk-code-pages-production.php':backup.ACTIVATION_SHA};sources={name:(mu/name).read_bytes() for name in state['ownedContentFiles']};sources['ktk-code-pages.php']=b'new renderer';sources['ktk-code-pages-assets/runtime.css']=b'new css';sources['ktk-code-pages-assets/new-body.html']=b'new body';expected={name:backup.sha(value) for name,value in sources.items()};plan={'transactionId':ID,'applicationCommit':APP,'protectedStateSha256':state['protectedStateSha256'],'expected':expected,'prior':prior};private=root/('.ktk-content-update-'+ID);driver=root/'backup-driver.php';driver.write_bytes(DRIVER.encode())
   cfg={'operation':'prepare','mutation':'','denyBackup':False,'storeComponent':(ROOT/'tools/content-update-private-store.php').as_posix(),'engineComponent':(ROOT/'tools/code-pages-update-engine.php').as_posix(),'backupComponent':(ROOT/'tools/content-update-backup-manifest.php').as_posix(),'private':private.as_posix(),'public':(root/'public_html').as_posix(),'target':mu.as_posix(),'key':KEY,'plan':plan,'sources':{name:base64.b64encode(value).decode() for name,value in sources.items()},'stateBase64':base64.b64encode(backup.encode(state)).decode()};yield root,private,driver,cfg
 def run_php(self,root,driver,cfg):
  path=root/'backup-config.json';path.write_bytes(json.dumps(cfg).encode());before={p.relative_to(root/'public_html').as_posix():backup.sha(p.read_bytes()) for p in (root/'public_html').rglob('*') if p.is_file()};process=subprocess.run([PHP,str(driver),str(path)],capture_output=True,text=True,check=True);self.assertEqual(process.stderr,'');result=json.loads(process.stdout);self.assertEqual({p.relative_to(root/'public_html').as_posix():backup.sha(p.read_bytes()) for p in (root/'public_html').rglob('*') if p.is_file()},before);return result
 def reader(self,private):
  return lambda source:(private/source).read_bytes()
 def test_real_engine_prior_and_signed_records_build_an_independently_verified_zip(self):
  with self.fixture() as (root,private,driver,cfg):
   result=self.run_php(root,driver,cfg);self.assertTrue(result['ok'],result);manifest=result['manifest'];backup.validate_manifest(manifest);destination=root/'deploy-backups/verified.zip'
   with patch.object(backup,'ROOT',root):receipt=backup.build_archive(manifest,self.reader(private),KEY,destination)
   self.assertTrue(receipt['allMemberChecksumsAndCRCVerified']);self.assertTrue(receipt['fullOriginalAndPriorSetVerified']);self.assertFalse(receipt['ownerApproved']);self.assertFalse(receipt['applicationWritesAuthorized']);self.assertTrue(receipt['callerMustVerifyProvenance']);self.assertEqual(backup.verify_archive(destination,KEY,manifest),receipt)
   with zipfile.ZipFile(destination) as archive:self.assertIsNone(archive.testzip());self.assertEqual(set(archive.namelist()),set(manifest['members'])|{'backup-manifest.json'});self.assertNotIn('prior/ktk-code-pages-assets/runtime.js',archive.namelist());self.assertIn('prior/ktk-code-pages-assets/runtime.css',archive.namelist())
 def test_manifest_reopening_is_read_only(self):
  with self.fixture() as (root,private,driver,cfg):
   first=self.run_php(root,driver,cfg);self.assertTrue(first['ok'],first);before={p.relative_to(private).as_posix():backup.sha(p.read_bytes()) for p in private.rglob('*') if p.is_file()};cfg['operation']='manifest';second=self.run_php(root,driver,cfg);self.assertEqual(second,first);self.assertEqual({p.relative_to(private).as_posix():backup.sha(p.read_bytes()) for p in private.rglob('*') if p.is_file()},before)
 def test_fingerprint_or_mismatched_state_and_control_can_never_be_a_backup(self):
  for mutation in ['fingerprint','state-hash','control-hash','mode','owned-map']:
   with self.fixture() as (root,private,driver,cfg):
    cfg['mutation']=mutation;result=self.run_php(root,driver,cfg);self.assertFalse(result['ok'],mutation)
 def test_unknown_or_changed_prior_bytes_are_preserved_and_not_exported(self):
  for mutation in ['extra-prior','changed-prior']:
   with self.fixture() as (root,private,driver,cfg):
    cfg['mutation']=mutation;result=self.run_php(root,driver,cfg);self.assertFalse(result['ok']);path=private/'engine'/ID/'prior'/('owner-note' if mutation=='extra-prior' else 'ktk-code-pages.php');self.assertEqual(path.read_bytes(),b'preserve' if mutation=='extra-prior' else b'changed externally')
 def test_export_module_requires_explicit_caller_before_initialization(self):
  with self.fixture() as (root,private,driver,cfg):
   cfg['denyBackup']=True;result=self.run_php(root,driver,cfg);self.assertFalse(result['ok']);self.assertFalse(private.exists())
 def prepared(self,root,driver,cfg):
  result=self.run_php(root,driver,cfg);self.assertTrue(result['ok'],result);return result['manifest']
 def reseal(self,manifest):
  manifest['bytes']=sum(row['bytes'] for row in manifest['members'].values());manifest['manifestSha256']=backup.sha(backup.encode({k:v for k,v in manifest.items() if k!='manifestSha256'},sort=True));return manifest
 def test_changed_download_preserves_partial_zip_and_cannot_be_acknowledged_or_overwritten(self):
  with self.fixture() as (root,private,driver,cfg):
   manifest=self.prepared(root,driver,cfg);destination=root/'deploy-backups/partial.zip'
   with patch.object(backup,'ROOT',root):
    with self.assertRaises(ValueError):backup.build_archive(manifest,lambda source:b'corrupt',KEY,destination)
    self.assertTrue(destination.exists());before=destination.read_bytes()
    with self.assertRaises(ValueError):backup.build_archive(manifest,self.reader(private),KEY,destination)
   self.assertEqual(destination.read_bytes(),before)
   with self.assertRaises(ValueError):backup.verify_archive(destination,KEY,manifest)
 def test_manifest_path_and_mutation_claims_fail_before_reader_or_zip_creation(self):
  with self.fixture() as (root,private,driver,cfg):
   manifest=self.prepared(root,driver,cfg)
   for index,mutate in enumerate([lambda m:m['members']['records/original-state.json'].update(source='../wp-config.php'),lambda m:m.update(applicationWrites=1),lambda m:m.update(transactionId='../'+ID),lambda m:m['members'].update({'../escape':next(iter(m['members'].values()))})]):
    changed=copy.deepcopy(manifest);mutate(changed);self.reseal(changed);destination=root/f'deploy-backups/refused-{index}.zip'
    with patch.object(backup,'ROOT',root):
     with self.assertRaises(ValueError):backup.build_archive(changed,lambda source:(_ for _ in ()).throw(AssertionError('No reader before validation')),KEY,destination)
    self.assertFalse(destination.exists())
 def test_wrong_verification_key_cannot_produce_a_verified_receipt(self):
  with self.fixture() as (root,private,driver,cfg):
   manifest=self.prepared(root,driver,cfg);destination=root/'deploy-backups/wrong-key.zip'
   with patch.object(backup,'ROOT',root):
    with self.assertRaises(ValueError):backup.build_archive(manifest,self.reader(private),'d'*64,destination)
   self.assertTrue(destination.exists())
 def test_unknown_missing_or_duplicate_zip_members_are_rejected_even_with_valid_crc(self):
  with self.fixture() as (root,private,driver,cfg):
   manifest=self.prepared(root,driver,cfg);original=root/'deploy-backups/original.zip'
   with patch.object(backup,'ROOT',root):backup.build_archive(manifest,self.reader(private),KEY,original)
   for mode in ['unknown','missing','duplicate']:
    path=root/f'deploy-backups/{mode}.zip'
    with zipfile.ZipFile(original) as source,zipfile.ZipFile(path,'x') as target,warnings.catch_warnings():
     warnings.simplefilter('ignore',UserWarning)
     for name in source.namelist():
      if mode=='missing' and name=='records/original-state.json':continue
      target.writestr(name,source.read(name))
     if mode=='unknown':target.writestr('../unexpected',b'x')
     if mode=='duplicate':target.writestr('records/original-state.json',source.read('records/original-state.json'))
    with self.assertRaises(ValueError):backup.verify_archive(path,KEY,manifest)
 def test_missing_changed_file_is_rejected_after_manifest_shape_and_crc_pass(self):
  with self.fixture() as (root,private,driver,cfg):
   manifest=self.prepared(root,driver,cfg);del manifest['members']['prior/ktk-code-pages-assets/runtime.css'];self.reseal(manifest);backup.validate_manifest(manifest)
   with patch.object(backup,'ROOT',root):
    with self.assertRaises(ValueError):backup.build_archive(manifest,self.reader(private),KEY,root/'deploy-backups/incomplete-rollback.zip')
 def test_cross_root_rebinding_cannot_reuse_signed_original_records(self):
  with self.fixture() as (root,private,driver,cfg):
   manifest=self.prepared(root,driver,cfg);manifest['rootBinding']='f'*64;self.reseal(manifest)
   with patch.object(backup,'ROOT',root):
    with self.assertRaises(ValueError):backup.build_archive(manifest,self.reader(private),KEY,root/'deploy-backups/wrong-root.zip')
 def test_output_must_be_fresh_inside_private_backup_directory_without_symlinks(self):
  with self.fixture() as (root,private,driver,cfg):
   manifest=self.prepared(root,driver,cfg);outside=root/'outside.zip'
   with patch.object(backup,'ROOT',root):
    with self.assertRaises(ValueError):backup.build_archive(manifest,self.reader(private),KEY,outside)
   self.assertFalse(outside.exists())
 def test_prior_symlink_is_never_followed(self):
  with self.fixture() as (root,private,driver,cfg):
   self.prepared(root,driver,cfg);path=private/'engine'/ID/'prior/ktk-code-pages.php';outside=root/'external.keep';outside.write_bytes(path.read_bytes());path.unlink()
   try:path.symlink_to(outside)
   except OSError:self.skipTest('This host cannot create the prior symlink fixture')
   cfg['operation']='manifest';result=self.run_php(root,driver,cfg);self.assertFalse(result['ok']);self.assertEqual(outside.read_bytes(),b'old renderer')

if __name__=='__main__':unittest.main()
