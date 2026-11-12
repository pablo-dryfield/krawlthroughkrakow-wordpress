import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {composeCodePage} from './code-page-template.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output=process.argv[2];
if(!output)throw new Error('New report path required');
try{await readFile(output);throw new Error('Preserve earlier audit; select another report');}catch(error){if(error.code!=='ENOENT')throw error;}
const assets='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const definitions=JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);$a=$argv[1];$r=require $a.'registry.php';$o=array();foreach($r['routes'] as $url=>$entry){$o[$url]=require $a.$entry['file'];}echo json_encode($o);",assets],{encoding:'utf8',maxBuffer:8e6}));
const report={checkedAt:new Date().toISOString(),scope:'Read-only local generated DOM audit and public homepage GET; no page scripts or business writes.',pages:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',route=>route.abort());
 const inputs=[];
 for(const [route,definition] of Object.entries(definitions))inputs.push({route,kind:definition.kind,key:definition.key,title:definition.title,
  html:composeCodePage(await readFile(assets+definition.shell_file,'utf8'),await readFile(assets+definition.main_file,'utf8'))});
 const homepage=process.argv[3]||'https://krawlthroughkrakow.com/staging/';
 if(homepage!=='https://krawlthroughkrakow.com/staging/'&&!/^http:\/\/127\.0\.0\.1:\d+\/$/.test(homepage))throw new Error('Staging or loopback homepage only');
 const response=await fetch(homepage,{signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw new Error('Public staging homepage unavailable');
 inputs.push({route:'/',kind:'homepage',key:'homepage',html:await response.text()});
 for(const input of inputs){
  const data=await page.evaluate(html=>{
   const doc=new DOMParser().parseFromString(html,'text/html');
   const clean=value=>(value||'').replace(/\s+/g,' ').trim();
   const selector=node=>{
    const parts=[];
    while(node&&node.tagName!=='BODY'){
     if(node.id){parts.unshift('#'+CSS.escape(node.id));break;}
     const module=[...node.classList].find(name=>/^et_pb_(?:heading|text|post_title|countdown_timer)_\d+$/.test(name));
     if(module){parts.unshift('.'+module);break;}
     const siblings=[...(node.parentElement?.children||[])].filter(sibling=>sibling.tagName===node.tagName);
     parts.unshift(node.tagName.toLowerCase()+(siblings.length>1?':nth-of-type('+(siblings.indexOf(node)+1)+')':''));node=node.parentElement;
    }
    return parts.join(' > ');
   };
   const headings=[...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(node=>({tag:node.tagName.toLowerCase(),text:clean(node.textContent),selector:selector(node),
    inMain:!!node.closest('#main-content,main'),inFooter:!!node.closest('footer,#main-footer,.et-l--footer'),id:node.id,
    parent:node.parentElement?.className,links:node.querySelectorAll('a').length}));
   const links=[...doc.querySelectorAll('a[href],[data-parity-href]')].map(node=>({href:node.getAttribute('href')||node.getAttribute('data-parity-href'),text:clean(node.textContent).slice(0,180),selector:selector(node)}));
   const fragments=links.filter(item=>item.href?.startsWith('#')&&item.href.length>1).filter(item=>{
    try{return !doc.getElementById(decodeURIComponent(item.href.slice(1)));}catch{return true;}
   });
   return {headings,fragments,links:links.filter(item=>/student-trips-and-parties|2019\/09\/05\/2681|Bottomless-Brunch-p661114244/.test(item.href||''))};
  },input.html);
  report.pages.push({route:input.route,key:input.key,kind:input.kind,title:input.title,...data});
 }
}finally{await browser.close();}
const frequency=new Map();
for(const row of report.pages)for(const heading of row.headings)if(heading.tag==='h1')frequency.set(heading.text,(frequency.get(heading.text)||0)+1);
report.summary={pages:report.pages.length,missingH1:report.pages.filter(row=>!row.headings.some(h=>h.tag==='h1')).map(row=>row.route),
 multipleH1:report.pages.filter(row=>row.headings.filter(h=>h.tag==='h1').length>1).map(row=>({route:row.route,count:row.headings.filter(h=>h.tag==='h1').length})),
 repeatedPrimaryText:[...frequency].filter(([,count])=>count>2).sort((a,b)=>b[1]-a[1]),fragmentPages:report.pages.filter(row=>row.fragments.length).length,
 deadDestinationReferences:report.pages.reduce((total,row)=>total+row.links.length,0)};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));
