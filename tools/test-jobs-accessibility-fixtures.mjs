import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadJobsPageAccessibility,reviseJobsPageAccessibility} from './jobs-page-accessibility.mjs';
import {reviseSemanticHeadings} from './semantic-headings.mjs';
const output=process.argv[2];if(!output)throw Error('Fresh fixture report required');
try{await readFile(output);throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const revision=await loadJobsPageAccessibility(),require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const report={checkedAt:new Date().toISOString(),scope:'Detached raw/shared-semantic and exact dd06506 prepared Jobs fixtures; all requests blocked; no application write',checks:[]},check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const b=await chromium.launch({channel:'chrome',headless:true});
try{
 const c=await b.newContext({javaScriptEnabled:false});await c.route('**/*',r=>r.abort());const p=await c.newPage();
 for(const phase of ['raw','prepared']){
  const html=phase==='raw'?revision.sourceHtml:execFileSync('git',['show','dd06506d593e10366355b083da7f6f703f9e36ed:staging/wp-content/mu-plugins/ktk-code-pages-assets/content/pub-crawl-jobs.html'],{encoding:'utf8',maxBuffer:15e6});
  const setup=async()=>{await p.setContent(html);if(phase==='raw')await p.evaluate(reviseSemanticHeadings,{key:revision.key,kind:'page',title:'Pub Crawl Jobs',route:'/pub-crawl-jobs/'});};
  await setup();let result;
  try{result=await p.evaluate(({fn,revision})=>{
   const run=(0,eval)('('+fn+')'),before=document.documentElement.cloneNode(true),evidence=run({key:revision.key,revision}),after=document.documentElement.cloneNode(true),inverse=after.cloneNode(true),same=s=>JSON.stringify([...before.querySelectorAll(s)].map(n=>n.outerHTML))===JSON.stringify([...after.querySelectorAll(s)].map(n=>n.outerHTML));
   const rename=(node,tag)=>{const n=document.createElement(tag);for(const a of node.attributes)n.setAttribute(a.name,a.value);n.append(...node.childNodes);node.replaceWith(n);return n;};
   for(const n of inverse.querySelectorAll('[data-ktk-jobs-section]')){const p=rename(n,'p');p.removeAttribute('data-ktk-heading-origin');}
   for(const n of inverse.querySelectorAll('[data-ktk-jobs-subheading]')){const h=rename(n,'h2');if(h.dataset.ktkHeadingOrigin==='h2')h.removeAttribute('data-ktk-heading-origin');}
   inverse.querySelector('[data-ktk-jobs-title]').textContent='WORK FOR THE BIGGEST PUB CRAWL IN EUROPE';
   const intro=inverse.querySelector('[data-ktk-jobs-intro]');intro.firstChild.textContent=intro.firstChild.textContent.replace('Working with Krawl Through Krakow','Working for the biggest Krakow’s Pub Crawl');
   for(const n of inverse.querySelectorAll('*'))for(const a of [...n.attributes])if(a.name.startsWith('data-ktk-jobs-'))n.removeAttribute(a.name);
   const once=document.documentElement.outerHTML,repeat=run({key:revision.key,revision});
   return {count:evidence.length,inverse:inverse.outerHTML===before.outerHTML,repeat:!repeat.length&&once===document.documentElement.outerHTML,forms:same('form,input,select,textarea,button'),media:same('img,video,svg,iframe,source'),links:same('a'),ids:JSON.stringify([...before.querySelectorAll('[id]')].map(n=>n.id))===JSON.stringify([...after.querySelectorAll('[id]')].map(n=>n.id)),footer:same('.et_pb_text_8,.et_pb_text_9,.et_pb_text_10,.et_pb_text_11,.et_pb_text_12,.et_pb_text_13,.et_pb_text_14'),headings:[...after.querySelectorAll('#main-content h1,#main-content h2,#main-content h3')].map(n=>({tag:n.tagName,text:n.textContent.trim()})),copy:after.querySelectorAll('[data-ktk-jobs-copy]').length};
  },{fn:reviseJobsPageAccessibility.toString(),revision});}catch(e){result={error:e.message};}
  check(phase+' applies complete reviewed candidate',!result.error&&result.count===19&&result.copy===18,result);
  if(result.error)continue;
  for(const f of ['inverse','repeat','forms','media','links','ids','footer'])check(phase+' '+f,result[f]);
  const tags=result.headings.map(n=>n.tag);check(phase+' reviewed full outline',JSON.stringify(tags)===JSON.stringify(['H1','H2','H2',...Array(5).fill('H3'),'H2',...Array(6).fill('H3'),'H2','H3','H2','H2','H2']),result.headings);
  for(const test of ['identity','sha','missing-title','title-copy','missing-label','label-attribute','label-link','late-blurb','late-container-attribute','extra-control','intro-copy','guide-link-copy','missing-semantic-pass','source-label','unknown-marker','unknown-marker-name','partial','revised-copy','revised-level','revised-clearance']){
   await setup();const negative=await p.evaluate(({fn,revision,test})=>{
    const run=(0,eval)('('+fn+')'),row=structuredClone(revision),main=document.querySelector('#main-content');
    if(test==='identity')row.version='changed';if(test==='sha')row.sourceSha256='0'.repeat(64);
    if(test==='missing-title')main.querySelector('h1').remove();if(test==='title-copy')main.querySelector('h1').append(' changed');
    const label=main.querySelector('.et_pb_text_7 p'),last=main.querySelector('.et_pb_blurb_10 .et_pb_blurb_container');
    if(test==='missing-label')label.remove();if(test==='label-attribute')label.setAttribute('data-unreviewed','1');if(test==='label-link')label.innerHTML='<a href="/">apply now!</a>';
    if(test==='late-blurb')last.append(' extra');if(test==='late-container-attribute')last.setAttribute('style','padding:0');if(test==='extra-control')last.append(document.createElement('input'));
    if(test==='intro-copy')main.querySelector('.et_pb_text_1 p').append(' changed');
    if(test==='guide-link-copy')main.querySelector('.et_pb_text_6 a').href='https://example.invalid/';
    if(test==='missing-semantic-pass')main.removeAttribute('data-ktk-semantic-headings');
    if(test==='source-label')row.sourceHtml=row.sourceHtml.replace('<p>apply now!</p>','<p>changed</p>');
    if(test==='unknown-marker')main.lastElementChild.setAttribute('data-ktk-jobs-copy','unknown');
    if(test==='unknown-marker-name')main.lastElementChild.setAttribute('data-ktk-jobs-unknown','1');
    if(['partial','revised-copy','revised-level','revised-clearance'].includes(test)){
     run({key:row.key,revision:row});
     if(test==='partial')main.querySelector('[data-ktk-jobs-title]').removeAttribute('data-ktk-jobs-title');
     if(test==='revised-copy')main.querySelector('[data-ktk-jobs-intro]').append(' changed');
     if(test==='revised-level'){const h=main.querySelector('[data-ktk-jobs-section]'),n=document.createElement('h3');for(const a of h.attributes)n.setAttribute(a.name,a.value);n.innerHTML=h.innerHTML;h.replaceWith(n);}
     if(test==='revised-clearance')main.querySelector('[data-ktk-jobs-copy]').removeAttribute('data-ktk-jobs-copy');
    }
    const before=document.documentElement.outerHTML;let rejected=false,message;try{run({key:row.key,revision:row});}catch(e){rejected=true;message=e.message;}
    return {rejected,atomic:before===document.documentElement.outerHTML,message};
   },{fn:reviseJobsPageAccessibility.toString(),revision,test});check(phase+' rejects '+test+' atomically',negative.rejected&&negative.atomic,negative);
  }
 }
 await c.close();
}finally{await b.close();}
report.summary={passed:report.checks.filter(c=>c.pass).length,total:report.checks.length};await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,failed:report.checks.filter(c=>!c.pass)},null,2));if(report.summary.passed!==report.summary.total)process.exitCode=1;
