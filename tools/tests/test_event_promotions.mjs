import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildEventPromotionRuntime,initializeEventPromotions} from '../event-promotion-runtime.mjs';
import {buildNyePromotionStyles} from '../nye-promotion-styles.mjs';
import {prepareNyePromotion} from '../nye-promotion.mjs';
import {loadOfferFacts,campaignTemplateValues,validateOfferFacts} from '../site-offer-facts.mjs';

test('the exact owner-approved noon cutoff is explicit and does not create a new event',async()=>{
 const facts=await loadOfferFacts(),values=campaignTemplateValues(facts);
 assert.equal(facts.nye.promotionEndsAt,'2027-01-01T12:00:00+01:00');assert.equal(values.nyePromotionEndsTimestamp,'1798801200');
 assert.equal(values.nyeDate,'2026-12-31');assert.equal(values.welcomeYear,'2027');
 for(const value of ['2027-01-01T00:00:00+01:00','2027-01-01T12:00:00Z','2027-12-31T12:00:00+01:00',null]){const candidate=structuredClone(facts);candidate.nye.promotionEndsAt=value;assert.throws(()=>validateOfferFacts(candidate));}
});

test('the page policy leaves unrelated keys alone and rejects unknown cutoffs before DOM access',()=>{
 for(const key of ['how-to-join','post-krakow-new-years-eve','__proto__',null])assert.equal(prepareNyePromotion({key}),null);
 for(const key of ['new-years-eve','post-new-years-eve-in-krakow'])for(const campaignFacts of [undefined,{}, {nyeDate:'2026-12-31',nyePromotionEndsTimestamp:'1'}])assert.throws(()=>prepareNyePromotion({key,campaignFacts}),/cutoff/);
});

test('the shared runtime adds one idempotent bounded block without changing original code',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-event-runtime-'));
 try{
  const file=path.join(dir,'runtime.js'),original='(() => { window.originalControl = true; })();\n';await writeFile(file,original);
  await buildEventPromotionRuntime(file);const once=await readFile(file,'utf8');await buildEventPromotionRuntime(file);assert.equal(await readFile(file,'utf8'),once);
  assert.equal(once.slice(0,once.indexOf('/* BEGIN shared event promotion runtime */')).trimEnd()+'\n',original);
  assert.ok(once.includes(initializeEventPromotions.toString()));assert.equal(once.split('/* BEGIN shared event promotion runtime */').length,2);
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|\.cookie|eval\(/.test(initializeEventPromotions.toString()));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('malformed runtime markers stop before any partial rewrite',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-event-runtime-bad-'));
 try{for(const original of ['/* BEGIN shared event promotion runtime */','/* END shared event promotion runtime */','/* END shared event promotion runtime */\n/* BEGIN shared event promotion runtime */','/* BEGIN shared event promotion runtime *//* BEGIN shared event promotion runtime *//* END shared event promotion runtime */']){const file=path.join(dir,'runtime.js');await writeFile(file,original);await assert.rejects(buildEventPromotionRuntime(file));assert.equal(await readFile(file,'utf8'),original);}}finally{await rm(dir,{recursive:true,force:true});}
});

test('future-only notice styles preserve the complete original cascade and build idempotently',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-event-css-'));
 try{
  const file=path.join(dir,'runtime.css'),original='p {color:red;}\n\n/* BEGIN shared content accessibility */\np {line-height:1.5;}\n/* END shared content accessibility */\n';await writeFile(file,original);
  await buildNyePromotionStyles(file);const once=await readFile(file,'utf8');await buildNyePromotionStyles(file);assert.equal(await readFile(file,'utf8'),once);
  assert.equal(once.replace(/\/\* BEGIN NYE promotion state \*\/[^]*?\/\* END NYE promotion state \*\/\n\n/,''),original);
  assert.ok(!/display\s*:\s*none|overflow\s*:\s*hidden|font-size\s*:\s*\d+vw/.test(once));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('missing cascade and ambiguous style markers fail before writing',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-event-css-bad-'));
 try{for(const original of ['p {color:red;}','/* BEGIN NYE promotion state */\n/* BEGIN shared content accessibility */','/* END NYE promotion state *//* BEGIN NYE promotion state *//* BEGIN shared content accessibility */']){const file=path.join(dir,'runtime.css');await writeFile(file,original);await assert.rejects(buildNyePromotionStyles(file));assert.equal(await readFile(file,'utf8'),original);}}finally{await rm(dir,{recursive:true,force:true});}
});
