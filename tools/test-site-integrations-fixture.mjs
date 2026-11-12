import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const script=await readFile('staging/wp-content/mu-plugins/ktk-site-integrations-assets/site.js','utf8');
const css=await readFile('staging/wp-content/mu-plugins/ktk-site-integrations-assets/site.css','utf8');
const checks=[],errors=[];
const check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
const params={utm_source:'isolated-fixture',utm_medium:'browser',utm_campaign:'shared-integration-test',utm_id:'fixture-id',utm_term:'term',utm_content:'cta',gclid:'isolated-gclid',gbraid:'isolated-gbraid',wbraid:'isolated-wbraid'};
const fixture=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;min-height:900px;background:#222;color:#fff}.mobile_menu_bar,.et_pb_menu__toggle{display:block;width:48px;height:48px;margin:20px}.et_pb_countdown_timer{padding:20px}${css}</style></head><body>
 <div id="et_mobile_nav_menu"><button class="mobile_menu_bar" aria-label="Menu">Menu</button></div>
 <button class="et_pb_menu__toggle">Builder menu</button>
 <div class="et_pb_countdown_timer"><span class="days"><span class="value">021</span></span></div>
 <a id="regular" href="/store2/pub-crawl-28/#book"><span>Book now</span></a>
 <a id="legacy" href="/staging/store/Legacy-product">Legacy</a>
 <a id="explicit" href="/store2/nye-pub-crawl-32/?utm_source=authored#book">Explicit</a>
 <a id="external" href="https://example.com/store2/">External</a>
 <a id="boundary" href="/storehouse/">Unrelated</a>
 <a id="ktk-cta" data-ktk-site-cta href="/store2/pub-crawl-28/#book">BOOK NOW</a>
 <script>window.KTK_SITE_INTEGRATIONS={regularBooking:'https://krawlthroughkrakow.com/store2/pub-crawl-28/#book',nyeBooking:'https://krawlthroughkrakow.com/store2/nye-pub-crawl-32/#book'};window.menuClicks=0;document.querySelectorAll('button').forEach(e=>e.addEventListener('click',()=>window.menuClicks++));document.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault()});</script>
 </body></html>`;
try{
 for(const blockedStorage of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  try{
   if(blockedStorage)await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked for isolated test');}}));
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/*',route=>route.fulfill({status:200,contentType:'text/html',body:fixture}));
   await page.goto('https://krawlthroughkrakow.com/legacy-fixture/?'+new URLSearchParams(params));
   await page.addScriptTag({content:script});
   const label=blockedStorage?'blocked storage':'normal storage';
   for(const id of ['regular','legacy']){
    const url=new URL(await page.locator('#'+id).getAttribute('href'));
    check(label+' '+id+' preserves every attribution key',Object.entries(params).every(([key,value])=>url.searchParams.get(key)===value));
   }
   const explicit=new URL(await page.locator('#explicit').getAttribute('href'));
   check(label+' authored values retained',explicit.searchParams.get('utm_source')==='authored'&&explicit.searchParams.get('gclid')===params.gclid);
   check(label+' external links unchanged',await page.locator('#external').getAttribute('href')==='https://example.com/store2/');
   check(label+' unrelated store-like path unchanged',await page.locator('#boundary').getAttribute('href')==='/storehouse/');
   check(label+' countdown initial normalization',await page.locator('.value').textContent()==='21');
   await page.locator('.value').evaluate(e=>e.textContent='009');
   await page.waitForFunction(()=>document.querySelector('.value').textContent==='09');
   check(label+' countdown stays fixed after Divi updates',true);
   await page.locator('.value').evaluate(e=>e.textContent='123');
   await page.waitForTimeout(30);
   check(label+' three significant digits retained',await page.locator('.value').textContent()==='123');
   await page.locator('.mobile_menu_bar').tap();
   await page.waitForTimeout(100);
   check(label+' real touch toggles once',await page.evaluate(()=>window.menuClicks)===1);
   await page.locator('.et_pb_menu__toggle').tap();
   await page.waitForTimeout(100);
   check(label+' builder touch toggles once',await page.evaluate(()=>window.menuClicks)===2);
   await page.locator('.mobile_menu_bar').click();
   check(label+' mouse click remains native',await page.evaluate(()=>window.menuClicks)===3);
   await page.evaluate(()=>history.pushState({test:true},'', '/new-years-eve/'));
   let cta=new URL(await page.locator('#ktk-cta').getAttribute('href'));
   check(label+' NYE uses new checkout with attribution',cta.pathname==='/store2/nye-pub-crawl-32/'&&cta.hash==='#book'&&cta.searchParams.get('gclid')===params.gclid);
   check(label+' native history state retained',await page.evaluate(()=>history.state.test===true));
   for(const route of ['/store/','/store2/cart/','/staging/store2/checkout/']){
    await page.evaluate(route=>history.replaceState({},'',route),route);
    check(label+' hides CTA on '+route,await page.locator('#ktk-cta').isHidden());
   }
   await page.evaluate(()=>history.pushState({},'', '/storehouse/'));
   check(label+' unrelated path does not hide CTA',await page.locator('#ktk-cta').isVisible());
   cta=new URL(await page.locator('#ktk-cta').getAttribute('href'));
   check(label+' returns to regular product',cta.pathname==='/store2/pub-crawl-28/');
   if(!blockedStorage){
    await page.evaluate(()=>{localStorage.setItem('trk_utm_source','latest-local-value');document.querySelector('#regular span').click();});
    check('Latest stored attribution used without overwriting authored query',new URL(await page.locator('#regular').getAttribute('href')).searchParams.get('utm_source')==='latest-local-value');
    const stored=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
    check('Only approved attribution keys stored',Object.keys(stored).every(key=>Object.keys(params).some(name=>key==='trk_'+name)));
   }
   await page.evaluate(()=>{const a=document.createElement('a');a.id='dynamic';a.href='/store2/pub-crawl-28/';a.innerHTML='<span>Dynamic</span>';document.body.append(a);a.querySelector('span').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true}));});
   check(label+' dynamic/context-menu links decorated',new URL(await page.locator('#dynamic').getAttribute('href')).searchParams.get('gclid')===params.gclid);
   for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    const rect=await page.locator('#ktk-cta').boundingBox();
    check(label+' CTA fits at '+width,rect&&rect.x>=-1&&rect.y>=0&&rect.x+rect.width<=width+1,rect);
   }
   await mkdir('docs/shared-integrations/screenshots',{recursive:true});
   await page.screenshot({path:`docs/shared-integrations/screenshots/legacy-fixture-${blockedStorage?'blocked':'normal'}.png`});
   await page.addScriptTag({content:script});
   await page.evaluate(()=>window.menuClicks=0);
   await page.locator('.mobile_menu_bar').tap();
   await page.waitForTimeout(50);
   check(label+' duplicate initialization guarded',await page.evaluate(()=>window.menuClicks)===1);
  }finally{await context.close();}
 }
 check('No fixture JavaScript errors',errors.length===0,errors);
}finally{
 await browser.close();
 const summary={passed:checks.filter(row=>row.pass).length,total:checks.length};
 await mkdir('docs/shared-integrations',{recursive:true});
 await writeFile('docs/shared-integrations/local-browser-checks.json',JSON.stringify({checkedAt:new Date().toISOString(),summary,checks,errors,conditions:'Fully intercepted isolated fixture; no public requests, orders, messages, payments or analytics collection.'},null,2));
 console.log(JSON.stringify({summary,failed:checks.filter(row=>!row.pass)},null,2));
 if(summary.passed!==summary.total)process.exitCode=1;
}
