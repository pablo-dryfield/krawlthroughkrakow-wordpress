import copy,io,json,subprocess,time,unittest,urllib.error
from email.message import Message
from unittest import mock
from tools import private_entry_probe as probe
from tools import content_update_backup as backup
from tools.tests import test_staging_protected_state as snapshot
from tools.tests import test_full_private_seed_transport as wire

DRIVER=r'''<?php
$c=json_decode(file_get_contents($argv[1]),true,512,JSON_THROW_ON_ERROR);$GLOBALS['c']=$c;
define('ABSPATH',$c['stage'].'/');define('WP_CONTENT_DIR',$c['stage'].'/wp-content');define('WP_PLUGIN_DIR',WP_CONTENT_DIR.'/plugins');define('ARRAY_A','ARRAY_A');
$_SERVER['HTTP_X_KTK_ENTRY_PROBE_TOKEN']=$c['token'];$_SERVER['HTTP_HOST']=$c['host'];$_SERVER['REQUEST_METHOD']=$c['method'];$_GET=array('entry'=>$c['profile'],'ktk_private_entry_probe'=>$c['identifier']);
$GLOBALS['entry_callbacks']=array();$GLOBALS['phases']=array('muplugins_loaded'=>0,'plugins_loaded'=>0,'wp_loaded'=>0);$GLOBALS['ordinary_marker']=false;
function add_action($hook,$callback,$priority){$GLOBALS['entry_callbacks'][$hook][]=$callback;}
if(empty($c['missingNoCache'])){function nocache_headers(){}}
function home_url($path){return $GLOBALS['c']['home'];}function site_url($path){return $GLOBALS['c']['siteurl'];}
function get_option($name){if($name==='active_plugins'){return array('fixture-ecwid/entry.php');}return $name==='blog_public'?$GLOBALS['c']['public']:278;}
function wp_get_environment_type(){return 'production';}function is_multisite(){return false;}function did_action($hook){return $GLOBALS['phases'][$hook]??0;}
function wp_send_json($value,$status=200){echo json_encode(array('status'=>$status,'body'=>$value,'queries'=>$GLOBALS['wpdb']->queries,'ordinaryMarker'=>$GLOBALS['ordinary_marker']),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;}
class FixtureDB{
public $posts='fixture_posts',$postmeta='fixture_postmeta',$options='fixture_options',$terms='fixture_terms',$term_taxonomy='fixture_term_taxonomy',$term_relationships='fixture_term_relationships',$termmeta='fixture_termmeta',$last_error='',$queries=array();
public function get_results($q,$format){$this->queries[]=$q;if($GLOBALS['c']['dbError']){$this->last_error='private DB diagnostic must remain private';return null;}preg_match('/^SELECT \* FROM ([A-Za-z0-9_]+)/',$q,$m);return $GLOBALS['c']['rows'][substr($m[1]??'',8)]??array();}}
$wpdb=new FixtureDB();if($c['unsafeTable']){$wpdb->posts='bad; DELETE';}require $c['helper'];
$GLOBALS['phases']['muplugins_loaded']=1;foreach($GLOBALS['entry_callbacks']['muplugins_loaded']??array() as $cb){$cb();}
require WP_PLUGIN_DIR.'/fixture-ecwid/entry.php';$GLOBALS['phases']['plugins_loaded']=1;$GLOBALS['phases']['wp_loaded']=1;foreach($GLOBALS['entry_callbacks']['wp_loaded']??array() as $cb){$cb();}
echo json_encode(array('noProbe'=>true,'queries'=>$wpdb->queries,'ordinaryMarker'=>$GLOBALS['ordinary_marker'],'phases'=>$GLOBALS['phases']));
'''

