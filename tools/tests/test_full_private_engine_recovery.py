import os,tempfile,time,unittest
from pathlib import Path
from unittest import mock
from tools import full_private_engine_recovery as recovery
from tools import content_update_recovery as legacy
from tools import full_private_seed_recovery as old
from tools.tests.test_full_private_seed_recovery import fixture as old_fixture

def fixture():return {**old_fixture(),'scope':recovery.SCOPE,'entryProfile':'early','interruptEngine':True}

class FullPrivateEngineRecoveryTests(unittest.TestCase):
 def test_exact_private_early_profile_and_deterministic_plan_validate_offline(self):
  value=fixture();self.assertEqual(recovery.validate_packet(value,int(time.time())),value)
 def test_foreign_scope_implicit_entry_fields_plan_and_lifetime_are_refused(self):
  value=fixture()
  for changed in ({**value,'scope':'production'},{**value,'entryProfile':'late'},{**value,'mode':'production'},{**value,'interruptEngine':1},{**value,'expires':int(time.time())+7300},{**value,'sourceHashes':{'tools/../outside':'e'*64}},{**value,'publicSizes':{}}):
   with self.assertRaises(ValueError):recovery.validate_packet(changed,int(time.time()))
 def test_foreign_magic_bad_checksum_and_other_transaction_refuse_before_decryption(self):
  for blob in (old.MAGIC+b'd'*32+b'\n'+b'e'*64+b'\nopaque',recovery.MAGIC+b'e'*32+b'\n'+b'e'*64+b'\nopaque',recovery.MAGIC+b'd'*32+b'\n'+b'e'*64+b'\nopaque'):
   with mock.patch.object(legacy,'_dpapi',side_effect=AssertionError('No decryption for an unverified profile')):
    with self.assertRaises(ValueError):recovery.unseal(blob,'d'*32)
 def test_crypto_failure_cannot_create_a_plaintext_fallback(self):
  with tempfile.TemporaryDirectory(prefix='ktk-full-engine-no-fallback-') as d:
   with mock.patch.object(legacy,'_dpapi',side_effect=RuntimeError('Synthetic unavailable encryption')):
    with self.assertRaises(RuntimeError):recovery.FullPrivateEngineVault(Path(d).resolve()).save(fixture())
   self.assertEqual(list(Path(d).iterdir()),[])

@unittest.skipUnless(os.name=='nt','Native current-user full private engine DPAPI contract')
class FullPrivateEngineNativeTests(unittest.TestCase):
 def test_native_durable_readback_cipher_profile_and_no_plaintext_secrets(self):
  with tempfile.TemporaryDirectory(prefix='ktk-full-engine-native-') as d:
   value=fixture();vault=recovery.FullPrivateEngineVault(Path(d).resolve());receipt=vault.save(value);raw=vault.path(value['transactionId']).read_bytes();self.assertTrue(receipt['durableDecryptReadbackVerified']);self.assertFalse(receipt['productionAuthorized']);self.assertTrue(raw.startswith(recovery.MAGIC));self.assertNotIn(value['token'].encode(),raw);self.assertNotIn(value['ownershipKey'].encode(),raw);self.assertEqual(vault.load(value['transactionId']),value)
 def test_native_profile_relabel_expiry_and_overwrite_are_refused(self):
  value=fixture();blob=recovery.seal(value)
  with self.assertRaises(ValueError):old.unseal(blob,value['transactionId'])
  with self.assertRaises(ValueError):recovery.unseal(old.MAGIC+blob[len(recovery.MAGIC):],value['transactionId'])
  value['expires']=1;self.assertEqual(recovery.unseal(recovery.seal(value),value['transactionId']),value)
  with tempfile.TemporaryDirectory(prefix='ktk-full-engine-expired-') as d:
   vault=recovery.FullPrivateEngineVault(Path(d).resolve())
   with self.assertRaises(ValueError):vault.save(value)
   value=fixture();vault.save(value);before=vault.path(value['transactionId']).read_bytes()
   with self.assertRaises(ValueError):vault.save(value)
   self.assertEqual(vault.path(value['transactionId']).read_bytes(),before)

if __name__=='__main__':unittest.main()
