"""Compile a distinct current-witness private termination helper in memory.

The returned PHP contains private archive ownership material. Never print it or
save it as documentation. This module does not seal, install, connect or execute.
"""
from __future__ import annotations
import base64
from pathlib import Path

from tools import content_update_backup as backup
from tools import early_private_entry as early
from tools import full_private_engine_controller as compiled
from tools import private_engine_readonly as readonly
from tools import private_engine_termination_config as factory
from tools import staging_state_fast_capture as fast_state
from tools import private_state_fast_census as fast_census

ROOT=Path(__file__).resolve().parents[1]
TEMPLATE=ROOT/'tools/private-engine-termination-staging-template.php'
COMPONENTS={
    'STATE':'staging-protected-state-core.php','STORE':'content-update-private-store.php',
    'ENGINE':'code-pages-update-engine.php','STREAM':'content-update-streaming-seeds.php',
    'PREPARATION':'full-private-engine-preparation.php','ARTIFACTS':'private-engine-abandonment-artifacts.php',
    'INITIAL':'private-engine-abandonment-inspection.php','FENCED':'private-engine-fenced-inspection.php',
    'CLAIM':'private-engine-termination-claim.php','PAYLOAD':'private-engine-payload-cleanup.php',
    'CONTROLLER':'private-engine-termination.php',
}
PYTHON_SOURCES=(
    'content_update_backup.py','content_update_client.py','content_update_recovery.py',
    'content_update_staging_packet.py','content_update_staging_transport.py','early_private_entry.py',
    'full_inventory_capacity.py','full_private_engine_controller.py','full_private_engine_packet.py',
    'full_private_engine_recovery.py','full_private_seed_packet.py','full_private_seed_transport.py',
    'private_engine_readonly.py','private_engine_termination_archive.py','private_engine_termination_authority.py',
    'private_engine_termination_binding.py','private_engine_termination_config.py','private_engine_termination_helper.py',
    'snapshot-staging-update-state.py','promote-code-pages-production.py',
    'staging_state_fast_capture.py','private_state_fast_census.py',
)
CORE_SHA256='223b28dab84918a42a23e750a77dcf85a90ac49bcfb0ee2ec9bc7ceea60844fb'


def source_hashes():
    """Reviewed compiler/runtime/dependency inputs, including dynamic source reads."""
    names={*COMPONENTS.values(),*PYTHON_SOURCES,TEMPLATE.name,fast_state.TARGET.name,fast_census.TARGET.name}
    return {'tools/'+name:backup.sha((ROOT/'tools'/name).read_bytes()) for name in sorted(names)}


def helper_source(value,old,**archive_bindings):
    """Reopen all required archives; source fingerprints must match this compiler."""
    if not isinstance(value,dict) or value.get('sourceHashes')!=source_hashes():
        raise ValueError('Exact reviewed private termination compiler fingerprints required')
    config=factory.configuration(value,old,**archive_bindings)
    name='ktk-transaction-rehearsal-'+value['operationId']+'.php'
    replacements={
        'EXPIRES':str(value['expires']).encode(),'TOKEN_SHA':backup.sha(value['token'].encode()).encode(),
        'ID':value['operationId'].encode(),'HELPER':name.encode(),
        'CONFIG':base64.b64encode(backup.encode(config)),
    }
    source=TEMPLATE.read_bytes()
    for part,data in replacements.items():
        marker=('__KTK_PRIVATE_TERMINATION_'+part+'__').encode()
        if source.count(marker)!=1:raise ValueError('Exact private termination template marker required')
        source=source.replace(marker,data,1)
    bodies={part:(ROOT/'tools'/filename).read_bytes() for part,filename in COMPONENTS.items()}
    if backup.sha(bodies['STATE'])!=CORE_SHA256:raise ValueError('Frozen complete raw capture required')
    for part,derivation in (('STATE',fast_state),('FENCED',fast_census)):
        raw=bodies[part];derived=derivation.render(raw)
        if derived!=derivation.TARGET.read_bytes() or derivation.inverse(derived)!=raw:
            raise ValueError('Exact bounded complete-hash staging derivation required')
        bodies[part]=derived
    bodies['ENGINE']=readonly.read_only_source(bodies['ENGINE'])
    bodies['STREAM']=compiled.stream_source(bodies['STREAM'])
    for part,body in bodies.items():
        marker=('/* __KTK_PRIVATE_TERMINATION_'+part+'__ */').encode()
        if source.count(marker)!=1 or not body.startswith(b'<?php\n'):
            raise ValueError('Exact private termination component required')
        source=source.replace(marker,body[6:],1)
    if b'__KTK_PRIVATE_TERMINATION_' in source:raise ValueError('Unresolved private termination marker')
    return early.rebind(source)


def compile_context(value,old,**archive_bindings):
    """Return the helper and its final pinned packet; sealing remains separate."""
    source=helper_source(value,old,**archive_bindings)
    return {**value,'helperSha256':backup.sha(source)},source
