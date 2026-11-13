import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const frontendRequire=createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json'));
const axePackage=frontendRequire('axe-core/package.json');
if(axePackage.version!=='4.14.0')throw Error('Install the reviewed pinned axe-core dev dependency');
const axeSource=await readFile(frontendRequire.resolve('axe-core/axe.min.js'),'utf8');
const option=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const output=option('--output');if(!output)throw Error('Fresh report directory required');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier accessibility evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const sample=['/','/about-us/','/about-us/how-to-join/','/contact/','/faqs/','/gallery/','/blog/','/new-years-eve/','/new-years-eve-in-krakow/','/category/krakow-guides/','/store2/','/store2/pub-crawl-28/','/store2/nye-pub-crawl-32/'];
const routes=option('--routes')?option('--routes').split(','):sample;
if(routes.some(route=>!route.startsWith('/')||route.startsWith('//')||/[?#]/.test(route)))throw Error('Only explicit clean staging paths');
const widths=option('--widths','390,1440').split(',').map(Number);
if(widths.some(width=>!Number.isInteger(width)||width<320||width>2560))throw Error('Invalid viewport');
const base=option('--base','https://krawlthroughkrakow.com/staging').replace(/\/$/,'');
const homeBase=option('--home-base',base).replace(/\/$/,'');
const storeState=option('--store-state','observed');
if(!['observed','enhanced'].includes(storeState))throw Error('Store state must be observed or enhanced');
for(const value of [base,homeBase]){
 const url=new URL(value);
 if(!(url.origin==='https://krawlthroughkrakow.com'&&url.pathname==='/staging')&&!(url.protocol==='http:'&&url.hostname==='127.0.0.1'&&url.pathname==='/'))throw Error('Only staging or explicit loopback previews');
}
const report={checkedAt:new Date().toISOString(),engine:axePackage.version,scope:'Read-only staging WCAG-oriented automated audit, not full conformance or a screen-reader/consent/payment certificate. Third-party services and non-read requests blocked in isolated browsers. No personal data, submissions, carts, quotes or orders.',views:[],errors:[],pageErrors:[],blockedRequests:0};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const route of routes)for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
  try{
   await context.route('**/*',request=>{
    const req=request.request(),url=new URL(req.url());
    const local=url.protocol==='http:'&&url.hostname==='127.0.0.1'&&[new URL(base).origin,new URL(homeBase).origin].includes(url.origin);
    const publicRead=['GET','HEAD'].includes(req.method())&&(local||url.origin==='https://krawlthroughkrakow.com'
      &&url.pathname.startsWith('/staging/'))&&!/\/(?:collect|checkout|quote|orders|carts)(?:\/|$)/.test(url.pathname);
    if(!publicRead){report.blockedRequests++;return request.abort();}
    return request.continue();
   });
   page.on('pageerror',error=>report.pageErrors.push({route,width,message:error.message,stack:error.stack}));
   const target=new URL((route==='/'?homeBase:base)+route);
   if(process.argv.includes('--cache-bust'))target.searchParams.set('ktk_a11y','20261113-'+Date.now());
   const response=await page.goto(target.href,{waitUntil:'load',timeout:60000});
   if(response.status()!==200)throw Error('HTTP'+response.status());
   await page.evaluate(()=>document.fonts.ready);
   if(route.startsWith('/store2/')&&storeState==='enhanced'){
    await page.waitForFunction(()=>!document.getElementById('ktk-storefront-public-content')&&document.getElementById('ktk-storefront-root')?.hidden===false,{},{timeout:20000});
    if(await page.locator('#ktk-storefront-root .ktk-error').count())throw Error('Enhanced storefront is in error state, not a usable product/catalog');
   }
   await page.addScriptTag({content:axeSource});
   const result=await page.evaluate(async()=>{
    const audit=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']},iframes:false});
    const select=rows=>rows.map(row=>({id:row.id,impact:row.impact,description:row.description,help:row.help,helpUrl:row.helpUrl,tags:row.tags,nodes:row.nodes.map(node=>({target:node.target,html:node.html,failureSummary:node.failureSummary,checks:[...node.any,...node.all,...node.none].map(check=>({id:check.id,message:check.message,data:check.data}))}))}));
    return {violations:select(audit.violations),incomplete:select(audit.incomplete),passes:audit.passes.map(row=>row.id),inapplicable:audit.inapplicable.map(row=>row.id),overflow:document.documentElement.scrollWidth>innerWidth+1,title:document.title,storefrontState:document.getElementById('ktk-storefront-public-content')?'public-initial':document.getElementById('ktk-storefront-root')?.hidden===false?'enhanced':null};
   });
   report.views.push({route,width,status:response.status(),...result});
   console.log(route+' '+width+': '+result.violations.length+' violation rules, '+result.incomplete.length+' incomplete');
  }catch(error){report.errors.push({route,width,error:error.message});}
  finally{await context.close();}
 }
}finally{
 await browser.close();report.violationInstances=report.views.reduce((sum,view)=>sum+view.violations.reduce((n,rule)=>n+rule.nodes.length,0),0);
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({views:report.views.length,violationInstances:report.violationInstances,errors:report.errors,pageErrors:report.pageErrors}));
 if(report.errors.length||process.argv.includes('--require-clean')&&report.violationInstances)process.exitCode=1;
}
