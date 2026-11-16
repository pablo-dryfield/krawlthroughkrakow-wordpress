"""Fenced release protocol with injected transport/reader. No HTTP/FTP client or production authorization."""
from __future__ import annotations
from pathlib import Path
import datetime,re,zipfile
from tools import content_update_backup as backup

ACTIONS={'prepare':(),'inspect':(),'export':(),'inspect-preparation':(),'recover-preparation':('stateSha256',),'acknowledge':('stateSha256','exportSha256','archiveSha256'),'apply':('stateSha256','archiveSha256'),'rollback':('stateSha256','archiveSha256'),'close':('stateSha256','exportSha256','archiveSha256')}

class UncertainRequest(RuntimeError):
 """Do not retry mutations; inspect in a subsequent explicit caller action."""

class ContentUpdateClient:
 def __init__(self,binding,helper_sha256,key,transport,private_reader,mode='private-staging-rehearsal'):
  if not isinstance(binding,dict) or list(binding)!=['transactionId','applicationCommit','planSha256'] or not backup.identifier(binding['transactionId'],32) or not backup.identifier(binding['applicationCommit'],40) or not backup.digest(binding['planSha256']) or not backup.digest(helper_sha256) or not backup.digest(key) or mode not in ('private-staging-rehearsal','production') or not callable(transport) or not callable(private_reader):raise ValueError('Exact caller binding and injected authenticated transport required')
  self.binding=dict(binding);self.helper_sha256=helper_sha256;self.key=key;self.transport=transport;self.reader=private_reader;self.mode=mode;self.state=None;self.preparation_state=None;self.archive_path=None;self.manifest=None;self.archive_receipt=None
 def validate_preparation(self,envelope):
  if not isinstance(envelope,dict) or set(envelope)!={'helperSha256','controller'} or envelope['helperSha256']!=self.helper_sha256:raise ValueError('Exact authenticated preparation response required')
  v=envelope['controller'];keys={'schemaVersion','mode',*self.binding,'stateSha256','preparation','productionAuthorizationProvided','applicationWrites','databaseWrites','activationWrites','cachePurges'}
  if not isinstance(v,dict) or set(v)!=keys or type(v['schemaVersion']) is not int or v['schemaVersion']!=1 or v['mode']!=self.mode or any(v[k]!=x for k,x in self.binding.items()) or not backup.digest(v['stateSha256']) or v['productionAuthorizationProvided'] is not (self.mode=='production') or any(type(v[k]) is not int or v[k]!=0 for k in ('applicationWrites','databaseWrites','activationWrites','cachePurges')):raise ValueError('Exact preparation binding and zero-write boundaries required')
  p=v['preparation']
  if not isinstance(p,dict) or set(p)!={'rootExists','originalCaptureTime','recordsComplete','seedsComplete','enginePhase','controlFiles','seedFiles','engineFiles'} or any(type(p[k]) is not bool for k in ('rootExists','recordsComplete','seedsComplete')) or p['enginePhase'] not in (None,'unprepared','prepared'):raise ValueError('Exact preparation inspection required')
  time=p['originalCaptureTime']
  if time is not None:
   if not isinstance(time,str) or re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00',time) is None or datetime.datetime.fromisoformat(time).isoformat(timespec='seconds')!=time:raise ValueError('Exact original snapshot timestamp required')
  for kind in ('controlFiles','seedFiles','engineFiles'):
   rows=p[kind]
   # Empty PHP associative inventories serialize as arrays; only the empty form is accepted.
   if rows==[]:rows={}
   if not isinstance(rows,dict) or len(rows)>20000:raise ValueError('Bounded private preparation inventory required')
   for name,row in rows.items():
    if not isinstance(name,str) or len(name)>4096 or any(x in ('','.','..') for x in name.split('/')) or not isinstance(row,dict) or set(row)!={'sha256','bytes'} or not backup.digest(row['sha256']) or type(row['bytes']) is not int or not 0<=row['bytes']<=16779264:raise ValueError('Exact private preparation metadata required')
    if kind=='controlFiles' and name not in ('original-state.json','controller-plan.json') and re.fullmatch(r'\.ktk-control-(?:original-state|controller-plan)\.json-(?:\d{14}-)?[a-f0-9]{64}-[a-f0-9]{16}\.tmp',name) is None:raise ValueError('Unknown preparation control record')
    if kind=='seedFiles':
     parts=name.split('/',1)
     if len(parts)!=2 or parts[0] not in ('source','target'):raise ValueError('Unknown preparation seed scope')
     backup.owned_name(parts[1],activation=parts[0]=='target')
    if kind=='engineFiles' and name not in ('plan.json','journal.json'):
     if name.startswith('prior/'):backup.owned_name(name[6:],activation=True)
     elif re.fullmatch(r'receipts/\.ktk-receipt-(?:plan|journal)-[a-f0-9]{32}',name) is None:raise ValueError('Unknown preparation engine scope')
  return v
 def validate(self,envelope):
  if not isinstance(envelope,dict) or set(envelope)!={'helperSha256','controller'} or envelope['helperSha256']!=self.helper_sha256:raise ValueError('Exact authenticated helper response required')
  value=envelope['controller']
  if not isinstance(value,dict) or type(value.get('schemaVersion')) is not int or value['schemaVersion']!=1 or value.get('mode')!=self.mode or any(value.get(key)!=expected for key,expected in self.binding.items()) or not backup.digest(value.get('stateSha256')) or not isinstance(value.get('engine'),dict):raise ValueError('Exact controller state binding required')
  if any(type(value.get(key)) is not int or value[key]!=0 for key in ('databaseWrites','activationWrites','cachePurges')) or type(value.get('archiveAcknowledged')) is not bool or type(value.get('closed')) is not bool or value.get('productionAuthorizationProvided') is not (self.mode=='production'):raise ValueError('Exact controller mutation boundaries required')
  engine=value['engine']
  if engine.get('transactionId')!=self.binding['transactionId'] or engine.get('phase') not in ('unprepared','prepared','applying','uncertain','applied','rolling-back','rolled-back') or not backup.digest(engine.get('actualInventorySha256')) or type(engine.get('actualInventoryFiles')) is not int or engine['actualInventoryFiles']<1:raise ValueError('Complete code-page transaction inspection required')
  for key in ('pendingApplyFiles','pendingRollbackFiles','intentFiles'):
   if not isinstance(engine.get(key),list) or len(engine[key])>10000:raise ValueError('Bounded transaction file lists required')
   for name in engine[key]:backup.owned_name(name)
  for key in ('backupVerified','protectedStateVerified','privateTemporaryInspectionVerified','privateReceiptInspectionVerified','currentExpectedInventoryVerified','currentPriorInventoryVerified'):
   if type(engine.get(key)) is not bool:raise ValueError('Exact transaction inspection flags required')
  return value
 def call(self,action,**extra):
  if action not in ACTIONS or tuple(extra)!=ACTIONS[action] or any(not backup.digest(value) for value in extra.values()):raise ValueError('Exact canonical client action required')
  raw=backup.encode({'schemaVersion':1,'action':action,**self.binding,**extra})
  self.state=None;self.preparation_state=None
  try:value=(self.validate_preparation if action=='inspect-preparation' else self.validate)(self.transport(raw))
  except Exception:raise UncertainRequest('Controller request failed or its response was not verified; inspect before any further mutation') from None
  if action=='inspect-preparation':self.preparation_state=value
  else:self.state=value
  return value
 def inspect(self):return self.call('inspect')
 def prepare(self):return self.call('prepare')
 def inspect_preparation(self):return self.call('inspect-preparation')
 def recover_preparation(self):
  before=self.inspect_preparation();value=self.call('recover-preparation',stateSha256=before['stateSha256']);self.healthy(value)
  if value['closed'] or value['archiveAcknowledged'] or value['engine']['phase']!='prepared' or not value['engine']['currentPriorInventoryVerified']:raise UncertainRequest('Recovered preparation requires explicit inspection; no application mutation')
  return value
 @staticmethod
 def healthy(state):
  if any(state['engine'][key] is not True for key in ('backupVerified','protectedStateVerified','privateTemporaryInspectionVerified','privateReceiptInspectionVerified')):raise ValueError('Uncertain server state requires review; no application mutation')
 def bind_manifest(self,manifest):
  backup.validate_manifest(manifest)
  if manifest['mode']!=self.mode or manifest['transactionId']!=self.binding['transactionId'] or manifest['applicationCommit']!=self.binding['applicationCommit'] or manifest['enginePlanSha256']!=self.binding['planSha256']:raise ValueError('Archive export differs from the reviewed release')
  return manifest
 def attach_archive(self,path,manifest=None):
  if manifest is None:
   with zipfile.ZipFile(path) as archive:
    info=archive.getinfo('backup-manifest.json')
    if info.file_size>2097152:raise ValueError('Private archive manifest exceeds budget')
    manifest=backup.decode(archive.read(info))
  self.bind_manifest(manifest);receipt=backup.verify_archive(path,self.key,manifest)
  self.archive_path=Path(path);self.manifest=manifest;self.archive_receipt=receipt;return receipt
 def verified_archive(self):
  if self.archive_path is None or self.manifest is None or self.archive_receipt is None:raise ValueError('Reopened independently verified private rollback archive required')
  receipt=backup.verify_archive(self.archive_path,self.key,self.manifest)
  if receipt!=self.archive_receipt:raise ValueError('Saved private archive changed; application writes blocked')
  return receipt
 def export_and_acknowledge(self,destination):
  exported=self.call('export');self.healthy(exported)
  if exported['closed'] or exported['archiveAcknowledged'] or exported['engine']['phase']!='prepared' or not exported['engine']['currentPriorInventoryVerified']:raise ValueError('Fresh prepared prior state required before archive acknowledgment')
  manifest=self.bind_manifest(exported.get('export'));backup.build_archive(manifest,self.reader,self.key,destination);receipt=self.attach_archive(destination,manifest)
  current=self.inspect();self.healthy(current)
  if current['stateSha256']!=exported['stateSha256']:raise ValueError('Server state changed while downloading the rollback archive; inspect and review')
  self.verified_archive();state=self.call('acknowledge',stateSha256=current['stateSha256'],exportSha256=manifest['manifestSha256'],archiveSha256=receipt['archiveSha256']);self.healthy(state)
  if not state['archiveAcknowledged'] or state['closed'] or not state['engine']['currentPriorInventoryVerified'] or state['engine']['phase']!='prepared':raise UncertainRequest('Archive acknowledgment response requires inspection')
  return state
 def step(self,action):
  if action not in ('apply','rollback'):raise ValueError('Exact bounded mutation action required')
  receipt=self.verified_archive();state=self.inspect();self.healthy(state)
  if state['closed'] or not state['archiveAcknowledged']:raise ValueError('Open server transaction with durable archive acknowledgment required')
  # Reopen after inspection as well: the saved archive must remain intact until the mutation is sent.
  self.verified_archive();result=self.call(action,stateSha256=state['stateSha256'],archiveSha256=receipt['archiveSha256']);self.healthy(result);return result
 def close(self):
  receipt=self.verified_archive();state=self.inspect();self.healthy(state)
  if state['closed'] or not state['archiveAcknowledged'] or not(state['engine']['phase']=='applied' and state['engine']['currentExpectedInventoryVerified'] or state['engine']['phase']=='rolled-back' and state['engine']['currentPriorInventoryVerified']):raise ValueError('Verified terminal transaction and acknowledged archive required')
  self.verified_archive();result=self.call('close',stateSha256=state['stateSha256'],exportSha256=self.manifest['manifestSha256'],archiveSha256=receipt['archiveSha256'])
  if not result['closed']:raise UncertainRequest('Closure response requires inspection')
  return result
