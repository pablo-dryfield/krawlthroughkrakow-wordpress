import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadJazzEditorial,reviseJazzEditorial} from '../jazz-editorial.mjs';
const require=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
const postcss=require('postcss');

test('jazz corrections bind the exact original capture and eight scoped text edits',async()=>{
 const revision=await loadJazzEditorial();
 assert.equal(revision.key,'post-jazz-bars-in-krakow');
 assert.equal(revision.sourceSha256,'64a6ab3ac4e3b25e71f6d97f1aafdb90b64e2760d5b116454e35f1b04ecebb1c');
 assert.equal(revision.edits.length,8);
 assert.ok(revision.edits.every(edit=>edit.expectedText&&edit.markup));
 assert.ok(revision.edits[0].markup.includes('Main Square'));
 assert.ok(revision.edits.some(edit=>edit.markup.includes('January 1997')));
});
test('unrelated pages and the medical hold stay untouched',()=>{
 for(const key of ['krakow-nightlife','post-krakow-techno-clubs','post-hostel-hangover-cure',''])assert.deepEqual(reviseJazzEditorial({key}),[]);
});
test('missing or stale source identity fails before DOM access',async()=>{
 const original=await loadJazzEditorial();
 for(const revision of [undefined,{}, {...original,key:'other'}, {...original,sourceSha256:'0'.repeat(64)}, {...original,reviewedOn:'2020-01-01'}])assert.throws(()=>reviseJazzEditorial({key:original.key,revision}),/source identity/);
});
test('mobile clearance is jazz-only and retains the visible booking control',async()=>{
 const root=postcss.parse(await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'));
 const rules=[];root.walkRules(rule=>{if(rule.selector.includes('body[data-ktk-page="post-jazz-bars-in-krakow"]'))rules.push(rule);});
 assert.equal(rules.length,1);assert.equal(rules[0].parent.name,'media');assert.equal(rules[0].parent.params,'(max-width: 600px)');
 assert.deepEqual(rules[0].selectors,['body[data-ktk-page="post-jazz-bars-in-krakow"] #post-6169 > .et_post_meta_wrapper:first-child','body[data-ktk-page="post-jazz-bars-in-krakow"] #post-6169 > .entry-content']);
 assert.deepEqual(rules[0].nodes.map(node=>[node.prop,node.value]),[['padding-right','16px']]);
});
