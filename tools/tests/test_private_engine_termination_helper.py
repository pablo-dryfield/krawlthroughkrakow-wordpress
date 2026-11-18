"""Native distinct helper entry; synthetic state only, no hosting or account access."""
import ast
import copy
from pathlib import Path
import time
import unittest

from tools import content_update_backup as backup
from tools import private_engine_readonly as readonly
from tools import private_engine_termination_config as factory
from tools import private_engine_termination_helper as helper
from tools.tests import test_private_engine_termination_controller as protocol

OLD=protocol.prior.bound.native.bridge.old
DRIVER=OLD.PREFIX+r'''
$wpdb=new FixtureDB();$GLOBALS['termination_callbacks']=array();$GLOBALS['ordinary_marker']=false;
$GLOBALS['phases']=$c['terminationPhases'];
function add_action($hook,$callback,$priority){$GLOBALS['termination_callbacks'][$hook][]=$callback;}
function did_action($hook){return $GLOBALS['phases'][$hook]??0;}
function is_multisite(){return $GLOBALS['c']['terminationMultisite'];}
if(!$c['terminationMissingNoCache']){function nocache_headers(){}}
if(!$c['terminationMissingEncoder']){
 function wp_json_encode($value,$flags=0,$depth=512){
  // The documented valid-UTF-8 WordPress fast path. Installed WordPress remains a hosted gate.
  if(is_array($value)&&isset($value['privateProfile'])){
   if($GLOBALS['c']['terminationEncoderFault']==='oversize'){return str_repeat('x',2097153);}
   if($GLOBALS['c']['terminationEncoderFault']==='false'){return false;}
  }
  return json_encode($value,$flags,$depth);
 }
}
function wp_send_json($value,$status=200){http_response_code($status);echo wp_json_encode($value);exit;}
$_SERVER=array_merge($_SERVER,$c['terminationHeaders']);$_SERVER['HTTP_HOST']=$c['terminationHost'];$_SERVER['REQUEST_METHOD']=$c['terminationMethod'];
$_GET=array('ktk_private_engine_termination'=>$c['terminationQuery']);
ob_start();register_shutdown_function(static function()use($wpdb){$wire=ob_get_clean();echo json_encode(array('status'=>http_response_code()?:200,'wire'=>$wire,'body'=>json_decode($wire,true),'queries'=>$wpdb->queries,'ordinaryMarker'=>$GLOBALS['ordinary_marker'],'privateFlag'=>defined('KTK_STAGING_STATE_ALLOWED'),'oldEngineClass'=>class_exists('KTK_Active_Content_Transaction',false),'oldControllerClass'=>class_exists('KTK_Full_Private_Engine_Controller',false)),JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);});
require $c['helper'];foreach($GLOBALS['termination_callbacks']['muplugins_loaded']??array() as $callback){$callback();}
$GLOBALS['ordinary_marker']=true;$GLOBALS['phases']['plugins_loaded']=1;$GLOBALS['phases']['wp_loaded']=1;
echo '<html>ordinary synthetic staging</html>';
'''


