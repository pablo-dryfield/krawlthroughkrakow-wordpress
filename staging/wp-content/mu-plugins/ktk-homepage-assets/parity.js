(() => {
  'use strict';
  function initialize() {
    if (window.__ktkHomepageParityInitialized) return;
    window.__ktkHomepageParityInitialized = true;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = matchMedia('(max-width: 980px)');
    const compactMenu = matchMedia('(max-width: 1599px)');
    const userAgent = navigator.userAgent;
    const iPad = /iPad/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const mobileDevice = iPad || /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    document.body.classList.remove('chrome', 'safari', 'osx', 'et_mobile_device', 'et_mobile_device_not_ipad');
    if (/Chrome|Chromium|CriOS/.test(userAgent)) document.body.classList.add('chrome');
    else if (/Safari/.test(userAgent)) document.body.classList.add('safari');
    if (/Mac/.test(navigator.platform)) document.body.classList.add('osx');
    document.body.classList.toggle('et_mobile_device', mobileDevice);
    document.body.classList.toggle('et_mobile_device_not_ipad', mobileDevice && !iPad);
    const closest = (target, selector) => target instanceof Element ? target.closest(selector) : null;
    const plainClick = event => event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
    const query = new URLSearchParams(location.search);
    const attribution = {};
    for (const key of keys) {
      let value = query.get(key);
      try {
        if (value) localStorage.setItem(`trk_${key}`, value);
        else value = localStorage.getItem(`trk_${key}`);
      } catch (_) { /* Landing attribution also works with storage blocked. */ }
      if (value) attribution[key] = value;
    }
    function attributedHref(href) {
      try {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin || !/^\/(?:staging\/)?store2?(?:\/|$)/.test(url.pathname)) return href;
        for (const [key, value] of Object.entries(attribution)) {
          if (!url.searchParams.has(key)) url.searchParams.set(key, value);
        }
        return url.href;
      } catch (_) { return href; }
    }
    function bookingEvent(element, href) {
      if (window.KTK_ANALYTICS_CONSENT !== true) return;
      try {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin || !/^\/(?:staging\/)?store2(?:\/|$)/.test(url.pathname)) return;
        const productPath = url.pathname.replace(/^\/staging(?=\/)/, '').replace(/\/$/, '');
        const inferredProductId = { '/store2/pub-crawl-28': 28, '/store2/nye-pub-crawl-32': 32, '/store2/halloween-pub-crawl-51': 51 }[productPath];
        let productId = inferredProductId;
        if (element.hasAttribute('data-product-id')) {
          const explicitId = element.dataset.productId;
          if (!/^[1-9]\d*$/.test(explicitId || '') || !Number.isSafeInteger(Number(explicitId))) return;
          productId = Number(explicitId);
          if (inferredProductId && productId !== inferredProductId) return;
        }
        if (!productId || (!element.hasAttribute('data-book') && !inferredProductId)) return;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'ktk_homepage_booking_click', product_id: productId,
          cta_position: element.dataset.book || (element.closest('#main-header') ? 'header' : element.id === 'ktk-cta' ? 'floating' : 'content')
        });
      } catch (_) { /* Non-URL links do not represent a booking handoff. */ }
    }
    document.querySelectorAll('a[href]').forEach(anchor => { anchor.href = attributedHref(anchor.href); });
    document.addEventListener('click', event => {
      const anchor = closest(event.target, 'a[href]');
      if (!anchor) return;
      anchor.href = attributedHref(anchor.href);
      bookingEvent(anchor, anchor.href);
    }, true);

    const hero = document.querySelector('#ktk-seasonal-hero');
    const floatingBooking = document.querySelector('#ktk-cta');
    if (hero && floatingBooking) {
      const protectedContent = [...hero.querySelectorAll('.ktk-hero-panel--nye .ktk-hero-times, .ktk-hero-reviews')];
      let floatingUpdatePending = false;
      const updateFloatingBooking = () => {
        floatingUpdatePending = false;
        floatingBooking.style.removeProperty('top');
        floatingBooking.style.removeProperty('font-size');
        let tab = floatingBooking.getBoundingClientRect();
        const regions = protectedContent
          .filter(element => hero.clientWidth <= (element.classList.contains('ktk-hero-reviews') ? 1099 : 599))
          .map(element => Object.assign(element.getBoundingClientRect(), { timing: element.classList.contains('ktk-hero-times') }))
          .filter(rect => rect.bottom > 0 && rect.top < innerHeight && rect.right > tab.left && rect.left < tab.right);
        const overlaps = (top, blocked) => blocked.some(rect => top < rect.bottom + 8 && top + tab.height > rect.top - 8);
        if (!overlaps(tab.top, regions)) return;
        // Keep the tab visible on the right, shifting only when it would cover text.
        const freePositions = blocked => [8, innerHeight - tab.height - 8, ...blocked.flatMap(rect => [rect.top - tab.height - 8, rect.bottom + 8])]
          .filter(top => top >= 8 && top + tab.height <= innerHeight - 8 && !overlaps(top, blocked))
          .sort((a, b) => Math.abs(a - tab.top) - Math.abs(b - tab.top));
        let positions = freePositions(regions);
        // At high zoom there may not be space for both regions; prioritize departure times.
        const timingRegions = regions.filter(rect => rect.timing);
        if (!positions.length && timingRegions.length) positions = freePositions(timingRegions);
        if (!positions.length && timingRegions.length) {
          floatingBooking.style.fontSize = '24px';
          tab = floatingBooking.getBoundingClientRect();
          positions = freePositions(timingRegions);
        }
        if (positions.length) floatingBooking.style.top = `${25 + (positions[0] - tab.top) / innerHeight * 100}%`;
      };
      const scheduleFloatingBooking = () => {
        if (floatingUpdatePending) return;
        floatingUpdatePending = true;
        requestAnimationFrame(updateFloatingBooking);
      };
      window.addEventListener('scroll', scheduleFloatingBooking, { passive: true });
      window.addEventListener('resize', scheduleFloatingBooking, { passive: true });
      if ('ResizeObserver' in window) new ResizeObserver(scheduleFloatingBooking).observe(hero);
      document.fonts?.ready.then(scheduleFloatingBooking);
      scheduleFloatingBooking();
    }

    // Most Divi clickable modules are exported as real anchors; retain nested-link fallbacks.
    document.querySelectorAll('[data-parity-href]').forEach(element => {
      if (element.matches('a[href]')) return;
      element.setAttribute('role', 'link');
      element.tabIndex = 0;
      function activate(event) {
        if (closest(event.target, 'a, button, input, select, textarea')) return;
        if (event.type === 'keydown' && event.key !== 'Enter') return;
        if (event.type === 'click' && event.button !== 0) return;
        event.preventDefault();
        const href = attributedHref(element.dataset.parityHref);
        bookingEvent(element, href);
        if (element.dataset.parityTarget === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey) window.open(href, '_blank', 'noopener');
        else location.assign(href);
      }
      element.addEventListener('click', activate);
      element.addEventListener('keydown', activate);
    });

    const mobileNav = document.querySelector('#et_mobile_nav_menu .mobile_nav');
    const toggle = mobileNav?.querySelector('.mobile_menu_bar');
    const menu = mobileNav?.querySelector('#mobile_menu');
    if (toggle && menu) {
      toggle.setAttribute('role', 'button');
      toggle.tabIndex = 0;
      toggle.setAttribute('aria-controls', menu.id);
      function setMobileOpen(open, restoreFocus = false) {
        mobileNav.classList.toggle('opened', open);
        mobileNav.classList.toggle('closed', !open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menu.style.display = open ? 'block' : 'none';
        if (restoreFocus) toggle.focus({ preventScroll: true });
      }
      setMobileOpen(false);
      document.documentElement.classList.add('ktk-parity-menu-ready');
      toggle.addEventListener('click', () => setMobileOpen(toggle.getAttribute('aria-expanded') !== 'true'));
      toggle.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle.click(); }
        if (event.key === 'ArrowDown') {
          event.preventDefault(); setMobileOpen(true); menu.querySelector('a[href]')?.focus();
        }
      });
      menu.addEventListener('click', event => { if (closest(event.target, 'a[href]')) setMobileOpen(false); });
      document.addEventListener('click', event => { if (!mobileNav.contains(event.target)) setMobileOpen(false); });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
          event.preventDefault(); setMobileOpen(false, true);
        }
      });
      mobileNav.addEventListener('focusout', () => requestAnimationFrame(() => {
        if (!mobileNav.contains(document.activeElement)) setMobileOpen(false);
      }));
      compactMenu.addEventListener('change', () => setMobileOpen(false));
    }

    document.querySelectorAll('#top-menu li').forEach(item => {
      const trigger = item.querySelector(':scope > a');
      const submenu = item.querySelector(':scope > ul');
      if (!trigger || !submenu) return;
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      if (!trigger.hasAttribute('href')) { trigger.setAttribute('role', 'button'); trigger.tabIndex = 0; }
      function setOpen(open) {
        item.classList.toggle('et-touch-hover', open);
        trigger.setAttribute('aria-expanded', String(open));
      }
      item.addEventListener('mouseenter', () => setOpen(true));
      item.addEventListener('mouseleave', () => { if (!item.contains(document.activeElement)) setOpen(false); });
      item.addEventListener('focusin', () => setOpen(true));
      item.addEventListener('focusout', () => requestAnimationFrame(() => {
        if (!item.contains(document.activeElement)) setOpen(false);
      }));
      item.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); trigger.focus(); setOpen(false); }
        if (event.target === trigger && event.key === 'ArrowDown') {
          event.preventDefault(); setOpen(true); submenu.querySelector('a[href]')?.focus();
        }
        if (event.target === trigger && !trigger.hasAttribute('href') && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault(); setOpen(true); submenu.querySelector('a[href]')?.focus();
        }
      });
      let touchOpened = false;
      trigger.addEventListener('pointerdown', event => {
        touchOpened = event.pointerType === 'touch' && trigger.getAttribute('aria-expanded') !== 'true';
      });
      trigger.addEventListener('click', event => {
        if (touchOpened || !trigger.hasAttribute('href')) { event.preventDefault(); setOpen(true); }
        touchOpened = false;
      });
      document.addEventListener('pointerdown', event => { if (!item.contains(event.target)) setOpen(false); });
    });

    const reserve = document.querySelector('.et_pb_text_1.et_pb_sticky_module');
    if (reserve) {
      const originalStyle = reserve.getAttribute('style');
      const column = reserve.closest('.et_pb_column');
      const builder = reserve.closest('.et_builder_inner_content');
      let placeholder;
      let natural = { top: 0, left: 0, width: 200, height: 40, padding: '8px 0px 0px' };
      let pending = false;
      function updateReserve() {
        pending = false;
        const active = scrollY >= natural.top - 300;
        if (active && !placeholder) {
          placeholder = reserve.cloneNode(true);
          placeholder.classList.add('et_pb_sticky_placeholder');
          placeholder.setAttribute('aria-hidden', 'true');
          placeholder.inert = true;
          placeholder.removeAttribute('id');
          placeholder.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
          placeholder.querySelectorAll('a, button, [tabindex]').forEach(element => { element.tabIndex = -1; });
          reserve.after(placeholder);
          reserve.classList.add('et_pb_sticky', 'et_pb_sticky--top');
          column?.classList.add('has_et_pb_sticky');
          builder?.classList.add('has_et_pb_sticky');
          reserve.style.setProperty('position', 'fixed', 'important');
          reserve.style.setProperty('padding', natural.padding, 'important');
          reserve.style.setProperty('margin-left', '0px', 'important');
          reserve.style.zIndex = '10000';
          reserve.style.marginTop = '0px';
          reserve.style.bottom = 'auto';
        } else if (!active && placeholder) {
          reserve.classList.remove('et_pb_sticky', 'et_pb_sticky--top');
          column?.classList.remove('has_et_pb_sticky');
          builder?.classList.remove('has_et_pb_sticky');
          if (originalStyle === null) reserve.removeAttribute('style');
          else reserve.setAttribute('style', originalStyle);
          placeholder.remove();
          placeholder = null;
        }
        if (active) {
          reserve.style.width = `${natural.width}px`;
          reserve.style.left = `${natural.left}px`;
          reserve.style.top = `${Math.min(300, document.body.getBoundingClientRect().bottom - natural.height)}px`;
        }
      }
      function scheduleReserve() {
        if (!pending) { pending = true; requestAnimationFrame(updateReserve); }
      }
      function measureReserve() {
        const source = placeholder || reserve;
        const transform = source.style.getPropertyValue('transform');
        const priority = source.style.getPropertyPriority('transform');
        // Divi's threshold uses the unrotated box; the visible 90-degree tab starts 80px above it.
        source.style.setProperty('transform', 'none', 'important');
        const box = source.getBoundingClientRect();
        natural = { top: box.top + scrollY, left: box.left, width: box.width, height: box.height, padding: getComputedStyle(source).padding };
        if (transform) source.style.setProperty('transform', transform, priority);
        else source.style.removeProperty('transform');
        scheduleReserve();
      }
      addEventListener('scroll', scheduleReserve, { passive: true });
      addEventListener('resize', measureReserve, { passive: true });
      addEventListener('load', measureReserve, { once: true });
      if ('ResizeObserver' in window) new ResizeObserver(measureReserve).observe(document.body);
      document.fonts?.ready.then(measureReserve);
      measureReserve();
    }

    let lightboxOpen = false;
    const refreshAutoplay = [];
    function setLightboxOpen(open) {
      lightboxOpen = open;
      document.documentElement.classList.toggle('ktk-parity-lightbox-open', open);
      refreshAutoplay.forEach(refresh => refresh());
    }
    const create = (tag, className, parent) => {
      const element = document.createElement(tag);
      element.className = className;
      parent?.append(element);
      return element;
    };
    function control(element, label, action) {
      element.setAttribute('aria-label', label);
      if (element.tagName === 'A') {
        element.href = '#'; element.setAttribute('role', 'button');
        element.addEventListener('keydown', event => {
          if (event.key === ' ') { event.preventDefault(); element.click(); }
        });
      } else element.type = 'button';
      element.addEventListener('click', event => { event.preventDefault(); action(); });
    }
    function hydrateImage(image) {
      if (!image) return;
      if (image.dataset.lazySrcset) image.srcset = image.dataset.lazySrcset;
      if (image.dataset.lazySizes) image.sizes = image.dataset.lazySizes;
      if (image.dataset.lazySrc) image.src = image.dataset.lazySrc;
    }
    document.querySelectorAll('.et_pb_gallery_fullwidth').forEach(gallery => {
      const slides = [...gallery.querySelectorAll('.et_pb_gallery_item')];
      if (slides.length < 2) return;
      gallery.setAttribute('role', 'region');
      gallery.setAttribute('aria-roledescription', 'carousel');
      gallery.setAttribute('aria-label', gallery.getAttribute('aria-label') || 'Pub crawl photos');
      let selected = 0;
      let timer;
      let hovering = false;
      let inView = !('IntersectionObserver' in window);
      let userPaused = false;
      const delay = Math.max(1000, Number(gallery.className.match(/et_slider_speed_(\d+)/)?.[1]) || 3500);
      const automatic = gallery.classList.contains('et_slider_auto');
      const arrows = gallery.querySelector('.et-pb-slider-arrows') || create('div', 'et-pb-slider-arrows', gallery);
      const previous = arrows.querySelector('.et-pb-arrow-prev') || create('a', 'et-pb-arrow-prev', arrows);
      const next = arrows.querySelector('.et-pb-arrow-next') || create('a', 'et-pb-arrow-next', arrows);
      const controllers = gallery.querySelector('.et-pb-controllers') || create('div', 'et-pb-controllers', gallery);
      const dots = slides.map((slide, index) => controllers.children[index] || create('a', '', controllers));
      const pause = automatic ? create('button', 'ktk-parity-gallery-pause', gallery) : null;
      function warmAdjacentPhotos() {
        for (const index of [selected, (selected + 1) % slides.length, (selected + slides.length - 1) % slides.length]) {
          const image = slides[index].querySelector('img');
          if (!image) continue;
          hydrateImage(image);
          image.loading = 'eager';
          image.fetchPriority = index === selected ? 'auto' : 'low';
        }
      }
      function refresh() {
        clearTimeout(timer);
        if (automatic && !userPaused && !motion.matches && inView && !hovering && !gallery.contains(document.activeElement) && !document.hidden && !lightboxOpen) {
          timer = setTimeout(() => show(selected + 1), delay);
        }
      }
      function show(index) {
        selected = (index + slides.length) % slides.length;
        slides.forEach((slide, position) => {
          const active = position === selected;
          slide.style.display = active ? 'block' : 'none';
          slide.style.opacity = active ? '1' : '0';
          slide.classList.toggle('et-pb-active-slide', active);
          slide.classList.remove('et-pb-moved-slide', 'et-pb-moved-slide-forward', 'et-pb-moved-slide-backward');
          slide.setAttribute('aria-hidden', String(!active));
          slide.setAttribute('role', 'group');
          slide.setAttribute('aria-roledescription', 'slide');
          slide.setAttribute('aria-label', `${position + 1} of ${slides.length}`);
          dots[position].classList.toggle('et-pb-active-control', active);
          dots[position].setAttribute('aria-current', String(active));
          if (active) hydrateImage(slide.querySelector('img'));
        });
        if (inView) warmAdjacentPhotos();
        refresh();
      }
      control(previous, 'Previous photo', () => show(selected - 1));
      control(next, 'Next photo', () => show(selected + 1));
      dots.forEach((dot, index) => {
        dot.textContent = String(index + 1);
        control(dot, `Show photo ${index + 1}`, () => show(index));
      });
      if (pause) {
        pause.textContent = 'Pause slideshow';
        control(pause, 'Pause slideshow', () => {
          userPaused = !userPaused;
          pause.textContent = userPaused ? 'Play slideshow' : 'Pause slideshow';
          pause.setAttribute('aria-label', pause.textContent);
          pause.setAttribute('aria-pressed', String(userPaused));
          refresh();
        });
        pause.setAttribute('aria-pressed', 'false');
      }
      gallery.addEventListener('mouseenter', () => { hovering = true; refresh(); });
      gallery.addEventListener('mouseleave', () => { hovering = false; refresh(); });
      gallery.addEventListener('focusin', refresh);
      gallery.addEventListener('focusout', () => requestAnimationFrame(refresh));
      document.addEventListener('visibilitychange', refresh);
      motion.addEventListener('change', refresh);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => { inView = entries[0].isIntersecting; if (inView) warmAdjacentPhotos(); refresh(); }).observe(gallery);
      }
      refreshAutoplay.push(refresh);
      show(0);
    });

    // Native dialog supplies modal focus containment; original Magnific styles retain the appearance.
    if ('HTMLDialogElement' in window) {
      const groups = [...document.querySelectorAll('.et_pb_gallery')].map(gallery => [...gallery.querySelectorAll('.et_pb_gallery_image a[href]')]);
      document.querySelectorAll('a.et_pb_lightbox_image[href]').forEach(anchor => groups.push([anchor]));
      const photos = groups.flat();
      if (photos.length) {
        const dialog = create('dialog', 'ktk-parity-lightbox mfp-wrap mfp-gallery mfp-auto-cursor mfp-image-holder', document.body);
        dialog.setAttribute('aria-label', 'Photo gallery');
        const container = create('div', 'mfp-container', dialog);
        const content = create('div', 'mfp-content', container);
        const figure = create('div', 'mfp-figure', content);
        const close = create('button', 'mfp-close', figure);
        close.textContent = '\u00d7';
        const image = create('img', 'mfp-img', figure);
        const bottom = create('div', 'mfp-bottom-bar', figure);
        const title = create('div', 'mfp-title', bottom);
        const counter = create('div', 'mfp-counter', bottom);
        const previous = create('button', 'mfp-arrow mfp-arrow-left', container);
        const next = create('button', 'mfp-arrow mfp-arrow-right', container);
        let group = [];
        let selected = 0;
        let opener;
        function show(index) {
          selected = (index + group.length) % group.length;
          const anchor = group[selected];
          image.alt = anchor.querySelector('img')?.alt || '';
          image.src = anchor.href;
          title.textContent = anchor.title || '';
          counter.textContent = `${selected + 1} of ${group.length}`;
          previous.hidden = next.hidden = group.length < 2;
        }
        groups.forEach(items => items.forEach((anchor, index) => anchor.addEventListener('click', event => {
          if (!plainClick(event)) return;
          event.preventDefault();
          opener = anchor; group = items; show(index);
          dialog.showModal(); setLightboxOpen(true); close.focus({ preventScroll: true });
        })));
        control(close, 'Close photo gallery', () => dialog.close());
        control(previous, 'Previous photo', () => show(selected - 1));
        control(next, 'Next photo', () => show(selected + 1));
        dialog.addEventListener('keydown', event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault(); show(selected + (event.key === 'ArrowLeft' ? -1 : 1));
          }
        });
        dialog.addEventListener('click', event => { if (event.target === dialog || event.target === container) dialog.close(); });
        dialog.addEventListener('close', () => { setLightboxOpen(false); opener?.focus({ preventScroll: true }); });
      }
    }

    const waypoints = [...document.querySelectorAll('.et-waypoint')];
    if ('IntersectionObserver' in window && !motion.matches) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('et-animated'); observer.unobserve(entry.target); }
      }));
      waypoints.forEach(element => observer.observe(element));
    } else waypoints.forEach(element => element.classList.add('et-animated'));

    // Production's seven motion targets share middle triggers on every breakpoint.
    // Divi quantizes scrolling to 15px and measures untransformed document offsets.
    const motionTargets = [...document.querySelectorAll('.et_pb_image_3, .et_pb_image_4, .et_pb_image_5, .et_pb_image_6, .et_pb_image_7, .et_pb_image_8, .et_pb_column_27')]
      .map(element => ({ element, image: element.classList.contains('et_pb_image'), middle: 0 }));
    if (motionTargets.length) {
      let pending = false;
      function updateMotion() {
        pending = false;
        const viewport = document.documentElement.clientHeight || innerHeight;
        const scroll = Math.round(scrollY / 15) * 15;
        motionTargets.forEach(target => {
          const progress = Math.max(0, Math.min(100, 100 - 100 * (target.middle - scroll) / viewport));
          if (motion.matches) {
            target.element.style.opacity = '1';
            if (target.image) target.element.style.transform = 'none';
          } else if (mobile.matches) {
            // Live phone/tablet production has completed these effects before content enters view.
            // Keep that visible state, rather than reproduce Divi's stale pre-lazy-load offsets.
            target.element.style.opacity = '1';
            if (target.image) target.element.style.transform = 'translateY(0px) scale3d(0.9, 0.9, 0.9)';
          } else if (target.image) {
            const entry = Math.min(1, progress / 30);
            const scale = progress <= 50 ? 0.8 + 0.2 * progress / 50 : 1 - 0.1 * (progress - 50) / 50;
            target.element.style.opacity = (0.3 + 0.7 * entry).toFixed(3);
            target.element.style.transform = `translateY(${Math.round(100 * (1 - entry))}px) scale3d(${scale.toFixed(3)}, ${scale.toFixed(3)}, ${scale.toFixed(3)})`;
          } else target.element.style.opacity = Math.min(1, progress / 35).toFixed(3);
        });
      }
      function scheduleMotion() {
        if (!pending) { pending = true; requestAnimationFrame(updateMotion); }
      }
      function measureMotion() {
        motionTargets.forEach(target => {
          let top = 0;
          for (let node = target.element; node; node = node.offsetParent) top += node.offsetTop;
          target.middle = top + Math.round(target.element.offsetHeight / 2);
        });
        scheduleMotion();
      }
      addEventListener('scroll', scheduleMotion, { passive: true });
      addEventListener('resize', measureMotion, { passive: true });
      addEventListener('load', measureMotion, { once: true });
      motion.addEventListener('change', scheduleMotion);
      if ('ResizeObserver' in window) new ResizeObserver(measureMotion).observe(document.body);
      document.fonts?.ready.then(measureMotion);
      measureMotion();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
