import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { ga4PurchasePayload, ga4PurchaseConsentGranted, reportGa4Purchase, observeGa4Purchase } from './ga4-purchase.js';

const options = { enabled: true, environment: 'staging', measurementId: 'G-58KDXF12R8' };
const order = overrides => ({ publicId: randomUUID(), status: 'confirmed', paymentStatus: 'paid',
  currency: 'PLN', total: 546, customer: { email: 'private@example.invalid', phone: 'PRIVATE-PHONE' },
  items: [{ productId: 28, productName: 'PRIVATE-NAME', quantity: 2, total: 546,
    addons: [{ name: 'PRIVATE-OPTION' }], options: { note: 'PRIVATE-NOTE' } }], ...overrides });

function browser({ consent = true, autoLoad = true, values = new Map() } = {}) {
  const scripts = [], listeners = new Map(), intervals = new Map(), timeouts = new Map();
  let next = 0;
  const w = {
    location: { origin: 'https://krawlthroughkrakow.com', pathname: '/staging/store2/checkout/success/', search: '?payment_intent_client_secret=PRIVATE-QUERY' },
    KTK_ANALYTICS_CONSENT: consent,
    _iub: { cs: { api: { getPreferences: () => ({ purposes: { 4: w.KTK_ANALYTICS_CONSENT } }) } } },
    dataLayer: [],
    sessionStorage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) },
    document: { cookie: '', getElementById: () => null, createElement: () => ({ dataset: {} }),
      head: { appendChild: script => { scripts.push(script); if (autoLoad) queueMicrotask(() => script.onload()); } } },
    setInterval: callback => { const id = ++next; intervals.set(id, callback); return id; },
    clearInterval: id => intervals.delete(id),
    setTimeout: callback => { const id = ++next; timeouts.set(id, callback); return id; },
    clearTimeout: id => timeouts.delete(id),
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
  };
  return { w, scripts, values, intervals, timeouts, listeners,
    commands: () => (w.ktkGa4PurchaseDataLayer || []).map(x => Array.from(x)),
    consentEvent: () => listeners.get('ktk:analytics-consent')?.() };
}

test('builds paid revenue and item quantities from a confirmed order without copying personal fields', () => {
  const o = order();const p = ga4PurchasePayload(o);
  assert.deepEqual(p, { eventName: 'purchase', parameters: { transaction_id: o.publicId,
    currency: 'PLN', value: 546, items: [{ item_id: '28', quantity: 2, price: 273 }] } });
  assert.doesNotMatch(JSON.stringify(p), /PRIVATE|example\.invalid|customer|options|bookingId/);
});

test('allocates an order discount exactly across experiences with add-ons included once', () => {
  const p = ga4PurchasePayload(order({ total: 500, items: [
    { productId: 28, quantity: 3, total: 400 }, { productId: 32, quantity: 2, total: 146 },
  ] }));
  assert.equal(p.parameters.value, 500);
  assert.equal(p.parameters.items.reduce((sum, x) => sum + x.price * x.quantity, 0), 500);
  assert.equal(p.parameters.items.length, 2);
  assert.deepEqual(p.parameters.items.map(x => x.quantity), [3, 2]);
});

test('keeps valid free bookings out of positive paid purchase counts', () => {
  const p = ga4PurchasePayload(order({ total: 0 }));
  assert.equal(p.eventName, 'ktk_free_booking_confirmed');
  assert.equal(p.parameters.value, 0);
  assert.equal(p.parameters.items[0].price, 0);
});

test('rejects unpaid, cancelled, malformed, excess-precision and inconsistent order data', () => {
  for (const patch of [ { paymentStatus: 'unpaid' }, { paymentStatus: 'failed' }, { status: 'cancelled' },
    { publicId: 'ECWID' }, { publicId: ' private@example.invalid ' }, { currency: 'pln' },
    { total: null }, { total: '' }, { total: false }, { total: -1 }, { total: Infinity },
    { total: 1.005 }, { total: 547 }, { items: [] }, { items: [{ productId: 'private', quantity: 1, total: 546 }] },
    { items: [{ productId: 28, quantity: 0, total: 546 }] },
    { items: Array.from({ length: 201 }, () => ({ productId: 28, quantity: 1, total: 546 })) },
  ]) assert.equal(ga4PurchasePayload(order(patch)), null, JSON.stringify(patch));
});

