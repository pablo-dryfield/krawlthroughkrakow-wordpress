import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING_SECTION_ORDER, resolveBookingSectionOrder } from './booking-sections.js';

test('uses the default booking section order when none is configured', () => {
  assert.deepEqual(resolveBookingSectionOrder(undefined), BOOKING_SECTION_ORDER);
});

test('keeps configured section order and appends missing sections', () => {
  assert.deepEqual(resolveBookingSectionOrder(['contact_details', 'date_time']), [
    'contact_details',
    'date_time',
    'group_size',
    'addons',
  ]);
});

test('removes unknown and duplicate booking sections', () => {
  assert.deepEqual(resolveBookingSectionOrder(['addons', 'bad', 'addons', 'group_size']), [
    'addons',
    'group_size',
    'date_time',
    'contact_details',
  ]);
});
