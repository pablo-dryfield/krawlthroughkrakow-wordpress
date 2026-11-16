import copy,os,shutil,tempfile,time,unittest
from pathlib import Path
from unittest import mock
from tools import full_private_seed_recovery as recovery
from tools import content_update_recovery as legacy
from tools.tests.test_full_private_seed_recovery import fixture

def early_packet():return {**fixture(),'entryProfile':'early','scope':'full-private-seed-early-caller-recovery'}

def fake_crypto(raw,transaction,encrypt):
 if encrypt:return b'SYNTHETIC-ENCRYPTED:'+raw
 if not raw.startswith(b'SYNTHETIC-ENCRYPTED:'):raise ValueError('Synthetic crypto fixture context')
 return raw[len(b'SYNTHETIC-ENCRYPTED:'):]

class EarlyPrivateRecoveryTests(unittest.TestCase):
 @unittest.skipUnless(shutil.which('php'),'Real PHP required for fresh-witness disposal compiler fixture')
 def test_fresh_witness_disposal_compiler_preserves_original_early_helper_binding(self):
  from tools.tests import test_private_seed_disposal_support as support
  case=support.DisposalSupportTests('runTest');case.setUp();self.addCleanup(case.doCleanups)
  value={**case.v,'expires':int(time.time())+600};original={**case.old,'entryProfile':'early','scope':'full-private-seed-early-caller-recovery'}
  legacy_source=support.d.helper_source(value,case.old,case.manifest);early_source=support.d.helper_source(value,original,case.manifest)
  self.assertEqual(early_source,legacy_source);self.assertEqual(original['helperSha256'],case.old['helperSha256']);self.assertNotIn(b'new KTK_Active_Content_Transaction',early_source)
 def test_legacy_and_explicit_early_profiles_validate_with_distinct_exact_fields(self):
  a=fixture();b=early_packet();self.assertEqual(recovery.profile(a),'late');self.assertEqual(recovery.profile(b),'early');self.assertEqual(recovery.validate_packet(a),a);self.assertEqual(recovery.validate_packet(b),b);self.assertNotIn('entryProfile',a)
 def test_missing_mismatched_implicit_or_unknown_profile_context_is_refused(self):
  a=fixture();b=early_packet()
  for value in ({**a,'entryProfile':'early'},{**b,'scope':a['scope']},{**a,'scope':b['scope']},{**a,'entryProfile':'late'},{**b,'entryProfile':'auto'},{**b,'entryProfile':True},{**b,'mode':'production'}):
   with self.assertRaises(ValueError):recovery.validate_packet(value)
 def test_both_profiles_round_trip_and_cross_magic_relabeling_is_refused(self):
  with mock.patch.object(legacy,'_dpapi',side_effect=fake_crypto):
   for value,magic,other in ((fixture(),recovery.MAGIC,recovery.EARLY_MAGIC),(early_packet(),recovery.EARLY_MAGIC,recovery.MAGIC)):
    blob=recovery.seal(value);self.assertTrue(blob.startswith(magic));self.assertEqual(recovery.unseal(blob,value['transactionId']),value)
    with self.assertRaises(ValueError):recovery.unseal(other+blob[len(magic):],value['transactionId'])
 def test_foreign_transaction_and_cipher_checksum_stop_before_decryption(self):
  value=early_packet()
  with mock.patch.object(legacy,'_dpapi',side_effect=fake_crypto):blob=recovery.seal(value)
  with mock.patch.object(legacy,'_dpapi',side_effect=AssertionError('no decryption for unverified envelope')):
   for candidate,transaction in ((blob,'e'*32),(blob+b'x',value['transactionId']),(blob.replace(recovery.EARLY_MAGIC,b'KTK-UNKNOWN\n',1),value['transactionId'])):
    with self.assertRaises(ValueError):recovery.unseal(candidate,transaction)
 def test_explicit_early_context_keeps_plan_source_token_and_lifetime_guards(self):
  value=early_packet();cases=[{**value,'expires':int(time.time())+4000},{**value,'token':'wrong'},{**value,'sourceHashes':{'../outside':'e'*64}}];changed=copy.deepcopy(value);changed['plan']['prior'].pop('ktk-code-pages-assets/runtime.js');cases.append(changed)
  for v in cases:
   with self.assertRaises(ValueError):recovery.validate_packet(v,int(time.time()))
 def test_encryption_failure_creates_no_packet_or_plaintext_fallback(self):
  with tempfile.TemporaryDirectory(prefix='ktk-early-no-fallback-') as d:
   with mock.patch.object(legacy,'_dpapi',side_effect=RuntimeError('Synthetic unavailable DPAPI')):
    with self.assertRaises(RuntimeError):recovery.FullSeedPacketVault(Path(d).resolve()).save(early_packet())
   self.assertEqual(list(Path(d).iterdir()),[])

@unittest.skipUnless(os.name=='nt','Current-user native Windows early-profile recovery contract')
class EarlyPrivateNativeTests(unittest.TestCase):
 def test_native_early_packet_is_durable_encrypted_and_distinct_from_default_profile(self):
  with tempfile.TemporaryDirectory(prefix='ktk-early-native-') as d:
   value=early_packet();vault=recovery.FullSeedPacketVault(Path(d).resolve());receipt=vault.save(value);blob=vault.path(value['transactionId']).read_bytes()
   self.assertTrue(receipt['durableDecryptReadbackVerified']);self.assertFalse(receipt['productionAuthorized']);self.assertTrue(blob.startswith(recovery.EARLY_MAGIC));self.assertNotIn(value['token'].encode(),blob);self.assertNotIn(value['ownershipKey'].encode(),blob);self.assertEqual(vault.load(value['transactionId']),value)
 def test_native_profile_relabeling_is_refused_and_old_profile_remains_readable(self):
  for value,magic,other in ((fixture(),recovery.MAGIC,recovery.EARLY_MAGIC),(early_packet(),recovery.EARLY_MAGIC,recovery.MAGIC)):
   blob=recovery.seal(value);self.assertEqual(recovery.unseal(blob,value['transactionId']),value)
   with self.assertRaises(ValueError):recovery.unseal(other+blob[len(magic):],value['transactionId'])

if __name__=='__main__':unittest.main()
