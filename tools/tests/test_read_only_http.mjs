import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchCompleteResponse} from '../read-only-http.mjs';

test('retries a terminated response body and records the original transport failure', async () => {
  let calls=0;const retries=[];
  const response=await fetchCompleteResponse('https://example.com/',{}, {onRetry:row=>retries.push(row),request:async()=>++calls===1?{arrayBuffer:async()=>{throw new Error('terminated');}}:new Response('complete',{headers:{'cf-cache-status':'HIT'}})});
  assert.equal(calls,2);assert.equal(await response.text(),'complete');
  assert.equal(response.headers.get('cf-cache-status'),'HIT');
  assert.equal(retries.length,1);assert.equal(retries[0].message,'terminated');
});

test('HTTP502 is retained as an HTTP failure, never retried or turned into success', async () => {
  let calls=0;const response=await fetchCompleteResponse('https://example.com/',{}, {request:async()=>{calls++;return new Response('Bad gateway',{status:502});}});
  assert.equal(response.status,502);assert.equal(await response.text(),'Bad gateway');assert.equal(calls,1);
});

test('transport attempts are bounded; mutation methods are rejected', async () => {
  let calls=0;
  await assert.rejects(fetchCompleteResponse('https://example.com/',{}, {request:async()=>{calls++;throw new Error('unavailable');}}));
  assert.equal(calls,3);
  await assert.rejects(fetchCompleteResponse('https://example.com/',{method:'POST'}));
  const head=await fetchCompleteResponse('https://example.com/',{method:'HEAD'}, {request:async()=>new Response(null,{status:204})});
  assert.equal(head.status,204);assert.equal(await head.text(),'');
});
