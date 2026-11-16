"""Metadata-only authenticated early/late WordPress entry comparison; no updater or production mode."""
from __future__ import annotations
import re,secrets,time,urllib.request,urllib.error
from pathlib import Path
from tools import content_update_backup as backup
from tools import full_inventory_capacity as capacity
from tools.full_private_seed_transport import failure_headers
from tools.content_update_staging_transport import NoRedirect,has_no_store

ROOT=Path(__file__).resolve().parents[1];TEMPLATE=ROOT/'tools/staging-private-entry-probe-template.php';CORE=ROOT/'tools/staging-protected-state-core.php';URL='https://krawlthroughkrakow.com/staging/'
FUNCTIONS={'home_url','site_url','get_option','nocache_headers','wp_send_json','did_action','is_multisite'}
TABLES={'posts','postmeta','options','terms','term_taxonomy','term_relationships','termmeta'}

def inventory(owned):
    if not isinstance(owned,dict) or not 2<=len(owned)<=10000 or not {'ktk-code-pages.php','ktk-code-pages-assets/registry.php'}<=set(owned) or len({n.casefold() for n in owned if isinstance(n,str)})!=len(owned):raise ValueError('Complete unambiguous staging owned inventory required')
    for n,s in owned.items():
        backup.owned_name(n)
        if not backup.digest(s):raise ValueError('Exact staging owned hashes required')
    return owned

def helper_source(name,token,expires,owned):
    match=re.fullmatch(r'ktk-state-snapshot-([a-f0-9]{32})\.php',name) if isinstance(name,str) else None
    if match is None or not isinstance(token,str) or re.fullmatch(r'[A-Za-z0-9_-]{43}',token) is None or type(expires) is not int or not int(time.time())<expires<=int(time.time())+300:raise ValueError('Exact short-lived staging entry probe required')
    inventory(owned);source=TEMPLATE.read_bytes();core=CORE.read_bytes()
    if not core.startswith(b'<?php\n') or backup.sha(core)!=capacity.CORE_SHA:raise ValueError('Unchanged raw selected-state core required')
    values={'ID':match[1].encode(),'EXPIRES':str(expires).encode(),'TOKEN_SHA':backup.sha(token.encode()).encode(),'HELPER':name.encode(),'OWNED_SHA':backup.sha(backup.encode(owned,sort=True)).encode(),'OWNED_COUNT':str(len(owned)).encode()}
    for k,v in values.items():
        marker=('__KTK_ENTRY_'+k+'__').encode()
        if source.count(marker)!=1:raise ValueError('Exact private-entry compiler marker required')
        source=source.replace(marker,v)
    marker=b'/* __KTK_ENTRY_STATE__ */'
    if source.count(marker)!=1:raise ValueError('Exact private-entry state marker required')
    source=source.replace(marker,core[6:])
    if b'__KTK_ENTRY_' in source:raise ValueError('Unresolved entry compiler marker')
    return source

def snapshot_metadata(snapshot,helper_sha):
    value={**snapshot,'helperSha256':helper_sha};value.pop('capturedAt',None)
    return {'protectedStateSha256':snapshot['protectedStateSha256'],'databaseSha256':snapshot['databaseSha256'],'identitySha256':backup.sha(backup.encode(snapshot['identity'],sort=True)),'ownedFilesSha256':backup.sha(backup.encode(snapshot['ownedContentFiles'],sort=True)),'protectedFilesSha256':backup.sha(backup.encode(snapshot['protectedFiles'],sort=True)),'normalizedSnapshotSha256':backup.sha(backup.encode(value,sort=True)),'rowCounts':snapshot['rowCounts'],'ownedFileCount':len(snapshot['ownedContentFiles']),'protectedFileCount':len(snapshot['protectedFiles'])}

