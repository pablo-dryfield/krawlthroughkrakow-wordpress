import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadStagCostumeEditorial,reviseStagCostumeEditorial,buildStagCostumeStyles} from '../stag-costume-editorial.mjs';
test('costume recipe binds its capture, nine original-photo slots and native fragment inventory',async()=>{
 const r=await loadStagCostumeEditorial();assert.equal(r.key,'post-stag-do-costume');assert.equal((r.markup.match(/data-ktk-original-photo=/g)||[]).length,9);assert.equal((r.markup.match(/ id=/g)||[]).length,49);assert.equal((r.markup.match(/href="#/g)||[]).length,23);assert.equal((r.markup.match(/<time /g)||[]).length,1);assert.equal((r.markup.match(/<details>/g)||[]).length,1);assert.ok(r.markup.includes('__KTK_HOME_URL__krakow-stag-do/'));assert.ok(r.markup.includes('a theme is not a promise of admission'));assert.ok(!/Spartan|Lady Boy Laughs|boozy|gimp suit|utm_|gclid|praguestagweekend|store2/.test(r.markup));
});
test('other routes and explicit medical hold return before DOM access',()=>{for(const key of ['post-hostel-hangover-cure','krakow-stag-do','post-stag-pranks','__proto__',''])assert.deepEqual(reviseStagCostumeEditorial({key}),[]);});
test('unreviewed costume identity is rejected before DOM access',async()=>{const r=await loadStagCostumeEditorial();for(const revision of [undefined,{}, {...r,key:'other'},{...r,sourceSha256:'0'.repeat(64)},{...r,sourceHtml:null},{...r,markup:null},{...r,version:'other'},{...r,reviewedOn:'2027-01-01'}])assert.throws(()=>reviseStagCostumeEditorial({key:r.key,revision}),/identity/);});
test('scoped costume styles are additive and idempotent, without hiding article content',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-costume-'));try{const file=path.join(directory,'runtime.css'),before='/* old prefix */\n',after='/* BEGIN Group planning */\n/* old suffix */';await writeFile(file,before+after);await buildStagCostumeStyles(file);const result=await readFile(file,'utf8');assert.ok(result.startsWith(before));assert.ok(result.endsWith(after));assert.ok(result.includes('padding-right: 24px;'));assert.ok(result.includes(':is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }'));assert.ok(!/display:|visibility:|opacity:|position:|[0-9]vw/.test(result));for(const rule of ['font-size: 16px; line-height: 1.65; letter-spacing: 0;','h2 { font-size: 22px; }','h3 { font-size: 18px; }','h4 { font-size: 16px; }'])assert.ok(result.includes(rule));await buildStagCostumeStyles(file);assert.equal(await readFile(file,'utf8'),result);
 const focused=result.split('\n').filter(line=>!line.includes('font-size:')&&!line.includes(':is(h2,h3,h4)')).join('\n');assert.notEqual(focused,result);await writeFile(file,focused);await buildStagCostumeStyles(file);assert.equal(await readFile(file,'utf8'),result);
 const initial=focused.replace(/^body[^\n]+:is\(summary,a\):focus-visible[^\n]+\n/m,'');assert.notEqual(initial,focused);await writeFile(file,initial);await buildStagCostumeStyles(file);assert.equal(await readFile(file,'utf8'),result);
 const drift=result.replace('font-size: 22px;','font-size: 99px;');await writeFile(file,drift);await assert.rejects(()=>buildStagCostumeStyles(file));assert.equal(await readFile(file,'utf8'),drift);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('unknown or malformed costume style boundaries cannot be rewritten',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-costume-'));try{for(const [i,value]of ['plain','/* BEGIN Group planning */'.repeat(2),'/* BEGIN Stag costume guide */\n/* BEGIN Group planning */','/* END Stag costume guide */\n/* BEGIN Group planning */'].entries()){const file=path.join(directory,i+'.css');await writeFile(file,value);await assert.rejects(()=>buildStagCostumeStyles(file));assert.equal(await readFile(file,'utf8'),value);}}finally{await rm(directory,{recursive:true,force:true});}
});
