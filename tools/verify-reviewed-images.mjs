import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fetchCompleteResponse} from './read-only-http.mjs';
import {loadReviewedImageDescriptions,localizeReviewedImageMarkup} from './content-image-descriptions.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const option=name=>process.argv[process.argv.indexOf(name)+1];
const output=process.argv.includes('--output')?option('--output'):null;
if(!output)throw Error('Fresh output report required');
try{await readFile(output);throw Error('Preserve existing release evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const root='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const base='https://krawlthroughkrakow.com/staging';
const definitions=JSON.parse(execFileSync('php',['-r',"define('ABSPATH','.');$r=require $argv[1].'registry.php';$o=array();foreach($r['routes'] as $route=>$e){$p=require $argv[1].$e['file'];$o[]=array('route'=>$route,'file'=>$p['main_file']);}echo json_encode($o);",root],{encoding:'utf8'}));
const review=await loadReviewedImageDescriptions();
const agents={
 desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
 android:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',
 ipad:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
};
const report={checkedAt:new Date().toISOString(),scope:'Read-only initial HTML; scripts/resources blocked. Exact reviewed image and link attributes, including unchanged medical hold. No submissions or commerce requests.',cacheBusted:process.argv.includes('--cache-bust'),reviewSha256:review.sourceSha256,assetManifestSha256:review.assetManifestSha256,checks:[],errors:[],retries:[]};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',route=>route.abort());
 const facts=html=>{
  const markup=localizeReviewedImageMarkup(html,base);
  return page.evaluate(({origin,markup})=>{
   const doc=new DOMParser().parseFromString(markup,'text/html');
   const main=doc.querySelector('#main-content');if(!main)throw Error('Main content required');
   const url=value=>new URL(value,origin).href;
   return {images:[...main.querySelectorAll('img')].map(e=>({src:url(e.getAttribute('src')),alt:e.getAttribute('alt')})),links:[...main.querySelectorAll('a[href][aria-label]')].map(e=>({href:url(e.getAttribute('href')),label:e.getAttribute('aria-label')}))};
  },{origin:base+'/',markup});
 };
 for(const definition of definitions){
  const expected=await facts(await readFile(root+definition.file,'utf8'));
  for(const [device,userAgent] of Object.entries(agents)){
   try{
    const target=base+definition.route+(report.cacheBusted?'?ktk_image_check='+Date.now():'');
    const response=await fetchCompleteResponse(target,{headers:{'User-Agent':userAgent}},{onRetry:event=>report.retries.push(event)});
    const html=await response.text(),actual=await facts(html);
    report.checks.push({route:definition.route,device,status:response.status,cache:response.headers.get('cf-cache-status'),htmlSha256:hash(html),imageCount:actual.images.length,imageAttributesMatch:JSON.stringify(expected.images)===JSON.stringify(actual.images),namedLinksMatch:JSON.stringify(expected.links)===JSON.stringify(actual.links),expectedSha256:hash(JSON.stringify(expected)),actualSha256:hash(JSON.stringify(actual))});
   }catch(error){report.errors.push({route:definition.route,device,message:error.message});}
  }
 }
}finally{await browser.close();}
report.passed=report.checks.filter(row=>row.status===200&&row.imageAttributesMatch&&row.namedLinksMatch).length;
report.total=definitions.length*Object.keys(agents).length;
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,errors:report.errors,failed:report.checks.filter(row=>row.status!==200||!row.imageAttributesMatch||!row.namedLinksMatch)},null,2));
if(report.passed!==report.total||report.errors.length)process.exitCode=1;