def validate_metadata(v,profile,helper_sha,owned):
    fields={'schemaVersion','scope','profile','hook','helperSha256','serverEpoch','requiredFunctions','isMultisite','phases','regularPlugins','snapshot','runtime','applicationWrites','databaseWrites','cachePurges','productionOperations'}
    if not isinstance(v,dict) or set(v)!=fields or type(v['schemaVersion']) is not int or v['schemaVersion']!=1 or v['scope']!='staging-private-entry-readonly' or v['profile']!=profile or v['hook']!={'early':'muplugins_loaded','late':'wp_loaded'}.get(profile) or v['helperSha256']!=helper_sha or type(v['serverEpoch']) is not int or v['serverEpoch']<=0 or type(v['isMultisite']) is not bool or any(type(v[k]) is not int or v[k]!=0 for k in ('applicationWrites','databaseWrites','cachePurges','productionOperations')):raise ValueError('Exact metadata-only staging entry response required')
    if not isinstance(v['requiredFunctions'],dict) or set(v['requiredFunctions'])!=FUNCTIONS or any(x is not True for x in v['requiredFunctions'].values()):raise ValueError('All private-entry capabilities must be available')
    phases=v['phases'];expected={'muplugins_loaded':1,'plugins_loaded':0,'wp_loaded':0} if profile=='early' else {'muplugins_loaded':1,'plugins_loaded':1,'wp_loaded':1}
    if not isinstance(phases,dict) or phases!=expected or any(type(x) is not int for x in phases.values()):raise ValueError('Actual WordPress entry phase differs')
    p=v['regularPlugins']
    if not isinstance(p,dict) or set(p)!={'declared','included','ecwidDeclared','ecwidIncluded'} or type(p['declared']) is not int or type(p['included']) is not int or not 0<=p['included']<=p['declared']<=1000 or any(type(p[k]) is not bool for k in ('ecwidDeclared','ecwidIncluded')) or p['ecwidIncluded'] and not p['ecwidDeclared']:raise ValueError('Bounded plugin inclusion observations required')
    s=v['snapshot'];keys={'protectedStateSha256','databaseSha256','identitySha256','ownedFilesSha256','protectedFilesSha256','normalizedSnapshotSha256','rowCounts','ownedFileCount','protectedFileCount'}
    if not isinstance(s,dict) or set(s)!=keys or any(not backup.digest(s[k]) for k in keys-{'rowCounts','ownedFileCount','protectedFileCount'}) or not isinstance(s['rowCounts'],dict) or set(s['rowCounts'])!=TABLES or any(type(x) is not int or not 0<=x<=1000000 for x in s['rowCounts'].values()) or type(s['ownedFileCount']) is not int or s['ownedFileCount']!=len(inventory(owned)) or s['ownedFilesSha256']!=backup.sha(backup.encode(owned,sort=True)) or type(s['protectedFileCount']) is not int or not 0<s['protectedFileCount']<=10000:raise ValueError('Complete full-state entry hashes/counts required')
    runtime=v['runtime']
    if not isinstance(runtime,dict) or set(runtime)!={'phpVersionId','peakAllocatedBytes','memoryLimit','maxExecutionTime'} or type(runtime['phpVersionId']) is not int or not 80100<=runtime['phpVersionId']<100000 or type(runtime['peakAllocatedBytes']) is not int or not 0<runtime['peakAllocatedBytes']<=1073741824 or any(not isinstance(runtime[k],str) or not 1<=len(runtime[k])<=64 or any(not 32<=ord(c)<127 for c in runtime[k]) for k in ('memoryLimit','maxExecutionTime')):raise ValueError('Bounded observed entry runtime metadata required')
    return v

