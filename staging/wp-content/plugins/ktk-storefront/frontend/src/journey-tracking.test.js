import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyticsConsentGranted,
  initializeJourneyTracking,
  pendingJourneyEvents,
  startJourneyReplay,
} from './journey-tracking.js';
import { createJourneyQueue } from './journey-queue.js';
import { randomUUID } from 'node:crypto';

function withWindow(value, callback) {
  const original = global.window;
  global.window = value;
  try {
    callback();
  } finally {
    global.window = original;
  }
}

test('recognizes Iubenda measurement consent', () => {
  withWindow({
    _iub: {
      cs: {
        api: {
          getPreferences: () => ({ purposes: { 4: true } }),
        },
      },
    },
  }, () => assert.equal(analyticsConsentGranted(), true));
});

test('does not treat general consent as measurement consent when Iubenda purpose 4 is denied', () => {
  withWindow({
    _iub: {
      cs: {
        api: {
          getPreferences: () => ({ purposes: { 4: false } }),
        },
      },
    },
    dataLayer: [{ event: 'iubenda_consent_given' }],
  }, () => assert.equal(analyticsConsentGranted(), false));
});

test('does not treat generic Iubenda consent as analytics consent without a purpose decision', () => {
  withWindow({
    dataLayer: [{ event: 'iubenda_consent_given' }],
  }, () => assert.equal(analyticsConsentGranted(), false));
});

test('recognizes Google analytics storage consent as a fallback', () => {
  withWindow({
    dataLayer: [['consent', 'update', { analytics_storage: 'granted' }]],
  }, () => assert.equal(analyticsConsentGranted(), true));
});

test('current denial takes precedence over a previous analytics grant', () => {
  withWindow({ KTK_ANALYTICS_CONSENT: false, dataLayer: [['consent', 'update', { analytics_storage: 'granted' }]] },
    () => assert.equal(analyticsConsentGranted(), false));
  withWindow({ dataLayer: [
    ['consent', 'update', { analytics_storage: 'granted' }],
    ['consent', 'update', { analytics_storage: 'denied' }],
  ] }, () => assert.equal(analyticsConsentGranted(), false));
});

test('homepage events require current consent and the matching environment; cart events are unchanged', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const browserWindow = { localStorage: storage, sessionStorage: storage, crypto: { randomUUID }, location: { pathname: '/store2/' }, KTK_ANALYTICS_CONSENT: true };
  withWindow(browserWindow, () => {
    const queue = createJourneyQueue();
    queue.record('homepage_viewed', { environment: 'production' });
    queue.record('homepage_viewed', { environment: 'staging' });
    queue.record('add_to_cart');
    queue.record('clarity_recording_linked', { environment: 'production' });
    assert.deepEqual(pendingJourneyEvents().map(event => event.type), ['homepage_viewed', 'add_to_cart', 'clarity_recording_linked']);
    browserWindow.KTK_ANALYTICS_CONSENT = false;
    assert.deepEqual(pendingJourneyEvents().map(event => event.type), ['add_to_cart']);
    assert.equal(queue.read().length, 3);
  });
});

test('starts replay before cart creation and attaches the cart identity later', () => {
  const calls = [];
  const storage = new Map();
  const browserWindow = {
    KTK_ANALYTICS_CONSENT: true,
    crypto: { randomUUID: () => 'visit-early-replay' },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    requestIdleCallback: (callback) => callback(),
    setTimeout,
    setInterval,
    clearInterval,
    clarity: (...args) => calls.push(args),
  };
  const originalNavigator = global.navigator;
  const originalDocument = global.document;
  global.window = browserWindow;
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: { connection: { effectiveType: '4g', saveData: false } },
  });
  global.document = {
    querySelector: () => ({ src: 'https://www.clarity.ms/tag/ufswk29c79' }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  try {
    initializeJourneyTracking({
      browserId: 'browser-1',
      pageId: 'page-1',
      area: 'product',
      productSlug: 'pub-crawl-28',
    });
    const replayConfig = {
      enabled: true,
      projectId: 'ufswk29c79',
      samplePercent: 100,
      requireAnalyticsConsent: true,
    };

    assert.equal(startJourneyReplay(replayConfig, null, { area: 'product' }), true);
    assert.equal(startJourneyReplay(replayConfig, 'cart-1', { area: 'cart' }), true);
    assert.ok(calls.some((args) => args[0] === 'identify' && args[1] === 'browser-1'));
    assert.ok(calls.some((args) => args[0] === 'set' && args[1] === 'product_slug'));
    assert.ok(calls.some((args) => args[0] === 'set' && args[1] === 'ongoing_cart_id' && args[2] === 'cart-1'));
  } finally {
    global.window = undefined;
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
    global.document = originalDocument;
  }
});
