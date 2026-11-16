import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import path from 'node:path';
import {venuePhonePageKeys,venuePhoneScope,venuePhoneSelector} from './venue-phone-text-styles.mjs';

const [base,folder]=process.argv.slice(2);
if(!['http://127.0.0.1:5189/','https://krawlthroughkrakow.com/staging/'].includes(base)||!folder||!path.resolve(folder).startsWith(path.resolve('docs/seo')+path.sep))throw Error('Exact local/staging base and fresh SEO evidence directory required');
try{await access(folder);throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(folder,{recursive:true});
const assets='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const registry=JSON.parse((await readFile(assets+'registry.php','utf8')).match(/return json_decode\('(.*)', true\);/s)[1]);
const inputs=['runtime.css','runtime.js','registry.php',...venuePhonePageKeys.flatMap(key=>['content/'+key+'.html','pages/'+key+'.php'])];
for(const key of venuePhonePageKeys){const wrapper=await readFile(assets+'pages/'+key+'.php','utf8');for(const field of ['css','shell_file']){const match=wrapper.match(new RegExp('"'+field+'":"([^"\\r\\n]+)"'));if(!match||! /^(styles|shells)\/[a-f0-9]+\.(css|html)$/.test(match[1]))throw Error('Exact generated style/shell reference required');inputs.push(match[1]);}}
const files=[...new Set(inputs)].map(f=>assets+f).concat(['tools/venue-phone-text-styles.mjs','tools/test-venue-phone-text-browser.mjs','tools/preview-code-pages.php']);
async function hashes(){const values={};for(const file of files)values[file]=createHash('sha256').update(await readFile(file)).digest('hex');return values;}
const initial=await hashes(),require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const axe=await readFile('staging/wp-content/plugins/ktk-storefront/frontend/node_modules/axe-core/axe.min.js','utf8');
const expectedParagraphs=[13,16,13,16,18,12],expectedTopics=[4,5,6,5,5,4],expectedImages=[1,1,1,1,2,1];
const report={startedAt:new Date().toISOString(),base,scope:'Actual generated venue stylesheet;54 responsive JS/no-JS normal/reduced views. The phone type media rule and all-width native heading clearance independently removed/restored; text/heading identities/images/outside type and wider typography/layout at rest compared. Exact native topics with heading/glyph viewport arrival, phone heading hierarchy, glyph/table/tab observations and automated axe checks. No native zoom/AT/device/field-CWV or complete accessibility claim. External/non-read requests blocked; no commerce/form/consent selection.',sourceHashes:initial,checks:[],views:[],captures:[],accessibility:[],errors:[],writes:[],externalBlocked:0};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
async function settle(page,js){
 const images=page.locator('#main-content img');
 for(let i=0;i<await images.count();i++){
  const image=images.nth(i);await image.evaluate(n=>n.scrollIntoView({block:'center'}));
  const deadline=Date.now()+15000;
  while(!await image.evaluate(n=>n.complete&&n.naturalWidth>0)){if(Date.now()>deadline)throw Error('Original image load deadline');await page.waitForTimeout(50);}
  await image.evaluate(n=>n.decode());
 }
 await page.evaluate(()=>{for(const animation of document.getAnimations())if(Number.isFinite(animation.effect?.getComputedTiming().endTime))try{animation.finish();}catch{}scrollTo(0,0);});
 if(js)await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));else await page.waitForTimeout(50);
 return images.evaluateAll(ns=>ns.map(n=>({src:n.getAttribute('src'),currentSrc:n.currentSrc,complete:n.complete,naturalWidth:n.naturalWidth,naturalHeight:n.naturalHeight,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
}
async function glyphs(locator){
 await locator.evaluate(n=>n.scrollIntoView({block:'center'}));
 return locator.evaluate(n=>{
  const b=n.getBoundingClientRect(),tab=document.querySelector('#ktk-cta'),t=tab?.getBoundingClientRect(),walker=document.createTreeWalker(n,NodeFilter.SHOW_TEXT),range=document.createRange(),rects=[],type=[];
  while(walker.nextNode()){
   const node=walker.currentNode;if(!node.textContent.trim())continue;const s=getComputedStyle(node.parentElement);type.push({fontSize:parseFloat(s.fontSize),lineHeight:parseFloat(s.lineHeight),fontFamily:s.fontFamily});range.selectNodeContents(node);
   for(const g of range.getClientRects())if(g.width&&g.height)rects.push({left:g.left,right:g.right,top:g.top,bottom:g.bottom});
  }
  return{tag:n.tagName,text:n.textContent.trim(),box:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},type,glyphs:rects.length,outside:rects.filter(g=>g.left<b.left-1||g.right>b.right+1||g.top<b.top-1||g.bottom>b.bottom+1).length,tabIntersections:t?rects.filter(g=>Math.min(g.right,t.right)>Math.max(g.left,t.left)&&Math.min(g.bottom,t.bottom)>Math.max(g.top,t.top)).length:0};
 });
}
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [index,key]of venuePhonePageKeys.entries())for(const [motion,widths,js]of [['reduce',[320,390,600,601,768,1440],true],['reduce',[390],false],['no-preference',[390,1440],true]])for(const width of widths){
  const name=key+' '+width+' '+(js?'JS':'no-JS')+' '+motion,context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js,reducedMotion:motion,serviceWorkers:'block'});
  context.setDefaultTimeout(20000);context.setDefaultNavigationTimeout(60000);const viewDeadline=setTimeout(()=>context.close().catch(()=>{}),90000);
  try{
   await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());if(!['GET','HEAD'].includes(q.method())){report.writes.push({name,method:q.method(),path:u.pathname});return r.abort();}if(u.origin!==new URL(base).origin||base.startsWith('https:')&&!u.pathname.startsWith('/staging/')||/\/(?:store2?|wp-admin|wp-json|wp-login\.php|collect|checkout|orders|carts)(?:\/|$)/.test(u.pathname)){report.externalBlocked++;return r.abort();}return r.continue();});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push({name,message:e.message}));
   const route=Object.entries(registry.routes).find(([,v])=>v.key===key)?.[0];if(!route)throw Error('Exact registered guide required');
   const response=await page.goto(new URL(route.slice(1),base).href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
   const root=page.locator('[data-ktk-venue-review="2026-11-13.venues-1"]');check(name+' direct page/exact original marker',response.status()===200&&await root.count()===1);if(await root.count()!==1)throw Error('Exact review marker required');
   const ready=await settle(page,js);check(name+' every original main image decoded/nonzero',ready.length>=expectedImages[index]&&ready.every(n=>n.complete&&n.naturalWidth>0&&n.width>0&&n.height>0),ready);
   const inverse=await page.evaluate(({keys,selector})=>{
    const sheet=[...document.styleSheets].find(s=>s.href?.includes('/runtime.css'));if(!sheet)throw Error('Actual runtime stylesheet required');
    const matches=[...sheet.cssRules].map((r,i)=>({r,i,text:r.cssText})).filter(({r})=>keys.every(k=>r.cssText.includes('[data-ktk-page="'+k+'"]'))&&r.cssText.includes('data-ktk-venue-review'));
    if(matches.length!==2||matches[0].r.type!==CSSRule.MEDIA_RULE||matches[0].r.conditionText.replace(/\s/g,'')!=='(max-width:600px)'||matches[0].r.cssRules.length!==5||matches[1].r.type!==CSSRule.STYLE_RULE||matches[1].r.style.length!==1||matches[1].r.style.scrollMarginTop!=='24px')throw Error('Exact phone type/table and native heading clearance rules required');
    const snapshot=()=>[...document.querySelectorAll('#main-content *')].filter(n=>!['SCRIPT','STYLE','TEMPLATE'].includes(n.tagName)&&n.getClientRects().length).map(n=>{const s=getComputedStyle(n),b=n.getBoundingClientRect();return{tag:n.tagName,id:n.id,text:n.textContent,family:s.fontFamily,weight:s.fontWeight,color:s.color,heading:/^H[1-6]$/.test(n.tagName),image:n.tagName==='IMG',outside:!n.closest(selector),style:[s.font,s.lineHeight,s.textAlign,s.color,s.display,s.position,s.letterSpacing,s.padding,s.margin],geometry:[b.x,b.y,b.width,b.height]};});
    const before=snapshot();for(const {i}of [...matches].reverse())sheet.deleteRule(i);const prior=snapshot();for(const {i,text}of matches)sheet.insertRule(text,i);const restored=snapshot(),identity=n=>({tag:n.tag,id:n.id,text:n.text,family:n.family,weight:n.weight,color:n.color});
    return{textExact:JSON.stringify(before.map(n=>n.text))===JSON.stringify(prior.map(n=>n.text)),headingIdentityExact:JSON.stringify(before.filter(n=>n.heading).map(identity))===JSON.stringify(prior.filter(n=>n.heading).map(identity)),headingsExact:JSON.stringify(before.filter(n=>n.heading).map(n=>n.style))===JSON.stringify(prior.filter(n=>n.heading).map(n=>n.style)),outsideTypeExact:JSON.stringify(before.filter(n=>n.outside).map(n=>n.style))===JSON.stringify(prior.filter(n=>n.outside).map(n=>n.style)),imageDimensionsExact:JSON.stringify(before.filter(n=>n.image).map(n=>n.geometry.slice(2)))===JSON.stringify(prior.filter(n=>n.image).map(n=>n.geometry.slice(2))),allGeometryTypeExact:JSON.stringify(before)===JSON.stringify(prior),restoredExactly:JSON.stringify(before)===JSON.stringify(restored),visibleNodes:before.length};
   },{keys:venuePhonePageKeys,selector:venuePhoneScope+' :is(p,li,th,td,h2,h3)'});
   check(name+' actual block inverse retains text/heading identities/images/outside type and restores exactly',inverse.textExact&&inverse.headingIdentityExact&&inverse.outsideTypeExact&&inverse.imageDimensionsExact&&inverse.restoredExactly,inverse);
   if(width>600)check(name+' wider typography and geometry at rest exact',inverse.allGeometryTypeExact&&inverse.headingsExact,inverse);
   const nonempty=await root.locator('p').evaluateAll(ns=>ns.map((n,index)=>({index,text:n.textContent.trim()})).filter(n=>n.text).map(n=>n.index));check(name+' exact original nonempty prose inventory',nonempty.length===expectedParagraphs[index]);
   const paragraphs=[];for(const i of nonempty)paragraphs.push(await glyphs(root.locator('p').nth(i)));
   const otherText=[];for(let i=0;i<await root.locator('li,th,td').count();i++)otherText.push(await glyphs(root.locator('li,th,td').nth(i)));
   const headings=[];for(let i=0;i<await root.locator('h2,h3').count();i++)headings.push(await glyphs(root.locator('h2,h3').nth(i)));
   check(name+' all nonempty paragraph/list/table glyphs inside original boxes',[...paragraphs,...otherText].every(n=>!n.text||n.glyphs>0&&n.outside===0));
   if(width<=600){check(name+' phone prose/list/table16px and1.65',[...paragraphs,...otherText].every(n=>!n.text||n.type.length&&n.type.every(t=>t.fontSize===16&&t.lineHeight>=26.3&&t.lineHeight<=26.5)));check(name+' all measured reading positions clear floating tab',[...paragraphs,...otherText].every(n=>n.tabIntersections===0));}
   if(width<=600)check(name+' phone H224/H320 hierarchy, glyph bounds and tab clearance',headings.length===[13,18,13,17,19,10][index]&&headings.every(h=>h.glyphs>0&&h.outside===0&&h.tabIntersections===0&&h.type.every(t=>t.fontSize===(h.tag==='H2'?24:20)&&Math.abs(t.lineHeight-(h.tag==='H2'?31.2:28))<.1)),headings);
   const facts=await root.evaluate(n=>({images:n.querySelectorAll('img').length,tables:[...n.querySelectorAll('table')].map(t=>({width:t.getBoundingClientRect().width,scrollWidth:t.scrollWidth,parentWidth:t.parentElement.getBoundingClientRect().width})),scrollWidth:document.documentElement.scrollWidth,protected:n.querySelectorAll('form,input,select,textarea,button,iframe,video,script').length}));
   check(name+' original images/table and no horizontal overflow/protected elements',facts.images===expectedImages[index]&&facts.tables.length===1&&facts.scrollWidth<=width&&facts.protected===0&&facts.tables.every(t=>t.width<=t.parentWidth+1&&t.scrollWidth<=t.width+1),facts);
   const tableWords=await root.evaluate(n=>{const table=n.querySelector('.ktk-venue-comparison');if(!table)throw Error('Original comparison table required');const labels=[...table.querySelectorAll('tr > :first-child')].flatMap(cell=>{const w=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT),r=document.createRange(),result=[];while(w.nextNode()){const text=w.currentNode;for(const m of text.textContent.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)){r.setStart(text,m.index);r.setEnd(text,m.index+m[0].length);result.push({word:m[0],lines:[...r.getClientRects()].filter(g=>g.width&&g.height).length});}}return result;});const orphanDescriptions=[];for(const cell of table.querySelectorAll('td:not(:first-child)')){const w=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT),r=document.createRange();while(w.nextNode()){const text=w.currentNode;for(const m of text.textContent.matchAll(/[\p{L}]{4,}/gu)){const lines=new Map();for(let i=0;i<m[0].length;i++){r.setStart(text,m.index+i);r.setEnd(text,m.index+i+1);const b=r.getBoundingClientRect();if(b.width&&b.height)lines.set(b.top,(lines.get(b.top)||0)+1);}const sizes=[...lines.values()];if(sizes.length>1&&sizes.at(-1)===1)orphanDescriptions.push({word:m[0],sizes});}}}return{labels,orphanDescriptions};});
   check(name+' native table label words whole and no one-letter description tails',tableWords.labels.length>0&&tableWords.labels.every(w=>w.lines===1)&&tableWords.orphanDescriptions.length===0,tableWords);
   const anchors=root.locator('a[href]'),topicIndices=await anchors.evaluateAll(ns=>ns.map((n,index)=>({index,url:new URL(n.href)})).filter(n=>n.url.origin===location.origin&&n.url.pathname===location.pathname&&(n.url.search===''||n.url.search===location.search)&&n.url.hash).map(n=>n.index));
   check(name+' exact original native topics',topicIndices.length===expectedTopics[index]);if(topicIndices.length!==expectedTopics[index])throw Error('Unknown topic inventory');
   for(const [i,at]of topicIndices.entries()){
    const link=anchors.nth(at),href=await link.evaluate(n=>new URL(n.href).hash);if(!/^#[A-Za-z][A-Za-z0-9_-]*$/.test(href)||await page.locator('[id="'+href.slice(1)+'"]').count()!==1)throw Error('Unique original topic fragment required');
    await link.focus();check(name+' topic'+i+' native anchor focused',await link.evaluate(n=>document.activeElement===n));await link.press('Enter');
    let target;for(let attempt=0;attempt<40;attempt++){target=await page.evaluate(hash=>{const n=document.getElementById(hash.slice(1)),b=n.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(n);const g=r.getBoundingClientRect();return{hash:location.hash,top:b.top,bottom:b.bottom,glyphTop:g.top,glyphBottom:g.bottom,glyphHeight:g.height,margin:getComputedStyle(n).scrollMarginTop,height:innerHeight};},href);if(target.hash===href&&target.top>=0&&target.bottom<=target.height&&target.glyphTop>=0&&target.glyphBottom<=target.height)break;await page.waitForTimeout(50);}
    check(name+' topic'+i+' native heading and glyphs arrive inside viewport',target.hash===href&&target.top>=0&&target.bottom<=target.height&&target.glyphTop>=0&&target.glyphBottom<=target.height&&target.glyphHeight>0&&target.margin==='24px',target);
   }
   if(js&&width===390&&motion==='reduce')for(const [label,target]of [['prose',root.locator('p').nth(nonempty[0])],['headings',root.locator('h2').first()],['table',root.locator('table')]]){
    await target.evaluate(n=>n.scrollIntoView({block:'start'}));await page.evaluate(()=>scrollBy(0,-100));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const file=key+'-'+label+'-390.png';await page.screenshot({path:path.join(folder,file)});report.captures.push({name,file,originalImagesDecoded:true});
   }
   if(js&&motion==='reduce'&&[390,1440].includes(width)){
    await page.addScriptTag({content:axe});const result=await page.evaluate(()=>axe.run(document.querySelector('#main-content'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
    report.accessibility.push({name,violations:result.violations,incomplete:result.incomplete.map(n=>({id:n.id,nodes:n.nodes.length}))});check(name+' zero automated axe violations',!result.violations.length,result.violations);
   }
   report.views.push({name,key,width,javaScript:js,motion,cache:response.headers()['cf-cache-status']||null,inverse,ready,paragraphs,otherText,headings,facts,tableWords,topicCount:topicIndices.length});console.log(name+' complete ('+report.views.length+'/54)');
  }finally{clearTimeout(viewDeadline);await context.close();}
 }
}catch(e){report.errors.push({harness:e.stack});}finally{await browser.close();}
check('All54 responsive views complete',report.views.length===54);check('Source and harness inputs unchanged',JSON.stringify(initial)===JSON.stringify(await hashes()));check('No page/harness errors or non-read attempts',!report.errors.length&&!report.writes.length,{errors:report.errors,writes:report.writes});
report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;await mkdir(folder,{recursive:true});await writeFile(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,views:report.views.length,captures:report.captures.length,failed:report.checks.filter(c=>!c.pass),errors:report.errors}));if(report.passed!==report.total)process.exitCode=1;
