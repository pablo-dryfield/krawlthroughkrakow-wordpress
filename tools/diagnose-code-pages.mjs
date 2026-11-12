import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const key=process.argv[2]||'blog',selector=process.argv[3]||'.et_pb_container',width=Number(process.argv[4]||390);
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width,height:844}});
 const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
 const route=manifest.routes.find(r=>r.key===key);
 for(const target of ['source','local']){
  if(target==='source'){
   await page.route('**/*',r=>r.abort());
   await page.setContent(await readFile(`${route.source}/production-${width}.html`,'utf8'));
   const data=JSON.parse(await readFile(`${route.source}/production-${width}.json`,'utf8'));
   for(const sheet of data.cssom.filter(s=>s.text)) await page.addStyleTag({content:sheet.text});
  }else{await page.unroute('**/*');await page.goto('http://127.0.0.1:5185'+route.route);await page.waitForTimeout(1000);await page.evaluate(()=>document.fonts.ready);}
  console.log(target,await page.locator(selector).evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {html:e.outerHTML.slice(0,900),box:{x:r.x,y:r.y,width:r.width,height:r.height},css:Object.fromEntries(['height','minHeight','display','backgroundColor','padding','fontSize','lineHeight','transform','opacity'].map(k=>[k,s[k]]))};})));
 }
}finally{await browser.close();}
