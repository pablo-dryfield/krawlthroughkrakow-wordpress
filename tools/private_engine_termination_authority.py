"""Distinct fresh-witness private termination contexts; no connection or writer.

Inspection, fencing and one cleanup batch have explicit, noninterchangeable
operation types. Original expired engine packets remain provenance only.
"""
import os
from pathlib import Path
import re
import time

from tools import content_update_backup as backup
from tools import content_update_recovery as crypto
from tools import full_private_engine_recovery as original

SCOPE = 'fresh-witness-private-engine-termination'
MAGIC = b'KTK-DPAPI-PRIVATE-ENGINE-TERMINATION-1\n'
OPERATIONS = {'inspect','inspect-fenced','fence','cleanup'}
FIELDS = {'schemaVersion','scope','operationId','operation','transactionId','applicationCommit','toolingCommit','originalToolingCommit','sourceHashes','expires','token','helperSha256','freshProtectedStateSha256','freshPublicOwnedSha256','witnessArchiveSha256','witnessArchiveName','originalArchiveSha256','originalManifestSha256','metadataArchiveSha256','metadataArchiveName','inspectionStateSha256','closureSha256','predecessorOperationId','fenceOperationId'}


def require(value, message):
    if not value:
        raise ValueError(message)


def validate_packet(value, now=None):
    require(isinstance(value,dict) and set(value)==FIELDS and type(value['schemaVersion']) is int and value['schemaVersion']==1 and value['scope']==SCOPE and isinstance(value['operation'],str) and value['operation'] in OPERATIONS,'Exact typed private termination context required')
    for key,size in [('operationId',32),('transactionId',32),('applicationCommit',40),('toolingCommit',40),('originalToolingCommit',40)]:
        require(backup.identifier(value[key],size),'Exact termination identity required')
    require(value['operationId']!=value['transactionId'],'Original execution authority cannot be reused')
    for key in ('helperSha256','freshProtectedStateSha256','freshPublicOwnedSha256','witnessArchiveSha256','originalArchiveSha256','originalManifestSha256'):
        require(backup.digest(value[key]),'Exact termination archive/source digest required')
    require(isinstance(value['token'],str) and re.fullmatch(r'[A-Za-z0-9_-]{43}',value['token']) is not None and type(value['expires']) is int and value['expires']>0,'Separate expiring termination token required')
    require(isinstance(value['witnessArchiveName'],str) and re.fullmatch(r'staging-protected-state-[0-9-]+\.zip',value['witnessArchiveName']) is not None,'Exact complete witness archive name required')
    hashes=value['sourceHashes']
    require(isinstance(hashes,dict) and 1<=len(hashes)<=96 and all(isinstance(n,str) and re.fullmatch(r'tools/[A-Za-z0-9._/-]+',n) is not None and not any(p in ('','.','..') for p in n.split('/')) and backup.digest(h) for n,h in hashes.items()) and len({n.casefold() for n in hashes})==len(hashes),'Exact bounded reviewed source fingerprints required')
    if value['operation']=='inspect':
        require(all(value[n] is None for n in ('metadataArchiveSha256','metadataArchiveName','inspectionStateSha256','closureSha256','predecessorOperationId','fenceOperationId')),'Inspection context cannot grant fencing or cleanup')
    else:
        for n in ('metadataArchiveSha256','inspectionStateSha256','closureSha256'):require(backup.digest(value[n]),'Verified metadata/census/closure digest required')
        require(isinstance(value['metadataArchiveName'],str) and re.fullmatch(r'ktk-private-engine-termination-metadata-[a-f0-9]{32}\.zip',value['metadataArchiveName']) is not None,'Exact retained metadata archive name required')
        require(backup.identifier(value['predecessorOperationId'],32) and value['predecessorOperationId'] not in (value['operationId'],value['transactionId']),'Separate predecessor provenance required')
        require(backup.identifier(value['fenceOperationId'],32) and value['fenceOperationId']!=value['transactionId'],'Exact fence provenance required')
        require((value['fenceOperationId']==value['operationId']) is (value['operation']=='fence'),'Fencing and cleanup contexts cannot be interchanged')
    if now is not None:require(now<value['expires']<=now+3600,'Current bounded termination lifetime required')
    require(len(backup.encode(value))<=crypto.LIMIT,'Bounded termination ciphertext payload required')
    return value


def validate_original_binding(value, old):
    validate_packet(value);original.validate_packet(old)
    require(value['transactionId']==old['transactionId'] and value['applicationCommit']==old['applicationCommit'] and value['originalToolingCommit']==old['toolingCommit'] and value['token']!=old['token'],'Exact original provenance and a new token required')
    if value['operation'] in ('inspect','fence'):require(value['freshPublicOwnedSha256']==backup.sha(backup.encode(old['publicOwned'],sort=True)),'Initial inspection/fence still requires the original public inventory')
    return value


