import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {loadHomepageOfferRevision} from './homepage-offer-editorial.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output=process.argv[2];if(!output)throw Error('Fresh report path required');
try{await readFile(output);throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const revision=await loadHomepageOfferRevision();
const agents={desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',android:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',ipad:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'};
const report={checkedAt:new Date().toISOString(),checks:[],devices:[],errors:[]},check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.route('**/*',route=>route.abort());
 for(const [device,agent] of Object.entries(agents)){
  const url='https://krawlthroughkrakow.com/staging/'+(process.argv.includes('--cache-bust')?'?ktk_offer_source='+Date.now():'');
  const response=await fetch(url,{headers:{'User-Agent':agent},signal:AbortSignal.timeout(60000)}),raw=await response.text();
  const data=await page.evaluate(({raw,revision})=>{
   const d=new DOMParser().parseFromString(raw,'text/html'),templates=new DOMParser().parseFromString(revision.html,'text/html'),normalize=s=>s.replace(/\s+/g,' ').trim();
   const links=n=>[...n.querySelectorAll('a[href]')].map(a=>{const u=new URL(a.getAttribute('href'));if(u.origin==='https://krawlthroughkrakow.com'&&!u.pathname.startsWith('/staging/'))u.pathname='/staging'+u.pathname;return {href:u.href,text:normalize(a.textContent)};});
   return {robots:d.querySelector('meta[name="robots"]')?.content,canonical:d.querySelector('link[rel="canonical"]')?.getAttribute('href'),targets:[...templates.querySelectorAll('template')].map(t=>{const current=d.querySelectorAll(t.dataset.target);return {selector:t.dataset.target,correct:current.length===1&&normalize(current[0].textContent)===normalize(t.content.textContent)&&JSON.stringify(links(current[0]))===JSON.stringify(links(t.content))};})};
  },{raw,revision});
  check(device+' HTTP/noindex/canonical',response.status===200&&/noindex/.test(data.robots||'')&&data.canonical==='https://krawlthroughkrakow.com/staging/');
  check(device+' complete reviewed target set',data.targets.length===27);
  for(const target of data.targets)check(device+' '+target.selector+' initial text/native links',target.correct);
  report.devices.push({device,url,status:response.status,cache:response.headers.get('cf-cache-status'),age:response.headers.get('age')});
 }
}catch(error){report.errors.push(error.stack);}finally{await browser.close();}
report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,devices:report.devices,errors:report.errors,failed:report.checks.filter(c=>!c.pass)},null,2));if(report.errors.length||report.passed!==report.total)process.exitCode=1;
