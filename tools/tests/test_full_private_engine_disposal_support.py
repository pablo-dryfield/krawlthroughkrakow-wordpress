import copy,json,os,tempfile,time,unittest
from email.message import Message
from pathlib import Path,PurePosixPath
from unittest import mock
from tools import content_update_backup as backup
from tools import content_update_recovery as crypto
from tools import full_private_seed_packet as full
from tools import full_private_engine_disposal as disposal
from tools import full_private_engine_disposal_recovery as recovery
from tools.full_private_engine_disposal_transport import FullEngineDisposalTransport
from tools.content_update_client import UncertainRequest
from tools.tests.test_full_private_seed_recovery import fixture as old_fixture

def fixture():
 old=old_fixture();plan=old['plan'];_,_,overrides=full.plan(old['transactionId'],old['applicationCommit'],old['publicOwned'],old['publicSizes'],plan['protectedStateSha256']);payload,_=full.expected_seed_files(plan,old['publicSizes'],overrides);root='/home/fixture/public_html';_,names=disposal.metadata_names(old['transactionId'],root)
 for n,h in plan['prior'].items():
  if h!=plan['expected'].get(n):payload['engine/'+old['transactionId']+'/prior/'+n]={'sha256':h,'bytes':len(__import__('base64').b64decode(overrides[n]))}
 payload.update({'control/original-state.json':{'sha256':'d'*64,'bytes':100},'control/controller-plan.json':{'sha256':'e'*64,'bytes':100}});retained={n:{'sha256':'f'*64,'bytes':64} for n in names};retained[names[-1]]={'sha256':backup.sha(b''),'bytes':0};a={'schemaVersion':1,'scope':disposal.SCOPE,'transactionId':old['transactionId'],'applicationCommit':old['applicationCommit'],'plan':plan,'originalManifestSha256':'a'*64,'originalArchiveSha256':'b'*64,'rollbackManifestSha256':'c'*64,'rollbackArchiveSha256':'d'*64,'payload':dict(sorted(payload.items())),'retained':dict(sorted(retained.items()))};a['authoritySha256']=backup.sha(backup.encode(a,sort=True))
 return {'schemaVersion':1,'scope':recovery.SCOPE,'disposalId':'e'*32,'transactionId':old['transactionId'],'toolingCommit':old['toolingCommit'],'sourceHashes':{'tools/full_private_engine_disposal.py':'a'*64},'expires':int(time.time())+300,'token':old['token'],'ownershipKey':old['ownershipKey'],'helperSha256':'b'*64,'publicRoot':root,'authority':a,'originalArchiveName':'staging-full-engine-original-'+old['transactionId']+'.zip','rollbackArchiveName':'staging-full-engine-rollback-'+old['transactionId']+'.zip','originalHelperSha256':old['helperSha256']}

def state(packet):
 a=packet['authority'];binding={k:a[k] for k in ('transactionId','applicationCommit','authoritySha256')};present=dict(sorted({**a['payload'],**a['retained']}.items()));dirs=set()
 for n in present:dirs.update(p.as_posix() for p in PurePosixPath(n).parents if p.as_posix()!='.')
 dirs=sorted(dirs);proof={'binding':binding,'present':present,'directories':dirs}
 return {'schemaVersion':1,'scope':'full-private-engine-disposal',**binding,'stateSha256':backup.sha(backup.encode(proof,sort=True)),'phase':'disposing','payloadFiles':len(a['payload']),'payloadBytes':sum(r['bytes'] for r in a['payload'].values()),'present':present,'directories':dirs,'operation':None,'applicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionOperations':0}

class DisposalAuthorityTests(unittest.TestCase):
 def test_deterministic_full_authority_and_encrypted_context_validate_offline(self):
  v=fixture();self.assertEqual(recovery.validate_packet(v,time.time()),v);self.assertEqual(disposal.validate_state(state(v),v['authority']),state(v))
 def test_recomputed_authority_cannot_expand_private_scope_or_alter_a_seed(self):
  for action in ('unknown','seed','lock'):
   v=fixture();a=v['authority']
   if action=='unknown':a['payload']['outside/application.php']={'sha256':'a'*64,'bytes':1}
   elif action=='seed':a['payload']['source/ktk-code-pages.php']['sha256']='f'*64
   else:next(iter(a['retained'].values()))['bytes']=-1
   a['authoritySha256']=backup.sha(backup.encode({k:x for k,x in a.items() if k!='authoritySha256'},sort=True))
   with self.assertRaises(ValueError):recovery.validate_packet(v)
 def test_unknown_state_directory_counts_flags_and_fence_refuse(self):
  p=fixture();s=state(p)
  for changes in ({'phase':'disposed'},{'payloadFiles':0},{'payloadBytes':0},{'stateSha256':'f'*64},{'applicationWrites':1},{'directories':['unknown']},{'operation':{'payloadFilesDeleted':257,'payloadDirectoriesRemoved':0}}):
   with self.assertRaises(ValueError):disposal.validate_state({**s,**changes},p['authority'])
 def test_helper_compilation_is_early_private_and_lifetime_bounded(self):
  p=fixture();s=disposal.helper_source(p['authority'],p['publicRoot'],p['ownershipKey'],p['token'],p['expires']);self.assertIn(b"add_action('muplugins_loaded',",s);self.assertNotIn(b'__KTK_FULL_DISPOSAL_',s);self.assertIn(b'HTTP_X_KTK_FULL_DISPOSAL_TOKEN',s)
  with self.assertRaises(ValueError):disposal.helper_source(p['authority'],p['publicRoot'],p['ownershipKey'],p['token'],int(time.time())+3601)
 def test_foreign_ciphertext_profile_is_refused_before_decryption(self):
  with mock.patch.object(crypto,'_dpapi',side_effect=AssertionError('No foreign ciphertext decryption')):
   with self.assertRaises(ValueError):recovery.unseal(crypto.MAGIC+b'e'*32+b'\n'+b'f'*64+b'\nopaque','e'*32)
 def test_crypto_failure_cannot_create_plaintext_or_overwrite(self):
  with tempfile.TemporaryDirectory(prefix='ktk-full-disposal-crypto-') as d:
   with mock.patch.object(crypto,'_dpapi',side_effect=RuntimeError('Synthetic unavailable encryption')):
    with self.assertRaises(RuntimeError):recovery.FullEngineDisposalVault(Path(d).resolve()).save(fixture())
   self.assertEqual(list(Path(d).iterdir()),[])

