"""Explicit staging full-engine HTTP transport. No retries, production mode or credential storage."""
from __future__ import annotations
import hashlib,hmac,json,re,secrets,time,urllib.request,urllib.error
from pathlib import PurePosixPath
from tools import content_update_backup as backup
from tools import full_private_seed_packet as full
from tools.full_private_seed_transport import failure_headers
from tools.content_update_staging_transport import NoRedirect,has_no_store
from tools.content_update_client import ACTIONS,UncertainRequest
from tools.full_private_engine_client import PROFILE
from tools.full_private_engine_packet import MAX_LIFETIME

URL='https://krawlthroughkrakow.com/staging/'
MAX_RESPONSE=2097152

class FullPrivateEngineTransport:
    def __init__(self,plan,helper_sha,token,expires,opener=None,clock=time.time):
        if not isinstance(plan,dict) or not backup.identifier(plan.get('transactionId'),32) or not backup.identifier(plan.get('applicationCommit'),40) or not backup.digest(helper_sha) or not isinstance(token,str) or re.fullmatch(r'[A-Za-z0-9_-]{43}',token) is None or type(expires) is not int or not clock()<expires<=clock()+MAX_LIFETIME:raise ValueError('Exact explicit current full private engine transport required')
        self.plan=plan;self.binding=full.binding(plan);self.helper_sha=helper_sha;self.token=token;self.expires=expires;self.clock=clock;self.opener=opener or urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect());self.original_ack=None;self.original_archive=None;self.last_failure=None;self.last_request_seconds=None;self.last_runtime=None;self.last_observation=None
    def acknowledge_original(self,path,key,manifest):
        full.validate_manifest(manifest,self.plan)
        receipt=full.verify_archive(path,self.plan,key,self.helper_sha,manifest)
        if not isinstance(receipt,dict) or receipt.get('scope')!='independently-verified-original-capsule' or receipt.get('manifestSha256')!=manifest['manifestSha256'] or not backup.digest(receipt.get('sha256')) or receipt.get('allSelectedStateAndPlanVerified') is not True or receipt.get('zipCRC') is not True:raise ValueError('Independently reopened original archive receipt required')
        self.original_ack={'originalManifestSha256':manifest['manifestSha256'],'originalArchiveSha256':receipt['sha256']};self.original_archive=(path,key,manifest,receipt)
    def __call__(self,raw):
        self.last_failure=None;self.last_request_seconds=None;self.last_runtime=None;self.last_observation=None
        request=backup.decode(raw)
        if not isinstance(request,dict) or request.get('action') not in ACTIONS or list(request)!=['schemaVersion','action',*self.binding,*ACTIONS.get(request.get('action'),())] or type(request['schemaVersion']) is not int or request['schemaVersion']!=1 or backup.encode(request)!=raw or any(request[k]!=v for k,v in self.binding.items()) or any(not backup.digest(request[k]) for k in ACTIONS[request['action']]):raise ValueError('Exact canonical private controller request required')
        if request['action']=='recover-preparation' and self.original_archive is not None:
            path,key,manifest,receipt=self.original_archive
            if full.verify_archive(path,self.plan,key,self.helper_sha,manifest)!=receipt:raise ValueError('Original archive changed; copying blocked before request')
        return self.send(request,self.original_ack if request['action']=='recover-preparation' else None)
    def original_manifest(self):
        response=self.send({'schemaVersion':1,'action':'original',**self.binding},None)
        if set(response)!={'privateProfile','helperSha256','originalCapsule'}:raise UncertainRequest('Original capsule response differs; inspect without retry')
        return full.validate_manifest(response['originalCapsule'],self.plan)
    def private_roots(self,key,expected_binding):
        if not backup.digest(key) or not backup.digest(expected_binding):raise ValueError('Verified archive root binding and ownership key required')
        result=self.send({'schemaVersion':1,'action':'private-roots',**self.binding},None)
        if set(result)!={'privateProfile','helperSha256','privateRoots'}:raise ValueError('Exact terminal private root-context response required')
        roots=result['privateRoots']
        if not isinstance(roots,dict) or set(roots)!={'publicRoot','privateRoot','rootBinding'} or roots['rootBinding']!=expected_binding:raise ValueError('Exact independently archived private root binding required')
        public=roots['publicRoot'];private=roots['privateRoot']
        if not isinstance(public,str) or not 1<=len(public)<=4096 or any(ord(c)<32 or ord(c)==127 for c in public) or '\\' in public or not(public.startswith('/') or re.fullmatch('[A-Za-z]:/.*',public)) or str(PurePosixPath(public))!=public or PurePosixPath(public).name!='public_html' or any(p in ('.','..') for p in public.split('/')) or private!=str(PurePosixPath(public).parent/('.ktk-content-update-'+self.plan['transactionId'])):raise ValueError('Exact canonical private-only server root context required')
        owner=hmac.new(key.encode(),json.dumps({'publicRoot':public,'transactionId':self.plan['transactionId'],'privateRoot':private},ensure_ascii=True,separators=(',',':')).encode(),hashlib.sha256).hexdigest()
        if not hmac.compare_digest(owner,expected_binding):raise ValueError('Private server context differs from independently archived owner binding')
        return roots
    def send(self,request,original_ack):
        self.last_failure=None;self.last_request_seconds=None;self.last_runtime=None;self.last_observation=None
        if self.clock()>=self.expires:raise ValueError('Expired full private engine transport cannot query or mutate')
        action=request['action'];target=URL+'?ktk_full_private_engine='+self.plan['transactionId']+'&request='+secrets.token_hex(16)
        raw=backup.encode({'privateProfile':PROFILE,'request':request,'originalArchive':original_ack})
        if len(raw)>4096:raise ValueError('Bounded canonical private engine envelope required')
        req=urllib.request.Request(target,data=raw,method='POST',headers={'X-KTK-Full-Engine-Token':self.token,'Content-Type':'application/json','Cache-Control':'no-cache','User-Agent':'KTK full private engine/1.0'});started=time.perf_counter();observed={'action':action,'status':None,'headers':{},'responseBytes':None}
        try:
            with self.opener.open(req,timeout=180) as response:
                observed.update(status=response.status,headers=failure_headers(response.headers,self.token));self.last_observation=observed;controls=response.headers.get_all('Cache-Control') if hasattr(response.headers,'get_all') else [response.headers.get('Cache-Control','')]
                if response.status!=200 or response.geturl()!=target or response.headers.get('CF-Cache-Status','').upper() not in ('DYNAMIC','BYPASS') or not has_no_store(controls) or response.headers.get('Content-Type','').split(';',1)[0].strip().lower()!='application/json':raise ValueError('Exact uncached private engine JSON required')
                data=response.read(MAX_RESPONSE+1);observed['responseBytes']=len(data)
                if len(data)>MAX_RESPONSE:raise ValueError('Full private engine response exceeds budget')
                result=backup.decode(data)
                if not isinstance(result,dict) or result.get('privateProfile')!=PROFILE or result.get('helperSha256')!=self.helper_sha:raise ValueError('Exact full private helper/profile binding required')
                runtime={}
                for name,header,low,high in [('phpVersionId','X-KTK-PHP-Version',80100,99999),('peakAllocatedBytes','X-KTK-Peak-Allocated',1,1073741824)]:
                    value=response.headers.get(header,'')
                    if not re.fullmatch(r'[0-9]{1,12}',value) or not low<=int(value)<=high:raise ValueError('Bounded actual private engine runtime required')
                    runtime[name]=int(value)
                for name,header in [('memoryLimit','X-KTK-Memory-Limit'),('maxExecutionTime','X-KTK-Execution-Limit')]:
                    value=response.headers.get(header,'')
                    if not 1<=len(value)<=64 or any(not 32<=ord(c)<127 for c in value) or self.token in value:raise ValueError('Bounded printable private runtime header required')
                    runtime[name]=value
                self.last_runtime=runtime;return result
        except Exception as error:
            if isinstance(error,urllib.error.HTTPError):observed.update(status=error.code,headers=failure_headers(error.headers,self.token))
            self.last_observation=observed;self.last_failure={'type':type(error).__name__,**observed};raise UncertainRequest('Full private engine reply was not verified; preserve evidence and inspect before another action') from None
        finally:self.last_request_seconds=time.perf_counter()-started
