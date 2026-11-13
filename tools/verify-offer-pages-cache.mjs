import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadOfferPageRevisions} from './offer-pages-editorial.mjs';
import {fetchCompleteResponse} from './read-only-http.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output=process.argv[2];if(!output)throw Error('Fresh report path required');
try{await readFile(output);throw Error('Preserve prior evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const revisions=await loadOfferPageRevisions(),base='https://krawlthroughkrakow.com/staging/';
const agents={desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',android:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',ipad:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'};
const report={checkedAt:new Date().toISOString(),checks:[],responses:[],errors:[],retries:[]},check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const runtimeHash=createHash('sha256').update(await readFile('staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css')).digest('hex');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.route('**/*',route=>route.abort());
 for(const revision of revisions)for(const [device,agent] of Object.entries(agents)){
  const route=revision.key==='how-to-join'?'about-us/how-to-join/':revision.key+'/',url=new URL(route,base),label=revision.key+' '+device;
  if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_offer_source',Date.now());
  const response=await fetchCompleteResponse(url.href,{headers:{'User-Agent':agent}},{onRetry:e=>report.retries.push({label,attempt:e.attempt,message:e.message})}),html=await response.text();
  const data=await page.evaluate(({html,revision,base})=>{
   const d=new DOMParser().parseFromString(html,'text/html'),templates=new DOMParser().parseFromString(revision.markup,'text/html'),normalize=s=>s.replace(/\s+/g,' ').trim();
   const links=n=>[...n.querySelectorAll('a[href]')].map(a=>({href:a.getAttribute('href').replace('__KTK_HOME_URL__',base),text:normalize(a.textContent)}));
   return {robots:d.querySelector('meta[name="robots"]')?.content,canonical:d.querySelector('link[rel="canonical"]')?.getAttribute('href'),runtime:[...d.querySelectorAll('link[href]')].map(n=>n.getAttribute('href')).find(href=>href.includes('/ktk-code-pages-assets/runtime.css')),targets:[...templates.querySelectorAll('template')].map(t=>{
    const selector=t.getAttribute('data-target'),question=t.getAttribute('data-question'),matches=selector?[...d.querySelectorAll(selector)]:[...d.querySelectorAll('.et_pb_toggle')].filter(n=>normalize(n.querySelector('.et_pb_toggle_title')?.textContent||'')===question).map(n=>n.querySelector('.et_pb_toggle_content')).filter(Boolean);
    return {identity:selector||question,correct:matches.length===1&&matches[0].getAttribute('data-ktk-offer-copy')===revision.reviewedOn&&normalize(matches[0].textContent)===normalize(t.content.textContent)&&JSON.stringify(links(matches[0]))===JSON.stringify(links(t.content))};
   })};
  },{html,revision,base});
  check(label+' HTTP/canonical/noindex',response.status===200&&data.canonical===new URL(route,base).href&&/noindex/.test(data.robots||''));
  check(label+' current runtime CSS token',!!data.runtime&&new URL(data.runtime,base).searchParams.get('v')===runtimeHash.slice(0,12));
  for(const target of data.targets)check(label+' '+target.identity+' exact initial text/native links',target.correct);
  report.responses.push({key:revision.key,device,url:url.href,status:response.status,cache:response.headers.get('cf-cache-status'),age:response.headers.get('age')});
 }
}catch(error){report.errors.push(error.stack);}finally{await browser.close();}
report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,responses:report.responses,errors:report.errors,failed:report.checks.filter(c=>!c.pass)},null,2));if(report.errors.length||report.passed!==report.total)process.exitCode=1;
