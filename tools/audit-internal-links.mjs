import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fetchCompleteResponse} from './read-only-http.mjs';
import {summarizeInternalGraph} from './internal-link-graph.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output=process.argv[2];if(!output)throw Error('Fresh graph output required');
try{await readFile(output);throw Error('Preserve earlier graph evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const base='https://krawlthroughkrakow.com/staging';
const localBase=name=>{
 if(!process.argv.includes(name))return null;
 const value=process.argv[process.argv.indexOf(name)+1],url=new URL(value);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw Error('Only explicit loopback preview bases');
 return value.replace(/\/$/,'');
};
const localPages=localBase('--local-pages'),localHome=localBase('--local-home');
const sha=value=>createHash('sha256').update(value).digest('hex');
const assets='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const registry=JSON.parse(execFileSync('php',['-r',"define('ABSPATH','.');echo json_encode(require $argv[1]);",assets+'registry.php'],{encoding:'utf8'}));
const report={checkedAt:new Date().toISOString(),scope:'Read-only public staging initial-HTML discovery graph, all registered content plus complete public catalog. Page scripts/resources never execute. Structural paths ignore the deliberate staging nofollow guard; not a Google crawl/indexing verdict, canonical decision, venue fact check or production release. Only native followable anchors count for reachability; script-only modules remain separate. No personal/attribution values retained.',registrySha256:sha(await readFile(assets+'registry.php')),responses:[],errors:[],retries:[]};
const get=url=>fetchCompleteResponse(url,{redirect:'manual'},{onRetry:event=>report.retries.push({attempt:event.attempt,message:event.message})});
const catalogResponse=await get(base+'/wp-json/ktk-storefront/v1/products');
if(catalogResponse.status!==200)throw Error('Public catalog unavailable');
const catalogBytes=await catalogResponse.text(),catalog=JSON.parse(catalogBytes).products;
if(!Array.isArray(catalog)||!catalog.length)throw Error('Complete public catalog required');
const seen=new Set();
for(const row of catalog){
 if(!Number.isInteger(row.id)||row.id<1||seen.has(row.id)||typeof row.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug))throw Error('Invalid or ambiguous public product identity');
 seen.add(row.id);
}
report.catalogSha256=sha(catalogBytes);report.productCount=catalog.length;
const inputs=[{route:'/',kind:'homepage'},...Object.entries(registry.routes).map(([route,row])=>({route,kind:row.kind})),{route:'/store2/',kind:'catalog'},...catalog.map(row=>({route:'/store2/'+row.slug+'/',kind:'product'}))];
const pages=[],browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const parser=await browser.newPage({javaScriptEnabled:false});await parser.route('**/*',route=>route.abort());
 for(const input of inputs){
  try{
   const preview=input.kind==='homepage'?localHome:['catalog','product'].includes(input.kind)?null:localPages;
   const response=await get((preview||base)+input.route),html=await response.text();
   if(response.status!==200)throw Error('Expected direct HTTP200, got'+response.status);
   const facts=await parser.evaluate(html=>{
    const doc=new DOMParser().parseFromString(html,'text/html');
    const main=doc.querySelector('#main-content,main,#ktk-storefront-public-content');
    if(!main)throw Error('Initial main content required');
    const sharedFooterBands=[...doc.querySelectorAll('.et_pb_section')].filter(section=>{
     const destinations=[...section.querySelectorAll('a[href]')].map(a=>{try{return new URL(a.getAttribute('href'),'https://krawlthroughkrakow.com/staging/').pathname;}catch{return '';}});
     return ['terms-and-conditions/','privacy-policy/','tour-service-disclaimer/'].every(route=>destinations.some(href=>href.endsWith('/'+route)))&&destinations.some(href=>/^\/staging\/store2\/(?:pub-crawl-28\/?)?$/.test(href));
    });
    const links=[...doc.querySelectorAll('a[href],[data-parity-href]')].map(node=>({
     href:node.hasAttribute('href')?node.getAttribute('href'):node.getAttribute('data-parity-href'),native:node.matches('a[href]'),
     context:node.closest('footer,#main-footer,.et-l--footer,.et-l--header,#main-header')||sharedFooterBands.some(band=>band.contains(node))?'shell':node.closest('#main-content,main,#ktk-storefront-public-content')?'main':'shell',
     nofollow:node.getAttribute('rel')?.split(/\s+/).includes('nofollow')||false
    }));
    return {links,sharedFooterBands:sharedFooterBands.length,hasNoindex:[...doc.querySelectorAll('meta[name="robots"]')].some(node=>/\bnoindex\b/.test(node.content))};
   },html);
   if(!facts.hasNoindex&&!preview)throw Error('Staging indexing guard missing');
   pages.push({...input,links:facts.links});
   report.responses.push({...input,source:preview?'loopback-preview':'public-staging',htmlNoindex:facts.hasNoindex,status:response.status,cache:response.headers.get('cf-cache-status'),htmlSha256:sha(html),linkCount:facts.links.length,sharedFooterBands:facts.sharedFooterBands});
  }catch(error){report.errors.push({...input,message:error.message});}
  if(report.responses.length%20===0)console.log('Read '+report.responses.length+'/'+inputs.length+' public pages');
 }
}finally{await browser.close();}
report.requestedPages=inputs.length;report.capturedPages=pages.length;
if(!report.errors.length)report.graph=summarizeInternalGraph(pages,{...registry.redirects,'/krakow-pub-crawl/':{target:'/'}});
report.complete=!report.errors.length&&pages.length===inputs.length;
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({complete:report.complete,pages:pages.length,products:catalog.length,edges:report.graph?.edges.length,unreachable:report.graph?.unreachable,unknownPaths:report.graph?.unknown.map(row=>row.route),errors:report.errors},null,2));
if(!report.complete)process.exitCode=1;
