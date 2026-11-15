import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';

const [base,folder]=process.argv.slice(2);if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base)||!folder)throw Error('Explicit local/staging base and fresh evidence directory required');
try{await readFile(path.join(folder,'report.json'));throw Error('Preserve earlier evidence');}catch(e){if(e.code!=='ENOENT')throw e;}await mkdir(folder,{recursive:true});
const indices={'about-us':[0],faqs:[0],'how-to-join':[0,1],'krakow-stag-do':[0,1],'meeting-point':[0],'new-years-eve':[0],'post-2020-krakow-nightlife-guide':[0,1,3,5],'post-new-years-eve-in-krakow':[0,1],'post-welcome-to-alcohol':[0],'pub-crawl-jobs':[0],testimonials:[0],'tour-service-disclaimer':[0]},root='staging/wp-content/mu-plugins/ktk-code-pages-assets/',keys=[...Object.keys(indices),'contact','post-spooktacular-krakow-unveil-the-mysteries-of-halloween'],manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
const inputs=['tools/test-embed-fallback-browser.mjs','tools/embed-fallbacks.mjs',root+'runtime.css',root+'runtime.js',...keys.map(k=>root+'content/'+k+'.html')],hashes=async()=>{const d={};for(const f of inputs)d[f]=createHash('sha256').update(await readFile(f)).digest('hex');return d;},initial=await hashes();
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),frontend=createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json'));
if(frontend('axe-core/package.json').version!=='4.14.0')throw Error('Pinned axe required');const axe=await readFile(frontend.resolve('axe-core/axe.min.js'),'utf8');
const report={checkedAt:new Date().toISOString(),base,scope:'Responsive original-frame geometry, withheld/granted-but-blocked/revoked consent, no-JS native alternatives and trusted keyboard handoffs; all providers/non-read requests blocked',sourceHashes:initial,checks:[],errors:[],writes:[],providersBlocked:[],axe:[],captures:[]},check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu']});let views=0;
async function visiblePaint(page){await page.waitForFunction(()=>[...document.querySelectorAll('#main-content img')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0;}).every(n=>n.complete&&n.naturalWidth>0),{timeout:30000});await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('#main-content img')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0;}).map(n=>n.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}
try{
 for(const key of keys){
  const selected=Object.hasOwn(indices,key),widths=selected?[320,390,768,1440]:[390,1440];
  for(const width of widths)for(const [motion,js]of [['reduce',true],['reduce',false],...(selected&&[390,1440].includes(width)?[['no-preference',true]]:[])]){
   const name=key+' '+width+' '+motion+' '+(js?'JS':'no-JS'),context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js,reducedMotion:motion,serviceWorkers:'block'});
   try{
    await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());if(!['GET','HEAD'].includes(q.method())){report.writes.push({name,method:q.method(),url:q.url()});return r.abort();}if(u.origin!==new URL(base).origin||base.startsWith('https:')&&!(u.pathname.startsWith('/staging/')||u.pathname==='/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js')){report.providersBlocked.push({name,url:q.url()});return r.abort();}return r.continue();});
    await context.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;window.__ktkEmbedPurpose=false;window._iub={cs:{api:{getPreferences:()=>({purposes:{3:window.__ktkEmbedPurpose}})}}};});
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push({name,message:e.message}));const row=manifest.routes.find(r=>r.key===key);if(!row)throw Error('Exact original route required');const url=new URL(row.route.replace(/^\//,''),base);if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_embed_check',Date.now().toString());
    const response=await page.goto(url.href,{waitUntil:'load',timeout:60000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
    const facts=await page.evaluate(({key,selected,wanted})=>{
     const main=document.querySelector('#main-content'),frames=[...main.querySelectorAll('iframe')],parents=[...main.querySelectorAll('[data-ktk-embed-fallback]')],notices=[...main.querySelectorAll('[data-ktk-embed-notice]')],bars=[...main.querySelectorAll('[data-ktk-embed-alternative]')],box=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {width:r.width,height:r.height,display:s.display,visibility:s.visibility};},candidate=frames.map(box),stored=[...notices,...bars].map(n=>({n,parent:n.parentNode,next:n.nextSibling})),attributes=parents.map(n=>[n,n.dataset.ktkEmbedFallback]);
     for(const {n}of stored)n.remove();for(const [n]of attributes)n.removeAttribute('data-ktk-embed-fallback');const baseline=frames.map(box);for(const [n,v]of attributes)n.dataset.ktkEmbedFallback=v;for(const {n,parent,next}of stored)parent.insertBefore(n,next);
     const type=notices.map(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return {font:parseFloat(s.fontSize),line:parseFloat(s.lineHeight),display:s.display,height:r.height,client:n.clientHeight,scroll:n.scrollHeight,width:r.width};}),links=bars.map(n=>{const a=n.querySelector('a'),s=getComputedStyle(a),r=a.getBoundingClientRect();return {href:a.getAttribute('href'),tab:a.tabIndex,font:parseFloat(s.fontSize),height:r.height,display:s.display};});
     return {width:innerWidth,scroll:document.documentElement.scrollWidth,counts:[parents.length,notices.length,bars.length],geometryExact:JSON.stringify(candidate)===JSON.stringify(baseline),candidate,baseline,type,links,withheld:frames.every(n=>n.getAttribute('src')==='about:blank'&&!!(n.dataset.ktkMapSrc||n.dataset.ktkEmbedSrc)),ids:parents.map(n=>n.dataset.ktkEmbedFallback),contactLinks:key==='contact'?main.querySelectorAll('[data-ktk-contact-map] a').length:null,localVideo:key.startsWith('post-spooktacular')?{count:main.querySelectorAll('video').length,paused:main.querySelector('video')?.paused,autoplay:main.querySelector('video')?.autoplay}:null};
    },{key,selected,wanted:indices[key]||[]});
    check(name+' HTTP200',response.status()===200,response.status());check(name+' no horizontal overflow',facts.scroll<=facts.width,facts);check(name+' original iframe dimensions/display exact',facts.geometryExact,{candidate:facts.candidate,baseline:facts.baseline});check(name+' all original frames withheld',facts.withheld);
    const wanted=indices[key]||[];check(name+' exact bounded fallback counts',facts.counts.every(n=>n===wanted.length)&&JSON.stringify(facts.ids)===JSON.stringify(wanted.map(i=>key+'-'+i)),facts.counts);
    check(name+' legible visible notices fit original frame areas',facts.type.every(n=>n.display==='flex'&&n.font>=16&&n.line>=n.font*1.45&&n.client>=n.scroll&&n.height>0),facts.type);
    check(name+' native alternatives readable and keyboard eligible',facts.links.every(n=>n.font>=16&&n.height>=44&&n.tab===0),facts.links);
    if(key==='contact')check(name+' original two native map alternatives',facts.contactLinks===2,facts.contactLinks);
    if(facts.localVideo)check(name+' original local video remains unplayed',facts.localVideo.count===1&&facts.localVideo.paused&&!facts.localVideo.autoplay,facts.localVideo);
    if(selected&&width===390&&motion==='reduce'&&js){
     for(const index of wanted){const id=key+'-'+index;await page.evaluate(id=>{const a=document.querySelector(`[data-ktk-embed-notice="${id}"]`).getBoundingClientRect(),b=document.querySelector(`[data-ktk-embed-alternative="${id}"]`).getBoundingClientRect(),top=Math.min(a.top,b.top),bottom=Math.max(a.bottom,b.bottom);scrollBy(0,top-Math.max(0,(innerHeight-(bottom-top))/2));},id);await page.waitForTimeout(750);await visiblePaint(page);const file=id+'-withheld-390.png';await page.screenshot({path:path.join(folder,file)});report.captures.push({name,id,file});}
    }
    await page.evaluate(()=>{window.__ktkEmbedHandoffs=[];document.addEventListener('click',e=>{const a=e.target.closest('[data-ktk-embed-alternative] a');if(a){window.__ktkEmbedHandoffs.push({href:a.getAttribute('href'),trusted:e.isTrusted});e.preventDefault();}},true);});
    for(const id of wanted.map(i=>key+'-'+i)){
     const a=page.locator(`[data-ktk-embed-alternative="${id}"] a`);await a.scrollIntoViewIfNeeded();await a.focus();
     const handoff=await a.evaluate(n=>({expected:n.getAttribute('href'),absolute:n.href,focused:document.activeElement===n,r:(()=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})(),tabs:[...document.querySelectorAll('#ktk-cta,[data-ktk-floating-booking] a')].map(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})}));
     let nativeRequest;
     if(!js&&!handoff.expected.startsWith('#'))nativeRequest=context.waitForEvent('request',{predicate:q=>q.isNavigationRequest()&&q.url()===handoff.absolute,timeout:10000});
     await page.keyboard.press('Enter');
     if(js){handoff.last=await page.evaluate(()=>window.__ktkEmbedHandoffs.at(-1));check(name+' '+id+' trusted Enter handoff',handoff.focused&&handoff.last?.trusted&&handoff.last.href===handoff.expected,handoff);}
     else if(nativeRequest){const request=await nativeRequest;check(name+' '+id+' no-JS native navigation blocked before provider',handoff.focused&&request.method()==='GET'&&request.url()===handoff.absolute,{expected:handoff.absolute,actual:request.url()});for(const popup of context.pages().filter(p=>p!==page))await popup.close();}
     else{
      await page.waitForURL(u=>u.hash===handoff.expected,{timeout:10000});
      const jump=await page.evaluate(href=>{const n=document.querySelector(href),r=n.getBoundingClientRect(),header=document.querySelector('#main-header')?.getBoundingClientRect();return {top:r.top,bottom:r.bottom,headerBottom:header?.bottom??0};},handoff.expected);
      check(name+' '+id+' no-JS native fragment navigation',new URL(page.url()).hash===handoff.expected&&jump.bottom>0&&jump.top>=Math.max(0,jump.headerBottom)-1,jump);
     }
     check(name+' '+id+' clears floating links',!handoff.tabs.some(t=>t.right>t.left&&t.bottom>t.top&&Math.min(t.right,handoff.r.right)>Math.max(t.left,handoff.r.left)&&Math.min(t.bottom,handoff.r.bottom)>Math.max(t.top,handoff.r.top)),handoff);
    }
    if(js){
     await page.evaluate(()=>{window.__ktkEmbedPurpose=true;dispatchEvent(new Event('iubenda_consent_updated'));});
     await page.waitForFunction(()=>[...document.querySelectorAll('#main-content iframe')].every(n=>n.getAttribute('src')===(n.dataset.ktkMapSrc||n.dataset.ktkEmbedSrc)),{timeout:10000});
     const granted=await page.evaluate(()=>({notices:[...document.querySelectorAll('[data-ktk-embed-notice]')].map(n=>getComputedStyle(n).display),links:[...document.querySelectorAll('[data-ktk-embed-alternative] a')].map(n=>n.getBoundingClientRect().height)}));
     check(name+' allowed-source update hides only notices, preserves native alternatives',granted.notices.every(v=>v==='none')&&granted.links.every(h=>h>=44),granted);
     await page.evaluate(()=>{window.__ktkEmbedPurpose=false;dispatchEvent(new Event('iubenda_consent_rejected'));});await page.waitForFunction(()=>[...document.querySelectorAll('#main-content iframe')].every(n=>n.getAttribute('src')==='about:blank'),{timeout:10000});
     check(name+' revoke restores notices and alternatives',await page.evaluate(()=>[...document.querySelectorAll('[data-ktk-embed-notice]')].every(n=>getComputedStyle(n).display==='flex')&&[...document.querySelectorAll('[data-ktk-embed-alternative] a')].every(n=>n.getBoundingClientRect().height>=44)));
    }
    if(selected&&width===390&&js&&motion==='reduce'){await page.addScriptTag({content:axe});const result=await page.evaluate(()=>axe.run(document.querySelector('#main-content'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));report.axe.push({name,violations:result.violations,incomplete:result.incomplete.map(r=>({id:r.id,nodes:r.nodes.length}))});check(name+' no automated accessibility violations',!result.violations.length,result.violations);}
    views++;console.log(name+' complete ('+views+'/128)');
   }finally{await context.close();}
  }
 }
}catch(e){report.errors.push({harness:e.stack});}finally{await browser.close();}
check('All128 responsive contexts complete',views===128,views);check('Source and harness bytes stable',JSON.stringify(initial)===JSON.stringify(await hashes()));check('No page or harness errors',!report.errors.length,report.errors);check('No non-read request attempts',!report.writes.length,report.writes);
report.views=views;report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;await writeFile(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,views,axe:report.axe.map(a=>({name:a.name,violations:a.violations.length,incomplete:a.incomplete.length})),failed:report.checks.filter(c=>!c.pass),errors:report.errors},null,2));if(report.passed!==report.total)process.exitCode=1;
