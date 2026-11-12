import { createJourneyQueue, journeyEnvironment } from './journey-queue.js';
import { createClarityRecordingBridge } from './clarity-recording.js';

const QUALIFIED_CART_STORAGE_KEY = 'ktk-storefront-journey-cart-v1';
const queue = createJourneyQueue();
const currentVisit = queue.currentVisit;

let context = {
  browserId: '',
  pageId: '',
  restUrl: '',
};
let clarityState = { sampled: false, sessionId: null };
let clarityLoadStarted = false;
let clarityLoadScheduled = false;
let clarityConsentWaiting = false;
let pendingReplayStart = null;
let stopConsentWait = null;
const recordingBridge = createClarityRecordingBridge({
  queue,
  consentGranted: analyticsConsentGranted,
  pageId: () => context.pageId || null,
});

export function initializeJourneyTracking(nextContext) {
  context = { ...context, ...nextContext };
  queue.read();
  if (typeof window.clarity === 'function') {
    if (context.area) window.clarity('set', 'storefront_area', context.area);
    if (context.productSlug) window.clarity('set', 'product_slug', context.productSlug);
  }
}

export function trackJourney(type, details = null) {
  const event = queue.record(type, details, context.pageId || null);
  if (typeof window.clarity === 'function') window.clarity('event', type);
  return event;
}

export function pendingJourneyEvents() {
  const environment = journeyEnvironment(window.location?.pathname);
  const analyticsAllowed = analyticsConsentGranted();
  if (!analyticsAllowed) queue.removeTypes(['clarity_recording_linked']);
  return queue.read().filter(event => (!event.type.startsWith('homepage_') && event.type !== 'clarity_recording_linked')
    || (analyticsAllowed && event.details?.environment === environment));
}

export function acknowledgeJourneyEvents(eventIds) {
  queue.acknowledge(eventIds);
}

export function setQualifiedJourneyCart(publicId) {
  if (!publicId) return;
  try {
    window.localStorage.setItem(QUALIFIED_CART_STORAGE_KEY, publicId);
  } catch {
    // The caller retains the cart ID in application state.
  }
}

export function clearJourneyAfterPurchase() {
  queue.clear();
  try { window.localStorage.removeItem(QUALIFIED_CART_STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
}

export function journeyClientContext(extra = {}) {
  return {
    browserId: context.browserId || null,
    pageId: context.pageId || null,
    claritySampled: clarityState.sampled,
    claritySessionId: clarityState.sessionId,
    ...extra,
  };
}

export function analyticsConsentGranted() {
  if (typeof window.KTK_ANALYTICS_CONSENT === 'boolean') return window.KTK_ANALYTICS_CONSENT;

  try {
    const preferences = window._iub?.cs?.api?.getPreferences?.();
    if (preferences?.purposes && Object.hasOwn(preferences.purposes, '4')) {
      return preferences.purposes['4'] === true;
    }
    if (window._iub?.cs?.api?.isConsentGiven?.() === true) return true;
  } catch {
    // Iubenda may still be initializing; other consent signals can still be checked.
  }

  const entries = Array.isArray(window.dataLayer) ? window.dataLayer : [];
  for (const entry of [...entries].reverse()) {
    if (
      entry?.event === 'iubenda_consent_given_purpose_4'
      || entry?.event === 'iubenda_preference_not_needed'
    ) return true;
    const values = Array.isArray(entry)
      ? entry
      : entry && typeof entry === 'object' && 'length' in entry
        ? Array.from(entry)
        : [];
    const consent = values[0] === 'consent' ? values[2] : null;
    if (consent?.analytics_storage === 'granted') return true;
    if (consent?.analytics_storage === 'denied') return false;
  }
  return false;
}

function visitSample(visitId) {
  return Array.from(String(visitId)).reduce(
    (hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0,
    0,
  ) % 100;
}

function replayNetworkAllowed() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection?.saveData) return false;
  return !['slow-2g', '2g'].includes(connection?.effectiveType);
}

function ensureClarityQueue() {
  window.clarity = window.clarity || function clarityQueue() {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };
}

function applyClarityContext(visitId, publicId, replayContext = {}) {
  ensureClarityQueue();
  window.clarity('identify', context.browserId, visitId, context.pageId);
  window.clarity('set', 'storefront_visit_id', visitId);
  if (publicId) window.clarity('set', 'ongoing_cart_id', publicId);
  if (replayContext.area || context.area) {
    window.clarity('set', 'storefront_area', replayContext.area || context.area);
  }
  if (replayContext.productSlug || context.productSlug) {
    window.clarity('set', 'product_slug', replayContext.productSlug || context.productSlug);
  }
}

function loadClarity(projectId, visitId, publicId, replayContext) {
  clarityLoadScheduled = false;
  if (!clarityLoadStarted) {
    clarityLoadStarted = true;
    ensureClarityQueue();
  }
  const existingScript = document.querySelector('script[src*="clarity.ms/tag/"]');
  if (!existingScript) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
    script.dataset.ktkClarity = 'true';
    document.head.appendChild(script);
  }
  window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
  applyClarityContext(visitId, publicId, replayContext);
  recordingBridge.attach(projectId);
}