@unittest.skipUnless(snapshot.PHP,'Real PHP required for early/late entry fixtures')
class PrivateEntryProbePHPTests(unittest.TestCase):
 def setUp(self):self.expiry=int(time.time())+180;self.owned={'ktk-code-pages.php':backup.sha(b'original renderer'),'ktk-code-pages-assets/registry.php':backup.sha(b'original registry')}
 def fixture(self,profile='early',**changes):
  actual=[]
  def mutate(c,mu,store):
   c.update(profile=profile,identifier='a'*32,body='{"schemaVersion":1,"action":"inspect"}',missingNoCache=False);c.update(changes)
   if 'postText' in c:c['rows']['posts'][0]['post_content']=c.pop('postText')
   plugin=store.parent/'fixture-ecwid/entry.php';plugin.parent.mkdir();plugin.write_bytes(b'<?php $GLOBALS["ordinary_marker"]=true;')
   source=probe.helper_source(snapshot.NAME,snapshot.TOKEN,self.expiry,self.owned);needle=b"file_get_contents('php://input',false,null,0,1025)";self.assertEqual(source.count(needle),1);source=source.replace(needle,b"($GLOBALS['c']['body']??'')")
   if c.pop('expired',False):source=source.replace(str(self.expiry).encode(),b'1',1)
   helper=mu/snapshot.NAME;helper.write_bytes(source);actual.append(source)
  with mock.patch.object(snapshot,'DRIVER',DRIVER):out,_=snapshot.SnapshotPHPTests().fixture(mutate)
  return out,actual[0]
 def test_early_and_late_capture_exact_same_complete_state_before_and_after_ordinary_plugin_loading(self):
  early,source=self.fixture();late,other=self.fixture('late');self.assertEqual(source,other)
  for profile,out in [('early',early),('late',late)]:
   self.assertEqual(out['status'],200);probe.validate_metadata(out['body'],profile,backup.sha(source),self.owned);self.assertEqual(len(out['queries']),7);self.assertTrue(all(q.startswith('SELECT ') for q in out['queries']));self.assertFalse(any(any(x in q for x in ('users','orders','payments','comments')) for q in out['queries']))
  self.assertEqual(early['body']['snapshot'],late['body']['snapshot']);self.assertFalse(early['ordinaryMarker']);self.assertTrue(late['ordinaryMarker']);self.assertEqual(early['body']['regularPlugins']['included'],0);self.assertFalse(early['body']['regularPlugins']['ecwidIncluded']);self.assertEqual(late['body']['regularPlugins']['included'],1);self.assertTrue(late['body']['regularPlugins']['ecwidIncluded'])
 def test_missing_wrong_expired_tokens_and_wrong_probe_identity_continue_normal_hooks_without_private_queries(self):
  for changes in [{'token':''},{'token':'x'*43},{'expired':True},{'identifier':'c'*32},{'profile':'unknown'}]:
   profile=changes.pop('profile','early');out,_=self.fixture(profile,**changes);self.assertTrue(out['noProbe']);self.assertEqual(out['queries'],[]);self.assertTrue(out['ordinaryMarker']);self.assertEqual(out['phases'],{'muplugins_loaded':1,'plugins_loaded':1,'wp_loaded':1})
 def test_valid_token_wrong_method_host_site_and_indexing_refuse_before_private_queries(self):
  for changes in [{'method':'GET'},{'host':'other.invalid'},{'home':'https://krawlthroughkrakow.com/'},{'siteurl':'https://other.invalid/staging/'},{'public':1}]:
   out,_=self.fixture(**changes);self.assertEqual(out['status'],403);self.assertEqual(out['queries'],[]);self.assertFalse(out['ordinaryMarker'])
 def test_missing_early_capability_is_explicit_and_reads_no_private_rows(self):
  out,_=self.fixture(missingNoCache=True);self.assertEqual(out['status'],409);self.assertEqual(out['body']['error'],'entry_capability_unavailable');self.assertFalse(out['body']['requiredFunctions']['nocache_headers']);self.assertEqual(out['queries'],[])
 def test_unexpected_body_and_database_failure_reveal_no_raw_diagnostic(self):
  for changes in [{'body':'{"action":"apply"}'},{'dbError':True},{'unsafeTable':True}]:
   out,_=self.fixture(**changes);self.assertEqual(out['status'],409);self.assertEqual(set(out['body']),{'error','failureType'});self.assertNotIn('private DB diagnostic',json.dumps(out['body']))
 def test_compiler_preserves_unchanged_raw_core_and_refuses_invalid_scope_expiry_and_source_inventory(self):
  source=probe.helper_source(snapshot.NAME,snapshot.TOKEN,self.expiry,self.owned);self.assertIn(probe.CORE.read_bytes()[6:],source);self.assertNotIn(b'__KTK_ENTRY_',source);self.assertLess(source.index(b'HTTP_X_KTK_ENTRY_PROBE_TOKEN'),source.index(b'$snapshot=ktk_capture'))
  for args in [('production.php',snapshot.TOKEN,self.expiry,self.owned),(snapshot.NAME,'bad',self.expiry,self.owned),(snapshot.NAME,snapshot.TOKEN,1,self.owned),(snapshot.NAME,snapshot.TOKEN,int(time.time())+1000,self.owned),(snapshot.NAME,snapshot.TOKEN,self.expiry,{**self.owned,'../outside':'e'*64})]:
   with self.assertRaises(ValueError):probe.helper_source(*args)
 def test_metadata_hashes_independently_match_full_raw_snapshot_including_unicode_line_separator(self):
  text='Krak\u00f3w\u2028exact';out,source=self.fixture(postText=text)
  def mutate(c,mu,store):c['rows']['posts'][0]['post_content']=text
  reference,_=snapshot.SnapshotPHPTests().fixture(mutate);self.assertEqual(reference['status'],200);self.assertEqual(out['body']['snapshot'],probe.snapshot_metadata(reference['body'],backup.sha(source)))

