import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){if(!['--url','--output','--widths','--height'].includes(args[i])||!args[i+1]||options[args[i]])throw Error('Explicit paired, unique options required');options[args[i]]=args[i+1];}
const target=new URL(options['--url']||'https://krawlthroughkrakow.com/staging/');
if(target.username||target.password||target.search||target.hash||!(target.origin==='https://krawlthroughkrakow.com'&&target.pathname==='/staging/'||['127.0.0.1','localhost'].includes(target.hostname)&&target.protocol==='http:'))throw Error('Only a clean staging homepage or explicit local preview URL is allowed');
const output=options['--output'];if(!output)throw Error('Explicit new --output path required');
try{await readFile(output);throw Error('Preserve previous UI evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const widths=(options['--widths']||'320,390,768,1440').split(',').map(Number),height=Number(options['--height']||900);
if(!widths.length||widths.length>8||new Set(widths).size!==widths.length||widths.some(n=>!Number.isInteger(n)||n<240||n>2560)||!Number.isInteger(height)||height<120||height>1440)throw Error('Bounded viewport dimensions required');
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const reviews=JSON.parse(execFileSync('php',['-r',"define('ABSPATH','.');require $argv[1];echo json_encode(ktk_homepage_review_sources());",path.join(root,'staging/wp-content/mu-plugins/ktk-homepage-assets/reviews.php')],{encoding:'utf8'}));
const report={startedAt:new Date().toISOString(),scope:'Scoped public homepage review-link names, booking-tab visibility/focus and schedule clearance; no native zoom, screen-reader, provider, consent or whole-page acceptance',url:target.href,views:[],checks:[],errors:[],blockedRequests:[],assetResponses:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const folder=path.join(path.dirname(output),path.basename(output,'.json')+'-screenshots');await mkdir(folder,{recursive:true});
let browser;const deadline=setTimeout(()=>browser?.close().catch(()=>{}),180000);
try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const scripting of [false,true])for(const width of widths){
  const context=await browser.newContext({javaScriptEnabled:scripting,viewport:{width,height}}),label=`${width}x${height}-${scripting?'js':'nojs'}`;
  await context.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url()),inScope=url.origin===target.origin&&(target.hostname==='krawlthroughkrakow.com'?url.pathname.startsWith('/staging/'):true);
   const publicResource=url.pathname===target.pathname&&!url.search||/\.(?:css|js|mjs|woff2?|ttf|otf|svg|png|jpe?g|webp|avif|gif|ico)$/i.test(url.pathname);
   if(inScope&&publicResource&&['GET','HEAD'].includes(request.method()))return route.continue();
   report.blockedRequests.push({view:label,method:request.method(),host:url.hostname,pathClass:inScope?'non-static-or-nonread':'outside-scope'});return route.abort();
  });
  const page=await context.newPage(),pageErrors=[],pending=[];
  page.on('pageerror',e=>pageErrors.push(e.message.slice(0,500)));
  page.on('response',response=>{const u=new URL(response.url());if(u.origin===target.origin&&u.pathname.endsWith('/ktk-homepage-assets/hero.css'))pending.push(response.body().then(b=>report.assetResponses.push({view:label,status:response.status(),cache:response.headers()['cf-cache-status']??null,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')})));});
  try{
   const response=await page.goto(target.href,{waitUntil:'networkidle',timeout:30000});check(label+' HTTP',response?.status()===200,{status:response?.status(),cache:response?.headers()['cf-cache-status']??null});
   let fonts=false;for(let i=0;i<40;i++){if(await page.evaluate(()=>document.fonts.status)==='loaded'){fonts=true;break;}await new Promise(r=>setTimeout(r,250));}check(label+' font settling',fonts);
   await page.screenshot({path:path.join(folder,label+'-top.png'),timeout:10000});
   const nav=page.locator('.ktk-hero-reviews'),aria=await nav.ariaSnapshot(),links=await nav.locator('a').evaluateAll(ns=>ns.map(n=>({href:n.getAttribute('href'),text:n.textContent.replace(/\s+/g,' ').trim()})));
   check(label+' platform link count',links.length===reviews.length);
   for(const review of reviews){const link=links.find(l=>l.href===review.url);check(label+' '+review.name+' accessible purpose',aria.includes('link "'+review.name+' ')&&!!link);check(label+' '+review.name+' complete snapshot',link?.text.includes(Number(review.rating)+'/5')&&link?.text.includes(review.count+' reviews'));}
   const navY=await nav.evaluate(n=>n.getBoundingClientRect().top+scrollY),states=[];
   for(const y of [...new Set([0,Math.max(0,navY-height*.55),Math.max(0,navY-height*.8)])]){
    await page.evaluate(y=>scrollTo(0,y),y);await new Promise(r=>setTimeout(r,100));
    const state=await page.evaluate(()=>{
     const tab=document.querySelector('#ktk-cta'),b=tab.getBoundingClientRect(),covered=[];
     for(const n of document.querySelectorAll('#ktk-seasonal-hero .ktk-hero-times dt,#ktk-seasonal-hero .ktk-hero-times dd')){const range=document.createRange();range.selectNodeContents(n);for(const r of range.getClientRects()){const left=Math.max(b.left,r.left,0),right=Math.min(b.right,r.right,innerWidth),top=Math.max(b.top,r.top,0),bottom=Math.min(b.bottom,r.bottom,innerHeight);if(right>left&&bottom>top&&tab.contains(document.elementFromPoint((left+right)/2,(top+bottom)/2)))covered.push(n.textContent.trim());}}
     return {scrollY,viewport:{width:innerWidth,height:innerHeight},scrollWidth:document.documentElement.scrollWidth,tab:{x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height},coveredScheduleFragments:covered};
    });states.push(state);const b=state.tab;
    check(label+' full booking tab at '+state.scrollY,b.x>=0&&b.y>=0&&b.right<=width+.1&&b.bottom<=height+.1,b);
    check(label+' booking target at '+state.scrollY,b.width>=44&&b.height>=44,b);
    check(label+' schedule clear at '+state.scrollY,state.coveredScheduleFragments.length===0,state.coveredScheduleFragments);
    check(label+' no horizontal overflow at '+state.scrollY,state.scrollWidth<=width,state.scrollWidth);
   }
   await nav.evaluate(n=>n.scrollIntoView({block:'center'}));await new Promise(r=>setTimeout(r,200));await page.screenshot({path:path.join(folder,label+'.png'),timeout:10000});
   await page.locator('#ktk-cta').focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
   const focus=await page.locator('#ktk-cta').evaluate(n=>{const s=getComputedStyle(n);return {active:document.activeElement===n,outline:s.outlineStyle,color:s.outlineColor,width:s.outlineWidth,offset:s.outlineOffset};});
   check(label+' keyboard white focus',focus.active&&focus.outline==='solid'&&focus.color==='rgb(255, 255, 255)'&&focus.width==='3px',focus);
   await page.locator('#ktk-cta').screenshot({path:path.join(folder,label+'-focused-tab.png'),timeout:10000});
   report.views.push({label,viewport:{width,height},scripting,aria,links,states,focus,pageErrors});
  }catch(e){report.errors.push({view:label,message:e.message});}
  await Promise.allSettled(pending);await context.close();
 }
}finally{
 clearTimeout(deadline);await browser?.close();report.finishedAt=new Date().toISOString();report.passed=report.errors.length===0&&report.checks.length>0&&report.checks.every(c=>c.pass);report.browserClosed=true;
 await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failed:report.checks.filter(c=>!c.pass),errors:report.errors,views:report.views.length,pageErrorsRetained:report.views.flatMap(v=>v.pageErrors).length,blockedBeforeSending:report.blockedRequests.length}));if(!report.passed)process.exitCode=1;
}
