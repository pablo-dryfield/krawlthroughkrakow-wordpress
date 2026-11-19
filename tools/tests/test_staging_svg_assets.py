"""Real loopback PHP contracts, not LiteSpeed/Cloudflare/release acceptance."""
import datetime,gzip,hashlib,http.client,importlib.util,json,os,socket,subprocess,tempfile,time,unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
def load(name):
 s=importlib.util.spec_from_file_location(name.replace('-','_'),ROOT/'tools'/(name+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
builder=load('build-staging-svg-assets');protocol=load('test-svg-negotiation-local')

class StagingSVGAssetTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.temp=tempfile.TemporaryDirectory(prefix='ktk-svg-assets-');cls.directory=Path(cls.temp.name);cls.files={name:(builder.ASSETS/name).read_bytes() for name in builder.FILES};cls.manifest=builder.validate(cls.files);cls.requests=0
  for name,value in cls.files.items():(cls.directory/name).write_bytes(value)
  for name,_ in builder.ORIGINALS.values():(cls.directory/name).write_bytes((builder.ASSETS/name).read_bytes())
  (cls.directory/'router.php').write_text("""<?php
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if (preg_match('~hero-statue-(regular|seasonal)[.]svg$~D',$path,$m)) { $_GET=['asset'=>$m[1]]; }
require __DIR__.'/svg-delivery.php';
""",encoding='utf-8')
  with socket.socket() as reservation:reservation.bind(('127.0.0.1',0));cls.port=reservation.getsockname()[1]
  cls.log=(cls.directory/'server.log').open('wb');cls.process=subprocess.Popen(['php','-d','zlib.output_compression=0','-d','display_errors=0','-S','127.0.0.1:'+str(cls.port),'-t',str(cls.directory),str(cls.directory/'router.php')],stdout=cls.log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
  try:
   for attempt in range(100):
    if cls.process.poll() is not None:raise RuntimeError('Owned PHP process exited before ready')
    try:
     with socket.create_connection(('127.0.0.1',cls.port),timeout=.1):break
    except OSError:time.sleep(.05)
   else:raise RuntimeError('Owned PHP process did not become ready')
  except Exception:cls.tearDownClass();raise
 @classmethod
 def tearDownClass(cls):
  if cls.process.poll() is None:
   cls.process.terminate()
   try:cls.process.wait(timeout=10)
   except subprocess.TimeoutExpired:cls.process.kill();cls.process.wait(timeout=10)
  cls.log.close();assert cls.process.poll() is not None;cls.temp.cleanup()
  print(json.dumps({'actualLoopbackSVGRequests':cls.requests,'ownedPHPClosed':True,'hostingOrProductionAcceptance':False}))
 @classmethod
 def send(cls,stem='regular',field='identity',method='GET',headers=None,path=None,host='krawlthroughkrakow.com'):
  connection=http.client.HTTPConnection('127.0.0.1',cls.port,timeout=10)
  try:
   connection.putrequest(method,path or builder.PREFIX+'hero-statue-'+stem+'.svg?v=unchanged-original',skip_accept_encoding=True,skip_host=True);connection.putheader('Host',host)
   if field is not None:connection.putheader('Accept-Encoding',field)
   for k,v in (headers or {}).items():connection.putheader(k,v)
   connection.endheaders();v=connection.getresponse();body=v.read(1000001);cls.requests+=1;assert len(body)<=1000000
   return v.status,v.headers,body
  finally:connection.close()
 def assert_body(self,stem,coding,body):
  entry=self.manifest['assets'][stem][coding];self.assertEqual(hashlib.sha256(body).hexdigest(),entry['sha256']);self.assertEqual(len(body),entry['bytes'])
  if coding=='gzip':raw=gzip.decompress(body)
  elif coding=='br':raw=subprocess.check_output(['node','-e',"process.stdout.write(require('node:zlib').brotliDecompressSync(require('node:fs').readFileSync(0),{maxOutputLength:1000000}));"],input=body,timeout=15)
  else:raw=body
  self.assertEqual(hashlib.sha256(raw).hexdigest(),builder.ORIGINALS[stem][1])
 def test_all_real_get_selections_invalid_fields_and_original_artwork(self):
  for stem in builder.ORIGINALS:
   for field,coding in protocol.CASES:
    with self.subTest(stem=stem,field=field):
     status,headers,body=self.send(stem,field)
     if coding is None:
      self.assertEqual(status,406);self.assertIn('no-store',headers['Cache-Control']);self.assertIsNone(headers.get('ETag'));continue
     self.assertEqual(status,200);self.assertEqual(headers['Content-Type'],'image/svg+xml');self.assertEqual(headers.get('Content-Encoding','identity'),coding);self.assertEqual(headers['ETag'],'"'+self.manifest['assets'][stem][coding]['sha256']+'"');self.assertEqual(len(headers.get_all('ETag')),1);self.assertIn('immutable',headers['Cache-Control']);self.assert_body(stem,coding,body)
   for field in protocol.INVALID:
    status,headers,body=self.send(stem,field);self.assertEqual(status,400);self.assertIn('no-store',headers['Cache-Control']);self.assertIsNone(headers.get('Content-Encoding'));self.assertIsNone(headers.get('ETag'))
 def test_real_head_and_conditional_precedence_and_cross_representation_validators(self):
  modified=datetime.datetime.fromtimestamp(builder.MODIFIED_AT,datetime.timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT');old='Thu, 01 Jan 1970 00:00:00 GMT'
  for stem in builder.ORIGINALS:
   for coding in ('br','gzip','identity'):
    tag='"'+self.manifest['assets'][stem][coding]['sha256']+'"';other='gzip' if coding!='gzip' else 'br';other_tag='"'+self.manifest['assets'][stem][other]['sha256']+'"'
    status,headers,body=self.send(stem,coding,'HEAD');self.assertEqual(status,200);self.assertEqual(body,b'');self.assertEqual(headers['Content-Length'],str(self.manifest['assets'][stem][coding]['bytes']));self.assertEqual(headers.get('Content-Encoding','identity'),coding);self.assertEqual(headers['ETag'],tag)
    for condition in [{'If-None-Match':tag},{'If-None-Match':'W/'+tag},{'If-Modified-Since':modified},{'If-None-Match':tag,'If-Modified-Since':old}]:
     status,headers,body=self.send(stem,coding,headers=condition);self.assertEqual(status,304);self.assertEqual(body,b'');self.assertEqual(headers['ETag'],tag)
    status,headers,body=self.send(stem,coding,headers={'If-None-Match':other_tag,'If-Modified-Since':modified});self.assertEqual(status,200);self.assert_body(stem,coding,body)
    for condition in [{'If-Match':'W/'+tag},{'If-Match':other_tag},{'If-Unmodified-Since':old}]:
     status,headers,body=self.send(stem,coding,headers=condition);self.assertEqual(status,412);self.assertIsNone(headers.get('ETag'));self.assertIn('no-store',headers['Cache-Control'])
    status,headers,body=self.send(stem,coding,headers={'If-Match':tag,'If-Unmodified-Since':old});self.assertEqual(status,200);self.assert_body(stem,coding,body)
 def test_direct_source_production_paths_wrong_hosts_and_mutating_methods_are_denied(self):
  for path in [builder.PREFIX+'svg-delivery.php?asset=regular','/wp-content/mu-plugins/ktk-homepage-assets/hero-statue-regular.svg','/hero-statue-seasonal.svg']:
   status,headers,body=self.send(path=path);self.assertEqual(status,403);self.assertIn('no-store',headers['Cache-Control'])
  status,headers,body=self.send(host='wrong.example');self.assertEqual(status,403)
  for method in ('POST','PUT','DELETE','OPTIONS'):
   status,headers,body=self.send(method=method);self.assertEqual(status,405);self.assertEqual(headers['Allow'],'GET, HEAD');self.assertIn('no-store',headers['Cache-Control'])
 def test_changed_representation_fails_closed_and_runtime_does_not_repair_it(self):
  name=self.manifest['assets']['regular']['br']['file'];path=self.directory/name;self.assertTrue(path.resolve().is_relative_to(self.directory.resolve()));original=path.read_bytes();damaged=original[:-1]+b'X';path.write_bytes(damaged)
  try:
   status,headers,body=self.send(field='br');self.assertEqual(status,503);self.assertIn('no-store',headers['Cache-Control']);self.assertIsNone(headers.get('ETag'));self.assertEqual(path.read_bytes(),damaged)
  finally:path.write_bytes(original)
  self.assertEqual((self.directory/'svg-delivery.php').read_bytes(),self.files['svg-delivery.php'])
 def test_offline_asset_check_rejects_changed_wire_or_template_and_preserves_originals(self):
  for name in ('hero-statue-regular.svg.br','svg-delivery.php','.htaccess'):
   changed=dict(self.files);changed[name]=changed[name]+b'changed'
   with self.assertRaises(AssertionError):builder.validate(changed)
  for name,digest in builder.ORIGINALS.values():self.assertEqual(hashlib.sha256((builder.ASSETS/name).read_bytes()).hexdigest(),digest)
 def test_declared_edge_rule_cannot_include_production_pages_or_ttl_overrides(self):
  value=json.loads((ROOT/'tools/config/staging-svg-cache-rule.json').read_text(encoding='utf-8'));self.assertEqual(set(value),{'schemaVersion','scope','zoneId','rule'});self.assertEqual(value['scope'],'ktk-durable-staging-svg-assets');self.assertEqual(value['zoneId'],'4303f6a45f815c5570bb4bba5f86a423');rule=value['rule']
  expected='(http.host eq "krawlthroughkrakow.com" and http.request.method in {"GET" "HEAD"} and http.request.uri.path in {"'+builder.PREFIX+'hero-statue-regular.svg" "'+builder.PREFIX+'hero-statue-seasonal.svg"})'
  self.assertEqual(rule['expression'],expected);self.assertEqual(rule['ref'],'ktk_staging_svg_delivery_v1');self.assertIs(rule['enabled'],True);self.assertEqual(rule['action'],'set_cache_settings');self.assertEqual(rule['action_parameters'],{'cache':True,'respect_strong_etags':True,'browser_ttl':{'mode':'respect_origin'},'edge_ttl':{'mode':'respect_origin'},'vary':{'default':{'action':'bypass'},'headers':{'accept-encoding':{'action':'passthrough'}}}})

if __name__=='__main__':unittest.main()
