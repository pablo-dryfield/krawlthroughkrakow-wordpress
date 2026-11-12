import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCartExperiences, sameCartExperience, upsertCartExperience } from './cart-experiences.js';
const ticket = { key: 'first', cartItemNumber: 1, productId: 28, quantity: 1,
  experienceDate: '2026-12-14', experienceTime: '21:00', addons: [], options: { participants: { men: 1, women: 0 } } };

test('a returned customer adding a shirt updates the one saved ticket', () => {
  const latest = { ...ticket, key: 'new', addons: [{ addonId: 2, quantity: 1, variants: [{ value: 'XL', quantity: 1 }] }], estimatedTotal: 164 };
  const before = structuredClone(ticket);
  const result = upsertCartExperience([ticket], latest);
  assert.equal(result.items.length, 1);
  assert.equal(result.item.key, 'first');
  assert.equal(result.item.cartItemNumber, 1);
  assert.deepEqual(result.item.addons, latest.addons);
  assert.equal(result.item.estimatedTotal, 164);
  assert.deepEqual(ticket, before);
});
test('repeated submissions do not add guests, and updated quantities replace earlier ones', () => {
  const first = upsertCartExperience([], ticket).items;
  assert.equal(upsertCartExperience(first, ticket).items.length, 1);
  const next = { ...ticket, quantity: 3, addons: [] };
  assert.equal(upsertCartExperience(first, next).items[0].quantity, 3);
});
test('the latest selection removes deselected extras and replaces gender counts', () => {
  const original = { ...ticket, addons: [{ addonId: 2, quantity: 1 }] };
  const latest = { ...ticket, options: { participants: { men: 0, women: 1 } } };
  const next = upsertCartExperience([original], latest).item;
  assert.deepEqual(next.addons, []);
  assert.deepEqual(next.options.participants, { men: 0, women: 1 });
});
test('different products, days and NYE start times remain separate', () => {
  for (const changed of [{ productId: 32 }, { experienceDate: '2026-12-15' }, { experienceTime: '19:30' }]) {
    const result = upsertCartExperience([ticket], { ...ticket, key: 'second', ...changed });
    assert.equal(result.items.length, 2);
  }
});
test('changing date on the product page creates a new entry with a different identity', () => {
  const result = upsertCartExperience([ticket], { ...ticket, experienceDate: '2026-12-15' });
  assert.equal(result.items.length, 2);
  assert.notEqual(result.items[0].key, result.items[1].key);
});
test('explicit cart editing can move a booking to another slot without keeping the old entry', () => {
  const result = upsertCartExperience([ticket], { ...ticket, experienceDate: '2026-12-15' }, 'first');
  assert.equal(result.items.length, 1);
  assert.equal(result.item.experienceDate, '2026-12-15');
  assert.equal(result.item.key, 'first');
});
test('editing into another existing slot keeps only the latest complete selection', () => {
  const other = { ...ticket, key: 'second', experienceDate: '2026-12-15' };
  const result = upsertCartExperience([ticket, other], { ...ticket, experienceDate: '2026-12-15', quantity: 4 }, 'first');
  assert.equal(result.items.length, 1);
  assert.equal(result.item.quantity, 4);
});
test('legacy browser and recovered carts keep the latest selection in a stable position', () => {
  const other = { ...ticket, key: 'other', productId: 32 };
  const latest = { ...ticket, key: 'latest', quantity: 2 };
  const result = normalizeCartExperiences([ticket, other, latest]);
  assert.deepEqual(result.map(item => [item.key, item.quantity]), [['first', 2], ['other', 1]]);
});
test('a fresh cart after payment accepts a new identical booking', () => {
  const result = upsertCartExperience([], { ...ticket, key: 'new-purchase' });
  assert.equal(result.items.length, 1);
  assert.equal(result.item.key, 'new-purchase');
});
test('fixed-time products identify their configured slot consistently', () => {
  const product = { config: { timeMode: 'fixed', defaultStartTime: '21:00' } };
  assert.equal(sameCartExperience({ ...ticket, product, experienceTime: null }, ticket), true);
});
