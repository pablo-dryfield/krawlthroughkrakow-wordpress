import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {reviseAccessibilitySemantics} from './accessibility-semantics.mjs';
import {composeCodePage} from './code-page-template.mjs';
import {loadReviewedImageDescriptions} from './content-image-descriptions.mjs';
import {reviseContextualLinks} from './contextual-links.mjs';
import {rewriteCanonicalLinks} from './canonical-links.mjs';
import {loadNightlifeEditorial,reviseNightlifeEditorial} from './nightlife-editorial.mjs';
import {loadBudgetEditorial,reviseBudgetEditorial} from './budget-editorial.mjs';
import {loadJazzEditorial,reviseJazzEditorial} from './jazz-editorial.mjs';
import {loadMusicEditorial,reviseMusicEditorial} from './music-editorial.mjs';
import {loadVenueEditorial,reviseVenueEditorial} from './venue-editorial.mjs';
import {codePageDescription} from './code-pages-seo.mjs';
import {codePageTitle,codePageHeadDescription,loadSharingImagePolicy,buildCodePageSharing} from './code-page-sharing.mjs';
import {codePageSchemaFacts} from './code-pages-schema.mjs';
import {loadOfferPageRevisions,reviseOfferPages} from './offer-pages-editorial.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [baseline,output]=process.argv.slice(2);
const contextual=process.argv.includes('--contextual');
const nightlife=process.argv.includes('--nightlife');
const budget=process.argv.includes('--budget');
const jazz=process.argv.includes('--jazz');
const music=process.argv.includes('--music');
const venues=process.argv.includes('--venues');
const sharing=process.argv.includes('--sharing');
const offerPages=process.argv.includes('--offer-pages');
if(!baseline||!output)throw Error('Baseline worktree and fresh report required');
try{await readFile(output);throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const assets='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const definitions=root=>JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);$a=$argv[1];$r=require $a.'registry.php';$o=array();foreach($r['routes'] as $e){$p=require $a.$e['file'];$o[$p['key']]=$p;}echo json_encode($o);",path.join(root,assets)],{encoding:'utf8',maxBuffer:10e6}));
const before=definitions(baseline),after=definitions('.');
const imageDescriptions=await loadReviewedImageDescriptions();
const sharingImage=sharing?await loadSharingImagePolicy({expectedManifestSha256:imageDescriptions.assetManifestSha256}):null;
const nightlifeRevision=nightlife?await loadNightlifeEditorial():null;
const budgetRevision=budget?await loadBudgetEditorial():null;
const jazzRevision=jazz?await loadJazzEditorial():null;
const musicRevisions=music?await loadMusicEditorial():[];
const venueRevisions=venues?await loadVenueEditorial():[];
const offerPageRevisions=offerPages?await loadOfferPageRevisions():[];
const checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.route('**/*',route=>route.abort());
 for(const [key,definition] of Object.entries(after)){
  const previous=before[key];
  const markup=async(root,definition)=>composeCodePage(await readFile(path.join(root,assets,definition.shell_file),'utf8'),await readFile(path.join(root,assets,definition.main_file),'utf8'));
  const original=await markup(baseline,previous),candidate=await markup('.',definition);
  await page.setContent(original);await page.evaluate(reviseAccessibilitySemantics,{key,imageDescriptions});
  if(offerPages)await page.evaluate(reviseOfferPages,{key,revision:offerPageRevisions.find(row=>row.key===key)});
  if(nightlife)await page.evaluate(reviseNightlifeEditorial,{key,revision:nightlifeRevision});
  if(budget)await page.evaluate(reviseBudgetEditorial,{key,revision:budgetRevision});
  if(jazz)await page.evaluate(reviseJazzEditorial,{key,revision:jazzRevision});
  if(music)await page.evaluate(reviseMusicEditorial,{key,revision:musicRevisions.find(row=>row.key===key)});
  if(venues)await page.evaluate(reviseVenueEditorial,{key,revision:venueRevisions.find(row=>row.key===key)});
  if(contextual){await page.evaluate(reviseContextualLinks,{key});await rewriteCanonicalLinks(page);}
  const expected=await page.evaluate(()=>document.body.innerHTML);
  await page.setContent(candidate);
  check(key+' only reviewed semantic/contextual/editorial revisions changed',expected===await page.evaluate(()=>document.body.innerHTML));
  const metadata=({shell_file,...rest})=>rest;
  const expectedMetadata=structuredClone(metadata(previous));
  if(nightlife&&key==='krakow-nightlife'){
   const name='Krakow nightlife: where to go after dark';
   const graph=expectedMetadata.schema.at(-1)['@graph'];
   const webpage=graph.filter(x=>x['@type']==='WebPage'),crumbs=graph.filter(x=>x['@type']==='BreadcrumbList');
   if(webpage.length!==1||crumbs.length!==1)throw Error('Expected existing hub page/breadcrumb schema');
   webpage[0].name=name;crumbs[0].itemListElement.at(-1).name=name;
  }
  if(budget&&key===budgetRevision.key){
   const description=codePageDescription(previous.route,previous.description);
   expectedMetadata.description=description;
   const graph=expectedMetadata.schema.at(-1)['@graph'];
   const descriptions=graph.filter(x=>['WebPage','BlogPosting'].includes(x['@type']));
   if(descriptions.length!==2||descriptions.some(x=>x.description!==previous.description))throw Error('Expected existing budget page/article descriptions');
   descriptions.forEach(x=>x.description=description);
  }
  if(sharing){
   expectedMetadata.title=codePageTitle(previous.route,previous.title);
   expectedMetadata.description=codePageHeadDescription(previous.route,previous.description);
   const facts=await page.evaluate(codePageSchemaFacts);
   const graph=expectedMetadata.schema.flatMap(item=>item['@graph']||[item]);
   if(expectedMetadata.description!==previous.description)for(const entity of graph)if(entity.description===previous.description)entity.description=expectedMetadata.description;
   const hasImage=graph.some(entity=>entity['@type']==='BlogPosting'&&entity.image);
   expectedMetadata.metadata=buildCodePageSharing({route:previous.route,kind:previous.kind,title:expectedMetadata.title,description:expectedMetadata.description,inherited:previous.metadata,image:hasImage?await sharingImage(facts.image):null});
  }
  check(key+' SEO/schema/content identity unchanged except explicit reviewed headline/description policy',JSON.stringify(expectedMetadata)===JSON.stringify(metadata(definition)));
  check(key+' captured CSS unchanged',(await readFile(path.join(baseline,assets,previous.css))).equals(await readFile(assets+definition.css)));
  if(key==='post-hostel-hangover-cure')check('health article body remains byte-identical',(await readFile(path.join(baseline,assets,previous.main_file))).equals(await readFile(assets+definition.main_file)));
 }
 const fixture='<div id="main-content"><h1>Questions</h1><div class="et_pb_accordion">'+[0,1].map(n=>`<div class="et_pb_toggle et_pb_toggle_close"><h2 class="et_pb_toggle_title">Question ${n+1}</h2><div class="et_pb_toggle_content">Answer ${n+1}</div></div>`).join('')+'</div><form><span class="et_pb_contact_captcha_question">4 + 7</span><input class="et_pb_contact_captcha" name="captcha"></form></div><footer><span class="et-social-icon"><a class="icon" href="#facebook"><span>Facebook</span></a></span></footer>';
 await page.setContent(fixture);await page.evaluate(reviseAccessibilitySemantics,{key:'fixture'});
 const once=await page.content();await page.evaluate(reviseAccessibilitySemantics,{key:'fixture'});
 check('semantic revision is idempotent',once===await page.content());
 const error=await page.evaluate(reviseAccessibilitySemantics,{key:'post-hostel-hangover-cure'});
 check('health hold performs no revisions',!error.length&&once===await page.content());
 await page.addStyleTag({content:await readFile(assets+'runtime.css','utf8')});
 await page.addScriptTag({content:await readFile(assets+'runtime.js','utf8')});
 const first=page.locator('.ktk-toggle-button').nth(0),second=page.locator('.ktk-toggle-button').nth(1);
 check('FAQ native buttons preserve heading semantics',await page.locator('h2 > button[type="button"]').count()===2&&await page.locator('h2[role="button"]').count()===0);
 await first.focus();await page.keyboard.press('Enter');
 check('FAQ Enter opens once',await first.getAttribute('aria-expanded')==='true'&&await page.locator('#'+await first.getAttribute('aria-controls')).isVisible());
 await page.keyboard.press('Space');check('FAQ Space closes once',await first.getAttribute('aria-expanded')==='false');
 await page.keyboard.press('Enter');await second.focus();await page.keyboard.press('Space');
 check('accordion closes sibling and updates both buttons',await first.getAttribute('aria-expanded')==='false'&&await second.getAttribute('aria-expanded')==='true');
 await page.locator('.et_pb_toggle_title').first().click({position:{x:1,y:1}});
 check('heading/pseudo-icon pointer path still opens',await first.getAttribute('aria-expanded')==='true'&&await second.getAttribute('aria-expanded')==='false');
 check('captcha accessible name follows refreshed question',await page.locator('input').getAttribute('aria-labelledby')==='ktk-captcha-question-0');
 await page.locator('#ktk-captcha-question-0').evaluate(e=>e.textContent='8 + 2');
 check('captcha label uses live question rather than fixed answer',await page.getByRole('textbox',{name:'8 + 2'}).count()===1);
 check('footer social link has source-derived accessible name',await page.getByRole('link',{name:'Facebook',exact:true}).count()===1);
 const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(node=>node.id));
 check('unique generated control and label IDs',ids.length===new Set(ids).size);
 await page.setContent('<main id="main-content"></main><a id="ktk-cta" href="/store2/">BOOK NOW</a>');
 await page.evaluate(reviseAccessibilitySemantics,{key:'fixture'});
 check('floating CTA has a named native landmark',await page.getByRole('navigation',{name:'Book an experience'}).getByRole('link',{name:'BOOK NOW'}).count()===1);
 const landmark=await page.content();await page.evaluate(reviseAccessibilitySemantics,{key:'fixture'});
 check('floating CTA landmark is idempotent',landmark===await page.content());
 await page.setContent('<main id="main-content">Held article</main><a id="ktk-cta" href="/store2/">BOOK NOW</a>');
 await page.evaluate(reviseAccessibilitySemantics,{key:'post-hostel-hangover-cure'});
 check('health hold allows shared shell landmark without changing the article',await page.locator('main').innerHTML()==='Held article'&&await page.locator('main').getAttribute('tabindex')===null&&await page.getByRole('navigation',{name:'Book an experience'}).count()===1);
 const imageFixture='<div id="main-content"><a href="/full.jpg"><img src="/missing.jpg"></a><img src="/decorative.jpg" alt=""><img src="/kept.jpg" alt="Existing description"><img src="/linked.jpg" alt=""><img src="toString"></div>';
 const review={missing:{'/missing.jpg':'A reviewed photograph.','/kept.jpg':'Must not replace existing text.'},empty:{'/linked.jpg':'An explicitly reviewed linked photo.'}};
 await page.setContent(imageFixture);await page.evaluate(reviseAccessibilitySemantics,{key:'fixture',imageDescriptions:review});
 check('missing informative alt uses reviewed text',await page.locator('img').nth(0).getAttribute('alt')==='A reviewed photograph.');
 check('unreviewed decorative empty alt remains empty',await page.locator('img').nth(1).getAttribute('alt')==='');
 check('existing informative alt remains unchanged',await page.locator('img').nth(2).getAttribute('alt')==='Existing description');
 check('only explicit empty-alt review may override empty alt',await page.locator('img').nth(3).getAttribute('alt')==='An explicitly reviewed linked photo.');
 check('inherited object keys cannot become image descriptions',await page.locator('img').nth(4).getAttribute('alt')===null);
 check('full-size link gets meaningful reviewed accessible name',await page.getByRole('link',{name:'View full-size photo: A reviewed photograph.'}).count()===1);
 const reviewedOnce=await page.content();await page.evaluate(reviseAccessibilitySemantics,{key:'fixture',imageDescriptions:review});
 check('reviewed descriptions and link names are idempotent',reviewedOnce===await page.content());
 await page.setContent(imageFixture);const held=await page.locator('#main-content').innerHTML();
 await page.evaluate(reviseAccessibilitySemantics,{key:'post-hostel-hangover-cure',imageDescriptions:review});
 check('medical hold prevents reviewed image and link revisions',held===await page.locator('#main-content').innerHTML());
 if(budget){
  const original=await readFile(path.join(baseline,assets,'content/'+budgetRevision.key+'.html'),'utf8');
  await page.setContent(original);
  const headline=await page.locator('h1').innerHTML(),publication=await page.locator('.post-meta').innerHTML();
  const originalFragments=await page.locator('.et_pb_text_0 h2[id],.et_pb_text_0 h3[id],.et_pb_text_0 h4[id]').evaluateAll(nodes=>nodes.map(node=>node.id).sort());
  const photograph=await page.locator('.et_pb_text_0 img').nth(4).evaluate(node=>node.outerHTML);
  const changes=await page.evaluate(reviseBudgetEditorial,{key:budgetRevision.key,revision:budgetRevision});
  check('budget revision changes only the reviewed module',changes.length===1&&changes[0].retainedOriginalPhotos.join(',')==='4'&&changes[0].removedBodyPhotos===8);
  check('budget H1 and publication/byline remain exact',headline===await page.locator('h1').innerHTML()&&publication===await page.locator('.post-meta').innerHTML());
  const candidateFragments=await page.locator('.et_pb_text_0 [id]').evaluateAll(nodes=>nodes.map(node=>node.id));
  check('all sixteen meaningful heading fragments survive once with three reviewed new anchors',originalFragments.length===16&&originalFragments.every(id=>candidateFragments.filter(value=>value===id).length===1)&&candidateFragments.length===19&&new Set(candidateFragments).size===19);
  check('old Pub Propaganda anchor keeps its topic instead of becoming a different venue',await page.locator('#pubpropagandaagrungyspotperfectforbudgetfriendlydrinks').textContent()==='Pub Propaganda');
  check('new Oldsmobil section has its own meaningful anchor',await page.locator('#oldsmobil-cocktail-examples').textContent()==='Oldsmobil: a different cocktail comparison');
  check('only the exact identifiable original Banialuka photograph remains in the module',await page.locator('.et_pb_text_0 img').count()===1&&photograph===await page.locator('.et_pb_text_0 img').evaluate(node=>node.outerHTML));
  const copy=await page.locator('.et_pb_text_0').textContent();
  check('checked venue menu examples retain named serving sizes and prices',copy.includes('400 ml, 11 PLN')&&copy.includes('290 ml, 25 PLN')&&copy.includes('500 ml, 7 PLN')&&copy.includes('Aperol Spritz at 210 ml for 36 PLN')&&copy.includes('Blue Lagoon at 250 ml for 34 PLN'));
  check('price examples show an actual check date and no effective-date guarantee',await page.locator('time[datetime="2026-11-13"]').textContent()==='13 November 2026'&&copy.includes('menus do not display an effective date'));
  check('unsupported old shot, milk-bar and always-open promises removed',!/flavoured shots at just 7zl|expanded their menus to include inexpensive alcoholic|10 a\.m\. until 6 a\.m\.|very low prices/i.test(copy));
  check('new menu-source links are native and named',await page.getByRole('link',{name:'published menu',exact:true}).getAttribute('href')==='https://banialuka.com/index.php/menu/'&&await page.getByRole('link',{name:'own menu page',exact:true}).getAttribute('href')==='https://oldsmobilpub.pl/menu/');
  check('all four native contents links resolve in this article',await page.locator('.et_pb_text_0 a[href^="#"]').evaluateAll(nodes=>nodes.length===4&&nodes.every(node=>document.querySelectorAll('[id="'+node.getAttribute('href').slice(1)+'"]').length===1)));
  const once=await page.content();
  check('budget revision is idempotent',(await page.evaluate(reviseBudgetEditorial,{key:budgetRevision.key,revision:budgetRevision})).length===0&&once===await page.content());
  for(const [name,markup] of [
   ['script',budgetRevision.markup+'<script>alert(1)</script>'],
   ['event attribute',budgetRevision.markup.replace('<p>For cheap','<p onclick="alert(1)">For cheap')],
   ['foreign link',budgetRevision.markup.replace('https://oldsmobilpub.pl/menu/','https://example.invalid/')],
   ['new remote image',budgetRevision.markup+'<img src="https://example.invalid/photo.jpg">'],
   ['wrong original photo',budgetRevision.markup.replace('data-ktk-original-photo="4"','data-ktk-original-photo="3"')],
   ['lost original fragment',budgetRevision.markup.replace('id="conclusion"','id="changed"')],
   ['duplicate fragment',budgetRevision.markup+'<p id="conclusion">Duplicate</p>']
  ]){
   await page.setContent(original);const before=await page.content();let rejected=false;
   try{await page.evaluate(reviseBudgetEditorial,{key:budgetRevision.key,revision:{...budgetRevision,markup}});}catch{rejected=true;}
   check('budget '+name+' rejects atomically',rejected&&before===await page.content());
  }
  await page.setContent(original);await page.locator('.et_pb_text_0 img').nth(4).evaluate(node=>node.src='https://example.invalid/wrong.jpg');
  const changedPhoto=await page.content();let rejected=false;
  try{await page.evaluate(reviseBudgetEditorial,{key:budgetRevision.key,revision:budgetRevision});}catch{rejected=true;}
  check('changed original photo identity rejects without deleting other content',rejected&&changedPhoto===await page.content());
  await page.setContent(original);const held=await page.content();
  check('budget policy leaves medical and unrelated content untouched',(await page.evaluate(reviseBudgetEditorial,{key:'post-hostel-hangover-cure',revision:budgetRevision})).length===0&&held===await page.content());
 }
 if(nightlife){
  const original=await readFile(path.join(baseline,assets,'content/krakow-nightlife.html'),'utf8');
  await page.setContent(original);
  const media=await page.locator('img,iframe,video').evaluateAll(nodes=>nodes.map(n=>n.outerHTML));
  const forms=await page.locator('form').evaluateAll(nodes=>nodes.map(n=>n.outerHTML));
  const changes=await page.evaluate(reviseNightlifeEditorial,{key:'krakow-nightlife',revision:nightlifeRevision});
  check('hub revision changes exactly the nine reviewed text modules',changes.length===9);
  check('hub keeps original photos and embed contracts exact',JSON.stringify(media)===JSON.stringify(await page.locator('img,iframe,video').evaluateAll(nodes=>nodes.map(n=>n.outerHTML))));
  check('hub keeps original enquiry forms exact',JSON.stringify(forms)===JSON.stringify(await page.locator('form').evaluateAll(nodes=>nodes.map(n=>n.outerHTML))));
  check('hub has the reviewed primary headline',await page.locator('h1').count()===1&&await page.locator('h1').textContent()==='Krakow nightlife: where to go after dark');
  check('review date is visible and machine-readable',await page.locator('time[datetime="2026-11-13"]').textContent()==='13 November 2026');
  const text=await page.locator('#main-content').textContent();
  const venues=['Banialuka','Chicas & Gorillas','Albo Tak Cafe','Bubble Toast','Frantic','RIN','Prozak 2.0','La Bodega Del Ron','Chicago','Aura','Space','Soho','Guapo',"N'Joy",'Oldsmobil','COCO'];
  check('all sixteen owner-recommended venues are present',venues.every(name=>text.includes(name)));
  check('Frantic uses the owner-confirmed current street',text.includes('Frantic at S\u0142awkowska 6a')&&!text.includes('Szewska 5'));
  check('Aura uses the owner-confirmed street, not the unrelated venue',text.includes('Aura on Szpitalna')&&!text.includes('Miodowa'));
  check('unsupported density, awards, blame and legal absolutes are removed',!/highest concentration|five years running|guarantee you|hefty fines|priciest options/i.test(text));
  check('new contextual booking link has the current native destination',await page.getByRole('link',{name:'A guided Krakow pub crawl:'}).getAttribute('href')==='__KTK_HOME_URL__store2/pub-crawl-28/#book');
  const once=await page.content();
  check('reviewed hub revision is idempotent',(await page.evaluate(reviseNightlifeEditorial,{key:'krakow-nightlife',revision:nightlifeRevision})).length===0&&once===await page.content());
  for(const [name,mutate] of [
   ['extra template',r=>r.markup+='<template data-target=".other">Extra</template>'],
   ['changed target',r=>r.markup.replace('.et_pb_text_8 .et_pb_text_inner','.et_pb_text_9 .et_pb_text_inner')],
   ['changed late source',r=>r.markup.replace('data-source-prefix="Navigating Krakow"','data-source-prefix="Not the original source"')],
   ['script',r=>r.markup.replace('<p>A good night','<script>alert(1)</script><p>A good night')],
   ['event attribute',r=>r.markup.replace('<p>A good night','<p onclick="alert(1)">A good night')],
   ['foreign link',r=>r.markup.replace('https://cococlub.pl/en/','https://example.invalid/')]
  ]){
   await page.setContent(original);const before=await page.content();let rejected=false;
   try{await page.evaluate(reviseNightlifeEditorial,{key:'krakow-nightlife',revision:{...nightlifeRevision,markup:mutate(nightlifeRevision)}});}catch{rejected=true;}
   check(name+' rejects atomically without changing earlier modules',rejected&&before===await page.content());
  }
  await page.setContent(original);await page.locator('.et_pb_text_8 .et_pb_text_inner').evaluate(n=>n.append(document.createElement('img')));
  const unexpectedMedia=await page.content();let rejected=false;
  try{await page.evaluate(reviseNightlifeEditorial,{key:'krakow-nightlife',revision:nightlifeRevision});}catch{rejected=true;}
  check('unexpected original media rejects instead of deleting it',rejected&&unexpectedMedia===await page.content());
  await page.setContent(original);const held=await page.content();
  check('editorial revision leaves medical and unrelated keys alone',(await page.evaluate(reviseNightlifeEditorial,{key:'post-hostel-hangover-cure',revision:nightlifeRevision})).length===0&&held===await page.content());
  const archive=await readFile(path.join(baseline,assets,'content/post-2020-krakow-nightlife-guide.html'),'utf8');
  await page.setContent(archive);const article=await page.locator('.entry-content').innerHTML(),meta=await page.locator('.post-meta').innerHTML();
  check('dated article receives only one native historical notice',(await page.evaluate(reviseNightlifeEditorial,{key:'post-2020-krakow-nightlife-guide'})).length===1&&await page.locator('[data-ktk-historical-notice]').count()===1);
  check('historical notice links to the current hub',await page.getByRole('link',{name:'current Krakow nightlife overview'}).getAttribute('href')==='__KTK_HOME_URL__krakow-nightlife/');
  check('historical article and publication metadata stay exact',article===await page.locator('.entry-content').evaluate(n=>{const copy=n.cloneNode(true);copy.querySelector('[data-ktk-historical-notice]').remove();return copy.innerHTML;})&&meta===await page.locator('.post-meta').innerHTML());
  const onceArchived=await page.content();
  check('archive notice is idempotent',(await page.evaluate(reviseNightlifeEditorial,{key:'post-2020-krakow-nightlife-guide'})).length===0&&onceArchived===await page.content());
  await page.locator('.post-meta .published').evaluate(n=>n.textContent='Apr 5, 2026');let changedDateRejected=false;
  try{await page.evaluate(reviseNightlifeEditorial,{key:'post-2020-krakow-nightlife-guide'});}catch{changedDateRejected=true;}
  check('changed archive publication identity rejects the notice',changedDateRejected);
 }
 if(contextual){
  const body=async directory=>{
   const source=await readFile(path.join(directory,'staging/wp-content/mu-plugins/ktk-homepage-assets/parity-seasonal-content.php'),'utf8');
   const match=source.match(/\$html = <<<'([^']+)'\r?\n([\s\S]*?)\r?\n\1;/);
   if(!match)throw Error('Expected generated homepage nowdoc');return match[2];
  };
  await page.setContent(await body(baseline));await page.evaluate(reviseAccessibilitySemantics,{key:'homepage'});await rewriteCanonicalLinks(page);
  const expectedHome=await page.evaluate(()=>document.body.innerHTML);await page.setContent(await body('.'));
  check('homepage differs only by generated photo names and canonical booking link',expectedHome===await page.evaluate(()=>document.body.innerHTML));
  check('homepage captured style bytes remain exact',(await readFile(path.join(baseline,'staging/wp-content/mu-plugins/ktk-homepage-assets/parity.css'))).equals(await readFile('staging/wp-content/mu-plugins/ktk-homepage-assets/parity.css')));
  await page.setContent('<div id="main-content"><div class="et_pb_text_1"><div class="et_pb_text_inner"><p>KTK has been organizing events for groups.</p></div></div></div>');
  await page.evaluate(reviseContextualLinks,{key:'stagshens'});
  check('group links are native, named and environment-portable',await page.getByRole('link',{name:'stag do in Krakow'}).getAttribute('href')==='__KTK_HOME_URL__krakow-stag-do/'&&await page.getByRole('link',{name:'hen party in Krakow'}).getAttribute('href')==='__KTK_HOME_URL__krakow-hen-do/');
  const once=await page.content();await page.evaluate(reviseContextualLinks,{key:'stagshens'});
  check('contextual additions are idempotent',once===await page.content());
  await page.getByRole('link',{name:'stag do in Krakow'}).evaluate(a=>a.setAttribute('href','/unexpected/'));
  let rejected=false;try{await page.evaluate(reviseContextualLinks,{key:'stagshens'});}catch{rejected=true;}
  check('changed reviewed destinations reject rather than silently duplicating',rejected);
  await page.setContent('<div id="main-content"><p>Changed source.</p></div>');
  rejected=false;try{await page.evaluate(reviseContextualLinks,{key:'stagshens'});}catch{rejected=true;}
  check('missing reviewed source rejects',rejected);
  const before=await page.content();await page.evaluate(reviseContextualLinks,{key:'post-hostel-hangover-cure'});
  check('contextual revision preserves medical hold',before===await page.content());
  await page.setContent('<div id="main-content"><div class="et_pb_row"><h2>Krakow Go-Karting</h2><a class="et_pb_button_16" href="">Book Tour</a></div></div>');
  await page.evaluate(reviseContextualLinks,{key:'krakow-stag-do'});
  check('empty karting control reaches matching product, not a generic offer',await page.getByRole('link',{name:'Book Go-Karting'}).getAttribute('href')==='__KTK_HOME_URL__store2/go-karting-30/#book'&&await page.getByRole('link',{name:'Book Go-Karting'}).getAttribute('data-ktk-booking-product')==='30');
  const karting=await page.content();await page.evaluate(reviseContextualLinks,{key:'krakow-stag-do'});
  check('karting correction is idempotent',karting===await page.content());
  await page.locator('h2').evaluate(h=>h.textContent='A different activity');
  rejected=false;try{await page.evaluate(reviseContextualLinks,{key:'krakow-stag-do'});}catch{rejected=true;}
  check('changed activity row rejects product substitution',rejected);
 }
 if(venues)for(const revision of venueRevisions){
  const key=revision.key,selector=key==='post-krakow-nightclubs'?'.entry-content .et_pb_text_0 .et_pb_text_inner':'.entry-content';
  const original=await readFile(path.join(baseline,assets,before[key].main_file),'utf8');
  await page.setContent(original);
  const publication=await page.locator('.post-meta').innerHTML(),headline=await page.locator('h1.entry-title').innerHTML();
  const fragments=await page.locator(selector+' [id]').evaluateAll(ns=>[...new Set(ns.map(n=>n.id).filter(id=>id==='main-toc'||(!id.endsWith('-toc')&&!/^649[0-9a-f]+_\d+$/.test(id)&&id!=='isPasted')))].sort());
  const photos=await page.locator(selector+' img').evaluateAll(ns=>ns.map(n=>n.outerHTML));
  const changes=await page.evaluate(reviseVenueEditorial,{key,revision});
  check(key+' one source-bound venue text revision',changes.length===1&&changes[0].preservedFragments.length===fragments.length);
  check(key+' title and publication remain exact',publication===await page.locator('.post-meta').innerHTML()&&headline===await page.locator('h1.entry-title').innerHTML());
  check(key+' meaningful fragments remain exactly once',JSON.stringify(fragments)===JSON.stringify(await page.locator(selector+' [id]').evaluateAll(ns=>ns.map(n=>n.id).sort())));
  check(key+' exact selected original photographs retained',JSON.stringify(changes[0].retainedOriginalPhotos.map(i=>photos[i]))===JSON.stringify(await page.locator(selector+' img').evaluateAll(ns=>ns.map(n=>n.outerHTML))));
  check(key+' accessible two-column comparison present',await page.locator(selector+' table caption').count()===1&&await page.locator(selector+' thead th[scope="col"]').count()===2);
  const once=await page.content();check(key+' venue revision is idempotent',(await page.evaluate(reviseVenueEditorial,{key,revision})).length===0&&once===await page.content());
  for(const [name,markup] of [
   ['script',revision.markup+'<script>alert(1)</script>'],['new image',revision.markup+'<img src="https://example.invalid/a.jpg">'],
   ['handler',revision.markup.replace('<p>','<p onclick="alert(1)">')],['foreign link',revision.markup.replace('__KTK_HOME_URL__store2/pub-crawl-28/#book','https://example.invalid/')],
   ['lost fragment',revision.markup.replace('id="conclusion"','id="other"')],['duplicate fragment',revision.markup+'<h2 id="conclusion">Duplicate</h2>'],
   ['wrong photo slot',revision.markup.replace(/data-ktk-original-photo="\d+"/,'data-ktk-original-photo="99"')],['unnamed table header',revision.markup.replace('scope="row"','scope="other"')]
  ]){
   await page.setContent(original);const snapshot=await page.content();let rejected=false;
   try{await page.evaluate(reviseVenueEditorial,{key,revision:{...revision,markup}});}catch{rejected=true;}
   check(key+' '+name+' rejects atomically',rejected&&snapshot===await page.content());
  }
  for(const change of ['source-photo','publication','intro','duplicate-source-id']){
   await page.setContent(original);
   if(change==='source-photo')await page.locator(selector+' img').nth(changes[0].retainedOriginalPhotos[0]).evaluate(n=>{n.removeAttribute('data-lazy-src');n.src='https://example.invalid/wrong.png';});
   if(change==='publication')await page.locator('.published').evaluate(n=>n.textContent='Jan 1, 2020');
   if(change==='intro')await page.locator(selector+' p').first().evaluate(n=>n.textContent='Changed original introduction');
   if(change==='duplicate-source-id')await page.locator('#conclusion').evaluate(n=>n.after(n.cloneNode(true)));
   const snapshot=await page.content();let rejected=false;try{await page.evaluate(reviseVenueEditorial,{key,revision});}catch{rejected=true;}
   check(key+' changed '+change+' rejects atomically',rejected&&snapshot===await page.content());
  }
 }
 if(music)for(const revision of musicRevisions){
  const key=revision.key,jazzGuide=key==='post-jazz-bars-in-krakow';
  const original=await readFile(path.join(baseline,assets,before[key].main_file),'utf8');
  await page.setContent(original);
  const title=await page.locator('h1').evaluate(n=>n.outerHTML);
  const publication=await page.locator('.post-meta').innerHTML();
  const fragments=await page.locator('.entry-content [id]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.id).filter(id=>(id==='main-toc'||!id.endsWith('-toc'))&&!id.startsWith('64941e')))].sort());
  const photo=await page.locator('.entry-content img').nth(jazzGuide?0:1).evaluate(n=>n.outerHTML);
  const changes=await page.evaluate(reviseMusicEditorial,{key,revision});
  check(key+' one reviewed body change with intended photo reduction',changes.length===1&&changes[0].removedBodyPhotos===(jazzGuide?5:6));
  check(key+' title and publication stay exact',title===await page.locator('h1').evaluate(n=>n.outerHTML)&&publication===await page.locator('.post-meta').innerHTML());
  check(key+' meaningful heading fragments retained exactly once',JSON.stringify(fragments)===JSON.stringify(await page.locator('.entry-content [id]').evaluateAll(nodes=>nodes.map(n=>n.id).sort())));
  check(key+' only the exact original selected photo remains',await page.locator('.entry-content img').count()===1&&photo===await page.locator('.entry-content img').evaluate(n=>n.outerHTML));
  check(key+' actual source-check date is separate from publication',await page.locator('.entry-content time').textContent()==='13 November 2026');
  const once=await page.content();
  check(key+' music revision is idempotent',(await page.evaluate(reviseMusicEditorial,{key,revision})).length===0&&once===await page.content());
  for(const [name,markup] of [
   ['script',revision.markup+'<script>alert(1)</script>'],
   ['handler',revision.markup.replace('<p>','<p onclick="alert(1)">')],
   ['foreign link',revision.markup.replace('https://harris.krakow.pl/o-nas/','https://example.invalid/')],
   ['new image',revision.markup+'<img src="https://example.invalid/photo.jpg">'],
   ['lost fragment',revision.markup.replace('id="conclusion"','id="other"')],
   ['duplicate fragment',revision.markup+'<h2 id="conclusion">Duplicate</h2>'],
   ['wrong photo slot',revision.markup.replace('data-ktk-original-photo="'+(jazzGuide?0:1)+'"','data-ktk-original-photo="5"')]
  ]){
   await page.setContent(original);const snapshot=await page.content();let rejected=false;
   try{await page.evaluate(reviseMusicEditorial,{key,revision:{...revision,markup}});}catch{rejected=true;}
   check(key+' '+name+' rejects atomically',rejected&&snapshot===await page.content());
  }
  for(const change of ['photo','title','publication','intro','duplicate-source-id']){
   await page.setContent(original);
   if(change==='photo')await page.locator('.entry-content img').nth(jazzGuide?0:1).evaluate(n=>{n.removeAttribute('data-lazy-src');n.src='https://example.invalid/wrong.jpg';});
   if(change==='title')await page.locator('h1').evaluate(n=>n.textContent='Changed title');
   if(change==='publication')await page.locator('.published').evaluate(n=>n.textContent='Jan 1, 2020');
   if(change==='intro')await page.locator('.entry-content p').filter({hasText:jazzGuide?'When it comes to jazz bars in Krakow':'As a city steeped in rich cultural history'}).first().evaluate(n=>n.textContent='Changed introduction');
   if(change==='duplicate-source-id')await page.locator('#conclusion').evaluate(n=>n.after(n.cloneNode(true)));
   const snapshot=await page.content();let rejected=false;
   try{await page.evaluate(reviseMusicEditorial,{key,revision});}catch{rejected=true;}
   check(key+' changed '+change+' rejects atomically',rejected&&snapshot===await page.content());
  }
 }
 if(jazz){
  const key=jazzRevision.key,markup=await readFile(path.join(baseline,assets,before[key].main_file),'utf8');
  await page.setContent(markup);
  const identities=()=>page.evaluate(()=>({ids:[...document.querySelectorAll('.entry-content [id]')].map(n=>n.id),photos:[...document.querySelectorAll('img')].map(n=>n.outerHTML),published:document.querySelector('.post-meta')?.outerHTML}));
  const original=await identities();
  check('jazz factual revision performs one eight-edit batch',(await page.evaluate(reviseJazzEditorial,{key,revision:jazzRevision}))[0]?.edits===8);
  check('jazz fragment/photo/publication identities unchanged',JSON.stringify(original)===JSON.stringify(await identities()));
  check('jazz correction is idempotent',(await page.evaluate(reviseJazzEditorial,{key,revision:jazzRevision})).length===0);
  for(const change of ['missing-text','script','image','handler','foreign-link','unknown-selector','duplicate-target']){
   await page.setContent(markup);const revision=structuredClone(jazzRevision);
   if(change==='missing-text')revision.edits[7].expectedText='Changed original paragraph';
   else if(change==='script')revision.edits[7].markup='<script>alert(1)</script>';
   else if(change==='image')revision.edits[7].markup='<img src="https://example.invalid/photo.jpg">';
   else if(change==='handler')revision.edits[7].markup='<a href="__KTK_HOME_URL__krakow-nightlife/" onclick="alert(1)">Bad</a>';
   else if(change==='foreign-link')revision.edits[7].markup='<a href="https://example.invalid/">Unreviewed</a>';
   else if(change==='unknown-selector')revision.edits[7].selector='footer p';
   else await page.evaluate(()=>document.querySelector('#harrispianojazzbarthebirthplaceofpolishjazz').after(document.querySelector('#harrispianojazzbarthebirthplaceofpolishjazz').cloneNode(true)));
   const snapshot=await page.content();let rejected=false;try{await page.evaluate(reviseJazzEditorial,{key,revision});}catch{rejected=true;}
   check('jazz '+change+' fails closed without partial edits',rejected&&snapshot===await page.content());
  }
 }
 if(offerPages){
  for(const revision of offerPageRevisions){
   const original=await readFile(path.join(baseline,assets,before[revision.key].main_file),'utf8');
   const identities=()=>page.evaluate(()=>({ids:[...document.querySelectorAll('[id]')].map(n=>n.id),headings:[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[data-ktk-heading-origin]')].map(n=>({tag:n.tagName,attributes:[...n.attributes].filter(a=>a.name!=='data-ktk-offer-copy').map(a=>[a.name,a.value])})),media:[...document.querySelectorAll('img,iframe,svg')].map(n=>n.outerHTML),forms:[...document.forms].map(n=>n.outerHTML)}));
   await page.setContent(original);const identity=await identities();const changes=await page.evaluate(reviseOfferPages,{key:revision.key,revision});
   check(revision.key+' complete offer targets changed',changes.length===(revision.key==='how-to-join'?3:revision.key==='faqs'?15:1));
   check(revision.key+' original IDs, heading types/attributes, maps/photos/forms unchanged',JSON.stringify(identity)===JSON.stringify(await identities()));
   const once=await page.content();await page.evaluate(reviseOfferPages,{key:revision.key,revision});check(revision.key+' offer recipe is idempotent',once===await page.content());
   for(const [name,mutate] of [
    ['unknown target',r=>{r.markup=r.markup.replace('.et_pb_text_1 .et_pb_text_inner','#main-header');}],
    ['missing target',r=>{r.markup=r.markup.replace(/<template[^>]*>[\s\S]*?<\/template>/,'');}],
    ['script',r=>{r.markup+='<script>alert(1)</script>';}],
    ['image',r=>{r.markup=r.markup.replace('<p>','<p><img src="x">');}],
    ['handler',r=>{r.markup=r.markup.replace('<p>','<p onclick="alert(1)">');}],
    ['foreign booking link',r=>{r.markup=r.markup.replace('__KTK_HOME_URL__store2/pub-crawl-28/#book','https://example.invalid/');}],
    ['hardcoded UTM',r=>{r.markup=r.markup.replace('store2/pub-crawl-28/#book','store2/pub-crawl-28/?utm_source=wrong#book');}],
    ['foreign review profile',r=>{r.reviewLinks[0]='https://example.invalid/';}],
    ['duplicate review profile',r=>{r.reviewLinks=[r.reviewLinks[0],r.reviewLinks[0],r.reviewLinks[0]];}]
   ]){
    await page.setContent(original);const snapshot=await page.content(),changed=structuredClone(revision);mutate(changed);let rejected=false;try{await page.evaluate(reviseOfferPages,{key:revision.key,revision:changed});}catch{rejected=true;}check(revision.key+' '+name+' rejects atomically',rejected&&snapshot===await page.content());
   }
   for(const change of ['stale text','duplicate target','nested control']){
    await page.setContent(original);await page.locator('.et_pb_text_1 .et_pb_text_inner').evaluate((n,change)=>{if(change==='stale text')n.textContent='Unreviewed edit';else if(change==='duplicate target')n.after(n.cloneNode(true));else n.insertAdjacentHTML('beforeend','<input value="preserve">');},change);
    const snapshot=await page.content();let rejected=false;try{await page.evaluate(reviseOfferPages,{key:revision.key,revision});}catch{rejected=true;}check(revision.key+' '+change+' rejects atomically',rejected&&snapshot===await page.content());
   }
  }
 }
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),baseline,passed:checks.filter(x=>x.pass).length,total:checks.length,checks};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(x=>!x.pass)},null,2));
if(report.passed!==report.total)process.exitCode=1;
