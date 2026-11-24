import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';import {tmpdir} from 'node:os';import {createHash} from 'node:crypto';
import {loadH01BusinessLegalEditorial,reviseH01BusinessLegalEditorial,h01CompetitionSummary,reviseH01CompetitionSummary,buildH01CompetitionFormStyles,h01CompetitionFormStyles,h01CompetitionFormScope} from '../h01-business-legal-editorial.mjs';

test('H01 source inputs retain exact four page boundaries and six text-only modules',async()=>{
  const rows=await loadH01BusinessLegalEditorial();
  assert.deepEqual(rows.map(r=>r.key),['terms-and-conditions','privacy-policy','tour-service-disclaimer','post-welcome-to-alcohol']);
  assert.equal(rows.reduce((n,r)=>n+r.original.length,0),6);
  for(const row of rows){assert.equal((row.markup.match(/<template data-h01-module=/g)||[]).length,row.original.length);assert.doesNotMatch(row.markup,/<(?:form|input|textarea|select|button|img|iframe|video|script)\b|\son[a-z]+\s*=/i);}
});

test('competition uses confirmed monthly judging and required next-month prize use',async()=>{
  const row=(await loadH01BusinessLegalEditorial()).find(r=>r.key==='post-welcome-to-alcohol');
  for(const phrase of ['18 or over','end of each month','originality and entertainment','must be used in the calendar month following judging','use the prize in December','separate permission','Three nights in a hostel','EUR50 flight voucher','24 November 2026'])assert.ok(row.markup.includes(phrase),phrase);
  assert.doesNotMatch(row.markup,/no entry deadline currently set|not set an entry deadline|automatic forfeiture|guaranteed/i);
  assert.equal((row.markup.match(/id="competition-questions"/g)||[]).length,1);
  assert.deepEqual(h01CompetitionSummary.keys,['archive-author-thirsty','archive-category-uncategorized-page-5','blog']);
  assert.match(h01CompetitionSummary.replacement,/must use the prize in the following month/);
});

test('legal copy does not invent consent, a liability waiver, unlimited retention or automatic deletion',async()=>{
  const rows=await loadH01BusinessLegalEditorial(),terms=rows.find(r=>r.key==='terms-and-conditions').markup,privacy=rows.find(r=>r.key==='privacy-policy').markup,disclaimer=rows.find(r=>r.key==='tour-service-disclaimer').markup;
  assert.match(terms,/governed by Polish law/);assert.match(terms,/does not automatically subscribe/);assert.match(terms,/do not retrospectively change/);assert.doesNotMatch(terms,/laws of USA|you agree to subscribe|LIMITED TO THE AMOUNT PAID|sole discretion|DMCA/);
  assert.match(privacy,/not an unlimited keep-forever policy/);assert.match(privacy,/Closing an enquiry does not itself delete/);assert.match(privacy,/UODO/);assert.doesNotMatch(privacy,/we transfer the data, including Personal Data, to USA|represents your agreement to that transfer|passport details|automatically delete after/);
  assert.match(disclaimer,/identification is recommended/);assert.match(disclaimer,/remains responsible/);assert.doesNotMatch(disclaimer,/cannot accept any responsibility/);
});

test('unrelated, prototype and protected routes return before accessing DOM',()=>{
  for(const key of ['contact','store','store2','__proto__','constructor','unknown','post-hostel-hangover-cure']){assert.deepEqual(reviseH01BusinessLegalEditorial({key}),[]);assert.deepEqual(reviseH01CompetitionSummary({key}),[]);}
});

test('missing or changed review identities refuse before accessing DOM',async()=>{
  for(const row of await loadH01BusinessLegalEditorial())for(const revision of [null,{...row,key:'other'},{...row,version:'unreviewed'},{...row,original:[]}])assert.throws(()=>reviseH01BusinessLegalEditorial({key:row.key,revision}),/identity/);
  assert.throws(()=>reviseH01CompetitionSummary({key:'blog',revision:{...h01CompetitionSummary,version:'unreviewed'}}),/confirmed|Confirmed/);
});

test('metadata describes monthly competition without altering URL identity',async()=>{
  const data=JSON.parse(await readFile(new URL('../code-pages-seo.json',import.meta.url),'utf8'));
  const find=value=>{if(value&&typeof value==='object'){if(value.description?.includes("Krawl Through Krakow's monthly story competition"))return value;for(const child of Object.values(value)){const row=find(child);if(row)return row;}}};
  const row=find(data);assert.ok(row);assert.match(row.description,/18\+/);assert.match(row.description,/following month/);assert.doesNotMatch(row.description,/no entry deadline/);
});

test('competition field-fit rules preserve all old CSS and reject partial, changed and broadened input',async()=>{
  const folder=await mkdtemp(path.join(tmpdir(),'ktk-h01-field-fit-'));
  try{
    const file=path.join(folder,'runtime.css'),current=await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css',import.meta.url),'utf8'),base=current.endsWith(h01CompetitionFormStyles)?current.slice(0,-h01CompetitionFormStyles.length):current;
    assert.equal(createHash('sha256').update(base).digest('hex'),'46fa696e314f789a757d4a6c748ae22089e7d3f88ecf18be06a32b09126199ab');
    await writeFile(file,base);await buildH01CompetitionFormStyles(file);const once=await readFile(file,'utf8');assert.equal(once,base+h01CompetitionFormStyles);await buildH01CompetitionFormStyles(file);assert.equal(await readFile(file,'utf8'),once);
    assert.match(h01CompetitionFormScope,/data-route-key="post-welcome-to-alcohol"/);assert.match(h01CompetitionFormScope,/data-ktk-owned-enquiry="true"/);
    for(const bad of [base+'changed',once+once,once.replace('/* END H01 competition field fit */','missing'),once.replace('width: 100%','width: 120%'),once.replace('body.ktk-code-page[data-ktk-page="post-welcome-to-alcohol"]','body')]){await writeFile(file,bad);await assert.rejects(()=>buildH01CompetitionFormStyles(file));assert.equal(await readFile(file,'utf8'),bad);}
  }finally{assert.ok(path.resolve(folder).startsWith(path.resolve(tmpdir())+path.sep+'ktk-h01-field-fit-'));await rm(folder,{recursive:true,force:true});}
});
