"""Separate witnessed private disposal compiler, encrypted caller and metadata transport. No public writer."""
from __future__ import annotations
import base64,hashlib,hmac,os,re,secrets,time,urllib.request,urllib.error,zipfile
from pathlib import Path
from tools import content_update_backup as backup
from tools import content_update_recovery as crypto
from tools import full_private_seed_packet as full
from tools import full_private_seed_transport as transport
from tools.content_update_staging_transport import NoRedirect,has_no_store,mlst_facts

ROOT=full.ROOT;MAGIC=b'KTK-DPAPI-PRIVATE-DISPOSAL-1\n'
FIELDS={'schemaVersion','scope','disposalId','transactionId','applicationCommit','toolingCommit','sourceHashes','expires','token','helperSha256','freshProtectedStateSha256','witnessArchiveSha256','witnessArchiveName','originalArchiveSha256'}
ACTIONS={'inspect':(),'inspect-abandoned':('abandonedSeedStateSha256',),'abandon':('stateSha256','abandonedSeedStateSha256'),'cleanup':('stateSha256','abandonedSeedStateSha256')}
COMPONENTS={'STATE':'staging-protected-state-core.php','STORE':'content-update-private-store.php','STREAM':'content-update-streaming-seeds.php','CONTROLLER':'private-seed-disposal.php'}

def validate_packet(v,now=None):
    if not isinstance(v,dict) or set(v)!=FIELDS or type(v['schemaVersion']) is not int or v['schemaVersion']!=1 or v['scope']!='witnessed-private-seed-disposal' or any(not backup.identifier(v[k],n) for k,n in [('disposalId',32),('transactionId',32),('applicationCommit',40),('toolingCommit',40)]) or any(not backup.digest(v[k]) for k in ['helperSha256','freshProtectedStateSha256','witnessArchiveSha256','originalArchiveSha256']) or not isinstance(v['token'],str) or re.fullmatch(r'[A-Za-z0-9_-]{43}',v['token']) is None or type(v['expires']) is not int or v['expires']<=0:
        raise ValueError('Exact separate private disposal recovery profile required')
    if not isinstance(v['witnessArchiveName'],str) or re.fullmatch(r'staging-protected-state-[0-9-]+\.zip',v['witnessArchiveName']) is None:raise ValueError('Exact private witness archive name required')
    hashes=v['sourceHashes']
    if not isinstance(hashes,dict) or not 1<=len(hashes)<=60 or len({n.casefold() for n in hashes if isinstance(n,str)})!=len(hashes) or any(not isinstance(n,str) or re.fullmatch(r'tools/[A-Za-z0-9._/-]+',n) is None or any(p in ('','.','..') for p in n.split('/')) or not backup.digest(s) for n,s in hashes.items()):raise ValueError('Exact disposal source fingerprints required')
    if now is not None and not now<v['expires']<=now+3600:raise ValueError('Current separate disposal lifetime required')
    return v

def seal(v):
    validate_packet(v);raw=backup.encode(v);inner=backup.encode({'scope':v['scope'],'disposalId':v['disposalId'],'payloadSha256':backup.sha(raw),'packet':v});cipher=crypto._dpapi(inner,v['disposalId'],True)
    return MAGIC+v['disposalId'].encode()+b'\n'+backup.sha(cipher).encode()+b'\n'+cipher

def unseal(blob,identifier):
    if not backup.identifier(identifier,32) or not isinstance(blob,bytes) or len(blob)>crypto.LIMIT+16384:raise ValueError('Exact bounded disposal ciphertext required')
    p=blob.split(b'\n',3)
    if len(p)!=4 or p[0]+b'\n'!=MAGIC or p[1]!=identifier.encode() or p[2]!=backup.sha(p[3]).encode():raise ValueError('Disposal ciphertext identity/checksum differs')
    raw=crypto._dpapi(p[3],identifier,False);v=backup.decode(raw)
    if not isinstance(v,dict) or set(v)!={'scope','disposalId','payloadSha256','packet'} or v['scope']!='witnessed-private-seed-disposal' or v['disposalId']!=identifier or backup.encode(v)!=raw or v['payloadSha256']!=backup.sha(backup.encode(v['packet'])):raise ValueError('Disposal decrypted context differs')
    result=validate_packet(v['packet'])
    if result['disposalId']!=identifier:raise ValueError('Recovered disposal identity differs')
    return result

