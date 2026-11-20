"""Explicit prepared-engine or first-rollback-cut continuation.

The caller must pin source, verify saved helper identity and enforce original
unexpired authority before a connection. Neither path selects a phase implicitly
or retries an uncertain mutation without fresh exact inspection and archives.
"""
from tools import full_private_engine_resume as frozen_resume
from tools import full_private_seed_packet as full

frozen = frozen_resume


def continue_prepared_engine(client,transport,original_path,rollback_path,observe=lambda *args:None,step_bytes=33554432,step_files=128):
    if type(step_bytes) is not int or type(step_files) is not int or (step_bytes,step_files) not in ((33554432,128),(16777216,64)):
        raise ValueError('Exact reviewed work profile required')
    manifest,receipt,_=frozen_resume.attach_verified_original(client,original_path,rollback_path)
    state=client.inspect_preparation();preparation=state['preparation'];seed=preparation['fullSeed']
    expected,_=full.expected_seed_files(client.plan,client.sizes,client.overrides)
    if (not preparation['rootExists'] or not preparation['recordsComplete'] or not preparation['seedsComplete']
        or preparation['enginePhase']!='prepared' or preparation['rootBinding']!=manifest['rootBinding']
        or seed is None or not seed['sourceComplete'] or not seed['targetComplete']
        or seed['files']!=expected or seed['copiedBytes']!=sum(row['bytes'] for row in expected.values())):
        raise ValueError('Fresh complete seeds and an already prepared engine are required; no initialization retry')
    observe('prepared-engine-preparation-inspected',state)
    engine_state=client.inspect();client.healthy(engine_state);engine=engine_state['engine']
    if (engine_state['closed'] or engine_state['archiveAcknowledged'] or engine['phase']!='prepared'
        or not engine['currentPriorInventoryVerified'] or not engine['protectedStateVerified']):
        raise ValueError('Fresh unacknowledged prepared engine with exact prior state required')
    if full.verify_archive(original_path,client.plan,client.key,client.helper_sha256,manifest)!=receipt:
        raise ValueError('Original archive changed during prepared inspection')
    observe('prepared-engine-ready-inspected',engine_state)
    return manifest,receipt,{'prepared':True,'freshPreparedEngineInspectionVerified':True,'separatePreparedCallerContinuationVerified':True,'initializationMutationCallsThisProcess':0,'copiedPayloadFiles':len(expected),'copiedPayloadBytes':sum(row['bytes'] for row in expected.values())}

def require_first_rollback(state,changed):
    e=state['engine']
    if (len(changed)!=5 or state['closed'] or not state['archiveAcknowledged'] or e['phase']!='rolling-back'
        or (len(e['intentFiles'])!=5 or set(e['intentFiles'])!=set(changed)) or e['pendingApplyFiles']!=[changed[0]] or (len(e['pendingRollbackFiles'])!=4 or set(e['pendingRollbackFiles'])!=set(changed[1:]))
        or e['currentExpectedInventoryVerified'] or e['currentPriorInventoryVerified']
        or not e['backupVerified'] or not e['protectedStateVerified'] or not e['privateTemporaryInspectionVerified']
        or not e['privateReceiptInspectionVerified'] or e['retainedPrivateTemporaryArtifacts'] or e['retainedPrivateReceiptArtifacts']):
        raise ValueError('Exact archived first-rollback replacement boundary required')

def continue_first_rollback_cut(client,original_path,rollback_path,observe=lambda *args:None):
    manifest,receipt,_=frozen.attach_verified_archives(client,original_path,rollback_path)
    changed=sorted(n for n,v in client.plan['expected'].items() if v!=client.plan['prior'].get(n))
    state=client.inspect();client.healthy(state);require_first_rollback(state,changed)
    exported=client.call('export');client.healthy(exported);require_first_rollback(exported,changed)
    if exported['stateSha256']!=state['stateSha256'] or exported.get('export')!=client.manifest:
        raise ValueError('Fresh export and reopened archive must equal inspected rollback boundary')
    observe('first-rollback-cut-inspected',exported)
    calls=0
    while state['engine']['phase']!='rolled-back':
        if calls>=5:raise ValueError('Rollback continuation exceeded remaining four changes plus terminal inspection bound')
        previous=list(state['engine']['pendingRollbackFiles'])
        state=client.step('rollback');calls+=1;e=state['engine']
        if (state['closed'] or e['phase'] not in ('rolling-back','rolled-back') or not set(e['pendingRollbackFiles'])<set(previous)
            or len(previous)-len(e['pendingRollbackFiles'])>2):
            raise ValueError('Rollback did not make bounded verified progress through known remaining files')
        observe('resumed-private-rollback',state)
    if not state['engine']['currentPriorInventoryVerified']:raise ValueError('Complete private prior inventory required')
    state=client.close();observe('resumed-private-closed',state)
    if not state['closed'] or state['engine']['phase']!='rolled-back' or not state['engine']['currentPriorInventoryVerified']:
        raise ValueError('Signed exact private rolled-back closure required')
    if full.verify_archive(original_path,client.plan,client.key,client.helper_sha256,manifest)!=receipt or client.verified_archive()!=client.archive_receipt:
        raise ValueError('Recovered archives changed')
    return {'privateChangedFiles':5,'previousOwnedRollbackReplacementVerified':1,'privateApplyCallsThisProcess':0,
        'privateRollbackCallsThisProcess':calls,'firstRollbackCutFreshlyInspected':True,'rolledBackClosureVerified':True,
        'publicApplicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionOperations':0}