test('requires both the current bridge and an explicit current purpose-4 decision', () => {
  const b = browser();assert.equal(ga4PurchaseConsentGranted(b.w), true);
  b.w.KTK_ANALYTICS_CONSENT = false;assert.equal(ga4PurchaseConsentGranted(b.w), false);
  b.w.KTK_ANALYTICS_CONSENT = true;b.w._iub.cs.api.getPreferences = () => ({ consent: true });
  b.w.dataLayer.push({ event: 'iubenda_consent_given_purpose_4' });
  assert.equal(ga4PurchaseConsentGranted(b.w), false);
  b.w._iub.cs.api.getPreferences = () => ({ purposes: { 4: false } });
  assert.equal(ga4PurchaseConsentGranted(b.w), false);
});

test('cookie fallback is bound to the current CMP policy and explicit purpose', () => {
  const b = browser();delete b.w._iub.cs.api;b.w._iub.csConfiguration = { cookiePolicyId: 12345 };
  b.w.document.cookie = '_iub_cs-99999=' + encodeURIComponent(JSON.stringify({ purposes: { 4: true } }));
  assert.equal(ga4PurchaseConsentGranted(b.w), false);
  b.w.document.cookie += '; _iub_cs-12345=' + encodeURIComponent(JSON.stringify({ purposes: { 4: false } }));
  assert.equal(ga4PurchaseConsentGranted(b.w), false);
  b.w.document.cookie = '_iub_cs-12345=' + encodeURIComponent(JSON.stringify({ purposes: { 4: true } }));
  assert.equal(ga4PurchaseConsentGranted(b.w), true);
  b.w.document.cookie = '_iub_cs-12345=%broken';assert.equal(ga4PurchaseConsentGranted(b.w), false);
});

test('production, other routes, missing destination and denied consent load no tag or event', async () => {
  for (const change of [b => { b.w.location.pathname = '/store2/checkout/success'; },
    b => { b.w.location.pathname = '/staging/store2/pub-crawl-28'; },
    b => { b.w.location.origin = 'https://example.invalid'; },
    b => { b.w.KTK_ANALYTICS_CONSENT = false; },
  ]) { const b = browser();change(b);assert.equal(await reportGa4Purchase(order(), options, b.w), false);assert.equal(b.scripts.length, 0); }
  for (const patch of [{ enabled: false }, { environment: 'production' }, { measurementId: '' }, { measurementId: 'AW-12345' }]) {
    const b = browser();assert.equal(await reportGa4Purchase(order(), { ...options, ...patch }, b.w), false);assert.equal(b.scripts.length, 0);
  }
});

test('queues one destination-specific event with safe page context and no consent-mode mutation', async () => {
  const b = browser();const o = order();assert.equal(await reportGa4Purchase(o, options, b.w), true);
  assert.equal(b.scripts.length, 1);assert.equal(b.scripts[0].dataset.iubPurposes, '4');
  assert.equal(b.scripts[0].referrerPolicy, 'origin');
  const commands = b.commands();assert.deepEqual(commands.map(x => x[0]), ['js', 'config', 'event']);
  assert.equal(commands[1][2].send_page_view, false);
  assert.equal(commands[1][2].allow_google_signals, false);
  assert.equal(commands[1][2].allow_ad_personalization_signals, false);
  assert.equal(commands[1][2].user_data, null);assert.equal(commands[2][2].user_data, null);
  assert.equal(commands[2][1], 'purchase');assert.equal(commands[2][2].send_to, options.measurementId);
  assert.equal(commands[2][2].page_location, 'https://krawlthroughkrakow.com/staging/store2/checkout/success/');
  assert.equal(commands[2][2].page_referrer, '');
  assert.deepEqual(b.w.dataLayer, []);assert.equal(b.w.gtag, undefined);
  assert.match(b.scripts[0].src, /&l=ktkGa4PurchaseDataLayer$/);
  assert.doesNotMatch(JSON.stringify(commands), /PRIVATE|consent.*granted|example\.invalid/);
});

