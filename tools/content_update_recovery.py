"""Immutable current-user Windows DPAPI recovery packets for private staging only. No connection or release authorization."""
from __future__ import annotations
import ctypes,os,re,time
from ctypes import wintypes
from pathlib import Path
from tools import content_update_backup as backup
from tools import content_update_staging_packet as staging

MAGIC=b'KTK-DPAPI-PACKET-1\n';LIMIT=2097152
FIELDS={'schemaVersion','mode','transactionId','applicationCommit','toolingCommit','helperSha256','sourceHashes','expires','token','ownershipKey','plan','publicOwned'}

def validate_packet(packet,now=None):
 if not isinstance(packet,dict) or set(packet) not in (FIELDS,FIELDS|{'preparationFault'}) or 'preparationFault' in packet and type(packet['preparationFault']) is not bool or type(packet['schemaVersion']) is not int or packet['schemaVersion']!=1 or packet['mode']!='private-staging-rehearsal' or not backup.identifier(packet['transactionId'],32) or not backup.identifier(packet['applicationCommit'],40) or not backup.identifier(packet['toolingCommit'],40) or not backup.digest(packet['helperSha256']) or not backup.digest(packet['ownershipKey']) or not isinstance(packet['token'],str) or re.fullmatch('[A-Za-z0-9_-]{43}',packet['token']) is None or type(packet['expires']) is not int or packet['expires']<=0:raise ValueError('Exact private-staging recovery packet required; no production or arbitrary fields')
 if now is not None and not now<packet['expires']<=now+3600:raise ValueError('Current bounded packet lifetime required before initial persistence')
 hashes=packet['sourceHashes'];owned=packet['publicOwned']
 if not isinstance(hashes,dict) or not 1<=len(hashes)<=50 or any(not isinstance(name,str) or not re.fullmatch(r'tools/[A-Za-z0-9._/-]+',name) or any(part in ('','.','..') for part in name.split('/')) or not backup.digest(value) for name,value in hashes.items()) or len({name.casefold() for name in hashes})!=len(hashes):raise ValueError('Exact reviewed source fingerprints required')
 if not isinstance(owned,dict) or not 2<=len(owned)<=10000 or not all(isinstance(name,str) for name in owned) or not {'ktk-code-pages.php','ktk-code-pages-assets/registry.php'}<=set(owned) or len({name.casefold() for name in owned})!=len(owned):raise ValueError('Complete unambiguous public owned inventory required')
 for name,value in owned.items():
  backup.owned_name(name)
  if not backup.digest(value):raise ValueError('Exact public owned fingerprint required')
 plan=packet['plan']
 if not isinstance(plan,dict) or not backup.digest(plan.get('protectedStateSha256')) or plan!=staging.fixture_plan(packet['transactionId'],packet['applicationCommit'],plan['protectedStateSha256']):raise ValueError('Exact compiled synthetic staging fixture plan required')
 if len(backup.encode(packet))>LIMIT:raise ValueError('Bounded recovery packet required')
 return packet

def _dpapi(data,transaction,protect):
 if os.name!='nt':raise RuntimeError('Current-user Windows DPAPI required; no plaintext fallback')
 if not isinstance(data,bytes) or not 1<=len(data)<=LIMIT+8192 or not backup.identifier(transaction,32):raise ValueError('Bounded transaction-bound DPAPI bytes required')
 class Blob(ctypes.Structure):_fields_=[('cbData',wintypes.DWORD),('pbData',ctypes.POINTER(ctypes.c_ubyte))]
 crypt=ctypes.WinDLL('Crypt32.dll',use_last_error=True);kernel=ctypes.WinDLL('Kernel32.dll',use_last_error=True);function=crypt.CryptProtectData if protect else crypt.CryptUnprotectData
 function.argtypes=[ctypes.POINTER(Blob),wintypes.LPCWSTR if protect else ctypes.c_void_p,ctypes.POINTER(Blob),ctypes.c_void_p,ctypes.c_void_p,wintypes.DWORD,ctypes.POINTER(Blob)];function.restype=wintypes.BOOL;kernel.LocalFree.argtypes=[ctypes.c_void_p];kernel.LocalFree.restype=ctypes.c_void_p
 entropy=bytes.fromhex(backup.sha(('KTK-private-staging-recovery-v1|'+transaction).encode()));input_buffer=ctypes.create_string_buffer(data);entropy_buffer=ctypes.create_string_buffer(entropy);incoming=Blob(len(data),ctypes.cast(input_buffer,ctypes.POINTER(ctypes.c_ubyte)));optional=Blob(len(entropy),ctypes.cast(entropy_buffer,ctypes.POINTER(ctypes.c_ubyte)));outgoing=Blob()
 try:
  # UI_FORBIDDEN only; LOCAL_MACHINE is deliberately never supplied. No prompt/description data is requested.
  if not function(ctypes.byref(incoming),None,ctypes.byref(optional),None,None,1,ctypes.byref(outgoing)):raise ValueError('Current-user DPAPI operation failed')
  if not outgoing.pbData or not 1<=outgoing.cbData<=LIMIT+8192:raise ValueError('Unexpected DPAPI output budget')
  return ctypes.string_at(outgoing.pbData,outgoing.cbData)
 finally:
  ctypes.memset(input_buffer,0,ctypes.sizeof(input_buffer));ctypes.memset(entropy_buffer,0,ctypes.sizeof(entropy_buffer))
  if outgoing.pbData:ctypes.memset(outgoing.pbData,0,outgoing.cbData);kernel.LocalFree(ctypes.cast(outgoing.pbData,ctypes.c_void_p))