def validate_predecessor(value, predecessor, old):
    validate_original_binding(value,old);validate_original_binding(predecessor,old)
    require(value['operation']!='inspect' and value['predecessorOperationId']==predecessor['operationId'] and value['operationId']!=predecessor['operationId'] and value['token']!=predecessor['token'],'Distinct predecessor operation and token required')
    for key in ('transactionId','applicationCommit','originalToolingCommit','originalArchiveSha256','originalManifestSha256'):
        require(value[key]==predecessor[key],'Immutable original termination provenance differs')
    require(value['witnessArchiveSha256']!=predecessor['witnessArchiveSha256'] and value['witnessArchiveName']!=predecessor['witnessArchiveName'],'Each invocation requires its own complete paired witness archive')
    if value['operation']=='fence':
        require(predecessor['operation']=='inspect' and value['freshProtectedStateSha256']==predecessor['freshProtectedStateSha256'] and value['freshPublicOwnedSha256']==predecessor['freshPublicOwnedSha256'] and value['metadataArchiveName']=='ktk-private-engine-termination-metadata-'+predecessor['operationId']+'.zip','Fence requires the exact inspection state and its metadata archive')
    else:
        require(predecessor['operation'] in ('fence','cleanup','inspect-fenced'),'Fenced inspection/cleanup requires immutable initial fence provenance')
        for key in ('metadataArchiveSha256','metadataArchiveName','inspectionStateSha256','closureSha256','fenceOperationId'):
            require(value[key]==predecessor[key],'Initial fenced archive/closure must remain immutable')
    return value


def seal(value):
    validate_packet(value);raw=backup.encode(value)
    inner=backup.encode({'scope':SCOPE,'operationId':value['operationId'],'operation':value['operation'],'payloadSha256':backup.sha(raw),'packet':value})
    cipher=crypto._dpapi(inner,value['operationId'],True)
    return MAGIC+value['operationId'].encode()+b'\n'+backup.sha(cipher).encode()+b'\n'+cipher


def unseal(blob, identifier, expected_operation):
    require(backup.identifier(identifier,32) and isinstance(expected_operation,str) and expected_operation in OPERATIONS and isinstance(blob,bytes) and len(blob)<=crypto.LIMIT+16384,'Bounded explicitly typed termination ciphertext required')
    parts=blob.split(b'\n',3)
    require(len(parts)==4 and parts[0]+b'\n'==MAGIC and parts[1]==identifier.encode() and parts[2]==backup.sha(parts[3]).encode(),'Termination ciphertext identity/checksum differs')
    raw=crypto._dpapi(parts[3],identifier,False);inner=backup.decode(raw)
    require(isinstance(inner,dict) and set(inner)=={'scope','operationId','operation','payloadSha256','packet'} and inner['scope']==SCOPE and inner['operationId']==identifier and inner['operation']==expected_operation and backup.encode(inner)==raw and inner['payloadSha256']==backup.sha(backup.encode(inner['packet'])),'Explicit decrypted termination operation differs')
    value=validate_packet(inner['packet'])
    require(value['operationId']==identifier and value['operation']==expected_operation,'Recovered termination operation differs')
    return value


class TerminationVault(crypto.RecoveryPacketVault):
    def load(self, identifier, operation):
        require(isinstance(operation,str) and operation in OPERATIONS,'Explicit recovered operation required')
        path=self.path(identifier);self.directory(path.parent)
        require(path.is_file() and not path.is_symlink() and path.stat().st_size<=crypto.LIMIT+16384,'Exact encrypted termination context required')
        before=path.stat()
        with path.open('rb') as stream:
            held=os.fstat(stream.fileno());data=stream.read(crypto.LIMIT+16385);final=os.fstat(stream.fileno());after=path.lstat()
            require(not path.is_symlink(),'Termination context path changed')
            for field in ('st_dev','st_ino','st_size','st_mtime_ns','st_ctime_ns'):require(getattr(before,field)==getattr(after,field) and getattr(held,field)==getattr(final,field),'Termination ciphertext changed while reading')
            for field in ('st_dev','st_ino','st_size','st_mtime_ns'):require(getattr(after,field)==getattr(final,field),'Held termination ciphertext differs')
        self.directory(path.parent)
        return unseal(data,identifier,operation)

    def save(self, value, now=None):
        validate_packet(value,time.time() if now is None else now)
        blob=seal(value);path=self.path(value['operationId'],True);self.directory(path.parent)
        require(not path.exists() and not path.is_symlink(),'Existing termination authority preserved')
        with path.open('xb') as stream:
            held=os.fstat(stream.fileno());current=path.lstat();require(not path.is_symlink() and (held.st_dev,held.st_ino)==(current.st_dev,current.st_ino),'Termination ciphertext identity changed')
            os.chmod(path,0o600);require(stream.write(blob)==len(blob),'Termination ciphertext short write');stream.flush();os.fsync(stream.fileno())
        require(self.load(value['operationId'],value['operation'])==value,'Durable typed termination readback differs')
        return {'scope':SCOPE,'operationId':value['operationId'],'operation':value['operation'],'bytes':len(blob),'ciphertextSha256':backup.sha(blob),'durableDecryptReadbackVerified':True,'productionAuthorized':False}
