import copy,os,tempfile,time,unittest
from pathlib import Path
from unittest import mock
from tools import content_update_backup as backup
from tools import content_update_recovery as legacy
from tools import content_update_staging_packet as old_packet
from tools import full_private_seed_packet as packet
from tools import full_private_seed_recovery as recovery

def fixture():
    source=old_packet.seeds()['source'];owned={n:backup.sha(b) for n,b in source.items()};sizes={n:len(b) for n,b in source.items()};plan,_,_=packet.plan('d'*32,'c'*40,owned,sizes,'f'*64)
    return {'schemaVersion':1,'scope':'full-private-seed-caller-recovery','transactionId':'d'*32,'applicationCommit':'c'*40,'toolingCommit':'c'*40,'helperSha256':'e'*64,'sourceHashes':{'tools/full_private_seed_recovery.py':'e'*64},'expires':int(time.time())+600,'token':'T'*43,'ownershipKey':'b'*64,'plan':plan,'publicOwned':owned,'publicSizes':sizes,'interruptOriginal':True}

class FullSeedRecoveryValidationTests(unittest.TestCase):
 def test_exact_deterministic_full_packet_validates_without_connection_or_crypto(self):
  v=fixture()
  with mock.patch.object(legacy,'_dpapi',side_effect=AssertionError('validation must remain offline')):self.assertEqual(recovery.validate_packet(v),v)
 def test_unknown_production_mismatched_plan_sizes_and_unbounded_lifetime_are_refused(self):
  value=fixture();cases=[{**value,'mode':'production'},{**value,'scope':'production'},{**value,'interruptOriginal':1},{**value,'expires':int(time.time())+5000}];v=copy.deepcopy(value);v['plan']['prior'].pop('ktk-code-pages-assets/runtime.js');cases.append(v);v=copy.deepcopy(value);v['publicSizes']['ktk-code-pages.php']=True;cases.append(v)
  for v in cases:
   with self.assertRaises(ValueError):recovery.validate_packet(v,int(time.time()))
 def test_foreign_magic_transaction_and_cipher_checksum_stop_before_decryption(self):
  for blob in [b'KTK-DPAPI-PACKET-1\n'+b'd'*32+b'\n'+b'e'*64+b'\nopaque',recovery.MAGIC+b'e'*32+b'\n'+b'e'*64+b'\nopaque',recovery.MAGIC+b'd'*32+b'\n'+b'e'*64+b'\nopaque']:
   with mock.patch.object(legacy,'_dpapi',side_effect=AssertionError('bad envelope must not decrypt')):
    with self.assertRaises(ValueError):recovery.unseal(blob,'d'*32)
 def test_encryption_failure_leaves_no_plaintext_or_packet_directory(self):
  with tempfile.TemporaryDirectory(prefix='ktk-full-vault-') as d:
   with mock.patch.object(legacy,'_dpapi',side_effect=RuntimeError('No current-user DPAPI')):
    with self.assertRaises(RuntimeError):recovery.FullSeedPacketVault(Path(d).resolve()).save(fixture())
   self.assertEqual(list(Path(d).iterdir()),[])

@unittest.skipUnless(os.name=='nt','Current-user native Windows DPAPI contract')
class FullSeedNativeDPAPITests(unittest.TestCase):
 def test_current_user_encrypt_decrypt_durable_vault_and_no_plaintext_bytes(self):
  with tempfile.TemporaryDirectory(prefix='ktk-full-native-') as d:
   value=fixture();vault=recovery.FullSeedPacketVault(Path(d).resolve());receipt=vault.save(value);self.assertTrue(receipt['durableDecryptReadbackVerified']);self.assertFalse(receipt['productionAuthorized']);self.assertEqual(vault.load(value['transactionId']),value);data=vault.path(value['transactionId']).read_bytes();self.assertNotIn(value['token'].encode(),data);self.assertNotIn(value['ownershipKey'].encode(),data);self.assertNotIn(b'"plan"',data)
 def test_wrong_transaction_tampered_cipher_and_old_profile_cannot_be_loaded(self):
  value=fixture();blob=recovery.seal(value)
  with self.assertRaises(ValueError):recovery.unseal(blob,'e'*32)
  parts=blob.split(b'\n',3);cipher=parts[3][:-1]+bytes([parts[3][-1]^1]);tampered=recovery.MAGIC+value['transactionId'].encode()+b'\n'+backup.sha(cipher).encode()+b'\n'+cipher
  with self.assertRaises(ValueError):recovery.unseal(tampered,value['transactionId'])
  with self.assertRaises(ValueError):legacy.unseal(blob,value['transactionId'])
  old={k:v for k,v in value.items() if k not in {'scope','publicSizes','interruptOriginal'}};old['mode']='private-staging-rehearsal';old['plan']=old_packet.fixture_plan(value['transactionId'],value['applicationCommit'],'f'*64)
  with self.assertRaises(ValueError):recovery.unseal(legacy.seal(old),value['transactionId'])
 def test_existing_or_corrupt_packet_is_preserved_without_overwrite(self):
  with tempfile.TemporaryDirectory(prefix='ktk-full-native-') as d:
   value=fixture();vault=recovery.FullSeedPacketVault(Path(d).resolve());vault.save(value);p=vault.path(value['transactionId']);data=p.read_bytes();p.write_bytes(data[:-1]+bytes([data[-1]^1]));before=p.read_bytes()
   with self.assertRaises(ValueError):vault.load(value['transactionId'])
   with self.assertRaises(ValueError):vault.save(value)
   self.assertEqual(p.read_bytes(),before)
 def test_expired_packet_is_readable_for_inspection_but_cannot_be_initially_persisted(self):
  value=fixture();value['expires']=1;blob=recovery.seal(value);self.assertEqual(recovery.unseal(blob,value['transactionId']),value)
  with tempfile.TemporaryDirectory(prefix='ktk-full-native-') as d:
   with self.assertRaises(ValueError):recovery.FullSeedPacketVault(Path(d).resolve()).save(value)
   self.assertEqual(list(Path(d).iterdir()),[])

if __name__=='__main__':unittest.main()
