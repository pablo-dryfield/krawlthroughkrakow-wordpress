"""Local current-metadata archive for a native private-engine census.

No connector, execution authority, fence, deletion, public or database writer.
The authenticated native inspector owns engine phase/binding validation. This
component preserves its exact census and verifies original records and archives;
a future fence must independently repeat that census under the same fresh witness.
"""
from pathlib import Path, PurePosixPath
from contextlib import contextmanager
import hashlib
import json
import os
import re
import zipfile

from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools.full_private_seed_transport import prefix_digest

SCOPE = 'private-engine-termination-metadata-archive'
MAX_INSPECTION = 2097152
MAX_METADATA = 134217728
PHASES = {'seeding','engine-lock-only','unprepared','prepared','applying','uncertain','applied','rolling-back','rolled-back'}
CONTEXT = {'plan','sizes','overrides','ownershipKey','originalHelperSha256'}
FIELDS = {'schemaVersion','scope','transactionId','applicationCommit','rootBinding','originalManifestSha256','freshWitnessProtectedStateSha256','originalProtectedStateStillExact','freshWitnessVerified','privatePlanGuardMeaning','phase','seed','engine','files','directories','control','originalRollbackAcknowledged','originalRolledBackClosurePresent','readOnly','closureWrites','payloadWrites','applicationWrites','databaseWrites','cachePurges','productionOperations','validatedArtifacts','stateSha256'}
MANIFEST_FIELDS = {'schemaVersion','scope','transactionId','applicationCommit','rootBinding','originalManifestSha256','originalArchiveSha256','rollbackArchiveSha256','inspectionStateSha256','inspectionFileSha256','freshProtectedStateSha256','files','bytes','manifestSha256'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def mapping(value):
    if value == []:
        return {}
    require(isinstance(value,dict),'Exact census object required')
    return value


def name(value):
    require(isinstance(value,str) and re.fullmatch(r'[A-Za-z0-9._/-]+',value) is not None and not any(p in ('','.','..') for p in value.split('/')),'Safe relative census member required')
    return value


def context(value):
    require(isinstance(value,dict) and set(value)==CONTEXT and backup.digest(value['ownershipKey']) and backup.digest(value['originalHelperSha256']),'Exact original private archive context required')
    plan=value['plan']
    require(isinstance(plan,dict),'Original private plan required')
    expected,sizes,overrides=full.plan(plan['transactionId'],plan['applicationCommit'],plan['expected'],value['sizes'],plan['protectedStateSha256'])
    require(plan==expected and sizes==value['sizes'] and overrides==value['overrides'],'Deterministic original full private plan required')
    return value


def row(value):
    require(isinstance(value,dict) and set(value)=={'sha256','bytes'} and backup.digest(value['sha256']) and type(value['bytes']) is int and 0<=value['bytes']<=1073741824,'Exact bounded census descriptor required')
    return value


@contextmanager
def held_archive(path, limit):
    path=Path(path)
    require(path.is_absolute() and path.resolve()==path and not any(p.is_symlink() for p in (path,*path.parents)) and path.is_file() and path.stat().st_size<=limit,'Canonical bounded local archive required')
    before=path.stat();stamp={'bytes':before.st_size}
    require(before.st_nlink==1,'Hard-linked local archive preserved')
    with path.open('rb') as stream:
        held=os.fstat(stream.fileno())
        require(held.st_nlink==1,'Hard-linked held archive preserved')
        for field in ('st_dev','st_ino','st_size','st_mtime_ns'):require(getattr(before,field)==getattr(held,field),'Archive identity changed before read')
        with zipfile.ZipFile(stream) as archive:yield archive,stamp
        stream.seek(0);stamp['sha256']=hashlib.file_digest(stream,'sha256').hexdigest();final=os.fstat(stream.fileno());after=path.lstat()
        require(not path.is_symlink() and path.resolve()==path,'Archive path changed while reading')
        require(after.st_nlink==final.st_nlink==1,'Archive link identity changed')
        # Windows path/handle ctime use different native semantics. Preserve
        # both independently, and compare dev/inode/size/mtime across them.
        for field in ('st_dev','st_ino','st_size','st_mtime_ns','st_ctime_ns'):require(getattr(before,field)==getattr(after,field) and getattr(held,field)==getattr(final,field),'Archive metadata changed while reading')
        for field in ('st_dev','st_ino','st_size','st_mtime_ns'):require(getattr(after,field)==getattr(final,field),'Held archive identity differs')


def validate_inspection(value, original_context, source_root):
    c=context(original_context);plan=c['plan']
    require(isinstance(value,dict) and set(value)==FIELDS and type(value['schemaVersion']) is int and value['schemaVersion']==1 and value['scope']=='private-engine-abandonment-readonly-inspection','Exact native read-only census required')
    for field in ('rootBinding','originalManifestSha256','freshWitnessProtectedStateSha256','stateSha256'):
        require(backup.digest(value[field]),'Exact census digest required')
    require(value['transactionId']==plan['transactionId'] and value['applicationCommit']==plan['applicationCommit'] and value['phase'] in PHASES,'Original census identity/phase differs')
    require(value['readOnly'] is True and value['freshWitnessVerified'] is True and value['originalProtectedStateStillExact'] is (value['freshWitnessProtectedStateSha256']==plan['protectedStateSha256']),'Fresh witness and original equality must remain separate')
    require(value['privatePlanGuardMeaning']=='original private-plan compatibility after an independent complete fresh witness check','Explicit internal guard qualification required')
    for field in ('closureWrites','payloadWrites','applicationWrites','databaseWrites','cachePurges','productionOperations'):
        require(type(value[field]) is int and value[field]==0,'Read-only census cannot grant writes')
    unsigned={k:v for k,v in value.items() if k!='stateSha256'}
    require(backup.sha(backup.encode(unsigned,sort=True))==value['stateSha256'] and len(backup.encode(value,sort=True))<=MAX_INSPECTION,'Exact bounded native census checksum required')
    files=mapping(value['files']);controls=mapping(value['control']);artifacts=mapping(value['validatedArtifacts']);directories=value['directories']
    require(4<=len(files)<=20000 and len({n.casefold() for n in files if isinstance(n,str)})==len(files),'Complete unambiguous private census required')
    require(isinstance(directories,list) and all(isinstance(n,str) for n in directories) and directories==sorted(set(directories)) and len({n.casefold() for n in directories})==len(directories) and len(directories)<=20000,'Exact finite census directories required')
    for directory in directories:name(directory)
    require({'original-state.json','controller-plan.json'}<=set(controls)<= {'original-state.json','controller-plan.json','backup-ack.json','closed.json'} and all(backup.digest(h) for h in controls.values()),'Exact original/control inventory required')
    require(value['originalRollbackAcknowledged'] is ('backup-ack.json' in controls) and value['originalRolledBackClosurePresent'] is ('closed.json' in controls),'Signed control flags differ')
    engine='engine/'+plan['transactionId'];metadata={};payload={};global_locks=[]
    expected,allowed_dirs=full.expected_seed_files(plan,c['sizes'],c['overrides'])
    required={'ktk-code-pages-production.php':plan['prior']['ktk-code-pages-production.php'],'ktk-code-pages.php':plan['prior']['ktk-code-pages.php'],'ktk-code-pages-assets/registry.php':plan['prior']['ktk-code-pages-assets/registry.php']}
    required.update({n:h for n,h in plan['prior'].items() if n in plan['expected'] and h!=plan['expected'][n]})
    known_dirs=set(allowed_dirs)|{'control','engine',engine,engine+'/prior',engine+'/receipts',engine+'/pending'}
    for logical in required:
        known_dirs.update(p.as_posix() for p in PurePosixPath(engine+'/prior/'+logical).parents if p.as_posix()!='.')
    require(set(directories)<=known_dirs,'Unknown private directory preserved')
    for key,descriptor in files.items():
        name(key);row(descriptor)
        require(all(p.as_posix() in directories for p in PurePosixPath(key).parents if p.as_posix()!='.'),'Census parent missing')
        if key in ('owner.marker','controller.lock'):
            require(descriptor=={'sha256':backup.sha(value['rootBinding'].encode()),'bytes':64},'Exact retained ownership bytes required');metadata[key]=descriptor
        elif key.startswith('control/'):
            logical=key[8:];require(logical in controls and controls[logical]==descriptor['sha256'] and descriptor['bytes']<=16779264,'Unknown or oversized control record preserved');metadata[key]=descriptor
        elif key.startswith(('source/','target/')):
            require(key in expected,'Unknown payload path preserved')
            original=expected[key];logical=key.split('/',1)[1]
            if value['phase'] in ('seeding','engine-lock-only'):
                require(descriptor['bytes']<=original['bytes'] and (descriptor['sha256']==original['sha256'] if descriptor['bytes']==original['bytes'] else prefix_digest(key,descriptor['bytes'],source_root,c['overrides'])==descriptor['sha256']),'Exact original seed prefix required')
            else:
                options=[original]
                if key.startswith('target/') and logical in plan['expected']:options.append({'sha256':plan['expected'][logical],'bytes':c['sizes'][logical]})
                require(descriptor in options,'Unknown target/source bytes preserved')
            payload[key]=descriptor
        elif re.fullmatch(r'engine/target-[a-f0-9]{64}\.lock',key):
            require(descriptor=={'sha256':backup.sha(b''),'bytes':0},'Existing empty engine lock required');global_locks.append(key);metadata[key]=descriptor
        elif key in (engine+'/plan.json',engine+'/journal.json'):
            require(descriptor['bytes']<=16777216,'Bounded current engine record required');metadata[key]=descriptor
        elif key.startswith(engine+'/prior/'):
            logical=key[len(engine+'/prior/'):];require(logical in required and descriptor['bytes']<=16777216,'Unknown backup member preserved')
            full_size=expected['target/'+logical]['bytes'];require(descriptor['bytes']<=full_size and (descriptor['sha256']==required[logical] if descriptor['bytes']==full_size else value['phase']=='unprepared' and prefix_digest('target/'+logical,descriptor['bytes'],source_root,c['overrides'])==descriptor['sha256']),'Changed backup prefix preserved');metadata[key]=descriptor
        elif re.fullmatch(re.escape(engine)+r'/receipts/\.ktk-receipt-(plan|journal)-[a-f0-9]{32}',key):
            require(descriptor['bytes']<=16777216 and (key in artifacts or value['phase']=='unprepared' and key[len(engine)+1:] in mapping(value['engine']['files'])),'Unvalidated receipt preserved');metadata[key]=descriptor
        elif re.fullmatch(re.escape(engine)+r'/pending/\.ktk-content-[a-f0-9]{32}',key):
            proof=artifacts.get(key);require(isinstance(proof,dict) and proof.get('kind')=='known-content-prefix' and isinstance(proof.get('possibleBindings'),list) and proof['possibleBindings'],'Unvalidated content temporary preserved')
            matches=[]
            for binding in proof['possibleBindings']:
                require(isinstance(binding,str) and ':' in binding,'Known prefix binding required');kind,logical=binding.split(':',1);require(kind in ('candidate','prior') and logical in plan['expected'],'Known prefix source required');folder='source' if kind=='candidate' else 'target';spec=expected[folder+'/'+logical]
                if descriptor['bytes']<=spec['bytes'] and prefix_digest(folder+'/'+logical,descriptor['bytes'],source_root,c['overrides'])==descriptor['sha256']:matches.append(binding)
            require(matches,'Changed content temporary prefix preserved');payload[key]=descriptor
        else:raise ValueError('Unknown private census member preserved')
    require({'owner.marker','controller.lock'}<=set(metadata) and len(global_locks)<=1 and set(artifacts)<=set(files),'Complete retained ownership/artifact census required')
    require(sum(r['bytes'] for r in files.values())<=2*sum(c['sizes'].values())+MAX_METADATA and sum(r['bytes'] for r in metadata.values())<=MAX_METADATA,'Bounded metadata census required')
    if value['phase'] not in ('seeding','engine-lock-only'):
        require(len(global_locks)==1 and isinstance(value['engine'],dict) and value['engine'].get('phase')==value['phase'] and 'protectedStateVerified' not in value['engine'],'Qualified existing engine inspection required')
        require({n for n in files if n.startswith('source/')}=={n for n in expected if n.startswith('source/')} and {n for n in files if n.startswith('target/')}=={n for n in expected if n.startswith('target/')},'Complete active private seeds required')
    return dict(sorted(metadata.items())),dict(sorted(payload.items()))


def originals(path, original_context):
    c=context(original_context)
    with held_archive(path,33554432) as (archive,stamp):
        names=archive.namelist();require(len(names)==3 and set(names)=={'manifest.json','original-state.json','controller-plan.json'},'Exact original capsule membership required')
        for n,limit in [('manifest.json',65536),('original-state.json',16779264),('controller-plan.json',1050624)]:require(not archive.getinfo(n).flag_bits&1 and archive.getinfo(n).file_size<=limit,'Bounded original capsule member required')
        manifest=backup.decode(archive.read('manifest.json'));blobs={n:archive.read(n) for n in ('original-state.json','controller-plan.json')}
    receipt=full.verify_archive(path,c['plan'],c['ownershipKey'],c['originalHelperSha256'],manifest)
    full.validate_records(blobs,manifest,c['plan'],c['ownershipKey'],c['originalHelperSha256'])
    require(receipt['sha256']==stamp['sha256'],'Original archive changed between independent reads')
    return manifest,receipt,blobs


def rollback_receipt(path, key):
    with held_archive(path,MAX_METADATA) as (archive,stamp):
        require(archive.getinfo('backup-manifest.json').file_size<=MAX_INSPECTION,'Bounded rollback manifest required')
        manifest=backup.decode(archive.read('backup-manifest.json'))
        receipt=backup.verify_archive(path,key,manifest)
    require(receipt['archiveSha256']==stamp['sha256'],'Rollback archive changed between independent reads')
    return receipt


def verify_archive(path, original_context, source_root, original_archive, rollback_archive=None, expected_state_sha256=None):
    c=context(original_context);path=Path(path)
    require(path.is_file() and not path.is_symlink() and path.stat().st_size<=MAX_METADATA+2*MAX_INSPECTION,'Bounded metadata archive required')
    original_manifest,original_receipt,original_blobs=originals(original_archive,c)
    with held_archive(path,MAX_METADATA+2*MAX_INSPECTION) as (archive,stamp):
        infos=archive.infolist();names=[i.filename for i in infos]
        require(len(names)<=20002 and len(names)==len(set(names))==len({n.casefold() for n in names}) and {'manifest.json','inspection.json'}<=set(names),'Unambiguous metadata archive required')
        require(all(not i.is_dir() and not i.flag_bits&1 for i in infos) and sum(i.file_size for i in infos)<=MAX_METADATA+2*MAX_INSPECTION,'Bounded exact archive members required')
        require(archive.getinfo('manifest.json').file_size<=MAX_INSPECTION and archive.getinfo('inspection.json').file_size<=MAX_INSPECTION,'Bounded census/manifest required')
        manifest=backup.decode(archive.read('manifest.json'));inspection=backup.decode(archive.read('inspection.json'));metadata,payload=validate_inspection(inspection,c,source_root)
        require(isinstance(manifest,dict) and set(manifest)==MANIFEST_FIELDS and manifest['schemaVersion']==1 and type(manifest['schemaVersion']) is int and manifest['scope']==SCOPE,'Exact metadata archive manifest required')
        expected={'schemaVersion':1,'scope':SCOPE,'transactionId':c['plan']['transactionId'],'applicationCommit':c['plan']['applicationCommit'],'rootBinding':inspection['rootBinding'],'originalManifestSha256':original_manifest['manifestSha256'],'originalArchiveSha256':original_receipt['sha256'],'rollbackArchiveSha256':None,'inspectionStateSha256':inspection['stateSha256'],'inspectionFileSha256':backup.sha(archive.read('inspection.json')),'freshProtectedStateSha256':inspection['freshWitnessProtectedStateSha256'],'files':metadata,'bytes':sum(r['bytes'] for r in metadata.values())}
        require(inspection['rootBinding']==original_manifest['rootBinding'] and inspection['originalManifestSha256']==original_manifest['manifestSha256'],'Original capsule/census binding differs')
        require(set(names)=={'manifest.json','inspection.json',*('metadata/'+n for n in metadata)},'Unknown or missing metadata archive members')
        blobs={}
        for member,descriptor in metadata.items():
            info=archive.getinfo('metadata/'+member);require(info.file_size==descriptor['bytes'],'Metadata member size differs');data=archive.read(info);require(backup.sha(data)==descriptor['sha256'],'Metadata member hash differs');blobs[member]=data
        for logical,data in original_blobs.items():require(blobs['control/'+logical]==data,'Original signed record changed')
        if inspection['originalRollbackAcknowledged']:
            require(rollback_archive is not None,'Acknowledged rollback archive must be independently retained')
            rollback=rollback_receipt(rollback_archive,c['ownershipKey']);require(rollback['transactionId']==c['plan']['transactionId'] and rollback['applicationCommit']==c['plan']['applicationCommit'] and rollback['mode']=='private-staging-rehearsal','Original rollback archive binding differs')
            ack=backup.decode(backup.record_payload(blobs['control/backup-ack.json'],'backup-ack.json',original_manifest,c['ownershipKey']))
            require(ack['archiveSha256']==rollback['archiveSha256'] and ack['exportSha256']==rollback['manifestSha256'] and ack['planSha256']==full.binding(c['plan'])['planSha256'],'Signed archive acknowledgment differs')
            expected['rollbackArchiveSha256']=rollback['archiveSha256']
        else:require(rollback_archive is None,'Only an acknowledged rollback archive belongs in this manifest')
        if inspection['originalRolledBackClosurePresent']:
            closure=backup.decode(backup.record_payload(blobs['control/closed.json'],'closed.json',original_manifest,c['ownershipKey']))
            require(closure['terminalPhase']=='rolled-back' and closure['payloadRetained'] is True and closure['archiveSha256']==expected['rollbackArchiveSha256'],'Original signed closure differs')
        expected['manifestSha256']=backup.sha(backup.encode(expected,sort=True));require(manifest==expected,'Metadata archive manifest differs')
        if expected_state_sha256 is not None:require(backup.digest(expected_state_sha256) and inspection['stateSha256']==expected_state_sha256,'Archived native census differs')
        require(archive.testzip() is None,'Metadata archive CRC differs')
    return {'scope':SCOPE,'path':str(path),'sha256':stamp['sha256'],'bytes':stamp['bytes'],'manifestSha256':manifest['manifestSha256'],'inspectionStateSha256':inspection['stateSha256'],'originalArchiveSha256':original_receipt['sha256'],'rollbackArchiveSha256':manifest['rollbackArchiveSha256'],'metadataFiles':len(metadata),'payloadFiles':len(payload),'allMemberHashesSignaturesAndCRCVerified':True,'executionAuthorityGranted':False,'hostingOperations':0}


def build_archive(destination, inspection, original_context, source_root, reader, original_archive, rollback_archive=None):
    c=context(original_context);metadata,_=validate_inspection(inspection,c,source_root);original_manifest,original_receipt,_=originals(original_archive,c)
    require(inspection['originalManifestSha256']==original_manifest['manifestSha256'] and inspection['rootBinding']==original_manifest['rootBinding'],'Original capsule/census binding differs')
    require(inspection['originalRollbackAcknowledged'] is (rollback_archive is not None),'Exact acknowledged rollback archive presence required')
    rollback=rollback_receipt(rollback_archive,c['ownershipKey']) if rollback_archive is not None else None
    blobs={}
    for member,descriptor in metadata.items():
        data=reader(member);require(isinstance(data,bytes) and len(data)==descriptor['bytes'] and backup.sha(data)==descriptor['sha256'],'Current metadata changed before archival');blobs[member]=data
    raw=backup.encode(inspection,sort=True)
    manifest={'schemaVersion':1,'scope':SCOPE,'transactionId':c['plan']['transactionId'],'applicationCommit':c['plan']['applicationCommit'],'rootBinding':inspection['rootBinding'],'originalManifestSha256':original_manifest['manifestSha256'],'originalArchiveSha256':original_receipt['sha256'],'rollbackArchiveSha256':rollback['archiveSha256'] if rollback else None,'inspectionStateSha256':inspection['stateSha256'],'inspectionFileSha256':backup.sha(raw),'freshProtectedStateSha256':inspection['freshWitnessProtectedStateSha256'],'files':metadata,'bytes':sum(r['bytes'] for r in metadata.values())};manifest['manifestSha256']=backup.sha(backup.encode(manifest,sort=True))
    path=backup.safe_output(destination)
    with zipfile.ZipFile(path,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        archive.writestr('inspection.json',raw)
        for member,data in blobs.items():archive.writestr('metadata/'+member,data)
        archive.writestr('manifest.json',backup.encode(manifest,sort=True))
    return verify_archive(path,c,source_root,original_archive,rollback_archive,inspection['stateSha256'])
