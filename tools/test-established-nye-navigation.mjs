import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const [base,output]=process.argv.slice(2);if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base)||!output)throw Error('Explicit local/staging base and fresh report required');
try{await readFile(output);throw Error('Preserve prior evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),checks=[],errors=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});let destinations=0,writes=0;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const width of [390,1440])for(const javaScriptEnabled of [true,false])for(const path of ['new-years-eve/','about-us/how-to-join/']){
  const target='https://krawlthroughkrakow.com/staging/'+path,label=width+' '+(javaScriptEnabled?'JS':'no-JS')+' '+path,context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled,serviceWorkers:'block'});
  try{
   await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());if(!['GET','HEAD'].includes(q.method())){writes++;return r.abort();}if(u.href===target){destinations++;return r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Intercepted guide destination</title><p>Fixture only</p>'});}return u.origin===new URL(base).origin&&(u.hostname==='127.0.0.1'||u.pathname.startsWith('/staging/'))?r.continue():r.abort();});
   const page=await context.newPage();page.on('pageerror',e=>errors.push({label,message:e.message}));await page.goto(new URL('krakow-new-years-eve/',base).href,{waitUntil:'load',timeout:60000});const anchor=page.locator('[data-ktk-established-nye-review] a[href="'+target+'"]');await anchor.focus();
   check(label+' meaningful native link receives keyboard focus',await anchor.evaluate(n=>document.activeElement===n&&!!n.textContent.trim()));await page.keyboard.press('Enter');await page.waitForURL(target,{waitUntil:'load',timeout:15000});
   check(label+' exact information/regular guidance destination',page.url()===target);check(label+' real destination intercepted before any load',await page.title()==='Intercepted guide destination');
  }finally{await context.close();}
 }
}catch(error){errors.push({stack:error.stack});}finally{await browser.close();}
check('all eight destinations intercepted',destinations===8,destinations);check('no real message/commerce/conversion write',writes===0,writes);check('no browser/harness errors',!errors.length,errors);
const report={checkedAt:new Date().toISOString(),base,scope:'Native Enter with JS/no-JS; NYE and regular guidance pages fulfilled in isolated browser, never real destination/provider navigation. No purchase, form, account or consent change.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks,errors};await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
