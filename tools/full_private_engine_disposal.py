"""Compile exact archived full-private disposal authority; no connection, deletion or default fallback."""
from __future__ import annotations
import base64,hashlib,hmac,json,re,time,zipfile
from pathlib import PurePosixPath
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools import full_private_engine_recovery as recovery
from tools import early_private_entry as early
from tools import hosted_runtime_bounds as bounds

SCOPE='archived-rolled-back-full-private-disposal'
PROFILE='full-private-engine-disposal-v1'

def metadata_names(transaction,public_root):
    if not backup.identifier(transaction,32) or not isinstance(public_root,str) or (not public_root.startswith('/') and not re.fullmatch('[A-Za-z]:/.*',public_root)) or public_root.endswith('/') or str(PurePosixPath(public_root))!=public_root or PurePosixPath(public_root).name!='public_html' or any(p in ('.','..') for p in public_root.split('/')):raise ValueError('Exact canonical server public root required')
    root=str(PurePosixPath(public_root).parent/('.ktk-content-update-'+transaction))
    return root,('owner.marker','controller.lock','control/closed.json','control/backup-ack.json','engine/'+transaction+'/plan.json','engine/'+transaction+'/journal.json','engine/target-'+backup.sha((root+'/target').encode())+'.lock')

def validate_authority(a,public_root):
    fields={'schemaVersion','scope','transactionId','applicationCommit','plan','originalManifestSha256','originalArchiveSha256','rollbackManifestSha256','rollbackArchiveSha256','payload','retained','authoritySha256'}
    if not isinstance(a,dict) or set(a)!=fields or type(a['schemaVersion']) is not int or a['schemaVersion']!=1 or a['scope']!=SCOPE or not backup.identifier(a['transactionId'],32) or not backup.identifier(a['applicationCommit'],40) or any(not backup.digest(a[k]) for k in ('originalManifestSha256','originalArchiveSha256','rollbackManifestSha256','rollbackArchiveSha256','authoritySha256')) or backup.sha(backup.encode({k:v for k,v in a.items() if k!='authoritySha256'},sort=True))!=a['authoritySha256']:raise ValueError('Exact canonical archived disposal authority required')
    plan=a['plan'];payload=a['payload'];retained=a['retained'];_,names=metadata_names(a['transactionId'],public_root)
    if not isinstance(plan,dict) or not isinstance(payload,dict) or not isinstance(retained,dict) or set(retained)!=set(names) or len(payload)>20000:raise ValueError('Exact complete private payload and seven retained members required')
    for n,row in {**payload,**retained}.items():
        if not isinstance(n,str) or not isinstance(row,dict) or set(row)!={'sha256','bytes'} or not backup.digest(row['sha256']) or type(row['bytes']) is not int or not 0<=row['bytes']<=1073741824:raise ValueError('Exact bounded private disposal row required')
    if set(payload)&set(retained) or retained[names[-1]]!={'sha256':backup.sha(b''),'bytes':0}:raise ValueError('Separate payload and empty exact target lock required')
    if not isinstance(plan.get('expected'),dict) or not backup.digest(plan.get('protectedStateSha256')):raise ValueError('Exact complete archived engine plan required')
    sizes={n:payload['source/'+n]['bytes'] for n in plan['expected'] if 'source/'+n in payload}
    reference,_,overrides=full.plan(a['transactionId'],a['applicationCommit'],plan['expected'],sizes,plan['protectedStateSha256'])
    if plan!=reference:raise ValueError('Deterministic complete private fixture plan required')
    expected,_=full.expected_seed_files(plan,sizes,overrides);ep='engine/'+a['transactionId']+'/prior/'
    for n,h in plan['prior'].items():
        if h!=plan['expected'].get(n):expected[ep+n]={'sha256':h,'bytes':len(base64.b64decode(overrides[n],validate=True))}
    controls={'control/original-state.json':16779264,'control/controller-plan.json':1050624}
    if set(payload)!=set(expected)|set(controls) or any(payload[n]!=row for n,row in expected.items()) or any(not 1<=payload[n]['bytes']<=limit for n,limit in controls.items()):raise ValueError('Exact full seeds, changed priors and two archived originals required')
    return a

