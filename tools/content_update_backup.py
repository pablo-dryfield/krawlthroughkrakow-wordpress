"""Independent private rollback ZIP construction. Pure reader injection; no connection or release permission."""
from __future__ import annotations
import hashlib,hmac,json,re,zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ACTIVATION='ktk-code-pages-production.php'
ACTIVATION_SHA='b8a99198a1d910ea2c7266bf5ad1cafc9bc89844f0313b0aeb80a1e1c520d833'
RECORDS={'records/original-state.json':'original-state.json','records/controller-plan.json':'controller-plan.json'}
REQUIRED_FIELDS={'schemaVersion','scope','mode','transactionId','applicationCommit','rootBinding','enginePlanSha256','originalStateSha256','protectedStateSha256','members','bytes','activationWrites','databaseWrites','applicationWrites','cachePurges','manifestSha256'}

def sha(value):return hashlib.sha256(value).hexdigest()
def encode(value,sort=False):return json.dumps(value,ensure_ascii=False,separators=(',',':'),sort_keys=sort).replace('\u2028','\\u2028').replace('\u2029','\\u2029').encode()
def digest(value):return isinstance(value,str) and re.fullmatch('[a-f0-9]{64}',value) is not None
def identifier(value,length):return isinstance(value,str) and re.fullmatch('[a-f0-9]{'+str(length)+'}',value) is not None
def unique_object(pairs):
 result={}
 for key,value in pairs:
  if key in result:raise ValueError('Duplicate private metadata key')
  result[key]=value
 return result
def decode(value):return json.loads(value,object_pairs_hook=unique_object,parse_constant=lambda _:(_ for _ in ()).throw(ValueError('Invalid private metadata number')))

def owned_name(name,activation=False):
 if not isinstance(name,str) or not re.fullmatch('[A-Za-z0-9._/-]+',name) or any(part in ('','.','..') for part in name.split('/')) or not(name=='ktk-code-pages.php' or name.startswith('ktk-code-pages-assets/') or activation and name==ACTIVATION):raise ValueError('Exact owned backup path required')

def validate_manifest(value):
 if not isinstance(value,dict) or set(value)!=REQUIRED_FIELDS or type(value['schemaVersion']) is not int or value['schemaVersion']!=1 or value['scope']!='code-pages-private-rollback-manifest' or value['mode'] not in ('production','private-staging-rehearsal') or not identifier(value['transactionId'],32) or not identifier(value['applicationCommit'],40):raise ValueError('Exact private rollback manifest required')
 for name in ('rootBinding','enginePlanSha256','originalStateSha256','protectedStateSha256','manifestSha256'):
  if not digest(value[name]):raise ValueError('Exact private manifest digest required')
 for name in ('activationWrites','databaseWrites','applicationWrites','cachePurges'):
  if type(value[name]) is not int or value[name]!=0:raise ValueError('Private export cannot authorize mutations')
 if sha(encode({k:v for k,v in value.items() if k!='manifestSha256'},sort=True))!=value['manifestSha256']:raise ValueError('Private manifest fingerprint differs')
 members=value['members']
 if not isinstance(members,dict) or not 5<=len(members)<=5000 or not all(isinstance(name,str) for name in members) or not set(RECORDS)<=set(members) or len({name.casefold() for name in members})!=len(members):raise ValueError('Complete unambiguous private member set required')
 total=0
 for name,row in members.items():
  if not isinstance(row,dict) or not digest(row.get('sha256')) or type(row.get('bytes')) is not int or not 0<=row['bytes']<=16779264:raise ValueError('Bounded private member checksum/size required')
  if name in RECORDS:
   if set(row)!={'source','sha256','bytes','payloadSha256'} or not digest(row['payloadSha256']) or row['source']!='control/'+RECORDS[name]:raise ValueError('Exact private record source required')
  else:
   if not name.startswith('prior/'):raise ValueError('Exact prior member namespace required')
   relative=name[len('prior/'):];owned_name(relative,True)
   if set(row)!={'source','sha256','bytes'} or row['source']!='engine/'+value['transactionId']+'/prior/'+relative or row['bytes']>16777216:raise ValueError('Exact private prior source required')
  total+=row['bytes']
 required={'prior/'+ACTIVATION,'prior/ktk-code-pages.php','prior/ktk-code-pages-assets/registry.php'}
 if not required<=set(members) or members['prior/'+ACTIVATION]['sha256']!=ACTIVATION_SHA or type(value['bytes']) is not int or value['bytes']!=total or total>134217728:raise ValueError('Complete bounded active prior backup required')
 return value

