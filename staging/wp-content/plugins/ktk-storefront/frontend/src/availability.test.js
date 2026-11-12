import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateProductAvailability, normalizeAvailabilityConfig } from './availability.js';

describe('storefront availability', () => {
  it('blocks configured dates and exposes redirect product slugs', () => {
    const result = evaluateProductAvailability({
      availability: {
        blockedDates: [{
          date: '2026-12-31',
          reason: 'Book the New Year party instead.',
          redirectProductSlug: 'new-year-party-91',
        }],
      },
    }, {
      experienceDate: '2026-12-31',
      experienceTime: '21:00',
      now: new Date('2026-12-30T12:00:00Z'),
    });

    assert.equal(result.available, false);
    assert.equal(result.reason, 'blocked_date');
    assert.equal(result.message, 'Book the New Year party instead.');
    assert.equal(result.redirectProductSlug, 'new-year-party-91');
  });

  it('uses a zero minute default cutoff when no cutoff is configured', () => {
    const result = evaluateProductAvailability({}, {
      experienceDate: '2026-08-29',
      experienceTime: '21:00',
      now: new Date('2026-08-29T18:45:00Z'),
    });

    assert.equal(result.available, true);
    assert.equal(result.reason, 'available');
    assert.equal(result.cutoffMinutes, 0);
  });

  it('uses date overrides to reopen blocked dates with a shorter cutoff', () => {
    const config = {
      availability: {
        cutoffMinutes: 360,
        blockedDates: [{ date: '2026-10-31' }],
        dateOverrides: [{ date: '2026-10-31', mode: 'available', cutoffMinutes: 30 }],
      },
    };

    assert.equal(evaluateProductAvailability(config, {
      experienceDate: '2026-10-31',
      experienceTime: '21:00',
      now: new Date('2026-10-31T17:30:00Z'),
    }).available, true);

    const late = evaluateProductAvailability(config, {
      experienceDate: '2026-10-31',
      experienceTime: '21:00',
      now: new Date('2026-10-31T19:45:00Z'),
    });
    assert.equal(late.available, false);
    assert.equal(late.reason, 'cutoff');
    assert.equal(late.cutoffMinutes, 30);
  });

  it('fixes an event to one configured date', () => {
    const config = {
      availability: {
        dateMode: 'fixed',
        fixedDate: '2026-12-31',
      },
    };

    assert.equal(evaluateProductAvailability(config, {
      experienceDate: '',
      experienceTime: '21:00',
      now: new Date('2026-12-30T12:00:00Z'),
    }).available, true);

    const wrongDate = evaluateProductAvailability(config, {
      experienceDate: '2026-12-30',
      experienceTime: '21:00',
      now: new Date('2026-12-30T12:00:00Z'),
    });
    assert.equal(wrongDate.available, false);
    assert.equal(wrongDate.reason, 'fixed_date_mismatch');
    assert.equal(wrongDate.message, 'This experience is only available on 31 Dec 2026.');
  });

  it('limits allowed-date products to their configured date list', () => {
    const config = {
      availability: {
        dateMode: 'allowed_dates',
        allowedDates: ['2026-10-31', '2026-12-31'],
      },
    };

    assert.equal(evaluateProductAvailability(config, {
      experienceDate: '2026-10-31',
      experienceTime: '21:00',
      now: new Date('2026-10-30T12:00:00Z'),
    }).available, true);

    const unavailable = evaluateProductAvailability(config, {
      experienceDate: '2026-11-01',
      experienceTime: '21:00',
      now: new Date('2026-10-30T12:00:00Z'),
    });
    assert.equal(unavailable.available, false);
    assert.equal(unavailable.reason, 'not_allowed_date');
  });

  it('normalizes invalid entries out of the storefront payload', () => {
    assert.deepEqual(normalizeAvailabilityConfig({
      availability: {
        dateMode: 'allowed dates only',
        allowedDates: ['2026-10-31', 'bad', '2026-10-31'],
        cutoffMinutes: '45',
        blockedDates: [
          { date: '2026-12-31', redirectProductId: '91' },
          { date: '31-12-2026' },
        ],
        dateOverrides: [
          { date: '2026-10-31', mode: 'blocked', enabled: false },
          { date: 'not-a-date' },
        ],
      },
    }), {
      dateMode: 'allowed_dates',
      allowedDates: ['2026-10-31'],
      cutoffMinutes: 45,
      blockedDates: [{ date: '2026-12-31', redirectProductId: 91 }],
      dateOverrides: [{ date: '2026-10-31', enabled: false, mode: 'blocked' }],
    });
  });
});
