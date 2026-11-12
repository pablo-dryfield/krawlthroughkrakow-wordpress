import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const directory='docs/code-pages/production-readiness';
const option=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const label=option('--label','before');
const widths=option('--widths','1024,1280,1440,1536,1920').split(',').map(Number);
await mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report=[];
try {
 const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
 for(const key of ['post-krakow-wine-bars','how-to-join','new-years-eve'])for(const width of widths){
  const route=manifest.routes.find(row=>row.key===key);
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.route('**/*',request=>request.request().url().startsWith('http://127.0.0.1:5185')?request.continue():request.abort());
  await page.goto('http://127.0.0.1:5185'+route.route,{waitUntil:'load'});
  await page.evaluate(()=>document.fonts.ready);
  const data=await page.evaluate(()=>{
   const facts=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.textContent.trim().replace(/\s+/g,' '),x:r.x,y:r.y,width:r.width,height:r.height,display:s.display,position:s.position,font:s.font,padding:s.padding,margin:s.margin,whiteSpace:s.whiteSpace};};
   return {header:facts(document.querySelector('#main-header')),container:facts(document.querySelector('#main-header>.container')),navigation:facts(document.querySelector('#et-top-navigation')),logo:facts(document.querySelector('#logo')),logoContainer:facts(document.querySelector('.logo_container')),mobile:facts(document.querySelector('#et_mobile_nav_menu')),toggle:facts(document.querySelector('.mobile_menu_bar')),menu:facts(document.querySelector('#top-menu')),items:[...document.querySelectorAll('#top-menu>li')].map(facts),links:[...document.querySelectorAll('#top-menu>li>a')].map(facts)};
  });
  report.push({key,width,...data});
  await page.locator('#main-header').screenshot({path:`${directory}/header-${label}-${key}-${width}.png`});
  await page.close();
 }
}finally{await browser.close();}
await writeFile(`${directory}/header-${label}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report.filter(row=>row.width===widths[0]),null,2));
