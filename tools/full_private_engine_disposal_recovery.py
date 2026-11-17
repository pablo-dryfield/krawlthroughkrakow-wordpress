"""Distinct current-user encrypted authorization for archived full private disposal only."""
from __future__ import annotations
import os,re,time
from tools import content_update_backup as backup
from tools import content_update_recovery as crypto
from tools import full_private_engine_disposal as disposal

MAGIC=b'KTK-DPAPI-FULL-PRIVATE-ENGINE-DISPOSAL-1\n'
SCOPE='full-private-engine-disposal-recovery'
FIELDS={'schemaVersion','scope','disposalId','transactionId','toolingCommit','sourceHashes','expires','token','ownershipKey','helperSha256','publicRoot','authority','originalArchiveName','rollbackArchiveName','originalHelperSha256'}

def validate_packet(v,now=None):
    if not isinstance(v,dict) or set(v)!=FIELDS or type(v['schemaVersion']) is not int or v['schemaVersion']!=1 or v['scope']!=SCOPE or any(not backup.identifier(v[k],n) for k,n in [('disposalId',32),('transactionId',32),('toolingCommit',40)]) or any(not backup.digest(v[k]) for k in ('ownershipKey','helperSha256','originalHelperSha256')) or not isinstance(v['token'],str) or re.fullmatch('[A-Za-z0-9_-]{43}',v['token']) is None or type(v['expires']) is not int or v['expires']<=0:raise ValueError('Exact separate archived disposal recovery profile required')
    if now is not None and not now<v['expires']<=now+3600:raise ValueError('Current bounded disposal recovery lifetime required')
    a=v['authority'];hashes=v['sourceHashes']
    if not isinstance(a,dict) or a.get('scope')!=disposal.SCOPE or a.get('transactionId')!=v['transactionId'] or not backup.digest(a.get('authoritySha256')) or backup.sha(backup.encode({k:x for k,x in a.items() if k!='authoritySha256'},sort=True))!=a['authoritySha256']:raise ValueError('Exact independently archived disposal authority required')
    disposal.validate_authority(a,v['publicRoot'])
    if not isinstance(hashes,dict) or not 1<=len(hashes)<=80 or len({n.casefold() for n in hashes if isinstance(n,str)})!=len(hashes) or any(not isinstance(n,str) or re.fullmatch('tools/[A-Za-z0-9._/-]+',n) is None or any(p in ('','.','..') for p in n.split('/')) or not backup.digest(h) for n,h in hashes.items()):raise ValueError('Exact reviewed disposal source fingerprints required')
    for k,kind in [('originalArchiveName','original'),('rollbackArchiveName','rollback')]:
        if v[k]!='staging-full-engine-'+kind+'-'+v['transactionId']+'.zip':raise ValueError('Exact independently verified disposal archive names required')
    if len(backup.encode(v))>crypto.LIMIT:raise ValueError('Bounded encrypted disposal packet required')
    return v

def seal(v):
    validate_packet(v);raw=backup.encode(v);inner=backup.encode({'scope':SCOPE,'disposalId':v['disposalId'],'payloadSha256':backup.sha(raw),'packet':v});cipher=crypto._dpapi(inner,v['disposalId'],True);return MAGIC+v['disposalId'].encode()+b'\n'+backup.sha(cipher).encode()+b'\n'+cipher

def unseal(blob,identifier):
    if not backup.identifier(identifier,32) or not isinstance(blob,bytes) or len(blob)>crypto.LIMIT+16384:raise ValueError('Exact bounded encrypted disposal context required')
    p=blob.split(b'\n',3)
    if len(p)!=4 or p[0]+b'\n'!=MAGIC or p[1]!=identifier.encode() or p[2]!=backup.sha(p[3]).encode():raise ValueError('Archived disposal ciphertext identity/checksum differs')
    raw=crypto._dpapi(p[3],identifier,False);v=backup.decode(raw)
    if not isinstance(v,dict) or set(v)!={'scope','disposalId','payloadSha256','packet'} or v['scope']!=SCOPE or v['disposalId']!=identifier or backup.encode(v)!=raw or v['payloadSha256']!=backup.sha(backup.encode(v['packet'])):raise ValueError('Archived disposal decrypted context differs')
    result=validate_packet(v['packet'])
    if result['disposalId']!=identifier:raise ValueError('Archived disposal recovered identity differs')
    return result

class FullEngineDisposalVault(crypto.RecoveryPacketVault):
    def load(self,identifier):
        p=self.path(identifier);self.directory(p.parent)
        if p.is_symlink() or not p.is_file() or p.stat().st_size>crypto.LIMIT+16384:raise ValueError('Exact encrypted archived disposal file required')
        before=p.stat()
        with p.open('rb') as stream:
            held=os.fstat(stream.fileno());data=stream.read(crypto.LIMIT+16385);after=p.lstat();final=os.fstat(stream.fileno())
            if p.is_symlink() or any(getattr(before,k)!=getattr(after,k) or getattr(held,k)!=getattr(final,k) for k in ('st_dev','st_ino','st_size','st_mtime_ns','st_ctime_ns')) or any(getattr(after,k)!=getattr(final,k) for k in ('st_dev','st_ino','st_size','st_mtime_ns')):raise ValueError('Archived disposal ciphertext changed during read')
        self.directory(p.parent);return unseal(data,identifier)
    def save(self,v,now=None):
        validate_packet(v,time.time() if now is None else now);blob=seal(v);p=self.path(v['disposalId'],True);self.directory(p.parent)
        if p.exists() or p.is_symlink():raise ValueError('Existing archived disposal packet preserved')
        with p.open('xb') as stream:
            held=os.fstat(stream.fileno());current=p.lstat()
            if p.is_symlink() or (held.st_dev,held.st_ino)!=(current.st_dev,current.st_ino):raise ValueError('Archived disposal ciphertext identity changed')
            os.chmod(p,0o600)
            if stream.write(blob)!=len(blob):raise ValueError('Archived disposal ciphertext short write')
            stream.flush();os.fsync(stream.fileno())
        if self.load(v['disposalId'])!=v:raise ValueError('Durable archived disposal DPAPI readback differs')
        return {'scope':'full-private-engine-disposal-encrypted-recovery','disposalId':v['disposalId'],'bytes':len(blob),'ciphertextSha256':backup.sha(blob),'durableDecryptReadbackVerified':True,'productionAuthorized':False}
