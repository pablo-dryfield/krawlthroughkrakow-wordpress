import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {loadOfferPageRevisions} from './offer-pages-editorial.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [base,output]=process.argv.slice(2),origin=new URL(base);
if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(origin.href))throw Error('Explicit staging/preview required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});const revisions=await loadOfferPageRevisions();
const report={checkedAt:new Date().toISOString(),scope:'Read-only initial HTML, revised copy, native FAQ keyboard and stubbed map-consent state checks. All non-read/provider requests blocked. No orders, messages, personal data or persistent user consent changes. No-JS checks concern initial HTML/directions, not a claim of JavaScript-free accordion interaction.',checks:[],errors:[],blockedWrites:0,noJsViews:[]},check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const revision of revisions)for(const [width,js] of [[320,true],[390,true],[768,true],[1440,true],[390,false]]){
  const route=revision.key==='how-to-join'?'about-us/how-to-join/':revision.key+'/',label=revision.key+' '+width+' '+(js?'js':'nojs');
  const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js,reducedMotion:'reduce'}),page=await context.newPage();
  try{
   await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(!['GET','HEAD'].includes(req.method())){report.blockedWrites++;return route.abort();}return u.origin===origin.origin&&!/\/(?:orders|carts|checkout|quote)(?:\/|$)/.test(u.pathname)?route.continue():route.abort();});
   await page.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;window.__offerTestPurposes={3:false};window._iub={cs:{api:{getPreferences:()=>({purposes:window.__offerTestPurposes})}}};});
   page.on('pageerror',error=>report.errors.push({label,message:error.message}));
   const url=new URL(route,base);if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_offer_pages',Date.now());
   const response=await page.goto(url.href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
   check(label+' HTTP200 and one main/H1',response.status()===200&&await page.getByRole('main').count()===1&&await page.locator('h1').count()===1);
   check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const raw=await response.text();
   const source=await page.evaluate(({raw,revision})=>{
    const d=new DOMParser().parseFromString(raw,'text/html'),templates=new DOMParser().parseFromString(revision.markup,'text/html'),normalize=s=>s.replace(/\s+/g,' ').trim();
    return [...templates.querySelectorAll('template')].map(t=>{const selector=t.getAttribute('data-target'),question=t.getAttribute('data-question');const n=selector?d.querySelector(selector):[...d.querySelectorAll('.et_pb_toggle')].find(n=>normalize(n.querySelector('.et_pb_toggle_title')?.textContent||'')===question)?.querySelector('.et_pb_toggle_content');return {identity:selector||question,matches:!!n&&normalize(n.textContent)===normalize(t.content.textContent)&&n.getAttribute('data-ktk-offer-copy')===revision.reviewedOn};});
   },{raw,revision});
   check(label+' complete source-bound copy in initial HTML',source.length===(revision.key==='how-to-join'?3:revision.key==='faqs'?15:1)&&source.every(row=>row.matches),source.filter(row=>!row.matches));
   check(label+' old price/wristband/automatic booking promises absent',await page.locator('#main-content').evaluate(n=>!/89zl|95 zl|120 zl|wristbands?|automatically guarantee/i.test(n.textContent)));
   if(!js)report.noJsViews.push({key:revision.key,initialCopyTargets:source.length,visibleTargets:await page.locator('[data-ktk-offer-copy]:visible').count()});
   const targets=page.locator('[data-ktk-offer-copy]');
   for(let i=0;i<await targets.count();i++){
    const node=targets.nth(i),toggle=await node.evaluate(n=>n.classList.contains('et_pb_toggle_content'));
    if(toggle&&js){const button=node.locator('..').locator('.ktk-toggle-button');await button.focus();if(await button.getAttribute('aria-expanded')!=='true')await page.keyboard.press('Enter');check(label+' FAQ '+i+' Enter opens',await button.getAttribute('aria-expanded')==='true'&&await node.isVisible());}
    if(!await node.isVisible())continue;
    await node.scrollIntoViewIfNeeded();
    const fit=await node.evaluate(n=>{
     const b=n.getBoundingClientRect(),ranges=[],walker=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);let text;
     while((text=walker.nextNode())){if(!text.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(text);ranges.push(...[...range.getClientRects()].filter(r=>r.width&&r.height).map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})));}
     const tab=document.getElementById('ktk-cta')?.getBoundingClientRect(),horizontal=ranges.filter(r=>r.left<b.left-2||r.right>b.right+2),overlap=tab?ranges.filter(r=>r.left<tab.right+2&&r.right>tab.left-2&&r.top<tab.bottom+2&&r.bottom>tab.top-2):[],clipped=[];
     for(let p=n;p&&p!==document.body;p=p.parentElement)if(['hidden','clip'].includes(getComputedStyle(p).overflowY)){const box=p.getBoundingClientRect();clipped.push(...ranges.filter(r=>r.top<box.top-2||r.bottom>box.bottom+2));}
     return {horizontal,overlap,clipped};
    });
    check(label+' copy '+i+' fits and clears floating tab',!fit.horizontal.length&&!fit.overlap.length&&!fit.clipped.length,fit);
    check(label+' copy '+i+' link colours and underline follow the actual light/promo surface',await node.locator('a').evaluateAll(nodes=>nodes.every(n=>{const style=getComputedStyle(n);return style.color===(n.closest('.et_pb_promo')?'rgb(255, 255, 255)':'rgb(200, 0, 108)')&&style.textDecorationLine.includes('underline');})));
    if([390,1440].includes(width)&&js&&(i===0||revision.key==='faqs'&&i===3))await page.screenshot({path:path.join(output,revision.key+'-'+width+'-'+i+'.png'),animations:'disabled'});
    if(toggle&&js){const button=node.locator('..').locator('.ktk-toggle-button');await button.focus();await page.keyboard.press('Space');check(label+' FAQ '+i+' Space closes',await button.getAttribute('aria-expanded')==='false');}
   }
   if(js){
    const maps=page.locator('iframe[data-ktk-map-src],iframe[data-ktk-embed-src]'),expectedMaps=revision.key==='how-to-join'?2:1;
    check(label+' retained maps withheld without purpose3',await maps.count()===expectedMaps&&await maps.evaluateAll(nodes=>nodes.every(n=>n.getAttribute('src')==='about:blank')));
    await page.evaluate(()=>{window.__offerTestPurposes[3]=true;window.dispatchEvent(new Event('iubenda_consent_updated'));});
    check(label+' unchanged maps load only with stubbed purpose3',await maps.count()===expectedMaps&&await maps.evaluateAll(nodes=>nodes.every(n=>n.getAttribute('src')===(n.dataset.ktkMapSrc||n.dataset.ktkEmbedSrc))));
    await page.evaluate(()=>{window.__offerTestPurposes[3]=false;window.dispatchEvent(new Event('iubenda_consent_rejected'));});
    check(label+' maps return to blank after rejection',await maps.count()===expectedMaps&&await maps.evaluateAll(nodes=>nodes.every(n=>n.getAttribute('src')==='about:blank')));
   }
  }catch(error){report.errors.push({label,message:error.message});}finally{await context.close();}
 }
}finally{await browser.close();}
check('no page errors',report.errors.length===0,report.errors);report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,noJsViews:report.noJsViews,failed:report.checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
