import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const production=process.argv.includes('--production'),clean=process.argv.includes('--clean'),httpOnly=process.argv.includes('--http-only'),requireHit=process.argv.includes('--require-hit'),runtimeOnly=process.argv.includes('--runtime-only'),smoke=process.argv.includes('--smoke');
const environment=production?'production':'staging',root='https://krawlthroughkrakow.com',base=root+(production?'':'/staging');
const assetRoot='staging/wp-content/mu-plugins/';
const owned=['ktk-site-integrations-assets/site.js','ktk-site-integrations-assets/site.css','ktk-site-integrations.php'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const payload=Object.fromEntries(await Promise.all(owned.map(async name=>[name,sha(await readFile(assetRoot+name))])));
const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
const missing='/ktk-shared-integration-check-not-a-real-page/';
const report={checkedAt:new Date().toISOString(),environment,clean,httpOnly,requireHit,runtimeOnly,smoke,payload,checks:[],pageErrors:[],blockedRequests:0,conditions:'Isolated read-only contexts. Google/Clarity collection, known marketing pixels and non-read requests blocked. Consent-mode request parameters inspected before aborting; no measurement delivery, form, order, payment or email submission.'};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const address=route=>base+route+(clean?'':'?ktk_shared_verify='+Date.now());
const agents={desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',android:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',ipad:'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'};
const content=smoke?['/about-us/how-to-join/','/about-us/','/new-years-eve/',manifest.routes.find(row=>row.kind==='blog post').route]:manifest.routes.map(row=>row.route);
const routes=['/',...content,'/store2/pub-crawl-28/','/store2/nye-pub-crawl-32/','/store/',missing];
const browser=await chromium.launch({channel:'chrome',headless:true});
async function safeContext(options={}){
 const context=await browser.newContext(options);
 context.googleMeasurements=[];
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  const gateway=url.pathname.startsWith('/9z78')&&(request.resourceType()!=='script'||url.searchParams.has('en'));
  const collection=gateway||/google-analytics\.com|googleadservices\.com|doubleclick\.net|facebook\.com\/tr(?:[/?]|$)|bat\.bing\.com\/action|analytics\.tiktok\.com|\/pagead\/(?:1p-)?(?:viewthrough)?conversion|\/collect(?:[/?]|$)|\/c\.gif(?:[/?]|$)/.test(url.href);
  if(collection&&(gateway||/google-analytics\.com|googleadservices\.com|doubleclick\.net|\/pagead\//.test(url.href)))context.googleMeasurements.push({host:url.host,path:url.pathname,tid:url.searchParams.get('tid')||url.searchParams.get('id'),gcs:url.searchParams.get('gcs'),gcd:url.searchParams.get('gcd'),event:url.searchParams.get('en')});
  if(!['GET','HEAD','OPTIONS'].includes(request.method())||collection){report.blockedRequests++;return route.abort();}
  return route.continue();
 });
 return context;
}
try{
 const parser=await browser.newPage();
 for(const [device,userAgent] of runtimeOnly?[]:Object.entries(agents)){
  for(let i=0;i<routes.length;i+=3)await Promise.all(routes.slice(i,i+3).map(async route=>{
   try{
    const response=await fetch(address(route),{headers:{'User-Agent':userAgent},signal:AbortSignal.timeout(60000)});
    const html=await response.text();
    const facts=await parser.evaluate(html=>{
     const doc=new DOMParser().parseFromString(html,'text/html'),scripts=[...doc.scripts];
     return {verification:[...doc.querySelectorAll('meta[name="google-site-verification"]')].map(e=>e.content),
      gtm:scripts.filter(s=>(s.textContent.includes('googletagmanager.com/gtm.js')&&s.textContent.includes('GTM-PHXGRZ'))||s.src.includes('googletagmanager.com/gtm.js?id=GTM-PHXGRZ')).length,
      noscript:doc.querySelectorAll('noscript iframe[src*="googletagmanager.com/ns.html?id=GTM-PHXGRZ"]').length,
      clarity:scripts.filter(s=>s.textContent.includes('clarity.ms/tag/')||s.src.includes('clarity.ms/tag/')).map(s=>s.textContent+s.src),
      legacy:scripts.filter(s=>s.textContent.includes('function makeInstant')||s.textContent.includes('function setNYELink')||(s.textContent.includes('saveFromUrl')&&s.textContent.includes('addParams'))||(s.textContent.includes('const timers')&&s.textContent.includes('.et_pb_countdown_timer .days .value'))).length,
      ctas:[...doc.querySelectorAll('a#ktk-cta')].map(e=>({href:e.getAttribute('href'),shared:e.hasAttribute('data-ktk-site-cta')})),
      sharedJs:scripts.filter(s=>s.src.includes('/ktk-site-integrations-assets/site.js')).length,
      cmp:scripts.map((s,index)=>({src:s.getAttribute('src')||s.getAttribute('data-rocket-src')||'',type:s.getAttribute('type')||'',index})).filter(s=>s.src.includes('/widgets/92c90d2a-9d50-4f09-9c21-bcb72ccc2897.js')),
      defaults:scripts.map((s,index)=>({id:s.id,index,type:s.type,code:s.textContent})).filter(s=>s.id==='ktk-google-consent-default'),
      bridgeDelayed:scripts.some(s=>s.id==='ktk-clarity-consent-bridge'&&/rocketlazyloadscript|text\/plain/.test(s.type)),
      gtmOrder:scripts.findIndex(s=>s.textContent.includes('googletagmanager.com/gtm.js')&&s.textContent.includes('GTM-PHXGRZ')),
      robots:[...doc.querySelectorAll('meta[name="robots"]')].map(e=>e.content)};
    },html);
    const store=/^\/store2?(?:\/|$)/.test(route),legacy=route==='/store/'||route===missing;
    const expectedGtm=production||!legacy&&!store?1:0;
    const cache=response.headers.get('cf-cache-status');
    const correctIndexing=production||legacy||store||facts.robots.every(value=>value.includes('noindex'));
    check(`${device} ${route} integration independence`,response.status===(route===missing?404:200)&&facts.verification.length===1&&facts.verification[0]==='aZAgHxuJ9wBKSsHJyo7THEz_9K1ruYqIpJm1YyO9lUA'&&facts.gtm===expectedGtm&&facts.noscript===expectedGtm&&facts.legacy===0&&facts.clarity.length===(production?1:0)&&facts.clarity.every(value=>value.includes('z9d5iuilvn'))&&!html.includes('ufswk29c79')&&facts.sharedJs===(legacy?1:0)&&facts.ctas.length===(store?0:1)&&correctIndexing&&(!requireHit||legacy||store||cache==='HIT'),{status:response.status,cache,...facts});
    check(`${device} ${route} consent bootstrap cannot be delayed behind GTM`,facts.cmp.length===1&&!facts.bridgeDelayed&&!/rocketlazyloadscript|text\/plain/.test(facts.cmp[0]?.type||'')&&(facts.gtmOrder<0||facts.cmp[0]?.index<facts.gtmOrder),facts);
    check(`${device} ${route} denied Google default precedes all vendor scripts`,facts.defaults.length===1&&facts.defaults[0].index<facts.cmp[0]?.index&&!/rocketlazyloadscript|text\/plain/.test(facts.defaults[0].type)&&!facts.defaults[0].code.includes('granted')&&(facts.gtmOrder<0||facts.defaults[0].index<facts.gtmOrder),facts.defaults);
    if(route==='/new-years-eve/')check(`${device} NYE floating CTA uses current checkout`,new URL(facts.ctas[0].href,base).pathname===(production?'':'/staging')+'/store2/nye-pub-crawl-32/');
   }catch(error){check(`${device} ${route} scan completes`,false,error.message);}
  }));
  console.log(`${environment}: ${device} shared integration scan complete`);
 }
 await parser.close();
 for(const name of owned.slice(0,2)){
  const response=await fetch(`${base}/wp-content/mu-plugins/${name}?ver=${payload[name].slice(0,12)}`);
  check(name+' public byte hash',response.status===200&&sha(Buffer.from(await response.arrayBuffer()))===payload[name]);
 }
 if(!httpOnly){
  for(const route of ['/','/about-us/how-to-join/','/new-years-eve/','/store2/pub-crawl-28/','/store/',missing])for(const choice of ['Reject','Accept']){
   const context=await safeContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   try{
    const page=await context.newPage();
    page.on('pageerror',error=>report.pageErrors.push({route,choice,error:error.message}));
    await page.goto(address(route),{waitUntil:'domcontentloaded',timeout:60000});
    await page.mouse.wheel(0,10);
    const button=page.getByRole('button',{name:new RegExp(`^${choice}(?: all)?$`,'i')}).first();
    await button.waitFor({state:'visible',timeout:30000});
    await page.waitForTimeout(2000);
    check(route+' '+choice+' default analytics denied',await page.evaluate(()=>window.KTK_ANALYTICS_CONSENT===false));
    const trackingCookies=()=>context.cookies().then(cookies=>cookies.filter(cookie=>/^_(?:ga(?:_|$)|gcl_|clck$|clsk$)/.test(cookie.name)).map(cookie=>cookie.name));
    const beforeCookies=await trackingCookies();
    check(route+' '+choice+' no Google/Clarity cookies before consent',beforeCookies.length===0,beforeCookies);
    const managedContent=['/','/about-us/how-to-join/','/new-years-eve/'].includes(route);
    const gtmCount=production||managedContent?1:0;
    if(gtmCount){
     await page.waitForFunction(()=>!!window.google_tag_manager?.['GTM-PHXGRZ'],undefined,{timeout:15000});
     check(route+' '+choice+' actual GTM initialized before choice',true);
    }
    await button.click();
    await page.waitForFunction(expected=>window.KTK_ANALYTICS_CONSENT===expected,choice==='Accept',{timeout:15000});
    await page.waitForTimeout(1500);
    const facts=await page.evaluate(()=>({analytics:window.KTK_ANALYTICS_CONSENT,
     gtm:[...document.scripts].filter(s=>s.src.includes('googletagmanager.com/gtm.js?id=GTM-PHXGRZ')).length,
     gtmStarts:(window.dataLayer||[]).filter(row=>row?.event==='gtm.js').length,
     ads:(window.dataLayer||[]).filter(row=>row?.[0]==='config'&&row[1]==='AW-956184209').length,
     consent:(window.dataLayer||[]).filter(row=>row?.[0]==='consent').map(row=>Array.from(row)),
     clarity:[...document.scripts].filter(s=>s.src.includes('clarity.ms/tag/')).map(s=>s.src),
     ctas:document.querySelectorAll('a#ktk-cta').length,shared:!!window.__ktkSiteHelpers,
     sources:[...document.scripts].map(s=>s.src).filter(Boolean)}));
    check(route+' '+choice+' one expected GTM runtime',facts.gtm===gtmCount&&facts.gtmStarts===gtmCount,{gtm:facts.gtm,starts:facts.gtmStarts});
    if(choice==='Accept'&&gtmCount){
     await page.waitForFunction(()=>!!window.google_tag_manager?.['GTM-PHXGRZ'],undefined,{timeout:15000});
     check(route+' Accept actual GTM container initialized',true);
     const measurements=context.googleMeasurements.filter(row=>row.gcs);
     check(route+' Accept Google consent enables full measurement',measurements.some(row=>row.gcs==='G111'),measurements);
     const cookies=await trackingCookies();
     check(route+' Accept Google cookies enabled only after choice',cookies.some(name=>/^_(?:ga|gcl_)/.test(name)),cookies);
    }
    check(route+' '+choice+' existing Ads coverage preserved',facts.ads===(managedContent?1:0),facts.ads);
    check(route+' '+choice+' Clarity ownership/environment preserved',facts.clarity.length===(production?1:0)&&facts.clarity.every(url=>url.split('?')[0]==='https://www.clarity.ms/tag/z9d5iuilvn'),facts.clarity);
    check(route+' '+choice+' consent bridge preserved',facts.analytics===(choice==='Accept'));
    if(choice==='Reject'){
     const afterCookies=await trackingCookies();check(route+' Reject no Google/Clarity cookies',afterCookies.length===0,afterCookies);
     if(gtmCount){
      const measurements=context.googleMeasurements.filter(row=>row.gcs);
      check(route+' Reject Google attempted cookieless measurement only',measurements.length>0&&measurements.every(row=>row.gcs==='G100'),measurements);
     }
    }
    if(gtmCount){const last=facts.consent.toReversed().find(row=>row[2]?.analytics_storage)?.[2];check(route+' '+choice+' Google consent signal',last?.analytics_storage===(choice==='Accept'?'granted':'denied'),last);}
    check(route+' '+choice+' shared helpers only on legacy routes',facts.shared===(route==='/store/'||route===missing));
    check(route+' '+choice+' no duplicate/unwanted CTA',facts.ctas===(route.startsWith('/store')?0:1));
    if(route===missing){
     const cta=page.locator('[data-ktk-site-cta]');
     for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:900});
      const box=await cta.boundingBox();
      check(choice+' legacy CTA fits '+width,box&&box.x>=-1&&box.y>=0&&box.x+box.width<=width+1,box);
     }
     await mkdir('docs/shared-integrations/screenshots',{recursive:true});
     await page.screenshot({path:`docs/shared-integrations/screenshots/${environment}-legacy-${choice.toLowerCase()}.png`});
    }
    if(choice==='Reject'){
     await page.reload({waitUntil:'domcontentloaded',timeout:60000});
     await page.mouse.wheel(0,10);
     await page.waitForTimeout(3500);
     const cookies=await trackingCookies();
     check(route+' saved rejection survives reload',await page.evaluate(()=>window.KTK_ANALYTICS_CONSENT===false)&&cookies.length===0,cookies);
    }
   }catch(error){check(route+' '+choice+' runtime completes',false,error.message);}
   finally{await context.close();}
  }
  for(const route of ['/','/about-us/how-to-join/',missing]){
   const context=await safeContext();
   try{
    await context.addInitScript(()=>{for(const [key,value] of Object.entries({utm_source:'isolated-shared-test',utm_medium:'controlled-context',utm_campaign:'no-collection',gclid:'isolated-google-click',gbraid:'isolated-gbraid',wbraid:'isolated-wbraid'}))localStorage.setItem('trk_'+key,value);});
    const page=await context.newPage();
    await page.goto(address(route),{waitUntil:'load',timeout:60000});
    await page.evaluate(()=>document.addEventListener('click',e=>e.preventDefault()));
    const cta=page.locator('a#ktk-cta');
    await cta.evaluate(a=>a.click());
    const href=new URL(await cta.getAttribute('href'),base);
    check(route+' isolated attribution handoff',href.searchParams.get('utm_source')==='isolated-shared-test'&&href.searchParams.get('gclid')==='isolated-google-click'&&href.searchParams.get('gbraid')==='isolated-gbraid'&&href.searchParams.get('wbraid')==='isolated-wbraid'&&href.pathname===(production?'':'/staging')+'/store2/pub-crawl-28/',{path:href.pathname});
    check(route+' no booking navigation',new URL(page.url()).pathname===(production?'':'/staging')+route);
   }finally{await context.close();}
  }
  const unexpected=report.pageErrors.filter(row=>!['fbq is not defined','FacebookSignal is not defined'].includes(row.error));
  check('No new runtime errors',unexpected.length===0,unexpected);
 }
}finally{
 await browser.close();
 report.finishedAt=new Date().toISOString();
 report.summary={passed:report.checks.filter(row=>row.pass).length,total:report.checks.length};
 const label=runtimeOnly?'runtime-checks':requireHit?'cache-hit-checks':clean?'clean-checks':'browser-checks';
 await mkdir('docs/shared-integrations',{recursive:true});
 await writeFile(`docs/shared-integrations/${environment}-${label}${smoke?'-smoke':''}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({summary:report.summary,failed:report.checks.filter(row=>!row.pass),pageErrors:report.pageErrors},null,2));
 if(report.summary.passed!==report.summary.total)process.exitCode=1;
}