@unittest.skipUnless(OLD.PHP,'Real PHP required for distinct private termination helper')
class PrivateEngineTerminationHelperTests(unittest.TestCase):
    def setUp(self):
        self.protocol=protocol.PrivateEngineTerminationControllerTests('runTest')
        self.protocol.setUp();self.addCleanup(self.protocol.doCleanups)
        self.case=self.protocol.case

    def configure(self,prepared=False):
        self.protocol.configure(prepared=prepared)

    def bindings(self,value,predecessor=None):
        p=self.protocol;b=p.binding
        kw=dict(source_root=p.case.mu,original_path=b.original,witness_path=b.fence_witness,public_root=p.case.cfg['packet']['publicRoot'])
        if value['operation']=='inspect':kw['witness_path']=b.inspection_witness
        else:kw.update(metadata_path=b.metadata,rollback_path=b.rollback,predecessor=predecessor or b.inspection_packet,fence_packet=None if value['operation']=='fence' else p.fence)
        if value['operationId'] in getattr(p,'witnesses',{}):kw['witness_path']=p.witnesses[value['operationId']]
        return kw

    def compile(self,value,predecessor=None):
        p=self.protocol
        desired='ktk-transaction-rehearsal-'+value['operationId']+'.php'
        if Path(self.case.cfg['helper']).name!=desired:p.helper(value['operationId'])
        value={**value,'sourceHashes':helper.source_hashes()}
        packet,source=helper.compile_context(value,p.binding.old,**self.bindings(value,predecessor))
        self.assertEqual(helper.helper_source(packet,p.binding.old,**self.bindings(packet,predecessor)),source)
        self.assertEqual(packet['helperSha256'],backup.sha(source))
        # Native CLI input seam only; restore it to recover every production helper byte.
        old=b"file_get_contents('php://input',false,null,0,2049)";new=b"($GLOBALS['c']['terminationBody']??'')"
        self.assertEqual(source.count(old),1);fixture=source.replace(old,new,1)
        self.assertEqual(fixture.replace(new,old,1),source)
        Path(self.case.cfg['helper']).write_bytes(fixture)
        self.production_source=source;self.fixture_sha=backup.sha(fixture)
        return packet

    def invoke(self,value,action=None,state=None,**changes):
        c=copy.deepcopy(self.case.cfg)
        c.update(terminationHeaders={'HTTP_X_KTK_PRIVATE_TERMINATION_TOKEN':value['token']},terminationHost='krawlthroughkrakow.com',terminationMethod='POST',terminationQuery=value['operationId'],terminationPhases={'muplugins_loaded':1,'plugins_loaded':0,'wp_loaded':0},terminationMultisite=False,terminationMissingNoCache=False,terminationMissingEncoder=False,terminationEncoderFault='',terminationBody=factory.request(value,action or value['operation'],state).decode())
        c.update(changes)
        if 'home' in changes:c['home']=changes['home']
        driver=self.case.root/'distinct-helper-driver.php';driver.write_text(DRIVER)
        before_public=self.protocol.fixture.native.files(self.case.root/'public_html')
        before_private=self.protocol.fixture.native.files(self.case.private)
        result=self.case.case.call(self.case.root,driver,c)
        self.assertEqual(self.protocol.fixture.native.files(self.case.root/'public_html'),before_public)
        self.last_private_before=before_private
        self.last_private_after=self.protocol.fixture.native.files(self.case.private)
        self.assertFalse(result['oldEngineClass']);self.assertFalse(result['oldControllerClass'])
        return result

    def inspection_packet(self):return self.compile(self.protocol.binding.inspection_packet)

    def test_compiler_pins_complete_sources_archives_and_exact_frozen_components(self):
        self.configure();value=self.inspection_packet();source=self.production_source
        raw=(helper.ROOT/'tools/staging-protected-state-core.php').read_bytes()
        bounded32=helper.fast_state.TARGET.read_bytes()
        derived=helper.recovery_hashing.enlarge_capture(bounded32)
        self.assertEqual(helper.recovery_hashing.restore_capture(derived),bounded32)
        self.assertEqual(helper.fast_state.inverse(bounded32),raw)
        self.assertTrue(derived[6:] in source,'Complete measured capture must be embedded')
        census=helper.fast_census.TARGET.read_bytes()
        self.assertEqual(helper.fast_census.inverse(census),(helper.ROOT/'tools/private-engine-fenced-inspection.php').read_bytes())
        self.assertTrue(census[6:] in source,'Complete original census must remain embedded')
        self.assertTrue(readonly.read_only_source()[6:] in source,'Read-only engine must remain embedded')
        self.assertFalse(b'final class KTK_Active_Content_Transaction' in source,'Old engine class must remain absent')
        self.assertFalse(b'final class KTK_Full_Private_Engine_Controller' in source,'Old controller class must remain absent')
        self.assertFalse(value['token'].encode() in source,'Plain operation token must remain absent')
        self.assertFalse(b'__KTK_PRIVATE_TERMINATION_' in source,'Every template marker must be resolved')
        self.assertTrue(b"add_action('muplugins_loaded'," in source,'Early hook must remain')
        self.assertFalse(b"add_action('wp_loaded'," in source,'Late hook must remain absent')
        for changes in ({'sourceHashes':{}},{'sourceHashes':{**value['sourceHashes'],'tools/private-engine-termination.php':'f'*64}},{'operation':'apply'}):
            bad={**value,**changes}
            with self.assertRaises(ValueError):helper.helper_source(bad,self.protocol.binding.old,**self.bindings(value))
        hashes=helper.source_hashes()
        for name in helper.PYTHON_SOURCES:
            for node in ast.walk(ast.parse((helper.ROOT/'tools'/name).read_text())):
                if isinstance(node,ast.ImportFrom):
                    modules=[a.name for a in node.names] if node.module=='tools' else [node.module.split('.')[1]] if node.module and node.module.startswith('tools.') else []
                    for module in modules:self.assertIn('tools/'+module+'.py',hashes)

    def test_missing_wrong_original_headers_and_query_are_inert_before_private_queries(self):
        self.configure();value=self.inspection_packet()
        for changes in ({'terminationHeaders':{}},{'terminationHeaders':{'HTTP_X_KTK_PRIVATE_TERMINATION_TOKEN':'x'*43}},{'terminationHeaders':{'HTTP_X_KTK_FULL_ENGINE_TOKEN':self.protocol.binding.old['token']}},{'terminationHeaders':{'HTTP_X_KTK_FULL_ENGINE_TOKEN':value['token']}},{'terminationHeaders':{'HTTP_X_KTK_PRIVATE_TERMINATION_TOKEN':self.protocol.binding.old['token']}},{'terminationQuery':value['transactionId']},{'terminationQuery':None}):
            with self.subTest(changes=changes):
                out=self.invoke(value,**changes);self.assertTrue(out['ordinaryMarker']);self.assertFalse(out['privateFlag']);self.assertEqual(out['queries'],[]);self.assertEqual(self.last_private_before,self.last_private_after)

    def test_real_expiry_returns_to_ordinary_hooks_without_loading_private_components(self):
        self.configure();value={**self.protocol.binding.inspection_packet,'expires':int(time.time())+5};value=self.compile(value)
        time.sleep(max(0,value['expires']-time.time())+.05)
        out=self.invoke(value);self.assertTrue(out['ordinaryMarker']);self.assertFalse(out['privateFlag']);self.assertEqual(out['queries'],[]);self.assertEqual(self.last_private_before,self.last_private_after)

    def test_authenticated_wrong_identity_bootstrap_and_requests_refuse_before_capture(self):
        self.configure();value=self.inspection_packet()
        for changes in ({'terminationMethod':'GET'},{'terminationHost':'other.invalid'},{'home':'https://krawlthroughkrakow.com/'},{'site':self.case.cfg['packet']['publicRoot']},{'public':1},{'terminationMultisite':True},{'terminationPhases':{'muplugins_loaded':1,'plugins_loaded':1,'wp_loaded':0}},{'terminationMissingNoCache':True},{'terminationMissingEncoder':True},{'terminationBody':'x'*2049},{'terminationBody':'{}'},{'terminationBody':'{"action":"apply"}'},{'terminationBody':factory.request(self.protocol.fence,'fence').decode()}):
            with self.subTest(changes=changes):
                out=self.invoke(value,**changes);self.assertIn(out['status'],(403,409));self.assertFalse(out['ordinaryMarker']);self.assertEqual(out['queries'],[]);self.assertEqual(self.last_private_before,self.last_private_after)

    def test_real_four_roles_use_full_captures_new_contexts_and_preserve_original_metadata(self):
        self.configure(prepared=True);p=self.protocol
        inspect=self.inspection_packet();out=self.invoke(inspect);self.assertEqual(out['status'],200,out['body']);self.assertEqual(self.last_private_before,self.last_private_after)
        fence=self.compile(p.fence);out=self.invoke(fence);self.assertEqual(out['status'],200,out['body']);self.assertEqual(out['body']['controller']['closureWrites'],1)
        signed=(self.case.private/'control/closed.json').read_bytes()
        inspected=self.compile(p.later('inspect-fenced',fence),fence);out=self.invoke(inspected);self.assertEqual(out['status'],200,out['body']);self.assertEqual(self.last_private_before,self.last_private_after)
        state=out['body']['controller']['state']['stateSha256']
        cleanup=self.compile(p.later('cleanup',inspected),inspected);out=self.invoke(cleanup,'cleanup-payload',state);self.assertEqual(out['status'],200,out['body'])
        result=out['body']['controller'];self.assertGreater(result['payloadDeletes'],0);self.assertEqual((self.case.private/'control/closed.json').read_bytes(),signed)
        for key in ('applicationWrites','databaseWrites','cachePurges','productionOperations'):self.assertEqual(result[key],0)
        self.assertFalse(result['fullHostTransactionAcceptance']);self.assertFalse(out['ordinaryMarker'])
        self.assertEqual(out['body']['helperSha256'],self.fixture_sha);self.assertLessEqual(len(out['wire'].encode()),2097152)
        self.assertTrue(out['queries']);self.assertTrue(all(q.startswith('SELECT ') for q in out['queries']))
        self.assertEqual(len(out['queries'])%7,0)
        self.assertEqual(out['body']['runtime']['phases'],{'muplugins_loaded':1,'plugins_loaded':0,'wp_loaded':0})
        self.assertFalse(out['body']['runtime']['isMultisite'])

    def test_wrong_helper_basename_is_refused_before_queries_or_private_flags(self):
        self.configure();value=self.inspection_packet()
        correct=Path(self.case.cfg['helper']);wrong=correct.with_name('ktk-transaction-rehearsal-'+'f'*32+'.php')
        self.assertTrue(wrong.resolve().is_relative_to(self.case.root.resolve()));self.assertFalse(wrong.exists());wrong.write_bytes(correct.read_bytes())
        try:
            out=self.invoke(value,helper=wrong.as_posix());self.assertEqual(out['status'],409);self.assertEqual(out['queries'],[]);self.assertFalse(out['privateFlag']);self.assertFalse(out['ordinaryMarker']);self.assertEqual(self.last_private_before,self.last_private_after)
        finally:wrong.unlink()

    def test_encoding_failures_and_database_errors_return_only_generic_error(self):
        self.configure();value=self.inspection_packet()
        for changes in ({'terminationEncoderFault':'oversize'},{'terminationEncoderFault':'false'},{'dbError':True}):
            with self.subTest(changes=changes):
                out=self.invoke(value,**changes);self.assertEqual(out['status'],409);self.assertEqual(out['body'],{'error':'private_termination_operation_failed'});self.assertFalse(out['ordinaryMarker']);self.assertEqual(self.last_private_before,self.last_private_after)
                self.assertNotIn('private-db-diagnostic-never-export',out['wire'])


if __name__=='__main__':unittest.main()
