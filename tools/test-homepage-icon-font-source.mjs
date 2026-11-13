import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {homepageIconFontStyles,iconFontFiles} from './homepage-icon-font.mjs';
const [baseline,output]=process.argv.slice(2);if(!baseline||!output)throw Error('Own clean baseline and fresh report required');
try{await readFile(output);throw Error('Preserve prior evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const root='staging/wp-content/mu-plugins/ktk-homepage-assets/',checks=[],check=(name,pass,detail)=>checks.push({name,pass:!!pass,detail});
const oldFiles=execFileSync('git',['-C',baseline,'ls-files','-z','--','staging'],{encoding:'utf8'}).split('\0').filter(Boolean),changed=[];
for(const name of oldFiles){
 const before=await readFile(path.join(baseline,name)),after=await readFile(name);
 if(before.equals(after))check(name+' original bytes retained',true);else changed.push(name);
}
check('only existing application change is homepage owned runtime CSS',JSON.stringify(changed)===JSON.stringify([root+'parity-runtime.css']),changed);
const walk=async(dir)=>{const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const name=path.join(dir,entry.name);if(entry.isDirectory())result.push(...await walk(name));else result.push(name.replaceAll('\\','/'));}return result.sort();};
const before=await walk(path.join(baseline,root)),current=await walk(root),oldNames=before.map(n=>path.relative(path.join(baseline,root),n).replaceAll('\\','/')).sort(),names=current.map(n=>n.slice(root.length));
check('one added font and no deleted homepage assets',JSON.stringify(names)===JSON.stringify([...oldNames,'etmodules-full.woff2'].sort()));
const files={};for(const file of Object.keys(iconFontFiles))files[file]=await readFile(root+file);
const css=await readFile(root+'parity-runtime.css','utf8'),oldCss=await readFile(path.join(baseline,root,'parity-runtime.css'),'utf8');
check('existing CSS exact plus only reviewed full-font face',css===homepageIconFontStyles(oldCss,files));
check('font block generates idempotently',css===homepageIconFontStyles(css,files));
const oldBuild=JSON.parse(await readFile(path.join(baseline,'docs/homepage-parity/parity-build.json'))),currentBuild=JSON.parse(await readFile('docs/homepage-parity/parity-build.json'));delete oldBuild.builtAt;delete currentBuild.builtAt;
check('homepage capture/body/build inputs exact except regeneration time',JSON.stringify(oldBuild)===JSON.stringify(currentBuild));
const manifest=await readFile('docs/code-pages/full-migration/assets.json');
check('immutable content asset manifest exact',createHash('sha256').update(manifest).digest('hex')==='f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691');
const report={checkedAt:new Date().toISOString(),baseline,scope:'All tracked staging files retain original bytes except one exact homepage-only CSS insertion; one full font added. No content, medical hold, commerce, consent, page subsets or artwork change.',passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(c=>!c.pass)},null,2));if(report.passed!==report.total)process.exitCode=1;
