import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractPublishedContainer, summarizePublishedContainer, inspectStorefrontEvents } from '../booking-measurement.mjs';

const originalFetch = globalThis.fetch;
before(() => { globalThis.fetch = () => { throw new Error('Network forbidden in offline measurement fixtures'); }; });
after(() => { globalThis.fetch = originalFetch; });

function resource() {
  return { version: 'synthetic', macros: [
    { function: '__e' }, { function: '__v', vtp_name: 'orderId' },
    { function: '__v', vtp_name: 'orderTotalValue' },
  ], tags: [{ function: '__awct', tag_id: 42, vtp_orderId: ['macro', 1],
    vtp_conversionValue: ['macro', 2], vtp_currencyCode: 'PLN' }],
  predicates: [{ function: '_eq', arg0: ['macro', 0], arg1: 'orderComplete' }],
  rules: [[['if', 0], ['add', 0]]] };
}
const script = data => `(()=>{var data=${JSON.stringify({ resource: data })}; globalThis.remoteExecuted=true;})()`;

test('public container is parsed as data without executing downloaded JavaScript', () => {
  delete globalThis.remoteExecuted;
  assert.deepEqual(extractPublishedContainer(script(resource())), resource());
  assert.equal(globalThis.remoteExecuted, undefined);
});

test('missing, duplicate, computed or executable resources fail closed', () => {
  for (const text of ['', script(resource()) + script(resource()),
    `var data={"resource":${JSON.stringify(resource())},"resource":${JSON.stringify(resource())}}`,
    'var data={resource:runUntrusted()}', 'var data={resource:null}',
    'var data={ ["resource"]: {} }']) {
    assert.throws(() => extractPublishedContainer(text));
  }
  const bad = resource();
  bad.rules = null;
  assert.throws(() => extractPublishedContainer(script(bad)), /rules/);
});

test('Google Ads amount, order identity, currency and direct event predicate remain distinct', () => {
  const summary = summarizePublishedContainer(resource());
  const tag = summary.tags[0];
  assert.deepEqual(tag.parameters.vtp_orderId, { kind: 'dataLayer', name: 'orderId' });
  assert.deepEqual(tag.parameters.vtp_conversionValue, { kind: 'dataLayer', name: 'orderTotalValue' });
  assert.deepEqual(tag.parameters.vtp_currencyCode, { kind: 'literal', value: 'PLN' });
  assert.deepEqual(tag.triggers[0].conditions[0], { operation: 'if', function: '_eq',
    left: { kind: 'event' }, right: { kind: 'literal', value: 'orderComplete' } });
  assert.match(summary.limitation, /not provider receipt/);
});

test('unknown rule operations and invalid references are not silently interpreted', () => {
  for (const operation of ['unknown', 'if', 'add']) {
    const value = resource();
    value.rules = [[[operation, 99]]];
    assert.throws(() => summarizePublishedContainer(value));
  }
  const value = resource();
  value.tags[0].vtp_orderId = ['macro', -1];
  assert.throws(() => summarizePublishedContainer(value), /bounds/);
});

test('unless and block clauses are retained instead of claiming an unconditional firing rule', () => {
  const value = resource();
  value.rules = [[['unless', 0], ['add', 0], ['block', 0]]];
  const tag = summarizePublishedContainer(value).tags[0];
  assert.equal(tag.triggers[0].conditions[0].operation, 'unless');
  assert.deepEqual(tag.triggers[0].blockedTagIndexes, [0]);
});

test('source audit distinguishes the confirmed-order call from clicks and operational events', async () => {
  const text = await readFile(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/src/main.jsx', import.meta.url), 'utf8');
  const result = inspectStorefrontEvents(text);
  assert.equal(result.conversionCalls.length, 1);
  assert.equal(result.conversionCalls[0].enclosingCondition, 'paid');
  assert.equal(result.conversionCalls[0].branch, 'consequent');
  assert.equal(result.conversionCalls[0].argument, 'result');
  assert.ok(result.paidConditions.includes("result.paymentStatus === 'paid' || result.total === 0"));
  for (const event of ['product_viewed', 'booking_builder_reached', 'add_to_cart',
    'cart_item_updated', 'checkout_opened', 'payment_attempted', 'payment_error']) {
    assert.ok(result.journeyEvents.includes(event), event);
  }
  assert.ok(!result.journeyEvents.includes('purchase'));
});

test('unguarded and differently guarded conversion calls are reported rather than labelled paid', () => {
  const result = inspectStorefrontEvents('reportGoogleAdsOrderComplete(result); if (clicked) reportGoogleAdsOrderComplete(other);');
  assert.equal(result.conversionCalls.length, 2);
  assert.equal(result.conversionCalls[0].enclosingCondition, null);
  assert.equal(result.conversionCalls[1].enclosingCondition, 'clicked');
  assert.deepEqual(result.paidConditions, []);
  const branches = inspectStorefrontEvents('if(paid) { reportGoogleAdsOrderComplete(result); } else { reportGoogleAdsOrderComplete(other); }');
  assert.deepEqual(branches.conversionCalls.map(call => call.branch), ['consequent', 'alternate']);
});

test('real conversion helper deduplicates in memory and across a reload with retained session storage', async () => {
  const values = new Map();
  const browser = { dataLayer: [], sessionStorage: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
  } };
  const url = new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/src/google-ads-conversion.js', import.meta.url);
  const first = await import(url.href + '?funnel-first');
  const order = { publicId: 'synthetic-funnel-order-a', total: '250.00', currency: 'PLN' };
  assert.equal(first.reportGoogleAdsOrderComplete(order, browser), true);
  assert.equal(first.reportGoogleAdsOrderComplete(order, browser), false);
  const reload = await import(url.href + '?funnel-reload');
  assert.equal(reload.reportGoogleAdsOrderComplete(order, browser), false);
  assert.deepEqual(browser.dataLayer, [{ event: 'orderComplete', orderId: order.publicId, orderTotalValue: 250 }]);
  assert.equal(reload.reportGoogleAdsOrderComplete({ ...order, publicId: 'synthetic-funnel-order-b' }, browser), true);
  assert.equal(browser.dataLayer.length, 2);
});

test('blocked storage does not break conversion helper or permit same-module repeats', async () => {
  const browser = { dataLayer: [], sessionStorage: {
    getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); },
  } };
  const module = await import(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/src/google-ads-conversion.js?funnel-blocked', import.meta.url));
  const order = { publicId: 'synthetic-funnel-blocked', total: 100 };
  assert.equal(module.reportGoogleAdsOrderComplete(order, browser), true);
  assert.equal(module.reportGoogleAdsOrderComplete(order, browser), false);
  assert.equal(browser.dataLayer.length, 1);
});

test('invalid values never create a conversion event; valid zero-total orders are not paid-revenue evidence', async () => {
  const browser = { dataLayer: [], sessionStorage: { getItem() { return null; }, setItem() {} } };
  const module = await import(new URL('../../staging/wp-content/plugins/ktk-storefront/frontend/src/google-ads-conversion.js?funnel-values', import.meta.url));
  for (const order of [{ total: 100 }, { publicId: 'synthetic-invalid', total: 'not-a-number' },
    { publicId: 'synthetic-negative', total: -1 }, { publicId: 'synthetic-infinite', total: Infinity }]) {
    assert.equal(module.reportGoogleAdsOrderComplete(order, browser), false);
  }
  assert.equal(browser.dataLayer.length, 0);
  assert.equal(module.reportGoogleAdsOrderComplete({ publicId: 'synthetic-free-order', total: 0 }, browser), true);
  assert.equal(browser.dataLayer[0].orderTotalValue, 0);
});
