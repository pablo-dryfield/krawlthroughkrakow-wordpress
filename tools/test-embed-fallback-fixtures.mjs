import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadEmbedFallbacks,reviseEmbedFallbacks} from './embed-fallbacks.mjs';
import {loadOperatorTrustEditorial,reviseOperatorTrustEditorial} from './operator-trust-editorial.mjs';

const output=process.argv[2];if(!output)throw Error('Fresh fixture report required');
try{await readFile(output);throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const rows=await loadEmbedFallbacks(),operator=await loadOperatorTrustEditorial(),require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const report={checkedAt:new Date().toISOString(),scope:'Detached raw/prepared DOM fixtures, every request blocked; no application write',checks:[]},check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({javaScriptEnabled:false});await context.route('**/*',r=>r.abort());const page=await context.newPage();
  for(const row of rows)for(const phase of ['raw','prepared']){
    const html=phase==='raw'?row.sourceHtml:execFileSync('git',['show','71e2546f6e96fba4da85026be9812159e76c5d2b:staging/wp-content/mu-plugins/ktk-code-pages-assets/content/'+row.key+'.html'],{encoding:'utf8',maxBuffer:15e6});
    async function setup(){
      await page.setContent(html);
      // Match the existing builder's provider duplicate removal before bounded recipes.
      if(phase==='raw')await page.evaluate(()=>document.querySelectorAll('#main-content script,#main-content style,#main-content noscript').forEach(n=>n.remove()));
      if(row.key==='testimonials'&&phase==='raw')await page.evaluate(reviseOperatorTrustEditorial,{key:row.key,revision:operator.find(x=>x.key===row.key)});
    }
    await setup();
    let result;
    try{result=await page.evaluate(({fn,row})=>{
      const run=(0,eval)('('+fn+')'),before=document.documentElement.cloneNode(true),evidence=run({key:row.key,revision:row}),after=document.documentElement.cloneNode(true),inverse=after.cloneNode(true);
      inverse.querySelectorAll('[data-ktk-embed-notice],[data-ktk-embed-alternative]').forEach(n=>n.remove());inverse.querySelectorAll('[data-ktk-embed-fallback]').forEach(n=>n.removeAttribute('data-ktk-embed-fallback'));
      const same=s=>JSON.stringify([...before.querySelectorAll(s)].map(n=>n.outerHTML))===JSON.stringify([...after.querySelectorAll(s)].map(n=>n.outerHTML));
      const once=document.documentElement.outerHTML,repeat=run({key:row.key,revision:row});
      return {evidence,inverse:inverse.outerHTML===before.outerHTML,repeat:!repeat.length&&document.documentElement.outerHTML===once,frames:same('iframe'),images:same('img,video,svg'),forms:same('form,input,select,textarea'),headings:same('h1,h2,h3,h4,h5,h6'),originalLinks:[...before.querySelectorAll('a')].every((n,i)=>n.outerHTML===[...after.querySelectorAll('a')].filter(a=>!a.closest('[data-ktk-embed-alternative]'))[i]?.outerHTML),counts:[after.querySelectorAll('[data-ktk-embed-fallback]').length,after.querySelectorAll('[data-ktk-embed-notice]').length,after.querySelectorAll('[data-ktk-embed-alternative]').length],links:[...after.querySelectorAll('[data-ktk-embed-alternative] a')].map(a=>({href:a.getAttribute('href'),target:a.getAttribute('target'),rel:a.getAttribute('rel'),text:a.textContent}))};
    },{fn:reviseEmbedFallbacks.toString(),row});}catch(e){result={error:e.message};}
    check(row.key+' '+phase+' applies',!result.error,result.error);if(result.error)continue;
    check(row.key+' '+phase+' exact fallback count',result.evidence.length===row.indices.length&&result.counts.every(n=>n===row.indices.length),result);
    for(const f of ['inverse','repeat','frames','images','forms','headings','originalLinks'])check(row.key+' '+phase+' '+f,result[f]);
    check(row.key+' '+phase+' native links safe and named',result.links.every(a=>a.text&& (a.href.startsWith('#')?a.href==='#ktk-review-platform-title'&&!a.target: a.target==='_blank'&&a.rel==='noopener noreferrer'&&/^https:\/\//.test(a.href))),result.links);
    const negatives=['identity','source-sha','indices','missing-frame','late-attribute','parent-class','parent-text','parent-child','module-attribute','duplicate-frame','marker-collision','partial','notice-copy','bar-link','original-source',...(row.key==='post-2020-krakow-nightlife-guide'?['retained-instagram']:[]),...(row.key==='testimonials'?['review-anchor']:[])];
    for(const test of negatives){
      await setup();const negative=await page.evaluate(({fn,row,test})=>{
        const run=(0,eval)('('+fn+')'),revision=structuredClone(row),main=document.querySelector('#main-content'),frames=[...main.querySelectorAll('iframe')].filter(n=>!n.closest('noscript')),last=frames[row.indices.at(-1)],parent=last.parentElement,module=last.closest('.et_pb_code,.et_pb_video,.et_pb_text,.et_pb_module')||parent;
        if(test==='identity')revision.version='changed';
        if(test==='source-sha')revision.sourceSha256='0'.repeat(64);
        if(test==='indices')revision.indices.pop();
        if(test==='missing-frame')last.remove();
        if(test==='late-attribute')last.setAttribute('title','changed original title');
        if(test==='parent-class')parent.classList.add('unexpected-parent-class');
        if(test==='parent-text')parent.append('unexpected text');
        if(test==='parent-child')parent.append(document.createElement('form'));
        if(test==='module-attribute')module.setAttribute('data-unreviewed','1');
        if(test==='duplicate-frame')last.after(last.cloneNode(true));
        if(test==='marker-collision'){const p=document.createElement('p');p.dataset.ktkEmbedNotice='unknown';main.append(p);}
        if(test==='original-source')revision.sourceHtml=revision.sourceHtml.replace(/<iframe /,'<iframe data-unknown="1" ');
        if(test==='retained-instagram')frames[6].setAttribute('title','changed retained Instagram frame');
        if(test==='review-anchor')main.querySelector('#ktk-review-platform-title').removeAttribute('id');
        if(['partial','notice-copy','bar-link'].includes(test)){
          run({key:row.key,revision});
          if(test==='partial')main.querySelector('[data-ktk-embed-fallback]').removeAttribute('data-ktk-embed-fallback');
          if(test==='notice-copy')main.querySelector('[data-ktk-embed-notice]').append(' changed');
          if(test==='bar-link')main.querySelector('[data-ktk-embed-alternative] a').setAttribute('href','https://example.invalid/');
        }
        const before=document.documentElement.outerHTML;let rejected=false,message;try{run({key:row.key,revision});}catch(e){rejected=true;message=e.message;}
        return {rejected,atomic:before===document.documentElement.outerHTML,message};
      },{fn:reviseEmbedFallbacks.toString(),row,test});
      check(row.key+' '+phase+' rejects '+test+' atomically',negative.rejected&&negative.atomic,negative);
    }
  }
  await context.close();
}finally{await browser.close();}
report.summary={passed:report.checks.filter(c=>c.pass).length,total:report.checks.length};await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,failed:report.checks.filter(c=>!c.pass)},null,2));if(report.summary.passed!==report.summary.total)process.exitCode=1;
