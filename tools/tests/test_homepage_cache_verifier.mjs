import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,unlink,rmdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../..',import.meta.url));
const files=['parity.css','parity-runtime.css','parity.js','journey.js','hero.css',
 'hero-statue-regular.svg','hero-statue-seasonal.svg','review-google.svg','review-tripadvisor.png','review-getyourguide.svg'];
const payload=Object.fromEntries(await Promise.all(files.map(async file=>[file,await readFile(path.join(root,'staging/wp-content/mu-plugins/ktk-homepage-assets',file))])));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const base='https://krawlthroughkrakow.com/staging/';

test('homepage cache verifier requires every owned reference and exact asset bytes',async t=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-home-cache-verifier-'));
 const outputs=[];
 try{
  for(const mode of ['current','stale','missing','tampered','noindex','canonical']){
   await t.test(mode,async()=>{
    const output=path.join(directory,mode+'.json');outputs.push(output);
    const original={fetch:globalThis.fetch,log:console.log,argv:process.argv,exitCode:process.exitCode};
    const calls=[];
    globalThis.fetch=async(value,options={})=>{
     const url=new URL(value);calls.push(url.href);
     assert.equal(url.origin,'https://krawlthroughkrakow.com');
     assert.equal(options.method??'GET','GET');assert.equal(options.body,undefined);
     if(url.pathname==='/staging/'){
      const references=files.filter(file=>mode!=='missing'||file!=='hero.css').map(file=>
       `<link href="${base}wp-content/mu-plugins/ktk-homepage-assets/${file}?v=${mode==='stale'&&file==='hero.css'?'000000000000':hash(payload[file]).slice(0,12)}">`).join('');
      return new Response(`<meta name="robots" content="${mode==='noindex'?'index,follow':'noindex,nofollow'}"><link rel="canonical" href="${mode==='canonical'?'https://example.invalid/':base}">${references}<div class="et_pb_section_0"></div>`,{headers:{'cf-cache-status':'HIT'}});
     }
     const file=url.pathname.split('/').at(-1);assert.ok(files.includes(file));
     return new Response(mode==='tampered'&&file==='hero.css'?Buffer.concat([payload[file],Buffer.from('changed')]):payload[file]);
    };
    console.log=()=>{};process.argv=[process.execPath,'tools/verify-homepage-parity-cache.mjs','--output',output];
    try{
     await import(new URL('../verify-homepage-parity-cache.mjs?fixture='+mode,import.meta.url));
     const report=JSON.parse(await readFile(output,'utf8'));
     assert.equal(report.passed,mode==='current');
     assert.deepEqual(Object.keys(report.expected),files);
     assert.equal(report.assets.length,mode==='missing'?9:10);
     assert.equal(report.devices.length,3);
     assert.equal(report.cacheBusted,false);
     assert.equal(process.exitCode,mode==='current'?original.exitCode:1);
     assert.equal(calls.length,mode==='missing'?12:13);
    }finally{
     globalThis.fetch=original.fetch;console.log=original.log;process.argv=original.argv;process.exitCode=original.exitCode;
    }
   });
  }
 }finally{
  for(const file of outputs)await unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});
  await rmdir(directory);
 }
});
