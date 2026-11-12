import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const arg=name=>process.argv[process.argv.indexOf(name)+1];
const input=JSON.parse(await readFile(arg('--input'),'utf8'));
const port=Number(arg('--port'));
const baseline=process.argv.includes('--baseline')?arg('--baseline'):null;
if(!Number.isInteger(port)||port<1024||port>65535||baseline&&!/^[a-f0-9]{40}$/.test(baseline))throw new Error('Explicit local port and source commit required');
const plugin='staging/wp-content/plugins/ktk-storefront';
const assets=new Set(['storefront.js','storefront.css','storefront-montserrat-latin.woff2','storefront-montserrat-latin-ext.woff2','storefront-oswald-latin.woff2','storefront-oswald-latin-ext.woff2']);
const source=async name=>baseline?execFileSync('git',['show',`${baseline}:${plugin}/assets/${name}`],{maxBuffer:5e6}):readFile(`${plugin}/assets/${name}`);
const publicConfig={cancellationPolicy:input.cancellationPolicy,journeyReplay:{enabled:false,projectId:'z9d5iuilvn',requireAnalyticsConsent:true}};
const server=createServer(async(req,res)=>{
  try{
    if(req.method!=='GET'){res.writeHead(405);res.end('Read-only isolated preview');return;}
    const origin=`http://127.0.0.1:${port}`,url=new URL(req.url,origin);
    if(url.pathname.startsWith('/.ktk-assets/')){
      const name=url.pathname.slice('/.ktk-assets/'.length);
      if(!assets.has(name)){res.writeHead(404);res.end();return;}
      res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'font/woff2');res.end(await source(name));return;
    }
    const api='/wp-json/ktk-storefront/v1';
    if(url.pathname===api+'/products'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({products:input.products}));return;}
    if(url.pathname.startsWith(api+'/products/')){
      const product=input.products.find(item=>item.slug===url.pathname.slice((api+'/products/').length));
      res.writeHead(product?200:404,{'Content-Type':'application/json'});res.end(JSON.stringify(product?{product,storefrontConfig:publicConfig}:{message:'Not found'}));return;
    }
    if(url.pathname.startsWith(api)){res.writeHead(404,{'Content-Type':'application/json'});res.end('{}');return;}
    const route=url.pathname.replace(/^\/store2\/?/,'').replace(/\/+$/,'');
    const product=input.products.find(item=>item.slug===route);
    const data=!route?{kind:'catalog',products:input.products}:product?{kind:'product',product,cancellationPolicy:input.cancellationPolicy}:null;
    const html=!baseline&&data?execFileSync('php',['tools/tests/storefront-public-fixture.php'],{input:JSON.stringify({baseUrl:origin+'/',data}),encoding:'utf8',maxBuffer:4e6}):'';
    const config={restUrl:origin+api,baseUrl:origin+'/store2',siteUrl:origin+'/',path:route};
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex, nofollow'});
    res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Isolated public storefront preview</title><link rel="stylesheet" href="/.ktk-assets/storefront.css"></head><body class="ktk-storefront-page"><div id="main-content" class="ktk-storefront-main">${html}<div id="ktk-storefront-root"${html?' hidden':''}></div></div><script>window.KTK_STOREFRONT=${JSON.stringify(config)};</script><script src="/.ktk-assets/storefront.js" defer></script></body></html>`);
  }catch(error){res.writeHead(500);res.end('Isolated preview failed');process.stderr.write(error.stack+'\n');}
});
server.listen(port,'127.0.0.1',()=>process.stdout.write(`Read-only isolated preview: http://127.0.0.1:${port}/store2/\n`));
