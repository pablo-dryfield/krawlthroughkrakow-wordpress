import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadGroupPlanningEditorial,reviseGroupPlanningEditorial} from './group-planning-editorial.mjs';
const [base,output]=process.argv.slice(2);if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base)||!output)throw Error('Explicit local/staging base and fresh directory required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier evidence');}catch(e){if(e.code!=='ENOENT')throw e;}await mkdir(output,{recursive:true});
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root='staging/wp-content/mu-plugins/ktk-code-pages-assets/',baseline='7faee9623b9171ec5944a3d3f84638c216803409',rows=await loadGroupPlanningEditorial(),candidates={};
const files=[root+'runtime.css',root+'runtime.js','tools/group-planning-editorial.mjs','tools/test-group-planning.mjs','docs/code-pages/full-migration/assets.json'];
for(const r of rows){const file=root+'content/'+r.key+'.html';files.push(file,'tools/content/group-planning-'+({'krakow-stag-do':'stag','krakow-hen-do':'hen','student-trips-poland':'student'}[r.key])+'.html');candidates[r.key]=await readFile(file,'utf8');}
const hashes=async()=>{const result={};for(const file of files)result[file]=createHash('sha256').update(await readFile(file)).digest('hex');return result;},initial=await hashes(),checks=[],errors=[],writes=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const fixture=await browser.newPage({javaScriptEnabled:false});await fixture.route('**/*',r=>r.abort());
 for(const r of rows){
  const before=execFileSync('git',['show',baseline+':'+root+'content/'+r.key+'.html'],{encoding:'utf8',maxBuffer:10*1024*1024});
  for(const [label,html]of [['raw',r.sourceHtml],['prepared',before]]){await fixture.setContent(html);await fixture.evaluate(reviseGroupPlanningEditorial,{key:r.key,revision:r});check(r.key+' '+label+' complete revision',await fixture.locator('[data-ktk-group-planning-review]').count()===(r.key==='student-trips-poland'?9:1));const once=await fixture.locator('body').innerHTML();await fixture.evaluate(reviseGroupPlanningEditorial,{key:r.key,revision:r});check(r.key+' '+label+' idempotence',await fixture.locator('body').innerHTML()===once);}
 }
 const student=rows[2],prepared=execFileSync('git',['show',baseline+':'+root+'content/'+student.key+'.html'],{encoding:'utf8',maxBuffer:10*1024*1024});
 const mutations=[
  {name:'late original text drift',dom:()=>document.querySelector('.et_pb_blurb_3 .et_pb_blurb_description').append('changed')},
  {name:'late target missing',dom:()=>document.querySelector('.et_pb_blurb_3 .et_pb_blurb_description').remove()},
  {name:'late duplicate target',dom:()=>{const n=document.querySelector('.et_pb_blurb_3 .et_pb_blurb_description');n.after(n.cloneNode(true));}},
  {name:'late original style drift',dom:()=>document.querySelector('.et_pb_blurb_3 .et_pb_blurb_description p').style.color='red'},
  {name:'late protected input',dom:()=>document.querySelector('.et_pb_blurb_3 .et_pb_blurb_description').append(document.createElement('input'))},
  {name:'stale marker',dom:()=>document.querySelector('.et_pb_blurb_3 .et_pb_blurb_description').dataset.ktkGroupPlanningReview='2025-01-01'},
  {name:'enquiry target missing',dom:()=>document.querySelector('#et_pb_contact_form_0').remove()},
  {name:'enquiry target duplicated',dom:()=>{const n=document.querySelector('#et_pb_contact_form_0');n.after(n.cloneNode(true));}},
  {name:'script injection',markup:student.markup.replace('<p>','<p><script>alert(1)</script>')},
  {name:'event-handler injection',markup:student.markup.replace('<p>','<p onclick="alert(1)">')},
  {name:'foreign URL',markup:student.markup.replace('__KTK_HOME_URL__other-tours/','https://example.invalid/')},
  {name:'wrong enquiry fragment',markup:student.markup.replace('#et_pb_contact_form_0','#other')},
  {name:'missing final template',markup:student.markup.replace(/<template data-target="\.et_pb_blurb_3 \.et_pb_blurb_description">[\s\S]*?<\/template>/,'')},
  {name:'duplicate template selector',markup:student.markup.replace('.et_pb_blurb_3 .et_pb_blurb_description','.et_pb_blurb_2 .et_pb_blurb_description')},
  {name:'HTML in compact heading',markup:student.markup.replace('CHOOSE YOUR EVENING','<strong>CHOOSE YOUR EVENING</strong>')}
 ];
 for(const m of mutations){await fixture.setContent(prepared);if(m.dom)await fixture.evaluate(m.dom);const before=await fixture.locator('body').innerHTML();let failed=false;try{await fixture.evaluate(reviseGroupPlanningEditorial,{key:student.key,revision:{...student,markup:m.markup||student.markup}});}catch{failed=true;}check(m.name+' rejected atomically',failed&&await fixture.locator('body').innerHTML()===before);}
 await fixture.close();
 for(const r of rows)for(const width of [320,390,600,768,1024,1440])for(const javaScriptEnabled of [true,false]){
  const label=r.key+' '+width+' '+(javaScriptEnabled?'JS':'no-JS'),context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled,reducedMotion:'reduce',serviceWorkers:'block'});try{
   await context.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;});await context.route('**/*',route=>{const request=route.request(),u=new URL(request.url());if(!['GET','HEAD'].includes(request.method())){writes.push({method:request.method(),path:u.pathname});return route.abort();}return u.origin===new URL(base).origin&&(u.hostname==='127.0.0.1'||u.pathname.startsWith('/staging/'))?route.continue():route.abort();});
   const page=await context.newPage();page.on('pageerror',e=>errors.push({label,message:e.message}));const u=new URL(r.key+'/',base);if(process.argv.includes('--cache-bust'))u.searchParams.set('ktk_group_check',Date.now().toString());const response=await page.goto(u.href,{waitUntil:'load',timeout:60000});await page.evaluate(()=>document.fonts.ready);
   const state=await page.evaluate(({expected,javaScriptEnabled})=>{
    const a=new DOMParser().parseFromString(expected,'text/html');a.querySelectorAll('[data-ktk-group-planning-review] a[href]').forEach(n=>{const href=n.getAttribute('href').replace('__KTK_HOME_URL__','https://krawlthroughkrakow.com/staging/');n.setAttribute('href',javaScriptEnabled?new URL(href,location.href).href:href);});
    const expectedNodes=[...a.querySelectorAll('[data-ktk-group-planning-review]')],nodes=[...document.querySelectorAll('[data-ktk-group-planning-review]')],text=nodes.map(n=>n.textContent).join(' '),fields=d=>[...d.querySelectorAll('#main-content form :is(input,textarea,select)')].filter(n=>n.name!=='_ktk_website').map(n=>[n.tagName,n.type,n.name,n.required]),honey=[...document.querySelectorAll('#main-content form input[name="_ktk_website"]')];
    return {exact:nodes.length===expectedNodes.length&&nodes.every((n,i)=>n.innerHTML===expectedNodes[i].innerHTML),h1:[...document.querySelectorAll('#main-content h1')].map(n=>n.textContent),originalH1:[...a.querySelectorAll('#main-content h1')].map(n=>n.textContent),fields:JSON.stringify(fields(document))===JSON.stringify(fields(a))&&honey.length===(javaScriptEnabled?1:0)&&honey.every(n=>n.type==='text'&&n.tabIndex===-1&&n.getAttribute('aria-hidden')==='true'&&n.autocomplete==='off'),text,links:nodes.flatMap(n=>[...n.querySelectorAll('a')].map(a=>a.getAttribute('href'))),overflow:document.documentElement.scrollWidth>innerWidth+1,images:[...document.querySelectorAll('#main-content img')].length,expectedImages:a.querySelectorAll('#main-content img').length};
   },{expected:candidates[r.key],javaScriptEnabled});
   check(label+' HTTP200 and exact reviewed modules',response.status()===200&&state.exact);check(label+' original single primary heading',state.h1.length===1&&JSON.stringify(state.h1)===JSON.stringify(state.originalH1));check(label+' existing form field contracts and photos',state.fields&&state.images===state.expectedImages);
   check(label+' shared confirmed facts and no fabricated package numbers',state.text.includes('9 PM')&&state.text.includes('18')&&state.text.includes('valid ID')&&!/24\/7|lowest price|11.000|\d+%|minimum of \d|PLN/.test(state.text));
   check(label+' useful native links, no legacy store or hardcoded tracking',state.links.includes('https://krawlthroughkrakow.com/staging/about-us/how-to-join/')&&state.links.every(l=>!/[?&](?:utm_|gclid|gbraid|wbraid)|studtrips|fareharbor|\/store/.test(l)));
   check(label+' no horizontal overflow',!state.overflow);
   const intro=page.locator(r.key==='student-trips-poland'?'.et_pb_text_2 [data-ktk-group-planning-review]':'.et_pb_text_0 [data-ktk-group-planning-review]');
   const collisions=[];for(const paragraph of await intro.locator('p,h2,li').all()){
    await paragraph.scrollIntoViewIfNeeded();collisions.push(...await paragraph.evaluate(root=>{const c=document.querySelector('#ktk-cta')?.getBoundingClientRect(),hits=[];if(!c)return hits;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(w.nextNode()){if(!w.currentNode.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(w.currentNode);for(const b of r.getClientRects())if(b.width&&b.height&&b.right>c.left&&b.left<c.right&&b.bottom>c.top&&b.top<c.bottom)hits.push(w.currentNode.textContent);}return hits;}));
   }check(label+' all planning lines clear of floating CTA',!collisions.length,collisions);
   if([390,1440].includes(width)){await intro.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,label.replaceAll(' ','-')+'.png'),fullPage:true,animations:'disabled'});}
   if([390,1440].includes(width)){
    const fragment=r.key==='student-trips-poland'?'#et_pb_contact_form_0':r.key==='krakow-stag-do'?'#stag_trip_form':'#hen_do_form',link=intro.locator('a[href$="'+fragment+'"]');await link.focus();await page.keyboard.press('Enter');await page.waitForURL(url=>url.hash===fragment,{timeout:10000});await page.waitForFunction(id=>{const b=document.querySelector(id).getBoundingClientRect();return b.top<innerHeight&&b.bottom>0;},fragment);
    check(label+' native Enter reaches original enquiry form',await page.locator(fragment+' form').count()===1);
    await page.keyboard.press('Tab');check(label+' keyboard proceeds into enquiry fields',await page.evaluate(()=>{const n=document.activeElement;return n?.matches('input,textarea,select')&&!!n.closest('form');}));
    const joining=intro.locator('a[href$="about-us/how-to-join/"]');let navigation=false;await context.route('https://krawlthroughkrakow.com/staging/about-us/how-to-join/',route=>{navigation=true;return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Intercepted navigation</title><p>Destination intercepted without a real booking.</p>'});});await joining.focus();await page.keyboard.press('Enter');await page.waitForURL('https://krawlthroughkrakow.com/staging/about-us/how-to-join/');check(label+' native joining link has exact staged destination',navigation);
   }
  }finally{await context.close();}
 }
}catch(error){errors.push({stack:error.stack});}finally{await browser.close();}
check('no browser or harness errors',!errors.length,errors);check('source and harness stable throughout',JSON.stringify(await hashes())===JSON.stringify(initial));check('no actual form/commerce/conversion writes',!writes.length,writes);
const report={checkedAt:new Date().toISOString(),base,baseline,scope:'Three planning pages, raw/prepared/idempotent and atomic fixtures, six widths with/without JS, native enquiry/next-field and joining navigation. External providers/non-read requests blocked; joining destination intercepted, no messages or bookings.',sourceHashes:initial,passed:checks.filter(c=>c.pass).length,total:checks.length,checks,errors};await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass),errors},null,2));if(report.passed!==report.total)process.exitCode=1;
