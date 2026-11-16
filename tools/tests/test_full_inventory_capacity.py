"""Compiled read-only WordPress capacity probe: auth/identity, exact source, no data disclosure or writes."""
import copy,json,time,unittest
from unittest.mock import patch
from tools import full_inventory_capacity as capacity
from tools import content_update_backup as backup
from tools.tests import test_staging_protected_state as base

INPUT=r'''
class CapacityInput{public $context;private $position=0;public function stream_open($path,$mode,$options,&$opened){return $path==='php://input';}
public function stream_read($count){$s=substr($GLOBALS['c']['body'],$this->position,$count);$this->position+=strlen($s);return $s;}
public function stream_eof(){return $this->position>=strlen($GLOBALS['c']['body']);}public function stream_stat(){return array();}}
stream_wrapper_unregister('php');stream_wrapper_register('php',CapacityInput::class);
'''
assert base.DRIVER.count("require $c['helper'];")==1
DRIVER=base.DRIVER.replace("require $c['helper'];",INPUT+"require $c['helper'];")


@unittest.skipUnless(base.PHP,'PHP required for the compiled metadata-only capacity probe')
class CapacityProbeTests(unittest.TestCase):
    def fixture(self,mutate=None,driver=DRIVER,expired=False):
        server=base.SnapshotPHPTests(methodName='runTest');baseline,_=server.fixture();protected=baseline['body']['protectedStateSha256'];holder={}
        def setup(config,mu,store):
            owned={n:backup.sha((mu/n).read_bytes()) for n in ('ktk-code-pages.php','ktk-code-pages-assets/registry.php')};sizes={n:(mu/n).stat().st_size for n in owned};expiry=int(time.time())+500
            source=capacity.helper_source(base.NAME,base.TOKEN,expiry,owned,sizes,protected)
            if expired:
                needle=str(expiry).encode();assert source.count(needle)==1;source=source.replace(needle,b'1')
            (mu/base.NAME).write_bytes(source);config['body']='{}';holder.update(source=source,owned=owned,sizes=sizes,protected=protected)
            if mutate:mutate(config,mu,store)
        with patch.object(base,'DRIVER',driver):output,_=server.fixture(mutate=setup)
        return output,holder
    def test_two_actual_captures_return_only_bound_metadata_and_preserve_every_file(self):
        output,h=self.fixture();self.assertEqual(output['status'],200);value=capacity.validate(output['body'],backup.sha(h['source']),h['owned'],h['sizes'],h['protected']);self.assertEqual(len(output['queries']),14);self.assertTrue(all(q.startswith('SELECT ') for q in output['queries']));self.assertEqual(value['inventory']['files'],2);self.assertFalse(value['filesystem']['quotaVerified']);self.assertFalse(value['fullHostAcceptance']);self.assertNotIn('post_content',json.dumps(value));self.assertNotIn('Krak',json.dumps(value));self.assertEqual(value['privateAllocationBytes'],0)
    def test_unauthenticated_expired_or_wrong_identity_and_method_never_query(self):
        for key,value in [('token','wrong'),('host','other.example'),('method','GET'),('home','https://krawlthroughkrakow.com/'),('public',1)]:
            with self.subTest(key=key):
                output,h=self.fixture(lambda c,mu,store:c.update({key:value}));self.assertFalse(output['queries']);self.assertTrue(output.get('noSnapshot') or output.get('status')==403)
        output,h=self.fixture(expired=True);self.assertTrue(output['noSnapshot']);self.assertFalse(output['queries'])
    def test_noncanonical_body_and_client_paths_are_refused_without_query(self):
        for body in ('','{ }','{"path":"/public_html"}','{}x','x'*2049):
            with self.subTest(body=body[:20]):
                output,h=self.fixture(lambda c,mu,store:c.update(body=body));self.assertEqual(output['status'],409);self.assertFalse(output['queries']);self.assertEqual(output['body'],{'error':'read_only_capacity_failed'})
    def test_changed_public_protected_or_selected_rows_refuse_with_generic_error(self):
        def public(c,mu,store):(mu/'ktk-code-pages.php').write_bytes(b'changed')
        def protected(c,mu,store):(store/'ktk-storefront.php').write_bytes(b'changed protected')
        def rows(c,mu,store):c['rows']['posts'][0].update(post_content='Private changed original record')
        for mutate in (public,protected,rows):
            output,h=self.fixture(mutate);self.assertEqual(output['status'],409);self.assertEqual(output['body'],{'error':'read_only_capacity_failed'});self.assertNotIn('Private changed',json.dumps(output))
    def test_between_capture_drift_is_not_reported_stable(self):
        needle='$this->queries[]=$query;';assert DRIVER.count(needle)==1
        changed=DRIVER.replace(needle,needle+"if(count($this->queries)===8){$GLOBALS['c']['rows']['posts'][0]['post_content']='Private changed during capture';}")
        output,h=self.fixture(driver=changed);self.assertEqual(output['status'],409);self.assertEqual(output['body'],{'error':'read_only_capacity_failed'});self.assertNotIn('Private changed',json.dumps(output))
    def test_database_and_identifier_errors_are_never_disclosed(self):
        for key in ('dbError','unsafeTable'):
            output,h=self.fixture(lambda c,mu,store:c.update({key:True}));self.assertEqual(output['status'],409);self.assertEqual(output['body'],{'error':'read_only_capacity_failed'});self.assertNotIn('private diagnostic',json.dumps(output))
    def test_validator_rejects_raw_rows_extra_fields_mutation_counters_and_overclaims(self):
        output,h=self.fixture();valid=output['body']
        cases=[{**valid,'database':{'posts':[]}},{**valid,'privateAllocationBytes':1},{**valid,'fullHostAcceptance':True},{**valid,'helperSha256':'f'*64},{**valid,'filesystem':{**valid['filesystem'],'quotaVerified':True}},{**valid,'identity':{**valid['identity'],'blogPublic':False}},{**valid,'runtime':{**valid['runtime'],'captureNanoseconds':[True,1]}},{**valid,'inventory':{**valid['inventory'],'bytes':1}}]
        for value in cases:
            with self.subTest(keys=list(value)):
                with self.assertRaises(ValueError):capacity.validate(value,backup.sha(h['source']),h['owned'],h['sizes'],h['protected'])


