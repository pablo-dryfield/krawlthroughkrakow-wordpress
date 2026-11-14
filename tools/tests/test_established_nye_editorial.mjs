import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadEstablishedNyeEditorial,reviseEstablishedNyeEditorial,buildEstablishedNyeStyles} from '../established-nye-editorial.mjs';
test('five source-bound sections preserve original topics and checked native destinations',async()=>{
 const r=await loadEstablishedNyeEditorial();assert.equal(r.key,'post-krakow-new-years-eve');assert.equal(r.version,'2026-11-14.established-nye-1');assert.equal((r.markup.match(/<template /g)||[]).length,5);
 assert.equal((r.markup.match(/<h[12]>/g)||[]).length,6);assert.ok(r.markup.includes('Beers, endless bars, markets and more:'));assert.ok(r.markup.includes('Check current lift-pass prices'));
 for(const value of ['opera.krakow.pl/en/repertoire','mpk.krakow.pl/en/timetables','kiermasze.com.pl/','bialkatatrzanska.pl/en/resort-map/','pkl.pl/kasprowy-wierch/koleje-i-trasy.html?setlang=2','__KTK_HOME_URL__new-years-eve/'])assert.ok(r.markup.includes(value));
 assert.ok(!/store2|utm_|gclid|17 kilometres|less than two hours|unlimited drinking hours|USSR|2027/.test(r.markup));
});
test('other routes and explicit medical hold return unchanged before DOM access',()=>{
 for(const key of ['post-hostel-hangover-cure','new-years-eve','post-new-years-eve-in-krakow','__proto__',''])assert.deepEqual(reviseEstablishedNyeEditorial({key}),[]);
});
test('unreviewed source identities fail before DOM access',async()=>{
 const r=await loadEstablishedNyeEditorial();for(const revision of [undefined,{}, {...r,key:'other'},{...r,version:'other'},{...r,sourceSha256:'0'.repeat(64)},{...r,sourceHtml:null},{...r,markup:null},{...r,reviewedOn:'2027-01-01'}])assert.throws(()=>reviseEstablishedNyeEditorial({key:r.key,revision}),/identity/);
});
test('scoped mobile/link styles keep original cascade and Contact adjacency exact',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-established-nye-'));
 try{
  const file=path.join(directory,'runtime.css'),anchor='/* BEGIN Contact details */',before='/* original prefix */\n',after='\n/* original Contact rules */';await writeFile(file,before+anchor+after);await buildEstablishedNyeStyles(file);const result=await readFile(file,'utf8');
  assert.ok(result.startsWith(before));assert.ok(result.endsWith(anchor+after));assert.ok(result.includes('@media (max-width: 600px)'));assert.ok(result.includes('padding-right: 24px;'));assert.ok(result.includes('color: #c8006c;'));assert.ok(!/display:|visibility:|opacity:|position:|font-size:/.test(result));
  await buildEstablishedNyeStyles(file);assert.equal(await readFile(file,'utf8'),result);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('missing/duplicate/modified style anchors fail before rewrites',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-established-nye-'));
 try{for(const [i,source]of ['plain original','/* BEGIN Contact details */'.repeat(2),'/* BEGIN Established NYE guide */\n/* BEGIN Contact details */','/* END Established NYE guide */\n/* BEGIN Contact details */'].entries()){
  const file=path.join(directory,i+'.css');await writeFile(file,source);await assert.rejects(()=>buildEstablishedNyeStyles(file));assert.equal(await readFile(file,'utf8'),source);
 }}finally{await rm(directory,{recursive:true,force:true});}
});
