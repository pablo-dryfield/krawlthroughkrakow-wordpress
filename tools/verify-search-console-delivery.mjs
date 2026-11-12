import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export async function searchConsoleAssets(buildPath,sha,release){
 if(!/^[a-f0-9]{40}$/.test(sha)||!/^omnilodge-r\d+-a\d+-[a-f0-9]{12}$/.test(release)||!release.endsWith(sha.slice(0,12)))throw new Error('Invalid expected source/release identity');
 const root=await realpath(buildPath);
 const read=async name=>{
  const target=path.resolve(root,name.replace(/^\//,''));
  if(!target.startsWith(root+path.sep))throw new Error('Artifact path escapes build root');
  const resolved=await realpath(target);if(!resolved.startsWith(root+path.sep))throw new Error('Artifact symlink escapes build root');
  return readFile(resolved);
 };
 const metadata=JSON.parse(await read('release-metadata.json'));
 if(metadata.gitSha!==sha||metadata.releaseId!==release)throw new Error('Trusted UI artifact identity mismatch');
 const manifest=JSON.parse(await read('asset-manifest.json')),registered=new Set(Object.values(manifest.files));
 const roles={page:/(?:^|\/)pages\/SearchConsolePage\.tsx$/,coverage:/(?:^|\/)components\/search-console\/ReportCoverage\.tsx$/,api:/(?:^|\/)api\/searchConsole\.ts$/};
 const assets=[];
 for(const mapPath of registered){
  if(!/^\/static\/js\/[\w.-]+\.js\.map$/.test(mapPath))continue;
  const map=JSON.parse(await read(mapPath)),sources=(map.sources??[]).map(source=>source.replaceAll('\\','/'));
  const found=Object.entries(roles).filter(([,pattern])=>sources.some(source=>pattern.test(source))).map(([role])=>role);
  if(!found.length)continue;
  const publicPath='/'+map.file;
  if(!/^\/static\/js\/[\w.-]+\.js$/.test(publicPath)||!registered.has(publicPath))throw new Error('Reporting bundle is not manifest registered');
  const bytes=await read(publicPath);
  assets.push({path:publicPath,sha256:createHash('sha256').update(bytes).digest('hex'),roles:found});
 }
 if(Object.keys(roles).some(role=>!assets.some(asset=>asset.roles.includes(role))))throw new Error('Reporting sources absent from trusted artifact');
 return {metadata,assets};
}

async function main(){
 const [buildPath,sha,release,output]=process.argv.slice(2);if(!output)throw new Error('Build root, expected SHA, release and new report required');
 try{await readFile(output);throw new Error('Preserve earlier delivery report');}catch(error){if(error.code!=='ENOENT')throw error;}
 const expected=await searchConsoleAssets(buildPath,sha,release),checks=[];
 const check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
 const fetchJson=async url=>{const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw new Error('Verification HTTP'+response.status);return response.json();};
 const ready=await fetchJson('https://omni-lodge.com/api/health/ready'),metadata=await fetchJson('https://omni-lodge.com/release-metadata.json');
 check('actual healthy primary backend identity',ready.ready===true&&ready.release?.runtimeMode==='primary'&&ready.release?.gitSha===sha&&ready.release?.id===release,{ready:ready.ready,release:ready.release});
 check('actual UI release identity',metadata.gitSha===sha&&metadata.releaseId===release,metadata);
 const manifest=await fetchJson('https://omni-lodge.com/asset-manifest.json'),registered=new Set(Object.values(manifest.files));
 for(const asset of expected.assets){
  const response=await fetch('https://omni-lodge.com'+asset.path,{signal:AbortSignal.timeout(60000)});
  const bytes=Buffer.from(await response.arrayBuffer()),actual=createHash('sha256').update(bytes).digest('hex');
  check(asset.roles.join('+')+' public bundle matches immutable artifact',response.ok&&registered.has(asset.path)&&actual===asset.sha256,{...asset,actualSha256:actual});
 }
 const report={checkedAt:new Date().toISOString(),sha,release,scope:'Read-only release and UI-byte verification. No database, price, booking, payment or account writes.',checks,passed:checks.filter(row=>row.pass).length,total:checks.length};
 await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 if(report.passed!==report.total)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
