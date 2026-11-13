import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {reviseAccessibilitySemantics} from './accessibility-semantics.mjs';
import {composeCodePage} from './code-page-template.mjs';
import {loadReviewedImageDescriptions} from './content-image-descriptions.mjs';
import {reviseContextualLinks} from './contextual-links.mjs';
import {rewriteCanonicalLinks} from './canonical-links.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [baseline,output]=process.argv.slice(2);
const contextual=process.argv.includes('--contextual');
if(!baseline||!output)throw Error('Baseline worktree and fresh report required');
try{await readFile(output);throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const assets='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const definitions=root=>JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);$a=$argv[1];$r=require $a.'registry.php';$o=array();foreach($r['routes'] as $e){$p=require $a.$e['file'];$o[$p['key']]=$p;}echo json_encode($o);",path.join(root,assets)],{encoding:'utf8',maxBuffer:10e6}));
const before=definitions(baseline),after=definitions('.');
const imageDescriptions=await loadReviewedImageDescriptions();
const checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.route('**/*',route=>route.abort());
 for(const [key,definition] of Object.entries(after)){
  const previous=before[key];
  const markup=async(root,definition)=>composeCodePage(await readFile(path.join(root,assets,definition.shell_file),'utf8'),await readFile(path.join(root,assets,definition.main_file),'utf8'));
  const original=await markup(baseline,previous),candidate=await markup('.',definition);
  await page.setContent(original);await page.evaluate(reviseAccessibilitySemantics,{key,imageDescriptions});
  if(contextual){await page.evaluate(reviseContextualLinks,{key});await rewriteCanonicalLinks(page);}
  const expected=await page.evaluate(()=>document.body.innerHTML);
  await page.setContent(candidate);
  check(key+' only reviewed semantic attributes changed',expected===await page.evaluate(()=>document.body.innerHTML));
  const metadata=({shell_file,...rest})=>rest;
  check(key+' SEO/schema/content identity unchanged',JSON.stringify(metadata(previous))===JSON.stringify(metadata(definition)));
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
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),baseline,passed:checks.filter(x=>x.pass).length,total:checks.length,checks};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(x=>!x.pass)},null,2));
if(report.passed!==report.total)process.exitCode=1;
