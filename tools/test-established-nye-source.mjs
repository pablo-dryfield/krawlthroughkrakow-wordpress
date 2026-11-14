import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
const [baseline,output]=process.argv.slice(2);if(!/^[a-f0-9]{40}$/.test(baseline||'')||!output)throw Error('Exact baseline commit and fresh report required');
try{await readFile(output);throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const root='staging/wp-content/mu-plugins/ktk-code-pages-assets/',body=root+'content/post-krakow-new-years-eve.html',cssFile=root+'runtime.css',checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const old=file=>execFileSync('git',['show',baseline+':'+file],{maxBuffer:10*1024*1024}),changed=[];
for(const row of execFileSync('git',['ls-tree','-r',baseline,'--','staging'],{encoding:'utf8'}).trim().split('\n')){
 const [entry,file]=row.split('\t'),bytes=await readFile(file),actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');if(actual===entry.split(' ')[2])check(file+' original Git blob retained',true);else changed.push(file);
}
check('exactly one body and scoped runtime CSS change',JSON.stringify(changed.sort())===JSON.stringify([body,cssFile].sort()),changed);
check('no new application assets',!execFileSync('git',['ls-files','--others','--exclude-standard','--','staging'],{encoding:'utf8'}).trim());
const css=await readFile(cssFile,'utf8');check('all original CSS exact outside one owned block',css.split('/* BEGIN Established NYE guide */').length===2&&css.replace(/\/\* BEGIN Established NYE guide \*\/[\s\S]*?\/\* END Established NYE guide \*\/\n\n/,'')===old(cssFile).toString());
check('immutable asset manifest exact',createHash('sha256').update(await readFile('docs/code-pages/full-migration/assets.json')).digest('hex')==='f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691');
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());const result=await page.evaluate(({before,after})=>{
  const a=new DOMParser().parseFromString(before,'text/html'),b=new DOMParser().parseFromString(after,'text/html'),headings=d=>[...d.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(n=>{const original=d.createElement(n.getAttribute('data-ktk-heading-origin')||n.tagName);for(const attr of n.attributes)if(attr.name!=='data-ktk-heading-origin')original.setAttribute(attr.name,attr.value);original.innerHTML=n.innerHTML;return original.outerHTML;}),images=d=>[...d.querySelectorAll('img')].map(n=>n.outerHTML);
  const originalHeadings=headings(a),currentHeadings=headings(b),originalImages=images(a),currentImages=images(b),count=b.querySelectorAll('[data-ktk-established-nye-review="2026-11-14"]').length;
  for(let i=0;i<5;i++){const selector='.et_pb_text_'+i+' .et_pb_text_inner',n=b.querySelector(selector);n.innerHTML=a.querySelector(selector).innerHTML;n.removeAttribute('data-ktk-established-nye-review');}
  return {count,headingsExact:JSON.stringify(originalHeadings)===JSON.stringify(currentHeadings),sectionLevels:[...new DOMParser().parseFromString(after,'text/html').querySelectorAll('[data-ktk-established-nye-review] :is(h1,h2,h3,h4,h5,h6)')].map(n=>n.tagName),photosExact:originalImages.length===3&&JSON.stringify(originalImages)===JSON.stringify(currentImages),outsideExact:a.body.innerHTML===b.body.innerHTML};
 },{before:old(body).toString(),after:await readFile(body,'utf8')});
 check('all original heading labels, attributes and styling identities retained',result.headingsExact);
 check('one primary heading and five sibling section headings',JSON.stringify(result.sectionLevels)===JSON.stringify(['H1','H2','H2','H2','H2','H2']),result.sectionLevels);
 check('all three original photo references/attributes retained',result.photosExact);
 check('five reviewed modules and complete DOM outside them retained',result.count===5&&result.outsideExact,result);
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),baseline,scope:'Only five existing article text modules and one scoped CSS block; original metadata/definitions, photos, other115 bodies, home, discovery, commerce, forms and consent exact.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks};await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
