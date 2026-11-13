import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {iconFontFiles} from './homepage-icon-font.mjs';
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [base,output]=process.argv.slice(2);
if(!base||!output||!['http://127.0.0.1:5184/','https://krawlthroughkrakow.com/staging/'].includes(base))throw Error('Explicit homepage staging/loopback scope and fresh directory required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve prior evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const semantic=JSON.parse(execFileSync('python',['tools/build-homepage-icon-font.py','--coverage'],{encoding:'utf8'}));
const baselineDirectory=process.argv.includes('--baseline')?process.argv[process.argv.indexOf('--baseline')+1]:'deploy-backups/seo-homepage-icon-font-baseline';
const baselineCss=await readFile(path.join(baselineDirectory,'staging/wp-content/mu-plugins/ktk-homepage-assets/parity-runtime.css'));
const unchangedControl=process.argv.includes('--unchanged-control');
const mobileOnly=process.argv.includes('--mobile-only');
const report={checkedAt:new Date().toISOString(),base,scope:'Homepage full icon font only; providers, submissions and commerce blocked. Exact atlas/geometry plus strict unmasked screenshots, with honest independent screenshot results.',semantic,checks:[],comparisons:[],errors:[]},check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
report.baseline={directory:baselineDirectory,cssSha256:createHash('sha256').update(baselineCss).digest('hex'),mode:unchangedControl?'Unchanged live current CSS on both sides; no CSS interception.':base.startsWith('https:')?'Live HTML with only runtime CSS fulfilled from the exact clean pre-release reference in the isolated browser. Server files/settings are not changed.':'Own clean local preview on5186.'};
report.profile=mobileOnly?{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}:{widths:[320,390,768,1440],height:900,deviceScaleFactor:1};
const assetPath=base.startsWith('http://127.')?'/ktk-homepage-assets/':'/staging/wp-content/mu-plugins/ktk-homepage-assets/';
const browser=await chromium.launch({channel:'chrome',headless:true});
async function visit(url,width,{javascript=true,fallback=0,reference=false}={}){
 const context=await browser.newContext({viewport:{width,height:mobileOnly?844:900},deviceScaleFactor:mobileOnly?3:1,isMobile:mobileOnly,hasTouch:mobileOnly,reducedMotion:'reduce',javaScriptEnabled:javascript,serviceWorkers:'block'});
 const fetched=[],errors=[];
 await context.addInitScript(()=>{Date.now=()=>1796112000000;window.__KTK_FREEZE_CAROUSELS__=true;});
 await context.route('**/*',r=>{const request=r.request(),u=new URL(request.url());
  if(!['127.0.0.1','krawlthroughkrakow.com'].includes(u.hostname)||!['GET','HEAD'].includes(request.method())||u.hostname==='krawlthroughkrakow.com'&&!u.pathname.startsWith('/staging/'))return r.abort();
  if(reference&&u.origin===new URL(base).origin&&u.pathname===assetPath+'parity-runtime.css')return r.fulfill({status:200,contentType:'text/css',body:baselineCss});
  if(fallback>=1&&u.pathname.endsWith('/etmodules-full.woff2')||fallback>=2&&u.pathname.endsWith('/e5109a227107-modules.woff'))return r.abort();
  return r.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(/(?:etmodules-full|e5109a227107-modules|4ec95df48507-modules)\./.test(r.url()))fetched.push(r);});
 const target=new URL(url);if(process.argv.includes('--cache-bust')&&target.hostname!=='127.0.0.1')target.searchParams.set('ktk_font_check',Date.now().toString());
 const response=await page.goto(target.href,{waitUntil:'load',timeout:60000});if(response.status()!==200)throw Error('Homepage returned HTTP'+response.status());await page.evaluate(()=>document.fonts.ready);
 if(javascript)await page.evaluate(async()=>{for(const img of document.images)if(img.complete)try{await img.decode();}catch{}for(const a of document.getAnimations())if(Number.isFinite(a.effect?.getComputedTiming().endTime))try{a.finish();}catch{}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 return {context,page,fetched,errors};
}
async function snapshot(page){return page.evaluate(()=>[...document.querySelectorAll('#main-header *,#main-content *')].filter(n=>!['SCRIPT','STYLE','TEMPLATE'].includes(n.tagName)&&n.getClientRects().length).map(n=>{
 const b=n.getBoundingClientRect(),s=getComputedStyle(n),pseudo=['::before','::after'].map(p=>{const c=getComputedStyle(n,p);return [c.content,c.fontFamily,c.fontSize,c.color,c.display];});
 return {tag:n.tagName,class:n.getAttribute('class'),text:[...n.childNodes].filter(c=>c.nodeType===3).map(c=>c.textContent.replace(/\s+/g,' ').trim()).join(''),bounds:[b.x,b.y,b.width,b.height],style:['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textAlign','color','display','position','padding','margin'].map(k=>s[k]),pseudo};
}));}
try{
 for(const width of mobileOnly?[390]:[320,390,768,1440]){
  const states=[];
  for(const baseline of [true,false]){
   const live=base.startsWith('https:');
   const {context,page,fetched,errors}=await visit(baseline&&!live?'http://127.0.0.1:5186/':base,width,{reference:baseline&&live&&!unchangedControl});
   try{
    const state=await snapshot(page),png=await page.screenshot({path:path.join(output,width+'-'+(baseline?'baseline':'candidate')+'.png'),animations:'disabled'});
    states.push({state,pngHash:createHash('sha256').update(png).digest('hex')});
    check(width+' '+(baseline?'baseline':'candidate')+' no page errors',!errors.length,errors);
    if(!baseline){
     const bodies=[];for(const r of fetched){const bytes=await r.body();bodies.push({url:r.url(),status:r.status(),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
     check(width+' WOFF2 is the only original-module font downloaded',bodies.length===1&&bodies[0].status===200&&bodies[0].bytes===29392&&bodies[0].sha256===iconFontFiles['etmodules-full.woff2'],bodies);
     check(width+' full family loaded',await page.evaluate(()=>[...document.fonts].some(f=>f.family.replaceAll('"','')==='ETmodules'&&f.status==='loaded')));
     const delivery=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/etmodules-full.woff2')).map(r=>({url:r.name,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize,transferSize:r.transferSize,duration:r.duration})));
     check(width+' browser reports actual modern font delivery',delivery.length===1&&delivery[0].decodedBodySize===29392,delivery);
     if(width===390){
      const atlas=await page.evaluate(async({root,codepoints})=>{
       const names=['OriginalIcons','ModernIcons'],paths=['parity/e5109a227107-modules.woff','etmodules-full.woff2'],variants=[];let png;
       for(let i=0;i<2;i++){
        const face=new FontFace(names[i],`url("${root+paths[i]}")`,{weight:'400',style:'normal',display:'block'});await face.load();document.fonts.add(face);
       }
       for(const size of [16,20,24,32,56,96])for(const offset of [0,0.5]){
        const canvases=[],metrics=[];
        for(let i=0;i<2;i++){
         const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=Math.ceil(codepoints.length/16)*96;
         const c=canvas.getContext('2d',{willReadFrequently:true});c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#000';c.font=`${size}px ${names[i]}`;
         metrics.push(codepoints.map((cp,index)=>{const char=String.fromCodePoint(cp),m=c.measureText(char);c.fillText(char,(index%16)*96+12+offset,Math.floor(index/16)*96+72+offset);return [m.width,m.actualBoundingBoxLeft,m.actualBoundingBoxRight,m.actualBoundingBoxAscent,m.actualBoundingBoxDescent];}));canvases.push(canvas);
        }
        const a=canvases[0].getContext('2d').getImageData(0,0,1536,canvases[0].height).data,b=canvases[1].getContext('2d').getImageData(0,0,1536,canvases[1].height).data;let differentPixels=0;
        for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])differentPixels++;
        variants.push({size,offset,differentPixels,metricsExact:JSON.stringify(metrics[0])===JSON.stringify(metrics[1])});
        if(size===56&&offset===0)png=canvases[1].toDataURL();
       }
       return {characters:codepoints.length,width:1536,height:Math.ceil(codepoints.length/16)*96,differentPixels:variants.reduce((sum,v)=>sum+v.differentPixels,0),metricsExact:variants.every(v=>v.metricsExact),variants,png};
      },{root:assetPath,codepoints:semantic.codepoints});
      await writeFile(path.join(output,'all409-glyphs.png'),Buffer.from(atlas.png.split(',')[1],'base64'));delete atlas.png;
      check('all409 mapped glyphs exact RGBA and actual text metrics',atlas.characters===409&&atlas.differentPixels===0&&atlas.metricsExact,atlas);
      const menu=page.locator('#et_mobile_nav_menu .mobile_menu_bar');await menu.focus();await page.keyboard.press('Enter');check('mobile menu opens with keyboard',await menu.getAttribute('aria-expanded')==='true');await page.keyboard.press('Escape');check('mobile menu closes with Escape',await menu.getAttribute('aria-expanded')==='false');
      const gallery=page.locator('.et_pb_gallery_image a').first();await gallery.click();check('gallery native dialog opens',await page.locator('dialog[open]').count()===1);await page.keyboard.press('Escape');check('gallery native dialog closes',await page.locator('dialog[open]').count()===0);
     }
    }
   }finally{await context.close();}
  }
  const same=JSON.stringify(states[0].state)===JSON.stringify(states[1].state);
  check(width+' original geometry, typography, content and pseudo glyphs exact',same,same?{nodes:states[0].state.length}:{baseline:states[0].state,candidate:states[1].state});
  report.comparisons.push({width,pngExact:states[0].pngHash===states[1].pngHash,hashes:states.map(s=>s.pngHash)});
 }
 for(const javascript of [true,false])for(const fallback of [0,1,2]){
  const {context,page,fetched,errors}=await visit(base,390,{javascript,fallback});
  try{
   const expected=['etmodules-full.woff2','e5109a227107-modules.woff','4ec95df48507-modules.ttf'][fallback],bodies=[];
   for(const r of fetched)bodies.push({path:new URL(r.url()).pathname,status:r.status(),bytes:(await r.body()).length});
   check(`JS ${javascript} fallback ${fallback} exact active source`,bodies.length===1&&bodies[0].path.endsWith('/'+expected)&&bodies[0].status===200,bodies);
   check(`JS ${javascript} fallback ${fallback} full family loaded`,await page.evaluate(()=>[...document.fonts].some(f=>f.family.replaceAll('"','')==='ETmodules'&&f.status==='loaded')));
   check(`JS ${javascript} fallback ${fallback} no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   check(`JS ${javascript} fallback ${fallback} no page errors`,!errors.length,errors);
  }finally{await context.close();}
 }
}catch(error){report.errors.push(error.stack);}finally{await browser.close();}
check('no harness errors',!report.errors.length,report.errors);report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:report.checks.filter(c=>!c.pass).map(c=>c.name),strictScreenshots:report.comparisons,errors:report.errors},null,2));if(report.passed!==report.total)process.exitCode=1;