class Response:
 def __init__(self,request,p):
  self.status=200;self.url=request.full_url;self.headers=Message()
  for k,v in [('Content-Type','application/json'),('Cache-Control','private, no-store'),('CF-Cache-Status','DYNAMIC')]:self.headers[k]=v
  self.body=backup.encode({'privateProfile':disposal.PROFILE,'helperSha256':p['helperSha256'],'controller':state(p),'runtime':{'phpVersionId':80400,'peakAllocatedBytes':20000000,'memoryLimit':'256M','maxExecutionTime':'120'}})
 def __enter__(self):return self
 def __exit__(self,*args):pass
 def geturl(self):return self.url
 def read(self,n):return self.body[:n]
class Opener:
 def __init__(self,p,change=None):self.p=p;self.change=change;self.calls=[]
 def open(self,request,timeout):
  self.calls.append((request,timeout));r=Response(request,self.p)
  if self.change:self.change(r)
  return r

class DisposalTransportTests(unittest.TestCase):
 def test_fixed_staging_profile_inventory_and_independent_archive_fence(self):
  p=fixture();opener=Opener(p);verifier=mock.Mock(return_value=True);t=FullEngineDisposalTransport(p,verifier,opener);s=t.request('inspect');self.assertEqual(s,state(p));self.assertEqual(verifier.call_count,1);self.assertEqual(opener.calls[0][1],180);self.assertTrue(opener.calls[0][0].full_url.startswith('https://krawlthroughkrakow.com/staging/?ktk_full_private_disposal='))
 def test_archive_refusal_and_expiry_happen_before_http(self):
  p=fixture();opener=Opener(p);t=FullEngineDisposalTransport(p,lambda:False,opener)
  with self.assertRaises(ValueError):t.request('cleanup',stateSha256='a'*64)
  self.assertFalse(opener.calls);t=FullEngineDisposalTransport(p,lambda:True,opener);t.clock=lambda:p['expires']
  with self.assertRaises(ValueError):t.request('inspect')
  self.assertFalse(opener.calls)
 def test_changed_response_or_redirect_stops_after_exactly_one_request(self):
  for change in (lambda r:setattr(r,'url','https://example.invalid/'),lambda r:setattr(r,'body',r.body.replace(disposal.PROFILE.encode(),b'foreign-profile')),lambda r:r.headers.replace_header('CF-Cache-Status','HIT')):
   p=fixture();opener=Opener(p,change);t=FullEngineDisposalTransport(p,lambda:True,opener)
   with self.assertRaises(UncertainRequest):t.request('inspect')
   self.assertEqual(len(opener.calls),1);self.assertIsNotNone(t.last_failure)

@unittest.skipUnless(os.name=='nt','Native current-user full engine disposal DPAPI contract')
class FullEngineDisposalNativeTests(unittest.TestCase):
 def test_distinct_ciphertext_roundtrip_expired_inspection_and_foreign_identity(self):
  p=fixture();blob=recovery.seal(p);self.assertNotIn(p['token'].encode(),blob);self.assertNotIn(p['ownershipKey'].encode(),blob);self.assertEqual(recovery.unseal(blob,p['disposalId']),p)
  p['expires']=1;self.assertEqual(recovery.unseal(recovery.seal(p),p['disposalId']),p)
  with self.assertRaises(ValueError):recovery.unseal(blob,'f'*32)
 def test_durable_readback_and_overwrite_refusal(self):
  with tempfile.TemporaryDirectory(prefix='ktk-full-disposal-native-') as d:
   p=fixture();vault=recovery.FullEngineDisposalVault(Path(d).resolve());r=vault.save(p);self.assertTrue(r['durableDecryptReadbackVerified']);self.assertEqual(vault.load(p['disposalId']),p)
   with self.assertRaises(ValueError):vault.save(p)

if __name__=='__main__':unittest.main()
