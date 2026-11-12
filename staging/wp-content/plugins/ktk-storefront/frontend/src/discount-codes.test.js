import assert from 'node:assert/strict';
import test from 'node:test';
import { singleDiscountCode } from './discount-codes.js';

test('restoring a legacy cart keeps only the most recently entered code', () => {
  assert.deepEqual(singleDiscountCode(['DISCOUNTED-PC', 'NOMADTABLE']), ['NOMADTABLE']);
});
test('normalizes singular, duplicate and empty codes without stacking', () => {
  assert.deepEqual(singleDiscountCode(' code '), ['CODE']);
  assert.deepEqual(singleDiscountCode(['code', 'CODE']), ['CODE']);
  assert.deepEqual(singleDiscountCode([null, 5, {}, ' ']), []);
  assert.deepEqual(singleDiscountCode(undefined), []);
});
