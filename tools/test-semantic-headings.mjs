import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {preserveHeadingCss} from './semantic-headings.mjs';
import {rewriteCanonicalLinks} from './canonical-links.mjs';
import {composeCodePage} from './code-page-template.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const baseline='deploy-backups/seo-headings-links-baseline/';
const assets='staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const out=process.argv[2];if(!out)throw new Error('Explicit new report required');
try{await readFile(out);throw new Error('Preserve previous report');}catch(error){if(error.code!=='ENOENT')throw error;}
const definitions=root=>JSON.parse(execFileSync('php',['-r',"define('ABSPATH',__DIR__);$a=$argv[1];$r=require $a.'registry.php';$o=array();foreach($r['routes'] as $url=>$e){$p=require $a.$e['file'];$o[$p['key']]=$p;}echo json_encode($o);",root+assets],{encoding:'utf8',maxBuffer:8e6}));
const before=definitions(baseline),after=definitions('');
const report={checkedAt:new Date().toISOString(),checks:[],errors:[],visuals:[],realMutations:0};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const tiny=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64');
await mkdir(path.dirname(out),{recursive:true});
try{
 const parser=await browser.newPage({javaScriptEnabled:false});await parser.route('**/*',route=>route.abort());
 for(const [key,page] of Object.entries(after)){
  let htmlA=composeCodePage(await readFile(baseline+assets+before[key].shell_file,'utf8'),await readFile(baseline+assets+before[key].main_file,'utf8'));
  await parser.setContent(htmlA);await rewriteCanonicalLinks(parser);htmlA=await parser.evaluate(()=>document.body.innerHTML);
  const htmlB=composeCodePage(await readFile(assets+page.shell_file,'utf8'),await readFile(assets+page.main_file,'utf8'));
  const source=await parser.evaluate(({htmlA,htmlB})=>{
   const parse=html=>new DOMParser().parseFromString(html,'text/html');
   const a=parse(htmlA),b=parse(htmlB),headings=[...b.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(node=>({tag:node.tagName,text:node.textContent.trim()}));
   const archive=b.querySelector('.ktk-archive-heading');archive?.remove();
   for(const node of b.querySelectorAll('[data-ktk-heading-origin]')){
    const old=b.createElement(node.dataset.ktkHeadingOrigin);
    for(const attr of node.attributes)if(attr.name!=='data-ktk-heading-origin')old.setAttribute(attr.name,attr.value);
    old.append(...node.childNodes);node.replaceWith(old);
   }
   b.querySelector('[data-ktk-semantic-headings]')?.removeAttribute('data-ktk-semantic-headings');
   return {unchanged:a.body.innerHTML===b.body.innerHTML,headings,archive:!!archive};
  },{htmlA,htmlB});
  check(key+' original nodes/text/attributes restored except reviewed canonical hrefs',source.unchanged);
  check(key+' one meaningful H1',source.headings.filter(node=>node.tag==='H1').length===1&&source.headings.every(node=>node.text));
  check(key+' no skipped levels',source.headings.every((node,index)=>Number(node.tag.slice(1))<=(index?Number(source.headings[index-1].tag.slice(1)):0)+1));
  check(key+' added visible title only on archive',source.archive===/^\/(?:category|tag|author)\//.test(page.route));
  const cssA=await readFile(baseline+assets+before[key].css,'utf8'),cssB=await readFile(assets+page.css,'utf8');
  check(key+' CSS differs only by specificity-preserving selectors',preserveHeadingCss(cssA)===cssB);
 }
 await parser.close();
 if(!process.argv.includes('--source-only'))for(const width of [390,1440]){
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   if(request.method()!=='GET')return route.abort();
   if(request.resourceType()==='image')return route.fulfill({contentType:'image/png',body:tiny});
   return url.hostname==='127.0.0.1'?route.continue():route.abort();
  });
  const pages=[await context.newPage(),await context.newPage()];
  let completed=0;
  for(const [key,definition] of [...Object.entries(after),['homepage',{route:'/'}]]){
   const samples=[];
   for(let index=0;index<2;index++){
    const port=key==='homepage'?(index?5184:5185):(index?5182:5183);
    const page=pages[index];await page.goto(`http://127.0.0.1:${port}${definition.route}`,{waitUntil:'load'});
    await page.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));await document.fonts.ready;});
    samples.push(await page.evaluate(({promotedParagraph})=>({overflow:document.documentElement.scrollWidth>innerWidth+1,headings:[...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[data-ktk-heading-origin]'+(promotedParagraph?',.et_pb_text_0 .et_pb_text_inner > p':''))].filter(node=>!node.closest('.ktk-archive-heading')).map(node=>{
     const s=getComputedStyle(node),r=node.getBoundingClientRect();
     return {text:node.textContent.trim(),style:Object.fromEntries(['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','color','textAlign','textTransform','marginTop','marginBottom','paddingTop','paddingBottom','display','whiteSpace'].map(key=>[key,s[key]])),
      box:{x:r.x,y:r.y,width:r.width,height:r.height},inList:!!node.closest('#left-area')};
    })}),{promotedParagraph:['privacy-policy','terms-and-conditions','tour-service-disclaimer'].includes(key)}));
   }
   const [a,b]=samples,name=width+' '+key;
   check(name+' all original heading labels retained',a.headings.length===b.headings.length&&a.headings.every((node,index)=>clean(node.text)===clean(b.headings[index].text)));
   const styleDifferences=a.headings.flatMap((node,index)=>JSON.stringify(node.style)===JSON.stringify(b.headings[index]?.style)?[]:[{text:node.text,before:node.style,after:b.headings[index]?.style}]);
   check(name+' every original heading computed style retained',!styleDifferences.length,styleDifferences);
   const archive=/^\/(?:category|tag|author)\//.test(definition.route);
   const geometryDifferences=a.headings.flatMap((node,index)=>{
    const other=b.headings[index];if(!other)return [{text:node.text,missing:true}];
    const keys=archive?['x','width','height']:['x','y','width','height'];
    return keys.every(key=>Math.abs(node.box[key]-other.box[key])<0.1)?[]:[{text:node.text,before:node.box,after:other.box}];
   });
   check(name+' original geometry retained except archive title offset',!geometryDifferences.length,geometryDifferences);
   check(name+' no new horizontal overflow',!b.overflow||a.overflow,{before:a.overflow,after:b.overflow});
   if(++completed%20===0)console.log('Verified semantic rendering '+width+': '+completed+'/117');
  }
  await context.close();
 }
}catch(error){report.errors.push(error.stack);}finally{
 await browser.close();report.summary={passed:report.checks.filter(row=>row.pass).length,total:report.checks.length};
 await writeFile(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({summary:report.summary,errors:report.errors,failed:report.checks.filter(row=>!row.pass).map(row=>({name:row.name,detail:row.detail?.slice?.(0,3)||row.detail})).slice(0,30)},null,2));
 if(report.errors.length||report.summary.passed!==report.summary.total)process.exitCode=1;
}
