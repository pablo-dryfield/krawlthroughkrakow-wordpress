import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const [base,output]=process.argv.slice(2);if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base)||!output)throw Error('Explicit local/staging base and fresh output required');
try{await readFile(output);throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const cases=[
 {selector:'[data-ktk-contact-copy] a',index:0,url:new URL('store2/pub-crawl-28/#book',base).href},
 {selector:'[data-ktk-contact-copy] a',index:1,url:new URL('meeting-point/',base).href},
 {selector:'[data-ktk-contact-map-fallback] a',index:0,url:'https://maps.app.goo.gl/S3kQZC5rdABdpA1G9',popup:true},
 {selector:'[data-ktk-contact-map-fallback] a',index:1,url:new URL('meeting-point/',base).href}
];
const checks=[],errors=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail}),browser=await chromium.launch({channel:'chrome',headless:true});let interceptedDestinations=0,blockedWrites=0;
try{
 for(const width of [390,1440])for(const javaScriptEnabled of [true,false])for(const [i,item]of cases.entries()){
  const label=width+' '+(javaScriptEnabled?'JS':'no-JS')+' link'+i,context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled,serviceWorkers:'block'});
  try{
   await context.route('**/*',r=>{const request=r.request(),u=new URL(request.url());
    if(!['GET','HEAD'].includes(request.method())){blockedWrites++;return r.abort();}
    if(u.href.split('#')[0]===item.url.split('#')[0]){interceptedDestinations++;return r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Intercepted native destination</title><p>Fixture only; nothing booked or sent.</p>'});}
    if(u.origin!==new URL(base).origin||u.hostname!=='127.0.0.1'&&!u.pathname.startsWith('/staging/')&&u.pathname!=='/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js')return r.abort();return r.continue();
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push({label,message:e.message}));await page.goto(new URL('contact/',base).href,{waitUntil:'load',timeout:60000});
   const anchor=page.locator(item.selector).nth(item.index);await anchor.focus();check(label+' keyboard focus reaches meaningful native anchor',await anchor.evaluate(a=>document.activeElement===a&&!!a.textContent.trim()));
   const popup=item.popup?page.waitForEvent('popup'):null;await page.keyboard.press('Enter');const destination=popup?await popup:page;
   await destination.waitForURL(item.url,{waitUntil:'load',timeout:15000});check(label+' Enter navigates to exact expected destination',destination.url()===item.url,{expected:item.url,actual:destination.url()});
   check(label+' destination was fulfilled locally, never sent to store/provider',await destination.title()==='Intercepted native destination');
   if(item.popup)check(label+' external tab has no opener',await destination.evaluate(()=>window.opener===null));
  }finally{await context.close();}
 }
}catch(error){errors.push({stack:error.stack});}finally{await browser.close();}
check('all16 expected destination requests intercepted',interceptedDestinations===16,interceptedDestinations);check('no form/commerce/conversion writes',blockedWrites===0,blockedWrites);check('no browser/harness errors',!errors.length,errors);
const report={checkedAt:new Date().toISOString(),base,scope:'Actual keyboard activation with JS on/off; every store/meeting/Maps destination fulfilled locally before navigation. No real store/provider navigation, message, cart or order.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks,errors};await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
