"""Explicit full private fixture protocol; strict complete seed/prefix validation.

No connection, source mutation, production mode or recovery-profile inference.
Old client validation is retained for every non-seed field and engine operation.
"""
from __future__ import annotations
import copy
from pathlib import Path,PurePosixPath
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools.full_private_seed_transport import prefix_digest
from tools.content_update_client import ContentUpdateClient,ACTIONS,UncertainRequest

PROFILE='full-private-engine-v1'

def validate_seed(seed,root_binding,plan,sizes,overrides,source_root):
    expected,allowed_dirs=full.expected_seed_files(plan,sizes,overrides)
    fields={'stateSha256','files','directories','sourceComplete','targetComplete','copiedBytes','applicationWrites','databaseWrites','cachePurges'}
    if not backup.digest(root_binding) or not isinstance(seed,dict) or set(seed)!=fields or not (isinstance(seed['files'],dict) or seed['files']==[]) or not isinstance(seed['directories'],list) or not all(isinstance(d,str) for d in seed['directories']) or seed['directories']!=sorted(set(seed['directories'])) or not set(seed['directories'])<=set(allowed_dirs) or not set(seed['files'])<=set(expected) or any(type(seed[k]) is not int or seed[k]!=0 for k in ('applicationWrites','databaseWrites','cachePurges')):
        raise ValueError('Exact full private seed metadata required')
    files={} if seed['files']==[] else seed['files'];directories=set(seed['directories'])
    for name,row in files.items():
        spec=expected[name]
        if not isinstance(row,dict) or set(row)!={'sha256','bytes'} or not backup.digest(row['sha256']) or type(row['bytes']) is not int or not 0<=row['bytes']<=spec['bytes'] or (row['bytes']==spec['bytes'] and row['sha256']!=spec['sha256']) or (row['bytes']<spec['bytes'] and row['sha256']!=prefix_digest(name,row['bytes'],source_root,overrides)):
            raise ValueError('Full private seed or exact reviewed prefix differs')
        if not {p.as_posix() for p in PurePosixPath(name).parents if p.as_posix()!='.'}<=directories:raise ValueError('Full private seed parents absent')
    for d in directories:
        if not {p.as_posix() for p in PurePosixPath(d).parents if p.as_posix()!='.'}<=directories:raise ValueError('Full private directory parents absent')
    for folder in ('source','target'):
        complete=folder in directories and all(files.get(n)==row for n,row in expected.items() if n.startswith(folder+'/'))
        if type(seed[folder+'Complete']) is not bool or seed[folder+'Complete']!=complete:raise ValueError('Full private completion flags differ from inventory')
    if 'target' in directories and not seed['sourceComplete']:raise ValueError('Private target cannot precede the complete candidate')
    if type(seed['copiedBytes']) is not int or seed['copiedBytes']!=sum(r['bytes'] for r in files.values()) or seed['stateSha256']!=full.seed_digest(root_binding,plan,seed['files'],seed['directories']):raise ValueError('Full private byte count or state fence differs')
    return seed

class FullPrivateEngineClient(ContentUpdateClient):
    def __init__(self,plan,sizes,overrides,source_root,helper_sha256,key,transport,private_reader):
        reference,reviewed_sizes,reviewed_overrides=full.plan(plan['transactionId'],plan['applicationCommit'],plan['expected'],sizes,plan['protectedStateSha256'])
        if plan!=reference or sizes!=reviewed_sizes or overrides!=reviewed_overrides:raise ValueError('Exact deterministic full private fixture required')
        self.plan=copy.deepcopy(plan);self.sizes=dict(sizes);self.overrides=dict(overrides);self.source_root=Path(source_root);self.root_binding=None
        super().__init__(full.binding(plan),helper_sha256,key,transport,private_reader,mode='private-staging-rehearsal')
    def profile_envelope(self,envelope):
        if not isinstance(envelope,dict) or set(envelope)!={'privateProfile','helperSha256','controller'} or envelope['privateProfile']!=PROFILE or envelope['helperSha256']!=self.helper_sha256:raise ValueError('Explicit exact full private engine response profile required')
        return {'helperSha256':envelope['helperSha256'],'controller':envelope['controller']}
    def validate_preparation(self,envelope):
        base=self.profile_envelope(envelope);value=base['controller'];p=value.get('preparation') if isinstance(value,dict) else None
        if not isinstance(p,dict) or not {'fullSeed','rootBinding','seedFiles'}<=set(p):raise ValueError('Full private preparation context required')
        if p.get('rootExists') is True:
            seed=validate_seed(p['fullSeed'],p['rootBinding'],self.plan,self.sizes,self.overrides,self.source_root)
            if self.root_binding is not None and p['rootBinding']!=self.root_binding:raise ValueError('Original private root binding changed')
            if p['seedFiles']!=seed['files'] or p.get('seedsComplete') is not (seed['sourceComplete'] and seed['targetComplete']):raise ValueError('Controller and complete seed metadata differ')
            if p.get('recordsComplete') is not True and (seed['files'] or seed['directories']):raise ValueError('Payload cannot precede complete signed original records')
            if not p['seedsComplete'] and p.get('enginePhase') is not None:raise ValueError('Engine cannot precede complete full source and target')
        elif p.get('rootExists') is False:
            if p['fullSeed'] is not None or p['rootBinding'] is not None or p['seedFiles'] not in ({},[]) or p.get('recordsComplete') is not False or p.get('seedsComplete') is not False or p.get('enginePhase') is not None:raise ValueError('Absent private root cannot claim preparation')
        else:raise ValueError('Exact private root existence required')
        # Every original seed field was independently verified above. The old
        # validator still owns all control/engine/identity/zero-write checks.
        projected=copy.deepcopy(base);pp=projected['controller']['preparation'];pp.pop('fullSeed');pp.pop('rootBinding');pp['seedFiles']=[]
        super().validate_preparation(projected)
        if p['rootExists']:self.root_binding=p['rootBinding']
        return value
    def validate(self,envelope):return super().validate(self.profile_envelope(envelope))
    def call(self,action,**extra):
        if action not in ACTIONS or tuple(extra)!=ACTIONS[action] or any(not backup.digest(v) for v in extra.values()):raise ValueError('Exact canonical full private action required')
        raw=backup.encode({'schemaVersion':1,'action':action,**self.binding,**extra});self.state=None;self.preparation_state=None
        try:
            envelope=self.transport(raw);controller=envelope.get('controller') if isinstance(envelope,dict) else None;preparation=isinstance(controller,dict) and 'preparation' in controller
            if preparation:
                if action not in ('prepare','inspect-preparation','recover-preparation'):raise ValueError('Unexpected preparation response for engine action')
                value=self.validate_preparation(envelope)
            else:
                if action in ('prepare','inspect-preparation'):raise ValueError('Deferred preparation response required')
                value=self.validate(envelope)
        except Exception:raise UncertainRequest('Full private response failed verification; inspect before further mutation, no retry') from None
        if preparation:self.preparation_state=value
        else:self.state=value
        return value
    def recover_preparation(self):
        before=self.inspect_preparation();value=self.call('recover-preparation',stateSha256=before['stateSha256'])
        if 'preparation' in value:
            if value['stateSha256']==before['stateSha256']:raise UncertainRequest('No verified full preparation progress; inspect before another action')
            return value
        self.healthy(value)
        if value['closed'] or value['archiveAcknowledged'] or value['engine']['phase']!='prepared' or not value['engine']['currentPriorInventoryVerified']:raise UncertainRequest('Full preparation transition requires exact prepared private inventory')
        return value
