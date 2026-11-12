import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const integrationPath = fileURLToPath(new URL('../../staging/wp-content/mu-plugins/ktk-homepage-assets/integrations.php', import.meta.url));
const markup = execFileSync('php', ['-r',
  'define("ABSPATH", __DIR__); function add_action(...$args) {} require $argv[1]; echo ktk_homepage_clarity_consent_bridge_html();',
  integrationPath,
], { encoding: 'utf8' });
const script = markup.slice(markup.indexOf('>') + 1, markup.lastIndexOf('</script>'));

function createBrowser(initialConsent) {
  const callbacks = [];
  const dispatched = [];
  const listeners = [];
  const document = {
    cookie: '',
    addEventListener: (...args) => listeners.push(args),
  };
  function setCookie(consent) {
    document.cookie = consent === undefined ? '' : `_iub_cs-123=${encodeURIComponent(JSON.stringify({ purposes: { 4: consent } }))}`;
  }
  setCookie(initialConsent);
  const window = {
    setTimeout: (callback) => callbacks.push(callback),
    setInterval: () => 1,
    clearInterval: () => {},
    dispatchEvent: (event) => dispatched.push(event),
    addEventListener: (...args) => listeners.push(args),
  };
  const context = vm.createContext({
    window, document,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  });
  vm.runInContext(script, context);
  return {
    window, context, setCookie, dispatched, listeners,
    flush: () => { while (callbacks.length) callbacks.shift()(); },
  };
}

const fresh = createBrowser();
assert.equal(fresh.window.KTK_ANALYTICS_CONSENT, false, 'A new visitor defaults to denied analytics');
fresh.window.dataLayer.push({ event: 'iubenda_consent_given_purpose_4' });
assert.equal(fresh.window.KTK_ANALYTICS_CONSENT, true, 'Purpose 4 acceptance enables analytics');
fresh.setCookie(false);
fresh.window.dataLayer.push({ event: 'iubenda_consent_rejected' });
fresh.flush();
assert.equal(fresh.window.KTK_ANALYTICS_CONSENT, false, 'Withdrawal disables analytics');
const clarityStates = Array.from(fresh.window.clarity.q, (args) => args[1].analytics_Storage);
assert.deepEqual(clarityStates, ['denied', 'granted', 'denied']);
assert.ok(Array.from(fresh.window.clarity.q).every((args) => args[1].ad_Storage === 'denied'), 'Clarity advertising storage remains denied');
assert.ok(fresh.dispatched.every((event) => Object.keys(event.detail).join() === 'analytics'), 'Consent events contain no visitor information');

const listenerCount = fresh.listeners.length;
vm.runInContext(script, fresh.context);
assert.equal(fresh.listeners.length, listenerCount, 'A duplicate embed adds no listeners');
assert.equal(fresh.window.clarity.q.length, 3, 'A duplicate embed adds no consent transitions');

const returning = createBrowser(true);
assert.equal(returning.window.KTK_ANALYTICS_CONSENT, true, 'Stored analytics consent is respected');
returning.window._iub = { cs: { api: { getPreferences: () => ({ purposes: { 4: false } }) } } };
returning.window.dataLayer.push({ event: 'iubenda_preferences_updated' });
returning.flush();
assert.equal(returning.window.KTK_ANALYTICS_CONSENT, false, 'Current Iubenda API preference overrides an older cookie');

console.log('Homepage consent tests passed: default denial, grant, withdrawal, stored preference, API preference, and duplicate guard.');

