"""Fenced private engine rehearsal steps with explicit controlled cuts; no connector or uploader."""
from __future__ import annotations
import math
from tools import content_update_backup as backup
from tools.content_update_client import UncertainRequest

def prepare(client,transport,original_path,original_reader,archive_builder,interrupt_original=False,observe=lambda *args:None):
    if type(interrupt_original) is not bool:raise ValueError('Explicit private original interruption flag required')
    state=client.prepare();observe('prepare',state)
    if 'preparation' not in state or state['preparation']['seedFiles'] not in ({},[]) or state['preparation']['enginePhase'] is not None:raise ValueError('Empty preparation before original archival required')
    manifest=transport.original_manifest();receipt=archive_builder(manifest,original_reader,client.plan,client.key,client.helper_sha256,original_path);transport.acknowledge_original(original_path,client.key,manifest);observe('original-archived',receipt)
    expected_bytes=sum(client.sizes.values())+sum(client.sizes.get(n,0) for n in client.plan['prior']);limit=2*(math.ceil(expected_bytes/33554432)+math.ceil((len(client.plan['expected'])+len(client.plan['prior']))/128))+16;cut=False
    for _ in range(limit):
        if 'preparation' not in state:break
        previous=state['preparation']['fullSeed'];before=(previous['copiedBytes'],len(previous['files']))
        try:state=client.recover_preparation()
        except UncertainRequest:
            if not interrupt_original or cut:raise
            state=client.inspect_preparation();observe('inspect-original-cut',state);p=state['preparation'];seed=p['fullSeed'];largest=max(client.sizes,key=lambda n:(client.sizes[n],n));row=(seed['files'] or {}).get('source/'+largest)
            if p['enginePhase'] is not None or seed['targetComplete'] or row is None or row['bytes']!=65536 or not 0<seed['copiedBytes']-before[0]<=33554432:raise ValueError('Uncertain copy differs from exact planned original prefix; preserve without retry')
            cut=True
        observe('preparation-progress',state)
        if 'preparation' in state:
            seed=state['preparation']['fullSeed']
            if (seed['copiedBytes'],len(seed['files']))<=before:raise ValueError('Private preparation made no verified progress')
    else:raise ValueError('Private preparation exceeded deterministic bounded step limit')
    if interrupt_original and not cut:raise ValueError('Required original interruption was not independently observed')
    if 'engine' not in state or state['engine']['phase']!='prepared' or not state['engine']['currentPriorInventoryVerified'] or state['closed'] or state['archiveAcknowledged']:raise ValueError('Exact complete unacknowledged private engine preparation required')
    return manifest,receipt,{'originalPrefixRecoveryVerified':cut,'prepared':True}

def transact(client,rollback_path,interrupt_engine=False,observe=lambda *args:None):
    if type(interrupt_engine) is not bool:raise ValueError('Explicit private engine interruption flag required')
    client.export_and_acknowledge(rollback_path);observe('rollback-archived',client.verified_archive());changed=sorted(n for n,h in client.plan['expected'].items() if h!=client.plan['prior'].get(n));cut=False;calls=0
    while client.state is None or client.state['engine']['phase']!='applied':
        if calls>=len(changed)+1:raise ValueError('Private apply exceeded bounded change count')
        try:state=client.step('apply')
        except UncertainRequest:
            if not interrupt_engine or cut or calls!=0:raise
            state=client.inspect();client.healthy(state);engine=state['engine']
            if state['closed'] or not state['archiveAcknowledged'] or engine['phase']!='applying' or engine['intentFiles']!=[changed[0]] or set(engine['pendingApplyFiles'])!=set(changed[1:]):raise ValueError('Uncertain engine state differs from the planned first owned replacement')
            cut=True;observe('inspect-engine-cut',state)
        calls+=1;observe('private-apply',state)
    if interrupt_engine and not cut:raise ValueError('Required engine interruption was not independently observed')
    if not client.state['engine']['currentExpectedInventoryVerified']:raise ValueError('Complete private expected inventory required before rollback')
    rolled=0
    while client.state['engine']['phase']!='rolled-back':
        if rolled>=len(changed)+1:raise ValueError('Private rollback exceeded bounded change count')
        state=client.step('rollback');rolled+=1;observe('private-rollback',state)
    if not client.state['engine']['currentPriorInventoryVerified']:raise ValueError('Exact complete prior inventory required before closure')
    state=client.close();observe('private-closed',state)
    if not state['closed'] or state['engine']['phase']!='rolled-back' or not state['engine']['currentPriorInventoryVerified']:raise ValueError('Signed rolled-back private closure required')
    return {'privateChangedFiles':len(changed),'privateApplyCalls':calls,'privateRollbackCalls':rolled,'controlledEngineCutInspected':cut,'rolledBackClosureVerified':True,'publicApplicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionOperations':0}