class EntryProbeClient:
    def __init__(self,identifier,token,expires,helper_sha,owned,opener=None,clock=time.time):
        if not backup.identifier(identifier,32) or not isinstance(token,str) or re.fullmatch(r'[A-Za-z0-9_-]{43}',token) is None or type(expires) is not int or not clock()<expires<=clock()+300 or not backup.digest(helper_sha):raise ValueError('Exact current private entry client required')
        self.identifier=identifier;self.token=token;self.expires=expires;self.helper_sha=helper_sha;self.owned=inventory(owned);self.opener=opener or urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect());self.clock=clock;self.last_failure=None;self.last_request_seconds=None;self.profile_targets={}
    def target(self,profile):
        if profile not in ('early','late'):raise ValueError('Exact private entry profile required')
        if profile not in self.profile_targets:self.profile_targets[profile]=URL+'?ktk_private_entry_probe='+self.identifier+'&entry='+profile+'&request='+secrets.token_hex(16)
        return self.profile_targets[profile]
    def inspect(self,profile):
        self.last_failure=None;self.last_request_seconds=None
        if self.clock()>=self.expires:raise ValueError('Expired private entry client cannot query')
        target=self.target(profile);req=urllib.request.Request(target,data=b'{"schemaVersion":1,"action":"inspect"}',method='POST',headers={'X-KTK-Entry-Probe-Token':self.token,'Content-Type':'application/json','Cache-Control':'no-cache','User-Agent':'KTK private entry probe/1.0'});start=time.perf_counter();observed={'profile':profile,'status':None,'headers':{},'responseBytes':None}
        try:
            with self.opener.open(req,timeout=60) as response:
                observed.update(status=response.status,headers=failure_headers(response.headers,self.token));controls=response.headers.get_all('Cache-Control') if hasattr(response.headers,'get_all') else [response.headers.get('Cache-Control','')]
                if response.status!=200 or response.geturl()!=target or response.headers.get('CF-Cache-Status','').upper() not in ('DYNAMIC','BYPASS') or response.headers.get('Content-Type','').split(';')[0].strip().lower()!='application/json' or not has_no_store(controls):raise ValueError('Exact uncached private entry JSON required')
                raw=response.read(32769);observed['responseBytes']=len(raw)
                if len(raw)>32768:raise ValueError('Private entry metadata response exceeds budget')
                result=backup.decode(raw)
            return validate_metadata(result,profile,self.helper_sha,self.owned)
        except Exception as error:
            if isinstance(error,urllib.error.HTTPError):
                observed.update(status=error.code,headers=failure_headers(error.headers,self.token))
                if error.code==409 and error.headers.get('Content-Type','').split(';')[0].strip().lower()=='application/json':
                    try:
                        raw=error.read(4097)
                        if len(raw)<=4096:
                            safe=backup.decode(raw)
                            if isinstance(safe,dict) and set(safe)=={'error','requiredFunctions'} and safe['error']=='entry_capability_unavailable' and isinstance(safe['requiredFunctions'],dict) and set(safe['requiredFunctions'])==FUNCTIONS and all(type(v) is bool for v in safe['requiredFunctions'].values()):observed['safeCapabilityError']=safe
                            elif isinstance(safe,dict) and set(safe)=={'error','failureType'} and safe['error']=='private_entry_probe_failed' and isinstance(safe['failureType'],str) and re.fullmatch(r'[A-Za-z_\\]{1,128}',safe['failureType']):observed['safeCapabilityError']={'error':safe['error'],'failureType':safe['failureType'].replace(self.token,'[redacted]')}
                    except Exception:pass
            self.last_failure={'type':type(error).__name__,**observed};raise RuntimeError('Private entry response uncertain; inspect sanitized evidence without retry') from None
        finally:self.last_request_seconds=time.perf_counter()-start
    def normal(self,token=None,method='GET'):
        self.last_failure=None;self.last_request_seconds=None
        if method not in ('GET','POST'):raise ValueError('Only read-only ordinary GET/inspect-POST controls permitted')
        target=self.target('early');headers={'Cache-Control':'no-cache','Pragma':'no-cache','User-Agent':'KTK private entry probe/1.0'}
        data=None
        if method=='POST':headers['Content-Type']='application/json';data=b'{"schemaVersion":1,"action":"inspect"}'
        if token is not None:
            if not isinstance(token,str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}',token):raise ValueError('Bounded normal-request token control required')
            headers['X-KTK-Entry-Probe-Token']=token
        request=urllib.request.Request(target,data=data,method=method,headers=headers);start=time.perf_counter();observed={'profile':'normal','method':method,'status':None,'headers':{},'responseBytes':None}
        try:
            with self.opener.open(request,timeout=60) as response:
                observed.update(status=response.status,headers=failure_headers(response.headers,self.token))
                if response.status!=200 or response.geturl()!=target or response.headers.get('Content-Type','').split(';')[0].strip().lower()!='text/html':raise RuntimeError('Normal request did not remain an exact same-host HTML response')
                if method=='POST' and response.headers.get('CF-Cache-Status','').upper() not in ('DYNAMIC','BYPASS'):raise RuntimeError('Ordinary inspect-POST control must be uncached')
                raw=response.read(4194305);observed['responseBytes']=len(raw)
                if len(raw)>4194304:raise RuntimeError('Normal request exceeds bounded HTML response budget')
                return {'status':response.status,'method':method,'mime':'text/html','bytes':len(raw),'sha256':backup.sha(raw),'cache':response.headers.get('CF-Cache-Status'),'seconds':time.perf_counter()-start}
        except Exception as error:
            if isinstance(error,urllib.error.HTTPError):observed.update(status=error.code,headers=failure_headers(error.headers,self.token))
            if token:
                observed['headers']={k:v.replace(token,'[redacted]') for k,v in observed['headers'].items()}
            self.last_failure={'type':type(error).__name__,**observed};raise RuntimeError('Normal entry control response uncertain; inspect metadata without retry') from None
        finally:self.last_request_seconds=time.perf_counter()-start
