import contextlib,copy,json,unittest,zipfile
from pathlib import Path
from tools import content_update_backup as backup
from tools import content_update_staging_packet as staging
from tools.content_update_staging_disposal import PrivateStagingDisposer,PrivateDisposalError
from tools.tests import test_content_update_recovery as recovery_fixtures
from tools.tests import test_content_update_staging_packet as packet_fixtures
from tools.tests import test_content_update_staging_transport as transport_fixtures

class TreeFTP(transport_fixtures.PrivateFTP):
 def __init__(self,manifest,private):
  super().__init__(manifest,private);self.private=Path(private).resolve();self.files={self.root+'/'+p.relative_to(self.private).as_posix():p.read_bytes() for p in self.private.rglob('*') if p.is_file()};self.directories={self.root}|{self.root+'/'+p.relative_to(self.private).as_posix() for p in self.private.rglob('*') if p.is_dir()};self.delete_count=0;self.fail_delete=None;self.fail_rmdir=None
 def local(self,path):
  assert path.startswith(self.root+'/');relative=path[len(self.root)+1:];assert all(part not in ('','.','..') for part in relative.split('/'));target=self.private/relative;assert target.resolve().is_relative_to(self.private);return target
 def mlsd(self,path):
  self.calls.append('MLSD '+path)
  if path not in self.directories:raise OSError('Missing private fixture directory')
  rows=[]
  for member,kind in [(name,'dir') for name in self.directories if name!=self.root]+[(name,'file') for name in self.files]:
   if member.rsplit('/',1)[0]!=path:continue
   facts={'type':kind};facts.update(self.overrides.get(member,{}));rows.append((member.rsplit('/',1)[1],facts))
  return rows
 def delete(self,path):
  self.calls.append('DELE '+path);assert path in self.files;assert self.local(path).read_bytes()==self.files[path];self.local(path).unlink();del self.files[path];self.delete_count+=1
  if self.fail_delete==self.delete_count:raise EOFError('Simulated lost delete reply')
 def rmd(self,path):
  self.calls.append('RMD '+path);assert path in self.directories;assert not any(member.startswith(path+'/') for member in set(self.files)|self.directories);self.local(path).rmdir();self.directories.remove(path)
  if self.fail_rmdir: self.fail_rmdir=False;raise EOFError('Simulated lost rmdir reply')

