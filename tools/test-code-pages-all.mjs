import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const deps=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(path.join(deps,'playwright'));
const sharp=require(path.join(deps,'sharp'));
const {default:pixelmatch}=await import(pathToFileURL(require.resolve(path.join(deps,'pixelmatch'))));
const option=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const target=option('--target','local'),label=option('--label',target),widths=option('--widths','1920,390').split(',').map(Number),keys=option('--keys','').split(',').filter(Boolean);
const reference=option('--reference','production');
const manifest=JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json','utf8'));
if(!process.argv.includes('--compare-only')){
  const result=spawnSync(process.execPath,['tools/capture-code-pages-batch.mjs','--target',target,'--label',label,'--widths',widths.join(','),...(keys.length?['--keys',keys.join(',')]:[]),...(process.argv.includes('--force')?['--force']:[])],{stdio:'inherit'});
  if(result.status!==0)throw new Error('Candidate capture did not complete');
}
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',r=>r.abort());
const report={target,label,checkedAt:new Date().toISOString(),content:[],geometry:[],typography:[],pixels:[],errors:[],routes:[]};
const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
async function semantic(file){await page.setContent(await readFile(file,'utf8'));return page.evaluate(()=>{const e=document.querySelector('#page-container').cloneNode(true);e.querySelectorAll('script,style,noscript,.ktk-parity-gallery-pause,.ktk-contact-honeypot,.et-pb-controllers,.et-pb-slider-arrows,.mejs-controls,.mejs-layers,video a,[data-single-product-id]').forEach(x=>x.remove());return e.textContent.replace(/\s+/g,' ').trim();});}
try{
 for(const route of manifest.routes.filter(r=>!keys.length||keys.includes(r.key))){
  let sourceText,candidateText;
  try{sourceText=await semantic(path.join(route.source,`${reference}-1920.html`));candidateText=await semantic(path.join(route.source,`${label}-1920.html`));}
  catch(error){report.errors.push({key:route.key,message:error.message});continue;}
  const normalizedSource=normalize(sourceText),normalizedCandidate=normalize(candidateText);
  if(normalizedSource!==normalizedCandidate)report.content.push({key:route.key,source:normalizedSource.slice(0,800),candidate:normalizedCandidate.slice(0,800),sourceLength:normalizedSource.length,candidateLength:normalizedCandidate.length});
  for(const width of widths){
   try{
    const source=JSON.parse(await readFile(path.join(route.source,`${reference}-${width}.json`),'utf8'));
    const candidate=JSON.parse(await readFile(path.join(route.source,`${label}-${width}.json`),'utf8'));
    const entry={key:route.key,width,sourceHeight:source.contentBottom,candidateHeight:candidate.contentBottom};
    if(candidate.viewport.scrollWidth>width)report.errors.push({key:route.key,width,error:`Horizontal overflow ${candidate.viewport.scrollWidth-width}px`});
    for(const group of ['header','footer','sections','modules','headings','paragraphs','images','frames']){
     const left=source.groups[group],right=candidate.groups[group];
     if(left.length!==right.length){report.geometry.push({key:route.key,width,group,sourceCount:left.length,candidateCount:right.length});continue;}
     for(let i=0;i<left.length;i++){
      for(const property of ['x','y','width','height'])if(Math.abs(left[i].box[property]-right[i].box[property])>1)report.geometry.push({key:route.key,width,group,index:i,property,source:left[i].box[property],candidate:right[i].box[property]});
      for(const property of ['fontFamily','fontSize','fontWeight','lineHeight','textAlign','color','backgroundColor'])if(left[i].style[property]!==right[i].style[property])report.typography.push({key:route.key,width,group,index:i,property,source:left[i].style[property],candidate:right[i].style[property]});
     }
    }
    const a=await sharp(path.join(route.source,`${reference}-${width}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const b=await sharp(path.join(route.source,`${label}-${width}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const height=Math.max(Math.min(a.info.height,source.contentBottom),Math.min(b.info.height,candidate.contentBottom));
    const padded=(data,info)=>{const result=Buffer.alloc(width*height*4,255);for(let y=0;y<Math.min(info.height,height);y++)data.copy(result,y*width*4,y*info.width*4,y*info.width*4+Math.min(width,info.width)*4);return result;};
    const left=padded(a.data,a.info),right=padded(b.data,b.info),marked=new Uint8Array(width*height);
    let masked=0;
    for(const rectangle of [...source.masks,...candidate.masks])for(let y=Math.max(0,Math.floor(rectangle.y));y<Math.min(height,Math.ceil(rectangle.y+rectangle.height));y++)for(let x=Math.max(0,Math.floor(rectangle.x));x<Math.min(width,Math.ceil(rectangle.x+rectangle.width));x++){const p=y*width+x;if(!marked[p])masked++;marked[p]=1;left.fill(255,p*4,p*4+4);right.fill(255,p*4,p*4+4);}
    const diff=Buffer.alloc(width*height*4),changed=pixelmatch(left,right,diff,width,height,{threshold:0.1,includeAA:false}),ratio=changed/Math.max(1,width*height-masked);
    const pixels={key:route.key,width,height,changedPixels:changed,maskedPixels:masked,ratio,pass:ratio<=0.005};report.pixels.push(pixels);
    if(!pixels.pass)await sharp(diff,{raw:{width,height,channels:4}}).png().toFile(path.join(route.source,`${label}-diff-${width}.png`));
    report.routes.push(entry);
   }catch(error){report.errors.push({key:route.key,width,error:error.message});}
  }
 }
}finally{await browser.close();}
report.summary={routes:manifest.routes.filter(r=>!keys.length||keys.includes(r.key)).length,captures:report.routes.length,contentDifferences:report.content.length,geometryDifferences:report.geometry.length,typographyDifferences:report.typography.length,pixelsPassed:report.pixels.filter(r=>r.pass).length,pixelsTotal:report.pixels.length,errors:report.errors.length};
await writeFile(`docs/code-pages/full-migration/${label}-comparison.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary,null,2));
if(report.content.length||report.geometry.length||report.typography.length||report.errors.length||report.pixels.some(r=>!r.pass))process.exitCode=1;
