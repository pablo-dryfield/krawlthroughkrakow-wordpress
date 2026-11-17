import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js/min';
import { getProductContent } from './product-content';
import { responsiveProductImage } from './responsive-product-images';
import { completePublicContentHandoff, followPublicLink, publicStorefrontHref } from './public-content';
import ProductConfigurator, {
  CustomSelect,
  resolveAddonMaxQuantity,
} from './ProductConfigurator';
import { normalizeContactPhone, normalizePhoneInput, phoneForApi } from './phone-contact';
import {
  acknowledgeJourneyEvents,
  clearJourneyAfterPurchase,
  flushJourneyActivity,
  initializeJourneyTracking,
  journeyClientContext,
  pendingJourneyEvents,
  setQualifiedJourneyCart,
  startJourneyReplay,
  trackJourney,
} from './journey-tracking';
import { cartItemJourneySnapshot, nextCartItemNumber } from './cart-journey';
import { singleDiscountCode } from './discount-codes';
import { reportGoogleAdsOrderComplete } from './google-ads-conversion';
import {
  DEFAULT_LEGACY_PRODUCT_URLS,
  DEFAULT_LEGACY_STORE_URL,
  isOmniAvailabilityFailure,
  legacyDestination,
  legacyUrlWithAttribution,
} from './legacy-fallback';
import { normalizeCartExperiences, upsertCartExperience } from './cart-experiences';
import './storefront.css';

const config = window.KTK_STOREFRONT ?? {
  restUrl: import.meta.env.DEV ? '/ktk-api' : '/wp-json/ktk-storefront/v1',
  baseUrl: import.meta.env.DEV ? '/' : '/store2',
  path: null,
  siteUrl: '/',
  legacyStoreUrl: DEFAULT_LEGACY_STORE_URL,
  legacyProductUrls: DEFAULT_LEGACY_PRODUCT_URLS,
};

let stripeJsPromise;

function loadStripeJs() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (stripeJsPromise) return stripeJsPromise;

  stripeJsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-ktk-stripe-js]');
    const script = existing || document.createElement('script');
    const loaded = () => {
      if (window.Stripe) resolve(window.Stripe);
      else reject(new Error('Stripe loaded without exposing its payment library.'));
    };
    const failed = () => {
      if (script.dataset.ktkStripeJs === 'true') script.remove();
      reject(new Error('Stripe could not be loaded.'));
    };
    script.addEventListener('load', loaded, { once: true });
    script.addEventListener('error', failed, { once: true });
    if (!existing) {
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.dataset.ktkStripeJs = 'true';
      document.head.appendChild(script);
    }
  }).catch((error) => {
    stripeJsPromise = undefined;
    throw error;
  });

  return stripeJsPromise;
}

const INVALID_ROUTE_PATHS = new Set(['undefined', 'null', 'false', '[object object]']);

function normalizeRoutePath(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().replace(/^\/+|\/+$/g, '');
  return INVALID_ROUTE_PATHS.has(normalized.toLowerCase()) ? '' : normalized;
}

function getRoutePath() {
  const pathname = window.location.pathname.replace(/\/+$/, '');
  const basePath = new URL(config.baseUrl, window.location.origin).pathname.replace(/\/+$/, '');

  if (!basePath) {
    return normalizeRoutePath(pathname);
  }

  return normalizeRoutePath(
    pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length + 1) : '',
  );
}

const money = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'PLN',
  minimumFractionDigits: 2,
});
const cartDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatCartDate(value) {
  if (!value) return 'Not selected';
  const [year, month, day] = String(value).split('-').map(Number);
  return cartDateFormatter.format(new Date(year, month - 1, day));
}

function cartAddonDetails(item, pricedItem) {
  if (pricedItem?.addons?.length) {
    return pricedItem.addons.map((pricedAddon) => {
      const selected = (item.addons || []).find(
        (addon) => String(addon.addonId) === String(pricedAddon.addonId),
      );
      return {
        ...pricedAddon,
        variants: pricedAddon.variants?.length ? pricedAddon.variants : (selected?.variants || []),
      };
    });
  }

  return (item.addons || []).map((selected) => {
    const addon = item.product?.addons?.find(
      (candidate) => String(candidate.id) === String(selected.addonId),
    );
    return {
      ...selected,
      name: addon?.name || 'Add-on',
    };
  });
}

function cartAddonSelection(addon) {
  if (addon.value) return String(addon.value);
  return addon.quantity;
}

function CartAddonQuantity({ addon }) {
  if (Array.isArray(addon.variants) && addon.variants.length > 0) {
    return (
      <div
        className="ktk-cart-line__addon-variants"
        aria-label={addon.variants
          .map((variant) => `${variant.value}: ${variant.quantity}`)
          .join(', ')}
      >
        {addon.variants.map((variant) => (
          <span key={variant.value}>
            <small>{variant.value}</small>
            <strong>{variant.quantity}</strong>
          </span>
        ))}
      </div>
    );
  }

  return <span className="ktk-cart-line__addon-quantity">{cartAddonSelection(addon)}</span>;
}

function cartAddonEmoji(name) {
  const normalized = String(name || '').toLowerCase();
  if (normalized.includes('cocktail')) return '\uD83C\uDF79';
  if (normalized.includes('shirt')) return '\uD83D\uDC55';
  if (normalized.includes('photo') || normalized.includes('camera')) return '\uD83D\uDCF8';
  return '\u2726';
}

