import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const arg=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const output=arg('--output');
if(!output)throw new Error('Explicit new report filename required');
try{await readFile(output);throw new Error('Preserve earlier evidence; choose a new report');}catch(error){if(error.code!=='ENOENT')throw error;}
const origin='https://krawlthroughkrakow.com',base=origin+'/staging/store2/';
const query=process.argv.includes('--cache-bust')?'?ktk_public_browser='+Date.now():'';
const report={checkedAt:new Date().toISOString(),base,cacheBust:!!query,checks:[],errors:[],inheritedIntegrationErrors:[],blockedWrites:[],realMutations:0,views:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
const folder=path.join(path.dirname(output),path.basename(output,'.json')+'-screenshots');
await mkdir(folder,{recursive:true});
try{
  for(const javaScriptEnabled of [false,true])for(const width of [320,390,768,1440]){
    const context=await browser.newContext({javaScriptEnabled,viewport:{width,height:900},reducedMotion:'reduce'});
    await context.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url());
      if(!['GET','HEAD'].includes(request.method())){
        report.blockedWrites.push({method:request.method(),path:url.origin+url.pathname});
        return route.fulfill({status:403,json:{message:'Read-only verification; mutation blocked.'}});
      }
      if(request.resourceType()==='image')return route.continue();
      if(url.origin!==origin||!url.pathname.startsWith('/staging/'))return route.abort();
      if(url.pathname.includes('/wp-json/')&&!/^\/staging\/wp-json\/ktk-storefront\/v1\/(products(?:\/[^/]+)?|config)\/?$/.test(url.pathname))return route.abort();
      return route.continue();
    });
    const page=await context.newPage();
    page.on('pageerror',error=>{
      const item={width,javaScriptEnabled,message:error.message,stack:error.stack};
      // This exact pre-existing third-party error is retained, not called fixed.
      (error.message==='fbq is not defined'?report.inheritedIntegrationErrors:report.errors).push(item);
    });
    for(const [slug,title] of [['','Krakow experiences'],['pub-crawl-28','Pub Crawl'],['nye-pub-crawl-32','NYE Pub Crawl'],['bubble-football-43','Bubble Football']]){
      const name=`${javaScriptEnabled?'JS':'noJS'} ${width} ${slug||'catalog'}`;
      const response=await page.goto(base+(slug?slug+'/':'')+query,{waitUntil:'load',timeout:60000});
      if(javaScriptEnabled){
        await page.mouse.move(20,20);
        await page.waitForFunction(()=>document.getElementById('ktk-storefront-root')?.hidden===false&&!document.getElementById('ktk-storefront-public-content'),{},{timeout:30000});
      }
      await page.evaluate(()=>document.fonts.ready);
      const facts=await page.evaluate(()=>({h1:[...document.querySelectorAll('h1')].map(node=>node.textContent.trim()),
        width:innerWidth,scroll:document.documentElement.scrollWidth,
        public:!!document.getElementById('ktk-storefront-public-content'),hidden:document.getElementById('ktk-storefront-root')?.hidden,
        images:[...document.querySelectorAll('.ktk-gallery__stage img')].map(node=>({src:node.currentSrc,complete:node.complete&&node.naturalWidth>0})),
        headingFont:getComputedStyle(document.querySelector('h1')).fontFamily,
        publicBooking:(()=>{const node=document.querySelector('.ktk-public-booking h2');if(!node)return null;const style=getComputedStyle(node);return {color:style.color,font:style.fontFamily};})(),
        css:[...document.querySelectorAll('link[rel="stylesheet"]')].some(node=>node.href.includes('/ktk-storefront/assets/storefront.css')&&node.getAttribute('data-no-minify')==='1'),
        productLinks:[...document.querySelectorAll('.ktk-product-card h2 a,.ktk-product-card h3 a')].map(node=>node.href),
        forms:document.querySelectorAll('#build-your-booking .ktk-configurator').length}));
      if(facts.images.some(image=>!image.complete)){
        await page.locator('.ktk-gallery__stage img').first().evaluate(node=>node.decode()).catch(()=>{});
        facts.images=await page.locator('.ktk-gallery__stage img').evaluateAll(nodes=>nodes.map(node=>({src:node.currentSrc,complete:node.complete&&node.naturalWidth>0})));
      }
      check(name+' successful response',response.status()===200);
      const expectedTitle=javaScriptEnabled&&!slug?'YourStory.':title;
      check(name+' one correct primary heading',facts.h1.length===1&&facts.h1[0]===expectedTitle,facts.h1);
      check(name+' correct progressive handoff',javaScriptEnabled?!facts.public&&!facts.hidden:facts.public&&facts.hidden);
      check(name+' no page overflow',facts.scroll<=facts.width+1,{scroll:facts.scroll,width:facts.width});
      check(name+' owned optimizer-safe stylesheet',facts.css);
      if(slug){
        check(name+' first real photo rendered',facts.images.length===1&&facts.images.every(image=>image.complete),facts.images);
        check(name+' expected heading font',/Oswald/.test(facts.headingFont),facts.headingFont);
        if(javaScriptEnabled)check(name+' booking configurator retained',facts.forms===1);
        else check(name+' public booking heading readable',facts.publicBooking?.color==='rgb(243, 238, 228)'&&/Oswald/.test(facts.publicBooking.font),facts.publicBooking);
      }else check(name+' all native product links',facts.productLinks.length===24&&facts.productLinks.every(url=>url.startsWith(base)&&!url.includes('?')));
      report.views.push({name,cache:response.headers()['cf-cache-status'],...facts});
      if(width===390||width===1440)await page.screenshot({path:path.join(folder,`${javaScriptEnabled?'js':'nojs'}-${slug||'catalog'}-${width}.png`),animations:'disabled'});
    }
    await context.close();
  }
}catch(error){report.errors.push({message:error.stack});}
finally{
  await browser.close();
  report.summary={passed:report.checks.filter(item=>item.pass).length,total:report.checks.length};
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({summary:report.summary,errors:report.errors,inheritedIntegrationErrors:report.inheritedIntegrationErrors.length,blockedWrites:report.blockedWrites.length,failed:report.checks.filter(item=>!item.pass)},null,2));
  if(report.errors.length||report.summary.passed!==report.summary.total)process.exitCode=1;
}
