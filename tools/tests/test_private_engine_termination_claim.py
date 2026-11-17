"""Native one-use marker primitive; no fence, payload deletion or hosted caller."""
import json
from pathlib import Path
import subprocess
import unittest

from tools import content_update_backup as backup
from tools.tests import test_content_update_private_store as store

DRIVER=r'''<?php
$c=json_decode(file_get_contents($argv[1]),true,64,JSON_THROW_ON_ERROR);define('KTK_CONTENT_UPDATE_STORE_ALLOWED',true);if($c['allowed']){define('KTK_PRIVATE_ENGINE_TERMINATION_CLAIM_ALLOWED',true);}$captures=0;
try{
 require $c['store'];require $c['component'];
 $s=new KTK_Content_Update_Private_Store($c['private'],$c['public'],$c['transactionId'],$c['key']);
 $guard=static function()use($c,&$captures){$captures++;return $c['guard']&&($c['fault']!=='new-raw-after-claim'||$captures===1);};
 $observer=static function($event,$path)use($c){
  if($event==='after-private-claim-mkdir'&&$c['fault']==='directory-exit'){exit(83);}
  if($event==='after-private-claim-open'&&$c['fault']==='partial-exit'){file_put_contents($path,'partial claimed evidence');exit(84);}
  if($event==='after-private-claim-synced'&&$c['fault']==='lost-reply'){exit(85);}
  if($event==='before-private-claim-sync'&&$c['fault']==='before-sync'){throw new RuntimeException('Controlled claim interruption before sync');}
  if($event==='after-private-claim-open'&&$c['fault']==='changed-before-write'){file_put_contents($path,'external owner claim bytes');}
  if($event==='after-private-claim-mkdir'&&$c['fault']==='changed-directory'){rename($path,$path.'.retained');mkdir($path);}
  if($event==='after-private-claim-open'&&$c['fault']==='unknown-member'){file_put_contents(dirname($path).'/owner-note','unknown owner evidence');}
 };
 $claim=new KTK_Private_Engine_Termination_Claim($c['packet'],$s,$guard,$observer);$result=$claim->consume($c['method'],$c['host'],$c['token'],$c['now']);
 echo json_encode(array('ok'=>true,'result'=>$result,'captures'=>$captures),JSON_THROW_ON_ERROR);
}catch(Throwable $e){echo json_encode(array('ok'=>false,'message'=>$e->getMessage(),'captures'=>$captures),JSON_THROW_ON_ERROR);}
'''


