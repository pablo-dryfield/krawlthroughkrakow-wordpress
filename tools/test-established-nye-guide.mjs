import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadEstablishedNyeEditorial,reviseEstablishedNyeEditorial} from './established-nye-editorial.mjs';
const [base,output]=process.argv.slice(2);if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base)||!output)throw Error('Explicit local/staging base and fresh directory required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}await mkdir(output,{recursive:true});
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const revision=await loadEstablishedNyeEditorial(),root='staging/wp-content/mu-plugins/ktk-code-pages-assets/',file=root+'content/'+revision.key+'.html',baseline='5483f5921a95bcd8dbe8973fb499f0566e6a7f8e',before=execFileSync('git',['show',baseline+':'+file],{encoding:'utf8',maxBuffer:10*1024*1024}),candidate=await readFile(file,'utf8'),rendererHome='https://krawlthroughkrakow.com/staging/';
const paths=[file,root+'runtime.css',root+'runtime.js','tools/established-nye-editorial.mjs','tools/content/established-nye-guide.html','tools/test-established-nye-guide.mjs','docs/code-pages/full-migration/assets.json'],hashes=async()=>{const h={};for(const p of paths)h[p]=createHash('sha256').update(await readFile(p)).digest('hex');return h;},initial=await hashes();
const checks=[],errors=[],writes=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail}),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const fixture=await browser.newPage({javaScriptEnabled:false});await fixture.route('**/*',r=>r.abort());
 for(const [label,html]of [['raw',revision.sourceHtml],['prepared',before]]){
  await fixture.setContent(html);await fixture.evaluate(reviseEstablishedNyeEditorial,{key:revision.key,revision});check(label+' recipe applies all five targets',await fixture.locator('[data-ktk-established-nye-review]').count()===5);
  const once=await fixture.locator('body').innerHTML();await fixture.evaluate(reviseEstablishedNyeEditorial,{key:revision.key,revision});check(label+' recipe is idempotent',await fixture.locator('body').innerHTML()===once);
 }
 const mutations=[
  {name:'late text drift',dom:()=>document.querySelector('.et_pb_text_4 .et_pb_text_inner').append('unreviewed')},
  {name:'late target absent',dom:()=>document.querySelector('.et_pb_text_4 .et_pb_text_inner').remove()},
  {name:'late target duplicate',dom:()=>{const n=document.querySelector('.et_pb_text_4 .et_pb_text_inner');n.after(n.cloneNode(true));}},
  {name:'late heading text changed',dom:()=>document.querySelector('.et_pb_text_4 h5').append('unreviewed')},
  {name:'late heading style changed',dom:()=>document.querySelector('.et_pb_text_4 h5').style.color='red'},
  {name:'late protected control',dom:()=>document.querySelector('.et_pb_text_4 .et_pb_text_inner').append(document.createElement('form'))},
  {name:'stale review marker',dom:()=>document.querySelector('.et_pb_text_4 .et_pb_text_inner').dataset.ktkEstablishedNyeReview='2025-01-01'},
  {name:'injected script',markup:revision.markup.replace('<p>','<p><script>alert(1)</script>')},
  {name:'unreviewed external URL',markup:revision.markup.replace('https://kiermasze.com.pl/','https://example.invalid/')},
  {name:'injected attribute',markup:revision.markup.replace('<p>','<p onclick="alert(1)">')},
  {name:'missing template',markup:revision.markup.replace(/<template data-target="4">[\s\S]*?<\/template>/,'')},
  {name:'duplicate target',markup:revision.markup.replace('data-target="4"','data-target="3"')},
  {name:'template heading changed',markup:revision.markup.replace('Snow, skis and winter sports','Unreviewed new topic')}
 ];
 for(const m of mutations){await fixture.setContent(before);if(m.dom)await fixture.evaluate(m.dom);const snapshot=await fixture.locator('body').innerHTML();let rejected=false;
  try{await fixture.evaluate(reviseEstablishedNyeEditorial,{key:revision.key,revision:{...revision,markup:m.markup||revision.markup}});}catch{rejected=true;}
  check(m.name+' fails atomically',rejected&&await fixture.locator('body').innerHTML()===snapshot);
 }
 await fixture.close();
 for(const width of [320,390,600,768,1024,1440])for(const javaScriptEnabled of [true,false]){
  const label=width+' '+(javaScriptEnabled?'JS':'no-JS'),context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled,reducedMotion:'reduce',serviceWorkers:'block'});
  try{
   await context.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;});await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());if(!['GET','HEAD'].includes(q.method())){writes.push({method:q.method(),path:u.pathname});return r.abort();}return u.origin===new URL(base).origin&&(u.hostname==='127.0.0.1'||u.pathname.startsWith('/staging/'))?r.continue():r.abort();});
   const page=await context.newPage();page.on('pageerror',e=>errors.push({label,message:e.message}));const url=new URL('krakow-new-years-eve/',base);if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_established_nye_check',Date.now().toString());const response=await page.goto(url.href,{waitUntil:'load',timeout:60000});await page.evaluate(()=>document.fonts.ready);
   const state=await page.evaluate(({expected,rendererHome})=>{
    const a=new DOMParser().parseFromString(expected,'text/html');a.querySelectorAll('[data-ktk-established-nye-review] a[href]').forEach(n=>n.setAttribute('href',new URL(n.getAttribute('href').replace('__KTK_HOME_URL__',rendererHome),location.href).href));
    const nodes=[...document.querySelectorAll('[data-ktk-established-nye-review]')],text=nodes.map(n=>n.textContent).join(' ');return {modulesExact:nodes.length===5&&nodes.every((n,i)=>n.innerHTML===a.querySelector('.et_pb_text_'+i+' .et_pb_text_inner').innerHTML),h1:[...document.querySelectorAll('#main-content h1')].map(n=>n.textContent),text,photos:document.querySelectorAll('#main-content img').length,links:[...document.querySelectorAll('[data-ktk-established-nye-review] a')].map(n=>n.href),overflow:document.documentElement.scrollWidth>innerWidth+1};
   },{expected:candidate,rendererHome});
   check(label+' HTTP200 and all five exact reviewed modules',response.status()===200&&state.modulesExact);
   check(label+' original one H1 retained',state.h1.length===1&&state.h1[0]==='Beers, endless bars, markets and more:');
   check(label+' all three original photos and no provider embeds',state.photos===3&&await page.locator('#main-content iframe').count()===0);
   check(label+' no old guarantees, stereotypes, prices or tracked provider links',!/unlimited drinking hours|a relic of the USSR|17 kilometres|less than two hours|£15|pro drunk/.test(state.text)&&state.links.every(l=>!/[?&](utm_|gclid|gbraid|wbraid)|tastevodka\.pl|livekrakow\.com/.test(l)));
   check(label+' NYE information path, not a new checkout or future campaign',state.links.includes(new URL('new-years-eve/',rendererHome).href)&&state.links.every(l=>!l.includes('/store2/'))&&!/2027/.test(state.text));
   check(label+' exact reviewed resort caution and distinction of offers',state.text.includes('Check current lift-pass prices')&&state.text.includes('regular nightly pub crawl')&&state.text.includes('different offers'));
   check(label+' no horizontal overflow',!state.overflow);
   for(let i=0;i<5;i++){
    await page.locator('.et_pb_text_'+i+' [data-ktk-established-nye-review]').scrollIntoViewIfNeeded();const collisions=await page.evaluate(index=>{
     const root=document.querySelector('.et_pb_text_'+index+' [data-ktk-established-nye-review]'),c=document.querySelector('#ktk-cta')?.getBoundingClientRect(),hits=[];if(!c)return hits;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(w.nextNode()){const n=w.currentNode;if(!n.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(n);for(const b of r.getClientRects())if(b.width&&b.height&&b.right>c.left&&b.left<c.right&&b.bottom>c.top&&b.top<c.bottom)hits.push(n.textContent);}return hits;
    },i);check(label+' section'+i+' clear of floating CTA',!collisions.length,collisions);
   }
   if([390,1440].includes(width)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,label.replace(' ','-')+'.png'),fullPage:true,animations:'disabled'});}
   if([320,390,1440].includes(width))for(let i=1;i<5;i++){
    const heading=page.locator('.et_pb_text_'+i+' [data-ktk-established-nye-review] :is(h1,h2,h3,h4,h5,h6)'),sha=bytes=>createHash('sha256').update(bytes).digest('hex'),geometry=()=>heading.evaluate(n=>{const b=n.getBoundingClientRect(),s=getComputedStyle(n);return {size:[b.width,b.height],style:[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.color,s.padding,s.margin]};});
    const state=await geometry(),current=await heading.screenshot({path:path.join(output,label.replace(' ','-')+'-h'+i+'-new.png'),animations:'disabled'});
    await heading.evaluate(n=>{const original=document.createElement(n.getAttribute('data-ktk-heading-origin')||n.tagName);for(const a of n.attributes)if(a.name!=='data-ktk-heading-origin')original.setAttribute(a.name,a.value);original.append(...n.childNodes);n.replaceWith(original);});
    const original=await heading.screenshot({path:path.join(output,label.replace(' ','-')+'-h'+i+'-original.png'),animations:'disabled'});
    check(label+' section'+i+' exact original heading metrics/style',JSON.stringify(await geometry())===JSON.stringify(state));check(label+' section'+i+' strict original heading pixels',sha(current)===sha(original));
   }
  }finally{await context.close();}
 }
}catch(error){errors.push({stack:error.stack});}finally{await browser.close();}
check('no browser/harness errors',!errors.length,errors);check('source and harness stable throughout',JSON.stringify(await hashes())===JSON.stringify(initial));check('no form/commerce/conversion writes',writes.length===0,writes);
const report={checkedAt:new Date().toISOString(),base,baseline,sourceHashes:initial,scope:'Atomic source fixtures and six-width JS/no-JS staging guide; all provider/non-read requests blocked. No current event/availability claim or real enquiry, cart, booking, payment, account or consent change.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks,errors};await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass),errors},null,2));if(report.passed!==report.total)process.exitCode=1;
