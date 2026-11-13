import {createRequire} from 'node:module';
import {readFile,writeFile,access,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {reviseCodePageContent} from './code-pages-content-revisions.mjs';
import {codePageDescription, validateSeoRoutes} from './code-pages-seo.mjs';
import {reviseSemanticHeadings} from './semantic-headings.mjs';
import {buildCodePageSchema,codePageSchemaFacts} from './code-pages-schema.mjs';
import {reviseContextualLinks} from './contextual-links.mjs';
import {loadNightlifeEditorial,reviseNightlifeEditorial} from './nightlife-editorial.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
const nightlifeRevision=await loadNightlifeEditorial();
validateSeoRoutes(manifest.routes.map(row=>row.route));
const seoBaseline=JSON.parse(await readFile('docs/code-pages/production-readiness/production-seo-baseline.json','utf8'));
const reviewCounts=JSON.parse(execFileSync('php',['-r',"define('ABSPATH', __DIR__); require $argv[1]; echo json_encode(array_column(ktk_homepage_review_sources(), 'count', 'name'));",'staging/wp-content/mu-plugins/ktk-homepage-assets/reviews.php'],{encoding:'utf8'}));
const definitions=JSON.parse(execFileSync('php',['-r',"define('ABSPATH', __DIR__); $data=array(); foreach(glob($argv[1].'/pages/*.php') as $file){$p=require $file;$data[$p['key']]=$p;} echo json_encode($data);",base],{maxBuffer:20*1024*1024}).toString());
const checks=[];const check=(key,name,pass,detail)=>checks.push({key,name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
async function facts(html,revision){await page.setContent(html);if(revision){await page.evaluate(reviseCodePageContent,{key:revision.key,reviewCounts});await page.evaluate(reviseNightlifeEditorial,{key:revision.key,revision:nightlifeRevision});await page.evaluate(reviseContextualLinks,revision);await page.evaluate(reviseSemanticHeadings,revision);}return page.evaluate(()=>{const root=document.querySelector('#main-content');root.querySelectorAll('script,style,noscript,.mejs-controls,.mejs-layers,video a,[data-single-product-id],[data-ktk-booking-product]').forEach(e=>e.remove());return {text:root.textContent.replace(/\s+/g,' ').trim(),missingAlt:root.querySelectorAll('img:not([alt])').length,sections:root.querySelectorAll('.et_pb_section').length,headings:[...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e=>({tag:e.tagName,text:e.textContent.trim()})),primary:root.querySelectorAll('h1').length,forms:root.querySelectorAll('form.et_pb_contact_form,form.wpcf7-form').length,scripts:root.querySelectorAll('script').length,handlers:[...root.querySelectorAll('*')].flatMap(e=>[...e.attributes].filter(a=>/^on/i.test(a.name)).map(a=>a.name))};});}
try{
 for(const route of manifest.routes){
  const definition=definitions[route.key],capture=JSON.parse(await readFile(route.source+'/production-1920.json','utf8'));
  const html=await readFile(base+definition.main_file,'utf8'),source=await readFile(route.source+'/production-1920.html','utf8');
  const a=await facts(source,{key:route.key,kind:route.kind,route:route.route,title:capture.title}),b=await facts(html);
  check(route.key,'complete visible content',a.text===b.text,a.text===b.text?undefined:{sourceLength:a.text.length,candidateLength:b.text.length});
  check(route.key,'all sections',b.sections===route.expectedSections);
  check(route.key,'reviewed heading labels and levels',JSON.stringify(a.headings)===JSON.stringify(b.headings));
  check(route.key,'one nonempty primary heading',b.primary===1&&b.headings.filter(row=>row.tag==='H1').every(row=>row.text));
  check(route.key,'no skipped heading levels',b.headings.every((row,index)=>Number(row.tag.slice(1))<=(index?Number(b.headings[index-1].tag.slice(1)):0)+1));
  check(route.key,'form contracts preserved',a.forms===b.forms);
  check(route.key,'missing alt limited to unchanged explicit medical hold',b.missingAlt===(route.key==='post-hostel-hangover-cure'?a.missingAlt:0));
  check(route.key,'title preserved',definition.title===capture.title);
  check(route.key,'description matches reviewed source or original capture',definition.description===codePageDescription(route.route,capture.metadata.description));
  check(route.key,'social metadata preserved',definition.metadata===capture.metadata.extra);
  await page.setContent(html);
  const schema=buildCodePageSchema({route:route.route,kind:route.kind,description:definition.description,facts:await page.evaluate(codePageSchemaFacts),routes:manifest.routes,inherited:capture.metadata.schema});
  check(route.key,'structured data matches additive reviewed policy',JSON.stringify(definition.schema)===JSON.stringify(schema));
  check(route.key,'all inherited structured data preserved',JSON.stringify(definition.schema.slice(0,capture.metadata.schema.length))===JSON.stringify(capture.metadata.schema));
  const seo=seoBaseline.routes.find(row=>row.key===route.key);
  check(route.key,'production indexing/canonical policy matches evidence',definition.production_seo.source_url===seo.url&&JSON.stringify(definition.production_seo.robots)===JSON.stringify(seo.robots.map(row=>({name:row.name,content:row.content})))&&definition.production_seo.x_robots_tag===seo.xRobotsTag&&JSON.stringify(definition.production_seo.canonical)===JSON.stringify(seo.canonical));
  check(route.key,'captured handlers removed',!b.handlers.length);
  check(route.key,'no source scripts',!/<script\b/i.test(html));
  check(route.key,'clean booking links',!/codex-test|test-click-id|utm_source=codex/i.test(html));
  const unported=[...html.matchAll(/(?:href|action|data-parity-href)=["'](https?:\/\/(?:www\.)?krawlthroughkrakow\.com[^"']*)["']/gi)].map(x=>x[1]);
  check(route.key,'internal navigation is portable',unported.length===0,unported);
  check(route.key,'no captured visitor timing',!html.includes('instgrm-payload')||!html.includes('%22os%22'));
  const css=await readFile(base+definition.css,'utf8');
  const referenced=[...html.matchAll(/__KTK_PAGE_ASSETS__([^\s"'<>),]+)/g),...css.matchAll(/\.\.\/(media\/[^\s"'<>),]+)/g)].map(x=>x[1]);
  let missing=[];for(const file of new Set(referenced)){try{await access(base+file);}catch{missing.push(file);}}
  check(route.key,'localized assets exist',!missing.length,missing);
  const sourceCss=capture.cssom.map(s=>s.text||'').join('\n');
  const missingBackgrounds=[...css.matchAll(/var\((--wpr-bg-[a-z0-9-]+)\)/g)].filter(x=>(sourceCss.includes(x[1]+':')||sourceCss.includes(x[1]+' :'))&&!css.includes(x[1]+':')&&!css.includes(x[1]+' :'));
  check(route.key,'source background definitions retained',missingBackgrounds.length===0,missingBackgrounds.map(x=>x[1]));
 }
}finally{await browser.close();}
const payloadChecksums={};
async function hashTree(folder,prefix){for(const entry of await readdir(folder,{withFileTypes:true})){const relative=prefix+entry.name;if(entry.isDirectory())await hashTree(folder+'/'+entry.name,relative+'/');else if(entry.isFile())payloadChecksums[relative]=createHash('sha256').update(await readFile(folder+'/'+entry.name)).digest('hex');}}
await hashTree(base.replace(/\/$/,''),'ktk-code-pages-assets/');
payloadChecksums['ktk-code-pages.php']=createHash('sha256').update(await readFile('staging/wp-content/mu-plugins/ktk-code-pages.php')).digest('hex');
const report={checkedAt:new Date().toISOString(),routes:manifest.routes.length,passed:checks.filter(x=>x.pass).length,total:checks.length,payloadChecksums,checks};
await writeFile('docs/code-pages/full-migration/build-verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({routes:report.routes,passed:report.passed,total:report.total,failed:checks.filter(x=>!x.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
