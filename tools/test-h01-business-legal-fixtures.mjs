import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadH01BusinessLegalEditorial,reviseH01BusinessLegalEditorial,h01CompetitionSummary,reviseH01CompetitionSummary} from './h01-business-legal-editorial.mjs';

const output=process.argv[2];if(!output)throw Error('Fresh H01 fixture report required');
try{await readFile(output);throw Error('Preserve earlier H01 fixture evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
try{
 const context=await browser.newContext({javaScriptEnabled:false});await context.route('**/*',r=>r.abort());const page=await context.newPage();
 const revisions=await loadH01BusinessLegalEditorial();
 check('Four exact reviewed page identities',JSON.stringify(revisions.map(r=>r.key))===JSON.stringify(['terms-and-conditions','privacy-policy','tour-service-disclaimer','post-welcome-to-alcohol']));
 for(const row of revisions){
  const source=execFileSync('git',['show','6ac86777f48397e981a90cc7ed8667db6ab91675:staging/wp-content/mu-plugins/ktk-code-pages-assets/content/'+row.key+'.html'],{encoding:'utf8',maxBuffer:1e7});
  await page.setContent(source);
  const result=await page.evaluate(({fn,row})=>{
   const run=(0,eval)('('+fn+')'),before=document.documentElement.cloneNode(true),evidence=run({key:row.key,revision:row}),after=document.documentElement.cloneNode(true),inverse=after.cloneNode(true);
   for(const target of row.original){const node=inverse.querySelector(target.selector);node.innerHTML=before.querySelector(target.selector).innerHTML;node.removeAttribute('data-ktk-h01-review');}
   const same=selector=>JSON.stringify([...before.querySelectorAll(selector)].map(n=>n.outerHTML))===JSON.stringify([...after.querySelectorAll(selector)].map(n=>n.outerHTML));
   const full=document.documentElement.outerHTML,repeat=run({key:row.key,revision:row});
   return{evidence,inverse:inverse.outerHTML===before.outerHTML,repeat:repeat.length===0&&document.documentElement.outerHTML===full,forms:same('form,input,textarea,select,button'),media:same('img,picture,iframe,video,svg'),operator:same('[data-ktk-operator-details]'),title:same('h1'),text:document.querySelector('#main-content').textContent};
  },{fn:reviseH01BusinessLegalEditorial.toString(),row});
  check(row.key+' reviewed text applies once',result.evidence.length===1&&result.evidence[0].textModules===row.original.length);
  for(const field of ['inverse','repeat','forms','media','operator','title'])check(row.key+' '+field,result[field]);
  if(row.key==='post-welcome-to-alcohol')check('Monthly judging, next-month use and separate publication permission',result.text.includes('end of each month')&&result.text.includes('must use the prize in December')&&result.text.includes('separate permission')&&!result.text.includes('no entry deadline currently set')&&!result.text.includes('not set an entry deadline'));
  if(row.key==='terms-and-conditions')check('Terms remove US law, implicit marketing and liability cap',result.text.includes('governed by Polish law')&&!result.text.includes('laws of USA')&&!result.text.includes('you agree to subscribe')&&!result.text.includes('LIMITED TO THE AMOUNT PAID'));
  if(row.key==='privacy-policy')check('Privacy removes automatic marketing and unsupported transfer consent',result.text.includes('does not automatically subscribe')&&result.text.includes('not an unlimited keep-forever policy')&&!result.text.includes('we transfer the data, including Personal Data, to USA')&&!result.text.includes('represents your agreement to that transfer')&&!result.text.includes('passport details'));
  if(row.key==='tour-service-disclaimer')check('Disclaimer retains 18+/ID and removes blanket injury waiver',result.text.includes('18 years old')&&result.text.includes('identification is recommended')&&!result.text.includes('cannot accept any responsibility')&&result.text.includes('remains responsible'));
  for(const test of ['identity','late-copy','protected-form','new-media','active-link','marker',...(row.original.length>1?['partial']:[])]){
   await page.setContent(source);
   const negative=await page.evaluate(({fn,row,test})=>{
    const run=(0,eval)('('+fn+')'),revision=structuredClone(row),last=document.querySelector(row.original.at(-1).selector);
    if(test==='identity')revision.version='unreviewed';
    if(test==='late-copy')last.append(document.createTextNode('source drift'));
    if(test==='protected-form')last.append(document.createElement('form'));
    if(test==='new-media')revision.markup=revision.markup.replace('</template>','<img src="x"></template>');
    if(test==='active-link')revision.markup=revision.markup.replace('</template>','<a href="javascript:alert(1)">unsafe</a></template>');
    if(test==='marker')last.setAttribute('data-ktk-h01-review','unreviewed');
    if(test==='partial')document.querySelector(row.original[0].selector).setAttribute('data-ktk-h01-review',revision.version);
    const before=document.documentElement.outerHTML;let rejected=false,error;
    try{run({key:row.key,revision});}catch(e){rejected=true;error=e.message;}
    return{rejected,unchanged:document.documentElement.outerHTML===before,error};
   },{fn:reviseH01BusinessLegalEditorial.toString(),row,test});
   check(row.key+' refuses '+test+' atomically',negative.rejected&&negative.unchanged,negative.error);
  }
 }
 for(const key of h01CompetitionSummary.keys){
  const source=execFileSync('git',['show','6ac86777f48397e981a90cc7ed8667db6ab91675:staging/wp-content/mu-plugins/ktk-code-pages-assets/content/'+key+'.html'],{encoding:'utf8',maxBuffer:1e7});
  await page.setContent(source);
  const result=await page.evaluate(({fn,key,row})=>{
   const run=(0,eval)('('+fn+')'),before=document.documentElement.cloneNode(true),evidence=run({key,revision:row}),after=document.documentElement.cloneNode(true),inverse=after.cloneNode(true),node=inverse.querySelector('[data-ktk-h01-summary]');
   node.replaceWith([...before.querySelectorAll('p[data-ktk-reviewed-summary]')].find(n=>n.textContent.trim()===row.original).cloneNode(true));
   const full=document.documentElement.outerHTML,repeat=run({key,revision:row});
   return{applies:evidence.length===1,inverse:inverse.outerHTML===before.outerHTML,repeat:repeat.length===0&&document.documentElement.outerHTML===full};
  },{fn:reviseH01CompetitionSummary.toString(),key,row:h01CompetitionSummary});
  for(const field of ['applies','inverse','repeat'])check(key+' competition summary '+field,result[field]);
  for(const test of ['duplicate','changed-link','nested-markup','changed-copy','marker']){
   await page.setContent(source);
   const result=await page.evaluate(({fn,key,row,test})=>{
    const node=[...document.querySelectorAll('p[data-ktk-reviewed-summary]')].find(n=>n.textContent.trim()===row.original);
    if(test==='duplicate')node.parentElement.append(node.cloneNode(true));
    if(test==='changed-link')node.closest('article').querySelectorAll('a[href="__KTK_HOME_URL__welcome-to-alcohol/"]').forEach(n=>n.href='https://example.invalid/');
    if(test==='nested-markup')node.innerHTML='<strong>'+node.textContent+'</strong>';
    if(test==='changed-copy')node.textContent+=' source drift';
    if(test==='marker')node.setAttribute('data-ktk-h01-summary','unreviewed');
    const before=document.documentElement.outerHTML;let refused=false;try{(0,eval)('('+fn+')')({key,revision:row});}catch{refused=true;}
    return refused&&document.documentElement.outerHTML===before;
   },{fn:reviseH01CompetitionSummary.toString(),key,row:h01CompetitionSummary,test});
   check(key+' refuses summary '+test+' atomically',result);
  }
 }
 await page.setContent('<main id="main-content"><p>Unrelated page</p></main>');
 const unrelated=await page.evaluate(fn=>{const run=(0,eval)('('+fn+')'),before=document.documentElement.outerHTML;return run({key:'contact'}).length===0&&before===document.documentElement.outerHTML;},reviseH01BusinessLegalEditorial.toString());
 check('Unrelated route remains exact',unrelated);
}catch(error){check('Fixture execution completes',false,error.message);}finally{await browser.close();}
const report={total:checks.length,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass),checks,formSubmissions:0,realEmails:0,networkForwarded:0};
await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed}));if(report.failed.length)process.exitCode=1;
