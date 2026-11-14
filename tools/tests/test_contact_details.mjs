import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {loadContactDetails,reviseContactDetails,buildContactDetailsStyles} from '../contact-details-editorial.mjs';

test('Contact copy binds original capture and shared regular facts without promises or fixed price',async()=>{
 const r=await loadContactDetails();assert.equal(r.key,'contact');assert.equal(r.version,'2026-11-14.contact-1');
 assert.equal((r.markup.match(/<template /g)||[]).length,2);
 for(const value of ['9 PM','Adam Mickiewicz Monument','Krakow&#039;s Main Market Square','pink umbrella','your own booking confirmation','maps.app.goo.gl/S3kQZC5rdABdpA1G9'])assert.ok(r.markup.includes(value),value);
 assert.ok(!/120|guarantee|pro drunk|utm_|gclid|<iframe|<script|2027/.test(r.markup));
});
test('other pages and medical hold are untouched before accessing DOM',()=>{
 for(const key of ['post-hostel-hangover-cure','about-us','toString','__proto__',''])assert.deepEqual(reviseContactDetails({key}),[]);
});
test('unreviewed source identities fail before accessing DOM',async()=>{
 const r=await loadContactDetails();for(const revision of [undefined,{}, {...r,key:'other'},{...r,version:'other'},{...r,reviewedOn:'2027-01-01'},{...r,sourceSha256:'0'.repeat(64)},{...r,sourceHtml:null},{...r,markup:null}])assert.throws(()=>reviseContactDetails({key:r.key,revision}),/source identity/);
});
test('Contact-only CSS retains original styles and native directions for every consent state',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-contact-details-'));
 try{
  const file=path.join(directory,'runtime.css'),anchor='/* Native interaction states, layered over the captured page cascade. */',before='/* retained earlier styles */\n\n',after='\niframe{color:black}\n';
  await writeFile(file,before+anchor+after);await buildContactDetailsStyles(file);const generated=await readFile(file,'utf8');
  assert.ok(generated.startsWith(before));assert.ok(generated.endsWith(anchor+after));
  assert.ok(generated.includes('iframe[src="about:blank"] { display: none; }'));
  assert.equal((generated.match(/display: none/g)||[]).length,1);assert.ok(!/iubenda|consent|opacity:|visibility:/.test(generated));
  assert.ok(generated.includes('aspect-ratio: 4 / 3;'));assert.ok(generated.includes('padding-right: 24px;'));
  await buildContactDetailsStyles(file);assert.equal(await readFile(file,'utf8'),generated);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('ambiguous or modified CSS fails before rewrite',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-contact-details-'));
 try{for(const [i,source]of ['/* BEGIN Contact details */','/* END Contact details */','/* Native interaction states, layered over the captured page cascade. */\n/* BEGIN Contact details *//* END Contact details */','/* Native interaction states, layered over the captured page cascade. */'.repeat(2)].entries()){
  const file=path.join(directory,i+'.css');await writeFile(file,source);await assert.rejects(()=>buildContactDetailsStyles(file));assert.equal(await readFile(file,'utf8'),source);
 }}finally{await rm(directory,{recursive:true,force:true});}
});
