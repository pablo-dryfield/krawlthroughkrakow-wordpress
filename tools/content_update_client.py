"""Fenced release protocol with injected transport/reader. No HTTP/FTP client or production authorization."""
from __future__ import annotations
from pathlib import Path
import zipfile
from tools import content_update_backup as backup

ACTIONS={'prepare':(),'inspect':(),'export':(),'acknowledge':('stateSha256','exportSha256','archiveSha256'),'apply':('stateSha256','archiveSha256'),'rollback':('stateSha256','archiveSha256'),'close':('stateSha256','exportSha256','archiveSha256')}

class UncertainRequest(RuntimeError):
 """Do not retry mutations; inspect in a subsequent explicit caller action."""

class ContentUpdateClient:
 def __init__(self,binding,helper_sha256,key,transport,private_reader,mode='private-staging-rehearsal'):
  if not isinstance(binding,dict) or list(binding)!=['transactionId','applicationCommit','planSha256'] or not backup.identifier(binding['transactionId'],32) or not backup.identifier(binding['applicationCommit'],40) or not backup.digest(binding['planSha256']) or not backup.digest(helper_sha256) or not backup.digest(key) or mode not in ('private-staging-rehearsal','production') or not callable(transport) or not callable(private_reader):raise ValueError('Exact caller binding and injected authenticated transport required')
  self.binding=dict(binding);self.helper_sha256=helper_sha256;self.key=key;self.transport=transport;self.reader=private_reader;self.mode=mode;self.state=None;self.archive_path=None;self.manifest=None;self.archive_receipt=None
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
  self.state=None
  try:value=self.validate(self.transport(raw))
  except Exception:raise UncertainRequest('Controller request failed or its response was not verified; inspect before any further mutation') from None
  self.state=value;return value
 def inspect(self):return self.call('inspect')
 def prepare(self):return self.call('prepare')
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
