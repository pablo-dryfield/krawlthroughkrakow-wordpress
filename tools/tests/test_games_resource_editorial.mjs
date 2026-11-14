import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadGamesResourceEditorial,reviseGamesResourceEditorial,buildGamesResourceStyles} from '../games-resource-editorial.mjs';

test('two games sources and ordered text-only modules bind to original captures',async()=>{
 const rows=await loadGamesResourceEditorial();assert.equal(rows.length,2);for(const [i,r]of rows.entries()){assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'),r.sourceSha256);assert.equal(r.version,'2026-11-14.games-guidance-1');assert.equal(r.reviewedOn,'2026-11-14');assert.deepEqual([...r.markup.matchAll(/data-ktk-game-module="(\d+)"/g)].map(n=>Number(n[1])),Array.from({length:i?60:5},(_,n)=>n));assert.doesNotMatch(r.markup,/<(?:img|iframe|script|style|form)\b/);assert.doesNotMatch(r.markup,/[{}]/);}
});
test('previous23 identities,86 summaries and all capture bindings stay frozen',async()=>{
 const d=JSON.parse(await readFile(new URL('../reviewed-article-presentation.json',import.meta.url),'utf8')),key='post-best-drinking-games',old={articles:d.articles.filter(r=>r.key!==key),containers:d.containers.map(r=>({...r,cardKeys:r.cardKeys.filter(k=>k!==key)})),photo:d.photo,assetManifestSha256:d.assetManifestSha256};assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),'3deaff1174b435d5128aa6525ccf008f9426753b23fd06955f95df37a894710e');assert.equal(old.articles.length,23);assert.equal(old.containers.reduce((n,c)=>n+c.cardKeys.length,0),86);assert.equal(d.containers.reduce((n,c)=>n+c.cardKeys.filter(k=>k===key).length,0),8);
});
test('seven original PDF destinations stay named and eager downloads are absent',async()=>{
 const rows=await loadGamesResourceEditorial();for(const [i,r]of rows.entries()){assert.equal((r.markup.match(/href="__KTK_HOME_URL__wp-content\/uploads\/2020\/04\//g)||[]).length,i?6:1);assert.equal((r.markup.match(/47\.8 MB/g)||[]).length,i?2:1);assert.doesNotMatch(r.markup,/google\.com\/url|b-cdn\.net|download=|preload|prefetch|embed/);assert.match(r.markup,/KTK Drunken Jenga/);}
});
test('owner-directed upbeat KTK game copy has no generic-game or participation disclaimer',async()=>{
 for(const r of await loadGamesResourceEditorial()){assert.match(r.markup,/KTK Drunken Jenga/);assert.match(r.markup,/KTK Drunken Jenga rules \(PDF, 47\.8 MB\)/);assert.doesNotMatch(r.markup,/Hasbro|Classic Jenga|regular Jenga|instructions\.hasbro|participation|playing is optional|joining in is optional|anyone can pass|without alcohol|alcohol-free|not.*newly recommended|preserved for people looking for the archive|archived KTK Jenga rule sheet/i);}
});
test('unrelated and inherited names return before touching DOM',()=>{for(const key of ['other','toString','constructor','__proto__','post-hostel-hangover-cure'])assert.deepEqual(reviseGamesResourceEditorial({key,revision:null}),[]);});
test('missing or stale review identities reject before DOM access',async()=>{for(const r of await loadGamesResourceEditorial())for(const revision of [null,{...r,key:'other'},{...r,version:'other'},{...r,reviewedOn:'2027-01-01'},{...r,sourceSha256:'0'.repeat(64)}])assert.throws(()=>reviseGamesResourceEditorial({key:r.key,revision}),/identity/);});
test('games CSS is route and marker scoped, exact additive and drift guarded',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-games-css-'));try{const f=path.join(directory,'runtime.css'),initial='unchanged\n/* BEGIN Practical party offer claims */\nrest\n';await writeFile(f,initial);await buildGamesResourceStyles(f);const css=await readFile(f,'utf8');assert.equal(css.replace(/\/\* BEGIN Optional games resource guidance \*\/[\s\S]*?\/\* END Optional games resource guidance \*\/\n\n/,''),initial);assert.match(css,/font-size: 16px; line-height: 1\.65/);assert.match(css,/outline: 2px solid currentColor/);assert.match(css,/padding-right: 24px/);assert.equal((css.match(/!important/g)||[]).length,1);await buildGamesResourceStyles(f);assert.equal(await readFile(f,'utf8'),css);for(const bad of [css.replace('16px','99px'),css+css,initial.replace('Practical party','Unknown party')]){await writeFile(f,bad);await assert.rejects(()=>buildGamesResourceStyles(f));assert.equal(await readFile(f,'utf8'),bad);}}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-games-css-'));await rm(directory,{recursive:true,force:true});}
});
