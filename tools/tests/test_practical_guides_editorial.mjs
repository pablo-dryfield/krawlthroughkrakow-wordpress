import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadPracticalGuidesEditorial,revisePracticalGuidesEditorial,buildPracticalGuideStyles} from '../practical-guides-editorial.mjs';

test('three practical templates bind immutable sources and preserve ordered photo slots',async()=>{
 const rows=await loadPracticalGuidesEditorial();assert.equal(rows.length,3);
 for(const [i,r]of rows.entries()){
  assert.equal(r.version,'2026-11-14.practical-guides-1');assert.equal((r.markup.match(/data-ktk-original-photo=/g)||[]).length,i?5:6);
  assert.equal((r.markup.match(/<nav /g)||[]).length,1);assert.equal((r.markup.match(/<details>/g)||[]).length,1);
  assert.equal((r.markup.match(/<time /g)||[]).length,1);assert.ok(!/\{\{|docs\.google|utm_|gclid|store2|nasal strips|mouth guards|sleep positioners|10-20 people|guarantees laughter/i.test(r.markup));
  assert.ok(r.markup.split(/\s+/).length>1100);
 }
 assert.ok(rows[0].markup.includes('Do not stage a surprise kidnapping'));
 assert.ok(rows[1].markup.includes('not a treatment for snoring'));
 assert.ok(rows[2].markup.includes('not a statement of Polish law'));
});
test('all non-target routes and the medical hold remain untouched before DOM access',()=>{
 for(const key of ['post-hostel-hangover-cure','new-years-eve','krakow-stag-do','contact','__proto__','constructor',''])assert.deepEqual(revisePracticalGuidesEditorial({key}),[]);
});
test('unreviewed identities fail before DOM access',async()=>{
 for(const r of await loadPracticalGuidesEditorial())for(const revision of [undefined,{}, {...r,key:'other'},{...r,sourceSha256:'0'.repeat(64)},{...r,sourceHtml:null},{...r,markup:null},{...r,reviewedOn:'2027-01-01'},{...r,version:'other'}])assert.throws(()=>revisePracticalGuidesEditorial({key:r.key,revision}),/identity/);
});
test('readable typography, focus and mobile clearance are additive and repeatable',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-practical-style-'));try{const file=path.join(dir,'runtime.css'),before='/* prefix */\n',after='/* BEGIN Group activity clarity */\n/* suffix */';await writeFile(file,before+after);await buildPracticalGuideStyles(file);const result=await readFile(file,'utf8');assert.ok(result.startsWith(before));assert.ok(result.endsWith(after));for(const value of ['font-size: 16px; line-height: 1.65; letter-spacing: 0;','h2 { font-size: 22px; }','h3 { font-size: 18px; }','h4 { font-size: 16px; }','padding-right: 24px;','outline: 2px solid currentColor','min-height: 44px'])assert.ok(result.includes(value));assert.ok(!/display:|visibility:|opacity:|position:|[0-9]vw|hostel-hangover-cure/.test(result));await buildPracticalGuideStyles(file);assert.equal(await readFile(file,'utf8'),result);}finally{await rm(dir,{recursive:true,force:true});}
});
test('unknown or malformed style blocks fail without writes',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-practical-style-'));try{for(const [i,value]of ['plain','/* BEGIN Group activity clarity */'.repeat(2),'/* BEGIN Practical party guides */\n/* BEGIN Group activity clarity */','/* END Practical party guides */\n/* BEGIN Group activity clarity */'].entries()){const file=path.join(dir,i+'.css');await writeFile(file,value);await assert.rejects(()=>buildPracticalGuideStyles(file));assert.equal(await readFile(file,'utf8'),value);}}finally{await rm(dir,{recursive:true,force:true});}
});
