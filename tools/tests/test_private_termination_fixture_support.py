"""Small synthetic evidence fixtures; never create the full-size inventory."""
from pathlib import Path
from unittest import mock
import hashlib,json,subprocess,tempfile,unittest,zipfile
from tools import private_termination_fixture_support as support


class PrivateTerminationFixtureSupportTests(unittest.TestCase):
    def observation(self,operation,state):
        return {'body':{'runtime':{'phases':{'muplugins_loaded':1,'plugins_loaded':0,'wp_loaded':0}},'controller':{'operation':operation,'state':state,'payloadDeletes':0,'payloadDirectoriesRemoved':0,'closureWrites':0,'cleanupStoppedForRuntimeBudget':False,'applicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionOperations':0}}}

    def test_cleanup_budget_flag_is_typed_and_never_turns_pending_state_into_completion(self):
        state={'scope':'fenced-private-engine-readonly-inspection','remainingPayloadFiles':4149}
        value=self.observation('cleanup',state);value['body']['controller']['cleanupStoppedForRuntimeBudget']=True
        observed=support.helper_observation(value);self.assertTrue(observed['cleanupStoppedForRuntimeBudget']);self.assertEqual(observed['remainingPayloadFiles'],4149)
        for bad in [1,None,'true']:
            value['body']['controller']['cleanupStoppedForRuntimeBudget']=bad
            with self.assertRaises(support.FixtureRefusal):support.helper_observation(value)
        value=self.observation('inspect-fenced',state);value['body']['controller']['cleanupStoppedForRuntimeBudget']=True
        with self.assertRaises(support.FixtureRefusal):support.helper_observation(value)

    def test_initial_inspection_has_its_own_census_without_fenced_remaining_field(self):
        value=self.observation('inspect',{'scope':'private-engine-abandonment-readonly-inspection','phase':'prepared','files':{'source/a':{'bytes':5}},'validatedArtifacts':[]})
        with self.assertRaises(KeyError):value['body']['controller']['state']['remainingPayloadFiles']
        metrics=support.helper_observation(value)
        self.assertEqual(metrics['inspectionPhase'],'prepared');self.assertEqual(metrics['initialPrivateCensusFiles'],1);self.assertEqual(metrics['initialValidatedArtifacts'],0);self.assertNotIn('remainingPayloadFiles',metrics)

    def test_fenced_roles_keep_actual_remaining_count_and_reject_unknown_or_mixed_shapes(self):
        state={'scope':'fenced-private-engine-readonly-inspection','remainingPayloadFiles':4149}
        for operation in ('fence','inspect-fenced','cleanup'):
            self.assertEqual(support.helper_observation(self.observation(operation,state))['remainingPayloadFiles'],4149)
        for operation,bad in [('inspect',state),('cleanup',{'scope':'unrecognised','remainingPayloadFiles':0}),('cleanup',{'scope':state['scope'],'remainingPayloadFiles':True}),('cleanup',{'scope':state['scope']})]:
            with self.assertRaises(support.FixtureRefusal):support.helper_observation(self.observation(operation,bad))
        value=self.observation('cleanup',state);value['body']['controller']['databaseWrites']=1
        with self.assertRaisesRegex(support.FixtureRefusal,'unexpected-helper-observation-write-counter'):support.helper_observation(value)

    def test_fence_write_receipt_keeps_pre_census_separate_and_rejects_post_census_claims(self):
        state={'scope':'private-engine-fence-write-receipt','preMutationCensusVerified':True,'postMutationCensusVerified':False,'freshInspectionRequiredBeforeCleanup':True,'signedClosureComplete':True,'readOnly':False,'preMutationInspection':{'scope':'fenced-private-engine-readonly-inspection','remainingPayloadFiles':4149}}
        metrics=support.helper_observation(self.observation('fence',state));self.assertEqual(metrics['preMutationPayloadFiles'],4149);self.assertFalse(metrics['postMutationCensusVerified']);self.assertNotIn('remainingPayloadFiles',metrics)
        for operation,changes in [('cleanup',{}),('inspect-fenced',{}),('fence',{'postMutationCensusVerified':True}),('fence',{'remainingPayloadFiles':4149}),('fence',{'files':{}}),('fence',{'readOnly':True}),('fence',{'preMutationInspection':{'scope':'fenced-private-engine-readonly-inspection','remainingPayloadFiles':True}})]:
            with self.subTest(operation=operation,changes=changes),self.assertRaises(support.FixtureRefusal):support.helper_observation(self.observation(operation,{**state,**changes}))

    def test_exact_synthetic_reply_is_retained_before_decoding_and_never_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory).resolve();raw='not JSON: synthetic failed reply \u00f3'
            row=support.retain_helper_reply(root,95,raw);path=root/row['replyRelativePath']
            self.assertEqual(path.read_bytes(),raw.encode('utf-8'));self.assertEqual(row['replySHA256'],support.digest(path))
            with self.assertRaises(FileExistsError):support.retain_helper_reply(root,95,'new reply')
            self.assertEqual(path.read_bytes(),raw.encode('utf-8'))
            for number in (0,100000,True):
                with self.assertRaises(support.FixtureRefusal):support.retain_helper_reply(root,number,'synthetic')

    def test_report_destination_is_scoped_fresh_and_cannot_overwrite_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory).resolve();base='docs/seo/private-engine-early-termination-2026-11-17/'
            for value in ('../actual-inventory-a.json',base+'../actual-inventory-a.json',base+'wrong.json'):
                with self.assertRaises(support.FixtureRefusal):support.report_paths(root,value)
            report,archive=support.report_paths(root,base+'actual-inventory-a.json');archive.write_bytes(b'preserved')
            with self.assertRaises(support.FixtureRefusal):support.report_paths(root,base+'actual-inventory-a.json')
            self.assertEqual(archive.read_bytes(),b'preserved');self.assertFalse(report.exists())

    def test_space_preflight_refuses_before_fixture_and_does_not_describe_host_quota(self):
        with mock.patch.object(support.shutil,'disk_usage',return_value=type('Disk',(),{'free':1})()):
            with self.assertRaisesRegex(support.FixtureRefusal,'local-fixture-space-required-not-host-quota'):support.ensure_space('.',20,40)
        with mock.patch.object(support.shutil,'disk_usage',return_value=type('Disk',(),{'free':600000000})()):
            result=support.ensure_space('.',20,40)
        self.assertEqual(result['requiredBytes'],536871052);self.assertIn('not hosting',result['scope'])

    def test_declared_git_and_working_sources_must_both_match(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'tools').mkdir();path=root/'tools/a.py';path.write_bytes(b'original')
            inputs={'tools/a.py':support.digest(path)}
            with mock.patch.object(subprocess,'check_output',return_value=b'original'):
                support.verify_reviewed_sources(root,'a'*40,inputs)
                for name in ('tools/../outside.py','tools//a.py','tools/./a.py','tools/a.py:other'):
                    with self.assertRaises(support.FixtureRefusal):support.verify_reviewed_sources(root,'a'*40,{name:inputs['tools/a.py']})
            with mock.patch.object(subprocess,'check_output',return_value=b'changed'):
                with self.assertRaisesRegex(support.FixtureRefusal,'declared-git-source-differs'):support.verify_reviewed_sources(root,'a'*40,inputs)
            path.write_bytes(b'changed')
            with self.assertRaisesRegex(support.FixtureRefusal,'working-source-drift'):support.verify_reviewed_sources(root,'a'*40,inputs)

    def test_only_exact_public_bytes_are_referenced_unknown_changed_metadata_are_retained(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);private=root/'private';private.mkdir();public=b'public immutable';sha=hashlib.sha256(public).hexdigest()
            files={'source/a.svg':public,'target/a.svg':b'changed','source/unknown.svg':public,'control/raw.json':b'private raw synthetic'}
            for name,raw in files.items():p=private/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
            original=root/'original.zip'
            with zipfile.ZipFile(original,'x') as z:z.writestr('original.json',b'full synthetic original')
            evidence=root/'evidence.zip';result=support.preserve_fixture(private,[original],root,'b'*40,{'a.svg':sha},{'a.svg':len(public)},evidence,lambda n:(len(public),sha))
            manifest=support.verify_fixture_evidence(evidence,lambda n:(len(public),sha));rows={r['path']:r for r in manifest['files']}
            self.assertEqual(result['immutablePublicPayloadReferences'],1);self.assertIn('reference',rows['source/a.svg'])
            with zipfile.ZipFile(evidence) as z:
                for name,raw in files.items():
                    if name!='source/a.svg':self.assertEqual(z.read(rows[name]['blob']),raw)
                self.assertEqual(z.read(manifest['archives'][0]['member']),original.read_bytes())
            self.assertEqual({n:(private/n).read_bytes() for n in files},files)

    def test_reference_drift_or_modified_stored_bytes_cannot_be_accepted(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);private=root/'private';(private/'source').mkdir(parents=True);(private/'source/a').write_bytes(b'exact');(private/'metadata').write_bytes(b'full metadata')
            sha=hashlib.sha256(b'exact').hexdigest();evidence=root/'evidence.zip'
            support.preserve_fixture(private,[],root,'b'*40,{'a':sha},{'a':5},evidence,lambda n:(5,sha))
            with self.assertRaisesRegex(support.FixtureRefusal,'immutable-public-reference-differs'):support.verify_fixture_evidence(evidence,lambda n:(5,'f'*64))
            with zipfile.ZipFile(evidence) as z:members={n:z.read(n) for n in z.namelist()}
            manifest=json.loads(members['private-tree-manifest.json']);blob=next(r['blob'] for r in manifest['files'] if 'blob' in r);members[blob]=b'changed'
            changed=root/'changed.zip'
            with zipfile.ZipFile(changed,'x') as z:
                for name,raw in members.items():z.writestr(name,raw)
            with self.assertRaisesRegex(support.FixtureRefusal,'stored-private-evidence-differs'):support.verify_fixture_evidence(changed,lambda n:(5,sha))


if __name__=='__main__':unittest.main()
