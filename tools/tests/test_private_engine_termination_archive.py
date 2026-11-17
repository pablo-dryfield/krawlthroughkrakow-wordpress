"""Native census archives preserve exact metadata without granting execution."""
import copy
from pathlib import Path
import unittest
from unittest import mock
import zipfile

from tools import content_update_backup as backup
from tools import private_engine_termination_archive as archive
from tools.tests import test_private_engine_abandonment_inspection as native


@unittest.skipUnless(native.bridge.old.PHP,'Real PHP required for native census archive fixtures')
class PrivateEngineTerminationArchiveTests(unittest.TestCase):
    def setUp(self):
        self.base=native.PrivateEngineAbandonmentInspectionTests('runTest')
        self.base.setUp();self.addCleanup(self.base.doCleanups)
        self.case=self.base.case
        self.context=dict(plan=self.case.plan,sizes=self.case.sizes,overrides=self.case.overrides,ownershipKey=native.bridge.old.KEY,originalHelperSha256=self.case.cfg['packet']['helperSha256'])
        self.original=Path(self.base.original_archive['path'])
        self.destination=self.case.root/'deploy-backups/termination-metadata.zip'

    def build(self,inspection,reader=None,rollback=None):
        with mock.patch.object(backup,'ROOT',self.case.root):
            return archive.build_archive(self.destination,inspection,self.context,self.case.mu,reader or (lambda n:(self.case.private/n).read_bytes()),self.original,rollback)

    def checksum(self,value):
        value['stateSha256']=backup.sha(backup.encode({k:v for k,v in value.items() if k!='stateSha256'},sort=True))
        return value

    def test_cold_signed_records_archive_is_independently_reopened_without_keys_or_payload(self):
        inspection=self.base.inspect();before=self.base.files(self.case.private)
        receipt=self.build(inspection)
        self.assertTrue(receipt['allMemberHashesSignaturesAndCRCVerified'])
        self.assertFalse(receipt['executionAuthorityGranted'])
        self.assertEqual(receipt['metadataFiles'],4)
        self.assertEqual(receipt['payloadFiles'],0)
        self.assertEqual(self.base.files(self.case.private),before)
        with zipfile.ZipFile(self.destination) as z:
            self.assertEqual(len(z.namelist()),6)
            self.assertTrue(all(self.context['ownershipKey'].encode() not in z.read(n) for n in z.namelist()))
        self.assertEqual(archive.verify_archive(self.destination,self.context,self.case.mu,self.original,expected_state_sha256=inspection['stateSha256']),receipt)

    def test_prepared_archive_preserves_new_raw_cache_value_and_excludes_large_seed_payload(self):
        self.base.prepared();self.base.change_cache_row();inspection=self.base.inspect()
        self.assertFalse(inspection['originalProtectedStateStillExact'])
        receipt=self.build(inspection)
        self.assertGreater(receipt['payloadFiles'],0)
        self.assertLess(receipt['bytes'],2097152)
        self.assertEqual(self.case.cfg['rows']['options'][-1]['option_value'],'new-preserved-value')
        with zipfile.ZipFile(self.destination) as z:self.assertFalse(any('/source/' in n or '/target/' in n or '/pending/' in n for n in z.namelist()))

    def test_active_engine_requires_exact_acknowledged_rollback_zip(self):
        self.base.prepared();self.base.acknowledge();self.case.client.step('apply');self.base.change_cache_row();inspection=self.base.inspect()
        with self.assertRaisesRegex(ValueError,'acknowledged rollback archive presence'):self.build(inspection)
        self.assertFalse(self.destination.exists())
        rollback=self.case.root/'deploy-backups/rollback.zip';receipt=self.build(inspection,rollback=rollback)
        self.assertEqual(receipt['rollbackArchiveSha256'],backup.verify_archive(rollback,self.context['ownershipKey'])['archiveSha256'])
        self.assertFalse(receipt['executionAuthorityGranted'])

    def test_changed_reader_bytes_refuse_before_creating_archive(self):
        inspection=self.base.inspect()
        def changed(name):
            data=(self.case.private/name).read_bytes()
            return b'x'+data[1:] if name=='owner.marker' else data
        with self.assertRaisesRegex(ValueError,'Current metadata changed'):self.build(inspection,changed)
        self.assertFalse(self.destination.exists())

    def test_rehashed_traversal_and_unknown_empty_directory_censuses_refuse(self):
        inspection=self.base.inspect()
        traversal=copy.deepcopy(inspection);traversal['files']['../owner-note']={'sha256':backup.sha(b'owner'),'bytes':5};self.checksum(traversal)
        with self.assertRaisesRegex(ValueError,'Safe relative'):self.build(traversal)
        unknown=copy.deepcopy(inspection);unknown['directories'].append('foreign');unknown['directories'].sort();self.checksum(unknown)
        with self.assertRaisesRegex(ValueError,'Unknown private directory'):self.build(unknown)
        self.assertFalse(self.destination.exists())

    def test_exact_actual_stream_prefix_can_be_archived_without_copying_it(self):
        self.case.cfg['seedFault']='prefix';self.case.expected_exit=74
        with self.assertRaises(native.UncertainRequest):self.case.client.recover_preparation()
        self.case.expected_exit=0;self.case.cfg['seedFault']=''
        inspection=self.base.inspect();receipt=self.build(inspection)
        self.assertGreater(receipt['payloadFiles'],0)
        with zipfile.ZipFile(self.destination) as z:self.assertFalse(any('large.bin' in n for n in z.namelist()))

    def test_valid_crc_with_altered_metadata_bytes_still_refuses(self):
        self.build(self.base.inspect());changed=self.case.root/'deploy-backups/changed-metadata.zip'
        with zipfile.ZipFile(self.destination) as source,zipfile.ZipFile(changed,'x',zipfile.ZIP_DEFLATED) as target:
            for n in source.namelist():
                data=source.read(n)
                target.writestr(n,b'x'+data[1:] if n=='metadata/owner.marker' else data)
        with zipfile.ZipFile(changed) as z:self.assertIsNone(z.testzip())
        with self.assertRaisesRegex(ValueError,'Metadata member hash'):archive.verify_archive(changed,self.context,self.case.mu,self.original)

    def test_wrong_original_manifest_and_existing_destination_are_preserved(self):
        inspection=self.base.inspect();wrong=copy.deepcopy(inspection);wrong['originalManifestSha256']='f'*64;self.checksum(wrong)
        with self.assertRaisesRegex(ValueError,'Original capsule/census binding'):self.build(wrong)
        self.assertFalse(self.destination.exists())
        self.destination.write_bytes(b'Existing owner archive remains')
        with self.assertRaises(ValueError):self.build(inspection)
        self.assertEqual(self.destination.read_bytes(),b'Existing owner archive remains')


if __name__=='__main__':
    unittest.main()
