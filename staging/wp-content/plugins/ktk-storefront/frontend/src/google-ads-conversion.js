const CONVERSION_STORAGE_PREFIX = 'ktk-storefront-google-ads-conversion-v1:';
const reportedOrders = new Set();

function conversionStorageKey(orderId) {
  return `${CONVERSION_STORAGE_PREFIX}${orderId}`;
}

export function reportGoogleAdsOrderComplete(order, browserWindow = window) {
  const orderId = String(order?.publicId || '').trim();
  const orderTotalValue = Number(order?.total);
  if (!orderId || !Number.isFinite(orderTotalValue) || orderTotalValue < 0) return false;

  const storageKey = conversionStorageKey(orderId);
  let previouslyReported = reportedOrders.has(orderId);
  try {
    previouslyReported ||= browserWindow.sessionStorage.getItem(storageKey) === '1';
  } catch {
    // The in-memory guard still prevents repeats when browser storage is unavailable.
  }
  if (previouslyReported) return false;

  browserWindow.dataLayer = Array.isArray(browserWindow.dataLayer)
    ? browserWindow.dataLayer
    : [];
  browserWindow.dataLayer.push({
    event: 'orderComplete',
    orderId,
    orderTotalValue,
  });

  reportedOrders.add(orderId);
  try {
    browserWindow.sessionStorage.setItem(storageKey, '1');
  } catch {
    // The conversion is already queued in dataLayer and guarded in memory.
  }
  return true;
}
