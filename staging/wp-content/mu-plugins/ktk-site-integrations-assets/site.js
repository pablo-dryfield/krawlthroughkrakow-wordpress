(() => {
  'use strict';
  if (window.__ktkSiteHelpers) return;
  window.__ktkSiteHelpers = true;
  const config = window.KTK_SITE_INTEGRATIONS || {};
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
  const current = {};
  const decorated = new WeakMap();
  function capture() {
    const query = new URLSearchParams(location.search);
    for (const key of keys) {
      const incoming = query.get(key);
      try {
        if (incoming) localStorage.setItem(`trk_${key}`, incoming);
        const value = incoming || localStorage.getItem(`trk_${key}`);
        if (value) current[key] = value;
      } catch (_) {
        if (incoming) current[key] = incoming;
      }
    }
  }
  const isStore = path => /^\/(?:staging\/)?store2?(?:\/|$)/.test(path);
  function decorate(anchor) {
    try {
      const previous = decorated.get(anchor);
      const original = previous?.result === anchor.href ? previous.original : anchor.href;
      const url = new URL(original, location.href);
      if (url.origin !== location.origin || !isStore(url.pathname)) return;
      for (const key of keys) {
        let value = current[key];
        try { value = localStorage.getItem(`trk_${key}`) || value; } catch (_) { /* URL attribution still works without storage. */ }
        if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
      }
      anchor.href = url.href;
      decorated.set(anchor, {original, result: url.href});
    } catch (_) { /* Non-URL links are not booking destinations. */ }
  }
  function syncLocation() {
    capture();
    const cta = document.querySelector('[data-ktk-site-cta]');
    if (cta) {
      cta.hidden = isStore(location.pathname);
      const destination = /^\/(?:staging\/)?new-years-eve(?:\/|$)/.test(location.pathname) ? config.nyeBooking : config.regularBooking;
      if (typeof destination === 'string' && destination) cta.href = destination;
    }
    document.querySelectorAll('a[href]').forEach(decorate);
  }
  function initialize() {
    syncLocation();
    for (const eventName of ['click', 'pointerdown', 'auxclick', 'contextmenu']) {
      document.addEventListener(eventName, event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        const anchor = target?.closest('a[href]');
        if (anchor) decorate(anchor);
      }, true);
    }
    document.querySelectorAll('.et_mobile_nav_menu .mobile_menu_bar, #et_mobile_nav_menu .mobile_menu_bar, .et_pb_menu__toggle')
      .forEach(button => { button.style.touchAction = 'manipulation'; });
    document.querySelectorAll('.et_pb_countdown_timer .days .value').forEach(value => {
      const fix = () => {
        const text = value.textContent.trim();
        if (/^0\d{2}$/.test(text)) value.textContent = text.slice(1);
      };
      fix();
      new MutationObserver(fix).observe(value, {subtree: true, childList: true, characterData: true});
    });
    for (const method of ['pushState', 'replaceState']) {
      const original = history[method];
      history[method] = function (...args) {
        const result = original.apply(this, args);
        window.dispatchEvent(new Event('ktk:site-locationchange'));
        return result;
      };
    }
    for (const eventName of ['popstate', 'hashchange', 'ktk:site-locationchange']) window.addEventListener(eventName, syncLocation);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true});
  else initialize();
})();
