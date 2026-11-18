#!/usr/bin/env python3
"""Calibrate the termination helper with the actual inventory in a local synthetic fixture."""
from pathlib import Path
from datetime import datetime,timezone
from unittest import mock
import argparse,hashlib,importlib.util,json,math,os,shutil,socket,subprocess,sys,tempfile,time,zipfile

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools import full_private_engine_client as client_module
from tools import private_engine_termination_helper as compiler
from tools import private_termination_fixture_support as support
from tools import private_termination_diagnostics as diagnostics
from tools.tests import test_private_engine_termination_helper as native
from tools.tests import test_private_termination_fixture_support as observation_tests

APP='00dfa3134db9028f76fe01039ff961ef52180693'
PUBLIC_BYTES=550639063;PRIVATE_BYTES=1101099599
OBSERVATION_SECONDS=600  # Local subprocess observation, never a hosted timeout change.
HTTP_BUDGET_SECONDS=60;MEMORY='256M'  # Existing local PHP fixture; not a hosting guarantee.
BRIDGE=native.protocol.prior.bound.native.bridge
require=support.require


class RuntimeGate(support.FixtureRefusal):pass


def source_fingerprints():
    spec=importlib.util.spec_from_file_location('ktk_termination_full_source_inputs',ROOT/'tools/verify-full-private-engine-fixture.py')
    prior=importlib.util.module_from_spec(spec);spec.loader.exec_module(prior)
    result={**prior.source_fingerprints(),**compiler.source_hashes()}
    for module in (native,native.protocol,native.protocol.prior,native.protocol.prior.bound,native.protocol.prior.bound.native,BRIDGE,native.OLD,support,observation_tests):
        path=Path(module.__file__);result[path.relative_to(ROOT).as_posix()]=support.digest(path)
    result[Path(__file__).relative_to(ROOT).as_posix()]=support.digest(__file__)
    for name in ('tools/private_termination_diagnostics.py','tools/tests/test_private_termination_diagnostics.py'):
        result[name]=support.digest(ROOT/name)
    return dict(sorted(result.items()))


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--helper-commit',required=True)
    parser.add_argument('--report',required=True)
    parser.add_argument('--diagnostics',action='store_true',help='Opt-in exactly reversible local profiling; adds overhead and is not an uninstrumented/hosted benchmark')
    args=parser.parse_args(argv);destination,evidence=support.report_paths(ROOT,args.report)
    report={'scope':'OFFLINE actual2074-public/4149-private native helper calibration; synthetic selected database; no hosting',
        'startedAt':datetime.now(timezone.utc).isoformat(),'helperSourceCommit':args.helper_commit,'applicationCommit':APP,
        'actualPublicFiles':2074,'actualPublicBytes':PUBLIC_BYTES,'expectedPrivateSeedFiles':4149,'expectedPrivateSeedBytes':PRIVATE_BYTES,
        'localSubprocessObservationSeconds':OBSERVATION_SECONDS,'unchangedHTTPBudgetComparisonSeconds':HTTP_BUDGET_SECONDS,
        'localPHPFixtureMemoryLimit':MEMORY,'memoryAndHTTPHostLimitsChanged':False,
        'nativeCLIInputSeamAndValidUTF8WordPressFastPathQualification':True,'originalPreparationUsesExistingSyntheticClock':True,
        'newHelperUsesRealClock':True,'steps':[],'applicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionOperations':0,
        'fullHostTransactionAcceptance':False,'fullActualHelperRecoveryComplete':False}
    report.update(diagnosticMode=args.diagnostics,applicationCohortQualification='Current immutable local source candidates, not the currently hosted APP530 release',instrumentationQualification='Opt-in reversible local seams add overhead; inclusive spans overlap. Original production-like wire/errors and all runtime/expiry/work bounds remain unchanged.')
    case=None;helper=None;calls=0;fingerprints={};owned={};sizes={};temporaries=[];status=1
    public_source=ROOT/'staging/wp-content/mu-plugins';original_temp=tempfile.TemporaryDirectory

    def checkpoint(stage):
        report['phase']=stage;report['updatedAt']=datetime.now(timezone.utc).isoformat()
        destination.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')

    def source_check():
        for name,sha in fingerprints.items():require(support.digest(ROOT/name)==sha,'frozen-source-changed:'+name)

    def preserve_temporary(*a,**kw):
        protected=kw.get('prefix')=='ktk-production-state-fixture-'
        if protected:kw['delete']=False
        directory=original_temp(*a,**kw)
        if protected:temporaries.append(directory)
        return directory

    def owned_fixture(path):
        value=Path(path)
        require(not value.is_symlink() and not value.is_junction() and value.resolve().is_relative_to(Path(tempfile.gettempdir()).resolve()) and value.name.startswith('ktk-production-state-fixture-'),'owned-temp-fixture-root-required')
        require(any(Path(t.name).resolve()==value.resolve() for t in temporaries),'fixture-root-not-created-by-this-run')

    def call(self,root,driver,cfg,exit_code=0):
        nonlocal calls
        source_check();calls+=1
        text=driver.read_text(encoding='utf-8');require(text.startswith('<?php'),'exact-owned-php-driver-required')
        if "ini_set('memory_limit','256M');" not in text:driver.write_text(text.replace('<?php',"<?php ini_set('memory_limit','256M');",1),encoding='utf-8')
        config=root/'controller-config.json';config.write_text(json.dumps(cfg),encoding='utf-8')
        kind='new-helper' if driver.name=='distinct-helper-driver.php' else cfg['operation']
        action=json.loads(cfg['terminationBody'])['action'] if kind=='new-helper' else json.loads(cfg.get('request','{}')).get('action') if kind=='controller' else kind
        item={'number':calls,'kind':kind,'action':action,'startedAt':datetime.now(timezone.utc).isoformat()}
        if kind=='new-helper' and args.diagnostics:
            path=Path(cfg['helper']);owned_fixture(root)
            require(not path.is_symlink() and path.resolve().is_relative_to(root.resolve()),'exact-owned-profiled-helper-required')
            expected=report['instrumentedHelperSources'][-1]
            require(expected['operationId']==cfg['terminationQuery'] and support.digest(path)==expected['instrumentedFixtureSHA256'],'profiled-helper-source-differs-before-call')
            item['instrumentedFixtureSHA256']=expected['instrumentedFixtureSHA256']
        report['activeCall']=item;checkpoint('php-'+kind+'-'+str(action));started=time.perf_counter()
        environment={**os.environ,'KTK_LOCAL_DIAGNOSTIC_STREAM':'1' if kind=='new-helper' and args.diagnostics else '0'}
        try:process=subprocess.run([native.OLD.PHP,str(driver),str(config)],capture_output=True,text=True,timeout=OBSERVATION_SECONDS,env=environment)
        except subprocess.TimeoutExpired as error:
            item.update(seconds=time.perf_counter()-started,observationTimedOut=True,replyUncertain=True);report['steps'].append(item)
            with zipfile.ZipFile(root/'failed-local-call.zip','x') as z:
                for name,raw in [('stdout',error.stdout or b''),('stderr',error.stderr or b'')]:z.writestr(name,raw)
            if kind=='new-helper' and args.diagnostics:
                item['diagnosticStream']=diagnostics.retain_stream(root,calls,error.stderr or b'',incomplete=True)
            checkpoint('local-observation-timeout-no-replay');raise
        item.update(seconds=time.perf_counter()-started,returnCode=process.returncode,stderrBytes=len(process.stderr.encode()),stderrSHA256=backup.sha(process.stderr.encode()))
        if kind=='new-helper' and args.diagnostics:require(support.digest(Path(cfg['helper']))==item['instrumentedFixtureSHA256'],'profiled-helper-source-differs-after-call')
        if kind=='new-helper' and args.diagnostics:
            owned_fixture(root);item.update(support.retain_helper_reply(root,calls,process.stdout));report['activeCall']=item;checkpoint('diagnostic-helper-raw-reply-retained-before-stream-validation')
        error_stderr=process.stderr
        if kind=='new-helper' and args.diagnostics:
            item['diagnosticStream']=diagnostics.retain_stream(root,calls,process.stderr)
            error_stderr=''  # Only after every byte passes the closed stream parser.
        if process.returncode!=exit_code or error_stderr:
            with zipfile.ZipFile(root/'failed-local-call.zip','x') as z:z.writestr('stdout',process.stdout);z.writestr('stderr',process.stderr)
            item['phpMemoryFailure']='Allowed memory size' in process.stderr;report['steps'].append(item);checkpoint('php-failed-no-replay');raise support.FixtureRefusal('php-process-failed')
        if exit_code:report['steps'].append(item);return None
        if kind=='new-helper':
            if not args.diagnostics:owned_fixture(root);item.update(support.retain_helper_reply(root,calls,process.stdout))
            report['activeCall']=item;checkpoint('new-helper-cli-reply-retained')
        try:value=json.loads(process.stdout)
        except Exception:
            with zipfile.ZipFile(root/'failed-local-call.zip','x') as z:z.writestr('stdout',process.stdout);z.writestr('stderr',process.stderr)
            report['steps'].append(item);checkpoint('php-json-failed-no-replay');raise
        if kind=='new-helper':
            body=value.get('body');item.update(status=value.get('status'),actualDefaultEncodedWireBytes=len(value.get('wire','').encode()),peakAllocatedBytes=value.get('phpPeakAllocatedBytes'),privateQueries=len(value.get('queries',[])),onlySelectQueries=all(q.startswith('SELECT ') for q in value.get('queries',[])))
            require('Private original content must never enter controller responses' not in value.get('wire',''),'private-fixture-row-leaked')
            require(item['onlySelectQueries'],'unexpected-fixture-nonselect-query')
            if isinstance(body,dict) and 'controller' in body:
                item.update(support.helper_observation(value))
            elif isinstance(body,dict):item['genericError']=body.get('error')
            if args.diagnostics:item['fixtureDiagnostics']=diagnostics.validate(value.get('localFixtureDiagnostics'))
        report['steps'].append(item);report.pop('activeCall',None);checkpoint('returned-'+kind+'-'+str(action))
        print(json.dumps({'actualFixtureProgress':item}),flush=True)
        if kind=='new-helper' and item['seconds']>HTTP_BUDGET_SECONDS:
            report['localCallExceedsUnchangedHTTPBudget']=True
            raise RuntimeGate('local-helper-runtime-exceeds-unchanged-http-budget-no-replay')
        return value

    original_setup=BRIDGE.FullPrivatePreparationIntegrationTests.setUp
    original_compile=native.PrivateEngineTerminationHelperTests.compile

    def diagnostic_compile(self,value,predecessor=None):
        packet=original_compile(self,value,predecessor)
        if args.diagnostics:
            path=Path(self.case.cfg['helper']);owned_fixture(self.case.root)
            require(not path.is_symlink() and path.resolve().is_relative_to(self.case.root.resolve()),'exact-owned-diagnostic-helper-required')
            source=path.read_bytes();instrumented,receipt=diagnostics.instrument(source)
            old=b"file_get_contents('php://input',false,null,0,2049)";new=b"($GLOBALS['c']['terminationBody']??'')"
            require(source.count(new)==1 and diagnostics.restore(instrumented).replace(new,old,1)==self.production_source,'complete-diagnostic-and-cli-source-inverse-required')
            path.write_bytes(instrumented);self.fixture_sha=backup.sha(instrumented)
            report.setdefault('instrumentedHelperSources',[]).append({'operation':packet['operation'],'operationId':packet['operationId'],'productionHelperSHA256':backup.sha(self.production_source),**receipt})
        return packet

    def full_setup(self):
        nonlocal case
        original_setup(self);case=self;owned_fixture(self.root);report['fixtureRoot']=str(self.root)
        expected_dirs={p.as_posix() for name in owned for p in Path(name).parents if p.as_posix()!='.'}
        for p in sorted((self.mu/'ktk-code-pages-assets').rglob('*'),key=lambda p:len(p.parts),reverse=True):
            require(p.resolve().is_relative_to(self.root.resolve()),'owned-temp-removal-target-required');name=p.relative_to(self.mu).as_posix()
            if p.is_file() and name not in owned:p.unlink()
            elif p.is_dir() and name not in expected_dirs:p.rmdir()
        for index,(name,sha) in enumerate(owned.items()):
            target=self.mu/name;require(target.resolve().is_relative_to(self.root.resolve()),'owned-temp-copy-target-required');target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(public_source/name,target);require(support.digest(target)==sha,'actual-source-copy-differs')
            if index%256==0:report['copiedPublicFiles']=index+1;checkpoint('copying-actual-application')
        self.source=None;self.cfg['rows']['posts'][0]['post_content']='Private original content must never enter controller responses\n'+'Synthetic private source record.\n'*(9*1024*1024//33)
        self.cfg['operation']='snapshot';state=self.case.call(self.root,self.driver,self.cfg)['state'];require(state['ownedContentFiles']==owned,'full-current-owned-capture-differs')
        self.plan,_,self.overrides=full.plan(native.OLD.ID,APP,owned,sizes,state['protectedStateSha256']);self.binding=full.binding(self.plan);self.owned=dict(owned);self.sizes=dict(sizes)
        self.cfg['packet'].update(plan=self.plan,publicOwnedSha256=backup.sha(backup.encode(owned,sort=True)));self.cfg.update(binding=self.binding,sizes=self.sizes,overrides=self.overrides,operation='controller',seedFault='',originalArchive=None)
        self.before=self.public();self.client=client_module.FullPrivateEngineClient(self.plan,self.sizes,self.overrides,self.mu,self.cfg['packet']['helperSha256'],native.OLD.KEY,self.transport,lambda name:(self.private/name).read_bytes())

    def full_prepared(self):
        state=self.case.client.inspect_preparation();limit=2*(math.ceil(PRIVATE_BYTES/33554432)+math.ceil(4149/128))+16
        for _ in range(limit):
            if 'engine' in state:require(state['engine']['phase']=='prepared','full-engine-not-prepared');report['fullPreparedBoundaryVerified']=True;return
            seed=state['preparation']['fullSeed']
            if seed and seed['sourceComplete'] and seed['targetComplete']:
                require(len(seed['files'])==4149 and seed['copiedBytes']==PRIVATE_BYTES,'exact-complete-private-seed-boundary-required');report['completePrivateSeedFiles']=4149;report['completePrivateSeedBytes']=PRIVATE_BYTES
            state=self.case.client.recover_preparation()
        raise support.FixtureRefusal('full-preparation-exceeded-original-deterministic-budget')

    try:
        checkpoint('preflight')
        require(sys.version_info>=(3,12),'python312-or-newer-required')
        require(native.OLD.PHP,'real-php-required-no-skipped-fixture')
        report['localDisk']=support.ensure_space(tempfile.gettempdir(),PUBLIC_BYTES,PRIVATE_BYTES)
        report['evidenceDisk']=support.ensure_space(destination.parent,PUBLIC_BYTES,PRIVATE_BYTES)
        subprocess.run(['git','diff','--exit-code',APP,'--','staging'],cwd=ROOT,check=True,capture_output=True)
        require(not subprocess.check_output(['git','status','--porcelain'],cwd=ROOT),'clean-reviewed-source-required')
        fingerprints=source_fingerprints();support.verify_reviewed_sources(ROOT,args.helper_commit,fingerprints);report['sourceHashes']=fingerprints
        workflow='.github/workflows/private-termination-fixture.yml'
        report['workflowSHA256']=support.digest(ROOT/workflow)
        require(backup.sha(subprocess.check_output(['git','show',args.helper_commit+':'+workflow],cwd=ROOT))==report['workflowSHA256'],'declared-workflow-source-differs')
        report['actualCheckoutCommit']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
        report['actualCheckoutTree']=subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=ROOT,text=True).strip()
        owned=full.snapshot.local_owned_checksums();sizes={name:(public_source/name).stat().st_size for name in owned}
        require(len(owned)==2074 and sum(sizes.values())==PUBLIC_BYTES and max(sizes.values())==35437747,'exact-actual-application-cohort-required')
        driver=native.DRIVER;anchor="'oldControllerClass'=>class_exists('KTK_Full_Private_Engine_Controller',false)";require(driver.count(anchor)==1,'exact-native-driver-metric-anchor-required')
        driver=driver.replace(anchor,anchor+",'phpPeakAllocatedBytes'=>memory_get_peak_usage(true)",1)
        if args.diagnostics:driver=driver.replace(anchor,anchor+",'localFixtureDiagnostics'=>(function_exists('ktk_fixture_diag_report')?ktk_fixture_diag_report():null)",1)
        with mock.patch.object(tempfile,'TemporaryDirectory',preserve_temporary),mock.patch.object(BRIDGE.FullPrivatePreparationIntegrationTests,'setUp',full_setup),mock.patch.object(native.protocol.prior.bound.native.PrivateEngineAbandonmentInspectionTests,'prepared',full_prepared),mock.patch.object(native.OLD.ContentUpdateControllerTests,'call',call),mock.patch.object(native,'DRIVER',driver),mock.patch.object(native.PrivateEngineTerminationHelperTests,'compile',diagnostic_compile),mock.patch.object(socket.socket,'connect',side_effect=RuntimeError('offline-fixture-network-forbidden')):
            helper=native.PrivateEngineTerminationHelperTests('runTest');helper.setUp();helper.configure(prepared=True);p=helper.protocol
            report['fencedPayloadCensusFiles']=len(p.fixture.config['payload']);require(report['fencedPayloadCensusFiles']==4149,'full4149-payload-census-required')
            inspect=helper.inspection_packet();out=helper.invoke(inspect);require(out['status']==200,'full-helper-initial-inspection-refused');require(helper.last_private_before==helper.last_private_after,'initial-readonly-mutated-private-state')
            require(len(out['wire'].encode())<=2097152,'actual-wordpress-default-envelope-exceeds-cap')
            fence=helper.compile(p.fence);out=helper.invoke(fence);require(out['status']==200 and out['body']['controller']['closureWrites']==1,'full-helper-fence-refused')
            predecessor=fence;limit=math.ceil(4149/256)+32
            for _ in range(limit):
                inspected=helper.compile(p.later('inspect-fenced',predecessor),predecessor);out=helper.invoke(inspected);require(out['status']==200,'full-helper-fenced-inspection-refused');require(helper.last_private_before==helper.last_private_after,'fenced-readonly-mutated-private-state')
                state=out['body']['controller']['state'];dirs=[name for name in state['directories'] if name in ('source','target') or name.startswith(('source/','target/'))]
                if state['remainingPayloadFiles']==0 and not dirs:report['fullActualHelperRecoveryComplete']=True;break
                cleanup=helper.compile(p.later('cleanup',inspected),inspected);out=helper.invoke(cleanup,'cleanup-payload',state['stateSha256']);require(out['status']==200,'full-helper-payload-cleanup-refused');predecessor=cleanup
            else:raise support.FixtureRefusal('full-helper-cleanup-exceeded-deterministic-batch-bound')
            report['allFourHelperRolesExercised']=True
            require(full.snapshot.local_owned_checksums()==owned,'repository-application-changed');require({name:support.digest(case.mu/name) for name in owned}==owned,'copied-public-application-changed');report['allActualPublicBytesStillExact']=True
            source_check();report['allPrestartSourcesStillExact']=True;status=0;checkpoint('complete-local-recovery')
    except BaseException as error:
        report['failure']={'type':type(error).__name__,'code':error.code if isinstance(error,support.FixtureRefusal) else None,'messageSHA256':backup.sha(str(error).encode()),'messageBytes':len(str(error).encode()),'phase':report.get('phase')}
        status=2 if isinstance(error,RuntimeGate) else 1;report['fullActualHelperRecoveryComplete']=False;checkpoint('local-gate-remains-open-no-replay')
    finally:
        evidence_verified=False
        try:
            if case is not None:
                owned_fixture(case.root)
                replies=case.root/'observed-replies'
                if replies.exists():
                    require(not replies.is_symlink() and not replies.is_junction(),'unsafe-reply-directory-preserved')
                    reply_zip=case.root/'new-helper-replies.zip';members={}
                    with zipfile.ZipFile(reply_zip,'x',zipfile.ZIP_DEFLATED,compresslevel=3) as archive:
                        for path in sorted(replies.iterdir()):
                            require(path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(case.root.resolve()),'unsafe-synthetic-reply-preserved')
                            name=path.relative_to(case.root).as_posix();data=path.read_bytes();members[name]=backup.sha(data);archive.writestr(name,data)
                    with zipfile.ZipFile(reply_zip) as archive:
                        require(archive.testzip() is None and set(archive.namelist())==set(members),'reply-archive-crc-or-members-differ')
                        for name,sha in members.items():require(backup.sha(archive.read(name))==sha,'retained-helper-reply-differs')
                    report['newHelperReplyArchive']={'files':len(members),'sha256':support.digest(reply_zip),'allMemberHashesAndCRCVerified':True,'scope':'Exact synthetic CLI replies, not hosted HTTP or a new hosting backup'}
                archives=[p for p in sorted(case.root.rglob('*.zip')) if not p.resolve().is_relative_to(case.mu.resolve()) and not p.resolve().is_relative_to(case.private.resolve())]
                report['evidenceArchive']=support.preserve_fixture(case.private,archives,case.root,APP,owned,sizes,evidence,lambda name:((public_source/name).stat().st_size,support.digest(public_source/name)))
                evidence_verified=True;checkpoint('evidence-independently-reopened')
        except BaseException as error:
            report['evidenceFailure']={'type':type(error).__name__,'code':error.code if isinstance(error,support.FixtureRefusal) else None,'messageSHA256':backup.sha(str(error).encode())};status=1
        if evidence_verified:
            if helper is not None:helper.doCleanups()
            if case is not None:case.doCleanups()
            for directory in temporaries:owned_fixture(directory.name);directory.cleanup()
            report['ownedTemporaryFixtureRemoved']=all(not Path(directory.name).exists() for directory in temporaries)
            require(report['ownedTemporaryFixtureRemoved'],'verified-owned-temp-cleanup-failed')
        elif temporaries:report['ownedTemporaryFixturesPreservedForUnverifiedEvidence']=[directory.name for directory in temporaries]
        report['finishedAt']=datetime.now(timezone.utc).isoformat();report['exitCode']=status;checkpoint('terminal')
    print('KTK_PRIVATE_TERMINATION_FIXTURE_RESULT='+json.dumps({key:report.get(key) for key in ('phase','exitCode','fullActualHelperRecoveryComplete','fencedPayloadCensusFiles','localCallExceedsUnchangedHTTPBudget','failure','evidenceArchive')}),flush=True)
    return status


if __name__=='__main__':sys.exit(main())
