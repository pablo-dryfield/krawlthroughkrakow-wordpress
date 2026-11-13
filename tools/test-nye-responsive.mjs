import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [homeBase,pagesBase,output]=process.argv.slice(2);
if(!homeBase||!pagesBase||!output)throw Error('Homepage base, pages base and fresh report directory required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve existing report');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const report={scope:'Read-only rendering/native menu interactions; external services blocked. No forms, bookings, consent or account changes.',checks:[],errors:[]};
const target=value=>{const url=new URL(value);if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_nye_check','20261113-'+Date.now());return url.href;};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
async function open(base,width,javaScriptEnabled=true){
 const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled,reducedMotion:'reduce'});
 const host=new URL(base).hostname;
 await context.route('**/*',route=>new URL(route.request().url()).hostname===host&&['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push({base,width,message:error.message}));
 return {context,page};
}
try{
 for(const width of [320,390,768,980,981,1024,1280,1366,1440,1536,1599,1600,1680,1920]){
  const {context,page}=await open(homeBase,width);
  try{
   await page.goto(target(homeBase),{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
   const toggle=page.locator('.mobile_menu_bar'),desktop=page.locator('#top-menu-nav');
   check(width+' homepage compact menu threshold',await toggle.isVisible()===(width<1600)&&await desktop.isVisible()===(width>=1600));
   check(width+' homepage no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(width<1600){
    await toggle.focus();await page.keyboard.press('Enter');
    check(width+' keyboard opens complete menu',await toggle.getAttribute('aria-expanded')==='true'&&await page.locator('#mobile_menu a[href]').count()>15);
    const menuBox=await page.locator('#mobile_menu').boundingBox();
    check(width+' open menu within viewport',!!menuBox&&menuBox.x>=-1&&menuBox.x+menuBox.width<=width+1);
    await page.keyboard.press('Escape');check(width+' Escape closes and restores focus',await toggle.getAttribute('aria-expanded')==='false'&&await toggle.evaluate(x=>document.activeElement===x));
   }else{
    const boxes=await page.locator('#top-menu > li > a').evaluateAll(nodes=>nodes.map(x=>{const b=x.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(x);const textBox=range.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,text:x.textContent.trim(),textTop:textBox.y,textBottom:textBox.bottom};}));
    check(width+' desktop links including Book Now do not wrap or overlap',boxes.length===9&&Math.max(...boxes.map(b=>b.textTop))<Math.min(...boxes.map(b=>b.textBottom))&&boxes.every((b,i)=>!i||b.x>=boxes[i-1].right-1),boxes);
   }
   if([390,1440,1920].includes(width))await page.screenshot({path:path.join(output,'homepage-'+width+'.png')});
  }finally{await context.close();}
 }
 const {context:resizeContext,page:resizePage}=await open(homeBase,1440);
 try{
  await resizePage.goto(target(homeBase),{waitUntil:'load'});await resizePage.locator('.mobile_menu_bar').click();
  await resizePage.setViewportSize({width:1920,height:900});
  await resizePage.waitForFunction(()=>document.querySelector('.mobile_menu_bar').getAttribute('aria-expanded')==='false');
  await resizePage.setViewportSize({width:1440,height:900});
  check('resizing across menu threshold resets open state',await resizePage.locator('.mobile_menu_bar').getAttribute('aria-expanded')==='false');
 }finally{await resizeContext.close();}
 const {context:noJsContext,page:noJsPage}=await open(homeBase,1440,false);
 try{await noJsPage.goto(target(homeBase),{waitUntil:'load'});check('no-JS laptop retains original complete navigation',await noJsPage.locator('#top-menu-nav').isVisible()&&await noJsPage.locator('#top-menu > li').count()===9);}finally{await noJsContext.close();}
 for(const route of ['new-years-eve-in-krakow/','krakow-new-years-eve/','new-years-eve/'])for(const width of [320,390,768,1440]){
  const url=new URL(route,pagesBase).href,{context,page}=await open(url,width);
  try{
   await page.goto(target(url),{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
   const facts=await page.evaluate(()=>{const root=document.querySelector('#main-content');return {h1:root.querySelectorAll('h1').length,text:root.innerText,fragments:[...root.querySelectorAll('a[href^="#"]')].filter(a=>a.hash.length>1&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash),typo:[...root.querySelectorAll('a[href]')].filter(a=>/krawlthoughkrakow|docs.google.com\/document/.test(a.href)).map(a=>a.href),booking:[...root.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(x=>x.includes('/nye-pub-crawl-32/')),overflow:document.documentElement.scrollWidth>innerWidth+1};});
   check(route+width+' primary heading and no overflow',facts.h1===1&&!facts.overflow);
   check(route+width+' contents and typo destinations resolve',!facts.fragments.length&&!facts.typo.length,{fragments:facts.fragments,typo:facts.typo});
   if(route==='new-years-eve-in-krakow/'){
    check(route+width+' eight local contents targets',await page.locator('#holiday-getaway,#christmas-traditions,#new-years-celebrations,#nye-pub-crawl,#plan-your-getaway,#festive-itinerary,#closing-thoughts,#book-nye').count()===8);
    check(route+width+' direct current NYE booking destination',facts.booking.some(href=>href.endsWith('/nye-pub-crawl-32/#book')));
    check(route+width+' unconfirmed promises replaced',!facts.text.includes('An enormous stage hosts')&&!facts.text.includes('including whisky, rum, gin, vodka, beer, and champagne')&&facts.text.includes('A city-centre stage, public countdown or fireworks display is not confirmed'));
   }
   if(route==='krakow-new-years-eve/')check(route+width+' old ski price removed',!facts.text.includes('£15')&&facts.text.includes('Check current lift-pass prices'));
   if(route==='new-years-eve/')check(route+width+' confirmed event facts retained',['2026 / 2027','250 PLN','5:00 PM','7:30 PM','TBA'].every(x=>facts.text.includes(x)));
   if(width===390)await page.screenshot({path:path.join(output,route.replaceAll('/','')+'-390.png')});
  }finally{await context.close();}
 }
}catch(error){report.errors.push(error.stack);}finally{
 await browser.close();report.passed=report.checks.filter(x=>x.pass).length;report.total=report.checks.length;
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 if(report.errors.length||report.passed!==report.total)process.exitCode=1;
}
