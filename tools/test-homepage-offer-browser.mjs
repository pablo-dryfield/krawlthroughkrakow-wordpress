import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {loadHomepageOfferRevision} from './homepage-offer-editorial.mjs';
import {homepageAuditWriteKind} from './homepage-media-policy.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [base,output]=process.argv.slice(2),url=new URL(base);
if(!(url.href==='https://krawlthroughkrakow.com/staging/'||url.href==='http://127.0.0.1:5184/'))throw Error('Explicit homepage staging/preview required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});const revision=await loadHomepageOfferRevision();
const report={checkedAt:new Date().toISOString(),scope:'Read-only homepage copy/layout checks; no providers, commerce, submissions or consent changes. Not whole-site accessibility certification.',checks:[],errors:[],blockedWrites:0,blockedCommerceWrites:0};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [width,js] of [[320,true],[360,true],[390,true],[768,true],[981,true],[1024,true],[1440,true],[1920,true],[390,false],[1440,false]]){
  const label=width+'-'+(js?'js':'nojs'),context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',javaScriptEnabled:js}),page=await context.newPage();
  try{
   await context.route('**/*',route=>{const req=route.request(),target=new URL(req.url()),kind=homepageAuditWriteKind(req.method(),req.url());if(kind){report.blockedWrites++;if(kind==='commerce')report.blockedCommerceWrites++;return route.abort();}return target.origin===url.origin&&!/\/(?:orders|carts|quote|checkout)(?:\/|$)/.test(target.pathname)?route.continue():route.abort();});
   await page.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;});
   page.on('pageerror',error=>report.errors.push({label,message:error.message}));
   const target=new URL(base);if(process.argv.includes('--cache-bust'))target.searchParams.set('ktk_offer_review',Date.now());
   const response=await page.goto(target.href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
   check(label+' HTTP200',response.status()===200);
   if(url.protocol==='https:')check(label+' staging noindex',/noindex/.test(await page.locator('meta[name="robots"]').getAttribute('content')));
   const raw=await response.text();
   const copy=await page.evaluate(({raw,revision})=>{
    const d=new DOMParser().parseFromString(raw,'text/html'),t=new DOMParser().parseFromString(revision.html,'text/html');
    const normalize=s=>s.replace(/\s+/g,' ').trim();
    return [...t.querySelectorAll('template')].map(template=>({selector:template.dataset.target,matches:normalize(d.querySelector(template.dataset.target)?.textContent||'')===normalize(template.content.textContent)}));
   },{raw,revision});
   check(label+' complete reviewed copy in initial HTML',copy.length===27&&copy.every(c=>c.matches),copy.filter(c=>!c.matches));
   check(label+' no page horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const targets=await page.evaluate(revision=>{const d=new DOMParser().parseFromString(revision.html,'text/html');return [...d.querySelectorAll('template')].map(n=>n.dataset.target);},revision);
   for(const selector of targets){
    const node=page.locator(selector);if(!await node.isVisible())continue;
    await node.scrollIntoViewIfNeeded();
    const bounds=await node.evaluate(n=>{
     const rects=node=>{const out=[],walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let text;while((text=walker.nextNode())){if(!text.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(text);out.push(...[...range.getClientRects()].filter(r=>r.width&&r.height).map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})));}return out;};
     const b=n.getBoundingClientRect(),ranges=rects(n),overflow=ranges.filter(r=>r.left<b.left-2||r.right>b.right+2),clipped=[];
     // Font ascent may extend above a CSS line box. Only an actual clipping ancestor
     // or collision with the following heading makes that vertical overhang a defect.
     for(let parent=n;parent&&parent!==document.body;parent=parent.parentElement){const style=getComputedStyle(parent),box=parent.getBoundingClientRect();if(['hidden','clip'].includes(style.overflowY))clipped.push(...ranges.filter(r=>r.top<box.top-2||r.bottom>box.bottom+2));}
     const next=/^H[1-6]$/.test(n.tagName)&&n.nextElementSibling?rects(n.nextElementSibling):[];
     const collisions=ranges.filter(r=>next.some(other=>r.left<other.right&&r.right>other.left&&r.top<other.bottom&&r.bottom>other.top));
     const tabs=[...document.querySelectorAll('#ktk-cta,.et_pb_text_1')].filter(tab=>tab.getClientRects().length).map(tab=>tab.getBoundingClientRect());
     const tabOverlaps=ranges.filter(r=>tabs.some(tab=>r.left<tab.right+2&&r.right>tab.left-2&&r.top<tab.bottom+2&&r.bottom>tab.top-2));
     return {box:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},overflow,clipped,collisions,tabOverlaps};
    });
    const fits=!bounds.overflow.length&&!bounds.clipped.length&&!bounds.collisions.length&&!bounds.tabOverlaps.length;
    check(label+' '+selector+' text fits without clipping or overlap',fits,fits?undefined:bounds);
   }
   const booking=page.locator('.et_pb_text_5 a[href*="store2"]');
   check(label+' native booking link has no hardcoded attribution',await booking.evaluate(n=>{const u=new URL(n.href);return u.pathname==='/staging/store2/pub-crawl-28/'&&!u.search&&u.hash==='#book';}));
   if([390,1440].includes(width)&&js)for(const [name,selector] of [['intro','.et_pb_section_1'],['booking-rules','.et_pb_text_5'],['story','.et_pb_text_10'],['meeting','.et_pb_text_33']]){await page.locator(selector).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,label+'-'+name+'.png'),animations:'disabled'});}
  }catch(error){report.errors.push({label,message:error.message});}finally{await context.close();}
 }
}finally{await browser.close();}
check('no attempted commerce mutations',report.blockedCommerceWrites===0);check('no browser errors',report.errors.length===0,report.errors);
report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:report.checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