test('deduplicates concurrent calls and reloads through separate browser runtimes', async () => {
  const b = browser({ autoLoad: false });const o = order();
  const first = reportGa4Purchase(o, options, b.w);
  assert.equal(await reportGa4Purchase(o, options, b.w), false);
  b.scripts[0].onload();assert.equal(await first, true);
  assert.equal(await reportGa4Purchase(o, options, b.w), false);
  const reloaded = browser({ values: b.values });
  assert.equal(await reportGa4Purchase(o, options, reloaded.w), false);
  assert.equal(reloaded.scripts.length, 0);
});

test('withdrawal or route departure while the tag loads queues no purchase', async () => {
  for (const change of [b => { b.w.KTK_ANALYTICS_CONSENT = false; }, b => { b.w.location.pathname = '/staging/'; }]) {
    const b = browser({ autoLoad: false });const p = reportGa4Purchase(order(), options, b.w);
    change(b);b.scripts[0].onload();assert.equal(await p, false);assert.equal(b.commands().filter(x => x[0] === 'event').length, 0);
  }
});

test('blocked storage and loader errors do not produce purchases or automatic replays', async () => {
  const blocked = browser();blocked.w.sessionStorage.getItem = () => { throw new Error('blocked'); };
  assert.equal(await reportGa4Purchase(order(), options, blocked.w), false);assert.equal(blocked.scripts.length, 0);
  const b = browser({ autoLoad: false });const o = order();const p = reportGa4Purchase(o, options, b.w);
  b.scripts[0].onerror();assert.equal(await p, false);
  assert.equal(await reportGa4Purchase(o, options, b.w), false);assert.equal(b.scripts.length, 1);assert.equal(b.commands().filter(x => x[0] === 'event').length, 0);
});

test('a thrown tag call consumes the attempt and is not replayed after reload', async () => {
  const b = browser();const o = order();b.w.ktkGa4PurchaseDataLayer = [];
  b.w.ktkGa4PurchaseDataLayer.push = (...args) => { if (args[0]?.[0] === 'event') throw new Error('uncertain'); return Array.prototype.push.apply(b.w.ktkGa4PurchaseDataLayer, args); };
  assert.equal(await reportGa4Purchase(o, options, b.w), false);
  const reloaded = browser({ values: b.values });
  assert.equal(await reportGa4Purchase(o, options, reloaded.w), false);assert.equal(reloaded.scripts.length, 0);
});

test('the observer waits for current consent and removes its listeners and timers', async () => {
  const b = browser({ consent: false });observeGa4Purchase(order(), options, b.w);
  assert.equal(b.scripts.length, 0);b.w.KTK_ANALYTICS_CONSENT = true;b.consentEvent();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(b.commands().filter(x => x[0] === 'event').length, 1);
  assert.equal(b.listeners.size, 0);assert.equal(b.intervals.size, 0);assert.equal(b.timeouts.size, 0);
});

test('observer cleanup prevents a purchase after the component is unmounted', async () => {
  const b = browser({ autoLoad: false });const stop = observeGa4Purchase(order(), options, b.w);
  stop();b.scripts[0].onload();await new Promise(resolve => setImmediate(resolve));
  assert.equal(b.commands().filter(x => x[0] === 'event').length, 0);assert.equal(b.listeners.size, 0);
});

test('a remounted confirmation waits for the earlier cancelled loader and reports once', async () => {
  const b = browser({ autoLoad: false });const o = order();
  const stopFirst = observeGa4Purchase(o, options, b.w);stopFirst();
  observeGa4Purchase(o, options, b.w);
  b.scripts[0].onload();await new Promise(resolve => setImmediate(resolve));
  assert.equal(b.commands().filter(x => x[0] === 'event').length, 0);
  for (const tick of b.intervals.values()) tick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(b.commands().filter(x => x[0] === 'event').length, 1);
  assert.equal(b.scripts.length, 1);assert.equal(b.intervals.size, 0);
});