class DisposalVault(crypto.RecoveryPacketVault):
    def load(self,identifier):
        p=self.path(identifier);self.directory(p.parent)
        if p.is_symlink() or not p.is_file() or p.stat().st_size>crypto.LIMIT+16384:raise ValueError('Exact disposal ciphertext file required')
        before=p.stat()
        with p.open('rb') as f:
            held=os.fstat(f.fileno());data=f.read(crypto.LIMIT+16385);after=p.lstat();final=os.fstat(f.fileno())
            if p.is_symlink() or any(getattr(before,k)!=getattr(after,k) or getattr(held,k)!=getattr(final,k) for k in ('st_dev','st_ino','st_size','st_mtime_ns','st_ctime_ns')) or any(getattr(after,k)!=getattr(final,k) for k in ('st_dev','st_ino','st_size','st_mtime_ns')):raise ValueError('Disposal ciphertext changed during read')
        self.directory(p.parent);return unseal(data,identifier)
    def save(self,v,now=None):
        validate_packet(v,time.time() if now is None else now);blob=seal(v);p=self.path(v['disposalId'],True);self.directory(p.parent)
        if p.exists() or p.is_symlink():raise ValueError('Existing disposal packet preserved')
        with p.open('xb') as f:
            held=os.fstat(f.fileno());current=p.lstat()
            if p.is_symlink() or (held.st_dev,held.st_ino)!=(current.st_dev,current.st_ino):raise ValueError('Disposal ciphertext identity changed')
            os.chmod(p,0o600)
            if f.write(blob)!=len(blob):raise ValueError('Disposal ciphertext short write')
            f.flush();os.fsync(f.fileno())
        if self.load(v['disposalId'])!=v:raise ValueError('Durable disposal DPAPI readback differs')
        return {'scope':'separate-disposal-encrypted-recovery','disposalId':v['disposalId'],'bytes':len(blob),'ciphertextSha256':backup.sha(blob),'durableDecryptReadbackVerified':True,'productionAuthorized':False}

def witness(path,sha,protected,owned):
    p=Path(path)
    if p.is_symlink() or p.resolve()!=p or not p.is_file() or p.stat().st_size>33554432 or backup.sha(p.read_bytes())!=sha:raise ValueError('Exact independently saved fresh witness archive required')
    before=p.stat()
    with zipfile.ZipFile(p) as z:
        if len(z.infolist())!=3 or set(z.namelist())!={'before.json','after.json','manifest.json'} or any(i.file_size>16777216 for i in z.infolist()) or z.testzip() is not None:raise ValueError('Fresh witness ZIP membership/CRC/budget differs')
        m=backup.decode(z.read('manifest.json'));a=backup.decode(z.read('before.json'));b=backup.decode(z.read('after.json'))
        if not isinstance(m,dict) or set(m)!={'scope','helperSha256','files'} or set(m['files'])!={'before.json','after.json'} or any(backup.sha(z.read(n))!=s for n,s in m['files'].items()):raise ValueError('Fresh witness archive manifest differs')
        for s in (a,b):full.snapshot.validate_snapshot(s,m['helperSha256'])
        if not full.snapshot.same_state(a,b) or a['protectedStateSha256']!=protected or a['ownedContentFiles']!=owned:raise ValueError('Complete stable fresh witness differs')
    if p.is_symlink() or any(getattr(before,k)!=getattr(p.stat(),k) for k in ('st_dev','st_ino','st_size','st_mtime_ns','st_ctime_ns')) or backup.sha(p.read_bytes())!=sha:raise ValueError('Fresh witness changed during verification')
    return a

