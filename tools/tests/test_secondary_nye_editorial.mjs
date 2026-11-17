import test from 'node:test';import assert from 'node:assert/strict';import {readFile,writeFile,mkdtemp,unlink,rmdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {tmpdir} from 'node:os';import path from 'node:path';
import {loadSecondaryNyeEditorial,reviseSecondaryNyeEditorial,buildSecondaryNyeStyles} from '../secondary-nye-editorial.mjs';

test('holiday planning source pins37 copy slots19 unrewritten leaves10 photos and existing archived role',async()=>{
 const r=await loadSecondaryNyeEditorial();assert.equal(r.replacements.length,37);assert.equal(r.readingSlots.length,19);assert.equal(r.photos.length,10);assert.equal(r.headingRole.after,'<h3 class="p1" data-ktk-heading-origin="h2">How do Polish people celebrate New Year?</h3>');assert.equal(createHash('sha256').update(r.preparedHtml).digest('hex'),r.preparedSha256);assert.match(r.preparedHtml,/data-ktk-promotion-ends="1798801200"/);assert.match(r.preparedHtml,/data-ktk-expired-label="Next NYE dates to be announced"/);
 const copy=r.replacements.map(t=>t.after).join('\n');assert.match(copy,/tower is closed from November through April/);assert.match(copy,/Archived Christmas and New Year's Eve planning guide/);assert.doesNotMatch(copy,/first footer|Ring in the New Year with fireworks|guarantees a fantastic time|stunning panoramic views|from31|on10|article's2023/);assert.equal(r.retainedSummary.containers.length,3);assert.ok(r.photos.every(p=>!p.afterAlt.includes('during New Year')&&!p.afterAlt.includes('in Krakow on')));
});

test('all115 other content routes and commerce private specialist-held identities are inert',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../../docs/code-pages/full-migration/manifest.json',import.meta.url),'utf8')),other=manifest.routes.filter(r=>r.key!=='post-new-years-eve-in-krakow');assert.equal(other.length,115);for(const key of [...other.map(r=>r.key),'store','store2','cart','checkout','orders','__proto__','unknown'])assert.deepEqual(reviseSecondaryNyeEditorial({key,revision:null}),[]);
});

test('missing or changed identity refuses before DOM access',async()=>{
 const r=await loadSecondaryNyeEditorial();for(const revision of [null,{...r,key:'changed'},{...r,version:'changed'},{...r,preparedHtml:null},{...r,replacements:[]},{...r,readingSlots:[]},{...r,photos:[]},{...r,galleryContext:null},{...r,headingRole:null}])assert.throws(()=>reviseSecondaryNyeEditorial({key:r.key,revision}),/Exact reviewed secondary NYE revision/);
});

test('style insertion is exact idempotent and drift refusal preserves all original bytes',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ktk-secondary-nye-')),file=path.join(dir,'runtime.css');assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir())+path.sep+'ktk-secondary-nye-'));
 try{const before='/* END Homepage alias excerpts */\noriginal outside\n';await writeFile(file,before);await buildSecondaryNyeStyles(file);const after=await readFile(file,'utf8'),styles=await readFile(new URL('../secondary-nye-editorial.css',import.meta.url),'utf8');assert.equal(after.replace(styles,''),before);assert.ok(after.startsWith('/* END Homepage alias excerpts */\n'+styles));await buildSecondaryNyeStyles(file);assert.equal(await readFile(file,'utf8'),after);assert.doesNotMatch(styles,/!important|display:|visibility:|transition:|transform:|iframe|consent/);for(const source of ['missing',before+before,after.replace('/* END Secondary holiday guide */','missing'),after+'/* BEGIN Secondary holiday guide */',after.replace('24px','0px')]){await writeFile(file,source);await assert.rejects(()=>buildSecondaryNyeStyles(file));assert.equal(await readFile(file,'utf8'),source);}}finally{try{await unlink(file);}catch(e){if(e.code!=='ENOENT')throw e;}await rmdir(dir);}
});
