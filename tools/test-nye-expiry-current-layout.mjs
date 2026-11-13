import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [output]=process.argv.slice(2);if(!output)throw Error('Fresh report directory required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve prior evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const report={checkedAt:new Date().toISOString(),scope:'Exact current-date local layout/styles/text and deterministic viewport PNG comparison against the own clean PR33 reference. No provider calls, submissions or commerce. Not a complete whole-site pixel certificate.',checks:[],errors:[]},check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const route of ['','new-years-eve/'])for(const width of [320,390,768,1440]){
  const states=[];
  for(const baseline of [true,false]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   try{
    await context.addInitScript(()=>{Date.now=()=>1796112000000;window.__KTK_FREEZE_CAROUSELS__=true;});
    await context.route('**/*',r=>{const request=r.request(),url=new URL(request.url());return url.hostname==='127.0.0.1'&&['GET','HEAD'].includes(request.method())?r.continue():r.abort();});
    const page=await context.newPage(),useBaseline=baseline||process.argv.includes('--unchanged-control'),port=route?(useBaseline?5187:5185):(useBaseline?5186:5184);
    await page.goto('http://127.0.0.1:'+port+'/'+route,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(async()=>{for(const image of document.images)if(image.complete)try{await image.decode();}catch{}for(const animation of document.getAnimations())if(Number.isFinite(animation.effect?.getComputedTiming().endTime))try{animation.finish();}catch{}await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    const snapshot=await page.evaluate(()=>[...document.querySelectorAll('#main-header *,#main-content *')].filter(node=>!['SCRIPT','STYLE','TEMPLATE'].includes(node.tagName)&&node.getClientRects().length).map(node=>{
     const bounds=node.getBoundingClientRect(),style=getComputedStyle(node),textNodes=[...node.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()),textBounds=[];
     for(const text of textNodes){const range=document.createRange();range.selectNodeContents(text);for(const r of range.getClientRects())textBounds.push([r.x,r.y,r.width,r.height]);}
     return {tag:node.tagName,class:node.getAttribute('class'),text:textNodes.map(n=>n.textContent.replace(/\s+/g,' ').trim()).join(''),bounds:[bounds.x,bounds.y,bounds.width,bounds.height],textBounds,style:['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textAlign','color','display','position','padding','margin'].map(key=>style[key])};
    }));
    const screenshot=await page.screenshot({path:path.join(output,(route?'event':'home')+'-'+width+'-'+(baseline?'baseline':'candidate')+'.png'),animations:'disabled'});
    states.push({snapshot,pngHash:createHash('sha256').update(screenshot).digest('hex')});
   }finally{await context.close();}
  }
  const label=(route||'home')+' '+width,differences=[];
  for(let i=0;i<Math.max(...states.map(s=>s.snapshot.length));i++)if(JSON.stringify(states[0].snapshot[i])!==JSON.stringify(states[1].snapshot[i]))differences.push({index:i,baseline:states[0].snapshot[i],candidate:states[1].snapshot[i]});
  check(label+' all visible geometry/typography/text unchanged',!differences.length,{nodes:states[0].snapshot.length,differences});
  check(label+' exact viewport PNG unchanged',states[0].pngHash===states[1].pngHash,states.map(s=>s.pngHash));
 }
}catch(error){report.errors.push(error.stack);}finally{await browser.close();}
check('no harness errors',!report.errors.length,report.errors);report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:report.checks.filter(c=>!c.pass).map(c=>({name:c.name,differences:c.detail?.differences?.length})),errors:report.errors},null,2));if(report.passed!==report.total)process.exitCode=1;