def authority(packet,original_path,original_manifest,rollback_path,rollback_manifest,reader,public_root):
    recovery.validate_packet(packet);plan=packet['plan'];tx=packet['transactionId'];key=packet['ownershipKey'];binding=full.binding(plan)
    full.validate_manifest(original_manifest,plan);original=full.verify_archive(original_path,plan,key,packet['helperSha256'],original_manifest);rollback=backup.verify_archive(rollback_path,key,rollback_manifest)
    if rollback_manifest['mode']!='private-staging-rehearsal' or rollback_manifest['transactionId']!=tx or rollback_manifest['applicationCommit']!=packet['applicationCommit'] or rollback_manifest['enginePlanSha256']!=binding['planSha256'] or rollback_manifest['rootBinding']!=original_manifest['rootBinding']:raise ValueError('Exact independently reopened original and rollback context required')
    root,names=metadata_names(tx,public_root);owner=hmac.new(key.encode(),json.dumps({'publicRoot':public_root,'transactionId':tx,'privateRoot':root},ensure_ascii=True,separators=(',',':')).encode(),hashlib.sha256).hexdigest()
    if owner!=original_manifest['rootBinding']:raise ValueError('Archived private root does not match exact server root')
    rows={};blobs={}
    for n in names:
        body=reader(n)
        if not isinstance(body,bytes) or len(body)>1048576:raise ValueError('Bounded retained metadata bytes required')
        blobs[n]=body;rows[n]={'sha256':backup.sha(body),'bytes':len(body)}
    if blobs['owner.marker']!=owner.encode() or blobs['controller.lock']!=owner.encode() or blobs[names[-1]]!=b'':raise ValueError('Exact private root ownership and empty target lock required')
    common={'schemaVersion':1,'mode':'private-staging-rehearsal',**binding,'exportSha256':rollback_manifest['manifestSha256'],'archiveSha256':rollback['archiveSha256']}
    closed=backup.decode(backup.record_payload(blobs['control/closed.json'],'closed.json',rollback_manifest,key));ack=backup.decode(backup.record_payload(blobs['control/backup-ack.json'],'backup-ack.json',rollback_manifest,key))
    if not isinstance(closed,dict) or set(closed)!=set(common)|{'terminalPhase','stateSha256','payloadRetained'} or any(closed[k]!=v for k,v in common.items()) or closed['terminalPhase']!='rolled-back' or closed['payloadRetained'] is not True or not backup.digest(closed['stateSha256']):raise ValueError('Authenticated exact rolled-back closure required')
    if not isinstance(ack,dict) or set(ack)!=set(common)|{'acknowledgedStateSha256'} or any(ack[k]!=v for k,v in common.items()) or not backup.digest(ack['acknowledgedStateSha256']):raise ValueError('Authenticated exact rollback archive acknowledgment required')
    ep='engine/'+tx;stored_plan=backup.decode(blobs[ep+'/plan.json']);journal=backup.decode(blobs[ep+'/journal.json']);required={n:h for n,h in plan['prior'].items() if h!=plan['expected'].get(n)}
    # PHP engine bindings intentionally use escaped-slash JSON, unlike protocol JSON.
    engine_plan={**plan,'expected':dict(sorted(plan['expected'].items())),'prior':dict(sorted(plan['prior'].items()))}
    engine_binding=backup.sha(json.dumps([root+'/source',root+'/target',root+'/'+ep,engine_plan],ensure_ascii=True,separators=(',',':')).replace('/','\\/').encode())
    if stored_plan!=plan or not isinstance(journal,dict) or set(journal)!={'binding','phase','intents','backups','events'} or journal['binding']!=engine_binding or journal['phase']!='rolled-back' or journal['backups']!=required or not isinstance(journal['intents'],dict) or any(v is not True or n not in plan['expected'] or plan['expected'][n]==plan['prior'].get(n) for n,v in journal['intents'].items()) or not isinstance(journal['events'],list) or len(journal['events'])>5000 or any(not isinstance(v,str) or not 1<=len(v.encode())<=1024 for v in journal['events']):raise ValueError('Known terminal private engine metadata required')
    _,_,overrides=full.plan(tx,packet['applicationCommit'],packet['publicOwned'],packet['publicSizes'],plan['protectedStateSha256']);payload,_=full.expected_seed_files(plan,packet['publicSizes'],overrides)
    with zipfile.ZipFile(original_path) as original_zip,zipfile.ZipFile(rollback_path) as rollback_zip:
        for n,row in original_manifest['members'].items():
            member='records/'+n
            if member not in rollback_manifest['members'] or row!=rollback_manifest['members'][member] or original_zip.read(n)!=rollback_zip.read(member):raise ValueError('Both independently archived original records must match byte for byte')
            payload[row['source']]={'sha256':row['sha256'],'bytes':row['bytes']}
        archived_prior={}
        for n,row in rollback_manifest['members'].items():
            if n.startswith('prior/'):
                if row['source']!=ep+'/'+n:raise ValueError('Exact engine prior member location required')
                archived_prior[n[6:]]=row['sha256'];payload[row['source']]={'sha256':row['sha256'],'bytes':row['bytes']}
        if archived_prior!=required:raise ValueError('Complete changed prior inventory required')
    result={'schemaVersion':1,'scope':SCOPE,'transactionId':tx,'applicationCommit':packet['applicationCommit'],'plan':plan,'originalManifestSha256':original_manifest['manifestSha256'],'originalArchiveSha256':original['sha256'],'rollbackManifestSha256':rollback_manifest['manifestSha256'],'rollbackArchiveSha256':rollback['archiveSha256'],'payload':dict(sorted(payload.items())),'retained':dict(sorted(rows.items()))}
    result['authoritySha256']=backup.sha(backup.encode(result,sort=True));return validate_authority(result,public_root)

