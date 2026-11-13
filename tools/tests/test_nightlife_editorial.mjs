import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadNightlifeEditorial,reviseNightlifeEditorial} from '../nightlife-editorial.mjs';
const require=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
const postcss=require('postcss');

test('the current source-bound hub review loads from tracked editorial HTML',async()=>{
 const revision=await loadNightlifeEditorial();
 assert.equal(revision.key,'krakow-nightlife');assert.equal(revision.reviewedOn,'2026-11-13');
 assert.equal(revision.sourceSha256,'e83fbda3b261310970c1b2755f11237de8ff9e10b8df328c18d5dcdf193a081e');
 assert.equal((revision.markup.match(/<template /g)||[]).length,9);
});
test('unrelated pages and the medical hold do not even access a DOM',()=>{
 for(const key of ['post-hostel-hangover-cure','post-krakow-nightclubs','toString',''])assert.deepEqual(reviseNightlifeEditorial({key}),[]);
});
test('missing or stale source identity is rejected before accessing a DOM',async()=>{
 const original=await loadNightlifeEditorial();
 for(const revision of [undefined,{}, {...original,key:'other'}, {...original,sourceSha256:'0'.repeat(64)}, {...original,reviewedOn:'2020-01-01'}])assert.throws(()=>reviseNightlifeEditorial({key:'krakow-nightlife',revision}),/source identity/);
});
test('archived Instagram fallback rules are narrow, page-scoped and do not hide content',async()=>{
 const root=postcss.parse(await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'));
 const rules=[];root.walkRules(rule=>{if(rule.selector.includes('body[data-ktk-page="post-2020-krakow-nightlife-guide"]'))rules.push(rule);});
 assert.equal(rules.length,4);
 for(const rule of rules){
  assert.equal(rule.parent.type,'atrule');assert.equal(rule.parent.name,'media');assert.equal(rule.parent.params,'(max-width: 600px)');
  assert.ok(rule.selectors.every(selector=>selector.startsWith('body[data-ktk-page="post-2020-krakow-nightlife-guide"] blockquote:is(.instagram-media,.instagram-media-registered)')));
  rule.walkDecls(decl=>assert.ok(!['display','visibility','opacity','height','max-height'].includes(decl.prop)&&!(decl.prop==='overflow'&&decl.value==='hidden')));
 }
});
