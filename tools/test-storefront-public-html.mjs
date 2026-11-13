import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {getProductContent} from '../staging/wp-content/plugins/ktk-storefront/frontend/src/product-content.js';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out='docs/seo/staging-public-html-2026-11-12';
const input=JSON.parse(await readFile(out+'/public-inputs.json','utf8'));
const base=process.argv[2]||'http://127.0.0.1:5182/store2/';
const baseline=process.argv[3]||'http://127.0.0.1:5183/store2/';
const label=process.argv[4]||'local';
const output=`${out}/${label}.json`;
try{await readFile(output);throw new Error('Preserve earlier browser report; select another label');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(out,{recursive:true});
const payloadChecksums=JSON.parse(execFileSync('python',['tools/publish-storefront-staging.py','--manifest'],{encoding:'utf8'}));
const report={checkedAt:new Date().toISOString(),base,baseline,payloadChecksums,checks:[],errors:[],realMutations:0,visuals:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
const tiny=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64');
const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
async function isolate(context,images=false){
  await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(request.method()!=='GET')return route.fulfill({status:400,json:{message:'Isolated public test: writes blocked.'}});
    if(url.hostname==='127.0.0.1')return route.continue();
    if(request.resourceType()==='image')return images?route.continue():route.fulfill({contentType:'image/png',body:tiny});
    return route.abort();
  });
}
async function bounds(page){return page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:[...document.querySelectorAll('h1')].map(node=>node.textContent.trim()),overflows:[...document.querySelectorAll('h1,.ktk-detail__intro,.ktk-highlights__text,.ktk-public-booking,.ktk-product-card')].filter(node=>{const r=node.getBoundingClientRect();return r.width&& (r.left < -1||r.right>innerWidth+1||node.scrollWidth>node.clientWidth+2);}).map(node=>({class:node.className,text:node.textContent.slice(0,90)}))}));}
try{
  const php=JSON.parse(execFileSync('php',['tools/tests/storefront-public-fixture.php'],{input:JSON.stringify({action:'resolve',products:input.products}),encoding:'utf8',maxBuffer:4e6}));
  check('all 24 actual public products resolve identically in PHP and client',JSON.stringify(php)===JSON.stringify(input.products.map(getProductContent)));
  for(const width of [320,390,768,1440]){
    const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900}});await isolate(context);
    const page=await context.newPage();
    for(const product of [null,...input.products]){
      const name=`noJS ${width} ${product?.slug||'catalog'}`;
      const response=await page.goto(new URL(product?.slug||'',base).href,{waitUntil:'load'});
      await page.evaluate(()=>document.fonts.ready);
      const facts=await bounds(page),text=clean(await page.locator('#ktk-storefront-public-content').textContent());
      check(name+' HTTP/source readable',response.status()===200&&text.length>20);
      check(name+' one correct H1',facts.h1.length===1&&facts.h1[0]===(product?.name||'Krakow experiences'));
      check(name+' no horizontal clipping',facts.scroll<=width+1&&!facts.overflows.length,facts.overflows);
      if(product){
        const content=getProductContent(product);
        check(name+' actual description and inclusions',(!content.description||text.includes(clean(content.description)))&&content.highlights.every(value=>text.includes(clean(value))));
        check(name+' actual meeting data',!content.meetingPoint||Object.entries(content.meetingPoint).filter(([key,value])=>key!=='mapUrl'&&value).every(([,value])=>text.includes(clean(value))));
        check(name+' no false live booking form',await page.locator('#ktk-storefront-public-content form,#ktk-storefront-public-content script').count()===0);
      }else check(name+' all public product links',await page.locator('.ktk-product-card h2 a').count()===input.products.length);
    }
    await context.close();
  }
  for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:900}});await isolate(context);
    const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
    for(const product of [null,...input.products]){
      const name=`JS ${width} ${product?.slug||'catalog'}`;
      await page.goto(new URL(product?.slug||'',base).href,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>!document.getElementById('ktk-storefront-root').hidden&& !document.getElementById('ktk-storefront-public-content'));
      const facts=await bounds(page);
      check(name+' one final heading after handoff',facts.h1.length===1&&(!product||facts.h1[0]===product.name),facts.h1);
      check(name+' no duplicate/hidden public copy',await page.locator('#ktk-storefront-public-content').count()===0);
      check(name+' no horizontal clipping',facts.scroll<=width+1&&!facts.overflows.length,facts.overflows);
      if(product){
        const content=getProductContent(product);
        check(name+' correct current booking or past-event state',content.pastCampaign
          ?await page.locator('.ktk-past-campaign').count()===1&&await page.locator('.ktk-configurator').count()===0
          :await page.locator('#build-your-booking .ktk-configurator').count()===1);
      }
      else check(name+' native linked product titles',await page.locator('.ktk-product-card h3 a').count()===input.products.length);
    }
    await page.goto(base);await page.locator('.ktk-product-card h3 a').first().waitFor();
    const target=await page.locator('.ktk-product-card h3 a').first().getAttribute('href');
    await page.locator('.ktk-product-card h3 a').first().click();
    await page.waitForFunction(()=>document.querySelector('.ktk-detail h1'));
    check(`${width} native link enhances to the correct product`,new URL(page.url()).pathname.replace(/\/$/,'')===new URL(target).pathname.replace(/\/$/,''));
    await context.close();
  }
  for(const width of [390,1440]){
    for(const slug of ['','pub-crawl-28','nye-pub-crawl-32','bubble-football-43']){
      const snapshots=[];
      for(const [kind,address] of [['before',baseline],['after',base]]){
        const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await isolate(context,true);
        const page=await context.newPage();await page.goto(new URL(slug,address).href,{waitUntil:'networkidle'});
        await page.waitForFunction(()=>document.querySelector('#ktk-storefront-root h1')&&!document.getElementById('ktk-storefront-root').hidden);
        await page.evaluate(()=>document.fonts.ready);
        const photo=await page.locator('.ktk-gallery__stage img').evaluateAll(nodes=>nodes.map(node=>({src:node.currentSrc,ok:node.complete&&node.naturalWidth>0})));
        const screenshot=await page.screenshot({path:`${out}/${label}-${kind}-${slug||'catalog'}-${width}.png`,animations:'disabled'});
        const geometry=await page.locator('h1,.ktk-detail__intro,.ktk-gallery__stage,.ktk-hero__secondary').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {text:node.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height,color:s.color,font:s.font};}));
        snapshots.push({kind,photo,screenshot,geometry});await context.close();
      }
      const [before,after]=snapshots;
      report.visuals.push({slug:slug||'catalog',width,pixelIdentical:before.screenshot.equals(after.screenshot),geometryIdentical:JSON.stringify(before.geometry)===JSON.stringify(after.geometry),before:before.geometry,after:after.geometry});
      check(`visual ${width} ${slug||'catalog'} geometry retained`,JSON.stringify(before.geometry)===JSON.stringify(after.geometry));
      check(`visual ${width} ${slug||'catalog'} actual first photo rendered`,after.photo.every(image=>image.ok),after.photo);
    }
  }
}catch(error){report.errors.push(error.stack);}finally{
  await browser.close();report.summary={passed:report.checks.filter(item=>item.pass).length,total:report.checks.length};
  await writeFile(output,JSON.stringify(report,null,2));
  console.log(JSON.stringify({summary:report.summary,errors:report.errors,failed:report.checks.filter(item=>!item.pass),visuals:report.visuals.map(({slug,width,pixelIdentical,geometryIdentical})=>({slug,width,pixelIdentical,geometryIdentical}))},null,2));
  if(report.errors.length||report.summary.passed!==report.summary.total)process.exitCode=1;
}
