import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadReviewedArticlePresentation,reviseReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const output=process.argv[2];if(!output)throw Error('Fresh fixture report required');try{await readFile(output);throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const rows=await loadReviewedArticlePresentation(),checks=[],errors=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail}),require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
 for(const r of rows){
  for(const [label,html]of [['raw',r.sourceHtml],['prepared',execFileSync('git',['show','d11b536ffc1c33e0a28aa9a6c0df6a8c1c90127c:staging/wp-content/mu-plugins/ktk-code-pages-assets/content/'+r.key+'.html'],{encoding:'utf8',maxBuffer:10*1024*1024})]]){
   await page.setContent(html,{waitUntil:'domcontentloaded'});const before=await page.locator('#main-content').innerHTML(),changes=await page.evaluate(reviseReviewedArticlePresentation,{key:r.key,revision:r}),count=r.kind==='photo'?1:r.cardKeys.length;
   check(r.key+' '+label+' exact reviewed change count',changes.length===count,changes);
   const result=await page.evaluate(({before,r})=>{
    const doc=new DOMParser().parseFromString('<div id="previous">'+before+'</div>','text/html'),old=doc.getElementById('previous'),main=document.querySelector('#main-content'),after=main.innerHTML;let reviewed=true;
    if(r.kind==='photo'){const find=root=>[...root.querySelectorAll('img')].filter(n=>!n.closest('noscript')&&[r.photo.sourceUrl,'__KTK_PAGE_ASSETS__'+r.photo.file].includes(n.getAttribute('data-lazy-src')||n.getAttribute('src')));reviewed=find(main).length===1&&find(main)[0].getAttribute('alt')===r.photo.alt;find(main)[0].setAttribute('alt',find(old)[0].getAttribute('alt'));}
    else{
     for(const key of r.cardKeys){const a=r.articles.find(a=>a.key===key),current=main.querySelector('article.post-'+a.postId),previous=old.querySelector('article.post-'+a.postId),p=current.querySelector('p[data-ktk-reviewed-summary]'),q=previous.querySelector('.post-content-inner > p');reviewed&&=!!p&&p.textContent===a.summary&&p.getAttribute('data-ktk-reviewed-summary')===r.version;if(q){p.innerHTML=q.innerHTML;p.removeAttribute('data-ktk-reviewed-summary');}else{const y=[...previous.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());p.replaceWith(y[0].cloneNode(true));}}
     main.removeAttribute('data-ktk-reviewed-excerpts');
    }
    const outside=main.innerHTML===before;main.innerHTML=after;if(r.kind==='cards'&&r.cardKeys.length)main.dataset.ktkReviewedExcerpts=r.version;return{reviewed,outside};
   },{before,r});
   check(r.key+' '+label+' reviewed text/neutral description exact',result.reviewed,result);check(r.key+' '+label+' all dates/bylines/media/links/held and other nodes exact',result.outside,result);
   const after=await page.locator('#main-content').innerHTML();check(r.key+' '+label+' repeat is an exact no-op',(await page.evaluate(reviseReviewedArticlePresentation,{key:r.key,revision:r})).length===0&&await page.locator('#main-content').innerHTML()===after);
   if(r.kind==='cards'&&r.cardKeys.length)for(const kind of ['summary-marker','duplicate-wrapper']){
    await page.evaluate(kind=>{const p=document.querySelector('p[data-ktk-reviewed-summary]');if(kind==='summary-marker')p.dataset.ktkReviewedSummary='unknown';else p.after(p.cloneNode(true));},kind);
    const tampered=await page.locator('#main-content').innerHTML();let rejected=false;try{await page.evaluate(reviseReviewedArticlePresentation,{key:r.key,revision:r});}catch{rejected=true;}check(r.key+' '+label+' rejects reviewed '+kind+' atomically',rejected&&await page.locator('#main-content').innerHTML()===tampered);await page.locator('#main-content').evaluate((n,html)=>n.innerHTML=html,after);
   }
  }
  const mutations=r.kind==='photo'?['unknown-alt','missing-photo','duplicate-photo','unknown-version']:r.cardKeys.length?['late-title','late-summary','duplicate-card','missing-card','unknown-version','unsafe-summary','wrong-inventory']:['unknown-version'];
  for(const kind of mutations){
   await page.setContent(r.sourceHtml,{waitUntil:'domcontentloaded'});const revision=structuredClone(r);
   if(kind==='unknown-version')revision.version='unreviewed';else if(kind==='wrong-inventory')revision.cardKeys=r.cardKeys.slice(0,-1);else if(kind==='unsafe-summary')revision.articles.find(a=>a.key===r.cardKeys.at(-1)).summary='<script>Unreviewed content which must never be inserted into an article or archive excerpt.</script>';else await page.evaluate(({kind,r})=>{
    const main=document.querySelector('#main-content');if(r.kind==='photo'){const n=[...main.querySelectorAll('img')].find(n=>!n.closest('noscript')&&(n.getAttribute('data-lazy-src')||n.getAttribute('src'))===r.photo.sourceUrl);if(kind==='unknown-alt')n.alt='unknown';if(kind==='missing-photo')n.remove();if(kind==='duplicate-photo')n.after(n.cloneNode(true));return;}
    const a=r.articles.find(a=>a.key===r.cardKeys.at(-1)),n=main.querySelector('article.post-'+a.postId);if(kind==='late-title')n.querySelector('.entry-title').append('changed');if(kind==='late-summary'){const p=n.querySelector('.post-content-inner > p');if(p)p.append('changed');else[...n.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()).appendData('changed');}if(kind==='duplicate-card')n.after(n.cloneNode(true));if(kind==='missing-card')n.remove();
   },{kind,r});
   const before=await page.locator('#main-content').innerHTML();let message='';try{await page.evaluate(reviseReviewedArticlePresentation,{key:r.key,revision});}catch(e){message=e.message;}check(r.key+' rejects '+kind+' atomically',!!message&&await page.locator('#main-content').innerHTML()===before,message);
  }
 }
}catch(e){errors.push(e.stack);}finally{await browser.close();}
check('No fixture/harness errors',!errors.length,errors);const report={checkedAt:new Date().toISOString(),scope:'All forty raw/prepared containers and exact photo, repeat and atomic negative fixtures. All network aborted; no messages/orders.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks,errors};await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass),errors},null,2));if(report.passed!==report.total)process.exitCode=1;
