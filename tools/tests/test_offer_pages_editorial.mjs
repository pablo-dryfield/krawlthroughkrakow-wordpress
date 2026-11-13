import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadOfferPageRevisions,reviseOfferPages} from '../offer-pages-editorial.mjs';
import {loadOfferFacts,offerTemplateValues} from '../site-offer-facts.mjs';
const require=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
const postcss=require('postcss');

test('three offer pages bind exact original captures and complete reviewed templates',async()=>{
 const rows=await loadOfferPageRevisions();assert.deepEqual(rows.map(r=>r.key),['how-to-join','meeting-point','faqs']);
 assert.deepEqual(rows.map(r=>(r.markup.match(/<template /g)||[]).length),[3,1,15]);
 const values=offerTemplateValues(await loadOfferFacts());
 for(const row of rows){
  assert.equal(row.reviewedOn,'2026-11-13');assert.equal(row.version,'2026-11-13.offer-pages-1');assert.match(row.sourceSha256,/^[a-f0-9]{64}$/);
  assert.ok(!row.markup.includes('{{'));assert.ok(row.markup.includes('9 PM'));assert.ok(row.markup.includes('__KTK_HOME_URL__store2/pub-crawl-28/#book'));
  assert.equal(new Set(row.reviewLinks.map(u=>new URL(u).hostname)).size,3);
  if(row.key!=='meeting-point')assert.ok(row.markup.includes(values.onlineReturnInstructions.replaceAll("'",'&#039;')));
 }
});

test('unrelated/medical/prototype keys remain untouched before DOM access',()=>{
 for(const key of ['post-hostel-hangover-cure','about-us','toString','__proto__',''])assert.deepEqual(reviseOfferPages({key}),[]);
});

test('stale and malformed identities fail before DOM access',async()=>{
 for(const revision of await loadOfferPageRevisions())for(const bad of [undefined,{}, {...revision,key:'other'},{...revision,version:'unknown'},{...revision,reviewedOn:'2025-01-01'},{...revision,sourceSha256:'0'.repeat(64)},{...revision,sourceHtml:null},{...revision,markup:null},{...revision,reviewLinks:[]}])assert.throws(()=>reviseOfferPages({key:revision.key,revision:bad}),/source identity/);
});

test('mobile clearance is restricted to reviewed copy on the three companion pages',async()=>{
 const root=postcss.parse(await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8')),rules=[];
 root.walkRules(rule=>{if(rule.selector.endsWith('[data-ktk-offer-copy]'))rules.push(rule);});
 assert.equal(rules.length,1);assert.equal(rules[0].parent.params,'(max-width: 600px)');
 assert.equal(rules[0].selector,'body.ktk-code-page:is([data-ktk-page="how-to-join"],[data-ktk-page="meeting-point"],[data-ktk-page="faqs"]) #main-content [data-ktk-offer-copy]');
 assert.deepEqual(rules[0].nodes.map(n=>[n.prop,n.value]),[['padding-right','24px']]);
});

test('new body links use existing accessible light/promo colours without changing CTA buttons',async()=>{
 const root=postcss.parse(await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8')),rules=[];
 root.walkRules(rule=>{if(rule.selector.endsWith('[data-ktk-offer-copy] a'))rules.push(rule);});assert.equal(rules.length,2);
 assert.deepEqual(rules[0].nodes.map(n=>[n.prop,n.value]),[['color','#c8006c'],['text-decoration','underline'],['text-underline-offset','.15em']]);
 assert.deepEqual(rules[1].nodes.map(n=>[n.prop,n.value]),[['color','#fff']]);assert.ok(rules[1].selector.includes('[data-ktk-page="how-to-join"] #main-content .et_pb_promo'));
});
