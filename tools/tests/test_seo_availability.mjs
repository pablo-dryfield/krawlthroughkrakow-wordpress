import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,realpath,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const script=fileURLToPath(new URL('../check-seo-availability.mjs',import.meta.url));
async function exercise(t,kind,{staging=true,extra=[],retained=false}={}){
 const base=path.resolve(os.tmpdir()),prefix=path.join(base,'ktk-seo-availability-'),dir=await mkdtemp(prefix);
 t.after(async()=>{const actual=await realpath(dir);assert.ok(actual.startsWith(prefix),'Cleanup must stay in the owned test directory');await rm(actual,{recursive:true});});
 const output=path.join(dir,'report.json'),log=path.join(dir,'requests.json'),bootstrap=path.join(dir,'mock-fetch.mjs');
 if(retained)await writeFile(output,'retained synthetic report');
 const source=[
  "import {writeFileSync} from 'node:fs';",
  "const calls=[];",
  "globalThis.fetch=async(url,options={})=>{",
  " const target=String(url);calls.push({url:target,method:options.method,redirect:options.redirect??null});",
  " writeFileSync(process.env.KTK_AVAILABILITY_REQUEST_LOG,JSON.stringify(calls));",
  " const kind=process.env.KTK_AVAILABILITY_CASE;",
  " const canonical=kind==='canonical-production'?target.replace('/staging/','/'):target;",
  " const robots=kind==='inert-robots'?'<meta name=\"robots\" content=\"index, follow\"><!-- <meta name=\"robots\" content=\"noindex\"> --><script>const sample=\\'<meta name=\"robots\" content=\"noindex\">\\';</script>':'<meta CONTENT=\"noindex, follow\" NAME=\"robots\">';",
  " const maintenance=kind==='maintenance'?'Briefly unavailable for scheduled maintenance.':'';",
  " const html='<html><head>'+robots+'<link href=\"'+canonical+'\" rel=\"canonical\"></head><body>'+maintenance+'</body></html>';",
  " return new Response(html,{status:kind==='http-error'?503:200,headers:{'Content-Type':'text/html'}});",
  "};",
 ].join('\n');
 await writeFile(bootstrap,source);
 const result=spawnSync(process.execPath,['--import',pathToFileURL(bootstrap).href,script,output,...(staging?['--staging-only']:[]),...extra],{cwd:path.resolve(path.dirname(script),'..'),env:{...process.env,KTK_AVAILABILITY_REQUEST_LOG:log,KTK_AVAILABILITY_CASE:kind},encoding:'utf8',timeout:12000});
 assert.ifError(result.error);
 const calls=JSON.parse(await readFile(log,'utf8').catch(error=>{if(error.code==='ENOENT')return '[]';throw error;}));
 const body=await readFile(output,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 return {result,calls,body,report:body&&body.startsWith('{')?JSON.parse(body):null};
}

test('staging monitor requests only fixed staging pages, forbids redirects and keeps indexing guards',async t=>{
 const {result,calls,report}=await exercise(t,'success');
 assert.equal(result.status,0,result.stderr);assert.equal(report.passed,true);assert.equal(calls.length,6);
 assert.ok(calls.every(row=>{const url=new URL(row.url);return url.origin==='https://krawlthroughkrakow.com'&&url.pathname.startsWith('/staging/')&&!url.search&&row.method==='GET'&&row.redirect==='error';}));
 assert.ok(report.responses.every(row=>row.htmlNoindex&&row.canonicals.length===1));
});
test('HTTP failures stop at the first response without an HTTP retry',async t=>{
 const {result,calls,report}=await exercise(t,'http-error');
 assert.equal(result.status,1);assert.equal(calls.length,1);assert.equal(report.responses[0].status,503);assert.equal(report.transportRetries.length,0);assert.equal(report.passed,false);
});
test('a maintenance page is an availability failure even with HTTP 200',async t=>{
 const {result,calls,report}=await exercise(t,'maintenance');
 assert.equal(result.status,1);assert.equal(calls.length,1);assert.equal(report.responses[0].maintenance,true);
});
test('robots markup inside comments or scripts cannot satisfy the staging guard',async t=>{
 const {result,calls,report}=await exercise(t,'inert-robots');
 assert.equal(result.status,1);assert.equal(calls.length,1);assert.equal(report.responses[0].htmlNoindex,false);
});
test('a production canonical fails the staging guard without fetching production',async t=>{
 const {result,calls,report}=await exercise(t,'canonical-production');
 assert.equal(result.status,1);assert.equal(calls.length,1);assert.ok(new URL(calls[0].url).pathname.startsWith('/staging/'));assert.equal(report.passed,false);
});
test('the original mixed six-request profile remains available when the new flag is absent',async t=>{
 const {result,calls,report}=await exercise(t,'success',{staging:false});
 assert.equal(result.status,0,result.stderr);assert.equal(report.passed,true);assert.equal(calls.length,6);
 assert.equal(calls.filter(row=>!new URL(row.url).pathname.startsWith('/staging/')).length,2);
 assert.equal(calls.filter(row=>new URL(row.url).searchParams.has('ktk_health_check')).length,1);
});
test('unknown mode flags fail before any request',async t=>{
 const {result,calls,report}=await exercise(t,'success',{extra:['--production']});
 assert.equal(result.status,1);assert.equal(calls.length,0);assert.equal(report,null);assert.match(result.stderr,/optional --staging-only flag required/);
});
test('existing evidence is never overwritten',async t=>{
 const {result,calls,body}=await exercise(t,'success',{retained:true});
 assert.equal(result.status,1);assert.equal(calls.length,0);assert.equal(body,'retained synthetic report');assert.match(result.stderr,/Preserve earlier availability evidence/);
});
