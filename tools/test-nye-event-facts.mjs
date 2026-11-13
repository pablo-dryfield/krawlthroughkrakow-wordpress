import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {loadOfferFacts,campaignTemplateValues,validateNyeCatalogFacts} from './site-offer-facts.mjs';
import {codePageDescription} from './code-pages-seo.mjs';
import {fetchCompleteResponse} from './read-only-http.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [homeBase,pagesBase,output]=process.argv.slice(2);
for(const base of [homeBase,pagesBase])if(!['http://127.0.0.1:5184/','http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base))throw Error('Explicit staging/local preview required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve previous evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});const reviewedFacts=await loadOfferFacts(),facts=campaignTemplateValues(reviewedFacts);
const report={checkedAt:new Date().toISOString(),scope:'Isolated read-only event facts, source metadata and fake-clock countdown checks. All non-read/provider requests blocked. Does not certify consent, booking availability, expiry messaging or real purchases.',checks:[],errors:[],blockedWrites:0},check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const businessTokens=()=>{
 const matches=[],pattern=/\{\{\s*[A-Za-z]/,walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode()))if(!node.parentElement.closest('script,style')&&pattern.test(node.textContent))matches.push({tag:node.parentElement.tagName,kind:'text'});
 for(const node of document.querySelectorAll('[aria-label],[aria-description],[alt],[title],meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]'))for(const name of ['aria-label','aria-description','alt','title',...(node.tagName==='META'?['content']:[])])if(pattern.test(node.getAttribute(name)||''))matches.push({tag:node.tagName,kind:name});
 return matches;
};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const fixture=await browser.newPage();await fixture.route('**/*',route=>route.abort());
 try{for(const [html,expected] of [['<script type="application/json">{{nestedBlockCode}}</script><p>Book NYE</p>',false],['<style>/* {{themeCode}} */</style><p>Book NYE</p>',false],['<p>{{nyeDateLabel}}</p>',true],['<p hidden>{{nyeDateLabel}}</p>',true],['<p>{{ nyeDateLabel }}</p>',true],['<img alt="{{meetingName}}">',true],['<meta name="description" content="{{nyeDateLabel}}">',true]]){await fixture.setContent(html);check('business-token fixture '+html,(await fixture.evaluate(businessTokens)).length>0===expected);}}finally{await fixture.close();}
 if(homeBase==='https://krawlthroughkrakow.com/staging/'){
  const response=await fetchCompleteResponse(homeBase+'wp-json/ktk-storefront/v1/products');
  check('public catalog HTTP200',response.status===200);
  const catalog=await response.json();report.publicOffer=validateNyeCatalogFacts(reviewedFacts,catalog.products?.find(product=>product.id===facts.nyeProductId));
  check('public product date/groups/TBA match shared reviewed source',true);
 }
 for(const [route,base] of [['',homeBase],['new-years-eve/',pagesBase],['about-us/how-to-join/',pagesBase],['meeting-point/',pagesBase]])for(const [width,js] of [[390,true],[1440,true],[390,false]]){
  const label=(route||'home')+' '+width+' '+js,context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js,reducedMotion:'reduce'}),page=await context.newPage(),url=new URL(route,base);
  try{
   if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_shared_event',Date.now());
   await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(!['GET','HEAD'].includes(r.method())){report.blockedWrites++;return route.abort();}return u.origin===url.origin&&!/\/(?:orders|carts|quote|checkout)(?:\/|$)/.test(u.pathname)?route.continue():route.abort();});
   await page.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;});
   page.on('pageerror',error=>report.errors.push({label,message:error.message}));
   const response=await page.goto(url.href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
   check(label+' HTTP200 and no overflow',response.status()===200&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const tokens=await page.evaluate(businessTokens);
   check(label+' current business copy has no unresolved tokens',tokens.length===0,tokens);
   if(!route){
    const panel=page.locator('[data-campaign="nye"]');
    check(label+' explicit event date and timezone',await panel.getAttribute('data-event-date')===facts.nyeDate&&await panel.getAttribute('data-event-timezone')==='Europe/Warsaw');
    check(label+' confirmed groups/date and welcome year',await panel.locator('.ktk-hero-date').textContent()==="New Year's Eve"+facts.nyeDateLabel&&JSON.stringify(await panel.locator('.ktk-hero-times dd').allTextContents())===JSON.stringify([facts.nyeEarly,facts.nyeLate])&&await panel.locator('.ktk-hero-flag text').textContent()===facts.welcomeYear);
    check(label+' native NYE checkout and no hero price',await panel.locator('.ktk-hero-cta').evaluate(a=>{const u=new URL(a.href);return /\/(?:staging\/)?store2\/nye-pub-crawl-32\/$/.test(u.pathname)&&u.hash==='#book'&&!u.search;})&&!/250|PLN|euro/.test(await panel.locator('.ktk-hero-copy').textContent()));
    if(js)await page.screenshot({path:path.join(output,'hero-'+width+'.png'),animations:'disabled'});
   }else if(route==='new-years-eve/'){
    const timer=page.locator('.et_pb_countdown_timer'),text=await page.locator('#main-content').textContent();
    check(label+' midnight countdown distinct from group departure',await timer.getAttribute('data-end-timestamp')===facts.midnightTimestamp&&await timer.getAttribute('data-event-date')===facts.nyeDate&&await timer.getAttribute('data-event-timezone')==='Europe/Warsaw');
    check(label+' confirmed price/TBA/groups and re-entry wristband retained',['250 PLN','TBA',facts.nyeEarly,facts.nyeLate,'wristband'].every(value=>text.includes(value)));
   }else{
    const raw=await response.text(),description=codePageDescription('/'+route,'');
    const meta=await page.evaluate(raw=>{const d=new DOMParser().parseFromString(raw,'text/html');return [d.querySelector('meta[name="description"]')?.content,d.querySelector('meta[property="og:description"]')?.content,d.querySelector('meta[name="twitter:description"]')?.content];},raw);
    check(label+' initial SEO and sharing descriptions use compiled facts',meta.every(value=>value===description));
   }
  }catch(error){report.errors.push({label,message:error.message});}finally{await context.close();}
 }
 for(const instant of ['2026-12-31T22:59:50Z','2026-12-31T23:00:01Z','2027-01-02T12:00:00Z']){
  const context=await browser.newContext({viewport:{width:390,height:900}}),page=await context.newPage(),url=new URL('new-years-eve/',pagesBase);
  try{
   await context.route('**/*',route=>{const r=route.request();return ['GET','HEAD'].includes(r.method())&&new URL(r.url()).origin===url.origin?route.continue():route.abort();});
   await page.addInitScript(epoch=>{Date.now=()=>epoch;},Date.parse(instant));
   await page.goto(url.href,{waitUntil:'load'});
   const values=await page.locator('.et_pb_countdown_timer .value').allTextContents(),past=Date.parse(instant)>=Number(facts.midnightTimestamp)*1000;
   check(instant+' countdown clamps at zero, no next-year campaign rollover',values.length===4&&values.every(value=>/^\d{2,}$/.test(value))&&(!past||values.every(value=>Number(value)===0))&&await page.locator('.et_pb_countdown_timer .title').textContent()==='Krakow New Years Eve Party 2026 / 2027',values);
  }catch(error){report.errors.push({instant,message:error.message});}finally{await context.close();}
 }
}catch(error){report.errors.push({phase:'catalog or browser harness',message:error.message});}finally{await browser.close();}
check('no browser/harness errors',report.errors.length===0,report.errors);report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:report.checks.filter(c=>!c.pass),errors:report.errors},null,2));if(report.passed!==report.total)process.exitCode=1;
