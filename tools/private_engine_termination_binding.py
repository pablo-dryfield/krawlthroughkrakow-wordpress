"""Read-only binding of typed contexts to real original, witness and census ZIPs.

No helper, connector, authority renewal, fence or deletion. A future server must
repeat its complete current-state and private-census checks under held locks.
"""
from pathlib import Path
import hmac
import time

from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools import private_engine_termination_archive as archive
from tools import private_engine_termination_authority as authority

WITNESS_SCOPE='Private staging WordPress state; no production backup or changed-file rollback payload'
STATE_KEYS=('identity','database','databaseSha256','protectedFiles','ownedContentFiles','protectedStateSha256','rowCounts')


def original_context(old):
    authority.original.validate_packet(old)
    plan,sizes,overrides=full.plan(old['transactionId'],old['applicationCommit'],old['publicOwned'],old['publicSizes'],old['plan']['protectedStateSha256'])
    archive.require(plan==old['plan'],'Immutable original full plan differs')
    return dict(plan=plan,sizes=sizes,overrides=overrides,ownershipKey=old['ownershipKey'],originalHelperSha256=old['helperSha256'])


def fresh_witness(path,value):
    authority.validate_packet(value)
    path=Path(path);archive.require(path.name==value['witnessArchiveName'],'Exact invocation witness archive name required')
    with archive.held_archive(path,33554432) as (z,stamp):
        names=z.namelist();archive.require(len(names)==3 and set(names)=={'before.json','after.json','manifest.json'},'Complete paired witness membership required')
        archive.require(all(not i.is_dir() and not i.flag_bits&1 and i.file_size<=16777216 for i in z.infolist()) and z.getinfo('manifest.json').file_size<=65536,'Bounded unencrypted paired witness required')
        manifest=backup.decode(z.read('manifest.json'))
        archive.require(isinstance(manifest,dict) and set(manifest)=={'scope','helperSha256','files'} and manifest['scope']==WITNESS_SCOPE and backup.digest(manifest['helperSha256']) and isinstance(manifest['files'],dict) and set(manifest['files'])=={'before.json','after.json'},'Exact paired witness manifest required')
        snapshots=[]
        for n in ('before.json','after.json'):
            raw=z.read(n);archive.require(backup.sha(raw)==manifest['files'][n],'Witness member checksum differs')
            s=backup.decode(raw);full.snapshot.validate_snapshot(s,manifest['helperSha256']);snapshots.append(s)
        before,after=snapshots
        archive.require(full.snapshot.same_state(before,after),'Complete paired witness state changed; no exclusions or restoration')
        archive.require(before['protectedStateSha256']==value['freshProtectedStateSha256'] and backup.sha(backup.encode(before['ownedContentFiles'],sort=True))==value['freshPublicOwnedSha256'],'Complete current protected/public witness differs')
        archive.require(z.testzip() is None,'Paired witness CRC differs')
    archive.require(stamp['sha256']==value['witnessArchiveSha256'],'Invocation witness archive SHA differs')
    return before,dict(path=str(path),sha256=stamp['sha256'],bytes=stamp['bytes'],allSevenRawTablesAndPublicProtectedMapsVerified=True,pairedCompleteStateExact=True)


def signed_record(payload,manifest,key):
    raw=backup.encode(payload,sort=True)
    archive.require(len(raw)<=16384,'Bounded signed termination closure required')
    meta=dict(name='closed.json',transactionId=manifest['transactionId'],rootBinding=manifest['rootBinding'],bytes=len(raw),sha256=backup.sha(raw))
    meta['mac']=hmac.new(key.encode(),backup.encode(meta),digestmod='sha256').hexdigest()
    blob=b'KTK-PRIVATE-1\n'+backup.encode(meta)+b'\n'+raw
    archive.require(backup.record_payload(blob,'closed.json',manifest,key)==raw,'Termination closure signature differs')
    return blob


def closure_blob(fence,old,manifest,inspection,original_closed=None):
    authority.validate_original_binding(fence,old)
    archive.require(fence['operation']=='fence' and inspection['stateSha256']==fence['inspectionStateSha256'] and inspection['freshWitnessProtectedStateSha256']==fence['freshProtectedStateSha256'],'Exact initial fence/census witness required')
    archive.require(inspection['originalRolledBackClosurePresent'] is (original_closed is not None),'Preserve exactly the accepted original closure')
    if original_closed is not None:
        payload=backup.decode(backup.record_payload(original_closed,'closed.json',manifest,old['ownershipKey']))
        archive.require(payload.get('terminalPhase')=='rolled-back' and payload.get('payloadRetained') is True,'Original rolled-back closure required')
        return original_closed
    payload=dict(schemaVersion=1,scope='private-engine-abandoned-with-fresh-guard',transactionId=old['transactionId'],applicationCommit=old['applicationCommit'],planSha256=full.binding(old['plan'])['planSha256'],rootBinding=manifest['rootBinding'],originalManifestSha256=manifest['manifestSha256'],originalArchiveSha256=fence['originalArchiveSha256'],metadataArchiveSha256=fence['metadataArchiveSha256'],inspectionStateSha256=fence['inspectionStateSha256'],fenceOperationId=fence['operationId'],freshProtectedStateSha256=fence['freshProtectedStateSha256'],witnessArchiveSha256=fence['witnessArchiveSha256'],terminalPhase='abandoned',observedEnginePhase=inspection['phase'],payloadRetained=True,applicationWrites=0,databaseWrites=0,cachePurges=0,productionOperations=0)
    return signed_record(payload,manifest,old['ownershipKey'])


