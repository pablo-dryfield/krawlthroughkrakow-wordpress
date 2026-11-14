import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadSafetyGuidesEditorial,reviseSafetyGuidesEditorial,buildSafetyGuidesStyles} from '../safety-guides-editorial.mjs';

test('two immutable safety sources and review identities are bound',async()=>{
 const rows=await loadSafetyGuidesEditorial();assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.key),['post-is-krakow-safe-for-stag','post-krakow-safety-guide']);
 for(const r of rows){assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'),r.sourceSha256);assert.equal(r.version,'2026-11-14.safety-guides-1');assert.equal(r.reviewedOn,'2026-11-14');}
});
test('the prior nineteen-summary cohort, all forty captures and neutral photo remain exact',async()=>{
 const catalog=JSON.parse(await readFile(new URL('../reviewed-article-presentation.json',import.meta.url),'utf8')),added=new Set(['post-is-krakow-safe-for-stag','post-krakow-safety-guide']),later=new Set(['post-party-krakow','post-six-reasons-you-need-to-party-with-the-krawl-through-krakow','post-best-drinking-games','post-krakow-free-activities-2','post-krakow-budget-activities','post-krakow-money-saving-tips']),original={articles:catalog.articles.filter(a=>!added.has(a.key)&&!later.has(a.key)),containers:catalog.containers.map(c=>({...c,cardKeys:c.cardKeys.filter(key=>!added.has(key)&&!later.has(key))})),photo:catalog.photo,assetManifestSha256:catalog.assetManifestSha256};assert.equal(original.articles.length,19);assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'),'d15045b7cd99502e613ba23ccc351943e5d70dc17ad384ff5e7826158feaa5fc');assert.equal(catalog.articles.length,27);assert.equal(catalog.containers.reduce((n,c)=>n+c.cardKeys.length,0),103);assert.equal(catalog.containers.reduce((n,c)=>n+c.cardKeys.filter(k=>added.has(k)).length,0),6);assert.equal(catalog.containers.reduce((n,c)=>n+c.cardKeys.filter(k=>!later.has(k)).length,0),71);
});
test('complete native contents and ordered original-photo slots are explicit',async()=>{
 for(const [i,r]of (await loadSafetyGuidesEditorial()).entries()){
  assert.equal((r.markup.match(/<h[23] /g)||[]).length,i?17:18);assert.equal((r.markup.match(/<template data-ktk-original-photo=/g)||[]).length,i?3:6);assert.equal((r.markup.match(/<time /g)||[]).length,1);assert.ok(r.markup.includes('<summary id="main-toc">Contents</summary>'));assert.equal((r.markup.match(/href="tel:112"/g)||[]).length,1);
 }
});
test('only shared age facts are expanded and no unsupported packages or promises recur',async()=>{
 for(const r of await loadSafetyGuidesEditorial()){
  assert.ok(r.markup.includes('aged 18 and over'));assert.ok(!/[{}]/.test(r.markup));assert.ok(r.markup.includes('https://www.gov.pl/web/numer-alarmowy-112/numeralarmowy112'));
  for(const value of ['utm_','gclid','gbraid','wbraid','store2','fareharbor','ecwid','World Nomads','COVID-19','11 million','no difficulties whatsoever','only bring cash','strippers or staged arrests','Dwarf Arrest','Kidnapping Prank','tel:911','tel:999'])assert.ok(!r.markup.includes(value),value);
 }
});
test('unrelated routes, inherited names and specialist hold return before DOM access',()=>{
 for(const key of ['post-hostel-hangover-cure','post-stag-pranks','archive-author-dpbowman','blog','home','contact','__proto__','constructor','',null,undefined])assert.deepEqual(reviseSafetyGuidesEditorial({key}),[]);
});
test('missing or stale configured identities reject before DOM access',async()=>{
 for(const r of await loadSafetyGuidesEditorial())for(const change of [n=>n.key='contact',n=>n.sourceSha256='0'.repeat(64),n=>n.version='unknown',n=>n.reviewedOn='2027-01-01',n=>delete n.sourceHtml,n=>delete n.markup]){const revision=structuredClone(r);change(revision);assert.throws(()=>reviseSafetyGuidesEditorial({key:r.key,revision}),/identity/);}
});
test('styles are additive, route/marker bounded, idempotent and drift guarded',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-safety-style-'));try{
  const file=path.join(directory,'runtime.css'),original='body { color: black; }\n/* BEGIN Reviewed article summary readability */\n';await writeFile(file,original);await buildSafetyGuidesStyles(file);const css=await readFile(file,'utf8');assert.equal(css.replace(/\/\* BEGIN Practical safety guides \*\/[\s\S]*?\/\* END Practical safety guides \*\/\n\n/,''),original);assert.match(css,/data-ktk-page="post-is-krakow-safe-for-stag"/);assert.match(css,/data-ktk-page="post-krakow-safety-guide"/);assert.match(css,/#main-content \[data-ktk-safety-review\]/);assert.match(css,/font-size: 16px; line-height: 1.65; letter-spacing: 0; text-align: left/);assert.match(css,/min-height: 44px/);assert.match(css,/outline: 2px solid currentColor/);assert.match(css,/padding-right: 24px/);await buildSafetyGuidesStyles(file);assert.equal(await readFile(file,'utf8'),css);
  for(const corrupt of [css.replace('16px','15px'),css.replace('24px','0px'),css+css,css.replace('/* END Practical safety guides */',''),original.replace('Reviewed article','Unknown article')]){await writeFile(file,corrupt);await assert.rejects(()=>buildSafetyGuidesStyles(file));assert.equal(await readFile(file,'utf8'),corrupt);}
 }finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-safety-style-'));await rm(directory,{recursive:true,force:true});}
});
