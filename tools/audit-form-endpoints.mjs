import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const [base,output]=process.argv.slice(2);
if(!['https://krawlthroughkrakow.com/','https://krawlthroughkrakow.com/staging/'].includes(base)||!output)throw Error('Explicit known environment and fresh output required');
try{await readFile(output);throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const routes=['contact/','pub-crawl-jobs/','krakow-hen-do/','krakow-stag-do/','student-trips-poland/','stagshens/','welcome-to-alcohol/'];
const report={checkedAt:new Date().toISOString(),base,readOnly:true,noMessagesSent:true,routes:[],scripts:[],blockedNonRead:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({serviceWorkers:'block'}),origin=new URL(base).origin,prefix=new URL(base).pathname;
try{
 await context.route('**/*',r=>{
  const request=r.request(),url=new URL(request.url());
  if(!['GET','HEAD'].includes(request.method())){report.blockedNonRead.push({method:request.method(),path:url.pathname});return r.abort();}
  if(url.origin!==origin||!url.pathname.startsWith(prefix)||(prefix==='/'&&url.pathname.startsWith('/staging/'))||/\/(wp-json|wp-admin|collect|quote|checkout|carts|orders)(\/|$)/.test(url.pathname))return r.abort();
  return r.continue();
 });
 const seen=new Set();
 for(const route of routes){
  const page=await context.newPage();
  try{
   const response=await page.goto(new URL(route,base).href,{waitUntil:'load',timeout:60000});
   const forms=await page.locator('form[data-ktk-form]').evaluateAll(fs=>fs.map(f=>({kind:f.dataset.ktkForm,actionAttribute:f.getAttribute('action'),actionPropertyType:Object.prototype.toString.call(f.action),shadowed:typeof f.action!=='string',hasRoutingAction:!!f.querySelector('input[name="action"][value="ktk_pages_contact"]'),feedbackEndpoint:f.dataset.feedbackEndpoint||null})));
   const scripts=await page.locator('script[src]').evaluateAll(es=>es.map(e=>e.src).filter(src=>new URL(src).pathname.endsWith('/ktk-code-pages-assets/runtime.js')));
   report.routes.push({route,status:response.status(),forms});
   if(response.status()!==200||forms.length!==1||scripts.length!==1)throw Error('Unexpected page/form/runtime inventory: '+route);
   for(const src of scripts)if(!seen.has(src)){
    const url=new URL(src);if(url.origin!==origin||url.pathname!==prefix+'wp-content/mu-plugins/ktk-code-pages-assets/runtime.js')throw Error('Unexpected runtime location');
    seen.add(src);const response=await context.request.get(src),bytes=await response.body(),js=bytes.toString('utf8');
    report.scripts.push({url:src,status:response.status(),sha256:createHash('sha256').update(bytes).digest('hex'),usesShadowedProperty:/fetch\(cf7\?form\.dataset\.feedbackEndpoint:form\.action,/.test(js),usesActionAttribute:js.includes("form.getAttribute('action')")});
   }
  }finally{await page.close();}
 }
}catch(error){report.errors.push(error.message);}finally{await browser.close();}
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({readOnly:report.readOnly,noMessagesSent:report.noMessagesSent,pages:report.routes.length,nativeForms:report.routes.flatMap(r=>r.forms).filter(f=>f.kind==='contact').length,shadowedNativeForms:report.routes.flatMap(r=>r.forms).filter(f=>f.kind==='contact'&&f.shadowed).length,runtimes:report.scripts.map(s=>({status:s.status,sha256:s.sha256,usesShadowedProperty:s.usesShadowedProperty,usesActionAttribute:s.usesActionAttribute})),errors:report.errors},null,2));
if(report.errors.length)process.exitCode=1;
