import {createRequire} from 'node:module';
import {mkdir,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
const [base,output]=process.argv.slice(2);
if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base)||!output)throw Error('Known local/staging base and fresh directory required');
try{await stat(output);throw Error('Preserve previous screenshots');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({channel:'chrome',headless:true}),rows=[],writes=[];
try{
 for(const key of ['contact','krakow-stag-do','krakow-hen-do','student-trips-poland']){
  const context=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  try{
   await context.route('**/*',r=>{const request=r.request(),u=new URL(request.url()),known=new URL(base);if(!['GET','HEAD'].includes(request.method())){writes.push({key,method:request.method(),path:u.pathname});return r.abort();}return u.origin===known.origin&&(u.hostname==='127.0.0.1'||u.pathname.startsWith('/staging/'))?r.continue():r.abort();});
   const page=await context.newPage(),url=new URL(key+'/',base);if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_quote_view',Date.now().toString());
   const response=await page.goto(url.href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
   const intro=page.locator(key==='contact'?'[data-ktk-contact-copy]':'[data-ktk-group-planning-review]').first(),paragraph=intro.locator(':scope > p').last();
   await paragraph.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,key+'-390.png'),animations:'disabled'});
   const text=await paragraph.textContent();if(response.status()!==200||!text.includes('Our team replies by email after reviewing your enquiry.'))throw Error('Unexpected enquiry copy');
   rows.push({key,status:response.status(),replyVisible:await paragraph.isVisible(),screenshot:key+'-390.png'});
  }finally{await context.close();}
 }
}finally{await browser.close();}
await writeFile(path.join(output,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),base,rows,writes,noMessagesSent:true},null,2)+'\n');
console.log(JSON.stringify({views:rows.length,allVisible:rows.every(row=>row.replyVisible),writes:writes.length}));
if(rows.length!==4||writes.length)process.exitCode=1;
