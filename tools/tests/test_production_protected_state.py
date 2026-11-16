import ast,contextlib,hashlib,importlib.util,io,json,shutil,subprocess,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2];PHP=shutil.which('php')
spec=importlib.util.spec_from_file_location('production_capture_builder',ROOT/'tools/build-production-state-core.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
CORE=ROOT/'tools/production-protected-state-core.php'
FINGERPRINT=ROOT/'tools/production-protected-fingerprint.php'
NAME='ktk-production-state-snapshot-'+'a'*32+'.php'
DRIVER=r'''<?php
$c=json_decode(file_get_contents($argv[1]),true,512,JSON_THROW_ON_ERROR);$GLOBALS['c']=$c;
if(!$c['noConstants']){define('ABSPATH',$c['site'].'/');define('WP_CONTENT_DIR',$c['content']);}
define('ARRAY_A','ARRAY_A');
function home_url($path){return $GLOBALS['c']['home'];}
function site_url($path){return $GLOBALS['c']['siteurl'];}
function get_option($name){return $name==='blog_public'?$GLOBALS['c']['public']:278;}
function wp_get_environment_type(){return 'production';}
class FixtureDB {
 public $posts='fixture_posts',$postmeta='fixture_postmeta',$options='fixture_options',$terms='fixture_terms',$term_taxonomy='fixture_term_taxonomy',$term_relationships='fixture_term_relationships',$termmeta='fixture_termmeta',$last_error='',$queries=array();
 public function get_results($query,$format){$this->queries[]=$query;if($GLOBALS['c']['dbError']){$this->last_error='private-db-diagnostic-never-export';return null;}preg_match('/^SELECT \* FROM ([A-Za-z0-9_]+)/',$query,$match);return $GLOBALS['c']['rows'][substr($match[1]??'',8)]??array();}
}
$wpdb=new FixtureDB();if($c['unsafeTable']){$wpdb->posts='bad; DELETE';}
if($c['defineAllowed']){define('KTK_PRODUCTION_STATE_ALLOWED',$c['allowedValue']);}
$reentered=false;
try {
 try {require $c['core'];}catch(Throwable $error){if(!$c['reenter']){throw $error;}$reentered=true;}
 $capture=$c['capture'];if(!in_array($capture,array('ktk_capture_production_original_state','ktk_capture_production_protected_fingerprint'),true)){throw new RuntimeException('Fixture capture name');}$value=$capture($c['helper']);
 echo json_encode(array('ok'=>true,'value'=>$value,'queries'=>$wpdb->queries,'reentered'=>$reentered),JSON_THROW_ON_ERROR);
}catch(Throwable $error){echo json_encode(array('ok'=>false,'errorClass'=>get_class($error),'errorMessage'=>$error->getMessage(),'queries'=>$wpdb->queries,'reentered'=>$reentered),JSON_THROW_ON_ERROR);}
'''

class ProductionCaptureSourceTests(unittest.TestCase):
 def test_complete_capture_inverse_and_default_check_are_exact_without_writes(self):
  source=builder.SOURCE.read_bytes();rendered=builder.render(source);self.assertEqual(rendered,CORE.read_bytes());self.assertEqual(builder.inverse(rendered),source);stamp=CORE.stat().st_mtime_ns
  with patch('sys.argv',['build-production-state-core']),contextlib.redirect_stdout(io.StringIO()):builder.main()
  self.assertEqual(CORE.stat().st_mtime_ns,stamp);self.assertEqual(builder.SOURCE.read_bytes(),source)
 def test_changed_staging_capture_refuses_before_overwriting_an_existing_output(self):
  with tempfile.TemporaryDirectory() as directory:
   source=Path(directory)/'source.php';target=Path(directory)/'target.php';source.write_bytes(builder.SOURCE.read_bytes()+b'\n');target.write_bytes(b'preserve')
   with patch.object(builder,'SOURCE',source),patch.object(builder,'TARGET',target),patch('sys.argv',['build-production-state-core','--write']):
    with self.assertRaises(ValueError):builder.main()
   self.assertEqual(target.read_bytes(),b'preserve')
 def test_modified_capture_body_or_missing_production_barrier_cannot_pass_inverse(self):
  original=CORE.read_bytes()
  for changed in [original.replace(b'SELECT * FROM ',b'SELECT private FROM ',1),original.replace(builder.CALLER_GUARD.encode(),b'',1),original.replace(builder.ACTIVATION_GUARD.encode(),b'',1)]:
   self.assertNotEqual(changed,original)
   with self.assertRaises(ValueError):builder.inverse(changed)
 def test_fingerprint_has_a_complete_inverse_and_cannot_silently_skip_protected_files(self):
  value=builder.fingerprint(CORE.read_bytes());self.assertEqual(value,FINGERPRINT.read_bytes());self.assertEqual(builder.fingerprint_inverse(value),CORE.read_bytes());self.assertEqual(builder.inverse(builder.fingerprint_inverse(value)),builder.SOURCE.read_bytes())
  changed=value.replace(b"$name === 'ktk-code-pages.php'",b"$name === 'ktk-homepage-shortcode.php'",1)
  with self.assertRaises(ValueError):builder.fingerprint_inverse(changed)

@unittest.skipUnless(PHP,'PHP required for simulated WordPress capture fixtures')
class ProductionCapturePHPTests(unittest.TestCase):
 core_file=CORE
 capture_name='ktk_capture_production_original_state'
 scope_name='production-protected-original-state'
 include_owned=True
 @contextlib.contextmanager
 def fixture(self,nested=False):
  with tempfile.TemporaryDirectory(prefix='ktk-production-state-fixture-') as directory:
   root=Path(directory);site=root/('public_html/staging' if nested else 'public_html');mu=site/'wp-content/mu-plugins';store=site/'wp-content/plugins/ktk-storefront';mu.mkdir(parents=True);store.mkdir(parents=True)
   activation=next(ast.literal_eval(n.value) for n in ast.parse((ROOT/'tools/promote-code-pages-production.py').read_text(encoding='utf-8')).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='ACTIVATION_SOURCE' for t in n.targets));self.assertEqual(hashlib.sha256(activation).hexdigest(),builder.ACTIVATION_SHA)
   files={'ktk-code-pages.php':b'old renderer','ktk-code-pages-assets/registry.php':b'old registry','ktk-homepage-shortcode.php':b'protected homepage','ktk-code-pages-production.php':activation,NAME:b'<?php // exact own fixture helper\n'}
   for name,value in files.items():p=mu/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(value)
   (store/'plugin.php').write_bytes(b'protected commerce');(store/'frontend').mkdir();(store/'frontend/local-only.txt').write_bytes(b'local input excluded by existing capture scope')
   rows={'posts':[{'ID':'278','post_type':'page','post_content':'saved original page'}],'postmeta':[{'meta_id':'1','post_id':'278','meta_value':'saved original metadata'}],'options':[{'option_name':'home','option_value':'https://krawlthroughkrakow.com'},{'option_name':'siteurl','option_value':'https://krawlthroughkrakow.com/'},{'option_name':'blog_public','option_value':'1'}],'terms':[],'term_taxonomy':[],'term_relationships':[],'termmeta':[]}
   config={'site':site.as_posix(),'content':(site/'wp-content').as_posix(),'home':'https://krawlthroughkrakow.com/','siteurl':'https://krawlthroughkrakow.com/','public':1,'helper':(mu/NAME).as_posix(),'core':self.core_file.as_posix(),'capture':self.capture_name,'defineAllowed':True,'allowedValue':True,'reenter':False,'noConstants':False,'dbError':False,'unsafeTable':False,'rows':rows}
   driver=root/'driver.php';driver.write_bytes(DRIVER.encode());yield root,mu,config,driver
 def run_capture(self,root,config,driver):
  path=root/'config.json';path.write_bytes(json.dumps(config).encode());before={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file() and not p.is_symlink()};result=subprocess.run([PHP,str(driver),str(path)],capture_output=True,text=True,check=True);self.assertEqual(result.stderr,'');value=json.loads(result.stdout);after={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file() and not p.is_symlink()};self.assertEqual(after,before);return value
 def test_simulated_active_production_captures_only_selected_reads_and_never_writes(self):
  with self.fixture() as (root,mu,config,driver):
   result=self.run_capture(root,config,driver);self.assertTrue(result['ok']);self.assertEqual(len(result['queries']),7);self.assertTrue(all(q.startswith('SELECT * FROM fixture_') for q in result['queries']));self.assertFalse(any(token in ' '.join(result['queries']).lower() for token in ['customer','payment','users','insert ','delete ','update ']));value=result['value'];self.assertEqual(value['scope'],self.scope_name);self.assertEqual(bool(value['ownedContentFiles']),self.include_owned);self.assertEqual(value['database'],config['rows']);self.assertIn('mu/ktk-code-pages-production.php',value['protectedFiles']);self.assertIn('mu/ktk-homepage-shortcode.php',value['protectedFiles']);self.assertNotIn('mu/'+NAME,value['protectedFiles']);self.assertEqual(value['helperSha256'],hashlib.sha256((mu/NAME).read_bytes()).hexdigest());self.assertEqual([value[k] for k in ('databaseWrites','applicationWrites','cachePurges')],[0,0,0])
 def test_missing_false_or_reentered_caller_flag_refuses_before_queries(self):
  for define,allowed,reenter in [(False,True,False),(True,False,False),(False,True,True),(True,False,True)]:
   with self.fixture() as (root,mu,config,driver):
    config.update(defineAllowed=define,allowedValue=allowed,reenter=reenter);result=self.run_capture(root,config,driver);self.assertFalse(result['ok']);self.assertEqual(result['queries'],[]);self.assertEqual(result['reentered'],reenter)
 def test_wrong_site_identity_or_undefined_roots_refuses_before_queries(self):
  for key,value in [('home','https://krawlthroughkrakow.com/staging/'),('siteurl','https://example.org/'),('public',0),('noConstants',True)]:
   with self.fixture() as (root,mu,config,driver):
    config[key]=value;result=self.run_capture(root,config,driver);self.assertFalse(result['ok']);self.assertEqual(result['queries'],[])
 def test_missing_or_changed_active_marker_refuses_before_queries(self):
  for missing in (True,False):
   with self.fixture() as (root,mu,config,driver):
    marker=mu/'ktk-code-pages-production.php'
    if missing:marker.unlink()
    else:marker.write_bytes(b'changed activation')
    result=self.run_capture(root,config,driver);self.assertFalse(result['ok']);self.assertEqual(result['queries'],[])
 def test_staging_or_wrong_content_filesystem_refuses_before_queries(self):
  with self.fixture(nested=True) as (root,mu,config,driver):
   result=self.run_capture(root,config,driver);self.assertFalse(result['ok']);self.assertEqual(result['queries'],[])
  with self.fixture() as (root,mu,config,driver):
   other=root/'other-content';other.mkdir();config['content']=other.as_posix();result=self.run_capture(root,config,driver);self.assertFalse(result['ok']);self.assertEqual(result['queries'],[])
 def test_unowned_noncanonical_and_outside_helper_paths_refuse_before_queries(self):
  for kind in ('unowned','alias','outside'):
   with self.fixture() as (root,mu,config,driver):
    if kind=='alias':config['helper']=mu.as_posix()+'/../mu-plugins/'+NAME
    else:
     path=mu/'ktk-state-snapshot-ordinary.php' if kind=='unowned' else root/NAME;path.write_bytes(b'<?php // unowned path fixture');config['helper']=path.as_posix()
    result=self.run_capture(root,config,driver);self.assertFalse(result['ok']);self.assertEqual(result['queries'],[])
 def test_saved_database_identity_must_match_the_runtime_production_identity(self):
  for key,bad in [('home','https://krawlthroughkrakow.com/staging'),('siteurl','https://example.org'),('blog_public','0')]:
   with self.fixture() as (root,mu,config,driver):
    next(row for row in config['rows']['options'] if row['option_name']==key)['option_value']=bad;result=self.run_capture(root,config,driver);self.assertFalse(result['ok']);self.assertEqual(len(result['queries']),7)
 def test_unsafe_table_name_is_rejected_before_queries(self):
  with self.fixture() as (root,mu,config,driver):
   config['unsafeTable']=True;result=self.run_capture(root,config,driver);self.assertFalse(result['ok']);self.assertEqual(result['queries'],[])
 def test_query_failure_is_generic_without_raw_database_diagnostics(self):
  with self.fixture() as (root,mu,config,driver):
   config['dbError']=True;result=self.run_capture(root,config,driver);self.assertFalse(result['ok']);self.assertEqual(len(result['queries']),1);self.assertEqual(result['errorMessage'],'Protected query failed');self.assertNotIn('private-db-diagnostic',json.dumps(result))
 def test_repeated_selected_capture_keeps_stable_database_and_protected_hashes(self):
  with self.fixture() as (root,mu,config,driver):
   first=self.run_capture(root,config,driver)['value'];second=self.run_capture(root,config,driver)['value']
   for key in ['database','databaseSha256','protectedFiles','ownedContentFiles','protectedStateSha256']:self.assertEqual(first[key],second[key])
 def test_other_helper_and_unknown_mu_file_are_protected_and_external_change_is_detected(self):
  with self.fixture() as (root,mu,config,driver):
   other='ktk-production-transaction-update-'+'b'*32+'.php';(mu/other).write_bytes(b'other owned by somebody else');extra=mu/'operator-draft.php';extra.write_bytes(b'prior external bytes');first=self.run_capture(root,config,driver)['value'];self.assertIn('mu/'+other,first['protectedFiles']);self.assertIn('mu/operator-draft.php',first['protectedFiles']);extra.write_bytes(b'changed externally');second=self.run_capture(root,config,driver)['value'];self.assertNotEqual(first['protectedStateSha256'],second['protectedStateSha256']);self.assertEqual(first['databaseSha256'],second['databaseSha256']);self.assertEqual(first['ownedContentFiles'],second['ownedContentFiles'])
 def test_helper_marker_and_protected_tree_symlinks_are_never_followed(self):
  for kind in ('helper','activation','protected'):
   with self.fixture() as (root,mu,config,driver):
    if kind=='helper':path=mu/NAME
    elif kind=='activation':path=mu/'ktk-code-pages-production.php'
    else:path=mu/'external-link.php'
    target=root/'link-target.txt';target.write_bytes(path.read_bytes() if path.exists() else b'outside protected tree')
    if path.exists():path.unlink()
    try:path.symlink_to(target)
    except OSError:self.skipTest('This host cannot create the required filesystem symlink fixture')
    result=self.run_capture(root,config,driver);self.assertFalse(result['ok']);self.assertEqual(len(result['queries']),7 if kind=='protected' else 0)

class ProductionFingerprintPHPTests(ProductionCapturePHPTests):
 core_file=FINGERPRINT
 capture_name='ktk_capture_production_protected_fingerprint'
 scope_name='production-protected-fingerprint'
 include_owned=False
 def test_full_and_fingerprint_have_identical_protected_hashes_and_explicitly_different_inventory_scope(self):
  with self.fixture() as (root,mu,config,driver):
   fingerprint=self.run_capture(root,config,driver)['value'];config.update(core=CORE.as_posix(),capture='ktk_capture_production_original_state');full=self.run_capture(root,config,driver)['value']
   for key in ['identity','database','databaseSha256','protectedFiles','protectedStateSha256','helperSha256']:self.assertEqual(fingerprint[key],full[key])
   self.assertFalse(fingerprint['ownedInventoryIncluded']);self.assertEqual(fingerprint['ownedContentFiles'],{} if isinstance(fingerprint['ownedContentFiles'],dict) else []);self.assertTrue(full['ownedContentFiles']);self.assertNotEqual(fingerprint['scope'],full['scope'])

if __name__=='__main__':unittest.main()
