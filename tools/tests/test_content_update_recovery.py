import copy,os,tempfile,time,unittest
from pathlib import Path
from unittest.mock import patch
from tools import content_update_backup as backup
from tools import content_update_recovery as recovery
from tools import content_update_staging_packet as staging

ID='a'*32;APP='c'*40
def packet(expires=2000):return {'schemaVersion':1,'mode':'private-staging-rehearsal','transactionId':ID,'applicationCommit':APP,'toolingCommit':'d'*40,'helperSha256':'e'*64,'sourceHashes':{'tools/content_update_client.py':'f'*64},'expires':expires,'token':'t'*43,'ownershipKey':'b'*64,'plan':staging.fixture_plan(ID,APP,'1'*64),'publicOwned':{'ktk-code-pages.php':'2'*64,'ktk-code-pages-assets/registry.php':'3'*64}}
def fake_dpapi(data,transaction,protect):
 # File/format fixtures only; this is deliberately not presented as encryption evidence.
 prefix=('fixture-only|'+transaction+'|').encode()
 if protect:return prefix+data[::-1]
 if not data.startswith(prefix):raise ValueError('Mock transaction entropy differs')
 return data[len(prefix):][::-1]

class RecoveryPacketContractTests(unittest.TestCase):
 def test_exact_packet_schema_rejects_production_password_rows_paths_and_changed_plan(self):
  for mutate in [lambda p:p.update(mode='production'),lambda p:p.update(ftpPassword='must-never-be-a-field'),lambda p:p.update(database={'posts':[]}),lambda p:p['sourceHashes'].update({'../wp-config.php':'f'*64}),lambda p:p['sourceHashes'].update({'tools/CONTENT_UPDATE_CLIENT.PY':'f'*64}),lambda p:p['publicOwned'].update({'ktk-code-pages-production.php':backup.ACTIVATION_SHA}),lambda p:p['plan']['expected'].update({'ktk-code-pages-assets/unreviewed.php':'f'*64})]:
   value=packet();mutate(value)
   with self.assertRaises(ValueError):recovery.validate_packet(value)
 def test_initial_persistence_requires_fresh_expiry_but_recovery_may_read_expired_packet(self):
  recovery.validate_packet(packet(),1000)
  for expiry in (999,1000,4601):
   with self.assertRaises(ValueError):recovery.validate_packet(packet(expiry),1000)
  self.assertEqual(recovery.validate_packet(packet(1))['expires'],1)
 def test_format_root_transaction_outer_cipher_and_inner_payload_hashes_are_required(self):
  with patch.object(recovery,'_dpapi',fake_dpapi):
   blob=recovery.seal(packet());self.assertEqual(recovery.unseal(blob,ID),packet())
   for changed,transaction in [(blob[:-1]+bytes([blob[-1]^1]),ID),(blob,'d'*32),(b'not-a-packet',ID)]:
    with self.assertRaises(ValueError):recovery.unseal(changed,transaction)
   parts=blob.split(b'\n',3);inner=backup.decode(fake_dpapi(parts[3],ID,False));inner['packet']['ownershipKey']='4'*64;cipher=fake_dpapi(backup.encode(inner),ID,True);changed=parts[0]+b'\n'+parts[1]+b'\n'+backup.sha(cipher).encode()+b'\n'+cipher
   with self.assertRaises(ValueError):recovery.unseal(changed,ID)
 def test_immutable_file_roundtrip_and_failed_overwrite_preserve_cipher_bytes(self):
  with tempfile.TemporaryDirectory(prefix='ktk-recovery-file-') as directory,patch.object(recovery,'_dpapi',fake_dpapi):
   home=Path(directory);vault=recovery.RecoveryPacketVault(home);receipt=vault.save(packet(),1000);path=home/'.ktk/content-update-packets'/ (ID+'.dpapi');before=path.read_bytes();self.assertTrue(receipt['durableDecryptReadbackVerified']);self.assertFalse(receipt['productionAuthorized']);self.assertEqual(vault.load(ID),packet())
   with self.assertRaises(ValueError):vault.save(packet(),1000)
   self.assertEqual(path.read_bytes(),before)
 def test_partial_existing_file_and_unknown_packet_namespace_are_preserved(self):
  with tempfile.TemporaryDirectory(prefix='ktk-recovery-partial-') as directory,patch.object(recovery,'_dpapi',fake_dpapi):
   home=Path(directory);vault=recovery.RecoveryPacketVault(home);path=vault.path(ID,True);path.write_bytes(b'partial encrypted fragment')
   with self.assertRaises(ValueError):vault.load(ID)
   with self.assertRaises(ValueError):vault.save(packet(),1000)
   self.assertEqual(path.read_bytes(),b'partial encrypted fragment')
  with tempfile.TemporaryDirectory(prefix='ktk-recovery-collision-') as directory,patch.object(recovery,'_dpapi',fake_dpapi):
   home=Path(directory);(home/'.ktk').write_bytes(b'external owner file');vault=recovery.RecoveryPacketVault(home)
   with self.assertRaises(ValueError):vault.save(packet(),1000)
   self.assertEqual((home/'.ktk').read_bytes(),b'external owner file')
 def test_decrypt_failure_never_falls_back_to_plaintext_or_creates_replacement(self):
  with tempfile.TemporaryDirectory(prefix='ktk-recovery-decrypt-') as directory,patch.object(recovery,'_dpapi',fake_dpapi):
   home=Path(directory);vault=recovery.RecoveryPacketVault(home);vault.save(packet(),1000);path=vault.path(ID);before=path.read_bytes()
   with patch.object(recovery,'_dpapi',side_effect=ValueError('Unsupported private backend')):
    with self.assertRaises(ValueError):vault.load(ID)
   self.assertEqual(path.read_bytes(),before);self.assertEqual(len(list(path.parent.iterdir())),1)
 def test_validation_or_encryption_failure_does_not_create_packet_directories(self):
  with tempfile.TemporaryDirectory(prefix='ktk-recovery-refusal-') as directory:
   home=Path(directory);vault=recovery.RecoveryPacketVault(home)
   with self.assertRaises(ValueError):vault.save({**packet(),'mode':'production'},1000)
   with patch.object(recovery,'_dpapi',side_effect=RuntimeError('DPAPI required')):
    with self.assertRaises(RuntimeError):vault.save(packet(),1000)
   self.assertFalse((home/'.ktk').exists())
 def test_symlinked_packet_directory_is_not_followed(self):
  with tempfile.TemporaryDirectory(prefix='ktk-recovery-link-') as directory,patch.object(recovery,'_dpapi',fake_dpapi):
   home=Path(directory);outside=home/'external';outside.mkdir()
   try:(home/'.ktk').symlink_to(outside,target_is_directory=True)
   except OSError:self.skipTest('This Windows host cannot create the packet-directory symlink fixture')
   with self.assertRaises(ValueError):recovery.RecoveryPacketVault(home).save(packet(),1000)
   self.assertEqual(list(outside.iterdir()),[])
 def test_unsupported_platform_has_no_plaintext_crypto_fallback(self):
  with patch.object(recovery.os,'name','posix'):
   with self.assertRaises(RuntimeError):recovery._dpapi(b'secret fixture',ID,True)
 @unittest.skipUnless(os.name=='nt','Real current-user DPAPI is a Windows-only platform contract')
 def test_actual_current_user_dpapi_roundtrip_durable_file_entropy_and_corruption(self):
  with tempfile.TemporaryDirectory(prefix='ktk-recovery-real-dpapi-') as directory:
   value=packet(int(time.time())+600);home=Path(directory);vault=recovery.RecoveryPacketVault(home);receipt=vault.save(value);self.assertTrue(receipt['durableDecryptReadbackVerified']);self.assertEqual(vault.load(ID),value);blob=vault.path(ID).read_bytes();self.assertNotIn(value['token'].encode(),blob);self.assertNotIn(value['ownershipKey'].encode(),blob)
   parts=blob.split(b'\n',3)
   with self.assertRaises(ValueError):recovery._dpapi(parts[3],'d'*32,False)
   cipher=bytearray(parts[3]);cipher[len(cipher)//2]^=1;changed=parts[0]+b'\n'+parts[1]+b'\n'+backup.sha(cipher).encode()+b'\n'+bytes(cipher)
   with self.assertRaises((ValueError,UnicodeError)):recovery.unseal(changed,ID)

if __name__=='__main__':unittest.main()
