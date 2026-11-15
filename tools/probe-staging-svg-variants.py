"""Default-offline precompressed-original SVG negotiation in a fresh staging directory."""
from __future__ import annotations
import argparse,gzip,hashlib,importlib.util,json,re,secrets,subprocess,urllib.error,urllib.request,zlib
from datetime import datetime,timezone
from functools import lru_cache
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ktk_svg_capability',ROOT/'tools/probe-staging-svg-delivery.py')
cap=importlib.util.module_from_spec(spec);spec.loader.exec_module(cap)
ORIGINALS={'regular':('hero-statue-regular.svg','95ae7ee6a4c5fc951a20493c159427598d3f28b810a95191ca846f72548e4c7c'),'seasonal':('hero-statue-seasonal.svg','a6071047938e6dc52afd0fadb026d85496f7d3d744b602b9a27a798567e07aa7')}
FILES={'.htaccess'}|{stem+suffix for stem in ORIGINALS for suffix in ('.svg','.var','.identity','.br','.gz')}
CASES=[('br',{'br'}),('gzip',{'gzip'}),('identity',{'identity'}),('br;q=0, gzip;q=1, identity;q=0',{'gzip'}),('gzip;q=0, br;q=1, identity;q=0',{'br'}),('br;q=0, gzip;q=0, identity;q=1',{'identity'}),('*;q=0, identity;q=1',{'identity'}),('br;q=0, gzip;q=0, identity;q=0',set())]

def sha(value):return hashlib.sha256(value).hexdigest()

def node_codec(mode,value):
 if mode not in ('compress','decompress'):raise ValueError('Fixed codec mode required')
 operation="z.brotliCompressSync(b,{params:{[z.constants.BROTLI_PARAM_QUALITY]:11}})" if mode=='compress' else 'z.brotliDecompressSync(b,{maxOutputLength:1000000})'
 source="const z=require('node:zlib'),b=require('node:fs').readFileSync(0);process.stdout.write("+operation+");"
 return subprocess.run(['node','-e',source],input=value,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True,timeout=60).stdout

@lru_cache(maxsize=2)
def encoded(value):return node_codec('compress',value),gzip.compress(value,compresslevel=9,mtime=0)

def payload(token):
 config=cap.payload(token)['.htaccess'].replace(b'RewriteRule ^rewrite-test\\.txt$ control.txt [L]\n',b'')
 marker=b'<FilesMatch "^(control[.]txt|rewrite-test[.]txt)$">'
 if config.count(marker)!=1:raise RuntimeError('Exact probe policy anchor required')
 config=config.replace(marker,b'<FilesMatch "^(regular|seasonal)[.](svg|var|identity|br|gz)$">',1)
 config+=b'AddHandler type-map .var\nAddType image/svg+xml .identity .br .gz\nAddEncoding br .br\nAddEncoding gzip .gz\n<IfModule mod_env.c>\nSetEnv no-gzip 1\nSetEnv no-brotli 1\n</IfModule>\n<IfModule mod_headers.c>\nHeader merge Vary Accept-Encoding\n</IfModule>\n'
 files={}
 for stem,(name,digest) in ORIGINALS.items():
  raw=(ROOT/'staging/wp-content/mu-plugins/ktk-homepage-assets'/name).read_bytes()
  if sha(raw)!=digest:raise RuntimeError('Original SVG source changed; review required')
  br,gz=encoded(raw);assert node_codec('decompress',br)==raw and gzip.decompress(gz)==raw
  files[stem+'.identity']=raw;files[stem+'.br']=br;files[stem+'.gz']=gz
  files[stem+'.svg']=b'<svg xmlns="http://www.w3.org/2000/svg"><desc>Unrewritten probe; not the expected original</desc></svg>\n'
  files[stem+'.var']=(f'URI: {stem}.identity\nContent-Type: image/svg+xml\n\nURI: {stem}.br\nContent-Type: image/svg+xml\nContent-Encoding: br\n\nURI: {stem}.gz\nContent-Type: image/svg+xml\nContent-Encoding: gzip\n\n').encode()
  config+=f'RewriteRule ^{stem}\\.svg$ {stem}.var [L]\n'.encode()
 files['.htaccess']=config
 if set(files)!=FILES:raise RuntimeError('Exact eleven-file probe required')
 return files

