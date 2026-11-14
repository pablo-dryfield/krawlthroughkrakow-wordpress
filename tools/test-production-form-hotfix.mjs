import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const [phase,candidatePath,output]=process.argv.slice(2);
if(!['baseline','candidate','live'].includes(phase)||!candidatePath||!output)throw Error('Explicit phase, candidate and fresh report required');
try{await readFile(output);throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const digest=b=>createHash('sha256').update(b).digest('hex');
const candidate=await readFile(candidatePath),candidateSha=digest(candidate);
const oldExpression="fetch(cf7?form.dataset.feedbackEndpoint:form.action,{method:'POST'",newExpression="fetch(cf7?form.dataset.feedbackEndpoint:form.getAttribute('action'),{method:'POST'";
const original=Buffer.from(candidate.toString('utf8').replace(newExpression,oldExpression));
const baselineSha='38cdaa565d7fabc7f58e05cd8697dd79996c9c755d0beca9fda9e2503b2fc9e3';
if(digest(original)!==baselineSha||candidate.toString('utf8').split(newExpression).length!==2)throw Error('Unreviewed candidate');
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base='https://krawlthroughkrakow.com/',origin=new URL(base).origin,scriptPath='/wp-content/mu-plugins/ktk-code-pages-assets/runtime.js';
const rows=[['contact/','contact'],['pub-crawl-jobs/','pub-crawl-jobs'],['krakow-hen-do/','krakow-hen-do'],['krakow-stag-do/','krakow-stag-do'],['student-trips-poland/','student-trips-poland'],['stagshens/','stagshens'],['welcome-to-alcohol/','post-welcome-to-alcohol']];
const report={checkedAt:new Date().toISOString(),phase,base,candidateSha256:candidateSha,baselineSha256:baselineSha,nativeForms:5,cf7Forms:2,widths:[390,1440],allPostsIntercepted:true,scope:'Original production DOM; every form POST/token fulfilled locally, providers aborted, no messages or account changes',checks:[],payloads:[],errors:[],unexpectedWrites:[],wrongEndpoints:[],scripts:[],blockedProviders:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});
const initialHarness=digest(await readFile(new URL(import.meta.url)));
report.harnessSha256=initialHarness;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [route,key]of rows)for(const width of report.widths){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage();
  let mode='success',posts=0,tokens=0,expectedPost=null,wrongPost=null,cf7=false,release=null;
  page.on('pageerror',error=>report.errors.push({key,width,message:error.message}));
  const json=(r,body,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  await context.route('**/*',async r=>{
   const request=r.request(),url=new URL(request.url()),same=url.origin===origin&&!url.pathname.startsWith('/staging/');
   // The observed Google first-party gateway must also stay inside the test's network denylist.
   if(!same||url.pathname.startsWith('/9z78/')){report.blockedProviders.push({host:url.hostname,path:url.pathname,method:request.method()});return r.abort();}
   if(same&&url.pathname===scriptPath&&request.method()==='GET'){
    if(phase==='live'){
     const response=await r.fetch(),bytes=await response.body();report.scripts.push({key,width,sha256:digest(bytes),version:url.searchParams.get('v')});
     if(response.status()!==200||digest(bytes)!==candidateSha||url.searchParams.get('v')!==candidateSha.slice(0,12))throw Error('Stale live runtime bytes or reference');
     return r.fulfill({response,body:bytes});
    }
    report.scripts.push({key,width,sha256:digest(phase==='baseline'?original:candidate),version:url.searchParams.get('v')});
    return r.fulfill({status:200,contentType:'application/javascript',body:phase==='baseline'?original:candidate});
   }
   if(same&&request.method()==='GET'&&url.pathname==='/wp-admin/admin-ajax.php'&&url.searchParams.get('action')==='ktk_pages_form_token'){
    tokens++;return mode==='token-failure'?json(r,{success:false,data:{message:'Fixture token unavailable.'}},503):json(r,{success:true,data:{nonce:'fixture-not-a-secret',challenge:{token:'fixture-not-a-secret',first:4,second:7}}});
   }
   if(request.method()==='POST'){
    if(phase==='baseline'&&!cf7&&same&&url.href===wrongPost){
     posts++;report.wrongEndpoints.push({key,width,path:url.pathname});return json(r,{success:false,data:{message:'Fixture rejected incorrect endpoint.'}},404);
    }
    if(!same||url.href!==expectedPost){report.unexpectedWrites.push({key,width,path:url.pathname});return r.abort();}
    posts++;
    const data=await new Response(request.postDataBuffer(),{headers:{'content-type':request.headers()['content-type']}}).formData();
    const payload=cf7?data.get('_wpcf7')===(key==='stagshens'?'2219':'1675'):
     data.getAll('action').length===1&&data.get('action')==='ktk_pages_contact'&&data.get('route_key')===key&&data.get('form_index')==='0'&&data.get('_ktk_nonce')==='fixture-not-a-secret'&&data.get('_ktk_challenge')==='fixture-not-a-secret'&&(key==='student-trips-poland'?!data.has('captcha'):data.get('captcha')==='11');
    report.payloads.push({key,width,mode,pass:payload});
    if(mode==='pending')await new Promise(resolve=>{release=resolve;});
    if(mode==='offline')return r.abort('failed');
    if(mode==='html')return r.fulfill({status:503,contentType:'text/html',body:'<!doctype html><title>Fixture unavailable</title>'});
    if(mode==='expired')return json(r,{success:false,data:{message:'Fixture expired.'}},403);
    if(mode==='invalid')return json(r,cf7?{status:'validation_failed',message:'Fixture field rejected.',invalid_fields:[]}:{success:false,data:{message:'Fixture field rejected.'}},422);
    return json(r,cf7?{status:'mail_sent',message:'Fixture success, no mail sent.'}:{success:true,data:{message:'Fixture success, no mail sent.'}});
   }
   if(!['GET','HEAD'].includes(request.method())){report.unexpectedWrites.push({key,width,path:url.pathname,method:request.method()});return r.abort();}
   if(!same||/\/(collect|quote|checkout|carts|orders)(\/|$)/.test(url.pathname)||url.pathname.startsWith('/wp-json/'))return r.abort();
   return r.continue();
  });
  try{
   const label=key+' '+width,form=page.locator('form[data-ktk-form]');
   async function reset(next){
    mode=next;posts=0;tokens=0;expectedPost=null;wrongPost=null;
    const url=new URL(route,base);if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_endpoint_check',Date.now().toString());
    const response=await page.goto(url.href,{waitUntil:'load',timeout:60000});if(response.status()!==200||await form.count()!==1)throw Error('Unexpected page/form inventory');
    cf7=await form.getAttribute('data-ktk-form')==='cf7';
    expectedPost=await form.evaluate(f=>new URL(f.dataset.feedbackEndpoint||f.getAttribute('action'),document.baseURI).href);
    wrongPost=await form.evaluate(()=>new URL('[object HTMLInputElement]',document.baseURI).href);
   }
   const fill=()=>form.evaluate(f=>{for(const e of f.elements){
    if(e.type==='checkbox'||e.type==='radio'){e.checked=true;continue;}
    if(!e.name||e.type==='hidden'||e.name.startsWith('_ktk_')||e.type==='submit')continue;
    if(e.type==='email')e.value='fixture@example.test';else if(e.name==='captcha')e.value='11';
    else if(e.tagName==='SELECT')e.selectedIndex=Math.max(0,e.options.length-1);else if(e.type==='date')e.value='2030-01-01';
    else if(e.type==='number')e.value=String(Math.max(2,Number(e.min)||0));else if(['text','tel','url'].includes(e.type)||e.tagName==='TEXTAREA')e.value=e.type==='url'?'https://example.test/':'Fixture enquiry';
   }});
   async function prepare(){await fill();if(!cf7){await form.locator('input:not([type=hidden]):not([name^="_ktk_"])').first().focus();await page.waitForFunction(()=>document.querySelector('form[data-ktk-form] [name="_ktk_nonce"]').value==='fixture-not-a-secret');}}
   const submit=()=>form.evaluate(f=>f.requestSubmit());
   const settled=()=>page.waitForFunction(()=>{const f=document.querySelector('form[data-ktk-form]');return f.dataset.status&&f.dataset.status!=='init'&&f.dataset.submitting!=='true';});
   const values=()=>form.evaluate(f=>[...f.elements].filter(e=>e.name&&!e.name.startsWith('_')&&e.type!=='hidden'&&e.type!=='submit').map(e=>[e.name,e.value,e.checked]));
   await reset('success');
   check(label+' unchanged native routing field',cf7||await form.locator('input[type=hidden][name=action][value=ktk_pages_contact]').count()===1);
   check(label+' property collision present in original DOM',cf7||await form.evaluate(f=>Object.prototype.toString.call(f.action)==='[object HTMLInputElement]'));
   if(phase==='baseline'){
    await prepare();await submit();await settled();
    check(label+' baseline isolates native defect without forwarding',posts===1&&(await form.getAttribute('data-status'))===(cf7?'sent':'invalid'));
    continue;
   }
   await submit();check(label+' required inputs prevent posting',posts===0&&!await form.evaluate(f=>f.checkValidity()));
   await reset('success');await prepare();await form.locator('input[type=email]').first().fill('invalid');await submit();check(label+' invalid email prevents posting',posts===0&&!await form.evaluate(f=>f.checkValidity()));
   for(const failure of ['invalid','html','offline',...(!cf7?['expired']:[])]){
    await reset(failure);await prepare();const before=await values();await submit();await settled();
    check(label+' '+failure+' exactly one intercepted POST',posts===1);
    check(label+' '+failure+' retains selections',JSON.stringify(await values())===JSON.stringify(before));
    check(label+' '+failure+' releases controls',await form.locator('[type=submit]').first().isEnabled()&&await form.getAttribute('aria-busy')===null);
    check(label+' '+failure+' announces failure',await form.getAttribute('data-status')!=='sent'&&await page.locator('[aria-live=polite]').evaluateAll(es=>es.some(e=>!!e.textContent.trim())));
    mode='success';await submit();
    if(failure==='expired'){
     await page.waitForFunction(()=>document.querySelector('.et-pb-contact-message[aria-live="polite"]')?.textContent.includes('arithmetic'));
     check(label+' expiry refreshes without a second POST',tokens===2&&posts===1);
     await submit();await settled();
    }else await settled();
    check(label+' '+failure+' retry succeeds only through fixture',posts===2&&await form.getAttribute('data-status')==='sent');
   }
   if(!cf7){await reset('token-failure');await fill();await submit();await settled();check(label+' token failure blocks posting',tokens===1&&posts===0&&await form.getAttribute('data-status')!=='sent');}
   await reset('pending');await prepare();await submit();
   const deadline=Date.now()+10000;while(!release&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));if(!release)throw Error('Pending fixture not reached');
   await form.evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
   check(label+' pending controls disabled',await form.locator('[type=submit]').first().isDisabled()&&await form.getAttribute('aria-busy')==='true');
   release();release=null;await settled();
   check(label+' duplicate suppressed and sent only by fixture',posts===1&&await form.getAttribute('data-status')==='sent');
   check(label+' successful reset and retry release',await form.locator('input[type=email]').first().inputValue()===''&&await form.locator('[type=submit]').first().isEnabled());
  }finally{if(release)release();await context.close();}
 }
}catch(error){report.errors.push({message:error.message,stack:error.stack});}finally{await browser.close();}
check('No unexpected non-read requests forwarded',report.unexpectedWrites.length===0,report.unexpectedWrites);
check('No browser or harness errors',report.errors.length===0,report.errors);
check('Routing and token payload contracts',report.payloads.length>0&&report.payloads.every(row=>row.pass));
check('All14 form views load the intended runtime',new Set(report.scripts.map(row=>row.key+':'+row.width)).size===14&&report.scripts.every(row=>row.sha256===(phase==='baseline'?baselineSha:candidateSha)));
check('Baseline demonstrates exactly ten native incorrect requests',phase!=='baseline'||report.wrongEndpoints.length===10);
check('Candidate stable',digest(await readFile(candidatePath))===candidateSha);
check('Harness stable',digest(await readFile(new URL(import.meta.url)))===initialHarness);
report.passed=report.checks.filter(row=>row.pass).length;report.total=report.checks.length;report.finishedAt=new Date().toISOString();
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({phase,passed:report.passed,total:report.total,wrongEndpoints:report.wrongEndpoints.length,payloads:report.payloads.length,blockedProviders:report.blockedProviders.length,failed:report.checks.filter(row=>!row.pass).map(row=>({name:row.name,detail:Array.isArray(row.detail)?row.detail.slice(0,3):row.detail})),errors:report.errors},null,2));
if(report.passed!==report.total)process.exitCode=1;
