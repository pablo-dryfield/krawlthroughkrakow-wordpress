import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const [base,output]=process.argv.slice(2);
if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base)||!output)throw Error('Explicit local/staging base and fresh report required');
try{await readFile(output);throw Error('Preserve previous evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(path.dirname(output),{recursive:true});
const screenshots=path.join(path.dirname(output),path.basename(output,'.json')+'-screenshots');await mkdir(screenshots,{recursive:true});
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const runtime='staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.js';
const hash=async()=>createHash('sha256').update(await readFile(runtime)).digest('hex'),initialHash=await hash();
const harnessHash=async()=>createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),initialHarnessHash=await harnessHash();
const axe=process.argv.includes('--axe-errors')?await readFile('staging/wp-content/plugins/ktk-storefront/frontend/node_modules/axe-core/axe.min.js','utf8'):null;
const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
const keys=['contact','pub-crawl-jobs','krakow-hen-do','krakow-stag-do','student-trips-poland','stagshens','post-welcome-to-alcohol'];
const report={checkedAt:new Date().toISOString(),base,runtimeSha256:initialHash,harnessSha256:initialHarnessHash,scope:'All submission/token responses intercepted; providers and all other non-read requests blocked; no real messages, customers, carts or orders',checks:[],errors:[],unexpectedWrites:[],scenarios:[],payloadContracts:[],accessibility:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const key of keys)for(const width of [390,1440]){
  const route=manifest.routes.find(row=>row.key===key);if(!route)throw Error('Missing source route '+key);
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push({key,width,message:error.message}));
  let mode='success',posts=0,tokens=0,release=null,expectedPost=null,firstName=null,rejectedField=null,cf7=false,expectsCaptcha=false;
  const json=(r,body,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  await context.route('**/*',async r=>{
   const request=r.request(),u=new URL(request.url()),local=new URL(base),inScope=u.origin===local.origin&&(local.hostname==='127.0.0.1'||u.pathname.startsWith('/staging/'));
   // The local preview deliberately retains these staging endpoint URLs. Only intercept them; never forward them.
   const fixtureEndpoint=inScope||(local.hostname==='127.0.0.1'&&u.origin==='https://krawlthroughkrakow.com'&&/^\/staging\/(?:wp-admin\/admin-ajax\.php|wp-json\/contact-form-7\/v1\/contact-forms\/(?:1675|2219)\/feedback)$/.test(u.pathname));
   if(fixtureEndpoint&&request.method()==='GET'&&u.pathname.endsWith('/wp-admin/admin-ajax.php')&&u.searchParams.get('action')==='ktk_pages_form_token'){
    tokens++;return mode==='token-failure'?json(r,{success:false,data:{message:'Fixture token unavailable.'}},503):json(r,{success:true,data:{nonce:'fixture-not-a-secret',challenge:{token:'fixture-not-a-secret',first:4,second:7}}});
   }
   if(request.method()==='POST'){
    if(!fixtureEndpoint||u.href!==expectedPost){report.unexpectedWrites.push({key,width,path:u.pathname});return r.abort();}
    posts++;
    const data=await new Response(request.postDataBuffer(),{headers:{'content-type':request.headers()['content-type']}}).formData();
    const payloadOK=cf7?data.get('_wpcf7')===(key==='stagshens'?'2219':'1675'):data.get('action')==='ktk_pages_contact'&&data.getAll('action').length===1&&data.get('route_key')===key&&data.get('form_index')==='0'&&data.get('_ktk_nonce')==='fixture-not-a-secret'&&data.get('_ktk_challenge')==='fixture-not-a-secret'&&(expectsCaptcha?data.get('captcha')==='11':!data.has('captcha'));
    report.payloadContracts.push({key,width,mode,pass:payloadOK});
    if(mode==='pending')await new Promise(resolve=>{release=resolve;});
    if(mode==='offline')return r.abort('failed');
    if(mode==='html')return r.fulfill({status:503,contentType:'text/html',body:'<!doctype html><title>Fixture unavailable</title>'});
    if(mode==='expired')return json(r,{success:false,data:{message:'Fixture expired.'}},403);
    if(mode==='invalid')return cf7?json(r,{status:'validation_failed',message:'Please correct the fixture field.',invalid_fields:[{field:rejectedField||firstName,message:'Fixture field error <em>literal</em>.'}]}):json(r,{success:false,data:{message:'Please correct the fixture field.',field:rejectedField||firstName}},422);
    if(['acceptance_missing','spam','mail_failed','aborted'].includes(mode))return json(r,{status:mode,message:'Fixture '+mode+'.'});
    return json(r,cf7?{status:'mail_sent',message:'Fixture delivered.'}:{success:true,data:{message:'Fixture delivered.'}});
   }
   if(!['GET','HEAD'].includes(request.method())){report.unexpectedWrites.push({key,width,path:u.pathname,method:request.method()});return r.abort();}
   if(!inScope||/\/(collect|quote|checkout|carts|orders)(\/|$)/.test(u.pathname))return r.abort();
   return r.continue();
  });
  try{
   const label=key+' '+width,form=page.locator('form[data-ktk-form]').first();
   async function reset(next){
    mode=next;posts=0;tokens=0;release=null;expectedPost=null;rejectedField=null;
    const url=new URL(route.route.slice(1),base);if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_form_check',Date.now().toString());
    const response=await page.goto(url.href,{waitUntil:'load',timeout:60000});
    if(response.status()!==200)throw Error('Unexpected document response');
    await page.evaluate(()=>document.fonts.ready);
    const runtimeHref=await page.locator('script[src*="/ktk-code-pages-assets/runtime.js"]').getAttribute('src');
    if(new URL(runtimeHref,page.url()).searchParams.get('v')!==initialHash.slice(0,12)&&new URL(base).hostname!=='127.0.0.1')throw Error('Stale runtime reference');
    await form.evaluate(f=>{let closed;while((closed=f.closest('.et_pb_toggle_close')))closed.querySelector('.et_pb_toggle_title')?.click();});
    cf7=await form.getAttribute('data-ktk-form')==='cf7';
    expectedPost=await form.evaluate(f=>new URL(f.dataset.feedbackEndpoint||f.getAttribute('action'),document.baseURI).href);
    firstName=await form.locator('input:not([type=hidden]):not([name^="_ktk_"])').first().getAttribute('name');
    expectsCaptcha=await form.locator('input[name="captcha"]').count()>0;
    report.scenarios.push({key,width,mode:next,type:cf7?'cf7':'native'});
   }
   async function fill(){
    await form.evaluate(f=>{for(const e of f.elements){
     if(e.type==='checkbox'||e.type==='radio'){e.checked=true;continue;}
     if(!e.name||e.type==='hidden'||e.name.startsWith('_ktk_')||e.type==='submit')continue;
     if(e.type==='email')e.value='fixture@example.test';
     else if(e.name==='captcha')e.value='11';
     else if(e.type==='checkbox'||e.type==='radio')e.checked=true;
     else if(e.tagName==='SELECT')e.selectedIndex=Math.max(0,e.options.length-1);
     else if(e.type==='date')e.value='2030-01-01';
     else if(e.type==='number')e.value=String(Math.max(2,Number(e.min)||0));
     else if(['text','tel','url'].includes(e.type)||e.tagName==='TEXTAREA')e.value=e.type==='url'?'https://example.test/':'Fixture enquiry';
    }});
   }
   const submit=()=>form.evaluate(f=>f.requestSubmit());
   const settled=()=>page.waitForFunction(()=>{const f=document.querySelector('form[data-ktk-form]');return f.dataset.status&&f.dataset.status!=='init'&&f.dataset.submitting!=='true';});
   const values=()=>form.evaluate(f=>[...f.elements].filter(e=>e.name&&!e.name.startsWith('_')&&e.type!=='hidden'&&e.type!=='submit').map(e=>[e.name,e.value,e.checked]));
   async function prepare(){
    await fill();
    if(!cf7){await form.locator('input:not([type=hidden]):not([name^="_ktk_"])').first().focus();await form.locator('[name="_ktk_nonce"]').evaluate(e=>e.value);await page.waitForFunction(()=>document.querySelector('form[data-ktk-form] [name="_ktk_nonce"]').value==='fixture-not-a-secret');}
   }
   async function recovered(name,before){
    const button=form.locator('[type="submit"]').first();
    check(label+' '+name+' keeps entered values',JSON.stringify(await values())===JSON.stringify(before));
    check(label+' '+name+' restores retry controls',await button.isEnabled()&&await form.getAttribute('aria-busy')===null&&await form.getAttribute('data-submitting')==='false');
    const message=cf7?form.locator('.wpcf7-response-output'):page.locator('.et-pb-contact-message[aria-live="polite"]').first();
    check(label+' '+name+' feedback visible and announced',await message.isVisible()&&await message.getAttribute('aria-live')==='polite'&&!!(await message.textContent()).trim());
   }
   await reset('success');await submit();
   check(label+' required inputs prevent submission',posts===0&&!(await form.evaluate(f=>f.checkValidity())));
   await reset('success');await prepare();await form.locator('input[type="email"]').first().fill('invalid');await submit();
   check(label+' invalid email prevents submission',posts===0&&!(await form.evaluate(f=>f.checkValidity())));

   for(const failure of ['invalid','html','offline']){
    await reset(failure);await prepare();
    if(failure==='invalid')await form.evaluate((f,name)=>{const help=document.createElement('span');help.id='fixture-existing-help';help.hidden=true;help.textContent='Existing fixture help.';f.append(help);[...f.elements].find(e=>e.name===name).setAttribute('aria-describedby',help.id);},firstName);
    const before=await values();await submit();await settled();
    check(label+' '+failure+' only intercepted one submission',posts===1);await recovered(failure,before);
    if(failure==='invalid'){
     const association=await form.evaluate((f,name)=>{const e=[...f.elements].find(e=>e.name===name);return {invalid:e?.getAttribute('aria-invalid'),linked:(e?.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean).some(id=>document.getElementById(id)?.textContent.trim())};},firstName);
     check(label+' server field error programmatically associated',association.invalid==='true'&&association.linked,association);
     const helper=await form.evaluate((f,name)=>{const e=[...f.elements].find(e=>e.name===name);const ids=(e.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);return {kept:ids.includes('fixture-existing-help'),unique:new Set(ids).size===ids.length,focused:document.activeElement===e};},firstName);
     check(label+' preserves existing help and focuses invalid field',helper.kept&&helper.unique&&helper.focused,helper);
     check(label+' server error treated as text',await form.locator('.wpcf7-not-valid-tip em').count()===0);
     if(width===390){await page.screenshot({path:path.join(screenshots,key+'-invalid-390.png'),fullPage:true});await form.screenshot({path:path.join(screenshots,key+'-invalid-390-form.png')});}
     if(axe){await page.evaluate(axe);const result=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),incomplete:r.incomplete.map(v=>({id:v.id,count:v.nodes.length}))};});report.accessibility.push({key,width,...result});check(label+' error state has no automated accessibility violations',result.violations.length===0,result.violations);}
     mode='success';await submit();await page.waitForFunction(()=>document.querySelector('form[data-ktk-form]').dataset.status==='sent');
     check(label+' success clears only generated error descriptions',await form.evaluate((f,name)=>{const e=[...f.elements].find(e=>e.name===name);return e.getAttribute('aria-describedby')==='fixture-existing-help'&&e.getAttribute('aria-invalid')==='false'&&!f.querySelector('.ktk-form-field-error');},firstName));
    }
   }
   if(cf7)for(const status of ['acceptance_missing','spam','mail_failed','aborted']){
    await reset(status);await prepare();const before=await values();await submit();await settled();await recovered(status,before);
    check(label+' '+status+' not shown as sent',await form.getAttribute('data-status')!=='sent');
   }
   if(!cf7){
    await reset('invalid');await prepare();const proxy=form.locator('.et_pb_checkbox_handle').first(),group=await proxy.count()?await proxy.getAttribute('name'):null;
    if(group){rejectedField=group;await submit();await settled();
     check(label+' hidden checkbox proxy error reaches visible group',await form.evaluate((f,name)=>{const hidden=[...f.elements].find(e=>e.name===name),controls=[...hidden.closest('.et_pb_contact_field').querySelectorAll('input[type="checkbox"]')];return controls.length>0&&controls.every(e=>e.getAttribute('aria-invalid')==='true'&&(e.getAttribute('aria-describedby')||'').split(/\s+/).some(id=>document.getElementById(id)?.classList.contains('ktk-form-field-error')))&&controls.includes(document.activeElement);},group));
     await reset('success');await prepare();await form.evaluate(f=>f.querySelectorAll('input[type="checkbox"]').forEach(e=>{e.checked=false;}));await submit();
     check(label+' required checkbox selection blocks posting with focus',posts===0&&await form.locator('input[type="checkbox"]').first().evaluate(e=>e===document.activeElement&&e.getAttribute('aria-invalid')==='true'));
     const first=form.locator('input[type="checkbox"]').first();await first.focus();await page.keyboard.press('Space');check(label+' native keyboard Space selects option',await first.isChecked());
     await submit();await page.waitForFunction(()=>document.querySelector('form[data-ktk-form]').dataset.status==='sent');check(label+' keyboard selection reaches one intercepted submission',posts===1);
    }
    await reset('expired');await prepare();const before=await values();await submit();await settled();await recovered('expired',before);
    const oldTokens=tokens;mode='success';await submit();await page.waitForFunction(()=>document.querySelector('.et-pb-contact-message[aria-live="polite"]')?.textContent.includes('arithmetic'));
    check(label+' expiry refreshes token before retry',tokens===oldTokens+1&&posts===1);await submit();await page.waitForFunction(()=>document.querySelector('form[data-ktk-form]').dataset.status==='sent');
    check(label+' refreshed token permits one retry',posts===2);
    await reset('success');await prepare();const agedValues=await values();await page.evaluate(()=>{const original=Date.now;Date.now=()=>original()+21*60*1000;});await submit();
    await page.waitForFunction(()=>document.querySelector('.et-pb-contact-message[aria-live="polite"]')?.textContent.includes('arithmetic'));
    check(label+' aged client token refreshes without posting',posts===0&&tokens===2&&JSON.stringify(await values())===JSON.stringify(agedValues));
    await reset('token-failure');await fill();const filled=await values();await submit();await settled();
    check(label+' unavailable token prevents submission',posts===0&&tokens===1);check(label+' unavailable token preserves fields',JSON.stringify(await values())===JSON.stringify(filled));
   }
   await reset('pending');await prepare();await submit();await page.waitForFunction(()=>document.querySelector('form[data-ktk-form]').dataset.submitting==='true');
   await page.waitForFunction(()=>document.querySelector('form[data-ktk-form] [type="submit"]').disabled);
   await form.evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
   check(label+' pending state busy and disabled',await form.getAttribute('aria-busy')==='true'&&!await form.locator('[type="submit"]').first().isEnabled());
   await page.waitForFunction(()=>document.querySelector('form[data-ktk-form]').dataset.submitting==='true');
   const deadline=Date.now()+10000;while(!release&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
   if(!release)throw Error('Intercepted pending submission was not reached');release();release=null;
   await page.waitForFunction(()=>document.querySelector('form[data-ktk-form]').dataset.status==='sent');
   check(label+' pending duplicate suppressed',posts===1);
   check(label+' successful response resets fields',await form.locator('input[type="email"]').first().inputValue()==='');
   check(label+' successful response releases controls',await form.locator('[type="submit"]').first().isEnabled()&&await form.getAttribute('aria-busy')===null);
   check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }finally{if(release)release();await context.close();}
 }
}catch(error){report.errors.push({message:error.message,stack:error.stack});}finally{await browser.close();}
check('No unexpected non-read requests',report.unexpectedWrites.length===0,report.unexpectedWrites);
check('Every intercepted submission preserves routing and token contracts',report.payloadContracts.length>0&&report.payloadContracts.every(row=>row.pass),report.payloadContracts.filter(row=>!row.pass));
check('No page or harness errors',report.errors.length===0,report.errors);
check('Source stable throughout audit',await hash()===initialHash);
check('Harness stable throughout audit',await harnessHash()===initialHarnessHash);
report.passed=report.checks.filter(row=>row.pass).length;report.total=report.checks.length;
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:report.checks.filter(row=>!row.pass),errors:report.errors},null,2));
if(report.passed!==report.total)process.exitCode=1;
