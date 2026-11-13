import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadBudgetEditorial,reviseBudgetEditorial} from '../budget-editorial.mjs';
const require=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
const postcss=require('postcss');

test('the budget revision binds the immutable published capture and tracked editorial source',async()=>{
 const revision=await loadBudgetEditorial();
 assert.equal(revision.key,'post-wheres-the-cheap-places-to-drink-in-krakow');
 assert.equal(revision.reviewedOn,'2026-11-13');
 assert.equal(revision.sourceSha256,'b8b4c727c03826406a45676f62861ffbc3c02549e9bfc7c3e106cde983cf982f');
 assert.ok(revision.markup.includes('data-ktk-original-photo="4"'));
});
test('other pages, including the medical hold and the separately reviewed nightlife pages, remain untouched',()=>{
 for(const key of ['post-hostel-hangover-cure','krakow-nightlife','post-2020-krakow-nightlife-guide','toString',''])assert.deepEqual(reviseBudgetEditorial({key}),[]);
});
test('missing or stale review identity fails before any DOM access',async()=>{
 const original=await loadBudgetEditorial();
 for(const revision of [undefined,{}, {...original,key:'other'}, {...original,sourceSha256:'0'.repeat(64)}, {...original,reviewedOn:'2020-01-01'}])assert.throws(()=>reviseBudgetEditorial({key:original.key,revision}),/source identity/);
});
test('floating-tab clearance is narrow and article-scoped, not hidden or a changed global layout',async()=>{
 const root=postcss.parse(await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'));
 const rules=[];root.walkRules(rule=>{if(rule.selector.includes('body[data-ktk-page="post-wheres-the-cheap-places-to-drink-in-krakow"]'))rules.push(rule);});
 assert.equal(rules.length,1);assert.equal(rules[0].parent.name,'media');assert.equal(rules[0].parent.params,'(max-width: 600px)');
 assert.deepEqual(rules[0].selectors,['body[data-ktk-page="post-wheres-the-cheap-places-to-drink-in-krakow"] #post-6189 > .et_post_meta_wrapper:first-child','body[data-ktk-page="post-wheres-the-cheap-places-to-drink-in-krakow"] .et_pb_text_0 .et_pb_text_inner']);
 assert.deepEqual(rules[0].nodes.map(node=>[node.prop,node.value]),[['padding-right','16px']]);
});