def record_payload(blob,name,manifest,key):
 parts=blob.split(b'\n',2)
 if len(parts)!=3 or parts[0]!=b'KTK-PRIVATE-1' or len(parts[1])>1024:raise ValueError('Signed private record envelope required')
 meta=decode(parts[1]);body=parts[2]
 expected={'name':name,'transactionId':manifest['transactionId'],'rootBinding':manifest['rootBinding'],'bytes':len(body),'sha256':sha(body)}
 expected['mac']=hmac.new(key.encode(),encode(expected),hashlib.sha256).hexdigest()
 if not isinstance(meta,dict) or meta!=expected or encode(expected)!=parts[1]:raise ValueError('Private record signature or root binding differs')
 return body

def validate_payloads(payloads,manifest):
 raw=payloads['original-state.json'];state=decode(raw);control=decode(payloads['controller-plan.json'])
 if not isinstance(state,dict) or not isinstance(control,dict):raise ValueError('Private state/controller objects required')
 if not all(isinstance(state.get(name),dict) for name in ('identity','database','protectedFiles')):raise ValueError('Complete selected-state maps required')
 expected_scope='production-protected-original-state' if manifest['mode']=='production' else 'staging-protected-original-state';home='https://krawlthroughkrakow.com/' if manifest['mode']=='production' else 'https://krawlthroughkrakow.com/staging/'
 if type(state.get('schemaVersion')) is not int or state['schemaVersion']!=1 or state.get('scope')!=expected_scope or state.get('ownedInventoryIncluded',True) is not True or not isinstance(state.get('ownedContentFiles'),dict) or len(state['ownedContentFiles'])<2:raise ValueError('Full selected original snapshot required; fingerprint is not a backup')
 if state.get('identity',{}).get('home')!=home or state['identity'].get('siteurl')!=home or type(state['identity'].get('blogPublic')) is not int or state['identity']['blogPublic']!=(1 if manifest['mode']=='production' else 0):raise ValueError('Original snapshot identity differs')
 if set(state.get('database',{}))!={'posts','postmeta','options','terms','term_taxonomy','term_relationships','termmeta'} or sha(encode(state['database']))!=state.get('databaseSha256'):raise ValueError('Original selected database hash differs')
 protected=sha(encode({'identity':state['identity'],'databaseSha256':state['databaseSha256'],'files':state['protectedFiles']}))
 if protected!=state.get('protectedStateSha256') or protected!=manifest['protectedStateSha256'] or sha(raw)!=manifest['originalStateSha256']:raise ValueError('Original protected snapshot hash differs')
 for name in ('databaseWrites','applicationWrites','cachePurges'):
  if type(state.get(name)) is not int or state[name]!=0:raise ValueError('Snapshot claims unauthorized mutation')
 plan=control.get('enginePlan');required_keys={'transactionId','applicationCommit','protectedStateSha256','expected','prior'}
 if not isinstance(plan,dict) or set(plan)!=required_keys or type(control.get('schemaVersion')) is not int or control['schemaVersion']!=1 or control.get('mode')!=manifest['mode'] or control.get('transactionId')!=manifest['transactionId'] or control.get('applicationCommit')!=manifest['applicationCommit'] or control.get('originalStateSha256')!=sha(raw) or plan['transactionId']!=manifest['transactionId'] or plan['applicationCommit']!=manifest['applicationCommit'] or plan['protectedStateSha256']!=protected or sha(encode(plan,sort=True))!=manifest['enginePlanSha256']:raise ValueError('Private controller/engine plan binding differs')
 for kind in ('expected','prior'):
  values=plan[kind]
  if not isinstance(values,dict) or len({name.casefold() for name in values})!=len(values):raise ValueError('Unambiguous engine inventory required')
  for name,value in values.items():
   owned_name(name,kind=='prior')
   if not digest(value):raise ValueError('Exact engine inventory digest required')
 if plan['prior'].get(ACTIVATION)!=ACTIVATION_SHA or ACTIVATION in plan['expected'] or set(plan['prior'])-set(plan['expected'])-{ACTIVATION}:raise ValueError('Immutable activation/prior inventory differs')
 if manifest['mode']=='production' and (state['ownedContentFiles']!={name:value for name,value in plan['prior'].items() if name!=ACTIVATION} or state['protectedFiles'].get('mu/'+ACTIVATION)!=ACTIVATION_SHA):raise ValueError('Original production-owned inventory differs from target prior state')
 for name in ['ktk-code-pages.php','ktk-code-pages-assets/registry.php','ktk-code-pages-assets/runtime.css','ktk-code-pages-assets/runtime.js']:
  if name not in plan['expected'] or name not in plan['prior']:raise ValueError('Complete active engine inventory required')
 required={ACTIVATION:ACTIVATION_SHA,'ktk-code-pages.php':plan['prior']['ktk-code-pages.php'],'ktk-code-pages-assets/registry.php':plan['prior']['ktk-code-pages-assets/registry.php']}
 required.update({name:plan['prior'][name] for name,value in plan['expected'].items() if name in plan['prior'] and plan['prior'][name]!=value})
 actual={name[len('prior/'):]:row['sha256'] for name,row in manifest['members'].items() if name.startswith('prior/')}
 if actual!=required:raise ValueError('Changed-file rollback set is incomplete or unexpected')

