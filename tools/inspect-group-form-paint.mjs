import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const [output]=process.argv.slice(2);if(!output)throw Error('Fresh diagnostic directory required');try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier paint diagnostics');}catch(e){if(e.code!=='ENOENT')throw e;}await mkdir(output,{recursive:true});
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')),baseline='7faee9623b9171ec5944a3d3f84638c216803409',root='staging/wp-content/mu-plugins/ktk-code-pages-assets/',original=execFileSync('git',['show',baseline+':'+root+'runtime.css'],{maxBuffer:10*1024*1024}),sha=value=>createHash('sha256').update(value).digest('hex');
const paths=[root+'runtime.css',root+'runtime.js',...['krakow-stag-do','krakow-hen-do','student-trips-poland'].map(k=>root+'content/'+k+'.html')],hashes=async()=>{const r={};for(const p of paths)r[p]=sha(await readFile(p));return r;},initial=await hashes(),rows=[],errors=[],browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const key of ['krakow-hen-do','krakow-stag-do','student-trips-poland'])for(const width of [320,390,1440]){
  const states=[];for(const state of ['original-css','candidate-css','candidate-repeat']){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});try{
    await context.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;});await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());if(!['GET','HEAD'].includes(q.method())||u.origin!=='http://127.0.0.1:5185')return r.abort();if(state==='original-css'&&u.pathname==='/ktk-code-pages-assets/runtime.css')return r.fulfill({status:200,contentType:'text/css',body:original});return r.continue();});
    const p=await context.newPage();p.on('pageerror',e=>errors.push({key,width,state,message:e.message}));await p.goto('http://127.0.0.1:5185/'+key+'/',{waitUntil:'load'});await p.evaluate(()=>document.fonts.ready);const form=p.locator('form[data-ktk-form]').first();await form.scrollIntoViewIfNeeded();await p.evaluate(async()=>{for(const a of document.getAnimations())if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    const image=await form.screenshot({path:path.join(output,key+'-'+width+'-'+state+'.png'),animations:'disabled'}),position=await form.evaluate(n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,scrollY,documentY:b.y+scrollY,verticalPhase:b.y-Math.floor(b.y)};});const record={state,position,pngSha256:sha(image)};
    if(state==='candidate-css'){
     const delta=states[0].position.verticalPhase-position.verticalPhase;
     // Counterfactual test-DOM alignment diagnoses clipping phase; it is not the shipped UI.
     await form.evaluate((n,dy)=>{n.style.transform='translateY('+dy+'px)';},delta);const aligned=await form.screenshot({path:path.join(output,key+'-'+width+'-diagnostic-aligned.png'),animations:'disabled'});record.diagnosticAligned={delta,pngSha256:sha(aligned),matchesOriginal:sha(aligned)===states[0].pngSha256};
    }
    states.push(record);
   }finally{await context.close();}
  }
  rows.push({key,width,originalAndCandidateEqual:states[0].pngSha256===states[1].pngSha256,candidateRepeatExact:states[1].pngSha256===states[2].pngSha256,states});
 }
}finally{await browser.close();}
const stable=JSON.stringify(initial)===JSON.stringify(await hashes()),report={checkedAt:new Date().toISOString(),baseline,scope:'Read-only local diagnostic, same candidate HTML under original/candidate CSS and independent candidate repeat. Original raw failures remain authoritative. Aligned snapshots deliberately shift only test-DOM form position; they are counterfactual clipping-phase controls, not shipped pixel identity or a waived assertion. All external providers/non-read requests blocked.',sourceHashes:initial,stable,rows,errors};await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({stable,errors,cases:rows.map(({key,width,originalAndCandidateEqual,candidateRepeatExact,states})=>({key,width,originalAndCandidateEqual,candidateRepeatExact,verticalPhases:states.map(s=>s.position.verticalPhase),alignedMatches:states[1].diagnosticAligned.matchesOriginal}))},null,2));if(!stable||errors.length||rows.some(r=>!r.candidateRepeatExact))process.exitCode=1;
