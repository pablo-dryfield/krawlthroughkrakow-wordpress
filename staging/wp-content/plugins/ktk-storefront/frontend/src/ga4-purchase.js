const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const runtimes = new WeakMap();
const STORAGE_PREFIX = 'ktk-storefront-ga4-purchase-v1:';
const LAYER = 'ktkGa4PurchaseDataLayer';

function cents(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) return null;
  const number = Number(value);
  const result = Math.round(number * 100);
  return Number.isFinite(number) && number >= 0 && Number.isSafeInteger(result)
    && result <= 1_000_000_000 && Math.abs(number * 100 - result) < 0.00001 ? result : null;
}

export function ga4PurchasePayload(order) {
  if (order?.paymentStatus !== 'paid' || order.status !== 'confirmed'
      || typeof order.publicId !== 'string' || !UUID.test(order.publicId)
      || typeof order.currency !== 'string' || !/^[A-Z]{3}$/.test(order.currency)
      || !Array.isArray(order.items) || !order.items.length || order.items.length > 200) return null;
  const total = cents(order.total);
  if (total === null) return null;
  const lines = order.items.map(item => ({ id: item?.productId, quantity: item?.quantity, total: cents(item?.total) }));
  if (lines.some(item => !Number.isSafeInteger(item.id) || item.id < 1
      || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10_000
      || item.total === null)) return null;
  const gross = lines.reduce((sum, item) => sum + item.total, 0);
  if (!Number.isSafeInteger(gross) || gross < total || (total > 0 && gross === 0)) return null;
  // Roll each experience's add-ons into its item price, then allocate any order
  // discount in cents. No names, options, dates or customer fields are copied.
  const allocated = lines.map((item, index) => {
    const numerator = BigInt(item.total) * BigInt(total);
    return { ...item, index, net: gross ? Number(numerator / BigInt(gross)) : 0,
      remainder: gross ? numerator % BigInt(gross) : 0n };
  });
  let remaining = total - allocated.reduce((sum, item) => sum + item.net, 0);
  for (const item of [...allocated].sort((a, b) => a.remainder === b.remainder
    ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)) {
    if (remaining <= 0) break;
    item.net += 1;
    remaining -= 1;
  }
  return {
    eventName: total > 0 ? 'purchase' : 'ktk_free_booking_confirmed',
    parameters: { transaction_id: order.publicId, currency: order.currency, value: total / 100,
      items: allocated.map(item => ({ item_id: String(item.id), quantity: item.quantity,
        price: item.net / 100 / item.quantity })) },
  };
}

export function ga4PurchaseConsentGranted(browserWindow) {
  if (browserWindow.KTK_ANALYTICS_CONSENT !== true) return false;
  try {
    const preferences = browserWindow._iub?.cs?.api?.getPreferences?.();
    if (preferences?.purposes && Object.hasOwn(preferences.purposes, '4')) {
      return preferences.purposes['4'] === true;
    }
    const policy = browserWindow._iub?.csConfiguration?.cookiePolicyId;
    if (!/^[0-9]+$/.test(String(policy ?? ''))) return false;
    const prefix = `_iub_cs-${policy}=`;
    const cookie = String(browserWindow.document?.cookie || '').split(';')
      .map(value => value.trim()).find(value => value.startsWith(prefix));
    if (!cookie) return false;
    const parsed = JSON.parse(decodeURIComponent(cookie.slice(prefix.length)));
    const purposes = parsed?.purposes || parsed?.preferences?.purposes;
    return purposes?.['4'] === true;
  } catch {
    return false;
  }
}

function eligible(options, browserWindow) {
  return options?.enabled === true && options.environment === 'staging'
    && /^G-[A-Z0-9]{6,15}$/.test(options.measurementId || '')
    && browserWindow.location?.origin === 'https://krawlthroughkrakow.com'
    && /^\/staging\/store2\/checkout\/success\/?$/.test(browserWindow.location?.pathname || '');
}

function runtime(browserWindow) {
  if (!runtimes.has(browserWindow)) runtimes.set(browserWindow, { pending: new Set(), attempted: new Set(), configured: new Set(), tag: null, failed: false });
  return runtimes.get(browserWindow);
}

