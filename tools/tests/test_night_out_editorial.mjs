import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadNightOutEditorial,reviseNightOutEditorial,buildNightOutStyles} from '../night-out-editorial.mjs';

test('two immutable module recipes retain local urgent-help signposting and native contents',async()=>{
 const rows=await loadNightOutEditorial();assert.equal(rows.length,2);
 for(const [i,r]of rows.entries()){
  assert.equal(r.version,'2026-11-14.night-out-1');assert.equal((r.markup.match(/<h2 /g)||[]).length,i?6:8);
  for(const s of ['<nav aria-label=','<details><summary','href="tel:112"','https://www.nhs.uk/conditions/alcohol-poisoning/','https://www.gov.pl/web/mswia-en/emergency-number-112','https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/understanding-dangers-of-alcohol-overdose'])assert.ok(r.markup.includes(s));
  assert.ok(!/tel:999|tel:911|utm_|gclid|store2|doctor-reviewed|medically reviewed|power hour|scientifically proven fact|shot of Zubrowka/.test(r.markup));
 }
 assert.ok(rows[1].markup.includes('not a medical scale'));
});
test('other routes and the specialist hold are untouched before DOM access',()=>{
 for(const key of ['post-hostel-hangover-cure','post-stag-pranks','contact','__proto__','constructor',''])assert.deepEqual(reviseNightOutEditorial({key}),[]);
});
test('invalid review identity rejects before DOM access',async()=>{
 for(const r of await loadNightOutEditorial())for(const revision of [undefined,{}, {...r,key:'other'},{...r,sourceSha256:'0'.repeat(64)},{...r,sourceHtml:null},{...r,markup:null},{...r,reviewedOn:'2027-01-01'},{...r,version:'other'}])assert.throws(()=>reviseNightOutEditorial({key:r.key,revision}),/identity/);
});
test('scoped readable style insertion is exact and idempotent',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-night-out-'));try{const file=path.join(dir,'runtime.css'),before='/* prefix */\n',after='/* BEGIN Practical party guides */\n/* suffix */';await writeFile(file,before+after);await buildNightOutStyles(file);const result=await readFile(file,'utf8');assert.ok(result.startsWith(before)&&result.endsWith(after));for(const value of ['font-size: 16px; line-height: 1.65; letter-spacing: 0;','font-size: 22px;','padding-right: 24px;','outline: 2px solid currentColor','min-height: 44px'])assert.ok(result.includes(value));assert.ok(!/display:|visibility:|opacity:|position:|[0-9]vw|hostel-hangover-cure/.test(result));await buildNightOutStyles(file);assert.equal(await readFile(file,'utf8'),result);}finally{await rm(dir,{recursive:true,force:true});}
});
test('style drift fails without rewriting unknown code',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-night-out-'));try{for(const [i,value]of ['plain','/* BEGIN Practical party guides */'.repeat(2),'/* BEGIN Practical night-out guidance */\n/* BEGIN Practical party guides */','/* END Practical night-out guidance */\n/* BEGIN Practical party guides */'].entries()){const file=path.join(dir,i+'.css');await writeFile(file,value);await assert.rejects(()=>buildNightOutStyles(file));assert.equal(await readFile(file,'utf8'),value);}}finally{await rm(dir,{recursive:true,force:true});}
});
test('only the exact unreleased justified prototype can migrate to left alignment',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-night-out-upgrade-'));try{const file=path.join(dir,'runtime.css');await writeFile(file,'/* BEGIN Practical party guides */\n/* suffix */');await buildNightOutStyles(file);const expected=await readFile(file,'utf8');assert.ok(expected.includes('text-align: left;'));await writeFile(file,expected.replace('letter-spacing: 0; text-align: left;','letter-spacing: 0;'));await buildNightOutStyles(file);assert.equal(await readFile(file,'utf8'),expected);const changed=expected.replace('min-height: 44px;','min-height: 45px;');await writeFile(file,changed);await assert.rejects(()=>buildNightOutStyles(file));assert.equal(await readFile(file,'utf8'),changed);}finally{await rm(dir,{recursive:true,force:true});}
});
