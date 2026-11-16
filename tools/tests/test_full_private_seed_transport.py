import copy,io,json,unittest
from tools import content_update_backup as backup
from tools import full_private_seed_packet as packet
from tools import full_private_seed_transport as transport
from tools.tests import test_full_private_seed_rehearsal as protocol
from tools.tests import test_content_update_private_store as store

class Response(io.BytesIO):
 def __init__(self,raw,url,headers=None,status=200):
  super().__init__(raw);self.url=url;self.status=status;self.headers={'CF-Cache-Status':'DYNAMIC','Cache-Control':'private, no-store','Content-Type':'application/json; charset=UTF-8',**(headers or {})}
 def geturl(self):return self.url

class Opener:
 def __init__(self,envelope,**changes):self.envelope=envelope;self.changes=changes;self.calls=[]
 def open(self,request,timeout):
  self.calls.append((request,timeout))
  if self.changes.get('error'):raise OSError('network interrupted')
  return Response(self.changes.get('raw',backup.encode(self.envelope)),self.changes.get('url',request.full_url),self.changes.get('headers'),self.changes.get('status',200))

class FakeFTPS:
 def __init__(self,manifest,records,transaction,**faults):self.root='/.ktk-content-update-'+transaction;self.rows={self.root+'/'+r['source']:(r,records[n]) for n,r in manifest['members'].items()};self.calls=[];self.counts={};self.faults=faults
 def sendcmd(self,cmd):
  self.calls.append(cmd);assert cmd.startswith('MLST ');p=cmd[5:];self.counts[p]=self.counts.get(p,0)+1;kind='file' if p in self.rows else 'dir';size=len(self.rows[p][1]) if kind=='file' else 0
  if self.faults.get('link') and kind=='file':kind='OS.unix=slink'
  unique='changed' if self.faults.get('changed') and self.counts[p]>1 else 'stable'
  return '250-Listing\n type='+kind+';size='+str(size)+';unique='+unique+';modify=20261116090000; '+p+'\n250 End'
 def retrbinary(self,cmd,callback):
  self.calls.append(cmd);assert cmd.startswith('RETR ');p=cmd[5:];data=self.rows[p][1]
  if self.faults.get('oversize'):data+=b'x'
  if self.faults.get('short'):data=data[:-1]
  callback(data)

class RetainedFTPS(FakeFTPS):
 def __init__(self,private,transaction,**faults):
  self.root='/.ktk-content-update-'+transaction;self.calls=[];self.counts={};self.faults=faults;self.rows={self.root+'/'+p.relative_to(private).as_posix():({},p.read_bytes()) for p in private.rglob('*') if p.is_file()}
 def mlsd(self,directory):
  self.calls.append('MLSD '+directory);items={'control':'dir','owner.marker':'file','controller.lock':'file'} if directory==self.root else {'original-state.json':'file','controller-plan.json':'file','closed.json':'file'}
  if self.faults.get('unknown') and directory==self.root:items['source']='dir'
  return [(n,{'type':kind}) for n,kind in items.items()]

