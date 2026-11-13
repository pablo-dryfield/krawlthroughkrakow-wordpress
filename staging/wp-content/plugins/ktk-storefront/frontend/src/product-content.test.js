import test from 'node:test';
import assert from 'node:assert/strict';
import { getPastCampaign, getProductContent } from './product-content.js';

const halloween = () => ({
  id: 51, slug: 'halloween-pub-crawl-51',
  config: {
    availability: {
      dateMode: 'allowed_dates', allowedDates: ['2026-10-29', '2026-10-30', '2026-10-31'],
    },
    content: { description: 'Original upcoming campaign', highlights: ['Original inclusion'] },
  },
});

test('owner-confirmed food count fills only a missing summary', () => {
  const food = { id: 48, slug: 'food-tour-krakow-48' };
  assert.match(getProductContent(food).summary, /13-14 Polish food tastings/);
  assert.equal(getProductContent({ ...food, summary: 'Product summary' }).summary, 'Product summary');
  assert.equal(getProductContent({ ...food, config: { content: { summary: 'Configured summary' } } }).summary, 'Configured summary');
});

test('past notice applies only after the complete confirmed campaign', () => {
  const product = halloween();
  assert.equal(getPastCampaign(product, '2026-10-28'), null);
  assert.equal(getPastCampaign(product, '2026-10-31'), null);
  assert.equal(getPastCampaign(product, 'invalid'), null);
  assert.match(getPastCampaign(product, '2026-11-01').nextDates, /to be announced/);
  assert.match(getPastCampaign(product, '2026-11-13').label, /2026 has finished/);
});

test('a confirmed new campaign or available override is not blocked by old editorial data', () => {
  for (const changes of [
    { dateMode: 'fixed', fixedDate: '2027-10-31' },
    { allowedDates: ['2027-10-29', '2027-10-30', '2027-10-31'] },
    { allowedDates: ['2026-10-29', '2026-10-30', '2026-10-31', '2027-10-31'] },
    { allowedDates: [] },
    { dateOverrides: [{ date: '2026-11-20', mode: 'available' }] },
    { dateOverrides: {} },
  ]) {
    const product = halloween();
    Object.assign(product.config.availability, changes);
    assert.equal(getPastCampaign(product, '2026-11-13'), null);
  }
});

test('closed/disabled overrides do not reopen an ended campaign', () => {
  for (const rule of [
    { date: '2026-11-20', mode: 'blocked' },
    { date: '2026-11-20', mode: 'closed' },
    { date: '2026-11-20', enabled: false },
    { date: '2026-10-30', mode: 'available' },
  ]) {
    const product = halloween();
    product.config.availability.dateOverrides = [rule];
    assert.ok(getPastCampaign(product, '2026-11-13'));
  }
});

test('unrelated products, IDs and missing configurations are never archived', () => {
  for (const product of [
    { ...halloween(), id: 52 }, { ...halloween(), slug: 'nye-pub-crawl-32' },
    { id: 51, slug: 'halloween-pub-crawl-51' }, {},
  ]) assert.equal(getPastCampaign(product, '2026-11-13'), null);
});

test('campaign resolution leaves the original product and commerce configuration intact', () => {
  const product = halloween();
  const original = JSON.stringify(product);
  getProductContent(product);
  assert.equal(JSON.stringify(product), original);
});
