"""Compile private seed helpers and independently verify original capsules. No connection, credentials or production mode."""
from __future__ import annotations
import base64,importlib.util,os,re,time,zipfile
from pathlib import Path,PurePosixPath
from tools import content_update_backup as backup
from tools import content_update_staging_packet as legacy
from tools import full_inventory_capacity as capacity

ROOT=Path(__file__).resolve().parents[1]
TEMPLATE=ROOT/'tools/full-private-seed-staging-template.php'
COMPONENTS={'STATE':'staging-protected-state-core.php','STORE':'content-update-private-store.php','STREAM':'content-update-streaming-seeds.php','CONTROLLER':'full-private-seed-rehearsal.php'}
SPEC=importlib.util.spec_from_file_location('ktk_full_seed_snapshot_validation',ROOT/'tools/snapshot-staging-update-state.py');snapshot=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(snapshot)

def plan(transaction,commit,owned,sizes,protected_sha):
    owned,sizes=capacity.inventory(owned,sizes)
    required={'ktk-code-pages.php','ktk-code-pages-assets/registry.php','ktk-code-pages-assets/runtime.css','ktk-code-pages-assets/runtime.js'}
    bodies=sorted(n for n in owned if n.startswith('ktk-code-pages-assets/content/') and n.endswith('.html'))
    if not backup.identifier(transaction,32) or not backup.identifier(commit,40) or not backup.digest(protected_sha) or not required<=set(owned) or not bodies:
        raise ValueError('Complete full private seed release binding required')
    overrides={n:('/* Isolated full-size prior fixture: '+n+'; never executed */\n').encode() for n in sorted(required)}
    overrides[bodies[0]]=b'<p>Isolated prior fixture only; never served.</p>\n'
    overrides[backup.ACTIVATION]=legacy.seeds()['target'][backup.ACTIVATION]
    prior={**owned,**{n:backup.sha(b) for n,b in overrides.items()}}
    value={'transactionId':transaction,'applicationCommit':commit,'protectedStateSha256':protected_sha,'expected':owned,'prior':prior}
    return value,sizes,{n:base64.b64encode(b).decode() for n,b in overrides.items()}

def helper_source(name,token,expires,commit,owned,sizes,protected_sha,key,interrupt_original=False):
    match=re.fullmatch(r'ktk-transaction-rehearsal-([a-f0-9]{32})\.php',name) if isinstance(name,str) else None
    if match is None or not isinstance(token,str) or not re.fullmatch(r'[A-Za-z0-9_-]{43}',token) or type(expires) is not int or not int(time.time())<expires<=int(time.time())+3600 or not backup.digest(key) or type(interrupt_original) is not bool:
        raise ValueError('Exact expiring private-only full seed helper required')
    value,sizes,overrides=plan(match[1],commit,owned,sizes,protected_sha)
    packet={'expires':expires,'ownershipKey':key,'plan':value,'priorOverrides':overrides,'sizes':sizes,'tokenSha256':backup.sha(token.encode())}
    fault=sorted(sizes,key=lambda n:(-sizes[n],n))[0] if interrupt_original else ''
    replacements={'EXPIRES':str(expires).encode(),'TOKEN_SHA':backup.sha(token.encode()).encode(),'HELPER':name.encode(),'PACKET':base64.b64encode(backup.encode(packet)),'FAULT_PATH':fault.encode()}
    source=TEMPLATE.read_bytes()
    for key,data in replacements.items():
        marker=('__KTK_FULL_SEED_'+key+'__').encode()
        if source.count(marker)!=1:raise ValueError('Exact full seed compiler marker required')
        source=source.replace(marker,data)
    for part,name in COMPONENTS.items():
        body=(ROOT/'tools'/name).read_bytes();marker=('/* __KTK_FULL_SEED_'+part+'__ */').encode()
        if source.count(marker)!=1 or not body.startswith(b'<?php\n') or part=='STATE' and backup.sha(body)!=capacity.CORE_SHA:
            raise ValueError('Exact reviewed full seed component required')
        source=source.replace(marker,body[len(b'<?php\n'):])
    if b'__KTK_FULL_SEED_' in source:raise ValueError('Unresolved full seed compiler marker')
    return source

def binding(value):
    return {'transactionId':value['transactionId'],'applicationCommit':value['applicationCommit'],'planSha256':backup.sha(backup.encode(value,sort=True))}

def validate_manifest(m,value):
    fields={'schemaVersion','scope','transactionId','applicationCommit','planSha256','rootBinding','protectedStateSha256','members','bytes','manifestSha256'}
    if not isinstance(m,dict) or set(m)!=fields or type(m['schemaVersion']) is not int or m['schemaVersion']!=1 or m['scope']!='full-private-seeds-original-capsule' or any(m[k]!=v for k,v in binding(value).items()) or m['protectedStateSha256']!=value['protectedStateSha256'] or not backup.digest(m['rootBinding']) or not backup.digest(m['manifestSha256']) or backup.sha(backup.encode({k:v for k,v in m.items() if k!='manifestSha256'},sort=True))!=m['manifestSha256']:
        raise ValueError('Exact original capsule manifest and release binding required')
    members=m['members'];names={'original-state.json':16779264,'controller-plan.json':1050624}
    if not isinstance(members,dict) or set(members)!=set(names):raise ValueError('Exactly two signed original capsule records required')
    for name,limit in names.items():
        row=members[name]
        if not isinstance(row,dict) or set(row)!={'source','sha256','bytes','payloadSha256'} or row['source']!='control/'+name or not backup.digest(row['sha256']) or not backup.digest(row['payloadSha256']) or type(row['bytes']) is not int or not 1<=row['bytes']<=limit:
            raise ValueError('Exact bounded original capsule record descriptor required')
    if type(m['bytes']) is not int or m['bytes']!=sum(r['bytes'] for r in members.values()):raise ValueError('Original capsule byte count differs')
    return m

