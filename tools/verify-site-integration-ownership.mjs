import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const production=process.argv.includes('--production'),clean=process.argv.includes('--clean');
const environment=production?'production':'staging',base='https://krawlthroughkrakow.com'+(production?'':'/staging');
const sha=value=>createHash('sha256').update(value).digest('hex');
const initial=JSON.parse(await readFile('docs/shared-integrations/production-initial-publish.json','utf8'));
const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
const report={environment,clean,startedAt:new Date().toISOString(),scope:'legacy-removal-independence-and-authorized-revert',notConsentVerification:true,checks:[],errors:[],conditions:'Read-only source scans and isolated attribution tests. All non-read requests and known analytics collections blocked. No settings changes, booking navigation, orders, payments, forms or emails.'};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const url=route=>base+route+(clean?'':'?ktk_ownership_verify='+Date.now());
const missing='/ktk-shared-integration-check-not-a-real-page/';
const routes=['/',...manifest.routes.map(row=>row.route),'/store2/pub-crawl-28/','/store2/nye-pub-crawl-32/','/store/',missing];
const userAgents={desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',android:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',ipad:'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'};
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const [name,expected] of Object.entries(initial.expected))check('Local exact production baseline '+name,sha(await readFile('staging/wp-content/mu-plugins/'+name))===expected);
 const parser=await browser.newPage();
 for(const [device,userAgent] of Object.entries(userAgents)) {
  for(let i=0;i<routes.length;i+=3)await Promise.all(routes.slice(i,i+3).map(async route=>{
   try {
    const response=await fetch(url(route),{headers:{'User-Agent':userAgent},signal:AbortSignal.timeout(60000)});
    const html=await response.text();
    const facts=await parser.evaluate(html=>{
     const doc=new DOMParser().parseFromString(html,'text/html'),scripts=[...doc.scripts];
     return {verification:[...doc.querySelectorAll('meta[name="google-site-verification"]')].map(e=>e.content),
      gtm:scripts.filter(s=>s.textContent.includes('googletagmanager.com/gtm.js')&&s.textContent.includes('GTM-PHXGRZ')).length,
      noscript:doc.querySelectorAll('noscript iframe[src*="googletagmanager.com/ns.html?id=GTM-PHXGRZ"]').length,
      clarity:scripts.filter(s=>s.textContent.includes('clarity.ms/tag/')||s.src.includes('clarity.ms/tag/')).map(s=>s.textContent+s.src),
      retired:scripts.filter(s=>s.textContent.includes('function makeInstant')||s.textContent.includes('function setNYELink')||(s.textContent.includes('saveFromUrl')&&s.textContent.includes('addParams'))||(s.textContent.includes('const timers')&&s.textContent.includes('.et_pb_countdown_timer .days .value'))).length,
      experiment:doc.querySelectorAll('#ktk-google-consent-default').length,
      sharedJs:scripts.filter(s=>(s.src||s.getAttribute('data-rocket-src')||'').includes('/ktk-site-integrations-assets/site.js')).length,
      ctas:[...doc.querySelectorAll('a#ktk-cta')].map(e=>e.getAttribute('href')),
      robots:[...doc.querySelectorAll('meta[name="robots"]')].map(e=>e.content)};
    },html);
    const store=/^\/store2?(?:\/|$)/.test(route),legacy=route==='/store/'||route===missing,gtm=production||!store&&!legacy?1:0;
    check(`${device} ${route} code-owned integrations independent of saved legacy sources`,response.status===(route===missing?404:200)&&facts.verification.length===1&&facts.verification[0]==='aZAgHxuJ9wBKSsHJyo7THEz_9K1ruYqIpJm1YyO9lUA'&&facts.gtm===gtm&&facts.noscript===gtm&&facts.clarity.length===(production?1:0)&&facts.clarity.every(value=>value.includes('z9d5iuilvn'))&&!html.includes('ufswk29c79')&&facts.retired===0&&facts.sharedJs===(legacy?1:0)&&facts.ctas.length===(store?0:1)&&(production||store||legacy||facts.robots.every(value=>value.includes('noindex'))),{status:response.status,cache:response.headers.get('cf-cache-status'),...facts});
    check(`${device} ${route} declined site consent default absent`,facts.experiment===0);
    if(route==='/new-years-eve/')check(device+' NYE CTA points to code-managed product',new URL(facts.ctas[0],base).pathname===(production?'':'/staging')+'/store2/nye-pub-crawl-32/');
   } catch(error) {check(device+' '+route+' source check completes',false,error.message);}
  }));
  console.log(environment+': '+device+' ownership checks complete');
 }
 await parser.close();
 for(const name of ['ktk-site-integrations-assets/site.js','ktk-site-integrations-assets/site.css']){
  const response=await fetch(base+'/wp-content/mu-plugins/'+name+'?ver='+initial.expected[name].slice(0,12));
  check('Public original asset '+name,response.status===200&&sha(Buffer.from(await response.arrayBuffer()))===initial.expected[name]);
 }
 const params={utm_source:'isolated-ownership-check',utm_medium:'qa',utm_campaign:'no-collection',utm_id:'isolated-id',utm_term:'term',utm_content:'button',gclid:'isolated-click',gbraid:'isolated-gbraid',wbraid:'isolated-wbraid'};
 for(const route of ['/','/about-us/how-to-join/',missing,'/store2/pub-crawl-28/']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
   await context.route('**/*',r=>{
    const q=r.request(),u=new URL(q.url());
    const collect=(u.pathname.startsWith('/9z78')&&q.resourceType()!=='script')||/google-analytics\.com|googleadservices\.com|doubleclick\.net|facebook\.com\/tr|bat\.bing\.com\/action|analytics\.tiktok\.com|\/collect|\/pagead\/(?:1p-)?(?:viewthrough)?conversion|\/c\.gif/.test(u.href);
    return !['GET','HEAD','OPTIONS'].includes(q.method())||collect?r.abort():r.continue();
   });
   const page=await context.newPage();page.on('pageerror',error=>report.errors.push({route,error:error.message}));
   await page.goto(base+route+'?'+new URLSearchParams(params),{waitUntil:'domcontentloaded',timeout:60000});
   await page.mouse.wheel(0,10);
   await page.getByRole('button',{name:/^Reject(?: all)?$/i}).first().click({timeout:30000});
   await page.waitForFunction(()=>window.KTK_ANALYTICS_CONSENT===false);
   const stored=await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem('trk_'+key)])),Object.keys(params));
   check(route+' original attribution capture continues after Reject',Object.entries(params).every(([key,value])=>stored[key]===value));
   if(!route.startsWith('/store2/')){
    await page.evaluate(()=>document.addEventListener('click',event=>event.preventDefault()));
    await page.locator('a#ktk-cta').evaluate(a=>a.click());
    const href=new URL(await page.locator('a#ktk-cta').getAttribute('href'),base);
    check(route+' all attribution fields reach code-managed booking link',Object.entries(params).every(([key,value])=>href.searchParams.get(key)===value)&&href.pathname===(production?'':'/staging')+'/store2/pub-crawl-28/'&&href.hash==='#book');
    check(route+' test never navigates to booking',new URL(page.url()).pathname===(production?'':'/staging')+route);
   }
  }catch(error){check(route+' isolated ownership runtime completes',false,error.message);}
  finally {await context.close();}
 }
 check('No new runtime errors',report.errors.every(row=>['fbq is not defined','FacebookSignal is not defined'].includes(row.error)),report.errors);
} finally {
 await browser.close();
 report.finishedAt=new Date().toISOString();report.summary={passed:report.checks.filter(row=>row.pass).length,total:report.checks.length};
 await mkdir('docs/shared-integrations',{recursive:true});
 await writeFile(`docs/shared-integrations/${environment}-ownership-${clean?'clean':'origin'}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({summary:report.summary,failed:report.checks.filter(row=>!row.pass)},null,2));
 if(report.summary.passed!==report.summary.total)process.exitCode=1;
}
