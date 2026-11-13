import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadVenueEditorial,reviseVenueEditorial} from '../venue-editorial.mjs';
const require=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
const postcss=require('postcss');

test('six venue recipes bind original captures and reviewed comparison templates',async()=>{
 const rows=await loadVenueEditorial();assert.equal(rows.length,6);assert.equal(new Set(rows.map(r=>r.key)).size,6);
 for(const row of rows){
  assert.equal(row.reviewedOn,'2026-11-13');assert.equal(row.version,'2026-11-13.venues-1');
  assert.match(row.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(row.sourceHtml.includes('main-content'));
  assert.equal((row.markup.match(/<table /g)||[]).length,1);assert.match(row.markup,/KTK recommendations confirmed|KTK venue recommendations confirmed/);
  assert.ok(row.markup.includes('__KTK_HOME_URL__store2/pub-crawl-28/#book'));
 }
});
test('venue revision leaves unrelated, prototype and medical keys alone before DOM access',()=>{
 for(const key of ['toString','__proto__','post-hostel-hangover-cure','post-jazz-bars-in-krakow',''])assert.deepEqual(reviseVenueEditorial({key}),[]);
});
test('stale or missing venue identity rejects before DOM access',async()=>{
 for(const row of await loadVenueEditorial())for(const revision of [undefined,{}, {...row,key:'other'},{...row,sourceSha256:'0'.repeat(64)},{...row,version:'unknown'},{...row,reviewedOn:'2020-01-01'},{...row,sourceHtml:null},{...row,markup:null}])assert.throws(()=>reviseVenueEditorial({key:row.key,revision}),/source identity/);
});
test('venue tables wrap at fixed dimensions and mobile clearance is six-guide scoped',async()=>{
 const root=postcss.parse(await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'));
 const rules=[];root.walkRules(r=>{if(r.selector.includes('body:is([data-ktk-page="post-krakow-techno-clubs"]'))rules.push(r);});
 assert.equal(rules.length,1);assert.equal(rules[0].parent.params,'(max-width:600px)');assert.equal((rules[0].selector.match(/data-ktk-page=/g)||[]).length,6);
 assert.deepEqual(rules[0].nodes.map(n=>[n.prop,n.value]),[['padding-right','16px']]);
 const table=[];root.walkRules(r=>{if(r.selector==='.entry-content table.ktk-venue-comparison')table.push(r);});
 assert.equal(table.length,1);assert.ok(table[0].nodes.some(n=>n.prop==='table-layout'&&n.value==='fixed'));
});
