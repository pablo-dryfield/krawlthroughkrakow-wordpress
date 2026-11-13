import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output=process.argv[2];if(!output)throw Error('Fresh output file required');
try{await readFile(output);throw Error('Preserve prior navigation evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const browser=await chromium.launch({channel:'chrome',headless:true}),report={checkedAt:new Date().toISOString(),requests:[],pages:[],events:[],errors:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
 await context.exposeBinding('reportNyeClick',(_,value)=>report.events.push(value));
 await context.addInitScript(()=>{Date.now=()=>1798801200000;addEventListener('click',event=>{const a=event.target.closest('a');window.reportNyeClick({href:a?.href,target:a?.target,prevented:event.defaultPrevented,where:location.href});});});
 await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url()),headers=r.headers();if(u.origin==='https://krawlthroughkrakow.com'&&/new-years-eve/.test(u.pathname))report.requests.push({method:r.method(),type:r.resourceType(),navigation:r.isNavigationRequest(),purpose:headers.purpose,secPurpose:headers['sec-purpose'],url:r.url()});return ['GET','HEAD'].includes(r.method())&&u.origin==='https://krawlthroughkrakow.com'&&u.pathname.startsWith('/staging/')&&!/\/(?:store2|wp-json\/ktk-storefront)(?:\/|$)/.test(u.pathname)?route.continue():route.abort();});
 context.on('page',page=>{page.on('pageerror',error=>report.errors.push(error.message));page.on('framenavigated',frame=>{if(frame===page.mainFrame())report.pages.push({url:frame.url()});});});
 const page=await context.newPage();await page.goto('https://krawlthroughkrakow.com/staging/?ktk_nye_navigation='+new Date().getTime(),{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
 const link=page.locator('[data-campaign="nye"] .ktk-hero-cta');report.before=await link.evaluate(a=>({href:a.href,target:a.target,html:a.outerHTML,serviceWorker:!!navigator.serviceWorker?.controller}));
 await link.click({noWaitAfter:true});await page.waitForTimeout(3000);report.after={url:page.url(),pageCount:context.pages().length,urls:context.pages().map(p=>p.url())};
 await context.close();
}finally{await browser.close();await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
