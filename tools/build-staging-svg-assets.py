"""Build/check six durable staging SVG assets; never publish or access credentials.

The original vectors are preserved exactly. The standalone public asset runtime
has no WordPress/bootstrap/database/session/consent code or expiring pilot state.
"""
from __future__ import annotations
import argparse,base64,gzip,hashlib,importlib.util,json,re,subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'staging/wp-content/mu-plugins/ktk-homepage-assets'
PREFIX='/staging/wp-content/mu-plugins/ktk-homepage-assets/'
MODIFIED_AT=1795120800
ORIGINALS={'regular':('hero-statue-regular.svg','95ae7ee6a4c5fc951a20493c159427598d3f28b810a95191ca846f72548e4c7c'),'seasonal':('hero-statue-seasonal.svg','a6071047938e6dc52afd0fadb026d85496f7d3d744b602b9a27a798567e07aa7')}
FILES={'.htaccess','svg-delivery.php'}|{name+suffix for name,_ in ORIGINALS.values() for suffix in ('.br','.gz')}
CONFIG=b'''# Only these two staging SVGs use the standalone asset dispatcher.
<FilesMatch "^(hero-statue-(regular|seasonal)[.]svg|svg-delivery[.]php)$">
<IfModule mod_env.c>
SetEnv no-gzip 1
SetEnv no-brotli 1
</IfModule>
<IfModule mod_expires.c>
ExpiresActive Off
</IfModule>
<IfModule mod_headers.c>
Header always set ETag "expr=%{resp:X-KTK-Representation-ETag}" "expr=-n resp('X-KTK-Representation-ETag')"
Header always unset X-KTK-Representation-ETag
Header always set Content-Encoding "expr=%{resp:X-KTK-Representation-Encoding}" "expr=-n resp('X-KTK-Representation-Encoding')"
Header always unset X-KTK-Representation-Encoding
</IfModule>
</FilesMatch>
<FilesMatch "^hero-statue-(regular|seasonal)[.]svg[.](br|gz)$">
Require all denied
</FilesMatch>
RewriteEngine On
RewriteRule ^hero-statue-(regular|seasonal)[.]svg$ svg-delivery.php?asset=$1 [L,QSD]
'''

def sha(raw):return hashlib.sha256(raw).hexdigest()

def functions():
 source=(ROOT/'tools/svg-negotiation-origin.php').read_text(encoding='utf-8')
 start=source.index('function ktk_svg_probe_quality(');end=source.index('\n$head = ',start)
 value=source[start:end].replace('ktk_svg_probe_','ktk_svg_asset_')
 assert len(re.findall(r'^function ',value,re.M))==4 and all(x in value for x in ['ktk_svg_asset_quality','ktk_svg_asset_tag_matches','ktk_svg_asset_http_date','ktk_svg_asset_error'])
 return value

def render(manifest):
 encoded=base64.b64encode(json.dumps(manifest,sort_keys=True,separators=(',',':')).encode()).decode()
 return ('<?php\ndeclare(strict_types=1);\n// Generated durable staging SVG asset runtime. No WordPress or pilot state.\n// KTK_SVG_ASSETS_MANIFEST '+encoded+'\n$manifest = json_decode(base64_decode(\''+encoded+'\', true), true, 32, JSON_THROW_ON_ERROR);\n'+functions()+r'''
$head = ($_SERVER['REQUEST_METHOD'] ?? '') === 'HEAD';
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');
header('Vary: Accept-Encoding');
try {
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true)) {
        header('Allow: GET, HEAD'); ktk_svg_asset_error(405, "Method not allowed\n", $head);
    }
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (!is_string($path) || !preg_match('~^/staging/wp-content/mu-plugins/ktk-homepage-assets/hero-statue-(regular|seasonal)[.]svg$~D', $path, $match) || ($_SERVER['HTTP_HOST'] ?? '') !== 'krawlthroughkrakow.com') {
        ktk_svg_asset_error(403, "Forbidden\n", $head);
    }
    $asset = $_GET['asset'] ?? null;
    if (!is_string($asset) || $asset !== $match[1] || !isset($manifest['assets'][$asset])) { ktk_svg_asset_error(404, "Not found\n", $head); }
    if (($manifest['schemaVersion'] ?? null) !== 1 || !is_int($manifest['modifiedAt'] ?? null) || array_keys($manifest['assets']) !== ['regular', 'seasonal']) { throw new RuntimeException('Invalid asset manifest'); }
    $raw = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? null;
    if ($raw !== null && !is_string($raw)) { throw new RuntimeException('Invalid server header'); }
    try { $coding = ktk_svg_asset_quality($raw); }
    catch (InvalidArgumentException $e) { ktk_svg_asset_error(400, "Invalid Accept-Encoding\n", $head); }
    if ($coding === null) { ktk_svg_asset_error(406, "No acceptable representation\n", $head); }
    $entry = $manifest['assets'][$asset][$coding] ?? null;
    $filename = 'hero-statue-' . $asset . '.svg' . ['identity' => '', 'br' => '.br', 'gzip' => '.gz'][$coding];
    if (!is_array($entry) || ($entry['file'] ?? null) !== $filename || !is_int($entry['bytes'] ?? null) || $entry['bytes'] < 1 || $entry['bytes'] > 1000000 || !preg_match('/^[a-f0-9]{64}$/D', $entry['sha256'] ?? '') || is_link(__DIR__ . '/' . $filename) || !is_file(__DIR__ . '/' . $filename)) { throw new RuntimeException('Unknown representation'); }
    $body = @file_get_contents(__DIR__ . '/' . $filename, false, null, 0, 1000001);
    if (!is_string($body) || strlen($body) !== $entry['bytes'] || !hash_equals($entry['sha256'], hash('sha256', $body))) { throw new RuntimeException('Representation changed'); }
    $digest = $entry['sha256']; $modified = $manifest['modifiedAt'];
    if (isset($_SERVER['HTTP_IF_MATCH'])) {
        if (!ktk_svg_asset_tag_matches($_SERVER['HTTP_IF_MATCH'], $digest, false)) { ktk_svg_asset_error(412, "Precondition failed\n", $head); }
    } elseif (isset($_SERVER['HTTP_IF_UNMODIFIED_SINCE'])) {
        $date = ktk_svg_asset_http_date($_SERVER['HTTP_IF_UNMODIFIED_SINCE']);
        if ($date !== null && $modified > $date) { ktk_svg_asset_error(412, "Precondition failed\n", $head); }
    }
    header('Cache-Control: public, max-age=31536000, immutable, no-transform');
    header('Content-Type: image/svg+xml');
    header('ETag: "' . $digest . '"');
    header('X-KTK-Representation-ETag: "' . $digest . '"');
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $modified) . ' GMT');
    header('Accept-Ranges: none');
    if (isset($_SERVER['HTTP_IF_NONE_MATCH'])) { $notModified = ktk_svg_asset_tag_matches($_SERVER['HTTP_IF_NONE_MATCH'], $digest, true); }
    else { $date = isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) ? ktk_svg_asset_http_date($_SERVER['HTTP_IF_MODIFIED_SINCE']) : null; $notModified = $date !== null && $modified <= $date; }
    if ($notModified) { http_response_code(304); header_remove('Content-Length'); exit; }
    if ($coding !== 'identity') { header('Content-Encoding: ' . $coding); header('X-KTK-Representation-Encoding: ' . $coding); }
    header('Content-Length: ' . strlen($body));
    if (!$head) { echo $body; }
} catch (Throwable $e) { ktk_svg_asset_error(503, "SVG asset unavailable\n", $head); }
''').encode('utf-8')

