import contextlib,json,subprocess,time,unittest
from pathlib import Path
from unittest.mock import patch
from tools import content_update_backup as backup
from tools import content_update_staging_packet as packet
from tools.content_update_client import ContentUpdateClient,UncertainRequest
from tools.tests import test_content_update_controller as fixtures
from tools.tests import test_staging_private_rehearsal as hook_fixtures

@unittest.skipUnless(fixtures.PHP,'PHP required for compiled staging WordPress-hook fixtures')
class StagingControllerPacketTests(unittest.TestCase):
 @contextlib.contextmanager
 def fixture(self):
  server=fixtures.ContentUpdateControllerTests()
  with server.fixture() as (root,mu,driver,cfg):
   owned={p.relative_to(mu).as_posix():backup.sha(p.read_bytes()) for p in mu.rglob('*') if p.is_file() and (p.relative_to(mu).as_posix()=='ktk-code-pages.php' or p.relative_to(mu).as_posix().startswith('ktk-code-pages-assets/'))};expires=int(time.time())+1800;source=packet.helper_source(Path(cfg['helper']).name,fixtures.TOKEN,expires,fixtures.APP,owned,cfg['packet']['plan']['protectedStateSha256'],fixtures.KEY);Path(cfg['helper']).write_bytes(source)
   plan=packet.fixture_plan(fixtures.ID,fixtures.APP,cfg['packet']['plan']['protectedStateSha256']);binding=packet.binding(plan);hook=root/'hook-driver.php';hook.write_bytes(hook_fixtures.DRIVER.replace('HTTP_X_KTK_REHEARSAL_TOKEN','HTTP_X_KTK_CONTENT_UPDATE_TOKEN').encode());config={'stage':cfg['site'],'helper':cfg['helper'],'token':fixtures.TOKEN,'host':'krawlthroughkrakow.com','method':'POST','home':cfg['home'],'siteurl':cfg['siteurl'],'public':0,'body':'{}','rows':cfg['rows']};private=root/('.ktk-content-update-'+fixtures.ID);calls=[]
   before={p.relative_to(root/'public_html').as_posix():backup.sha(p.read_bytes()) for p in (root/'public_html').rglob('*') if p.is_file()}
   def request(raw):
    config['body']=raw.decode() if isinstance(raw,bytes) else raw;path=root/'hook-request.json';path.write_bytes(json.dumps(config).encode());result=subprocess.run([fixtures.PHP,str(hook),str(path)],capture_output=True,text=True,check=True);self.assertEqual(result.stderr,'');value=json.loads(result.stdout);self.assertEqual({p.relative_to(root/'public_html').as_posix():backup.sha(p.read_bytes()) for p in (root/'public_html').rglob('*') if p.is_file()},before);self.assertNotIn('Private original content must never enter controller responses',result.stdout);return value
   def transport(raw):
    calls.append(backup.decode(raw)['action']);result=request(raw)
    if result.get('status')!=200:raise RuntimeError('Generic fixture HTTP failure')
    return result['body']
   client=ContentUpdateClient(binding,backup.sha(source),fixtures.KEY,transport,lambda source:(private/source).read_bytes())
   with patch.object(backup,'ROOT',root):yield root,mu,private,config,source,binding,client,request,calls,owned,expires
 def test_compiled_helper_and_injected_caller_complete_five_private_changes_and_exact_rollback(self):
  with self.fixture() as (root,mu,private,config,source,binding,client,request,calls,owned,expires):
   state=client.prepare();self.assertEqual(state['engine']['phase'],'prepared');self.assertEqual(len(state['engine']['pendingApplyFiles']),5);self.assertFalse((mu/backup.ACTIVATION).exists());state=client.export_and_acknowledge(root/'deploy-backups/compiled-controller.zip')
   while state['engine']['phase']!='applied':state=client.step('apply')
   while state['engine']['phase']!='rolled-back':state=client.step('rollback')
   closed=client.close();self.assertTrue(closed['closed']);self.assertTrue(closed['engine']['currentPriorInventoryVerified']);self.assertEqual(calls.count('apply'),5);self.assertEqual(calls.count('rollback'),5);self.assertTrue((private/'control/original-state.json').exists());self.assertFalse((mu/backup.ACTIVATION).exists())
 def test_unauthenticated_or_wrong_method_and_identity_never_query_or_initialize(self):
  for key,value in [('token','wrong'),('method','GET'),('host','other.example'),('home','https://krawlthroughkrakow.com/'),('public',1)]:
   with self.fixture() as (root,mu,private,config,source,binding,client,request,calls,owned,expires):
    config[key]=value;result=request(backup.encode({'schemaVersion':1,'action':'prepare',**binding}));self.assertFalse(result['queries']);self.assertFalse(private.exists());self.assertTrue(result.get('noRehearsal') or result.get('status')==403)
 def test_noncanonical_or_client_paths_and_approval_fail_without_selected_reads_or_private_writes(self):
  for raw in ['{}','{ "action":"prepare" }','x'*2049]:
   with self.fixture() as (root,mu,private,config,source,binding,client,request,calls,owned,expires):
    result=request(raw);self.assertEqual(result['status'],409);self.assertEqual(result['body'],{'error':'private_staging_controller_failed'});self.assertFalse(result['queries']);self.assertFalse(private.exists())
  with self.fixture() as (root,mu,private,config,source,binding,client,request,calls,owned,expires):
   result=request(backup.encode({'schemaVersion':1,'action':'prepare',**binding,'ownerApproved':True}));self.assertEqual(result['status'],409);self.assertFalse(result['queries']);self.assertFalse(private.exists())
 def test_changed_public_data_returns_only_generic_failure_and_no_private_initialization(self):
  with self.fixture() as (root,mu,private,config,source,binding,client,request,calls,owned,expires):
   config['rows']['posts'][0]['post_content']='Changed sensitive fixture row'
   with self.assertRaises(UncertainRequest):client.prepare()
   self.assertFalse(private.exists())
 def test_compiler_is_pure_and_staging_only_and_keeps_token_out_of_source(self):
  with self.fixture() as (root,mu,private,config,source,binding,client,request,calls,owned,expires):
   self.assertNotIn(fixtures.TOKEN.encode(),source);self.assertNotIn(b'__KTK_CONTROLLER_',source);self.assertNotIn(b"define('KTK_CONTENT_UPDATE_PRODUCTION_AUTHORIZATION'",source);before={p.relative_to(root).as_posix():backup.sha(p.read_bytes()) for p in root.rglob('*') if p.is_file()};self.assertEqual(packet.helper_source(Path(config['helper']).name,fixtures.TOKEN,expires,fixtures.APP,owned,'f'*64,fixtures.KEY)[:5],b'<?php');self.assertEqual({p.relative_to(root).as_posix():backup.sha(p.read_bytes()) for p in root.rglob('*') if p.is_file()},before)
   for name in ['ktk-production-transaction-update-'+fixtures.ID+'.php','../helper.php']:
    with self.assertRaises(ValueError):packet.helper_source(name,fixtures.TOKEN,expires,fixtures.APP,owned,'f'*64,fixtures.KEY)
   self.assertFalse(private.exists());self.assertEqual(calls,[])
 def test_compiler_rejects_bad_expiry_inventory_key_and_production_marker(self):
  with self.fixture() as (root,mu,private,config,source,binding,client,request,calls,owned,expires):
   for expiry,values,key in [(int(time.time())-1,owned,fixtures.KEY),(int(time.time())+7201,owned,fixtures.KEY),(expires,{},fixtures.KEY),(expires,{**owned,backup.ACTIVATION:backup.ACTIVATION_SHA},fixtures.KEY),(expires,owned,'bad')]:
    with self.assertRaises(ValueError):packet.helper_source(Path(config['helper']).name,fixtures.TOKEN,expiry,fixtures.APP,values,'f'*64,key)
   self.assertFalse(private.exists())

if __name__=='__main__':unittest.main()
