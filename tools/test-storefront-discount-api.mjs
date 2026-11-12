import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const expectedSha = process.argv[2];
const health = await (await fetch('https://omni-lodge.com/api/health/ready')).json();
assert.equal(health.ready, true);
assert.equal(health.release.gitSha, expectedSha);
const date = new Date();
date.setUTCDate(date.getUTCDate() + 7);
const item = { productId: 28, quantity: 2, experienceDate: date.toISOString().slice(0, 10), experienceTime: '21:00', addons: [], options: {
  participants: { men: 1, women: 1 },
  fullName: 'Discount Verification', email: 'discount-verification@example.invalid', phoneCountry: 'PL', phone: '+48500100200', phoneLocal: '500100200',
} };
const report = { checkedAt: new Date().toISOString(), release: health.release, checks: [], conditions: 'Quote-only requests without cartSessionId, ongoingCartPublicId, customer, attribution or journey events. No cart/order/promotion created.' };
for (const root of ['https://omni-lodge.com/api/storefront', 'https://krawlthroughkrakow.com/wp-json/ktk-storefront/v1']) {
  const quote = async codes => {
    const response = await fetch(`${root}/cart/quote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [item], discountCodes: codes }) });
    return { status: response.status, body: await response.json() };
  };
  const stacked = await quote(['DISCOUNTED-PC', 'NOMADTABLE']);
  assert.equal(stacked.status, 400);
  if (root.includes('omni-lodge.com')) assert.match(JSON.stringify(stacked.body), /Only one discount code/);
  else assert.equal(stacked.body.code, 'ktk_storefront_api_error');
  report.checks.push({ root, check: 'Two codes rejected', status: stacked.status, response: stacked.body });
  const none = await quote([]);
  assert.equal(none.status, 200, JSON.stringify(none.body));
  const single = await quote(['DISCOUNTED-PC']);
  assert.equal(single.status, 200, JSON.stringify(single.body));
  const expectedDiscount = Math.round((Number(none.body.subtotal) + Number(none.body.addonTotal)) * 8.33) / 100;
  assert.equal(single.body.discountTotal, expectedDiscount);
  assert.equal(single.body.discounts.length, 1);
  assert.equal(single.body.ongoingCart, null);
  report.checks.push({ root, check: 'One existing code applies once without creating a cart', subtotal: single.body.subtotal, discount: single.body.discountTotal, total: single.body.total });
}
await writeFile('docs/storefront-discounts/production-api.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
