import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const sharp=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));
const [home,pages,baselineHome,baselinePages,output]=process.argv.slice(2);
if(!output)throw Error('Four preview origins and fresh output directory required');
for(const value of [home,pages,baselineHome,baselinePages])if(new URL(value).hostname!=='127.0.0.1')throw Error('Isolated loopback checks only');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const checks=[],errors=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
const formSignature=()=>[...document.forms].map(form=>({action:form.getAttribute('action'),method:form.method,endpoint:form.dataset.feedbackEndpoint,fields:[...form.elements].map(field=>({tag:field.tagName,type:field.type,name:field.name,value:field.value,required:field.required,minimum:field.min,maximum:field.max,options:field.options?[...field.options].map(option=>({value:option.value,text:option.textContent})):null}))}));
try{
 for(const width of [320,390,768,1024,1440,1920]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'&&['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
  await context.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;});
  try{
   const page=await context.newPage(),reference=await context.newPage();
   page.on('pageerror',error=>errors.push(error.message));
   await reference.goto(baselineHome);await page.goto(home);
   for(const tab of [page,reference])await tab.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.ktk-hero-statue,#logo')].map(image=>image.decode()));});
   // Foreground each tab before waiting: Chrome defers the logo transition in hidden tabs.
   await page.bringToFront();await page.locator('#logo').evaluate(e=>e.getBoundingClientRect().width);await page.waitForTimeout(1200);
   const currentLogo=await page.locator('#logo').evaluate(e=>JSON.stringify(e.getBoundingClientRect()));
   const header=await page.locator('#main-header').screenshot({path:path.join(output,`header-${width}.png`)});
   await reference.bringToFront();await reference.locator('#logo').evaluate(e=>e.getBoundingClientRect().width);await reference.waitForTimeout(1200);
   const originalLogo=await reference.locator('#logo').evaluate(e=>JSON.stringify(e.getBoundingClientRect()));
   const original=await reference.locator('#main-header').screenshot({path:path.join(output,`header-before-${width}.png`)});
   const decoded=async png=>sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const [a,b]=await Promise.all([decoded(header),decoded(original)]);
   check(width+' unchanged header pixels',JSON.stringify(a.info)===JSON.stringify(b.info)&&a.data.equals(b.data),{before:b.info,after:a.info,currentLogo,originalLogo});
   const statues=tab=>tab.locator('.ktk-hero-statue').evaluateAll(images=>images.map(image=>{const rect=image.getBoundingClientRect();return {src:new URL(image.src).pathname,alt:image.alt,x:rect.x,y:rect.y,width:rect.width,height:rect.height,decoded:image.naturalWidth>0};}));
   check(width+' original statues and framing unchanged',JSON.stringify(await statues(page))===JSON.stringify(await statues(reference)));
   check(width+' floating CTA has one named navigation landmark',await page.getByRole('navigation',{name:'Book an experience'}).locator('#ktk-cta').count()===1);
   check(width+' footer module targets have at least24px height',await page.locator('a.ktk-parity-module-link').evaluateAll(links=>links.every(link=>link.getBoundingClientRect().height>=24)));
   const gallery=page.locator('.et_pb_gallery_fullwidth').first();await gallery.scrollIntoViewIfNeeded();
   const dots=gallery.locator('.et-pb-controllers a');
   check(width+' gallery dots have disjoint24px targets',await dots.evaluateAll(links=>links.every((link,index)=>{const rect=link.getBoundingClientRect(),next=links[index+1]?.getBoundingClientRect();return rect.width>=24&&rect.height>=24&&(!next||next.top>rect.top||next.left>=rect.right);})));
   await dots.nth(1).click({position:{x:2,y:2}});
   check(width+' dot corner activates the second photo',await dots.nth(1).getAttribute('aria-current')==='true');
   await dots.first().focus();await page.keyboard.press('Space');
   check(width+' dot Space returns to first photo',await dots.first().getAttribute('aria-current')==='true');
   check(width+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.goto(pages+'/stagshens/');await reference.goto(baselinePages+'/stagshens/');
   check(width+' original form actions and complete payload fields unchanged',JSON.stringify(await page.evaluate(formSignature))===JSON.stringify(await reference.evaluate(formSignature)));
   const form=page.locator('form[data-ktk-form=cf7]');
   check(width+' every enquiry field uses existing visible label',await form.locator('input:not([type=hidden]):not([type=submit]),textarea').evaluateAll(fields=>fields.every(field=>{const label=document.getElementById(field.getAttribute('aria-labelledby'));return label&&label.textContent.trim()&&getComputedStyle(label).display!=='none';})));
   const checkbox=form.getByRole('checkbox',{name:'Vodka Tasting',exact:true}).first();await checkbox.focus();await page.keyboard.press('Space');
   check(width+' named enquiry checkbox retains keyboard behavior',await checkbox.isChecked());
   await page.goto(pages+'/welcome-to-alcohol/');
   check(width+' empty source toggle now has meaningful name',await page.getByRole('button',{name:'Toggle contact form'}).count()===1);
   await context.close();
  }catch(error){errors.push({width,error:error.stack});await context.close();}
 }
}finally{
 await browser.close();const report={checkedAt:new Date().toISOString(),scope:'Local read-only rendering, exact header/artwork framing and stub-free native controls; all non-read/vendor traffic blocked, no forms submitted.',passed:checks.filter(row=>row.pass).length,total:checks.length,checks,errors};
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,total:report.total,errors,failed:checks.filter(row=>!row.pass)},null,2));
 if(errors.length||report.passed!==report.total)process.exitCode=1;
}
