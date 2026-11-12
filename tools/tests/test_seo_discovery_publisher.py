import copy
import importlib.util
import io
import ftplib
import json
import subprocess
import tempfile
import unittest
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import Mock, patch

SPEC = importlib.util.spec_from_file_location('seo_publisher',Path(__file__).resolve().parents[1] / 'publish-seo-discovery.py')
module = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(module)


class PublisherTests(unittest.TestCase):
    def test_targets_are_only_three_owned_staging_files(self):
        for name in module.FILES: self.assertTrue(module.remote_path(name).startswith('/public_html/staging/'))
        for name in ['../wp-config.php','ktk-code-pages.php','/public_html/robots.txt','ktk-seo-sitemap-assets/../a.php']:
            with self.assertRaises(ValueError): module.remote_path(name)

    def evidence(self):
        data = json.loads((module.LOCAL / module.FILES[1]).read_text())
        evidence = {'checkedAt':datetime.now(timezone.utc).isoformat(),
                'dataSha256':module.sha((module.LOCAL / module.FILES[1]).read_bytes()),
                'policySha256':module.sha((module.ROOT / 'tools/seo-discovery-policy.json').read_bytes()),
                'verified':[{'url':row['loc'],'canonical':row['loc'],'status':200} for group in ('content','storefront') for row in data[group]]}
        return evidence

    def write_evidence(self, directory):
        report = self.evidence()
        review_path = Path(directory) / 'review.json'
        review_path.write_text('{}')
        report['catalogReview'] = {'file':review_path.relative_to(module.ROOT).as_posix(),'sha256':module.sha(review_path.read_bytes())}
        (Path(directory) / 'build.json').write_text(json.dumps(report))
        return report

    def test_fresh_payload_evidence_required(self):
        with tempfile.TemporaryDirectory(dir=module.ROOT / 'docs/seo') as directory, patch.object(module,'OUT',Path(directory)):
            report = self.write_evidence(directory)
            self.assertEqual(set(module.local_payload()),set(module.FILES))
            for field in ['dataSha256','policySha256']:
                broken = copy.deepcopy(report); broken[field] = 'invalid'
                (Path(directory) / 'build.json').write_text(json.dumps(broken))
                with self.subTest(field=field), self.assertRaises(RuntimeError): module.local_payload()
            report['checkedAt'] = (datetime.now(timezone.utc)-timedelta(days=2)).isoformat()
            (Path(directory) / 'build.json').write_text(json.dumps(report))
            with self.assertRaises(RuntimeError): module.local_payload()

    def test_redirect_noindex_unknown_status_evidence_cannot_pass(self):
        for field,value in [('status',301),('status',404),('canonical','https://krawlthroughkrakow.com/other/')]:
            with tempfile.TemporaryDirectory(dir=module.ROOT / 'docs/seo') as directory, patch.object(module,'OUT',Path(directory)):
                report = self.write_evidence(directory); report['verified'][0][field] = value
                (Path(directory) / 'build.json').write_text(json.dumps(report))
                with self.assertRaises(RuntimeError): module.local_payload()

    def test_expanded_review_evidence_missing_tampered_or_outside_seo_root_fails(self):
        with tempfile.TemporaryDirectory(dir=module.ROOT / 'docs/seo') as directory, patch.object(module,'OUT',Path(directory)):
            good = self.write_evidence(directory)
            for review in [{}, {**good['catalogReview'],'sha256':'tampered'}, {**good['catalogReview'],'file':'AGENTS.md'}, {**good['catalogReview'],'file':'docs/seo/missing-review.json'}]:
                report = copy.deepcopy(good); report['catalogReview'] = review
                (Path(directory) / 'build.json').write_text(json.dumps(report))
                with self.subTest(review=review), self.assertRaises(RuntimeError): module.local_payload()

    def test_probe_is_authenticated_staging_only_and_read_only(self):
        source = module.base.helper_source('staging','a'*64,owned_files=module.FILES,snapshot_extension=module.extension())
        result = subprocess.run(['php','-l'],input=source,capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)
        for marker in [b'HTTP_X_KTK_DEPLOY_TOKEN',b'hash_equals',b'time() >',b"home_url('/') !== 'https://krawlthroughkrakow.com/staging/'",b'production_checksums',b'core_renderer_available',b'is_link']:
            self.assertIn(marker,source)
        for forbidden in [b'update_option(',b'wp_update_post(',b'wp_insert_post(',b'flush_rewrite_rules(',b'shell_exec(',b'exec(']:
            self.assertNotIn(forbidden,source)

    def test_backup_round_trip_tracks_new_files_without_database_restore(self):
        before = {'owned':{name:None for name in module.FILES}}
        existing = {module.FILES[2]:b'previous entry'}
        with tempfile.TemporaryDirectory() as directory, patch.object(module,'ROOT',Path(directory)):
            (Path(directory) / 'deploy-backups').mkdir()
            checkpoint = module.backup(before,existing)
            with zipfile.ZipFile(checkpoint) as archive:
                manifest = json.loads(archive.read('release-manifest.json'))
                self.assertEqual(archive.read(module.FILES[2]),b'previous entry')
                self.assertEqual(manifest['newFiles'],list(module.FILES[:2]))

    def test_rollback_deactivates_entrypoint_before_restoring_assets(self):
        events = []
        with patch.object(module.base,'atomic_upload',side_effect=lambda ftp,name,value:events.append(('restore',name))), patch.object(module.base,'remove_file',side_effect=lambda ftp,name:events.append(('remove',name))):
            module.restore_owned(object(),{module.FILES[1]:b'old data'})
        self.assertEqual(events,[('remove',module.remote_path(module.FILES[2])),('restore',module.remote_path(module.FILES[1])),('remove',module.remote_path(module.FILES[0]))])

    def test_protected_state_or_production_changes_fail(self):
        before = {'protected':{'a':'sha'},'production_checksums':{'b':'sha'},'wordpress_state_sha256':'state','blog_public':0}
        self.assertTrue(module.protected_unchanged(before,copy.deepcopy(before)))
        for name in before:
            after = copy.deepcopy(before); after[name] = 'changed'
            self.assertFalse(module.protected_unchanged(before,after))

    def test_public_catalog_uses_explicit_read_only_json_client(self):
        with patch.object(module.urllib.request,'urlopen',return_value=io.BytesIO(b'{"products":[{"id":28,"slug":"pub-crawl-28"}]}')) as read:
            self.assertEqual(module.public_product_routes(),{28:'pub-crawl-28'})
            request=read.call_args.args[0]
            self.assertEqual(request.get_method(),'GET')
            self.assertEqual(request.get_header('Accept'),'application/json')
            self.assertTrue(request.get_header('User-agent').startswith('Mozilla/5.0 KTK'))

    def test_empty_or_ambiguous_catalog_never_publishes_an_empty_map(self):
        for body in [b'{}',b'{"products":[]}',b'{"products":[{"id":28,"slug":"a"},{"id":28,"slug":"b"}]}']:
            with patch.object(module.urllib.request,'urlopen',return_value=io.BytesIO(body)), self.assertRaises(RuntimeError): module.public_product_routes()

    def test_real_retrying_transport_supports_bounded_staging_cache_cleanup(self):
        prefix='/public_html/staging/wp-content/cache/wp-rocket/krawlthroughkrakow.com/'
        roots=[prefix+'staging/store2',prefix+'store2']
        events=[]
        class Connection:
            def mlsd(self,path):
                if path not in roots: raise AssertionError('Unexpected cache scope: '+path)
                return [('index.html',{'type':'file'})]
            def delete(self,path): events.append(('delete',path))
            def rmd(self,path): events.append(('rmd',path))
        transport=module.common.StagingFTP(factory=Connection)
        self.assertEqual(module.common.store2.clear_store2_cache(transport,staging=True),roots)
        self.assertEqual(events,[('delete',roots[0]+'/index.html'),('rmd',roots[0]),('delete',roots[1]+'/index.html'),('rmd',roots[1])])

    def test_data_only_release_preserves_storefront_cache_but_entrypoint_update_clears_it(self):
        files = {name:(module.LOCAL / name).read_bytes() for name in module.FILES}
        data = json.loads(files[module.FILES[1]])
        expected = {name:module.sha(value) for name,value in files.items()}
        for changed_entrypoint in (False, True):
            with self.subTest(changed_entrypoint=changed_entrypoint), tempfile.TemporaryDirectory() as directory:
                root = Path(directory); checkpoint = root / 'backup.zip'; checkpoint.write_bytes(b'synthetic checkpoint')
                previous = {**files,module.FILES[1]:b'previous data'}
                if changed_entrypoint: previous[module.FILES[2]] += b'previous entrypoint'
                before = {'owned':{name:module.sha(value) for name,value in previous.items()},'protected':data['sourceHashes'],
                          'production_checksums':{'file':'same'},'wordpress_state_sha256':'same','blog_public':0}
                after = {**before,'owned':expected,'seo_version':module.VERSION,'seo_staging_enabled':True}
                ftp = Mock()
                with (patch.object(module,'ROOT',root), patch.object(module,'local_payload',return_value=files),
                      patch.object(module.common,'StagingFTP',return_value=ftp), patch.object(module,'snapshot',side_effect=[before,after]),
                      patch.object(module,'public_product_routes',return_value={item['id']:item['slug'] for item in data['products']}),
                      patch.object(module.common,'retrieve_file',side_effect=lambda _,path:previous[path.removeprefix(module.REMOTE+'/')]),
                      patch.object(module,'backup',return_value=checkpoint), patch.object(module.base,'atomic_upload'),
                      patch.object(module.common.store2,'ensure_dir'), patch.object(module.common.store2,'clear_store2_cache',return_value=['staging-only']) as clear,
                      patch('sys.argv',['publish-seo-discovery.py','--publish','--report','release.json']), patch('builtins.print')):
                    module.main()
                report = json.loads((root / 'release.json').read_text())
                self.assertEqual(report['phase'],'complete')
                self.assertEqual(report['cachePathsCleared'],['staging-only'] if changed_entrypoint else [])
                if changed_entrypoint: clear.assert_called_once_with(ftp,staging=True)
                else: clear.assert_not_called()
                ftp.close.assert_called_once()


if __name__ == '__main__': unittest.main()