def helper_source(v,old,manifest):
    validate_packet(v,time.time());full.validate_manifest(manifest,old['plan'])
    if v['transactionId']!=old['transactionId'] or v['applicationCommit']!=old['applicationCommit']:raise ValueError('Disposal and original release differ')
    _,sizes,overrides=full.plan(old['transactionId'],old['applicationCommit'],old['publicOwned'],old['publicSizes'],old['plan']['protectedStateSha256'])
    config={'disposalId':v['disposalId'],'expires':v['expires'],'freshProtectedStateSha256':v['freshProtectedStateSha256'],'originalArchiveSha256':v['originalArchiveSha256'],'originalHelperSha256':old['helperSha256'],'originalManifest':manifest,'ownershipKey':old['ownershipKey'],'plan':old['plan'],'priorOverrides':overrides,'sizes':sizes,'tokenSha256':backup.sha(v['token'].encode()),'witnessArchiveSha256':v['witnessArchiveSha256']}
    name='ktk-transaction-rehearsal-'+old['transactionId']+'.php';source=(ROOT/'tools/private-seed-disposal-template.php').read_bytes()
    values={'EXPIRES':str(v['expires']).encode(),'TOKEN_SHA':backup.sha(v['token'].encode()).encode(),'HELPER':name.encode(),'PACKET':base64.b64encode(backup.encode(config))}
    for k,data in values.items():
        marker=('__KTK_DISPOSAL_'+k+'__').encode()
        if source.count(marker)!=1:raise ValueError('Exact disposal compiler marker required')
        source=source.replace(marker,data)
    for k,name in COMPONENTS.items():
        body=(ROOT/'tools'/name).read_bytes();marker=('/* __KTK_DISPOSAL_'+k+'__ */').encode()
        if source.count(marker)!=1 or not body.startswith(b'<?php\n') or k=='STATE' and backup.sha(body)!=full.capacity.CORE_SHA:raise ValueError('Exact unchanged capture/disposal components required')
        source=source.replace(marker,body[6:])
    if b'__KTK_DISPOSAL_' in source:raise ValueError('Unresolved disposal compiler marker')
    return source

def binding(v,old):return {**full.binding(old['plan']),'disposalId':v['disposalId']}

def validate_state(s,v,old,manifest,source_root,action):
    fields={'schemaVersion','scope','transactionId','applicationCommit','planSha256','disposalId','stateSha256','phase','seed','closed','operation','freshProtectedStateSha256','originalProtectedStateSha256','applicationWrites','databaseWrites','cachePurges','productionOperations','fullHostTransactionAcceptance','fullPrivateCopyVerified'}
    if not isinstance(s,dict) or set(s)!=fields or type(s['schemaVersion']) is not int or s['schemaVersion']!=1 or s['scope']!='private-seed-disposal' or any(s[k]!=x for k,x in binding(v,old).items()) or s['freshProtectedStateSha256']!=v['freshProtectedStateSha256'] or s['originalProtectedStateSha256']!=old['plan']['protectedStateSha256'] or s['phase'] not in ('open','disposing','disposed') or s['closed'] is not (s['phase']!='open') or s['fullPrivateCopyVerified'] is not False:raise ValueError('Exact metadata-only private disposal state required')
    projected={k:x for k,x in s.items() if k not in ('disposalId','freshProtectedStateSha256','originalProtectedStateSha256','fullPrivateCopyVerified')};projected.update(scope='full-private-seed-rehearsal',capsule=manifest,quotaVerified=False,phase={'open':'copying','disposing':'disposing-abandoned','disposed':'disposed-abandoned'}[s['phase']])
    _,_,overrides=full.plan(old['transactionId'],old['applicationCommit'],old['publicOwned'],old['publicSizes'],old['plan']['protectedStateSha256']);transport.validate_state(projected,old['plan'],old['publicSizes'],overrides,source_root,'cleanup-abandoned' if action=='cleanup' else 'inspect-abandoned')
    return s