@unittest.skipUnless(store.PHP,'Real PHP required to generate full-seed metadata fixtures')
class FullSeedTransportTests(unittest.TestCase):
 def setUp(self):
  self.fixture=protocol.FullPrivateSeedRehearsalTests();self.fixture.setUp();self.addCleanup(self.fixture.doCleanups);self.f=self.fixture;self.state=self.f.begin();self.plan=self.f.packet['plan'];self.sizes=self.f.packet['sizes'];self.overrides=self.f.packet['priorOverrides'];self.envelope={'helperSha256':self.f.packet['helperSha256'],'controller':self.state,'runtime':{'phpVersionId':80336,'peakAllocatedBytes':8388608,'memoryLimit':'768M','maxExecutionTime':'300'}}
 def client(self,opener,**changes):
  args={'helper_sha':self.f.packet['helperSha256'],'token':protocol.TOKEN,'expires':2000,'opener':opener,'clock':lambda:1000,**changes};return transport.FullSeedTransport(self.plan,self.sizes,self.overrides,self.f.mu,**args)
 def test_exact_authenticated_uncached_metadata_request_and_current_runtime_pass(self):
  opener=Opener(self.envelope);client=self.client(opener);result=client.request('inspect-archived',**self.f.archive);self.assertEqual(result,self.envelope);self.assertEqual(len(opener.calls),1);request,timeout=opener.calls[0];self.assertEqual(request.method,'POST');self.assertEqual(timeout,180);self.assertNotIn(protocol.TOKEN,request.full_url);self.assertEqual({k.lower():v for k,v in request.headers.items()}['x-ktk-full-seed-token'],protocol.TOKEN);self.assertIsNotNone(client.last_request_seconds)
 def test_wrong_status_redirect_cache_mime_oversize_malformed_and_lost_reply_never_retry(self):
  for changes in [{'status':409},{'url':'https://krawlthroughkrakow.com/'},{'headers':{'CF-Cache-Status':'HIT'}},{'headers':{'Cache-Control':'private, no-store-ish'}},{'headers':{'Content-Type':'text/html'}},{'raw':b'x'*(transport.MAX_RESPONSE+1)},{'raw':b'{}'},{'error':True}]:
   opener=Opener(self.envelope,**changes);client=self.client(opener)
   with self.assertRaises(transport.UncertainFullSeedRequest):client.request('inspect-archived',**self.f.archive)
   self.assertEqual(len(opener.calls),1)
 def test_wrong_helper_runtime_shape_unknown_metadata_bool_counter_and_false_full_acceptance_are_refused(self):
  cases=[]
  v=copy.deepcopy(self.envelope);v['helperSha256']='e'*64;cases.append(v);v=copy.deepcopy(self.envelope);v['runtime']['peakAllocatedBytes']=True;cases.append(v);v=copy.deepcopy(self.envelope);v['controller']['quotaVerified']=True;cases.append(v);v=copy.deepcopy(self.envelope);v['controller']['applicationWrites']=False;cases.append(v);v=copy.deepcopy(self.envelope);v['controller']['rawRows']=[];cases.append(v)
  for v in cases:
   opener=Opener(v)
   with self.assertRaises(transport.UncertainFullSeedRequest):self.client(opener).request('inspect-archived',**self.f.archive)
   self.assertEqual(len(opener.calls),1)
 def test_unknown_actions_paths_budgets_bad_fields_and_expired_context_never_request(self):
  opener=Opener(self.envelope);client=self.client(opener)
  for action,fields in [('apply',{}),('inspect',{'path':'/public_html'}),('advance',{'limit':999}),('inspect-archived',{'originalManifestSha256':'bad','originalArchiveSha256':'a'*64})]:
   with self.assertRaises(ValueError):client.request(action,**fields)
  with self.assertRaises(ValueError):self.client(opener,expires=1000)
  self.assertFalse(opener.calls)
 def test_actual_prefix_metadata_is_independently_checked_against_local_original_bytes(self):
  p=self.f.private/'source/ktk-code-pages.php';p.parent.mkdir();p.write_bytes(self.f.source['ktk-code-pages.php'][:5]);s=self.f.call('inspect-archived',**self.f.archive);transport.validate_state(s,self.plan,self.sizes,self.overrides,self.f.mu,'inspect-archived');bad=copy.deepcopy(s);bad['seed']['files']['source/ktk-code-pages.php']['sha256']='e'*64;bad['seed']['stateSha256']=packet.seed_digest(s['capsule']['rootBinding'],self.plan,bad['seed']['files'],bad['seed']['directories'])
  with self.assertRaises(ValueError):transport.validate_state(bad,self.plan,self.sizes,self.overrides,self.f.mu,'inspect-archived')
 def test_wrong_completion_parents_bytes_and_phase_cannot_claim_acceptance(self):
  s=self.state
  for _ in range(5):
   if s['phase']=='ready-to-close':break
   s=self.f.advance(s)
  transport.validate_state(s,self.plan,self.sizes,self.overrides,self.f.mu,'advance');cases=[]
  v=copy.deepcopy(s);v['seed']['sourceComplete']=False;cases.append(v);v=copy.deepcopy(s);v['seed']['directories'].remove('source');cases.append(v);v=copy.deepcopy(s);v['seed']['copiedBytes']+=1;cases.append(v);v=copy.deepcopy(s);v['phase']='disposed';v['closed']=True;cases.append(v)
  for v in cases:
   with self.assertRaises(ValueError):transport.validate_state(v,self.plan,self.sizes,self.overrides,self.f.mu,'advance')
 def test_capsule_reader_only_reads_two_exact_records_with_before_after_metadata(self):
  m=self.state['capsule'];records={n:(self.f.private/r['source']).read_bytes() for n,r in m['members'].items()};connection=FakeFTPS(m,records,self.plan['transactionId']);reader=transport.OriginalCapsuleReader(connection,m,self.plan)
  for n,row in m['members'].items():self.assertEqual(reader(row['source']),records[n])
  with self.assertRaises(ValueError):reader('../production')
  self.assertTrue(all(c.startswith(('MLST ','RETR ')) for c in connection.calls));self.assertEqual(sum(c.startswith('RETR ') for c in connection.calls),2)
 def test_capsule_reader_rejects_links_changed_metadata_short_or_oversized_reads_without_retry(self):
  m=self.state['capsule'];records={n:(self.f.private/r['source']).read_bytes() for n,r in m['members'].items()}
  for fault in ['link','changed','short','oversize']:
   connection=FakeFTPS(m,records,self.plan['transactionId'],**{fault:True});reader=transport.OriginalCapsuleReader(connection,m,self.plan)
   with self.assertRaises(transport.UncertainFullSeedRequest):reader('control/original-state.json')
   self.assertLessEqual(sum(c.startswith('RETR ') for c in connection.calls),1)
 def test_closed_and_disposed_php_empty_inventory_wire_shapes_validate_without_false_acceptance(self):
  s=self.state
  while s['phase']!='ready-to-close':s=self.f.advance(s)
  s=self.f.call('close',stateSha256=s['stateSha256'],**self.f.archive);transport.validate_state(s,self.plan,self.sizes,self.overrides,self.f.mu,'close');s=self.f.call('cleanup',stateSha256=s['stateSha256'],**self.f.archive);self.assertEqual(s['seed']['files'],[]);transport.validate_state(s,self.plan,self.sizes,self.overrides,self.f.mu,'cleanup')
 def test_abandoned_partial_copy_is_distinct_from_completed_copy_and_disposal(self):
  s=self.state;self.f.call('advance',stateSha256=s['stateSha256'],**self.f.archive,changes={'fault':'stream-prefix'},exit_code=75);s=self.f.call('inspect-archived',**self.f.archive);args={**self.f.archive,'abandonedSeedStateSha256':s['seed']['stateSha256']};s=self.f.call('abandon',stateSha256=s['stateSha256'],**args);transport.validate_state(s,self.plan,self.sizes,self.overrides,self.f.mu,'abandon');s=self.f.call('cleanup-abandoned',stateSha256=s['stateSha256'],**args);transport.validate_state(s,self.plan,self.sizes,self.overrides,self.f.mu,'cleanup-abandoned');self.assertEqual(s['phase'],'disposed-abandoned')
 def retained_fixture(self):
  m=self.state['capsule'];path=self.f.base/'original.zip'
  import zipfile
  with zipfile.ZipFile(path,'x',zipfile.ZIP_DEFLATED) as z:
   for name,row in m['members'].items():z.writestr(name,(self.f.private/row['source']).read_bytes())
   z.writestr('manifest.json',backup.encode(m))
  self.f.archive['originalArchiveSha256']=backup.sha(path.read_bytes());s=self.state
  while s['phase']!='ready-to-close':s=self.f.advance(s)
  s=self.f.call('close',stateSha256=s['stateSha256'],**self.f.archive);s=self.f.call('cleanup',stateSha256=s['stateSha256'],**self.f.archive);self.assertEqual(s['phase'],'disposed');return path
 def test_fresh_retained_reader_verifies_exact_five_files_signatures_archive_and_payload_absence(self):
  path=self.retained_fixture();connection=RetainedFTPS(self.f.private,self.plan['transactionId']);result=transport.verify_retained_metadata(connection,path,self.plan,self.sizes,self.overrides,self.f.packet['ownershipKey'],self.f.packet['helperSha256']);self.assertTrue(result['payloadTreesAbsent']);self.assertEqual(result['exactRetainedMetadataFiles'],5);self.assertTrue(result['allOriginalArchiveRecordsAndSignedClosureExact']);self.assertTrue(all(c.startswith(('MLST ','MLSD ','RETR ')) for c in connection.calls))
 def test_retained_unknown_tree_changed_file_or_wrong_archive_context_is_never_accepted(self):
  path=self.retained_fixture()
  with self.assertRaises(ValueError):transport.verify_retained_metadata(RetainedFTPS(self.f.private,self.plan['transactionId'],unknown=True),path,self.plan,self.sizes,self.overrides,self.f.packet['ownershipKey'],self.f.packet['helperSha256'])
  connection=RetainedFTPS(self.f.private,self.plan['transactionId']);key=connection.root+'/control/closed.json';connection.rows[key]=({},b'foreign closure')
  with self.assertRaises(ValueError):transport.verify_retained_metadata(connection,path,self.plan,self.sizes,self.overrides,self.f.packet['ownershipKey'],self.f.packet['helperSha256'])

if __name__=='__main__':unittest.main()
