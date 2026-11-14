import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const [baseline,output]=process.argv.slice(2);if(!/^[a-f0-9]{40}$/.test(baseline||'')||!output)throw Error('Exact baseline and fresh report required');try{await readFile(output);throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const rows=await loadReviewedArticlePresentation(),root='staging/wp-content/mu-plugins/ktk-code-pages-assets/',active=rows.filter(r=>r.kind==='photo'||r.cardKeys.length),expected=[...active.map(r=>root+'content/'+r.key+'.html'),root+'runtime.css'].sort(),checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail}),changed=[],manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8')),heldId=manifest.routes.find(r=>r.key==='post-hostel-hangover-cure').postId;
for(const row of execFileSync('git',['ls-tree','-r',baseline,'--','staging'],{encoding:'utf8'}).trim().split('\n')){const [entry,file]=row.split('\t'),bytes=await readFile(file),sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');if(sha===entry.split(' ')[2])check(file+' original Git blob retained',true);else changed.push(file);}
check('Exactly23 containers, one ALT-only body and one bounded CSS addition',JSON.stringify(changed.sort())===JSON.stringify(expected)&&expected.length===25,changed);check('No new application files',!execFileSync('git',['ls-files','--others','--exclude-standard','--','staging'],{encoding:'utf8'}).trim());check('All immutable captures remain original',!execFileSync('git',['diff','--name-only',baseline,'--','docs/code-pages/full-migration/captures'],{encoding:'utf8'}).trim());check('Original asset manifest retained',createHash('sha256').update(await readFile('docs/code-pages/full-migration/assets.json')).digest('hex')==='f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691');
const oldCss=execFileSync('git',['show',baseline+':'+root+'runtime.css'],{encoding:'utf8',maxBuffer:10*1024*1024}),css=await readFile(root+'runtime.css','utf8'),scope='body.ktk-code-page #main-content[data-ktk-reviewed-excerpts="2026-11-14.article-presentation-2"] p[data-ktk-reviewed-summary="2026-11-14.article-presentation-2"]',addition='/* BEGIN Reviewed article summary readability */\n'+scope+' { font-size: 16px; line-height: 1.65; text-align: left; letter-spacing: 0; margin: 0; padding: 0; }\n@media (max-width: 600px) {\n  '+scope+' { padding-right: 24px; }\n}\n/* END Reviewed article summary readability */\n\n';
check('Every original CSS byte retained outside exact marker-scoped addition',css.split(addition).length===2&&css.replace(addition,'')===oldCss);
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
 for(const r of rows){
  const file=root+'content/'+r.key+'.html',before=execFileSync('git',['show',baseline+':'+file],{encoding:'utf8',maxBuffer:10*1024*1024}),after=await readFile(file,'utf8'),state=await page.evaluate(({before,after,r,heldId})=>{
   const a=new DOMParser().parseFromString(before,'text/html'),b=new DOMParser().parseFromString(after,'text/html'),main=b.querySelector('#main-content'),old=a.querySelector('#main-content'),serialize=(doc,s)=>[...doc.querySelectorAll(s)].map(n=>n.outerHTML),same=s=>JSON.stringify(serialize(a,s))===JSON.stringify(serialize(b,s));let reviewed=true;
   const protectedNodes=same('h1,h2,h3,h4,h5,h6,a,.post-meta,form,iframe,svg,video,button'),held=same('article.post-'+heldId),beforeImages=serialize(a,'img');
   if(r.kind==='photo'){
    const candidates=[...main.querySelectorAll('img')].filter(n=>!n.closest('noscript')&&n.getAttribute('src')==='__KTK_PAGE_ASSETS__'+r.photo.file);reviewed=candidates.length===1&&candidates[0].getAttribute('alt')===r.photo.alt;if(candidates.length===1)candidates[0].setAttribute('alt',r.photo.oldAlt);
   }else{
    reviewed=r.cardKeys.length?main.getAttribute('data-ktk-reviewed-excerpts')===r.version:!main.hasAttribute('data-ktk-reviewed-excerpts');
    for(const key of r.cardKeys){const conf=r.articles.find(a=>a.key===key),x=main.querySelector('article.post-'+conf.postId),y=old.querySelector('article.post-'+conf.postId),p=x?.querySelector('p[data-ktk-reviewed-summary]'),q=y?.querySelector('.post-content-inner > p');reviewed&&=!!p&&p.textContent===conf.summary&&p.getAttribute('data-ktk-reviewed-summary')===r.version;if(p&&q){p.innerHTML=q.innerHTML;p.removeAttribute('data-ktk-reviewed-summary');}else if(p){const cy=[...y.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());reviewed&&=cy.length===1;if(cy.length===1)p.replaceWith(cy[0].cloneNode(true));}}
    main.removeAttribute('data-ktk-reviewed-excerpts');
   }
   return {reviewed,protectedNodes,held,imagesRestored:JSON.stringify(beforeImages)===JSON.stringify(serialize(b,'img')),outside:a.body.innerHTML===b.body.innerHTML};
  },{before,after,r,heldId});
  check(r.key+' reviewed summaries or neutral ALT exact',state.reviewed,state);check(r.key+' original headings/links/dates/bylines/controls/held cards exact',state.protectedNodes&&state.held,state);check(r.key+' original media and every other node exact after narrow inverse',state.imagesRestored&&state.outside,state);
 }
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),baseline,scope:'23 container bodies with65 summary paragraphs, one ALT-only correction and one exact scoped CSS addition. All metadata, original CSS, JS, artwork, held content and all other application blobs retained.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks};await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
