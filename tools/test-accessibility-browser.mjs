import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const frontendRequire=createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json'));
const axeSource=await readFile(frontendRequire.resolve('axe-core/axe.min.js'),'utf8');
const [homeBase,pagesBase,output]=process.argv.slice(2);
const routes=process.argv.includes('--routes')?process.argv[process.argv.indexOf('--routes')+1].split(','):['/','/about-us/','/about-us/how-to-join/','/contact/','/faqs/','/gallery/','/blog/','/category/krakow-guides/','/new-years-eve-in-krakow/'];
if(routes.some(route=>!route.startsWith('/')||route.startsWith('//')||/[?#]/.test(route)))throw Error('Only explicit clean staging paths');
if(!homeBase||!pagesBase||!output)throw Error('Homepage, pages and fresh output directory required');
for(const base of [homeBase,pagesBase]){
 const url=new URL(base);
 if(!(url.origin==='https://krawlthroughkrakow.com'&&url.pathname.replace(/\/$/,'')==='/staging')&&!(url.protocol==='http:'&&url.hostname==='127.0.0.1'&&url.pathname==='/'))throw Error('Staging or explicit loopback previews only');
}
try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const report={checkedAt:new Date().toISOString(),scope:'Read-only own markup/keyboard/reflow checks, third parties and all non-read requests blocked before transmission. Not whole-site WCAG, browser zoom, CMP, screen-reader or commerce certification.',checks:[],errors:[],realMutations:0,blockedNonReadRequests:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const route of routes)for(const width of [320,390,768,1440]){
  const base=route==='/'?homeBase:pagesBase,url=new URL(base.replace(/\/$/,'')+route);
  if(process.argv.includes('--cache-bust'))url.searchParams.set('ktk_accessibility','20261113-'+Date.now());
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  try{
   await context.route('**/*',request=>{
    const req=request.request(),target=new URL(req.url());
    if(!['GET','HEAD'].includes(req.method())){report.blockedNonReadRequests.push({route,width,method:req.method(),origin:target.origin,path:target.pathname});return request.abort();}
    if(target.origin!==url.origin||/\/(?:quote|checkout|carts|orders)(?:\/|$)/.test(target.pathname))return request.abort();
    return request.continue();
   });
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{window.__KTK_FREEZE_CAROUSELS__=true;});
   const response=await page.goto(url.href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
   const name=route+' '+width;
   check(name+' HTTP200 and one main landmark',response.status()===200&&await page.getByRole('main').count()===1);
   check(name+' no horizontal overflow at narrow/reflow width',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.keyboard.press('Tab');
   check(name+' skip link is first keyboard control',await page.locator('.ktk-parity-skip-link').evaluate(e=>e===document.activeElement));
   await page.keyboard.press('Enter');
   check(name+' skip link moves focus into main',await page.locator('#main-content').evaluate(e=>e===document.activeElement));
   const toggle=page.locator('.mobile_menu_bar');
   if(await toggle.isVisible()){
    await toggle.focus();await page.keyboard.press('Space');check(name+' menu Space opens',await toggle.getAttribute('aria-expanded')==='true');
    await page.keyboard.press('Escape');check(name+' menu Escape restores focus',await toggle.getAttribute('aria-expanded')==='false'&&await toggle.evaluate(e=>e===document.activeElement));
   }
   if(route==='/faqs/'){
    const buttons=page.locator('.ktk-toggle-button');
    check(name+' FAQ headings contain native buttons and unique panel references',await buttons.count()===12&&await buttons.evaluateAll(nodes=>nodes.every(node=>node.type==='button'&&/^H[1-6]$/.test(node.parentElement.tagName)&&document.querySelectorAll('#'+CSS.escape(node.getAttribute('aria-controls'))).length===1)));
    const button=buttons.first(),before=await button.getAttribute('aria-expanded');
    await button.focus();await page.keyboard.press('Enter');check(name+' FAQ Enter changes once',await button.getAttribute('aria-expanded')!==before);
    await page.keyboard.press('Space');check(name+' FAQ Space reverses once',await button.getAttribute('aria-expanded')===before);
    check(name+' native button inherits original heading typography',await button.evaluate(node=>['fontFamily','fontSize','fontWeight','lineHeight','color','textAlign'].every(key=>getComputedStyle(node)[key]===getComputedStyle(node.parentElement)[key])));
   }
   const planning=page.locator('[data-ktk-contextual-links]');
   if(['/stagshens/','/bachelor-party-organisers-krakow/','/hen-do-ideas-abroad/','/krakow-hen-party-reviews/','/best-pub-crawls-in-europe/'].includes(route))check(name+' expected contextual block exists',await planning.count()===1);
   if(await planning.count()){
    check(name+' contextual links are visible native links within their paragraph',await planning.evaluate(p=>[...p.querySelectorAll('a[href]')].every(a=>{
     const r=a.getBoundingClientRect(),parent=p.getBoundingClientRect();return a.textContent.trim()&&r.width>0&&r.height>0&&r.left>=parent.left-1&&r.right<=parent.right+1;
    })));
    const anchor=planning.getByRole('link').first();await anchor.focus();
    check(name+' contextual planning link accepts native keyboard focus',await anchor.evaluate(a=>a===document.activeElement));
    if(process.argv.includes('--capture-context')&&[390,1440].includes(width))await planning.screenshot({path:path.join(output,route.replaceAll('/','')+'-'+width+'-planning.png')});
   }
   if(route==='/krakow-stag-do/'){
    const karting=page.getByRole('link',{name:/^book go-karting$/i});
    check(name+' repaired activity CTA reaches matching current product',await karting.count()===1&&await karting.getAttribute('data-ktk-booking-product')==='30'&&new URL(await karting.getAttribute('href')).pathname==='/staging/store2/go-karting-30/');
   }
   await page.addScriptTag({content:axeSource});
   const semantic=await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'rule',values:['aria-allowed-role','frame-title','image-alt','label','label-content-name-mismatch','landmark-one-main','landmark-no-duplicate-banner','landmark-unique','link-name']},iframes:false});return result.violations.map(row=>({id:row.id,targets:row.nodes.map(node=>node.target)}));});
   check(name+' reviewed semantic rules clear',!semantic.length,semantic);
   check(name+' no observed script errors',!errors.length,errors);
   check(name+' no attempted first-party booking or form writes',!report.blockedNonReadRequests.some(row=>row.route===route&&row.width===width&&row.origin===url.origin&&/\/(?:wp-admin\/admin-(?:post|ajax)\.php|wp-json\/ktk-storefront\/v1\/(?:cart|checkout|orders|ongoing-carts|saved-carts)(?:\/|$))/.test(row.path)));
   if(width===390&&['/','/faqs/','/contact/'].includes(route))await page.screenshot({path:path.join(output,(route==='/'?'home':route.replaceAll('/',''))+'-390.png')});
  }catch(error){report.errors.push({route,width,error:error.stack});}finally{await context.close();}
 }
}finally{
 await browser.close();report.passed=report.checks.filter(row=>row.pass).length;report.total=report.checks.length;
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,total:report.total,errors:report.errors,failed:report.checks.filter(row=>!row.pass)},null,2));
 if(report.errors.length||report.passed!==report.total||report.realMutations)process.exitCode=1;
}