class DisposalTransport:
    def __init__(self,v,old,manifest,source_root,opener=None,clock=time.time):
        validate_packet(v,clock());self.v=v;self.old=old;self.manifest=full.validate_manifest(manifest,old['plan']);self.source_root=source_root;self.clock=clock;self.opener=opener or urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect());self.last_request_seconds=None;self.last_failure=None
    def request(self,action,**fields):
        if action not in ACTIONS or set(fields)!=set(ACTIONS[action]) or any(not backup.digest(x) for x in fields.values()) or self.clock()>=self.v['expires']:raise ValueError('Exact current private disposal request required')
        raw=backup.encode({'schemaVersion':1,'action':action,**binding(self.v,self.old),**{k:fields[k] for k in ACTIONS[action]}});url=transport.URL+'?ktk_private_seed_disposal='+self.v['disposalId']+'&request='+secrets.token_hex(16);req=urllib.request.Request(url,data=raw,method='POST',headers={'X-KTK-Disposal-Token':self.v['token'],'Content-Type':'application/json','Cache-Control':'no-cache','User-Agent':'KTK private seed disposal/1.0'});start=time.perf_counter()
        try:
            with self.opener.open(req,timeout=180) as response:
                if response.status!=200 or response.geturl()!=url or response.headers.get('CF-Cache-Status','').upper() not in ('DYNAMIC','BYPASS') or not has_no_store(response.headers.get_all('Cache-Control')) or response.headers.get('Content-Type','').split(';')[0].strip().lower()!='application/json':raise ValueError('Exact uncached disposal JSON response required')
                raw=response.read(2097153)
                if len(raw)>2097152:raise ValueError('Disposal response budget exceeded')
                result=backup.decode(raw)
            if not isinstance(result,dict) or set(result)!={'helperSha256','controller','runtime'} or result['helperSha256']!=self.v['helperSha256'] or not isinstance(result['runtime'],dict) or set(result['runtime'])!={'phpVersionId','peakAllocatedBytes','memoryLimit','maxExecutionTime'}:raise ValueError('Exact disposal helper metadata response required')
            runtime=result['runtime']
            if type(runtime['phpVersionId']) is not int or not 80000<=runtime['phpVersionId']<100000 or type(runtime['peakAllocatedBytes']) is not int or not 0<runtime['peakAllocatedBytes']<=1073741824 or not isinstance(runtime['memoryLimit'],str) or re.fullmatch(r'(?:-1|[0-9]+[KMG]?)',runtime['memoryLimit']) is None or not isinstance(runtime['maxExecutionTime'],str) or re.fullmatch(r'[0-9]{1,5}',runtime['maxExecutionTime']) is None:raise ValueError('Bounded disposal runtime metadata required')
            validate_state(result['controller'],self.v,self.old,self.manifest,self.source_root,action);return result
        except urllib.error.HTTPError as e:
            self.last_failure={'type':'HTTPError','status':e.code,'headers':{k:e.headers.get(k) for k in ('Server','CF-Cache-Status','CF-Ray','CF-Mitigated','Content-Type')}};raise RuntimeError('Private disposal HTTP failure; inspect without automatic retry') from None
        except Exception as e:
            self.last_failure={'type':type(e).__name__};raise RuntimeError('Private disposal response uncertain; inspect without automatic retry') from None
        finally:self.last_request_seconds=time.perf_counter()-start

