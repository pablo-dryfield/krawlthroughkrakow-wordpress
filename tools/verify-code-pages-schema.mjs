import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fetchCompleteResponse} from './read-only-http.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const option=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const output=option('--output');if(!output)throw new Error('A new report path required');
try{await readFile(output);throw new Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const base=option('--base','https://krawlthroughkrakow.com/staging');
if(base!=='https://krawlthroughkrakow.com/staging'&&!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw new Error('Staging or loopback only');
const assets='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const baseline=option('--baseline','deploy-backups/seo-schema-media-baseline/').replace(/\/?$/,'/');
const definitions=root=>JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);$a=$argv[1];$r=require $a.'registry.php';$o=array();foreach($r['routes'] as $route=>$entry){$o[$route]=require $a.$entry['file'];}echo json_encode($o);",root+assets],{encoding:'utf8',maxBuffer:12e6}));
const before=definitions(baseline),after=definitions('');
const report={checkedAt:new Date().toISOString(),base,cacheBusted:process.argv.includes('--cache-bust'),checks:[],responses:[],errors:[],transportRetries:[],mutations:0,counts:{pages:0,articles:0,authors:0,dates:0,featuredImages:0,holds:0}};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const stage='https://krawlthroughkrakow.com/staging';
const expectedStage=value=>JSON.parse(JSON.stringify(value).replaceAll('https://krawlthroughkrakow.com/',stage+'/'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',route=>route.abort());
 const agents={desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36',android:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/154.0.0.0 Mobile Safari/537.36',ipad:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'};
 for(const [route,definition] of Object.entries(after)){
  const original=structuredClone(before[route]),updated=structuredClone(definition);delete original.schema;delete updated.schema;
  check(route+' only schema definition changes',JSON.stringify(original)===JSON.stringify(updated));
  for(const field of ['main_file','shell_file','css'])check(route+' exact original '+field,(await readFile(baseline+assets+before[route][field])).equals(await readFile(assets+definition[field])));
  const expected=expectedStage(definition.schema),graph=expected.flatMap(item=>item['@graph']??[item]),article=graph.find(item=>item['@type']==='BlogPosting');
  const held=route==='/hostel-hangover-cure/';
  if(held)report.counts.holds++;else report.counts.pages++;
  if(article){report.counts.articles++;if(article.author)report.counts.authors++;if(article.datePublished)report.counts.dates++;if(article.image)report.counts.featuredImages++;}
  for(const [device,userAgent] of Object.entries(agents)){
   const url=base+route+(report.cacheBusted?'?ktk_schema_check='+Date.now():'');
   const response=await fetchCompleteResponse(url,{headers:{'User-Agent':userAgent}}, {onRetry:row=>report.transportRetries.push(row)}),html=await response.text();
   const facts=await page.evaluate(markup=>{
    const doc=new DOMParser().parseFromString(markup,'text/html');
    const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
    return {schema:[...doc.querySelectorAll('script[type="application/ld+json"]')].map(node=>JSON.parse(node.textContent)),headline:clean(doc.querySelector('#main-content h1')?.textContent),author:clean(doc.querySelector('#main-content .post-meta .author a')?.textContent),published:clean(doc.querySelector('#main-content .post-meta .published')?.textContent),robots:[...doc.querySelectorAll('meta[name="robots"]')].map(node=>node.content),canonical:[...doc.querySelectorAll('link[rel="canonical"]')].map(node=>node.href)};
   },html);
   const name=device+' '+route;
   report.responses.push({device,route,status:response.status,cache:response.headers.get('cf-cache-status'),age:response.headers.get('age'),htmlSha256:sha(html)});
   check(name+' HTTP200',response.status===200);
   check(name+' exact generated JSON-LD and no duplicate graphs',JSON.stringify(facts.schema)===JSON.stringify(expected));
   check(name+' preserved staging noindex/canonical',facts.robots.length===1&&/noindex/.test(facts.robots[0])&&facts.canonical.length===1&&facts.canonical[0]===stage+route);
   if(held){check(name+' health hold unmodified',JSON.stringify(facts.schema)===JSON.stringify(expectedStage(before[route].schema)));continue;}
   const actualGraph=facts.schema.flatMap(item=>item['@graph']??[item]),webpage=actualGraph.find(item=>/#webpage$/.test(item['@id']??'')),breadcrumbs=actualGraph.find(item=>item['@type']==='BreadcrumbList'),posting=actualGraph.find(item=>item['@type']==='BlogPosting');
   check(name+' visible headline matches page identity',webpage?.name===facts.headline&&webpage?.url===stage+route&&webpage?.isPartOf?.['@id']===stage+'/#website');
   check(name+' breadcrumbs registered, unique and ordered',!!breadcrumbs&&breadcrumbs.itemListElement.every((item,index)=>item.position===index+1&&item.name&&(item.item===stage+'/'||Object.keys(after).some(route=>stage+route===item.item)))&&new Set(breadcrumbs.itemListElement.map(item=>item.item)).size===breadcrumbs.itemListElement.length);
   check(name+' no invented ratings, event facts or freshness',!/("aggregateRating"|"review"|"offers"|"dateModified"|"medicalSpecialty"|"startDate")/.test(JSON.stringify(actualGraph)));
   if(definition.kind==='blog post'){
    check(name+' article uses actual headline and publisher',posting?.headline===facts.headline&&posting?.publisher?.['@id']===stage+'/#organization'&&posting?.mainEntityOfPage?.['@id']===webpage?.['@id']);
    check(name+' byline never invented',!posting?.author||posting.author.name===facts.author);
    check(name+' date is original visible calendar day, not migration',!posting?.datePublished||new Date(posting.datePublished+'T00:00:00Z').toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})===facts.published);
   }else check(name+' collections/pages are not promoted into articles',!posting);
  }
 }
}catch(error){report.errors.push(error.stack);}finally{
 await browser.close();report.passed=report.checks.filter(row=>row.pass).length;report.total=report.checks.length;
 await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,total:report.total,counts:report.counts,errors:report.errors,transportRetries:report.transportRetries,failed:report.checks.filter(row=>!row.pass)},null,2));
 if(report.errors.length||report.passed!==report.total)process.exitCode=1;
}
