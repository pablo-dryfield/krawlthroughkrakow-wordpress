(() => {
  'use strict';
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
  const query = new URLSearchParams(location.search);
  const attribution = {};
  for (const key of keys) {
    let value = query.get(key);
    try {
      if (value) localStorage.setItem(`trk_${key}`, value);
      else value = localStorage.getItem(`trk_${key}`);
    } catch (_) { /* Current landing values still work when browser storage is unavailable. */ }
    if (value) attribution[key] = value;
  }
  const decorate = (anchor) => {
    if (!anchor?.href) return;
    try {
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || !/^\/(?:staging\/)?store2?(?:\/|$)/.test(url.pathname)) return;
      for (const [key, value] of Object.entries(attribution)) {
        if (!url.searchParams.has(key)) url.searchParams.set(key, value);
      }
      anchor.href = url.href;
    } catch (_) { /* Leave non-URL links unchanged. */ }
  };
  document.querySelectorAll('a[href]').forEach(decorate);
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest?.('a[href]');
    decorate(anchor);
    if (anchor?.dataset.book && window.KTK_ANALYTICS_CONSENT === true) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'ktk_homepage_booking_click', product_id: 28, cta_position: anchor.dataset.book });
    }
  }, true);

  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  const media = matchMedia('(max-width: 767px)');
  const sticky = document.querySelector('.mobile-booking');
  let heroVisible = true;
  let footerVisible = false;
  let lastSticky = false;
  function updateSticky() {
    const consentOpen = [...document.querySelectorAll('#iubenda-cs-banner, .iubenda-cs-container, #iubenda-iframe.iubenda-iframe-visible, [role="alertdialog"], [role="dialog"][aria-modal="true"]')]
      .some(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
    const focused = document.activeElement;
    const editing = focused && /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName);
    const visible = media.matches && !heroVisible && !footerVisible && !consentOpen && !editing && toggle?.getAttribute('aria-expanded') !== 'true';
    if (!sticky || lastSticky === visible) return;
    sticky.hidden = !visible;
    document.body.classList.toggle('has-sticky-booking', visible);
    lastSticky = visible;
  }
  function closeMenu(restoreFocus = false) {
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('menu-is-open');
    if (restoreFocus) toggle?.focus();
    updateSticky();
  }
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-is-open', open);
    if (open) nav?.querySelector('a')?.focus();
    updateSticky();
  });
  document.querySelector('.site-header')?.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!document.activeElement?.closest('.site-header')) closeMenu();
    });
  });
  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) closeMenu();
    requestAnimationFrame(updateSticky);
  });
  media.addEventListener('change', () => { closeMenu(); updateSticky(); });

  const gallery = document.querySelector('#gallery-dialog');
  const photos = [...document.querySelectorAll('a[data-gallery-item]')];
  if (gallery && typeof gallery.showModal === 'function') {
    let selected = 0;
    let opener;
    const photo = gallery.querySelector('.gallery-view img');
    const caption = gallery.querySelector('#gallery-caption');
    const counter = gallery.querySelector('.gallery-counter');
    function showPhoto(index) {
      selected = (index + photos.length) % photos.length;
      const anchor = photos[selected];
      const thumbnail = anchor.querySelector('img');
      photo.alt = thumbnail.alt;
      photo.width = Number(thumbnail.getAttribute('width'));
      photo.height = Number(thumbnail.getAttribute('height'));
      photo.src = anchor.href;
      caption.textContent = anchor.dataset.caption;
      counter.textContent = `${selected + 1} / ${photos.length}`;
    }
    photos.forEach((anchor, index) => anchor.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      opener = anchor;
      showPhoto(index);
      gallery.showModal();
      document.body.classList.add('gallery-is-open');
      gallery.querySelector('[data-gallery-close]').focus();
      updateSticky();
    }));
    gallery.querySelector('[data-gallery-close]').addEventListener('click', () => gallery.close());
    gallery.querySelector('[data-gallery-prev]').addEventListener('click', () => showPhoto(selected - 1));
    gallery.querySelector('[data-gallery-next]').addEventListener('click', () => showPhoto(selected + 1));
    gallery.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showPhoto(selected + (event.key === 'ArrowLeft' ? -1 : 1));
      }
      if (event.key === 'Tab') {
        const controls = [...gallery.querySelectorAll('button')];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    gallery.addEventListener('click', (event) => {
      const rect = gallery.getBoundingClientRect();
      if (event.target === gallery && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) gallery.close();
    });
    gallery.addEventListener('close', () => {
      document.body.classList.remove('gallery-is-open');
      opener?.focus({ preventScroll: true });
      updateSticky();
    });
  }
  window.addEventListener('ktk:analytics-consent', updateSticky);
  document.addEventListener('focusin', updateSticky);
  document.addEventListener('focusout', () => requestAnimationFrame(updateSticky));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target.id === 'footer') footerVisible = entry.isIntersecting;
        else heroVisible = entry.isIntersecting;
      }
      updateSticky();
    });
    observer.observe(document.querySelector('.hero'));
    observer.observe(document.querySelector('#footer'));
  }
  // Consent UI is injected asynchronously. Only its insertion/removal needs observation.
  const isConsentNode = (node) => node.nodeType === 1 && (
    node.getAttribute('id')?.startsWith('iubenda') || node.getAttribute('class')?.includes('iubenda')
    || node.matches('[role="dialog"][aria-modal="true"]') || node.querySelector('[id^="iubenda"]')
  );
  let pendingUpdate = false;
  new MutationObserver((records) => {
    if (!pendingUpdate && records.some(record => isConsentNode(record.target)
      || [...record.addedNodes, ...record.removedNodes].some(isConsentNode))) {
      pendingUpdate = true;
      requestAnimationFrame(() => { pendingUpdate = false; updateSticky(); });
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'aria-hidden'] });
})();
