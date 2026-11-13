import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {prepareNyePromotion} from './nye-promotion.mjs';
import {loadOfferFacts,campaignTemplateValues} from './site-offer-facts.mjs';
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [base,output]=process.argv.slice(2);if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base)||!output)throw Error('Explicit staging/loopback base and fresh output required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve prior evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const local=base.startsWith('http:'),facts=campaignTemplateValues(await loadOfferFacts()),cutoff=Number(facts.nyePromotionEndsTimestamp)*1000;
const report={checkedAt:new Date().toISOString(),scope:'Isolated read-only guide lifecycle/atomic-target/native-navigation checks. Provider, non-read and commerce requests blocked; safe first-party information reads allowed. No forms/orders/consent/account changes. Future server clock exists only in the loopback preview.',serverFutureTested:local,checks:[],errors:[],commerceAttempts:[],blockedWrites:0,activations:[]},check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});let originalHead;
const head=page=>page.evaluate(()=>({title:document.title,description:document.querySelector('meta[name="description"]')?.content,canonical:document.querySelector('link[rel="canonical"]')?.href,sharing:[...document.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]')].map(m=>m.outerHTML),schema:[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent))}));
async function open(width,js,epoch,{serverEpoch}={}){
 const url=new URL('new-years-eve-in-krakow/',base),context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js,reducedMotion:'reduce',serviceWorkers:'block'});
 if(serverEpoch!==undefined){if(!local)throw Error('No public time override');url.searchParams.set('ktk_preview_epoch',String(serverEpoch/1000));}else if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_guide_check',Date.now());
 await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(!['GET','HEAD'].includes(r.method())){report.blockedWrites++;return route.abort();}if(/\/(?:store2|wp-json\/ktk-storefront)(?:\/|$)/.test(u.pathname)){report.commerceAttempts.push({method:r.method(),path:u.pathname});return route.abort();}return u.origin===url.origin?route.continue():route.abort();});
 await context.exposeBinding('__ktkGuideActivation',(_,value)=>report.activations.push(value));
 await context.addInitScript(epoch=>{Date.now=()=>epoch;window.__KTK_FREEZE_CAROUSELS__=true;addEventListener('click',event=>{const a=event.target.closest('a[data-ktk-event-link="guide-0"]');if(a)window.__ktkGuideActivation({href:a.href,prevented:event.defaultPrevented});});},epoch);
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push({width,message:error.message}));
 try{const response=await page.goto(url.href,{waitUntil:'load'});if(response.status()!==200)throw Error('HTTP'+response.status());await page.evaluate(()=>document.fonts.ready);return {context,page};}catch(error){await context.close();throw error;}
}
async function inspect(page,label,expired){
 const anchor=page.locator('#book-nye > a'),href=new URL(await anchor.getAttribute('href'),page.url()),text=(await anchor.textContent()).trim();
 check(label+' one original heading/control and H1',await anchor.count()===1&&await page.locator('h1').count()===1);
 check(label+' correct lifecycle label/destination',expired?text==='Next NYE dates to be announced'&&/\/(?:staging\/)?new-years-eve\/$/.test(href.pathname)&&href.hash==='#nye-updates':text==='Book the ultimate New years eve experience with krawl through krakow!'&&/\/(?:staging\/)?store2\/nye-pub-crawl-32\/$/.test(href.pathname)&&href.hash==='#book');
 check(label+' no lingering expired checkout',await page.locator('#main-content a[href*="store2/nye-pub-crawl-32/"]').count()===(expired?0:1));
 check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const currentHead=await head(page);if(!originalHead)originalHead=currentHead;
 check(label+' original title/descriptions/sharing/byline/date/schema exact',JSON.stringify(originalHead)===JSON.stringify(currentHead));
 await anchor.scrollIntoViewIfNeeded();
 const fit=await anchor.evaluate(a=>{const range=document.createRange();range.selectNodeContents(a);const rects=[...range.getClientRects()],tab=document.getElementById('ktk-cta')?.getBoundingClientRect();return rects.every(r=>r.left>=-1&&r.right<=innerWidth+1&&(!tab||r.right<=tab.left||r.left>=tab.right||r.bottom<=tab.top||r.top>=tab.bottom));});
 check(label+' text stays inside viewport and clears floating tab',fit);
}
try{
 const context=await browser.newContext(),page=await context.newPage();
 try{
  const good='<main id="main-content"><h2 id="book-nye"><a href="__KTK_HOME_URL__store2/nye-pub-crawl-32/#book">Book the ultimate New years eve experience with krawl through krakow!&nbsp;</a></h2></main>';
  const variants=[['good',good],['stale-text',good.replace('ultimate','different')],['wrong-heading',good.replaceAll('h2','h3')],['wrong-anchor',good.replace('id="book-nye"','id="other"')],['duplicate',good.replace('</main>','<a href="__KTK_HOME_URL__store2/nye-pub-crawl-32/#book">Other</a></main>')],['query-destination',good.replace('/#book','/?changed=yes#book')],['foreign',good.replace('__KTK_HOME_URL__','https://example.com/')],['missing-main',good.replace('id="main-content"','id="other-main"')],['already-marked',good.replace('id="main-content"','id="main-content" data-ktk-event-promotion="nye"')]];
  for(const [name,html]of variants){await page.setContent(html);const before=await page.locator('body').innerHTML();let result,error;
   try{result=await page.evaluate(prepareNyePromotion,{key:'post-new-years-eve-in-krakow',campaignFacts:facts});}catch(caught){error=caught.message;}
   if(name==='good'){check('fixture complete one-target source map',!error&&result.replacements.length===1&&result.ends_at===1798801200&&!result.expired_head);check('fixture current text retained',(await page.locator('#book-nye > a').textContent()).trim()==='Book the ultimate New years eve experience with krawl through krakow!');}
   else{check('fixture '+name+' rejected with target guard',!!error&&error.includes('Review changed NYE guide promotion'));check('fixture '+name+' atomic before all mutation',before===await page.locator('body').innerHTML());}
  }
 }finally{await context.close();}
 for(const width of [320,390,768,1440])for(const epoch of [cutoff-1000,cutoff,cutoff+1000])for(const mode of local?['cached-js','server-nojs','server-js']:['cached-js']){
  const {context,page}=await open(width,mode!=='server-nojs',epoch,mode.startsWith('server')?{serverEpoch:epoch}:{}),label=mode+' '+width+' '+epoch;
  try{await inspect(page,label,epoch>=cutoff);if(width===390&&epoch===cutoff&&mode==='cached-js')await page.screenshot({path:path.join(output,'guide-expired-390.png'),animations:'disabled'});}catch(error){report.errors.push({label,message:error.message});}finally{await context.close();}
 }
 for(const width of [320,390,1440]){
  const {context,page}=await open(width,true,cutoff),label='native future '+width;
  try{const anchor=page.locator('#book-nye > a'),destination=await anchor.getAttribute('href'),start=report.activations.length;await anchor.click();await page.waitForURL(destination,{timeout:10000});check(label+' actual native information navigation',page.url()===destination&&report.activations.slice(start).some(a=>a.href===destination&&!a.prevented));await page.waitForSelector('#nye-updates');check(label+' reaches actual future NYE notice',await page.locator('#nye-updates').count()===1);}catch(error){report.errors.push({label,message:error.message});}finally{await context.close();}
 }
 if(local)for(const width of [320,390,1440]){const {context,page}=await open(width,true,cutoff-1000,{serverEpoch:cutoff});try{await inspect(page,'expired server slow clock '+width,true);}finally{await context.close();}}
}catch(error){report.errors.push({scope:'outer harness',message:error.message});}finally{await browser.close();}
check('no commerce API/navigation attempts',report.commerceAttempts.length===0,report.commerceAttempts);check('no application/harness errors',!report.errors.length,report.errors);report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:report.checks.filter(c=>!c.pass),errors:report.errors},null,2));if(report.passed!==report.total)process.exitCode=1;
