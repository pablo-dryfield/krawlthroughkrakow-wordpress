import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const require=createRequire(import.meta.url);
const dependencies=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(path.join(dependencies,'playwright')),sharp=require(path.join(dependencies,'sharp'));
const [output]=process.argv.slice(2);if(!output)throw Error('Fresh private review directory required');
try{await readFile(path.join(output,'images.json'));throw Error('Preserve image review evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(output,{recursive:true});
const assets=path.resolve('staging/wp-content/mu-plugins/ktk-code-pages-assets');
const definitions=JSON.parse(execFileSync('php',['-r',"define('ABSPATH', '.');$r=require $argv[1].'/registry.php';$o=array();foreach($r['routes'] as $route=>$e){$p=require $argv[1].'/'.$e['file'];$o[]=array('route'=>$route,'key'=>$p['key'],'file'=>$p['main_file']);}echo json_encode($o);",assets],{encoding:'utf8'}));
const images=new Map(),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',route=>route.abort());
 for(const definition of definitions){
  await page.setContent(await readFile(path.join(assets,definition.file),'utf8'));
  const missing=await page.locator('img:not([alt])').evaluateAll(nodes=>nodes.map(image=>{
   const heading=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h=>h.compareDocumentPosition(image)&Node.DOCUMENT_POSITION_FOLLOWING).at(-1);
   return {src:image.getAttribute('src'),heading:heading?.textContent.trim()||'',caption:image.closest('figure,.wp-caption')?.querySelector('figcaption,.wp-caption-text')?.textContent.trim()||''};
  }));
  for(const row of missing){
   const relative=row.src?.replace(/^__KTK_PAGE_ASSETS__/,'');
   if(!relative?.startsWith('media/')||relative.includes('..')||relative.includes('\\'))throw Error('Review unexpected image path');
   const bytes=await readFile(path.join(assets,relative)),id=path.basename(relative).slice(0,12);
   const sha256=createHash('sha256').update(bytes).digest('hex');
   if(images.has(id)&&images.get(id).sha256!==sha256)throw Error('Image identity collision');
   if(!images.has(id))images.set(id,{id,file:relative,sha256,uses:[]});
   images.get(id).uses.push({route:definition.route,key:definition.key,heading:row.heading,caption:row.caption,held:definition.key==='post-hostel-hangover-cure'});
  }
 }
}finally{await browser.close();}
const rows=[...images.values()];
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(let offset=0;offset<rows.length;offset+=24){
 const composition=[];
 for(const [index,row] of rows.slice(offset,offset+24).entries()){
  const x=index%6*240,y=Math.floor(index/6)*195;
  const bitmap=await sharp(path.join(assets,row.file)).resize(228,150,{fit:'inside',background:'#fff'}).extend({top:0,bottom:0,left:0,right:0}).png().toBuffer();
  const info=await sharp(bitmap).metadata();
  composition.push({input:bitmap,left:x+Math.floor((240-info.width)/2),top:y+Math.floor((150-info.height)/2)});
  const label=`${offset+index+1}. ${row.id}`,route=row.uses[0].route.slice(0,34);
  composition.push({input:Buffer.from(`<svg width="240" height="42"><rect width="240" height="42" fill="white"/><text x="6" y="16" font-family="Arial" font-size="13">${escape(label)}</text><text x="6" y="34" font-family="Arial" font-size="10">${escape(route)}</text></svg>`),left:x,top:y+150});
 }
 await sharp({create:{width:1440,height:780,channels:3,background:'#fff'}}).composite(composition).png().toFile(path.join(output,`sheet-${String(offset/24+1).padStart(2,'0')}.png`));
}
const report={checkedAt:new Date().toISOString(),scope:'Offline diagnostic contact sheets from unchanged owned assets. No website changes or generated alt guesses.',count:rows.length,images:rows};
await writeFile(path.join(output,'images.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({images:rows.length,sheets:Math.ceil(rows.length/24),output}));
