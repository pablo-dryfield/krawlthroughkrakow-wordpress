import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const [baseline,output]=process.argv.slice(2);if(!baseline||!output)throw Error('Immutable baseline and fresh output directory required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const prefix='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const originals=Object.fromEntries(['runtime.js','runtime.css'].map(file=>[file,execFileSync('git',['show',baseline+':'+prefix+file],{maxBuffer:20*1024*1024})]));
const routes=['contact','pub-crawl-jobs','krakow-hen-do','krakow-stag-do','student-trips-poland','stagshens','welcome-to-alcohol'];
const report={checkedAt:new Date().toISOString(),baseline,scope:'Same local HTML, isolated original runtime JS/CSS versus candidate. All providers/non-read requests blocked. Full unmasked form PNGs; visible control/label geometry excludes only the deliberately changed transparent checkbox inputs and honeypot. Empty captcha computed text color intentionally gains the same entered-value contrast; no pixels or other colors exempted.',checks:[],comparisons:[],errors:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail}),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const route of routes)for(const width of [320,390,1440]){
  const states=[];
  for(const reference of [true,false]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
   try{
    await context.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;});
    await context.route('**/*',r=>{
     const request=r.request(),u=new URL(request.url());if(!['GET','HEAD'].includes(request.method())||u.origin!=='http://127.0.0.1:5185')return r.abort();
     const file=u.pathname.split('/').at(-1);if(reference&&u.pathname.startsWith('/ktk-code-pages-assets/')&&originals[file])return r.fulfill({status:200,contentType:file.endsWith('.css')?'text/css':'text/javascript',body:originals[file]});
     return r.continue();
    });
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push({route,width,reference,message:e.message}));
    await page.goto('http://127.0.0.1:5185/'+route+'/',{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
    const form=page.locator('form[data-ktk-form]').first();await form.scrollIntoViewIfNeeded();
    await page.evaluate(async()=>{for(const animation of document.getAnimations())if(Number.isFinite(animation.effect?.getComputedTiming().endTime))animation.finish();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    const geometry=await form.evaluate(f=>[f,...f.querySelectorAll('p,label,input,select,textarea,button')].filter(e=>e.type!=='checkbox'&&!e.classList.contains('ktk-contact-honeypot')&&e.getClientRects().length).map(e=>{const b=e.getBoundingClientRect(),root=f.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,id:e.id,name:e.name,value:e.value,placeholder:e.getAttribute('placeholder'),text:e.tagName==='LABEL'?e.textContent:null,rect:[b.x-root.x,b.y-root.y,b.width,b.height],color:s.color,style:[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.padding,s.margin]};}));
    const bytes=await form.screenshot({path:path.join(output,route+'-'+width+'-'+(reference?'original':'candidate')+'.png'),animations:'disabled'});
    states.push({geometry,pngSha256:sha(bytes)});
   }finally{await context.close();}
  }
  const withoutColor=rows=>rows.map(({color,...row})=>row),differences=[];
  const layoutEqual=JSON.stringify(withoutColor(states[0].geometry))===JSON.stringify(withoutColor(states[1].geometry));
  for(let i=0;i<states[0].geometry.length;i++){const before=states[0].geometry[i],after=states[1].geometry[i];if(before.color!==after?.color)differences.push({before,after});}
  report.comparisons.push({route,width,colorDifferences:differences,pngSha256:states.map(s=>s.pngSha256)});
  check(route+' '+width+' visible initial form geometry, text and typography unchanged',layoutEqual);
  check(route+' '+width+' exact initial colors except intended empty captcha contrast',differences.every(({before,after})=>before.tag==='INPUT'&&before.name==='captcha'&&before.value===''&&before.placeholder===null&&before.color==='rgb(153, 153, 153)'&&after.color==='rgb(38, 38, 38)'));
  check(route+' '+width+' strict initial form pixels unchanged',states[0].pngSha256===states[1].pngSha256,states.map(s=>s.pngSha256));
 }
}catch(error){report.errors.push({message:error.message,stack:error.stack});}finally{await browser.close();}
check('No browser/harness errors',report.errors.length===0,report.errors);report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:report.checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