@unittest.skipUnless(packet_fixtures.fixtures.PHP,'PHP required for signed real-engine disposal fixtures')
class PrivateStagingDisposalTests(unittest.TestCase):
 @contextlib.contextmanager
 def fixture(self,closed=True):
  fixture=packet_fixtures.StagingControllerPacketTests()
  with fixture.fixture() as values:
   root,mu,private,config,source,binding,client,request,calls,owned,expiry=values;client.prepare();state=client.export_and_acknowledge(root/'deploy-backups/disposal.zip')
   for index in range(5):state=client.step('apply')
   for index in range(5):state=client.step('rollback')
   if closed:client.close()
   packet=recovery_fixtures.packet(expiry);packet.update(helperSha256=backup.sha(source),ownershipKey=client.key,publicOwned=owned,plan=staging.fixture_plan(packet['transactionId'],packet['applicationCommit'],client.manifest['protectedStateSha256']));ftp=TreeFTP(client.manifest,private);before={p.relative_to(root/'public_html').as_posix():backup.sha(p.read_bytes()) for p in (root/'public_html').rglob('*') if p.is_file()};archive=root/'deploy-backups/disposal.zip';archive_sha=backup.sha(archive.read_bytes())
   yield root,private,packet,archive,ftp,client
   self.assertEqual({p.relative_to(root/'public_html').as_posix():backup.sha(p.read_bytes()) for p in (root/'public_html').rglob('*') if p.is_file()},before)
   # Individual archive-corruption tests check their explicit preservation behavior themselves.
 def disposer(self,ftp,packet,archive,observer=None):return PrivateStagingDisposer(ftp,packet,archive,observer)
 def writes(self,ftp):return [command for command in ftp.calls if command.startswith(('DELE ','RMD ','STOR ','RNFR ','RNTO '))]
 def test_removes_nineteen_known_payload_files_and_keeps_seven_metadata_files_and_archive(self):
  with self.fixture() as (root,private,packet,archive,ftp,client):
   original=archive.read_bytes();result=self.disposer(ftp,packet,archive).dispose();self.assertEqual(result['removedPayloadFiles'],19);self.assertEqual(result['alreadyAbsentPayloadFiles'],0);self.assertEqual(len(result['retainedMetadata']),7);self.assertTrue(result['rawOriginalStateRemoved']);self.assertFalse((private/'control/original-state.json').exists());self.assertFalse((private/'source').exists());self.assertFalse((private/'target').exists());self.assertFalse((private/'engine'/packet['transactionId']/'prior').exists());self.assertEqual(archive.read_bytes(),original);self.assertTrue((private/'control/closed.json').exists());self.assertTrue((private/'engine'/packet['transactionId']/'journal.json').exists());self.assertTrue(all(command.split(' ',1)[1].startswith(ftp.root+'/') for command in self.writes(ftp)));self.assertFalse(any(command.startswith(('STOR ','RNFR ','RNTO ')) for command in ftp.calls))
   deletes=[command[5:] for command in ftp.calls if command.startswith('DELE ')];self.assertTrue(deletes[-1].endswith('/control/original-state.json'))
 def test_second_explicit_disposal_is_read_only_and_reports_already_absent_members(self):
  with self.fixture() as (root,private,packet,archive,ftp,client):
   first=self.disposer(ftp,packet,archive).dispose();before=len(self.writes(ftp));second=self.disposer(ftp,packet,archive).dispose();self.assertEqual(second['removedPayloadFiles'],0);self.assertEqual(second['alreadyAbsentPayloadFiles'],19);self.assertEqual(second['retainedMetadata'],first['retainedMetadata']);self.assertEqual(len(self.writes(ftp)),before)
 def test_lost_delete_reply_stops_without_retry_then_explicit_recovery_handles_remaining_payload(self):
  with self.fixture() as (root,private,packet,archive,ftp,client):
   ftp.fail_delete=2
   with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive).dispose()
   self.assertEqual(ftp.delete_count,2);self.assertTrue((private/'control/original-state.json').exists());ftp.fail_delete=None;result=self.disposer(ftp,packet,archive).dispose();self.assertEqual(result['alreadyAbsentPayloadFiles'],2);self.assertEqual(result['removedPayloadFiles'],17);self.assertEqual(len(result['retainedMetadata']),7)
 def test_lost_rmdir_reply_stops_then_explicit_recovery_removes_only_remaining_empty_directories(self):
  with self.fixture() as (root,private,packet,archive,ftp,client):
   ftp.fail_rmdir=True
   with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive).dispose()
   self.assertEqual(ftp.delete_count,19);result=self.disposer(ftp,packet,archive).dispose();self.assertEqual(result['alreadyAbsentPayloadFiles'],19);self.assertEqual(result['removedPayloadFiles'],0);self.assertTrue(result['declaredSyntheticPayloadRemoved'])
 def test_changed_payload_before_preflight_is_preserved_with_no_deletion(self):
  with self.fixture() as (root,private,packet,archive,ftp,client):
   path=ftp.root+'/source/ktk-code-pages-assets/runtime.css';ftp.files[path]=b'externally changed owner bytes';ftp.local(path).write_bytes(ftp.files[path])
   with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive).dispose()
   self.assertEqual(self.writes(ftp),[]);self.assertEqual(ftp.local(path).read_bytes(),b'externally changed owner bytes')
 def test_unknown_file_or_directory_is_not_descended_or_deleted(self):
  for kind in ('file','directory'):
   with self.fixture() as (root,private,packet,archive,ftp,client):
    path=ftp.root+'/owner-note'
    if kind=='file':ftp.files[path]=b'preserve owner note';ftp.local(path).write_bytes(ftp.files[path])
    else:ftp.directories.add(path);ftp.local(path).mkdir()
    with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive).dispose()
    self.assertEqual(self.writes(ftp),[]);self.assertNotIn('MLSD '+path,ftp.calls);self.assertTrue(ftp.local(path).exists())
 def test_change_after_preflight_is_preserved_before_the_first_delete(self):
  with self.fixture() as (root,private,packet,archive,ftp,client):
   changed=[]
   def mutate(event,name):
    if event=='before-delete' and not changed:
     path=ftp.root+'/'+name;ftp.files[path]=b'X'+ftp.files[path][1:];ftp.local(path).write_bytes(ftp.files[path]);changed.append(path)
   with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive,mutate).dispose()
   self.assertEqual(self.writes(ftp),[]);self.assertEqual(ftp.local(changed[0]).read_bytes(),ftp.files[changed[0]])
 def test_unknown_file_after_preflight_is_preserved_before_mutation(self):
  with self.fixture() as (root,private,packet,archive,ftp,client):
   def mutate(event,name):
    if event=='before-delete':path=ftp.root+'/external';ftp.files[path]=b'owner data';ftp.local(path).write_bytes(ftp.files[path])
   with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive,mutate).dispose()
   self.assertEqual(self.writes(ftp),[]);self.assertTrue((private/'external').exists())
 def test_symlink_metadata_file_or_parent_is_refused_without_deletion(self):
  for relative in ('','control','source/ktk-code-pages-assets/runtime.css'):
   with self.fixture() as (root,private,packet,archive,ftp,client):
    ftp.overrides[ftp.root+('/'+relative if relative else '')]={'type':'OS.unix=slink'}
    with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive).dispose()
    self.assertEqual(self.writes(ftp),[])
 def test_unknown_or_partial_engine_receipt_is_preserved_for_review(self):
  with self.fixture() as (root,private,packet,archive,ftp,client):
   relative='engine/'+packet['transactionId']+'/receipts/.ktk-receipt-journal-'+'f'*32;path=ftp.root+'/'+relative;ftp.files[path]=b'partial';ftp.local(path).parent.mkdir(exist_ok=True);ftp.directories.add(path.rsplit('/',1)[0]);ftp.local(path).write_bytes(b'partial')
   with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive).dispose()
   self.assertEqual(self.writes(ftp),[]);self.assertEqual(ftp.local(path).read_bytes(),b'partial')
 def test_changed_root_marker_or_signed_closure_is_preserved_with_no_deletion(self):
  for relative in ('owner.marker','control/closed.json'):
   with self.fixture() as (root,private,packet,archive,ftp,client):
    path=ftp.root+'/'+relative;ftp.files[path]=b'X'+ftp.files[path][1:];ftp.local(path).write_bytes(ftp.files[path])
    with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive).dispose()
    self.assertEqual(self.writes(ftp),[])
 def test_unknown_engine_journal_field_blocks_disposal_and_is_retained(self):
  with self.fixture() as (root,private,packet,archive,ftp,client):
   path=ftp.root+'/engine/'+packet['transactionId']+'/journal.json';journal=backup.decode(ftp.files[path]);journal['externalOwnerNote']='must be preserved';ftp.files[path]=backup.encode(journal);ftp.local(path).write_bytes(ftp.files[path])
   with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive).dispose()
   self.assertEqual(self.writes(ftp),[]);self.assertIn(b'externalOwnerNote',ftp.local(path).read_bytes())
 def test_retained_journal_change_after_preflight_blocks_the_first_delete(self):
  with self.fixture() as (root,private,packet,archive,ftp,client):
   changed=[]
   def mutate(event,name):
    if event=='before-delete' and not changed:
     path=ftp.root+'/engine/'+packet['transactionId']+'/journal.json';journal=backup.decode(ftp.files[path]);journal['externalOwnerNote']='preserve changed retained metadata';ftp.files[path]=backup.encode(journal);ftp.local(path).write_bytes(ftp.files[path]);changed.append(path)
   with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive,mutate).dispose()
   self.assertEqual(self.writes(ftp),[]);self.assertIn(b'externalOwnerNote',ftp.local(changed[0]).read_bytes())
 def test_missing_signed_closure_does_not_authorize_disposal(self):
  with self.fixture(closed=False) as (root,private,packet,archive,ftp,client):
   with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive).dispose()
   self.assertEqual(self.writes(ftp),[])
 def test_wrong_packet_mode_key_source_or_public_inventory_never_reaches_ftp(self):
  with self.fixture() as (root,private,packet,archive,ftp,client):
   for key,value in [('mode','production'),('ownershipKey','f'*64),('helperSha256','f'*64),('publicOwned',{'ktk-code-pages.php':'f'*64,'ktk-code-pages-assets/registry.php':'e'*64})]:
    changed=copy.deepcopy(packet);changed[key]=value
    with self.assertRaises(ValueError):self.disposer(ftp,changed,archive)
   self.assertEqual(ftp.calls,[])
 def test_archive_change_during_disposal_blocks_before_deleting_host_original(self):
  with self.fixture() as (root,private,packet,archive,ftp,client):
   modified=[]
   def mutate(event,name):
    if event=='before-delete' and not modified:
     with zipfile.ZipFile(archive,'a') as output:output.writestr('external',b'changed archive')
     modified.append(True)
   with self.assertRaises(PrivateDisposalError):self.disposer(ftp,packet,archive,mutate).dispose()
   self.assertEqual(self.writes(ftp),[]);self.assertTrue((private/'control/original-state.json').exists());self.assertTrue(archive.exists())

if __name__=='__main__':unittest.main()