def validate_archives(value,old,source_root,original_path,witness_path,metadata_path=None,rollback_path=None,predecessor=None,fence_packet=None,now=None):
    authority.validate_packet(value,time.time() if now is None else now)
    authority.validate_original_binding(value,old)
    c=original_context(old);manifest,original_receipt,original_blobs=archive.originals(original_path,c)
    archive.require(original_receipt['sha256']==value['originalArchiveSha256'] and manifest['manifestSha256']==value['originalManifestSha256'],'Pinned original signed capsule differs')
    original=full.validate_records(original_blobs,manifest,old['plan'],old['ownershipKey'],old['helperSha256'])
    fresh,witness_receipt=fresh_witness(witness_path,value)
    archive.require(fresh['identity']==original['identity'],'Original staging identity differs; preserve for review')
    result=dict(scope='read-only-private-termination-archive-bindings',operation=value['operation'],operationId=value['operationId'],originalArchive=original_receipt,witnessArchive=witness_receipt,originalProtectedStateStillExact=fresh['protectedStateSha256']==old['plan']['protectedStateSha256'],executionAuthorityGranted=False,hostingOperations=0)
    if value['operation']=='inspect':
        archive.require(metadata_path is None and rollback_path is None and predecessor is None and fence_packet is None,'Inspection cannot carry mutation bindings')
        archive.require(fresh['protectedFiles']==original['protectedFiles'],'Initial protected application drift requires separate review')
        return dict(receipt=result,freshState=fresh,originalManifest=manifest)
    archive.require(predecessor is not None and metadata_path is not None,'Explicit predecessor and independently retained metadata required')
    authority.validate_predecessor(value,predecessor,old)
    fence=value if value['operation']=='fence' else fence_packet
    archive.require(isinstance(fence,dict),'Immutable initial fence context required')
    authority.validate_original_binding(fence,old)
    archive.require(fence['operation']=='fence' and fence['operationId']==value['fenceOperationId'],'Exact initial fence context required')
    for n in ('transactionId','applicationCommit','originalArchiveSha256','originalManifestSha256','metadataArchiveSha256','metadataArchiveName','inspectionStateSha256','closureSha256','fenceOperationId'):
        archive.require(fence[n]==value[n],'Initial fence binding changed')
    archive.require(fence['metadataArchiveName']=='ktk-private-engine-termination-metadata-'+fence['predecessorOperationId']+'.zip','Initial inspection archive identity differs')
    path=Path(metadata_path);archive.require(path.name==value['metadataArchiveName'],'Exact retained metadata archive name required')
    metadata_receipt=archive.verify_archive(path,c,source_root,original_path,rollback_path,value['inspectionStateSha256'])
    archive.require(metadata_receipt['sha256']==value['metadataArchiveSha256'],'Pinned metadata archive SHA differs')
    with archive.held_archive(path,archive.MAX_METADATA+2*archive.MAX_INSPECTION) as (z,stamp):
        inspection=backup.decode(z.read('inspection.json'));metadata_manifest=backup.decode(z.read('manifest.json'))
        original_closed=z.read('metadata/control/closed.json') if inspection['originalRolledBackClosurePresent'] else None
    archive.require(stamp['sha256']==metadata_receipt['sha256'] and metadata_manifest['freshProtectedStateSha256']==fence['freshProtectedStateSha256'],'Metadata/fence current witness differs')
    closure=closure_blob(fence,old,manifest,inspection,original_closed)
    archive.require(backup.sha(closure)==value['closureSha256'],'Pinned signed closure differs')
    if value['operation']=='fence':archive.require(fresh['protectedFiles']==original['protectedFiles'],'Initial protected application drift requires separate review')
    metadata,payload=archive.validate_inspection(inspection,c,source_root)
    result.update(metadataArchive=metadata_receipt,signedClosureSha256=backup.sha(closure),retainedMetadataFiles=len(metadata),payloadFiles=len(payload),freshWitnessIsInitialFenceWitness=value['freshProtectedStateSha256']==fence['freshProtectedStateSha256'])
    return dict(receipt=result,freshState=fresh,originalManifest=manifest,inspection=inspection,retained=metadata,payload=payload,closureBlob=closure)
