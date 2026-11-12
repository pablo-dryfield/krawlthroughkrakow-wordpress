import { createJourneyQueue, journeyEnvironment } from '../staging/wp-content/plugins/ktk-storefront/frontend/src/journey-queue.js';

function initialize() {
  if (window.__ktkHomepageJourney || !document.querySelector('#page-container')) return;
  window.__ktkHomepageJourney = true;
  const queue = createJourneyQueue();
  const pageId = queue.createId();
  const types = ['homepage_viewed', 'homepage_button_clicked'];
  let viewed = false;
  let hadConsent = false;
  const baseDetails = () => ({
    pagePath: location.pathname,
    environment: journeyEnvironment(location.pathname),
    campaign: document.querySelector('.ktk-hero-panel--nye') ? 'nye' : 'halloween',
  });
  const view = () => {
    if (window.KTK_ANALYTICS_CONSENT !== true || viewed) return;
    viewed = true;
    queue.record('homepage_viewed', baseDetails(), pageId);
  };
  const consentChanged = () => {
    if (window.KTK_ANALYTICS_CONSENT === true) { hadConsent = true; view(); }
    else if (hadConsent) {
      hadConsent = false;
      viewed = false;
      queue.removeTypes(types);
    }
  };
  const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const destination = value => {
    if (!value) return null;
    try {
      const url = new URL(value, location.href);
      if (url.protocol === 'mailto:') return 'contact:email';
      if (url.protocol === 'tel:') return 'contact:telephone';
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      const hash = /^#[a-z\d_-]{1,60}$/i.test(url.hash) ? url.hash : '';
      return `${url.origin === location.origin ? '' : url.origin}${url.pathname}${hash}`.slice(0, 240);
    } catch { return null; }
  };
  const describe = element => {
    let placement = 'Homepage content';
    let placementId = 'content';
    const section = element.closest('.et_pb_section');
    if (element.id === 'ktk-cta') { placement = 'Floating booking button'; placementId = 'floating'; }
    else if (element.closest('#main-header')) {
      placementId = element.closest('#mobile_menu') ? 'mobile-menu' : 'header';
      placement = placementId === 'mobile-menu' ? 'Mobile menu' : 'Header';
    } else if (element.closest('.ktk-hero-reviews')) { placement = 'Hero reviews'; placementId = 'hero-reviews'; }
    else if (element.closest('.ktk-hero-panel')) {
      const panel = element.closest('.ktk-hero-panel');
      placementId = panel.classList.contains('ktk-hero-panel--regular') ? 'hero-regular'
        : panel.classList.contains('ktk-hero-panel--nye') ? 'hero-nye' : 'hero-halloween';
      placement = { 'hero-regular': 'Hero: regular pub crawl', 'hero-nye': 'Hero: New Year\'s Eve', 'hero-halloween': 'Hero: Halloweekend' }[placementId];
    } else if (element.closest('#main-footer')) { placement = 'Footer'; placementId = 'footer'; }
    else if (element.closest('.ktk-parity-lightbox')) { placement = 'Photo gallery'; placementId = 'gallery'; }
    else if (section) {
      placementId = [...section.classList].find(value => /^et_pb_section_\d+$/.test(value)) || 'content';
      placement = cleanText(section.querySelector('h1,h2,h3')?.textContent) || placementId;
    }
    const scope = element.closest('#main-header, #main-footer, .ktk-hero-panel, .ktk-hero-reviews, .et_pb_section, .ktk-parity-lightbox') || document;
    const index = [...scope.querySelectorAll('a,button,[role="button"],[data-parity-href]')].indexOf(element) + 1;
    const target = destination(element.getAttribute('href') || element.dataset.parityHref);
    const label = target === 'contact:email' ? 'Email contact' : target === 'contact:telephone' ? 'Telephone contact'
      : cleanText(element.getAttribute('aria-label') || element.textContent || element.querySelector('img')?.alt || element.title || 'Homepage control');
    return {
      ...baseDetails(),
      buttonId: element.dataset.book ? `hero-${element.dataset.book.replace(/^hero-/, '')}`
        : element.id || `${placementId}-${element.closest('li[id]')?.id || `control-${index}`}`,
      buttonLabel: label,
      placement,
      destination: target,
    };
  };
  const clicked = event => {
    if (window.KTK_ANALYTICS_CONSENT !== true || !(event.target instanceof Element)) return;
    if (event.type === 'auxclick' && event.button !== 1) return;
    const element = event.target.closest('a,button,[role="button"],[data-parity-href]');
    if (!element || (!element.closest('#page-container, .ktk-parity-lightbox') && element.id !== 'ktk-cta')) return;
    if (element.closest('form') || element.matches('[disabled],[aria-disabled="true"]')) return;
    if (event.type === 'keydown' && (event.key !== 'Enter' || !element.hasAttribute('data-parity-href') || element.matches('button,a[href]'))) return;
    if (event.type === 'auxclick' && !element.matches('a[href]')) return;
    view();
    queue.record('homepage_button_clicked', describe(element), pageId);
  };
  document.addEventListener('click', clicked, true);
  document.addEventListener('auxclick', clicked, true);
  document.addEventListener('keydown', clicked, true);
  window.addEventListener('ktk:analytics-consent', consentChanged);
  window.addEventListener('pageshow', event => { if (event.persisted) { viewed = false; consentChanged(); } });
  consentChanged();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
