import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadGroupPlanningEditorial,reviseGroupPlanningEditorial,buildGroupPlanningStyles} from '../group-planning-editorial.mjs';

test('three source-bound group pages use shared facts and their existing enquiry anchors',async()=>{
 const rows=await loadGroupPlanningEditorial();assert.deepEqual(rows.map(r=>r.key),['krakow-stag-do','krakow-hen-do','student-trips-poland']);
 for(const [i,r]of rows.entries()){
  assert.equal((r.markup.match(/<template /g)||[]).length,i===2?9:1);assert.equal((r.markup.match(/<li>/g)||[]).length,4);assert.equal((r.markup.match(/<h2>/g)||[]).length,1);
  assert.ok(r.markup.includes('9 PM'));assert.ok(r.markup.includes('18'));assert.ok(r.markup.includes('valid ID'));assert.ok(!/\{\{|utm_|gclid|store2|24\/7|lowest price|11.000|minimum of \d|\d+%|PLN/.test(r.markup));
  assert.ok(r.markup.includes(['#stag_trip_form','#hen_do_form','#et_pb_contact_form_0'][i]));
 }
});
test('unrelated and medically held pages remain unchanged before DOM access',()=>{
 for(const key of ['post-hostel-hangover-cure','new-years-eve','contact','__proto__',''])assert.deepEqual(reviseGroupPlanningEditorial({key}),[]);
});
test('unreviewed group identities fail before DOM access',async()=>{
 for(const r of await loadGroupPlanningEditorial())for(const revision of [undefined,{}, {...r,key:'other'},{...r,sourceSha256:'0'.repeat(64)},{...r,sourceHtml:null},{...r,markup:null},{...r,reviewedOn:'2027-01-01'},{...r,version:'other'}])assert.throws(()=>reviseGroupPlanningEditorial({key:r.key,revision}),/identity/);
});
test('group styles are bounded, additive and repeatable',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-group-style-'));try{
  const file=path.join(directory,'runtime.css'),before='/* old prefix */\n',after='/* BEGIN Established NYE guide */\n/* old suffix */';await writeFile(file,before+after);await buildGroupPlanningStyles(file);const result=await readFile(file,'utf8');assert.ok(result.startsWith(before));assert.ok(result.endsWith(after));assert.ok(result.includes('font-size: 22px;'));assert.ok(result.includes('padding-right: 24px;'));assert.ok(!/display:|visibility:|opacity:|position:/.test(result));await buildGroupPlanningStyles(file);assert.equal(await readFile(file,'utf8'),result);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('missing, duplicate or altered style boundaries fail without writes',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-group-style-'));try{for(const [i,value]of ['plain','/* BEGIN Established NYE guide */'.repeat(2),'/* BEGIN Group planning */\n/* BEGIN Established NYE guide */','/* END Group planning */\n/* BEGIN Established NYE guide */'].entries()){const file=path.join(directory,i+'.css');await writeFile(file,value);await assert.rejects(()=>buildGroupPlanningStyles(file));assert.equal(await readFile(file,'utf8'),value);}}finally{await rm(directory,{recursive:true,force:true});}
});
