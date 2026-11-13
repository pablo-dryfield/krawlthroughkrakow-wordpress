import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const sharp=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));
const output=process.argv[2];if(!output)throw new Error('New output directory required');
try{await readFile(path.join(output,'report.json'));throw new Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const report={checks:[],errors:[],views:[],mutations:0,scope:'Original SVGs/photos, local real-media rendering; no external APIs, forms or commerce writes.'};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [width,javaScriptEnabled] of [[320,true],[390,true],[768,true],[1440,true],[390,false],[1440,false]]){
  const name=width+' '+(javaScriptEnabled?'JS':'no-JS'),samples=[],shots=[];
  for(const [phase,port] of [['before',5185],['after',5184]]){
   const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled,reducedMotion:'reduce'});
   await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'&&['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
   const page=await context.newPage(),images=[];page.on('pageerror',error=>report.errors.push({name,phase,message:error.message}));
   page.on('request',request=>{if(request.resourceType()==='image')images.push(request.url());});
   const response=await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'load'});
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.ktk-hero-statue')].map(image=>image.decode()));});
   await page.waitForTimeout(300);
   const initialPhotos=images.filter(url=>url.includes('/parity/')&&!url.includes('new_logo_solid'));
   const source=await page.evaluate(markup=>{
    const doc=new DOMParser().parseFromString(markup,'text/html');doc.querySelectorAll('script,style').forEach(node=>node.remove());
    doc.querySelectorAll('img').forEach(image=>{image.removeAttribute('loading');image.removeAttribute('fetchpriority');});
    return doc.body.innerHTML;
   },await response.text());
   if(phase==='after'){
    check(name+' top hero stays eager and high priority',await page.locator('.ktk-hero-statue').evaluateAll(images=>images.length===2&&images.every(image=>image.loading!=='lazy'&&image.fetchPriority==='high')));
    check(name+(javaScriptEnabled?' body photos no longer compete with hero':' no-JS preserves eager photo access'),javaScriptEnabled?initialPhotos.length<samples[0].initialPhotos.length:initialPhotos.length===samples[0].initialPhotos.length,{before:samples[0].initialPhotos.length,after:initialPhotos.length});
   }
    if(javaScriptEnabled){
     const gallery=page.locator('.et_pb_gallery_fullwidth').first();await gallery.scrollIntoViewIfNeeded();
     if(phase==='after'){
      await page.waitForFunction(()=>document.querySelector('.et_pb_gallery_fullwidth .et_pb_gallery_item:nth-child(2) img')?.loading==='eager');
      check(name+' adjacent carousel photo warms only when visible',await gallery.locator('.et_pb_gallery_item').nth(1).locator('img').evaluate(image=>image.loading==='eager'&&image.fetchPriority==='low'));
     }
     const next=gallery.getByRole('button',{name:'Next photo',exact:true});await next.focus();await page.keyboard.press('Enter');
     await gallery.locator('.et-pb-active-slide img').evaluate(image=>image.decode());
     check(name+' '+phase+' keyboard next photo is visible and decoded',await gallery.locator('.et-pb-active-slide').evaluate(slide=>slide.getAttribute('aria-label')==='2 of 9'&&slide.querySelector('img').naturalWidth>0));
     await gallery.getByRole('button',{name:'Previous photo',exact:true}).click();
    }
    const portrait=page.locator('.et_pb_image_8 img').first();await portrait.scrollIntoViewIfNeeded();await portrait.evaluate(image=>image.decode());
    const decoded=await portrait.evaluate(image=>({complete:image.complete,naturalWidth:image.naturalWidth,source:image.currentSrc}));
    check(name+' '+phase+' native scrolling loads lower photos',decoded.complete&&decoded.naturalWidth>0,decoded);
   await page.evaluate(async()=>{
    for(const image of document.images)image.loading='eager';
    await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));window.scrollTo(0,0);await document.fonts.ready;
   });
   await page.waitForTimeout(150);
   const geometry=await page.locator('#main-content img,#main-content h1,#main-content h2,#main-content h3,#main-content h4,#main-content h5,#main-content h6').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return {tag:node.tagName,text:node.tagName==='IMG'?node.getAttribute('alt'):node.textContent.trim(),x:box.x,y:box.y,width:box.width,height:box.height};}));
   check(name+' '+phase+' no page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const shot=await page.screenshot({path:path.join(output,name.replace(' ','-')+'-'+phase+'.png'),animations:'disabled'});
   shots.push(await sharp(shot).ensureAlpha().raw().toBuffer());samples.push({source,geometry,initialPhotos});
   await context.close();
  }
  check(name+' original content/links/assets/alt/dimensions unchanged',samples[0].source===samples[1].source);
  check(name+' original image/heading geometry unchanged',JSON.stringify(samples[0].geometry)===JSON.stringify(samples[1].geometry));
  check(name+' first viewport pixels identical',shots[0].equals(shots[1]));
  report.views.push({name,beforeInitialPhotos:samples[0].initialPhotos.length,afterInitialPhotos:samples[1].initialPhotos.length});
 }
}catch(error){report.errors.push(error.stack);}finally{
 await browser.close();report.passed=report.checks.filter(row=>row.pass).length;report.total=report.checks.length;
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 if(report.errors.length||report.passed!==report.total)process.exitCode=1;
}
