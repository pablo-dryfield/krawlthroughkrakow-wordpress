"""Default offline. Explicit authenticated metadata-only staging capacity/read-cost audit; never copies payload."""
from __future__ import annotations
import argparse,json,secrets,sys,time,urllib.request
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:sys.path.insert(0,str(ROOT))
from tools import content_update_backup as backup
from tools import full_inventory_capacity as capacity
from tools.content_update_staging_connection import BoundedStagingFTPS
import importlib.util

spec=importlib.util.spec_from_file_location('ktk_capacity_reviewed_runner',ROOT/'tools/rehearse-staging-content-controller.py')
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
ADDITIONAL=('tools/audit-staging-full-inventory-capacity.py','tools/audit-staging-full-inventory-capacity.ps1','tools/full_inventory_capacity.py','tools/staging-full-inventory-capacity-template.php')


def fingerprints():
    values=runner.source_hashes()
    for name in ADDITIONAL:
        path=ROOT/name
        if path.is_symlink() or not path.is_file():raise ValueError('Exact reviewed capacity source required')
        values[name]=backup.sha(path.read_bytes())
    return dict(sorted(values.items()))


def fetch(token,source_sha,owned,sizes,protected_sha,opener=None):
    url=capacity.URL+'?ktk_full_inventory_capacity='+secrets.token_hex(16)
    request=urllib.request.Request(url,data=b'{}',method='POST',headers={'X-KTK-Snapshot-Token':token,'Content-Type':'application/json','Cache-Control':'no-cache','User-Agent':'KTK read-only full inventory capacity/1.0'})
    opener=opener or urllib.request.build_opener(urllib.request.ProxyHandler({}),runner.snapshot.NoRedirect())
    try:
        with opener.open(request,timeout=180) as response:
            if response.status!=200 or response.geturl()!=url or response.headers.get('CF-Cache-Status','').strip().upper() not in ('DYNAMIC','BYPASS') or 'no-store' not in {part.strip().lower() for part in response.headers.get('Cache-Control','').split(',')} or response.headers.get('Content-Type','').split(';',1)[0].strip().lower()!='application/json':
                raise ValueError('Exact uncached authenticated staging response required')
            raw=response.read(262145)
            if len(raw)>262144:raise ValueError('Metadata-only response budget exceeded')
            value=backup.decode(raw)
        return capacity.validate(value,source_sha,owned,sizes,protected_sha)
    except Exception:raise RuntimeError('Read-only staging capacity response failed validation; no raw response logged and no automatic retry') from None


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--audit-staging',action='store_true')
    parser.add_argument('--application-commit',required=True)
    parser.add_argument('--tooling-commit',required=True)
    parser.add_argument('--protected-state-sha256',required=True)
    parser.add_argument('--report',required=True)
    args=parser.parse_args();destination=Path(args.report).resolve()
    if not destination.is_relative_to(ROOT/'docs/seo') or destination.exists() or destination.is_symlink() or not backup.digest(args.protected_state_sha256):
        raise ValueError('Fresh local SEO report and exact protected baseline required')
    owned,_=runner.reviewed_source(args.application_commit,args.tooling_commit);hashes=fingerprints();sizes={n:(ROOT/'staging/wp-content/mu-plugins'/n).stat().st_size for n in owned};owned,sizes=capacity.inventory(owned,sizes)
    report={'startedAt':datetime.now(timezone.utc).isoformat(),'scope':'Metadata-only staging full-inventory capacity and successive capture cost, not copy/transaction/quota acceptance','phase':'offline-validated','applicationCommit':args.application_commit,'toolingCommit':args.tooling_commit,'sourceHashes':hashes,'protectedBaselineSha256':args.protected_state_sha256,'publicOwnedFiles':len(owned),'publicOwnedBytes':sum(sizes.values()),'publicOwnedMapSha256':backup.sha(backup.encode(owned)),'sizeMapSha256':backup.sha(backup.encode(sizes)),'applicationWrites':0,'databaseWrites':0,'privateAllocationBytes':0,'cachePurges':0,'productionOperations':0,'quotaVerified':False,'fullHostAcceptance':False}
    def checkpoint(phase):
        report['phase']=phase;report['updatedAt']=datetime.now(timezone.utc).isoformat();destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes((json.dumps(report,indent=2)+'\n').encode())
    def unchanged():
        if fingerprints()!=hashes or runner.snapshot.local_owned_checksums()!=owned or {n:(ROOT/'staging/wp-content/mu-plugins'/n).stat().st_size for n in owned}!=sizes:
            raise ValueError('Reviewed source/build changed; read-only audit stopped')
    if not args.audit_staging:
        checkpoint('offline-validated');print(json.dumps({k:report[k] for k in ('phase','publicOwnedFiles','publicOwnedBytes','fullHostAcceptance')}));return
    name='ktk-state-snapshot-'+secrets.token_hex(16)+'.php';token=secrets.token_urlsafe(32);expires=int(time.time())+900;source=capacity.helper_source(name,token,expires,owned,sizes,args.protected_state_sha256)
    report.update(helper=name,helperSha256=backup.sha(source),expires=expires,helperInstallationAttempted=False,helperRemoved=False)
    common=runner.snapshot.load_common();connection=BoundedStagingFTPS(common.common.store2.connect);lease=runner.HelperLease(common,connection,runner.snapshot.TemporaryHelperFTP(connection,name),source)
    try:
        checkpoint('read-only-helper-installation');unchanged();report['helperInstallationAttempted']=True;lease.install();checkpoint('authenticated-capacity-read')
        report['observations']=fetch(token,backup.sha(source),owned,sizes,args.protected_state_sha256);unchanged();checkpoint('capacity-observations-verified')
    except Exception:
        report['failedAtPhase']=report['phase'];checkpoint('failed-preserve-evidence-no-retry');raise RuntimeError('Read-only capacity audit stopped; inspect the sanitized report and exact helper identity') from None
    finally:
        try:
            lease.remove();report['helperRemoved']=lease.removed
            if report['phase']=='capacity-observations-verified':checkpoint('complete')
        except Exception:
            checkpoint('helper-cleanup-unverified-preserve-unknown-data');raise RuntimeError('Exact read-only helper cleanup could not be verified; no blind retry') from None
        finally:
            report['ftpsSessionStatistics']=connection.statistics();connection.close();token=None;report['finishedAt']=datetime.now(timezone.utc).isoformat();checkpoint(report['phase']);print(json.dumps({k:report.get(k) for k in ('phase','helperRemoved','publicOwnedFiles','publicOwnedBytes','fullHostAcceptance')}))


if __name__=='__main__':main()
