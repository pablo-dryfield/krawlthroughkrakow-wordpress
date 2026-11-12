import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base='https://krawlthroughkrakow.com';
const report={checkedAt:new Date().toISOString(),checks:[],errors:[],blockedRequests:0,conditions:'Isolated Chrome contexts, actual consent buttons, no booking navigation or form submission. Collection/conversion requests and non-read methods blocked.'};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const consent=page=>page.evaluate(()=>({analytics:window.KTK_ANALYTICS_CONSENT,commands:(window.dataLayer||[]).filter(row=>row?.[0]==='consent').map(row=>Array.from(row)),visible:!!document.querySelector('#iubenda-cs-banner')?.getClientRects().length}));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const route of ['/about-us/','/new-years-eve/','/contact/'])for(const choice of ['Reject','Accept']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
   const page=await context.newPage();
   page.on('pageerror',error=>report.errors.push({route,choice,error:error.message}));
   await page.route('**/*',request=>{
    const r=request.request(),url=new URL(r.url());
    const gatewayCollection=url.hostname==='krawlthroughkrakow.com'&&url.pathname.startsWith('/9z78')&&(r.resourceType()!=='script'||url.searchParams.has('en'));
    const collection=gatewayCollection||/google-analytics\.com|googleadservices\.com|doubleclick\.net|\/pagead\/(?:1p-)?(?:viewthrough)?conversion|\/collect(?:[/?]|$)|\/c\.gif(?:[/?]|$)/.test(r.url());
    if(!['GET','HEAD','OPTIONS'].includes(r.method())||collection){report.blockedRequests++;return request.abort();}
    return request.continue();
   });
   const response=await page.goto(base+route+'?ktk_production_integrations='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
   const source=await response.text();
   await page.mouse.wheel(0,10);
   const button=page.getByRole('button',{name:new RegExp(`^${choice}(?: all)?$`,'i')}).first();
   await button.waitFor({state:'visible',timeout:30000});
   const before=await consent(page);
   check(route+' '+choice+' analytics initially denied',before.visible&&before.analytics===false,before);
   await button.click();
   await page.waitForFunction(expected=>window.KTK_ANALYTICS_CONSENT===expected,choice==='Accept',{timeout:10000});
   await page.waitForTimeout(1200);
   const after=await consent(page),last=after.commands.toReversed().find(row=>row[2]?.analytics_storage)?.[2];
   check(route+' '+choice+' actual consent bridge',after.analytics===(choice==='Accept')&&!after.visible,after);
   check(route+' '+choice+' Google consent command',last?.analytics_storage===(choice==='Accept'?'granted':'denied'),last);
   const facts=await page.evaluate(source=>{
    const raw=new DOMParser().parseFromString(source,'text/html'),scripts=[...raw.scripts];
    return {
    sources:[...document.scripts].map(s=>s.src).filter(Boolean),
    bootstrap:{gtm:scripts.filter(s=>(s.textContent.includes('googletagmanager.com/gtm.js')&&s.textContent.includes('GTM-PHXGRZ'))||(s.src.includes('googletagmanager.com/gtm.js')&&new URL(s.src).searchParams.get('id')==='GTM-PHXGRZ')).length,
     ads:scripts.filter(s=>s.src.includes('googletagmanager.com/gtag/js')&&new URL(s.src).searchParams.get('id')==='AW-956184209').length,
     clarity:scripts.filter(s=>(s.textContent.includes('clarity.ms/tag/')&&s.textContent.includes('ufswk29c79'))||s.src.includes('clarity.ms/tag/ufswk29c79')).length,
     bridge:raw.querySelectorAll('#ktk-clarity-consent-bridge').length},
    adsConfigurations:(window.dataLayer||[]).filter(row=>row?.[0]==='config'&&row[1]==='AW-956184209').length,
    viewport:document.querySelectorAll('meta[name="viewport"]').length,
    robots:[...document.querySelectorAll('meta[name="robots"]')].map(e=>e.content),
    canonical:[...document.querySelectorAll('link[rel="canonical"]')].map(e=>e.href),
    staged:[...document.querySelectorAll('a[href],script[src],link[href]')].map(e=>e.href||e.src).filter(value=>/^https:\/\/krawlthroughkrakow\.com\/staging(?:\/|$)/.test(value))
   };},source);
   check(route+' '+choice+' one logical integration bootstrap',Object.values(facts.bootstrap).every(count=>count===1),facts.bootstrap);
   const sources=facts.sources;
   check(route+' '+choice+' one GTM runtime',sources.filter(src=>/googletagmanager\.com\/gtm\.js\?id=GTM-PHXGRZ/.test(src)).length===1,sources.filter(src=>src.includes('gtm.js')));
   const ads=sources.filter(src=>{const url=new URL(src);return url.hostname==='www.googletagmanager.com'&&url.pathname==='/gtag/js'&&url.searchParams.get('id')==='AW-956184209'&&!url.searchParams.has('gtg_health');});
   check(route+' '+choice+' one Google Ads loader and configuration',ads.length===1&&facts.adsConfigurations===1,{loaders:ads.length,configurations:facts.adsConfigurations,healthProbes:sources.filter(src=>new URL(src).searchParams.has('gtg_health'))});
   check(route+' '+choice+' one Clarity loader',sources.filter(src=>src==='https://www.clarity.ms/tag/ufswk29c79').length===1);
   check(route+' '+choice+' one Iubenda bootstrap',sources.filter(src=>src.split('?')[0]==='https://embeds.iubenda.com/widgets/92c90d2a-9d50-4f09-9c21-bcb72ccc2897.js').length===1);
   check(route+' '+choice+' production metadata and destinations',facts.viewport===1&&facts.canonical.length===1&&facts.canonical[0]===base+route&&facts.robots.every(value=>!value.includes('noindex'))&&!facts.staged.length,facts);
   const preferences=page.locator('.iubenda-tp-btn:visible').first();
   await preferences.click();
   await page.waitForFunction(()=>!!document.querySelector('#iubenda-cs-banner')?.getClientRects().length||!!document.querySelector('#iubenda-iframe.iubenda-iframe-visible')?.getClientRects().length,undefined,{timeout:10000});
   check(route+' '+choice+' privacy preferences reopen',true);
  }catch(error){check(route+' '+choice+' scenario completes',false,error.message);}
  finally{await context.close();}
 }
 check('No page JavaScript errors',report.errors.length===0,report.errors);
}finally{
 await browser.close();
 report.summary={passed:report.checks.filter(row=>row.pass).length,total:report.checks.length};
 await writeFile('docs/code-pages/production-release/integrations-tests.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({summary:report.summary,failed:report.checks.filter(row=>!row.pass)},null,2));
 if(report.summary.passed!==report.summary.total)process.exitCode=1;
}
