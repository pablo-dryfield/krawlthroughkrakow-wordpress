import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';

const output=process.argv[2];if(!output)throw Error('Fresh inventory output required');try{await readFile(output);throw Error('Preserve earlier evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8')),build=JSON.parse(await readFile('docs/code-pages/full-migration/build-report.json','utf8'));
const types=new Set(['reviewed-Memorial-visitor-copy','practical-guide-review','reviewed-venue-guide','reviewed-music-guide','established-NYE-guide-review','reviewed-stag-costume-guide','reviewed-budget-guide','night-out-guidance-review','practical-safety-guide-review','practical-party-claims-review','optional-games-resource-review','nye-editorial-correction','historical-nightlife-notice']);
const selected=manifest.routes.filter(r=>r.kind==='blog post'&&r.key!=='post-hostel-hangover-cure'&&build.revisions[r.key]?.content.some(x=>types.has(x.type))).map(r=>({key:r.key,postId:r.postId,title:r.title,route:r.route,types:[...new Set(build.revisions[r.key].content.map(x=>x.type).filter(x=>types.has(x)))]}));
if(selected.length!==24)throw Error('Review the explicit twenty-four-article scope before expanding it');
const heldId=manifest.routes.find(r=>r.key==='post-hostel-hangover-cure')?.postId;if(!Number.isInteger(heldId))throw Error('Held article identity required');
const sha=value=>createHash('sha256').update(value).digest('hex'),report={checkedAt:new Date().toISOString(),scope:'Read-only immutable captures/current generated cards. No website requests, edits, messages or orders.',selected,containers:[],errors:[]},require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
 for(const row of manifest.routes.filter(r=>r.key==='blog'||r.key.startsWith('archive-'))){
  const capture=await readFile(row.source+'/production-1920.html','utf8'),current=await readFile('staging/wp-content/mu-plugins/ktk-code-pages-assets/content/'+row.key+'.html','utf8');
  const inspect=({html,selected,heldId})=>{
   const d=new DOMParser().parseFromString(html,'text/html'),main=d.querySelector('#main-content'),cards=[],clean=s=>(s||'').replace(/\s+/g,' ').trim();
   for(const n of main.querySelectorAll('article.et_pb_post')){
    const item=selected.find(r=>n.classList.contains('post-'+r.postId));if(!item)continue;
    const p=n.querySelectorAll('.post-content-inner > p'),direct=[...n.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
    cards.push({key:item.key,postId:item.postId,id:n.id,paragraphs:p.length,directText:direct.map(n=>({raw:n.textContent,text:clean(n.textContent)})),paragraphHtml:[...p].map(n=>n.innerHTML),paragraphText:[...p].map(n=>clean(n.textContent)),children:[...n.children].map(n=>({tag:n.tagName,class:n.className,text:clean(n.textContent).slice(0,100)})),imageCount:n.querySelectorAll('img').length,images:[...n.querySelectorAll('img')].map(n=>({src:n.dataset.lazySrc||n.getAttribute('src'),alt:n.getAttribute('alt')})),links:[...n.querySelectorAll('a')].map(n=>n.getAttribute('href'))});
   }
   return{cards,totalCards:main.querySelectorAll('article.et_pb_post').length,medicalCards:[...main.querySelectorAll('article.et_pb_post')].filter(n=>n.classList.contains('post-'+heldId)).length};
  };
  const before=await page.evaluate(inspect,{html:capture,selected,heldId}),after=await page.evaluate(inspect,{html:current,selected,heldId});
  if(JSON.stringify(before.cards.map(n=>[n.key,n.paragraphText,n.directText.map(n=>n.text)]))!==JSON.stringify(after.cards.map(n=>[n.key,n.paragraphText,n.directText.map(n=>n.text)])))report.errors.push({key:row.key,reason:'Current summaries already differ from immutable source; review before changing'});
  report.containers.push({key:row.key,route:row.route,captureSha256:sha(capture),currentBodySha256:sha(current),...before});
 }
}finally{await browser.close();}
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({selected:selected.length,containers:report.containers.length,affectedContainers:report.containers.filter(r=>r.cards.length).length,matchingCards:report.containers.reduce((n,r)=>n+r.cards.length,0),paragraphCards:report.containers.flatMap(r=>r.cards).filter(r=>r.paragraphs===1).length,rawTextCards:report.containers.flatMap(r=>r.cards).filter(r=>r.paragraphs===0&&r.directText.length===1).length,errors:report.errors},null,2));if(report.errors.length)process.exitCode=1;
