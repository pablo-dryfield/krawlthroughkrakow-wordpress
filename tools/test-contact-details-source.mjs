import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
const [baseline,output]=process.argv.slice(2);if(!/^[a-f0-9]{40}$/.test(baseline||'')||!output)throw Error('Exact baseline commit and fresh report required');
try{await readFile(output);throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const root='staging/wp-content/mu-plugins/ktk-code-pages-assets/',discovery='staging/wp-content/mu-plugins/ktk-seo-sitemap-assets/data.json',checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const old=file=>execFileSync('git',['show',baseline+':'+file],{maxBuffer:20*1024*1024});
const allowed=[root+'content/contact.html',root+'pages/contact.php',root+'runtime.css',discovery].sort(),changed=[];
const files=execFileSync('git',['ls-tree','-r',baseline,'--','staging'],{encoding:'utf8'}).trim().split('\n');
for(const row of files){const [entry,file]=row.split('\t'),oid=entry.split(' ')[2],bytes=await readFile(file),actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');if(actual===oid)check(file+' original Git blob bytes retained',true);else changed.push(file);}
check('only Contact body/definition/CSS and matching discovery binding change',JSON.stringify(changed.sort())===JSON.stringify(allowed),changed);
const a=JSON.parse(old(discovery)),b=JSON.parse(await readFile(discovery)),binding='ktk-code-pages-assets/pages/contact.php';a.sourceHashes[binding]=b.sourceHashes[binding];
check('discovery URLs/policies and all other bindings exact',JSON.stringify(a)===JSON.stringify(b));
const css=await readFile(root+'runtime.css','utf8');check('original runtime CSS exact outside single owned Contact block',css.split('/* BEGIN Contact details */').length===2&&css.replace(/\/\* BEGIN Contact details \*\/[\s\S]*?\/\* END Contact details \*\/\n\n/,'')===old(root+'runtime.css').toString());
check('immutable source asset manifest exact',createHash('sha256').update(await readFile('docs/code-pages/full-migration/assets.json')).digest('hex')==='f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691');
const definition=file=>JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);echo json_encode(require $argv[1]);",path.resolve(file)],{encoding:'utf8'}));
const current=definition(root+'pages/contact.php'),originalText=old(root+'pages/contact.php').toString(),match=originalText.match(/return json_decode\('([\s\S]*)', true\);/);
const original=JSON.parse(match[1].replace(/\\'/g,"'").replace(/\\\\/g,'\\')),expected=structuredClone(original);
for(const graph of expected.schema)for(const entity of graph['@graph']||[graph]){
 if(entity['@type']==='ContactPage')entity.name='Contact Us';
 if(entity['@type']==='BreadcrumbList')entity.itemListElement.at(-1).name='Contact Us';
}
check('all metadata/form/route/SEO/schema data exact except two literal Contact names',JSON.stringify(current)===JSON.stringify(expected));
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
 const result=await page.evaluate(({before,after})=>{
  const a=new DOMParser().parseFromString(before,'text/html'),b=new DOMParser().parseFromString(after,'text/html');
  const formExact=a.querySelector('form').outerHTML===b.querySelector('form').outerHTML;
  const mapA=a.querySelector('.et_pb_code_0 .et_pb_code_inner'),mapB=b.querySelector('.et_pb_code_0 .et_pb_code_inner'),frameA=mapA.querySelector('iframe'),frameB=mapB.querySelector('iframe');
  const title=frameB.title;frameB.title=frameA.title;const frameExact=frameB.outerHTML===frameA.outerHTML;
  const primary=[...b.querySelectorAll('h1')].map(n=>n.textContent),support=b.querySelector('.et_pb_heading_0 .et_pb_module_heading').tagName;
  for(const selector of ['.et_pb_text_0 .et_pb_text_inner','.et_pb_heading_0 .et_pb_heading_container','.et_pb_text_2 .et_pb_text_inner','.et_pb_code_0 .et_pb_code_inner']){
   const original=a.querySelector(selector),candidate=b.querySelector(selector);candidate.innerHTML=original.innerHTML;candidate.removeAttribute('data-ktk-contact-copy');candidate.removeAttribute('data-ktk-contact-map');
  }
  b.querySelector('a[href^="mailto:"]').setAttribute('href',a.querySelector('a[href^="mailto:"]').getAttribute('href'));
  return {formExact,frameExact,title,primary,support,outsideExact:a.body.innerHTML===b.body.innerHTML};
 },{before:old(root+'content/contact.html').toString(),after:await readFile(root+'content/contact.html','utf8')});
 check('all form markup, fields, endpoint and hidden routing inputs unchanged',result.formExact);
 check('original iframe and consent source exact except meaningful title',result.frameExact&&result.title==='Krawl Through Krakow map');
 check('one literal Contact Us H1 and support H2',result.primary.length===1&&result.primary[0]==='Contact Us'&&result.support==='H2',result);
 check('all DOM outside reviewed copy/map/email/title levels exact',result.outsideExact);
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),baseline,scope:'Source-bound Contact-only content and additive CSS; original forms, runtime/consent, other115 bodies, media, home and commerce preserved. Not a visual or privacy certificate.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
