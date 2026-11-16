"""Default offline. Explicitly dispose known incomplete private copies using a separately archived fresh state."""
from __future__ import annotations
import argparse,importlib.util,json,math,secrets,subprocess,sys,time
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:sys.path.insert(0,str(ROOT))
from tools import content_update_backup as backup
from tools import full_private_seed_recovery as original_recovery
from tools import private_seed_disposal as disposal
from tools.content_update_staging_connection import BoundedStagingFTPS
spec=importlib.util.spec_from_file_location('ktk_disposal_full_runner',ROOT/'tools/rehearse-staging-full-seeds.py');full_runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(full_runner);shared=full_runner.shared
FILES=('dispose-staging-full-seeds.py','dispose-staging-full-seeds.ps1','private_seed_disposal.py','private-seed-disposal.php','private-seed-disposal-template.php')

def fingerprints():
    result=full_runner.fingerprints()
    for name in FILES:
        p=ROOT/'tools'/name
        if p.is_symlink() or not p.is_file():raise ValueError('Exact private disposal source required')
        result['tools/'+name]=backup.sha(p.read_bytes())
    return dict(sorted(result.items()))

def unchanged(owned,hashes):
    if shared.snapshot.local_owned_checksums()!=owned or fingerprints()!=hashes:raise ValueError('Reviewed private disposal source or public build changed')

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__);mode=parser.add_mutually_exclusive_group();mode.add_argument('--dispose-staging',action='store_true');mode.add_argument('--resume-disposal');parser.add_argument('--transaction',required=True);parser.add_argument('--abandoned-state');parser.add_argument('--application-commit',required=True);parser.add_argument('--tooling-commit',required=True);parser.add_argument('--report',required=True);args=parser.parse_args(argv)
    if not backup.identifier(args.transaction,32) or args.resume_disposal and not backup.identifier(args.resume_disposal,32) or args.abandoned_state is not None and (not args.resume_disposal or not backup.digest(args.abandoned_state)):raise ValueError('Exact separate disposal transaction/resume request required')
    destination=Path(args.report).resolve()
    if not destination.is_relative_to(ROOT/'docs/seo') or destination.suffix!='.json' or destination.exists() or destination.is_symlink():raise ValueError('Fresh private disposal report required')
    owned,sizes,_=full_runner.reviewed_source(args.application_commit,args.tooling_commit);hashes=fingerprints();report={'startedAt':datetime.now(timezone.utc).isoformat(),'scope':'Fresh-witness abandonment and disposal of known private payload only; no copy, transaction, public or database writer','phase':'offline-validated','transactionId':args.transaction,'applicationCommit':args.application_commit,'toolingCommit':args.tooling_commit,'sourceHashes':hashes,'publicOwnedFiles':len(owned),'publicOwnedBytes':sum(sizes.values()),'publicApplicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionOperations':0,'fullPrivateCopyVerified':False,'fullHostTransactionAcceptance':False,'steps':[]}
    def checkpoint(phase=None):
        if phase is not None:report['phase']=phase
        report['updatedAt']=datetime.now(timezone.utc).isoformat();destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes((json.dumps(report,indent=2)+'\n').encode())
    checkpoint()
    if not args.dispose_staging and not args.resume_disposal:print(json.dumps({'phase':report['phase'],'publicOwnedFiles':len(owned),'publicOwnedBytes':sum(sizes.values())}));return
    connection=None;lease=None;client=None
    try:
        old=original_recovery.FullSeedPacketVault().load(args.transaction)
        if old['applicationCommit']!=args.application_commit or old['publicOwned']!=owned or old['publicSizes']!=sizes:raise ValueError('Original stopped transaction differs from frozen public source')
        for name,sha in old['sourceHashes'].items():
            if backup.sha(subprocess.check_output(['git','show',old['toolingCommit']+':'+name]))!=sha:raise ValueError('Original encrypted packet source provenance differs')
        original_path=ROOT/'deploy-backups'/('staging-full-seeds-original-'+args.transaction+'.zip');original_receipt=full_runner.full.verify_archive(original_path,old['plan'],old['ownershipKey'],old['helperSha256']);manifest,original=full_runner.archive_original(original_path,old['plan'],old['ownershipKey'],old['helperSha256']);report['originalCapsuleArchive']=original_receipt;report['originalToolingCommit']=old['toolingCommit']
        common=shared.snapshot.load_common();connection=BoundedStagingFTPS(common.common.store2.connect)
        if args.resume_disposal:
            value=disposal.DisposalVault().load(args.resume_disposal)
            if value['transactionId']!=args.transaction or value['applicationCommit']!=args.application_commit or value['sourceHashes']!=hashes:raise ValueError('Explicit disposal resume differs from current reviewed source')
        else:
            report['freshWitness']={};checkpoint('capturing-fresh-witness');current=shared.capture(common,connection,owned,shared.source_hashes(),report['freshWitness'],checkpoint)
            if current['ownedContentFiles']!=original['ownedContentFiles'] or current['protectedFiles']!=original['protectedFiles'] or current['identity']!=original['identity']:raise ValueError('Public/protected file or identity drift requires separate review')
            receipt=report['freshWitness']['privateBackup'];value={'schemaVersion':1,'scope':'witnessed-private-seed-disposal','disposalId':secrets.token_hex(16),'transactionId':args.transaction,'applicationCommit':args.application_commit,'toolingCommit':args.tooling_commit,'sourceHashes':hashes,'expires':int(time.time())+3600,'token':secrets.token_urlsafe(32),'helperSha256':'f'*64,'freshProtectedStateSha256':current['protectedStateSha256'],'witnessArchiveSha256':receipt['sha256'],'witnessArchiveName':Path(receipt['path']).name,'originalArchiveSha256':original_receipt['sha256']}
            value['helperSha256']=backup.sha(disposal.helper_source(value,old,manifest));report['encryptedDisposalPacket']=disposal.DisposalVault().save(value);checkpoint('separate-disposal-packet-persisted')
        witness_path=ROOT/'deploy-backups'/value['witnessArchiveName'];current=disposal.witness(witness_path,value['witnessArchiveSha256'],value['freshProtectedStateSha256'],owned)
        if value['originalArchiveSha256']!=original_receipt['sha256'] or current['protectedFiles']!=original['protectedFiles'] or current['identity']!=original['identity']:raise ValueError('Saved disposal witness or original archive context differs')
        report.update(disposalId=value['disposalId'],expires=value['expires'],freshProtectedStateSha256=value['freshProtectedStateSha256'],originalProtectedStateSha256=original['protectedStateSha256'],witnessArchiveSha256=value['witnessArchiveSha256'],originalSelectedStateDriftObserved=current['protectedStateSha256']!=original['protectedStateSha256'],changedSelectedTables=[n for n in original['database'] if original['database'][n]!=current['database'][n]])
        a={r['option_name']:r for r in original['database']['options']};b={r['option_name']:r for r in current['database']['options']};report['changedOptionNames']=[n for n in sorted(set(a)|set(b)) if a.get(n)!=b.get(n)]
        source=disposal.helper_source(value,old,manifest)
        if backup.sha(source)!=value['helperSha256']:raise ValueError('Exact separately compiled disposal helper required')
        name='ktk-transaction-rehearsal-'+args.transaction+'.php';report.update(helper=name,helperSha256=value['helperSha256']);scope=shared.legacy.TemporaryHelperFTP(connection,name);lease=shared.HelperLease(common,connection,scope,source);unchanged(owned,hashes)
        if args.resume_disposal:
            remote=common.common.retrieve_file(scope,scope.path)
            if remote is not None:
                if remote!=source:raise ValueError('Existing foreign or changed helper preserved')
                lease.attempted=True;report['exactExistingDisposalHelperAdopted']=True
            else:lease.install()
        else:lease.install()
        checkpoint('private-disposal-helper-installed');client=disposal.DisposalTransport(value,old,manifest,ROOT/'staging/wp-content/mu-plugins')
        def request(action,**fields):
            unchanged(owned,hashes);disposal.witness(witness_path,value['witnessArchiveSha256'],value['freshProtectedStateSha256'],owned)
            if full_runner.full.verify_archive(original_path,old['plan'],old['ownershipKey'],old['helperSha256'],manifest)!=original_receipt:raise ValueError('Original archive changed before private disposal')
            envelope=client.request(action,**fields);state=envelope['controller'];report['steps'].append({'action':action,'phase':state['phase'],'seconds':client.last_request_seconds,'runtime':envelope['runtime'],'privateFiles':len(state['seed']['files']),'privateBytes':state['seed']['copiedBytes'],'seedStateSha256':state['seed']['stateSha256'],'operation':state['operation']});checkpoint('private-disposal-'+state['phase']);return state
        abandoned=args.abandoned_state;state=request('inspect-abandoned',abandonedSeedStateSha256=abandoned) if abandoned else request('inspect');abandoned=abandoned or state['seed']['stateSha256'];report['abandonedSeedStateSha256']=abandoned;checkpoint()
        if not state['closed']:state=request('abandon',stateSha256=state['stateSha256'],abandonedSeedStateSha256=abandoned)
        for _ in range(math.ceil((len(old['plan']['expected'])+len(old['plan']['prior']))/256)+50):
            if state['phase']=='disposed':break
            previous=state;state=request('cleanup',stateSha256=state['stateSha256'],abandonedSeedStateSha256=abandoned)
            if state['phase']!='disposed' and (len(state['seed']['files']),len(state['seed']['directories']))>=(len(previous['seed']['files']),len(previous['seed']['directories'])):raise ValueError('No verified private disposal progress')
        else:raise ValueError('Private disposal exceeded deterministic step budget')
        report['privatePayloadsAbsent']=not state['seed']['files'] and not state['seed']['directories'];lease.remove();report['helperRemoved']=lease.removed;unchanged(owned,hashes);report['after']={};checkpoint('capturing-after');after=shared.capture(common,connection,owned,shared.source_hashes(),report['after'],checkpoint)
        if any(current[k]!=after[k] for k in shared.STATE_KEYS):raise ValueError('Fresh witnessed state changed; no restoration or success claim')
        report['freshWitnessSelectedStateAndPublicProtectedFilesExact']=True;fresh=BoundedStagingFTPS(common.common.store2.connect)
        try:report['independentRetainedMetadataAudit']=disposal.verify_retained_metadata(fresh,original_path,value,old,manifest,abandoned)
        finally:report['independentRetainedFTPSStatistics']=fresh.statistics();fresh.close()
        disposal.witness(witness_path,value['witnessArchiveSha256'],value['freshProtectedStateSha256'],owned);unchanged(owned,hashes);report['originalArchiveAndFreshWitnessPreserved']=True;checkpoint('incomplete-private-copy-disposed-with-fresh-witness')
    except Exception as error:
        report['failedAtPhase']=report['phase'];report['failureType']=type(error).__name__
        if client is not None:report['lastRequestFailure']=client.last_failure;report['lastRequestSeconds']=client.last_request_seconds
        checkpoint('failed-preserve-original-witness-packets-and-private-state');raise RuntimeError('Private disposal stopped; inspect sanitized evidence without automatic retry or database restoration') from None
    finally:
        try:
            if lease is not None and not lease.removed:lease.remove();report['helperRemoved']=lease.removed
        except Exception:
            checkpoint('helper-cleanup-unverified-preserve-evidence');raise RuntimeError('Private disposal helper absence could not be verified; inspect without retry') from None
        finally:
            if connection is not None:report['ftpsStatistics']=connection.statistics();connection.close()
            report['finishedAt']=datetime.now(timezone.utc).isoformat();checkpoint();print(json.dumps({k:report.get(k) for k in ('phase','transactionId','disposalId','helperRemoved','privatePayloadsAbsent','freshWitnessSelectedStateAndPublicProtectedFilesExact')}))

if __name__=='__main__':main()
