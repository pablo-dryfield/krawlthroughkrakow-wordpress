import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createJourneyQueue, journeyEnvironment } from './journey-queue.js';

const KEY = 'ktk-storefront-journey-events-v1';
function browser() {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  return { crypto: { randomUUID }, localStorage: storage, sessionStorage: storage };
}

test('homepage, store and cart share visit ordering across navigation', () => {
  const window = browser();
  const home = createJourneyQueue(() => window);
  const viewed = home.record('homepage_viewed', { environment: 'production' }, randomUUID());
  const clicked = home.record('homepage_button_clicked', { buttonLabel: 'Book Halloween' }, viewed.pageId);
  const store = createJourneyQueue(() => window);
  const cart = store.record('add_to_cart', { productId: 51 }, randomUUID());
  assert.deepEqual(store.read().map(event => event.type), ['homepage_viewed', 'homepage_button_clicked', 'add_to_cart']);
  assert.equal(cart.visitId, viewed.visitId);
  assert.equal(clicked.sequence, viewed.sequence + 1);
  assert.equal(cart.sequence, clicked.sequence + 1);
  assert.notEqual(cart.pageId, viewed.pageId);
});

test('returning tabs and acknowledgments preserve newly queued events without resurrecting accepted ones', () => {
  const window = browser();
  const first = createJourneyQueue(() => window);
  const second = createJourneyQueue(() => window);
  const viewed = first.record('homepage_viewed');
  second.read();
  const cart = second.record('add_to_cart');
  const click = first.record('homepage_button_clicked');
  second.acknowledge([viewed.eventId, cart.eventId]);
  assert.deepEqual(first.read().map(event => event.eventId), [click.eventId]);
  first.record('homepage_button_clicked');
  assert.equal(second.read().length, 2);
});

test('storage restrictions fall back to memory and never break booking', () => {
  const window = browser();
  Object.defineProperties(window, {
    localStorage: { get() { throw new Error('blocked'); } },
    sessionStorage: { get() { throw new Error('blocked'); } },
  });
  const queue = createJourneyQueue(() => window);
  const first = queue.record('homepage_viewed');
  const second = queue.record('add_to_cart');
  assert.equal(first.visitId, second.visitId);
  assert.equal(queue.read().length, 2);
  queue.acknowledge([first.eventId]);
  assert.equal(queue.read().length, 1);
  queue.clear();
  assert.equal(queue.read().length, 0);
});

test('malformed, expired and future events are discarded and the queue stays bounded', () => {
  const window = browser();
  window.localStorage.setItem(KEY, '{invalid');
  const queue = createJourneyQueue(() => window);
  assert.deepEqual(queue.read(), []);
  const event = queue.record('homepage_viewed');
  window.localStorage.setItem(KEY, JSON.stringify([
    null, {}, event,
    { ...event, eventId: 'expired', occurredAt: new Date(Date.now() - 86400001).toISOString() },
    { ...event, eventId: 'future', occurredAt: new Date(Date.now() + 600000).toISOString() },
  ]));
  assert.deepEqual(queue.read(), [event]);
  for (let index = 0; index < 205; index += 1) queue.record('add_to_cart', { index });
  assert.equal(queue.read().length, 200);
  assert.equal(queue.read().at(-1).details.index, 204);
});

test('withdrawal removes only homepage events and purchase resets the visit', () => {
  const window = browser();
  const queue = createJourneyQueue(() => window);
  const first = queue.record('homepage_viewed');
  queue.record('homepage_button_clicked');
  queue.record('add_to_cart');
  queue.removeTypes(['homepage_viewed', 'homepage_button_clicked']);
  assert.deepEqual(queue.read().map(event => event.type), ['add_to_cart']);
  queue.clear();
  assert.notEqual(queue.record('homepage_viewed').visitId, first.visitId);
});

test('idle visits rotate and environment matching uses a path boundary', () => {
  const window = browser();
  const queue = createJourneyQueue(() => window);
  const first = queue.record('homepage_viewed');
  window.sessionStorage.setItem('ktk-storefront-journey-visit-v1', JSON.stringify({
    id: first.visitId, sequence: 3, lastActivityAt: Date.now() - 1800001,
  }));
  assert.notEqual(queue.record('product_viewed').visitId, first.visitId);
  assert.equal(journeyEnvironment('/staging/store2/'), 'staging');
  assert.equal(journeyEnvironment('/staging/'), 'staging');
  assert.equal(journeyEnvironment('/staging-other/'), 'production');
});
