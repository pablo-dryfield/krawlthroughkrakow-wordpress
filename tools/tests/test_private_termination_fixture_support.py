"""Small synthetic evidence fixtures; never create the full-size inventory."""
from pathlib import Path
from unittest import mock
import hashlib,json,subprocess,tempfile,unittest,zipfile
from tools import private_termination_fixture_support as support


class PrivateTerminationFixtureSupportTests(unittest.TestCase):
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
