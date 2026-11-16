import copy,importlib.util,io,json,os,subprocess,tempfile,time,unittest,urllib.error
from email.message import Message
from pathlib import Path
from unittest import mock
from tools import private_seed_disposal as d
from tools import content_update_backup as backup
from tools import content_update_recovery as crypto
from tools import full_private_seed_recovery as old_recovery
from tools.tests import test_private_seed_disposal as protocol
from tools.tests import test_full_private_seed_transport as wire

def packet():
 return {'schemaVersion':1,'scope':'witnessed-private-seed-disposal','disposalId':'7'*32,'transactionId':'d'*32,'applicationCommit':'c'*40,'toolingCommit':'c'*40,'sourceHashes':{'tools/private_seed_disposal.py':'f'*64},'expires':int(time.time())+600,'token':'T'*43,'helperSha256':'e'*64,'freshProtectedStateSha256':'f'*64,'witnessArchiveSha256':'9'*64,'witnessArchiveName':'staging-protected-state-20261116-110000-000000.zip','originalArchiveSha256':'a'*64}

class DisposalValidationTests(unittest.TestCase):
 def test_strict_separate_profile_validates_offline_and_refuses_production_paths_and_old_profiles(self):
  v=packet()
  with mock.patch.object(crypto,'_dpapi',side_effect=AssertionError('offline validation')):self.assertEqual(d.validate_packet(v),v)
  for changed in [{**v,'scope':'production'},{**v,'production':True},{**v,'witnessArchiveName':'../original.zip'},{**v,'expires':int(time.time())+5000},{**v,'sourceHashes':{'tools/../outside':'f'*64}}]:
   with self.assertRaises(ValueError):d.validate_packet(changed,time.time())
 def test_foreign_magic_wrong_identity_and_checksum_refuse_before_decryption(self):
  for b in [b'KTK-DPAPI-FULL-SEEDS-1\n'+b'7'*32+b'\n'+b'f'*64+b'\nopaque',d.MAGIC+b'8'*32+b'\n'+b'f'*64+b'\nopaque',d.MAGIC+b'7'*32+b'\n'+b'f'*64+b'\nopaque']:
   with mock.patch.object(crypto,'_dpapi',side_effect=AssertionError('must not decrypt')):
    with self.assertRaises(ValueError):d.unseal(b,'7'*32)
 def test_encrypt_failure_creates_no_plaintext_fallback_or_packet_directory(self):
  with tempfile.TemporaryDirectory() as folder:
   with mock.patch.object(crypto,'_dpapi',side_effect=RuntimeError('Unavailable')):
    with self.assertRaises(RuntimeError):d.DisposalVault(Path(folder).resolve()).save(packet())
   self.assertEqual(list(Path(folder).iterdir()),[])

@unittest.skipUnless(os.name=='nt','Native current-user Windows DPAPI')
class DisposalNativeTests(unittest.TestCase):
 def test_native_encrypted_durable_readback_contains_no_plaintext_and_cannot_overwrite(self):
  with tempfile.TemporaryDirectory() as folder:
   v=packet();vault=d.DisposalVault(Path(folder).resolve());receipt=vault.save(v);self.assertTrue(receipt['durableDecryptReadbackVerified']);self.assertEqual(vault.load(v['disposalId']),v);raw=vault.path(v['disposalId']).read_bytes();self.assertNotIn(v['token'].encode(),raw);self.assertNotIn(b'freshProtectedStateSha256',raw)
   with self.assertRaises(ValueError):vault.save(v)
   self.assertEqual(vault.path(v['disposalId']).read_bytes(),raw)
 def test_tampered_cipher_wrong_identity_and_legacy_profile_are_refused(self):
  v=packet();blob=d.seal(v);p=blob.split(b'\n',3);cipher=p[3][:-1]+bytes([p[3][-1]^1]);changed=d.MAGIC+p[1]+b'\n'+backup.sha(cipher).encode()+b'\n'+cipher
  for value,identifier in [(changed,v['disposalId']),(blob,'8'*32)]:
   with self.assertRaises(ValueError):d.unseal(value,identifier)
  with self.assertRaises(ValueError):old_recovery.unseal(blob,v['disposalId'])
 def test_expired_packet_is_inspectable_but_not_initially_saved_or_reactivated(self):
  v=packet();v['expires']=1;self.assertEqual(d.unseal(d.seal(v),v['disposalId']),v)
  with tempfile.TemporaryDirectory() as folder:
   with self.assertRaises(ValueError):d.DisposalVault(Path(folder).resolve()).save(v)
   self.assertEqual(list(Path(folder).iterdir()),[])

