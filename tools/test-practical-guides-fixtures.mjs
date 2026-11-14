import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadPracticalGuidesEditorial,revisePracticalGuidesEditorial} from './practical-guides-editorial.mjs';
const output=process.argv[2];if(!output)throw Error('Fresh fixture report required');try{await readFile(output);throw Error('Preserve earlier evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const rows=await loadPracticalGuidesEditorial(),baseline='d02325aeaa1f2d2197c044f307e91cdd5b932698',root='staging/wp-content/mu-plugins/ktk-code-pages-assets/content/',checks=[],errors=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
 for(const r of rows){
  const prepared=execFileSync('git',['show',baseline+':'+root+r.key+'.html'],{encoding:'utf8',maxBuffer:10*1024*1024});
  for(const [label,html]of [['raw',r.sourceHtml],['prepared',prepared]]){
   await page.setContent(html);const before=await page.evaluate(key=>{const selector=key==='post-the-ultimate-guide-to-dating-in-nightlife-krakow'?'.et_pb_text_0 > .et_pb_text_inner':'.entry-content',main=document.querySelector('#main-content'),n=main.querySelector(selector);return {photos:[...n.querySelectorAll('img')].filter(n=>!n.closest('noscript')).map(n=>n.outerHTML),title:main.querySelector('h1.entry-title').outerHTML,meta:main.querySelector('.post-meta').outerHTML};},r.key);
   const result=await page.evaluate(revisePracticalGuidesEditorial,{key:r.key,revision:r});check(r.key+' '+label+' full source-bound revision',result.length===1,result);
   const state=await page.evaluate(()=>{const n=document.querySelector('[data-ktk-practical-review]');return {photos:[...n.querySelectorAll('img')].map(n=>n.outerHTML),title:document.querySelector('h1.entry-title').outerHTML,meta:document.querySelector('.post-meta').outerHTML,ids:[...n.querySelectorAll('[id]')].map(n=>n.id),toc:[...n.querySelectorAll('nav a')].map(a=>({href:a.getAttribute('href'),target:!!document.getElementById(a.getAttribute('href').slice(1))})),words:n.textContent.trim().split(/\s+/).length,collapsedArticle:!!n.querySelector('details h2,details h3,details p,details img')};});
   check(r.key+' '+label+' original photo elements/title/publication preserved',JSON.stringify(before.photos)===JSON.stringify(state.photos)&&before.title===state.title&&before.meta===state.meta);
   check(r.key+' '+label+' unique real native fragments, all article text outside disclosure',state.ids.length===new Set(state.ids).size&&state.toc.every(t=>t.target)&&!state.collapsedArticle,state);
   const once=await page.locator('body').innerHTML();await page.evaluate(revisePracticalGuidesEditorial,{key:r.key,revision:r});check(r.key+' '+label+' idempotent',await page.locator('body').innerHTML()===once);
  }
  const mutations=[
   {name:'publication drift',dom:()=>document.querySelector('.published').append(' changed')},
   {name:'headline drift',dom:()=>document.querySelector('h1.entry-title').append(' changed')},
   {name:'late original text drift',dom:key=>{const n=document.querySelector(key==='post-the-ultimate-guide-to-dating-in-nightlife-krakow'?'.et_pb_text_0 > .et_pb_text_inner':'.entry-content');n.append('changed');}},
   {name:'last photo identity drift',dom:key=>{const n=document.querySelector(key==='post-the-ultimate-guide-to-dating-in-nightlife-krakow'?'.et_pb_text_0 > .et_pb_text_inner':'.entry-content');n.querySelectorAll('img')[n.querySelectorAll('img').length-1].src='https://example.invalid/changed.jpg';}},
   {name:'late protected form',dom:key=>document.querySelector(key==='post-the-ultimate-guide-to-dating-in-nightlife-krakow'?'.et_pb_text_0 > .et_pb_text_inner':'.entry-content').append(document.createElement('form'))},
   {name:'original fragment drift',dom:key=>{const n=document.querySelector(key==='post-the-ultimate-guide-to-dating-in-nightlife-krakow'?'.et_pb_text_0 > .et_pb_text_inner':'.entry-content');n.lastElementChild.id='unknown-original-id';}},
   {name:'script injection',markup:r.markup.replace('<p>','<p><script>alert(1)</script>')},
   {name:'event-handler injection',markup:r.markup.replace('<p>','<p onclick="alert(1)">')},
   {name:'foreign destination',markup:r.markup.replace('href="#','href="https://example.invalid/#')},
   {name:'missing final photo slot',markup:r.markup.replace(/<template data-ktk-original-photo="[0-9]+"><\/template>(?![\s\S]*<template)/,'')},
   {name:'duplicate photo slot',markup:r.markup.replace('data-ktk-original-photo="1"','data-ktk-original-photo="0"')},
   {name:'missing final meaningful fragment',markup:r.markup.replace('id="conclusion"','id="unknown-final-fragment"')},
   {name:'stale review date',markup:r.markup.replace('datetime="2026-11-14"','datetime="2025-11-14"')}
  ];
  for(const m of mutations){await page.setContent(prepared);if(m.dom)await page.evaluate(m.dom,r.key);const before=await page.locator('body').innerHTML();let failed=false;try{await page.evaluate(revisePracticalGuidesEditorial,{key:r.key,revision:{...r,markup:m.markup||r.markup}});}catch{failed=true;}check(r.key+' '+m.name+' rejected atomically',failed&&await page.locator('body').innerHTML()===before);}
 }
}catch(e){errors.push({stack:e.stack});}finally{await browser.close();}
check('No fixture errors',!errors.length,errors);const report={checkedAt:new Date().toISOString(),baseline,scope:'Three raw/prepared article revisions, preservation/idempotence and atomic-negative fixtures. All network requests aborted; no emails/orders.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks,errors};await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass),errors},null,2));if(report.passed!==report.total)process.exitCode=1;
