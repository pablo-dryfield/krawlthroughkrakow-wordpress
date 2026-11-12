import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const records=[];
try {
 for(const route of ['/staging/','/staging/about-us/how-to-join/']) {
  const context=await browser.newContext();
  const requests=[];
  await context.route('**/*',r=>{
   const q=r.request(),u=new URL(q.url());
   const collection=(u.pathname.startsWith('/9z78')&&q.resourceType()!=='script')||/google-analytics\.com|googleadservices\.com|doubleclick\.net|facebook\.com\/tr|\/collect|\/pagead\/(?:1p-)?(?:viewthrough)?conversion|\/c\.gif/.test(u.href);
   if(collection&&u.searchParams.has('gcs'))requests.push({host:u.host,path:u.pathname,gcs:u.searchParams.get('gcs'),gcd:u.searchParams.get('gcd'),tid:u.searchParams.get('tid')});
   return !['GET','HEAD','OPTIONS'].includes(q.method())||collection?r.abort():r.continue();
  });
  await context.addInitScript(()=>{
   window.__cookieWriteAudit=[];
   const descriptor=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
   Object.defineProperty(document,'cookie',{get(){return descriptor.get.call(this);},set(value){
    const name=String(value).split('=')[0];
    if(/^_(?:ga|gcl)/.test(name))window.__cookieWriteAudit.push({name,at:performance.now(),stack:new Error().stack,consent:JSON.parse(JSON.stringify(window.google_tag_data?.ics||{}))});
    return descriptor.set.call(this,value);
   }});
  });
  try {
   const page=await context.newPage();
   const url='https://krawlthroughkrakow.com'+route+'?ktk_consent_diagnostic='+Date.now();
   const response=await page.goto(url,{waitUntil:'domcontentloaded'});
   const source=await response.text();
   await page.mouse.wheel(0,10);
   await page.getByRole('button',{name:/^Reject(?: all)?$/i}).first().click();
   await page.waitForTimeout(3000);
   const first=await inspect(page,context);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.mouse.wheel(0,10);
   await page.waitForTimeout(6000);
   records.push({route,order:{default:source.indexOf('id="ktk-google-consent-default"'),widget:source.indexOf('src="https://embeds.iubenda.com/widgets/'),gtm:source.indexOf('id="ktk-gtm-loader"'),ads:source.indexOf('id="ktk-google-ads-loader"')},first,reload:await inspect(page,context),requests});
  } finally {await context.close();}
 }
} finally {
 await browser.close();
 await writeFile('docs/shared-integrations/staging-consent-diagnostic.json',JSON.stringify({at:new Date().toISOString(),records,conditions:'Isolated diagnostic; cookie names/stacks and consent states only, no cookie values; measurement requests blocked.'},null,2));
 console.log(JSON.stringify(records,null,2));
}
async function inspect(page,context){
 return {cookies:(await context.cookies()).map(c=>c.name),...await page.evaluate(()=>({
  analytics:window.KTK_ANALYTICS_CONSENT,
  commands:(window.dataLayer||[]).filter(r=>r?.[0]==='consent').map(r=>Array.from(r)),
  writes:window.__cookieWriteAudit,
  googleState:Object.fromEntries(Object.entries(window.google_tag_data?.ics?.entries||{}).map(([key,value])=>[key,{default:value.default,update:value.update,implicit:value.implicit}])),
  preferences:(()=>{const value=window._iub?.cs?.api?.getPreferences?.();return {purposes:value?.purposes,consent:value?.consent};})(),
  scripts:[...document.scripts].map(s=>({id:s.id,src:s.src,type:s.type})).filter(s=>/iubenda|ktk-google|ktk-gtm/.test(JSON.stringify(s)))
 }))};
}
