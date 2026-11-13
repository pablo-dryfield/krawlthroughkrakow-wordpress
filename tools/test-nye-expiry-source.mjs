import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const [baseline,output]=process.argv.slice(2);
if(!baseline||!output)throw Error('Clean reference and fresh report required');
try{await readFile(output);throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const home='staging/wp-content/mu-plugins/ktk-homepage-assets/',pages='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const walk=async(directory,prefix='')=>{const result=[];for(const entry of await readdir(directory,{withFileTypes:true})){const relative=prefix+entry.name;if(entry.isDirectory())result.push(...await walk(path.join(directory,entry.name),relative+'/'));else result.push(relative);}return result.sort();};
for(const [directory,allowed,added]of[
 [home,['hero.php','parity-seasonal-content.php','parity.js'],[]],
 [pages,['content/new-years-eve.html','pages/new-years-eve.php','runtime.css','runtime.js'],['shells/7f490f48bedf68f7ea3a.html']]
]){
 const original=await walk(path.join(baseline,directory)),candidate=await walk(directory),changed=[];
 check(directory+' exact additions',JSON.stringify(candidate.filter(f=>!original.includes(f)))===JSON.stringify(added));
 check(directory+' no removed files',original.every(f=>candidate.includes(f)));
 for(const relative of original){const equal=(await readFile(path.join(baseline,directory,relative))).equals(await readFile(directory+relative));if(!equal)changed.push(relative);else check(directory+relative+' original bytes retained',true);}
 check(directory+' exact changed files',JSON.stringify(changed)===JSON.stringify(allowed),changed);
}
const normalize=html=>execFileSync('php',['-r',`libxml_use_internal_errors(true);$dom=new DOMDocument();$dom->loadHTML(stream_get_contents(STDIN));$xpath=new DOMXPath($dom);foreach($xpath->query('//template[@data-ktk-promotion-replaces]') as $node){$node->parentNode->removeChild($node);}foreach($xpath->query('//*') as $node){$remove=array();foreach($node->attributes as $attr){if(preg_match('/^data-ktk-(event-link|event-promotion|promotion-|expired-)/',$attr->name))$remove[]=$attr->name;}foreach($remove as $name)$node->removeAttribute($name);}foreach($xpath->query('//text()[not(normalize-space())]') as $node){$node->parentNode->removeChild($node);}echo $dom->C14N();`],{input:html,encoding:'utf8',maxBuffer:3e6});
const render=(root,campaign)=>execFileSync('php',['-r',`define('ABSPATH',__DIR__);define('KTK_HOMEPAGE_HERO_CAMPAIGN',$argv[2]);function esc_html($v){return htmlspecialchars($v,ENT_QUOTES,'UTF-8');}function esc_attr($v){return esc_html($v);}function esc_url($v){return esc_html($v);}function home_url($v){return 'https://krawlthroughkrakow.com/staging'.$v;}function ktk_homepage_is_staging(){return true;}function ktk_homepage_asset($v){return '/assets/'.$v;}function ktk_homepage_product_url($v){return '/staging/store2/'.$v.'/#book';}function ktk_homepage_icon($name,$class){return '<svg class="'.$class.'"></svg>';}function ktk_homepage_review_sources(){return array();}require $argv[1];echo ktk_homepage_seasonal_hero();`,path.resolve(root,home,'hero.php'),campaign],{encoding:'utf8',maxBuffer:3e6});
for(const campaign of ['nye','halloween'])check(campaign+' current hero exact DOM/text/artwork except lifecycle attributes',normalize(render('.',campaign))===normalize(render(baseline,campaign)));
const read=(root,file)=>readFile(path.join(root,file),'utf8');
const oldDefinition=JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);echo json_encode(require $argv[1]);",path.resolve(baseline,pages,'pages/new-years-eve.php')],{encoding:'utf8'}));
const definition=JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);echo json_encode(require $argv[1]);",path.resolve(pages,'pages/new-years-eve.php')],{encoding:'utf8'}));
const {event_promotion,shell_file,...rest}=definition,{shell_file:oldShell,...oldRest}=oldDefinition;
check('NYE definition exact apart from promotion map and owned shell',JSON.stringify(rest)===JSON.stringify(oldRest));
check('NYE map has all eleven exact source-bound replacements',event_promotion.ends_at===1798801200&&event_promotion.replacements.length===11);
for(const [name,before,after]of[
 ['NYE current main',await read(baseline,pages+'content/new-years-eve.html'),await read('.',pages+'content/new-years-eve.html')],
 ['NYE current shell',await read(baseline,pages+oldShell),await read('.',pages+shell_file)]
])check(name+' exact DOM/text/media/links except owned attributes/inert future template',normalize(before)===normalize(after));
const stripRuntime=source=>source.replace(/\n*\/\* BEGIN shared event promotion runtime \*\/[^]*?\/\* END shared event promotion runtime \*\/\n*$/,'\n');
check('home original runtime unchanged',stripRuntime(await read('.',home+'parity.js'))===await read(baseline,home+'parity.js'));
const currentRuntime=stripRuntime(await read('.',pages+'runtime.js')).replace("const interval=setInterval(()=>{if(!timer.isConnected){clearInterval(interval);return;}update();},1000);","setInterval(update,1000);");
check('content runtime only lifecycle block and detached countdown cleanup',currentRuntime===await read(baseline,pages+'runtime.js'));
check('content stylesheet only future notice block',(await read('.',pages+'runtime.css')).replace(/\/\* BEGIN NYE promotion state \*\/[^]*?\/\* END NYE promotion state \*\/\n\n/,'')===await read(baseline,pages+'runtime.css'));
const generatedBefore=await read(baseline,home+'parity-seasonal-content.php'),generatedAfter=await read('.',home+'parity-seasonal-content.php');
check('homepage generated wrapper only optional explicit preview timestamp',generatedAfter.replace('function ktk_homepage_static_body($event_timestamp = null)','function ktk_homepage_static_body()').replace('ktk_homepage_seasonal_hero($event_timestamp)','ktk_homepage_seasonal_hero()')===generatedBefore);
const changed=execFileSync('git',['diff','--name-only','HEAD','--','staging/wp-content'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
check('no commerce, consent, Ecwid or unrelated MU source changes',changed.every(file=>file=== 'staging/wp-content/mu-plugins/ktk-code-pages.php'||[home+'hero.php',home+'parity.js',home+'parity-seasonal-content.php',pages+'runtime.js',pages+'runtime.css',pages+'content/new-years-eve.html',pages+'pages/new-years-eve.php'].includes(file)),changed);
const report={checkedAt:new Date().toISOString(),baseline,scope:'Exact source-preservation checks. Inert future template and lifecycle attributes removed only for DOM equivalence. Not a pixel, payment, consent or global cache-timing certificate.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
