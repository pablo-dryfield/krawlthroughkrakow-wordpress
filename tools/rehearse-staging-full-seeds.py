"""Default offline; explicitly rehearse full private seed copies, prefix recovery and cleanup on staging."""
from __future__ import annotations
import argparse,importlib.util,json,math,secrets,sys,time,zipfile
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:sys.path.insert(0,str(ROOT))
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools import full_private_seed_recovery as recovery
from tools import early_private_entry as early_entry
from tools.full_private_seed_transport import FullSeedTransport,OriginalCapsuleReader,UncertainFullSeedRequest,verify_retained_metadata
from tools.content_update_staging_connection import BoundedStagingFTPS

spec=importlib.util.spec_from_file_location('ktk_full_seed_shared_runner',ROOT/'tools/rehearse-staging-content-controller.py');shared=importlib.util.module_from_spec(spec);spec.loader.exec_module(shared)
FILES=('rehearse-staging-full-seeds.py','rehearse-staging-full-seeds.ps1','full_private_seed_packet.py','full_private_seed_recovery.py','full_private_seed_transport.py','full-private-seed-staging-template.php','full-private-seed-rehearsal.php','content-update-streaming-seeds.php','full_inventory_capacity.py','early_private_entry.py')

def fingerprints():
    result=shared.source_hashes()
    for name in FILES:
        path=ROOT/'tools'/name
        if path.is_symlink() or not path.is_file():raise ValueError('Exact full seed reviewed source required')
        result['tools/'+name]=backup.sha(path.read_bytes())
    return dict(sorted(result.items()))

def reviewed_source(application_commit,tooling_commit):
    owned,_=shared.reviewed_source(application_commit,tooling_commit);sizes={n:(ROOT/'staging/wp-content/mu-plugins'/n).stat().st_size for n in owned};owned,sizes=full.capacity.inventory(owned,sizes)
    return owned,sizes,fingerprints()

def unchanged(owned,hashes):
    if shared.snapshot.local_owned_checksums()!=owned or fingerprints()!=hashes:raise ValueError('Full seed reviewed source/build changed; stop without retry')

