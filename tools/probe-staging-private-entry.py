"""Default offline. Explicitly compare authenticated early/late entry and normal fallback on staging."""
from __future__ import annotations
import argparse,importlib.util,json,secrets,sys,time
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:sys.path.insert(0,str(ROOT))
from tools import content_update_backup as backup
from tools import private_entry_probe as probe
from tools.normal_response_contract import equivalent
from tools.content_update_staging_connection import BoundedStagingFTPS
spec=importlib.util.spec_from_file_location('ktk_private_entry_shared',ROOT/'tools/rehearse-staging-full-seeds.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base);shared=base.shared
FILES=('probe-staging-private-entry.py','probe-staging-private-entry.ps1','private_entry_probe.py','staging-private-entry-probe-template.php','normal_response_contract.py')

def fingerprints():
    value=base.fingerprints()
    for name in FILES:
        p=ROOT/'tools'/name
        if p.is_symlink() or not p.is_file():raise ValueError('Exact private entry reviewed source required')
        value['tools/'+name]=backup.sha(p.read_bytes())
    return dict(sorted(value.items()))

def unchanged(owned,hashes):
    if shared.snapshot.local_owned_checksums()!=owned or fingerprints()!=hashes:raise ValueError('Private entry source or public build changed')

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--probe-staging',action='store_true');parser.add_argument('--application-commit',required=True);parser.add_argument('--tooling-commit',required=True);parser.add_argument('--report',required=True);args=parser.parse_args(argv);destination=Path(args.report).resolve()
    if not destination.is_relative_to(ROOT/'docs/seo') or destination.suffix!='.json' or destination.exists() or destination.is_symlink():raise ValueError('Fresh local private entry report required')
    owned,sizes,_=base.reviewed_source(args.application_commit,args.tooling_commit);hashes=fingerprints();report={'startedAt':datetime.now(timezone.utc).isoformat(),'scope':'Read-only private early/late entry and ordinary missing/invalid/expired-token response comparison; no copy or update','phase':'offline-validated','applicationCommit':args.application_commit,'toolingCommit':args.tooling_commit,'sourceHashes':hashes,'publicOwnedFiles':len(owned),'publicOwnedBytes':sum(sizes.values()),'applicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionOperations':0,'fullPrivateCopyVerified':False,'fullHostTransactionAcceptance':False,'observations':[],'normalControls':{}}
    def checkpoint(phase=None):
        if phase is not None:report['phase']=phase
        report['updatedAt']=datetime.now(timezone.utc).isoformat();destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes((json.dumps(report,indent=2)+'\n').encode())
    checkpoint()
    if not args.probe_staging:print(json.dumps({'phase':report['phase'],'publicOwnedFiles':len(owned)}));return
    common=shared.snapshot.load_common();connection=None;lease=None;client=None
    try:
        connection=BoundedStagingFTPS(common.common.store2.connect);report['before']={};checkpoint('snapshot-before');before=shared.capture(common,connection,owned,shared.source_hashes(),report['before'],checkpoint);unchanged(owned,hashes)
        identifier=secrets.token_hex(16);token=secrets.token_urlsafe(32);name='ktk-state-snapshot-'+identifier+'.php';expires=int(time.time())+180;source=probe.helper_source(name,token,expires,owned);sha=backup.sha(source);client=probe.EntryProbeClient(identifier,token,expires,sha,owned);report.update(identifier=identifier,helper=name,helperSha256=sha,expires=expires)
        report['normalControls']['beforeHelper']=client.normal();report['normalControls']['beforeHelperInspectPOST']=client.normal(method='POST');checkpoint('ordinary-baseline');lease=shared.HelperLease(common,connection,shared.snapshot.TemporaryHelperFTP(connection,name),source);lease.install();checkpoint('entry-helper-installed')
        expected=probe.snapshot_metadata(before,sha)
        for profile in ('early','late','early','late'):
            unchanged(owned,hashes);started=time.time();value=client.inspect(profile);finished=time.time();report['observations'].append({'seconds':client.last_request_seconds,'clientStartedEpoch':started,'clientFinishedEpoch':finished,**value});checkpoint('observed-'+profile)
            if value['snapshot']!=expected:raise ValueError('Complete selected/public/protected state differs between entry profiles or original snapshot')
        early=[v for v in report['observations'] if v['profile']=='early'];late=[v for v in report['observations'] if v['profile']=='late']
        if any(v['regularPlugins']['included']!=0 for v in early) or any(v['regularPlugins']['ecwidDeclared'] and v['regularPlugins']['ecwidIncluded'] for v in early) or any(v['regularPlugins']['ecwidDeclared'] and not v['regularPlugins']['ecwidIncluded'] for v in late):raise ValueError('Actual entry observations do not establish expected ordinary plugin isolation')
        report['allEntrySnapshotHashesEqualFullOriginal']=True;report['ordinaryPluginEntryIsolationObserved']=True
        baseline=report['normalControls']['beforeHelper']
        for label,control in [('missingToken',None),('invalidToken','invalid-private-entry-control')]:
            unchanged(owned,hashes);r=client.normal(control);report['normalControls'][label]=r;checkpoint('normal-'+label)
            report['normalControls'][label]['rawHtmlEqualToBaseline']=(r['bytes'],r['sha256'])==(baseline['bytes'],baseline['sha256']);checkpoint('normal-'+label)
            if not equivalent(r,baseline):raise ValueError('Ordinary HTML outside email encoding or decoded contact payload differs; no unchanged-response claim')
        lower_offset=max(v['serverEpoch']-v['clientFinishedEpoch'] for v in report['observations']);deadline=expires-lower_offset+1;remaining=deadline-time.time()
        if abs(lower_offset)>15 or remaining>300:raise ValueError('Observed server clock/latency cannot support bounded real-expiry proof')
        report['serverClockOffsetLowerBoundSeconds']=lower_offset;report['expiryWaitSeconds']=max(0,remaining);checkpoint('waiting-for-real-expiry')
        while time.time()<deadline:
            time.sleep(max(0,min(15,deadline-time.time())));unchanged(owned,hashes)
        r=client.normal(token,method='POST');report['normalControls']['expiredToken']=r;checkpoint('normal-expiredToken');post_baseline=report['normalControls']['beforeHelperInspectPOST']
        report['normalControls']['expiredToken']['rawHtmlEqualToBaseline']=(r['bytes'],r['sha256'])==(post_baseline['bytes'],post_baseline['sha256']);checkpoint('normal-expiredToken')
        if not equivalent(r,post_baseline):raise ValueError('Expired probe changed ordinary inspect-POST HTML outside email encoding or decoded contact payload')
        report['actualExpiryFallbackVerified']=True;lease.remove();report['helperRemoved']=lease.removed;unchanged(owned,hashes);report['normalControls']['afterRemoval']=client.normal();r=report['normalControls']['afterRemoval']
        report['normalControls']['afterRemoval']['rawHtmlEqualToBaseline']=(r['bytes'],r['sha256'])==(baseline['bytes'],baseline['sha256'])
        if not equivalent(r,baseline):raise ValueError('Ordinary post-removal HTML outside email encoding or decoded contact payload differs')
        report['after']={};checkpoint('snapshot-after');after=shared.capture(common,connection,owned,shared.source_hashes(),report['after'],checkpoint)
        if any(before[k]!=after[k] for k in shared.STATE_KEYS):raise ValueError('Full selected/public/protected state changed; preserve without restoration')
        report['fullSelectedAndPublicProtectedStateExact']=True
        unchanged(owned,hashes);checkpoint('read-only-entry-equivalence-and-expiry-verified')
    except Exception as error:
        report['failedAtPhase']=report['phase'];report['failureType']=type(error).__name__
        if client is not None:report['lastRequestFailure']=client.last_failure;report['lastRequestSeconds']=client.last_request_seconds
        checkpoint('failed-preserve-probe-and-state-evidence');raise RuntimeError('Private entry proof stopped; inspect sanitized evidence without retry or state restoration') from None
    finally:
        try:
            if lease is not None and not lease.removed:lease.remove();report['helperRemoved']=lease.removed
        except Exception:
            checkpoint('probe-helper-cleanup-unverified');raise RuntimeError('Private entry helper absence unverified; inspect before further mutation') from None
        finally:
            if connection is not None:report['ftpsStatistics']=connection.statistics();connection.close()
            report['finishedAt']=datetime.now(timezone.utc).isoformat();checkpoint();print(json.dumps({k:report.get(k) for k in ('phase','helperRemoved','allEntrySnapshotHashesEqualFullOriginal','ordinaryPluginEntryIsolationObserved','actualExpiryFallbackVerified','fullSelectedAndPublicProtectedStateExact')}))

if __name__=='__main__':main()
