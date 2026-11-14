import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {loadMemorialEditorial,reviseMemorialEditorial} from './memorial-editorial.mjs';
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [base,output]=process.argv.slice(2);if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base)||!output)throw Error('Explicit staging/loopback base and fresh report required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve prior evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const revision=await loadMemorialEditorial(),key=revision.key,route='all-you-need-to-know-about-visiting-auschwitz/',file='staging/wp-content/mu-plugins/ktk-code-pages-assets/content/'+key+'.html';
const original=await readFile('deploy-backups/seo-memorial-guide-baseline/'+file,'utf8'),candidate=await readFile(file,'utf8');
const checks=[],errors=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const fixture=await browser.newPage({javaScriptEnabled:false});await fixture.route('**/*',r=>r.abort());
 await fixture.setContent(original);await fixture.evaluate(reviseMemorialEditorial,{key,revision});
 check('positive12-target recipe applies',await fixture.locator('[data-ktk-memorial-review="2026-11-14"]').count()===12);
 const once=await fixture.locator('body').innerHTML();await fixture.evaluate(reviseMemorialEditorial,{key,revision});check('recipe idempotent on reviewed DOM',await fixture.locator('body').innerHTML()===once);
 const mutations=[
  {name:'late original text changed',dom:()=>document.querySelector('.et_pb_text_11 .et_pb_text_inner').append(' unreviewed')},
  {name:'late target missing',dom:()=>document.querySelector('.et_pb_text_11 .et_pb_text_inner').remove()},
  {name:'late target duplicated',dom:()=>{const n=document.querySelector('.et_pb_text_11 .et_pb_text_inner');n.after(n.cloneNode(true));}},
  {name:'protected form inserted',dom:()=>document.querySelector('.et_pb_text_11 .et_pb_text_inner').append(document.createElement('form'))},
  {name:'featured source changed',dom:()=>document.querySelector('.et_post_meta_wrapper > img').setAttribute('src','other.jpg')},
  {name:'featured alt changed',dom:()=>document.querySelector('.et_post_meta_wrapper > img').alt='unreviewed'},
  {name:'empty map identity changed',dom:()=>document.querySelector('.et_pb_map').setAttribute('data-center-lat','0')},
  {name:'unreviewed destination',markup:revision.markup.replace('href="#memorial-entry"','href="javascript:alert(1)"')},
  {name:'missing template',markup:revision.markup.replace(/<template data-target="11">[\s\S]*?<\/template>/,'')},
  {name:'duplicate template',markup:revision.markup+revision.markup.match(/<template data-target="11">[\s\S]*?<\/template>/)[0]},
  {name:'changed heading ID',markup:revision.markup.replace('id="memorial-preparation"','id="wrong"')},
  {name:'changed review time',markup:revision.markup.replace('datetime="2026-11-14"','datetime="2027-11-14"')},
 ];
 for(const mutation of mutations){
  await fixture.setContent(original);if(mutation.dom)await fixture.evaluate(mutation.dom);const before=await fixture.locator('body').innerHTML();let rejected=false;
  try{await fixture.evaluate(reviseMemorialEditorial,{key,revision:{...revision,markup:mutation.markup||revision.markup}});}catch{rejected=true;}
  check(mutation.name+' fails atomically',rejected&&await fixture.locator('body').innerHTML()===before);
 }
 await fixture.close();
 for(const width of [320,390,600,768,1024,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
  try{
   await context.route('**/*',r=>{const request=r.request(),u=new URL(request.url());return ['GET','HEAD'].includes(request.method())&&(u.origin===new URL(base).origin)&&(u.hostname==='127.0.0.1'||u.pathname.startsWith('/staging/'))&&!/\/(collect|quote|checkout|carts|orders)(\/|$)/.test(u.pathname)?r.continue():r.abort();});
   const page=await context.newPage();page.on('pageerror',e=>errors.push({width,message:e.message}));const url=new URL(route,base);if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_memorial_check',Date.now().toString());
   const response=await page.goto(url.href,{waitUntil:'load',timeout:60000});await page.evaluate(()=>document.fonts.ready);
   check(width+' HTTP200',response.status()===200);
   const state=await page.evaluate(expected=>{
    const a=new DOMParser().parseFromString(expected,'text/html'),main=document.querySelector('#main-content'),nodes=[...main.querySelectorAll('[data-ktk-memorial-review]')];
    a.querySelectorAll('[data-ktk-memorial-review] a[href]').forEach(n=>n.setAttribute('href',new URL(n.getAttribute('href'),location.href).href));
    const contentExact=nodes.length===12&&nodes.every((n,i)=>n.innerHTML===a.querySelector('.et_pb_text_'+i+' .et_pb_text_inner').innerHTML);
    const photo=main.querySelector('.et_post_meta_wrapper > img'),cta=document.querySelector('#ktk-cta')?.getBoundingClientRect(),collisions=[];
    if(cta)for(const node of nodes){const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const text=walker.currentNode;if(!text.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(text);for(const b of range.getClientRects())if(b.width&&b.height&&b.right>cta.left&&b.left<cta.right&&b.bottom>cta.top&&b.top<cta.bottom)collisions.push({text:text.textContent,bounds:[b.x,b.y,b.width,b.height]});}}
    return {contentExact,review:nodes.length,h1:[...main.querySelectorAll('h1')].map(n=>n.textContent),published:main.querySelector('.published').textContent,author:main.querySelector('.author').textContent,alt:photo.alt,overflow:document.documentElement.scrollWidth>innerWidth+1,collisions,ids:[...main.querySelectorAll('h2[id^="memorial-"]')].map(n=>n.id),oldClaims:/55-60|150-250|15,60|ripped off|disgusting|drink or two|every 10 minutes/i.test(main.innerText)};
   },candidate);
   check(width+' every new text module exact',state.contentExact,state.review);
   check(width+' original H1/byline/publication history',state.h1.length===1&&state.h1[0]==='Everything you need to know about visiting Auschwitz'&&state.published==='Sep 5, 2019'&&state.author==='Jess Campbell');
   check(width+' all11 unique section fragments',state.ids.length===11&&new Set(state.ids).size===11);
   check(width+' no stale unverified price/guarantee copy',!state.oldClaims);
   check(width+' neutral featured photo alt',state.alt==='Person walking beside railway tracks towards a brick gate building under a cloudy sky.');
   check(width+' usable directions instead of blank map',await page.locator('[data-ktk-memorial-directions] a[href="https://www.auschwitz.org/en/visiting/getting-to-the-museum/"]').count()===1&&await page.locator('#main-content .et_pb_map').count()===0);
   check(width+' no horizontal overflow',!state.overflow);
   check(width+' revised text clear of floating CTA',!state.collisions.length,state.collisions);
   const links=page.locator('nav[aria-label="Visitor guide contents"] a');check(width+' six native contents links',await links.count()===6);
   for(let i=0;i<await links.count();i++){
    const link=links.nth(i),href=new URL(await link.getAttribute('href'),page.url()),current=new URL(page.url());
    if(href.origin!==current.origin||href.pathname!==current.pathname||href.search!==current.search||!/^#memorial-[a-z-]+$/.test(href.hash))throw Error('Contents must stay on the exact current document');
    await link.focus();await page.keyboard.press('Enter');await page.waitForFunction(h=>location.hash===h,href.hash);
    await page.waitForFunction(h=>{const b=document.querySelector(h)?.getBoundingClientRect();return !!b&&b.top>=-1&&b.top<innerHeight;},href.hash,{timeout:10000});
    const bounds=await page.locator(href.hash).boundingBox();check(width+' keyboard native fragment '+href.hash,!!bounds&&bounds.y>=-1&&bounds.y<900,bounds);
   }
   if([390,1440].includes(width)){
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,width+'-page.png'),fullPage:true,animations:'disabled'});
    if(width===390){await page.locator('[data-ktk-memorial-directions]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'390-directions-viewport.png'),animations:'disabled'});}
   }
  }finally{await context.close();}
 }
 const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
 try{
  await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());return ['GET','HEAD'].includes(q.method())&&u.origin===new URL(base).origin&&(u.hostname==='127.0.0.1'||u.pathname.startsWith('/staging/'))?r.continue():r.abort();});
  const page=await context.newPage();await page.goto(new URL(route,base).href,{waitUntil:'load',timeout:60000});
  check('no-JS all12 reviewed modules rendered',await page.locator('[data-ktk-memorial-review="2026-11-14"]').count()===12);
  check('no-JS meaningful contents and source links',await page.locator('nav[aria-label="Visitor guide contents"] a').count()===6&&await page.locator('#main-content a[href="https://visit.auschwitz.org/?lang=en"]').count()===1);
  check('no-JS usable official directions',await page.locator('[data-ktk-memorial-directions] a').count()===1);
 }finally{await context.close();}
}catch(error){errors.push({stack:error.stack});}finally{await browser.close();}
check('no browser/harness errors',!errors.length,errors);const report={checkedAt:new Date().toISOString(),base,scope:'Atomic build fixtures and native staging guide/contents, with providers/non-read/commerce blocked. No form, cart, order, quote or conversion submitted; no full accessibility/consent/pixel certificate.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks,errors};
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass),errors},null,2));if(report.passed!==report.total)process.exitCode=1;
