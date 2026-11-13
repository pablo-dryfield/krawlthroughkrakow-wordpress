import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const modules=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(path.join(modules,'playwright'));
const sharp=require(path.join(modules,'sharp'));
const output=process.argv[2];if(!output)throw Error('New output directory required');
const live=process.argv[3];
const control=live==='--control';
if(live&&!control&&live!=='https://krawlthroughkrakow.com/staging/')throw Error('Only the approved staging homepage can be tested');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier report');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const names=['i6agsskidpgwcluwywc6','jgqte2id3waqv2vs8edd','ciaiu30657qcru0sdnnb','ppygtlcm5nb6j4lsr251','ccz58hmwdrzaaktxvokp','ygkzrcl8zu8ybudwpmys'];
const matches=url=>names.some(name=>url.includes(name));
const report={checks:[],views:[],errors:[],blockedWrites:0,control,scope:'Read-only homepage sizing; providers blocked, no forms/orders/consent changes. Explicit media sizes require no auto-sizing browser support.'};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [width,dpr,js] of [[390,3,true],[768,1,true],[981,1,true],[1024,1,true],[1440,1,true],[1920,1,true],[1440,3,true],[1920,3,true],[2560,2,true],[390,3,false],[1440,1,false]]){
  const label=`${width}-${dpr}-${js?'js':'nojs'}`,samples=[];
  for(const phase of live&&!control?['after']:['before','after']){
   const base=control?'http://127.0.0.1:5186/':live||(phase==='before'?'http://127.0.0.1:5186/':'http://127.0.0.1:5184/');
   const origin=new URL(base).origin;
   const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:dpr,javaScriptEnabled:js,reducedMotion:'reduce'});
   const fetched=[];
   await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(!['GET','HEAD'].includes(request.method())){report.blockedWrites++;return route.abort();}
    if(url.origin!==origin)return route.abort();
    return route.continue();
   });
   const page=await context.newPage();page.on('pageerror',error=>report.errors.push({label,phase,message:error.message}));
   page.on('response',response=>{if(matches(response.url()))fetched.push(response);});
   const response=await page.goto(base,{waitUntil:'load'});check(label+' '+phase+' HTTP',response.status()===200);
   if(live&&!control)check(label+' staging noindex',/noindex/i.test((await page.locator('meta[name="robots"]').getAttribute('content'))||''));
   const raw=await response.text();
   const normalized=await page.evaluate(({raw,names})=>{
    const doc=new DOMParser().parseFromString(raw,'text/html');
    const icons=[...doc.images].filter(image=>names.some(name=>image.src.includes(name)));
    const sizes=icons.map(image=>image.getAttribute('sizes'));
    icons.forEach(image=>image.removeAttribute('sizes'));
    return {html:doc.documentElement.outerHTML,sizes};
   },{raw,names});
   if(phase==='after'&&!control)check(label+' exactly six scoped size hints',normalized.sizes.length===6&&normalized.sizes.every(value=>value==='(max-width: 980px) 40vw, 12vw'));
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.ktk-hero-statue')].map(image=>image.decode()));});
   await page.waitForTimeout(200);
   const top=await page.screenshot({path:path.join(output,label+'-'+phase+'-top.png'),animations:'disabled'});
   const icons=page.locator(names.map(name=>'img[src*="'+name+'"]').join(','));
   const visible=[];
   for(let i=0;i<await icons.count();i++){
    const icon=icons.nth(i);if(await icon.isVisible()){
     await icon.scrollIntoViewIfNeeded();await icon.evaluate(image=>image.decode());visible.push(i);
     if([1024,1440].includes(width)&&dpr===1&&js)await icon.screenshot({path:path.join(output,label+'-'+phase+'-icon'+i+'.png'),animations:'disabled'});
    }
   }
   const rows=await icons.evaluateAll(images=>images.map(image=>{const box=image.getBoundingClientRect();return {src:image.getAttribute('src'),current:image.currentSrc,width:box.width,height:box.height,visible:box.width>0&&box.height>0,complete:image.complete,naturalWidth:image.naturalWidth,sizes:image.sizes,loading:image.loading};}));
   const resources=[];
   for(const item of fetched){const body=await item.body();const meta=await sharp(body).metadata();resources.push({url:item.url(),bytes:body.length,width:meta.width,height:meta.height});}
   check(label+' '+phase+' visible icons decode',rows.every(row=>!row.visible||(row.complete&&row.naturalWidth>0)));
   if(width<=768&&js)check(label+' '+phase+' hidden icons not requested',rows.every(row=>!row.visible)&&resources.length===0);
   if(phase==='after'&&visible.length&&!control){
    check(label+' adequate candidate resolution',rows.every(row=>!row.visible||resources.some(item=>item.url===row.current&&item.width>=row.width*dpr-1)),{rows,resources});
    check(label+' declared size covers actual slot',rows.every(row=>!row.visible||width*(width<=980?.4:.12)>=row.width));
    if(js&&dpr===1)check(label+' selects existing 480 sources',rows.every(row=>!row.visible||row.current.includes('-480x480.webp')));
   }
   if(js){
    const gallery=page.locator('.et_pb_gallery_fullwidth').first();await gallery.scrollIntoViewIfNeeded();
    const next=gallery.getByRole('button',{name:'Next photo',exact:true});await next.focus();await page.keyboard.press('Enter');
    await gallery.locator('.et-pb-active-slide img').evaluate(image=>image.decode());
    check(label+' '+phase+' gallery remains keyboard-operable',await gallery.locator('.et-pb-active-slide').evaluate(slide=>slide.getAttribute('aria-label')==='2 of 9'));
   }
   await page.evaluate(()=>window.scrollTo(0,0));
   const geometry=await page.locator('#main-content img,#main-content h1,#main-content h2,#main-content h3').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return {tag:node.tagName,x:box.x,y:box.y,width:box.width,height:box.height};}));
   check(label+' '+phase+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   samples.push({phase,normalized,geometry,rows,resources,top:await sharp(top).ensureAlpha().raw().toBuffer()});
   await context.close();
  }
  if(!live||control){const [before,after]=samples;
   check(label+' all other HTML attributes/content unchanged',before.normalized.html===after.normalized.html);
   check(label+' image/heading geometry unchanged',JSON.stringify(before.geometry)===JSON.stringify(after.geometry));
   let changedPixels=0;for(let i=0;i<before.top.length;i+=4)if(before.top[i]!==after.top[i]||before.top[i+1]!==after.top[i+1]||before.top[i+2]!==after.top[i+2]||before.top[i+3]!==after.top[i+3])changedPixels++;
   check(label+' first viewport pixels exact',before.top.equals(after.top),{changedPixels,totalPixels:before.top.length/4});
   if(!control&&width>=981&&dpr===1&&js)check(label+' fewer icon response bytes',after.resources.reduce((n,r)=>n+r.bytes,0)<before.resources.reduce((n,r)=>n+r.bytes,0));
  }
  report.views.push({label,samples:samples.map(({top,normalized,geometry,...sample})=>sample)});
 }
}catch(error){report.errors.push(error.stack);}finally{
 await browser.close();report.passed=report.checks.filter(row=>row.pass).length;report.total=report.checks.length;
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,total:report.total,errors:report.errors,blockedWrites:report.blockedWrites,failed:report.checks.filter(row=>!row.pass)},null,2));
 if(report.errors.length||report.blockedWrites||report.passed!==report.total)process.exitCode=1;
}