def safe_output(value):
 path=Path(value);allowed=(ROOT/'deploy-backups').resolve();candidates=[path,*path.parents]
 if not path.is_absolute() or any(p.is_symlink() for p in candidates) or not path.resolve().is_relative_to(allowed) or path.exists() or path.suffix!='.zip':raise ValueError('Fresh private backup ZIP inside deploy-backups required')
 path.parent.mkdir(parents=True,exist_ok=True);return path

def verify_archive(path,key,expected_manifest=None):
 if not digest(key):raise ValueError('Private record verification key required')
 path=Path(path)
 with zipfile.ZipFile(path) as archive:
  infos=archive.infolist();names=[info.filename for info in infos]
  if len(names)!=len(set(names)) or len(names)!=len({name.casefold() for name in names}) or 'backup-manifest.json' not in names:raise ValueError('Unambiguous complete backup archive required')
  info=archive.getinfo('backup-manifest.json')
  if info.file_size>2097152:raise ValueError('Backup manifest budget exceeded')
  manifest=validate_manifest(decode(archive.read(info)))
  if expected_manifest is not None and manifest!=expected_manifest:raise ValueError('Archive manifest differs from the authenticated export')
  if set(names)!=set(manifest['members'])|{'backup-manifest.json'}:raise ValueError('Archive member set differs')
  payloads={}
  for name,row in manifest['members'].items():
   info=archive.getinfo(name)
   if info.is_dir() or info.file_size!=row['bytes'] or info.flag_bits&1:raise ValueError('Exact unencrypted private member size required')
   with archive.open(info) as stream:data=stream.read(row['bytes']+1)
   if len(data)!=row['bytes'] or sha(data)!=row['sha256']:raise ValueError('Archive member checksum differs')
   if name in RECORDS:
    raw=record_payload(data,RECORDS[name],manifest,key)
    if sha(raw)!=row['payloadSha256']:raise ValueError('Private record payload fingerprint differs')
    payloads[RECORDS[name]]=raw
  validate_payloads(payloads,manifest)
  if archive.testzip() is not None:raise ValueError('Private archive CRC differs')
 with path.open('rb') as stream:archive_sha=hashlib.file_digest(stream,'sha256').hexdigest()
 return {'phase':'private-archive-verified','transactionId':manifest['transactionId'],'applicationCommit':manifest['applicationCommit'],'manifestSha256':manifest['manifestSha256'],'archiveSha256':archive_sha,'archiveBytes':path.stat().st_size,'memberCount':len(names),'allMemberChecksumsAndCRCVerified':True,'fullOriginalAndPriorSetVerified':True,'mode':manifest['mode'],'callerMustVerifyProvenance':True,'ownerApproved':False,'applicationWritesAuthorized':False}

def build_archive(manifest,reader,key,destination):
 validate_manifest(manifest)
 if not digest(key):raise ValueError('Private record verification key required')
 path=safe_output(destination)
 with zipfile.ZipFile(path,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
  archive.writestr('backup-manifest.json',encode(manifest,sort=True))
  for name,row in manifest['members'].items():
   data=reader(row['source'])
   if not isinstance(data,bytes) or len(data)!=row['bytes'] or sha(data)!=row['sha256']:raise ValueError('Downloaded private member checksum differs; partial archive preserved')
   archive.writestr(name,data)
 return verify_archive(path,key,manifest)