def closure(v,old,manifest,abandoned):
    if not backup.digest(abandoned):raise ValueError('Exact abandoned private inventory digest required')
    return {'schemaVersion':1,'scope':'full-private-seeds-abandoned-with-fresh-guard',**binding(v,old),'rootBinding':manifest['rootBinding'],'originalManifestSha256':manifest['manifestSha256'],'originalArchiveSha256':v['originalArchiveSha256'],'originalProtectedStateSha256':old['plan']['protectedStateSha256'],'freshProtectedStateSha256':v['freshProtectedStateSha256'],'witnessArchiveSha256':v['witnessArchiveSha256'],'disposalHelperSha256':v['helperSha256'],'abandonedSeedStateSha256':abandoned,'applicationWrites':0,'databaseWrites':0,'cachePurges':0}

def verify_retained_metadata(connection,path,v,old,manifest,abandoned):
    receipt=full.verify_archive(path,old['plan'],old['ownershipKey'],old['helperSha256'],manifest)
    if receipt['sha256']!=v['originalArchiveSha256']:raise ValueError('Original archive differs from disposal witness')
    with zipfile.ZipFile(path) as z:expected={row['source']:z.read(name) for name,row in manifest['members'].items()}
    body=backup.encode(closure(v,old,manifest,abandoned));meta={'name':'closed.json','transactionId':old['transactionId'],'rootBinding':manifest['rootBinding'],'bytes':len(body),'sha256':backup.sha(body)};meta['mac']=hmac.new(old['ownershipKey'].encode(),backup.encode(meta),hashlib.sha256).hexdigest();expected['control/closed.json']=b'KTK-PRIVATE-1\n'+backup.encode(meta)+b'\n'+body;expected['owner.marker']=expected['controller.lock']=manifest['rootBinding'].encode();root='/.ktk-content-update-'+old['transactionId']
    structure={root:{'control':'dir','owner.marker':'file','controller.lock':'file'},root+'/control':{'original-state.json':'file','controller-plan.json':'file','closed.json':'file'}}
    def listing(directory):
        result={}
        for name,facts in connection.mlsd(directory):
            if name in ('.','..') and facts.get('type') in ('cdir','pdir'):continue
            if name in result or name not in structure[directory] or facts.get('type')!=structure[directory][name]:raise ValueError('Unknown retained disposal member preserved')
            result[name]=facts['type']
        if result!=structure[directory]:raise ValueError('Retained disposal namespace incomplete')
        return result
    parents={d:mlst_facts(connection.sendcmd('MLST '+d),d) for d in structure}
    if any(f.get('type')!='dir' for f in parents.values()):raise ValueError('Disposal metadata parent link refused')
    before={d:listing(d) for d in structure};verified={}
    for name,wanted in expected.items():
        p=root+'/'+name;first=mlst_facts(connection.sendcmd('MLST '+p),p)
        if first.get('type')!='file' or first.get('size')!=str(len(wanted)):raise ValueError('Exact retained disposal file required')
        chunks=[];length=0
        def receive(data):
            nonlocal length
            if not isinstance(data,bytes):raise ValueError('Binary disposal metadata required')
            length+=len(data)
            if length>len(wanted):raise ValueError('Disposal metadata budget exceeded')
            chunks.append(data)
        connection.retrbinary('RETR '+p,receive)
        if b''.join(chunks)!=wanted or mlst_facts(connection.sendcmd('MLST '+p),p)!=first:raise ValueError('Retained disposal metadata changed')
        verified[name]=backup.sha(wanted)
    if any(listing(d)!=f for d,f in before.items()) or any(mlst_facts(connection.sendcmd('MLST '+d),d)!=f for d,f in parents.items()) or full.verify_archive(path,old['plan'],old['ownershipKey'],old['helperSha256'],manifest)!=receipt:raise ValueError('Disposal namespace or archive changed during read')
    return {'scope':'independent-fresh-witness-private-disposal','payloadTreesAbsent':True,'exactRetainedMetadataFiles':5,'allOriginalArchiveRecordsAndSignedClosureExact':True,'originalArchiveSha256':receipt['sha256'],'witnessArchiveSha256':v['witnessArchiveSha256'],'metadataSHA256':verified,'fullPrivateCopyVerified':False,'fullHostTransactionAcceptance':False}