const parityScript = readFileSync(new URL('../../staging/wp-content/mu-plugins/ktk-homepage-assets/parity.js', import.meta.url), 'utf8');
function bookingClick({ href, productId, position = 'hero', consent = true }) {
  const location = new URL('https://krawlthroughkrakow.com/staging/?utm_source=booking-test');
  class Anchor {
    constructor() {
      this.href = new URL(href, location).href;
      this.dataset = {};
      if (productId !== undefined) this.dataset.productId = productId;
      if (position !== null) this.dataset.book = position;
    }
    hasAttribute(name) {
      return name === 'data-book' ? position !== null : name === 'data-product-id' && productId !== undefined;
    }
    closest(selector) { return selector === 'a[href]' ? this : null; }
  }
  const anchor = new Anchor();
  const listeners = [];
  const document = {
    readyState: 'complete',
    body: { classList: { remove() {}, add() {}, toggle() {} } },
    querySelector: () => null,
    querySelectorAll: selector => selector === 'a[href]' ? [anchor] : [],
    addEventListener: (name, callback) => listeners.push({ name, callback }),
  };
  const window = { KTK_ANALYTICS_CONSENT: consent };
  let requests = 0;
  const unexpectedRequest = () => { requests++; throw new Error('Booking attribution must not create a request'); };
  vm.runInNewContext(parityScript, {
    window, document, location, URL, URLSearchParams, Element: Anchor,
    navigator: { userAgent: 'Chrome', platform: 'Win32', maxTouchPoints: 0, sendBeacon: unexpectedRequest },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    localStorage: { getItem: () => null, setItem() {} },
    fetch: unexpectedRequest,
  });
  listeners.filter(listener => listener.name === 'click').forEach(listener => listener.callback({ target: anchor, button: 0 }));
  assert.equal(requests, 0, 'Booking attribution must not create fetch or beacon requests');
  return { events: JSON.parse(JSON.stringify(window.dataLayer || [])), href: anchor.href };
}
const nye = bookingClick({ href: '/staging/store2/nye-pub-crawl-32/?utm_medium=existing#book', productId: '32', position: 'hero-nye' });
assert.deepEqual(nye.events, [{ event: 'ktk_homepage_booking_click', product_id: 32, cta_position: 'hero-nye' }], 'NYE is not mislabeled as product 28');
assert.equal(new URL(nye.href).hash, '#book', 'Booking attribution retains the booking anchor');
assert.equal(new URL(nye.href).searchParams.get('utm_source'), 'booking-test', 'NYE retains existing attribution decoration');
assert.equal(new URL(nye.href).searchParams.get('utm_medium'), 'existing', 'Booking attribution does not overwrite destination parameters');
const halloween = bookingClick({ href: '/staging/store2/halloween-pub-crawl-51/#book', productId: '51', position: 'hero-halloween' });
assert.deepEqual(halloween.events, [{ event: 'ktk_homepage_booking_click', product_id: 51, cta_position: 'hero-halloween' }], 'Halloween is attributed to its own product, not the regular crawl');
assert.equal(new URL(halloween.href).searchParams.get('utm_source'), 'booking-test', 'Halloween retains attribution decoration');
assert.equal(new URL(halloween.href).hash, '#book', 'Halloween retains the booking anchor');
for (const [slug, id] of [['pub-crawl-28', 28], ['nye-pub-crawl-32', 32], ['halloween-pub-crawl-51', 51]]) {
  for (const prefix of ['', '/staging']) {
    const inferred = bookingClick({ href: `${prefix}/store2/${slug}/#book`, position: null });
    assert.equal(inferred.events[0]?.product_id, id, `Known ${slug} route supplies its own product ID`);
  }
}
assert.equal(bookingClick({ href: '/staging/store2/private-pub-crawl-31/#book', productId: '31' }).events[0]?.product_id, 31, 'An explicit positive ID supports another configured product');
for (const productId of ['', '0', '-1', '1.5', '32x', '+32', ' 32 ', '032', '1e2', 'Infinity', 'NaN', '9007199254740992']) {
  assert.deepEqual(bookingClick({ href: '/staging/store2/nye-pub-crawl-32/#book', productId }).events, [], `Invalid explicit product ID ${JSON.stringify(productId)} is rejected`);
}
assert.deepEqual(bookingClick({ href: '/staging/store2/nye-pub-crawl-32/#book', productId: '28' }).events, [], 'A mismatched known route and product ID cannot generate incorrect attribution');
assert.deepEqual(bookingClick({ href: '/staging/store2/halloween-pub-crawl-51/#book', productId: '28' }).events, [], 'Halloween cannot be mislabeled as the regular crawl');
assert.deepEqual(bookingClick({ href: '/staging/store2/halloween-pub-crawl-51/#book', productId: '51', consent: false }).events, [], 'Halloween booking events remain consent-gated');
assert.deepEqual(bookingClick({ href: '/staging/store2/unknown/#book' }).events, [], 'An unknown route without an explicit ID is not assumed to be product 28');
assert.deepEqual(bookingClick({ href: '/staging/store2/private-pub-crawl-31/#book', productId: '31', position: null }).events, [], 'An arbitrary product link without booking semantics is not tracked');
assert.deepEqual(bookingClick({ href: 'https://external.test/store2/nye-pub-crawl-32/', productId: '32' }).events, [], 'External destinations are not storefront booking handoffs');
assert.deepEqual(bookingClick({ href: '/staging/about-us/', productId: '32' }).events, [], 'Non-store destinations are not booking handoffs');
for (const consent of [false, null, 'true', 1]) {
  const options = { href: '/staging/store2/nye-pub-crawl-32/#book', productId: '32', consent };
  assert.deepEqual(bookingClick(options).events, [], 'Only explicit analytics consent permits booking events');
}
console.log('Homepage booking consent tests passed: Halloween, NYE and regular attribution, explicit IDs, route inference, malformed IDs, unknown destinations, and consent gating without requests.');
