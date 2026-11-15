import contextlib,ftplib,importlib.util,io,json,tempfile,unittest,types
from email.message import Message
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('svg_probe',Path(__file__).resolve().parents[1]/'probe-staging-svg-delivery.py');probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
TOKEN='a'*32

class FakeFTP:
 def __init__(self):self.files={probe.CONFIG:b'parent unchanged'};self.dirs={probe.PARENT};self.writes=[];self.corrupt=False;self.rename_lost=False;self.mkdir_lost=False
 def mlsd(self,directory):
  if directory not in self.dirs:raise ftplib.error_perm('550 Missing')
  return [(p.rsplit('/',1)[1],{'type':'dir'}) for p in self.dirs if p!=directory and p.rsplit('/',1)[0]==directory]+[(p.rsplit('/',1)[1],{'type':'file'}) for p in self.files if p.rsplit('/',1)[0]==directory]
 def mkd(self,path):
  if path in self.dirs:raise ftplib.error_perm('550 Exists')
  self.writes.append(('mkdir',path));self.dirs.add(path)
  if self.mkdir_lost:raise ConnectionResetError('reply lost')
 def storbinary(self,command,stream):
  path=command.removeprefix('STOR ');self.writes.append(('upload',path));self.files[path]=b'changed' if self.corrupt else stream.read()
 def retrbinary(self,command,callback):
  path=command.removeprefix('RETR ')
  if path not in self.files:raise ftplib.error_perm('550 Missing')
  callback(self.files[path])
 def rename(self,a,b):
  self.writes.append(('rename',b));self.files[b]=self.files.pop(a)
  if self.rename_lost:raise ConnectionResetError('reply lost')
 def delete(self,path):self.writes.append(('delete',path));del self.files[path]
 def rmd(self,path):
  if FakeFTP.mlsd(self,path):raise RuntimeError('Not empty')
  self.writes.append(('rmdir',path));self.dirs.remove(path)
 def close(self):pass

class Response:
 def __init__(self,url,body,headers=None,status=200):self.url=url;self.body=body;self.status=status;self.headers=headers or {'X-KTK-Encoding-Probe':TOKEN,'X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store, max-age=0','Content-Type':'text/plain','CF-Cache-Status':'DYNAMIC'}
 def __enter__(self):return self
 def __exit__(self,*args):pass
 def read(self):return self.body
 def geturl(self):return self.url

class Opener:
 def __init__(self,response):self.response=response;self.requests=[]
 def open(self,request,timeout):self.requests.append((request,timeout));return self.response