def archive_original(path,plan,key,helper_sha):
    full.verify_archive(path,plan,key,helper_sha)
    with zipfile.ZipFile(path) as z:
        m=backup.decode(z.read('manifest.json'));original=full.validate_records({n:z.read(n) for n in m['members']},m,plan,key,helper_sha)
    return m,original

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__);mode=parser.add_mutually_exclusive_group();mode.add_argument('--rehearse-staging',action='store_true');mode.add_argument('--resume');parser.add_argument('--abandon',action='store_true');parser.add_argument('--abandoned-state');parser.add_argument('--interrupt-original',action='store_true');parser.add_argument('--entry-profile',choices=('late','early'),default='late');parser.add_argument('--application-commit',required=True);parser.add_argument('--tooling-commit',required=True);parser.add_argument('--report',required=True);args=parser.parse_args(argv)
    if args.abandon and not args.resume or args.resume and not backup.identifier(args.resume,32) or args.resume and args.interrupt_original or args.abandoned_state is not None and (not args.resume or not args.abandon or not backup.digest(args.abandoned_state)):raise ValueError('Exact resume/abandon request required')
    destination=Path(args.report).resolve()
    if not destination.is_relative_to(ROOT/'docs/seo') or destination.suffix!='.json' or destination.exists() or destination.is_symlink():raise ValueError('Fresh local SEO report required')
    owned,sizes,hashes=reviewed_source(args.application_commit,args.tooling_commit)
    report={'startedAt':datetime.now(timezone.utc).isoformat(),'scope':'full-private-seed-copy-prefix-recovery-and-cleanup; no engine/public transaction','phase':'offline-validated','applicationCommit':args.application_commit,'toolingCommit':args.tooling_commit,'sourceHashes':hashes,'publicOwnedFiles':len(owned),'publicOwnedBytes':sum(sizes.values()),'publicOwnedMapSha256':backup.sha(backup.encode(owned,sort=True)),'publicApplicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionOperations':0,'fullHostTransactionAcceptance':False,'quotaVerified':False,'steps':[],'uncertainRequests':[]}
    def checkpoint(phase):
        report['phase']=phase;report['updatedAt']=datetime.now(timezone.utc).isoformat();destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes((json.dumps(report,indent=2)+'\n').encode())
    report['entryProfile']=args.entry_profile;checkpoint('offline-validated')
    if not args.rehearse_staging and not args.resume:
        print(json.dumps({'phase':report['phase'],'publicOwnedFiles':len(owned),'publicOwnedBytes':sum(sizes.values())}));return
    common=shared.snapshot.load_common();connection=None;lease=None;value=None;before=None;client=None
    compile_extra={'entry_profile':'early'} if args.entry_profile=='early' else {}
    capture_extra={'source_compiler':early_entry.snapshot_source} if args.entry_profile=='early' else {}
    try:
        connection=BoundedStagingFTPS(common.common.store2.connect)
        if args.resume:
            value=recovery.FullSeedPacketVault().load(args.resume)
            if recovery.profile(value)!=args.entry_profile:raise ValueError('Explicit entry profile differs from encrypted recovery context')
            if value['applicationCommit']!=args.application_commit or value['sourceHashes']!=hashes or value['publicOwned']!=owned or value['publicSizes']!=sizes:raise ValueError('Encrypted full seed packet differs from current reviewed source')
            report['resumedTransaction']=args.resume;report['originalToolingCommit']=value['toolingCommit']
        else:
            report['before']={};checkpoint('snapshot-before');unchanged(owned,hashes);before=shared.capture(common,connection,owned,shared.source_hashes(),report['before'],lambda:checkpoint('snapshot-before'),**capture_extra);unchanged(owned,hashes)
            tx,token,key=secrets.token_hex(16),secrets.token_urlsafe(32),secrets.token_hex(32);expires=int(time.time())+3600;plan,_,_=full.plan(tx,args.application_commit,owned,sizes,before['protectedStateSha256']);name='ktk-transaction-rehearsal-'+tx+'.php';source=full.helper_source(name,token,expires,args.application_commit,owned,sizes,before['protectedStateSha256'],key,args.interrupt_original,**compile_extra)
            value={'schemaVersion':1,'scope':'full-private-seed-caller-recovery','transactionId':tx,'applicationCommit':args.application_commit,'toolingCommit':args.tooling_commit,'helperSha256':backup.sha(source),'sourceHashes':hashes,'expires':expires,'token':token,'ownershipKey':key,'plan':plan,'publicOwned':owned,'publicSizes':sizes,'interruptOriginal':args.interrupt_original}
            if args.entry_profile=='early':value.update(entryProfile='early',scope='full-private-seed-early-caller-recovery')
            report['encryptedRecoveryPacket']=recovery.FullSeedPacketVault().save(value);checkpoint('encrypted-packet-persisted')
        tx=value['transactionId'];name='ktk-transaction-rehearsal-'+tx+'.php';plan=value['plan'];_,_,overrides=full.plan(tx,args.application_commit,owned,sizes,plan['protectedStateSha256']);source=full.helper_source(name,value['token'],value['expires'],args.application_commit,owned,sizes,plan['protectedStateSha256'],value['ownershipKey'],value['interruptOriginal'],**compile_extra)
        if backup.sha(source)!=value['helperSha256']:raise ValueError('Exact original full seed helper compilation required')
        report.update(transactionId=tx,helper=name,helperSha256=value['helperSha256'],expires=value['expires']);scope=shared.legacy.TemporaryHelperFTP(connection,name);lease=shared.HelperLease(common,connection,scope,source);unchanged(owned,hashes)
        if args.resume:
            current=common.common.retrieve_file(scope,scope.path)
            if current is not None:
                if current!=source:raise ValueError('Changed or foreign helper preserved')
                lease.attempted=True;report['exactExistingHelperAdopted']=True
            else:lease.install()
        else:lease.install()
        checkpoint('full-seed-helper-installed');client=FullSeedTransport(plan,sizes,overrides,ROOT/'staging/wp-content/mu-plugins',value['helperSha256'],value['token'],value['expires'])
        def request(action,**fields):
            unchanged(owned,hashes)
            try:envelope=client.request(action,**fields)
            except UncertainFullSeedRequest:
                report['uncertainRequests'].append({'action':action,'seconds':client.last_request_seconds,'failure':client.last_failure});checkpoint(report['phase']);raise
            state=envelope['controller'];seed=state['seed'];report['steps'].append({'action':action,'phase':state['phase'],'seconds':client.last_request_seconds,'runtime':envelope['runtime'],'privateFiles':len(seed['files']) if seed is not None else 0,'privateBytes':seed['copiedBytes'] if seed is not None else 0,'seedStateSha256':seed['stateSha256'] if seed is not None else None,'operation':state['operation']});checkpoint('full-seed-'+state['phase']);return state
        archive_path=ROOT/'deploy-backups'/('staging-full-seeds-original-'+tx+'.zip')
        if args.resume and archive_path.exists():
            receipt=full.verify_archive(archive_path,plan,value['ownershipKey'],value['helperSha256']);manifest,original=archive_original(archive_path,plan,value['ownershipKey'],value['helperSha256']);report['originalCapsuleArchive']=receipt
        else:
            state=request('inspect')
            if state['phase']=='absent':state=request('begin',stateSha256=state['stateSha256'])
            elif state['phase']=='preparing-original':state=request('recover-begin',stateSha256=state['stateSha256'])
            if state['capsule'] is None:raise ValueError('Complete original capsule required before copying')
            manifest=state['capsule'];reader=OriginalCapsuleReader(connection,manifest,plan);report['originalCapsuleArchive']=full.build_archive(manifest,reader,plan,value['ownershipKey'],value['helperSha256'],archive_path);manifest,original=archive_original(archive_path,plan,value['ownershipKey'],value['helperSha256'])
        if before is not None and any(before[k]!=original[k] for k in shared.STATE_KEYS):raise ValueError('Full original capsule differs from independent pre-helper snapshot')
        archive={'originalManifestSha256':manifest['manifestSha256'],'originalArchiveSha256':report['originalCapsuleArchive']['sha256']}
        if args.abandoned_state:archive['abandonedSeedStateSha256']=args.abandoned_state
        state=request('inspect-abandoned' if args.abandoned_state else 'inspect-archived',**archive)
        if args.abandon:
            abandoned=args.abandoned_state or state['seed']['stateSha256'];report['abandonedSeedStateSha256']=abandoned;archive={**archive,'abandonedSeedStateSha256':abandoned}
            if not state['closed']:state=request('abandon',stateSha256=state['stateSha256'],**archive)
        else:
            limit=2*(math.ceil((len(plan['expected'])+len(plan['prior']))/256)+math.ceil(sum(row['bytes'] for row in full.expected_seed_files(plan,sizes,overrides)[0].values())/67108864))+16;fault_observed=False
            for _ in range(limit):
                if state['phase'] in {'ready-to-close','closing-interrupted','closed','disposing','disposed'}:break
                previous=state
                try:state=request('advance',stateSha256=state['stateSha256'],**archive)
                except UncertainFullSeedRequest:
                    if not value['interruptOriginal'] or fault_observed:raise
                    inspected=request('inspect-archived',**archive);largest=sorted(sizes,key=lambda n:(-sizes[n],n))[0];row=(inspected['seed']['files'] or {}).get('source/'+largest)
                    if row is None or row['bytes']!=65536 or not 0<inspected['seed']['copiedBytes']-previous['seed']['copiedBytes']<=67108864:raise ValueError('Uncertain copy differs from the expected owned original prefix; preserve without retry')
                    report['controlledOriginalPrefixRecovery']={'path':largest,'prefixBytes':65536,'freshInspectionBeforeResume':True,'observedPrivateByteDelta':inspected['seed']['copiedBytes']-previous['seed']['copiedBytes']};fault_observed=True;state=inspected
                if (state['seed']['copiedBytes'],len(state['seed']['files']))<=(previous['seed']['copiedBytes'],len(previous['seed']['files'])):raise ValueError('Full seed copy made no verified progress')
            else:raise ValueError('Full seed copy exceeded its deterministic step budget')
            if value['interruptOriginal'] and not args.resume and not fault_observed:raise ValueError('Requested original-prefix interruption was not independently observed')
            if state['phase'] in {'ready-to-close','closing-interrupted'}:
                report['fullPrivateCopies']={'files':len(state['seed']['files']),'bytes':state['seed']['copiedBytes'],'stateSha256':state['seed']['stateSha256'],'allFilesMatchReviewedPlan':True};state=request('close',stateSha256=state['stateSha256'],**archive)
        abandoned=args.abandon;terminal='disposed-abandoned' if abandoned else 'disposed';cleanup='cleanup-abandoned' if abandoned else 'cleanup'
        for _ in range(math.ceil((len(plan['expected'])+len(plan['prior']))/256)+50):
            if state['phase']==terminal:break
            previous=state;state=request(cleanup,stateSha256=state['stateSha256'],**archive)
            if state['phase']!=terminal and (len(state['seed']['files']),len(state['seed']['directories']))>=(len(previous['seed']['files']),len(previous['seed']['directories'])):raise ValueError('Full seed cleanup made no verified progress')
        else:raise ValueError('Full seed cleanup exceeded its deterministic step budget')
        report['privatePayloadsAbsent']=not state['seed']['files'] and not state['seed']['directories'];lease.remove();report['helperRemoved']=lease.removed;unchanged(owned,hashes);report['after']={};after=shared.capture(common,connection,owned,shared.source_hashes(),report['after'],lambda:checkpoint('snapshot-after'),**capture_extra)
        if any(original[k]!=after[k] for k in shared.STATE_KEYS):raise ValueError('Selected protected/public state differs; no database restoration permitted')
        report['allSelectedProtectedAndPublicStateExact']=True;fresh=BoundedStagingFTPS(common.common.store2.connect)
        try:report['independentRetainedMetadataAudit']=verify_retained_metadata(fresh,archive_path,plan,sizes,overrides,value['ownershipKey'],value['helperSha256'],report.get('abandonedSeedStateSha256'))
        finally:report['independentRetainedFTPSStatistics']=fresh.statistics();fresh.close()
        unchanged(owned,hashes);report['fullPrivateSeedCopyAndCleanupVerified']=not abandoned;checkpoint('abandoned-private-copy-disposed' if abandoned else 'complete')
    except Exception as error:
        report['failedAtPhase']=report['phase'];report['failureType']=type(error).__name__
        if client is not None:report['lastRequestFailure']=client.last_failure;report['lastRequestSeconds']=client.last_request_seconds
        checkpoint('failed-preserve-packet-archive-and-private-state');raise RuntimeError('Full private seed rehearsal stopped; inspect the sanitized report and encrypted recovery packet; no automatic retry') from None
    finally:
        try:
            if lease is not None and not lease.removed:
                lease.remove();report['helperRemoved']=lease.removed
        except Exception:
            checkpoint('helper-cleanup-unverified-preserve-evidence');raise RuntimeError('Full seed helper cleanup could not be verified; inspect before any further mutation') from None
        finally:
            if connection is not None:report['ftpsSessionStatistics']=connection.statistics();connection.close()
            report['finishedAt']=datetime.now(timezone.utc).isoformat();checkpoint(report['phase']);print(json.dumps({k:report.get(k) for k in ('phase','transactionId','helperRemoved','privatePayloadsAbsent','fullPrivateSeedCopyAndCleanupVerified')}))

if __name__=='__main__':main()
