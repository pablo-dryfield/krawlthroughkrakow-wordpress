#!/usr/bin/env python3
"""Native early-helper phase/interruption matrix; synthetic local files only, no hosting."""
from pathlib import Path
from unittest import mock
from datetime import datetime,timezone
import argparse,copy,hashlib,importlib.util,json,subprocess,sys,time,unittest

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools import content_update_backup as backup
from tools import private_engine_termination_config as factory
from tools.content_update_client import UncertainRequest
from tools.tests import test_private_engine_termination_helper as native

MODES={
 'unprepared':('seeding',0), 'source-prefix':('seeding',0), 'plan-pending':('unprepared',0),
 'applying':('applying',0), 'applied':('applied',0), 'rolling-back':('rolling-back',0),
 'rolled-back-closed':('rolled-back',0), 'uncertain':('uncertain',0),
 'content-empty':('applying',1), 'content-partial':('applying',1), 'content-complete':('applying',1),
 'journal-empty':('prepared',1), 'journal-complete':('prepared',1), 'journal-double-cut':('applying',2),
 'lost-fence-reply':('prepared',0), 'lost-cleanup-reply':('prepared',0),
}
REPORT=None;FINGERPRINTS={};DESTINATION=None


def fingerprints():
    spec=importlib.util.spec_from_file_location('ktk_phase_inputs',ROOT/'tools/verify-private-termination-fixture.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return {**module.source_fingerprints(),Path(__file__).relative_to(ROOT).as_posix():backup.sha(Path(__file__).read_bytes())}


def source_check():
    for name,sha in FINGERPRINTS.items():
        if backup.sha((ROOT/name).read_bytes())!=sha:raise RuntimeError('Frozen phase-fixture input changed: '+name)


def checkpoint():
    REPORT['updatedAt']=datetime.now(timezone.utc).isoformat()
    DESTINATION.write_text(json.dumps(REPORT,indent=2)+'\n',encoding='utf-8')


class TerminationPhaseFixtures(unittest.TestCase):
    def setUp(self):
        source_check();self.h=native.PrivateEngineTerminationHelperTests('runTest');self.h.setUp();self.addCleanup(self.h.doCleanups)
        self.p=self.h.protocol;self.base=self.p.fixture.native;self.case=self.base.case

    def phase(self,mode):
        if mode=='unprepared':return
        if mode=='source-prefix':
            self.case.cfg['seedFault']='prefix';self.case.expected_exit=74
            with self.assertRaises(UncertainRequest):self.case.client.recover_preparation()
            self.case.expected_exit=0;self.case.cfg['seedFault']=''
            self.assertEqual((self.case.private/'source/ktk-code-pages-assets/media/large.bin').stat().st_size,65536);return
        if mode=='plan-pending':
            state=self.case.client.inspect_preparation()
            for _ in range(10):
                self.assertIn('preparation',state)
                if state['preparation']['seedsComplete']:break
                state=self.case.client.recover_preparation()
            else:self.fail('Complete seed boundary absent')
            self.case.cfg.update(inspectionCutEvent='after-private-temporary-create',inspectionCutName='plan.json');self.case.expected_exit=83
            with self.assertRaises(UncertainRequest):self.case.client.recover_preparation()
            self.case.expected_exit=0;self.case.cfg['inspectionCutEvent']='';self.assertFalse((self.case.engine/'plan.json').exists());return
        cuts={'content-empty':('after-temporary-create',False,None,False),'content-partial':('after-temporary-create',True,None,False),'content-complete':('before-rename',False,None,False),'journal-empty':('after-private-temporary-create',False,'journal.json',False),'journal-complete':('before-private-receipt-rename',False,'journal.json',False),'journal-double-cut':('',False,None,True)}
        if mode in cuts:
            event,partial,name,failure=cuts[mode];self.base.cut_apply(event,partial=partial,name=name,failure=failure)
            self.case.cfg.update(inspectionCutEvent='',inspectionReceiptFailureAndCut=False);return
        self.base.prepared()
        if mode.startswith('lost-'):return
        self.base.acknowledge()
        if mode=='uncertain':
            self.case.cfg['inspectionThrowBeforeRename']=True
            with self.assertRaises(UncertainRequest):self.case.client.step('apply')
            self.case.cfg['inspectionThrowBeforeRename']=False;return
        state=self.case.client.step('apply')
        if mode=='applying':self.assertEqual(state['engine']['phase'],'applying');return
        for _ in range(10):
            if state['engine']['phase']=='applied':break
            state=self.case.client.step('apply')
        else:self.fail('Native private apply did not finish')
        if mode=='applied':return
        state=self.case.client.step('rollback')
        if mode=='rolling-back':self.assertEqual(state['engine']['phase'],'rolling-back');return
        for _ in range(10):
            if state['engine']['phase']=='rolled-back':break
            state=self.case.client.step('rollback')
        else:self.fail('Native private rollback did not finish')
        self.case.client.close();self.assertTrue((self.case.private/'control/closed.json').is_file())

    def result(self,value):
        self.assertEqual(value['status'],200,value['body']);body=value['body'];result=body['controller']
        self.assertFalse(result['fullHostTransactionAcceptance']);self.assertFalse(value['oldEngineClass']);self.assertFalse(value['oldControllerClass'])
        self.assertEqual(body['runtime']['phases'],{'muplugins_loaded':1,'plugins_loaded':0,'wp_loaded':0})
        self.assertLessEqual(len(value['wire'].encode()),2097152)
        self.assertTrue(value['queries']);self.assertTrue(all(q.startswith('SELECT ') for q in value['queries']));self.assertEqual(len(value['queries'])%7,0)
        for key in ('applicationWrites','databaseWrites','cachePurges','productionOperations'):self.assertEqual(result[key],0)
        return result

    def lost_reply(self,value,action=None,state=None):
        # Native CLI response envelope only. The compiled production helper's
        # input seam/inverse stays exactly the same as its qualified seven cases.
        anchor='echo json_encode(';self.assertEqual(native.DRIVER.count(anchor),1)
        driver=self.case.root/'lost-termination-reply-driver.php';changed=native.DRIVER.replace(anchor,'exit(89);'+anchor,1)
        self.assertEqual(changed.replace('exit(89);'+anchor,anchor,1),native.DRIVER);driver.write_text(changed)
        cfg=copy.deepcopy(self.case.cfg)
        cfg.update(terminationHeaders={'HTTP_X_KTK_PRIVATE_TERMINATION_TOKEN':value['token']},terminationHost='krawlthroughkrakow.com',terminationMethod='POST',terminationQuery=value['operationId'],terminationPhases={'muplugins_loaded':1,'plugins_loaded':0,'wp_loaded':0},terminationMultisite=False,terminationMissingNoCache=False,terminationMissingEncoder=False,terminationEncoderFault='',terminationBody=factory.request(value,action or value['operation'],state).decode())
        public=self.base.files(self.case.root/'public_html')
        self.assertIsNone(self.case.case.call(self.case.root,driver,cfg,exit_code=89))
        self.assertEqual(self.base.files(self.case.root/'public_html'),public)
        return {'nativeProcessExit':89,'responseSuppressedAfterControllerCompleted':True,'sameAuthorityReplayed':False}

    def matrix(self,mode):
        row={'mode':mode,'startedAt':datetime.now(timezone.utc).isoformat(),'passed':False};REPORT['scenarios'].append(row);checkpoint();started=time.perf_counter()
        try:
            self.phase(mode);self.base.change_cache_row();self.case.cfg['rows']['options'][-1]['option_value']='retained-current-value-'+mode
            current_rows=copy.deepcopy(self.case.cfg['rows']);self.h.configure(prepared=False)
            owned={name:backup.sha((self.case.mu/name).read_bytes()) for name in self.case.owned}
            inspection=self.h.inspection_packet();initial=self.result(self.h.invoke(inspection));self.assertEqual(self.h.last_private_before,self.h.last_private_after)
            phase,minimum_artifacts=MODES[mode];self.assertEqual(initial['state']['phase'],phase);self.assertGreaterEqual(len(initial['state']['validatedArtifacts']),minimum_artifacts)
            self.assertFalse(initial['state']['originalProtectedStateStillExact']);row['observedPhase']=phase;row['validatedArtifacts']=len(initial['state']['validatedArtifacts'])
            original_closure=(self.case.private/'control/closed.json').read_bytes() if mode=='rolled-back-closed' else None
            fence=self.h.compile(self.p.fence)
            if mode=='lost-fence-reply':row['lostReply']=self.lost_reply(fence)
            else:
                result=self.result(self.h.invoke(fence));self.assertEqual(result['closureWrites'],0 if original_closure is not None else 1)
            signed=(self.case.private/'control/closed.json').read_bytes()
            if original_closure is not None:self.assertEqual(signed,original_closure)
            inspected=self.h.compile(self.p.later('inspect-fenced',fence),fence);result=self.result(self.h.invoke(inspected));self.assertEqual(self.h.last_private_before,self.h.last_private_after)
            state=result['state'];self.assertTrue(state['signedClosureComplete']);before=self.base.files(self.case.private)
            cleanup=self.h.compile(self.p.later('cleanup',inspected),inspected)
            dirs=[name for name in state['directories'] if name in ('source','target') or name.startswith(('source/','target/'))]
            if state['remainingPayloadFiles']==0 and not dirs:
                out=self.h.invoke(cleanup,'cleanup-payload',state['stateSha256']);self.assertEqual(out['status'],409);self.assertEqual(self.h.last_private_before,self.h.last_private_after);self.assertFalse(self.p.marker(cleanup).exists());row['emptyCleanupCorrectlyRefused']=True
            elif mode=='lost-cleanup-reply':
                row['lostReply']=self.lost_reply(cleanup,'cleanup-payload',state['stateSha256'])
                fresh=self.h.compile(self.p.later('inspect-fenced',cleanup),cleanup);result=self.result(self.h.invoke(fresh));self.assertEqual(self.h.last_private_before,self.h.last_private_after);self.assertEqual(result['state']['remainingPayloadFiles'],0);row['freshReadOnlyConfirmationAfterLostReply']=True
                # A new no-op mutation context must still refuse before its claim.
                new=self.h.compile(self.p.later('cleanup',fresh),fresh);out=self.h.invoke(new,'cleanup-payload',result['state']['stateSha256']);self.assertEqual(out['status'],409);self.assertFalse(self.p.marker(new).exists())
            else:
                result=self.result(self.h.invoke(cleanup,'cleanup-payload',state['stateSha256']));self.assertGreater(result['payloadDeletes'],0);self.assertLessEqual(result['payloadDeletes'],256);self.assertLessEqual(result['payloadDirectoriesRemoved'],256);self.assertEqual(result['state']['remainingPayloadFiles'],0);row['payloadDeletes']=result['payloadDeletes']
            after=self.base.files(self.case.private)
            for name,sha in before.items():
                if name not in self.p.fixture.config['payload']:self.assertEqual(after[name],sha,name)
            self.assertEqual((self.case.private/'control/closed.json').read_bytes(),signed)
            self.assertEqual(self.case.cfg['rows'],current_rows)
            self.assertEqual({name:backup.sha((self.case.mu/name).read_bytes()) for name in self.case.owned},owned)
            source_check();row['passed']=True;row['currentRawRowsAndOwnedPublicFilesExact']=True;row['retainedMetadataAndSignedClosureExact']=True
        finally:
            row['seconds']=time.perf_counter()-started;row['finishedAt']=datetime.now(timezone.utc).isoformat();checkpoint();print(json.dumps({'phaseScenario':row}),flush=True)


def main(argv=None):
    global REPORT,FINGERPRINTS,DESTINATION
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--report',required=True);parser.add_argument('--only',choices=tuple(MODES));args=parser.parse_args(argv)
    folder=ROOT/'docs/seo/private-engine-phases-2026-11-17';DESTINATION=(ROOT/args.report).absolute()
    if DESTINATION.parent!=folder or DESTINATION.suffix!='.json' or DESTINATION.exists() or DESTINATION.is_symlink():raise ValueError('Fresh exact phase-batch report required')
    folder.mkdir(parents=True,exist_ok=True)
    if not native.OLD.PHP:raise RuntimeError('Real PHP required; no skipped native matrix')
    FINGERPRINTS=fingerprints();REPORT={'scope':'LOCAL synthetic early helper native phase/cut matrix, existing18MiB fixture retained; no hosted proof','startedAt':datetime.now(timezone.utc).isoformat(),'observedStartCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'worktreeInitiallyDirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT)),'sourceHashesBeforeFixture':FINGERPRINTS,'scenarioCount':1 if args.only else len(MODES),'scenarios':[],'nativeCLIInputSeamAndValidUTF8WordPressFixtureQualification':True,'lostReplyQualification':'Actual native process drops its CLI reply after controller execution; fresh helper/witness confirms without replay. This is not a hosted HTTP socket test.','applicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionOperations':0,'fullHostTransactionAcceptance':False};checkpoint()
    suite=unittest.TestSuite()
    for mode in ([args.only] if args.only else MODES):
        name='test_'+mode.replace('-','_');setattr(TerminationPhaseFixtures,name,lambda self,mode=mode:self.matrix(mode));suite.addTest(TerminationPhaseFixtures(name))
    result=unittest.TextTestRunner(verbosity=2).run(suite);source_check();REPORT.update(finishedAt=datetime.now(timezone.utc).isoformat(),allPrestartSourcesStillExact=True,testsRun=result.testsRun,failures=len(result.failures),errors=len(result.errors),skipped=len(result.skipped),allScenariosPassed=result.wasSuccessful() and all(s['passed'] for s in REPORT['scenarios']));checkpoint();return 0 if REPORT['allScenariosPassed'] else 1


if __name__=='__main__':sys.exit(main())
