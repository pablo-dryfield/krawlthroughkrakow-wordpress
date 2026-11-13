import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {isBlockedOptimizerFeedback} from './blocked-browser-request-policy.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [base,output]=process.argv.slice(2);
if(!base||!output)throw Error('Explicit isolated store and fresh report directory required');
const address=new URL(base);
if(!(address.origin==='https://krawlthroughkrakow.com'&&address.pathname==='/staging/store2/')&&!(address.protocol==='http:'&&address.hostname==='127.0.0.1'&&address.pathname==='/store2/'))throw Error('Staging or isolated loopback only');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const report={checkedAt:new Date().toISOString(),base,scope:'Read-only initial and scrolled short-viewport cart geometry/focus. All non-read requests aborted, including recognized WP Rocket optimization feedback; no commerce, personal data, optimization or consent writes. Emulated CSS dimensions are separate from actual native Chrome zoom observations.',checks:[],errors:[],blockedWrites:[],strictAttemptObservations:[],realMutations:0};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const slug of ['','pub-crawl-28','nye-pub-crawl-32'])for(const [width,height] of [[381,167],[390,320],[768,360],[1440,450],[390,451],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),name=(slug||'catalog')+' '+width+'x'+height;
  try{
   context.on('requestfinished',request=>{if(!['GET','HEAD'].includes(request.method()))report.realMutations++;});
   await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(!['GET','HEAD'].includes(req.method())){
     let action=url.searchParams.get('action');
     try{action ||= req.postDataJSON()?.action;}catch{}
     const contentType=req.headers()['content-type']||'';
     if(!action&&contentType.startsWith('multipart/form-data')){
      try{
       const form=await new Request(req.url(),{method:req.method(),headers:{'Content-Type':contentType},body:req.postDataBuffer()}).formData();
       action=form.get('action');
      }catch{}
     }
     const metadata={view:name,method:req.method(),origin:url.origin,path:url.pathname,
      contentType:contentType.split(';')[0],action:typeof action==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(action)?action:null};
     await route.abort();
     report.blockedWrites.push({...metadata,blocked:true});
     return;
    }
    return url.origin===address.origin?route.continue():route.abort();
   });
   const url=new URL(slug?slug+'/':'',base);if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_short_view','20261113-'+Date.now());
   await page.goto(url.href,{waitUntil:'load'});
   await page.waitForFunction(()=>document.getElementById('ktk-storefront-root')?.hidden===false&&!document.getElementById('ktk-storefront-public-content'));
   if(await page.locator('.ktk-error').count())throw Error('Client error, not a ready store');
   await page.evaluate(()=>document.fonts.ready);
   const cart=page.locator('.ktk-cart-link');
   check(name+' expected cart layout mode',await cart.evaluate(node=>getComputedStyle(node).position)===(height<=450?'static':'fixed'));
   check(name+' cart initially within viewport',await cart.evaluate(node=>{const box=node.getBoundingClientRect();return box.x>=0&&box.right<=innerWidth+1&&box.y>=0&&box.bottom<=innerHeight+1;}));
   check(name+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(height<=450){
    check(name+' cart never overlays main',await cart.evaluate(node=>node.getBoundingClientRect().bottom<=document.querySelector('main').getBoundingClientRect().top+1));
    await page.evaluate(()=>scrollTo(0,900));
    check(name+' cart scrolls away instead of covering content',await cart.evaluate(node=>node.getBoundingClientRect().bottom<=0));
    if(slug){
     const men=page.getByRole('button',{name:'Number of men: 0',exact:true});await men.focus();
     check(name+' keyboard quantity is fully visible without cart overlay',await men.evaluate(node=>{const box=node.getBoundingClientRect(),cart=document.querySelector('.ktk-cart-link').getBoundingClientRect();return document.activeElement===node&&box.top>=0&&box.bottom<=innerHeight+1&&cart.bottom<=0;}));
    }
   }
   const firstParty=report.blockedWrites.filter(row=>row.view===name&&row.origin===address.origin);
   report.strictAttemptObservations.push({view:name,noFirstPartyWriteAttempts:firstParty.length===0});
   check(name+' no non-read transmission or unexpected first-party attempts',report.realMutations===0&&firstParty.every(row=>isBlockedOptimizerFeedback(row,base)));
   if(slug==='pub-crawl-28'&&height===167)await page.screenshot({path:path.join(output,'focused-381x167.png')});
  }catch(error){report.errors.push({view:name,message:error.stack});}finally{await context.close();}
 }
}finally{
 await browser.close();report.passed=report.checks.filter(x=>x.pass).length;report.total=report.checks.length;
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,total:report.total,errors:report.errors,failed:report.checks.filter(x=>!x.pass)},null,2));
 if(report.errors.length||report.passed!==report.total||report.realMutations)process.exitCode=1;
}
