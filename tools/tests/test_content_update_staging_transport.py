import contextlib,copy,json,unittest
from email.message import Message
from pathlib import Path
from unittest.mock import patch
from tools import content_update_backup as backup
from tools import content_update_staging_transport as transport
from tools.content_update_client import ContentUpdateClient
from tools.tests import test_content_update_staging_packet as packet_fixtures

ID='a'*32;APP='c'*40;HELPER='e'*64;TOKEN='t'*43;BINDING={'transactionId':ID,'applicationCommit':APP,'planSha256':'f'*64}
def request(action='inspect',**extra):return backup.encode({'schemaVersion':1,'action':action,**BINDING,**extra})
def envelope():return {'helperSha256':HELPER,'controller':{'mode':'private-staging-rehearsal',**BINDING}}

class Response:
 def __init__(self,request,body=None,status=200,headers=None,url=None):
  self.status=status;self.url=url or request.full_url;self.body=backup.encode(envelope()) if body is None else body;self.reads=[];self.closed=False;self.headers=Message()
  for key,value in headers or [('Content-Type','application/json; charset=UTF-8'),('CF-Cache-Status','DYNAMIC'),('Cache-Control','private, no-store, max-age=0')]:self.headers[key]=value
 def geturl(self):return self.url
 def read(self,count):self.reads.append(count);return self.body[:count]
 def __enter__(self):return self
 def __exit__(self,*args):self.closed=True
class Opener:
 def __init__(self,factory=None):self.factory=factory or (lambda req:Response(req));self.requests=[];self.responses=[]
 def open(self,request,timeout):
  self.requests.append((request,timeout));response=self.factory(request);self.responses.append(response);return response

class StagingControllerTransportTests(unittest.TestCase):
 def rpc(self,opener):return transport.StagingControllerTransport(BINDING,HELPER,TOKEN,2000,opener,lambda:1000)
 def test_exact_post_headers_nonce_binding_response_and_read_budget(self):
  opener=Opener();self.assertEqual(self.rpc(opener)(request()),envelope());req,timeout=opener.requests[0];self.assertTrue(req.full_url.startswith(transport.URL+'?ktk_private_controller='+ID+'&request='));self.assertEqual(req.get_method(),'POST');self.assertEqual(req.data,request());self.assertEqual(req.get_header('X-ktk-content-update-token'),TOKEN);self.assertEqual(timeout,180);self.assertEqual(opener.responses[0].reads,[transport.MAX_RESPONSE+1]);self.assertTrue(opener.responses[0].closed)
 def test_invalid_expired_noncanonical_or_client_path_request_never_opens_connection(self):
  for raw in [b'{}',b'x'*2049,b'{"action":"inspect","action":"apply"}',request(ownerApproved=True),request(path='../wp-config.php'),request().replace(b'"inspect"',b'"other"'),request().replace(APP.encode(),b'd'*40)]:
   opener=Opener()
   with self.assertRaises(transport.StagingTransportError):self.rpc(opener)(raw)
   self.assertEqual(opener.requests,[])
  opener=Opener();rpc=self.rpc(opener);rpc.clock=lambda:2000
  with self.assertRaises(transport.StagingTransportError):rpc(request())
  self.assertEqual(opener.requests,[])
 def test_redirect_status_final_url_cached_response_and_wrong_mime_are_rejected_once(self):
  variants=[{'status':302},{'url':'https://other.example/staging/'},{'headers':[('Content-Type','text/html'),('CF-Cache-Status','DYNAMIC'),('Cache-Control','no-store')]},{'headers':[('Content-Type','application/json'),('CF-Cache-Status','HIT'),('Cache-Control','no-store')]}]
  for values in variants:
   opener=Opener(lambda req:Response(req,**values))
   with self.assertRaises(transport.StagingTransportError):self.rpc(opener)(request())
   self.assertEqual(len(opener.requests),1);self.assertTrue(opener.responses[0].closed)
  with self.assertRaises(transport.StagingTransportError):transport.NoRedirect().redirect_request(None,None,302,'',{},'https://other.example/')
 def test_no_store_must_be_a_real_unquoted_directive_in_any_cache_control_header(self):
  for value in ['public, max-age=31536000','x-no-store=true','no-store=false','extension="a,no-store,b"','extension="a,no-store,b']:
   opener=Opener(lambda req:Response(req,headers=[('Content-Type','application/json'),('CF-Cache-Status','BYPASS'),('Cache-Control',value)]))
   with self.assertRaises(transport.StagingTransportError):self.rpc(opener)(request())
  opener=Opener(lambda req:Response(req,headers=[('Content-Type','application/json'),('CF-Cache-Status','BYPASS'),('Cache-Control','extension="a,no-store,b"'),('Cache-Control','private, NO-STORE')]))
  self.assertEqual(self.rpc(opener)(request()),envelope())
 def test_oversized_malformed_duplicate_or_foreign_source_body_is_never_returned(self):
  for body in [b'x'*(transport.MAX_RESPONSE+1),b'not-json',b'{"helperSha256":"e","helperSha256":"f"}',backup.encode({**envelope(),'helperSha256':'d'*64}),backup.encode({'helperSha256':HELPER,'controller':{**BINDING,'mode':'production'}})]:
   opener=Opener(lambda req:Response(req,body=body))
   with self.assertRaises(transport.StagingTransportError):self.rpc(opener)(request())
   self.assertEqual(len(opener.requests),1)
 def test_timeout_is_sanitized_and_has_no_automatic_mutation_retry(self):
  def fail(req):raise TimeoutError('Sensitive transport diagnostic '+TOKEN)
  opener=Opener(fail)
  with self.assertRaises(transport.StagingTransportError) as caught:self.rpc(opener)(request('apply',stateSha256='1'*64,archiveSha256='2'*64))
  self.assertNotIn(TOKEN,str(caught.exception));self.assertNotIn('Sensitive',str(caught.exception));self.assertEqual(len(opener.requests),1)
 def test_constructor_refuses_wrong_binding_expiry_key_and_token_without_network(self):
  for binding,helper,token,expiry in [({},HELPER,TOKEN,2000),(BINDING,'bad',TOKEN,2000),(BINDING,HELPER,'bad',2000),(BINDING,HELPER,TOKEN,999),(BINDING,HELPER,TOKEN,5000)]:
   opener=Opener()
   with self.assertRaises(ValueError):transport.StagingControllerTransport(binding,helper,token,expiry,opener,lambda:1000)
   self.assertEqual(opener.requests,[])

