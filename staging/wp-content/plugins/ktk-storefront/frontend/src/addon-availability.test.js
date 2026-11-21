import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAddonAvailability } from './addon-availability.js';

test('current public cocktail rule agrees on all seven actual experience dates', () => {
  const config = { availability: { enabled: true, daysOfWeek: [1, 2, 3, 4, 7] } };
  const dates = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'];
  assert.deepEqual(dates.map(date => evaluateAddonAvailability(config, date).available), [true, true, true, true, false, false, true]);
});

test('unrestricted add-ons remain usable before a date is selected', () => {
  for (const config of [undefined, {}, { availability: {} }, { availability: { enabled: true } }]) {
    assert.equal(evaluateAddonAvailability(config, '').available, true);
  }
});

test('disabled add-ons stay unavailable even on an allowed date', () => {
  assert.deepEqual(evaluateAddonAvailability({ availability: { enabled: false, daysOfWeek: [1] } }, '2026-11-23'), { available: false, reason: 'disabled' });
});

test('date-restricted add-ons require a real calendar date', () => {
  const config = { availability: { daysOfWeek: [1, 2, 3, 4, 5, 6, 7] } };
  for (const value of [undefined, null, '', '2026-2-01', '2026-02-29', '2026-04-31', '2026-13-01', '2026-11-23T00:00:00Z', 'garbage']) {
    assert.deepEqual(evaluateAddonAvailability(config, value), { available: false, reason: 'date_required' });
  }
  assert.equal(evaluateAddonAvailability(config, '2028-02-29').available, true);
});

test('malformed published weekday rules fail closed', () => {
  for (const availability of [null, [], 'false', { enabled: 'false' }, { daysOfWeek: [] }, { daysOfWeek: [0] }, { daysOfWeek: [8] }, { daysOfWeek: ['1'] }, { daysOfWeek: [1, 1] }, { daysOfWeek: [1.5] }]) {
    assert.deepEqual(evaluateAddonAvailability({ availability }, '2026-11-23'), { available: false, reason: 'invalid_rule' });
  }
});

test('Sunday and Monday use the experience date independently of buyer timezone', () => {
  const config = { availability: { daysOfWeek: [7] } };
  const previous = process.env.TZ;
  try {
    for (const zone of ['Europe/Warsaw', 'Pacific/Kiritimati', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.equal(evaluateAddonAvailability(config, '2026-11-29').available, true);
      assert.equal(evaluateAddonAvailability(config, '2026-11-30').available, false);
      assert.equal(evaluateAddonAvailability(config, '2026-10-25').available, true);
    }
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});
