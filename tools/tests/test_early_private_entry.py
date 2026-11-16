import time,unittest
from unittest import mock
from tools import early_private_entry as early
from tools import full_private_seed_packet as full
from tools import content_update_backup as backup
from tools import content_update_staging_packet as old
from tools.tests import test_staging_protected_state as state
from tools.tests import test_private_entry_probe as observed

class EarlyPrivateCompilerTests(unittest.TestCase):
 def test_full_helper_early_inverse_is_exact_default_late_and_all_old_components_remain(self):
  source=old.seeds()['source'];owned={n:backup.sha(b) for n,b in source.items()};sizes={n:len(b) for n,b in source.items()};args=('ktk-transaction-rehearsal-'+'a'*32+'.php','b'*43,int(time.time())+600,'c'*40,owned,sizes,'f'*64,'d'*64)
  late=full.helper_source(*args);self.assertEqual(late,full.helper_source(*args,entry_profile='late'));compiled=full.helper_source(*args,entry_profile='early')
  self.assertEqual(compiled.count(early.GUARD),1);self.assertEqual(compiled.replace(early.GUARD,b'',1).replace(early.EARLY_HOOK,early.OLD_HOOK,1),late)
  for filename in full.COMPONENTS.values():self.assertIn((full.ROOT/'tools'/filename).read_bytes()[6:],compiled)
  self.assertLess(compiled.index(b'hash_equals('),compiled.index(early.GUARD));self.assertLess(compiled.index(early.GUARD),compiled.index(b'$controller=new KTK_Full'))
 def test_snapshot_early_inverse_is_exact_legacy_compiler_output_including_raw_core(self):
  expiry=int(time.time())+600;compiled=early.snapshot_source(state.NAME,state.TOKEN,expiry);late=state.module.helper_source(state.NAME,state.TOKEN,expiry)
  self.assertEqual(compiled.replace(early.GUARD,b'',1).replace(early.EARLY_HOOK,early.OLD_HOOK,1),late);self.assertIn(state.module.CORE.read_bytes()[6:],compiled)
 def test_rebinding_is_explicit_atomic_and_refuses_changed_or_already_early_source(self):
  source=state.module.helper_source(state.NAME,state.TOKEN,int(time.time())+600)
  for value in [None,b'<?php\n',source+early.OLD_HOOK,source.replace(b'hash_equals(',b'unsafe_compare('),source.replace(b'{ return; }',b'{ echo 1; }'),source.replace(early.ANCHOR,b'changed();'),early.rebind(source)]:
   with self.assertRaises(ValueError):early.rebind(value)
 def test_unknown_full_entry_profile_refused_before_any_compilation(self):
  for profile in ('production','auto',None,True):
   with self.assertRaises(ValueError):full.helper_source(None,None,None,None,None,None,None,None,entry_profile=profile)

DRIVER=observed.DRIVER.replace('HTTP_X_KTK_ENTRY_PROBE_TOKEN','HTTP_X_KTK_SNAPSHOT_TOKEN').replace("function is_multisite(){return false;}","function is_multisite(){return !empty($GLOBALS['c']['multisite']);}").replace("$GLOBALS['phases']['muplugins_loaded']=1;","$GLOBALS['phases']['muplugins_loaded']=$c['wrongPhase']?2:1;")

@unittest.skipUnless(state.PHP,'Real PHP required for early private bootstrap/state boundaries')
class EarlyPrivateSnapshotPHPTests(unittest.TestCase):
 def fixture(self,early_profile=True,**changes):
  def mutate(c,mu,store):
   c.update(profile='early',identifier='a'*32,missingNoCache=False,multisite=False,wrongPhase=False);c.update(changes)
   plugin=store.parent/'fixture-ecwid/entry.php';plugin.parent.mkdir();plugin.write_bytes(b'<?php $GLOBALS["ordinary_marker"]=true;')
   expiry=int(time.time())+600;source=(early.snapshot_source if early_profile else state.module.helper_source)(state.NAME,state.TOKEN,expiry)
   if c.pop('expired',False):source=source.replace(str(expiry).encode(),b'1',1)
   (mu/state.NAME).write_bytes(source)
  with mock.patch.object(state,'DRIVER',DRIVER):out,_=state.SnapshotPHPTests().fixture(mutate)
  return out
 def test_early_snapshot_preserves_all_seven_raw_tables_and_public_protected_state_before_plugin_entry(self):
  a=self.fixture();b=self.fixture(False);self.assertEqual(a['status'],200);self.assertEqual(b['status'],200);self.assertFalse(a['ordinaryMarker']);self.assertTrue(b['ordinaryMarker'])
  for k in ('identity','database','databaseSha256','protectedFiles','ownedContentFiles','protectedStateSha256','rowCounts'):self.assertEqual(a['body'][k],b['body'][k],k)
  self.assertEqual(len(a['queries']),7);self.assertTrue(all(q.startswith('SELECT ') for q in a['queries']));self.assertFalse(any(x in q for q in a['queries'] for x in ('users','orders','payments','comments')))
 def test_missing_wrong_and_expired_tokens_continue_ordinary_loading_without_private_queries(self):
  for changes in ({'token':''},{'token':'x'*43},{'expired':True}):
   out=self.fixture(**changes);self.assertTrue(out['noProbe']);self.assertTrue(out['ordinaryMarker']);self.assertEqual(out['queries'],[])
 def test_wrong_host_site_method_and_public_indexing_refuse_before_queries(self):
  for changes in ({'method':'GET'},{'host':'other.invalid'},{'home':'https://krawlthroughkrakow.com/'},{'siteurl':'https://other.invalid/'},{'public':1}):
   out=self.fixture(**changes);self.assertEqual(out['status'],403);self.assertEqual(out['queries'],[]);self.assertFalse(out['ordinaryMarker'])
 def test_unverified_phase_missing_capability_and_multisite_refuse_with_bounded_native_error(self):
  for changes in ({'wrongPhase':True},{'missingNoCache':True},{'multisite':True}):self.assertEqual(self.fixture(**changes),{'error':'private_early_context_unavailable'})
 def test_database_failure_and_unsafe_table_keep_original_fail_closed_behavior(self):
  for changes in ({'dbError':True},{'unsafeTable':True}):
   out=self.fixture(**changes);self.assertEqual(out['status'],409);self.assertEqual(out['body'],{'error':'protected_snapshot_failed'});self.assertFalse(out['ordinaryMarker']);self.assertNotIn('private diagnostic',str(out))

if __name__=='__main__':unittest.main()