class IsolatedStagingSvgProbeTests(unittest.TestCase):
 def fresh(self):
  ftp=FakeFTP();run=probe.IsolatedProbe(ftp,TOKEN);run.create();return ftp,run
 def test_payload_is_three_fixed_text_files_with_exact_header_and_existing_file_rewrite(self):
  files=probe.payload(TOKEN);self.assertEqual(set(files),{'.htaccess','control.txt','rewrite-test.txt'});self.assertNotEqual(files['control.txt'],files['rewrite-test.txt']);self.assertIn(b'Header always set X-KTK-Encoding-Probe "'+TOKEN.encode()+b'"',files['.htaccess']);self.assertIn(b'RewriteRule ^rewrite-test\\.txt$ control.txt [L]',files['.htaccess']);self.assertNotIn(b'http',files['.htaccess']);self.assertIn(b'no-store',files['.htaccess'])
 def test_complete_lifecycle_writes_only_new_namespace_and_preserves_parent(self):
  ftp,run=self.fresh();files=probe.payload(TOKEN)
  for n in ['control.txt','rewrite-test.txt','.htaccess']:run.upload(n,files[n])
  self.assertEqual(run.read(run.file_path('control.txt')),files['control.txt']);self.assertTrue(run.cleanup());self.assertEqual(ftp.files,{probe.CONFIG:b'parent unchanged'});self.assertEqual(ftp.dirs,{probe.PARENT});self.assertTrue(all(p==run.directory or p.startswith(run.directory+'/') for _,p in ftp.writes))
 def test_cache_override_is_only_in_the_owned_child_payload_and_uses_both_header_tables(self):
  files=probe.payload(TOKEN);config=files['.htaccess'];self.assertTrue(config.startswith(b'<FilesMatch "^(control[.]txt|rewrite-test[.]txt)$">\n'));self.assertIn(b'ExpiresActive Off',config);self.assertIn(b'Header onsuccess unset Cache-Control',config);self.assertIn(b'Header always set Cache-Control "no-store, max-age=0"',config);self.assertIn(b'Header always unset Expires',config);self.assertIn(b'</IfModule>\n</FilesMatch>\nRewriteEngine On',config);self.assertNotIn(probe.PARENT.encode(),config);self.assertEqual(set(files),probe.FILES)
 def test_invalid_identifiers_fail_before_any_ftp_action(self):
  for token in ['',TOKEN+'b','../'+TOKEN,'A'*32,'a'*31,'a'*31+'\n']:
   ftp=FakeFTP()
   with self.assertRaises(ValueError):probe.IsolatedProbe(ftp,token)
   with self.assertRaises(ValueError):probe.payload(token)
   self.assertEqual(ftp.writes,[])
 def test_only_exact_directory_pseudo_entries_are_ignored_and_ambiguous_members_are_preserved(self):
  class DotFTP(FakeFTP):
   def mlsd(self,directory):return [('.',{'type':'cdir'}),('..',{'type':'pdir'})]+super().mlsd(directory)
  ftp=DotFTP();ftp.mkdir_lost=True;run=probe.IsolatedProbe(ftp,TOKEN);run.create();run.upload('control.txt',b'known');self.assertTrue(run.cleanup());self.assertEqual(ftp.files,{probe.CONFIG:b'parent unchanged'})
  for extra in [('owner',{'type':'cdir'}),('control.txt',{'type':'file','unix.slink':'outside'}),('control.txt',{'type':'file'})]:
   ftp,run=self.fresh();run.upload('control.txt',b'known');original=ftp.mlsd;ftp.mlsd=lambda directory,original=original,extra=extra:original(directory)+([extra] if directory==run.directory else []);before=list(ftp.writes)
   with self.assertRaises(RuntimeError):run.cleanup()
   self.assertEqual(ftp.writes,before);self.assertIn(run.directory+'/control.txt',ftp.files)
 def test_existing_directory_is_preserved_without_writes(self):
  ftp=FakeFTP();run=probe.IsolatedProbe(ftp,TOKEN);ftp.dirs.add(run.directory)
  with self.assertRaises(RuntimeError):run.create()
  self.assertEqual(ftp.writes,[]);self.assertFalse(run.cleanup());self.assertIn(run.directory,ftp.dirs)
 def test_upload_requires_created_namespace(self):
  ftp=FakeFTP();run=probe.IsolatedProbe(ftp,TOKEN)
  with self.assertRaises(RuntimeError):run.upload('control.txt',b'x')
  self.assertEqual(ftp.writes,[])
 def test_filename_and_directory_tampering_are_rejected(self):
  ftp,run=self.fresh();before=list(ftp.writes)
  for name in ['../.htaccess','/control.txt','sub/control.txt','control.txt/../.htaccess','wp-config.php','control.txt\r\nDELE /public_html/.htaccess']:
   with self.assertRaises(ValueError):run.upload(name,b'x')
  run.directory='/public_html'
  with self.assertRaises(ValueError):run.upload('control.txt',b'x')
  with self.assertRaises(ValueError):run.cleanup()
  self.assertEqual(ftp.writes,before)
 def test_read_alias_cannot_escape_registered_path(self):
  ftp,run=self.fresh();run.upload('control.txt',b'x')
  for path in [run.directory+'/../control.txt',run.directory+'/nested/control.txt','/public_html/control.txt']:
   with self.assertRaises(ValueError):run.read(path)
  self.assertTrue(run.cleanup())
 def test_unknown_member_stops_upload_and_cleanup_before_any_deletion(self):
  ftp,run=self.fresh();run.upload('control.txt',b'known');unknown=run.directory+'/owner.txt';ftp.files[unknown]=b'preserve';before=list(ftp.writes)
  with self.assertRaises(RuntimeError):run.upload('.htaccess',b'x')
  with self.assertRaises(RuntimeError):run.cleanup()
  self.assertEqual(ftp.writes,before);self.assertEqual(ftp.files[unknown],b'preserve');self.assertIn(run.directory+'/control.txt',ftp.files)
 def test_changed_known_bytes_refuse_cleanup_atomically(self):
  ftp,run=self.fresh();run.upload('control.txt',b'known');run.upload('rewrite-test.txt',b'other');ftp.files[run.directory+'/control.txt']=b'owner change';before=list(ftp.writes)
  with self.assertRaises(RuntimeError):run.cleanup()
  self.assertEqual(ftp.writes,before);self.assertIn(run.directory+'/rewrite-test.txt',ftp.files)
 def test_corrupt_upload_is_not_activated_or_deleted(self):
  ftp,run=self.fresh();ftp.corrupt=True
  with self.assertRaises(RuntimeError):run.upload('control.txt',b'expected')
  self.assertNotIn(run.directory+'/control.txt',ftp.files);before=list(ftp.writes)
  with self.assertRaises(RuntimeError):run.cleanup()
  self.assertEqual(ftp.writes,before)
 def test_only_our_recorded_interrupted_prefix_temporary_is_removable(self):
  ftp,run=self.fresh();name='control.txt.upload-'+'b'*16+'.tmp';run.expected[name]=b'complete';run.attempted.add(name);ftp.files[run.directory+'/'+name]=b'com';self.assertTrue(run.cleanup());self.assertEqual(ftp.files,{probe.CONFIG:b'parent unchanged'})
 def test_lost_rename_reply_resolves_by_exact_final_bytes(self):
  ftp,run=self.fresh();ftp.rename_lost=True;run.upload('control.txt',b'known');self.assertEqual(ftp.files[run.directory+'/control.txt'],b'known');self.assertTrue(run.cleanup())
 def test_lost_mkdir_reply_resolves_only_an_empty_new_directory(self):
  ftp=FakeFTP();ftp.mkdir_lost=True;run=probe.IsolatedProbe(ftp,TOKEN);run.create();self.assertTrue(run.created);self.assertTrue(run.cleanup())
 def test_http_is_exact_owned_get_identity_and_checks_every_expected_header(self):
  url=probe.ORIGIN+'ktk-svg-encoding-probe-'+TOKEN+'/rewrite-test.txt';body=probe.payload(TOKEN)['control.txt'];opener=Opener(Response(url,body));result=probe.inspect_url(url,TOKEN,body,opener);self.assertTrue(result['passed']);request,timeout=opener.requests[0];self.assertEqual(request.get_method(),'GET');self.assertEqual(request.get_header('Accept-encoding'),'identity');self.assertEqual(timeout,45)
 def test_http_mismatch_status_redirect_or_encoding_does_not_pass(self):
  url=probe.ORIGIN+'ktk-svg-encoding-probe-'+TOKEN+'/control.txt';body=b'known'
  for response in [Response(url,b'wrong'),Response(url,body,status=404),Response(probe.ORIGIN,body),Response(url,body,headers={'X-KTK-Encoding-Probe':'wrong'}),Response(url,body,headers={'Content-Encoding':'br'})]:self.assertFalse(probe.inspect_url(url,TOKEN,body,Opener(response))['passed'])
 def test_repeated_cache_fields_are_retained_and_only_exact_no_store_directive_passes(self):
  url=probe.ORIGIN+'ktk-svg-encoding-probe-'+TOKEN+'/control.txt'
  for directive,expected in [('no-store, max-age=0',True),('x-no-store',False),('extension="no-store"',False),('extension="x,no-store,y"',False)]:
   headers=Message();headers['Cache-Control']='max-age=86400';headers['Cache-Control']=directive;headers['X-KTK-Encoding-Probe']=TOKEN;headers['X-Robots-Tag']='noindex';result=probe.inspect_url(url,TOKEN,b'known',Opener(Response(url,b'known',headers=headers)));self.assertEqual(result['cacheControlHeaders'],['max-age=86400',directive]);self.assertEqual(result['noStore'],expected);self.assertEqual(result['passed'],expected)
 def test_non_probe_http_paths_and_tokens_fail_before_request(self):
  class Forbidden:
   def open(self,*args,**kwargs):raise AssertionError('Network forbidden')
  for url,token in [('https://krawlthroughkrakow.com/',TOKEN),('https://example.org/staging/',TOKEN),(probe.ORIGIN+'ktk-svg-encoding-probe-'+TOKEN+'/control.txt?x=1',TOKEN),(probe.ORIGIN,'../evil')]:
   with self.assertRaises(ValueError):probe.inspect_url(url,token,b'x',Forbidden())
 def test_redirect_handler_refuses_redirects(self):
  with self.assertRaises(RuntimeError):probe.NoRedirect().redirect_request(None,None,None,None,None,None)
 def test_default_mode_never_loads_credentials_or_network(self):
  with tempfile.TemporaryDirectory(prefix='ktk-svg-probe-test-') as d:
   root=Path(d);out=root/'docs/seo/offline.json'
   with patch.object(probe,'ROOT',root),patch.object(probe,'common_module',side_effect=AssertionError('No credentials/network')),patch('sys.argv',['probe','--report',str(out)]),contextlib.redirect_stdout(io.StringIO()):probe.main()
   report=json.loads(out.read_text(encoding='utf-8'));self.assertEqual(report['mode'],'offline-validation');self.assertEqual(report['phase'],'offline-validated');self.assertEqual(report['applicationPayloadWrites'],0);self.assertEqual(report['productionWrites'],0);self.assertEqual(report['http'],[])
 def run_main_fixture(self,ftp,inspect):
  with tempfile.TemporaryDirectory(prefix='ktk-svg-probe-main-test-') as d:
   root=Path(d);out=root/'docs/seo/probe.json';common=types.SimpleNamespace(StagingFTP=lambda:ftp,retrieve_file=lambda f,p:f.files.get(p))
   with patch.object(probe,'ROOT',root),patch.object(probe,'common_module',return_value=common),patch.object(probe,'inspect_url',side_effect=inspect),patch('sys.argv',['probe','--run-staging-probe','--report',str(out)]),contextlib.redirect_stdout(io.StringIO()):
    try:probe.main();error=None
    except Exception as e:error=e
   return json.loads(out.read_text(encoding='utf-8')),error
 def test_main_success_preserves_parent_and_removes_all_probe_files(self):
  ftp=FakeFTP();r,error=self.run_main_fixture(ftp,lambda *a:{'passed':True});self.assertIsNone(error);self.assertEqual(r['phase'],'capability-observed');self.assertTrue(r['headerAndRewriteSupported']);self.assertTrue(r['cleanupVerified']);self.assertTrue(r['parentConfigUnchanged']);self.assertEqual(ftp.files,{probe.CONFIG:b'parent unchanged'});self.assertEqual(ftp.dirs,{probe.PARENT})
 def test_main_http_failure_records_type_and_still_cleans_known_files(self):
  ftp=FakeFTP()
  def fail(*a):raise RuntimeError('fixture HTTP failure')
  r,error=self.run_main_fixture(ftp,fail);self.assertIsInstance(error,RuntimeError);self.assertEqual(r['phase'],'probe-failed');self.assertEqual(r['errorType'],'RuntimeError');self.assertTrue(r['cleanupVerified']);self.assertTrue(r['parentConfigUnchanged']);self.assertEqual(ftp.files,{probe.CONFIG:b'parent unchanged'})
 def test_main_changed_file_cleanup_refuses_and_preserves_every_member(self):
  ftp=FakeFTP()
  def change(*a):
   target=next(p for p in ftp.files if p.endswith('/control.txt'));ftp.files[target]=b'owner changed';return {'passed':True}
  r,error=self.run_main_fixture(ftp,change);self.assertIsInstance(error,RuntimeError);self.assertEqual(r['phase'],'cleanup-refused');self.assertFalse(r['cleanupVerified']);self.assertEqual(r['cleanupErrorType'],'RuntimeError');self.assertEqual(len([p for p in ftp.files if p!=probe.CONFIG]),3);self.assertEqual(ftp.files[probe.CONFIG],b'parent unchanged')

if __name__=='__main__':unittest.main()
