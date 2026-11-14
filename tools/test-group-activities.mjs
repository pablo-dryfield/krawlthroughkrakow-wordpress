import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadGroupActivitiesEditorial,reviseGroupActivitiesEditorial} from './group-activities-editorial.mjs';
const [base,output]=process.argv.slice(2);
if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base)||!output)throw Error('Explicit local/staging base and fresh evidence directory required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier evidence');}catch(e){if(e.code!=='ENOENT')throw e;}await mkdir(output,{recursive:true});
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),rows=await loadGroupActivitiesEditorial(),baseline='b2475ab42a0f1683f07bb7b10626a3f7fb9a68ae',root='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const checks=[],errors=[],writes=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail}),files=[root+'runtime.js',root+'runtime.css','tools/group-activities-editorial.mjs','tools/test-group-activities.mjs','docs/code-pages/full-migration/assets.json'];
const candidates={};for(const r of rows){const file=root+'content/'+r.key+'.html';files.push(file);candidates[r.key]=await readFile(file,'utf8');}
const hashes=async()=>{const out={};for(const file of files)out[file]=createHash('sha256').update(await readFile(file)).digest('hex');return out;},initial=await hashes();
async function readyVisibleImages(page){
 await page.waitForFunction(()=>[...document.images].filter(n=>{const b=n.getBoundingClientRect();return b.width&&b.height&&b.bottom>0&&b.top<innerHeight&&b.right>0&&b.left<innerWidth;}).every(n=>n.complete&&n.naturalWidth>0),null,{timeout:10000});
 await page.evaluate(async()=>{for(const n of document.images){const b=n.getBoundingClientRect();if(b.width&&b.height&&b.bottom>0&&b.top<innerHeight&&b.right>0&&b.left<innerWidth)await n.decode();}});
}
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const fixture=await browser.newPage({javaScriptEnabled:false});await fixture.route('**/*',r=>r.abort());
 for(const r of rows){
  const prepared=execFileSync('git',['show',baseline+':'+root+'content/'+r.key+'.html'],{encoding:'utf8',maxBuffer:10*1024*1024});
  for(const [label,html]of [['raw',r.sourceHtml],['prepared',prepared]]){await fixture.setContent(html);await fixture.evaluate(reviseGroupActivitiesEditorial,{key:r.key,revision:r});check(r.key+' '+label+' complete revision',await fixture.locator('[data-ktk-group-activity-review]').count()===(r.key==='krakow-stag-do'?6:1));const once=await fixture.locator('body').innerHTML();await fixture.evaluate(reviseGroupActivitiesEditorial,{key:r.key,revision:r});check(r.key+' '+label+' idempotent',await fixture.locator('body').innerHTML()===once);}
 }
 const r=rows[0],prepared=execFileSync('git',['show',baseline+':'+root+'content/'+r.key+'.html'],{encoding:'utf8',maxBuffer:10*1024*1024}),last='.et_pb_row_16 .et_pb_text_2 > .et_pb_text_inner';
 const mutations=[
  {name:'late original text drift',dom:s=>document.querySelector(s).append('changed')},
  {name:'late missing target',dom:s=>document.querySelector(s).remove()},
  {name:'late ambiguous target',dom:s=>{const n=document.querySelector(s);n.after(n.cloneNode(true));}},
  {name:'late protected input',dom:s=>document.querySelector(s).append(document.createElement('input'))},
  {name:'late original attribute drift',dom:s=>document.querySelector(s).firstElementChild.title='changed'},
  {name:'stale review marker',dom:s=>document.querySelector(s).dataset.ktkGroupActivityReview='2025-01-01'},
  {name:'missing enquiry',dom:()=>document.querySelector('#stag_trip_form').remove()},
  {name:'duplicate enquiry',dom:()=>{const n=document.querySelector('#stag_trip_form');n.after(n.cloneNode(true));}},
  {name:'script injection',markup:r.markup.replace('<p>','<p><script>alert(1)</script>')},
  {name:'event handler',markup:r.markup.replace('<p>','<p onclick="alert(1)">')},
  {name:'unreviewed external URL',markup:r.markup.replace('https://www.gov.uk/foreign-travel-advice/poland/safety-and-security','https://example.invalid/')},
  {name:'missing last template',markup:r.markup.replace(/<template data-target="\.et_pb_row_16 \.et_pb_text_2 > \.et_pb_text_inner">[\s\S]*?<\/template>/,'')},
  {name:'duplicate target selector',markup:r.markup.replace('.et_pb_row_16 .et_pb_text_2 > .et_pb_text_inner','.et_pb_row_16 .et_pb_text_1 > .et_pb_text_inner')}
 ];
 for(const m of mutations){await fixture.setContent(prepared);if(m.dom)await fixture.evaluate(m.dom,last);const before=await fixture.locator('body').innerHTML();let failed=false;try{await fixture.evaluate(reviseGroupActivitiesEditorial,{key:r.key,revision:{...r,markup:m.markup||r.markup}});}catch{failed=true;}check(m.name+' fails atomically',failed&&await fixture.locator('body').innerHTML()===before);}
 await fixture.close();
 for(const r of rows)for(const width of [320,390,600,768,1024,1440])for(const javaScriptEnabled of [true,false]){
  const label=r.key+' '+width+' '+(javaScriptEnabled?'JS':'no-JS'),context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled,reducedMotion:'reduce',serviceWorkers:'block'});
  try{
   await context.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;});
   await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(!['GET','HEAD'].includes(req.method())){writes.push({method:req.method(),path:u.pathname});return route.abort();}return u.origin===new URL(base).origin&&(u.hostname==='127.0.0.1'||u.pathname.startsWith('/staging/'))?route.continue():route.abort();});
   const page=await context.newPage();page.on('pageerror',e=>errors.push({label,message:e.message}));const u=new URL(r.key+'/',base);if(process.argv.includes('--cache-bust'))u.searchParams.set('ktk_activity_check',Date.now().toString());const response=await page.goto(u.href,{waitUntil:'load',timeout:60000});await page.evaluate(()=>document.fonts.ready);
   const state=await page.evaluate(expected=>{
    const d=new DOMParser().parseFromString(expected,'text/html'),nodes=[...document.querySelectorAll('[data-ktk-group-activity-review]')],old=[...d.querySelectorAll('[data-ktk-group-activity-review]')],clean=n=>n.innerHTML.replaceAll('https://krawlthroughkrakow.com/staging/','__KTK_HOME_URL__');
    return {exact:nodes.length===old.length&&nodes.every((n,i)=>clean(n)===clean(old[i])),overflow:document.documentElement.scrollWidth>innerWidth+1,photos:document.querySelectorAll('#main-content img').length===d.querySelectorAll('#main-content img').length,h1:document.querySelectorAll('#main-content h1').length===1,text:nodes.map(n=>n.textContent).join(' '),links:nodes.flatMap(n=>[...n.querySelectorAll('a')].map(a=>a.href))};
   },candidates[r.key]);
   check(label+' HTTP200 exact reviewed modules',response.status()===200&&state.exact,state);check(label+' original photos and single H1',state.photos&&state.h1);check(label+' no page overflow',!state.overflow);check(label+' individual-quote language and no old numerical package promises',state.text.includes('individual quote')&&!/\b(?:15|30|200)\b|3x8|free beer|guaranteeing|safe venues/.test(state.text));
   const boxes=[];let index=0;for(const module of await page.locator('[data-ktk-group-activity-review]').all()){
    await module.scrollIntoViewIfNeeded();boxes.push(...await module.evaluate(n=>{const hits=[],c=document.querySelector('#ktk-cta')?.getBoundingClientRect(),walker=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);while(walker.nextNode()){if(!walker.currentNode.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(walker.currentNode);for(const b of range.getClientRects())if(b.width&&b.height&&(b.left<0||b.right>innerWidth+1||c&&b.right>c.left&&b.left<c.right))hits.push({text:walker.currentNode.textContent,left:b.left,right:b.right,cta:c?.left});}return hits;}));
    if(width===390&&javaScriptEnabled){await readyVisibleImages(page);await page.screenshot({path:path.join(output,r.key+'-module-'+index+'.png'),animations:'disabled'});}index++;
   }check(label+' every activity text line stays outside the floating CTA column',!boxes.length,boxes);
   if([390,1440].includes(width)){
    const stag=r.key==='krakow-stag-do',fragment=stag?'#stag_trip_form':'#hen_do_form',link=page.locator(stag?'a.et_pb_button_14':'a.et_pb_button_1');await link.focus();await page.keyboard.press('Enter');await page.waitForURL(url=>url.hash===fragment,{timeout:10000});await page.waitForFunction(id=>{const b=document.querySelector(id).getBoundingClientRect();return b.top<innerHeight&&b.bottom>0;},fragment);check(label+' native activity CTA reaches original enquiry form',await page.locator(fragment+' form').count()===1);await page.keyboard.press('Tab');check(label+' keyboard enters original enquiry fields',await page.evaluate(()=>!!document.activeElement?.closest('form')&&document.activeElement.matches('input,textarea,select')));
   }
   if(r.key==='krakow-stag-do'){
    const button=page.locator('a.et_pb_button_16');await button.scrollIntoViewIfNeeded();
    const hit=await button.evaluate(n=>{const b=n.getBoundingClientRect();return [.1,.5,.9].every(f=>{const x=document.elementFromPoint(b.x+b.width/2,b.y+b.height*f);return x===n||n.contains(x);});});
    check(label+' complete go-karting CTA hit area is unobscured',hit);
   }
  }finally{await context.close();}
 }
}catch(e){errors.push({stack:e.stack});}finally{await browser.close();}
check('no browser/harness errors',!errors.length,errors);check('no actual form/commerce/conversion writes',!writes.length,writes);check('source and harness stable throughout',JSON.stringify(await hashes())===JSON.stringify(initial));
const report={checkedAt:new Date().toISOString(),base,scope:'Two pages, seven text modules; raw/prepared/atomic fixtures, six widths with/without JS, all text outside CTA column, native activity-to-enquiry keyboard navigation. Providers/non-read requests blocked; no messages/orders.',sourceHashes:initial,passed:checks.filter(c=>c.pass).length,total:checks.length,checks,errors};await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass),errors},null,2));if(report.passed!==report.total)process.exitCode=1;
