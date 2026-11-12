import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';

test('a queued replay start respects withdrawal and resumes only after a later grant', async () => {
  const original = { window: global.window, document: global.document, navigator: global.navigator };
  const calls = [], scripts = [], idle = [], listeners = new Map(), data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const win = {
    KTK_ANALYTICS_CONSENT: true, location: { pathname: '/store2/' }, crypto: { randomUUID },
    localStorage: storage, sessionStorage: storage, clarity: (...args) => calls.push(args),
    requestIdleCallback: callback => idle.push(callback),
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
    setTimeout, setInterval: () => 1, clearInterval: () => {},
  };
  global.window = win;
  global.document = {
    querySelector: () => null, createElement: () => ({ dataset: {} }), head: { appendChild: script => scripts.push(script) },
    addEventListener: () => {}, removeEventListener: () => {},
  };
  Object.defineProperty(global, 'navigator', { configurable: true, value: {} });
  try {
    const tracking = await import('./journey-tracking.js?delayed-consent-test');
    tracking.initializeJourneyTracking({ pageId: 'page', browserId: 'browser' });
    const config = { enabled: true, projectId: 'project1', samplePercent: 100, requireAnalyticsConsent: true };
    assert.equal(tracking.startJourneyReplay(config), true);
    win.KTK_ANALYTICS_CONSENT = false;
    idle.shift()();
    assert.equal(scripts.length, 0);
    assert.equal(calls.some(call => call[0] === 'consentv2'), false);
    assert.equal(calls.some(call => call[0] === 'metadata'), false);
    assert.ok(listeners.has('ktk:analytics-consent'));
    win.KTK_ANALYTICS_CONSENT = true;
    listeners.get('ktk:analytics-consent')();
    idle.shift()();
    assert.equal(scripts.length, 1);
    assert.equal(calls.filter(call => call[0] === 'consentv2').length, 1);
    assert.equal(listeners.has('ktk:analytics-consent'), false);
  } finally {
    global.window = original.window;
    global.document = original.document;
    Object.defineProperty(global, 'navigator', { configurable: true, value: original.navigator });
  }
});
