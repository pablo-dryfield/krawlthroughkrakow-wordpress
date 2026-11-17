"""Typed termination recovery contexts never refresh original execution authority."""
import copy
import os
from pathlib import Path
import tempfile
import time
import unittest
from unittest import mock

from tools import content_update_backup as backup
from tools import content_update_recovery as crypto
from tools import full_private_engine_recovery as original
from tools import private_engine_termination_authority as authority
from tools.tests import test_full_private_engine_recovery as original_tests


def fixtures():
    old=original_tests.fixture()
    base=dict(schemaVersion=1,scope=authority.SCOPE,operationId='1'*32,operation='inspect',transactionId=old['transactionId'],applicationCommit=old['applicationCommit'],toolingCommit='a'*40,originalToolingCommit=old['toolingCommit'],sourceHashes={'tools/private_engine_termination_authority.py':'e'*64},expires=int(time.time())+600,token='i'*43,helperSha256='a'*64,freshProtectedStateSha256='7'*64,freshPublicOwnedSha256=backup.sha(backup.encode(old['publicOwned'],sort=True)),witnessArchiveSha256='1'*64,witnessArchiveName='staging-protected-state-20261117-100001.zip',originalArchiveSha256='b'*64,originalManifestSha256='c'*64,metadataArchiveSha256=None,metadataArchiveName=None,inspectionStateSha256=None,closureSha256=None,predecessorOperationId=None,fenceOperationId=None)
    fence={**base,'operationId':'2'*32,'operation':'fence','token':'f'*43,'witnessArchiveSha256':'2'*64,'witnessArchiveName':'staging-protected-state-20261117-100002.zip','metadataArchiveSha256':'f'*64,'metadataArchiveName':'ktk-private-engine-termination-metadata-'+base['operationId']+'.zip','inspectionStateSha256':'a'*64,'closureSha256':'9'*64,'predecessorOperationId':base['operationId'],'fenceOperationId':'2'*32}
    cleanup={**fence,'operationId':'3'*32,'operation':'cleanup','token':'c'*43,'witnessArchiveSha256':'3'*64,'witnessArchiveName':'staging-protected-state-20261117-100003.zip','predecessorOperationId':fence['operationId']}
    return old,base,fence,cleanup


