import test from 'node:test';
import assert from 'node:assert/strict';
import {loadStagActivityClarity,reviseStagActivityClarity} from '../stag-activity-clarity.mjs';

test('thirteen source-bound Stag interiors use enquiry-specific copy without old fixed inclusions',async()=>{
 const r=await loadStagActivityClarity();assert.equal(r.key,'krakow-stag-do');assert.equal((r.markup.match(/<template /g)||[]).length,13);
 assert.ok(r.sourceHtml.includes('15 or 20 seater'));assert.ok(!/Includes 7|Try 8|200 rounds|15 rounds per second|2 hours|free softs|prize cocktail|most experienced|NEVER be allowed|oldest brewery/.test(r.markup));
 assert.ok(!/<a\b|<img\b|<form\b|<script\b|onclick|utm_|gclid|PLN|\d+%/.test(r.markup));
 assert.ok(r.markup.includes('flight details')&&r.markup.includes('refill costs')&&r.markup.includes('ticket-holder')&&r.markup.includes('non-drinking alternatives'));
});
test('unrelated and held routes return before DOM access',()=>{
 for(const key of ['post-hostel-hangover-cure','krakow-hen-do','contact','new-years-eve','__proto__',''])assert.deepEqual(reviseStagActivityClarity({key}),[]);
});
test('unreviewed Stag revision identities fail before DOM access',async()=>{
 const r=await loadStagActivityClarity();
 for(const revision of [undefined,{}, {...r,key:'other'},{...r,sourceSha256:'0'.repeat(64)},{...r,sourceHtml:null},{...r,markup:null},{...r,reviewedOn:'2027-01-01'},{...r,version:'other'}])assert.throws(()=>reviseStagActivityClarity({key:r.key,revision}),/identity/);
});
