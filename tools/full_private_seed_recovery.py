"""Separate current-user DPAPI profile for full private seed recovery; no plaintext/production fallback."""
from __future__ import annotations
import os,re,time
from tools import content_update_backup as backup
from tools import content_update_recovery as legacy
from tools import full_private_seed_packet as full

MAGIC=b'KTK-DPAPI-FULL-SEEDS-1\n'
EARLY_MAGIC=b'KTK-DPAPI-EARLY-FULL-SEEDS-1\n'
FIELDS={'schemaVersion','scope','transactionId','applicationCommit','toolingCommit','helperSha256','sourceHashes','expires','token','ownershipKey','plan','publicOwned','publicSizes','interruptOriginal'}

def profile(value):
    early=isinstance(value,dict) and value.get('entryProfile')=='early'
    if not isinstance(value,dict) or set(value)!=(FIELDS|{'entryProfile'} if early else FIELDS) or value.get('scope')!=('full-private-seed-early-caller-recovery' if early else 'full-private-seed-caller-recovery'):
        raise ValueError('Exact legacy or explicit early private recovery profile required')
    return 'early' if early else 'late'

def validate_packet(value,now=None):
    profile(value)
    if type(value['schemaVersion']) is not int or value['schemaVersion']!=1 or not backup.identifier(value['transactionId'],32) or not backup.identifier(value['applicationCommit'],40) or not backup.identifier(value['toolingCommit'],40) or not backup.digest(value['helperSha256']) or not backup.digest(value['ownershipKey']) or not isinstance(value['token'],str) or re.fullmatch(r'[A-Za-z0-9_-]{43}',value['token']) is None or type(value['expires']) is not int or value['expires']<=0 or type(value['interruptOriginal']) is not bool:
        raise ValueError('Exact full private seed recovery packet required; no production or arbitrary fields')
    if now is not None and not now<value['expires']<=now+3600:raise ValueError('Current bounded full seed packet lifetime required')
    hashes=value['sourceHashes']
    if not isinstance(hashes,dict) or not 1<=len(hashes)<=60 or len({n.casefold() for n in hashes if isinstance(n,str)})!=len(hashes) or any(not isinstance(n,str) or not re.fullmatch(r'tools/[A-Za-z0-9._/-]+',n) or any(p in ('','.','..') for p in n.split('/')) or not backup.digest(v) for n,v in hashes.items()):raise ValueError('Exact full seed source fingerprints required')
    plan=value['plan']
    if not isinstance(plan,dict) or not backup.digest(plan.get('protectedStateSha256')):raise ValueError('Exact full private seed plan required')
    expected,sizes,_=full.plan(value['transactionId'],value['applicationCommit'],value['publicOwned'],value['publicSizes'],plan['protectedStateSha256'])
    if plan!=expected or value['publicSizes']!=sizes or len(backup.encode(value))>legacy.LIMIT:raise ValueError('Full seed packet differs from its deterministic complete inventory')
    return value

def seal(value):
    validate_packet(value);raw=backup.encode(value);inner=backup.encode({'scope':value['scope'],'transactionId':value['transactionId'],'payloadSha256':backup.sha(raw),'packet':value});cipher=legacy._dpapi(inner,value['transactionId'],True)
    return (EARLY_MAGIC if profile(value)=='early' else MAGIC)+value['transactionId'].encode()+b'\n'+backup.sha(cipher).encode()+b'\n'+cipher

def unseal(blob,transaction):
    if not backup.identifier(transaction,32) or not isinstance(blob,bytes) or len(blob)>legacy.LIMIT+16384:raise ValueError('Exact bounded encrypted full seed packet required')
    parts=blob.split(b'\n',3)
    if len(parts)!=4 or parts[0]+b'\n' not in (MAGIC,EARLY_MAGIC) or parts[1]!=transaction.encode() or parts[2]!=backup.sha(parts[3]).encode():raise ValueError('Full seed ciphertext identity/checksum differs')
    raw=legacy._dpapi(parts[3],transaction,False);inner=backup.decode(raw)
    expected_scope='full-private-seed-early-caller-recovery' if parts[0]+b'\n'==EARLY_MAGIC else 'full-private-seed-caller-recovery'
    if not isinstance(inner,dict) or set(inner)!={'scope','transactionId','payloadSha256','packet'} or inner['scope']!=expected_scope or inner['transactionId']!=transaction or backup.encode(inner)!=raw or inner['payloadSha256']!=backup.sha(backup.encode(inner['packet'])):raise ValueError('Full seed decrypted context differs')
    value=validate_packet(inner['packet'])
    if value['transactionId']!=transaction or value['scope']!=expected_scope:raise ValueError('Full seed recovered transaction or profile differs')
    return value

class FullSeedPacketVault(legacy.RecoveryPacketVault):
    def load(self,transaction):
        path=self.path(transaction);self.directory(path.parent)
        if path.is_symlink() or not path.is_file() or path.stat().st_size>legacy.LIMIT+16384:raise ValueError('Exact bounded encrypted full seed packet file required')
        with path.open('rb') as stream:
            self.directory(path.parent);held=os.fstat(stream.fileno());current=path.lstat()
            if path.is_symlink() or (held.st_dev,held.st_ino)!=(current.st_dev,current.st_ino):raise ValueError('Full seed encrypted packet identity changed')
            blob=stream.read(legacy.LIMIT+16385);self.directory(path.parent);after=path.lstat()
            if len(blob)>legacy.LIMIT+16384 or path.is_symlink() or any(getattr(after,k)!=getattr(current,k) for k in ('st_dev','st_ino','st_size','st_mtime_ns','st_ctime_ns')):raise ValueError('Full seed encrypted packet changed while reading')
        return unseal(blob,transaction)
    def save(self,value,now=None):
        validate_packet(value,time.time() if now is None else now);blob=seal(value);path=self.path(value['transactionId'],True)
        if path.exists() or path.is_symlink():raise ValueError('Existing full seed encrypted packet preserved')
        self.directory(path.parent)
        with path.open('xb') as stream:
            self.directory(path.parent);held=os.fstat(stream.fileno());current=path.lstat()
            if path.is_symlink() or (held.st_dev,held.st_ino)!=(current.st_dev,current.st_ino):raise ValueError('Full seed encrypted packet changed during creation')
            os.chmod(path,0o600)
            if stream.write(blob)!=len(blob):raise ValueError('Full seed encrypted packet write incomplete')
            stream.flush();os.fsync(stream.fileno());self.directory(path.parent)
        if backup.encode(self.load(value['transactionId']))!=backup.encode(value):raise ValueError('Full seed durable DPAPI readback differs')
        return {'scope':'full-private-seed-encrypted-recovery','transactionId':value['transactionId'],'ciphertextSha256':backup.sha(blob),'bytes':len(blob),'durableDecryptReadbackVerified':True,'productionAuthorized':False}
