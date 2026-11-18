import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const arg=name=>process.argv[process.argv.indexOf(name)+1];
const input=JSON.parse(await readFile(arg('--input'),'utf8')),port=Number(arg('--port'));
if(!Number.isInteger(port)||port<1024||port>65535||input.products.length!==24)throw Error('Explicit loopback port and complete24-product reviewed fixture required');
const plugin='staging/wp-content/plugins/ktk-storefront',assets=new Set(['storefront.js','storefront.css','storefront-montserrat-latin.woff2','storefront-montserrat-latin-ext.woff2','storefront-oswald-latin.woff2','storefront-oswald-latin-ext.woff2']);
const sizes=JSON.parse(await readFile(plugin+'/includes/product-image-sizes.json','utf8'));for(const image of Object.values(sizes.images))for(const v of image.variants)assets.add(v.path);
const modes=new Set(['normal','outage','unavailable','html404','stale','stale-html','stale-generic']),origin=`http://127.0.0.1:${port}`;
const server=createServer(async(req,res)=>{try{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Read-only isolated preview');return;}
 const u=new URL(req.url,origin),send=(status,type,body)=>{res.writeHead(status,{'Content-Type':type,'X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store'});res.end(req.method==='HEAD'?'':body);};
 if(u.pathname.startsWith('/.fixture-plugin/assets/')){const name=u.pathname.slice('/.fixture-plugin/assets/'.length);if(!assets.has(name)){send(404,'text/plain','Missing fixture asset');return;}const type=name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.jpg')?'image/jpeg':name.endsWith('.webp')?'image/webp':'font/woff2';send(200,type,await readFile(plugin+'/assets/'+name));return;}
 const api=u.pathname.match(/^\/.fixture-api\/(normal|outage|unavailable|html404|stale|stale-html|stale-generic)\/(.*)$/);
 if(api){const [,mode,endpoint]=api;if(mode.startsWith('stale')&&endpoint==='products/pub-crawl-28'){send(404,mode==='stale-html'?'text/html':'application/json',mode==='stale-html'?'<h1>Gateway not found</h1>':JSON.stringify(mode==='stale-generic'?{message:'Product not found.'}:{code:'ktk_storefront_api_error',message:'Product not found.',data:{status:404}}));return;}if(mode!=='normal'&&!mode.startsWith('stale')){send(mode==='html404'?404:503,mode==='html404'?'text/html':'application/json',mode==='html404'?'<h1>Gateway not found</h1>':JSON.stringify({message:'Temporarily unavailable.'}));return;}let value,status=200;if(endpoint==='products')value={products:input.products};else if(endpoint==='config')value={cancellationPolicy:input.cancellationPolicy,journeyReplay:{enabled:false}};else if(endpoint.startsWith('products/')){const p=input.products.find(p=>p.slug===decodeURIComponent(endpoint.slice(9)));status=p?200:404;value=p?{product:p,storefrontConfig:{cancellationPolicy:input.cancellationPolicy,journeyReplay:{enabled:false}}}:{code:'ktk_storefront_api_error',message:'Product not found.',data:{status:404}};}else{status=404;value={message:'Not found.'};}send(status,'application/json',JSON.stringify(value));return;}
 if(u.pathname==='/contact/'){send(200,'text/html','<!doctype html><title>Isolated contact destination</title><main><h1>Contact destination fixture</h1></main>');return;}
 if(!/^\/store2(?:\/|$)/.test(u.pathname)){send(404,'text/plain','Outside isolated storefront');return;}
 const path=u.pathname.replace(/^\/store2\/?/,'').replace(/\/+$/,''),mode=u.searchParams.get('fixtureMode')??'normal';if(!modes.has(mode)){send(400,'text/plain','Unknown fixture mode');return;}
 const p=input.products.find(p=>p.slug===path),request={path,method:req.method,mode:mode.startsWith('stale')?'normal':mode,products:input.products,product:p,cancellationPolicy:input.cancellationPolicy,pluginUrl:origin+'/.fixture-plugin/'};
 const result=JSON.parse(execFileSync('php',['tools/tests/storefront-response-fixture.php'],{input:JSON.stringify(request),encoding:'utf8',maxBuffer:4e6}));
 const local=s=>s.replaceAll('https://krawlthroughkrakow.com/staging/',origin+'/');
 const config={restUrl:origin+'/.fixture-api/'+mode,baseUrl:origin+'/store2',siteUrl:origin+'/',path,assetBaseUrl:origin+'/.fixture-plugin/assets/'};
 const body='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+result.title+'</title>'+local(result.metadata)+'<link rel="stylesheet" href="/.fixture-plugin/assets/storefront.css"></head><body class="ktk-storefront-page"><div id="main-content" class="ktk-storefront-main">'+local(result.html)+'<div id="ktk-storefront-root"'+(result.html?' hidden':'')+'></div></div><script>window.KTK_STOREFRONT='+JSON.stringify(config)+'</script><script src="/.fixture-plugin/assets/storefront.js" defer></script></body></html>';
 send(result.status??200,'text/html; charset=utf-8',body);
}catch(e){res.writeHead(500,{'Content-Type':'text/plain'});res.end('Isolated response fixture failed');process.stderr.write(e.stack+'\n');}});
server.listen(port,'127.0.0.1',()=>process.stdout.write('Read-only response preview: '+origin+'/store2/\n'));
