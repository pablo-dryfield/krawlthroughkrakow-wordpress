import copy,hashlib,json,tempfile,unittest
from pathlib import Path,PurePosixPath
from unittest import mock
from tools import full_private_engine_client as full_client
from tools import full_private_seed_packet as full
from tools import content_update_backup as backup
from tools.content_update_client import ContentUpdateClient,UncertainRequest

class FullPrivateEngineClientTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix='ktk-full-client-');self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name);self.large='ktk-code-pages-assets/media/large.bin';source={'ktk-code-pages.php':b'renderer','ktk-code-pages-assets/registry.php':b'registry','ktk-code-pages-assets/runtime.css':b'css','ktk-code-pages-assets/runtime.js':b'js','ktk-code-pages-assets/content/about.html':b'body',self.large:b'0123456789abcdef'*(18*1024*1024//16)}
  self.owned={n:backup.sha(b) for n,b in source.items()};self.sizes={n:len(b) for n,b in source.items()}
  for n,b in source.items():p=self.root/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
  self.plan,_,self.overrides=full.plan('a'*32,'c'*40,self.owned,self.sizes,'f'*64);self.files,self.dirs=full.expected_seed_files(self.plan,self.sizes,self.overrides);self.binding=full.binding(self.plan);self.root_binding='1'*64;self.transport=mock.Mock();self.client=full_client.FullPrivateEngineClient(self.plan,self.sizes,self.overrides,self.root,'e'*64,'d'*64,self.transport,lambda _:b'')
 def seed(self,files=None,directories=None):
  files={} if files is None else copy.deepcopy(files);dirs=sorted(set(directories if directories is not None else [p.as_posix() for n in files for p in PurePosixPath(n).parents if p.as_posix()!='.']));rows=files or []
  return {'stateSha256':full.seed_digest(self.root_binding,self.plan,rows,dirs),'files':rows,'directories':dirs,'sourceComplete':'source' in dirs and all(files.get(n)==r for n,r in self.files.items() if n.startswith('source/')),'targetComplete':'target' in dirs and all(files.get(n)==r for n,r in self.files.items() if n.startswith('target/')),'copiedBytes':sum(r['bytes'] for r in files.values()),'applicationWrites':0,'databaseWrites':0,'cachePurges':0}
 def envelope(self,seed=None,root=True):
  seed=self.seed() if seed is None else seed;p={'rootExists':root,'originalCaptureTime':'2026-11-16T14:00:00+00:00' if root else None,'recordsComplete':root,'seedsComplete':seed['sourceComplete'] and seed['targetComplete'] if root else False,'enginePhase':None,'controlFiles':[],'seedFiles':seed['files'] if root else [],'engineFiles':[],'fullSeed':seed if root else None,'rootBinding':self.root_binding if root else None}
  return {'privateProfile':full_client.PROFILE,'helperSha256':'e'*64,'controller':{'schemaVersion':1,'mode':'private-staging-rehearsal',**self.binding,'stateSha256':'2'*64,'preparation':p,'productionAuthorizationProvided':False,'applicationWrites':0,'databaseWrites':0,'activationWrites':0,'cachePurges':0}}
 def test_known_large_unchanged_file_is_retained_and_default_validator_still_refuses_it(self):
  e=self.envelope(self.seed({'source/'+self.large:self.files['source/'+self.large]}));v=self.client.validate_preparation(e);self.assertEqual(v,e['controller']);self.assertGreater(v['preparation']['seedFiles']['source/'+self.large]['bytes'],16779264)
  old=copy.deepcopy(e);old.pop('privateProfile');p=old['controller']['preparation'];p.pop('fullSeed');p.pop('rootBinding')
  base=ContentUpdateClient(self.binding,'e'*64,'d'*64,lambda _:None,lambda _:b'')
  with self.assertRaises(ValueError):base.validate_preparation(old)
 def test_exact_original_partial_prefix_validates_and_changed_hash_or_size_refuses(self):
  n='source/'+self.large;row={'bytes':65536,'sha256':hashlib.sha256((self.root/self.large).read_bytes()[:65536]).hexdigest()};e=self.envelope(self.seed({n:row}));self.assertEqual(self.client.validate_preparation(e),e['controller'])
  for changed in ({**row,'sha256':'f'*64},{**row,'bytes':65535},{**row,'bytes':True},{**row,'bytes':self.sizes[self.large]+1}):
   bad=self.envelope(self.seed({n:changed}))
   with self.assertRaises(ValueError):self.client.validate_preparation(bad)
 def test_changed_reviewed_local_prefix_is_refused_without_transport_or_fallback(self):
  n='source/'+self.large;row={'bytes':65536,'sha256':hashlib.sha256((self.root/self.large).read_bytes()[:65536]).hexdigest()};e=self.envelope(self.seed({n:row}));p=self.root/self.large
  with p.open('r+b') as stream:stream.write(b'CHANGED')
  with self.assertRaises(ValueError):self.client.validate_preparation(e)
  self.transport.assert_not_called()
 def test_unknown_paths_extra_fields_missing_parents_and_false_byte_count_are_refused(self):
  base=self.envelope(self.seed({'source/'+self.large:self.files['source/'+self.large]}));cases=[]
  for field,value in [('copiedBytes',1),('sourceComplete',True),('directories',['source']),('databaseWrites',1),('stateSha256','f'*64)]:e=copy.deepcopy(base);e['controller']['preparation']['fullSeed'][field]=value;cases.append(e)
  e=copy.deepcopy(base);e['controller']['preparation']['fullSeed']['files']['source/../owner']=self.files['source/'+self.large];cases.append(e)
  e=copy.deepcopy(base);e['controller']['preparation']['fullSeed']['unknown']=True;cases.append(e)
  for e in cases:
   with self.assertRaises(ValueError):self.client.validate_preparation(e)
 def test_target_cannot_precede_complete_source_and_engine_cannot_precede_both(self):
  target=next(n for n in self.files if n.startswith('target/'));e=self.envelope(self.seed({target:self.files[target]}))
  with self.assertRaises(ValueError):self.client.validate_preparation(e)
  e=self.envelope();e['controller']['preparation']['enginePhase']='prepared'
  with self.assertRaises(ValueError):self.client.validate_preparation(e)
 def test_complete_seed_maps_are_validated_without_discarding_any_large_row(self):
  seed=self.seed(self.files,self.dirs);e=self.envelope(seed);self.assertTrue(seed['sourceComplete'] and seed['targetComplete']);self.assertEqual(self.client.validate_preparation(e),e['controller']);self.assertEqual(len(e['controller']['preparation']['seedFiles']),len(self.files))
 def test_controller_seed_projection_root_binding_and_signed_record_order_must_match(self):
  e=self.envelope();self.client.validate_preparation(e)
  changed=copy.deepcopy(e);changed['controller']['preparation']['rootBinding']='3'*64
  with self.assertRaises(ValueError):self.client.validate_preparation(changed)
  n='source/'+self.large;e=self.envelope(self.seed({n:self.files[n]}));e['controller']['preparation']['seedFiles']=[]
  with self.assertRaises(ValueError):self.client.validate_preparation(e)
  e=self.envelope(self.seed({n:self.files[n]}));e['controller']['preparation']['recordsComplete']=False
  with self.assertRaises(ValueError):self.client.validate_preparation(e)
 def test_profile_helper_identity_zero_write_and_control_engine_member_budgets_remain_strict(self):
  base=self.envelope();cases=[]
  for field,value in [('privateProfile','production'),('helperSha256','f'*64)]:e=copy.deepcopy(base);e[field]=value;cases.append(e)
  e=copy.deepcopy(base);e['unknown']=1;cases.append(e)
  for field,value in [('mode','production'),('productionAuthorizationProvided',True),('databaseWrites',1)]:e=copy.deepcopy(base);e['controller'][field]=value;cases.append(e)
  for kind,name in [('controlFiles','original-state.json'),('engineFiles','prior/ktk-code-pages.php')]:e=copy.deepcopy(base);e['controller']['preparation'][kind]={name:{'bytes':16779265,'sha256':'e'*64}};cases.append(e)
  for e in cases:
   with self.assertRaises(ValueError):self.client.validate_preparation(e)
 def test_absent_root_is_valid_only_without_claimed_records_seeds_or_engine(self):
  e=self.envelope(root=False);self.assertEqual(self.client.validate_preparation(e),e['controller']);e['controller']['preparation']['rootBinding']=self.root_binding
  with self.assertRaises(ValueError):self.client.validate_preparation(e)
 def test_deferred_dispatch_uses_one_request_and_refuses_an_engine_response_to_prepare(self):
  e=self.envelope();self.transport.return_value=e;self.assertEqual(self.client.prepare(),e['controller']);self.assertIsNone(self.client.state);self.assertEqual(self.client.preparation_state,e['controller']);self.transport.assert_called_once();self.assertEqual(json.loads(self.transport.call_args.args[0])['action'],'prepare')
  self.transport.reset_mock();self.transport.return_value={'privateProfile':full_client.PROFILE,'helperSha256':'e'*64,'controller':{'engine':{}}}
  with self.assertRaises(UncertainRequest):self.client.prepare()
  self.transport.assert_called_once();self.assertIsNone(self.client.state);self.assertIsNone(self.client.preparation_state)
 def test_uncertain_transport_is_never_retried_and_leaves_no_mutation_state(self):
  self.transport.side_effect=TimeoutError('private diagnostics must not escape')
  with self.assertRaises(UncertainRequest) as error:self.client.prepare()
  self.assertNotIn('private diagnostics',str(error.exception));self.transport.assert_called_once();self.assertIsNone(self.client.state);self.assertIsNone(self.client.preparation_state)
 def test_recovery_requires_inspected_progress_and_does_not_loop(self):
  before=self.envelope();after=self.envelope();after['controller']['stateSha256']='3'*64;after['controller']['preparation']['originalCaptureTime']='2026-11-16T14:00:01+00:00';self.transport.side_effect=[before,after];self.assertEqual(self.client.recover_preparation(),after['controller']);self.assertEqual(self.transport.call_count,2)
  self.transport.reset_mock();self.transport.side_effect=[before,before]
  with self.assertRaises(UncertainRequest):self.client.recover_preparation()
  self.assertEqual(self.transport.call_count,2)

if __name__=='__main__':unittest.main()