class VariantProbe(cap.IsolatedProbe):
 def file_path(self,name):
  self.guard()
  if name not in FILES:raise ValueError('Exact variant probe filename required')
  return self.directory+'/'+name

def header_values(headers,name):return headers.get_all(name,[]) if hasattr(headers,'get_all') else [headers.get(name,'')]

def inspect_variant(url,token,stem,accept,allowed,files,opener=None):
 if not re.fullmatch('[a-f0-9]{32}',token) or stem not in ORIGINALS or url!=cap.ORIGIN+'ktk-svg-encoding-probe-'+token+'/'+stem+'.svg' or (accept,allowed) not in CASES:raise ValueError('Exact variant request required')
 request=urllib.request.Request(url,headers={'User-Agent':'KTK isolated staging SVG negotiation/1.0','Accept-Encoding':accept},method='GET')
 try:response=(opener or urllib.request.build_opener(cap.NoRedirect())).open(request,timeout=45)
 except urllib.error.HTTPError as error:
  if error.code!=406:raise
  response=error
 with response:
  headers=response.headers;body=response.read(1000001)
  if len(body)>1000000:raise RuntimeError('Oversized probe response')
  status=getattr(response,'status',None) or response.code;coding=headers.get('Content-Encoding','identity').lower();cache=header_values(headers,'Cache-Control')
  no_store=any(part.strip().split('=',1)[0].lower()=='no-store' for value in cache for part in urllib.request.parse_http_list(value))
  result={'url':url,'acceptEncoding':accept,'status':status,'finalUrl':response.geturl(),'encoding':coding,'wireBytes':len(body),'wireSha256':sha(body),'cacheControlHeaders':cache,'cache':headers.get('CF-Cache-Status'),'noStore':no_store,'noindex':'noindex' in headers.get('X-Robots-Tag','').lower(),'probeHeaderExact':headers.get('X-KTK-Encoding-Probe')==token,'contentType':headers.get('Content-Type'),'varyHeaders':header_values(headers,'Vary')}
  if not allowed:
   result['passed']=status==406 and result['finalUrl']==url and no_store and result['noindex'];return result
  try:
   if coding=='identity':decoded=body
   elif coding=='br':decoded=node_codec('decompress',body)
   elif coding=='gzip':
    decoder=zlib.decompressobj(16+zlib.MAX_WBITS);decoded=decoder.decompress(body,1000001)
    if len(decoded)>1000000 or not decoder.eof or decoder.unused_data:raise ValueError('Invalid/bounded gzip body')
   else:raise ValueError('Unexpected content encoding')
   exact=decoded==files[stem+'.identity']
  except (ValueError,OSError,subprocess.SubprocessError,zlib.error):exact=False
  result['decodedOriginalExact']=exact;result['brotliSidecarExact']=body==files[stem+'.br'] if coding=='br' else None
  vary=any(part.strip().lower()=='accept-encoding' for value in result['varyHeaders'] for part in value.split(','))
  result['passed']=status==200 and result['finalUrl']==url and coding in allowed and exact and result['contentType'].split(';')[0].strip().lower()=='image/svg+xml' and no_store and result['noindex'] and result['probeHeaderExact'] and vary and result['brotliSidecarExact'] is not False
  return result

