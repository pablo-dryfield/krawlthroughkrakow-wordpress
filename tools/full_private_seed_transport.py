"""Strict injected full-seed HTTP/FTPS transports. No login, credentials, automatic retries or production path."""
from __future__ import annotations
import base64,hashlib,hmac,re,secrets,time,urllib.request,urllib.error,zipfile
from pathlib import Path,PurePosixPath
from tools import content_update_backup as backup
from tools import full_private_seed_packet as packet
from tools.content_update_staging_transport import NoRedirect,has_no_store,mlst_facts

URL='https://krawlthroughkrakow.com/staging/'
MAX_RESPONSE=2097152
ACTIONS={'inspect':(), 'begin':('stateSha256',), 'recover-begin':('stateSha256',), 'inspect-archived':('originalManifestSha256','originalArchiveSha256'), 'advance':('stateSha256','originalManifestSha256','originalArchiveSha256'), 'close':('stateSha256','originalManifestSha256','originalArchiveSha256'), 'cleanup':('stateSha256','originalManifestSha256','originalArchiveSha256'), 'inspect-abandoned':('originalManifestSha256','originalArchiveSha256','abandonedSeedStateSha256'), 'abandon':('stateSha256','originalManifestSha256','originalArchiveSha256','abandonedSeedStateSha256'), 'cleanup-abandoned':('stateSha256','originalManifestSha256','originalArchiveSha256','abandonedSeedStateSha256')}

class UncertainFullSeedRequest(RuntimeError):pass

def failure_headers(headers,token):
    """Explicit diagnostic headers only; never request headers, URLs or response bodies."""
    result={}
    for name in ('Server','CF-Cache-Status','CF-Ray','CF-Mitigated','Content-Type','Retry-After','X-Mitmproxy-Blocked-Reason'):
        value=headers.get(name) if headers is not None else None
        if value is not None:
            value=value if isinstance(value,str) else '[invalid header value]'
            value=value.replace(token,'[redacted]')
            result[name]=''.join(c if 32<=ord(c)<127 else '?' for c in value)[:160]
    return result

def prefix_digest(name,length,source_root,overrides):
    folder,relative=name.split('/',1)
    if folder=='target' and relative in overrides:return backup.sha(base64.b64decode(overrides[relative],validate=True)[:length])
    path=Path(source_root)/relative
    if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(Path(source_root).resolve()):raise ValueError('Exact local reviewed prefix source required')
    value=hashlib.sha256()
    with path.open('rb') as stream:
        remaining=length
        while remaining:
            data=stream.read(min(65536,remaining))
            if not data:raise ValueError('Local original prefix short read')
            value.update(data);remaining-=len(data)
    return value.hexdigest()