function useRoute() {
  const [path, setPath] = useState(() => normalizeRoutePath(config.path) || getRoutePath());

  useEffect(() => {
    const handlePopState = () => {
      setPath(getRoutePath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (nextPath) => {
    const normalizedPath = normalizeRoutePath(nextPath);
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    const url = new URL(
      normalizedPath ? `${baseUrl}/${normalizedPath}` : (baseUrl || '/'),
      window.location.origin,
    );
    window.history.pushState({}, '', url);
    setPath(getRoutePath());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return { path, navigate };
}

function followAvailabilityRedirect(availability, navigate) {
  if (availability?.redirectProductSlug) {
    navigate(availability.redirectProductSlug);
    return true;
  }
  if (availability?.redirectUrl) {
    window.location.assign(availability.redirectUrl);
    return true;
  }
  return false;
}

async function requestJson(path, options = {}) {
  let response;
  try {
    response = await fetch(`${config.restUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (error?.name !== 'AbortError' && error && typeof error === 'object') {
      error.isNetworkError = true;
    }
    throw error;
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error?.message || 'Unable to complete the request.');
    error.status = response.status;
    throw error;
  }
  if (payload === null) {
    const error = new Error('The booking service returned an unexpected response.');
    error.status = response.status;
    error.isInvalidResponse = true;
    throw error;
  }
  return payload;
}

function getJson(path, signal) {
  return requestJson(path, { signal });
}

const CART_STORAGE_KEY = 'ktk-storefront-cart-v1';
const DISCOUNT_STORAGE_KEY = 'ktk-storefront-discount-v1';
const CONTACT_STORAGE_KEY = 'ktk-storefront-contact-v1';
const ATTRIBUTION_STORAGE_KEY = 'ktk-storefront-attribution-v1';
const CART_SESSION_STORAGE_KEY = 'ktk-storefront-cart-session-v1';
const ONGOING_CART_STORAGE_KEY = 'ktk-storefront-ongoing-cart-v1';
const BROWSER_INSTANCE_STORAGE_KEY = 'ktk-storefront-browser-instance-v1';
const CHECKOUT_CONFIRMATION_STORAGE_KEY = 'ktk-storefront-checkout-confirmation-v1';
const CHECKOUT_CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_id',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
];
const EMPTY_CONTACT = { fullName: '', email: '', phoneCountry: '', phone: '' };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryOptions = [
  { value: '', label: 'Select a country' },
  ...getCountries()
    .map((code) => ({
      value: code,
      label: `${regionNames.of(code) || code} (+${getCountryCallingCode(code)})`,
      searchText: `${regionNames.of(code) || code} ${code} +${getCountryCallingCode(code)}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
];

function CountrySelect({ id, value, invalid = false, onChange, onBlur }) {
  const updateCountry = (event) => onChange(event.currentTarget.value);

  return (
    <select
      id={id}
      name="country"
      autoComplete="country"
      required
      aria-label="Country calling code"
      aria-invalid={invalid}
      value={value}
      onInput={updateCountry}
      onChange={updateCountry}
      onBlur={onBlur}
    >
      {countryOptions.map((option) => (
        <option value={option.value} key={option.value || 'empty'}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function createCartSessionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function loadCartSessionId() {
  const stored = window.localStorage.getItem(CART_SESSION_STORAGE_KEY) || '';
  if (uuidPattern.test(stored)) return stored;
  const created = createCartSessionId();
  window.localStorage.setItem(CART_SESSION_STORAGE_KEY, created);
  return created;
}

function loadBrowserInstanceId() {
  const stored = window.localStorage.getItem(BROWSER_INSTANCE_STORAGE_KEY) || '';
  if (uuidPattern.test(stored)) return stored;
  const created = createCartSessionId();
  window.localStorage.setItem(BROWSER_INSTANCE_STORAGE_KEY, created);
  return created;
}

function loadOngoingCartPublicId() {
  const stored = window.localStorage.getItem(ONGOING_CART_STORAGE_KEY) || '';
  return uuidPattern.test(stored) ? stored : '';
}

function saveCheckoutConfirmation(result) {
  if (!result?.publicId || !result?.confirmationToken) return false;
  try {
    window.sessionStorage.setItem(CHECKOUT_CONFIRMATION_STORAGE_KEY, JSON.stringify({
      publicId: result.publicId,
      confirmationToken: result.confirmationToken,
      paymentIntentId: result.paymentIntentId || null,
      sessionId: result.sessionId || null,
      createdAt: Date.now(),
    }));
    return true;
  } catch {
    return false;
  }
}

function loadCheckoutConfirmation() {
  try {
    const stored = JSON.parse(
      window.sessionStorage.getItem(CHECKOUT_CONFIRMATION_STORAGE_KEY) || 'null',
    );
    if (
      !stored?.publicId
      || !stored?.confirmationToken
      || !Number.isFinite(Number(stored.createdAt))
      || Date.now() - Number(stored.createdAt) > CHECKOUT_CONFIRMATION_TTL_MS
    ) {
      window.sessionStorage.removeItem(CHECKOUT_CONFIRMATION_STORAGE_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

function loadCart() {
  try {
    const cart = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? '[]');
    return Array.isArray(cart)
      ? normalizeCartExperiences(cart.filter((item) => item && typeof item === 'object').map((item, index) => clampCartItemAddons({
        ...item,
        cartItemNumber: Number.isInteger(Number(item.cartItemNumber))
          && Number(item.cartItemNumber) > 0
          ? Number(item.cartItemNumber)
          : index + 1,
        productSlug: item.productSlug || item.product?.slug || '',
        productName: item.productName || item.product?.name || 'Experience',
      })))
      : [];
  } catch {
    return [];
  }
}

function clampCartItemAddons(item) {
  const productAddons = item?.product?.addons || [];
  if (!Array.isArray(item?.addons) || productAddons.length === 0) return item;

  const addons = item.addons.flatMap((selected) => {
    const addon = productAddons.find(
      (candidate) => String(candidate.id) === String(selected.addonId),
    );
    if (!addon || !Number.isFinite(Number(selected.quantity))) return [selected];

    const maximum = resolveAddonMaxQuantity(addon, item.quantity);
    const quantity = Math.min(Math.max(0, Number(selected.quantity)), maximum);
    if (quantity <= 0) return [];

    let remaining = quantity;
    const variants = Array.isArray(selected.variants)
      ? selected.variants.flatMap((variant) => {
        const variantQuantity = Math.min(
          Math.max(0, Number(variant.quantity) || 0),
          remaining,
        );
        remaining -= variantQuantity;
        return variantQuantity > 0 ? [{ ...variant, quantity: variantQuantity }] : [];
      })
      : selected.variants;

    return [{
      ...selected,
      quantity,
      ...(Array.isArray(selected.variants) ? { variants } : {}),
    }];
  });

  return { ...item, addons };
}

function loadDiscountCodes() {
  const stored = window.localStorage.getItem(DISCOUNT_STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return singleDiscountCode(parsed);
  } catch {
    return singleDiscountCode(stored);
  }
}

function loadContact() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CONTACT_STORAGE_KEY) || 'null');
    if (stored && typeof stored === 'object') {
      return normalizeContactPhone({ ...EMPTY_CONTACT, ...stored });
    }
    const legacyCart = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '[]');
    const legacy = legacyCart?.[0]?.options;
    return legacy ? normalizeContactPhone({
      fullName: legacy.fullName || '',
      email: legacy.email || '',
      phoneCountry: legacy.phoneCountry || '',
      phone: legacy.phone || '',
    }) : { ...EMPTY_CONTACT };
  } catch {
    return { ...EMPTY_CONTACT };
  }
}

function fullNameHasLastName(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length >= 2;
}

function contactIsComplete(contact) {
  return Boolean(
    fullNameHasLastName(contact.fullName)
    && emailPattern.test(contact.email?.trim() || '')
    && contact.phoneCountry
    && contact.phone,
  );
}

function ContactFields({
  contact,
  setContact,
  idPrefix,
  showErrors = false,
  onFieldCompleted = () => {},
}) {
  const fullName = String(contact.fullName || '').trim();
  const fullNameMissing = showErrors && !fullName;
  const lastNameMissing = showErrors && Boolean(fullName) && !fullNameHasLastName(fullName);
  const fullNameInvalid = fullNameMissing || lastNameMissing;
  const fullNameErrorId = `${idPrefix}-name-error`;
  const emailInvalid = Boolean(
    (showErrors || contact.email)
    && !emailPattern.test(contact.email?.trim() || ''),
  );
  const countryInvalid = showErrors && !contact.phoneCountry;
  const phoneInvalid = showErrors && !String(contact.phone || '').trim();

  return (
    <div className="ktk-contact-fields" data-clarity-mask="true">
      <label htmlFor={`${idPrefix}-name`}>
        <span>Full name</span>
        <input
          id={`${idPrefix}-name`}
          type="text"
          autoComplete="name"
          required
          aria-invalid={fullNameInvalid}
          aria-describedby={fullNameInvalid ? fullNameErrorId : undefined}
          value={contact.fullName}
          onChange={(event) => setContact((current) => ({
            ...current,
            fullName: event.target.value,
          }))}
          onBlur={(event) => {
            if (fullNameHasLastName(event.currentTarget.value)) onFieldCompleted('full_name');
          }}
        />
        {fullNameInvalid && (
          <small id={fullNameErrorId} role="alert">
            {lastNameMissing ? 'Add your last name' : 'Enter your full name'}
          </small>
        )}
      </label>
      <label htmlFor={`${idPrefix}-email`}>
        <span>Email address</span>
        <input
          id={`${idPrefix}-email`}
          type="email"
          autoComplete="email"
          required
          aria-invalid={emailInvalid}
          value={contact.email}
          onChange={(event) => setContact((current) => ({
            ...current,
            email: event.target.value,
          }))}
          onBlur={(event) => {
            if (emailPattern.test(event.currentTarget.value.trim())) onFieldCompleted('email');
          }}
        />
        {emailInvalid && <small>Enter a valid email address</small>}
      </label>
      <label htmlFor={`${idPrefix}-country`}>
        <span>Country code</span>
        <CountrySelect
          id={`${idPrefix}-country`}
          value={contact.phoneCountry}
          invalid={countryInvalid}
          onChange={(phoneCountry) => setContact((current) => ({
            ...current,
            phoneCountry,
          }))}
          onBlur={(event) => {
            if (event.currentTarget.value) onFieldCompleted('country');
          }}
        />
        {countryInvalid && <small>Select your country code</small>}
      </label>
      <label htmlFor={`${idPrefix}-phone`}>
        <span>Phone number</span>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          inputMode="tel"
          name="tel"
          autoComplete="tel"
          required
          aria-invalid={phoneInvalid}
          value={contact.phone}
          onChange={(event) => setContact((current) => ({
            ...current,
            ...normalizePhoneInput(event.target.value, current.phoneCountry),
          }))}
          onBlur={(event) => {
            if (event.currentTarget.value.trim()) onFieldCompleted('phone');
          }}
        />
        {phoneInvalid && <small>Enter your phone number</small>}
      </label>
    </div>
  );
}

function toApiCart(items, discountCodes = [], contact = {}) {
  const codes = singleDiscountCode(discountCodes);

  return {
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      experienceDate: item.experienceDate || null,
      experienceTime: item.experienceTime || null,
      addons: item.addons || [],
      options: {
        ...(item.options || {}),
        fullName: contact.fullName?.trim() || '',
        email: contact.email?.trim().toLowerCase() || '',
        phoneCountry: contact.phoneCountry || '',
        phoneLocal: contact.phone || '',
        phone: phoneForApi(contact.phone, contact.phoneCountry),
      },
    })),
    discountCodes: codes,
    discountCode: codes[0] ?? null,
  };
}

function readStoredAttribution() {
  let stored = {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || 'null');
    if (parsed && typeof parsed === 'object') stored = parsed;
  } catch {
    // Fall through to the trk_* values written by the main website.
  }

  ATTRIBUTION_KEYS.forEach((key) => {
    try {
      const value = window.localStorage.getItem(`trk_${key}`);
      if (value) stored[key] = value;
    } catch {
      // localStorage might be unavailable in restricted browsing modes.
    }
  });

  return stored;
}

function captureAttribution() {
  const query = new URLSearchParams(window.location.search);
  const incoming = ATTRIBUTION_KEYS.reduce((result, key) => {
    const value = query.get(key)?.trim();
    if (value) result[key] = value;
    return result;
  }, {});

  if (!Object.keys(incoming).length) return readStoredAttribution();

  const attribution = {
    ...incoming,
    capturedAt: new Date().toISOString(),
    landingPage: `${window.location.pathname}${window.location.search}`,
  };

  try {
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
    ATTRIBUTION_KEYS.forEach((key) => {
      if (incoming[key]) window.localStorage.setItem(`trk_${key}`, incoming[key]);
    });
  } catch {
    // Checkout can still use the attribution captured for the current page view.
  }
  return attribution;
}

function getAttribution() {
  const stored = captureAttribution();
  return {
    ...stored,
    source: stored.utm_source || '',
    medium: stored.utm_medium || '',
    campaign: stored.utm_campaign || '',
  };
}

let legacyRedirectStarted = false;

function redirectToLegacyStore(productSlugs = []) {
  if (legacyRedirectStarted || getRoutePath() === 'checkout/success') return false;

  const target = legacyDestination(
    config.legacyStoreUrl || DEFAULT_LEGACY_STORE_URL,
    config.legacyProductUrls || DEFAULT_LEGACY_PRODUCT_URLS,
    productSlugs,
  );
  if (!target) return false;

  const attribution = captureAttribution();
  const url = legacyUrlWithAttribution(
    target,
    attribution,
    ATTRIBUTION_KEYS,
    window.location.origin,
  );

  legacyRedirectStarted = true;
  window.location.replace(url);
  return true;
}

function Shell({ children, cartCount, navigate }) {
  return (
    <div className="ktk-app">
      <button className="ktk-cart-link" type="button" onClick={() => navigate('cart')}>
        Cart <span>{cartCount}</span>
      </button>
      {children}
    </div>
  );
}

function Loading() {
  return (
    <div className="ktk-loading" role="status">
      <span />
      <p>Loading Krakow experiences</p>
    </div>
  );
}

function ErrorState({ message, retry }) {
  return (
    <section className="ktk-error">
      <p className="ktk-eyebrow">Something went wrong</p>
      <h1>The experiences are taking a breather.</h1>
      <p>{message}</p>
      <button type="button" onClick={retry}>Try again</button>
    </section>
  );
}

function ProductArt({ product, index = 0 }) {
  const initials = product.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <div className={`ktk-product-art ktk-product-art--${index % 4}`} aria-hidden="true">
      <span className="ktk-product-art__orbit" />
      <span className="ktk-product-art__initials">{initials}</span>
      <span className="ktk-product-art__type">{product.productType?.name || 'Krakow experience'}</span>
    </div>
  );
}

function ProductCardMedia({ product, index }) {
  const firstImage = Array.isArray(product.images)
    ? product.images
      .map((image) => (typeof image === 'string' ? image : image?.url))
      .find(Boolean)
    : '';
  const coverImage = product.imageUrl || firstImage;

  if (!coverImage) return <ProductArt product={product} index={index} />;

  return (
    <div className="ktk-product-card__media">
      <img
        src={coverImage}
        alt={`${product.name} experience in Krakow`}
        loading="lazy"
        decoding="async"
      />
      <span>{product.productType?.name || 'Krakow experience'}</span>
    </div>
  );
}

function StorefrontLink({ path = '', navigate, children, ...props }) {
  return <a {...props} href={publicStorefrontHref(config.baseUrl, path)} onClick={(event) => followPublicLink(event, navigate, path)}>{children}</a>;
}

function Catalog({ navigate }) {
  const [state, setState] = useState({ loading: true, products: [], error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!state.loading) completePublicContentHandoff(document);
  }, [state.loading]);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: '' }));
    getJson('/products', controller.signal)
      .then((payload) => setState({ loading: false, products: payload.products ?? [], error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          if (isOmniAvailabilityFailure(error) && redirectToLegacyStore()) return;
          setState({ loading: false, products: [], error: error.message });
        }
      });
    return () => controller.abort();
  }, [attempt]);

  if (state.loading) return <Loading />;
  if (state.error) return <ErrorState message={state.error} retry={() => setAttempt((value) => value + 1)} />;

  const featuredNames = ['Pub Crawl', 'Boat Party', 'Food Tour Krakow'];
  const featuredProducts = featuredNames
    .map((name) => state.products.find((product) => product.name === name))
    .filter(Boolean);
  const firstExperience = featuredProducts[0] ?? state.products[0];
  const showCatalog = () => {
    document.getElementById('ktk-catalog-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="ktk-catalog-page">
      <section className="ktk-hero">
        <div className="ktk-hero__glow" aria-hidden="true" />
        <div className="ktk-hero__grid">
          <div className="ktk-hero__content">
            <p className="ktk-eyebrow">Krakow, but louder</p>
              <div className="ktk-hero__headline">
                <div className="ktk-hero__pick-row">
                  <span className="ktk-hero__pick-word">Pick</span>
                  <div className="ktk-hero__beer-pong">
                    <svg
                      className="ktk-hero__motion-lines"
                      viewBox="0 0 150 110"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id="ktk-motion-fade" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                          <stop offset="0.48" stopColor="#ffffff" stopOpacity="0.34" />
                          <stop offset="1" stopColor="#ffd35a" stopOpacity="0.92" />
                        </linearGradient>
                      </defs>
                      <path
                        className="ktk-hero__motion-streak ktk-hero__motion-streak--long"
                        d="M7 13 C34 17 58 31 78 55"
                      />
                      <path
                        className="ktk-hero__motion-streak ktk-hero__motion-streak--medium"
                        d="M2 35 C28 38 49 49 66 68"
                      />
                      <path
                        className="ktk-hero__motion-streak ktk-hero__motion-streak--short"
                        d="M24 2 C44 9 61 20 74 36"
                      />
                    </svg>
                    <div className="ktk-hero__stamp" role="img" aria-label={`${state.products.length} activities`}>
                      <svg viewBox="0 0 100 100" aria-hidden="true">
                    <defs>
                      <radialGradient id="ktk-ball-fill" cx="30%" cy="24%" r="76%">
                        <stop offset="0" stopColor="#ffd96a" />
                        <stop offset="0.44" stopColor="#ffbd2f" />
                        <stop offset="0.78" stopColor="#f29a12" />
                        <stop offset="1" stopColor="#d97800" />
                      </radialGradient>
                      <radialGradient id="ktk-ball-highlight" cx="50%" cy="50%" r="50%">
                        <stop offset="0" stopColor="#ffffff" stopOpacity="0.6" />
                        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                      </radialGradient>
                      <filter id="ktk-ball-shadow" x="-30%" y="-30%" width="160%" height="175%">
                        <feDropShadow
                          dx="0"
                          dy="5"
                          stdDeviation="4"
                          floodColor="#000000"
                          floodOpacity="0.38"
                        />
                      </filter>
                    </defs>
                    <circle
                      className="ktk-hero__stamp-ball"
                      cx="50"
                      cy="50"
                      r="47"
                      filter="url(#ktk-ball-shadow)"
                    />
                    <ellipse
                      className="ktk-hero__stamp-glow"
                      cx="31"
                      cy="25"
                      rx="23"
                      ry="15"
                    />
                    <path
                      className="ktk-hero__stamp-seam"
                      d="M16 67 C37 79 68 80 86 65"
                    />
                    <text className="ktk-hero__stamp-count" x="50" y="52">
                      {state.products.length}
                    </text>
                    <text className="ktk-hero__stamp-label" x="50" y="65">
                      <tspan x="50">Activities</tspan>
                    </text>
                      </svg>
                    </div>
                    <div className="ktk-hero__cup" aria-hidden="true">
                      <svg viewBox="0 0 240 320">
                    <defs>
                      <linearGradient id="ktk-cup-red" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#8f001d" />
                        <stop offset="0.2" stopColor="#d90d35" />
                        <stop offset="0.52" stopColor="#f22a49" />
                        <stop offset="0.78" stopColor="#c4082e" />
                        <stop offset="1" stopColor="#6f0018" />
                      </linearGradient>
                      <linearGradient id="ktk-cup-lip" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#ffffff" />
                        <stop offset="0.55" stopColor="#f1e9e6" />
                        <stop offset="1" stopColor="#a99f9d" />
                      </linearGradient>
                      <radialGradient id="ktk-cup-opening" cx="50%" cy="35%" r="70%">
                        <stop offset="0" stopColor="#ffd978" />
                        <stop offset="0.58" stopColor="#d88a0b" />
                        <stop offset="1" stopColor="#6f3000" />
                      </radialGradient>
                    </defs>
                    <path
                      className="ktk-hero__cup-body"
                      d="M29 58 C49 73 191 73 211 58 L182 272 C178 291 62 291 58 272 Z"
                    />
                    <path
                      className="ktk-hero__cup-collar"
                      d="M31 63 C58 78 182 78 209 63 L204 93 C172 108 68 108 36 93 Z"
                    />
                    <path
                      className="ktk-hero__cup-side-shadow"
                      d="M172 76 C188 77 201 71 208 65 L181 270 C179 282 162 286 149 287 C168 232 176 151 172 76 Z"
                    />
                    <path
                      className="ktk-hero__cup-base"
                      d="M58 269 C81 281 159 281 182 269 L179 293 C166 309 74 309 61 293 Z"
                    />
                    <ellipse className="ktk-hero__cup-base-edge" cx="120" cy="291" rx="59" ry="13" />
                    <ellipse className="ktk-hero__cup-rim" cx="120" cy="56" rx="96" ry="31" />
                    <ellipse className="ktk-hero__cup-opening" cx="120" cy="55" rx="82" ry="20" />
                    <ellipse className="ktk-hero__cup-inner-glow" cx="120" cy="50" rx="67" ry="10" />
                    <path
                      className="ktk-hero__cup-foam"
                      d="M43 52 C68 40 171 39 197 52 C174 49 153 50 135 54 C108 59 77 58 43 52 Z"
                    />
                    <circle className="ktk-hero__cup-beer-bubble" cx="77" cy="49" r="2.5" />
                    <circle className="ktk-hero__cup-beer-bubble ktk-hero__cup-beer-bubble--soft" cx="106" cy="45" r="1.8" />
                    <circle className="ktk-hero__cup-beer-bubble" cx="151" cy="49" r="2.2" />
                    <path className="ktk-hero__cup-band" d="M35 96 C72 111 168 111 205 96" />
                    <path className="ktk-hero__cup-band" d="M45 179 C80 193 160 193 195 179" />
                    <path className="ktk-hero__cup-band" d="M57 268 C84 279 156 279 183 268" />
                    <path className="ktk-hero__cup-shine" d="M65 91 C61 142 68 221 82 259" />
                    <path className="ktk-hero__cup-shine-soft" d="M78 87 C76 126 80 169 86 197" />
                    <text className="ktk-hero__cup-mark" x="120" y="151">0.4 l</text>
                    <text className="ktk-hero__cup-mark ktk-hero__cup-mark--lower" x="120" y="239">0.2 l</text>
                      </svg>
                    </div>
                  </div>
                </div>
              <h1 className="ktk-hero__title">
                <span>Your</span>
                <em>Story.</em>
              </h1>
            </div>
            <p className="ktk-hero__copy">
              Pub crawls, private chaos and group experiences, built by the people who know Krakow after dark.
            </p>
            <div className="ktk-hero__actions">
              <button className="ktk-hero__primary" type="button" onClick={showCatalog}>
                Explore experiences
                <span aria-hidden="true">{'\u2193'}</span>
              </button>
              {firstExperience && (
                <StorefrontLink
                  className="ktk-hero__secondary"
                  path={firstExperience.slug}
                  navigate={navigate}
                >
                  Start with a classic
                  <span aria-hidden="true">{'\u2197'}</span>
                </StorefrontLink>
              )}
            </div>
            <ul className="ktk-hero__signals" aria-label="Store benefits">
              <li>Local crew</li>
              <li>Book in minutes</li>
              <li>Built for groups</li>
            </ul>
          </div>

          <aside className="ktk-hero__deck" aria-label="Featured Krakow experiences">
            <div className="ktk-hero__deck-heading">
              <span>Tonight's shortlist</span>
              <strong>Choose your energy</strong>
            </div>
            <div className="ktk-hero__tickets">
              {featuredProducts.map((product, index) => (
                <StorefrontLink
                  className={`ktk-hero-ticket ktk-hero-ticket--${index + 1}`}
                  key={product.id}
                  path={product.slug}
                  navigate={navigate}
                >
                  <span className="ktk-hero-ticket__index">0{index + 1}</span>
                  <span className="ktk-hero-ticket__main">
                    <small>{product.productType?.name || 'Krakow experience'}</small>
                    <strong>{product.name}</strong>
                  </span>
                  <span className="ktk-hero-ticket__price">
                    <small>{Number(product.price.amount) > 0 ? 'from' : 'open'}</small>
                    <strong>
                      {Number(product.price.amount) > 0 ? money.format(product.price.amount) : 'See options'}
                    </strong>
                  </span>
                  <span className="ktk-hero-ticket__arrow" aria-hidden="true">{'\u2197'}</span>
                </StorefrontLink>
              ))}
            </div>
            <div className="ktk-hero__deck-footer" aria-hidden="true">
              <span>Plans are overrated.</span>
              <strong>Krakow isn't.</strong>
            </div>
          </aside>
        </div>

        <button className="ktk-hero__scroll" type="button" onClick={showCatalog}>
          <span>Scroll to explore</span>
          <i aria-hidden="true">{'\u2193'}</i>
        </button>
      </section>

      <section className="ktk-catalog" aria-labelledby="ktk-catalog-title">
        <div className="ktk-section-heading">
          <h2 id="ktk-catalog-title">Choose the energy</h2>
        </div>
        <div className="ktk-product-grid">
          {state.products.map((product, index) => {
            const pastCampaign = getProductContent(product).pastCampaign;
            return (
            <article className="ktk-product-card" key={product.id}>
              <ProductCardMedia product={product} index={index} />
              <div className="ktk-product-card__body">
                <p>{product.productType?.name || 'Experience'}</p>
                <h3><StorefrontLink path={product.slug} navigate={navigate}>{product.name}</StorefrontLink></h3>
                <div className="ktk-product-card__footer">
                  <strong>{pastCampaign ? 'Past event - next dates TBA' : `From ${money.format(product.price.amount)}`}</strong>
                  <StorefrontLink path={product.slug} navigate={navigate} aria-label={`View ${product.name}`}>
                    View <span>{'\u2197'}</span>
                  </StorefrontLink>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function ProductDetail({ slug, navigate, addToCart, cart, contact, setContact }) {
  const [state, setState] = useState({
    loading: true,
    product: null,
    cancellationPolicy: null,
    error: '',
  });
  const [attempt, setAttempt] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [contactAttempted, setContactAttempted] = useState(false);

  useEffect(() => {
    if (!state.loading) completePublicContentHandoff(document);
  }, [state.loading]);

  useEffect(() => {
    const controller = new AbortController();
    const productSlug = normalizeRoutePath(slug);
    setState({ loading: true, product: null, cancellationPolicy: null, error: '' });
    if (!productSlug || productSlug.includes('/')) {
      setState({
        loading: false,
        product: null,
        cancellationPolicy: null,
        error: 'This experience link is invalid.',
      });
      return () => controller.abort();
    }
    getJson(`/products/${encodeURIComponent(productSlug)}`, controller.signal)
      .then((payload) => {
        startJourneyReplay(payload.storefrontConfig?.journeyReplay, null, {
          area: 'product',
          productSlug: payload.product?.slug || productSlug,
        });
        setState({
          loading: false,
          product: payload.product,
          cancellationPolicy: payload.storefrontConfig?.cancellationPolicy || null,
          error: '',
        });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          if (isOmniAvailabilityFailure(error) && redirectToLegacyStore([productSlug])) return;
          setState({
            loading: false,
            product: null,
            cancellationPolicy: null,
            error: error.message,
          });
        }
      });
    return () => controller.abort();
  }, [slug, attempt]);

  const content = useMemo(
    () => (state.product ? getProductContent(state.product) : null),
    [state.product],
  );
  const basePrice = Number(state.product?.price?.amount ?? 0);

  useEffect(() => {
    setActiveImage(0);
  }, [slug]);

  useEffect(() => {
    if (!state.product) return;
    trackJourney('product_viewed', {
      productId: state.product.id,
      productSlug: state.product.slug,
      productName: state.product.name,
    });
  }, [state.product]);

  useEffect(() => {
    if (!state.product) return undefined;
    const bookingSection = document.getElementById('build-your-booking');
    if (!bookingSection || typeof IntersectionObserver === 'undefined') return undefined;
    let recorded = false;
    const observer = new IntersectionObserver((entries) => {
      if (recorded || !entries.some((entry) => entry.isIntersecting)) return;
      recorded = true;
      trackJourney('booking_builder_reached', {
        productId: state.product.id,
        productSlug: state.product.slug,
      });
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(bookingSection);
    return () => observer.disconnect();
  }, [state.product]);

  useEffect(() => {
    if (state.loading || !state.product) return undefined;

    const bookQuery = new URLSearchParams(window.location.search).get('book');
    const bookHash = window.location.hash.toLowerCase();
    const shouldOpenBooking = ['1', 'true', 'yes'].includes(String(bookQuery).toLowerCase())
      || ['#book', '#build-your-booking'].includes(bookHash);
    if (!shouldOpenBooking) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const bookingSection = document.getElementById('build-your-booking');
      if (!bookingSection) return;
      const bookingTop = bookingSection.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(0, bookingTop - 24),
        behavior: 'auto',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [state.loading, state.product, slug]);

  if (state.loading) return <Loading />;
  if (state.error) return <ErrorState message={state.error} retry={() => setAttempt((value) => value + 1)} />;

  const product = state.product;
  const hasGallery = content.gallery.length > 0;

  return (
    <main className="ktk-detail">
      <nav className="ktk-detail__nav" aria-label="Product navigation">
        <StorefrontLink className="ktk-back" navigate={navigate}>
          <span aria-hidden="true">{'\u2190'}</span> All experiences
        </StorefrontLink>
        <span>Local crew. Secure booking.</span>
      </nav>

      <header className="ktk-detail__hero">
        <div className="ktk-detail__intro">
          <h1>{product.name}</h1>
          <p>{content.summary}</p>
        </div>
        {!content.pastCampaign && <div className="ktk-detail__starting-price">
          <span>From</span>
          <strong>{money.format(basePrice)}</strong>
          <small>per person</small>
        </div>}
      </header>

      <div className="ktk-detail__layout">
        <div className="ktk-detail__main">
          <section className="ktk-gallery" aria-label={`${product.name} gallery`}>
            <div className="ktk-gallery__stage">
              {hasGallery ? (
                <img
                  {...responsiveProductImage(product.id, content.gallery[activeImage], 'stage', config.assetBaseUrl)}
                  src={content.gallery[activeImage]}
                  alt={`${product.name} experience`}
                  decoding="async"
                  fetchPriority="high"
                />
              ) : (
                <ProductArt product={product} index={product.id} />
              )}
              <span>{String(activeImage + 1).padStart(2, '0')} / {String(Math.max(content.gallery.length, 1)).padStart(2, '0')}</span>
            </div>
            {content.gallery.length > 1 && (
              <div className="ktk-gallery__thumbs">
                {content.gallery.map((image, index) => (
                  <button
                    className={index === activeImage ? 'is-active' : ''}
                    type="button"
                    key={image}
                    onClick={() => setActiveImage(index)}
                    aria-label={`Show image ${index + 1}`}
                    aria-pressed={index === activeImage}
                  >
                    <img
                      {...responsiveProductImage(product.id, image, 'thumbnail', config.assetBaseUrl)}
                      src={image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          {content.description && (
            <section className="ktk-product-story">
              <div>
                <p className="ktk-eyebrow">The experience</p>
                <h2>Organised chaos,<br />handled locally.</h2>
              </div>
              <p>{content.description}</p>
            </section>
          )}

          {content.highlights.length > 0 && (
            <section className="ktk-inclusions">
              <p className="ktk-eyebrow ktk-inclusions__heading">{content.pastCampaign ? `${content.pastCampaign.lastDates[0].slice(0, 4)} inclusions` : 'Inclusions'}</p>
              <div className="ktk-highlights">
                {content.highlights.map((highlight, index) => (
                  <article key={highlight}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p className="ktk-highlights__text">{highlight}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {(content.meetingPoint || content.importantInformation.length > 0) && (
            <section className="ktk-practical-info" aria-label="Important product information">
              {content.meetingPoint && (
                <div className="ktk-practical-info__section ktk-practical-info__section--meeting">
                  <p className="ktk-eyebrow">{content.pastCampaign ? `${content.pastCampaign.lastDates[0].slice(0, 4)} meeting point` : 'Meeting point'}</p>
                  {content.meetingPoint.name && <h2>{content.meetingPoint.name}</h2>}
                  {content.meetingPoint.address && <p>{content.meetingPoint.address}</p>}
                  {content.meetingPoint.instructions && (
                    <strong>{content.meetingPoint.instructions}</strong>
                  )}
                  {content.meetingPoint.mapUrl && (
                    <a href={content.meetingPoint.mapUrl} target="_blank" rel="noreferrer">
                      Open in Google Maps <span aria-hidden="true">{'↗'}</span>
                    </a>
                  )}
                </div>
              )}
              {content.importantInformation.length > 0 && (
                <div className="ktk-practical-info__section ktk-practical-info__section--important">
                  <p className="ktk-eyebrow">Important information</p>
                  <ul>
                    {content.importantInformation.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
            </section>
          )}

          {state.cancellationPolicy && (
            <section className="ktk-cancellation-policy">
              <details>
                <summary className="ktk-cancellation-policy__toggle">
                  <span className="ktk-cancellation-policy__heading">
                    <span className="ktk-eyebrow">Booking terms</span>
                    <span className="ktk-cancellation-policy__title" role="heading" aria-level="2">
                      {state.cancellationPolicy.title}
                    </span>
                  </span>
                  <span className="ktk-cancellation-policy__icon" aria-hidden="true" />
                </summary>
                <div className="ktk-cancellation-policy__content">
                  {state.cancellationPolicy.summary && <p>{state.cancellationPolicy.summary}</p>}
                  {Array.isArray(state.cancellationPolicy.items)
                    && state.cancellationPolicy.items.length > 0 && (
                    <div className="ktk-cancellation-policy__items">
                      {state.cancellationPolicy.items.map((item) => (
                        <article key={`${item.title}-${item.description}`}>
                          <strong>{item.title}</strong>
                          <p>{item.description}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            </section>
          )}
        </div>
        {content.pastCampaign ? (
          <aside className="ktk-public-booking ktk-past-campaign" aria-label="Past event">
            <h2>{content.pastCampaign.label}</h2>
            <p>{content.pastCampaign.nextDates}</p>
            <StorefrontLink className="ktk-commerce__primary" path="pub-crawl-28" navigate={navigate}>
              <span>View regular Pub Crawl</span><span aria-hidden="true">{'\u2197'}</span>
            </StorefrontLink>
          </aside>
        ) : <aside id="build-your-booking" className="ktk-booking" aria-label="Configure this experience">
          <ProductConfigurator
            product={product}
            initialItem={[...cart].reverse().find(item => Number(item.productId) === Number(product.id)) || null}
            cartItems={cart}
            money={money}
            additionalFields={(
              <section className="ktk-product-contact" aria-label="Contact details">
                <ContactFields
                  contact={contact}
                  setContact={setContact}
                  idPrefix="ktk-product-contact"
                  showErrors={contactAttempted}
                  onFieldCompleted={(field) => trackJourney('contact_field_completed', {
                    productId: product.id,
                    productSlug: product.slug,
                    field,
                  })}
                />
              </section>
            )}
            onSubmit={(item) => {
              setContactAttempted(true);
              if (!contactIsComplete(contact)) {
                window.requestAnimationFrame(() => {
                  const firstInvalid = document.querySelector(
                    '#build-your-booking [aria-invalid="true"]',
                  );
                  firstInvalid?.focus({ preventScroll: true });
                  firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
                return;
              }
              trackJourney('contact_information_valid', {
                productId: product.id,
                productSlug: product.slug,
              });
              addToCart(item);
              navigate('cart');
            }}
            onJourneyEvent={trackJourney}
            onAvailabilityRedirect={(availability) => followAvailabilityRedirect(availability, navigate)}
          />
        </aside>}
      </div>
    </main>
  );
}

function EmptyCart({ navigate }) {
  return (
    <main className="ktk-commerce ktk-commerce--empty">
      <p className="ktk-eyebrow">Your shortlist</p>
      <h1>Your cart is waiting for a story.</h1>
      <p>Pick an experience, choose your date, and come back here when you are ready.</p>
      <button className="ktk-commerce__primary" type="button" onClick={() => navigate('')}>
        Explore experiences
      </button>
    </main>
  );
}

function Cart({
  cart,
  setCart,
  updateCartItem,
  cartNotice,
  undoCartUpdate,
  contact,
  setContact,
  discountCodes,
  setDiscountCodes,
  preparedCart,
  cartSessionId,
  setCartSessionId,
  ongoingCartPublicId,
  setOngoingCartPublicId,
  browserInstanceId,
  pageInstanceId,
  navigate,
}) {
  const [quote, setQuote] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [editingKey, setEditingKey] = useState('');
  const [contactOpen, setContactOpen] = useState(() => !contactIsComplete(contact));
  const [loading, setLoading] = useState(Boolean(cart.length));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [cartConflict, setCartConflict] = useState(false);
  const [cartReviewAttempt, setCartReviewAttempt] = useState(0);
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentInputKey, setPaymentInputKey] = useState('');
  const [quoteInputKey, setQuoteInputKey] = useState('');
  const [paymentMountVersion, setPaymentMountVersion] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const paymentSectionRef = useRef(null);
  const paymentMountRef = useRef(null);
  const stripeRef = useRef(null);
  const stripeElementsRef = useRef(null);
  const paymentElementRef = useRef(null);
  const completedPaymentDetailsIntentRef = useRef('');
  const cartIdentityRef = useRef({ cartSessionId, ongoingCartPublicId });
  const cancellationReportRef = useRef(null);
  const cartOpenedRef = useRef(false);
  const checkoutAttemptKeyRef = useRef('');
  const checkoutInputKey = JSON.stringify({
    cart: toApiCart(cart, discountCodes, contact),
    customer: contact,
    preparedCartPublicId: preparedCart?.publicId || '',
    cartReviewAttempt,
  });
  cartIdentityRef.current = { cartSessionId, ongoingCartPublicId };
  if (cancellationReportRef.current === null) {
    const query = new URLSearchParams(window.location.search);
    const cancelledOrderPublicId = query.get('cancelled_order') || '';
    const key = `ktk-checkout-cancelled:${cancelledOrderPublicId || ongoingCartPublicId || cartSessionId}`;
    cancellationReportRef.current = {
      key,
      orderPublicId: cancelledOrderPublicId,
      wasCancelled: query.get('checkout') === 'cancelled',
      shouldReport: query.get('checkout') === 'cancelled'
        && window.sessionStorage.getItem(key) !== '1',
    };
  }
  const checkoutWasCancelled = cancellationReportRef.current.wasCancelled;

  const cartVersionRef = useRef(null);
  const rememberCartVersion = (value) => {
    if (!value?.publicId || !/^[a-f0-9]{64}$/.test(value.cartVersion || '')) return;
    cartVersionRef.current = { publicId: value.publicId, cartVersion: value.cartVersion };
    window.localStorage.setItem('ktk-storefront-cart-version-v1', JSON.stringify(cartVersionRef.current));
  };
  const versionedRequest = async (path, options) => {
    if (preparedCart) return requestJson(path, options);
    const publicId = options.body.ongoingCartPublicId || '';
    try {
      let version = cartVersionRef.current?.publicId === publicId ? cartVersionRef.current.cartVersion : null;
      if (publicId && !version) {
        let stored;
        try { stored = JSON.parse(window.localStorage.getItem('ktk-storefront-cart-version-v1') || 'null'); } catch { stored = null; }
        if (stored?.publicId === publicId && /^[a-f0-9]{64}$/.test(stored.cartVersion || '')) {
          rememberCartVersion(stored);
          version = stored.cartVersion;
        } else {
          const review = new Error('Review your saved selections below before continuing.');
          review.status = 409;
          review.cartReviewRequired = true;
          throw review;
        }
      }
      const payload = await requestJson(path, { ...options, body: {
        ...options.body, cartVersionProtocol: 1, ...(version ? { cartVersion: version } : {}),
      } });
      rememberCartVersion(payload.ongoingCart);
      return payload;
    } catch (requestError) {
      if (requestError.cartReviewRequired || ([409, 410].includes(requestError.status)
        && /another device|cart is no longer available/.test(requestError.message))) setCartConflict(requestError.message);
      throw requestError;
    }
  };
  const reviewCurrentSelections = () => {
    const sessionId = createCartSessionId();
    cartIdentityRef.current = { cartSessionId: sessionId, ongoingCartPublicId: '' };
    cartVersionRef.current = null;
    setCartSessionId(sessionId);
    setOngoingCartPublicId('');
    window.localStorage.setItem(CART_SESSION_STORAGE_KEY, sessionId);
    window.localStorage.removeItem(ONGOING_CART_STORAGE_KEY);
    window.localStorage.removeItem('ktk-storefront-cart-version-v1');
    setCartConflict(false);
    setError('');
    setPaymentError('');
    setCartReviewAttempt(value => value + 1);
  };


  useEffect(() => {
    if (!cart.length || cartOpenedRef.current) return;
    cartOpenedRef.current = true;
    trackJourney('cart_opened', {
      itemCount: cart.length,
      participantCount: cart.reduce((total, item) => total + Number(item.quantity || 0), 0),
    });
  }, [cart]);

  useEffect(() => {
    if (!ongoingCartPublicId) return undefined;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        trackJourney('checkout_page_hidden', { path: window.location.pathname });
        flushJourneyActivity(ongoingCartPublicId, { beacon: true });
      } else {
        trackJourney('checkout_page_resumed', { path: window.location.pathname });
        flushJourneyActivity(ongoingCartPublicId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [ongoingCartPublicId]);

  useEffect(() => {
    if (!cart.length) return;
    void loadStripeJs().catch(() => {});
  }, [cart.length]);

  useEffect(() => {
    if (!cart.length) {
      setQuote(null);
      setQuoteInputKey('');
      setPaymentSession(null);
      setPaymentInputKey('');
      setPaymentLoading(false);
      setLoading(false);
      return undefined;
    }
    if (!contactIsComplete(contact)) {
      setQuote(null);
      setQuoteInputKey('');
      setError('');
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const identity = cartIdentityRef.current;
      const cancellationReport = cancellationReportRef.current;
      if (cancellationReport?.shouldReport) {
        trackJourney('payment_authentication_cancelled', {
          ...(cancellationReport.orderPublicId
            ? { orderPublicId: cancellationReport.orderPublicId }
            : {}),
          detection: 'stripe_return',
        });
      }
      const journeyEvents = pendingJourneyEvents();
      setLoading(true);
      setError('');
      versionedRequest('/cart/quote', {
        method: 'POST',
        body: {
          ...toApiCart(cart, discountCodes, contact),
          ...(preparedCart ? { sharedCartPublicId: preparedCart.publicId } : {}),
          ...(!preparedCart ? {
            cartSessionId: identity.cartSessionId,
            ...(identity.ongoingCartPublicId
              ? { ongoingCartPublicId: identity.ongoingCartPublicId }
              : {}),
            customer: contact,
            attribution: getAttribution(),
            clientContext: journeyClientContext(),
            journeyEvents,
          } : {}),
        },
        signal: controller.signal,
      })
        .then((payload) => {
          setQuote(payload);
          setQuoteInputKey(checkoutInputKey);
          const nextIdentity = { ...cartIdentityRef.current };
          if (payload.ongoingCart?.publicId) {
            nextIdentity.ongoingCartPublicId = payload.ongoingCart.publicId;
            setOngoingCartPublicId(payload.ongoingCart.publicId);
            window.localStorage.setItem(ONGOING_CART_STORAGE_KEY, payload.ongoingCart.publicId);
            setQualifiedJourneyCart(payload.ongoingCart.publicId);
            startJourneyReplay(payload.journeyReplay, payload.ongoingCart.publicId);
          }
          if (
            payload.ongoingCart?.sessionId
            && payload.ongoingCart.sessionId !== identity.cartSessionId
          ) {
            nextIdentity.cartSessionId = payload.ongoingCart.sessionId;
            setCartSessionId(payload.ongoingCart.sessionId);
            window.localStorage.setItem(CART_SESSION_STORAGE_KEY, payload.ongoingCart.sessionId);
          }
          cartIdentityRef.current = nextIdentity;
          acknowledgeJourneyEvents(payload.journey?.acceptedEventIds);
          if (cancellationReport?.shouldReport) {
            window.sessionStorage.setItem(cancellationReport.key, '1');
            cancellationReport.shouldReport = false;
          }
        })
        .catch((requestError) => {
          if (requestError.name !== 'AbortError') {
            if (
              isOmniAvailabilityFailure(requestError)
              && redirectToLegacyStore(cart.map((item) => item.productSlug))
            ) return;
            setError(requestError.message);
          }
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    cart,
    discountCodes,
    contact,
    preparedCart,
    setCartSessionId,
    setOngoingCartPublicId,
    browserInstanceId,
    pageInstanceId,
    checkoutInputKey,
  ]);

  useEffect(() => {
    setQuote(null);
    setQuoteInputKey('');
    setPaymentInputKey('');
    setPaymentError('');
    checkoutAttemptKeyRef.current = '';
  }, [checkoutInputKey]);

  useEffect(() => {
    if (!paymentSession) return undefined;
    let disposed = false;
    setPaymentLoading(true);
    setPaymentError('');

    loadStripeJs()
      .then((Stripe) => {
        const stripe = Stripe(paymentSession.publishableKey);
        const elements = stripe.elements({
          clientSecret: paymentSession.clientSecret,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#ff168f',
              colorBackground: '#090909',
              colorText: '#f3eee4',
              colorDanger: '#ff8ecb',
              borderRadius: '0px',
              fontFamily: 'Montserrat, Arial, sans-serif',
              spacingUnit: '5px',
            },
          },
        });
        const paymentElement = elements.create('payment', {
          layout: 'tabs',
          paymentMethodOrder: ['card', 'blik', 'klarna'],
          business: { name: 'Krawl Through Krakow' },
          defaultValues: {
            billingDetails: {
              name: contact.fullName.trim(),
              email: contact.email.trim().toLowerCase(),
              phone: phoneForApi(contact.phone, contact.phoneCountry),
            },
          },
        });
        if (disposed) return;
        stripeRef.current = stripe;
        stripeElementsRef.current = elements;
        paymentElementRef.current = paymentElement;
        paymentElement.on('ready', () => {
          if (!disposed) {
            setPaymentLoading(false);
            trackJourney('payment_element_ready', {
              orderPublicId: paymentSession.publicId,
            });
          }
        });
        paymentElement.on('change', (event) => {
          if (disposed) return;
          setPaymentError(event.error?.message || '');
          if (
            event.complete
            && completedPaymentDetailsIntentRef.current !== paymentSession.paymentIntentId
          ) {
            completedPaymentDetailsIntentRef.current = paymentSession.paymentIntentId;
            trackJourney('payment_details_completed', {
              orderPublicId: paymentSession.publicId,
            });
          }
        });
        paymentElement.mount(paymentMountRef.current);
      })
      .catch((checkoutError) => {
        if (disposed) return;
        setPaymentLoading(false);
        setPaymentError(checkoutError.message || 'Stripe payment could not be displayed.');
      });

    return () => {
      disposed = true;
      paymentElementRef.current?.destroy();
      paymentElementRef.current = null;
      stripeElementsRef.current = null;
      stripeRef.current = null;
      if (paymentMountRef.current) paymentMountRef.current.replaceChildren();
    };
  }, [paymentSession?.clientSecret, paymentMountVersion]);

  const removeItem = (key) => {
    const removedIndex = cart.findIndex((item) => item.key === key);
    const removed = removedIndex >= 0 ? cart[removedIndex] : null;
    const remaining = cart.filter((item) => item.key !== key);
    if (removed) {
      trackJourney('cart_item_removed', {
        ...cartItemJourneySnapshot(
          removed,
          removedIndex + 1,
          quote?.items?.[removedIndex]?.total,
        ),
        cartItemCountBefore: cart.length,
        cartItemCountAfter: remaining.length,
      });
    }
    setCart(remaining);
    if (remaining.length === 0 && ongoingCartPublicId) {
      void requestJson(`/ongoing-carts/session/${encodeURIComponent(cartSessionId)}`, {
        method: 'DELETE',
      }).catch(() => {});
      setOngoingCartPublicId('');
      window.localStorage.removeItem(ONGOING_CART_STORAGE_KEY);
    }
  };

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponInput('');
    if (discountCodes.length === 1 && discountCodes[0] === code) return;
    discountCodes.filter((current) => current !== code).forEach((previousCode) => {
      trackJourney('discount_removed', { code: previousCode });
    });
    setDiscountCodes(singleDiscountCode(code));
    trackJourney('discount_applied', { code });
  };

  const checkoutRequest = async () => {
    const nameParts = contact.fullName.trim().split(/\s+/);
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ');
    const journeyEvents = pendingJourneyEvents();
    const result = await versionedRequest('/checkout', {
      method: 'POST',
      body: {
        cart: toApiCart(cart, discountCodes, contact),
        customer: {
          firstName,
          lastName,
          email: contact.email.trim().toLowerCase(),
          phone: phoneForApi(contact.phone, contact.phoneCountry),
          countryCode: contact.phoneCountry,
        },
        attribution: getAttribution(),
        ...(preparedCart ? { sharedCartPublicId: preparedCart.publicId } : {}),
        ...(!preparedCart && ongoingCartPublicId ? { ongoingCartPublicId } : {}),
        ...(!preparedCart ? {
          journeyEvents,
          clientContext: journeyClientContext(),
        } : {}),
      },
    });
    acknowledgeJourneyEvents(result.journey?.acceptedEventIds);
    return result;
  };

  const reportPaymentError = (stripeError) => {
    if (preparedCart || !ongoingCartPublicId) return;
    trackJourney('payment_error', {
      orderPublicId: paymentSession?.publicId,
      errorType: stripeError?.type || null,
      code: stripeError?.code || stripeError?.decline_code || null,
      message: stripeError?.message || 'The payment form reported an error.',
    });
    flushJourneyActivity(ongoingCartPublicId);
  };

  const retryPaymentForm = () => {
    setPaymentError('');
    if (paymentSession && paymentInputKey === checkoutInputKey) {
      setPaymentMountVersion((current) => current + 1);
      return;
    }
    checkoutAttemptKeyRef.current = '';
    if (quote && quoteInputKey === checkoutInputKey) {
      checkoutAttemptKeyRef.current = checkoutInputKey;
      void startCheckout(checkoutInputKey);
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    const stripe = stripeRef.current;
    const elements = stripeElementsRef.current;
    if (
      !stripe
      || !elements
      || !paymentSession
      || paymentSubmitting
      || paymentInputKey !== checkoutInputKey
    ) return;

    setPaymentSubmitting(true);
    setPaymentError('');
    const returnBaseUrl = new URL(
      config.baseUrl || '/',
      window.location.origin,
    ).toString().replace(/\/+$/, '');
    const returnUrl = `${returnBaseUrl}/checkout/success`;
    try {
      trackJourney('payment_attempted', {
        orderPublicId: paymentSession.publicId,
        paymentIntentId: paymentSession.paymentIntentId,
      });
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required',
      });
      if (result.error) {
        setPaymentError(result.error.message || 'Payment could not be completed.');
        reportPaymentError(result.error);
        setPaymentSubmitting(false);
        return;
      }
      if (!result.paymentIntent?.id) {
        throw new Error('Stripe did not return the payment status.');
      }
      navigate('checkout/success');
    } catch (paymentRequestError) {
      setPaymentError(paymentRequestError.message || 'Payment could not be completed.');
      reportPaymentError(paymentRequestError);
      setPaymentSubmitting(false);
    }
  };

  const startCheckout = async (inputKey = checkoutInputKey) => {
    if (
      !contactIsComplete(contact)
      || !quote
      || quoteInputKey !== inputKey
      || submitting
    ) {
      if (!contactIsComplete(contact)) setContactOpen(true);
      return;
    }

    const previousSession = paymentSession;
    if (!previousSession) setPaymentLoading(true);
    setSubmitting(true);
    setError('');
    setPaymentError('');
    trackJourney('checkout_opened', {
      itemCount: cart.length,
      total: quote.total,
      currency: quote.currency,
    });
    try {
      const result = await checkoutRequest();
      if (!saveCheckoutConfirmation(result)) {
        throw new Error('The secure confirmation could not be saved in this browser.');
      }
      if (result.paymentComplete) {
        navigate('checkout/success');
        return;
      }
      if (
        result.paymentMode === 'payment_element'
        && result.clientSecret
        && result.publishableKey
        && result.paymentIntentId
      ) {
        if (
          previousSession?.paymentIntentId === result.paymentIntentId
          && stripeElementsRef.current?.fetchUpdates
        ) {
          await stripeElementsRef.current.fetchUpdates();
        }
        setPaymentSession(result);
        setPaymentInputKey(inputKey);
        setSubmitting(false);
      } else {
        throw new Error('Stripe payment could not be initialized.');
      }
    } catch (requestError) {
      if (
        isOmniAvailabilityFailure(requestError)
        && redirectToLegacyStore(cart.map((item) => item.productSlug))
      ) return;
      setPaymentLoading(false);
      setPaymentError(requestError.message);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (
      !cart.length
      || !contactIsComplete(contact)
      || !quote
      || quoteInputKey !== checkoutInputKey
      || paymentInputKey === checkoutInputKey
      || submitting
      || checkoutAttemptKeyRef.current === checkoutInputKey
    ) return;

    checkoutAttemptKeyRef.current = checkoutInputKey;
    void startCheckout(checkoutInputKey);
  }, [checkoutInputKey, paymentInputKey, quote, quoteInputKey, submitting]);

  if (!cart.length) return <EmptyCart navigate={navigate} />;

  return (
    <main className="ktk-commerce">
      {!preparedCart && (
        <header className="ktk-commerce__header">
          <div>
            <p className="ktk-eyebrow">Your Krakow plan</p>
            <h1>Cart</h1>
          </div>
          <button className="ktk-commerce__text-button" type="button" disabled={submitting || paymentSubmitting} onClick={() => navigate('')}>
            Keep exploring
          </button>
        </header>
      )}

      {cartConflict && (
        <div className="ktk-commerce-notice" role="alert">
          <p>{cartConflict}</p>
          <button className="ktk-commerce__primary" type="button" disabled={submitting || paymentSubmitting} onClick={reviewCurrentSelections}>
            Review and use these selections
          </button>
        </div>
      )}
      {cartNotice && (
        <div className="ktk-commerce-notice ktk-cart-update-notice" role="status">
          <span>{cartNotice.message || 'Booking updated.'}</span>
          {cartNotice.before && <button type="button" className="ktk-commerce__text-button" disabled={submitting || paymentSubmitting || Boolean(cartConflict)} onClick={undoCartUpdate}>Undo</button>}
        </div>
      )}
      {preparedCart && (
        <p className="ktk-commerce-notice ktk-commerce-notice--prepared" role="status">
          Your booking has been prepared by our team. Confirm your contact information and continue to secure payment.
        </p>
      )}

      {checkoutWasCancelled && (
        <p className="ktk-commerce-notice" role="status">
          Payment was cancelled. Your cart is still here and you have not been charged.
        </p>
      )}

      <div className="ktk-commerce__layout">
        <section className="ktk-cart-lines" aria-label="Cart items">
          <section
            className={[
              'ktk-cart-contact',
              contactOpen ? 'is-open' : '',
              contactIsComplete(contact) ? 'is-complete' : '',
            ].filter(Boolean).join(' ')}
            aria-labelledby="ktk-cart-contact-title"
          >
            <button
              className="ktk-cart-contact__heading"
              type="button"
              aria-expanded={contactOpen}
              aria-controls="ktk-cart-contact-fields"
              onClick={() => setContactOpen((current) => !current)}
            >
              <h2 id="ktk-cart-contact-title">Contact information</h2>
              <span aria-label={contactIsComplete(contact) ? 'Contact information complete' : undefined}>
                {contactIsComplete(contact) ? '\u2713' : 'Required'}
              </span>
              <i aria-hidden="true" />
            </button>
            {contactOpen && (
              <fieldset className="ktk-cart-contact__body ktk-cart-contact-fields" id="ktk-cart-contact-fields" disabled={submitting || paymentSubmitting || Boolean(cartConflict)}>
                <ContactFields
                  contact={contact}
                  setContact={setContact}
                  idPrefix="ktk-cart-contact"
                />
                <p className="ktk-cart-contact__note">
                  We use these details for every activity in this order.
                </p>
              </fieldset>
            )}
          </section>

          {cart.map((item, index) => {
            const pricedItem = quote?.items?.[index];
            const itemAddons = cartAddonDetails(item, pricedItem);
            const participants = item.options?.participants;
            const genderSplit = (item.product?.config?.participantMode
              ?? item.product?.storefrontConfig?.participantMode) === 'gender_split';
            return (
              <React.Fragment key={item.key}>
                <article className="ktk-cart-line">
                  <div className="ktk-cart-line__number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="ktk-cart-line__body">
                    <button
                      type="button"
                      disabled={Boolean(preparedCart) || submitting || paymentSubmitting || Boolean(cartConflict)}
                      onClick={() => navigate(item.productSlug || item.product?.slug || '')}
                    >
                      {item.productName}
                    </button>
                    <div className="ktk-cart-line__meta">
                      <span>
                        <small>Date</small>
                        <strong>{formatCartDate(item.experienceDate)}</strong>
                      </span>
                      {item.experienceTime && (
                        <span>
                          <small>Start</small>
                          <strong>{item.experienceTime}</strong>
                        </span>
                      )}
                      {genderSplit ? (
                        <span className="ktk-cart-line__meta-group">
                          <small>Group</small>
                          <strong>
                            <span>
                              {participants?.men || 0} {(participants?.men || 0) === 1 ? 'man' : 'men'}
                            </span>
                            <i aria-hidden="true">{'\u00b7'}</i>
                            <span>
                              {participants?.women || 0} {(participants?.women || 0) === 1 ? 'woman' : 'women'}
                            </span>
                          </strong>
                        </span>
                      ) : (
                        <span>
                          <small>Guests</small>
                          <strong>{item.quantity}</strong>
                        </span>
                      )}
                    </div>
                    {itemAddons.length > 0 && (
                      <div className="ktk-cart-line__addons" aria-label="Selected add-ons">
                        <div className="ktk-cart-line__addons-heading" aria-hidden="true">
                          <small>Add-ons</small>
                          <small>Quantity</small>
                        </div>
                        <ul>
                          {itemAddons.map((addon) => (
                            <li key={`${addon.addonId || addon.id || addon.name}-${addon.value || addon.quantity}`}>
                              <span className="ktk-cart-line__addon-name">
                                <i aria-hidden="true">{cartAddonEmoji(addon.name)}</i>
                                <strong>{addon.name}</strong>
                              </span>
                              <CartAddonQuantity addon={addon} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="ktk-cart-line__price">
                    <small>Item total</small>
                    <strong>{pricedItem ? money.format(pricedItem.total) : '...'}</strong>
                  </div>
                  {!preparedCart && <div className="ktk-cart-line__actions">
                    {item.product && (
                      <button
                        type="button"
                        aria-expanded={editingKey === item.key}
                        disabled={submitting || paymentSubmitting || Boolean(cartConflict)}
                        onClick={() => {
                          if (editingKey !== item.key) {
                            trackJourney('cart_item_edit_started', {
                              ...cartItemJourneySnapshot(item, index + 1, pricedItem?.total),
                            });
                          }
                          setEditingKey((current) => (
                            current === item.key ? '' : item.key
                          ));
                        }}
                      >
                        {editingKey === item.key ? 'Close' : 'Edit'}
                      </button>
                    )}
                    <button
                      className="ktk-cart-line__remove"
                      type="button"
                      aria-label={`Remove ${item.productName}`}
                      disabled={submitting || paymentSubmitting || Boolean(cartConflict)}
                      onClick={() => removeItem(item.key)}
                    >
                      Remove
                    </button>
                  </div>}
                </article>
                {!preparedCart && editingKey === item.key && item.product && (
                  <fieldset className="ktk-cart-editor" disabled={submitting || paymentSubmitting || Boolean(cartConflict)}>
                    <ProductConfigurator
                      product={item.product}
                      initialItem={item}
                      submitLabel="Update booking"
                      money={money}
                      onSubmit={(updatedItem) => {
                        updateCartItem(updatedItem, item.key);
                        setEditingKey('');
                      }}
                      onJourneyEvent={trackJourney}
                      onAvailabilityRedirect={(availability) => followAvailabilityRedirect(availability, navigate)}
                    />
                    <button type="button" onClick={() => setEditingKey('')}>Cancel</button>
                  </fieldset>
                )}
              </React.Fragment>
            );
          })}

        </section>

        <aside className="ktk-order-summary">
          <p className="ktk-eyebrow">The total</p>
          <dl>
            <div><dt>Experiences</dt><dd>{quote ? money.format(quote.subtotal) : '...'}</dd></div>
            <div><dt>Add-ons</dt><dd>{quote ? money.format(quote.addonTotal) : '...'}</dd></div>
            {Boolean(quote?.discountTotal) && (
              <div className="ktk-order-summary__discount">
                <dt>Discount</dt><dd>-{money.format(quote.discountTotal)}</dd>
              </div>
            )}
            <div className="ktk-order-summary__total">
              <dt>Total</dt><dd>{quote ? money.format(quote.total) : '...'}</dd>
            </div>
          </dl>

          {!preparedCart && <div className="ktk-coupon">
            <input
              aria-label="Discount code"
              placeholder="Discount code"
              value={couponInput}
              disabled={submitting || paymentSubmitting || Boolean(cartConflict)}
              onChange={(event) => setCouponInput(event.target.value)}
            />
            <button type="button" disabled={submitting || paymentSubmitting || Boolean(cartConflict)} onClick={applyCoupon}>Apply</button>
          </div>}
          <div className="ktk-discount-codes">
            {discountCodes.map((code) => (
              <span className="ktk-discount-code" key={code}>
                {code}
                {!preparedCart && <button
                  type="button"
                  aria-label={`Remove discount code ${code}`}
                  disabled={submitting || paymentSubmitting || Boolean(cartConflict)}
                  onClick={() => setDiscountCodes((current) => current.filter((item) => item !== code))}
                >
                  Remove
                </button>}
              </span>
            ))}
          </div>
          {error && <p className="ktk-form-error" role="alert">{error}</p>}

        </aside>
      </div>
      <section
        className="ktk-payment-element"
        ref={paymentSectionRef}
        data-clarity-mask="true"
        aria-labelledby="ktk-payment-element-title"
      >
          <header className="ktk-payment-element__header">
            <div>
              <div className="ktk-payment-element__eyebrow-row">
                <p className="ktk-eyebrow">Secure checkout</p>
                <details className="ktk-payment-element__info">
                  <summary aria-label="Payment security information">i</summary>
                  <p role="tooltip">
                    Payments are encrypted and processed securely by Stripe.
                  </p>
                </details>
              </div>
              <h2 id="ktk-payment-element-title">Complete your payment</h2>
            </div>
          </header>
          <form className="ktk-payment-element__form" onSubmit={submitPayment}>
            {(
              !contactIsComplete(contact)
              || loading
              || paymentLoading
              || submitting
              || (paymentSession && paymentInputKey !== checkoutInputKey)
            ) && (
              <p className="ktk-payment-element__loading" role="status">
                {!contactIsComplete(contact)
                  ? 'Complete your contact information to continue.'
                  : paymentSession && paymentInputKey !== checkoutInputKey
                    ? 'Updating your secure payment total...'
                    : 'Loading secure payment...'}
              </p>
            )}
            <div className="ktk-payment-element__mount" ref={paymentMountRef} />
            {paymentError && (
              <div className="ktk-payment-element__error" role="alert">
                <p>{paymentError}</p>
                {(!stripeElementsRef.current || paymentInputKey !== checkoutInputKey) && (
                  <button type="button" onClick={retryPaymentForm}>Try again</button>
                )}
              </div>
            )}
            {paymentSession && (
              <button
                className="ktk-commerce__primary"
                type="submit"
                disabled={
                  paymentLoading
                  || paymentSubmitting
                  || submitting
                  || paymentInputKey !== checkoutInputKey
                  || !stripeElementsRef.current
                }
              >
                {paymentSubmitting
                  ? 'Processing payment...'
                  : paymentInputKey !== checkoutInputKey
                    ? 'Updating total...'
                  : `Pay ${money.format(paymentSession.quote?.total ?? quote?.total ?? 0)}`}
                <svg
                  className="ktk-commerce__payment-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect x="2.5" y="5" width="19" height="14" rx="2" />
                  <path d="M3 9.5h18" />
                  <path d="M6.5 15h4" />
                </svg>
              </button>
            )}
          </form>
      </section>
    </main>
  );
}

function successGroupLabel(item) {
  const participants = item.options?.participants;
  if (!participants) return `${item.quantity} ${item.quantity === 1 ? 'guest' : 'guests'}`;
  const men = Number(participants.men) || 0;
  const women = Number(participants.women) || 0;
  return `${men} ${men === 1 ? 'man' : 'men'} \u00b7 ${women} ${women === 1 ? 'woman' : 'women'}`;
}

function successAddonSelection(addon) {
  if (Array.isArray(addon.variants) && addon.variants.length > 0) {
    return addon.variants
      .map((variant) => `${variant.value} \u00d7 ${variant.quantity}`)
      .join(' \u00b7 ');
  }
  if (addon.value) return String(addon.value);
  return String(addon.quantity || 1);
}

function customerCountryLabel(countryCode) {
  if (!countryCode) return '';
  try {
    return `${regionNames.of(countryCode) || countryCode} (+${getCountryCallingCode(countryCode)})`;
  } catch {
    return countryCode;
  }
}

function CheckoutSuccess({ clearPurchaseStorage, navigate }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const confirmation = useMemo(loadCheckoutConfirmation, []);
  const preview = import.meta.env.DEV && query.get('preview') === '1';

  useEffect(() => {
    if (preview) {
      setOrder({
        publicId: 'KTK-PREVIEW-2026',
        status: 'confirmed',
        paymentStatus: 'paid',
        currency: 'PLN',
        subtotal: 240,
        addonTotal: 306,
        discountTotal: 0,
        total: 546,
        customer: {
          firstName: 'Pablo',
          lastName: 'Cabrera',
          email: 'pjcampoo@hotmail.com',
          countryCode: 'GT',
          phone: '+502791847981',
        },
        items: [
          {
            bookingId: 41001,
            productId: 28,
            productName: 'Pub Crawl',
            productSlug: 'pub-crawl-28',
            quantity: 2,
            experienceDate: '2026-08-11',
            experienceTime: '21:00',
            unitPrice: 120,
            baseTotal: 240,
            addonTotal: 306,
            total: 546,
            addons: [
              {
                addonId: 1,
                name: 'Cocktails',
                quantity: 1,
                value: null,
                variants: [],
                unitPrice: 30,
                total: 30,
              },
              {
                addonId: 2,
                name: 'T-Shirts',
                quantity: 4,
                value: null,
                variants: [
                  { value: 'S', quantity: 2 },
                  { value: 'M', quantity: 1 },
                  { value: 'L', quantity: 1 },
                ],
                unitPrice: 44,
                total: 176,
              },
              {
                addonId: 3,
                name: 'Photos',
                quantity: 1,
                value: '10',
                variants: [],
                unitPrice: 100,
                total: 100,
              },
            ],
            options: {
              participants: { men: 1, women: 1 },
            },
          },
        ],
        paidAt: '2026-08-11T19:01:00.000Z',
        createdAt: '2026-08-11T19:00:00.000Z',
      });
      return;
    }

    const publicId = confirmation?.publicId;
    const returnedPaymentIntentId = query.get('payment_intent');
    const paymentIntentId = returnedPaymentIntentId || confirmation?.paymentIntentId;
    const returnedSessionId = query.get('session_id');
    const sessionId = returnedSessionId || confirmation?.sessionId;
    if (!publicId || !confirmation?.confirmationToken) {
      setError('This confirmation is only available in the browser used to complete payment.');
      return;
    }

    if (
      (returnedPaymentIntentId && confirmation.paymentIntentId
        && returnedPaymentIntentId !== confirmation.paymentIntentId)
      || (returnedSessionId && confirmation.sessionId && returnedSessionId !== confirmation.sessionId)
    ) {
      setError('The payment confirmation does not match this browser session.');
      return;
    }

    if (query.size) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('order');
      cleanUrl.searchParams.delete('payment_intent');
      cleanUrl.searchParams.delete('payment_intent_client_secret');
      cleanUrl.searchParams.delete('redirect_status');
      cleanUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    }

    let cancelled = false;
    let pollTimer;
    const loadOrder = () => {
      const journeyEvents = pendingJourneyEvents();
      const clientContext = journeyClientContext();
      const request = paymentIntentId
        ? requestJson(`/orders/${encodeURIComponent(publicId)}/confirm`, {
          method: 'POST',
          body: {
            paymentIntentId,
            confirmationToken: confirmation.confirmationToken,
            journeyEvents,
            clientContext,
          },
        })
        : sessionId
          ? requestJson(`/orders/${encodeURIComponent(publicId)}/confirm`, {
            method: 'POST',
            body: {
              sessionId,
              confirmationToken: confirmation.confirmationToken,
              journeyEvents,
              clientContext,
            },
          })
          : requestJson(`/orders/${encodeURIComponent(publicId)}/confirm`, {
            method: 'POST',
            body: {
              confirmationToken: confirmation.confirmationToken,
              journeyEvents,
              clientContext,
            },
          });

      request
        .then((result) => {
          if (cancelled) return;
          acknowledgeJourneyEvents(result.journey?.acceptedEventIds);
          setOrder(result);
          const paid = result.paymentStatus === 'paid' || result.total === 0;
          if (paid) {
            reportGoogleAdsOrderComplete(result);
            clearPurchaseStorage();
          } else {
            pollTimer = window.setTimeout(loadOrder, 2000);
          }
        })
        .catch((requestError) => {
          if (cancelled) return;
          if (isOmniAvailabilityFailure(requestError)) {
            setError('');
            pollTimer = window.setTimeout(loadOrder, 3000);
            return;
          }
          setError(requestError.message);
        });
    };

    loadOrder();
    return () => {
      cancelled = true;
      window.clearTimeout(pollTimer);
    };
  }, [clearPurchaseStorage, confirmation, preview, query]);

  if (error) return <ErrorState message={error} retry={() => navigate('cart')} />;
  if (!order) return <Loading />;

  const paid = order.paymentStatus === 'paid' || order.total === 0;
  const customer = order.customer || {};
  const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  const country = customerCountryLabel(customer.countryCode);
  const singleBookingId = order.items.length === 1 ? order.items[0].bookingId : null;
  const referenceDisplay = singleBookingId ? String(singleBookingId) : order.publicId;

  return (
    <main className="ktk-commerce ktk-success">
      <header className="ktk-success__header">
        <p className="ktk-eyebrow">{paid ? 'Payment confirmed' : 'Payment pending'}</p>
        <h1>{paid ? 'Booking confirmed' : 'We are confirming your payment'}</h1>
        <p className="ktk-success__lead">
          {paid
            ? `Everything is set. A confirmation has been sent to ${customer.email || 'your email address'}.`
            : 'Keep this page open while we verify the payment with Stripe.'}
        </p>
        <div className={`ktk-success__reference${singleBookingId ? ' ktk-success__reference--booking' : ''}`}>
          <span>{singleBookingId ? 'Booking reference' : 'Order reference'}</span>
          <strong>{referenceDisplay}</strong>
        </div>
      </header>

      <div className="ktk-success__layout">
        <section className="ktk-success__booking" aria-labelledby="ktk-success-booking-title">
          <div className="ktk-success__section-heading">
            <p className="ktk-eyebrow">Your booking</p>
            <h2 id="ktk-success-booking-title">Experience details</h2>
          </div>

          {order.items.map((item, index) => (
            <article className="ktk-success__item" key={`${item.productId}-${item.experienceDate}`}>
              <header>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{item.productName}</h3>
                  <p>{successGroupLabel(item)}</p>
                  {order.items.length > 1 && item.bookingId && (
                    <p className="ktk-success__booking-id">
                      <span>OmniLodge booking ID</span>
                      <strong>{item.bookingId}</strong>
                    </p>
                  )}
                </div>
              </header>

              <dl className="ktk-success__item-meta">
                <div>
                  <dt>Date</dt>
                  <dd>{formatCartDate(item.experienceDate)}</dd>
                </div>
                <div>
                  <dt>Start time</dt>
                  <dd>{item.experienceTime || 'To be confirmed'}</dd>
                </div>
                <div>
                  <dt>Guests</dt>
                  <dd>{successGroupLabel(item)}</dd>
                </div>
              </dl>

              <div className="ktk-success__price-lines">
                <div>
                  <span>Experience {item.quantity > 1 ? `(${item.quantity} \u00d7 ${money.format(item.unitPrice)})` : ''}</span>
                  <strong>{money.format(item.baseTotal)}</strong>
                </div>
                {Array.isArray(item.addons) && item.addons.length > 0 && (
                  <div className="ktk-success__addons">
                    <h4>Add-ons</h4>
                    <ul>
                      {item.addons.map((addon) => (
                        <li key={`${addon.addonId}-${addon.value || addon.quantity}`}>
                          <span>
                            <i aria-hidden="true">{cartAddonEmoji(addon.name)}</i>
                            <span>
                              <strong>{addon.name}</strong>
                              <small>{successAddonSelection(addon)}</small>
                            </span>
                          </span>
                          <strong>{money.format(addon.total)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="ktk-success__item-total">
                  <span>Experience total</span>
                  <strong>{money.format(item.total)}</strong>
                </div>
              </div>
            </article>
          ))}
        </section>

        <aside className="ktk-success__sidebar">
          <section aria-labelledby="ktk-success-payment-title">
            <p className="ktk-eyebrow">Payment</p>
            <h2 id="ktk-success-payment-title">{paid ? 'Paid in full' : 'Order total'}</h2>
            <dl className="ktk-success__totals">
              <div><dt>Experiences</dt><dd>{money.format(order.subtotal)}</dd></div>
              <div><dt>Add-ons</dt><dd>{money.format(order.addonTotal)}</dd></div>
              {Number(order.discountTotal) > 0 && (
                <div><dt>Discount</dt><dd>-{money.format(order.discountTotal)}</dd></div>
              )}
              <div className="ktk-success__grand-total">
                <dt>{paid ? 'Total paid' : 'Total'}</dt>
                <dd>{money.format(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="ktk-success-customer-title">
            <p className="ktk-eyebrow">Booked for</p>
            <h2 id="ktk-success-customer-title">Customer details</h2>
            <dl className="ktk-success__customer">
              {customerName && <div><dt>Name</dt><dd>{customerName}</dd></div>}
              {customer.email && <div><dt>Email</dt><dd>{customer.email}</dd></div>}
              {customer.phone && <div><dt>Phone</dt><dd>{customer.phone}</dd></div>}
              {country && <div><dt>Country</dt><dd>{country}</dd></div>}
            </dl>
          </section>
        </aside>
      </div>

      <footer className="ktk-success__footer">
        <p>Keep your booking reference handy when you arrive.</p>
        <button className="ktk-commerce__primary" type="button" onClick={() => navigate('')}>
          Explore more experiences
        </button>
      </footer>
    </main>
  );
}

function App() {
  const { path, navigate } = useRoute();
  const [cart, setCart] = useState(loadCart);
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const lastWrittenCartRef = useRef(JSON.stringify(cart));
  const [cartNotice, setCartNotice] = useState(null);
  useEffect(() => {
    if (cartNotice && cartNotice.after !== cart) setCartNotice(null);
  }, [cart, cartNotice]);
  const [contact, setContact] = useState(loadContact);
  const [discountCodes, setDiscountCodes] = useState(loadDiscountCodes);
  const [preparedCart, setPreparedCart] = useState(null);
  const [cartSessionId, setCartSessionId] = useState(loadCartSessionId);
  const [ongoingCartPublicId, setOngoingCartPublicId] = useState(loadOngoingCartPublicId);
  const [browserInstanceId] = useState(loadBrowserInstanceId);
  const [pageInstanceId] = useState(createCartSessionId);
  const [preparedCartLoading, setPreparedCartLoading] = useState(
    () => Boolean(new URLSearchParams(window.location.search).get('shared')),
  );
  const [preparedCartError, setPreparedCartError] = useState('');
  const [recoveryCartLoading, setRecoveryCartLoading] = useState(
    () => Boolean(new URLSearchParams(window.location.search).get('recover')),
  );
  const [recoveryCartError, setRecoveryCartError] = useState('');
  const sharedCartPublicId = useMemo(
    () => new URLSearchParams(window.location.search).get('shared'),
    [path],
  );
  const recoveryCartPublicId = useMemo(
    () => new URLSearchParams(window.location.search).get('recover'),
    [path],
  );
  const recoveryTrackingToken = useMemo(
    () => new URLSearchParams(window.location.search).get('rt'),
    [path],
  );

  useEffect(() => {
    captureAttribution();
  }, []);

  useEffect(() => {
    initializeJourneyTracking({
      browserId: browserInstanceId,
      pageId: pageInstanceId,
      restUrl: config.restUrl,
      area: path === 'cart' || path === 'checkout' || path === 'checkout/success'
        ? path.replace('/', '_')
        : path ? 'product' : 'store',
      productSlug: path && !path.includes('/') ? path : '',
    });
  }, [browserInstanceId, pageInstanceId, path]);

  useEffect(() => {
    if (!sharedCartPublicId || !['cart', 'checkout'].includes(path)) {
      setPreparedCart(null);
      setPreparedCartError('');
      return undefined;
    }

    const controller = new AbortController();
    setPreparedCartLoading(true);
    setPreparedCartError('');
    Promise.all([
      getJson(`/saved-carts/${encodeURIComponent(sharedCartPublicId)}`, controller.signal),
      getJson('/products', controller.signal),
    ])
      .then(([savedPayload, catalogPayload]) => {
        const saved = savedPayload.preparedCart;
        const products = catalogPayload.products || [];
        const productsById = new Map(products.map((product) => [Number(product.id), product]));
        const hydrated = (saved.cart?.items || []).map((item, index) => {
          const product = productsById.get(Number(item.productId));
          if (!product) throw new Error('A product in this prepared cart is no longer available.');
          return clampCartItemAddons({
            ...item,
            key: `prepared-${saved.publicId}-${index}`,
            productId: product.id,
            productName: product.name,
            productSlug: product.slug,
            product,
            cartItemNumber: Number(item.cartItemNumber) || index + 1,
          });
        });
        setCart(hydrated);
        setDiscountCodes(singleDiscountCode(saved.cart?.discountCodes || saved.cart?.discountCode));
        if (saved.customer) {
          setContact((current) => normalizeContactPhone({
            ...current,
            ...Object.fromEntries(
              Object.entries(saved.customer).filter(([, value]) => String(value || '').trim()),
            ),
          }));
        }
        setPreparedCart(saved);
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          if (
            isOmniAvailabilityFailure(requestError)
            && redirectToLegacyStore(loadCart().map((item) => item.productSlug))
          ) return;
          setPreparedCartError(requestError.message);
        }
      })
      .finally(() => setPreparedCartLoading(false));
    return () => controller.abort();
  }, [path, setCart, setContact, setDiscountCodes, sharedCartPublicId]);

  useEffect(() => {
    if (!recoveryCartPublicId || sharedCartPublicId || !['cart', 'checkout'].includes(path)) {
      setRecoveryCartError('');
      setRecoveryCartLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setRecoveryCartLoading(true);
    setRecoveryCartError('');
    const recoveryQuery = recoveryTrackingToken
      ? `?rt=${encodeURIComponent(recoveryTrackingToken)}`
      : '';
    Promise.all([
      getJson(`/ongoing-carts/${encodeURIComponent(recoveryCartPublicId)}${recoveryQuery}`, controller.signal),
      getJson('/products', controller.signal),
    ])
      .then(([recoveryPayload, catalogPayload]) => {
        const recovered = recoveryPayload.ongoingCart;
        const products = catalogPayload.products || [];
        const productsById = new Map(products.map((product) => [Number(product.id), product]));
        const hydrated = (recovered.cart?.items || []).map((item, index) => {
          const product = productsById.get(Number(item.productId));
          if (!product) throw new Error('A product in this cart is no longer available.');
          return clampCartItemAddons({
            ...item,
            key: `recovered-${recovered.publicId}-${index}`,
            productId: product.id,
            productName: product.name,
            productSlug: product.slug,
            product,
            cartItemNumber: Number(item.cartItemNumber) || index + 1,
          });
        });
        setCart(normalizeCartExperiences(hydrated));
        setDiscountCodes(singleDiscountCode(recovered.cart?.discountCodes || recovered.cart?.discountCode));
        setContact(normalizeContactPhone({ ...EMPTY_CONTACT, ...recovered.customer }));
        setCartSessionId(recovered.sessionId);
        setOngoingCartPublicId(recovered.publicId);
        window.localStorage.setItem(CART_SESSION_STORAGE_KEY, recovered.sessionId);
        window.localStorage.setItem(ONGOING_CART_STORAGE_KEY, recovered.publicId);
        if (recovered.cartVersion) window.localStorage.setItem('ktk-storefront-cart-version-v1', JSON.stringify({ publicId: recovered.publicId, cartVersion: recovered.cartVersion }));
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          if (
            isOmniAvailabilityFailure(requestError)
            && redirectToLegacyStore(loadCart().map((item) => item.productSlug))
          ) return;
          setRecoveryCartError(requestError.message);
        }
      })
      .finally(() => setRecoveryCartLoading(false));
    return () => controller.abort();
  }, [path, recoveryCartPublicId, recoveryTrackingToken, sharedCartPublicId]);

  useEffect(() => {
    if (cart.length > 0) {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    lastWrittenCartRef.current = JSON.stringify(cart);
    } else {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [cart]);

  useEffect(() => {
    if (discountCodes.length > 0) {
      window.localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(discountCodes));
    } else {
      window.localStorage.removeItem(DISCOUNT_STORAGE_KEY);
    }
  }, [discountCodes]);

  useEffect(() => {
    if (Object.values(contact).some((value) => String(value || '').trim())) {
      window.localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(contact));
    } else {
      window.localStorage.removeItem(CONTACT_STORAGE_KEY);
    }
  }, [contact]);

  const updateCartItem = (selection, editingKey = null) => {
    const stored = loadCart();
    const before = JSON.stringify(stored) !== lastWrittenCartRef.current ? stored : cartRef.current;
    if (editingKey && !before.some(item => item.key === editingKey)) {
      cartRef.current = before;
      setCart(before);
      setCartNotice({ after: before, message: 'Your cart changed in another tab. The latest selections are shown.' });
      return;
    }
    const result = upsertCartExperience(before, clampCartItemAddons({
      ...selection,
      key: selection.key || `${selection.productId}-${createCartSessionId()}`,
      cartItemNumber: nextCartItemNumber(before),
    }), editingKey);
    const nextItem = cartItemJourneySnapshot(result.item, result.index + 1);
    trackJourney(result.previous ? 'cart_item_updated' : 'add_to_cart', {
      ...nextItem,
      ...(result.previous ? {
        previousItem: cartItemJourneySnapshot(result.previous, result.index + 1),
        newItem: nextItem,
      } : {}),
      cartItemCountBefore: before.length,
      cartItemCountAfter: result.items.length,
    });
    cartRef.current = result.items;
    setCart(result.items);
    setCartNotice(result.previous ? { before, after: result.items } : null);
  };

  const undoCartUpdate = () => {
    if (!cartNotice?.before || cartRef.current !== cartNotice.after) return;
    const stored = loadCart();
    if (JSON.stringify(stored) !== JSON.stringify(cartNotice.after)) {
      cartRef.current = stored;
      setCart(stored);
      setCartNotice({ after: stored, message: 'Your cart changed in another tab. The latest selections are shown.' });
      return;
    }
    const before = cartRef.current;
    cartRef.current = cartNotice.before;
    setCart(cartNotice.before);
    setCartNotice(null);
    trackJourney('cart_item_updated', {
      message: 'Customer undid the previous booking update.',
      cartItemCountBefore: before.length,
      cartItemCountAfter: cartNotice.before.length,
    });
  };

  const clearPurchaseStorage = useCallback(() => {
    setCart([]);
    setCartNotice(null);
    setDiscountCodes([]);
    window.localStorage.removeItem(CART_STORAGE_KEY);
    window.localStorage.removeItem(DISCOUNT_STORAGE_KEY);
    window.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
    window.localStorage.removeItem(CART_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(ONGOING_CART_STORAGE_KEY);
    window.localStorage.removeItem('ktk-storefront-cart-version-v1');
    setOngoingCartPublicId('');
    clearJourneyAfterPurchase();
    const nextSessionId = createCartSessionId();
    setCartSessionId(nextSessionId);
    window.localStorage.setItem(CART_SESSION_STORAGE_KEY, nextSessionId);
    ATTRIBUTION_KEYS.forEach((key) => window.localStorage.removeItem(`trk_${key}`));
  }, []);

  let content;
  if (preparedCartLoading || recoveryCartLoading) {
    content = <Loading />;
  } else if (preparedCartError || recoveryCartError) {
    content = <ErrorState message={preparedCartError || recoveryCartError} retry={() => window.location.reload()} />;
  } else if (path === 'cart') {
    content = (
      <Cart
        cart={cart}
        setCart={setCart}
        updateCartItem={updateCartItem}
        cartNotice={cartNotice}
        undoCartUpdate={undoCartUpdate}
        contact={contact}
        setContact={setContact}
        discountCodes={discountCodes}
        setDiscountCodes={setDiscountCodes}
        preparedCart={preparedCart}
        cartSessionId={cartSessionId}
        setCartSessionId={setCartSessionId}
        ongoingCartPublicId={ongoingCartPublicId}
        setOngoingCartPublicId={setOngoingCartPublicId}
        browserInstanceId={browserInstanceId}
        pageInstanceId={pageInstanceId}
        navigate={navigate}
      />
    );
  } else if (path === 'checkout') {
    content = (
      <Cart
        cart={cart}
        setCart={setCart}
        updateCartItem={updateCartItem}
        cartNotice={cartNotice}
        undoCartUpdate={undoCartUpdate}
        contact={contact}
        setContact={setContact}
        discountCodes={discountCodes}
        setDiscountCodes={setDiscountCodes}
        preparedCart={preparedCart}
        cartSessionId={cartSessionId}
        setCartSessionId={setCartSessionId}
        ongoingCartPublicId={ongoingCartPublicId}
        setOngoingCartPublicId={setOngoingCartPublicId}
        browserInstanceId={browserInstanceId}
        pageInstanceId={pageInstanceId}
        navigate={navigate}
      />
    );
  } else if (path === 'checkout/success') {
    content = (
      <CheckoutSuccess clearPurchaseStorage={clearPurchaseStorage} navigate={navigate} />
    );
  } else if (path) {
    content = (
      <ProductDetail
        slug={path}
        navigate={navigate}
        addToCart={updateCartItem}
        cart={cart}
        contact={contact}
        setContact={setContact}
      />
    );
  } else {
    content = <Catalog navigate={navigate} />;
  }

  return (
    <Shell cartCount={cart.reduce((total, item) => total + item.quantity, 0)} navigate={navigate}>
      {content}
    </Shell>
  );
}

createRoot(document.getElementById('ktk-storefront-root')).render(<App />);