class Response(io.BytesIO):
 def __init__(self,raw,url,headers=None,status=200):
  super().__init__(raw);self.url=url;self.status=status;self.headers=Message()
  for k,v in {'CF-Cache-Status':'DYNAMIC','Cache-Control':'private, no-store','Content-Type':'application/json',**(headers or {})}.items():self.headers[k]=v
 def geturl(self):return self.url

class Opener:
 def __init__(self,envelope,**changes):self.envelope=envelope;self.changes=changes;self.calls=[]
 def open(self,request,timeout):
  self.calls.append((request,timeout))
  if self.changes.get('error'):raise OSError('lost reply')
  if self.changes.get('http'):raise urllib.error.HTTPError(request.full_url,409,'refused',Message(),io.BytesIO(b'no details'))
  return Response(self.changes.get('raw',backup.encode(self.envelope)),self.changes.get('url',request.full_url),self.changes.get('headers'),self.changes.get('status',200))

@unittest.skipUnless(protocol.full.store.PHP,'Real PHP needed for signed disposal fixtures')
class DisposalSupportTests(unittest.TestCase):
 def setUp(self):
  self.case=protocol.PrivateSeedDisposalTests('runTest');self.case.setUp();self.addCleanup(self.case.doCleanups);c=self.case;f=c.fixture;p=f.packet;self.old={'transactionId':protocol.full.ID,'applicationCommit':'c'*40,'ownershipKey':p['ownershipKey'],'helperSha256':c.old_helper,'plan':p['plan'],'publicOwned':p['plan']['expected'],'publicSizes':p['sizes']};self.v=packet();self.v.update(helperSha256=c.config['packet']['helperSha256'],freshProtectedStateSha256=c.config['packet']['freshProtectedStateSha256'],expires=2000);self.manifest=c.manifest;self.envelope={'helperSha256':self.v['helperSha256'],'controller':c.call(),'runtime':{'phpVersionId':80336,'peakAllocatedBytes':8388608,'memoryLimit':'768M','maxExecutionTime':'300'}}
 def client(self,opener):return d.DisposalTransport(self.v,self.old,self.manifest,self.case.fixture.mu,opener,lambda:1000)
 def archive(self):
  f=self.case.fixture;directory=f.base/'deploy-backups';directory.mkdir();p=directory/'original.zip'
  with mock.patch.object(d.full,'ROOT',f.base):receipt=d.full.build_archive(self.manifest,lambda name:(f.private/name).read_bytes(),self.old['plan'],self.old['ownershipKey'],self.old['helperSha256'],p)
  self.v['originalArchiveSha256']=receipt['sha256'];return p
 def test_compiler_embeds_exact_unchanged_core_and_has_no_copy_or_engine_route(self):
  v={**self.v,'expires':int(time.time())+600};source=d.helper_source(v,self.old,self.manifest);r=subprocess.run([protocol.full.store.PHP,'-l'],input=source,capture_output=True);self.assertEqual(r.returncode,0,r.stderr);self.assertNotIn(b'__KTK_DISPOSAL_',source);self.assertIn((d.ROOT/'tools/staging-protected-state-core.php').read_bytes()[6:],source);self.assertNotIn(b'new KTK_Active_Content_Transaction',source);self.assertLess(source.index(b'HTTP_X_KTK_DISPOSAL_TOKEN'),source.index(b'KTK_Private_Seed_Disposal'))
 def test_exact_authenticated_metadata_transport_passes_with_no_token_in_url(self):
  opener=Opener(self.envelope);result=self.client(opener).request('inspect');self.assertEqual(result,self.envelope);self.assertEqual(len(opener.calls),1);request,timeout=opener.calls[0];self.assertEqual(timeout,180);self.assertNotIn(self.v['token'],request.full_url);self.assertEqual({k.lower():v for k,v in request.headers.items()}['x-ktk-disposal-token'],self.v['token'])
 def test_uncertain_status_cache_redirect_malformed_oversize_and_network_never_retry(self):
  for changes in [{'status':409},{'url':'https://krawlthroughkrakow.com/'},{'headers':{'CF-Cache-Status':'HIT'}},{'headers':{'Cache-Control':'private, no-store-ish'}},{'headers':{'Content-Type':'text/html'}},{'raw':b'x'*2097153},{'raw':b'{}'},{'error':True},{'http':True}]:
   with self.subTest(changes=list(changes)):
    opener=Opener(self.envelope,**changes);client=self.client(opener)
    with self.assertRaises(RuntimeError):client.request('inspect')
    self.assertEqual(len(opener.calls),1);self.assertIsNotNone(client.last_failure)
 def test_unexpected_raw_state_runtime_keys_seed_bytes_and_scope_are_refused(self):
  for field in ['scope','seed','runtime']:
   e=copy.deepcopy(self.envelope)
   if field=='scope':e['controller']['scope']='production'
   elif field=='seed':next(iter(e['controller']['seed']['files'].values()))['sha256']='f'*64
   else:e['runtime']['database']={'raw':'never accepted'}
   opener=Opener(e)
   with self.assertRaises(RuntimeError):self.client(opener).request('inspect')
   self.assertEqual(len(opener.calls),1)
 def test_fresh_witness_archive_reopens_full_rows_and_rejects_modified_or_wrong_current_state(self):
  f=self.case.fixture;s=self.case.config['snapshot'];receipt=d.full.snapshot.write_private_backup(f.base,s,s,s['helperSha256']);path=Path(receipt['path']);self.assertEqual(d.witness(path,receipt['sha256'],s['protectedStateSha256'],self.old['publicOwned']),s)
  with self.assertRaises(ValueError):d.witness(path,receipt['sha256'],'f'*64,self.old['publicOwned'])
  path.write_bytes(path.read_bytes()+b'changed')
  with self.assertRaises(ValueError):d.witness(path,receipt['sha256'],s['protectedStateSha256'],self.old['publicOwned'])
 def test_fresh_ftps_retained_audit_reopens_original_archive_and_verifies_exact_new_signed_closure(self):
  path=self.archive();self.case.config['packet']['originalArchiveSha256']=self.v['originalArchiveSha256'];s=self.case.abandon();s=self.case.call('cleanup',stateSha256=s['stateSha256'],abandonedSeedStateSha256=self.case.abandoned);ftp=wire.RetainedFTPS(self.case.fixture.private,protocol.full.ID);result=d.verify_retained_metadata(ftp,path,self.v,self.old,self.manifest,self.case.abandoned);self.assertTrue(result['payloadTreesAbsent']);self.assertEqual(result['exactRetainedMetadataFiles'],5);self.assertFalse(result['fullPrivateCopyVerified']);self.assertTrue(all(c.startswith(('MLST ','MLSD ','RETR ')) for c in ftp.calls))
  for faults in [{'unknown':True},{'changed':True},{'link':True}]:
   with self.assertRaises(ValueError):d.verify_retained_metadata(wire.RetainedFTPS(self.case.fixture.private,protocol.full.ID,**faults),path,self.v,self.old,self.manifest,self.case.abandoned)

