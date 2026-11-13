import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {codePageDescription} from './code-pages-seo.mjs';
import {buildCodePageSharing} from './code-page-sharing.mjs';
import {loadOfferFacts,campaignTemplateValues,offerCampaignReviewStatus} from './site-offer-facts.mjs';

const [baseline,output]=process.argv.slice(2);
if(!baseline||!output)throw Error('Clean reference and fresh report required');
try{await readFile(output);throw Error('Preserve previous evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const home='staging/wp-content/mu-plugins/ktk-homepage-assets/',pages='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const walk=async(directory,prefix='')=>{const result=[];for(const entry of await readdir(directory,{withFileTypes:true})){const relative=prefix+entry.name;if(entry.isDirectory())result.push(...await walk(path.join(directory,entry.name),relative+'/'));else result.push(relative);}return result.sort();};
for(const [directory,allowed] of [[home,['hero.php']],[pages,['content/new-years-eve.html','pages/how-to-join.php','pages/meeting-point.php']]]){
 const original=await walk(path.join(baseline,directory)),candidate=await walk(directory),changed=[];
 check(directory+' exact inventory',JSON.stringify(original)===JSON.stringify(candidate));
 for(const relative of original){const equal=(await readFile(path.join(baseline,directory,relative))).equals(await readFile(directory+relative));if(!equal)changed.push(relative);else check(directory+relative+' bytes unchanged',true);}
 check(directory+' exact changed-file boundary',JSON.stringify(changed)===JSON.stringify(allowed),changed);
}
for(const file of ['ktk-homepage-shortcode.php','ktk-homepage-shortcode-content.php','ktk-code-pages.php','ktk-code-pages-staging.php']){
 const relative='staging/wp-content/mu-plugins/'+file;
 try{check(file+' unchanged',(await readFile(relative)).equals(await readFile(path.join(baseline,relative))));}catch(error){if(error.code!=='ENOENT')throw error;}
}
const render=(root,campaign)=>execFileSync('php',['-r',`define('ABSPATH',__DIR__);define('KTK_HOMEPAGE_HERO_CAMPAIGN',$argv[2]);function esc_html($v){return htmlspecialchars($v,ENT_QUOTES,'UTF-8');}function esc_attr($v){return esc_html($v);}function esc_url($v){return esc_html($v);}function ktk_homepage_is_staging(){return true;}function ktk_homepage_asset($v){return '/assets/'.$v;}function ktk_homepage_product_url($v){return '/staging/store2/'.$v.'/#book';}function ktk_homepage_icon($name,$class){return '<svg class="'.$class.'"></svg>';}function ktk_homepage_review_sources(){return array();}require $argv[1];echo ktk_homepage_seasonal_hero();`,path.resolve(root,home,'hero.php'),campaign],{encoding:'utf8',maxBuffer:3e6});
for(const campaign of ['nye','halloween']){
 const before=render(baseline,campaign),after=render('.',campaign);
 check(campaign+' full rendered hero unchanged except explicit event facts',after.replace(' data-event-date="2026-12-31" data-event-timezone="Europe/Warsaw"','')===before);
 check(campaign+' no unexpanded template',!after.includes('{{'));
}
const currentBody=await readFile(pages+'content/new-years-eve.html','utf8'),oldBody=await readFile(path.join(baseline,pages,'content/new-years-eve.html'),'utf8');
check('NYE complete body/controls exact except event data attributes',currentBody.replace(' data-event-date="2026-12-31" data-event-timezone="Europe/Warsaw"','')===oldBody);
const definition=(root,key)=>JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);echo json_encode(require $argv[1]);",path.resolve(root,pages,'pages',key+'.php')],{encoding:'utf8',maxBuffer:1e6}));
for(const [key,route] of [['how-to-join','/about-us/how-to-join/'],['meeting-point','/meeting-point/']]){
 const before=definition(baseline,key),after=definition('.',key),expected=structuredClone(before),description=codePageDescription(route,'');
 const capture=JSON.parse(await readFile('docs/code-pages/full-migration/captures/'+key+'/production-1920.json','utf8'));
 expected.description=description;expected.metadata=buildCodePageSharing({route,kind:before.kind,title:before.title,description,inherited:capture.metadata.extra,image:null});
 const revise=node=>{if(!node||typeof node!=='object')return;for(const [key,value] of Object.entries(node)){if(key==='description'&&value===before.description)node[key]=description;else revise(value);}};revise(expected.schema);
 check(key+' only reviewed description/social/schema description changed',JSON.stringify(expected)===JSON.stringify(after));
 check(key+' no universal-night/sign promise',!after.description.includes('every night')&&!after.description.includes('pink Pub Krawl sign')&&after.description.includes("New Year's Eve"));
}
const facts=await loadOfferFacts();
const report={checkedAt:new Date().toISOString(),baseline,scope:'Exact owned-file/HTML/definition boundary. Not browser pixel, provider, expiry-messaging or commerce verification.',campaignFacts:campaignTemplateValues(facts),freshness:offerCampaignReviewStatus(facts,new Date()),passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
