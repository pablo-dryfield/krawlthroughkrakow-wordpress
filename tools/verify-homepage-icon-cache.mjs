import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const output=process.argv[2];if(!output)throw Error('New report path required');
try{await readFile(output);throw Error('Preserve earlier evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const build=JSON.parse(await readFile('docs/homepage-parity/parity-build.json','utf8'));
const expected=build.iconSizingRevisions;
if(expected?.length!==6||new Set(expected.map(row=>row.src)).size!==6)throw Error('Complete source-bound sizing review required');
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const agents={desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',android:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',ipad:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'};
const report={checkedAt:new Date().toISOString(),checks:[],devices:[],errors:[]};
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});await page.route('**/*',route=>route.abort());
 for(const [device,agent] of Object.entries(agents)){
  const url='https://krawlthroughkrakow.com/staging/'+(process.argv.includes('--cache-bust')?'?ktk_icon_check='+Date.now():'');
  const response=await fetch(url,{headers:{'User-Agent':agent},signal:AbortSignal.timeout(60000)});
  await page.setContent(await response.text(),{waitUntil:'domcontentloaded'});
  const data=await page.evaluate(expected=>({robots:document.querySelector('meta[name="robots"]')?.content,canonical:document.querySelector('link[rel="canonical"]')?.href,images:expected.map(row=>{
   const name=new URL(row.src).pathname.split('/').at(-1);
   const images=[...document.images].filter(image=>(image.getAttribute('src')||'').endsWith('-'+name));
   return {name,expected:row.sizes,images:images.map(image=>({sizes:image.getAttribute('sizes'),loading:image.getAttribute('loading'),width:image.getAttribute('width'),height:image.getAttribute('height'),srcset:image.getAttribute('srcset')}))};
  })}),expected);
  check(device+' status/noindex/canonical',response.status===200&&/noindex/i.test(data.robots||'')&&data.canonical==='https://krawlthroughkrakow.com/staging/');
  for(const row of data.images)check(device+' '+row.name,row.images.length===1&&row.images.every(image=>image.sizes===row.expected&&image.loading==='lazy'&&image.width==='2000'&&image.height==='2000'&&[480,980,1280,2000].every(width=>image.srcset.includes(' '+width+'w'))),row);
  report.devices.push({device,url,status:response.status,cache:response.headers.get('cf-cache-status')});
 }
}catch(error){report.errors.push(error.stack);}finally{
 await browser.close();report.passed=report.checks.filter(row=>row.pass).length;report.total=report.checks.length;
 await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,devices:report.devices,errors:report.errors,failed:report.checks.filter(row=>!row.pass)},null,2));
 if(report.errors.length||report.passed!==report.total)process.exitCode=1;
}
