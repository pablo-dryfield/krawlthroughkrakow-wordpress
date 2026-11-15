"""Default-offline, isolated staging override probe. No application/configuration edits."""
from __future__ import annotations
import argparse,hashlib,importlib.util,io,json,re,secrets,urllib.request
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PARENT='/public_html/staging'
ORIGIN='https://krawlthroughkrakow.com/staging/'
CONFIG=PARENT+'/.htaccess'
FILES={'.htaccess','control.txt','rewrite-test.txt'}

def sha(value):return hashlib.sha256(value).hexdigest()

def payload(token):
 if not re.fullmatch(r'[a-f0-9]{32}',token):raise ValueError('Fresh32-hex probe identifier required')
 return {'control.txt':b'KTK isolated staging override control\n','rewrite-test.txt':b'Unrewritten probe file; not the expected response\n','.htaccess':('''<IfModule mod_headers.c>
Header set X-KTK-Encoding-Probe "'''+token+'''"
Header set X-Robots-Tag "noindex, nofollow"
Header set Cache-Control "no-store, max-age=0"
</IfModule>
RewriteEngine On
RewriteRule ^rewrite-test\\.txt$ control.txt [L]
''').encode()}

def common_module():
 spec=importlib.util.spec_from_file_location('ktk_svg_probe_common',ROOT/'tools/publish-homepage-shortcode.py')
 module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

class IsolatedProbe:
 """The only write target is one newly created directory with known text files."""
 def __init__(self,ftp,token):
  if not re.fullmatch(r'[a-f0-9]{32}',token):raise ValueError('Exact probe identifier required')
  self.ftp=ftp;self.name='ktk-svg-encoding-probe-'+token;self.directory=PARENT+'/'+self.name
  self.created=False;self.expected={};self.attempted=set();self.actions=[]
 def guard(self):
  if not re.fullmatch(r'ktk-svg-encoding-probe-[a-f0-9]{32}',self.name) or self.directory!=PARENT+'/'+self.name:raise ValueError('Exact isolated staging directory required')
 def file_path(self,name):
  self.guard()
  if name not in FILES:raise ValueError('Exact probe filename required')
  return self.directory+'/'+name
 def listing(self):
  self.guard()
  if not self.created:raise RuntimeError('Fresh directory must be created first')
  rows=self.entries(self.directory)
  if len({name for name,_ in rows})!=len(rows) or any(facts.get('type')!='file' or 'unix.slink' in facts for _,facts in rows):raise RuntimeError('Unexpected or ambiguous probe directory member')
  return {name for name,_ in rows}
 def entries(self,directory):
  self.guard()
  if directory not in (PARENT,self.directory):raise ValueError('Exact probe listing directory required')
  return [(name,facts) for name,facts in self.ftp.mlsd(directory) if (name,facts.get('type')) not in (('.', 'cdir'),('..','pdir'))]
 def create(self):
  self.guard()
  if self.created or any(name==self.name for name,_ in self.entries(PARENT)):raise RuntimeError('Fresh absent probe directory required')
  try:self.ftp.mkd(self.directory)
  except Exception:
   if not any(name==self.name and facts.get('type')=='dir' for name,facts in self.entries(PARENT)) or self.entries(self.directory):raise
  self.created=True;self.actions.append({'action':'mkdir','path':self.directory})
 def read(self,path):
  self.guard();name=path.rsplit('/',1)[-1]
  if name not in self.expected or path!=self.directory+'/'+name:raise ValueError('Only registered probe paths are readable here')
  data=io.BytesIO();self.ftp.retrbinary('RETR '+path,data.write);return data.getvalue()
 def upload(self,name,value):
  if not self.created:raise RuntimeError('Fresh directory required')
  path=self.file_path(name)
  names=self.listing()
  if name in names or not names.issubset(self.expected):raise RuntimeError('Existing or unknown probe files must not be overwritten')
  temporary=name+'.upload-'+secrets.token_hex(8)+'.tmp';temp=self.directory+'/'+temporary
  if temporary in names:raise RuntimeError('Fresh upload temporary required')
  self.expected[temporary]=value;self.expected[name]=value;self.attempted.add(temporary)
  self.ftp.storbinary('STOR '+temp,io.BytesIO(value))
  if self.read(temp)!=value:raise RuntimeError('Probe temporary checksum mismatch')
  try:self.ftp.rename(temp,path)
  except Exception:
   if name not in self.listing() or self.read(path)!=value:raise
  if self.read(path)!=value:raise RuntimeError('Probe activated checksum mismatch')
  self.actions.append({'action':'upload-verified','path':path,'sha256':sha(value)})
 def cleanup(self):
  self.guard()
  if not self.created:return False
  names=self.listing()
  if not names.issubset(self.expected):raise RuntimeError('Unknown probe member preserved; cleanup refused')
  # Validate every member before deleting any. Only our uniquely named attempted
  # upload temporary may be an exact interrupted prefix of its intended bytes.
  for name in names:
   value=self.read(self.directory+'/'+name);expected=self.expected[name]
   if value!=expected and not(name in self.attempted and len(value)<len(expected) and expected.startswith(value)):
    raise RuntimeError('Changed probe bytes preserved; cleanup refused')
  for name in sorted(names):self.ftp.delete(self.directory+'/'+name);self.actions.append({'action':'delete-owned','path':self.directory+'/'+name})
  if self.listing():raise RuntimeError('Probe files remain after cleanup')
  self.ftp.rmd(self.directory)
  if any(name==self.name for name,_ in self.ftp.mlsd(PARENT)):raise RuntimeError('Probe directory removal unverified')
  self.created=False;return True

