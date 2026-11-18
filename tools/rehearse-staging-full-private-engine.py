"""Default offline; explicit full private staging engine rehearsal, archives and bounded disposal."""
from __future__ import annotations
import argparse,importlib.util,json,math,secrets,sys,time,zipfile
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:sys.path.insert(0,str(ROOT))
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools import full_private_engine_packet as compiler
from tools import full_private_engine_recovery as recovery
from tools import full_private_engine_disposal as disposal
from tools import full_private_engine_disposal_recovery as disposal_recovery
from tools import full_private_engine_resume as recovery_resume
from tools import early_private_entry as early
from tools.full_private_engine_client import FullPrivateEngineClient
from tools.full_private_engine_transport import FullPrivateEngineTransport
from tools.full_private_engine_disposal_transport import FullEngineDisposalTransport
from tools.full_private_engine_retained import FullEngineRetainedReader,verify_retained
from tools.full_private_engine_exercise import prepare,transact
from tools.full_private_seed_transport import OriginalCapsuleReader
from tools.content_update_staging_transport import PrivateBackupReader
from tools.content_update_staging_connection import BoundedStagingFTPS

spec=importlib.util.spec_from_file_location('ktk_full_engine_seed_shared',ROOT/'tools/rehearse-staging-full-seeds.py');seed=importlib.util.module_from_spec(spec);spec.loader.exec_module(seed);shared=seed.shared
FILES=('rehearse-staging-full-private-engine.py','rehearse-staging-full-private-engine.ps1','full_private_engine_client.py','full_private_engine_controller.py','full_private_engine_packet.py','full_private_engine_recovery.py','full_private_engine_transport.py','full_private_engine_disposal.py','full_private_engine_disposal_recovery.py','full_private_engine_disposal_transport.py','full_private_engine_exercise.py','full_private_engine_retained.py','full-private-engine-preparation.php','full-private-engine-staging-template.php','full-private-engine-disposal.php','full-private-engine-disposal-template.php')

FILES=FILES+('full_private_engine_resume.py','full_private_recovery_hashing.py')

class ControlledCallerStop(RuntimeError):
    """Explicit test stop at complete seeds or an inspected owned cut; helper cleanup still runs."""

def fingerprints():
    result=seed.fingerprints()
    for n in FILES:
        p=ROOT/'tools'/n
        if p.is_symlink() or not p.is_file():raise ValueError('Exact reviewed full private engine source required')
        result['tools/'+n]=backup.sha(p.read_bytes())
    if len(result)>80:raise ValueError('Bounded explicit engine source inventory required')
    return dict(sorted(result.items()))

def reviewed_source(application,tooling):
    owned,sizes,_=seed.reviewed_source(application,tooling);return owned,sizes,fingerprints()

