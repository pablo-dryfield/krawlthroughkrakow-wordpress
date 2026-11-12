import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { clarityRecordingReference, createClarityRecordingBridge } from './clarity-recording.js';
import { createJourneyQueue } from './journey-queue.js';

function fixture() {
  const local = new Map(), session = new Map();
  const storage = map => ({ getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) });
  const calls = [];
  const win = { location: { pathname: '/store2/' }, crypto: { randomUUID }, localStorage: storage(local), sessionStorage: storage(session), clarity: (...args) => calls.push(args) };
  const queue = createJourneyQueue(() => win);
  let consent = true;
  const bridge = createClarityRecordingBridge({ queue, getWindow: () => win, consentGranted: () => consent, pageId: () => 'page-id' });
  return { win, queue, calls, bridge, deny: () => { consent = false; }, callback: () => calls.find(c => c[0] === 'metadata')?.[1] };
}

const metadata = { projectId: 'z9d5iuilvn', userId: 'abc123', sessionId: 'def456', pageNum: 1 };
const granted = { analytics_Storage: 'granted', ad_Storage: 'denied' };

test('retains only native Clarity identifiers, never a supplied URL or personal details', () => {
  assert.deepEqual(clarityRecordingReference({ ...metadata, email: 'private@example.com', url: 'https://evil.example/' }), {
    projectId: 'z9d5iuilvn', userId: 'abc123', sessionId: 'def456',
  });
  for (const value of [null, {}, { ...metadata, userId: 'private@example.com' }, { ...metadata, sessionId: '../secret' }, { ...metadata, projectId: ['project'] }]) {
    assert.equal(clarityRecordingReference(value), null);
  }
});

test('requires consent, production, a configured project and a Clarity function', () => {
  const f = fixture(); f.deny();
  assert.equal(f.bridge.attach(metadata.projectId), false);
  assert.equal(f.calls.length, 0);
  const staging = fixture(); staging.win.location.pathname = '/staging/store2/';
  assert.equal(staging.bridge.attach(metadata.projectId), false);
  const absent = fixture(); delete absent.win.clarity;
  assert.equal(absent.bridge.attach(metadata.projectId), false);
  assert.equal(fixture().bridge.attach(''), false);
});

test('waits for playback metadata, registers once, deduplicates and preserves the actual visit', () => {
  const f = fixture();
  const prior = f.queue.record('product_viewed', {}, 'page-id');
  assert.equal(f.bridge.attach(metadata.projectId), true);
  assert.equal(f.bridge.attach(metadata.projectId), true);
  assert.equal(f.calls.length, 1);
  assert.deepEqual(f.calls[0].slice(2), [true, true, true]);
  f.callback()(metadata, false, granted);
  f.callback()({ ...metadata, projectId: 'anotherproject' }, true, granted);
  assert.equal(f.queue.read().length, 1);
  f.callback()(metadata, true, granted);
  f.callback()(metadata, true, granted);
  const events = f.queue.read();
  assert.equal(events.length, 2);
  assert.equal(events[1].type, 'clarity_recording_linked');
  assert.equal(events[1].visitId, prior.visitId);
  assert.equal(events[1].sequence, prior.sequence + 1);
  assert.deepEqual(events[1].details, { projectId: 'z9d5iuilvn', userId: 'abc123', sessionId: 'def456', environment: 'production' });
});

test('late callbacks respect withdrawal and session changes retain multiple recording references', () => {
  const f = fixture(); f.bridge.attach(metadata.projectId);
  f.callback()(metadata, true, granted);
  f.callback()({ ...metadata, sessionId: 'nextsession' }, true, granted);
  assert.equal(f.queue.read().length, 2);
  f.deny(); f.callback()({ ...metadata, sessionId: 'denied' }, true, granted);
  assert.equal(f.queue.read().length, 2);
});

test('SDK registration failure never interrupts booking', () => {
  const f = fixture(); f.win.clarity = () => { throw new Error('SDK unavailable'); };
  assert.equal(f.bridge.attach(metadata.projectId), false);
});

test('a new journey after purchase requests fresh metadata even in the same page', () => {
  const f = fixture(); f.bridge.attach(metadata.projectId);
  f.callback()(metadata, true, granted);
  const firstVisit = f.queue.read()[0].visitId;
  f.queue.clear();
  f.bridge.attach(metadata.projectId);
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1][3], false);
  f.calls[1][1](metadata, true, granted);
  assert.equal(f.queue.read().length, 1);
  assert.notEqual(f.queue.read()[0].visitId, firstVisit);
});

test('requires actual provider consent and captures a later grant notification', () => {
  const f = fixture(); f.bridge.attach(metadata.projectId);
  for (const consent of [undefined, null, {}, { analytics_Storage: 'denied' }]) {
    f.callback()(metadata, true, consent);
  }
  assert.equal(f.queue.read().length, 0);
  f.callback()(metadata, true, granted);
  f.callback()(metadata, true, granted);
  assert.equal(f.queue.read().length, 1);
});
