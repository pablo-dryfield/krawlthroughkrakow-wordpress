import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base=process.argv.includes('--staging')?'https://krawlthroughkrakow.com/staging':'http://127.0.0.1:5185';
const selected=process.argv.includes('--keys')?process.argv[process.argv.indexOf('--keys')+1].split(','):null;
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[];const check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
try{
 const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
 for(const key of ['how-to-join','faqs','gallery','blog','contact','pub-crawl-jobs','krakow-hen-do','krakow-stag-do','student-trips-poland','stagshens','post-welcome-to-alcohol','new-years-eve','testimonials'].filter(key=>!selected||selected.includes(key)))for(const width of [320,390,768,1024,1440,1920]){
  const route=manifest.routes.find(r=>r.key===key),context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;});
  await page.route('**/*',r=>{
   const request=r.request(),url=request.url();
   if(request.method()==='POST'){requests.push(url);return r.fulfill({contentType:'application/json',body:JSON.stringify(url.includes('/feedback')?{status:'mail_sent',message:'Controlled success'}:{success:true,data:{message:'Controlled success'}})});}
   if(url.includes('action=ktk_pages_form_token'))return r.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{nonce:'controlled',challenge:{token:'controlled',first:4,second:7}}})});
   if(request.resourceType()==='document'&&request.frame()!==page.mainFrame())return r.fulfill({contentType:'text/html',body:'<!doctype html><title>Controlled external embed</title>'});
   if(!url.startsWith(base)&&!url.includes('/ktk-code-pages-assets/')&&!url.startsWith('data:'))return r.abort();
   return r.continue();
  });
  await page.goto(base+route.route+(base.includes('/staging')?'?ktk_components=20261105':''),{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
  const label=`${key} ${width}`;
  check(label+' section contract',await page.locator('#main-content .et_pb_section').count()===route.expectedSections);
  check(label+' no Divi runtime',!(await page.locator('script[src]').evaluateAll(es=>es.some(e=>/themes\/Divi|et-cache|jquery/.test(e.src)))));
  check(label+' no attribution fixtures',!(await page.locator('#page-container a[href]').evaluateAll(es=>es.some(e=>/codex-test|test-click-id/.test(e.href)))));
  check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  const toggle=page.locator('.mobile_menu_bar');
  if(width<=1379){await toggle.focus();await page.keyboard.press('Enter');check(label+' keyboard menu opens',await toggle.getAttribute('aria-expanded')==='true');await page.keyboard.press('Escape');check(label+' menu Escape',await toggle.getAttribute('aria-expanded')==='false');}
  const faq=page.locator('.et_pb_toggle_title').first();
  if(await faq.count()){const before=await faq.getAttribute('aria-expanded');await faq.focus();await page.keyboard.press('Enter');check(label+' FAQ keyboard',await faq.getAttribute('aria-expanded')!==before);}
  for(const carousel of await page.locator('.et_pb_gallery_fullwidth,.et_pb_slider').all()){
   const next=carousel.locator('.et-pb-arrow-next');if(!await next.count())continue;
   const first=carousel.locator('.et-pb-active-slide').first();const before=await first.evaluate(e=>e.outerHTML);
   await next.evaluate(e=>e.click());check(label+' carousel next',await carousel.locator('.et-pb-active-slide').first().evaluate(e=>e.outerHTML)!==before);
  }
  const photo=page.locator('.et_pb_gallery_image a[href],a.et_pb_lightbox_image[href]').first();
  if(await photo.count()){await photo.evaluate(e=>e.click());check(label+' lightbox opens',await page.locator('dialog[open]').count()===1);await page.locator('dialog[open] img').evaluate(e=>e.decode().catch(()=>{}));check(label+' lightbox photo loaded',await page.locator('dialog[open] img').evaluate(e=>e.naturalWidth>0));await page.keyboard.press('Escape');check(label+' lightbox Escape',await page.locator('dialog[open]').count()===0);}
  const frames=page.locator('iframe[data-ktk-embed-src]');
  if(await frames.count()){
   check(label+' media blocked',await frames.evaluateAll(es=>es.every(e=>e.getAttribute('src')==='about:blank')));
   await page.evaluate(()=>{window._iub={cs:{api:{getPreferences:()=>({purposes:{3:true}})}}};dispatchEvent(new Event('iubenda_consent_given_purpose_3'));});
   check(label+' consent loads media',await frames.evaluateAll(es=>es.every(e=>e.src===e.dataset.ktkEmbedSrc)));
   await page.evaluate(()=>{window._iub.cs.api.getPreferences=()=>({purposes:{3:false}});dispatchEvent(new Event('iubenda_consent_rejected'));});
   check(label+' withdrawal unloads media',await frames.evaluateAll(es=>es.every(e=>e.getAttribute('src')==='about:blank')));
  }
  for(const form of await page.locator('form[data-ktk-form]').all()){
   await form.evaluate(form=>{let closed;while((closed=form.closest('.et_pb_toggle_close')))closed.querySelector('.et_pb_toggle_title')?.click();});
   await form.locator('input:not([type=hidden]),textarea').first().focus();await page.waitForTimeout(100);
   await form.evaluate(form=>{for(const e of form.elements){if(e.type==='email')e.value='qa@example.test';else if(e.name==='captcha')e.value='11';else if(e.type==='checkbox'||e.type==='radio')e.checked=true;else if(e.tagName==='SELECT')e.selectedIndex=Math.max(0,e.options.length-1);else if((e.tagName==='TEXTAREA'||['text','tel','number','date'].includes(e.type))&&!e.name.startsWith('_ktk_'))e.value=e.type==='number'?'2':e.type==='date'?'2026-12-31':'Controlled test';}form.requestSubmit();});
   await page.waitForTimeout(150);check(label+' form response',await form.getAttribute('data-status')==='sent');
   if(await form.getAttribute('data-ktk-form')==='cf7')check(label+' CF7 response visible',await form.locator('.wpcf7-response-output').isVisible());
  }
  check(label+' no JS errors',errors.length===0,errors);await context.close();
 }
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),base,passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
await writeFile('docs/code-pages/full-migration/components-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
