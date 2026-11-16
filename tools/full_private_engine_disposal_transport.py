"""Fixed staging archived full-private disposal RPC; exact state, archive fence and no retries."""
from __future__ import annotations
import re,secrets,time,urllib.request,urllib.error
from tools import content_update_backup as backup
from tools import full_private_engine_disposal as disposal
from tools import full_private_engine_disposal_recovery as recovery
from tools.full_private_seed_transport import failure_headers
from tools.content_update_staging_transport import NoRedirect,has_no_store
from tools.content_update_client import UncertainRequest

URL='https://krawlthroughkrakow.com/staging/'
class FullEngineDisposalTransport:
    def __init__(self,packet,archive_verifier,opener=None,clock=time.time):
        recovery.validate_packet(packet,clock())
        if not callable(archive_verifier):raise ValueError('Independent archive re-verifier required')
        self.packet=packet;self.clock=clock;self.verify=archive_verifier;self.opener=opener or urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect());self.last_failure=None;self.last_request_seconds=None;self.last_runtime=None;self.last_observation=None
    def request(self,action,**fields):
        self.last_failure=None;self.last_request_seconds=None;self.last_runtime=None;self.last_observation=None
        if action not in ('inspect','cleanup') or list(fields)!=(['stateSha256'] if action=='cleanup' else []) or any(not backup.digest(v) for v in fields.values()) or self.clock()>=self.packet['expires']:raise ValueError('Exact current archived disposal action required')
        if self.verify() is not True:raise ValueError('Both reopened archives required before a private disposal request')
        a=self.packet['authority'];binding={k:a[k] for k in ('transactionId','applicationCommit','authoritySha256')};raw=backup.encode({'schemaVersion':1,'action':action,**binding,**fields});url=URL+'?ktk_full_private_disposal='+a['transactionId']+'&request='+secrets.token_hex(16)
        request=urllib.request.Request(url,data=raw,method='POST',headers={'X-KTK-Full-Disposal-Token':self.packet['token'],'Content-Type':'application/json','Cache-Control':'no-cache','User-Agent':'KTK archived full private disposal/1.0'});started=time.perf_counter();observed={'action':action,'status':None,'headers':{},'responseBytes':None}
        try:
            with self.opener.open(request,timeout=180) as response:
                observed.update(status=response.status,headers=failure_headers(response.headers,self.packet['token']));self.last_observation=observed;controls=response.headers.get_all('Cache-Control') if hasattr(response.headers,'get_all') else [response.headers.get('Cache-Control','')]
                if response.status!=200 or response.geturl()!=url or response.headers.get('CF-Cache-Status','').upper() not in ('DYNAMIC','BYPASS') or not has_no_store(controls) or response.headers.get('Content-Type','').split(';',1)[0].strip().lower()!='application/json':raise ValueError('Exact uncached staging disposal JSON required')
                data=response.read(2097153);observed['responseBytes']=len(data)
                if len(data)>2097152:raise ValueError('Bounded disposal response required')
                result=backup.decode(data)
                if not isinstance(result,dict) or set(result)!={'privateProfile','helperSha256','controller','runtime'} or result['privateProfile']!=disposal.PROFILE or result['helperSha256']!=self.packet['helperSha256']:raise ValueError('Exact disposal profile and helper required')
                disposal.validate_state(result['controller'],a);r=result['runtime']
                if not isinstance(r,dict) or set(r)!={'phpVersionId','peakAllocatedBytes','memoryLimit','maxExecutionTime'} or type(r['phpVersionId']) is not int or not 80100<=r['phpVersionId']<100000 or type(r['peakAllocatedBytes']) is not int or not 0<r['peakAllocatedBytes']<=1073741824 or not isinstance(r['memoryLimit'],str) or re.fullmatch(r'(?:-1|[0-9]+[KMG]?)',r['memoryLimit']) is None or not isinstance(r['maxExecutionTime'],str) or re.fullmatch('[0-9]{1,5}',r['maxExecutionTime']) is None:raise ValueError('Bounded actual disposal runtime required')
                self.last_runtime=r;return result['controller']
        except Exception as error:
            if isinstance(error,urllib.error.HTTPError):observed.update(status=error.code,headers=failure_headers(error.headers,self.packet['token']))
            self.last_observation=observed;self.last_failure={'type':type(error).__name__,**observed};raise UncertainRequest('Archived private disposal response unverified; preserve evidence and inspect without automatic retry') from None
        finally:self.last_request_seconds=time.perf_counter()-started
