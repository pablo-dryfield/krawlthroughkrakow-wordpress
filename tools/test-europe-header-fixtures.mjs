import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadEuropeHeaderPresentation,reviseEuropeHeaderPresentation,reviseEuropeHeaderSourceReference} from './europe-header-presentation.mjs';
const output=process.argv[2];if(!output)throw Error('Fresh fixture report path required');
try{await readFile(output);throw Error('Preserve prior evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const sha=b=>createHash('sha256').update(b).digest('hex'),revision=await loadEuropeHeaderPresentation();
const sources=['tools/europe-header-presentation.mjs','tools/fixtures/europe-header-prepared-baseline.json','tools/test-europe-header-fixtures.mjs'];
const sourceHashes=Object.fromEntries(await Promise.all(sources.map(async p=>[p,sha(await readFile(p))]))),checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await browser.newPage({javaScriptEnabled:false});await p.route('**/*',r=>r.abort());await p.setContent(revision.before);
 const before=await p.locator('#main-content').evaluate(n=>n.outerHTML);
 const result=await p.evaluate(reviseEuropeHeaderPresentation,{key:revision.key,revision});
 const facts=await p.evaluate(({before})=>{
  const old=new DOMParser().parseFromString(before,'text/html').querySelector('#main-content'),main=document.querySelector('#main-content'),entry=main.querySelector('.entry-content'),topics=['europe-choosing','europe-krakow','europe-malta','europe-other-events','europe-checklist','europe-more'];
  const duplicate=old.querySelector('.et_pb_post_title_0'),inverse=main.cloneNode(true),inverseEntry=inverse.querySelector('.entry-content');inverseEntry.removeAttribute('data-ktk-europe-header');
  for(const id of topics){const h=inverse.querySelector('#'+id),replacement=document.createElement('h3');for(const attr of h.attributes)replacement.setAttribute(attr.name,attr.value);replacement.innerHTML=h.innerHTML;h.replaceWith(replacement);}
  const path=[];for(let n=duplicate.parentElement;n!==old;n=n.parentElement)path.unshift([...n.parentNode.childNodes].indexOf(n));let parent=inverse;for(const i of path)parent=parent.childNodes[i];const index=[...duplicate.parentNode.childNodes].indexOf(duplicate);parent.insertBefore(duplicate.cloneNode(true),parent.childNodes[index]??null);
  const ids=n=>[n,...n.querySelectorAll('[id]')].filter(x=>x.id).map(x=>x.id),unique=(n,sel,attr)=>[...new Set([...n.querySelectorAll(sel)].map(x=>x.getAttribute(attr)))].sort();
  const oldPhoto=[...old.querySelectorAll('img')].filter(n=>!n.closest('.et_pb_post_title_0')).map(n=>n.outerHTML),photos=[...main.querySelectorAll('img')].map(n=>n.outerHTML);
  return{inverse:inverse.outerHTML===old.outerHTML,ids:ids(main),oldIds:ids(old),topics:topics.map(id=>main.querySelector('#'+id).tagName),h1:main.querySelector('h1').outerHTML===old.querySelector('h1').outerHTML,metadata:[...main.querySelectorAll('.et_post_meta_wrapper > .post-meta')].map(n=>n.outerHTML),oldMetadata:[...old.querySelectorAll('.et_post_meta_wrapper > .post-meta')].map(n=>n.outerHTML),photosExact:JSON.stringify(photos)===JSON.stringify(oldPhoto),hrefsExact:JSON.stringify(unique(main,'a[href]','href'))===JSON.stringify(unique(old,'a[href]','href')),srcsExact:JSON.stringify(unique(main,'img','src'))===JSON.stringify(unique(old,'img','src')),duplicate:main.querySelectorAll('.et_pb_post_title_0').length,marker:entry.dataset.ktkEuropeHeader};
 },{before});
 check('positive prepared transformation',result.length===1,facts);
 check('independent inverse restores complete original main',facts.inverse);
 check('all original IDs and unique destinations exact',JSON.stringify(facts.ids)===JSON.stringify(facts.oldIds)&&facts.hrefsExact);
 check('both unique original photos and every retained attribute exact',facts.photosExact&&facts.srcsExact);
 check('six topics H2 with original H1/publication metadata unchanged',facts.topics.every(h=>h==='H2')&&facts.h1&&JSON.stringify(facts.metadata)===JSON.stringify(facts.oldMetadata));
 check('only duplicate module removed and new marker present',facts.duplicate===0&&facts.marker===revision.version);
 const after=await p.locator('#main-content').evaluate(n=>n.outerHTML);check('exact idempotent no-op',(await p.evaluate(reviseEuropeHeaderPresentation,{key:revision.key,revision})).length===0&&await p.locator('#main-content').evaluate(n=>n.outerHTML)===after);
 for(const mutation of ['title','paragraph','photo','topic','duplicate','delete-duplicate','metadata','marker','extra-main']){
  await p.setContent(revision.before);await p.evaluate(kind=>{const main=document.querySelector('#main-content');switch(kind){case'title':main.querySelector('h1').append(' changed');break;case'paragraph':main.querySelector('.et_pb_text_inner p').append(' changed');break;case'photo':main.querySelector('img').setAttribute('alt','changed');break;case'topic':main.querySelector('#europe-choosing').id='changed';break;case'duplicate':main.querySelector('.et_pb_post_title_0').after(main.querySelector('.et_pb_post_title_0').cloneNode(true));break;case'delete-duplicate':main.querySelector('.et_pb_post_title_0').remove();break;case'metadata':main.querySelector('.post-meta').append(' changed');break;case'marker':main.querySelector('.entry-content').dataset.ktkEuropeHeader='changed';break;case'extra-main':main.after(main.cloneNode(true));break;}},mutation);
  const before=await p.content();let rejected=false;try{await p.evaluate(reviseEuropeHeaderPresentation,{key:revision.key,revision});}catch{rejected=true;}check(mutation+' refuses atomically',rejected&&await p.content()===before);
 }
 for(const key of ['post-budapest-or-krakow-nightlife','competition','post-hostel-hangover-cure','store2']){await p.setContent(revision.before);const before=await p.content();check(key+' inert',(await p.evaluate(reviseEuropeHeaderPresentation,{key,revision:null})).length===0&&await p.content()===before);}
 await p.setContent(revision.before);await p.evaluate(()=>{document.querySelector('#main-content').setAttribute('data-rocket-location-hash','synthetic-source-only-marker');document.querySelectorAll('img').forEach((n,i)=>n.src='https://example.invalid/source-'+i+'.jpg');});
 check('read-only reference accepts semantic preimage despite source-only URL/Rocket attributes',(await p.evaluate(reviseEuropeHeaderSourceReference,{key:revision.key,revision})).length===1);
 for(const mutation of ['copy','heading','alt','id']){
  await p.setContent(revision.before);await p.evaluate(kind=>{switch(kind){case'copy':document.querySelector('.et_pb_text_inner p').append(' changed');break;case'heading':document.getElementById('europe-choosing').textContent+=' changed';break;case'alt':document.querySelector('img').alt='changed';break;case'id':document.getElementById('europe-more').id='changed';break;}},mutation);
  const before=await p.content();let rejected=false;try{await p.evaluate(reviseEuropeHeaderSourceReference,{key:revision.key,revision});}catch{rejected=true;}check('read-only reference '+mutation+' refuses atomically',rejected&&await p.content()===before);
 }
 for(const f of sources)check(f+' source still exact',sha(await readFile(f))===sourceHashes[f]);
}catch(e){checks.push({name:'fixture execution',pass:false,detail:e.stack});}finally{await browser.close();}
await mkdir(path.dirname(output),{recursive:true});const report={at:new Date().toISOString(),scope:'Detached/native DOM fixtures only; no hosting, source build, visible layout, provider or full-site acceptance.',sourceHashes,passed:checks.filter(c=>c.pass).length,total:checks.length,checks};await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
