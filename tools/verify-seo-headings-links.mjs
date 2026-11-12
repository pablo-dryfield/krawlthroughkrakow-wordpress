import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {composeCodePage} from './code-page-template.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const option=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const output=option('--output');
if(!output)throw new Error('A new output report is required');
try{await readFile(output);throw new Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const base='https://krawlthroughkrakow.com/staging';
const bust=process.argv.includes('--cache-bust')?'?ktk_heading_check='+Date.now():'';
const assets='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const payload=JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);$a=$argv[1];$r=require $a.'registry.php';$o=array();foreach($r['routes'] as $url=>$entry){$o[$url]=require $a.$entry['file'];}echo json_encode(array('pages'=>$o,'redirects'=>$r['redirects']));",assets],{encoding:'utf8',maxBuffer:8e6}));
const agents={desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36',
 android:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/154.0.0.0 Mobile Safari/537.36',
 ipad:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'};
const report={checkedAt:new Date().toISOString(),base,cacheBust:!!bust,checks:[],responses:[],errors:[],mutations:0};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const get=async(url,agent,method='GET')=>{
 for(let attempt=0;attempt<3;attempt++)try{return await fetch(url,{redirect:'manual',method,headers:{'User-Agent':agent},signal:AbortSignal.timeout(60000)});}catch(error){if(attempt===2)throw error;}
};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const parser=await browser.newPage({javaScriptEnabled:false});await parser.route('**/*',route=>route.abort());
 const facts=html=>parser.evaluate(markup=>{
  const doc=new DOMParser().parseFromString(markup,'text/html');
  const clean=value=>(value||'').replace(/\s+/g,' ').trim();
  const main=doc.querySelector('#main-content'),copy=main?.cloneNode(true);
  copy?.querySelectorAll('script,style,noscript,form').forEach(node=>node.remove());
  copy?.querySelectorAll('[data-cfemail]').forEach(node=>{
   const hex=node.getAttribute('data-cfemail');if(!/^(?:[a-f0-9]{2}){2,}$/i.test(hex||''))return;
   const key=parseInt(hex.slice(0,2),16);node.textContent=hex.slice(2).match(/../g).map(part=>String.fromCharCode(parseInt(part,16)^key)).join('');
  });
  return {headings:[...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(node=>({tag:node.tagName,text:clean(node.textContent)})),
   text:clean(copy?.textContent),images:main?.querySelectorAll('img').length,sections:main?.querySelectorAll('.et_pb_section').length,
   forms:[...doc.querySelectorAll('form')].map(node=>({id:node.id,method:node.getAttribute('method'),fields:[...node.querySelectorAll('[name]')].map(input=>input.name)})),
   links:[...doc.querySelectorAll('a[href],[data-parity-href]')].map(node=>node.getAttribute('href')||node.getAttribute('data-parity-href')),
   canonical:[...doc.querySelectorAll('link[rel="canonical"]')].map(node=>node.getAttribute('href')),
   robots:[...doc.querySelectorAll('meta[name="robots"]')].map(node=>node.content),
   styles:[...doc.querySelectorAll('link[rel="stylesheet"]')].map(node=>node.getAttribute('href')),
   fragments:[...doc.querySelectorAll('a[href^="#"]')].map(node=>node.getAttribute('href')).filter(href=>href.length>1).filter(href=>{
    try{return !doc.getElementById(decodeURIComponent(href.slice(1)));}catch{return true;}
   })};
 },html);
 const verifiedAssets=new Set();
 for(const [route,definition] of Object.entries(payload.pages)){
  const expected=await facts(composeCodePage(await readFile(assets+definition.shell_file,'utf8'),await readFile(assets+definition.main_file,'utf8')));
  for(const [device,agent] of Object.entries(agents)){
   const response=await get(base+route+bust,agent),actual=await facts(await response.text()),name=device+' '+route;
   report.responses.push({route,device,status:response.status,cache:response.headers.get('cf-cache-status'),age:response.headers.get('age')});
   check(name+' HTTP200',response.status===200);
   check(name+' exact reviewed heading sequence',JSON.stringify(actual.headings)===JSON.stringify(expected.headings),actual.headings.filter(node=>node.tag==='H1'));
   check(name+' one meaningful H1',actual.headings.filter(node=>node.tag==='H1').length===1&&actual.headings.filter(node=>node.tag==='H1').every(node=>node.text));
   check(name+' no skipped heading levels',actual.headings.every((node,index)=>Number(node.tag.slice(1))<=(index?Number(actual.headings[index-1].tag.slice(1)):0)+1));
   check(name+' entire main text retained',actual.text===expected.text,{expectedLength:expected.text.length,actualLength:actual.text.length});
   check(name+' original sections and images retained',actual.sections===expected.sections&&actual.images===expected.images);
   check(name+' form fields retained',JSON.stringify(actual.forms)===JSON.stringify(expected.forms));
   check(name+' no broken local fragment',actual.fragments.length===0,actual.fragments);
   check(name+' obsolete destinations removed',!actual.links.some(href=>/student-trips-and-parties|2019\/09\/05\/2681|Bottomless-Brunch-p661114244/.test(href)));
   check(name+' clean staging canonical and noindex',actual.canonical.length===1&&actual.canonical[0]===base+route&&actual.robots.length===1&&/noindex/.test(actual.robots[0]));
   check(name+' no test attribution baked into links',!actual.links.some(href=>/codex-test|test-click-id|utm_source=codex/.test(href)));
   check(name+' current generated stylesheet',actual.styles.some(href=>href.includes('/ktk-code-pages-assets/'+definition.css)));
   if(!verifiedAssets.has(definition.css)){
    verifiedAssets.add(definition.css);const local=await readFile(assets+definition.css);
    const asset=await get(base+'/wp-content/mu-plugins/ktk-code-pages-assets/'+definition.css,agent);
    check(definition.css+' exact public asset bytes',asset.status===200&&digest(Buffer.from(await asset.arrayBuffer()))===digest(local));
   }
  }
 }
 const homeExpected=await facts(await(await get('http://127.0.0.1:5184/',agents.desktop)).text());
 for(const [device,agent] of Object.entries(agents)){
  const response=await get(base+'/'+bust,agent),actual=await facts(await response.text());
  report.responses.push({route:'/',device,status:response.status,cache:response.headers.get('cf-cache-status'),age:response.headers.get('age')});
  check(device+' homepage reviewed headings',response.status===200&&JSON.stringify(actual.headings)===JSON.stringify(homeExpected.headings));
  check(device+' homepage one H1',actual.headings.filter(node=>node.tag==='H1').length===1);
  check(device+' homepage no baked test attribution',!actual.links.some(href=>/codex-test|test-click-id|utm_source=codex/.test(href)));
 }
 for(const [route,value] of Object.entries(payload.redirects)){
  const target=typeof value==='string'?value:value.target;
  const response=await get(base+route+bust,agents.desktop);
  check(route+' reviewed redirect',response.status===301&&response.headers.get('location')===base+target+bust,response.headers.get('location'));
 }
 for(const method of ['GET','HEAD']){
  const response=await get(base+'/store/Bottomless-Brunch-p661114244?utm_source=ktk-verification',agents.desktop,method);
  check('exact legacy brunch '+method+' redirect preserves incoming query',response.status===301&&response.headers.get('location')===base+'/store2/bottomless-brunch-29/?utm_source=ktk-verification#book',response.headers.get('location'));
 }
 for(const route of ['/student-trips-and-parties/','/2019/09/05/2681/']){
  const response=await get('https://krawlthroughkrakow.com'+route,agents.desktop);
  check(route+' production unchanged404',response.status===404,response.status);
 }
 for(const route of ['/about-us/how-to-join/','/category/krakow-guides/']){
  const response=await get('https://krawlthroughkrakow.com'+route,agents.desktop),actual=await facts(await response.text());
  check(route+' production original heading semantics',response.status===200&&!actual.headings.some(node=>node.text==='Krakow Guides Articles'));
  check(route+' production no staging CSS',!actual.styles.some(href=>Object.values(payload.pages).some(page=>href.includes(page.css))));
 }
}catch(error){report.errors.push(error.stack);}finally{
 await browser.close();report.passed=report.checks.filter(row=>row.pass).length;report.total=report.checks.length;
 await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,total:report.total,errors:report.errors,failed:report.checks.filter(row=>!row.pass).slice(0,30)},null,2));
 if(report.errors.length||report.passed!==report.total)process.exitCode=1;
}
