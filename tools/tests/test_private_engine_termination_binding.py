"""Real PHP census and actual signed/paired ZIPs; no helper or hosted mutation."""
import copy
from pathlib import Path
import time
import unittest
from unittest import mock
import zipfile

from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools import private_engine_termination_archive as archive
from tools import private_engine_termination_authority as authority
from tools import private_engine_termination_binding as binding
from tools.tests import test_private_engine_abandonment_inspection as native
from tools.tests.test_full_private_engine_recovery import fixture as old_fixture


@unittest.skipUnless(native.bridge.old.PHP,'Real PHP required for bound private termination archives')
class PrivateEngineTerminationBindingTests(unittest.TestCase):
    def setUp(self):
        self.base=native.PrivateEngineAbandonmentInspectionTests('runTest');self.base.setUp();self.addCleanup(self.base.doCleanups);self.case=self.base.case
        self.old={**old_fixture(),'transactionId':self.case.plan['transactionId'],'applicationCommit':self.case.plan['applicationCommit'],'plan':self.case.plan,'publicOwned':self.case.owned,'publicSizes':self.case.sizes,'ownershipKey':native.bridge.old.KEY,'helperSha256':self.case.cfg['packet']['helperSha256'],'expires':1}
        self.original=Path(self.base.original_archive['path']);self.context=binding.original_context(self.old);self.number=0

    def witness(self):
        state=self.base.snapshot();receipt=full.snapshot.write_private_backup(self.original.parent,state,state,state['helperSha256']);return state,receipt

    def initial(self):
        state,witness=self.witness()
        self.inspection_packet=dict(schemaVersion=1,scope=authority.SCOPE,operationId='1'*32,operation='inspect',transactionId=self.old['transactionId'],applicationCommit=self.old['applicationCommit'],toolingCommit='a'*40,originalToolingCommit=self.old['toolingCommit'],sourceHashes={'tools/private_engine_termination_binding.py':'e'*64},expires=int(time.time())+600,token='i'*43,helperSha256='a'*64,freshProtectedStateSha256=state['protectedStateSha256'],freshPublicOwnedSha256=backup.sha(backup.encode(state['ownedContentFiles'],sort=True)),witnessArchiveSha256=witness['sha256'],witnessArchiveName=Path(witness['path']).name,originalArchiveSha256=self.base.original_archive['sha256'],originalManifestSha256=self.base.original_archive['manifestSha256'],metadataArchiveSha256=None,metadataArchiveName=None,inspectionStateSha256=None,closureSha256=None,predecessorOperationId=None,fenceOperationId=None)
        self.inspection_witness=Path(witness['path']);self.inspection=self.base.inspect();return self.inspection_packet

    def fence(self):
        self.initial();self.metadata=self.original.parent/('ktk-private-engine-termination-metadata-'+self.inspection_packet['operationId']+'.zip')
        rollback=self.original.parent/'rollback.zip';self.rollback=rollback if self.inspection['originalRollbackAcknowledged'] else None
        with mock.patch.object(backup,'ROOT',self.case.root):
            receipt=archive.build_archive(self.metadata,self.inspection,self.context,self.case.mu,lambda n:(self.case.private/n).read_bytes(),self.original,self.rollback)
        state,witness=self.witness();self.fence_witness=Path(witness['path'])
        fence={**self.inspection_packet,'operation':'fence','operationId':'2'*32,'token':'f'*43,'witnessArchiveSha256':witness['sha256'],'witnessArchiveName':self.fence_witness.name,'metadataArchiveSha256':receipt['sha256'],'metadataArchiveName':self.metadata.name,'inspectionStateSha256':self.inspection['stateSha256'],'closureSha256':'f'*64,'predecessorOperationId':self.inspection_packet['operationId'],'fenceOperationId':'2'*32}
        with zipfile.ZipFile(self.original) as z:manifest=backup.decode(z.read('manifest.json'))
        closed=(self.case.private/'control/closed.json').read_bytes() if self.inspection['originalRolledBackClosurePresent'] else None
        fence['closureSha256']=backup.sha(binding.closure_blob(fence,self.old,manifest,self.inspection,closed));self.fence_packet=fence;return fence

    def validate(self,value=None,**changes):
        value=value or self.fence_packet
        args=dict(source_root=self.case.mu,original_path=self.original,witness_path=self.fence_witness,metadata_path=self.metadata,rollback_path=self.rollback,predecessor=self.inspection_packet)
        args.update(changes);return binding.validate_archives(value,self.old,**args)

    def rewrite(self,path,transform):
        with zipfile.ZipFile(path) as z:blobs={n:z.read(n) for n in z.namelist()}
        transform(blobs)
        with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
            for n,raw in blobs.items():z.writestr(n,raw)

    def test_actual_inspection_pair_binds_expired_original_provenance_without_private_changes(self):
        value=self.initial();before=self.base.files(self.case.private)
        result=binding.validate_archives(value,self.old,self.case.mu,self.original,self.inspection_witness)
        self.assertTrue(result['receipt']['witnessArchive']['allSevenRawTablesAndPublicProtectedMapsVerified'])
        self.assertFalse(result['receipt']['executionAuthorityGranted']);self.assertEqual(self.base.files(self.case.private),before)

    def test_prepared_new_cache_witness_metadata_and_signed_fence_are_only_locally_derived(self):
        self.base.prepared();self.base.change_cache_row();self.fence();before=self.base.files(self.case.private)
        result=self.validate();self.assertFalse(result['receipt']['originalProtectedStateStillExact']);self.assertFalse(result['receipt']['executionAuthorityGranted'])
        self.assertGreater(result['receipt']['payloadFiles'],0);self.assertEqual(backup.sha(result['closureBlob']),self.fence_packet['closureSha256'])
        self.assertFalse((self.case.private/'control/closed.json').exists());self.assertEqual(self.base.files(self.case.private),before)

    def test_cleanup_binds_new_complete_raw_and_public_state_to_immutable_initial_fence(self):
        self.base.prepared();self.fence();self.base.change_cache_row();public=self.case.mu/'ktk-code-pages-assets/runtime.css';public.write_bytes(b'new explicitly witnessed current public css')
        state,witness=self.witness();value={**self.fence_packet,'operation':'cleanup','operationId':'3'*32,'token':'c'*43,'freshProtectedStateSha256':state['protectedStateSha256'],'freshPublicOwnedSha256':backup.sha(backup.encode(state['ownedContentFiles'],sort=True)),'witnessArchiveSha256':witness['sha256'],'witnessArchiveName':Path(witness['path']).name,'predecessorOperationId':self.fence_packet['operationId']}
        before=self.base.files(self.case.private);result=self.validate(value,witness_path=Path(witness['path']),predecessor=self.fence_packet,fence_packet=self.fence_packet)
        self.assertEqual(result['freshState']['database']['options'][-1]['option_value'],'new-preserved-value');self.assertFalse(result['receipt']['freshWitnessIsInitialFenceWitness']);self.assertEqual(public.read_bytes(),b'new explicitly witnessed current public css');self.assertEqual(self.base.files(self.case.private),before)
        with self.assertRaisesRegex(ValueError,'initial fence context'):self.validate(value,witness_path=Path(witness['path']),predecessor=self.fence_packet)

    def test_actual_rolled_back_signed_closure_is_preserved_byte_for_byte(self):
        self.base.prepared();self.base.acknowledge()
        for action,phase in [('apply','applied'),('rollback','rolled-back')]:
            for _ in range(10):
                if self.case.client.state['engine']['phase']==phase:break
                self.case.client.step(action)
            self.assertEqual(self.case.client.state['engine']['phase'],phase)
        self.case.client.close();closed=(self.case.private/'control/closed.json').read_bytes();self.fence();result=self.validate()
        self.assertEqual(result['closureBlob'],closed);self.assertEqual((self.case.private/'control/closed.json').read_bytes(),closed)

    def test_rehashed_paired_raw_drift_is_refused_without_filtering_cache_rows(self):
        self.initial();path=self.inspection_witness
        def change(blobs):
            s=backup.decode(blobs['after.json']);s['database']['options'].append(dict(option_name='ecwid_last_api_cache_check',option_value='different paired raw value'));s['rowCounts']={n:len(v) for n,v in s['database'].items()};s['databaseSha256']=backup.sha(backup.encode(s['database']));s['protectedStateSha256']=backup.sha(backup.encode(dict(identity=s['identity'],databaseSha256=s['databaseSha256'],files=s['protectedFiles'])));blobs['after.json']=backup.encode(s);m=backup.decode(blobs['manifest.json']);m['files']['after.json']=backup.sha(blobs['after.json']);blobs['manifest.json']=backup.encode(m)
        self.rewrite(path,change);value={**self.inspection_packet,'witnessArchiveSha256':backup.sha(path.read_bytes())}
        with self.assertRaisesRegex(ValueError,'paired witness state changed'):binding.validate_archives(value,self.old,self.case.mu,self.original,path)

    def test_foreign_witness_scope_and_pinned_checksum_are_refused(self):
        self.initial();path=self.inspection_witness
        with self.assertRaisesRegex(ValueError,'archive SHA'):binding.validate_archives({**self.inspection_packet,'witnessArchiveSha256':'f'*64},self.old,self.case.mu,self.original,path)
        def change(blobs):
            m=backup.decode(blobs['manifest.json']);m['scope']='production';blobs['manifest.json']=backup.encode(m)
        self.rewrite(path,change);value={**self.inspection_packet,'witnessArchiveSha256':backup.sha(path.read_bytes())}
        with self.assertRaisesRegex(ValueError,'witness manifest'):binding.validate_archives(value,self.old,self.case.mu,self.original,path)

    def test_wrong_original_archive_manifest_or_key_refuses_before_any_mutation(self):
        self.initial();before=self.base.files(self.case.private)
        for changes in ({'originalArchiveSha256':'f'*64},{'originalManifestSha256':'f'*64}):
            with self.subTest(changes=changes),self.assertRaisesRegex(ValueError,'original signed capsule'):binding.validate_archives({**self.inspection_packet,**changes},self.old,self.case.mu,self.original,self.inspection_witness)
        with self.assertRaises(ValueError):binding.validate_archives(self.inspection_packet,{**self.old,'ownershipKey':'f'*64},self.case.mu,self.original,self.inspection_witness)
        self.assertEqual(self.base.files(self.case.private),before)

    def test_changed_valid_zip_metadata_checksum_or_closure_binding_is_refused(self):
        self.fence();before=self.base.files(self.case.private)
        with self.assertRaisesRegex(ValueError,'signed closure'):self.validate({**self.fence_packet,'closureSha256':'e'*64})
        self.metadata.write_bytes(self.metadata.read_bytes()+b'changed archive trailer')
        with self.assertRaisesRegex(ValueError,'metadata archive SHA'):self.validate()
        self.assertEqual(self.base.files(self.case.private),before)

    def test_expired_current_context_and_implicit_inspection_mutation_bindings_refuse(self):
        self.initial()
        with mock.patch.object(archive,'originals',side_effect=AssertionError('Expired context must not read archives')):
            with self.assertRaises(ValueError):binding.validate_archives({**self.inspection_packet,'expires':1},self.old,self.case.mu,self.original,self.inspection_witness)
        with self.assertRaisesRegex(ValueError,'Inspection cannot carry'):binding.validate_archives(self.inspection_packet,self.old,self.case.mu,self.original,self.inspection_witness,metadata_path=self.original)


if __name__=='__main__':unittest.main()
