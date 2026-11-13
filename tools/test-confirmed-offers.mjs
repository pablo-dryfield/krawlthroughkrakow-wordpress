import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [base,output]=process.argv.slice(2);
if(!base||!output)throw Error('Explicit owned staging/loopback base and fresh output required');
const address=new URL(base),local=address.protocol==='http:'&&address.hostname==='127.0.0.1';
if(!(address.origin==='https://krawlthroughkrakow.com'&&address.pathname==='/staging/store2/')&&!(local&&address.pathname==='/store2/'))throw Error('Staging only');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier report');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const input=JSON.parse(await readFile('docs/seo/staging-public-html-2026-11-12/public-inputs.json','utf8'));
const imageUrls=new Set(input.products.flatMap(product=>[product.imageUrl,...(product.images||[]).map(value=>typeof value==='string'?value:value.url)]).filter(Boolean));
const report={checkedAt:new Date().toISOString(),base,scope:'Owner-confirmed Food Tour and past Halloween. Initial/client, labels, native links, metadata and no attempted first-party writes. External services and all non-read requests blocked; no quotes/carts/orders/payments.',checks:[],errors:[],pageErrors:[],blocked:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const js of [false,true])for(const slug of ['food-tour-krakow-48','halloween-pub-crawl-51'])for(const width of [320,390,768,1440]){
  const name=(js?'client':'initial')+' '+slug+' '+width;
  const context=await browser.newContext({javaScriptEnabled:js,viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
  try{
   await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(!['GET','HEAD'].includes(request.method())||(url.origin!==address.origin&&!imageUrls.has(url.href))){
     report.blocked.push({view:name,method:request.method(),origin:url.origin,path:url.pathname});return route.abort();
    }
    return route.continue();
   });
   page.on('pageerror',error=>report.pageErrors.push({view:name,message:error.message}));
   const url=new URL(slug+'/',base);
   if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_confirmed_offer',String(Date.now()));
   const response=await page.goto(url.href,{waitUntil:'load'});
   if(js){
    await page.waitForFunction(()=>!document.getElementById('ktk-storefront-public-content')&&document.getElementById('ktk-storefront-root')?.hidden===false);
    if(await page.locator('.ktk-error').count())throw Error('Client is in error state');
   }
   await page.evaluate(()=>document.fonts.ready);
   const text=await page.locator('main').innerText();
   check(name+' HTTP200 and one original H1',response.status()===200&&await page.locator('h1').count()===1&&(await page.locator('h1').textContent()).trim()===(slug.startsWith('food')?'Food Tour Krakow':'Halloween Pub Crawl'));
   check(name+' no horizontal clipping',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(slug.startsWith('food')){
    check(name+' confirmed count in intro and retained inclusions',/13[-\u2013]14 Polish food tastings/.test(await page.locator('.ktk-detail__intro').innerText())&&/13[-\u2013]14 Polish food tastings/.test(await page.locator('.ktk-highlights').innerText()));
    check(name+' no conflicting visible count',!/\b10\s+(?:Polish\s+)?food tastings/i.test(text));
    check(name+' current booking path retained',js?await page.locator('.ktk-configurator').count()===1:await page.locator('.ktk-public-booking a').count()===1);
   }else{
    check(name+' explicit past date and next TBA',text.includes('29-31 October 2026')&&text.includes('Halloweekend 2026 has finished')&&text.includes('Next Halloween dates: to be announced.'));
    check(name+' historical details not a future programme',text.includes('past event, not a confirmed future programme')&&await page.locator('.ktk-highlights').count()===1);
    check(name+' no current price or booking form',await page.locator('.ktk-detail__starting-price,.ktk-configurator,.ktk-product-contact,#build-your-booking').count()===0);
    const link=page.getByRole('link',{name:/View regular Pub Crawl/}),href=await link.getAttribute('href');
    check(name+' native regular-crawl alternative, no test attribution',new URL(href,page.url()).pathname===address.pathname+'pub-crawl-28/'&&!new URL(href,page.url()).search);
    if(!local){
     const schemas=await page.locator('script[type="application/ld+json"]').allTextContents();
     const graphs=schemas.flatMap(value=>{const parsed=JSON.parse(value);return parsed['@graph']||[parsed];});
     check(name+' no active Offer or Product schema',graphs.some(item=>item['@type']==='WebPage')&&!graphs.some(item=>item['@type']==='Product'||item['@type']==='Offer'||item.offers));
     check(name+' no stale social price/stock claim',await page.locator('meta[property="product:price:amount"],meta[property="product:availability"]').count()===0);
     check(name+' past-event description and original noindex canonical',(await page.locator('meta[name="description"]').getAttribute('content')).includes('has finished')&&(await page.locator('meta[name="robots"]').first().getAttribute('content')).includes('noindex')&&await page.locator('link[rel="canonical"]').getAttribute('href')===address.origin+address.pathname+slug+'/');
    }
   }
   const photo=page.locator('.ktk-gallery__stage img');
   await photo.evaluate(image=>image.decode());
   check(name+' actual product photo rendered',await photo.evaluate(image=>image.complete&&image.naturalWidth>0));
   check(name+' no attempted first-party writes',!report.blocked.some(row=>row.view===name&&row.origin===address.origin&&!['GET','HEAD'].includes(row.method)));
   if(js&&[390,1440].includes(width))await page.screenshot({path:path.join(output,slug+'-'+width+'.png'),fullPage:true,animations:'disabled'});
  }catch(error){report.errors.push({view:name,message:error.stack});}finally{await context.close();}
 }
}finally{
 await browser.close();report.passed=report.checks.filter(row=>row.pass).length;report.total=report.checks.length;
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,total:report.total,errors:report.errors,failed:report.checks.filter(row=>!row.pass)},null,2));
 if(report.errors.length||report.passed!==report.total)process.exitCode=1;
}
