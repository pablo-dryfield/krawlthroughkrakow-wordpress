import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import path from 'node:path';
import {createRenderedCrawlPolicy,installRenderedCrawlGuard} from '../rendered-crawl-request-policy.mjs';
import {extractRenderedLinkFacts,classifySnapshotLinks} from '../rendered-link-graph.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base='https://krawlthroughkrakow.com',doc=base+'/staging/';
const policy=createRenderedCrawlPolicy({documentUrls:new Set([doc,doc+'contact/']),productSlugs:new Set(['pub-crawl-28'])});
const decide=(url,type='fetch',method='GET',extra={})=>policy.decide({url,method,type,currentDocument:doc,isMainFrame:true,...extra});

test('exact current main document and public catalog reads only',()=>{
 assert.equal(decide(doc,'document').allow,true);
 assert.equal(decide(doc+'contact/','document').allow,false);
 assert.equal(decide(doc,'document','GET',{isMainFrame:false}).allow,false);
 for(const name of ['config','products','products/pub-crawl-28'])assert.equal(decide(base+'/staging/wp-json/ktk-storefront/v1/'+name).allow,true);
 for(const name of ['products/unknown-1','products/pub-crawl-28?token=x','saved-carts/00000000-0000-0000-0000-000000000000','ongoing-carts/00000000-0000-0000-0000-000000000000','orders','quotes','availability'])assert.equal(decide(base+'/staging/wp-json/ktk-storefront/v1/'+name).allow,false,name);
});

test('nonreads, collectors, private paths, foreign hosts and unsafe static queries stay blocked',()=>{
 for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS'])assert.equal(decide(doc,'document',method).allow,false);
 for(const url of [base+'/',base+'/store2/pub-crawl-28/',base+'/staging/wp-admin/admin-ajax.php',base+'/staging/9z78/event',base+'/staging/wp-content/backups/payload.js',base+'/staging/wp-content/ktk-private-foo/payload.js',base+'/staging/wp-content/a.js?purchase=1','https://www.facebook.com/tr?id=1&ev=PageView','https://www.googletagmanager.com/gtm.js','https://krawlthroughkrakow.com.evil.test/staging/wp-content/a.js',base+'/staging/wp-content/%2e%2e/wp-admin/payload.js'])assert.equal(decide(url,'script').allow,false,url);
 for(const url of [base+'/staging/wp-content/plugins/ktk-storefront/assets/storefront.js?ver=1',base+'/staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',base+'/wp-includes/js/jquery/jquery.min.js'])assert.equal(decide(url,url.includes('.css')?'stylesheet':'script').allow,true,url);
 assert.equal(decide('https://media.krawlthroughkrakow.com/products/28/photo.webp','image').allow,true);
 assert.equal(decide('https://media.krawlthroughkrakow.com/products/28/photo.webp?token=x','image').allow,false);
 assert.equal(decide('https://media.krawlthroughkrakow.com/products/28/photo.webp','script').allow,false);
 assert.equal(decide(base+'/cf-fonts/s/montserrat/5.2.8/latin/500/normal.woff2','font').allow,true);
 assert.equal(decide(base+'/cf-fonts/s/montserrat/5.2.8/latin/500/normal.woff2?token=x','font').allow,false);
 assert.equal(decide(base+'/cf-fonts/s/montserrat/5.2.8/latin/500/normal.woff2','script').allow,false);
 assert.equal(decide(base+'/staging/wp-content/mu-plugins/ktk-homepage-assets/icons.svg','other').allow,true);
 assert.equal(decide(base+'/staging/wp-content/plugins/x/collector.js','other').allow,false);
});

test('fixture authority cannot become a remote or production document bypass',()=>{
 for(const fixtureOrigin of ['https://example.com','http://localhost:5000','http://127.0.0.1:5000/staging/','http://user:pass@127.0.0.1:5000'])assert.throws(()=>createRenderedCrawlPolicy({documentUrls:new Set([doc]),productSlugs:new Set(),fixtureOrigin}));
 for(const url of [base+'/',base+'/staging/store2/checkout/',base+'/staging/?token=x'])assert.throws(()=>createRenderedCrawlPolicy({documentUrls:new Set([url]),productSlugs:new Set()}));
});

