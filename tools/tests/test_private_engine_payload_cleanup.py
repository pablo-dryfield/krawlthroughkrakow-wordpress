"""Native bounded private payload cleanup; no helper/hosting acceptance."""
from pathlib import Path
import time
import unittest
from unittest import mock

from tools import private_engine_termination_config as factory
from tools.tests import test_private_engine_termination_controller as prior


@unittest.skipUnless(prior.prior.bound.native.bridge.old.PHP,'Real PHP required for bounded private cleanup')
class PrivateEnginePayloadCleanupTests(unittest.TestCase):
    def setUp(self):
        self.fixture=prior.PrivateEngineTerminationControllerTests('runTest');self.fixture.setUp();self.addCleanup(self.fixture.doCleanups)
        self.case=self.fixture.case;self.root=self.case.root;self.private=self.case.private
        self.case.cfg['components'].append(str(prior.prior.bound.native.bridge.old.ROOT/'tools/private-engine-payload-cleanup.php'))
        text=self.case.driver.read_text();flag="define('KTK_PRIVATE_ENGINE_TERMINATION_ALLOWED',true);";self.assertEqual(text.count(flag),1);text=text.replace(flag,flag+"define('KTK_PRIVATE_ENGINE_PAYLOAD_CLEANUP_ALLOWED',true);",1)
        anchor="   if($event==='after-private-claim-mkdir'";self.assertEqual(text.count(anchor),1)
        extra="""   if($event==='before-private-payload-delete'&&$c['terminationFault']==='payload-raw'){$GLOBALS['c']['rows']['options'][]=array('option_name'=>'ecwid_last_api_cache_check','option_value'=>'new-raw-during-cleanup');}
   if($event==='before-private-payload-delete'&&$c['terminationFault']==='payload-link'){link($blob,dirname($c['terminationConfig']['initial']['publicRoot']).'/retained-payload-link');}
   if($event==='after-private-payload-directory'&&$c['terminationFault']==='directory-lost-reply'){exit(88);}
   if($event==='after-private-payload-delete'&&$c['terminationFault']==='payload-lost-reply'){exit(87);}
   if($event==='before-private-payload-delete'&&$c['terminationFault']==='payload-change'){file_put_contents($blob,'changed-known-payload');}
   if($event==='before-private-payload-delete'&&$c['terminationFault']==='payload-unknown'){file_put_contents(dirname($blob).'/unknown-private-evidence.txt','retain-unknown');}
   if($event==='before-private-payload-delete'&&$c['terminationFault']==='payload-swap'){$bytes=file_get_contents($blob);rename($blob,dirname($c['terminationConfig']['initial']['publicRoot']).'/retained-swapped-payload');file_put_contents($blob,$bytes);}
"""
        self.case.driver.write_text(text.replace(anchor,extra+anchor,1))

    def files(self,p):return self.fixture.fixture.native.files(p)

    def prepare(self,closed=False):
        self.fixture.configure(closed=closed);self.fixture.call(self.fixture.fence)
        return self.fixture.observe(self.fixture.fence)

    def cleanup(self,view,state,*,success=True,fault='',exit_code=0,packet=None):
        value=packet or self.fixture.later('cleanup',view);cfg=self.fixture.config(value,view);raw=factory.request(value,'cleanup-payload',state['state']['stateSha256']).decode()
        self.case.cfg.update(operation='termination-controller',terminationConfig=cfg,terminationRaw=raw,terminationMethod='POST',terminationHost='krawlthroughkrakow.com',terminationToken=value['token'],terminationNow=int(time.time()),terminationFault=fault)
        public=self.files(self.root/'public_html');before=self.files(self.private)
        out=self.case.case.call(self.root,self.case.driver,self.case.cfg,exit_code=exit_code)
        self.assertEqual(self.files(self.root/'public_html'),public)
        if exit_code:return value,None
        self.assertIs(out['ok'],success,out)
        if success:
            result=out['value'];self.assertFalse(result['fullHostTransactionAcceptance']);self.assertEqual(result['closureWrites'],0)
            for n in ('applicationWrites','databaseWrites','cachePurges','productionOperations'):self.assertEqual(result[n],0)
            self.assertLessEqual(result['payloadDeletes'],256);self.assertLessEqual(result['payloadDirectoriesRemoved'],256)
            remaining=self.files(self.private)
            for n,h in before.items():
                rel=Path(n).relative_to(self.private).as_posix() if Path(n).is_absolute() else n
                if rel not in cfg['fenced']['payload']:self.assertEqual(remaining[n],h,n)
            return value,result
        return value,out

    def test_known_payload_removed_with_every_metadata_byte_and_claim_retained(self):
        view,state=self.prepare();expected=state['state']['remainingPayloadFiles'];self.assertGreater(expected,0);self.assertLessEqual(expected,256)
        value,result=self.cleanup(view,state);self.assertEqual(result['payloadDeletes'],expected);self.assertEqual(result['state']['remainingPayloadFiles'],0)
        self.assertFalse((self.private/'source').exists());self.assertFalse((self.private/'target').exists());self.assertTrue(self.fixture.marker(value).exists());self.assertFalse(result['state']['originalPrivateTreeFullyRemoved'])
        view2,after=self.fixture.observe(value);empty=self.fixture.later('cleanup',view2);_,refused=self.cleanup(view2,after,success=False,packet=empty);self.assertIn('No known payload',refused['message']);self.assertFalse(self.fixture.marker(empty).exists())

    def test_closure_prefix_cannot_delete_payload_or_consume_cleanup_claim(self):
        self.fixture.configure();self.fixture.call(self.fixture.fence,fault='closure-prefix',exit_code=84);view,state=self.fixture.observe(self.fixture.fence)
        before=self.files(self.private);value,out=self.cleanup(view,state,success=False);self.assertIn('separate invocation',out['message']);self.assertFalse(self.fixture.marker(value).exists());self.assertEqual(self.files(self.private),before)

    def test_lost_delete_reply_uses_new_inspection_and_new_context(self):
        view,state=self.prepare();value,_=self.cleanup(view,state,fault='payload-lost-reply',exit_code=87);self.assertTrue(self.fixture.marker(value).exists())
        before=self.files(self.private);self.cleanup(view,state,packet=value,success=False);self.assertEqual(self.files(self.private),before)
        current,remaining=self.fixture.observe(value);self.assertEqual(remaining['state']['remainingPayloadFiles'],state['state']['remainingPayloadFiles']-1)
        new,result=self.cleanup(current,remaining);self.assertNotEqual(new['operationId'],value['operationId']);self.assertEqual(result['state']['remainingPayloadFiles'],0);self.assertTrue(self.fixture.marker(value).exists())

    def test_changed_first_payload_preserved_before_any_deletion(self):
        view,state=self.prepare();value,out=self.cleanup(view,state,success=False,fault='payload-change');self.assertIn('preserv',out['message']);self.assertTrue(self.fixture.marker(value).exists())
        self.assertEqual(len(self.files(self.private)),len(state['state']['files']));self.assertIn(b'changed-known-payload',[p.read_bytes() for p in self.private.rglob('*') if p.is_file() and p.stat().st_size<64])

    def test_unknown_evidence_preserved_before_first_delete(self):
        view,state=self.prepare();before=self.files(self.private);value,out=self.cleanup(view,state,success=False,fault='payload-unknown');self.assertIn('Unknown',out['message'])
        now=self.files(self.private)
        for n,h in before.items():self.assertEqual(now[n],h)
        unknown=list(self.private.rglob('unknown-private-evidence.txt'));self.assertEqual(len(unknown),1);self.assertEqual(unknown[0].read_bytes(),b'retain-unknown');self.assertTrue(self.fixture.marker(value).exists())

    def test_same_byte_inode_swap_is_preserved(self):
        view,state=self.prepare();before=self.files(self.private);value,out=self.cleanup(view,state,success=False,fault='payload-swap');self.assertIn('preserved before read',out['message'])
        self.assertEqual(self.files(self.private),before);self.assertTrue((self.root/'retained-swapped-payload').is_file());self.assertTrue(self.fixture.marker(value).exists())

    def test_new_raw_witness_between_contexts_is_preserved(self):
        view,state=self.prepare();self.fixture.fixture.native.change_cache_row();current,changed=self.fixture.observe(view)
        options=[dict(row) for row in self.case.cfg['rows']['options']];value,result=self.cleanup(current,changed)
        self.assertFalse(result['state']['originalProtectedStateStillExact']);self.assertEqual(self.case.cfg['rows']['options'],options);self.assertEqual(result['state']['remainingPayloadFiles'],0)

    def test_raw_change_immediately_before_first_delete_refuses_and_preserves_private_bytes(self):
        view,state=self.prepare();before=self.files(self.private);value,out=self.cleanup(view,state,success=False,fault='payload-raw')
        self.assertIn('witness changed',out['message']);self.assertEqual(self.files(self.private),before);self.assertTrue(self.fixture.marker(value).exists())

    def test_hardlinked_payload_is_preserved(self):
        view,state=self.prepare();before=self.files(self.private);value,out=self.cleanup(view,state,success=False,fault='payload-link')
        self.assertIn('preserv',out['message']);self.assertEqual(self.files(self.private),before);link=self.root/'retained-payload-link';self.assertTrue(link.is_file());self.assertEqual(link.stat().st_nlink,2);self.assertTrue(self.fixture.marker(value).exists())

    def test_directory_removal_lost_reply_finishes_under_new_context_without_payload_recreation(self):
        view,state=self.prepare();value,_=self.cleanup(view,state,fault='directory-lost-reply',exit_code=88)
        current,left=self.fixture.observe(value);self.assertEqual(left['state']['remainingPayloadFiles'],0);new,result=self.cleanup(current,left)
        self.assertEqual(result['payloadDeletes'],0);self.assertGreater(result['payloadDirectoriesRemoved'],0);self.assertFalse((self.private/'source').exists());self.assertFalse((self.private/'target').exists());self.assertTrue(self.fixture.marker(value).exists());self.assertTrue(self.fixture.marker(new).exists())

    def test_actual_large_inventory_caps_files_and_empty_directories_at_256(self):
        self.fixture.doCleanups()
        klass=prior.prior.bound.native.bridge.FullPrivatePreparationIntegrationTests;original=klass.install_source
        def enlarged(case,source):
            source['ktk-code-pages-assets/media/large.bin']=b'count-limit synthetic file; large bytes covered separately'
            source.update({'ktk-code-pages-assets/content/limits/topic-'+format(i,'03d')+'/inner/body.html':('native bounded payload '+str(i)).encode() for i in range(131)})
            return original(case,source)
        with mock.patch.object(klass,'install_source',enlarged):self.setUp()
        view,state=self.prepare();initial=state['state']['remainingPayloadFiles'];self.assertGreater(initial,256)
        value,result=self.cleanup(view,state);self.assertEqual(result['payloadDeletes'],256);self.assertEqual(result['payloadDirectoriesRemoved'],256);self.assertEqual(result['state']['remainingPayloadFiles'],initial-256)
        for _ in range(5):
            current,left=self.fixture.observe(value)
            dirs=[n for n in left['state']['directories'] if n in ('source','target') or n.startswith(('source/','target/'))]
            if left['state']['remainingPayloadFiles']==0 and not dirs:break
            value,result=self.cleanup(current,left)
        else:self.fail('Bounded cleanup did not finish the known native inventory')
        self.assertFalse((self.private/'source').exists());self.assertFalse((self.private/'target').exists());self.assertTrue(self.fixture.marker(value).exists())

    def test_original_rolledback_closure_and_engine_prior_retained(self):
        view,state=self.prepare(closed=True);closed=(self.private/'control/closed.json').read_bytes()
        value,result=self.cleanup(view,state);self.assertEqual(result['state']['closureState'],'original-rolled-back');self.assertEqual((self.private/'control/closed.json').read_bytes(),closed);self.assertEqual(result['state']['remainingPayloadFiles'],0)


if __name__=='__main__':unittest.main()
