import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadOfferFacts,validateOfferFacts,offerTemplateValues,offerTime} from '../site-offer-facts.mjs';
import {loadHomepageOfferRevision,reviseHomepageOffer,buildHomepageOfferStyles} from '../homepage-offer-editorial.mjs';
const require=createRequire(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/package.json',import.meta.url));
const postcss=require('postcss');

test('shared reviewed facts keep regular and seasonal offers distinct without a fixed price',async()=>{
 const facts=await loadOfferFacts(),values=offerTemplateValues(facts);
 assert.equal(values.regularTime,'9 PM');assert.equal(values.nyeEarly,'5 PM');assert.equal(values.nyeLate,'7:30 PM');
 assert.equal(values.minimumAge,'18');assert.equal(values.venueRange,'4-5');assert.equal(values.openBarHours,'1');assert.equal(values.since,'2008');
 assert.equal(facts.regular.repeatVisit.cashProof,'participation-confirmed-with-leader');assert.equal(facts.regular.repeatVisit.onlineProof,'previous-booking-confirmation-to-leader');assert.equal(facts.regular.repeatVisit.amount,'not-specified');
 assert.ok(!Object.keys(facts.regular).includes('price'));
});

test('unreviewed identities, policy promises, fixed prices and malformed inputs fail closed',async()=>{
 const original=await loadOfferFacts();
 for(const mutate of [f=>{f.regular.price=120;},f=>{f.regular.minimumAge=16;},f=>{f.regular.idAdvice='mandatory-passport';},f=>{f.regular.repeatVisit.cashProof='wristband';},f=>{f.regular.repeatVisit.amount='10 PLN';},f=>{f.regular.startTime='17:00';},f=>{f.regular.venueCount.minimum=5;},f=>{f.nye.meetingStatus='same-as-regular';},f=>{f.regular.meeting.name='<img>';},f=>{f.evidence=[];},f=>{delete f.regular.minimumAge;},f=>{f.regular=[];}]){
  const candidate=structuredClone(original);mutate(candidate);assert.throws(()=>validateOfferFacts(candidate));
 }
 for(const invalid of [null,{},[],{...original,operator:null}])assert.throws(()=>validateOfferFacts(invalid));
});

test('explicit local times use correct 12-hour display and reject invalid inputs',()=>{
 for(const [input,output] of [['00:00','12 AM'],['12:00','12 PM'],['09:05','9:05 AM'],['23:59','11:59 PM']])assert.equal(offerTime(input),output);
 for(const value of ['24:00','21:60','9 PM','9:00',null,2100])assert.throws(()=>offerTime(value));
});

test('homepage recipe binds original source and expands all reviewed facts',async()=>{
 const revision=await loadHomepageOfferRevision();
 assert.equal(revision.version,'2026-11-13.offer-1');assert.equal((revision.html.match(/<template /g)||[]).length,27);
 assert.ok(!revision.html.includes('{{'));assert.match(revision.html,/previous booking confirmation/);assert.match(revision.html,/valid ID is recommended/);
 assert.ok(!/120 zl|previous wristband|almost a decade|every single night of the year/i.test(revision.html));
 for(const candidate of [{},{...revision,version:'other'},{...revision,reviewedOn:'2025-01-01'},{...revision,sourceSha256:'0'.repeat(64)},{...revision,sourceHtml:null},{...revision,html:null}])assert.throws(()=>reviseHomepageOffer(candidate),/source identity/);
 assert.deepEqual(reviseHomepageOffer(null),[]);
});

test('homepage-only mobile clearance preserves the complete original cascade and builds idempotently',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ktk-offer-'));
 try{
  const file=path.join(directory,'runtime.css'),original='/* existing */\na {color:red;}\n\n/* BEGIN shared content accessibility */\np {color:black;}\n/* END shared content accessibility */\n';
  await writeFile(file,original);await buildHomepageOfferStyles(file);const once=await readFile(file,'utf8');
  const stylesheet=(await readFile(new URL('../homepage-offer.css',import.meta.url),'utf8')).trim();
  assert.equal(once.replace('\n\n/* BEGIN homepage offer clearance */\n'+stylesheet+'\n/* END homepage offer clearance */',''),original);
  await buildHomepageOfferStyles(file);assert.equal(await readFile(file,'utf8'),once);
  assert.match(stylesheet,/@media \(max-width: 600px\)/);assert.equal((stylesheet.match(/body\.ktk-homepage-standalone/g)||[]).length,2);
  assert.ok(!/hero|et_pb_section_0/.test(stylesheet.replace(/^\/\*[^]*?\*\//,'')));
  const ast=postcss.parse(stylesheet),rules=[];ast.walkRules(rule=>rules.push(rule));assert.equal(rules.length,2);
  for(const rule of rules){assert.equal(rule.parent.type,'atrule');assert.equal(rule.parent.name,'media');assert.equal(rule.parent.params,'(max-width: 600px)');assert.ok(rule.selector.startsWith('body.ktk-homepage-standalone #main-content :is('));}
  assert.deepEqual(rules.map(rule=>rule.nodes.map(n=>[n.prop,n.value])),[[['padding-left','8px'],['padding-right','24px']],[['padding-right','24px']]]);
  for(const source of ['missing markers','/* BEGIN shared content accessibility */\n/* BEGIN homepage offer clearance */','/* BEGIN homepage offer clearance *//* END homepage offer clearance *//* BEGIN shared content accessibility *//* BEGIN shared content accessibility */','/* END homepage offer clearance *//* BEGIN homepage offer clearance *//* BEGIN shared content accessibility */']){
   await writeFile(file,source);await assert.rejects(buildHomepageOfferStyles(file));assert.equal(await readFile(file,'utf8'),source);
  }
 }finally{await rm(directory,{recursive:true,force:true});}
});
