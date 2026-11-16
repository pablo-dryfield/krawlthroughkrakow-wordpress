import copy,json,subprocess,tempfile,time,unittest,zipfile
from pathlib import Path
from unittest import mock
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools.tests import test_full_private_seed_rehearsal as protocol
from tools.tests import test_content_update_private_store as store

@unittest.skipUnless(store.PHP,'PHP required for original capsule/compiler fixtures')
class FullPrivateSeedPacketTests(unittest.TestCase):
 def setUp(self):
  self.fixture=protocol.FullPrivateSeedRehearsalTests();self.fixture.setUp();self.addCleanup(self.fixture.doCleanups);self.f=self.fixture;self.state=self.f.begin();self.plan=self.f.packet['plan'];self.manifest=self.state['capsule'];self.records={n:(self.f.private/row['source']).read_bytes() for n,row in self.manifest['members'].items()};self.key=self.f.packet['ownershipKey'];self.helper_sha=self.f.packet['helperSha256']
 def verify(self,records=None,m=None,value=None,key=None,helper=None):return full.validate_records(records or self.records,m or self.manifest,value or self.plan,key or self.key,helper or self.helper_sha)
 def resigned(self,name,payload):
  m=copy.deepcopy(self.manifest);raw=backup.encode(payload);meta={'name':name,'transactionId':self.plan['transactionId'],'rootBinding':m['rootBinding'],'bytes':len(raw),'sha256':backup.sha(raw)}
  import hmac,hashlib
  meta['mac']=hmac.new(self.key.encode(),backup.encode(meta),hashlib.sha256).hexdigest();blob=b'KTK-PRIVATE-1\n'+backup.encode(meta)+b'\n'+raw;records={**self.records,name:blob};m['members'][name].update(sha256=backup.sha(blob),bytes=len(blob),payloadSha256=backup.sha(raw));m['bytes']=sum(r['bytes'] for r in m['members'].values());m['manifestSha256']=backup.sha(backup.encode({k:v for k,v in m.items() if k!='manifestSha256'},sort=True));return records,m
 def archive(self,path,records=None,m=None,extra=False):
  with zipfile.ZipFile(path,'x',zipfile.ZIP_DEFLATED) as z:
   for n,b in (records or self.records).items():z.writestr(n,b)
   z.writestr('manifest.json',backup.encode(m or self.manifest))
   if extra:z.writestr('owner-note',b'keep')
 def test_independent_reader_verifies_both_signatures_complete_rows_plan_and_helper(self):
  s=self.verify();self.assertEqual(s,self.f.config['snapshot']);self.assertEqual(s['protectedStateSha256'],self.plan['protectedStateSha256'])
 def test_wrong_key_helper_record_hash_or_extra_record_is_refused(self):
  for kwargs in [{'key':'e'*64},{'helper':'e'*64},{'records':{**self.records,'original-state.json':self.records['original-state.json']+b'x'}},{'records':{**self.records,'owner-note':b'keep'}}]:
   with self.assertRaises(ValueError):self.verify(**kwargs)
 def test_resigned_missing_or_changed_selected_table_and_wrong_full_plan_are_refused(self):
  original=backup.decode(self.records['original-state.json'].split(b'\n',2)[2]);changed=copy.deepcopy(original);changed['database']['options'][0]['option_value']='1';records,m=self.resigned('original-state.json',changed)
  with self.assertRaises(ValueError):self.verify(records,m)
  control=backup.decode(self.records['controller-plan.json'].split(b'\n',2)[2]);control['enginePlan']['prior'].pop('ktk-code-pages-assets/runtime.css');records,m=self.resigned('controller-plan.json',control)
  with self.assertRaises(ValueError):self.verify(records,m)
 def test_manifest_unknown_fields_sources_missing_members_bool_counts_and_hash_drift_are_refused(self):
  cases=[]
  for name,value in [('bytes',True),('scope','production-original-capsule'),('rootBinding','wrong')]:m=copy.deepcopy(self.manifest);m[name]=value;cases.append(m)
  m=copy.deepcopy(self.manifest);m['extra']=True;cases.append(m);m=copy.deepcopy(self.manifest);m['members']['controller-plan.json']['source']='../../production';cases.append(m);m=copy.deepcopy(self.manifest);del m['members']['original-state.json'];cases.append(m)
  for m in cases:
   with self.assertRaises(ValueError):full.validate_manifest(m,self.plan)
 def test_archive_reopens_crc_members_signatures_and_complete_original_data(self):
  path=self.f.base/'capsule.zip';self.archive(path);r=full.verify_archive(path,self.plan,self.key,self.helper_sha,self.manifest);self.assertTrue(r['allSelectedStateAndPlanVerified']);self.assertTrue(r['zipCRC']);self.assertEqual(r['entries'],3);self.assertEqual(r['sha256'],backup.sha(path.read_bytes()));self.assertEqual(r['rowCounts'],self.f.config['snapshot']['rowCounts'])
 def test_archive_unknown_duplicate_truncated_and_oversized_member_are_refused_before_trusting_data(self):
  path=self.f.base/'extra.zip';self.archive(path,extra=True)
  with self.assertRaises(ValueError):full.verify_archive(path,self.plan,self.key,self.helper_sha)
  path=self.f.base/'truncated.zip';path.write_bytes(b'PK broken')
  with self.assertRaises((ValueError,zipfile.BadZipFile)):full.verify_archive(path,self.plan,self.key,self.helper_sha)
  path=self.f.base/'oversized.zip'
  with zipfile.ZipFile(path,'x',zipfile.ZIP_DEFLATED) as z:
   z.writestr('manifest.json',backup.encode(self.manifest));z.writestr('original-state.json',b'0'*16779265);z.writestr('controller-plan.json',self.records['controller-plan.json'])
  with mock.patch.object(zipfile.ZipFile,'testzip',side_effect=AssertionError('must reject declared oversized member before decompression scan')):
   with self.assertRaises(ValueError):full.verify_archive(path,self.plan,self.key,self.helper_sha)
 def test_compiler_embeds_exact_components_lints_and_is_staging_only(self):
  owned=self.plan['expected'];sizes=self.f.packet['sizes'];name='ktk-transaction-rehearsal-'+protocol.ID+'.php';now=int(time.time());source=full.helper_source(name,protocol.TOKEN,now+600,'c'*40,owned,sizes,self.plan['protectedStateSha256'],self.key,True);self.assertNotIn(b'__KTK_FULL_SEED_',source);self.assertIn(b'full-private-host',source);self.assertIn(b'full_private_seed_operation_failed',source);self.assertIn(b'HTTP_X_KTK_FULL_SEED_TOKEN',source);self.assertNotIn(b'KTK_CONTENT_UPDATE_PRODUCTION_AUTHORIZATION',source);path=self.f.base/'compiled.php';path.write_bytes(source);r=subprocess.run([store.PHP,'-l',str(path)],capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stdout+r.stderr)
 def test_compiler_rejects_production_names_unknown_metadata_bad_expiry_and_changed_capture_core(self):
  args=['ktk-transaction-rehearsal-'+protocol.ID+'.php',protocol.TOKEN,int(time.time())+600,'c'*40,self.plan['expected'],self.f.packet['sizes'],self.plan['protectedStateSha256'],self.key,False]
  for index,value in [(0,'ktk-production-transaction-update-'+protocol.ID+'.php'),(1,'bad'),(2,int(time.time())-1),(3,'main'),(7,'wrong'),(8,1)]:
   bad=args.copy();bad[index]=value
   with self.assertRaises(ValueError):full.helper_source(*bad)
  with mock.patch.object(full.capacity,'CORE_SHA','e'*64):
   with self.assertRaises(ValueError):full.helper_source(*args)
 def test_full_plan_copies_all_originals_and_only_six_small_synthetic_prior_overrides(self):
  plan,sizes,overrides=full.plan(protocol.ID,'c'*40,self.plan['expected'],self.f.packet['sizes'],self.plan['protectedStateSha256']);self.assertEqual(plan['expected'],self.plan['expected']);self.assertEqual(set(plan['prior']),set(plan['expected'])|{backup.ACTIVATION});self.assertEqual(len(overrides),6);self.assertEqual(plan['prior'][backup.ACTIVATION],backup.ACTIVATION_SHA);files,dirs=full.expected_seed_files(plan,sizes,overrides);self.assertEqual(len(files),len(plan['expected'])*2+1);self.assertIn('source',dirs);self.assertIn('target',dirs);self.assertNotIn('source/'+backup.ACTIVATION,files)
 def test_terminal_seed_digest_matches_actual_php_inventory(self):
  state=self.state
  for _ in range(5):
   if state['phase']=='ready-to-close':break
   state=self.f.advance(state)
  files,dirs=full.expected_seed_files(self.plan,self.f.packet['sizes'],self.f.packet['priorOverrides']);self.assertEqual(state['seed']['files'],files);self.assertEqual(state['seed']['directories'],dirs);self.assertEqual(full.seed_digest(self.manifest['rootBinding'],self.plan,files,dirs),state['seed']['stateSha256'])
 def test_archive_modified_after_record_verification_is_not_acknowledged(self):
  path=self.f.base/'changing.zip';self.archive(path);validate=full.validate_records
  def change(*a,**kw):
   result=validate(*a,**kw);data=path.read_bytes();path.write_bytes(data[:-1]+bytes([data[-1]^1]));return result
  with mock.patch.object(full,'validate_records',side_effect=change):
   with self.assertRaises(ValueError):full.verify_archive(path,self.plan,self.key,self.helper_sha)

if __name__=='__main__':unittest.main()