def build():
 spec=importlib.util.spec_from_file_location('staging_svg_codec',ROOT/'tools/svg-negotiation-payload.py');codec=importlib.util.module_from_spec(spec);spec.loader.exec_module(codec)
 files={};manifest={'schemaVersion':1,'modifiedAt':MODIFIED_AT,'functionsSHA256':sha(functions().encode()),'assets':{}}
 for stem,(name,digest) in ORIGINALS.items():
  raw=(ASSETS/name).read_bytes();assert sha(raw)==digest
  br,gz=codec.encoded(raw);gz=gz[:9]+b'\xff'+gz[10:]
  manifest['assets'][stem]={}
  for coding,suffix,value in [('identity','',raw),('br','.br',br),('gzip','.gz',gz)]:
   filename=name+suffix;manifest['assets'][stem][coding]={'file':filename,'bytes':len(value),'sha256':sha(value)}
   if suffix:files[filename]=value
 files['.htaccess']=CONFIG;files['svg-delivery.php']=render(manifest)
 assert set(files)==FILES;return files,manifest

def validate(files):
 assert set(files)==FILES and files['.htaccess']==CONFIG
 matches=re.findall(rb'^// KTK_SVG_ASSETS_MANIFEST ([A-Za-z0-9+/=]+)$',files['svg-delivery.php'],re.M);assert len(matches)==1
 manifest=json.loads(base64.b64decode(matches[0],validate=True));assert set(manifest)=={'schemaVersion','modifiedAt','functionsSHA256','assets'} and manifest['schemaVersion']==1 and manifest['modifiedAt']==MODIFIED_AT and manifest['functionsSHA256']==sha(functions().encode()) and set(manifest['assets'])==set(ORIGINALS)
 assert files['svg-delivery.php']==render(manifest)
 for stem,(name,digest) in ORIGINALS.items():
  original=(ASSETS/name).read_bytes();assert sha(original)==digest
  assert set(manifest['assets'][stem])=={'identity','br','gzip'}
  for coding,suffix in [('identity',''),('br','.br'),('gzip','.gz')]:
   entry=manifest['assets'][stem][coding];value=files[name+suffix] if suffix else original
   assert entry=={'file':name+suffix,'bytes':len(value),'sha256':sha(value)} and len(value)<=1000000
   if coding=='gzip':decoded=gzip.decompress(value)
   elif coding=='br':decoded=subprocess.check_output(['node','-e',"process.stdout.write(require('node:zlib').brotliDecompressSync(require('node:fs').readFileSync(0),{maxOutputLength:1000000}));"],input=value,timeout=15)
   else:decoded=value
   assert decoded==original
 return manifest

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--write',action='store_true');args=parser.parse_args()
 assert ASSETS.is_dir() and not ASSETS.is_symlink() and ASSETS.resolve().is_relative_to(ROOT/'staging')
 if args.write:
  files,_=build();validate(files)
  for name,value in files.items():
   path=ASSETS/name;assert not path.is_symlink();path.write_bytes(value)
 else:files={name:(ASSETS/name).read_bytes() for name in FILES}
 manifest=validate(files)
 check=subprocess.run(['php','-l'],input=files['svg-delivery.php'],capture_output=True,timeout=15);assert check.returncode==0
 print(json.dumps({'scope':'Offline durable staging assets only; no publication, expired pilot reuse or production action','files':len(files),'allOriginalVectorsAndRepresentationInversesExact':True,'functionsSHA256':manifest['functionsSHA256'],'checksums':{name:sha(value) for name,value in files.items()}}))

if __name__=='__main__':main()
