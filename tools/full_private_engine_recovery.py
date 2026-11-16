"""Distinct current-user encrypted full private engine recovery; no production/default fallback."""
from __future__ import annotations
import os,re,time
from tools import content_update_backup as backup
from tools import content_update_recovery as legacy
from tools import full_private_seed_packet as full
from tools.full_private_engine_packet import MAX_LIFETIME

MAGIC=b'KTK-DPAPI-FULL-PRIVATE-ENGINE-1\n'
SCOPE='full-private-engine-caller-recovery'
FIELDS={'schemaVersion','scope','entryProfile','transactionId','applicationCommit','toolingCommit','helperSha256','sourceHashes','expires','token','ownershipKey','plan','publicOwned','publicSizes','interruptOriginal','interruptEngine'}

def validate_packet(v,now=None):
    if not isinstance(v,dict) or set(v)!=FIELDS or type(v['schemaVersion']) is not int or v['schemaVersion']!=1 or v['scope']!=SCOPE or v['entryProfile']!='early' or not backup.identifier(v['transactionId'],32) or not backup.identifier(v['applicationCommit'],40) or not backup.identifier(v['toolingCommit'],40) or not backup.digest(v['helperSha256']) or not backup.digest(v['ownershipKey']) or not isinstance(v['token'],str) or re.fullmatch(r'[A-Za-z0-9_-]{43}',v['token']) is None or type(v['expires']) is not int or v['expires']<=0 or any(type(v[k]) is not bool for k in ('interruptOriginal','interruptEngine')):raise ValueError('Exact explicit early private engine packet required')
    if now is not None and not now<v['expires']<=now+MAX_LIFETIME:raise ValueError('Current bounded private engine lifetime required')
    hashes=v['sourceHashes']
    if not isinstance(hashes,dict) or not 1<=len(hashes)<=80 or len({n.casefold() for n in hashes if isinstance(n,str)})!=len(hashes) or any(not isinstance(n,str) or re.fullmatch(r'tools/[A-Za-z0-9._/-]+',n) is None or any(p in ('','.','..') for p in n.split('/')) or not backup.digest(h) for n,h in hashes.items()):raise ValueError('Exact private engine reviewed fingerprints required')
    plan=v['plan']
    if not isinstance(plan,dict) or not backup.digest(plan.get('protectedStateSha256')):raise ValueError('Exact full private plan required')
    expected,sizes,_=full.plan(v['transactionId'],v['applicationCommit'],v['publicOwned'],v['publicSizes'],plan['protectedStateSha256'])
    if plan!=expected or sizes!=v['publicSizes'] or len(backup.encode(v))>legacy.LIMIT:raise ValueError('Private engine packet differs from deterministic inventory or budget')
    return v
def seal(v):
    validate_packet(v);raw=backup.encode(v);inner=backup.encode({'scope':SCOPE,'transactionId':v['transactionId'],'payloadSha256':backup.sha(raw),'packet':v});cipher=legacy._dpapi(inner,v['transactionId'],True);return MAGIC+v['transactionId'].encode()+b'\n'+backup.sha(cipher).encode()+b'\n'+cipher
def unseal(blob,transaction):
    if not backup.identifier(transaction,32) or not isinstance(blob,bytes) or len(blob)>legacy.LIMIT+16384:raise ValueError('Bounded explicit encrypted private engine packet required')
    parts=blob.split(b'\n',3)
    if len(parts)!=4 or parts[0]+b'\n'!=MAGIC or parts[1]!=transaction.encode() or parts[2]!=backup.sha(parts[3]).encode():raise ValueError('Private engine ciphertext identity/checksum differs')
    raw=legacy._dpapi(parts[3],transaction,False);inner=backup.decode(raw)
    if not isinstance(inner,dict) or set(inner)!={'scope','transactionId','payloadSha256','packet'} or inner['scope']!=SCOPE or inner['transactionId']!=transaction or backup.encode(inner)!=raw or inner['payloadSha256']!=backup.sha(backup.encode(inner['packet'])):raise ValueError('Private engine decrypted context differs')
    v=validate_packet(inner['packet'])
    if v['transactionId']!=transaction:raise ValueError('Private engine recovered identity differs')
    return v
class FullPrivateEngineVault(legacy.RecoveryPacketVault):
    def load(self,transaction):
        p=self.path(transaction);self.directory(p.parent)
        if p.is_symlink() or not p.is_file() or p.stat().st_size>legacy.LIMIT+16384:raise ValueError('Exact bounded encrypted private engine file required')
        with p.open('rb') as stream:
            self.directory(p.parent);held=os.fstat(stream.fileno());current=p.lstat()
            if p.is_symlink() or (held.st_dev,held.st_ino)!=(current.st_dev,current.st_ino):raise ValueError('Private engine encrypted identity changed')
            blob=stream.read(legacy.LIMIT+16385);self.directory(p.parent);after=p.lstat()
            if len(blob)>legacy.LIMIT+16384 or p.is_symlink() or any(getattr(after,k)!=getattr(current,k) for k in ('st_dev','st_ino','st_size','st_mtime_ns','st_ctime_ns')):raise ValueError('Private engine encrypted file changed while reading')
        return unseal(blob,transaction)
    def save(self,v,now=None):
        validate_packet(v,time.time() if now is None else now);blob=seal(v);p=self.path(v['transactionId'],True)
        if p.exists() or p.is_symlink():raise ValueError('Existing private engine packet preserved')
        self.directory(p.parent)
        with p.open('xb') as stream:
            self.directory(p.parent);held=os.fstat(stream.fileno());current=p.lstat()
            if p.is_symlink() or (held.st_dev,held.st_ino)!=(current.st_dev,current.st_ino):raise ValueError('Private engine packet changed during creation')
            os.chmod(p,0o600)
            if stream.write(blob)!=len(blob):raise ValueError('Private engine encrypted write incomplete')
            stream.flush();os.fsync(stream.fileno());self.directory(p.parent)
        if backup.encode(self.load(v['transactionId']))!=backup.encode(v):raise ValueError('Durable private engine encrypted readback differs')
        return {'scope':'full-private-engine-encrypted-recovery','transactionId':v['transactionId'],'ciphertextSha256':backup.sha(blob),'bytes':len(blob),'durableDecryptReadbackVerified':True,'productionAuthorized':False}