def validate_records(payloads,m,value,key,helper_sha):
    validate_manifest(m,value)
    if not backup.digest(key) or not backup.digest(helper_sha) or not isinstance(payloads,dict) or set(payloads)!=set(m['members']):raise ValueError('Exact original capsule reader/key context required')
    raw={}
    for name,row in m['members'].items():
        data=payloads[name]
        if not isinstance(data,bytes) or len(data)!=row['bytes'] or backup.sha(data)!=row['sha256']:raise ValueError('Original capsule record bytes differ')
        body=backup.record_payload(data,name,m,key)
        if backup.sha(body)!=row['payloadSha256']:raise ValueError('Original capsule payload fingerprint differs')
        raw[name]=body
    original=backup.decode(raw['original-state.json']);snapshot.validate_snapshot(original,helper_sha)
    control=backup.decode(raw['controller-plan.json'])
    expected={'schemaVersion':1,'mode':'private-staging-rehearsal','transactionId':value['transactionId'],'applicationCommit':value['applicationCommit'],'originalStateSha256':backup.sha(raw['original-state.json']),'enginePlan':value}
    if original['protectedStateSha256']!=value['protectedStateSha256'] or original['ownedContentFiles']!=value['expected'] or control!=expected:
        raise ValueError('Complete original selected state or immutable plan differs')
    return original

def verify_archive(path,value,key,helper_sha,expected_manifest=None):
    path=Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size>33554432:raise ValueError('Exact bounded private original capsule archive required')
    before=path.stat()
    with path.open('rb') as stream:
        held=os.fstat(stream.fileno())
        cross=('st_dev','st_ino','st_size','st_mtime_ns')
        if any(getattr(held,k)!=getattr(before,k) for k in cross):raise ValueError('Original capsule file identity changed')
        with zipfile.ZipFile(stream) as z:
            if len(z.infolist())!=3 or set(z.namelist())!={'original-state.json','controller-plan.json','manifest.json'} or any(z.getinfo(n).file_size>limit for n,limit in [('manifest.json',65536),('original-state.json',16779264),('controller-plan.json',1050624)]):raise ValueError('Original capsule ZIP membership/budget differs')
            m=validate_manifest(backup.decode(z.read('manifest.json')),value)
            if expected_manifest is not None and m!=expected_manifest:raise ValueError('Original capsule manifest changed')
            for name,row in m['members'].items():
                if z.getinfo(name).file_size!=row['bytes']:raise ValueError('Original capsule member budget differs')
            if z.testzip() is not None:raise ValueError('Original capsule ZIP CRC differs')
            original=validate_records({n:z.read(n) for n in m['members']},m,value,key,helper_sha)
        stream.seek(0);digest=__import__('hashlib').file_digest(stream,'sha256').hexdigest();after=path.lstat();final=os.fstat(stream.fileno())
        keys=('st_dev','st_ino','st_size','st_mtime_ns','st_ctime_ns')
        if path.is_symlink() or any(getattr(before,k)!=getattr(after,k) or getattr(held,k)!=getattr(final,k) for k in keys) or any(getattr(after,k)!=getattr(final,k) for k in cross):raise ValueError('Original capsule changed during verification')
    return {'scope':'independently-verified-original-capsule','path':str(path),'sha256':digest,'bytes':before.st_size,'entries':3,'zipCRC':True,'manifestSha256':m['manifestSha256'],'originalPayloadSha256':m['members']['original-state.json']['payloadSha256'],'protectedStateSha256':original['protectedStateSha256'],'rowCounts':original['rowCounts'],'allSelectedStateAndPlanVerified':True}

def build_archive(m,reader,value,key,helper_sha,destination):
    validate_manifest(m,value);destination=Path(destination)
    if destination.exists() or destination.is_symlink() or destination.parent.resolve()!=ROOT/'deploy-backups':raise ValueError('Fresh private deployment-backup archive path required')
    data={n:reader(row['source']) for n,row in m['members'].items()};validate_records(data,m,value,key,helper_sha)
    with zipfile.ZipFile(destination,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for name,body in data.items():z.writestr(name,body)
        z.writestr('manifest.json',backup.encode(m))
    return verify_archive(destination,value,key,helper_sha,m)

def expected_seed_files(value,sizes,overrides):
    result={};directories=set()
    for folder,kind in [('source','expected'),('target','prior')]:
        for name,digest in value[kind].items():
            length=len(base64.b64decode(overrides[name],validate=True)) if folder=='target' and name in overrides else sizes[name]
            path=folder+'/'+name;result[path]={'sha256':digest,'bytes':length}
            directories.update(p.as_posix() for p in PurePosixPath(path).parents if p.as_posix()!='.')
    return dict(sorted(result.items())),sorted(directories)

def seed_digest(root_binding,value,files,directories):
    return backup.sha(backup.encode({'rootBinding':root_binding,'planSha256':binding(value)['planSha256'],'profile':'full-private-host','files':files,'directories':directories},sort=True))
