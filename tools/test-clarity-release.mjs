import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const production=process.argv.includes('--production');
const clean=process.argv.includes('--clean');
const httpOnly=process.argv.includes('--http-only');
const smoke=process.argv.includes('--smoke');
const requireHit=process.argv.includes('--require-hit');
const environment=production?'production':'staging';
const root='https://krawlthroughkrakow.com';
const base=root+(production?'':'/staging');
const project='z9d5iuilvn';
const report={checkedAt:new Date().toISOString(),environment,clean,httpOnly,smoke,requireHit,checks:[],pageErrors:[],blockedRequests:0,conditions:'Isolated contexts; actual consent UI when not HTTP-only; collection requests and all non-read requests blocked. No messages, bookings, orders or payments submitted.'};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const address=route=>base+route+(clean?'':'?ktk_clarity_verify='+Date.now());
const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const parser=await browser.newPage();
 for(const device of ['desktop','android','ipad']){
  const userAgent=device==='desktop'?'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36':device==='android'?'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36':'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1';
  const content=smoke?['/about-us/how-to-join/','/about-us/','/new-years-eve/',manifest.routes.find(row=>row.kind==='blog post').route]:manifest.routes.map(row=>row.route);
  const routes=['/',...content,'/store2/pub-crawl-28/','/store2/nye-pub-crawl-32/'];
  for(let index=0;index<routes.length;index+=3)await Promise.all(routes.slice(index,index+3).map(async route=>{
   try{
    const response=await fetch(address(route),{headers:{'User-Agent':userAgent},signal:AbortSignal.timeout(60000)});
    const html=await response.text();
    const facts=await parser.evaluate(({html,project})=>{
     const doc=new DOMParser().parseFromString(html,'text/html');
     return {clarity:[...doc.scripts].filter(s=>s.src.includes('clarity.ms/tag/')||s.textContent.includes('clarity.ms/tag/')).map(s=>({id:s.id,src:s.getAttribute('src'),owned:(s.src+s.textContent).includes(project)})),
      canonical:doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),robots:[...doc.querySelectorAll('meta[name="robots"]')].map(s=>s.content),bridge:doc.querySelectorAll('#ktk-clarity-consent-bridge').length};
    },{html,project});
    const indexing=route.startsWith('/store2/')||facts.robots.every(value=>production?!value.includes('noindex'):value.includes('noindex'));
    const cache=response.headers.get('cf-cache-status');
    check(`${device} ${route} current HTML policy`,response.status===200&&!html.includes('ufswk29c79')&&facts.clarity.length===(production?1:0)&&facts.clarity.every(row=>row.owned)&&facts.bridge===1&&indexing&&(!requireHit||route.startsWith('/store2/')||cache==='HIT'),{status:response.status,cache,...facts});
   }catch(error){check(`${device} ${route} completes`,false,error.message);}
  }));
  console.log(`${environment}: ${device} route scan complete`);
 }
 await parser.close();
 for(const route of ['/wp-json/ktk-storefront/v1/config','/wp-json/ktk-storefront/v1/products/pub-crawl-28']){
  const response=await fetch(address(route));
  const payload=await response.json(),config=payload.journeyReplay||payload.storefrontConfig?.journeyReplay;
  check(route+' replay configuration',response.status===200&&config?.projectId===project&&(production||config.enabled===false),config);
 }
 for(const route of httpOnly?[]:['/','/about-us/how-to-join/','/new-years-eve/','/store2/pub-crawl-28/'])for(const choice of ['Reject','Accept']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const requests=[];
  try{
   const page=await context.newPage();
   page.on('pageerror',error=>report.pageErrors.push({route,choice,error:error.message}));
   await page.route('**/*',request=>{
    const r=request.request(),url=r.url(); requests.push(url);
    const gateway=new URL(url).pathname.startsWith('/9z78')&&(r.resourceType()!=='script'||new URL(url).searchParams.has('en'));
    const collection=gateway||/google-analytics\.com|googleadservices\.com|doubleclick\.net|\/pagead\/(?:1p-)?(?:viewthrough)?conversion|\/collect(?:[/?]|$)|\/c\.gif(?:[/?]|$)/.test(url);
    if(!['GET','HEAD','OPTIONS'].includes(r.method())||collection){report.blockedRequests++;return request.abort();}
    return request.continue();
   });
   await page.goto(address(route),{waitUntil:'domcontentloaded',timeout:60000});
   await page.mouse.wheel(0,10);
   const button=page.getByRole('button',{name:new RegExp(`^${choice}(?: all)?$`,'i')}).first();
   await button.waitFor({state:'visible',timeout:30000});
   check(`${route} ${choice} default denied`,await page.evaluate(()=>window.KTK_ANALYTICS_CONSENT===false));
   await button.click();
   await page.waitForFunction(expected=>window.KTK_ANALYTICS_CONSENT===expected,choice==='Accept',{timeout:15000});
   await page.waitForTimeout(1800);
   const facts=await page.evaluate(()=>({sources:[...document.scripts].map(s=>s.src).filter(Boolean),analytics:window.KTK_ANALYTICS_CONSENT,mask:document.querySelectorAll('[data-clarity-mask="true"]').length,
    gtm:(window.dataLayer||[]).filter(row=>row?.event==='gtm.js').length,ads:(window.dataLayer||[]).filter(row=>row?.[0]==='config'&&row[1]==='AW-956184209').length}));
   const loaders=facts.sources.filter(url=>url.includes('clarity.ms/tag/'));
   check(`${route} ${choice} new project only`,loaders.length===(production?1:0)&&loaders.every(url=>url.split('?')[0]===`https://www.clarity.ms/tag/${project}`)&&!requests.some(url=>url.includes('ufswk29c79')),{loaders,projectRequests:requests.filter(url=>url.includes('clarity.ms/tag/'))});
   check(`${route} ${choice} consent respected`,facts.analytics===(choice==='Accept'));
   const storefront=route.startsWith('/store2/');
   const expectedGtm=!production&&storefront?0:1;
   const expectedAds=storefront?0:1;
   check(`${route} ${choice} Google integrations intact`,facts.gtm===expectedGtm&&facts.ads===expectedAds,{gtm:facts.gtm,ads:facts.ads});
  }catch(error){check(`${route} ${choice} scenario completes`,false,error.message);}
  finally{await context.close();}
 }
 // Exercise the existing handoff in isolation, without navigating or creating attribution traffic.
 if(!httpOnly){
 const context=await browser.newContext();
 try{
  await context.addInitScript(()=>{localStorage.setItem('trk_utm_source','clarity-release-isolated-test');localStorage.setItem('trk_gclid','isolated-click-id');});
  const page=await context.newPage();
  await page.route('**/*',route=>{
   const r=route.request(),url=new URL(r.url());
   return url.hostname!==new URL(base).hostname||!['GET','HEAD','OPTIONS'].includes(r.method())?route.abort():route.continue();
  });
  await page.goto(address('/'),{waitUntil:'domcontentloaded'});
  const href=await page.evaluate(()=>{
   const a=[...document.querySelectorAll('a')].find(el=>el.href.includes('/store2/pub-crawl-28/'));
   document.addEventListener('click',event=>event.preventDefault(),{once:true});
   a.click();return a.href;
  });
  const url=new URL(href);
  check('UTM and Google Ads click ID handoff intact',url.searchParams.get('utm_source')==='clarity-release-isolated-test'&&url.searchParams.get('gclid')==='isolated-click-id',{path:url.pathname});
 }finally{await context.close();}
 }
}finally{
 await browser.close();
 report.summary={passed:report.checks.filter(row=>row.pass).length,total:report.checks.length};
 await mkdir('docs/clarity-project-switch',{recursive:true});
 await writeFile(`docs/clarity-project-switch/${environment}-${requireHit?'cache-hit':clean?'clean':'origin'}${httpOnly?'-http-only':''}${smoke?'-smoke':''}-checks.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({summary:report.summary,failed:report.checks.filter(row=>!row.pass),pageErrors:report.pageErrors},null,2));
 if(report.summary.passed!==report.summary.total)process.exitCode=1;
}