def validate_state(v,plan,sizes,overrides,source_root,action):
    fields={'schemaVersion','scope','transactionId','applicationCommit','planSha256','phase','stateSha256','seed','capsule','closed','operation','applicationWrites','databaseWrites','cachePurges','productionOperations','fullHostTransactionAcceptance','quotaVerified'}
    phases={'absent','preparing-original','copying','ready-to-close','closing-interrupted','closed','disposing','disposed','abandoning-interrupted','abandoned','disposing-abandoned','disposed-abandoned'}
    if not isinstance(v,dict) or set(v)!=fields or type(v['schemaVersion']) is not int or v['schemaVersion']!=1 or v['scope']!='full-private-seed-rehearsal' or any(v[k]!=value for k,value in packet.binding(plan).items()) or v['phase'] not in phases or not backup.digest(v['stateSha256']) or type(v['closed']) is not bool or v['fullHostTransactionAcceptance'] is not False or v['quotaVerified'] is not False or any(type(v[k]) is not int or v[k]!=0 for k in ('applicationWrites','databaseWrites','cachePurges','productionOperations')):
        raise ValueError('Exact metadata-only private full seed state required')
    closed=v['phase'] in {'closed','disposing','disposed','abandoned','disposing-abandoned','disposed-abandoned'}
    if v['closed']!=closed:raise ValueError('Full seed closure/phase differs')
    if v['phase'] in {'absent','preparing-original'}:
        if v['seed'] is not None or v['capsule'] is not None:raise ValueError('Uninitialized full seed state cannot claim payload or capsule')
    else:
        manifest=packet.validate_manifest(v['capsule'],plan);seed=v['seed'];expected,allowed_dirs=packet.expected_seed_files(plan,sizes,overrides)
        seed_fields={'stateSha256','files','directories','sourceComplete','targetComplete','copiedBytes','applicationWrites','databaseWrites','cachePurges'}
        if not isinstance(seed,dict) or set(seed)!=seed_fields or not (isinstance(seed['files'],dict) or seed['files']==[]) or not isinstance(seed['directories'],list) or not all(isinstance(d,str) for d in seed['directories']) or seed['directories']!=sorted(set(seed['directories'])) or not set(seed['directories'])<=set(allowed_dirs) or not set(seed['files'])<=set(expected) or any(type(seed[k]) is not int or seed[k]!=0 for k in ('applicationWrites','databaseWrites','cachePurges')):raise ValueError('Exact complete private seed metadata shape required')
        files={} if seed['files']==[] else seed['files']
        for name,row in files.items():
            spec=expected[name]
            if not isinstance(row,dict) or set(row)!={'sha256','bytes'} or not backup.digest(row['sha256']) or type(row['bytes']) is not int or not 0<=row['bytes']<=spec['bytes'] or (row['bytes']==spec['bytes'] and row['sha256']!=spec['sha256']) or (row['bytes']<spec['bytes'] and row['sha256']!=prefix_digest(name,row['bytes'],source_root,overrides)):
                raise ValueError('Private seed file or original prefix differs')
            if not {p.as_posix() for p in PurePosixPath(name).parents if p.as_posix()!='.'}<=set(seed['directories']):raise ValueError('Private seed parents absent from metadata')
        for d in seed['directories']:
            if not {p.as_posix() for p in PurePosixPath(d).parents if p.as_posix()!='.'}<=set(seed['directories']):raise ValueError('Private seed directory parents absent')
        for folder in ('source','target'):
            complete=folder in seed['directories'] and all(files.get(n)==row for n,row in expected.items() if n.startswith(folder+'/'))
            if type(seed[folder+'Complete']) is not bool or seed[folder+'Complete']!=complete:raise ValueError('Private seed completion differs from actual inventory')
        if 'target' in seed['directories'] and not seed['sourceComplete']:raise ValueError('Private target cannot precede the complete candidate')
        if type(seed['copiedBytes']) is not int or seed['copiedBytes']!=sum(row['bytes'] for row in files.values()) or seed['stateSha256']!=packet.seed_digest(manifest['rootBinding'],plan,seed['files'],seed['directories']):raise ValueError('Private seed fence/byte count differs')
        both=seed['sourceComplete'] and seed['targetComplete']
        if v['phase'] in {'ready-to-close','closing-interrupted','closed'} and not both or v['phase']=='copying' and both or v['phase'] in {'disposed','disposed-abandoned'} and (seed['files'] or seed['directories']) or v['phase']=='disposing' and (both or not seed['files'] and not seed['directories']) or v['phase'] in {'abandoned','abandoning-interrupted'} and both:raise ValueError('Full seed phase disagrees with private inventory')
    operation=v['operation']
    if action=='advance':
        if not isinstance(operation,dict) or set(operation)!={'payloadBytesWritten','payloadFilesOpened'} or any(type(operation[k]) is not int or not 0<=operation[k]<=limit for k,limit in [('payloadBytesWritten',67108864),('payloadFilesOpened',256)]):raise ValueError('Exact bounded full seed copy result required')
    elif action in {'cleanup','cleanup-abandoned'}:
        if not isinstance(operation,dict) or set(operation)!={'payloadFilesDeleted','payloadDirectoriesRemoved'} or any(type(x) is not int or not 0<=x<=256 for x in operation.values()):raise ValueError('Exact bounded full seed disposal result required')
    elif operation is not None:raise ValueError('Unexpected full seed operation metadata')
    return v