function waitForAnalyticsConsent() {
  if (clarityConsentWaiting) return;
  clarityConsentWaiting = true;

  const tryStart = () => {
    if (!pendingReplayStart || !analyticsConsentGranted()) return;
    const start = pendingReplayStart;
    pendingReplayStart = null;
    stopConsentWait?.();
    startJourneyReplay(start.replayConfig, start.publicId, start.replayContext);
  };

  const afterPointer = () => window.setTimeout(tryStart, 100);
  window.addEventListener('ktk:analytics-consent', tryStart);
  window.addEventListener('focus', tryStart);
  document.addEventListener('pointerup', afterPointer, { passive: true });
  const consentPoll = window.setInterval(() => {
    tryStart();
  }, 1000);
  stopConsentWait = () => {
    clarityConsentWaiting = false;
    window.clearInterval(consentPoll);
    window.removeEventListener('ktk:analytics-consent', tryStart);
    window.removeEventListener('focus', tryStart);
    document.removeEventListener('pointerup', afterPointer);
    stopConsentWait = null;
  };
}

export function startJourneyReplay(replayConfig, publicId = null, replayContext = {}) {
  if (!replayConfig?.enabled || !replayConfig.projectId) return false;
  if (!replayNetworkAllowed()) return false;
  if (replayConfig.requireAnalyticsConsent && !analyticsConsentGranted()) {
    pendingReplayStart = { replayConfig, publicId, replayContext };
    waitForAnalyticsConsent();
    return false;
  }
  pendingReplayStart = null;
  stopConsentWait?.();
  const visit = currentVisit();
  if (visitSample(visit.id) >= Number(replayConfig.samplePercent || 0)) {
    // Observe an existing site-wide recording without loading or upgrading replay outside the sample.
    recordingBridge.attach(replayConfig.projectId);
    return false;
  }
  clarityState = { sampled: true, sessionId: visit.id };
  if (clarityLoadStarted || clarityLoadScheduled) {
    ensureClarityQueue();
    window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
    applyClarityContext(visit.id, publicId, replayContext);
    recordingBridge.attach(replayConfig.projectId);
    return true;
  }
  clarityLoadScheduled = true;
  const start = () => {
    // The visitor may withdraw consent while the idle callback is waiting.
    if (replayConfig.requireAnalyticsConsent && !analyticsConsentGranted()) {
      clarityLoadScheduled = false;
      startJourneyReplay(replayConfig, publicId, replayContext);
      return;
    }
    loadClarity(replayConfig.projectId, visit.id, publicId, replayContext);
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 1500 });
  } else {
    window.setTimeout(start, 500);
  }
  return true;
}

export function flushJourneyActivity(publicId, options = {}) {
  const journeyEvents = pendingJourneyEvents();
  if (!publicId || !journeyEvents.length || !context.restUrl) return false;
  const payload = JSON.stringify({
    journeyEvents,
    clientContext: journeyClientContext(options.clientContext),
  });
  const url = `${context.restUrl}/ongoing-carts/${encodeURIComponent(publicId)}/activity`;

  if (options.beacon && navigator.sendBeacon) {
    const accepted = navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    if (accepted) return true;
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: payload,
    keepalive: true,
  }).then(async (response) => {
    if (!response.ok) return;
    const result = await response.json().catch(() => ({}));
    acknowledgeJourneyEvents(result.journey?.acceptedEventIds);
  }).catch(() => {});
  return true;
}
