import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {loadMemorialEditorial,reviseMemorialEditorial,buildMemorialStyles} from '../memorial-editorial.mjs';
test('Memorial recipe binds exact capture, retained photo and all12 templates',async()=>{
 const r=await loadMemorialEditorial();assert.equal(r.key,'post-all-you-need-to-know-about-visiting-auschwitz');
 assert.equal(r.reviewedOn,'2026-11-14');assert.equal(r.version,'2026-11-14.memorial-1');assert.equal((r.markup.match(/<template /g)||[]).length,12);
 assert.equal((r.markup.match(/<h2 id=/g)||[]).length,11);assert.ok(r.markup.includes('personalized entry pass'));assert.ok(r.markup.includes('35 x 25 x 15 cm'));
 assert.ok(!/55-60|150-250|8-10zl|ripped off|drink or two|disgusting/.test(r.markup));
 assert.ok(!/fareharbor|discovercracow|utm_|store2|2027/.test(r.markup));
});
test('other routes, medical hold and prototype keys are untouched before DOM access',()=>{
 for(const key of ['post-hostel-hangover-cure','about-us','toString','__proto__',''])assert.deepEqual(reviseMemorialEditorial({key}),[]);
});
test('changed source/review identities fail before DOM access',async()=>{
 const r=await loadMemorialEditorial();for(const revision of [undefined,{}, {...r,key:'other'},{...r,version:'other'},{...r,reviewedOn:'2025-01-01'},{...r,sourceSha256:'0'.repeat(64)},{...r,sourceHtml:null},{...r,markup:null}])assert.throws(()=>reviseMemorialEditorial({key:r.key,revision}),/source identity/);
});
test('narrow guide-only mobile clearance preserves original runtime styles idempotently',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-memorial-'));
 try{
  const file=path.join(directory,'runtime.css'),original='/* original runtime */\na{color:white}\n';await writeFile(file,original);await buildMemorialStyles(file);
  const generated=await readFile(file,'utf8');assert.ok(generated.endsWith(original));assert.ok(generated.includes('@media (max-width: 600px)'));assert.ok(generated.includes('body.ktk-code-page[data-ktk-page="post-all-you-need-to-know-about-visiting-auschwitz"] #main-content [data-ktk-memorial-review]'));
  assert.ok(generated.includes('padding-right: 24px;'));assert.ok(!/display:|visibility:|opacity:/.test(generated));await buildMemorialStyles(file);assert.equal(await readFile(file,'utf8'),generated);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('ambiguous style markers fail before rewriting',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-memorial-'));
 try{for(const [i,source]of ['/* BEGIN Memorial visitor guide */','/* END Memorial visitor guide */','prefix\n/* BEGIN Memorial visitor guide *//* END Memorial visitor guide */','/* END Memorial visitor guide *//* BEGIN Memorial visitor guide */'].entries()){
  const file=path.join(directory,i+'.css');await writeFile(file,source);await assert.rejects(()=>buildMemorialStyles(file));assert.equal(await readFile(file,'utf8'),source);
 }}finally{await rm(directory,{recursive:true,force:true});}
});
