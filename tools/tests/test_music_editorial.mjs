import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadMusicEditorial,reviseMusicEditorial} from '../music-editorial.mjs';
const require=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
const postcss=require('postcss');

test('two music guides bind exact captures, review date and original photo slots',async()=>{
 const revisions=await loadMusicEditorial();
 assert.deepEqual(revisions.map(r=>r.key),['post-jazz-bars-in-krakow','post-krakow-live-music']);
 assert.deepEqual(revisions.map(r=>r.sourceSha256),['64a6ab3ac4e3b25e71f6d97f1aafdb90b64e2760d5b116454e35f1b04ecebb1c','1a28337151e3dd74645f69bb662bc3bddaa59ba41abe0c5f587d4a2e95f9a468']);
 for(const [index,r] of revisions.entries()){
  assert.equal(r.reviewedOn,'2026-11-13');assert.equal(r.version,'2026-11-13.music-1');
  assert.equal((r.markup.match(/<template /g)||[]).length,1);
  assert.ok(r.markup.includes(`data-ktk-original-photo="${index}"`));
  assert.match(r.markup,/not claimed personal visits|not through a claimed personal visit/);
 }
});

test('music policy leaves unrelated and held keys untouched before DOM access',()=>{
 for(const key of ['toString','post-hostel-hangover-cure','krakow-nightlife','post-krakow-techno-clubs',''])assert.deepEqual(reviseMusicEditorial({key}),[]);
});

test('missing or stale music source identity fails before DOM access',async()=>{
 for(const r of await loadMusicEditorial())for(const revision of [undefined,{}, {...r,key:'other'},{...r,sourceSha256:'0'.repeat(64)},{...r,reviewedOn:'2020-01-01'},{...r,version:'unknown'},{...r,markup:null}])assert.throws(()=>reviseMusicEditorial({key:r.key,revision}),/source identity/);
});

test('new mobile clearance remains live-music-only and does not hide the CTA',async()=>{
 const root=postcss.parse(await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'));
 const rules=[];root.walkRules(rule=>{if(rule.selector.includes('body[data-ktk-page="post-krakow-live-music"]'))rules.push(rule);});
 assert.equal(rules.length,1);assert.equal(rules[0].parent.name,'media');assert.equal(rules[0].parent.params,'(max-width: 600px)');
 assert.deepEqual(rules[0].selectors,['body[data-ktk-page="post-krakow-live-music"] #post-6196 > .et_post_meta_wrapper:first-child','body[data-ktk-page="post-krakow-live-music"] #post-6196 > .entry-content']);
 assert.deepEqual(rules[0].nodes.map(n=>[n.prop,n.value]),[['padding-right','16px']]);
});
