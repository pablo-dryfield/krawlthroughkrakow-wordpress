import hashlib,hmac,io,json,unittest,urllib.error
from email.message import Message
from unittest import mock
from tools import content_update_backup as backup
from tools import full_private_engine_transport as wire
from tools.content_update_client import UncertainRequest
from tools.tests.test_full_private_seed_recovery import fixture

class Reply(io.BytesIO):
 def __init__(self,raw,url,headers=None,status=200):
  super().__init__(raw);self.url=url;self.status=status;self.headers=Message()
  defaults={'Content-Type':'application/json','Cache-Control':'private, no-store','CF-Cache-Status':'DYNAMIC','X-KTK-PHP-Version':'80336','X-KTK-Peak-Allocated':'100663296','X-KTK-Memory-Limit':'768M','X-KTK-Execution-Limit':'300'};defaults.update(headers or {})
  for k,v in defaults.items():self.headers[k]=v
 def geturl(self):return self.url
class Opener:
 def __init__(self,value,**changes):self.value=value;self.changes=changes;self.calls=[]
 def open(self,request,timeout):
  self.calls.append((request,timeout));c=self.changes
  if c.get('network'):raise TimeoutError('Sensitive diagnostics must stay private')
  if c.get('http'):raise urllib.error.HTTPError(request.full_url,c['http'],'Private diagnostic',Message(),None)
  return Reply(c.get('raw',backup.encode(self.value)),c.get('url',request.full_url),c.get('headers'),c.get('status',200))

class FullPrivateEngineTransportTests(unittest.TestCase):
 def setUp(self):self.plan=fixture()['plan'];self.reply={'privateProfile':'full-private-engine-v1','helperSha256':'e'*64,'controller':{'schemaVersion':1}};self.raw=backup.encode({'schemaVersion':1,'action':'inspect-preparation',**wire.full.binding(self.plan)})
 def client(self,opener,clock=lambda:1000):return wire.FullPrivateEngineTransport(self.plan,'e'*64,'T'*43,2000,opener,clock)
 def test_fixed_staging_post_profile_headers_nonce_and_runtime_are_exact(self):
  opener=Opener(self.reply);client=self.client(opener);self.assertEqual(client(self.raw),self.reply);request,timeout=opener.calls[0];self.assertEqual(timeout,180);self.assertTrue(request.full_url.startswith(wire.URL+'?ktk_full_private_engine='));self.assertNotIn('T'*43,request.full_url);self.assertEqual(request.method,'POST');self.assertEqual(json.loads(request.data),{'privateProfile':wire.PROFILE,'request':json.loads(self.raw),'originalArchive':None});self.assertEqual(client.last_runtime,{'phpVersionId':80336,'peakAllocatedBytes':100663296,'memoryLimit':'768M','maxExecutionTime':'300'});self.assertEqual(client.last_observation['status'],200);self.assertIsNone(client.last_failure)
 def test_all_uncertain_status_cache_redirect_mime_body_runtime_and_network_cases_stop_once(self):
  for changes in ({'status':409},{'headers':{'CF-Cache-Status':'HIT'}},{'headers':{'Cache-Control':'private, no-store-ish'}},{'url':'https://krawlthroughkrakow.com/'},{'headers':{'Content-Type':'text/html'}},{'raw':b''},{'raw':b'x'*(wire.MAX_RESPONSE+1)},{'headers':{'X-KTK-Peak-Allocated':'999999999999'}},{'headers':{'X-KTK-Memory-Limit':'T'*43}},{'network':True},{'http':524}):
   opener=Opener(self.reply,**changes);client=self.client(opener)
   with self.assertRaises(UncertainRequest) as error:client(self.raw)
   self.assertEqual(len(opener.calls),1);self.assertIsNotNone(client.last_request_seconds);self.assertIsNotNone(client.last_failure);self.assertNotIn('Sensitive diagnostics',str(error.exception));self.assertNotIn('T'*43,repr(client.last_failure))
 def test_explicit_http_failure_status_is_retained_and_request_context_resets(self):
  opener=Opener(self.reply,http=524);client=self.client(opener)
  with self.assertRaises(UncertainRequest):client(self.raw)
  self.assertEqual(client.last_failure['status'],524);opener.changes={};self.assertEqual(client(self.raw),self.reply);self.assertIsNone(client.last_failure);self.assertEqual(client.last_observation['status'],200)
  with self.assertRaises(ValueError):client(self.raw+b' ')
  self.assertIsNone(client.last_failure);self.assertIsNone(client.last_observation)
 def test_invalid_or_expired_request_stops_before_opening_any_url(self):
  opener=Opener(self.reply);client=self.client(opener)
  for raw in (self.raw+b' ',backup.encode({**json.loads(self.raw),'action':'production'}),backup.encode({**json.loads(self.raw),'transactionId':'f'*32})):
   with self.assertRaises(ValueError):client(raw)
  expired=self.client(opener,lambda:1000);expired.clock=lambda:2000
  with self.assertRaises(ValueError):expired(self.raw)
  self.assertEqual(opener.calls,[])
 def test_original_archive_is_reopened_before_each_copy_request_and_only_attached_there(self):
  opener=Opener(self.reply);client=self.client(opener);manifest={'manifestSha256':'a'*64};receipt={'scope':'independently-verified-original-capsule','manifestSha256':'a'*64,'sha256':'b'*64,'allSelectedStateAndPlanVerified':True,'zipCRC':True}
  with mock.patch.object(wire.full,'validate_manifest'),mock.patch.object(wire.full,'verify_archive',return_value=receipt) as verify:
   client.acknowledge_original('owned-original.zip','d'*64,manifest);raw=backup.encode({'schemaVersion':1,'action':'recover-preparation',**client.binding,'stateSha256':'c'*64});client(raw);self.assertEqual(verify.call_count,2);self.assertEqual(json.loads(opener.calls[-1][0].data)['originalArchive'],{'originalManifestSha256':'a'*64,'originalArchiveSha256':'b'*64})
   client(self.raw);self.assertIsNone(json.loads(opener.calls[-1][0].data)['originalArchive']);verify.return_value={**receipt,'sha256':'f'*64};count=len(opener.calls)
   with self.assertRaises(ValueError):client(raw)
   self.assertEqual(len(opener.calls),count)
 def test_terminal_server_roots_must_match_the_independently_archived_ownership_mac(self):
  public='/home/fixture/public_html';private='/home/fixture/.ktk-content-update-'+self.plan['transactionId'];key='d'*64;owner=hmac.new(key.encode(),backup.encode({'publicRoot':public,'transactionId':self.plan['transactionId'],'privateRoot':private}),hashlib.sha256).hexdigest();roots={'publicRoot':public,'privateRoot':private,'rootBinding':owner};reply={'privateProfile':wire.PROFILE,'helperSha256':'e'*64,'privateRoots':roots};opener=Opener(reply);client=self.client(opener);self.assertEqual(client.private_roots(key,owner),roots);self.assertEqual(json.loads(opener.calls[0][0].data)['request']['action'],'private-roots');self.assertNotIn(public,repr(client.last_runtime));self.assertIsNone(client.last_failure)
  for changed in ({**roots,'publicRoot':public+'/../public_html'},{**roots,'publicRoot':public+'\n'},{**roots,'privateRoot':'/other/private'},{**roots,'rootBinding':'f'*64}):
   opener=Opener({**reply,'privateRoots':changed})
   with self.assertRaises(ValueError):self.client(opener).private_roots(key,owner)
   self.assertEqual(len(opener.calls),1)
  with self.assertRaises(ValueError):client.private_roots('bad',owner)

if __name__=='__main__':unittest.main()