class PrivateFTP:
 def __init__(self,manifest,private):
  self.root='/.ktk-content-update-'+manifest['transactionId'];self.files={self.root+'/'+row['source']:(private/row['source']).read_bytes() for row in manifest['members'].values()};self.directories={self.root};self.calls=[];self.overrides={};self.during=None
  for file in self.files:
   parent=file.rsplit('/',1)[0]
   while parent.startswith(self.root):self.directories.add(parent);parent=parent.rsplit('/',1)[0]
 def sendcmd(self,command):
  self.calls.append(command);assert command.startswith('MLST ');path=command[5:]
  if path in self.files:facts={'type':'file','size':str(len(self.files[path])),'unique':backup.sha(path.encode())[:16]}
  elif path in self.directories:facts={'type':'dir','unique':backup.sha(path.encode())[:16]}
  else:raise OSError('Unknown private path')
  facts.update(self.overrides.get(path,{}));return '250-Listing\n '+''.join(key+'='+value+';' for key,value in facts.items())+' '+path+'\n250 End'
 def retrbinary(self,command,receive):
  self.calls.append(command);assert command.startswith('RETR ');path=command[5:];data=self.files[path]
  for index in range(0,len(data),31):receive(data[index:index+31])
  if self.during:self.during(path)

@unittest.skipUnless(packet_fixtures.fixtures.PHP,'PHP required for real private export reader fixtures')
class PrivateBackupReaderTests(unittest.TestCase):
 @contextlib.contextmanager
 def fixture(self):
  fixture=packet_fixtures.StagingControllerPacketTests()
  with fixture.fixture() as values:
   root,mu,private,config,source,binding,client,raw_request,calls,owned,expiry=values;client.prepare();exported=client.call('export');manifest=exported['export'];ftp=PrivateFTP(manifest,private);yield root,private,manifest,ftp,client
 def test_actual_signed_export_downloads_only_declared_members_and_builds_valid_zip(self):
  with self.fixture() as (root,private,manifest,ftp,client):
   reader=transport.PrivateBackupReader(ftp,ID,manifest);receipt=backup.build_archive(manifest,reader,client.key,root/'deploy-backups/scoped-reader.zip');self.assertTrue(receipt['fullOriginalAndPriorSetVerified']);self.assertEqual({c[5:] for c in ftp.calls if c.startswith('RETR ')},set(ftp.files));self.assertTrue(all(c.startswith(('MLST ','RETR ')) for c in ftp.calls));self.assertFalse(any('/public_html' in c for c in ftp.calls))
 def test_http_boundary_reader_client_and_compiled_hook_complete_one_combined_roundtrip(self):
  fixture=packet_fixtures.StagingControllerPacketTests()
  with fixture.fixture() as values:
   root,mu,private,config,source,binding,original,raw_request,calls,owned,expiry=values;context={}
   def respond(req):
    self.assertEqual(req.get_header('X-ktk-content-update-token'),config['token']);value=raw_request(req.data)
    if 'export' in value.get('body',{}).get('controller',{}):context['manifest']=value['body']['controller']['export']
    return Response(req,body=backup.encode(value.get('body',{})),status=value.get('status',409))
   rpc=transport.StagingControllerTransport(binding,backup.sha(source),config['token'],expiry,Opener(respond))
   def read(source):
    if 'reader' not in context:
     context['ftp']=PrivateFTP(context['manifest'],private);context['reader']=transport.PrivateBackupReader(context['ftp'],ID,context['manifest'])
    return context['reader'](source)
   client=ContentUpdateClient(binding,backup.sha(source),original.key,rpc,read);client.prepare();client.export_and_acknowledge(root/'deploy-backups/combined-transport.zip')
   for index in range(5):state=client.step('apply')
   self.assertEqual(state['engine']['phase'],'applied')
   for index in range(5):state=client.step('rollback')
   self.assertEqual(state['engine']['phase'],'rolled-back');self.assertTrue(client.close()['closed']);self.assertTrue(client.verified_archive()['allMemberChecksumsAndCRCVerified']);self.assertTrue(all(command.startswith(('MLST ','RETR ')) for command in context['ftp'].calls))
 def test_unknown_or_traversal_member_and_metadata_path_make_no_ftp_calls(self):
  with self.fixture() as (root,private,manifest,ftp,client):
   reader=transport.PrivateBackupReader(ftp,ID,manifest)
   for path in ['../wp-config.php','control/unknown.json','/public_html/wp-config.php']:
    with self.assertRaises(ValueError):reader(path)
   with self.assertRaises(ValueError):reader.metadata(reader.root+'/../public_html','dir')
   self.assertEqual(ftp.calls,[])
 def test_symlink_file_or_any_parent_is_refused_before_retrieval(self):
  for target in ('root','control','file'):
   with self.fixture() as (root,private,manifest,ftp,client):
    reader=transport.PrivateBackupReader(ftp,ID,manifest);source='control/original-state.json';path={'root':ftp.root,'control':ftp.root+'/control','file':ftp.root+'/'+source}[target];ftp.overrides[path]={'type':'OS.unix=slink'}
    with self.assertRaises(transport.StagingTransportError):reader(source)
    self.assertFalse(any(c.startswith('RETR ') for c in ftp.calls))
 def test_changed_size_is_refused_before_transfer_and_changed_bytes_are_not_returned(self):
  for mutation in ('size','bytes'):
   with self.fixture() as (root,private,manifest,ftp,client):
    reader=transport.PrivateBackupReader(ftp,ID,manifest);source='control/original-state.json';path=ftp.root+'/'+source
    if mutation=='size':ftp.files[path]+=b'extra'
    else:ftp.files[path]=b'Z'+ftp.files[path][1:]
    with self.assertRaises(transport.StagingTransportError):reader(source)
    self.assertEqual(sum(c.startswith('RETR ') for c in ftp.calls),0 if mutation=='size' else 1)
 def test_stream_over_budget_stops_and_does_not_retry(self):
  with self.fixture() as (root,private,manifest,ftp,client):
   reader=transport.PrivateBackupReader(ftp,ID,manifest);source='control/original-state.json';path=ftp.root+'/'+source;expected=len(ftp.files[path]);ftp.files[path]+=b'extra';ftp.overrides[path]={'size':str(expected)}
   with self.assertRaises(transport.StagingTransportError):reader(source)
   self.assertEqual(sum(c.startswith('RETR ') for c in ftp.calls),1)
 def test_file_or_directory_identity_change_during_transfer_is_detected(self):
  for target in ('file','directory'):
   with self.fixture() as (root,private,manifest,ftp,client):
    reader=transport.PrivateBackupReader(ftp,ID,manifest);source='control/original-state.json';ftp.during=lambda path:ftp.overrides.update({path if target=='file' else ftp.root+'/control':{'unique':'changed'}})
    with self.assertRaises(transport.StagingTransportError):reader(source)
 def test_foreign_transaction_or_production_manifest_is_refused_before_metadata(self):
  with self.fixture() as (root,private,manifest,ftp,client):
   with self.assertRaises(ValueError):transport.PrivateBackupReader(ftp,'d'*32,manifest)
   changed=copy.deepcopy(manifest);changed['mode']='production';changed['manifestSha256']=backup.sha(backup.encode({k:v for k,v in changed.items() if k!='manifestSha256'},sort=True))
   with self.assertRaises(ValueError):transport.PrivateBackupReader(ftp,ID,changed)
   self.assertEqual(ftp.calls,[])
 def test_metadata_parser_rejects_other_path_duplicate_facts_bad_status_or_budget(self):
  path='/.ktk-content-update-'+ID
  for response in ['250-Listing\n type=dir; /other\n250 End','250-Listing\n type=dir;type=file; '+path+'\n250 End','550 denied','250-'+('x'*8193)]:
   with self.assertRaises(ValueError):transport.mlst_facts(response,path)

if __name__=='__main__':unittest.main()
