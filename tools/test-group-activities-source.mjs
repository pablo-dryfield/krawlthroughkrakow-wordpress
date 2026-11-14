import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadGroupActivitiesEditorial} from './group-activities-editorial.mjs';
const [baseline,output]=process.argv.slice(2);
if(!/^[a-f0-9]{40}$/.test(baseline||'')||!output)throw Error('Exact baseline and fresh output required');
try{await readFile(output);throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const root='staging/wp-content/mu-plugins/ktk-code-pages-assets/',rows=await loadGroupActivitiesEditorial(),expected=[...rows.map(r=>root+'content/'+r.key+'.html'),root+'runtime.css'].sort(),checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail}),changed=[];
for(const row of execFileSync('git',['ls-tree','-r',baseline,'--','staging'],{encoding:'utf8'}).trim().split('\n')){
 const [entry,file]=row.split('\t'),bytes=await readFile(file),sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(sha===entry.split(' ')[2])check(file+' original Git blob retained',true);else changed.push(file);
}
check('Only two activity bodies and scoped runtime CSS change',JSON.stringify(changed.sort())===JSON.stringify(expected),changed);
const css=await readFile(root+'runtime.css','utf8'),block='/* BEGIN Group activity clarity */\nbody.ktk-code-page #main-content [data-ktk-group-activity-review] { text-align: left; }\n@media (max-width: 600px) {\n  body.ktk-code-page #main-content [data-ktk-group-activity-review] { padding-right: 24px; }\n}\nbody.ktk-code-page[data-ktk-page="krakow-stag-do"] #main-content .et_pb_row_16:has([data-ktk-group-activity-review]) { max-height: none; }\n/* END Group activity clarity */\n\n';
check('Only reviewed mobile clearance, text alignment and intrinsic kart-row height CSS is added',css.split(block).length===2&&css.replace(block,'')===execFileSync('git',['show',baseline+':'+root+'runtime.css'],{encoding:'utf8'}));
check('No new application files',!execFileSync('git',['ls-files','--others','--exclude-standard','--','staging'],{encoding:'utf8'}).trim());
check('Immutable original media/style manifest retained',createHash('sha256').update(await readFile('docs/code-pages/full-migration/assets.json')).digest('hex')==='f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691');
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
 for(const r of rows){
  const file=root+'content/'+r.key+'.html',before=execFileSync('git',['show',baseline+':'+file],{encoding:'utf8',maxBuffer:10*1024*1024}),result=await page.evaluate(({before,after,markup})=>{
   const a=new DOMParser().parseFromString(before,'text/html'),b=new DOMParser().parseFromString(after,'text/html'),t=new DOMParser().parseFromString(markup,'text/html'),parts=[...t.querySelectorAll('template')],serialize=(doc,selector)=>[...doc.querySelectorAll(selector)].map(n=>n.outerHTML);
   const unchanged=selector=>JSON.stringify(serialize(a,selector))===JSON.stringify(serialize(b,selector));
   const protectedNodes=unchanged('form')&&unchanged('h1,h2')&&unchanged('img,svg,iframe,video')&&unchanged('button')&&unchanged('[id] > h1');
   const originalLinks=serialize(a,'a'),extra=b.querySelector('[data-ktk-group-activity-review] a[href="https://www.gov.uk/foreign-travel-advice/poland/safety-and-security"]');
   const count=b.querySelectorAll('[data-ktk-group-activity-review]').length,exact=parts.every(p=>{const nodes=b.querySelectorAll('#main-content '+p.dataset.target);return nodes.length===1&&nodes[0].innerHTML===p.innerHTML.trim()&&nodes[0].dataset.ktkGroupActivityReview==='2026-11-14';});
   for(const p of parts){const old=a.querySelector('#main-content '+p.dataset.target),n=b.querySelector('#main-content '+p.dataset.target);n.innerHTML=old.innerHTML;n.removeAttribute('data-ktk-group-activity-review');}
   return {protectedNodes,exact,count,links:JSON.stringify(originalLinks)===JSON.stringify(serialize(b,'a')),outside:a.body.innerHTML===b.body.innerHTML,hasOfficialAdvice:!!extra};
  },{before,after:await readFile(file,'utf8'),markup:r.markup});
  check(r.key+' exact seven-target source templates',result.exact&&result.count===(r.key==='krakow-stag-do'?6:1),result);
  check(r.key+' all other DOM/controls/headings/media/links exact',result.protectedNodes&&result.links&&result.outside,result);
  check(r.key+' only stag safety paragraph adds an official advice link',result.hasOfficialAdvice===(r.key==='krakow-stag-do'),result);
 }
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),baseline,scope:'Seven reviewed inner text modules only; exact inverse proves all other DOM and application files retained.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks};await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
