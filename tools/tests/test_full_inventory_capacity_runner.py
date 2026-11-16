"""Bounded authenticated read-only transport and a genuinely offline default runner."""
import importlib.util,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from tools import content_update_backup as backup
from tools.tests import test_full_inventory_capacity as fixtures

spec=importlib.util.spec_from_file_location('ktk_capacity_runner_tests',Path(__file__).resolve().parents[1]/'audit-staging-full-inventory-capacity.py')
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)


class Response:
    def __init__(self,request,value,status=200,headers=None,url=None,raw=None):
        self.status=status;self.headers=headers if headers is not None else {'CF-Cache-Status':'DYNAMIC','Cache-Control':'private, no-store','Content-Type':'application/json'};self.url=url or request.full_url;self.raw=backup.encode(value) if raw is None else raw
    def geturl(self):return self.url
    def read(self,count):return self.raw[:count]
    def __enter__(self):return self
    def __exit__(self,*args):pass


class Opener:
    def __init__(self,value,**options):self.value=value;self.options=options;self.calls=[]
    def open(self,request,timeout):self.calls.append((request,timeout));return Response(request,self.value,**self.options)


@unittest.skipUnless(fixtures.base.PHP,'PHP required to obtain a real compiled capacity response')
class CapacityTransportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        output,cls.inputs=fixtures.CapacityProbeTests(methodName='runTest').fixture();cls.value=output['body']
    def fetch(self,opener):
        h=self.inputs;return runner.fetch(fixtures.base.TOKEN,backup.sha(h['source']),h['owned'],h['sizes'],h['protected'],opener)
    def test_exact_uncached_post_returns_validated_metadata_once(self):
        opener=Opener(self.value);self.assertEqual(self.fetch(opener),self.value);self.assertEqual(len(opener.calls),1);request,timeout=opener.calls[0];self.assertEqual(request.get_method(),'POST');self.assertEqual(request.data,b'{}');self.assertTrue(request.full_url.startswith(runner.capacity.URL+'?ktk_full_inventory_capacity='));self.assertEqual(timeout,180)
    def test_cached_redirected_wrong_content_type_and_oversized_responses_fail_without_retry(self):
        options=[{'status':409},{'url':'https://krawlthroughkrakow.com/'},{'headers':{'CF-Cache-Status':'HIT','Cache-Control':'no-store','Content-Type':'application/json'}},{'headers':{'CF-Cache-Status':'DYNAMIC','Cache-Control':'public','Content-Type':'application/json'}},{'headers':{'CF-Cache-Status':'DYNAMIC','Cache-Control':'no-store-evil','Content-Type':'application/json'}},{'headers':{'CF-Cache-Status':'DYNAMIC','Cache-Control':'no-store','Content-Type':'text/html'}},{'headers':{'CF-Cache-Status':'DYNAMIC','Cache-Control':'no-store','Content-Type':'application/jsonx'}},{'raw':b'x'*262145},{'raw':b'{not json'}]
        for option in options:
            with self.subTest(option=list(option)):
                opener=Opener(self.value,**option)
                with self.assertRaises(RuntimeError):self.fetch(opener)
                self.assertEqual(len(opener.calls),1)
    def test_raw_original_data_and_added_fields_are_never_returned_or_logged(self):
        opener=Opener({**self.value,'database':{'posts':['Private original contents']}})
        with self.assertRaises(RuntimeError) as raised:self.fetch(opener)
        self.assertNotIn('Private original',str(raised.exception));self.assertEqual(len(opener.calls),1)


class CapacityOfflineTests(unittest.TestCase):
    def test_default_creates_metadata_report_without_connection_helper_or_payload_copy(self):
        with tempfile.TemporaryDirectory(prefix='ktk-cap-offline-') as directory:
            root=Path(directory);mu=root/'staging/wp-content/mu-plugins';(mu/'ktk-code-pages-assets').mkdir(parents=True);(mu/'ktk-code-pages.php').write_bytes(b'renderer');(mu/'ktk-code-pages-assets/registry.php').write_bytes(b'registry');owned={p.relative_to(mu).as_posix():backup.sha(p.read_bytes()) for p in mu.rglob('*') if p.is_file()};destination=root/'docs/seo/capacity.json';hashes={'tools/source.py':'a'*64};argv=['capacity','--application-commit','b'*40,'--tooling-commit','c'*40,'--protected-state-sha256','d'*64,'--report',str(destination)]
            with patch.object(runner,'ROOT',root),patch.object(runner.sys,'argv',argv),patch.object(runner.runner,'reviewed_source',return_value=(owned,hashes)),patch.object(runner,'fingerprints',return_value=hashes),patch.object(runner,'BoundedStagingFTPS') as transport,patch.object(runner.capacity,'helper_source') as compiler,patch.object(runner,'fetch') as request:
                runner.main();transport.assert_not_called();compiler.assert_not_called();request.assert_not_called()
            report=json.loads(destination.read_bytes());self.assertEqual(report['phase'],'offline-validated');self.assertFalse(report['fullHostAcceptance']);self.assertFalse(report['quotaVerified']);self.assertEqual(report['privateAllocationBytes'],0);self.assertEqual(report['publicOwnedFiles'],2);self.assertEqual((mu/'ktk-code-pages.php').read_bytes(),b'renderer')
    def test_rejected_source_never_instantiates_a_network_connection(self):
        with tempfile.TemporaryDirectory(prefix='ktk-cap-gate-') as directory:
            root=Path(directory);argv=['capacity','--audit-staging','--application-commit','b'*40,'--tooling-commit','c'*40,'--protected-state-sha256','d'*64,'--report',str(root/'docs/seo/capacity.json')]
            with patch.object(runner,'ROOT',root),patch.object(runner.sys,'argv',argv),patch.object(runner.runner,'reviewed_source',side_effect=ValueError('Not reviewed')),patch.object(runner,'BoundedStagingFTPS') as transport:
                with self.assertRaises(ValueError):runner.main()
                transport.assert_not_called()


if __name__=='__main__':unittest.main()