class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args):raise RuntimeError('Probe redirects are forbidden')

def inspect_url(url,token,expected,opener=None):
 if not re.fullmatch(r'[a-f0-9]{32}',token):raise ValueError('Exact probe identifier required')
 allowed=ORIGIN+'ktk-svg-encoding-probe-'+token+'/'
 if url not in [allowed+'control.txt',allowed+'rewrite-test.txt']:raise ValueError('Exact public probe GET required')
 request=urllib.request.Request(url,method='GET',headers={'User-Agent':'KTK isolated staging encoding capability/1.0','Accept-Encoding':'identity'})
 with (opener or urllib.request.build_opener(NoRedirect())).open(request,timeout=45) as response:
  body=response.read();headers=response.headers
  cache_headers=headers.get_all('Cache-Control',[]) if hasattr(headers,'get_all') else [headers.get('Cache-Control','')]
  no_store=any(part.strip().split('=',1)[0].lower()=='no-store' for value in cache_headers for part in urllib.request.parse_http_list(value))
  result={'url':url,'status':response.status,'finalUrl':response.geturl(),'bodySha256':sha(body),'expectedBodyExact':body==expected,'probeHeaderExact':headers.get('X-KTK-Encoding-Probe')==token,'noindex':'noindex' in headers.get('X-Robots-Tag','').lower(),'noStore':no_store,'cacheControlHeaders':cache_headers,'expires':headers.get('Expires'),'pragma':headers.get('Pragma'),'encoding':headers.get('Content-Encoding'),'cache':headers.get('CF-Cache-Status'),'contentType':headers.get('Content-Type')}
  result['passed']=result['status']==200 and result['finalUrl']==url and result['expectedBodyExact'] and result['probeHeaderExact'] and result['noindex'] and result['noStore'] and result['encoding'] in (None,'identity')
  return result

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--run-staging-probe',action='store_true');parser.add_argument('--report',required=True);args=parser.parse_args();destination=Path(args.report).resolve()
 if not destination.is_relative_to(ROOT/'docs/seo') or destination.exists():raise ValueError('Fresh SEO evidence path required')
 destination.parent.mkdir(parents=True,exist_ok=True);token=secrets.token_hex(16);files=payload(token)
 report={'startedAt':datetime.now(timezone.utc).isoformat(),'mode':'isolated-staging-override-probe' if args.run_staging_probe else 'offline-validation','phase':'offline-validated','applicationPayloadWrites':0,'databaseWrites':0,'cachePurges':0,'productionWrites':0,'scope':'Only a fresh staging directory/three text-config files; header+existing-file rewrite capability, not Brotli support, real asset delivery, a performance gain or a website delivery.','sourceSha256':sha(Path(__file__).read_bytes()),'payload':{n:sha(b) for n,b in files.items()},'cleanupVerified':False,'http':[]}
 if not args.run_staging_probe:
  destination.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report));return
 common=common_module();ftp=None;probe=None;before=None
 try:
  ftp=common.StagingFTP();before=common.retrieve_file(ftp,CONFIG)
  if before is None:raise RuntimeError('Existing staging parent config required')
  report['parentConfigBeforeSha256']=sha(before);probe=IsolatedProbe(ftp,token);report['directory']=probe.directory;probe.create();report['phase']='probe-directory-created'
  for name in ['control.txt','rewrite-test.txt','.htaccess']:probe.upload(name,files[name])
  report['phase']='probe-upload-verified'
  for name in ['control.txt','rewrite-test.txt']:report['http'].append(inspect_url(ORIGIN+probe.name+'/'+name,token,files['control.txt']))
  report['headerAndRewriteSupported']=all(r['passed'] for r in report['http']);report['phase']='capability-observed' if report['headerAndRewriteSupported'] else 'capability-not-established'
 except Exception as error:
  report['failedPhase']=report['phase'];report['phase']='probe-failed';report['errorType']=type(error).__name__;raise
 finally:
  try:
   if probe is not None:
    try:report['cleanupVerified']=probe.cleanup()
    except Exception as error:report['cleanupErrorType']=type(error).__name__;report['phase']='cleanup-refused';raise
    finally:report['actions']=probe.actions
   if ftp is not None and before is not None:
    after=common.retrieve_file(ftp,CONFIG);report['parentConfigUnchanged']=after==before
    if after!=before:raise RuntimeError('Staging parent configuration changed; no automatic repair')
  finally:
   if ftp is not None:ftp.close()
   report['finishedAt']=datetime.now(timezone.utc).isoformat();destination.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:report.get(k) for k in ['phase','directory','headerAndRewriteSupported','cleanupVerified','parentConfigUnchanged','finishedAt']}))
 if not report.get('cleanupVerified') or not report.get('parentConfigUnchanged'):raise RuntimeError('Probe cleanup/state verification incomplete')

if __name__=='__main__':main()