def unchanged(owned,hashes):
    if shared.snapshot.local_owned_checksums()!=owned or fingerprints()!=hashes:raise ValueError('Reviewed full private engine source/application changed; stop without retry')

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    mode=parser.add_mutually_exclusive_group();mode.add_argument('--rehearse-staging',action='store_true');mode.add_argument('--inspect-recovery');mode.add_argument('--resume-engine-recovery');mode.add_argument('--resume-preparation-recovery')
    parser.add_argument('--application-commit',required=True);parser.add_argument('--tooling-commit',required=True);parser.add_argument('--interrupt-original',action='store_true');parser.add_argument('--interrupt-engine',action='store_true');parser.add_argument('--stop-after-engine-cut',action='store_true');parser.add_argument('--stop-after-preparation',action='store_true');parser.add_argument('--capture-profile',choices=('bounded-sha256','bounded-complete-sha256'),default='bounded-sha256');parser.add_argument('--report',required=True);args=parser.parse_args(argv)
    recovery_id=args.inspect_recovery or args.resume_engine_recovery or args.resume_preparation_recovery
    if recovery_id and (not backup.identifier(recovery_id,32) or args.interrupt_original or args.interrupt_engine):raise ValueError('Exact explicit recovery identifier without new interruption flags required')
    if args.stop_after_engine_cut and not ((args.rehearse_staging and args.interrupt_engine) or args.resume_preparation_recovery):raise ValueError('Controlled engine stop requires a fresh interruption rehearsal or explicit preparation recovery')
    if args.stop_after_preparation and (not args.rehearse_staging or args.stop_after_engine_cut):raise ValueError('Controlled preparation stop requires a fresh rehearsal without another stop mode')
    candidate=Path(args.report);destination=candidate.resolve()
    if candidate.is_symlink() or not destination.is_relative_to(ROOT/'docs/seo') or destination.suffix!='.json' or destination.exists() or destination.is_symlink():raise ValueError('Fresh local SEO report required')
    owned,sizes,hashes=reviewed_source(args.application_commit,args.tooling_commit);report={'startedAt':datetime.now(timezone.utc).isoformat(),'scope':'explicit private-only full engine rehearsal; no public/production transaction','phase':'offline-validated','applicationCommit':args.application_commit,'toolingCommit':args.tooling_commit,'sourceHashes':hashes,'publicOwnedFiles':len(owned),'publicOwnedBytes':sum(sizes.values()),'publicApplicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionOperations':0,'fullHostTransactionAcceptance':False,'quotaVerified':False,'steps':[],'uncertainRequests':[]}
    report['captureProfile']=args.capture_profile
    def checkpoint(phase=None):
        if phase is not None:report['phase']=phase
        report['updatedAt']=datetime.now(timezone.utc).isoformat();destination.parent.mkdir(parents=True,exist_ok=True);destination.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    checkpoint()
    if not args.rehearse_staging and not recovery_id:print(json.dumps({'phase':report['phase'],'publicOwnedFiles':len(owned),'publicOwnedBytes':sum(sizes.values())}));return
    common=None;connection=None;lease=None;cleanup_lease=None;wire=None;cleanup_wire=None;value=None;client=None;before=None
    try:
        recovered_archives=None
        if recovery_id:
            value=recovery.FullPrivateEngineVault().load(recovery_id)
            if value['toolingCommit']!=args.tooling_commit or value['applicationCommit']!=args.application_commit or value['sourceHashes']!=hashes or value['publicOwned']!=owned or value['publicSizes']!=sizes:raise ValueError('Recovered engine context differs from exact reviewed source')
            if time.time()>=value['expires']:raise ValueError('Expired private context is inspection evidence only; no helper reinstall or credential refresh')
            if args.resume_engine_recovery or args.resume_preparation_recovery:
                # Archive verification and binding are local and precede any connection/helper.
                _,_,saved_overrides=full.plan(value['transactionId'],value['applicationCommit'],owned,sizes,value['plan']['protectedStateSha256'])
                def no_server(*args):raise AssertionError('No server operation during saved archive preflight')
                archive_client=FullPrivateEngineClient(value['plan'],sizes,saved_overrides,ROOT/'staging/wp-content/mu-plugins',value['helperSha256'],value['ownershipKey'],no_server,no_server)
                original_path=ROOT/'deploy-backups'/('staging-full-engine-original-'+recovery_id+'.zip');rollback_path=ROOT/'deploy-backups'/('staging-full-engine-rollback-'+recovery_id+'.zip')
                recovered_archives=(recovery_resume.attach_verified_original if args.resume_preparation_recovery else recovery_resume.attach_verified_archives)(archive_client,original_path,rollback_path)
                report['originalArchive']=recovered_archives[1]
                report['savedRecoveryArchivesVerifiedBeforeConnection']=True;checkpoint('saved-recovery-archives-verified')
                if args.resume_preparation_recovery:report['savedOriginalArchiveVerifiedBeforeConnection']=True
                if args.stop_after_engine_cut and value['interruptEngine'] is not True:raise ValueError('Saved explicit engine interruption is required for a preparation-resume stop')
            saved_name='ktk-transaction-rehearsal-'+value['transactionId']+'.php'
            saved_source=compiler.helper_source(saved_name,value['token'],value['expires'],args.application_commit,owned,sizes,value['plan']['protectedStateSha256'],value['ownershipKey'],value['interruptOriginal'],value['interruptEngine'],capture_profile=args.capture_profile)
            if backup.sha(saved_source)!=value['helperSha256']:raise ValueError('Exact encrypted engine helper compilation required')
            report['captureProfileVerifiedBeforeConnection']=True
        common=shared.snapshot.load_common()
        connection=BoundedStagingFTPS(common.common.store2.connect)
        if value is None:
            report['before']={};before=shared.capture(common,connection,owned,shared.source_hashes(),report['before'],lambda:checkpoint('snapshot-before'),source_compiler=early.snapshot_source);unchanged(owned,hashes)
            tx,token,key=secrets.token_hex(16),secrets.token_urlsafe(32),secrets.token_hex(32);expires=int(time.time())+compiler.MAX_LIFETIME;plan,_,_=full.plan(tx,args.application_commit,owned,sizes,before['protectedStateSha256']);name='ktk-transaction-rehearsal-'+tx+'.php';source=compiler.helper_source(name,token,expires,args.application_commit,owned,sizes,plan['protectedStateSha256'],key,args.interrupt_original,args.interrupt_engine,capture_profile=args.capture_profile)
            value={'schemaVersion':1,'scope':recovery.SCOPE,'entryProfile':'early','transactionId':tx,'applicationCommit':args.application_commit,'toolingCommit':args.tooling_commit,'helperSha256':backup.sha(source),'sourceHashes':hashes,'expires':expires,'token':token,'ownershipKey':key,'plan':plan,'publicOwned':owned,'publicSizes':sizes,'interruptOriginal':args.interrupt_original,'interruptEngine':args.interrupt_engine};report['encryptedRecoveryPacket']=recovery.FullPrivateEngineVault().save(value);checkpoint('encrypted-engine-packet-persisted')
        if args.resume_engine_recovery or args.resume_preparation_recovery:
            report['before']={};before=shared.capture(common,connection,owned,shared.source_hashes(),report['before'],lambda:checkpoint('recovery-snapshot-before'),source_compiler=early.snapshot_source)
            if any(before[k]!=recovered_archives[2][k] for k in shared.STATE_KEYS):raise ValueError('Fresh selected/public/protected state differs from archived recovery original; preserve without restoration')
            report['freshRecoveryBeforeMatchesArchivedOriginal']=True
        tx=value['transactionId'];plan=value['plan'];_,_,overrides=full.plan(tx,args.application_commit,owned,sizes,plan['protectedStateSha256']);name='ktk-transaction-rehearsal-'+tx+'.php';source=compiler.helper_source(name,value['token'],value['expires'],args.application_commit,owned,sizes,plan['protectedStateSha256'],value['ownershipKey'],value['interruptOriginal'],value['interruptEngine'],capture_profile=args.capture_profile)
        if backup.sha(source)!=value['helperSha256']:raise ValueError('Exact encrypted engine helper compilation required')
        report.update(transactionId=tx,helper=name,helperSha256=value['helperSha256'],expires=value['expires']);scope=shared.legacy.TemporaryHelperFTP(connection,name);lease=shared.HelperLease(common,connection,scope,source);unchanged(owned,hashes)
        if recovery_id:
            existing=common.common.retrieve_file(scope,scope.path)
            if existing is not None:
                if existing!=source:raise ValueError('Changed or foreign helper preserved')
                lease.attempted=True
            else:lease.install()
        else:lease.install()
        checkpoint('engine-helper-installed');wire=FullPrivateEngineTransport(plan,value['helperSha256'],value['token'],value['expires']);reader=None
        def request(raw):
            nonlocal reader
            unchanged(owned,hashes);action=backup.decode(raw)['action']
            try:envelope=wire(raw)
            except Exception:
                report['uncertainRequests'].append({'action':action,'seconds':wire.last_request_seconds,'failure':wire.last_failure,'observation':wire.last_observation});checkpoint();raise
            if action=='export':reader=PrivateBackupReader(connection,tx,client.bind_manifest(client.validate(envelope).get('export')))
            state=envelope['controller'];row={'action':action,'seconds':wire.last_request_seconds,'runtime':wire.last_runtime}
            if 'preparation' in state:
                s=state['preparation']['fullSeed'];row.update(phase='preparation',privateFiles=len(s['files']) if s else 0,privateBytes=s['copiedBytes'] if s else 0)
            else:row.update(phase=state['engine']['phase'],closed=state['closed'])
            report['steps'].append(row);checkpoint('engine-'+row['phase']);return envelope
        def read(path):
            unchanged(owned,hashes)
            if reader is None:raise ValueError('Authenticated rollback export must precede private reads')
            return reader(path)
        client=FullPrivateEngineClient(plan,sizes,overrides,ROOT/'staging/wp-content/mu-plugins',value['helperSha256'],value['ownershipKey'],request,read)
        if args.inspect_recovery:
            archive=ROOT/'deploy-backups'/('staging-full-engine-rollback-'+tx+'.zip')
            if archive.exists():client.attach_archive(archive);state=client.inspect();report['recoveryInspection']={'phase':state['engine']['phase'],'closed':state['closed'],'archiveAcknowledged':state['archiveAcknowledged']}
            else:state=client.inspect_preparation();report['recoveryInspection']={'phase':'preparation','recordsComplete':state['preparation']['recordsComplete'],'seedsComplete':state['preparation']['seedsComplete'],'enginePhase':state['preparation']['enginePhase']}
            checkpoint('recovery-inspected-no-copy-or-engine-action');return
        original_path=ROOT/'deploy-backups'/('staging-full-engine-original-'+tx+'.zip');rollback_path=ROOT/'deploy-backups'/('staging-full-engine-rollback-'+tx+'.zip')
        original_reader=None
        class OriginalGate:
            def original_manifest(self):
                nonlocal original_reader
                unchanged(owned,hashes);m=wire.original_manifest();original_reader=OriginalCapsuleReader(connection,m,plan);report['steps'].append({'action':'original','seconds':wire.last_request_seconds,'runtime':wire.last_runtime,'phase':'original-capsule'});checkpoint();return m
            def acknowledge_original(self,path,key,m):wire.acknowledge_original(path,key,m)
        def original_read(path):
            unchanged(owned,hashes)
            if original_reader is None:raise ValueError('Authenticated original manifest must precede signed record reads')
            return original_reader(path)
        def observe(event,payload):
            if event=='original-archived':report['originalArchive']=payload
            elif event=='rollback-archived':report['rollbackArchive']=payload
            elif event in ('inspect-engine-cut','resume-first-engine-cut-inspected'):report['controlledEngineCutFreshlyInspected']={'phase':payload['engine']['phase'],'intentFiles':len(payload['engine']['intentFiles']),'pendingApplyFiles':len(payload['engine']['pendingApplyFiles']),'archiveAcknowledged':payload['archiveAcknowledged']}
            elif event=='inspect-original-cut':report['controlledOriginalCutFreshlyInspected']={'seedStateSha256':payload['preparation']['fullSeed']['stateSha256'],'privateBytes':payload['preparation']['fullSeed']['copiedBytes']}
            checkpoint(event)
            if event=='inspect-engine-cut' and args.stop_after_engine_cut:raise ControlledCallerStop('Planned separate-caller stop after exact first owned replacement inspection')
            if event=='preparation-progress' and args.stop_after_preparation and 'preparation' in payload:
                p=payload['preparation'];seed=p['fullSeed']
                if p['recordsComplete'] and p['enginePhase'] is None and seed['sourceComplete'] and seed['targetComplete']:
                    report['completeSeedCallerStop']=recovery_resume.inspect_complete_seed_boundary(client,payload);checkpoint('complete-seed-caller-stop')
                    raise ControlledCallerStop('Planned separate-caller stop after complete seeds and before engine preparation')
        if args.resume_engine_recovery:
            manifest,original_receipt,_=recovered_archives;report['originalArchive']=original_receipt
            report['privateTransaction']=recovery_resume.continue_first_engine_cut(client,original_path,rollback_path,observe)
            report['separateCallerContinuationVerified']=True
        elif args.resume_preparation_recovery:
            manifest,original_receipt,prepared=recovery_resume.continue_preparation(client,wire,original_path,rollback_path,observe);report['originalArchive']=original_receipt;report['preparation']=prepared;report['separateCallerPreparationContinuationVerified']=True
            report['privateTransaction']=transact(client,rollback_path,value['interruptEngine'],observe)
        else:
            manifest,original_receipt,prepared=prepare(client,OriginalGate(),original_path,original_read,full.build_archive,value['interruptOriginal'],observe);report['originalArchive']=original_receipt;report['preparation']=prepared;report['privateTransaction']=transact(client,rollback_path,value['interruptEngine'],observe)
        report['rollbackArchive']=client.verified_archive();checkpoint('private-engine-rolled-back-and-closed')
        with zipfile.ZipFile(original_path) as z:original=full.validate_records({n:z.read(n) for n in manifest['members']},manifest,plan,value['ownershipKey'],value['helperSha256'])
        if any(original[k]!=before[k] for k in shared.STATE_KEYS):raise ValueError('Archived original differs from independent before snapshot')
        roots=wire.private_roots(value['ownershipKey'],manifest['rootBinding']);report['canonicalPrivateContextVerified']=True;report['steps'].append({'action':'private-roots','seconds':wire.last_request_seconds,'runtime':wire.last_runtime,'phase':'archived-terminal-context'});authority=disposal.authority(value,original_path,manifest,rollback_path,client.manifest,FullEngineRetainedReader(connection,tx,roots['publicRoot']),roots['publicRoot']);cleanup_id=secrets.token_hex(16);cleanup_token=secrets.token_urlsafe(32);cleanup_expires=int(time.time())+3600;cleanup_source=disposal.helper_source(authority,roots['publicRoot'],value['ownershipKey'],cleanup_token,cleanup_expires)
        cleanup={'schemaVersion':1,'scope':disposal_recovery.SCOPE,'disposalId':cleanup_id,'transactionId':tx,'toolingCommit':args.tooling_commit,'sourceHashes':hashes,'expires':cleanup_expires,'token':cleanup_token,'ownershipKey':value['ownershipKey'],'helperSha256':backup.sha(cleanup_source),'publicRoot':roots['publicRoot'],'authority':authority,'originalArchiveName':original_path.name,'rollbackArchiveName':rollback_path.name,'originalHelperSha256':value['helperSha256']};report['encryptedDisposalPacket']=disposal_recovery.FullEngineDisposalVault().save(cleanup);checkpoint('encrypted-disposal-packet-persisted');lease.remove();report['engineHelperRemoved']=lease.removed;cleanup_lease=shared.HelperLease(common,connection,shared.legacy.TemporaryHelperFTP(connection,name),cleanup_source);unchanged(owned,hashes);cleanup_lease.install()
        def verify_archives():
            unchanged(owned,hashes);return full.verify_archive(original_path,plan,value['ownershipKey'],value['helperSha256'],manifest)==original_receipt and backup.verify_archive(rollback_path,value['ownershipKey'],client.manifest)==client.archive_receipt
        cleanup_wire=FullEngineDisposalTransport(cleanup,verify_archives);state=cleanup_wire.request('inspect');report['cleanupSteps']=[]
        for _ in range(math.ceil(len(authority['payload'])/256)+50):
            if state['phase']=='disposed':break
            previous=state;state=cleanup_wire.request('cleanup',stateSha256=state['stateSha256']);report['cleanupSteps'].append({'seconds':cleanup_wire.last_request_seconds,'runtime':cleanup_wire.last_runtime,'payloadFiles':state['payloadFiles'],'payloadBytes':state['payloadBytes'],'operation':state['operation']});checkpoint('private-payload-disposal')
            if state['phase']!='disposed' and (state['payloadFiles'],len(state['directories']))>=(previous['payloadFiles'],len(previous['directories'])):raise ValueError('Exact private cleanup made no verified progress')
        else:raise ValueError('Private cleanup exceeded deterministic bounded request limit')
        cleanup_lease.remove();report['disposalHelperRemoved']=cleanup_lease.removed;report['after']={};after=shared.capture(common,connection,owned,shared.source_hashes(),report['after'],lambda:checkpoint('snapshot-after'),source_compiler=early.snapshot_source)
        if any(original[k]!=after[k] for k in shared.STATE_KEYS):raise ValueError('Original selected/public/protected state differs; no restoration permitted')
        fresh=BoundedStagingFTPS(common.common.store2.connect)
        try:
            report['independentRetainedAudit']=verify_retained(fresh,cleanup,verify_archives)
            helpers=sorted({name,report['before']['helper'],report['after']['helper']})
            for helper_name in helpers:
                helper_scope=shared.legacy.TemporaryHelperFTP(fresh,helper_name) if helper_name==name else shared.snapshot.TemporaryHelperFTP(fresh,helper_name)
                if common.common.retrieve_file(helper_scope,helper_scope.path) is not None:raise ValueError('Fresh independent helper absence required')
            report['independentHelperAbsenceCount']=len(helpers)
        finally:report['independentRetainedFTPSStatistics']=fresh.statistics();fresh.close()
        report['allSelectedProtectedAndPublicStateExact']=True;report['fullPrivateEngineRehearsalAndDisposalVerified']=True;unchanged(owned,hashes);checkpoint('complete-private-only-engine-rehearsal')
    except Exception as error:
        report['failedAtPhase']=report['phase'];report['failureType']=type(error).__name__
        for name,t in [('engine',wire),('disposal',cleanup_wire)]:
            if t is not None:report[name+'LastRequest']={'seconds':t.last_request_seconds,'failure':t.last_failure,'observation':t.last_observation}
        checkpoint('failed-preserve-encrypted-packets-and-archives');raise RuntimeError('Full private engine rehearsal stopped; inspect sanitized evidence and encrypted context; no automatic retry') from None
    finally:
        try:
            for name,helper in [('engineHelperRemoved',lease),('disposalHelperRemoved',cleanup_lease)]:
                if helper is not None and not helper.removed:helper.remove();report[name]=helper.removed
        except Exception:checkpoint('helper-cleanup-unverified-preserve-evidence');raise RuntimeError('Exact helper cleanup not verified; inspect without automatic retry') from None
        finally:
            if connection is not None:report['ftpsSessionStatistics']=connection.statistics();connection.close()
            report['finishedAt']=datetime.now(timezone.utc).isoformat();checkpoint();print(json.dumps({k:report.get(k) for k in ('phase','transactionId','engineHelperRemoved','disposalHelperRemoved','fullPrivateEngineRehearsalAndDisposalVerified')}))

if __name__=='__main__':main()
