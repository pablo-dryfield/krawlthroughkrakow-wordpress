import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
const [baseline,output]=process.argv.slice(2);if(!baseline||!output)throw Error('Clean reference and fresh report required');
try{await readFile(output);throw Error('Preserve prior evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const assets='staging/wp-content/mu-plugins/ktk-code-pages-assets/',key='post-all-you-need-to-know-about-visiting-auschwitz',checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const discovery='staging/wp-content/mu-plugins/ktk-seo-sitemap-assets/data.json';
const allowed=[assets+'content/'+key+'.html',assets+'pages/'+key+'.php',assets+'runtime.css',discovery].sort(),changed=[];
for(const name of execFileSync('git',['-C',baseline,'ls-files','-z','--','staging'],{encoding:'utf8'}).split('\0').filter(Boolean)){
 const a=await readFile(path.join(baseline,name)),b=await readFile(name);if(a.equals(b))check(name+' original bytes retained',true);else changed.push(name);
}
check('exact three content files plus one discovery binding boundary',JSON.stringify(changed.sort())===JSON.stringify(allowed),changed);
const oldDiscovery=JSON.parse(await readFile(path.join(baseline,discovery))),currentDiscovery=JSON.parse(await readFile(discovery)),definitionKey='ktk-code-pages-assets/pages/'+key+'.php';
oldDiscovery.sourceHashes[definitionKey]=currentDiscovery.sourceHashes[definitionKey];
check('all discovery URLs and policies exact except this page definition binding',JSON.stringify(oldDiscovery)===JSON.stringify(currentDiscovery));
const walk=async(dir,prefix='')=>{const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const name=prefix+entry.name;if(entry.isDirectory())files.push(...await walk(path.join(dir,entry.name),name+'/'));else files.push(name);}return files.sort();};
check('content asset inventory unchanged',JSON.stringify(await walk(assets))===JSON.stringify(await walk(path.join(baseline,assets))));
const oldCss=await readFile(path.join(baseline,assets,'runtime.css'),'utf8'),css=await readFile(assets+'runtime.css','utf8');
check('all original runtime CSS exact after one owned prefix',css.replace(/^\/\* BEGIN Memorial visitor guide \*\/[\s\S]*?\/\* END Memorial visitor guide \*\/\n\n/,'')===oldCss);
const definition=root=>JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);echo json_encode(require $argv[1]);",path.resolve(root,assets,'pages',key+'.php')],{encoding:'utf8'}));
const old=definition(baseline),current=definition('.'),oldDescription=old.description,newDescription=current.description;
const expected=structuredClone(old);expected.description=newDescription;
for(const graph of expected.schema)for(const entity of graph['@graph']||[graph])if(entity.description===oldDescription)entity.description=newDescription;
const before=await readFile(path.join(baseline,assets,'content',key+'.html'),'utf8'),after=await readFile(assets+'content/'+key+'.html','utf8');
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
 const result=await page.evaluate(({before,after,oldMetadata,newMetadata,oldDescription,newDescription})=>{
  const a=new DOMParser().parseFromString(before,'text/html'),b=new DOMParser().parseFromString(after,'text/html'),alt=b.querySelector('.et_post_meta_wrapper > img').alt;
  const identity={title:b.querySelector('h1').textContent,byline:b.querySelector('.author').textContent,published:b.querySelector('.published').textContent,markers:b.querySelectorAll('[data-ktk-memorial-review="2026-11-14"]').length};
  for(let i=0;i<12;i++){const selector='.et_pb_text_'+i+' .et_pb_text_inner';b.querySelector(selector).innerHTML=a.querySelector(selector).innerHTML;b.querySelector(selector).removeAttribute('data-ktk-memorial-review');}
  b.querySelector('.et_post_meta_wrapper > img').alt=a.querySelector('.et_post_meta_wrapper > img').alt;
  const directions=b.querySelector('[data-ktk-memorial-directions]');
  const directionsExact=!!directions&&directions.textContent==="View the Memorial's current directions and entrance map"&&directions.querySelector('a').getAttribute('href')==='https://www.auschwitz.org/en/visiting/getting-to-the-museum/'&&!b.querySelector('.et_pb_map_0');
  directions?.replaceWith(a.querySelector('.et_pb_map_0').cloneNode(true));
  const oldHead=new DOMParser().parseFromString(oldMetadata,'text/html'),newHead=new DOMParser().parseFromString(newMetadata,'text/html');
  for(const node of oldHead.querySelectorAll('meta')){
   const name=node.getAttribute('property')||node.getAttribute('name');
   if(['og:image:alt','twitter:image:alt'].includes(name))node.content=alt;
   if(['og:description','twitter:description'].includes(name)){if(node.content!==oldDescription)throw Error('Unexpected original sharing description');node.content=newDescription;}
  }
  return {outsideExact:a.body.innerHTML===b.body.innerHTML,directionsExact,metadataExact:oldHead.documentElement.outerHTML===newHead.documentElement.outerHTML,expectedMetadata:oldHead.head.innerHTML,alt,identity};
 },{before,after,oldMetadata:old.metadata,newMetadata:current.metadata,oldDescription,newDescription});
 expected.metadata=current.metadata;
 check('complete DOM outside12 copy targets, featured alt and one empty-map replacement exact',result.outsideExact);
 check('inert map replaced only with usable official directions link',result.directionsExact);
 check('exact original H1, author and publication date plus12 review markers',result.identity.title==='Everything you need to know about visiting Auschwitz'&&result.identity.byline==='Jess Campbell'&&result.identity.published==='Sep 5, 2019'&&result.identity.markers===12,result.identity);
 check('neutral visibly reviewed photo alt without invented gender/location',result.alt==='Person walking beside railway tracks towards a brick gate building under a cloudy sky.');
 check('sharing metadata only two image alts and two matching descriptions differ',result.metadataExact);
 check('all definition/schema fields exact except reviewed descriptions and sharing alts',JSON.stringify(expected)===JSON.stringify(current));
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),baseline,scope:'Exact source/structured data/current DOM preservation; no medical, commerce, home, artwork, dates, author, indexing or URL change. Not a visual or consent certificate.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
