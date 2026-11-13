import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [baseline,candidate,output]=process.argv.slice(2);
if(!baseline||!candidate||!output)throw Error('Two local preview origins and fresh report directory required');
for(const base of [baseline,candidate])if(new URL(base).hostname!=='127.0.0.1')throw Error('Local previews only');
try{await readFile(path.join(output,'report.json'));throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const report={checkedAt:new Date().toISOString(),checks:[],errors:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'&&['GET','HEAD'].includes(r.request().method())?r.continue():r.abort());
  const results=[];
  try{
   for(const [index,base] of [baseline,candidate].entries()){
    const page=await context.newPage();await page.goto(base+'/faqs/',{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
    const headings=await page.locator('.et_pb_toggle_title').evaluateAll(nodes=>nodes.map(node=>{
     const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
     return {text:node.textContent,box:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},style:Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','color','textAlign','margin','padding'].map(key=>[key,style[key]]))};
    }));
    const png=await page.locator('.et_pb_toggle').first().screenshot({path:path.join(output,`${index?'after':'before'}-${width}.png`)});
    results.push({headings,png});await page.close();
   }
   const [a,b]=results;
   check(width+' all twelve heading labels and styles identical',a.headings.length===12&&JSON.stringify(a.headings.map(({box,...rest})=>rest))===JSON.stringify(b.headings.map(({box,...rest})=>rest)));
   check(width+' exact original heading geometry',JSON.stringify(a.headings.map(x=>x.box))===JSON.stringify(b.headings.map(x=>x.box)),{before:a.headings.map(x=>x.box),after:b.headings.map(x=>x.box)});
   check(width+' first FAQ panel exact screenshot bytes',a.png.equals(b.png));
  }finally{await context.close();}
 }
}catch(error){report.errors.push(error.stack);}finally{
 await browser.close();report.passed=report.checks.filter(x=>x.pass).length;report.total=report.checks.length;
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,total:report.total,errors:report.errors,failed:report.checks.filter(x=>!x.pass)},null,2));
 if(report.errors.length||report.passed!==report.total)process.exitCode=1;
}