@unittest.skipUnless(store.PHP,'Real PHP required for private one-use termination claims')
class PrivateEngineTerminationClaimTests(unittest.TestCase):
    def setUp(self):
        self.fixture=store.ContentUpdatePrivateStoreTests('runTest');self.fixture.setUp();self.addCleanup(self.fixture.tearDown);self.fixture.create();self.base=self.fixture.base.resolve();self.public=self.fixture.public.resolve();self.private=self.fixture.private.resolve()
        self.mu=self.public/'staging/wp-content/mu-plugins';self.mu.mkdir(parents=True)
        self.driver=self.base/'claim-driver.php';self.driver.write_bytes(DRIVER.encode())
        self.packet=dict(schemaVersion=1,scope='fresh-witness-private-engine-termination',operation='fence',operationId='1'*32,transactionId=store.ID,applicationCommit='c'*40,publicRoot=self.public.as_posix(),rootBinding=(self.private/'owner.marker').read_text(),expires=2000,tokenSha256=backup.sha(('i'*43).encode()),freshProtectedStateSha256='e'*64,freshPublicOwnedSha256='f'*64,witnessArchiveSha256='9'*64,metadataArchiveSha256='8'*64,inspectionStateSha256='7'*64,closureSha256='6'*64)
        self.config=dict(store=store.CORE.as_posix(),component=(store.ROOT/'tools/private-engine-termination-claim.php').as_posix(),private=self.private.as_posix(),public=self.public.as_posix(),transactionId=store.ID,key=store.KEY,packet=self.packet,allowed=True,guard=True,fault='',method='POST',host='krawlthroughkrakow.com',token='i'*43,now=1000)

    def files(self,root):return {p.relative_to(root).as_posix():backup.sha(p.read_bytes()) for p in root.rglob('*') if p.is_file()}

    def marker(self,identifier=None):return self.base/('.ktk-engine-termination-'+(identifier or self.packet['operationId']))

    def call(self,success=True,exit_code=0,disabled_sync=False,**changes):
        config={**self.config,**changes};path=self.base/'claim-config.json';path.write_bytes(backup.encode(config));before_private=self.files(self.private);before_public=self.files(self.public)
        args=[store.PHP]+(['-d','disable_functions=fsync'] if disabled_sync else [])
        r=subprocess.run(args+[str(self.driver),str(path)],capture_output=True,text=True,timeout=20)
        self.assertEqual(r.returncode,exit_code,r.stdout+r.stderr);self.assertEqual(r.stderr,'');self.assertEqual(self.files(self.private),before_private);self.assertEqual(self.files(self.public),before_public)
        if exit_code:return
        value=json.loads(r.stdout);self.assertIs(value['ok'],success,value);return value

    def test_successful_claim_is_private_durable_token_free_and_one_use(self):
        value=self.call();receipt=value['result'];path=self.marker();raw=(path/'claim.json').read_bytes()
        self.assertEqual(value['captures'],2);self.assertTrue(receipt['contextConsumed'] and receipt['receiptDurablyReadBack']);self.assertEqual(receipt['receiptSha256'],backup.sha(raw));self.assertFalse(path.is_relative_to(self.public));self.assertNotIn(self.config['token'].encode(),raw);self.assertNotIn(store.KEY.encode(),raw)
        for n in ('fenceWrites','payloadDeletes','applicationWrites','databaseWrites','cachePurges','productionOperations'):self.assertEqual(receipt[n],0)
        before=self.files(path);self.assertIn('already consumed',self.call(False)['message']);self.assertEqual(self.files(path),before)

    def test_authentication_scope_expiry_and_old_identity_fail_before_guard_or_claim(self):
        for changes in ({'method':'GET'},{'host':'www.krawlthroughkrakow.com'},{'token':'wrong'},{'now':2000},{'now':-2000},{'allowed':False},{'packet':{**self.packet,'operation':'inspect'}},{'packet':{**self.packet,'operationId':store.ID}}):
            with self.subTest(changes=changes):
                result=self.call(False,**changes);self.assertEqual(result['captures'],0);self.assertFalse(self.marker().exists())

    def test_guard_failure_before_claim_and_new_raw_state_after_claim_never_authorize_followup(self):
        result=self.call(False,guard=False);self.assertEqual(result['captures'],1);self.assertFalse(self.marker().exists())
        result=self.call(False,fault='new-raw-after-claim');self.assertEqual(result['captures'],2);self.assertTrue((self.marker()/'claim.json').is_file());self.assertIn('already consumed',self.call(False)['message'])

    def test_real_disabled_native_sync_refuses_before_guard_or_marker(self):
        result=self.call(False,disabled_sync=True);self.assertIn('Native claim sync required',result['message']);self.assertEqual(result['captures'],0);self.assertFalse(self.marker().exists())

    def test_process_death_after_directory_creation_consumes_even_empty_marker(self):
        self.call(exit_code=83,fault='directory-exit');self.assertEqual(list(self.marker().iterdir()),[]);self.assertIn('already consumed',self.call(False)['message'])

    def test_partial_receipt_cut_is_preserved_and_cannot_be_replayed(self):
        self.call(exit_code=84,fault='partial-exit');path=self.marker()/'claim.json';self.assertEqual(path.read_bytes(),b'partial claimed evidence');self.call(False);self.assertEqual(path.read_bytes(),b'partial claimed evidence')

    def test_lost_synced_reply_requires_new_operation_and_retains_prior_marker(self):
        self.call(exit_code=85,fault='lost-reply');prior=self.files(self.marker());self.call(False)
        packet={**self.packet,'operationId':'2'*32,'operation':'cleanup','tokenSha256':backup.sha(('n'*43).encode()),'witnessArchiveSha256':'5'*64}
        result=self.call(packet=packet,token='n'*43);self.assertEqual(result['result']['operation'],'cleanup');self.assertEqual(self.files(self.marker()),prior);self.assertTrue((self.marker('2'*32)/'claim.json').is_file())

    def test_interruption_before_sync_leaves_context_consumed_without_fence_or_delete(self):
        self.call(False,fault='before-sync');self.assertTrue((self.marker()/'claim.json').is_file());self.assertIn('already consumed',self.call(False)['message'])

    def test_changed_new_receipt_is_preserved_before_any_overwrite(self):
        result=self.call(False,fault='changed-before-write');self.assertIn('preserved before write',result['message']);self.assertEqual((self.marker()/'claim.json').read_bytes(),b'external owner claim bytes')

    def test_changed_directory_and_unknown_member_are_preserved(self):
        self.call(False,fault='changed-directory');self.assertTrue(Path(str(self.marker())+'.retained').is_dir());self.assertEqual(list(self.marker().iterdir()),[])
        packet={**self.packet,'operationId':'2'*32};self.call(False,packet=packet,fault='unknown-member');self.assertEqual((self.marker('2'*32)/'owner-note').read_bytes(),b'unknown owner evidence')

    def test_original_execution_helper_and_unknown_preexisting_operation_are_preserved(self):
        old=self.mu/('ktk-transaction-rehearsal-'+store.ID+'.php');old.write_bytes(b'<?php /* old execution helper still present */');result=self.call(False);self.assertEqual(result['captures'],0);self.assertFalse(self.marker().exists());self.assertEqual(old.read_bytes(),b'<?php /* old execution helper still present */');old.unlink()
        self.marker().mkdir();note=self.marker()/'owner-note';note.write_bytes(b'preexisting unknown evidence');self.call(False);self.assertEqual(note.read_bytes(),b'preexisting unknown evidence')


if __name__=='__main__':unittest.main()