class DisposalRunnerTests(unittest.TestCase):
 def load(self):
  spec=importlib.util.spec_from_file_location('ktk_private_disposal_runner_tests',d.ROOT/'tools/dispose-staging-full-seeds.py');runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner);return runner
 def test_default_runner_writes_only_offline_report_without_vault_connection_or_compiler(self):
  runner=self.load()
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder).resolve();report=root/'docs/seo/offline.json';args=['--transaction','d'*32,'--application-commit','c'*40,'--tooling-commit','c'*40,'--report',str(report)]
   with mock.patch.object(runner,'ROOT',root),mock.patch.object(runner.full_runner,'reviewed_source',return_value=({'ktk-code-pages.php':'e'*64},{'ktk-code-pages.php':7},{})),mock.patch.object(runner,'fingerprints',return_value={'tools/private_seed_disposal.py':'e'*64}),mock.patch.object(runner.original_recovery.FullSeedPacketVault,'load',side_effect=AssertionError('no vault')),mock.patch.object(runner.shared.snapshot,'load_common',side_effect=AssertionError('no connection')),mock.patch.object(d,'helper_source',side_effect=AssertionError('no compiler')):runner.main(args)
   result=json.loads(report.read_bytes());self.assertEqual(result['phase'],'offline-validated');self.assertFalse(result['fullPrivateCopyVerified']);self.assertFalse(result['fullHostTransactionAcceptance'])
 def test_invalid_transaction_and_unscoped_resume_digest_refuse_before_source_or_vault(self):
  runner=self.load();base=['--transaction','d'*32,'--application-commit','c'*40,'--tooling-commit','c'*40,'--report','unused.json']
  with mock.patch.object(runner.full_runner,'reviewed_source',side_effect=AssertionError('no source yet')):
   for extra in [['--abandoned-state','f'*64],['--resume-disposal','../outside']]:
    with self.assertRaises(ValueError):runner.main(base+extra)

if __name__=='__main__':unittest.main()
