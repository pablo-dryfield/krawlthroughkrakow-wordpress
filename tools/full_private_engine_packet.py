"""Explicit early full private engine helper compiler. No endpoint, credentials or file output."""
from __future__ import annotations
import base64,re,time
from pathlib import Path
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools import full_private_engine_controller as compiled
from tools import early_private_entry as early

ROOT=Path(__file__).resolve().parents[1]
TEMPLATE=ROOT/'tools/full-private-engine-staging-template.php'
COMPONENTS={'STATE':'staging-protected-state-core.php','REQUEST':'content-update-request.php','STORE':'content-update-private-store.php','BACKUP':'content-update-backup-manifest.php','ENGINE':'code-pages-update-engine.php','PREPARATION':'full-private-engine-preparation.php'}
MAX_LIFETIME=7200

def helper_source(name,token,expires,commit,owned,sizes,protected_sha,key,interrupt_original=False,interrupt_engine=False):
    match=re.fullmatch(r'ktk-transaction-rehearsal-([a-f0-9]{32})\.php',name) if isinstance(name,str) else None
    if match is None or not isinstance(token,str) or re.fullmatch(r'[A-Za-z0-9_-]{43}',token) is None or type(expires) is not int or not int(time.time())<expires<=int(time.time())+MAX_LIFETIME or not backup.digest(key) or type(interrupt_original) is not bool or type(interrupt_engine) is not bool:raise ValueError('Exact explicit expiring full private engine context required')
    plan,sizes,overrides=full.plan(match[1],commit,owned,sizes,protected_sha)
    packet={'mode':'private-staging-rehearsal','plan':plan,'ownershipKey':key,'tokenSha256':backup.sha(token.encode()),'expires':expires,'stepLimit':1,'publicOwnedSha256':backup.sha(backup.encode(owned,sort=True)),'productionAuthorizationSha256':None}
    changed=sorted(n for n,h in plan['expected'].items() if h!=plan['prior'].get(n));prefix=max(sizes,key=lambda n:(sizes[n],n)) if interrupt_original else '';engine_fault=changed[0] if interrupt_engine else ''
    values={'EXPIRES':str(expires).encode(),'TOKEN_SHA':backup.sha(token.encode()).encode(),'ID':match[1].encode(),'HELPER':name.encode(),'PACKET':base64.b64encode(backup.encode(packet)),'SEEDS':base64.b64encode(backup.encode({'sizes':sizes,'overrides':overrides})),'PREFIX_PATH':prefix.encode(),'FAULT_PATH':engine_fault.encode()}
    source=TEMPLATE.read_bytes()
    for name,value in values.items():
        marker=('__KTK_FULL_ENGINE_'+name+'__').encode()
        if source.count(marker)!=1:raise ValueError('Exact private engine compiler marker required')
        source=source.replace(marker,value)
    bodies={name:(ROOT/'tools'/filename).read_bytes() for name,filename in COMPONENTS.items()};bodies.update(STREAM=compiled.stream_source(),CONTROLLER=compiled.controller_source())
    for name,body in bodies.items():
        marker=('/* __KTK_FULL_ENGINE_'+name+'__ */').encode()
        if source.count(marker)!=1 or not body.startswith(b'<?php\n') or name=='STATE' and backup.sha(body)!=full.capacity.CORE_SHA:raise ValueError('Exact frozen full private engine component required')
        source=source.replace(marker,body[6:])
    if b'__KTK_FULL_ENGINE_' in source:raise ValueError('Unresolved full private engine marker')
    return early.rebind(source)
