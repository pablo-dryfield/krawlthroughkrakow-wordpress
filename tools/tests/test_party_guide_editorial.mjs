import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadPartyGuideEditorial,revisePartyGuideEditorial,buildPartyGuideStyles} from '../party-guide-editorial.mjs';

test('two exact party captures and review identities are explicit',async()=>{
 const rows=await loadPartyGuideEditorial();assert.equal(rows.length,2);for(const r of rows){assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'),r.sourceSha256);assert.equal(r.version,'2026-11-14.party-claims-1');assert.equal(r.reviewedOn,'2026-11-14');assert.doesNotMatch(r.markup,/[{}]/);}
});
test('previous21 summaries and40 container bindings remain frozen',async()=>{
 const d=JSON.parse(await readFile(new URL('../reviewed-article-presentation.json',import.meta.url),'utf8')),keys=['post-party-krakow','post-six-reasons-you-need-to-party-with-the-krawl-through-krakow','post-best-drinking-games','post-krakow-free-activities-2','post-krakow-budget-activities','post-krakow-money-saving-tips','post-travel-krakow-your-comprehensive-city-guide','post-weekend-in-krakow','post-go-karting-krakow','post-krakow-go-karting','post-krakow-weather-guide','post-krakow-winter-activities','post-best-places-to-eat','post-krakow-food-truck-parks','post-krakow-milkbars','post-sports-bar-krakow','post-krakow-wine-bars','post-karaoke-bars-in-krakow','post-bachelor-party-organisers-krakow','post-krakow-stag-activities','post-krakow-team-building-activities','post-escape-rooms-for-a-stag-do-in-krakow','post-krakow-shooting-range','post-welcome-to-alcohol','post-krawl-through-krakow-winter-newsletter'];const old={articles:d.articles.filter(r=>!keys.includes(r.key)),containers:d.containers.map(r=>({...r,cardKeys:r.cardKeys.filter(k=>!keys.includes(k))})),photo:d.photo,assetManifestSha256:d.assetManifestSha256};assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),'5d2c3a73727c75a08d812802e6eef0030581ff2ee72c341407f81dc6d8d2da33');
});
test('party module interiors and six ordered original media slots are explicit',async()=>{
 const [party,six]=await loadPartyGuideEditorial();assert.deepEqual([...party.markup.matchAll(/data-ktk-party-module="(\d+)"/g)].map(m=>Number(m[1])),Array.from({length:32},(_,i)=>i));assert.equal((party.markup.match(/<h[23] id=/g)||[]).length,25);assert.equal((six.markup.match(/<h2 id=/g)||[]).length,6);assert.deepEqual([...six.markup.matchAll(/data-ktk-original-photo="(\d+)"/g)].map(m=>Number(m[1])),[0,1,2,3,4,5]);assert.equal((party.markup.match(/href="tel:112"/g)||[]).length,1);assert.equal((six.markup.match(/href="tel:112"/g)||[]).length,0);
});
test('only shared facts expand and old unsafe promises do not recur',async()=>{
 for(const r of await loadPartyGuideEditorial()){assert.match(r.markup,/aged 18 and over/);assert.doesNotMatch(r.markup,/60 zl|60 PLN|96%|carry you home|professionally trained drunks|over 100|180,000|8\.45 pm|VIP fast-track|go hard or go home|store2|product-(?:38|39)/i);assert.match(r.markup,/no guarantee|cannot guarantee|not.*guarantee|not a.*guarantee/i);}
});
test('unrelated and inherited route names return before DOM access',()=>{
 for(const key of ['other','toString','constructor','__proto__','post-hostel-hangover-cure'])assert.deepEqual(revisePartyGuideEditorial({key,revision:null}),[]);
});
test('all three original topic-archive destinations stay native and labelled',async()=>{
 const [party,six]=await loadPartyGuideEditorial();for(const [r,paths]of [[party,['tag/krakow-nightlife/','tag/krakow-party/']],[six,['tag/why-choose-us/']]])for(const p of paths){assert.equal(r.markup.split('href="__KTK_HOME_URL__'+p+'"').length,2);assert.match(r.markup,new RegExp('href="__KTK_HOME_URL__'+p+'">[A-Za-z ]+</a>'));}
});
test('missing and stale review identities reject before DOM access',async()=>{
 for(const r of await loadPartyGuideEditorial())for(const revision of [null,{...r,key:'other'},{...r,sourceSha256:'0'.repeat(64)},{...r,reviewedOn:'2027-01-01'},{...r,version:'unknown'}])assert.throws(()=>revisePartyGuideEditorial({key:r.key,revision}),/identity required/);
});
test('party CSS is additive, marker and route bound, idempotent and drift guarded',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-party-style-'));try{const file=path.join(directory,'runtime.css'),before='unchanged\n/* BEGIN Practical safety guides */\nrest\n';await writeFile(file,before);await buildPartyGuideStyles(file);const after=await readFile(file,'utf8');assert.equal(after.replace(/\/\* BEGIN Practical party offer claims \*\/[\s\S]*?\/\* END Practical party offer claims \*\/\n\n/,''),before);assert.match(after,/font-size: 16px; line-height: 1\.65/);assert.match(after,/padding-right: 24px/);assert.match(after,/data-ktk-party-review/);assert.match(after,/color: #c8006c !important/);assert.equal((after.match(/!important/g)||[]).length,1);await buildPartyGuideStyles(file);assert.equal(await readFile(file,'utf8'),after);await writeFile(file,after.replace('font-size: 22px','font-size: 99px'));await assert.rejects(()=>buildPartyGuideStyles(file),/drift/);await writeFile(file,'unknown');await assert.rejects(()=>buildPartyGuideStyles(file),/anchor/);}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-party-style-'));await rm(directory,{recursive:true,force:true});}
});
test('only the exact earlier local contrast block can upgrade',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-party-style-'));try{const file=path.join(directory,'runtime.css');await writeFile(file,'unchanged\n/* BEGIN Practical safety guides */\nrest\n');await buildPartyGuideStyles(file);const current=await readFile(file,'utf8'),initial=current.replace('color: #c8006c !important;','color: #c8006c;');assert.notEqual(current,initial);await writeFile(file,initial);await buildPartyGuideStyles(file);assert.equal(await readFile(file,'utf8'),current);for(const changed of [initial.replace('font-size: 22px','font-size: 99px'),initial+'\n/* BEGIN Practical party offer claims */']){await writeFile(file,changed);await assert.rejects(()=>buildPartyGuideStyles(file),/drift/);assert.equal(await readFile(file,'utf8'),changed);}}finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'ktk-party-style-'));await rm(directory,{recursive:true,force:true});}
});
