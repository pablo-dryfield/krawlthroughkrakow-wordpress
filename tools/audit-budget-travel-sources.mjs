import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const root=fileURLToPath(new URL('..',import.meta.url)),output=process.argv[2];
if(!output)throw Error('Fresh inventory output required');
try{await readFile(output);throw Error('Preserve earlier evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const hash=b=>createHash('sha256').update(b).digest('hex'),manifest=JSON.parse(await readFile(path.join(root,'docs/code-pages/full-migration/manifest.json'),'utf8')),assets=JSON.parse(await readFile(path.join(root,'docs/code-pages/full-migration/assets.json'),'utf8')),old=await loadReviewedArticlePresentation();
const definitions=[['post-krakow-free-activities-2','c8371787f7b9071df572de5fd38c408a04a2591da8965ed1f20d880b0e3d4aa0'],['post-krakow-budget-activities','85a03c9f6a40916954fc07a417efd89a3192324941d5489bb766242df3137320'],['post-krakow-money-saving-tips','b894538c8b2ec8a60bf06a4eef994f54536eb430da762210598d604c88c251aa']];
const targets=definitions.map(([key,sha])=>{const r=manifest.routes.find(r=>r.key===key);if(!r||r.kind!=='blog post')throw Error('Original budget article required');return{key,sha,postId:r.postId,route:r.route,source:r.source};});
const heldId=manifest.routes.find(r=>r.key==='post-hostel-hangover-cure').postId,report={checkedAt:new Date().toISOString(),scope:'Read-only three-article and40-container inventory; all browser network aborted.',targets,articles:[],containers:[],errors:[]},require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
 for(const t of targets){
  const raw=await readFile(path.join(root,t.source,'production-1920.html'),'utf8'),prepared=await readFile(path.join(root,'staging/wp-content/mu-plugins/ktk-code-pages-assets/content',t.key+'.html'),'utf8');if(hash(raw)!==t.sha)throw Error('Original budget capture changed');
  report.articles.push(await page.evaluate(({t,raw,prepared,assets})=>{
   const clean=s=>(s||'').replace(/\s+/g,' ').trim(),inspect=html=>{
    const d=new DOMParser().parseFromString(html,'text/html'),m=d.querySelector('#main-content'),b=m?.querySelector('.entry-content');if(!b||m.querySelectorAll('.entry-content').length!==1||b.querySelector('.et_pb_text_inner'))throw Error('One original rich-text body required');
    const c=b.cloneNode(true);c.querySelectorAll('noscript,script,style').forEach(n=>n.remove());
    return{title:clean(m.querySelector('h1.entry-title')?.textContent),publication:m.querySelector('.post-meta')?.outerHTML,text:clean(c.textContent),ids:[...b.querySelectorAll('[id]')].map(n=>n.id),headings:[...b.querySelectorAll('h2,h3,h4,h5,h6')].map(n=>({tag:n.tagName,id:n.id,text:clean(n.textContent)})),paragraphs:[...c.querySelectorAll('p')].map(n=>clean(n.textContent)).filter(Boolean),toc:[...b.querySelectorAll('#main-toc a')].map(n=>({href:n.getAttribute('href'),text:clean(n.textContent)})),links:[...c.querySelectorAll('a')].map(n=>({href:n.getAttribute('href'),text:clean(n.textContent)})),photos:[...b.querySelectorAll('img')].filter(n=>!n.closest('noscript')).map(n=>{const src=n.dataset.lazySrc||n.getAttribute('src'),p=n.closest('p');return{src,file:assets[src]?.file||src.replace('__KTK_PAGE_ASSETS__',''),html:n.outerHTML,wrapper:p?.outerHTML,wrapperText:clean(p?.textContent),wrapperIds:p?[...p.querySelectorAll('[id]')].map(n=>n.id):[]};})};
   };const source=inspect(raw),current=inspect(prepared);return{key:t.key,source,current,copyExact:source.text===current.text,idsExact:JSON.stringify(source.ids)===JSON.stringify(current.ids),photoFilesExact:JSON.stringify(source.photos.map(n=>n.file))===JSON.stringify(current.photos.map(n=>n.file))};
  },{t,raw,prepared,assets}));
 }
 for(const r of old.filter(r=>r.kind==='cards')){
  const current=await readFile(path.join(root,'staging/wp-content/mu-plugins/ktk-code-pages-assets/content',r.key+'.html'),'utf8');report.containers.push(await page.evaluate(({r,current,targets,oldArticles,heldId})=>{
   const parse=h=>new DOMParser().parseFromString(h,'text/html'),s=parse(r.sourceHtml),c=parse(current),clean=s=>(s||'').replace(/\s+/g,' ').trim(),cards=d=>[...d.querySelectorAll('#main-content article.et_pb_post')].flatMap(n=>{const a=targets.find(a=>n.classList.contains('post-'+a.postId));if(!a)return[];const p=n.querySelector('.post-content-inner > p'),text=[...n.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&clean(n.textContent));if(!p&&text.length!==1)throw Error('Exact new card excerpt required');return[{key:a.key,title:clean(n.querySelector('.entry-title')?.textContent),summary:clean((p||text[0]).textContent)}];}),before=cards(s),after=cards(c),all=[...oldArticles,...targets],nextCardKeys=[...s.querySelectorAll('#main-content article.et_pb_post')].map(n=>all.find(a=>n.classList.contains('post-'+a.postId))?.key).filter(Boolean);return{key:r.key,captureSha256:r.sourceSha256,newCards:before,currentCards:after,copyExact:JSON.stringify(before)===JSON.stringify(after),nextCardKeys,heldCards:c.querySelectorAll('article.post-'+heldId).length};
  },{r,current,targets,oldArticles:old[0].articles,heldId}));
 }
 for(const a of report.articles)if(!a.copyExact||!a.idsExact||!a.photoFilesExact)report.errors.push('Source/prepared difference: '+a.key);
 for(const c of report.containers)if(!c.copyExact)report.errors.push('Card difference: '+c.key);
}catch(e){report.errors.push(e.stack);}finally{await browser.close();}
report.summary={articles:report.articles.length,containers:report.containers.length,inlinePhotos:report.articles.reduce((n,a)=>n+a.current.photos.length,0),newCards:report.containers.reduce((n,c)=>n+c.newCards.length,0),affectedContainers:report.containers.filter(c=>c.newCards.length).length,nextCards:report.containers.reduce((n,c)=>n+c.nextCardKeys.length,0),nextActive:report.containers.filter(c=>c.nextCardKeys.length).length};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,errors:report.errors},null,2));if(report.errors.length)process.exitCode=1;
