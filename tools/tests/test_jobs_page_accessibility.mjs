import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadJobsPageAccessibility,reviseJobsPageAccessibility,buildJobsPageAccessibilityStyles} from '../jobs-page-accessibility.mjs';
test('Jobs recipe pins its original source and excludes every other page',async()=>{
 const r=await loadJobsPageAccessibility();assert.equal(r.key,'pub-crawl-jobs');assert.equal(r.sourceSha256,'a228d14bb3c9f6d9a1f39db3dcdf50b0b5347444d02c2bb1235bd9239341e916');assert.ok(r.sourceHtml.includes('main-content'));
 for(const key of ['contact','post-hostel-hangover-cure','competition','blog','store','store2','unknown'])assert.deepEqual(reviseJobsPageAccessibility({key,revision:null}),[]);
 assert.throws(()=>reviseJobsPageAccessibility({key:r.key,revision:{...r,version:'changed'}}),/identity/);
});
async function temporary(run){const directory=await mkdtemp(path.join(tmpdir(),'ktk-jobs-style-'));try{await run(path.join(directory,'runtime.css'));}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-jobs-style-'));await rm(directory,{recursive:true,force:true});}}
test('page-only CSS preserves every old byte and is idempotent at the reviewed embed boundary',async()=>{
 await temporary(async file=>{const css=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'),pattern=/\/\* BEGIN Jobs page accessibility \*\/[\s\S]*?\/\* END Jobs page accessibility \*\/\n/g,base=css.replace(pattern,'');await writeFile(file,base);await buildJobsPageAccessibilityStyles(file);const once=await readFile(file,'utf8'),blocks=once.match(pattern);assert.equal(blocks.length,1);assert.equal(once.replace(pattern,''),base);assert.ok(once.includes('/* END Withheld embed alternatives */\n'+blocks[0]));await buildJobsPageAccessibilityStyles(file);assert.equal(await readFile(file,'utf8'),once);});
});
test('missing, duplicate, partial and drifted boundaries fail without writing',async()=>{
 await temporary(async file=>{const base='/* old styles */\n/* END Withheld embed alternatives */\n/* following styles */\n';await writeFile(file,base);await buildJobsPageAccessibilityStyles(file);const once=await readFile(file,'utf8');for(const css of [base.replace('/* END Withheld embed alternatives */','missing'),base+'/* END Withheld embed alternatives */\n',once.replace('/* END Jobs page accessibility */','missing'),once+'/* BEGIN Jobs page accessibility */',once.replace('line-height: 1.25','line-height: 1')]){await writeFile(file,css);await assert.rejects(()=>buildJobsPageAccessibilityStyles(file));assert.equal(await readFile(file,'utf8'),css);}});
});
