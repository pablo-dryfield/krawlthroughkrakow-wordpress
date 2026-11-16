"""Dispose only archived synthetic staging payload; retain authenticated recovery metadata. No connection or uploader."""
from __future__ import annotations
import re,zipfile
from tools import content_update_backup as backup
from tools import content_update_recovery as recovery
from tools import content_update_staging_packet as staging
from tools.content_update_staging_transport import mlst_facts

class PrivateDisposalError(RuntimeError):pass

class PrivateStagingDisposer:
 def __init__(self,connection,packet,archive_path,observer=None):
  recovery.validate_packet(packet);self.packet=packet;self.connection=connection;self.archive_path=archive_path;self.observer=observer;self.id=packet['transactionId'];self.root='/.ktk-content-update-'+self.id;self.key=packet['ownershipKey'];self.plan=packet['plan']
  with zipfile.ZipFile(archive_path) as archive:
   info=archive.getinfo('backup-manifest.json')
   if info.file_size>2097152:raise ValueError('Bounded authenticated rollback manifest required')
   self.manifest=backup.validate_manifest(backup.decode(archive.read(info)))
  self.receipt=backup.verify_archive(archive_path,self.key,self.manifest)
  if self.manifest['mode']!='private-staging-rehearsal' or self.manifest['transactionId']!=self.id or self.manifest['applicationCommit']!=packet['applicationCommit'] or self.manifest['enginePlanSha256']!=staging.binding(self.plan)['planSha256']:raise ValueError('Exact archived private-staging fixture context required')
  with zipfile.ZipFile(archive_path) as archive:
   control=backup.decode(backup.record_payload(archive.read('records/controller-plan.json'),'controller-plan.json',self.manifest,self.key));original=backup.decode(backup.record_payload(archive.read('records/original-state.json'),'original-state.json',self.manifest,self.key))
  if control['enginePlan']!=self.plan or original['ownedContentFiles']!=packet['publicOwned'] or original['helperSha256']!=packet['helperSha256']:raise ValueError('Archived fixture source/public inventory/plan differs from recovery packet')
  self.payload={}
  for folder,files in staging.seeds().items():
   for name,data in files.items():self.payload[folder+'/'+name]={'bytes':len(data),'sha256':backup.sha(data)}
  self.required_prior={}
  for name,row in self.manifest['members'].items():
   if name.startswith('prior/'):
    relative=name[len('prior/'):];self.required_prior[relative]=row['sha256'];self.payload[row['source']]={'bytes':row['bytes'],'sha256':row['sha256']}
   else:self.payload[row['source']]={'bytes':row['bytes'],'sha256':row['sha256']}
  if len(self.payload)!=19:raise ValueError('Exact nineteen-member synthetic staging payload required')
  self.fixed={'owner.marker':64,'controller.lock':64,'control/closed.json':18432,'control/backup-ack.json':18432,'engine/'+self.id+'/plan.json':1048576,'engine/'+self.id+'/journal.json':1048576}
  self.directories={'control','engine','engine/'+self.id,'engine/'+self.id+'/receipts','engine/'+self.id+'/pending'}
  for name in [*self.payload,*self.fixed]:self.directories.update(self.parents(name))
  # Rollback removes introduced files, while their known empty target directories may remain.
  for name in self.plan['expected']:self.directories.update(self.parents('target/'+name))
 def parents(self,name):
  parts=name.split('/');return {'/'.join(parts[:index]) for index in range(1,len(parts))}
 def role(self,name):
  if name in self.payload:return self.payload[name]['bytes']
  if name in self.fixed:return self.fixed[name]
  if re.fullmatch(r'engine/target-[a-f0-9]{64}\.lock',name):return 0
  raise ValueError('Unknown private member preserved')
 def path(self,name):
  if name=='':return self.root
  if not isinstance(name,str) or re.fullmatch('[A-Za-z0-9._/-]+',name) is None or any(part in ('','.','..') for part in name.split('/')):raise ValueError('Exact own private path required')
  if name not in self.directories:self.role(name)
  return self.root+'/'+name
 def facts(self,name,kind):
  path=self.path(name);value=mlst_facts(self.connection.sendcmd('MLST '+path),path)
  if value.get('type')!=kind:raise ValueError('Private alias or unexpected type preserved')
  return value
 def read(self,name,limit=None):
  cap=self.role(name) if limit is None else limit;parts=name.split('/');ancestors=['']+['/'.join(parts[:index]) for index in range(1,len(parts))];before={part:self.facts(part,'dir') for part in ancestors};file_before=self.facts(name,'file')
  if re.fullmatch('[0-9]+',file_before.get('size','')) is None or int(file_before['size'])>cap:raise ValueError('Private member budget differs')
  chunks=[];total=0
  def receive(value):
   nonlocal total
   if not isinstance(value,bytes):raise ValueError('Binary private metadata required')
   total+=len(value)
   if total>cap:raise ValueError('Private member budget exceeded')
   chunks.append(value)
  self.connection.retrbinary('RETR '+self.path(name),receive);data=b''.join(chunks)
  if len(data)!=int(file_before['size']) or self.facts(name,'file')!=file_before or any(self.facts(part,'dir')!=value for part,value in before.items()):raise ValueError('Private member changed while reading')
  return data
 def scan(self):
  files=set();directories=set();count=0
  def walk(name):
   nonlocal count
   self.facts(name,'dir');seen=set()
   for entry,facts in self.connection.mlsd(self.path(name)):
    count+=1
    if count>256:raise ValueError('Synthetic private namespace budget exceeded')
    if entry in ('.','..'):
     if facts.get('type')!=('cdir' if entry=='.' else 'pdir'):raise ValueError('Unexpected dot metadata preserved')
     continue
    if not isinstance(entry,str) or re.fullmatch('[A-Za-z0-9._-]+',entry) is None or entry.casefold() in seen:raise ValueError('Unsafe or ambiguous private member preserved')
    seen.add(entry.casefold());relative=name+'/'+entry if name else entry;kind=facts.get('type')
    if kind=='dir':
     if relative not in self.directories:raise ValueError('Unknown private directory preserved')
     directories.add(relative);walk(relative)
    elif kind=='file':self.role(relative);files.add(relative)
    else:raise ValueError('Private symlink or unknown type preserved')
  walk('');return files,directories
 def archive(self):
  if backup.verify_archive(self.archive_path,self.key,self.manifest)!=self.receipt:raise ValueError('Saved rollback archive changed; no private deletion allowed')
 def ownership(self,closure_sha=None):
  expected=self.manifest['rootBinding'].encode()
  if self.read('owner.marker')!=expected or self.read('controller.lock')!=expected:raise ValueError('Private root ownership changed')
  closed_blob=self.read('control/closed.json');closed=backup.decode(backup.record_payload(closed_blob,'closed.json',self.manifest,self.key));ack_blob=self.read('control/backup-ack.json');ack=backup.decode(backup.record_payload(ack_blob,'backup-ack.json',self.manifest,self.key))
  common={'schemaVersion':1,'mode':'private-staging-rehearsal','transactionId':self.id,'applicationCommit':self.packet['applicationCommit'],'planSha256':staging.binding(self.plan)['planSha256'],'exportSha256':self.manifest['manifestSha256'],'archiveSha256':self.receipt['archiveSha256']}
  if not isinstance(closed,dict) or set(closed)!=set(common)|{'terminalPhase','stateSha256','payloadRetained'} or any(closed.get(key)!=value for key,value in common.items()) or closed['terminalPhase']!='rolled-back' or not backup.digest(closed['stateSha256']) or closed['payloadRetained'] is not True:raise ValueError('Authenticated rolled-back private closure required')
  if not isinstance(ack,dict) or set(ack)!=set(common)|{'acknowledgedStateSha256'} or any(ack.get(key)!=value for key,value in common.items()) or not backup.digest(ack['acknowledgedStateSha256']):raise ValueError('Authenticated matching archive acknowledgment required')
  digest=backup.sha(closed_blob)
  if closure_sha is not None and digest!=closure_sha:raise ValueError('Private closure changed before deletion')
  return digest,closed_blob,ack_blob
 def inspect(self):
  self.archive();closure_sha,closed,ack=self.ownership();files,directories=self.scan();retained=files-set(self.payload)
  locks={name for name in retained if re.fullmatch(r'engine/target-[a-f0-9]{64}\.lock',name)}
  if len(locks)!=1 or retained!=set(self.fixed)|locks:raise ValueError('Exact retained private recovery metadata required')
  rows={}
  for name in sorted(retained):
   data=self.read(name);rows[name]={'sha256':backup.sha(data),'bytes':len(data)}
   if name in locks and data!=b'':raise ValueError('Unknown target lock bytes preserved')
  raw_plan=backup.decode(self.read('engine/'+self.id+'/plan.json'));journal=backup.decode(self.read('engine/'+self.id+'/journal.json'));changed={name for name,value in self.plan['expected'].items() if self.plan['prior'].get(name)!=value}
  if raw_plan!=self.plan or not isinstance(journal,dict) or set(journal)!={'binding','phase','intents','backups','events'} or not backup.digest(journal['binding']) or journal['phase']!='rolled-back' or not isinstance(journal['intents'],dict) or not set(journal['intents'])<=changed or any(value is not True for value in journal['intents'].values()) or journal['backups']!=self.required_prior or not isinstance(journal['events'],list) or len(journal['events'])>5000 or any(not isinstance(event,str) or not 1<=len(event)<=1024 for event in journal['events']):raise ValueError('Known terminal engine metadata required; unknown data preserved')
  for name in sorted(files&set(self.payload)):
   data=self.read(name);expected=self.payload[name]
   if len(data)!=expected['bytes'] or backup.sha(data)!=expected['sha256']:raise ValueError('Changed private payload preserved')
  return {'closureSha256':closure_sha,'files':files,'directories':directories,'retained':rows}
 def fence(self,initial):
  closure,closed,ack=self.ownership(initial['closureSha256'])
  if backup.sha(ack)!=initial['retained']['control/backup-ack.json']['sha256']:raise ValueError('Private acknowledgment changed before mutation')
  for name,row in initial['retained'].items():
   if not name.startswith('engine/'):continue
   data=self.read(name)
   if len(data)!=row['bytes'] or backup.sha(data)!=row['sha256']:raise ValueError('Retained engine metadata changed before mutation')
 def dispose(self):
  try:
   initial=self.inspect();present=initial['files']&set(self.payload);removed=[];removed_dirs=[]
   # Keep the full raw original until every other disposable payload member has been handled.
   order=sorted(present-{'control/original-state.json'})+(['control/original-state.json'] if 'control/original-state.json' in present else [])
   for name in order:
    if self.observer:self.observer('before-delete',name)
    self.archive();self.fence(initial);files,dirs=self.scan()
    if name not in files:raise ValueError('Private state changed; explicitly inspect before resuming disposal')
    data=self.read(name);expected=self.payload[name]
    if len(data)!=expected['bytes'] or backup.sha(data)!=expected['sha256']:raise ValueError('Changed private payload preserved before deletion')
    self.connection.delete(self.path(name));removed.append(name)
    if self.observer:self.observer('after-delete',name)
    files,dirs=self.scan()
    if name in files:raise ValueError('Private deletion not confirmed; inspect before resuming')
   retained_dirs=set()
   for name in initial['retained']:retained_dirs.update(self.parents(name))
   retained_dirs.update({'engine/'+self.id+'/receipts','engine/'+self.id+'/pending'})
   removable=self.directories-retained_dirs
   for name in sorted(initial['directories']&removable,key=lambda item:(-item.count('/'),item)):
    if self.observer:self.observer('before-rmdir',name)
    self.archive();self.fence(initial);files,dirs=self.scan()
    if name not in dirs:raise ValueError('Private directories changed; inspect before resuming')
    self.facts(name,'dir')
    if any(entry not in ('.','..') for entry,facts in self.connection.mlsd(self.path(name))):raise ValueError('Nonempty private directory preserved')
    self.connection.rmd(self.path(name));removed_dirs.append(name)
    if self.observer:self.observer('after-rmdir',name)
   final=self.inspect()
   if final['files']&set(self.payload) or final['retained']!=initial['retained'] or final['directories']&removable:raise ValueError('Private payload absence or retained metadata differs')
   return {'scope':'private-staging-fixture-disposal','phase':'verified-payload-removed','transactionId':self.id,'applicationCommit':self.packet['applicationCommit'],'planSha256':staging.binding(self.plan)['planSha256'],'manifestSha256':self.manifest['manifestSha256'],'archiveSha256':self.receipt['archiveSha256'],'closureSha256':final['closureSha256'],'removedPayloadFiles':len(removed),'alreadyAbsentPayloadFiles':len(self.payload)-len(present),'removedDirectories':len(removed_dirs),'retainedMetadata':final['retained'],'retainedDirectories':sorted(final['directories']),'rawOriginalStateRemoved':True,'declaredSyntheticPayloadRemoved':True,'originalArchivePreserved':True,'publicApplicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionOperations':0}
  except Exception:raise PrivateDisposalError('Private disposal stopped; preserve evidence, verify the archive and inspect before explicit recovery; no automatic retry') from None
