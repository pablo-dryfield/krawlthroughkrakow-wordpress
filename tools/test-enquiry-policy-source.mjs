import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';

const [baseline,output]=process.argv.slice(2);
if(!/^[a-f0-9]{40}$/.test(baseline||'')||!output)throw Error('Exact baseline and fresh output required');
try{await readFile(output);throw Error('Preserve previous evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const root='staging/wp-content/mu-plugins/ktk-code-pages-assets/',keys=['contact','krakow-stag-do','krakow-hen-do','student-trips-poland'];
const expected=keys.map(key=>root+'content/'+key+'.html').sort(),checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});
const old=file=>execFileSync('git',['show',baseline+':'+file],{maxBuffer:10*1024*1024}),changed=[];
for(const row of execFileSync('git',['ls-tree','-r',baseline,'--','staging'],{encoding:'utf8'}).trim().split('\n')){
 const [entry,file]=row.split('\t'),bytes=await readFile(file),sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(sha===entry.split(' ')[2])check(file+' original Git blob retained',true);else changed.push(file);
}
check('Only four content bodies change; styles/runtime/definitions/assets exact',JSON.stringify(changed.sort())===JSON.stringify(expected),changed);
check('No new application files',!execFileSync('git',['ls-files','--others','--exclude-standard','--','staging'],{encoding:'utf8'}).trim());
check('Immutable original media/style manifest retained',createHash('sha256').update(await readFile('docs/code-pages/full-migration/assets.json')).digest('hex')==='f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691');
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
 for(const key of keys){
  const file=root+'content/'+key+'.html',result=await page.evaluate(({before,after,key})=>{
   const a=new DOMParser().parseFromString(before,'text/html'),b=new DOMParser().parseFromString(after,'text/html');
   const serialize=(doc,selector)=>[...doc.querySelectorAll(selector)].map(e=>e.outerHTML);
   const forms=JSON.stringify(serialize(a,'form'))===JSON.stringify(serialize(b,'form'));
   const headings=JSON.stringify(serialize(a,'h1,h2,h3,h4,h5,h6'))===JSON.stringify(serialize(b,'h1,h2,h3,h4,h5,h6'));
   const images=JSON.stringify(serialize(a,'img,svg,iframe'))===JSON.stringify(serialize(b,'img,svg,iframe'));
   const links=JSON.stringify(serialize(a,'a'))===JSON.stringify(serialize(b,'a'));
   let allowed=false,labels=true,policy=true;
   if(key==='contact'){
    const x=a.querySelector('[data-ktk-contact-copy]'),y=b.querySelector('[data-ktk-contact-copy]'),last=y.lastElementChild;
    const separator=last.previousSibling;
    allowed=x.children.length===3&&y.children.length===4&&last.outerHTML==='<p>Our team replies by email after reviewing your enquiry.</p>'&&separator?.nodeType===Node.TEXT_NODE&&separator.textContent==='\n';
    if(allowed){separator.remove();last.remove();}
   }else{
    const selector='[data-ktk-group-planning-review]',x=a.querySelector(selector),y=b.querySelector(selector);
    const oldItem=x.querySelector('ul > li:last-child'),item=y.querySelector('ul > li:last-child'),oldEnd=x.lastElementChild,end=y.lastElementChild;
    const changed=item.outerHTML!==oldItem.outerHTML&&end.outerHTML!==oldEnd.outerHTML;
    labels=item.querySelector('strong').outerHTML===oldItem.querySelector('strong').outerHTML;
    const text=item.textContent;
    policy=text.includes('individual quote')&&['private arrangements','booking lead times','deposits','payment dates','cancellation terms'].every(s=>text.includes(s))&&end.textContent.includes('Our team replies by email after reviewing your enquiry.');
    allowed=changed&&oldEnd.tagName==='P'&&end.tagName==='P';
    if(allowed){item.innerHTML=oldItem.innerHTML;end.innerHTML=oldEnd.innerHTML;}
   }
   return {forms,headings,images,links,allowed,labels,policy,outside:a.body.innerHTML===b.body.innerHTML};
  },{before:old(file).toString(),after:await readFile(file,'utf8'),key});
  check(key+' exact original forms, headings, media and links',result.forms&&result.headings&&result.images&&result.links,result);
  check(key+' only the agreed quote/email nodes change',result.allowed&&result.labels&&result.policy&&result.outside,result);
 }
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),baseline,scope:'Exactly three last planning items, their closing paragraphs and one added Contact paragraph. All other DOM and application files exact.',passed:checks.filter(row=>row.pass).length,total:checks.length,checks};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(row=>!row.pass)},null,2));
if(report.passed!==report.total)process.exitCode=1;
