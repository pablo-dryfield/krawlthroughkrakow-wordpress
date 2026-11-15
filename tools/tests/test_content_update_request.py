import contextlib,hashlib,json,shutil,subprocess,tempfile,unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2];PHP=shutil.which('php');CORE=ROOT/'tools/content-update-request.php';TOKEN='b'*43
BINDING={'transactionId':'a'*32,'applicationCommit':'c'*40,'planSha256':'d'*64}
EXTRA={'prepare':[],'inspect':[],'export':[],'acknowledge':['stateSha256','exportSha256','archiveSha256'],'apply':['stateSha256','archiveSha256'],'rollback':['stateSha256','archiveSha256'],'close':['stateSha256','exportSha256','archiveSha256']}
DRIVER=r'''<?php
$c=json_decode(file_get_contents($argv[1]),true,512,JSON_THROW_ON_ERROR);
if($c['defineAllowed']){define('KTK_CONTENT_UPDATE_REQUEST_ALLOWED',$c['allowedValue']);}
$reentered=false;
try{
 try{require $c['core'];}catch(Throwable $error){if(!$c['reenter']){throw $error;}$reentered=true;}
 $value=KTK_Content_Update_Request::parse($c['raw'],$c['method'],$c['host'],$c['token'],$c['tokenSha256'],$c['expires'],$c['now'],$c['binding']);
 echo json_encode(array('ok'=>true,'value'=>$value,'reentered'=>$reentered),JSON_THROW_ON_ERROR);
}catch(Throwable $error){echo json_encode(array('ok'=>false,'errorClass'=>get_class($error),'message'=>$error->getMessage(),'reentered'=>$reentered),JSON_THROW_ON_ERROR);}
'''

def packet(action='inspect'):
 value={'schemaVersion':1,'action':action,**BINDING}
 for key in EXTRA[action]:value[key]='e'*64
 return value

def encode(value):return json.dumps(value,separators=(',',':'),ensure_ascii=False)

@unittest.skipUnless(PHP,'PHP required for canonical request gate fixtures')
class ContentUpdateRequestTests(unittest.TestCase):
 def run_case(self,raw=None,**changes):
  with tempfile.TemporaryDirectory(prefix='ktk-content-request-fixture-') as directory:
   root=Path(directory);driver=root/'driver.php';driver.write_bytes(DRIVER.encode());sentinel=root/'private-backup.keep';sentinel.write_bytes(b'Never mutate private/application bytes from a request parser')
   config={'core':CORE.as_posix(),'raw':encode(packet()) if raw is None else raw,'method':'POST','host':'krawlthroughkrakow.com','token':TOKEN,'tokenSha256':hashlib.sha256(TOKEN.encode()).hexdigest(),'expires':2000,'now':1000,'binding':BINDING,'defineAllowed':True,'allowedValue':True,'reenter':False};config.update(changes);path=root/'config.json';path.write_bytes(json.dumps(config).encode());before={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.iterdir()};process=subprocess.run([PHP,str(driver),str(path)],capture_output=True,text=True,check=True);self.assertEqual(process.stderr,'');result=json.loads(process.stdout);self.assertEqual({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.iterdir()},before);self.assertNotIn(TOKEN,json.dumps(result));return result
 def rejected(self,*args,**kwargs):result=self.run_case(*args,**kwargs);self.assertFalse(result['ok']);return result
 def test_each_named_action_accepts_only_its_canonical_bound_shape(self):
  for action in EXTRA:
   value=packet(action);result=self.run_case(encode(value));self.assertTrue(result['ok']);self.assertEqual(result['value'],value)
 def test_missing_false_and_reentered_include_flag_never_grants_a_request(self):
  for define,allowed,reenter in [(False,True,False),(True,False,False),(False,True,True),(True,False,True)]:self.rejected(defineAllowed=define,allowedValue=allowed,reenter=reenter)
 def test_only_post_and_the_exact_host_are_accepted(self):
  for method in ['GET','HEAD','PUT','post','POST\r\nGET']:self.rejected(method=method)
  for host in ['example.org','krawlthroughkrakow.com.example.org','krawlthroughkrakow.com:443','krawlthroughkrakow.com\n']:self.rejected(host=host)
  self.assertTrue(self.run_case(host='KRAWLTHROUGHKRAKOW.COM')['ok'])
 def test_wrong_malformed_or_missing_tokens_and_hashes_are_generic(self):
  for token in ['',TOKEN+'b','c'*43,'../'+TOKEN]:self.rejected(token=token)
  for digest in ['', '0'*64,'d'*63,'D'*64]:self.rejected(tokenSha256=digest)
 def test_expiry_and_maximum_packet_lifetime_are_enforced(self):
  for now,expires in [(1000,1000),(1001,1000),(0,2000),(1000,8201)]:self.rejected(now=now,expires=expires)
  self.assertTrue(self.run_case(now=1000,expires=8200)['ok'])
 def test_oversized_invalid_json_and_deep_shapes_are_rejected(self):
  for raw in ['x'*2049,'{', '[', 'null','[]','{}', '['*12+'0'+']'*12]:self.rejected(raw)
 def test_key_order_whitespace_duplicate_keys_and_alternate_numeric_forms_are_not_canonical(self):
  raw=encode(packet());samples=[json.dumps(packet()),raw+'\n',raw.replace('"schemaVersion":1','"schemaVersion":1.0'),raw.replace('"schemaVersion":1','"schemaVersion":true'),raw.replace('"schemaVersion":1','"schemaVersion":1,"schemaVersion":1'),encode(dict(reversed(list(packet().items()))))]
  for sample in samples:self.rejected(sample)
 def test_unknown_actions_paths_owner_approval_and_arbitrary_parameters_are_refused(self):
  for action in ['approve','delete','restore-database','purge','../apply','apply\n']:
   value=packet();value['action']=action;self.rejected(encode(value))
  for key,value in [('path','../wp-config.php'),('ownerApproved',True),('token',TOKEN),('limit',1000000),('production',True)]:
   value={**packet(),key:value};self.rejected(encode(value))
 def test_every_server_binding_field_and_shape_must_be_exact(self):
  for key in BINDING:
   value=packet();value[key]='f'*len(BINDING[key]);self.rejected(encode(value))
  for binding in [{},dict(reversed(list(BINDING.items()))),{**BINDING,'ownerApproved':True},{**BINDING,'transactionId':'../'+BINDING['transactionId']}]:self.rejected(binding=binding)
 def test_receipts_are_required_only_for_their_named_actions_and_must_be_hashes(self):
  for action in ['acknowledge','apply','rollback','close']:
   for key in EXTRA[action]:
    value=packet(action);del value[key];self.rejected(encode(value));value=packet(action);value[key]='not-a-hash';self.rejected(encode(value))
  self.rejected(encode({**packet('inspect'),'stateSha256':'e'*64}))
 def test_correctly_shaped_receipts_are_not_claimed_to_be_durably_verified_or_owner_approved(self):
  value=packet('apply');value['archiveSha256']='f'*64;result=self.run_case(encode(value));self.assertTrue(result['ok']);self.assertEqual(result['value'],value);self.assertNotIn('ownerApproved',result['value']);self.assertNotIn('backupVerified',result['value'])

if __name__=='__main__':unittest.main()
