import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const production=process.argv.includes('--production');
const prefix=production?'':'/staging';
const base='https://krawlthroughkrakow.com'+prefix;
const output=process.argv.includes('--output')?process.argv[process.argv.indexOf('--output')+1]:production?'docs/code-pages/production-release/attribution-tests.json':'docs/code-pages/production-readiness/staging-attribution-tests.json';
try{await readFile(output);throw new Error('Preserve earlier evidence; provide --output');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(path.dirname(output),{recursive:true});
const cases=[
 {path:'/',selector:'a[href*="store2/bottomless-brunch-29/"]',destination:'/staging/store2/bottomless-brunch-29/'},
 {path:'/new-years-eve/',selector:'#main-content .et_pb_button_0',destination:'/staging/store2/nye-pub-crawl-32/',product:32},
 {path:'/new-years-eve-in-krakow/',selector:'#main-content a[href*="/nye-pub-crawl-32/"]',destination:'/staging/store2/nye-pub-crawl-32/',product:32},
 {path:'/krakow-stag-do/',selector:'a[data-ktk-booking-product="40"]',destination:'/staging/store2/brewery-tour-40/'},
 {path:'/about-us/',selector:'#ktk-cta',destination:'/staging/store2/pub-crawl-28/',product:28}
];
if(!production)cases.push({path:'/krakow-stag-do/',selector:'a[data-ktk-booking-product="30"]',destination:'/staging/store2/go-karting-30/',product:30});
if(!production)for(const selector of ['.et_pb_text_5 a[href*="store2"]','.et_pb_text_33 a[href*="store2"]'])cases.push({path:'/',selector,destination:'/staging/store2/pub-crawl-28/',homepage:true});
if(!production)for(const path of ['/about-us/how-to-join/','/meeting-point/','/faqs/'])cases.push({path,selector:'[data-ktk-offer-copy] a[href*="store2/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
if(!production)cases.push({path:'/contact/',selector:'[data-ktk-contact-copy] a[href*="store2/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
if(!production)cases.push({path:'/wheres-the-cheap-places-to-drink-in-krakow/',selector:'.et_pb_text_0 a[href*="/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
if(!production)cases.push({path:'/jazz-bars-in-krakow/',selector:'.entry-content a[href*="/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
if(!production)cases.push({path:'/krakow-live-music/',selector:'.entry-content a[href*="/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
if(!production)for(const slug of ['krakow-techno-clubs','krakow-techno-clubs-2','irish-bars-krakow','krakow-nightclubs','krakow-bars-jewish-quarter','krakow-shot-bar'])cases.push({path:'/'+slug+'/',selector:'.entry-content a[href*="/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
if(!production)for(const slug of ['krakow-free-activities-2','krakow-budget-activities','krakow-money-saving-tips'])cases.push({path:'/'+slug+'/',selector:'[data-ktk-budget-travel-review] a[href*="/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
if(!production)for(const slug of ['travel-krakow-your-comprehensive-city-guide','weekend-in-krakow'])cases.push({path:'/'+slug+'/',selector:'[data-ktk-city-trip-review] a[href*="/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
if(!production)cases.push({path:'/weekend-in-krakow/',selector:'[data-ktk-city-trip-review] a[href*="/polish-vodka-tasting-44/"]',destination:'/staging/store2/polish-vodka-tasting-44/',product:44});
if(!production)for(const [path,index] of [['/2020-krakow-nightlife-guide/',0],['/best-places-to-eat/',0],['/best-places-to-eat/',1],['/krakow-hen-party-reviews/',0],['/krakow-weather-guide/',0]])cases.push({path,selector:'#main-content a[href*="/polish-vodka-tasting-44/"]',index,destination:'/staging/store2/polish-vodka-tasting-44/',product:44});
if(!production)for(const slug of ['go-karting-krakow','krakow-go-karting'])for(const index of [0,1])cases.push({path:'/'+slug+'/',selector:'[data-ktk-karting-review] a[href*="/go-karting-30/"]',index,destination:'/staging/store2/go-karting-30/',product:30});
if(!production)for(const slug of ['krakow-weather-guide','krakow-winter-activities'])cases.push({path:'/'+slug+'/',selector:'[data-ktk-weather-review] a[href*="/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
if(!production)cases.push({path:'/krakow-winter-activities/',selector:'[data-ktk-weather-review] a[href*="/food-tour-krakow-48/"]',destination:'/staging/store2/food-tour-krakow-48/',product:48});
if(!production)for(const slug of ['best-places-to-eat','krakow-food-truck-parks','krakow-milkbars'])for(const [product,destination] of [[48,'food-tour-krakow-48'],[28,'pub-crawl-28']])cases.push({path:'/'+slug+'/',selector:'[data-ktk-food-review] a[href*="/'+destination+'/"]',destination:'/staging/store2/'+destination+'/',product});
if(!production)for(const slug of ['sports-bar-krakow','krakow-wine-bars','karaoke-bars-in-krakow'])cases.push({path:'/'+slug+'/',selector:'[data-ktk-nightlife-choice-review] a[href*="/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
if(!production)cases.push({path:'/krakow-wine-bars/',selector:'[data-ktk-nightlife-choice-review] a[href*="/polish-vodka-tasting-44/"]',destination:'/staging/store2/polish-vodka-tasting-44/',product:44});
if(!production)for(const slug of ['bachelor-party-organisers-krakow','krakow-stag-activities','krakow-team-building-activities'])cases.push({path:'/'+slug+'/',selector:'[data-ktk-group-choice-review] a[href*="/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
if(!production)for(const [slug,product,destination] of [['krakow-stag-activities',30,'go-karting-30'],['krakow-team-building-activities',44,'polish-vodka-tasting-44']])cases.push({path:'/'+slug+'/',selector:'[data-ktk-group-choice-review] a[href*="/'+destination+'/"]',destination:'/staging/store2/'+destination+'/',product});
if(production)for(const item of cases)item.destination=item.destination.replace(/^\/staging/,'');
if(!production)for(const slug of ['escape-rooms-for-a-stag-do-in-krakow','krakow-shooting-range'])cases.push({path:'/'+slug+'/',selector:'[data-ktk-activity-booking-review] a[href*="/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
if(!production)for(const [slug,index,marker] of [['krakow-shooting-range',0,'activity-booking'],['krakow-shooting-range',1,'activity-booking'],['bachelor-party-organisers-krakow',0,'group-choice'],['krakow-stag-activities',0,'group-choice']])cases.push({path:'/'+slug+'/',selector:'[data-ktk-'+marker+'-review] a[href*="/shooting-range-34/"]',index,destination:'/staging/store2/shooting-range-34/',product:34});
const params={utm_source:'readiness-validation',utm_medium:'controlled-browser',utm_campaign:production?'production-link-handoff':'staging-link-handoff',gclid:'isolated-validation-click'};
if(!production)cases.push({path:'/krawl-through-krakow-winter-newsletter/',selector:'[data-ktk-story-review] a[href*="/pub-crawl-28/"]',destination:'/staging/store2/pub-crawl-28/',product:28});
const checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
let blockedWrites=0;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const item of cases){
  const context=await browser.newContext(),page=await context.newPage();
  await page.route('**/*',route=>{
   const request=route.request();
   if(!['GET','HEAD','OPTIONS'].includes(request.method())){blockedWrites++;return route.abort();}
   return request.url().startsWith(base)||request.url().includes('/ktk-homepage-assets/')||request.url().includes('/ktk-code-pages-assets/')?route.continue():route.abort();
  });
  const target=new URL(base+item.path);for(const [key,value]of Object.entries(params))target.searchParams.set(key,value);if(process.argv.includes('--cache-bust'))target.searchParams.set('ktk_attribution_check',String(Date.now()));
  await page.goto(target.href,{waitUntil:'load'});
  await page.evaluate(()=>{window.KTK_ANALYTICS_CONSENT=false;document.addEventListener('click',event=>event.preventDefault());});
  const anchor=page.locator(item.selector).nth(item.index||0);
  check(item.path+' expected booking control exists',await anchor.count()===1);
  await anchor.evaluate(a=>a.click());
  const href=new URL(await anchor.getAttribute('href'));
  check(item.path+' correct own destination',href.origin==='https://krawlthroughkrakow.com'&&href.pathname===item.destination&&href.hash==='#book',href.pathname);
  check(item.path+' attribution preserved',Object.entries(params).every(([key,value])=>href.searchParams.get(key)===value));
  check(item.path+' no legacy or QA-only visitor parameters',['u','flow','full-items','back','from-ssl','ktk_attribution_check'].every(key=>!href.searchParams.has(key)));
  check(item.path+' no navigation/submission',new URL(page.url()).pathname===prefix+item.path);
  if(item.product){
   check(item.path+' booking analytics withheld before consent',await page.evaluate(()=>!(window.dataLayer||[]).some(row=>row?.event==='ktk_page_booking_click')));
   await page.evaluate(()=>{window.KTK_ANALYTICS_CONSENT=true;});await anchor.evaluate(a=>a.click());
   check(item.path+' correct consented product event',await page.evaluate(id=>(window.dataLayer||[]).some(row=>row?.event==='ktk_page_booking_click'&&row.product_id===id),item.product));
  }
  if(item.homepage){
   const journey=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ktk-storefront-journey-events-v1')||'[]'));
   check(item.selector+' homepage journey withheld before consent',!(await journey()).some(row=>row.type==='homepage_button_clicked'));
   await page.evaluate(()=>{window.KTK_ANALYTICS_CONSENT=true;});await anchor.evaluate(a=>a.click());
   const clicks=(await journey()).filter(row=>row.type==='homepage_button_clicked');
   check(item.selector+' consented click keeps label and clean destination',clicks.length===1&&clicks[0].details.buttonLabel===await anchor.innerText()&&clicks[0].details.destination==='/staging/store2/pub-crawl-28/#book');
  }
  await context.close();
 }
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),passed:checks.filter(c=>c.pass).length,total:checks.length,blockedWrites,isolatedBrowserStorage:true,noNavigationOrOrders:true,checks};
await writeFile(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));
if(report.passed!==report.total)process.exitCode=1;
