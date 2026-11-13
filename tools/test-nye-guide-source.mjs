import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const [baseline,output]=process.argv.slice(2);if(!baseline||!output)throw Error('Clean reference and fresh report required');
try{await readFile(output);throw Error('Preserve prior evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const home='staging/wp-content/mu-plugins/ktk-homepage-assets/',pages='staging/wp-content/mu-plugins/ktk-code-pages-assets/',checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const walk=async(directory,prefix='')=>{const files=[];for(const entry of await readdir(directory,{withFileTypes:true})){const file=prefix+entry.name;if(entry.isDirectory())files.push(...await walk(path.join(directory,entry.name),file+'/'));else files.push(file);}return files.sort();};
for(const [directory,allowed]of[[home,[]],[pages,['content/post-new-years-eve-in-krakow.html','pages/post-new-years-eve-in-krakow.php']]]){
 const original=await walk(path.join(baseline,directory)),candidate=await walk(directory),changed=[];
 check(directory+' exact inventory',JSON.stringify(original)===JSON.stringify(candidate));
 for(const file of original){const same=(await readFile(path.join(baseline,directory,file))).equals(await readFile(directory+file));if(same)check(directory+file+' original bytes retained',true);else changed.push(file);}
 check(directory+' exact changed-file boundary',JSON.stringify(changed)===JSON.stringify(allowed),changed);
}
const normalize=html=>execFileSync('php',['-r',`libxml_use_internal_errors(true);$dom=new DOMDocument();$dom->loadHTML(stream_get_contents(STDIN));$xpath=new DOMXPath($dom);foreach($xpath->query('//*') as $node){$remove=array();foreach($node->attributes as $attr){if(preg_match('/^data-ktk-(event-promotion|promotion-ends|promotion-state|event-link|expired-href|expired-label)$/',$attr->name))$remove[]=$attr->name;}foreach($remove as $name)$node->removeAttribute($name);}echo $dom->C14N();`],{input:html,encoding:'utf8',maxBuffer:2e6});
const key='post-new-years-eve-in-krakow',before=await readFile(path.join(baseline,pages,'content',key+'.html'),'utf8'),after=await readFile(pages+'content/'+key+'.html','utf8');
check('complete current article DOM/text/images/forms/anchors unchanged except six owned attributes',normalize(before)===normalize(after));
const definition=root=>JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);echo json_encode(require $argv[1]);",path.resolve(root,pages,'pages',key+'.php')],{encoding:'utf8'}));
const originalDefinition=definition(baseline),{event_promotion,...candidateDefinition}=definition('.');
check('article definition/head/byline/dates/schema exact except promotion map',JSON.stringify(originalDefinition)===JSON.stringify(candidateDefinition));
check('one same-cutoff pair without alternative Article metadata',event_promotion.ends_at===1798801200&&event_promotion.replacements.length===1&&!('expired_head'in event_promotion)&&!('expired_description'in event_promotion));
const renderer='staging/wp-content/mu-plugins/ktk-code-pages.php',originalRenderer=await readFile(path.join(baseline,renderer),'utf8'),currentRenderer=await readFile(renderer,'utf8');
const expectedRenderer=originalRenderer.replace("return 'new-years-eve' === ($page['key'] ?? '')", "return in_array($page['key'] ?? '', array('new-years-eve', 'post-new-years-eve-in-krakow'), true)").replace("if (!ktk_pages_event_promotion_expired($page, $timestamp)) { return $page; }","if (!ktk_pages_event_promotion_expired($page, $timestamp) || !isset($page['event_promotion']['expired_head'])) { return $page; }");
check('renderer only exact known-key admission and absent-head preservation',expectedRenderer===currentRenderer);
const changed=execFileSync('git',['diff','--name-only','HEAD','--','staging/wp-content'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
check('no commerce/consent/Ecwid/unrelated MU changes',JSON.stringify(changed)===JSON.stringify([pages+'content/'+key+'.html',pages+'pages/'+key+'.php',renderer].sort()),changed);
const report={checkedAt:new Date().toISOString(),baseline,scope:'Exact source and current DOM preservation. Not a pixel, consent, commerce or complete expiry-cache certificate.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