class TerminationAuthorityValidationTests(unittest.TestCase):
    def test_three_explicit_operations_validate_without_connection_or_crypto(self):
        old,inspection,fence,cleanup=fixtures()
        with mock.patch.object(crypto,'_dpapi',side_effect=AssertionError('Validation must remain offline')):
            for value in (inspection,fence,cleanup):
                self.assertIs(authority.validate_packet(value,time.time()),value)
                self.assertIs(authority.validate_original_binding(value,old),value)
            authority.validate_predecessor(fence,inspection,old)
            authority.validate_predecessor(cleanup,fence,old)

    def test_operation_relabel_extra_fields_and_implicit_authority_are_refused(self):
        _,inspection,_,_=fixtures()
        for changes in ({'operation':'apply'},{'operation':[]},{'scope':'production'},{'mode':'production'},{'metadataArchiveSha256':'a'*64},{'fenceOperationId':'f'*32},{'sourceHashes':{'tools/../outside':'e'*64}},{'expires':int(time.time())+7200}):
            with self.subTest(changes=changes),self.assertRaises(ValueError):authority.validate_packet({**inspection,**changes},time.time())

    def test_original_expiry_is_provenance_but_original_id_or_token_cannot_be_reused(self):
        old,inspection,_,_=fixtures();old['expires']=1
        self.assertIs(authority.validate_original_binding(inspection,old),inspection)
        for changes in ({'operationId':old['transactionId']},{'token':old['token']},{'originalToolingCommit':'f'*40}):
            with self.subTest(changes=changes),self.assertRaises(ValueError):authority.validate_original_binding({**inspection,**changes},old)

    def test_fence_needs_new_witness_archive_and_same_complete_inspected_state(self):
        old,inspection,fence,_=fixtures()
        for changes in ({'witnessArchiveSha256':inspection['witnessArchiveSha256']},{'witnessArchiveName':inspection['witnessArchiveName']},{'freshProtectedStateSha256':'8'*64},{'freshPublicOwnedSha256':'8'*64},{'predecessorOperationId':'f'*32},{'token':inspection['token']}):
            with self.subTest(changes=changes),self.assertRaises(ValueError):authority.validate_predecessor({**fence,**changes},inspection,old)

    def test_cleanup_can_bind_a_distinct_complete_current_witness(self):
        old,_,fence,cleanup=fixtures();cleanup.update(freshProtectedStateSha256='8'*64,freshPublicOwnedSha256='6'*64)
        self.assertIs(authority.validate_predecessor(cleanup,fence,old),cleanup)
        later={**cleanup,'operationId':'4'*32,'token':'l'*43,'predecessorOperationId':cleanup['operationId'],'witnessArchiveSha256':'4'*64,'witnessArchiveName':'staging-protected-state-20261117-100004.zip'}
        authority.validate_predecessor(later,cleanup,old)

    def test_cleanup_cannot_change_initial_archive_closure_or_fence(self):
        old,inspection,fence,cleanup=fixtures()
        for changes in ({'metadataArchiveSha256':'8'*64},{'metadataArchiveName':'ktk-private-engine-termination-metadata-'+'f'*32+'.zip'},{'inspectionStateSha256':'8'*64},{'closureSha256':'8'*64},{'fenceOperationId':'f'*32}):
            with self.subTest(changes=changes),self.assertRaises(ValueError):authority.validate_predecessor({**cleanup,**changes},fence,old)
        with self.assertRaises(ValueError):authority.validate_predecessor(cleanup,inspection,old)

    def test_foreign_magic_identity_and_checksum_refuse_before_decryption(self):
        _,inspection,_,_=fixtures();identifier=inspection['operationId']
        for blob in (original.MAGIC+b'opaque',authority.MAGIC+b'f'*32+b'\n'+b'e'*64+b'\nopaque',authority.MAGIC+identifier.encode()+b'\n'+b'e'*64+b'\nopaque'):
            with mock.patch.object(crypto,'_dpapi',side_effect=AssertionError('Unverified ciphertext must not be decrypted')):
                with self.assertRaises(ValueError):authority.unseal(blob,identifier,'inspect')

    def test_distinct_fenced_readonly_context_preserves_initial_fence_under_new_complete_state(self):
        old,inspection,fence,cleanup=fixtures()
        view={**cleanup,'operation':'inspect-fenced','operationId':'4'*32,'token':'v'*43,'witnessArchiveSha256':'4'*64,'witnessArchiveName':'staging-protected-state-20261117-100004.zip','predecessorOperationId':cleanup['operationId'],'freshProtectedStateSha256':'8'*64,'freshPublicOwnedSha256':'6'*64}
        authority.validate_packet(view,time.time());authority.validate_predecessor(view,cleanup,old)
        later={**view,'operation':'cleanup','operationId':'5'*32,'token':'n'*43,'witnessArchiveSha256':'5'*64,'witnessArchiveName':'staging-protected-state-20261117-100005.zip','predecessorOperationId':view['operationId']}
        authority.validate_predecessor(later,view,old)
        self.assertEqual(later['fenceOperationId'],fence['operationId'])
        for changes in ({'closureSha256':'8'*64},{'fenceOperationId':'9'*32},{'metadataArchiveSha256':'8'*64},{'witnessArchiveSha256':cleanup['witnessArchiveSha256']}):
            with self.subTest(changes=changes),self.assertRaises(ValueError):authority.validate_predecessor({**view,**changes},cleanup,old)

    def test_initial_inspection_cannot_implicitly_become_fenced_inspection_or_serve_as_fence_provenance(self):
        old,inspection,fence,cleanup=fixtures()
        with self.assertRaises(ValueError):authority.validate_packet({**inspection,'operation':'inspect-fenced'})
        view={**cleanup,'operation':'inspect-fenced','operationId':'4'*32,'token':'v'*43,'witnessArchiveSha256':'4'*64,'witnessArchiveName':'staging-protected-state-20261117-100004.zip','predecessorOperationId':cleanup['operationId']}
        with self.assertRaises(ValueError):authority.validate_predecessor({**fence,'predecessorOperationId':view['operationId']},view,old)

    def test_encryption_failure_never_creates_a_plaintext_fallback(self):
        _,inspection,_,_=fixtures()
        with tempfile.TemporaryDirectory(prefix='ktk-termination-no-fallback-') as directory:
            with mock.patch.object(crypto,'_dpapi',side_effect=RuntimeError('Synthetic unavailable encryption')):
                with self.assertRaises(RuntimeError):authority.TerminationVault(Path(directory).resolve()).save(inspection)
            self.assertEqual(list(Path(directory).iterdir()),[])


