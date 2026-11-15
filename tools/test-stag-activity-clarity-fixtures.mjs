import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadStagActivityClarity,reviseStagActivityClarity} from './stag-activity-clarity.mjs';
const [baseline,output]=process.argv.slice(2);
if(!/^[a-f0-9]{40}$/.test(baseline||'')||!output)throw Error('Exact baseline and fresh evidence required');
try{await readFile(output);throw Error('Preserve earlier evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const revision=await loadStagActivityClarity(),prepared=execFileSync('git',['show',baseline+':staging/wp-content/mu-plugins/ktk-code-pages-assets/content/krakow-stag-do.html'],{encoding:'utf8',maxBuffer:10*1024*1024}),checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await browser.newPage({javaScriptEnabled:false});await p.route('**/*',r=>r.abort());
 for(const [label,html]of [['raw',revision.sourceHtml],['prepared',prepared]]){
  await p.setContent(html);const before=await p.evaluate(markup=>{
   const parts=[...new DOMParser().parseFromString(markup,'text/html').querySelectorAll('template')],selectors=['#main-content img,#main-content svg,#main-content iframe,#main-content video','form','a[href]','button','[data-ktk-group-planning-review],[data-ktk-group-activity-review]'];
   return {documentHtml:document.documentElement.outerHTML,airsoftOuter:document.querySelector('#main-content .et_pb_row_17 .et_pb_text_17 > .et_pb_text_inner').outerHTML,serialized:Object.fromEntries(selectors.map(s=>[s,[...document.querySelectorAll(s)].map(n=>n.outerHTML)])),ids:[...document.querySelectorAll('[id]')].map(n=>n.id),tags:[...document.querySelectorAll('h1,h2')].map(n=>n.tagName),interiors:Object.fromEntries(parts.map(t=>[t.dataset.target,document.querySelector('#main-content '+t.dataset.target).innerHTML])),headlines:[3,5].map(i=>({selector:'.et_pb_row_'+i+' :is(h1,h2)',html:document.querySelector('#main-content .et_pb_row_'+i+' :is(h1,h2)').innerHTML}))};
  },revision.markup);const revisions=await p.evaluate(reviseStagActivityClarity,{key:revision.key,revision});
  check(label+' complete sixteen-part result',revisions.length===16);check(label+' thirteen marked interiors',await p.locator('[data-ktk-stag-activity-review]').count()===13);check(label+' two marked native headlines',await p.locator('[data-ktk-stag-activity-headline]').count()===2);
  check(label+' exact misplaced shooting tail cleared',await p.locator('[data-ktk-stag-tail-cleared="2026-11-15"]').evaluate(n=>[...n.children].every(c=>c.tagName!=='P')&&!n.textContent.includes('M4, MP5')));
  const once=await p.locator('body').innerHTML();await p.evaluate(reviseStagActivityClarity,{key:revision.key,revision});check(label+' exact idempotence',await p.locator('body').innerHTML()===once);
  const facts=await p.evaluate(({before,markup})=>{
   const parts=[...new DOMParser().parseFromString(markup,'text/html').querySelectorAll('template')],same=sel=>JSON.stringify(before.serialized[sel])===JSON.stringify([...document.querySelectorAll(sel)].map(n=>n.outerHTML));
   const protectedExact=same('#main-content img,#main-content svg,#main-content iframe,#main-content video')&&same('form')&&same('a[href]')&&same('button')&&same('[data-ktk-group-planning-review],[data-ktk-group-activity-review]');
   const idsExact=JSON.stringify(before.ids)===JSON.stringify([...document.querySelectorAll('[id]')].map(n=>n.id));
   const tagsExact=JSON.stringify(before.tags)===JSON.stringify([...document.querySelectorAll('h1,h2')].map(n=>n.tagName));
   const exactCopy=parts.every(t=>{const n=document.querySelector('#main-content '+t.dataset.target);return n.innerHTML===t.innerHTML.trim()&&n.dataset.ktkStagActivityReview==='2026-11-15';});
   for(const t of parts){const n=document.querySelector('#main-content '+t.dataset.target);n.innerHTML=before.interiors[t.dataset.target];n.removeAttribute('data-ktk-stag-activity-review');}
   for(const h of before.headlines){const n=document.querySelector('#main-content '+h.selector);n.innerHTML=h.html;n.removeAttribute('data-ktk-stag-activity-headline');}
   document.querySelector('#main-content .et_pb_row_17 .et_pb_text_17 > .et_pb_text_inner').outerHTML=before.airsoftOuter;
   return {protectedExact,idsExact,tagsExact,exactCopy,outsideExact:document.documentElement.outerHTML===before.documentHtml};
  },{before,markup:revision.markup});
  for(const [name,pass]of Object.entries(facts))check(label+' '+name,pass,facts);
 }
 const last='.et_pb_row_17 .et_pb_text_1 > .et_pb_text_inner',lastHead='.et_pb_row_5 h2',mutations=[
  {name:'last copy drift',dom:s=>document.querySelector(s).append(' changed')},
  {name:'last missing target',dom:s=>document.querySelector(s).remove()},
  {name:'last duplicate target',dom:s=>{const n=document.querySelector(s);n.after(n.cloneNode(true));}},
  {name:'last protected input',dom:s=>document.querySelector(s).append(document.createElement('input'))},
  {name:'last unreviewed attributes',dom:s=>document.querySelector(s).setAttribute('title','changed')},
  {name:'last stale review marker',dom:s=>document.querySelector(s).dataset.ktkStagActivityReview='2025-01-01'},
  {name:'last headline drift',dom:s=>document.querySelector(s).textContent='Changed headline',selector:lastHead},
  {name:'last headline attribute drift',dom:s=>document.querySelector(s).setAttribute('title','changed'),selector:lastHead},
  {name:'last headline nested link',dom:s=>document.querySelector(s).append(document.createElement('a')),selector:lastHead},
  {name:'missing enquiry',dom:()=>document.querySelector('#stag_trip_form').remove()},
  {name:'duplicate enquiry',dom:()=>{const n=document.querySelector('#stag_trip_form');n.after(n.cloneNode(true));}},
  {name:'late shooting tail text drift',dom:()=>document.querySelector('.et_pb_row_17 .et_pb_text_17 > .et_pb_text_inner > p:last-child').append(' changed')},
  {name:'late shooting tail missing paragraph',dom:()=>document.querySelector('.et_pb_row_17 .et_pb_text_17 > .et_pb_text_inner > p:last-child').remove()},
  {name:'late shooting tail extra paragraph',dom:()=>document.querySelector('.et_pb_row_17 .et_pb_text_17 > .et_pb_text_inner').append(document.createElement('p'))},
  {name:'late shooting tail stale marker',dom:()=>document.querySelector('.et_pb_row_17 .et_pb_text_17 > .et_pb_text_inner').dataset.ktkStagTailCleared='2025-01-01'},
  {name:'reviewed tail attribute drift',applied:true,dom:()=>document.querySelector('[data-ktk-stag-tail-cleared]').setAttribute('title','changed')},
  {name:'reviewed tail stale marker',applied:true,dom:()=>document.querySelector('[data-ktk-stag-tail-cleared]').dataset.ktkStagTailCleared='2025-01-01'},
  {name:'script injection',markup:revision.markup.replace('<p>','<p><script>alert(1)</script>')},
  {name:'event handler',markup:revision.markup.replace('<p>','<p onclick="alert(1)">')},
  {name:'unreviewed anchor',markup:revision.markup.replace('<p>','<p><a href="https://example.invalid/">link</a>')},
  {name:'blank last copy',markup:revision.markup.replace(/(<template data-target="\.et_pb_row_17[^"]+">)[\s\S]*?(<\/template>)/,'$1$2')},
  {name:'missing last template',markup:revision.markup.replace(/<template data-target="\.et_pb_row_17[^"]+">[\s\S]*?<\/template>/,'')},
  {name:'duplicate first template',markup:revision.markup+revision.markup.match(/<template[\s\S]*?<\/template>/)[0]},
  {name:'unknown target',markup:revision.markup.replace('.et_pb_row_17 .et_pb_text_1','.et_pb_row_16 .et_pb_text_1')}
 ];
 for(const m of mutations){
  await p.setContent(prepared);if(m.applied)await p.evaluate(reviseStagActivityClarity,{key:revision.key,revision});if(m.dom)await p.evaluate(m.dom,m.selector||last);const before=await p.locator('body').innerHTML();let refused=false,error;
  try{await p.evaluate(reviseStagActivityClarity,{key:revision.key,revision:{...revision,markup:m.markup??revision.markup}});}catch(e){refused=true;error=e.message;}
  check(m.name+' refused',refused,error);check(m.name+' leaves whole DOM exact',before===await p.locator('body').innerHTML());
 }
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),scope:'Offline real-DOM raw/prepared exact inverse, idempotence and atomic negative fixtures; scripts disabled/all network blocked. Not generated application or staging delivery proof.',baseline,passed:checks.filter(c=>c.pass).length,total:checks.length,checks};await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