test('actual browser blocks redirect targets, protected reads, POST/beacon and websocket before transmission',async()=>{
 const hits=[],events=[];let productResponses=0;
 const html='<!doctype html><script src="/staging/wp-content/ok.js"></script><script src="/staging/wp-content/redirect.js"></script><main id="main-content"><h1>Fixture</h1><p>fixture</p></main>';
 const server=http.createServer((req,res)=>{
  hits.push({method:req.method,path:req.url});
  if(req.url==='/staging/'){res.setHeader('Content-Type','text/html');res.end(html);}
  else if(req.url==='/staging/wp-content/ok.js'){res.setHeader('Content-Type','application/javascript');res.setHeader('Content-Encoding','gzip');res.end(gzipSync('window.ownedScriptExecuted=true;addEventListener("DOMContentLoaded",()=>{const a=document.createElement("a");a.href="/staging/contact/?utm_source=fixture-value#fixture-fragment";a.textContent="Contact";document.querySelector("main").append(a);});'));}
  else if(req.url==='/staging/wp-content/redirect.js'){res.writeHead(302,{Location:'/staging/wp-admin/redirect-target'});res.end();}
  else if(req.url==='/staging/wp-json/ktk-storefront/v1/products'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');setTimeout(()=>{productResponses++;res.end('{"products":[]}');},150);}
  else{res.statusCode=500;res.end('Must never receive this request');}
 });
 let upgrades=0;server.on('upgrade',(_,socket)=>{upgrades++;socket.destroy();});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,url=origin+'/staging/';
 const p=createRenderedCrawlPolicy({documentUrls:new Set([url]),productSlugs:new Set(),fixtureOrigin:origin});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  assert.equal(typeof context.routeWebSocket,'function');
  await context.routeWebSocket('**',ws=>{events.push({action:'blocked-websocket'});ws.close();});
  const boundary=await installRenderedCrawlGuard(context,p,{currentDocument:url,onEvent:e=>events.push(e),onFetched:async(q,r)=>{if(q.resourceType()==='script'&&q.url().endsWith('/ok.js'))assert.ok((await r.body()).toString().startsWith('window.ownedScriptExecuted=true'));}});
  const page=await context.newPage();await page.goto(url,{waitUntil:'load',timeout:15000});
  const initial=await page.evaluate(extractRenderedLinkFacts,{html}),rendered=await page.evaluate(extractRenderedLinkFacts,{});
  assert.equal(initial.links.length,0);assert.equal(rendered.links.length,1);
  const normalized=classifySnapshotLinks(rendered.links,'/');assert.equal(normalized[0].route,'/contact/');assert.equal(normalized[0].hasQuery,true);assert.ok(!JSON.stringify(normalized).includes('fixture-value'));
  const result=await page.evaluate(async()=>{
   const publicData=await fetch('/staging/wp-json/ktk-storefront/v1/products').then(r=>r.json());
   await Promise.allSettled([fetch('/staging/wp-admin/private'),fetch('/staging/wp-json/ktk-storefront/v1/orders',{method:'POST',body:'fixture'}),fetch('/staging/wp-json/ktk-storefront/v1/saved-carts/00000000-0000-0000-0000-000000000000')]);
   navigator.sendBeacon('/staging/wp-admin/beacon','fixture');new WebSocket('ws://'+location.host+'/staging/socket');
   return {script:window.ownedScriptExecuted,publicData};
  });
  await page.waitForTimeout(150);
  assert.deepEqual(result,{script:true,publicData:{products:[]}});
  assert.equal(upgrades,0);assert.ok(events.some(e=>e.action==='blocked-websocket'));
  assert.ok(events.some(e=>e.action==='blocked-redirect'));
  assert.ok(events.some(e=>e.action==='blocked'&&e.method==='POST'));
  await page.evaluate(()=>{void fetch('/staging/wp-json/ktk-storefront/v1/products');});
  for(let n=0;n<50&&boundary.pendingCount()===0;n++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.ok(boundary.pendingCount()>0,'Actual delayed response must be in flight before closing');
  const closed=await boundary.close();assert.deepEqual(closed,{contextClosed:true,pendingHandlers:0,errors:[]});assert.equal(productResponses,2,'Close drains the delayed public response before context disposal');
  assert.deepEqual(hits.map(h=>h.path).sort(),['/staging/','/staging/wp-content/ok.js','/staging/wp-content/redirect.js','/staging/wp-json/ktk-storefront/v1/products','/staging/wp-json/ktk-storefront/v1/products'].sort());
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
