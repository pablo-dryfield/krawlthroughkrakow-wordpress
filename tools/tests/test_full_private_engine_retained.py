import copy,unittest
from unittest import mock
from pathlib import PurePosixPath
from tools import content_update_backup as backup
from tools import full_private_engine_retained as retained
from tools.tests.test_full_private_engine_disposal_support import fixture

class ReadOnlyFTP:
 def __init__(self,packet):
  self.root='/.ktk-content-update-'+packet['transactionId'];self.calls=[];self.overrides={};self.during=None;self.files={}
  for n,row in packet['authority']['retained'].items():
   body=b'' if n.startswith('engine/target-') else ('retained fixture '+n).encode();self.files[self.root+'/'+n]=body;row.update(sha256=backup.sha(body),bytes=len(body))
  a=packet['authority'];a['authoritySha256']=backup.sha(backup.encode({k:v for k,v in a.items() if k!='authoritySha256'},sort=True));self.dirs={self.root,self.root+'/control',self.root+'/engine',self.root+'/engine/'+packet['transactionId'],self.root+'/engine/'+packet['transactionId']+'/receipts',self.root+'/engine/'+packet['transactionId']+'/pending'}
 def sendcmd(self,command):
  self.calls.append(command);assert command.startswith('MLST ');p=command[5:]
  if p in self.files:f={'type':'file','size':str(len(self.files[p])),'unique':backup.sha(p.encode())[:16]}
  elif p in self.dirs:f={'type':'dir','unique':backup.sha(p.encode())[:16]}
  else:raise OSError('Unknown retained fixture path')
  f.update(self.overrides.get(p,{}));return '250-Listing\n '+''.join(k+'='+v+';' for k,v in f.items())+' '+p+'\n250 End'
 def mlsd(self,path):
  self.calls.append('MLSD '+path);assert path in self.dirs;result=[]
  for n,kind in [(n,'dir') for n in self.dirs if n!=self.root]+[(n,'file') for n in self.files]:
   if n.rsplit('/',1)[0]==path:result.append((n.rsplit('/',1)[1],{'type':kind,**self.overrides.get(n,{})}))
  return result
 def retrbinary(self,command,receive):
  self.calls.append(command);assert command.startswith('RETR ');p=command[5:];receive(self.files[p])
  if self.during:self.during(p)

class FullEngineRetainedTests(unittest.TestCase):
 def test_fresh_read_only_census_seven_exact_records_and_both_archives(self):
  p=fixture();ftp=ReadOnlyFTP(p);verifier=mock.Mock(return_value=True);result=retained.verify_retained(ftp,p,verifier);self.assertEqual(result['exactRetainedMetadataFiles'],7);self.assertTrue(result['payloadTreesAbsent']);self.assertEqual(verifier.call_count,2);self.assertTrue(all(c.startswith(('MLST ','MLSD ','RETR ')) for c in ftp.calls));self.assertEqual({c[5:] for c in ftp.calls if c.startswith('RETR ')},set(ftp.files))
 def test_unknown_file_payload_tree_alias_and_changed_bytes_are_preserved(self):
  for change in ('file','payload','alias','bytes'):
   p=fixture();ftp=ReadOnlyFTP(p)
   if change=='file':ftp.files[ftp.root+'/control/unknown']=b'preserve'
   elif change=='payload':ftp.dirs.add(ftp.root+'/source')
   elif change=='alias':ftp.overrides[ftp.root+'/control/closed.json']={'type':'OS.unix=slink'}
   else:ftp.files[ftp.root+'/control/closed.json']+=b'changed'
   with self.assertRaises(ValueError):retained.verify_retained(ftp,p,lambda:True)
   self.assertTrue(all(c.startswith(('MLST ','MLSD ','RETR ')) for c in ftp.calls))
 def test_transfer_change_and_bad_archives_stop_without_retry_or_writes(self):
  p=fixture();ftp=ReadOnlyFTP(p);ftp.during=lambda n:ftp.overrides.update({n:{'unique':'changed'}})
  with self.assertRaises(ValueError):retained.verify_retained(ftp,p,lambda:True)
  self.assertEqual(len([c for c in ftp.calls if c.startswith('RETR ')]),1);p=fixture();ftp=ReadOnlyFTP(p)
  with self.assertRaises(ValueError):retained.verify_retained(ftp,p,lambda:False)
  self.assertFalse(ftp.calls)

if __name__=='__main__':unittest.main()
