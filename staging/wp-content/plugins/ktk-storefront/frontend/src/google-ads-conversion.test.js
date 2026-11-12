import assert from 'node:assert/strict';
import test from 'node:test';

import { reportGoogleAdsOrderComplete } from './google-ads-conversion.js';

function browserRuntime() {
  const values = new Map();
  return {
    dataLayer: [],
    sessionStorage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
    },
  };
}

test('queues the GTM orderComplete event with the confirmed order ID and value', () => {
  const runtime = browserRuntime();

  assert.equal(reportGoogleAdsOrderComplete({
    publicId: '9bbdb60c-f6bf-4ddc-91ec-dd4521f9ef44',
    total: '546.00',
    currency: 'PLN',
  }, runtime), true);

  assert.deepEqual(runtime.dataLayer, [{
    event: 'orderComplete',
    orderId: '9bbdb60c-f6bf-4ddc-91ec-dd4521f9ef44',
    orderTotalValue: 546,
  }]);
});

test('does not queue the same confirmed order twice', () => {
  const runtime = browserRuntime();
  const order = {
    publicId: 'bd4b97fb-bd4a-4fd6-997e-f8f70c2909a0',
    total: 120,
  };

  assert.equal(reportGoogleAdsOrderComplete(order, runtime), true);
  assert.equal(reportGoogleAdsOrderComplete(order, runtime), false);
  assert.equal(runtime.dataLayer.length, 1);
});

test('rejects incomplete or invalid conversion data', () => {
  const runtime = browserRuntime();

  assert.equal(reportGoogleAdsOrderComplete({ total: 120 }, runtime), false);
  assert.equal(reportGoogleAdsOrderComplete({ publicId: 'order-1', total: 'invalid' }, runtime), false);
  assert.equal(reportGoogleAdsOrderComplete({ publicId: 'order-2', total: -1 }, runtime), false);
  assert.equal(runtime.dataLayer.length, 0);
});
