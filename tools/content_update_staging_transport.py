"""Exact staging RPC and manifest-scoped private reads. No helper installer, cleanup, retries or production endpoint."""
from __future__ import annotations
import re,secrets,time,urllib.request
from tools import content_update_backup as backup
from tools.content_update_client import ACTIONS

URL='https://krawlthroughkrakow.com/staging/'
MAX_RESPONSE=4194304

class StagingTransportError(RuntimeError):pass

def has_no_store(headers):
 for header in headers or []:
  parts=[];part='';quoted=False;escaped=False
  for char in header:
   if escaped:part+=char;escaped=False;continue
   if quoted and char=='\\':part+=char;escaped=True;continue
   if char=='"':quoted=not quoted
   if char==',' and not quoted:parts.append(part);part=''
   else:part+=char
  if not quoted and not escaped and any(value.strip().lower()=='no-store' for value in [*parts,part]):return True
 return False

class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,request,fp,code,msg,headers,newurl):raise StagingTransportError('Private staging redirects refused')

class StagingControllerTransport:
 def __init__(self,binding,helper_sha256,token,expires,opener=None,clock=time.time):
  if not isinstance(binding,dict) or list(binding)!=['transactionId','applicationCommit','planSha256'] or not backup.identifier(binding['transactionId'],32) or not backup.identifier(binding['applicationCommit'],40) or not backup.digest(binding['planSha256']) or not backup.digest(helper_sha256) or not isinstance(token,str) or re.fullmatch('[A-Za-z0-9_-]{43}',token) is None or type(expires) is not int or not clock()<expires<=clock()+3600:raise ValueError('Exact expiring staging transport binding required')
  self.binding=dict(binding);self.helper_sha256=helper_sha256;self.token=token;self.expires=expires;self.clock=clock;self.opener=opener or urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
 def __call__(self,raw):
  if not isinstance(raw,bytes) or len(raw)>2048 or self.clock()>=self.expires:raise StagingTransportError('Current bounded staging request required')
  try:
   value=backup.decode(raw);action=value.get('action') if isinstance(value,dict) else None
   if action not in ACTIONS or list(value)!=['schemaVersion','action',*self.binding,*ACTIONS[action]] or type(value['schemaVersion']) is not int or value['schemaVersion']!=1 or backup.encode(value)!=raw or any(value[key]!=expected for key,expected in self.binding.items()) or any(not backup.digest(value[key]) for key in ACTIONS[action]):raise ValueError('Canonical bound request required')
  except Exception:raise StagingTransportError('Exact canonical staging request required') from None
  target=URL+'?ktk_private_controller='+self.binding['transactionId']+'&request='+secrets.token_hex(16)
  request=urllib.request.Request(target,data=raw,method='POST',headers={'X-KTK-Content-Update-Token':self.token,'Content-Type':'application/json','Cache-Control':'no-cache','User-Agent':'KTK private staging controller/1.0'})
  try:
   with self.opener.open(request,timeout=180) as response:
    controls=response.headers.get_all('Cache-Control') if hasattr(response.headers,'get_all') else [response.headers.get('Cache-Control','')]
    no_store=has_no_store(controls)
    if response.status!=200 or response.geturl()!=target or response.headers.get('CF-Cache-Status','').upper() not in ('DYNAMIC','BYPASS') or not no_store or response.headers.get('Content-Type','').split(';',1)[0].strip().lower()!='application/json':raise ValueError('Exact uncached JSON response required')
    payload=response.read(MAX_RESPONSE+1)
    if len(payload)>MAX_RESPONSE:raise ValueError('Private response budget exceeded')
    envelope=backup.decode(payload)
   if not isinstance(envelope,dict) or set(envelope)!={'helperSha256','controller'} or envelope['helperSha256']!=self.helper_sha256 or not isinstance(envelope['controller'],dict) or envelope['controller'].get('mode')!='private-staging-rehearsal' or any(envelope['controller'].get(key)!=expected for key,expected in self.binding.items()):raise ValueError('Exact staging helper/release response required')
   return envelope
  except Exception:raise StagingTransportError('Private staging response failed verification; inspect before further mutation, with no automatic retry') from None

def mlst_facts(reply,path):
 if not isinstance(reply,str) or len(reply)>8192 or re.match(r'^250[ -]',reply) is None:raise ValueError('Bounded exact-path metadata response required')
 rows=[]
 for line in reply.splitlines():
  match=re.fullmatch(r'\s*((?:[A-Za-z][A-Za-z0-9.]*=[^;\r\n]*;)+) ([^\r\n]+)',line)
  if match:
   facts={}
   for field in match[1].strip(';').split(';'):
    key,value=field.split('=',1);key=key.lower()
    if key in facts:raise ValueError('Duplicate private metadata fact')
    facts[key]=value
   rows.append((match[2],facts))
 if len(rows)!=1 or rows[0][0]!=path:raise ValueError('Exact requested private metadata path required')
 return rows[0][1]

class PrivateBackupReader:
 """An injected raw FTPS connection may only inspect/read exact exported members; no login or writer."""
 def __init__(self,connection,transaction,manifest):
  backup.validate_manifest(manifest)
  if not backup.identifier(transaction,32) or manifest['transactionId']!=transaction or manifest['mode']!='private-staging-rehearsal':raise ValueError('Exact private staging export required')
  self.connection=connection;self.root='/.ktk-content-update-'+transaction;self.rows={row['source']:dict(row) for row in manifest['members'].values()}
  if len(self.rows)!=len(manifest['members']):raise ValueError('Unambiguous private export sources required')
  self.allowed={self.root:'dir'}
  for source in self.rows:
   parts=source.split('/')
   for index in range(1,len(parts)+1):
    path=self.root+'/'+('/'.join(parts[:index]));kind='file' if index==len(parts) else 'dir'
    if path in self.allowed and self.allowed[path]!=kind:raise ValueError('Private file/directory namespace collision refused')
    self.allowed[path]=kind
 def metadata(self,path,kind):
  if self.allowed.get(path)!=kind:raise ValueError('Only exact exported private members and their ancestors may be inspected')
  facts=mlst_facts(self.connection.sendcmd('MLST '+path),path)
  if facts.get('type')!=kind:raise ValueError('Private symlink or unexpected file type refused')
  return facts
 def __call__(self,source):
  if not isinstance(source,str) or source not in self.rows:raise ValueError('Only an exact authenticated export member may be read')
  row=self.rows[source];path=self.root+'/'+source;parts=source.split('/');directories=[self.root]+[self.root+'/'+('/'.join(parts[:index])) for index in range(1,len(parts))]
  try:
   before={directory:self.metadata(directory,'dir') for directory in directories};file_before=self.metadata(path,'file')
   if not re.fullmatch('[0-9]+',file_before.get('size','')) or int(file_before['size'])!=row['bytes']:raise ValueError('Private member size differs before transfer')
   chunks=[];length=0
   def receive(part):
    nonlocal length
    if not isinstance(part,bytes):raise ValueError('Binary private transfer required')
    length+=len(part)
    if length>row['bytes']:raise ValueError('Private transfer budget exceeded')
    chunks.append(part)
   self.connection.retrbinary('RETR '+path,receive);data=b''.join(chunks)
   if len(data)!=row['bytes'] or backup.sha(data)!=row['sha256'] or self.metadata(path,'file')!=file_before or any(self.metadata(directory,'dir')!=facts for directory,facts in before.items()):raise ValueError('Private member or ancestors changed during transfer')
   return data
  except Exception:raise StagingTransportError('Exact private backup read failed; no unverified bytes returned and no automatic retry') from None