def validate_capability(path):
 path=Path(path).resolve()
 if not path.is_relative_to(ROOT/'docs/seo'):raise ValueError('Local SEO capability evidence required')
 report=json.loads(path.read_text(encoding='utf-8'));now=datetime.now(timezone.utc);finished=datetime.fromisoformat(report['finishedAt'])
 if not 0<=(now-finished).total_seconds()<3600 or report.get('mode')!='isolated-staging-override-probe' or report.get('phase')!='capability-observed' or not all(report.get(k) is True for k in ('cleanupVerified','parentConfigUnchanged','headerAndRewriteSupported')) or report.get('sourceSha256')!=sha((ROOT/'tools/probe-staging-svg-delivery.py').read_bytes()):raise ValueError('Fresh matching successful cleaned capability probe required')
 if len(report.get('http',[]))!=2 or not all(row.get('passed') is True and row.get('noStore') is True for row in report['http']):raise ValueError('Both capability response guards required')
 return report

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--run-staging-variants-probe',action='store_true');parser.add_argument('--capability-report');parser.add_argument('--report',required=True);args=parser.parse_args();destination=Path(args.report).resolve()
 if not destination.is_relative_to(ROOT/'docs/seo') or destination.exists():raise ValueError('Fresh SEO evidence path required')
 prerequisite=validate_capability(args.capability_report) if args.run_staging_variants_probe else None
 token=secrets.token_hex(16);files=payload(token);report={'startedAt':datetime.now(timezone.utc).isoformat(),'mode':'isolated-staging-svg-variants' if args.run_staging_variants_probe else 'offline-validation','phase':'offline-validated','sourceSha256':sha(Path(__file__).read_bytes()),'capabilitySourceSha256':sha((ROOT/'tools/probe-staging-svg-delivery.py').read_bytes()),'payload':{name:{'bytes':len(value),'sha256':sha(value)} for name,value in files.items()},'applicationWrites':0,'databaseWrites':0,'cachePurges':0,'productionWrites':0,'http':[],'cleanupVerified':False};destination.parent.mkdir(parents=True,exist_ok=True)
 if not args.run_staging_variants_probe:destination.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps({'phase':report['phase'],'files':len(files)}));return
 common=cap.common_module();ftp=None;probe=None;before=None
 try:
  ftp=common.StagingFTP();before=common.retrieve_file(ftp,cap.CONFIG)
  if before is None or sha(before)!=prerequisite['parentConfigBeforeSha256']:raise RuntimeError('Parent config must match successful capability evidence')
  report['parentConfigBeforeSha256']=sha(before);probe=VariantProbe(ftp,token);report['directory']=probe.directory;probe.create();report['phase']='directory-created'
  for name in sorted(FILES-{'.htaccess'})+['.htaccess']:probe.upload(name,files[name])
  report['phase']='payload-verified'
  for stem in ORIGINALS:
   for accept,allowed in CASES:report['http'].append(inspect_variant(cap.ORIGIN+probe.name+'/'+stem+'.svg',token,stem,accept,allowed,files))
  report['allNegotiationGuardsPassed']=all(row['passed'] for row in report['http']);report['phase']='negotiation-observed' if report['allNegotiationGuardsPassed'] else 'negotiation-not-established'
 except Exception as error:report['failedPhase']=report['phase'];report['phase']='probe-failed';report['errorType']=type(error).__name__;raise
 finally:
  try:
   if probe is not None:
    try:report['cleanupVerified']=probe.cleanup()
    except Exception as error:report['cleanupErrorType']=type(error).__name__;report['phase']='cleanup-refused';raise
    finally:report['actions']=probe.actions
   if ftp is not None and before is not None:
    report['parentConfigUnchanged']=common.retrieve_file(ftp,cap.CONFIG)==before
    if not report['parentConfigUnchanged']:raise RuntimeError('Parent configuration changed; no automatic repair')
  finally:
   if ftp is not None:ftp.close()
   report['finishedAt']=datetime.now(timezone.utc).isoformat();destination.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps({key:report.get(key) for key in ('phase','directory','allNegotiationGuardsPassed','cleanupVerified','parentConfigUnchanged','finishedAt')}))
 if not report.get('cleanupVerified') or not report.get('parentConfigUnchanged'):raise RuntimeError('Cleanup/state verification incomplete')

if __name__=='__main__':main()
