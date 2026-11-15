import contextlib,gzip,hashlib,importlib.util,io,json,re,tempfile,types,unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
from unittest.mock import patch
from tools.tests.test_staging_svg_probe import FakeFTP,Opener,Response,TOKEN

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('svg_variants_test',ROOT/'tools/probe-staging-svg-variants.py');probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)

class VariantResponse(Response):
 def read(self,*args):return self.body

class StagingSvgVariantTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.files=probe.payload(TOKEN)
 def response(self,body,coding='identity',status=200):
  url=probe.cap.ORIGIN+'ktk-svg-encoding-probe-'+TOKEN+'/regular.svg'
  return VariantResponse(url,body,headers={'X-KTK-Encoding-Probe':TOKEN,'X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store, max-age=0','Content-Type':'image/svg+xml; charset=utf-8','Vary':'Accept-Encoding','Content-Encoding':coding},status=status)
 def inspect(self,response,index):
  accept,allowed=probe.CASES[index];return probe.inspect_variant(response.url,TOKEN,'regular',accept,allowed,self.files,Opener(response))
 def test_nine_fixed_members_keep_both_originals_exact_with_true_round_trips(self):
  self.assertEqual(set(self.files),probe.FILES);self.assertEqual(len(self.files),9)
  for stem,(name,digest) in probe.ORIGINALS.items():
   raw=(ROOT/'staging/wp-content/mu-plugins/ktk-homepage-assets'/name).read_bytes();self.assertEqual(hashlib.sha256(raw).hexdigest(),digest);self.assertEqual(self.files[stem+'.identity'],raw);self.assertEqual(probe.node_codec('decompress',self.files[stem+'.br']),raw);self.assertEqual(gzip.decompress(self.files[stem+'.gz']),raw);self.assertNotEqual(self.files[stem+'.svg'],raw);self.assertNotIn(stem+'.var',self.files)
  self.assertNotIn(b'type-map',self.files['.htaccess']);self.assertIn(b'ExpiresActive Off',self.files['.htaccess']);self.assertNotIn(b'rewrite-test',self.files['.htaccess'])
  self.assertTrue(self.files['.htaccess'].startswith(b'<FilesMatch "^(regular|seasonal)[.](svg|identity|br|gz)$">'))
  with patch.object(probe.cap,'payload',return_value={'.htaccess':b'changed policy'}):
   with self.assertRaises(RuntimeError):probe.payload(TOKEN)
 def test_only_nine_declared_paths_upload_and_complete_cleanup_preserves_parent(self):
  ftp=FakeFTP();run=probe.VariantProbe(ftp,TOKEN);run.create()
  for name in sorted(probe.FILES-{'.htaccess'})+['.htaccess']:run.upload(name,self.files[name])
  before=list(ftp.writes)
  for name in ['../.htaccess','wp-config.php','other.svg','regular.br/upload']:
   with self.assertRaises(ValueError):run.upload(name,b'x')
  self.assertEqual(ftp.writes,before);self.assertTrue(run.cleanup());self.assertEqual(ftp.files,{probe.cap.CONFIG:b'parent unchanged'});self.assertTrue(all(path==run.directory or path.startswith(run.directory+'/') for _,path in ftp.writes))
 def test_original_source_change_refuses_before_codec_or_ftp(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);assets=root/'staging/wp-content/mu-plugins/ktk-homepage-assets';assets.mkdir(parents=True);(assets/'hero-statue-regular.svg').write_bytes(b'changed')
   with patch.object(probe,'ROOT',root),patch.object(probe,'encoded',side_effect=AssertionError('No compression before identity guard')):
    with self.assertRaises(RuntimeError):probe.payload(TOKEN)
 def test_identity_brotli_and_gzip_are_exact_and_brotli_is_the_prebuilt_sidecar(self):
  for coding,index,suffix in [('br',0,'.br'),('gzip',1,'.gz'),('identity',2,'.identity')]:
   result=self.inspect(self.response(self.files['regular'+suffix],coding),index);self.assertTrue(result['passed']);self.assertTrue(result['decodedOriginalExact'])
 def test_quality_zero_never_accepts_an_excluded_coding_even_when_original_bytes_decode(self):
  for coding,index,suffix in [('br',3,'.br'),('gzip',4,'.gz'),('br',5,'.br'),('gzip',6,'.gz')]:
   result=self.inspect(self.response(self.files['regular'+suffix],coding),index);self.assertFalse(result['passed']);self.assertTrue(result['decodedOriginalExact'])
 def test_all_encodings_excluded_requires_406_not_a_successful_original(self):
  self.assertTrue(self.inspect(self.response(b'not acceptable',status=406),7)['passed']);self.assertFalse(self.inspect(self.response(self.files['regular.identity']),7)['passed'])
 def test_corrupt_unknown_encoding_mime_cache_and_vary_responses_fail(self):
  for response,index in [(self.response(b'corrupt','gzip'),1),(self.response(b'corrupt','br'),0),(self.response(self.files['regular.identity'],'unknown'),2)]:self.assertFalse(self.inspect(response,index)['passed'])
  for name,value in [('Content-Type','text/html'),('Cache-Control','max-age=31536000'),('Vary','User-Agent'),('X-KTK-Encoding-Probe','wrong')]:
   response=self.response(self.files['regular.identity']);response.headers[name]=value;self.assertFalse(self.inspect(response,2)['passed'])
 def test_request_paths_tokens_or_unreviewed_encoding_cases_refuse_before_http(self):
  class Forbidden:
   def open(self,*args,**kwargs):raise AssertionError('No network')
  url=probe.cap.ORIGIN+'ktk-svg-encoding-probe-'+TOKEN+'/regular.svg'
  for target,token,stem,accept,allowed in [(url+'?x=1',TOKEN,'regular','identity',{'identity'}),(url,'../bad','regular','identity',{'identity'}),(url,TOKEN,'../regular','identity',{'identity'}),(url,TOKEN,'regular','custom',{'identity'})]:
   with self.assertRaises(ValueError):probe.inspect_variant(target,token,stem,accept,allowed,self.files,Forbidden())
 def test_positive_encoding_patterns_match_exact_tokens_and_valid_nonzero_weights(self):
  pattern=probe.coding_pattern('br')
  for value in ['br','gzip, br','BR ; q=1.000','br;q=0.5','br;q=0.01','br;q=0.001','gzip;q=0, br;q=0.100']:
   self.assertIsNotNone(re.search(pattern,value,re.I),value)
  for value in ['xbr','bravo','br;q=0','br;q=0.','br;q=0.000','br;q=1.001','br;q=0.0001','gzip','extension="br"']:
   self.assertIsNone(re.search(pattern,value,re.I),value)
  with self.assertRaises(ValueError):probe.coding_pattern('br\nRewriteRule')
 def test_zero_exclusion_overrides_positive_wildcard_and_does_not_match_token_prefixes(self):
  zero=probe.coding_pattern('br',False)
  for value in ['br;q=0','gzip, BR ; q=0.000','*;q=1, br;q=0.0']:
   self.assertIsNotNone(re.search(zero,value,re.I),value)
  for value in ['xbr;q=0','br;q=0.01','br;q=1','br;q=0.0001','gzip;q=0']:
   self.assertIsNone(re.search(zero,value,re.I),value)
  header='*;q=1, br;q=0';self.assertIsNotNone(re.search(probe.coding_pattern('*'),header,re.I));self.assertIsNotNone(re.search(zero,header,re.I));config=probe.rewrite_policy();self.assertIn(('"!'+zero+'" [NC]').encode(),config);self.assertIn(b'- [R=406,L]',config);self.assertNotIn(b'type-map',config)
 def test_successful_capability_must_be_fresh_matching_cleaned_and_both_http_guards_pass(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);path=root/'docs/seo/capability.json';path.parent.mkdir(parents=True);source=root/'tools/probe-staging-svg-delivery.py';source.parent.mkdir();source.write_bytes(b'fixed probe')
   valid={'finishedAt':datetime.now(timezone.utc).isoformat(),'mode':'isolated-staging-override-probe','phase':'capability-observed','cleanupVerified':True,'parentConfigUnchanged':True,'headerAndRewriteSupported':True,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'http':[{'passed':True,'noStore':True}]*2}
   with patch.object(probe,'ROOT',root):
    path.write_text(json.dumps(valid));self.assertEqual(probe.validate_capability(path),valid)
    for key,value in [('finishedAt',(datetime.now(timezone.utc)-timedelta(hours=2)).isoformat()),('cleanupVerified',False),('sourceSha256','0'*64),('phase','capability-not-established'),('http',[{'passed':True,'noStore':False}]*2)]:
     changed={**valid,key:value};path.write_text(json.dumps(changed))
     with self.assertRaises(ValueError):probe.validate_capability(path)
 def test_offline_mode_never_loads_credentials_or_capability_evidence(self):
  with tempfile.TemporaryDirectory(dir=ROOT/'docs/seo',prefix='svg-offline-test-') as directory:
   out=Path(directory)/'offline.json'
   with patch.object(probe.cap,'common_module',side_effect=AssertionError('No network/credentials')),patch.object(probe,'validate_capability',side_effect=AssertionError('No prerequisite needed offline')),patch('sys.argv',['probe','--report',str(out)]),contextlib.redirect_stdout(io.StringIO()):probe.main()
   report=json.loads(out.read_text(encoding='utf-8'));self.assertEqual(report['phase'],'offline-validated');self.assertEqual(len(report['payload']),9);self.assertEqual(report['http'],[]);self.assertEqual(report['productionWrites'],0)
 def run_main(self,inspect):
  ftp=FakeFTP()
  with tempfile.TemporaryDirectory(dir=ROOT/'docs/seo',prefix='svg-live-fixture-') as directory:
   out=Path(directory)/'result.json';common=types.SimpleNamespace(StagingFTP=lambda:ftp,retrieve_file=lambda f,p:f.files.get(p));prior={'parentConfigBeforeSha256':hashlib.sha256(b'parent unchanged').hexdigest()}
   with patch.object(probe,'validate_capability',return_value=prior),patch.object(probe.cap,'common_module',return_value=common),patch.object(probe,'inspect_variant',side_effect=lambda *args:inspect(ftp,*args)),patch('sys.argv',['probe','--run-staging-variants-probe','--capability-report','fixture','--report',str(out)]),contextlib.redirect_stdout(io.StringIO()):
    try:probe.main();error=None
    except Exception as e:error=e
   return ftp,json.loads(out.read_text(encoding='utf-8')),error
 def test_main_success_checks_all_sixteen_cases_then_removes_all_nine_members(self):
  ftp,report,error=self.run_main(lambda *args:{'passed':True});self.assertIsNone(error);self.assertEqual(len(report['http']),16);self.assertEqual(report['phase'],'negotiation-observed');self.assertTrue(report['cleanupVerified']);self.assertTrue(report['parentConfigUnchanged']);self.assertEqual(ftp.files,{probe.cap.CONFIG:b'parent unchanged'})
 def test_main_http_failure_cleans_known_files_and_changed_file_refuses_cleanup(self):
  def failure(*args):raise RuntimeError('HTTP fixture failure')
  ftp,report,error=self.run_main(failure);self.assertIsInstance(error,RuntimeError);self.assertTrue(report['cleanupVerified']);self.assertTrue(report['parentConfigUnchanged']);self.assertEqual(ftp.files,{probe.cap.CONFIG:b'parent unchanged'})
  def change(ftp,*args):ftp.files[next(name for name in ftp.files if name.endswith('/regular.br'))]=b'changed';return {'passed':True}
  ftp,report,error=self.run_main(change);self.assertIsInstance(error,RuntimeError);self.assertEqual(report['phase'],'cleanup-refused');self.assertFalse(report['cleanupVerified']);self.assertEqual(len(ftp.files),10);self.assertEqual(ftp.files[probe.cap.CONFIG],b'parent unchanged')

if __name__=='__main__':unittest.main()
