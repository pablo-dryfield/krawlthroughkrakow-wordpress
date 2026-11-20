import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,writeFile,appendFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {createRenderedCrawlPolicy,installRenderedCrawlGuard,safeRequestFacts} from './rendered-crawl-request-policy.mjs';
import {extractRenderedLinkFacts,classifySnapshotLinks,summarizeRenderedGraph} from './rendered-link-graph.mjs';

const args=process.argv.slice(2),arg=n=>args[args.indexOf(n)+1];
if(!args.includes('--output')||!args.includes('--expected-source')||!args.includes('--mode'))throw Error('Explicit fresh output, expected Git source and pilot/complete mode required');
const output=arg('--output'),expected=arg('--expected-source'),mode=arg('--mode');
if(!/^[a-f0-9]{40}$/.test(expected)||!['pilot','complete'].includes(mode))throw Error('Invalid explicit source/mode');
const sha=b=>createHash('sha256').update(b).digest('hex'),git=(...a)=>execFileSync('git',a,{encoding:'utf8',windowsHide:true}).trim();
if(git('rev-parse','HEAD')!==expected)throw Error('Unexpected source head');
await mkdir(output); // Exclusive ownership: do not reuse a prior pilot or complete cohort.
const report={startedAt:new Date().toISOString(),source:expected,tree:git('rev-parse','HEAD^{tree}'),mode,scope:'Actual headless JavaScript-enabled staging render of every registered document and complete public catalog at phone/desktop widths. Own static media/fonts load; foreign providers/frames, protected APIs, all nonreads, redirects and sockets are withheld. Structural DOM reachability ignores deliberate staging-wide nofollow. No consent interaction, real message/order/payment, account operation, native Windows/AT/physical-device, field/Google indexing, whole-host or continuous protected-state certificate.',checks:[],views:[],graphs:[],catalog:null,errors:[]};
const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name);};
const save=()=>writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const tools=['tools/audit-rendered-internal-links.mjs','tools/rendered-crawl-request-policy.mjs','tools/rendered-link-graph.mjs','tools/tests/test_rendered_crawl_request_policy.mjs','tools/tests/test_rendered_link_graph.mjs'];
const toolHashes=async()=>Object.fromEntries(await Promise.all(tools.map(async p=>[p,sha(await readFile(p))])));
async function applicationSource(){
 const rows=execFileSync('git',['ls-tree','-r','-z','HEAD','--','staging/wp-content']).toString('utf8').split('\0').filter(Boolean),files=[];
 for(const row of rows){const [meta,name]=row.split('\t'),[,,blob]=meta.split(' '),before=await stat(name),h=createHash('sha256'),g=createHash('sha1').update('blob '+before.size+'\0');
  for await(const chunk of createReadStream(name)){h.update(chunk);g.update(chunk);}const after=await stat(name);
  if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||g.digest('hex')!==blob)throw Error('Application source changed: '+name);
  files.push({path:name,bytes:before.size,sha256:h.digest('hex'),gitBlob:blob});
 }return {files,count:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0)};
}
let browser;
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const wall=setTimeout(()=>{report.wallLimitReached=true;void browser?.close();},mode==='pilot'?600000:2400000);
try{
 report.toolHashes=await toolHashes();report.applicationSource=await applicationSource();
 const expectedAssets=new Map(report.applicationSource.files.map(f=>[f.path,f.sha256]));
 const registryFile='staging/wp-content/mu-plugins/ktk-code-pages-assets/registry.php',registry=JSON.parse(execFileSync('php',['-r',"define('ABSPATH','.');echo json_encode(require $argv[1]);",registryFile],{encoding:'utf8'}));
 report.registrySHA256=sha(await readFile(registryFile));
 const catalogURL='https://krawlthroughkrakow.com/staging/wp-json/ktk-storefront/v1/products';
 const response=await fetch(catalogURL,{redirect:'manual',signal:AbortSignal.timeout(30000)});
 check('direct public catalog HTTP200',response.status===200,{status:response.status});
 const catalogBytes=Buffer.from(await response.arrayBuffer()),catalog=JSON.parse(catalogBytes).products;
 check('nonempty complete public catalog array',Array.isArray(catalog)&&catalog.length>0);
 const ids=new Set(),slugs=new Set();
 for(const p of catalog){check('unique public product identity '+p.id,Number.isInteger(p.id)&&p.id>0&&!ids.has(p.id)&&typeof p.slug==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)&&!slugs.has(p.slug));ids.add(p.id);slugs.add(p.slug);}
 report.catalog={url:catalogURL,sha256:sha(catalogBytes),products:catalog.map(p=>({id:p.id,slug:p.slug}))};
 const inputs=[{route:'/',kind:'homepage'},...Object.entries(registry.routes).map(([route,row])=>({route,kind:row.kind})),{route:'/store2/',kind:'catalog'},...catalog.map(p=>({route:'/store2/'+p.slug+'/',kind:'product'}))];
 const base='https://krawlthroughkrakow.com/staging',docs=new Set(inputs.map(p=>base+p.route)),policy=createRenderedCrawlPolicy({documentUrls:docs,productSlugs:slugs});
 check('unique source/catalog route inventory',docs.size===inputs.length,{registered:Object.keys(registry.routes).length,products:catalog.length,total:inputs.length});
 const pilot=['/','/blog/','/store2/','/store2/pub-crawl-28/'];
 check('pilot identities belong to complete inventory',pilot.every(p=>inputs.some(i=>i.route===p)));
 const selected=mode==='pilot'?inputs.filter(p=>pilot.includes(p.route)):inputs;
 report.completeInputCount=inputs.length;report.requestedViews=selected.length*2;report.heldTagRoutes=inputs.filter(p=>p.route.startsWith('/tag/')).map(p=>p.route);
 browser=await chromium.launch({channel:'chrome',headless:true});report.browserVersion=browser.version();
 const parserContext=await browser.newContext({javaScriptEnabled:false,serviceWorkers:'block'});await parserContext.route('**/*',r=>r.abort());const parser=await parserContext.newPage();
 for(const width of [390,1440])for(const input of selected){
  const url=base+input.route,row={...input,width,requests:[],resources:[],pageErrors:[],console:[]};report.views.push(row);
  const context=await browser.newContext({viewport:{width,height:1000},javaScriptEnabled:true,reducedMotion:'reduce',serviceWorkers:'block'});context.setDefaultTimeout(15000);
  let initialHTML=null,boundary,viewSuccess=false;
  try{
   if(typeof context.routeWebSocket!=='function')throw Error('Browser socket interception required');
   await context.routeWebSocket('**',ws=>{row.requests.push({...safeRequestFacts(ws.url()),action:'blocked-websocket'});ws.close();});
   boundary=await installRenderedCrawlGuard(context,policy,{currentDocument:url,onEvent:e=>row.requests.push(e),onFetched:async(q,r)=>{
    if(q.resourceType()==='document'){const b=await r.body();initialHTML=b.toString('utf8');row.document={status:r.status(),sha256:sha(b),cache:r.headers()['cf-cache-status']||null,robotsHeader:r.headers()['x-robots-tag']||null};}
    if(['script','stylesheet'].includes(q.resourceType())){const b=await r.body(),u=new URL(q.url()),local=u.origin===policy.origin&&u.pathname.startsWith('/staging/')?decodeURIComponent(u.pathname.slice(1)):null,expectedSHA=expectedAssets.get(local);
     row.resources.push({...safeRequestFacts(q.url()),type:q.resourceType(),status:r.status(),bytes:b.length,sha256:sha(b),sourcePath:expectedSHA?local:null,sourceExact:expectedSHA?sha(b)===expectedSHA:null});
     if(expectedSHA&&sha(b)!==expectedSHA)throw Error('Owned script/stylesheet differs: '+local);
    }
   }});
   const page=await context.newPage();page.on('pageerror',e=>row.pageErrors.push({name:e.name,message:e.message.replace(/https?:\/\/[^\s)]+/g,m=>{const f=safeRequestFacts(m);return f.origin+f.path+(f.hasQuery?'?[withheld]':'');})}));
   page.on('console',m=>{if(['error','warning'].includes(m.type()))row.console.push({type:m.type(),text:m.text().replace(/https?:\/\/[^\s)]+/g,t=>{const f=safeRequestFacts(t);return f.origin+f.path+(f.hasQuery?'?[withheld]':'');})});});
   const nav=await page.goto(url,{waitUntil:'load',timeout:45000});
   check(width+' '+input.route+' direct known document',nav?.status()===200&&page.url()===url&&row.document?.status===200);
   if(['catalog','product'].includes(input.kind))await page.waitForFunction(()=>!document.getElementById('ktk-storefront-public-content')&&document.getElementById('ktk-storefront-root')&&!document.getElementById('ktk-storefront-root').hidden,{}, {timeout:15000});
   let previous=null,stable=0,facts;
   for(let attempt=0;attempt<30;attempt++){
    facts=await page.evaluate(extractRenderedLinkFacts,{});const sanitized=classifySnapshotLinks(facts.links,input.route),digest=sha(JSON.stringify(sanitized));
    stable=digest===previous?stable+1:0;previous=digest;
    if(stable>=4){row.links=sanitized;break;}await page.waitForTimeout(100);
   }
   check(width+' '+input.route+' bounded rendered-link stability',stable>=4);
   await boundary.drain();
   const initial=await parser.evaluate(extractRenderedLinkFacts,{html:initialHTML});row.initialLinks=classifySnapshotLinks(initial.links,input.route);row.h1=facts.h1;row.robots=facts.robots;row.stabilitySamples=stable+1;
   check(width+' '+input.route+' staging indexing guard',/\bnoindex\b/.test(facts.robots||'')||/\bnoindex\b/.test(row.document.robotsHeader||''));
   check(width+' '+input.route+' useful rendered heading',facts.h1.length===1&&facts.h1[0].length>0);
   check(width+' '+input.route+' real page scripts loaded',row.resources.some(r=>r.type==='script'&&r.status===200));
   check(width+' '+input.route+' strict uncaught error guard',row.pageErrors.length===0,row.pageErrors);
   check(width+' '+input.route+' no allowed transport or source mismatch',!row.requests.some(r=>['transport-error','response-dispose-error','guard-handler-error'].includes(r.action)),row.requests.filter(r=>['transport-error','response-dispose-error','guard-handler-error'].includes(r.action)));
   viewSuccess=true;
  }finally{
   row.shutdown=boundary?await boundary.close():(await context.close(),{contextClosed:true,pendingHandlers:0,errors:[]});
   if(viewSuccess){check(width+' '+input.route+' all routed responses closed cleanly',row.shutdown.contextClosed&&row.shutdown.pendingHandlers===0&&row.shutdown.errors.length===0,row.shutdown);row.complete=true;}
   await appendFile(path.join(output,'views.ndjson'),JSON.stringify(row)+'\n');await save();console.log(JSON.stringify({width,route:input.route,complete:row.complete,views:report.views.filter(v=>v.complete).length,total:report.requestedViews,pageErrors:row.pageErrors.length}));
  }
 }
 await parserContext.close();
 const redirects={...registry.redirects,'/krakow-pub-crawl/':{target:'/'}};
 for(const width of [390,1440]){
  const rows=report.views.filter(r=>r.width===width),rendered=summarizeRenderedGraph(rows,redirects),initial=summarizeRenderedGraph(rows.map(r=>({...r,links:r.initialLinks})),redirects),visible=summarizeRenderedGraph(rows,redirects,true);
  report.graphs.push({width,initial,rendered,defaultVisible:visible,scope:'Default-visible graph is an observation only; menus/carousels/filters were not clicked. Full rendered graph retains all actual DOM anchors, including collapsed controls. No synthetic links or query/fragment values.'});
  if(mode==='complete'){
   check(width+' complete rendered inventory',rows.length===inputs.length);
   check(width+' no unknown rendered routes',rendered.unknown.length===0,rendered.unknown);
   check(width+' every commercial product natively reachable',rendered.pages.filter(p=>p.kind==='product').length===catalog.length&&rendered.pages.filter(p=>p.kind==='product').every(p=>p.nativeDepth!==null),rendered.pages.filter(p=>p.kind==='product'));
   check(width+' only previously held tags may be unreachable',rendered.unreachable.every(r=>report.heldTagRoutes.includes(r)),rendered.unreachable);
  }
 }
 report.completeRequestedCohort=true;report.completeFullInventory=mode==='complete';
}catch(e){report.errors.push({name:e.name,message:e.message,stack:e.stack});process.exitCode=1;}
finally{
 clearTimeout(wall);if(browser){await browser.close();report.ownedBrowserClosed=true;}
 try{report.applicationSourceStillExact=JSON.stringify(report.applicationSource)===JSON.stringify(await applicationSource());report.toolHashesStillExact=JSON.stringify(report.toolHashes)===JSON.stringify(await toolHashes());if(!report.applicationSourceStillExact||!report.toolHashesStillExact)throw Error('Source changed during capture');}catch(e){report.errors.push({source:e.message});process.exitCode=1;}
 report.finishedAt=new Date().toISOString();report.passed=!!report.completeRequestedCohort&&!report.errors.length&&report.checks.every(c=>c.pass)&&!report.wallLimitReached;
 await save();console.log(JSON.stringify({mode,passed:report.passed,completeFullInventory:report.completeFullInventory||false,views:report.views.length,checks:report.checks.length,errors:report.errors}));if(!report.passed)process.exitCode=1;
}