class FullSeedTransport:
    def __init__(self,plan,sizes,overrides,source_root,helper_sha,token,expires,opener=None,clock=time.time):
        if not backup.digest(helper_sha) or not isinstance(token,str) or not re.fullmatch(r'[A-Za-z0-9_-]{43}',token) or type(expires) is not int or not clock()<expires<=clock()+3600:raise ValueError('Exact current full seed transport context required')
        self.plan=plan;self.sizes=sizes;self.overrides=overrides;self.source_root=Path(source_root);self.helper_sha=helper_sha;self.token=token;self.expires=expires;self.clock=clock;self.opener=opener or urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect());self.last_request_seconds=None;self.last_failure=None
    def request(self,action,**fields):
        self.last_failure=None;self.last_request_seconds=None
        if action not in ACTIONS or set(fields)!=set(ACTIONS[action]) or any(not backup.digest(v) for v in fields.values()) or self.clock()>=self.expires:raise ValueError('Exact current full seed request fields required')
        raw=backup.encode({'schemaVersion':1,'action':action,**packet.binding(self.plan),**{k:fields[k] for k in ACTIONS[action]}})
        target=URL+'?ktk_full_private_seeds='+self.plan['transactionId']+'&request='+secrets.token_hex(16);request=urllib.request.Request(target,data=raw,method='POST',headers={'X-KTK-Full-Seed-Token':self.token,'Content-Type':'application/json','Cache-Control':'no-cache','User-Agent':'KTK full private seed rehearsal/1.0'});start=time.perf_counter()
        observed={'action':action,'status':None,'headers':{},'responseBytes':None}
        try:
            with self.opener.open(request,timeout=180) as response:
                observed.update(status=response.status,headers=failure_headers(response.headers,self.token))
                controls=response.headers.get_all('Cache-Control') if hasattr(response.headers,'get_all') else [response.headers.get('Cache-Control','')]
                if response.status!=200 or response.geturl()!=target or response.headers.get('CF-Cache-Status','').upper() not in ('DYNAMIC','BYPASS') or not has_no_store(controls) or response.headers.get('Content-Type','').split(';',1)[0].strip().lower()!='application/json':raise ValueError('Exact uncached full seed JSON response required')
                raw=response.read(MAX_RESPONSE+1)
                observed['responseBytes']=len(raw)
                if len(raw)>MAX_RESPONSE:raise ValueError('Full seed response exceeds budget')
                envelope=backup.decode(raw)
            if not isinstance(envelope,dict) or set(envelope)!={'helperSha256','controller','runtime'} or envelope['helperSha256']!=self.helper_sha:raise ValueError('Exact full seed helper response required')
            validate_state(envelope['controller'],self.plan,self.sizes,self.overrides,self.source_root,action);runtime=envelope['runtime']
            if not isinstance(runtime,dict) or set(runtime)!={'phpVersionId','peakAllocatedBytes','memoryLimit','maxExecutionTime'} or type(runtime['phpVersionId']) is not int or runtime['phpVersionId']<80100 or type(runtime['peakAllocatedBytes']) is not int or runtime['peakAllocatedBytes']<=0 or any(not isinstance(runtime[k],str) or not 1<=len(runtime[k])<=64 or any(not 32<=ord(c)<127 for c in runtime[k]) for k in ('memoryLimit','maxExecutionTime')):raise ValueError('Exact observed full seed PHP runtime metadata required')
            return envelope
        except Exception as error:
            if isinstance(error,urllib.error.HTTPError):observed.update(status=error.code,headers=failure_headers(error.headers,self.token))
            self.last_failure={'type':type(error).__name__,**observed}
            raise UncertainFullSeedRequest('Full private seed response failed verification; inspect before further mutation, no automatic retry') from None
        finally:self.last_request_seconds=time.perf_counter()-start

class OriginalCapsuleReader:
    def __init__(self,connection,manifest,plan):
        packet.validate_manifest(manifest,plan);self.connection=connection;self.root='/.ktk-content-update-'+plan['transactionId'];self.rows={row['source']:row for row in manifest['members'].values()}
    def metadata(self,path,kind):
        if path not in {self.root,self.root+'/control',*(self.root+'/'+n for n in self.rows)}:raise ValueError('Only exact original capsule paths may be inspected')
        facts=mlst_facts(self.connection.sendcmd('MLST '+path),path)
        if facts.get('type')!=kind:raise ValueError('Original capsule link or unexpected file type refused')
        return facts
    def __call__(self,source):
        if source not in self.rows:raise ValueError('Only exact original capsule records may be read')
        row=self.rows[source];path=self.root+'/'+source;directories=(self.root,self.root+'/control')
        try:
            before={d:self.metadata(d,'dir') for d in directories};file_before=self.metadata(path,'file')
            if not re.fullmatch(r'[0-9]+',file_before.get('size','')) or int(file_before['size'])!=row['bytes']:raise ValueError('Original capsule size differs before transfer')
            chunks=[];length=0
            def receive(data):
                nonlocal length
                if not isinstance(data,bytes):raise ValueError('Binary original capsule read required')
                length+=len(data)
                if length>row['bytes']:raise ValueError('Original capsule read exceeds budget')
                chunks.append(data)
            self.connection.retrbinary('RETR '+path,receive);data=b''.join(chunks)
            if len(data)!=row['bytes'] or backup.sha(data)!=row['sha256'] or self.metadata(path,'file')!=file_before or any(self.metadata(d,'dir')!=facts for d,facts in before.items()):raise ValueError('Original capsule changed during transfer')
            return data
        except Exception:raise UncertainFullSeedRequest('Original capsule read failed; no unverified bytes returned or automatic retry') from None