@unittest.skipUnless(os.name=='nt','Native current-user typed termination DPAPI contract')
class TerminationAuthorityNativeTests(unittest.TestCase):
    def test_native_fenced_readonly_context_cannot_be_loaded_as_cleanup_or_fence_authority(self):
        _,_,_,cleanup=fixtures();view={**cleanup,'operation':'inspect-fenced','operationId':'4'*32,'token':'v'*43,'witnessArchiveSha256':'4'*64,'witnessArchiveName':'staging-protected-state-20261117-100004.zip','predecessorOperationId':cleanup['operationId']}
        with tempfile.TemporaryDirectory(prefix='ktk-termination-readonly-native-') as directory:
            vault=authority.TerminationVault(Path(directory).resolve());vault.save(view)
            self.assertEqual(vault.load(view['operationId'],'inspect-fenced'),view)
            for operation in ('cleanup','fence','inspect'):
                with self.subTest(operation=operation),self.assertRaises(ValueError):vault.load(view['operationId'],operation)

    def test_native_three_typed_durable_contexts_reject_cross_operation_and_legacy_loads(self):
        old,inspection,fence,cleanup=fixtures()
        with tempfile.TemporaryDirectory(prefix='ktk-termination-native-') as directory:
            vault=authority.TerminationVault(Path(directory).resolve())
            for value in (inspection,fence,cleanup):
                with self.subTest(operation=value['operation']):
                    receipt=vault.save(value);raw=vault.path(value['operationId']).read_bytes()
                    self.assertTrue(receipt['durableDecryptReadbackVerified'])
                    self.assertFalse(receipt['productionAuthorized'])
                    self.assertTrue(raw.startswith(authority.MAGIC))
                    self.assertNotIn(value['token'].encode(),raw)
                    self.assertNotIn(old['ownershipKey'].encode(),raw)
                    self.assertEqual(vault.load(value['operationId'],value['operation']),value)
                    wrong='cleanup' if value['operation']!='cleanup' else 'inspect'
                    with self.assertRaises(ValueError):vault.load(value['operationId'],wrong)
                    with self.assertRaises(ValueError):original.unseal(raw,value['operationId'])

    def test_native_expired_evidence_readback_and_existing_ciphertext_preservation(self):
        _,inspection,_,_=fixtures();expired=copy.deepcopy(inspection);expired['expires']=1
        self.assertEqual(authority.unseal(authority.seal(expired),expired['operationId'],'inspect'),expired)
        with tempfile.TemporaryDirectory(prefix='ktk-termination-expired-') as directory:
            vault=authority.TerminationVault(Path(directory).resolve())
            with self.assertRaises(ValueError):vault.save(expired)
            self.assertEqual(list(Path(directory).iterdir()),[])
            vault.save(inspection);path=vault.path(inspection['operationId']);before=path.read_bytes()
            with self.assertRaises(ValueError):vault.save(inspection)
            self.assertEqual(path.read_bytes(),before)


if __name__=='__main__':
    unittest.main()
