import assert from 'node:assert/strict';
import test from 'node:test';

import { cartItemJourneySnapshot, nextCartItemNumber } from './cart-journey.js';

const pubCrawl = {
  key: '28-1788016027000',
  cartItemNumber: 2,
  productId: 28,
  productSlug: 'pub-crawl-28',
  productName: 'Pub Crawl',
  quantity: 4,
  experienceDate: '2026-08-29',
  experienceTime: '21:00',
  options: { participants: { men: 4, women: 0 } },
  addons: [{
    addonId: 2,
    quantity: 3,
    variants: [
      { value: 'S', quantity: 1 },
      { value: 'M', quantity: 2 },
    ],
  }],
  estimatedTotal: 546,
  currency: 'PLN',
  product: {
    price: { amount: 120, currency: 'PLN' },
    addons: [{ id: 2, name: 'T-Shirts' }],
  },
};

test('captures the stable item identity and complete cart selection', () => {
  assert.deepEqual(cartItemJourneySnapshot(pubCrawl, 2), {
    cartItemId: '28-1788016027000',
    cartItemNumber: 2,
    cartPosition: 2,
    productId: 28,
    productSlug: 'pub-crawl-28',
    productName: 'Pub Crawl',
    quantity: 4,
    experienceDate: '2026-08-29',
    experienceTime: '21:00',
    participants: { men: 4, women: 0 },
    addons: [{
      addonId: 2,
      name: 'T-Shirts',
      quantity: 3,
      value: null,
      variants: [
        { value: 'S', quantity: 1 },
        { value: 'M', quantity: 2 },
      ],
    }],
    itemTotal: 546,
    currency: 'PLN',
  });
});

test('keeps item numbering monotonic after a cart line is removed', () => {
  assert.equal(nextCartItemNumber([
    { cartItemNumber: 1 },
    { cartItemNumber: 3 },
  ]), 4);
});