@unittest.skipUnless(snapshot.PHP,'Real PHP metadata fixture required')
class PrivateEntryClientTests(unittest.TestCase):
 def setUp(self):
  self.case=PrivateEntryProbePHPTests('runTest');self.case.setUp();out,source=self.case.fixture();self.v=out['body'];self.sha=backup.sha(source);self.owned=self.case.owned
 def client(self,opener):return probe.EntryProbeClient('a'*32,snapshot.TOKEN,1200,self.sha,self.owned,opener,lambda:1000)
 def test_exact_authenticated_metadata_request_and_response_pass_without_token_in_url(self):
  opener=wire.Opener(self.v);client=self.client(opener);self.assertEqual(client.inspect('early'),self.v);self.assertEqual(len(opener.calls),1);r,t=opener.calls[0];self.assertEqual(t,60);self.assertEqual(r.method,'POST');self.assertNotIn(snapshot.TOKEN,r.full_url);self.assertEqual(r.data,b'{"schemaVersion":1,"action":"inspect"}')
 def test_phase_raw_rows_counter_bool_source_and_snapshot_corruption_are_refused_without_retry(self):
  for mutate in [lambda v:v['phases'].update(plugins_loaded=1),lambda v:v.update(rawRows=[]),lambda v:v.update(databaseWrites=False),lambda v:v['snapshot'].update(ownedFilesSha256='e'*64),lambda v:v['requiredFunctions'].update(get_option=False)]:
   v=copy.deepcopy(self.v);mutate(v);opener=wire.Opener(v);client=self.client(opener)
   with self.assertRaises(RuntimeError):client.inspect('early')
   self.assertEqual(len(opener.calls),1);self.assertEqual(client.last_failure['status'],200)
 def test_redirect_cache_malformed_oversize_and_network_failures_never_retry(self):
  for changes in [{'url':'https://krawlthroughkrakow.com/'},{'headers':{'CF-Cache-Status':'HIT'}},{'raw':b'{}'},{'raw':b'x'*32769},{'error':True}]:
   opener=wire.Opener(self.v,**changes);client=self.client(opener)
   with self.assertRaises(RuntimeError):client.inspect('early')
   self.assertEqual(len(opener.calls),1);self.assertIsNotNone(client.last_request_seconds)
 def test_unknown_profile_and_expired_context_never_request(self):
  opener=wire.Opener(self.v);client=self.client(opener)
  with self.assertRaises(ValueError):client.inspect('other')
  client.clock=lambda:1200
  with self.assertRaises(ValueError):client.inspect('early')
  self.assertFalse(opener.calls)
 def test_normal_missing_invalid_and_expired_token_controls_return_only_html_hash_metadata(self):
  html=b'<html>unchanged ordinary staging page</html>';opener=wire.Opener(self.v,raw=html,headers={'Content-Type':'text/html'});client=self.client(opener)
  for token in (None,'invalid',snapshot.TOKEN):
   client.clock=lambda:1201;result=client.normal(token);self.assertEqual(result['sha256'],backup.sha(html));self.assertEqual(result['bytes'],len(html));self.assertNotIn(snapshot.TOKEN,json.dumps(result));request,_=opener.calls[-1];self.assertEqual(request.method,'GET');self.assertIsNone(request.data)
  self.assertEqual(len(opener.calls),3)
 def test_normal_redirect_json_or_oversize_html_fail_without_retry(self):
  for changes in [{'url':'https://krawlthroughkrakow.com/','headers':{'Content-Type':'text/html'}},{'raw':b'{}'},{'raw':b'x'*4194305,'headers':{'Content-Type':'text/html'}}]:
   opener=wire.Opener(self.v,**changes)
   with self.assertRaises(RuntimeError):self.client(opener).normal()
   self.assertEqual(len(opener.calls),1)
 def test_expired_inspect_post_control_uses_same_url_and_payload_as_active_probe_and_requires_uncached_html(self):
  opener=wire.Opener(self.v);client=self.client(opener);client.inspect('early');active=opener.calls[-1][0];client.clock=lambda:1201;opener.changes={'raw':b'<html>ordinary</html>','headers':{'Content-Type':'text/html'}};r=client.normal(snapshot.TOKEN,method='POST');expired=opener.calls[-1][0];self.assertEqual(active.full_url,expired.full_url);self.assertEqual(active.data,expired.data);self.assertEqual(active.method,expired.method);self.assertEqual(r['method'],'POST');self.assertNotIn(snapshot.TOKEN,json.dumps(r));opener.changes['headers']['CF-Cache-Status']='HIT'
  with self.assertRaises(RuntimeError):client.normal(snapshot.TOKEN,method='POST')
  self.assertEqual(client.last_failure['status'],200)
 def test_only_whitelisted_capability_error_metadata_is_saved_from_409_json(self):
  class CapabilityError:
   def __init__(self,body):self.body=body;self.calls=0
   def open(self,request,timeout):
    self.calls+=1;headers=Message();headers['Content-Type']='application/json';raise urllib.error.HTTPError(request.full_url,409,'private message',headers,io.BytesIO(backup.encode(self.body)))
  body={'error':'entry_capability_unavailable','requiredFunctions':{k:True for k in probe.FUNCTIONS}};body['requiredFunctions']['nocache_headers']=False;opener=CapabilityError(body);client=self.client(opener)
  with self.assertRaises(RuntimeError):client.inspect('early')
  self.assertEqual(client.last_failure['safeCapabilityError'],body);self.assertEqual(opener.calls,1)
  opener=CapabilityError({'error':'entry_capability_unavailable','requiredFunctions':body['requiredFunctions'],'rawRows':['private']});client=self.client(opener)
  with self.assertRaises(RuntimeError):client.inspect('early')
  self.assertNotIn('safeCapabilityError',client.last_failure);self.assertNotIn('private',json.dumps(client.last_failure))

if __name__=='__main__':unittest.main()
