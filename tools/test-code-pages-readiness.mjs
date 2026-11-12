import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {composeCodePage} from './code-page-template.mjs';
const require=createRequire(import.meta.url);
const dependencies=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(path.join(dependencies,'playwright'));
const production=process.argv.includes('--production');
const base=production?'https://krawlthroughkrakow.com':process.argv.includes('--staging')?'https://krawlthroughkrakow.com/staging':'http://127.0.0.1:5185';
const output=process.argv.includes('--output-directory')?process.argv[process.argv.indexOf('--output-directory')+1]:production?'docs/code-pages/production-release':'docs/code-pages/production-readiness';
const reportFile=output+'/'+(production?'production':base.includes('/staging')?'staging':'local')+'-readiness-tests.json';
try{await readFile(reportFile);throw new Error('Preserve earlier evidence; use --output-directory');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const assets='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const definitions=JSON.parse(execFileSync('php',['-r',"define('ABSPATH', __DIR__); $out=array(); foreach(glob($argv[1].'/pages/*.php') as $file){$page=require $file;$out[$page['key']]=$page;} echo json_encode($out);",assets],{maxBuffer:10*1024*1024}).toString());
const checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const parsed=await browser.newPage({javaScriptEnabled:false});await parsed.route('**/*',r=>r.abort());
 for(const [key,definition] of Object.entries(definitions)){
  const html=composeCodePage(await readFile(assets+definition.shell_file,'utf8'),await readFile(assets+definition.main_file,'utf8'));
  await parsed.setContent(html);
  const facts=await parsed.evaluate(()=>({
   legacy:[...document.querySelectorAll('a[href],[data-parity-href]')].flatMap(e=>['href','data-parity-href'].map(name=>e.getAttribute(name)).filter(value=>value&&(/fareharbor\.com\/embeds\/book\/krawlthroughkrakow\//.test(value)||/^(?:__KTK_HOME_URL__|https?:\/\/(?:www\.)?krawlthroughkrakow\.com\/(?:staging\/)?)store(?:\/|$)/.test(value)))),
   fragments:[...document.querySelectorAll('#main-content a[href^="#"]')].filter(a=>{const id=decodeURIComponent(a.hash.slice(1));return id.length>0&&!document.getElementById(id);}).map(a=>a.hash),
   badLabels:[...document.querySelectorAll('.ktk-parity-module-link[aria-label]')].filter(a=>/\{[^}]*:/.test(a.getAttribute('aria-label'))).length,
   widgets:document.querySelectorAll('[data-single-product-id]').length
  }));
  check(key+' all booking links use our storefront',!facts.legacy.length,facts.legacy);
  check(key+' contents anchors resolve',!facts.fragments.length,facts.fragments);
  check(key+' readable module link labels',facts.badLabels===0);
  check(key+' no remaining Ecwid widget',facts.widgets===0&&definition.ecwid.length===0);
  if(key==='new-years-eve'){
   const data=await parsed.evaluate(()=>({title:document.querySelector('.et_pb_countdown_timer .title').textContent,timestamp:document.querySelector('.et_pb_countdown_timer').dataset.endTimestamp,price:document.querySelector('.et_pb_heading_8 :is(h1,[data-ktk-heading-origin="h1"])').textContent,groups:[...document.querySelectorAll('.et_pb_text_1 .et_pb_text_inner,.et_pb_text_2 .et_pb_text_inner')].map(e=>e.textContent),bookings:[...document.querySelectorAll('#main-content a[href*="store2/"]')].filter(e=>/book/i.test(e.textContent||e.getAttribute('aria-label')||'')).map(e=>e.getAttribute('href')),floating:document.querySelector('#ktk-cta').getAttribute('href')}));
   check('NYE correct 2026/2027 title',data.title==='Krakow New Years Eve Party 2026 / 2027');
   check('NYE countdown reaches Warsaw New Year midnight',Number(data.timestamp)===1798758000);
   check('NYE only confirmed PLN price',data.price==='All for only 250 PLN');
   check('NYE two confirmed starts and TBA meeting points',data.groups.length===2&&data.groups[0].includes('5:00 PM')&&data.groups[1].includes('7:30 PM')&&data.groups.every(text=>text.includes('TBA')&&text.includes('To be confirmed')&&!/Choice|Coco|Guapo|Bracka/.test(text)));
   check('NYE content booking controls select product 32',data.bookings.length===7&&data.bookings.every(url=>url==='__KTK_HOME_URL__store2/nye-pub-crawl-32/#book'),data.bookings);
   check('NYE floating CTA selects product 32',data.floating==='__KTK_HOME_URL__store2/nye-pub-crawl-32/#book');
  }
  if(key==='about-us'){
   check('About Us approved review snapshots',await parsed.locator('.cont_TA .rev').evaluateAll(es=>es.map(e=>e.textContent).join('|'))==='3,000+ reviews|2,400+ reviews');
   check('About Us broken empty video removed',await parsed.locator('.et_pb_video_0').count()===0);
  }
  if(key==='krakow-stag-do')check('Brewery booking uses product 40',await parsed.locator('a[data-ktk-booking-product="40"]').getAttribute('href')==='__KTK_HOME_URL__store2/brewery-tour-40/#book');
 }
 await parsed.close();
 const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
 for(const key of ['post-krakow-wine-bars','how-to-join','new-years-eve','about-us'])for(const width of [320,375,390,600,601,768,980,981,1024,1280,1379,1380,1440,1499,1500,1920]){
  const route=manifest.routes.find(row=>row.key===key),page=await browser.newPage({viewport:{width,height:900}});
  await page.route('**/*',r=>['GET','HEAD'].includes(r.request().method())&&(r.request().url().startsWith(base)||r.request().url().includes('/ktk-code-pages-assets/'))?r.continue():r.abort());
  await page.goto(base+route.route+(base.startsWith('https:')?'?ktk_readiness='+Date.now():''),{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
  const label=key+' '+width,header=page.locator('#main-header'),toggle=page.locator('.mobile_menu_bar'),logo=await page.locator('#logo').boundingBox();
  check(label+' header height',Math.abs((await header.boundingBox()).height-(width<1380?80:140))<1);
  check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  if(key==='about-us'&&width<=600){
   const widgets=await page.locator('.cont_TA').evaluateAll(es=>es.map(e=>{const parent=e.closest('.et_pb_module').getBoundingClientRect();return [e,...e.querySelectorAll('.TA_text,.TA_H,.div_dot,.rev')].every(child=>{const box=child.getBoundingClientRect();return box.left>=parent.left-1&&box.right<=parent.right+1;});}));
   check(label+' review text fits its own module',widgets.length===2&&widgets.every(Boolean),widgets);
   for(const image of await page.locator('.cont_TA img').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(e=>e.decode());}
   check(label+' review photographs loaded',await page.locator('.cont_TA img').evaluateAll(es=>es.length===2&&es.every(e=>e.naturalWidth>0)));
   await page.locator('.et_pb_code_1').screenshot({path:`${output}/review-fit-${width}.png`});
   await header.scrollIntoViewIfNeeded();
  }
  if(width<1380){
   const box=await toggle.boundingBox();check(label+' compact control fits',await toggle.isVisible()&&box.y+box.height<=81&&box.x>=logo.x+logo.width);
   await toggle.focus();await page.keyboard.press('Enter');check(label+' compact menu opens',await toggle.getAttribute('aria-expanded')==='true');
   const menu=page.locator('#mobile_menu'),links=menu.locator('a[href]');check(label+' full navigation retained',await links.count()>15);
   await links.last().focus();const last=await links.last().boundingBox();check(label+' menu can reach last link',last.y>=0&&last.y+last.height<=901);
   await page.keyboard.press('Escape');check(label+' Escape closes and restores focus',await toggle.getAttribute('aria-expanded')==='false'&&await toggle.evaluate(e=>e===document.activeElement));
  }else{
   const items=await page.locator('#top-menu>li').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right};}));
   check(label+' all desktop options fit',items.length===9&&items[0].x>=logo.x+logo.width+12&&items.every(e=>e.right<=width)&&Math.max(...items.map(e=>e.y))-Math.min(...items.map(e=>e.y))<45,items);
  }
  await header.screenshot({path:`${output}/header-final-${key}-${width}.png`});
  await page.close();
 }
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),base,passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
await writeFile(reportFile,JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));
if(report.passed!==report.total)process.exitCode=1;
