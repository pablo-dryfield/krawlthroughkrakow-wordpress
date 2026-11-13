import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const frontendRequire=createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json'));
const axeSource=await readFile(frontendRequire.resolve('axe-core/axe.min.js'),'utf8');
const [base,output]=process.argv.slice(2);
if(!base||!output)throw Error('Staging or loopback store base and fresh report directory required');
const address=new URL(base);
if(!(address.origin==='https://krawlthroughkrakow.com'&&address.pathname==='/staging/store2/')&&!(address.protocol==='http:'&&address.hostname==='127.0.0.1'&&address.pathname==='/store2/'))throw Error('Owned staging or isolated loopback storefront only');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier report');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const report={checkedAt:new Date().toISOString(),base,scope:'Isolated initial and handoff-ready storefront markup/keyboard checks. No personal data or real cart/quote/order/payment/consent changes; all non-read and external requests aborted. Not whole-site WCAG or screen-reader/real-browser-zoom certification.',checks:[],errors:[],blocked:[],pageErrors:[],incomplete:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const js of [false,true])for(const slug of ['','pub-crawl-28','nye-pub-crawl-32'])for(const width of [320,390,768,1440]){
  const context=await browser.newContext({javaScriptEnabled:js,viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
  const name=(js?'enhanced':'initial')+' '+(slug||'catalog')+' '+width;
  try{
   await context.route('**/*',route=>{
    const req=route.request(),url=new URL(req.url());
    if(!['GET','HEAD'].includes(req.method())||url.origin!==address.origin){report.blocked.push({view:name,method:req.method(),origin:url.origin,path:url.pathname});return route.abort();}
    return route.continue();
   });
   page.on('pageerror',error=>report.pageErrors.push({view:name,message:error.message}));
   const url=new URL(slug?slug+'/':'',base);
   if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_store_accessibility','20261113-'+Date.now());
   const response=await page.goto(url.href,{waitUntil:'load'});
   if(js){
    await page.waitForFunction(()=>!document.getElementById('ktk-storefront-public-content')&&document.getElementById('ktk-storefront-root')?.hidden===false);
    if(await page.locator('#ktk-storefront-root .ktk-error').count())throw Error('Client error, not a ready experience');
   }
   await page.evaluate(()=>document.fonts.ready);
   check(name+' HTTP200 and single non-nested visible main',response.status()===200&&await page.getByRole('main').count()===1&&await page.locator('main main').count()===0);
   check(name+' heading and booking information belong to main',await page.locator('main h1').count()===1&&(!slug||await page.locator('main aside').count()===1));
   check(name+' no horizontal clipping',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const viewports=await page.locator('meta[name="viewport"]').evaluateAll(nodes=>nodes.map(node=>node.content));
   check(name+' one viewport without zoom suppression',viewports.length===1&&!viewports.some(value=>/maximum-scale|user-scalable\s*=\s*(?:0|no)\b/i.test(value)),viewports);
   if(js&&!slug)check(name+' visible activity stamp has image semantics',await page.getByRole('img',{name:/^\d+ activities$/}).count()===1);
   if(js&&slug){
    const selects=page.locator('.ktk-custom-select__trigger');
    check(name+' every custom select name contains its visible value',await selects.count()>0&&await selects.evaluateAll(nodes=>nodes.every(node=>(node.getAttribute('aria-label')||'').includes(node.innerText.trim()))));
    const men=page.getByRole('button',{name:'Number of men: 0',exact:true});
    await men.focus();await page.keyboard.press('ArrowDown');
    const selected=page.getByRole('button',{name:'Number of men: 1',exact:true});
    check(name+' keyboard quantity still updates value and name',await selected.innerText()==='1');
    await page.keyboard.press('ArrowUp');await men.press('Space');
    check(name+' Space opens named option list',await page.getByRole('listbox',{name:'Number of men',exact:true}).isVisible());
    await page.keyboard.press('Escape');
    check(name+' Escape restores trigger focus',await page.getByRole('listbox',{name:'Number of men',exact:true}).count()===0&&await men.evaluate(node=>document.activeElement===node));
    await men.press('Space');await page.getByRole('option',{name:'1',exact:true}).click();
    check(name+' choosing option preserves keyboard focus',await selected.evaluate(node=>document.activeElement===node));
    await selected.press('ArrowUp');
   }
   if(js){
    await page.addScriptTag({content:axeSource});
    const audit=await page.evaluate(async()=>{
     const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']},iframes:false});
     return {violations:result.violations.map(rule=>({id:rule.id,nodes:rule.nodes.map(node=>({target:node.target,html:node.html}))})),incomplete:result.incomplete.map(rule=>({id:rule.id,targets:rule.nodes.map(node=>node.target)}))};
    });
    report.incomplete.push({view:name,rules:audit.incomplete});check(name+' no automated violations in this state',!audit.violations.length,audit.violations);
   }
   check(name+' no attempted first-party writes',!report.blocked.some(row=>row.view===name&&row.origin===address.origin&&!['GET','HEAD'].includes(row.method)));
   if(js&&width===390)await page.screenshot({path:path.join(output,(slug||'catalog')+'-390.png')});
  }catch(error){report.errors.push({view:name,message:error.stack});}finally{await context.close();}
 }
}finally{
 await browser.close();report.passed=report.checks.filter(x=>x.pass).length;report.total=report.checks.length;
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,total:report.total,errors:report.errors,pageErrors:report.pageErrors,failed:report.checks.filter(x=>!x.pass)},null,2));
 if(report.errors.length||report.passed!==report.total)process.exitCode=1;
}
