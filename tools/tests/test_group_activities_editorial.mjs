import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadGroupActivitiesEditorial,reviseGroupActivitiesEditorial,buildGroupActivityStyles} from '../group-activities-editorial.mjs';

test('seven source-bound activity modules use quote-specific arrangements',async()=>{
 const rows=await loadGroupActivitiesEditorial();assert.deepEqual(rows.map(r=>r.key),['krakow-stag-do','krakow-hen-do']);
 for(const [i,r]of rows.entries()){
  assert.equal(r.version,'2026-11-14.group-activities-1');assert.equal((r.markup.match(/<template /g)||[]).length,i?1:6);
  assert.ok(r.markup.includes('individual quote'));assert.ok(!/utm_|gclid|minimum of \d|\d+%|PLN|guaranteeing|safe venues/.test(r.markup));
  assert.ok(!/\b(?:15|30|200)\b|3x8|free beer/.test(r.markup));
 }
 assert.equal((rows[0].markup.match(/<a /g)||[]).length,1);assert.ok(rows[0].markup.includes('https://www.gov.uk/foreign-travel-advice/poland/safety-and-security'));
 assert.equal((rows[1].markup.match(/<li>/g)||[]).length,6);
});
test('unrelated and medically held pages are untouched before DOM access',()=>{
 for(const key of ['post-hostel-hangover-cure','student-trips-poland','new-years-eve','contact','__proto__',''])assert.deepEqual(reviseGroupActivitiesEditorial({key}),[]);
});
test('unreviewed activity identities fail before DOM access',async()=>{
 for(const r of await loadGroupActivitiesEditorial())for(const revision of [undefined,{}, {...r,key:'other'},{...r,sourceSha256:'0'.repeat(64)},{...r,sourceHtml:null},{...r,markup:null},{...r,reviewedOn:'2027-01-01'},{...r,version:'other'}])assert.throws(()=>reviseGroupActivitiesEditorial({key:r.key,revision}),/identity/);
});
test('reviewed mobile clearance is bounded and idempotent',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-activity-style-'));try{const file=path.join(dir,'runtime.css'),before='/* prefix */\n',after='/* BEGIN Stag costume guide */\n/* suffix */';await writeFile(file,before+after);await buildGroupActivityStyles(file);const result=await readFile(file,'utf8');assert.ok(result.startsWith(before));assert.ok(result.endsWith(after));assert.ok(result.includes('padding-right: 24px;'));assert.ok(!/display:|visibility:|opacity:|position:/.test(result));await buildGroupActivityStyles(file);assert.equal(await readFile(file,'utf8'),result);}finally{await rm(dir,{recursive:true,force:true});}
});
test('style drift fails without writes',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-activity-style-'));try{for(const [i,text]of ['plain','/* BEGIN Stag costume guide */'.repeat(2),'/* BEGIN Group activity clarity */\n/* BEGIN Stag costume guide */','/* END Group activity clarity */\n/* BEGIN Stag costume guide */'].entries()){const file=path.join(dir,i+'.css');await writeFile(file,text);await assert.rejects(()=>buildGroupActivityStyles(file));assert.equal(await readFile(file,'utf8'),text);}}finally{await rm(dir,{recursive:true,force:true});}
});
test('only the exact earlier local block upgrades to intrinsic row sizing',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-activity-style-'));try{const file=path.join(dir,'runtime.css');await writeFile(file,'/* BEGIN Stag costume guide */\n');await buildGroupActivityStyles(file);const complete=await readFile(file,'utf8'),rule='body.ktk-code-page[data-ktk-page="krakow-stag-do"] #main-content .et_pb_row_16:has([data-ktk-group-activity-review]) { max-height: none; }\n';assert.ok(complete.includes(rule));for(const old of ['',rule.replace('max-height: none','height: auto !important')]){await writeFile(file,complete.replace(rule,old));await buildGroupActivityStyles(file);assert.equal(await readFile(file,'utf8'),complete);}const drift=complete.replace('padding-right: 24px','padding-right: 23px');await writeFile(file,drift);await assert.rejects(()=>buildGroupActivityStyles(file));assert.equal(await readFile(file,'utf8'),drift);}finally{await rm(dir,{recursive:true,force:true});}
});