def verify_retained_metadata(connection,archive_path,plan,sizes,overrides,key,helper_sha,abandoned_seed_sha=None):
    receipt=packet.verify_archive(archive_path,plan,key,helper_sha)
    with zipfile.ZipFile(archive_path) as z:
        manifest=backup.decode(z.read('manifest.json'));records={name:z.read(name) for name in manifest['members']};packet.validate_records(records,manifest,plan,key,helper_sha);expected={row['source']:records[name] for name,row in manifest['members'].items()}
    if packet.verify_archive(archive_path,plan,key,helper_sha,manifest)!=receipt:raise ValueError('Original capsule changed between independent reads')
    files,dirs=packet.expected_seed_files(plan,sizes,overrides)
    if abandoned_seed_sha is not None and not backup.digest(abandoned_seed_sha):raise ValueError('Exact abandoned private inventory digest required')
    closure={'schemaVersion':1,'scope':'full-private-seeds-abandoned' if abandoned_seed_sha else 'full-private-seeds-closed','transactionId':plan['transactionId'],'applicationCommit':plan['applicationCommit'],'planSha256':packet.binding(plan)['planSha256'],'rootBinding':manifest['rootBinding'],'originalManifestSha256':manifest['manifestSha256'],'originalArchiveSha256':receipt['sha256'],'terminalSeedStateSha256':abandoned_seed_sha or packet.seed_digest(manifest['rootBinding'],plan,files,dirs),'applicationWrites':0,'databaseWrites':0,'cachePurges':0};body=backup.encode(closure);meta={'name':'closed.json','transactionId':plan['transactionId'],'rootBinding':manifest['rootBinding'],'bytes':len(body),'sha256':backup.sha(body)};meta['mac']=hmac.new(key.encode(),backup.encode(meta),hashlib.sha256).hexdigest();expected['control/closed.json']=b'KTK-PRIVATE-1\n'+backup.encode(meta)+b'\n'+body;expected['owner.marker']=expected['controller.lock']=manifest['rootBinding'].encode();root='/.ktk-content-update-'+plan['transactionId']
    structure={root:{'control':'dir','owner.marker':'file','controller.lock':'file'},root+'/control':{'original-state.json':'file','controller-plan.json':'file','closed.json':'file'}}
    def listing(directory):
        result={}
        for name,facts in connection.mlsd(directory):
            if name in ('.','..') and facts.get('type') in ('cdir','pdir'):continue
            if name in result or name not in structure[directory] or facts.get('type')!=structure[directory][name]:raise ValueError('Unknown retained private namespace member preserved')
            result[name]=facts['type']
        if result!=structure[directory]:raise ValueError('Retained private namespace is incomplete')
        return result
    parents={d:mlst_facts(connection.sendcmd('MLST '+d),d) for d in structure}
    if any(facts.get('type')!='dir' for facts in parents.values()):raise ValueError('Retained private directory link refused')
    before={directory:listing(directory) for directory in structure};verified={}
    for relative,wanted in expected.items():
        path=root+'/'+relative;first=mlst_facts(connection.sendcmd('MLST '+path),path)
        if first.get('type')!='file' or first.get('size')!=str(len(wanted)):raise ValueError('Exact retained private metadata file required')
        chunks=[];length=0
        def receive(data):
            nonlocal length
            if not isinstance(data,bytes):raise ValueError('Binary retained metadata required')
            length+=len(data)
            if length>len(wanted):raise ValueError('Retained private metadata exceeds budget')
            chunks.append(data)
        connection.retrbinary('RETR '+path,receive)
        if b''.join(chunks)!=wanted or mlst_facts(connection.sendcmd('MLST '+path),path)!=first:raise ValueError('Retained metadata changed or differs from its archived signed context')
        verified[relative]=backup.sha(wanted)
    if any(listing(d)!=facts for d,facts in before.items()) or any(mlst_facts(connection.sendcmd('MLST '+d),d)!=facts for d,facts in parents.items()):raise ValueError('Retained private namespace changed during read')
    return {'scope':'independent-full-private-seed-retained-metadata','payloadTreesAbsent':True,'exactRetainedMetadataFiles':5,'allOriginalArchiveRecordsAndSignedClosureExact':True,'abandoned':abandoned_seed_sha is not None,'metadataSHA256':verified,'archiveSHA256':receipt['sha256'],'fullHostTransactionAcceptance':False,'quotaVerified':False}
