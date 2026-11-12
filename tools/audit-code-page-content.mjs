import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out='docs/code-pages/production-readiness';
const label=process.argv.includes('--label')?process.argv[process.argv.indexOf('--label')+1]:'before';
await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
const report={checkedAt:new Date().toISOString(),bookingLinks:[],nye:[],fragmentIssues:[],linkLabels:[]};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
 for(const route of manifest.routes){
  await page.setContent(await readFile(`staging/wp-content/mu-plugins/ktk-code-pages-assets/content/${route.key}.html`,'utf8'));
  const data=await page.evaluate(()=>({
   booking:[...document.querySelectorAll('a[href]')].filter(e=>/fareharbor|brunch|p\d{6,}/.test(e.getAttribute('href'))).map(e=>({url:e.getAttribute('href'),text:e.textContent.trim()})),
   fragments:[...document.querySelectorAll('a[href^="#"]')].filter(e=>e.hash.length>1&&!document.getElementById(decodeURIComponent(e.hash.slice(1)))).map(e=>({url:e.getAttribute('href'),text:e.textContent.trim()})),
   headings:[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e=>({id:e.id,text:e.textContent.trim().slice(0,250)})),
   labels:[...document.querySelectorAll('[aria-label]')].filter(e=>/\{[^}]*:/.test(e.getAttribute('aria-label'))).map(e=>({tag:e.tagName,label:e.getAttribute('aria-label').slice(0,150)})),
   nye:[...document.querySelectorAll('h1,h2,h3,p,.et_pb_countdown_timer,a.et_pb_button')].filter(e=>e.textContent.trim()).map(e=>({selector:e.className,tag:e.tagName,text:e.textContent.trim(),html:e.outerHTML.slice(0,1200)}))
  }));
  if(data.booking.length)report.bookingLinks.push({key:route.key,links:data.booking});
  if(data.fragments.length)report.fragmentIssues.push({key:route.key,links:data.fragments,headings:data.headings});
  if(data.labels.length)report.linkLabels.push({key:route.key,labels:data.labels});
  if(route.key==='new-years-eve')report.nye=data.nye;
 }
}finally{await browser.close();}
const response=await fetch('https://krawlthroughkrakow.com/wp-json/ktk-storefront/v1/products/nye-pub-crawl-32');
if(!response.ok)throw new Error('NYE product source unavailable');
const payload=await response.json();
await writeFile(`${out}/nye-product-source.json`,JSON.stringify({checkedAt:new Date().toISOString(),url:response.url,...payload},null,2));
await writeFile(`${out}/content-${label}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({bookingLinks:report.bookingLinks,fragmentIssues:report.fragmentIssues,labelIssues:report.linkLabels.length},null,2));
