import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {loadHomepageOfferRevision,reviseHomepageOffer} from './homepage-offer-editorial.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [baseline,output]=process.argv.slice(2);
if(!baseline||!output)throw Error('Clean baseline and fresh report path required');
try{await readFile(output);throw Error('Preserve previous evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const assets='staging/wp-content/mu-plugins/ktk-homepage-assets';
const render=root=>execFileSync('php',['-r',`define('ABSPATH',__DIR__);function esc_html($v){return htmlspecialchars($v,ENT_QUOTES,'UTF-8');}function esc_url($v){return esc_html($v);}function home_url($p){return 'https://krawlthroughkrakow.com/staging'.$p;}function content_url($p){return 'https://krawlthroughkrakow.com/staging/wp-content'.$p;}function ktk_homepage_seasonal_hero(){return '__RETAINED_HERO__';}require $argv[1].'/reviews.php';require $argv[1].'/parity-seasonal-content.php';echo ktk_homepage_static_body();`,path.resolve(root,assets)],{encoding:'utf8',maxBuffer:5e6});
const original=render(baseline),candidate=render('.'),revision=await loadHomepageOfferRevision();
const checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.route('**/*',route=>route.abort());
 await page.setContent(original);
 const identities=()=>page.evaluate(()=>({ids:[...document.querySelectorAll('[id]')].map(n=>n.id),headings:[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[data-ktk-heading-origin]')].map(n=>({tag:n.tagName,attributes:[...n.attributes].map(a=>[a.name,a.value])})),media:[...document.querySelectorAll('img,svg,iframe')].map(n=>n.outerHTML),navigation:document.querySelector('#main-header')?.outerHTML,cta:document.querySelector('#ktk-cta')?.outerHTML,buttons:[...document.querySelectorAll('.et_pb_button')].map(n=>n.outerHTML)}));
 const before=await identities(),changes=await page.evaluate(reviseHomepageOffer,revision);
 check('exactly 27 reviewed text-only targets',changes.length===27);
 check('IDs, heading elements/attributes, media, navigation, buttons and floating CTA unchanged',JSON.stringify(before)===JSON.stringify(await identities()));
 const once=await page.evaluate(()=>document.body.innerHTML);
 await page.evaluate(reviseHomepageOffer,revision);check('copy revision is idempotent',once===await page.evaluate(()=>document.body.innerHTML));
 // The builder makes newly inserted own-site links environment-relative after revision.
 await page.evaluate(changes=>{for(const {selector} of changes)for(const a of document.querySelector(selector).querySelectorAll('a[href]')){const u=new URL(a.href);if(u.origin!=='https://krawlthroughkrakow.com'||u.pathname.startsWith('/staging/'))throw Error('Expected a new canonical own-site recipe link');a.href=u.origin+'/staging'+u.pathname+u.search+u.hash;}},changes);
 const expected=await page.evaluate(()=>document.body.innerHTML);
 await page.setContent(candidate);check('generated homepage differs only by the complete reviewed copy policy',expected===await page.evaluate(()=>document.body.innerHTML));
 const copy=await page.locator('#main-content').textContent();
 check('confirmed eligibility and corrected cash/online repeat policy rendered',copy.includes('18 and over')&&copy.includes('valid ID is recommended')&&copy.includes('For a cash return booking, speak with the pub crawl leader to confirm you joined a previous crawl')&&copy.includes('show your previous booking confirmation to the leader to receive a discount code')&&copy.includes("previous day's WhatsApp group"));
 check('outdated price/history/wristband and unsupported rank promises removed',!/120 zl|almost a decade|over 14 years|wristband|PROFESSIONAL DRUNK GUIDES|#1/i.test(copy)&&await page.locator('.et_pb_blurb_8 .et_pb_module_header').textContent()==='4-5 DIFFERENT VENUES');
 check('review snapshot tokens still render unchanged',copy.includes('3,000+')&&copy.includes('2,400+'));
 check('new booking links remain own clean staging destinations',await page.locator('.et_pb_text_5 a,.et_pb_text_8 a[href*="store2"],.et_pb_text_33 a[href*="store2"]').evaluateAll(nodes=>nodes.length===3&&nodes.every(n=>{const u=new URL(n.href);return u.origin==='https://krawlthroughkrakow.com'&&u.pathname==='/staging/store2/pub-crawl-28/'&&!u.search&&u.hash==='#book';})));
 for(const [name,mutate] of [
  ['unknown target',r=>{r.html=r.html.replace('.et_pb_blurb_3 .et_pb_module_header','#main-header');}],
  ['missing template',r=>{r.html=r.html.replace(/<template[^>]*>[\s\S]*?<\/template>/,'');}],
  ['script',r=>{r.html+='<script>alert(1)</script>';}],
  ['image',r=>{r.html=r.html.replace('TICKETS ONLINE','<img src="x">');}],
  ['event handler',r=>{r.html=r.html.replace('<p>','<p onclick="alert(1)">');}],
  ['foreign link',r=>{r.html=r.html.replace('https://krawlthroughkrakow.com/about-us/how-to-join/','https://example.invalid/');}],
  ['hardcoded attribution',r=>{r.html=r.html.replace('/about-us/how-to-join/','/about-us/how-to-join/?utm_source=wrong');}],
  ['lost heading',r=>{r.html=r.html.replace('.et_pb_text_11 .et_pb_text_inner > :is(h2,h3)','.et_pb_text_11 .et_pb_text_inner');}]
 ]){
  await page.setContent(original);const snapshot=await page.content(),changed=structuredClone(revision);mutate(changed);let rejected=false;
  try{await page.evaluate(reviseHomepageOffer,changed);}catch{rejected=true;}check(name+' rejected before partial mutation',rejected&&snapshot===await page.content());
 }
 for(const change of ['stale final target','duplicated target','nested control']){
  await page.setContent(original);
  await page.evaluate(change=>{const n=document.querySelector('.et_pb_text_33 .et_pb_text_inner');if(change==='stale final target')n.textContent='Another author changed this';else if(change==='duplicated target')n.after(n.cloneNode(true));else n.insertAdjacentHTML('beforeend','<input value="must survive">');},change);
  const snapshot=await page.content();let rejected=false;try{await page.evaluate(reviseHomepageOffer,revision);}catch{rejected=true;}check(change+' rejected atomically',rejected&&snapshot===await page.content());
 }
 const walk=async(directory,prefix='')=>{const files=[];for(const entry of await readdir(directory,{withFileTypes:true})){const relative=prefix+entry.name;if(entry.isDirectory())files.push(...await walk(path.join(directory,entry.name),relative+'/'));else files.push(relative);}return files.sort();};
 const originalFiles=await walk(path.join(baseline,assets)),currentFiles=await walk(assets),changedFiles=[];
 check('homepage asset file inventory unchanged',JSON.stringify(originalFiles)===JSON.stringify(currentFiles));
 for(const file of originalFiles)if(!(await readFile(path.join(baseline,assets,file))).equals(await readFile(path.join(assets,file))))changedFiles.push(file);
 check('only reviewed body and scoped runtime clearance differ',JSON.stringify(changedFiles)===JSON.stringify(['parity-runtime.css','parity-seasonal-content.php']),changedFiles);
 const css=await readFile(assets+'/parity-runtime.css','utf8'),clearance=(await readFile('tools/homepage-offer.css','utf8')).trim();
 const block='\n\n/* BEGIN homepage offer clearance */\n'+clearance+'\n/* END homepage offer clearance */';
 check('runtime CSS outside the explicit clearance block is byte-identical',css.includes(block)&&css.replace(block,'')===await readFile(path.join(baseline,assets,'parity-runtime.css'),'utf8'));
 for(const file of ['ktk-homepage-shortcode.php','ktk-homepage-shortcode-content.php'])check(file+' unchanged',(await readFile('staging/wp-content/mu-plugins/'+file)).equals(await readFile(path.join(baseline,'staging/wp-content/mu-plugins',file))));
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),baseline,passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
