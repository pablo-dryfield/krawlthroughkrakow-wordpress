import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {searchConsoleAssets} from '../verify-search-console-delivery.mjs';
const sha='a'.repeat(40),release='omnilodge-r123-a1-'+sha.slice(0,12);
async function cleanup(root){
 const target=path.resolve(root),prefix=path.join(path.resolve(tmpdir()),'ktk-reporting-proof-');
 if(!target.startsWith(prefix))throw new Error('Unexpected temporary cleanup path');
 await rm(target,{recursive:true,force:true});
}
async function fixture(){
 const root=await mkdtemp(path.join(tmpdir(),'ktk-reporting-proof-'));await mkdir(path.join(root,'static/js'),{recursive:true});
 await writeFile(path.join(root,'release-metadata.json'),JSON.stringify({gitSha:sha,releaseId:release}));
 await writeFile(path.join(root,'asset-manifest.json'),JSON.stringify({files:{js:'/static/js/1.js',map:'/static/js/1.js.map'}}));
 await writeFile(path.join(root,'static/js/1.js'),'immutable reporting test');
 await writeFile(path.join(root,'static/js/1.js.map'),JSON.stringify({file:'static/js/1.js',sources:['pages/SearchConsolePage.tsx','components/search-console/ReportCoverage.tsx','api/searchConsole.ts']}));
 return root;
}
test('discovers all reporting roles from identity-bound manifest source maps',async()=>{
 const root=await fixture();try{const result=await searchConsoleAssets(root,sha,release);assert.equal(result.assets.length,1);assert.deepEqual(result.assets[0].roles,['page','coverage','api']);assert.match(result.assets[0].sha256,/^[a-f0-9]{64}$/);}finally{await cleanup(root);}
});
test('rejects an artifact from another source/release',async()=>{
 const root=await fixture();try{await assert.rejects(searchConsoleAssets(root,'b'.repeat(40),release));await writeFile(path.join(root,'release-metadata.json'),'{}');await assert.rejects(searchConsoleAssets(root,sha,release));}finally{await cleanup(root);}
});
test('rejects missing roles and unregistered/traversing mapped bundles',async()=>{
 const root=await fixture();try{
  await writeFile(path.join(root,'static/js/1.js.map'),JSON.stringify({file:'static/js/1.js',sources:['pages/SearchConsolePage.tsx']}));await assert.rejects(searchConsoleAssets(root,sha,release));
  await writeFile(path.join(root,'static/js/1.js.map'),JSON.stringify({file:'../escape.js',sources:['pages/SearchConsolePage.tsx','components/search-console/ReportCoverage.tsx','api/searchConsole.ts']}));await assert.rejects(searchConsoleAssets(root,sha,release));
 }finally{await cleanup(root);}
});
