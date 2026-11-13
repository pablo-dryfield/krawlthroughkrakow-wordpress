import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {loadOfferFacts,campaignTemplateValues} from './site-offer-facts.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [homeBase,pagesBase,output]=process.argv.slice(2);
for(const base of [homeBase,pagesBase])if(!['http://127.0.0.1:5184/','http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base))throw Error('Explicit staging/loopback previews only');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve prior evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const facts=campaignTemplateValues(await loadOfferFacts()),cutoff=Number(facts.nyePromotionEndsTimestamp)*1000,local=homeBase.startsWith('http://127.0.0.1:');
const report={checkedAt:new Date().toISOString(),scope:'Isolated read-only promotion lifecycle. All providers/non-read/commerce requests blocked. Server future/no-JS clock override exists only in loopback preview tools, never public application routes. Not consent/payment/global cache-timing certification.',checks:[],errors:[],blockedWrites:0,commerceAttempts:[],informationNavigations:[],serverFutureTested:local};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
async function open(route,width,js,epoch,{server=false}={}){
 const base=route?pagesBase:homeBase,url=new URL(route,base),context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js,reducedMotion:'reduce'}),navigationProbe={enabled:false};
 if(server){if(!local)throw Error('No public clock override');url.searchParams.set('ktk_preview_epoch',String(epoch/1000));}
 else if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_promotion_check',Date.now());
 await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(!['GET','HEAD'].includes(r.method())){report.blockedWrites++;return route.abort();}if(/\/(?:store2|wp-json\/ktk-storefront)(?:\/|$)/.test(u.pathname)){report.commerceAttempts.push({method:r.method(),path:u.pathname});return route.abort();}if(navigationProbe.enabled&&r.isNavigationRequest()){report.informationNavigations.push({url:r.url(),method:r.method()});return route.abort();}return u.origin===url.origin?route.continue():route.abort();});
 await context.addInitScript(epoch=>{window.__KTK_FREEZE_CAROUSELS__=true;window.__ktkPromotionTestNow=epoch;Date.now=()=>window.__ktkPromotionTestNow;},epoch);
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push({route,width,js,message:error.message}));
 try{await page.goto(url.href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);return {page,context,navigationProbe};}catch(error){await context.close();throw error;}
}
async function fitText(page,locator,label){
 const result=await locator.evaluate(node=>{
  const range=document.createRange();range.selectNodeContents(node);const bounds=node.getBoundingClientRect(),rects=[...range.getClientRects()];
  const floating=document.getElementById('ktk-cta')?.getBoundingClientRect();
  return {fits:rects.every(r=>r.left>=bounds.left-1&&r.right<=bounds.right+1&&r.top>=bounds.top-1&&r.bottom<=bounds.bottom+1),clearOfTab:!floating||rects.every(r=>r.right<=floating.left||r.left>=floating.right||r.bottom<=floating.top||r.top>=floating.bottom)};
 });check(label+' text fits and clears floating tab',result.fits&&result.clearOfTab,result);
}
async function inspect(page,route,label,expired){
 check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 check(label+' one live primary heading',await page.locator('h1').count()===1);
 if(!route){
  const panel=page.locator('[data-campaign="nye"]'),button=panel.locator('.ktk-hero-cta');
  check(label+' date/TBA and group state',expired?(await panel.locator('.ktk-hero-date').textContent())==='Next dates to be announced'&&await panel.locator('.ktk-hero-times').count()===0:(await panel.locator('.ktk-hero-date').textContent()).includes(facts.nyeDateLabel)&&await panel.locator('.ktk-hero-times dd').count()===2);
  const href=new URL(await button.getAttribute('href'),page.url());
  check(label+' correct native NYE destination',expired?/\/(?:staging\/)?new-years-eve\/$/.test(href.pathname)&&!href.search:/\/(?:staging\/)?store2\/nye-pub-crawl-32\/$/.test(href.pathname)&&href.hash==='#book');
  check(label+' correct label/product identity',expired?(await button.textContent()).trim()==='NYE updates'&&!await button.getAttribute('data-product-id'):(await button.textContent()).trim()==='Book NYE'&&await button.getAttribute('data-product-id')==='32');
  check(label+' regular crawl remains independent',await page.locator('a.ktk-hero-cta[data-product-id="28"][href*="pub-crawl-28"]').count()===1&&(await page.locator('.ktk-hero-schedule').textContent()).includes('9 PM'));
  check(label+' welcome-year artwork does not roll forward',await panel.locator('.ktk-hero-flag text').textContent()==='2027');
  for(const node of [panel.locator('.ktk-hero-date'),button]){
   const fit=await node.evaluate(n=>{const r=n.getBoundingClientRect(),panel=n.closest('.ktk-hero-panel').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,panel:{left:panel.left,right:panel.right,top:panel.top,bottom:panel.bottom},overflow:n.scrollWidth>n.clientWidth+1};});
   check(label+' changed control fits its poster',!fit.overflow&&fit.left>=fit.panel.left-1&&fit.right<=fit.panel.right+1&&fit.top>=fit.panel.top-1&&fit.bottom<=fit.panel.bottom+1,fit);
  }
  await fitText(page,button.locator('[data-ktk-promotion-label]'),label+' button label');
  const arrow=await button.evaluate(n=>{const text=n.querySelector('span').getBoundingClientRect(),icon=n.querySelector('svg').getBoundingClientRect();return text.right<=icon.left;});
  check(label+' arrow has separate reserved space',arrow);
 }else{
  const links=page.locator('a[data-ktk-event-link]');
  check(label+' all eight event controls retained',await links.count()===8);
  check(label+' all eight destinations match lifecycle',await links.evaluateAll((nodes,expired)=>nodes.every(n=>{const u=new URL(n.href);return !u.search&&(expired?/\/(?:staging\/)?new-years-eve\/$/.test(u.pathname)&&u.hash==='#nye-updates':/\/(?:staging\/)?store2\/nye-pub-crawl-32\/$/.test(u.pathname)&&u.hash==='#book');}),expired));
  check(label+' notice/countdown state',expired?await page.locator('#nye-updates').count()===1&&await page.locator('.et_pb_countdown_timer').count()===0:await page.locator('#nye-updates').count()===0&&await page.locator('.et_pb_countdown_timer').count()===1);
  if(expired){
   check(label+' notice labels the previous event and unconfirmed next dates',(await page.locator('#nye-updates').textContent()).includes('31 December 2026')&&(await page.locator('#nye-updates').textContent()).includes('Next dates to be announced'));
   check(label+' description/social/schema reflect past state',await page.evaluate(()=>{const metas=[...document.querySelectorAll('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]')];const entities=[...document.querySelectorAll('script[type="application/ld+json"][data-ktk-event-schema]')].flatMap(s=>{const data=JSON.parse(s.textContent);return data['@graph']||[data];});const web=entities.find(e=>e['@type']==='WebPage');return metas.length===3&&metas.every(m=>m.content.includes('Next dates are to be announced'))&&web?.description.includes('Next dates are to be announced')&&web.name==="New Year's Eve in Krakow";}));
   check(label+' empty module overlay remains accessible, not visible duplicate copy',await page.locator('a.ktk-parity-module-link[data-ktk-event-link]').evaluate(a=>a.textContent.trim()===''&&a.getAttribute('aria-label')==='Read NYE updates'));
   await fitText(page,page.locator('#ktk-nye-updates-title'),label+' future heading');
  }
 }
}
try{
 for(const route of ['', 'new-years-eve/'])for(const width of [320,390,768,1440])for(const epoch of [cutoff-1000,cutoff,cutoff+1000]){
  const {page,context}=await open(route,width,true,epoch),label=(route||'home')+' cached '+width+' '+epoch;
  try{await inspect(page,route,label,epoch>=cutoff);if(width===390&&epoch===cutoff)await page.screenshot({path:path.join(output,(route?'event':'hero')+'-cached-expired.png'),animations:'disabled'});}catch(error){report.errors.push({label,message:error.message});}finally{await context.close();}
  if(local){const {page,context}=await open(route,width,false,epoch,{server:true}),label=(route||'home')+' server-nojs '+width+' '+epoch;try{await inspect(page,route,label,epoch>=cutoff);}catch(error){report.errors.push({label,message:error.message});}finally{await context.close();}}
 }
 for(const route of ['', 'new-years-eve/'])for(const mode of ['timer','visibility','pageshow']){
  const {page,context}=await open(route,390,true,cutoff-1000),label=(route||'home')+' already-open '+mode;
  try{
   check(label+' starts current',await page.locator('[data-ktk-event-promotion="nye"][data-ktk-promotion-state="current"]').count()>0);
   await page.evaluate(({now,mode})=>{window.__ktkPromotionTestNow=now;if(mode==='visibility')document.dispatchEvent(new Event('visibilitychange'));if(mode==='pageshow')dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));},{now:cutoff,mode});
   await page.waitForFunction(()=>[...document.querySelectorAll('[data-ktk-event-promotion="nye"]')].every(n=>n.dataset.ktkPromotionState==='expired'),{},{timeout:3000});
   await inspect(page,route,label,true);
   await page.evaluate(now=>{window.__ktkPromotionTestNow=now;dispatchEvent(new Event('pageshow'));},cutoff-1000);
   check(label+' never revives an expired offer after clock rollback',await page.locator('[data-ktk-event-promotion="nye"][data-ktk-promotion-state="current"]').count()===0);
  }catch(error){report.errors.push({label,message:error.message});}finally{await context.close();}
 }
 for(const route of ['', 'new-years-eve/'])for(const width of [320,390,1440]){
  const {page,context,navigationProbe}=await open(route,width,true,cutoff),label=(route||'home')+' native expired activation '+width;
  try{
   navigationProbe.enabled=true;const before=report.informationNavigations.length;
   if(!route){
    const navigation=page.waitForEvent('requestfailed',{predicate:r=>r.isNavigationRequest()});
    await page.locator('[data-campaign="nye"] .ktk-hero-cta').click({noWaitAfter:true});await navigation;
    const nav=report.informationNavigations[before];check(label+' reaches information URL without commerce',report.informationNavigations.length===before+1&&nav?.method==='GET'&&/\/(?:staging\/)?new-years-eve\/$/.test(new URL(nav.url).pathname));
   }else{
    await page.evaluate(()=>{window.__promotionActivations=[];addEventListener('click',event=>{const anchor=event.target.closest('a[data-ktk-event-link]');if(anchor)window.__promotionActivations.push({id:anchor.dataset.ktkEventLink,prevented:event.defaultPrevented});});});
    for(const anchor of await page.locator('a[data-ktk-event-link]').all()){
     const id=await anchor.getAttribute('data-ktk-event-link');await anchor.click();
     check(label+' native fragment for control '+id,new URL(page.url()).hash==='#nye-updates'&&await page.evaluate(id=>window.__promotionActivations.some(a=>a.id===id&&!a.prevented),id));
    }
    check(label+' controls do not start another document navigation',report.informationNavigations.length===before);
   }
  }catch(error){report.errors.push({label,message:error.message});}finally{await context.close();}
 }
}catch(error){report.errors.push({message:error.message,scope:'outer lifecycle/navigation harness'});
}finally{await browser.close();}
check('no commerce API/navigation attempts',report.commerceAttempts.length===0,report.commerceAttempts);check('no browser/harness errors',report.errors.length===0,report.errors);
report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:report.checks.filter(c=>!c.pass),errors:report.errors},null,2));if(report.passed!==report.total)process.exitCode=1;