def seal(packet):
 validate_packet(packet);raw=backup.encode(packet);inner=backup.encode({'scope':'private-staging-caller-recovery','transactionId':packet['transactionId'],'payloadSha256':backup.sha(raw),'packet':packet});cipher=_dpapi(inner,packet['transactionId'],True)
 return MAGIC+packet['transactionId'].encode()+b'\n'+backup.sha(cipher).encode()+b'\n'+cipher

def unseal(blob,transaction):
 if not backup.identifier(transaction,32) or not isinstance(blob,bytes) or len(blob)>LIMIT+16384:raise ValueError('Exact bounded encrypted recovery packet required')
 parts=blob.split(b'\n',3)
 if len(parts)!=4 or parts[0]+b'\n'!=MAGIC or parts[1]!=transaction.encode() or parts[2]!=backup.sha(parts[3]).encode():raise ValueError('Encrypted packet transaction or checksum differs')
 raw=_dpapi(parts[3],transaction,False);inner=backup.decode(raw)
 if not isinstance(inner,dict) or set(inner)!={'scope','transactionId','payloadSha256','packet'} or inner['scope']!='private-staging-caller-recovery' or inner['transactionId']!=transaction or backup.encode(inner)!=raw or inner['payloadSha256']!=backup.sha(backup.encode(inner['packet'])):raise ValueError('Decrypted packet context or intrinsic checksum differs')
 packet=validate_packet(inner['packet'])
 if packet['transactionId']!=transaction:raise ValueError('Recovered transaction differs')
 return packet

class RecoveryPacketVault:
 def __init__(self,home=None):self.home=Path.home() if home is None else Path(home)
 @staticmethod
 def directory(path):
  if not path.is_absolute() or path.resolve()!=path or not path.is_dir() or any(part.is_symlink() for part in [path,*path.parents]):raise ValueError('Canonical non-symlink user packet directory required')
 def path(self,transaction,create=False):
  if not backup.identifier(transaction,32):raise ValueError('Exact recovery transaction required')
  self.directory(self.home);directory=self.home
  for name in ('.ktk','content-update-packets'):
   directory=directory/name
   if directory.is_symlink() or directory.exists() and not directory.is_dir():raise ValueError('Existing unknown packet namespace preserved')
   if not directory.exists():
    if not create:raise ValueError('Existing encrypted packet directory required')
    directory.mkdir(mode=0o700)
   self.directory(directory)
  return directory/(transaction+'.dpapi')
 def load(self,transaction):
  path=self.path(transaction);self.directory(path.parent)
  if path.is_symlink() or not path.is_file() or path.stat().st_size>LIMIT+16384:raise ValueError('Exact bounded encrypted packet file required')
  with path.open('rb') as stream:
   self.directory(path.parent)
   held=os.fstat(stream.fileno());current=path.lstat()
   if path.is_symlink() or (held.st_dev,held.st_ino)!=(current.st_dev,current.st_ino):raise ValueError('Encrypted packet identity changed')
   blob=stream.read(LIMIT+16385)
   self.directory(path.parent);after=path.lstat()
   if len(blob)>LIMIT+16384 or path.is_symlink() or (after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns)!=(current.st_dev,current.st_ino,current.st_size,current.st_mtime_ns,current.st_ctime_ns):raise ValueError('Encrypted packet changed while reading')
  return unseal(blob,transaction)
 def save(self,packet,now=None):
  validate_packet(packet,time.time() if now is None else now);blob=seal(packet);path=self.path(packet['transactionId'],True)
  if path.exists() or path.is_symlink():raise ValueError('Existing encrypted packet preserved; no overwrite or plaintext fallback')
  self.directory(path.parent)
  with path.open('xb') as stream:
   self.directory(path.parent)
   held=os.fstat(stream.fileno());current=path.lstat()
   if path.is_symlink() or (held.st_dev,held.st_ino)!=(current.st_dev,current.st_ino):raise ValueError('Fresh encrypted packet identity changed')
   os.chmod(path,0o600)
   if stream.write(blob)!=len(blob):raise ValueError('Encrypted packet write incomplete; preserve for review')
   stream.flush();os.fsync(stream.fileno());self.directory(path.parent)
  if backup.encode(self.load(packet['transactionId']))!=backup.encode(packet):raise ValueError('Encrypted packet durable readback differs')
  return {'scope':'private-staging-encrypted-recovery','transactionId':packet['transactionId'],'ciphertextSha256':backup.sha(blob),'bytes':len(blob),'durableDecryptReadbackVerified':True,'productionAuthorized':False}
