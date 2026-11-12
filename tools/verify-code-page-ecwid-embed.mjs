import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={checkedAt:new Date().toISOString(),noInputsOrCartButtonsUsed:true,checks:[],catalogBootstraps:0,blockedWrites:0,writePaths:[],errors:[]};
let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.route('**/*',route=>{
  const request=route.request();
  // Ecwid reads public catalog/configuration through this POST; no cart or checkout endpoint is allowed.
  if(request.method()==='POST'&&/^https:\/\/[a-z0-9-]+-storefront-api\.ecwid\.com\/storefront\/api\/v1\/100323031\/(?:bootstrap|initial-data|catalog\/products)(?:\?|$)/.test(request.url())){report.catalogBootstraps++;return route.continue();}
  if(!['GET','HEAD','OPTIONS'].includes(request.method())){report.blockedWrites++;const url=new URL(request.url());report.writePaths.push(request.method()+' '+url.origin+url.pathname);return route.abort();}
  if(/googletagmanager|google-analytics|clarity\.ms|facebook\.net|facebook\.com\/tr|googleadservices|doubleclick\.net/.test(request.url()))return route.abort();
  return route.continue();
 });
 await page.goto('https://krawlthroughkrakow.com/staging/krakow-stag-do/?ktk_widget_check=20261105',{waitUntil:'domcontentloaded'});
 const reject=page.getByRole('button',{name:/^Reject(?: all)?$/i}).first();
 for(let i=0;i<10;i++){if(await reject.isVisible()){await reject.click();break;}await page.waitForTimeout(250);}
 const widget=page.locator('[data-single-product-id="637056338"]');
 await widget.scrollIntoViewIfNeeded();
 await widget.locator('.ecwid-SingleProduct-options input,.ecwid-SingleProduct-options select').first().waitFor({state:'attached',timeout:30000});
 report.checks.push({name:'one original product embed',passed:await widget.count()===1});
 report.checks.push({name:'live original Ecwid options rendered',passed:await widget.locator('.ecwid-SingleProduct-options input,.ecwid-SingleProduct-options select').count()>0});
 report.checks.push({name:'original buy control remains available',passed:await widget.locator('.ecwid-btn--addToBag').count()===1});
 await widget.screenshot({path:'docs/code-pages/full-migration/staging-ecwid-embed.png'});
}catch(error){report.checks.push({name:'live read-only widget check completed',passed:false,error:error.message});if(page){report.diagnostic=await page.evaluate(()=>({xProduct:typeof window.xProduct,Ecwid:typeof window.Ecwid,widget:document.querySelector('[data-single-product-id]')?.innerHTML.slice(0,600),scripts:[...document.scripts].filter(s=>s.src.includes('app.ecwid')).map(s=>({src:s.src,type:s.type,class:s.className})),consent:window._iub?.cs?.api?.getPreferences?.()?.purposes}));await page.screenshot({path:'docs/code-pages/full-migration/staging-ecwid-diagnostic.png',fullPage:true});}}
finally{await browser.close();}
report.passed=report.checks.filter(c=>c.passed).length;report.total=report.checks.length;
await writeFile('docs/code-pages/full-migration/staging-ecwid-embed.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
