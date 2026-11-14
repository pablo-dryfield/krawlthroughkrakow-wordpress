import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadCityTripEditorial,reviseCityTripEditorial,buildCityTripStyles} from '../city-trip-editorial.mjs';
import {canonicalDestination} from '../canonical-links.mjs';
import {bookingDestination} from '../booking-destinations.mjs';

test('two city-trip templates bind to immutable captures and ordered original modules',async()=>{
 const rows=await loadCityTripEditorial();assert.equal(rows.length,2);for(const [i,r]of rows.entries()){assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'),r.sourceSha256);assert.equal(r.version,'2026-11-14.city-trip-1');assert.equal(r.reviewedOn,'2026-11-14');assert.equal((r.markup.match(/data-ktk-city-module=/g)||[]).length,[18,31][i]);assert.equal((r.markup.match(/data-ktk-city-contents/g)||[]).length,1);assert.doesNotMatch(r.markup,/[{}]|<(?:img|iframe|script|style|form)\b/);}
});
test('current transport links, practical precautions and honest budgets replace old promises',async()=>{
 const [city,weekend]=await loadCityTripEditorial();assert.match(city.markup,/fare to Krakow Glowny is 20 PLN/);assert.match(city.markup,/routes 209 and 300 and night route 902/);assert.match(city.markup,/ticket is 6 PLN/);assert.match(city.markup,/Do not leave drinks unattended/);assert.match(city.markup,/https:\/\/www\.gov\.uk\/foreign-travel-advice\/poland\/safety-and-security/);assert.match(city.markup,/https:\/\/www\.auschwitz\.org\/en\/visiting\//);assert.doesNotMatch(city.markup,/9\.00 PLN|4\.60 PLN|272 PLN|might get stabbed|stupid enough|safe and convenient/);for(const r of [city,weekend]){assert.match(r.markup,/__KTK_HOME_URL__store2\/pub-crawl-28\/#book/);assert.doesNotMatch(r.markup,/utm_|gclid|gbraid|wbraid|guaranteed (?:entry|saving|view)/i);}
});
test('weekend has fifteen daytime choices plus a night out and distinguishes Kazimierz from Podgorze',async()=>{
 const [,r]=await loadCityTripEditorial();assert.match(r.markup,/Use these 15 daytime ideas and a night out/);assert.equal((r.markup.match(/<h[23] id="[^"]+">\d+\. /g)||[]).length,16);for(let i=1;i<=16;i++)assert.equal((r.markup.match(new RegExp('>\\b'+i+'\\. ','g'))||[]).length,1);assert.match(r.markup,/Ghetto Heroes Square is in Podgorze, across the river, not in Kazimierz/);assert.match(r.markup,/regular crawl is for ages 18 and over/);assert.match(r.markup,/valid ID is recommended/);assert.match(r.markup,/__KTK_HOME_URL__store2\/polish-vodka-tasting-44\/#book/);
});
test('the three original aliases use the already reviewed canonical migration destinations',()=>{
 assert.equal(canonicalDestination('https://krawlthroughkrakow.com/how-to-join/'),'__KTK_HOME_URL__about-us/how-to-join/');assert.equal(canonicalDestination('https://krawlthroughkrakow.com/krakow-activities/'),'__KTK_HOME_URL__other-tours/');assert.equal(bookingDestination('https://krawlthroughkrakow.com/store/Polish-Vodka-Tasting-p637205219'),'__KTK_HOME_URL__store2/polish-vodka-tasting-44/#book');
});
test('all previous twenty-seven identities and103 cards remain frozen',async()=>{
 const d=JSON.parse(await readFile(new URL('../reviewed-article-presentation.json',import.meta.url),'utf8')),keys=['post-travel-krakow-your-comprehensive-city-guide','post-weekend-in-krakow'],old={articles:d.articles.filter(r=>!keys.includes(r.key)),containers:d.containers.map(r=>({...r,cardKeys:r.cardKeys.filter(k=>!keys.includes(k))})),photo:d.photo,assetManifestSha256:d.assetManifestSha256};assert.equal(old.articles.length,27);assert.equal(old.containers.reduce((n,c)=>n+c.cardKeys.length,0),103);assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),'12cb16e429689558017734826917393976473fe8e24cf53a3b28cbc3f368a8dd');assert.equal(d.articles.length,29);assert.equal(d.containers.reduce((n,c)=>n+c.cardKeys.filter(k=>keys.includes(k)).length,0),11);
});
test('unrelated, prototype, medical-held and active competition routes are untouched without DOM access',()=>{for(const key of ['other','constructor','toString','__proto__','post-hostel-hangover-cure','post-welcome-to-alcohol'])assert.deepEqual(reviseCityTripEditorial({key}),[]);});
test('stale identities reject before any DOM access',async()=>{for(const r of await loadCityTripEditorial())for(const revision of [null,{...r,key:'other'},{...r,sourceSha256:'0'.repeat(64)},{...r,version:'unknown'},{...r,reviewedOn:'2027-01-01'}])assert.throws(()=>reviseCityTripEditorial({key:r.key,revision}),/identity/);});
test('city-trip styles are additive, marker-bound, exact and idempotent',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-city-trip-css-'));try{const file=path.join(directory,'runtime.css'),before='unchanged\n/* BEGIN Practical budget travel guides */\nrest\n';await writeFile(file,before);await buildCityTripStyles(file);const css=await readFile(file,'utf8');assert.equal(css.replace(/\/\* BEGIN Practical city trip guides \*\/[\s\S]*?\/\* END Practical city trip guides \*\/\n\n/,''),before);assert.match(css,/data-ktk-city-trip-review/);assert.match(css,/font-size: 16px; line-height: 1\.65/);assert.match(css,/padding-right: 24px/);assert.match(css,/outline: 2px solid currentColor/);assert.equal((css.match(/!important/g)||[]).length,1);await buildCityTripStyles(file);assert.equal(await readFile(file,'utf8'),css);for(const bad of [css.replace('16px','99px'),css+css,before.replace('budget travel','unknown travel')]){await writeFile(file,bad);await assert.rejects(()=>buildCityTripStyles(file));assert.equal(await readFile(file,'utf8'),bad);}}finally{const base=path.resolve(tmpdir())+path.sep;assert.ok(path.resolve(directory).startsWith(base+'ktk-city-trip-css-'));await rm(directory,{recursive:true,force:true});}
});
