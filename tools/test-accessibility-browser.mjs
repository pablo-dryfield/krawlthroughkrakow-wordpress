import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {loadVenueEditorial} from './venue-editorial.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const frontendRequire=createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json'));
const axeSource=await readFile(frontendRequire.resolve('axe-core/axe.min.js'),'utf8');
const [homeBase,pagesBase,output]=process.argv.slice(2);
const venueRevisions=process.argv.includes('--capture-venues')?await loadVenueEditorial():[];
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
   if(process.argv.includes('--screenshots'))await page.screenshot({path:path.join(output,route.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')+'-'+width+'.png'),animations:'disabled'});
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
   if(route==='/wheres-the-cheap-places-to-drink-in-krakow/'&&process.argv.includes('--capture-budget')){
    const article=page.locator('.et_pb_text_0 [data-ktk-editorial-review="2026-11-13"]');
    const inspectTabClearance=node=>{
     const cta=document.getElementById('ktk-cta');if(!cta?.getClientRects().length)return {present:false,overlaps:[]};
     const box=cta.getBoundingClientRect(),walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),overlaps=[];let text;
     while((text=walker.nextNode())){if(!text.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(text);if([...range.getClientRects()].some(r=>r.width&&r.height&&r.right>box.left-2&&r.left<box.right+2&&r.bottom>box.top&&r.top<box.bottom))overlaps.push(text.textContent.trim().slice(0,80));}
     return {present:true,overlaps};
    };
    check(name+' one reviewed budget module rendered',await article.count()===1);
    check(name+' dated venue-price review is visible',await article.locator('time[datetime="2026-11-13"]').textContent()==='13 November 2026');
    const copy=await article.textContent();
    check(name+' checked serving sizes and price examples rendered together',copy.includes('400 ml, 11 PLN')&&copy.includes('290 ml, 25 PLN')&&copy.includes('210 ml for 36 PLN')&&copy.includes('250 ml for 34 PLN'));
    check(name+' one original identified venue photograph retained',await article.locator('img').count()===1&&/Bania Luka sign/.test(await article.locator('img').getAttribute('alt')));
    check(name+' nineteen meaningful fragment IDs are unique',await article.locator('[id]').evaluateAll(nodes=>nodes.length===19&&new Set(nodes.map(node=>node.id)).size===19));
    check(name+' historic venue anchor keeps its named topic',await article.locator('#pubpropagandaagrungyspotperfectforbudgetfriendlydrinks').textContent()==='Pub Propaganda');
    check(name+' reviewed description matches the refreshed guide',(await page.locator('meta[name="description"]').getAttribute('content')).includes('dated venue-menu examples'));
    await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
    const headerClearance=await page.locator('#main-content').evaluate(inspectTabClearance);
    check(name+' landing headline and metadata clear the visible floating tab',headerClearance.present&&!headerClearance.overlaps.length,headerClearance);
    if([390,1440].includes(width))await page.screenshot({path:path.join(output,'budget-'+width+'-landing.png')});
    check(name+' four native contents links resolve',await article.locator('a[href]').evaluateAll(nodes=>{
     const contents=nodes.filter(a=>{const u=new URL(a.href,location.href);return u.origin===location.origin&&u.pathname===location.pathname&&u.search===location.search&&u.hash;});
     return contents.length===4&&contents.every(a=>document.getElementById(new URL(a.href).hash.slice(1)));
    }));
    const first=article.getByRole('link',{name:'Places and checked menu examples',exact:true}),fragment=new URL(await first.getAttribute('href'),url).hash.slice(1);await first.focus();await page.keyboard.press('Enter');
    check(name+' contents Enter scrolls to its native target',await page.evaluate(id=>location.hash==='#'+id&&document.getElementById(id).getBoundingClientRect().top>=-2&&document.getElementById(id).getBoundingClientRect().top<innerHeight,fragment));
    const clearance=await article.evaluate(inspectTabClearance);
    check(name+' budget copy stays clear of the visible floating booking tab',clearance.present&&!clearance.overlaps.length,clearance);
    if([390,1440].includes(width)){
     await page.screenshot({path:path.join(output,'budget-'+width+'-examples.png')});
     await article.locator('#oldsmobil-cocktail-examples').scrollIntoViewIfNeeded();
     await page.screenshot({path:path.join(output,'budget-'+width+'-comparison.png')});
    }
   }
   const venue=venueRevisions.find(r=>route==='/'+r.key.slice(5)+'/');
   if(venue){
    const article=page.locator('[data-ktk-venue-review="2026-11-13.venues-1"]');
    for(const photo of await article.locator('img').all()){await photo.scrollIntoViewIfNeeded();await photo.evaluate(n=>n.decode());}
    const expected=await page.evaluate(r=>{
     const source=new DOMParser().parseFromString(r.sourceHtml,'text/html'),template=new DOMParser().parseFromString(r.markup,'text/html');
     return {publication:source.querySelector('#main-content .published').textContent.trim(),ids:[...template.querySelectorAll('[id]')].map(n=>n.id).sort(),photos:template.querySelectorAll('template').length,first:new URL(template.querySelector('a[href^="#"]').getAttribute('href'),'https://example.test/').hash};
    },venue);
    check(name+' one reviewed venue body with original publication',await article.count()===1&&await page.locator('.published').textContent()===expected.publication);
    check(name+' actual review date visible',await article.locator('time[datetime="2026-11-13"]').textContent()==='13 November 2026');
    check(name+' all meaningful fragments retained uniquely',JSON.stringify(await article.locator('[id]').evaluateAll(ns=>ns.map(n=>n.id).sort()))===JSON.stringify(expected.ids));
    check(name+' selected original images decode and have reviewed descriptions',await article.locator('img').count()===expected.photos&&await article.locator('img').evaluateAll(ns=>ns.every(n=>n.complete&&n.naturalWidth>0&&n.alt.trim())));
    check(name+' one named two-column comparison table',await article.locator('table caption').count()===1&&await article.locator('thead th[scope="col"]').count()===2&&await article.locator('tbody th[scope="row"]').count()>1);
    const geometry=await article.locator('table').evaluate(table=>{const r=table.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,overflow:table.scrollWidth>table.clientWidth+1};});
    check(name+' comparison table fits without horizontal scrolling',geometry.left>=0&&geometry.right<=width+1&&!geometry.overflow,geometry);
    check(name+' native current booking link retained',new URL(await article.getByRole('link',{name:'current Krakow pub-crawl inclusions',exact:true}).getAttribute('href'),url).pathname==='/staging/store2/pub-crawl-28/');
    const copy=await article.textContent();
    check(name+' no old fabricated guarantees or blanket accusations',!/the following artists will perform|Born in Krakow but based in Berlin|criminal-owned|dodgy establishments|historic Jewish ghetto|most clubs staying open until sunrise|has sparked quite a debate/.test(copy));
    const clearance=node=>{
     const cta=document.getElementById('ktk-cta');if(!cta?.getClientRects().length)return {present:false,overlaps:[]};
     const b=cta.getBoundingClientRect(),walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),overlaps=[];let text;
     while((text=walker.nextNode())){if(!text.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(text);if([...r.getClientRects()].some(t=>t.width&&t.height&&t.right>b.left-2&&t.left<b.right+2&&t.bottom>b.top&&t.top<b.bottom))overlaps.push(text.textContent.trim().slice(0,80));}
     return {present:true,overlaps};
    };
    await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
    const landing=await page.locator('#main-content').evaluate(clearance);check(name+' headline clears visible booking tab',landing.present&&!landing.overlaps.length,landing);
    if([390,1440].includes(width))await page.screenshot({path:path.join(output,venue.key+'-'+width+'-landing.png')});
    const first=article.locator('a[href]').filter({hasText:route==='/krakow-techno-clubs/'?'Compare the venue options':route==='/krakow-techno-clubs-2/'?'Start with a venue and date':route==='/irish-bars-krakow/'?'Compare three Irish pubs':route==='/krakow-nightclubs/'?'Choose the type of night':route==='/krakow-bars-jewish-quarter/'?'Choose the kind of evening':'Compare the bar options'}).first();
    await first.focus();await page.keyboard.press('Enter');
    check(name+' native contents Enter reaches original fragment',await page.evaluate(hash=>location.hash===hash&&document.getElementById(hash.slice(1)).getBoundingClientRect().top>=-2&&document.getElementById(hash.slice(1)).getBoundingClientRect().top<innerHeight,expected.first));
    const body=await article.evaluate(clearance);check(name+' body clears visible booking tab',body.present&&!body.overlaps.length,body);
    await article.locator('table').scrollIntoViewIfNeeded();
    const comparison=await article.evaluate(clearance);check(name+' comparison clears visible booking tab',comparison.present&&!comparison.overlaps.length,comparison);
    if([390,1440].includes(width))await page.screenshot({path:path.join(output,venue.key+'-'+width+'-comparison.png')});
   }
   if(['/jazz-bars-in-krakow/','/krakow-live-music/'].includes(route)&&process.argv.includes('--capture-music')){
    const jazz=route==='/jazz-bars-in-krakow/',kind=jazz?'jazz':'live-music';
    const article=page.locator('.entry-content[data-ktk-music-review="2026-11-13.music-1"]');
    check(name+' one reviewed music body rendered',await article.count()===1);
    check(name+' original publication and separate review date retained',await page.locator('.published').textContent()===(jazz?'Jul 18, 2023':'Jul 13, 2023')&&await article.locator('time[datetime="2026-11-13"]').textContent()==='13 November 2026');
    check(name+' meaningful section fragments remain unique',await article.locator('[id]').evaluateAll((nodes,count)=>nodes.length===count&&new Set(nodes.map(n=>n.id)).size===count,jazz?15:12));
    check(name+' one identifiable original photograph retained',await article.locator('img').count()===1&&(await article.locator('img').getAttribute('src')).includes(jazz?'3ba6b2583586-':'f7a107de5f06-')&&!!await article.locator('img').getAttribute('alt'));
    const copy=await article.textContent();
    check(name+' unsupported venue promises removed',jazz?copy.includes('not confirmed a current jazz programme')&&!/birthplace of Polish jazz|since the 1950s|over 30 years/i.test(copy):copy.includes('not being presented here as a specialist jazz club')&&copy.includes('Some site material is historical')&&!/since 1991|twin bars|hidden gem tucked/i.test(copy));
    const sources=jazz?['https://alchemia.com.pl/program/','https://www.thepianorouge.com.pl/en/home-page/']:['https://cafe.hardrock.com/krakow/event-calendar.aspx','https://piwnicapodbaranami.pl/nowo%C5%9Bci','https://fortykleparz.pl/music-club/'];
    check(name+' reviewed primary programme links rendered',await article.locator('a[href]').evaluateAll((nodes,urls)=>urls.every(url=>nodes.some(a=>a.getAttribute('href')===url)),sources));
    check(name+' native current booking destination retained',new URL(await article.getByRole('link',{name:'current Krakow pub-crawl inclusions',exact:true}).getAttribute('href'),url).pathname==='/staging/store2/pub-crawl-28/');
    check(name+' native contents links resolve uniquely',await article.locator('a[href]').evaluateAll((nodes,count)=>{
     const links=nodes.filter(a=>{const u=new URL(a.href,location.href);return u.origin===location.origin&&u.pathname===location.pathname&&u.search===location.search&&u.hash;});
     return links.length===count&&links.every(a=>document.querySelectorAll('[id="'+new URL(a.href).hash.slice(1)+'"]').length===1);
    },jazz?5:6));
    const clearance=node=>{
     const cta=document.getElementById('ktk-cta');if(!cta?.getClientRects().length)return {present:false,overlaps:[]};
     const box=cta.getBoundingClientRect(),walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),overlaps=[];let text;
     while((text=walker.nextNode())){if(!text.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(text);if([...r.getClientRects()].some(t=>t.width&&t.height&&t.right>box.left-2&&t.left<box.right+2&&t.bottom>box.top&&t.top<box.bottom))overlaps.push(text.textContent.trim().slice(0,80));}
     return {present:true,overlaps};
    };
    await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
    const landing=await page.locator('#main-content').evaluate(clearance);check(name+' headline clears visible booking tab',landing.present&&!landing.overlaps.length,landing);
    if([390,1440].includes(width))await page.screenshot({path:path.join(output,kind+'-'+width+'-landing.png')});
    const id=jazz?'legendaryjazzbarsinkrakow':'hardrockcafeaglobalbrandwithanimpressivelineupoflivejazzperformances';
    const contents=article.locator('a[href]').filter({hasText:jazz?'Harris':'Hard Rock'}).first();
    await contents.focus();await page.keyboard.press('Enter');
    check(name+' contents Enter retains native original fragment',await page.evaluate(id=>location.hash==='#'+id&&document.getElementById(id).getBoundingClientRect().top>=-2&&document.getElementById(id).getBoundingClientRect().top<innerHeight,id));
    const body=await article.evaluate(clearance);check(name+' body clears visible booking tab',body.present&&!body.overlaps.length,body);
    if([390,1440].includes(width))await page.screenshot({path:path.join(output,kind+'-'+width+'-choices.png')});
   }
   if(route==='/jazz-bars-in-krakow/'&&process.argv.includes('--capture-jazz')){
    const article=page.locator('#post-6169>.entry-content'),notice=article.locator('[data-ktk-jazz-review="2026-11-13"]');
    check(name+' one scoped venue-check notice is visible',await notice.count()===1&&await notice.isVisible()&&(await notice.textContent()).includes('Harris, PIEC Art and U Muniaka'));
    check(name+' original publication and separate check date retained',await page.locator('.published').textContent()==='Jul 18, 2023'&&await notice.locator('time').getAttribute('datetime')==='2026-11-13');
    const copy=await article.textContent();
    check(name+' unsupported jazz-origin and 1950s claims removed',!/birthplace of Polish jazz|since the 1950s/i.test(copy)&&copy.includes('January 1997'));
    check(name+' original fifteen section IDs are unique',await article.locator('[id]').evaluateAll(nodes=>nodes.length===15&&new Set(nodes.map(n=>n.id)).size===15));
    check(name+' original six inline photos retained',await article.locator('img').count()===6);
    check(name+' primary programme and reservation links rendered',await article.locator('a[href]').evaluateAll(nodes=>['https://harris.krakow.pl/o-nas/','https://www.piecart.pl/?lang=pl','https://jazzumuniaka.club/','https://jazzumuniaka.club/regulamin/'].every(href=>nodes.some(a=>a.getAttribute('href')===href))));
    check(name+' matching product handoff is native',new URL(await article.getByRole('link',{name:'current Krakow pub-crawl inclusions',exact:true}).getAttribute('href'),url).pathname==='/staging/store2/pub-crawl-28/');
    const clearance=node=>{
     const cta=document.getElementById('ktk-cta');if(!cta?.getClientRects().length)return {present:false,overlaps:[]};
     const box=cta.getBoundingClientRect(),walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),overlaps=[];let text;
     while((text=walker.nextNode())){if(!text.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(text);if([...r.getClientRects()].some(t=>t.width&&t.height&&t.right>box.left-2&&t.left<box.right+2&&t.bottom>box.top&&t.top<box.bottom))overlaps.push(text.textContent.trim().slice(0,80));}
     return {present:true,overlaps};
    };
    await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
    const landing=await page.locator('#main-content').evaluate(clearance);check(name+' jazz headline clears visible floating tab',landing.present&&!landing.overlaps.length,landing);
    if([390,1440].includes(width))await page.screenshot({path:path.join(output,'jazz-'+width+'-landing.png')});
    const contents=article.getByRole('link',{name:'Harris Piano Jazz Bar: live music on the Main Square',exact:true});
    await contents.focus();await page.keyboard.press('Enter');
    check(name+' updated contents text keeps original native fragment',await page.evaluate(()=>location.hash==='#harrispianojazzbarthebirthplaceofpolishjazz'&&document.getElementById('harrispianojazzbarthebirthplaceofpolishjazz').getBoundingClientRect().top<innerHeight));
    const body=await article.evaluate(clearance);check(name+' jazz body clears visible floating tab',body.present&&!body.overlaps.length,body);
    if([390,1440].includes(width))await page.screenshot({path:path.join(output,'jazz-'+width+'-harris.png')});
   }
   if(route==='/2020-krakow-nightlife-guide/'&&process.argv.includes('--capture-editorial')){
    const notice=page.locator('[data-ktk-historical-notice="nightlife-2020"]');
    check(name+' one visible archive notice is inside the original introduction',await notice.count()===1&&await notice.isVisible()&&await notice.evaluate(n=>n.parentElement.matches('.et_pb_text_0 .et_pb_text_inner')));
    check(name+' original archive publication day retained',await page.locator('.post-meta .published').textContent()==='Apr 5, 2020');
    check(name+' archive notice has native link to the current overview',await notice.getByRole('link',{name:'current Krakow nightlife overview'}).getAttribute('href')==='https://krawlthroughkrakow.com/staging/krakow-nightlife/');
    if([390,1440].includes(width))await notice.screenshot({path:path.join(output,'nightlife-'+width+'-archive-notice.png')});
   }
   if(route==='/krakow-nightlife/'&&process.argv.includes('--capture-editorial')){
    const reviewed=page.locator('[data-ktk-editorial-review="2026-11-13"]');
    check(name+' all nine reviewed overview modules rendered',await reviewed.count()===9);
    check(name+' reviewed overview headline rendered',await page.locator('h1').textContent()==='Krakow nightlife: where to go after dark');
    check(name+' visible review date retained',await page.locator('time[datetime="2026-11-13"]').textContent()==='13 November 2026');
    const copy=await page.locator('#main-content').textContent();
    check(name+' owner-confirmed venue streets retained',copy.includes('Frantic at S\u0142awkowska 6a')&&copy.includes('Aura on Szpitalna')&&!copy.includes('Miodowa'));
    check(name+' unsupported old promises absent',!/highest concentration|five years running|guarantee you|hefty fines|priciest options/i.test(copy));
    check(name+' overview links have names and fit their module',await reviewed.evaluateAll(nodes=>nodes.flatMap(n=>[...n.querySelectorAll('a')]).every(a=>{
     const r=a.getBoundingClientRect(),p=a.closest('[data-ktk-editorial-review]').getBoundingClientRect();return a.textContent.trim()&&r.width>0&&r.left>=p.left-1&&r.right<=p.right+1;
    })));
    if([390,1440].includes(width)){
     await page.locator('.et_pb_text_0').screenshot({path:path.join(output,'nightlife-'+width+'-headline.png')});
     await page.locator('.et_pb_text_4').screenshot({path:path.join(output,'nightlife-'+width+'-shortlist.png')});
    }
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