class CapacityCompilerTests(unittest.TestCase):
    def metadata(self):
        owned={'ktk-code-pages.php':'a'*64,'ktk-code-pages-assets/registry.php':'b'*64,'ktk-code-pages-assets/media/original.mp4':'c'*64};sizes={n:10 for n in owned};sizes['ktk-code-pages-assets/media/original.mp4']=35437747;return owned,sizes
    def test_large_original_file_is_only_metadata_never_embedded_or_rewritten(self):
        owned,sizes=self.metadata();source=capacity.helper_source(base.NAME,base.TOKEN,int(time.time())+600,owned,sizes,'d'*64);self.assertNotIn(base.TOKEN.encode(),source);self.assertNotIn(b'__KTK_CAPACITY_',source);self.assertLess(len(source),100000);self.assertEqual(backup.sha(capacity.CORE.read_bytes()),capacity.CORE_SHA);self.assertIn(b"'privateAllocationBytes'=>0",source)
    def test_unowned_ambiguous_bad_or_unbounded_metadata_is_refused(self):
        owned,sizes=self.metadata()
        cases=[({**owned,'../bad':'a'*64},sizes),({**owned,'ktk-code-pages-production.php':'a'*64},{**sizes,'ktk-code-pages-production.php':10}),(owned,{**sizes,'ktk-code-pages.php':True}),(owned,{**sizes,'ktk-code-pages.php':67108865}),({1:'a'*64}, {1:10}),({**owned,'ktk-code-pages-assets/REGISTRY.php':'a'*64},{**sizes,'ktk-code-pages-assets/REGISTRY.php':10})]
        for a,b in cases:
            with self.assertRaises(ValueError):capacity.helper_source(base.NAME,base.TOKEN,int(time.time())+600,a,b,'d'*64)
    def test_wrong_name_token_expiry_protected_binding_and_changed_core_refused(self):
        owned,sizes=self.metadata();expiry=int(time.time())+600
        for name,token,expires,protected in [('production.php',base.TOKEN,expiry,'d'*64),(base.NAME,'wrong',expiry,'d'*64),(base.NAME,base.TOKEN,1,'d'*64),(base.NAME,base.TOKEN,int(time.time())+1200,'d'*64),(base.NAME,base.TOKEN,True,'d'*64),(base.NAME,base.TOKEN,expiry,'wrong')]:
            with self.assertRaises(ValueError):capacity.helper_source(name,token,expires,owned,sizes,protected)
        with patch.object(capacity,'CORE_SHA','0'*64):
            with self.assertRaises(ValueError):capacity.helper_source(base.NAME,base.TOKEN,expiry,owned,sizes,'d'*64)


if __name__=='__main__':unittest.main()
