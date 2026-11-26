// Actual generated forms/runtime; every token and submission response is local.
import{createRequire}from'node:module';
import{readFile,writeFile,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import path from'node:path';
const[base,output]=process.argv.slice(2);
if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base)||!output)throw Error('Explicit isolated local/staging base and fresh evidence path required');
try{await readFile(output);throw Error('Preserve earlier evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(path.dirname(output),{recursive:true});
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const forms=JSON.parse(await readFile('tools/content/enquiry-forms.json','utf8')).forms;
const runtime=await readFile('staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.js'),sha=b=>createHash('sha256').update(b).digest('hex'),origin=new URL(base);
const report={at:new Date().toISOString(),runtimeSHA256:sha(runtime),scope:'Actual local/staging HTML and runtime. All token/POST responses intercepted before transport; external traffic and the existing first-party /9z78/ tag loader blocked. AX exposure is not proof of spoken output.',checks:[],views:[],payloads:[],errors:[],runtimeResponses:[],blockedTagLoads:[],remoteWrites:0,externalRequestsBlocked:0,realEmails:0,orders:0},check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const definition of forms)for(const width of[320,768,1440]){
 const label=definition.id+' '+width,c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await c.newPage();page.setDefaultTimeout(7000);
 let mode='success',posts=0,tokens=0,release=null,rejected=definition.fields.find(f=>f.type==='email').name;
 const assetChecks=[];page.on('response',r=>{if(new URL(r.url()).pathname.endsWith('/ktk-code-pages-assets/runtime.js'))assetChecks.push(r.body().then(b=>report.runtimeResponses.push({label,status:r.status(),sha256:sha(b)})));});
 page.on('pageerror',e=>report.errors.push({label,message:e.message}));
 await c.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;window._iub={cs:{api:{getPreferences:()=>({purposes:{}})}}};});
 const json=(r,data,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 await c.route('**/*',async r=>{
  const q=r.request(),u=new URL(q.url()),endpoint=u.origin===origin.origin&&u.pathname===(origin.pathname==='/'?'/wp-admin/admin-ajax.php':'/staging/wp-admin/admin-ajax.php');
  if(u.origin===origin.origin&&u.pathname==='/9z78/'){report.blockedTagLoads.push({label,path:u.pathname,method:q.method()});return r.abort();}
  if(endpoint&&q.method()==='GET'&&u.searchParams.get('action')==='ktk_pages_form_token'){
   tokens++;return mode==='token-failure'?json(r,{success:false,data:{message:'Fixture form preparation unavailable.'}},503):json(r,{success:true,data:{nonce:'fixture-not-a-secret',requestId:'11111111-2222-4333-8444-555555555555',challenge:{token:'fixture-not-a-secret',first:4,second:7}}});
  }
  if(q.method()==='POST'){
   if(!endpoint){report.remoteWrites++;return r.abort();}posts++;
   const data=await new Response(q.postDataBuffer(),{headers:{'content-type':q.headers()['content-type']}}).formData();
   const names=[...new Set(data.keys())].sort(),expected=[...definition.fields.map(f=>f.name),'action','route_key','form_index','_ktk_nonce','_ktk_challenge','_ktk_request_id','_ktk_website',...(definition.arithmetic?['captcha']:[])].sort();
   const payload={label,mode,keysExact:JSON.stringify(names)===JSON.stringify(expected),routing:data.get('action')==='ktk_pages_contact'&&data.get('route_key')===definition.id&&data.get('form_index')==='0',syntheticIdentity:data.get('_ktk_request_id')==='11111111-2222-4333-8444-555555555555',fixtureNonce:data.get('_ktk_nonce')==='fixture-not-a-secret'};
   report.payloads.push(payload);
   if(mode==='pending')await new Promise(resolve=>{release=resolve;});
   if(mode==='network')return r.abort('failed');
   if(mode==='html')return r.fulfill({status:503,contentType:'text/html',body:'<!doctype html><title>Fixture unavailable</title>'});
   if(mode==='bad-json')return r.fulfill({status:503,contentType:'application/json',body:'{'});
   if(mode==='field'||mode==='group')return json(r,{success:false,data:{message:'Fixture field error <em>literal</em>.',field:rejected,delivery_state:'not_attempted'}},422);
   if(mode==='expired')return json(r,{success:false,data:{message:'Fixture form expired.'}},403);
   if(mode==='rate-limit')return json(r,{success:false,data:{message:'Fixture rate limit.'}},429);
   if(mode==='unconfirmed')return json(r,{success:false,data:{message:'Fixture delivery could not be confirmed. Do not submit again.',delivery_state:'unconfirmed'}},503);
   return json(r,{success:true,data:{message:'Fixture delivered. No email sent.'}});
  }
  if(!['GET','HEAD'].includes(q.method())){report.remoteWrites++;return r.abort();}
  if(u.origin!==origin.origin){report.externalRequestsBlocked++;return r.abort();}
  if(/\/(?:collect|quote|checkout|carts|orders)(?:\/|$)/.test(u.pathname))return r.abort();
  return r.continue();
 });
 const form=page.locator('form[data-ktk-form]'),status=page.locator('[data-ktk-form-status]');
 async function reset(next){mode=next;posts=tokens=0;release=null;const response=await page.goto(new URL(definition.route.slice(1),base).href,{waitUntil:'load',timeout:30000});check(label+' '+next+' HTTP200',response.status()===200);await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>{window.__feedbackInitialStatus=document.querySelector('[data-ktk-form-status]');});}
 async function fill(){
  await form.locator('input:not([type="hidden"]):not([name^="_"])').first().focus();
  await form.evaluate(f=>{for(const e of f.elements){
   if(e.type==='checkbox'||e.type==='radio'){e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));continue;}
   if(!e.name||e.type==='hidden'||e.name.startsWith('_')||e.type==='submit')continue;
   if(e.type==='email')e.value='feedback-fixture@example.test';else if(e.name==='captcha')e.value='11';else if(e.type==='date')e.value='2030-01-15';else if(e.type==='number')e.value=String(Math.max(8,Number(e.min)||0));else if(e.tagName==='SELECT')e.selectedIndex=Math.max(0,e.options.length-1);else e.value=e.type==='url'?'https://example.test/':'Synthetic feedback fixture';
   e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));
  }});
  if(mode!=='token-failure')await page.waitForFunction(()=>document.querySelector('form [name="_ktk_nonce"]').value==='fixture-not-a-secret');
 }
 const submit=()=>form.evaluate(f=>f.requestSubmit());
 const values=()=>form.evaluate(f=>[...f.elements].filter(e=>e.name&&!e.name.startsWith('_')&&e.type!=='hidden'&&e.type!=='submit').map(e=>[e.name,e.value,e.checked]));
 async function settled(){await page.waitForFunction(()=>{const f=document.querySelector('form[data-ktk-form]'),n=document.querySelector('[data-ktk-form-status]');return f.dataset.status&&f.dataset.submitting!=='true'&&n?.textContent.trim();});}
 async function announcement(name){
  const state=await page.evaluate(()=>{const n=document.querySelector('[data-ktk-form-status]'),f=document.querySelector('form[data-ktk-form]'),v=f.closest('.et_pb_contact')?.querySelector('.et-pb-contact-message')||f.parentElement.querySelector('.wpcf7-response-output,.et-pb-contact-message');return{same:n===window.__feedbackInitialStatus,count:document.querySelectorAll('[data-ktk-form-status]').length,role:n.getAttribute('role'),live:n.getAttribute('aria-live'),atomic:n.getAttribute('aria-atomic'),text:n.textContent,visualText:v.textContent,visualLive:v.getAttribute('aria-live'),outsideBusyForm:!f.contains(n),statusFocusable:n.hasAttribute('tabindex'),busy:f.getAttribute('aria-busy')};});
  check(label+' '+name+' stable single atomic status',state.same&&state.count===1&&state.role==='status'&&state.live==='polite'&&state.atomic==='true'&&state.outsideBusyForm&&!state.statusFocusable,state);
  check(label+' '+name+' full feedback announced once',state.text===state.visualText&&!!state.text&&state.visualLive==='off',state);
  check(label+' '+name+' no busy state retained',state.busy===null);
 }
 try{
  await reset('success');
  const initial=await status.evaluate(n=>({text:n.textContent,role:n.getAttribute('role'),live:n.getAttribute('aria-live'),atomic:n.getAttribute('aria-atomic'),display:getComputedStyle(n).display,visibility:getComputedStyle(n).visibility,hidden:!!n.closest('[aria-hidden="true"]')}));
  check(label+' initially empty persistent live region',!initial.text&&initial.role==='status'&&initial.live==='polite'&&initial.atomic==='true'&&initial.display!=='none'&&initial.visibility!=='hidden'&&!initial.hidden,initial);
  check(label+' no premature invalid markers',await form.locator('[data-ktk-field-invalid]').count()===0);
  await form.locator('[type=submit]').click();await settled();
  check(label+' native errors never post',posts===0);
  check(label+' all native errors described and focused',await form.evaluate(f=>{const invalid=[...f.elements].filter(e=>e.name&&e.willValidate&&!e.validity.valid);return invalid.length>0&&invalid.every(e=>e.getAttribute('aria-invalid')==='true'&&(e.getAttribute('aria-describedby')||'').split(/\s+/).some(id=>f.querySelector('.ktk-form-field-error#'+CSS.escape(id))?.textContent==='Please complete this field.'))&&invalid.includes(document.activeElement);}));
  await form.evaluate((f,name)=>{const e=[...f.elements].find(e=>e.name===name),help=document.createElement('span');help.id='fixture-existing-help';help.hidden=true;help.textContent='Existing fixture help.';f.append(help);e.setAttribute('aria-describedby',(e.getAttribute('aria-describedby')||'')+' '+help.id);},rejected);
  await form.locator('input[type=email]').fill('invalid-fixture');
  check(label+' editing invalid email updates its native error',await form.evaluate((f,name)=>{const e=[...f.elements].find(e=>e.name===name);return !e.validity.valid&&e.getAttribute('aria-invalid')==='true'&&(e.getAttribute('aria-describedby')||'').split(/\s+/).some(id=>document.getElementById(id)?.textContent==='Please enter a valid email address.');},rejected));
  check(label+' native feedback never echoes entered email',await form.locator('.ktk-form-field-error').evaluateAll(nodes=>nodes.every(n=>!n.textContent.includes('invalid-fixture'))));
  await form.locator('input[type=email]').fill('feedback-fixture@example.test');
  check(label+' correction preserves unrelated errors/help',await form.evaluate((f,name)=>{const e=[...f.elements].find(e=>e.name===name);return e.getAttribute('aria-invalid')==='false'&&(e.getAttribute('aria-describedby')||'').includes('fixture-existing-help')&&[...f.elements].some(x=>x!==e&&x.name&&x.willValidate&&!x.validity.valid&&x.getAttribute('aria-invalid')==='true');},rejected));
  await announcement('native errors');
  await reset('field');await fill();const saved=await values();await submit();await settled();
  check(label+' server scalar rejection keeps all values',posts===1&&JSON.stringify(saved)===JSON.stringify(await values()));
  check(label+' server scalar error associated/focused and escaped',await form.evaluate((f,name)=>{const e=[...f.elements].find(e=>e.name===name);return e===document.activeElement&&e.getAttribute('aria-invalid')==='true'&&(e.getAttribute('aria-describedby')||'').split(/\s+/).some(id=>{const h=document.getElementById(id);return h?.textContent==='Fixture field error <em>literal</em>.'&&!h.querySelector('em');});},rejected));
  await announcement('server field');
  const client=await c.newCDPSession(page),obj=await client.send('Runtime.evaluate',{expression:'document.querySelector("[data-ktk-form-status]")'}),ax=await client.send('Accessibility.getPartialAXTree',{objectId:obj.result.objectId,fetchRelatives:false});
  check(label+' actual Chrome AX status exposure',ax.nodes.some(n=>!n.ignored&&n.role?.value==='status'&&n.properties?.some(x=>x.name==='live'&&x.value.value==='polite')&&n.properties.some(x=>x.name==='atomic'&&x.value.value===true)));
  await form.locator('input[type=email]').fill('corrected-fixture@example.test');check(label+' corrected server scalar clears own error',await form.locator('[data-ktk-field-invalid]').count()===0);
  mode='success';await submit();await settled();await announcement('success');check(label+' success resets fields and error hints',await form.getAttribute('data-status')==='sent'&&await form.locator('.ktk-form-field-error').count()===0&&await form.locator('input[type=email]').inputValue()==='');
  const group=definition.fields.find(f=>f.type==='multiselect');
  if(group){await reset('group');rejected=group.name;await fill();await submit();await settled();check(label+' all group controls share error and focus',await form.evaluate((f,name)=>{const e=[...f.elements].find(e=>e.name===name),controls=e.type==='hidden'?[...e.closest('.et_pb_contact_field').querySelectorAll('input[type=checkbox]')]:[...f.elements].filter(x=>x.name===name);return controls.length>1&&controls.every(x=>x.getAttribute('aria-invalid')==='true'&&(x.getAttribute('aria-describedby')||'').split(/\s+/).some(id=>document.getElementById(id)?.classList.contains('ktk-form-field-error')))&&controls.includes(document.activeElement);},group.name));await announcement('group error');rejected=definition.fields.find(f=>f.type==='email').name;}
  for(const failure of['expired','rate-limit','unconfirmed','html','bad-json','network','token-failure']){
   await reset(failure);await fill();const before=await values();await submit();await settled();await announcement(failure);
   check(label+' '+failure+' preserves values and never reports sent',JSON.stringify(before)===JSON.stringify(await values())&&await form.getAttribute('data-status')==='invalid');
   check(label+' '+failure+' exact bounded submission count',posts===(failure==='token-failure'?0:1));
   if(['unconfirmed','html','bad-json','network'].includes(failure)){
    check(label+' '+failure+' uncertain lock retained',await form.getAttribute('data-delivery-unconfirmed')==='true');
    await submit();await settled();await page.waitForFunction(()=>document.querySelector('[data-ktk-form-status]').textContent.includes('11111111-2222-4333-8444-555555555555'));
    check(label+' '+failure+' retry blocked with reference',posts===1);await announcement(failure+' repeated attempt');
   }
  }
  await reset('pending');await fill();await submit();await page.waitForFunction(()=>document.querySelector('[data-ktk-form-status]').textContent==='Sending your message. Please wait.');
  check(label+' pending busy/disabled state announced',posts===1&&await form.getAttribute('aria-busy')==='true'&&await form.locator('[type=submit]').isDisabled());await submit();check(label+' duplicate pending request blocked',posts===1);
  await form.locator('input[type=email]').fill('');await submit();
  check(label+' native revalidation never replaces pending feedback',posts===1&&await form.getAttribute('aria-busy')==='true'&&await status.textContent()==='Sending your message. Please wait.'&&await form.locator('.ktk-form-field-error').count()===0);
  await form.locator('input[type=email]').fill('feedback-fixture@example.test');release();await settled();await announcement('pending completed');
  check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width===320){await form.scrollIntoViewIfNeeded();await form.screenshot({path:path.join(path.dirname(output),definition.id+'-feedback-320.png')});}
  report.views.push({id:definition.id,width,passed:true});
 }catch(e){report.errors.push({label,message:e.message});}finally{if(release)release();await Promise.allSettled(assetChecks);await c.close();}
 await writeFile(output+'.progress.json',JSON.stringify({last:label,views:report.views.length,passed:report.checks.filter(x=>x.pass).length,total:report.checks.length,errors:report.errors},null,2)+'\n');
}}
finally{await browser.close();}
check('All seven forms at three widths completed',report.views.length===21,report.views);
check('No browser/scenario errors',report.errors.length===0,report.errors);
check('All payload names/routing/identity/nonces unchanged',report.payloads.length>0&&report.payloads.every(p=>p.keysExact&&p.routing&&p.syntheticIdentity&&p.fixtureNonce),report.payloads.filter(p=>!p.keysExact||!p.routing||!p.syntheticIdentity||!p.fixtureNonce));
check('All actually served runtime bytes match source',report.runtimeResponses.length>0&&report.runtimeResponses.every(r=>r.status===200&&r.sha256===report.runtimeSHA256));
check('No unknown or external POST attempted in the isolated audit',report.remoteWrites===0);
check('Source runtime stayed exact during audit',sha(await readFile('staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.js'))===report.runtimeSHA256);
report.total=report.checks.length;report.passed=report.checks.filter(c=>c.pass).length;report.failed=report.checks.filter(c=>!c.pass);report.finishedAt=new Date().toISOString();
await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:report.passed,total:report.total,views:report.views.length,failed:report.failed,errors:report.errors}));if(report.failed.length)process.exitCode=1;
