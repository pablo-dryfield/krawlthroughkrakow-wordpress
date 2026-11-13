import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output=process.argv[process.argv.indexOf('--output')+1];
if(!process.argv.includes('--output')||!output)throw Error('Explicit new report path required');
try{await readFile(output);throw Error('Preserve previous evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const url=pathToFileURL(path.resolve('docs/seo/ROADMAP.html')).href;
const source=JSON.parse(await readFile('tools/seo-roadmap.json','utf8'));
const axe=await readFile('staging/wp-content/plugins/ktk-storefront/frontend/node_modules/axe-core/axe.min.js','utf8');
const report={checkedAt:new Date().toISOString(),scope:'Offline local roadmap, no website requests/deployment/settings changes',checks:[],errors:[],network:[],accessibility:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const screenshots=path.join(path.dirname(output),path.basename(output,'.json')+'-screenshots');
await mkdir(screenshots,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
async function geometry(page,name){
  const facts=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
    overflow:[...document.querySelectorAll('button,input,select')].filter(node=>node.getClientRects().length&&node.scrollWidth>node.clientWidth+2).map(node=>({id:node.id,text:node.textContent.slice(0,80),width:node.clientWidth,scroll:node.scrollWidth})),
    logo:document.querySelector('.brand-logo').complete&&document.querySelector('.brand-logo').naturalWidth>0}));
  check(name+' no horizontal page overflow',facts.scroll<=facts.width+1,facts);
  check(name+' controls contain their contents',facts.overflow.length===0,facts.overflow);
  check(name+' actual brand asset rendered',facts.logo);
}
async function accessibility(page,name){
  await page.evaluate(axe);
  const results=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,count:v.nodes.length}))};});
  report.accessibility.push({name,...results});check(name+' no automated accessibility violations',results.violations.length===0,results.violations);
}
try{
 for(const width of [320,390,768,1024,1440,1920]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route(/^https?:/,route=>{report.network.push(route.request().url());return route.abort();});
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push({width,message:error.message}));
  try{
   await page.goto(url,{waitUntil:'load'});
   const model=await page.evaluate(()=>JSON.parse(document.getElementById('roadmap-data').textContent));
   check(width+' forty source-bound work tiles',await page.locator('.work-cell').count()===40);
   check(width+' all delivery milestones',await page.locator('.milestone').count()===source.milestones.length);
   const verified=source.milestones.filter(row=>['source_verified','staging_verified','live_verified'].includes(row.status)).length;
   check(width+' accurate verified milestones',(await page.locator('#foundation-count').textContent())===verified+' / '+source.milestones.length);
   check(width+' website releases match maintained source',(await page.locator('#production-count').textContent())===String(source.websiteProductionReleases));
   check(width+' no false full-plan percentage',(await page.locator('.status-section .method').textContent()).includes('not a time estimate or an overall completion percentage'));
   check(width+' source-bound delivery counts',Object.entries(model.deliveries.counts).every(([stage,count])=>source.deliveries.filter(row=>row.stage===stage).length===count));
   check(width+' recent deliveries visible',await page.locator('[data-delivery]').count()===Math.min(4,source.deliveries.length));
   check(width+' staging delivery does not complete whole workstream',model.tickets.find(row=>row.id==='C04').bucket==='in_progress'&&model.deliveries.items.find(row=>row.id==='budget-guide').stage==='staging_verified');
   await page.locator('#delivery-expand').click();
   check(width+' expand shows every delivery',await page.locator('[data-delivery]').count()===source.deliveries.length&&await page.locator('#delivery-expand').getAttribute('aria-expanded')==='true');
   await geometry(page,width+' expanded deliveries');
   await page.locator('[data-delivery-stage="staging_verified"]').click();
   check(width+' staging delivery filter is independent',await page.locator('[data-delivery]').count()===model.deliveries.counts.staging_verified&&await page.locator('#overview').isVisible()&&await page.locator('#delivery-stage').inputValue()==='staging_verified');
   check(width+' pressed delivery filter keeps keyboard focus',await page.locator('[data-delivery-stage="staging_verified"]').getAttribute('aria-pressed')==='true'&&await page.locator('[data-delivery-stage="staging_verified"]').evaluate(node=>node===document.activeElement));
   await page.locator('#delivery-stage').selectOption('live_verified');
   check(width+' live delivery filter keeps environment explicit',await page.locator('[data-delivery]').count()===model.deliveries.counts.live_verified&&(await page.locator('[data-delivery] .pill').allTextContents()).every(text=>text.includes('OmniLodge')));
   await page.locator('#delivery-stage').selectOption('in_progress');
   check(width+' unfinished delivery has no verification date',(await page.locator('[data-delivery] small').allTextContents()).every(text=>text.includes('Not yet verified')));
   await page.locator('#delivery-stage').selectOption('all');
   check(width+' reset delivery stage restores recent batches',await page.locator('[data-delivery]').count()===Math.min(4,source.deliveries.length)&&await page.locator('#delivery-expand').getAttribute('aria-expanded')==='false');
   check(width+' budget evidence and next step retained',await page.locator('[data-delivery="budget-guide"] a').getAttribute('href')===source.deliveries.find(row=>row.id==='budget-guide').evidence&&(await page.locator('[data-delivery="budget-guide"]').textContent()).includes(source.deliveries.find(row=>row.id==='budget-guide').remaining));
   for(const status of ['complete','in_progress','not_started','deferred'])check(width+' correct '+status+' graphics',await page.locator('.work-cell.'+status).count()===model.counts[status]);
   await geometry(page,width+' overview');
   await page.screenshot({path:path.join(screenshots,'overview-'+width+'.png'),fullPage:true});
   if([390,1440].includes(width))await accessibility(page,width+' overview');
   await page.locator('#show-remaining').click();
   check(width+' remaining excludes only completed work',await page.locator('.task-row').count()===40-model.counts.complete);
   await page.locator('#status').selectOption('not_started');
   check(width+' not-started filter',await page.locator('.task-row').count()===model.counts.not_started);
   await page.locator('#group').selectOption('C');
   check(width+' combined area and status filters',await page.locator('.task-row').count()===model.tickets.filter(t=>t.group==='C'&&t.bucket==='not_started').length);
   await page.locator('#group').selectOption('G');
   const selectedFits=await page.locator('#group').evaluate(node=>{const style=getComputedStyle(node),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=style.font;return {text:node.selectedOptions[0].text,width:ctx.measureText(node.selectedOptions[0].text).width,available:node.clientWidth-32};});
   check(width+' longest work area label fits its control',selectedFits.width<=selectedFits.available,selectedFits);
   await page.locator('#reset-filters').click();
   check(width+' clear restores every workstream',await page.locator('.task-row').count()===40);
   await page.locator('#priority').selectOption('P0');
   check(width+' priority filter',await page.locator('.task-row').count()===model.tickets.filter(t=>t.priority==='P0').length);
   await page.locator('#reset-filters').click();
   await geometry(page,width+' all workstreams');
   if([390,1440].includes(width)){
    await page.screenshot({path:path.join(screenshots,'workstreams-'+width+'.png')});
    await accessibility(page,width+' workstreams');
   }
   await page.locator('#search').fill('D03');
   check(width+' ID search finds one workstream',await page.locator('.task-row').count()===1);
   await page.locator('.task-row').click();
   check(width+' task detail dialog opens',await page.locator('#task-dialog').isVisible());
   check(width+' actual task title and remaining work',await page.locator('#detail-title').textContent()===source.view.tickets.D03.title&&await page.locator('#detail-remaining').textContent()===source.view.tickets.D03.remaining);
   check(width+' task acceptance criterion retained',(await page.locator('#detail-acceptance').textContent())===model.tickets.find(t=>t.id==='D03').acceptance);
   const rect=await page.locator('#task-dialog').boundingBox();
   check(width+' modal fits the viewport',rect.x>=0&&rect.x+rect.width<=width+1&&rect.y>=0&&rect.y+rect.height<=901,rect);
   await geometry(page,width+' task details');
   if([390,1440].includes(width)){
    await page.screenshot({path:path.join(screenshots,'details-'+width+'.png')});
    await accessibility(page,width+' task details');
   }
   await page.keyboard.press('Escape');
   check(width+' Escape closes dialog and restores focus',!await page.locator('#task-dialog').isVisible()&&await page.evaluate(()=>document.activeElement?.dataset.ticket==='D03'));
   await page.locator('#search').fill('not-a-real-workstream-xyz');
   check(width+' useful empty state',await page.locator('.task-row').count()===0&&await page.locator('#empty').isVisible());
   await page.locator('#empty-reset').click();
   await page.locator('#status').selectOption('complete');
   check(width+' completed filter includes only delivered work',await page.locator('.task-row').count()===model.counts.complete);
   if(model.counts.complete){
    await page.locator('.task-row').first().click();
    check(width+' completed detail distinguishes delivered evidence',await page.locator('#remaining-label').textContent()==='Delivered'&&await page.locator('#acceptance-label').textContent()==='Completion evidence');
    await page.locator('#close-dialog').click();
   }
   await page.locator('#reset-filters').click();
   if(width>850){
    await page.locator('[data-group="T"]').click();
    check(width+' work-area navigation',await page.locator('.task-row').count()===10&&await page.locator('#group').inputValue()==='T');
   }
   await page.locator('#tab-work').focus();await page.keyboard.press('ArrowLeft');
   check(width+' native keyboard view navigation',await page.locator('#overview').isVisible()&&await page.locator('#tab-overview').getAttribute('aria-selected')==='true');
   await page.evaluate(()=>{window.print=()=>{window.__printed=true;};});await page.locator('#print').click();
   check(width+' print command',await page.evaluate(()=>window.__printed===true));
   await page.emulateMedia({media:'print'});
   check(width+' print view has no page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.emulateMedia({media:'screen'});
  }finally{await context.close();}
 }
 for(const width of [390,1440]){
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900}});
  const page=await context.newPage();await page.goto(url,{waitUntil:'load'});
  check(width+' full no-JavaScript fallback',await page.locator('.noscript tbody tr').count()===40);
  check(width+' delivery progress survives without JavaScript',await page.locator('.delivery-fallback>li').count()===source.deliveries.length);
  check(width+' no-JavaScript page has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await context.close();
 }
 check('No script errors',report.errors.length===0,report.errors);
 check('Fully offline; no HTTP requests',report.network.length===0,report.network);
}catch(error){
 report.errors.push({message:error.message});check('Browser suite completed',false,error.message);
}finally{
 await browser.close();report.summary={passed:report.checks.filter(row=>row.pass).length,total:report.checks.length};
 await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({summary:report.summary,failed:report.checks.filter(row=>!row.pass)},null,2));
 if(report.summary.passed!==report.summary.total)process.exitCode=1;
}
