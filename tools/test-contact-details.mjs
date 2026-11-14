import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadContactDetails,reviseContactDetails} from './contact-details-editorial.mjs';
const [base,output]=process.argv.slice(2);if(!['http://127.0.0.1:5185/','https://krawlthroughkrakow.com/staging/'].includes(base)||!output)throw Error('Explicit staging/loopback base and fresh evidence directory required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve previous evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(output,{recursive:true});
const root='staging/wp-content/mu-plugins/ktk-code-pages-assets/',revision=await loadContactDetails(),baseline='a4e875225d94d6b5c834bf48969f76191b851ca8';
const before=execFileSync('git',['show',baseline+':'+root+'content/contact.html'],{encoding:'utf8',maxBuffer:10*1024*1024});
const paths=[root+'content/contact.html',root+'pages/contact.php',root+'runtime.js',root+'runtime.css','tools/contact-details-editorial.mjs','tools/content/contact-details.html','tools/test-contact-details.mjs','docs/code-pages/full-migration/assets.json'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),hashes=async()=>{const h={};for(const file of paths)h[file]=sha(await readFile(file));return h;},initial=await hashes();
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const checks=[],errors=[],requests=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const fixture=await browser.newPage({javaScriptEnabled:false});await fixture.route('**/*',r=>r.abort());
 for(const [label,html]of [['prepared',before]]){
  await fixture.setContent(html);await fixture.evaluate(reviseContactDetails,{key:'contact',revision});
  check(label+' copy/map/email recipe applies',await fixture.locator('[data-ktk-contact-copy]').count()===1&&await fixture.locator('[data-ktk-contact-map-fallback]').count()===1&&await fixture.locator('#main-content a[href="mailto:pubthroughkrakow@gmail.com"]').count()===1);
  const once=await fixture.locator('body').innerHTML();await fixture.evaluate(reviseContactDetails,{key:'contact',revision});check(label+' recipe idempotent',await fixture.locator('body').innerHTML()===once);
 }
 const mutations=[
  {name:'late email changed',dom:()=>document.querySelector('#main-content a[href^="mailto:"]').setAttribute('href','mailto:unreviewed@example.invalid')},
  {name:'late email duplicate',dom:()=>{const n=document.querySelector('#main-content a[href^="mailto:"]');n.after(n.cloneNode(true));}},
  {name:'late map source changed',dom:()=>document.querySelector('.et_pb_code_0 iframe').dataset.ktkEmbedSrc='https://example.invalid/'},
  {name:'late map dimensions changed',dom:()=>document.querySelector('.et_pb_code_0 iframe').width='999'},
  {name:'late map extra content',dom:()=>document.querySelector('.et_pb_code_0 .et_pb_code_inner').append('unreviewed')},
  {name:'late map duplicate',dom:()=>{const n=document.querySelector('.et_pb_code_0 iframe');n.after(n.cloneNode(true));}},
  {name:'late map stale marker',dom:()=>document.querySelector('.et_pb_code_0 .et_pb_code_inner').dataset.ktkContactMap='2025-01-01'},
  {name:'original copy changed',dom:()=>document.querySelector('.et_pb_text_2 .et_pb_text_inner').append('unreviewed')},
  {name:'protected control inserted',dom:()=>document.querySelector('.et_pb_text_2 .et_pb_text_inner').append(document.createElement('form'))},
  {name:'missing target',dom:()=>document.querySelector('.et_pb_text_2 .et_pb_text_inner').remove()},
  {name:'unreviewed destination',markup:revision.markup.replace('href="__KTK_HOME_URL__meeting-point/"','href="javascript:alert(1)"')},
  {name:'injected attribute',markup:revision.markup.replace('<strong>','<strong onclick="alert(1)">')},
  {name:'missing part',markup:revision.markup.replace(/<template data-part="map">[\s\S]*?<\/template>/,'')},
  {name:'duplicate part',markup:revision.markup+revision.markup.match(/<template data-part="map">[\s\S]*?<\/template>/)[0]},
  {name:'map link changed',markup:revision.markup.replace('https://maps.app.goo.gl/S3kQZC5rdABdpA1G9','https://example.invalid/')},
  {name:'external target protections removed',markup:revision.markup.replace(' rel="noopener noreferrer"','')}
 ];
 await fixture.setContent(revision.sourceHtml);const rawSnapshot=await fixture.locator('body').innerHTML();let rawRejected=false;
 try{await fixture.evaluate(reviseContactDetails,{key:'contact',revision});}catch{rawRejected=true;}
 check('raw plugin noscript duplicate requires existing builder normalization, rejected atomically',rawRejected&&await fixture.locator('body').innerHTML()===rawSnapshot);
 for(const m of mutations){await fixture.setContent(before);if(m.dom)await fixture.evaluate(m.dom);const snapshot=await fixture.locator('body').innerHTML();let rejected=false;
  try{await fixture.evaluate(reviseContactDetails,{key:'contact',revision:{...revision,markup:m.markup||revision.markup}});}catch{rejected=true;}
  check(m.name+' fails atomically',rejected&&await fixture.locator('body').innerHTML()===snapshot);
 }
 await fixture.close();
 for(const width of [320,390,600,768,1024,1440])for(const javaScriptEnabled of [true,false]){
  const label=width+' '+(javaScriptEnabled?'JS':'no-JS'),context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled,reducedMotion:'reduce',serviceWorkers:'block'}),external=[];
  try{
   await context.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;});
   await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());
    if(!['GET','HEAD'].includes(q.method())){requests.push({method:q.method(),url:u.origin+u.pathname});return r.abort();}
    if(u.origin!==new URL(base).origin){external.push({origin:u.origin,path:u.pathname});return r.abort();}
    if(u.hostname!=='127.0.0.1'&&!u.pathname.startsWith('/staging/')&&u.pathname!=='/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js')return r.abort();return r.continue();
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push({label,message:e.message}));const url=new URL('contact/',base);if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_contact_check',Date.now().toString());
   const response=await page.goto(url.href,{waitUntil:'load',timeout:60000});await page.evaluate(()=>document.fonts.ready);
   check(label+' HTTP200',response.status()===200);
   const state=await page.evaluate(()=>{
    const copy=document.querySelector('[data-ktk-contact-copy]'),fallback=document.querySelector('[data-ktk-contact-map-fallback]'),frame=document.querySelector('[data-ktk-contact-map] > iframe'),form=document.querySelector('form[data-ktk-form]');
    const email=document.querySelector('#main-content a[href^="mailto:"],#main-content a[href^="/cdn-cgi/l/email-protection#"]'),emailHref=email?.getAttribute('href');
    let address=emailHref;if(emailHref?.startsWith('/cdn-cgi/l/email-protection#')){const encoded=emailHref.split('#')[1],key=parseInt(encoded.slice(0,2),16);address='mailto:'+encoded.slice(2).match(/.{2}/g).map(v=>String.fromCharCode(parseInt(v,16)^key)).join('');}
    return {h1:[...document.querySelectorAll('h1')].map(n=>n.textContent),support:document.querySelector('.et_pb_heading_0 .et_pb_module_heading').tagName,
     copy:copy.innerText,map:fallback.innerText,visible:!!fallback.getBoundingClientRect().height,frameSrc:frame.getAttribute('src'),frameHidden:getComputedStyle(frame).display==='none',overflow:document.documentElement.scrollWidth>innerWidth+1,
     address,emailHref,links:[...document.querySelectorAll('[data-ktk-contact-copy] a,[data-ktk-contact-map-fallback] a')].map(a=>({text:a.textContent,href:a.href,target:a.target,rel:a.rel})),form:{action:form.getAttribute('action'),routing:form.querySelector('[name="action"]').value,property:typeof form.action}};
   });
   check(label+' one useful Contact heading and support subheading',state.h1.length===1&&state.h1[0]==='Contact Us'&&state.support==='H2');
   check(label+' confirmed shared facts and event caveat',state.copy.includes('9 PM')&&state.copy.includes('Adam Mickiewicz Monument')&&state.copy.includes('pink umbrella')&&state.copy.includes('your own booking confirmation')&&!/120|guarantee|pro drunk/.test(state.copy));
   check(label+' native directions visible and original map withheld',state.visible&&state.map.includes("Krakow's Main Market Square")&&state.frameSrc==='about:blank'&&state.frameHidden);
   check(label+' no map-provider request before grant',!external.some(r=>/google\.(com|[a-z]+)$/.test(new URL(r.origin).hostname)&&r.path.includes('/maps/')),external);
   check(label+' direct/Cloudflare-encoded email identity is clean',state.address==='mailto:pubthroughkrakow@gmail.com',state.emailHref);
   if(javaScriptEnabled)check(label+' existing Cloudflare decoder restores actual mailto link',state.emailHref==='mailto:pubthroughkrakow@gmail.com',state.emailHref);
   check(label+' four native booking/meeting/Maps links without tracking',state.links.length===4&&state.links.every(l=>!/[?&](?:utm_|gclid|gbraid|wbraid)/.test(l.href))&&state.links.filter(l=>l.href==='https://maps.app.goo.gl/S3kQZC5rdABdpA1G9'&&l.target==='_blank'&&l.rel==='noopener noreferrer').length===1,state.links);
   check(label+' original form endpoint and hidden routing retained',state.form.action.endsWith('/wp-admin/admin-ajax.php')&&state.form.routing==='ktk_pages_contact'&&state.form.property==='object',state.form);
   check(label+' no horizontal overflow',!state.overflow);
   await page.locator('[data-ktk-contact-map-fallback]').scrollIntoViewIfNeeded();
   const collisions=await page.evaluate(()=>{
    const c=document.querySelector('#ktk-cta')?.getBoundingClientRect(),hits=[];if(!c)return hits;
    for(const parent of document.querySelectorAll('[data-ktk-contact-copy],[data-ktk-contact-map-fallback]')){const w=document.createTreeWalker(parent,NodeFilter.SHOW_TEXT);while(w.nextNode()){const n=w.currentNode;if(!n.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(n);for(const b of r.getClientRects())if(b.width&&b.height&&b.right>c.left&&b.left<c.right&&b.bottom>c.top&&b.top<c.bottom)hits.push(n.textContent);}}return hits;
   });check(label+' directions text clear of floating Book Now',!collisions.length,collisions);
   if(javaScriptEnabled){
    const source=await page.locator('[data-ktk-contact-map] > iframe').getAttribute('data-ktk-embed-src');
    await context.route('https://www.google.com/maps/d/embed?*',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Intercepted map fixture</title><p>Fixture only</p>'}));
    await page.evaluate(()=>{window._iub={cs:{api:{getPreferences:()=>({purposes:{3:true}})}}};dispatchEvent(new Event('iubenda_consent_given_purpose_3'));});
    await page.waitForFunction(src=>document.querySelector('[data-ktk-contact-map] > iframe').getAttribute('src')===src,source);
    check(label+' grant activates only original map and keeps native directions',await page.locator('[data-ktk-contact-map] > iframe').isVisible()&&await page.locator('[data-ktk-contact-map-fallback]').isVisible());
    const frameBox=await page.locator('[data-ktk-contact-map] > iframe').boundingBox();check(label+' map fits responsive four-to-three geometry',!!frameBox&&frameBox.x>=-1&&frameBox.x+frameBox.width<=width+1&&Math.abs(frameBox.width/frameBox.height-4/3)<.01,frameBox);
    await page.evaluate(()=>{window._iub.cs.api.getPreferences=()=>({purposes:{3:false}});dispatchEvent(new Event('iubenda_consent_rejected'));});
    await page.waitForFunction(()=>document.querySelector('[data-ktk-contact-map] > iframe').getAttribute('src')==='about:blank');
    check(label+' rejection/withdrawal withholds map and directions stay usable',!await page.locator('[data-ktk-contact-map] > iframe').isVisible()&&await page.locator('[data-ktk-contact-map-fallback] a').first().isVisible());
   }
   if([390,1440].includes(width)){await page.screenshot({path:path.join(output,label.replace(' ','-')+'-directions.png'),fullPage:true,animations:'disabled'});}
   if([320,390,1440].includes(width))for(const [selector,tag]of [['.et_pb_text_0','p'],['.et_pb_heading_0','h1']]){
    const module=page.locator('#main-content '+selector),name=selector.slice(1),geometry=()=>module.evaluate(n=>{const e=n.querySelector('[data-ktk-heading-origin]')||n.querySelector('h1,h2,p'),b=e.getBoundingClientRect(),s=getComputedStyle(e);return {bounds:[b.x,b.y,b.width,b.height],style:[s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.color,s.margin,s.padding]};});
    const candidateGeometry=await geometry(),candidatePng=await module.screenshot({path:path.join(output,label.replace(' ','-')+'-'+name+'-candidate.png'),animations:'disabled'});
    await module.evaluate((n,tag)=>{const e=n.querySelector('[data-ktk-heading-origin]'),replacement=document.createElement(tag);for(const a of e.attributes)if(a.name!=='data-ktk-heading-origin')replacement.setAttribute(a.name,a.value);replacement.append(...e.childNodes);e.replaceWith(replacement);},tag);
    const originalGeometry=await geometry(),originalPng=await module.screenshot({path:path.join(output,label.replace(' ','-')+'-'+name+'-original.png'),animations:'disabled'});
    check(label+' '+name+' original heading geometry/typography exact',JSON.stringify(candidateGeometry)===JSON.stringify(originalGeometry),{candidateGeometry,originalGeometry});
    check(label+' '+name+' strict unmasked heading pixels exact',sha(candidatePng)===sha(originalPng),{candidate:sha(candidatePng),original:sha(originalPng)});
   }
  }finally{await context.close();}
 }
}catch(error){errors.push({stack:error.stack});}finally{await browser.close();}
check('no browser/harness errors',!errors.length,errors);check('source and harness stable throughout run',JSON.stringify(await hashes())===JSON.stringify(initial));
check('no messages/cart/order/quote/conversion requests',requests.length===0,requests);
const report={checkedAt:new Date().toISOString(),base,baseline,sourceHashes:initial,scope:'Atomic fixtures, native directions and intercepted map-purpose states; all provider/non-read requests blocked or fulfilled. No consent/Google container change, real message, cart or purchase. Not a privacy, mail or complete accessibility certificate.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks,errors};
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass),errors},null,2));if(report.passed!==report.total)process.exitCode=1;