function loadTag(browserWindow, measurementId, state) {
  if (state.tag) return state.tag;
  state.tag = new Promise((resolve, reject) => {
    const document = browserWindow.document;
    if (!document?.head?.appendChild || !document.createElement
        || (browserWindow[LAYER] !== undefined && !Array.isArray(browserWindow[LAYER]))
        || document.getElementById('ktk-storefront-ga4-purchase-tag')) {
      reject(new Error('GA4 purchase loader unavailable'));
      return;
    }
    browserWindow[LAYER] ||= [];
    state.command = function () { browserWindow[LAYER].push(arguments); };
    const pageLocation = browserWindow.location.origin + browserWindow.location.pathname;
    // These stream-scoped settings must precede the library's initialization.
    // Do not change the site's existing Google consent state or Ads destination.
    state.command('js', new Date());
    state.command('config', measurementId, { send_page_view: false,
      page_location: pageLocation, page_referrer: '', page_title: 'KTK booking confirmation',
      allow_google_signals: false, allow_ad_personalization_signals: false,
      allow_enhanced_conversions: false, user_data: null });
    state.configured.add(measurementId);
    const script = document.createElement('script');
    script.id = 'ktk-storefront-ga4-purchase-tag';
    script.async = true;
    script.referrerPolicy = 'origin';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}&l=${LAYER}`;
    script.dataset.iubPurposes = '4';
    script.onload = resolve;
    script.onerror = () => reject(new Error('GA4 purchase loader failed'));
    document.head.appendChild(script);
  });
  return state.tag;
}

export async function reportGa4Purchase(order, options, browserWindow = window, isActive = () => true) {
  const payload = ga4PurchasePayload(order);
  if (!payload || !eligible(options, browserWindow) || !ga4PurchaseConsentGranted(browserWindow)) return false;
  const state = runtime(browserWindow);
  const key = `${options.measurementId}:${payload.parameters.transaction_id}`;
  const storageKey = STORAGE_PREFIX + key;
  if (state.failed || state.pending.has(key) || state.attempted.has(key)) return false;
  try {
    if (browserWindow.sessionStorage.getItem(storageKey) === '1') return false;
  } catch { state.failed = true; return false; }
  state.pending.add(key);
  try {
    await loadTag(browserWindow, options.measurementId, state);
    if (!isActive() || !eligible(options, browserWindow) || !ga4PurchaseConsentGranted(browserWindow)) return false;
    if (browserWindow.sessionStorage.getItem(storageKey) === '1') return false;
    // Mark before queueing. A thrown/uncertain tag call is never automatically replayed.
    browserWindow.sessionStorage.setItem(storageKey, '1');
    state.attempted.add(key);
    const pageLocation = browserWindow.location.origin + browserWindow.location.pathname;
    state.command('event', payload.eventName, { ...payload.parameters,
      send_to: options.measurementId, debug_mode: true, ktk_environment: 'staging',
      page_location: pageLocation, page_referrer: '', page_title: 'KTK booking confirmation', user_data: null });
    return true;
  } catch { state.failed = true; return false; }
  finally { state.pending.delete(key); }
}

export function observeGa4Purchase(order, options, browserWindow = window) {
  if (!eligible(options, browserWindow) || !ga4PurchasePayload(order)) return () => {};
  let stopped = false, pending = false;
  const stop = () => {
    stopped = true;
    browserWindow.clearInterval(timer);
    browserWindow.clearTimeout(expiry);
    browserWindow.removeEventListener('ktk:analytics-consent', attempt);
  };
  const attempt = () => {
    if (stopped || pending || !ga4PurchaseConsentGranted(browserWindow)) return;
    pending = true;
    reportGa4Purchase(order, options, browserWindow, () => !stopped).then(sent => {
      pending = false;
      const state = runtime(browserWindow);
      const key = `${options.measurementId}:${order.publicId}`;
      let recorded = state.attempted.has(key);
      try { recorded ||= browserWindow.sessionStorage.getItem(STORAGE_PREFIX + key) === '1'; }
      catch { recorded = true; }
      if (sent || recorded || state.failed || !eligible(options, browserWindow)) stop();
    });
  };
  const timer = browserWindow.setInterval(attempt, 500);
  const expiry = browserWindow.setTimeout(stop, 120_000);
  browserWindow.addEventListener('ktk:analytics-consent', attempt);
  attempt();
  return stop;
}
