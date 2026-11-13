import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fetchCompleteResponse} from './read-only-http.mjs';
const [base,output]=process.argv.slice(2);
if(!['http://127.0.0.1:5185','https://krawlthroughkrakow.com/staging'].includes(base)||!output)throw Error('Explicit local/staging base and new report required');
try{await readFile(output);throw Error('Preserve earlier report');}catch(error){if(error.code!=='ENOENT')throw error;}
const assets='staging/wp-content/mu-plugins/ktk-code-pages-assets';
const definitions=JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);$d=array();foreach(glob($argv[1].'/pages/*.php') as $f){$p=require $f;$d[]=$p;}echo json_encode($d);",assets],{maxBuffer:20e6}));
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const report={checkedAt:new Date().toISOString(),base,checks:[],images:[],errors:[],scope:'Initial HTML and actual image GETs only; no page scripts, forms, credentials or commerce requests.'};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',route=>route.abort());
 const images=new Map(),titles=new Set();
 for(const definition of definitions){
  const url=base+definition.route+(process.argv.includes('--cache-bust')?'?ktk_sharing_check='+Date.now():'');
  const response=await fetchCompleteResponse(url),markup=await response.text();
  const actual=await page.evaluate(markup=>{
   const doc=new DOMParser().parseFromString(markup,'text/html');
   const fields=[...doc.head.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]')].map(node=>({attribute:node.hasAttribute('property')?'property':'name',key:node.getAttribute('property')||node.name,value:node.content}));
   return {title:doc.title,description:doc.querySelector('meta[name="description"]')?.content||'',fields,robots:doc.querySelector('meta[name="robots"]')?.content};
  },markup);
  check(definition.key+' title/status/noindex',response.status===200&&actual.title===definition.title&&/noindex/i.test(actual.robots||''));
  check(definition.key+' exact description',actual.description===definition.description);
  check(definition.key+' unique page title',!titles.has(actual.title));titles.add(actual.title);
  if(definition.metadata){
   const expected=await page.evaluate(markup=>[...new DOMParser().parseFromString(markup,'text/html').querySelectorAll('meta')].map(node=>({attribute:node.hasAttribute('property')?'property':'name',key:node.getAttribute('property')||node.name,value:node.content})),definition.metadata.replaceAll('https://krawlthroughkrakow.com/','https://krawlthroughkrakow.com/staging/'));
   const normalized=rows=>JSON.stringify(rows.map(row=>[row.attribute,row.key,row.value]).sort());
   check(definition.key+' exact sharing tags without duplicates',normalized(actual.fields)===normalized(expected));
   const value=key=>expected.find(row=>row.key===key)?.value;
   if(value('og:image')){
    const url=new URL(value('og:image'));
    const prefix='/staging/wp-content/mu-plugins/ktk-code-pages-assets/';
    if(url.origin!=='https://krawlthroughkrakow.com'||!url.pathname.startsWith(prefix+'media/')||url.search||url.hash)throw Error('Unreviewed sharing image destination');
    const file=url.pathname.slice(prefix.length);
    if(!/^media\/[a-f0-9]{12}-[a-zA-Z0-9._-]+\.(?:png|jpe?g|webp)$/i.test(file))throw Error('Unexpected sharing file');
    images.set(file,{url:url.href,width:value('og:image:width'),height:value('og:image:height'),mime:value('og:image:type')});
   }
  }
 }
 for(const [file,expected] of images){
  const target=base.startsWith('http:')?base+'/ktk-code-pages-assets/'+file:expected.url;
  const response=await fetchCompleteResponse(target),bytes=Buffer.from(await response.arrayBuffer()),local=await readFile(assets+'/'+file);
  const dimensions=JSON.parse(execFileSync('php',['-r',"$s=getimagesize($argv[1]);echo json_encode(array($s[0],$s[1],$s['mime']));",assets+'/'+file],{encoding:'utf8'}));
  check(file+' actual image HTTP/type/hash/dimensions',response.status===200&&hash(bytes)===hash(local)&&response.headers.get('content-type')?.split(';')[0]===dimensions[2]&&expected.mime===dimensions[2]&&Number(expected.width)===dimensions[0]&&Number(expected.height)===dimensions[1]);
  report.images.push({file,bytes:bytes.length,width:dimensions[0],height:dimensions[1],sha256:hash(bytes)});
 }
}catch(error){report.errors.push(error.stack);}finally{
 await browser.close();report.passed=report.checks.filter(row=>row.pass).length;report.total=report.checks.length;
 await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,images:report.images.length,errors:report.errors,failed:report.checks.filter(row=>!row.pass)},null,2));
 if(report.errors.length||report.passed!==report.total)process.exitCode=1;
}