def helper_source(authority_value,public_root,key,token,expires,hosted_runtime_bounds=False):
    if type(hosted_runtime_bounds) is not bool:raise ValueError('Explicit hosted runtime bound selection required')
    a=validate_authority(authority_value,public_root)
    if not backup.digest(key) or not isinstance(token,str) or re.fullmatch('[A-Za-z0-9_-]{43}',token) is None or type(expires) is not int or not int(time.time())<expires<=int(time.time())+3600:raise ValueError('Exact current separate archived private disposal required')
    metadata_names(a['transactionId'],public_root);config={'authority':a,'expires':expires,'ownershipKey':key,'publicRoot':public_root,'tokenSha256':backup.sha(token.encode())};name='ktk-transaction-rehearsal-'+a['transactionId']+'.php';source=(full.ROOT/'tools/full-private-engine-disposal-template.php').read_bytes()
    values={'EXPIRES':str(expires).encode(),'TOKEN_SHA':backup.sha(token.encode()).encode(),'ID':a['transactionId'].encode(),'HELPER':name.encode(),'PACKET':base64.b64encode(backup.encode(config))}
    for k,value in values.items():
        marker=('__KTK_FULL_DISPOSAL_'+k+'__').encode()
        if source.count(marker)!=1:raise ValueError('Exact archived disposal compiler marker required')
        source=source.replace(marker,value)
    for k,filename in [('STATE','staging-protected-state-core.php'),('STORE','content-update-private-store.php'),('CONTROLLER','full-private-engine-disposal.php')]:
        body=(full.ROOT/'tools'/filename).read_bytes();marker=('/* __KTK_FULL_DISPOSAL_'+k+'__ */').encode()
        if not body.startswith(b'<?php\n') or source.count(marker)!=1 or k=='STATE' and backup.sha(body)!=full.capacity.CORE_SHA:raise ValueError('Exact archived disposal component required')
        source=source.replace(marker,body[6:])
    if b'__KTK_FULL_DISPOSAL_' in source:raise ValueError('Unresolved archived disposal compiler marker')
    source=early.rebind(source)
    return bounds.bind(source,'disposal') if hosted_runtime_bounds else source

def validate_state(v,a):
    binding={k:a[k] for k in ('transactionId','applicationCommit','authoritySha256')};fields={'schemaVersion','scope',*binding,'stateSha256','phase','payloadFiles','payloadBytes','present','directories','operation','applicationWrites','databaseWrites','cachePurges','productionOperations'}
    if not isinstance(v,dict) or set(v)!=fields or type(v['schemaVersion']) is not int or v['schemaVersion']!=1 or v['scope']!='full-private-engine-disposal' or any(v[k]!=x for k,x in binding.items()) or not backup.digest(v['stateSha256']) or v['phase'] not in ('disposing','disposed') or any(type(v[k]) is not int or v[k]!=0 for k in ('applicationWrites','databaseWrites','cachePurges','productionOperations')):raise ValueError('Exact bound zero-public-write disposal state required')
    present={} if v['present']==[] else v['present'];known={**a['payload'],**a['retained']}
    if not isinstance(present,dict) or any(n not in known or r!=known[n] for n,r in present.items()) or not set(a['retained'])<=set(present):raise ValueError('Exact full known remaining private inventory required')
    payload=set(present)&set(a['payload']);dirs=v['directories'];allowed={'control','engine','engine/'+a['transactionId'],'engine/'+a['transactionId']+'/receipts','engine/'+a['transactionId']+'/pending'}
    for n in known:allowed.update(p.as_posix() for p in PurePosixPath(n).parents if p.as_posix()!='.')
    if not isinstance(dirs,list) or any(not isinstance(n,str) for n in dirs) or dirs!=sorted(set(dirs)) or not set(dirs)<=allowed or any(not {p.as_posix() for p in PurePosixPath(n).parents if p.as_posix()!='.'}<=set(dirs) for n in present):raise ValueError('Exact remaining private directory census required')
    retained_dirs={'control','engine','engine/'+a['transactionId'],'engine/'+a['transactionId']+'/receipts','engine/'+a['transactionId']+'/pending'};disposed=not payload and set(dirs)<=retained_dirs
    if type(v['payloadFiles']) is not int or v['payloadFiles']!=len(payload) or type(v['payloadBytes']) is not int or v['payloadBytes']!=sum(present[n]['bytes'] for n in payload) or (v['phase']=='disposed')!=disposed:raise ValueError('Private disposal counts or phase differ')
    proof={'binding':binding,'present':present,'directories':dirs}
    if backup.sha(backup.encode(proof,sort=True))!=v['stateSha256']:raise ValueError('Exact remaining private state fence required')
    op=v['operation']
    if op is not None and (not isinstance(op,dict) or set(op)!={'payloadFilesDeleted','payloadDirectoriesRemoved'} or any(type(x) is not int or not 0<=x<=256 for x in op.values())):raise ValueError('Bounded disposal operation required')
    return v
