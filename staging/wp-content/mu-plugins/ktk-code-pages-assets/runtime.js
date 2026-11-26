(() => {
  'use strict';
  if (window.__ktkCodePageInitialized) return;
  window.__ktkCodePageInitialized = true;
  const userAgent = navigator.userAgent;
  const iPad = /iPad/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const mobileDevice = iPad || /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  if (/Chrome|Chromium|CriOS/.test(userAgent)) document.body.classList.add('chrome');
  else if (/Safari/.test(userAgent)) document.body.classList.add('safari');
  if (/Mac/.test(navigator.platform)) document.body.classList.add('osx');
  if (/Linux/.test(navigator.platform)) document.body.classList.add('linux');
  document.body.classList.toggle('et_mobile_device', mobileDevice);
  document.body.classList.toggle('et_mobile_device_not_ipad', mobileDevice && !iPad);
  const closest = (target, selector) => target instanceof Element ? target.closest(selector) : null;
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
  const query = new URLSearchParams(location.search);
  const attribution = {};
  for (const key of keys) {
    let value = query.get(key);
    try {
      if (value) localStorage.setItem(`trk_${key}`, value);
      else value = localStorage.getItem(`trk_${key}`);
    } catch (_) { /* Keep landing parameters usable with storage unavailable. */ }
    if (value) attribution[key] = value;
  }
  function attributedHref(href) {
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin || !/^\/(?:staging\/)?store2?(?:\/|$)/.test(url.pathname)) return href;
      for (const [key, value] of Object.entries(attribution)) if (!url.searchParams.has(key)) url.searchParams.set(key, value);
      return url.href;
    } catch (_) { return href; }
  }
  document.querySelectorAll('a[href]').forEach(anchor => { anchor.href = attributedHref(anchor.href); });
  document.addEventListener('click', event => {
    const anchor = closest(event.target, 'a[href]');
    if (!anchor) return;
    anchor.href = attributedHref(anchor.href);
    if (window.KTK_ANALYTICS_CONSENT !== true) return;
    const url = new URL(anchor.href, location.href);
    const products = { 'pub-crawl-28': 28, 'nye-pub-crawl-32': 32, 'halloween-pub-crawl-51': 51, 'go-karting-30': 30, 'polish-vodka-tasting-44': 44, 'food-tour-krakow-48': 48, 'shooting-range-34': 34 };
    const slug = url.pathname.replace(/^\/(?:staging\/)?store2\//, '').replace(/\/$/, '');
    const productId = Object.prototype.hasOwnProperty.call(products, slug) ? products[slug] : null;
    if (url.origin !== location.origin || !productId) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'ktk_page_booking_click', page: document.body.dataset.ktkPage || 'how-to-join', product_id: productId,
      cta_position: anchor.closest('#main-header') ? 'header' : anchor.id === 'ktk-cta' ? 'floating' : 'content' });
  }, true);

  const mobileNav = document.querySelector('#et_mobile_nav_menu .mobile_nav');
  const toggle = mobileNav?.querySelector('.mobile_menu_bar');
  const menu = mobileNav?.querySelector('#mobile_menu');
  function setMobileOpen(open, restoreFocus = false) {
    if (!toggle || !menu) return;
    mobileNav.classList.toggle('opened', open);
    mobileNav.classList.toggle('closed', !open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.style.display = open ? 'block' : 'none';
    if (restoreFocus) toggle.focus({ preventScroll: true });
  }
  if (toggle && menu) {
    toggle.setAttribute('role', 'button'); toggle.tabIndex = 0;
    toggle.setAttribute('aria-controls', menu.id);
    setMobileOpen(false);
    toggle.addEventListener('click', () => setMobileOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    toggle.addEventListener('keydown', event => {
      if (['Enter', ' '].includes(event.key)) { event.preventDefault(); toggle.click(); }
      if (event.key === 'ArrowDown') { event.preventDefault(); setMobileOpen(true); menu.querySelector('a[href]')?.focus(); }
    });
    menu.addEventListener('click', event => { if (closest(event.target, 'a[href]')) setMobileOpen(false); });
    document.addEventListener('click', event => { if (!mobileNav.contains(event.target)) setMobileOpen(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { event.preventDefault(); setMobileOpen(false, true); } });
    mobileNav.addEventListener('focusout', () => requestAnimationFrame(() => { if (!mobileNav.contains(document.activeElement)) setMobileOpen(false); }));
    matchMedia('(max-width: 1379px)').addEventListener('change', () => setMobileOpen(false));
  }
  document.querySelectorAll('#top-menu li').forEach(item => {
    const trigger = item.querySelector(':scope > a');
    const submenu = item.querySelector(':scope > ul');
    if (!trigger || !submenu) return;
    trigger.setAttribute('aria-haspopup', 'true'); trigger.setAttribute('aria-expanded', 'false');
    if (!trigger.hasAttribute('href')) { trigger.setAttribute('role', 'button'); trigger.tabIndex = 0; }
    const setOpen = open => { item.classList.toggle('et-touch-hover', open); trigger.setAttribute('aria-expanded', String(open)); };
    item.addEventListener('mouseenter', () => setOpen(true));
    item.addEventListener('mouseleave', () => { if (!item.contains(document.activeElement)) setOpen(false); });
    item.addEventListener('focusin', () => setOpen(true));
    item.addEventListener('focusout', () => requestAnimationFrame(() => { if (!item.contains(document.activeElement)) setOpen(false); }));
    item.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); trigger.focus(); setOpen(false); }
      if (event.target === trigger && (event.key === 'ArrowDown' || (!trigger.hasAttribute('href') && ['Enter', ' '].includes(event.key)))) {
        event.preventDefault(); setOpen(true); submenu.querySelector('a[href]')?.focus();
      }
    });
    let touchOpened = false;
    trigger.addEventListener('pointerdown', event => { touchOpened = event.pointerType === 'touch' && trigger.getAttribute('aria-expanded') !== 'true'; });
    trigger.addEventListener('click', event => { if (touchOpened || !trigger.hasAttribute('href')) { event.preventDefault(); setOpen(true); } touchOpened = false; });
    document.addEventListener('pointerdown', event => { if (!item.contains(event.target)) setOpen(false); });
  });

  let shapoResizer;
  const resizingFrames = new WeakSet();
  function prepareShapo(frame) {
    if (frame.iFrameResizer || resizingFrames.has(frame)) return;
    resizingFrames.add(frame);
    shapoResizer ||= new Promise((resolve,reject) => {
      if (typeof window.iFrameResize === 'function') { resolve(); return; }
      const script=document.createElement('script');
      script.src='https://cdn.shapo.io/js/shapoIframeResizer.min.js';script.id='ktk-shapo-resizer';script.async=true;
      script.onload=resolve;script.onerror=reject;document.head.append(script);
    });
    shapoResizer.then(()=>{
      if (frame.getAttribute('src') === 'about:blank') return;
      if (typeof window.iFrameResize === 'function') window.iFrameResize({checkOrigin:['https://app.shapo.io'],heightCalculationMethod:'documentElementOffset'},frame);
    }).catch(()=>{}).finally(()=>resizingFrames.delete(frame));
  }
  // Keep embed geometry but withhold vendor requests until purpose 3 is granted.
  function updateMaps() {
    let granted = false;
    try { granted = window._iub?.cs?.api?.getPreferences?.()?.purposes?.[3] === true; } catch (_) { /* No consent API means no external maps. */ }
    document.querySelectorAll('iframe[data-ktk-map-src],iframe[data-ktk-embed-src]').forEach(frame => {
      if (frame.classList.contains('ktk-shapo-widget')) {
        const url=new URL(frame.dataset.ktkEmbedSrc);
        url.searchParams.set('url',btoa(location.origin+location.pathname));frame.dataset.ktkEmbedSrc=url.href;
        frame.classList.toggle('ktk-embed-ready',granted);
        if (!granted && frame.iFrameResizer) { frame.iFrameResizer.removeListeners?.(); delete frame.iFrameResizer; }
      }
      const src = granted ? (frame.dataset.ktkMapSrc || frame.dataset.ktkEmbedSrc) : 'about:blank';
      if (frame.getAttribute('src') !== src) frame.src = src;
      if (granted && frame.classList.contains('ktk-shapo-widget')) prepareShapo(frame);
    });
  }
  window.addEventListener('iubenda_consent_given_purpose_3', updateMaps);
  window.addEventListener('iubenda_consent_rejected', updateMaps);
  window.addEventListener('iubenda_consent_updated', updateMaps);
  setInterval(updateMaps, 1000);
  updateMaps();
})();

(() => {
  'use strict';
  if (window.__ktkCodeComponentsInitialized) return;
  window.__ktkCodeComponentsInitialized = true;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const closest = (target, selector) => target instanceof Element ? target.closest(selector) : null;
  const plainClick = e => e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
  const create = (tag, className, parent) => { const e = document.createElement(tag); e.className = className; parent?.append(e); return e; };
  const control = (element, label, action) => {
    element.setAttribute('aria-label', label); element.setAttribute('role', 'button');
    if (element.tagName === 'A') element.href = '#'; else element.type = 'button';
    element.addEventListener('click', e => { e.preventDefault(); action(); });
    element.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); element.click(); } });
  };

  document.querySelectorAll('[data-parity-href]').forEach(e => {
    e.setAttribute('role', 'link'); e.tabIndex = 0;
    if (!e.textContent.trim() && !e.hasAttribute('aria-label')) {
      const target = new URL(e.dataset.parityHref, location.href);
      e.setAttribute('aria-label', 'Visit ' + target.hostname);
    }
    const activate = event => {
      if (closest(event.target, 'a,button,input,textarea,select')) return;
      if (event.type === 'keydown' && event.key !== 'Enter') return;
      if (event.type === 'click' && event.button !== 0) return;
      event.preventDefault();
      const anchor = document.createElement('a'); anchor.href = e.dataset.parityHref; anchor.target = e.dataset.parityTarget || '_self';
      document.body.append(anchor); anchor.click(); anchor.remove();
    };
    e.addEventListener('click', activate); e.addEventListener('keydown', activate);
  });

  document.querySelectorAll('.et_pb_toggle').forEach((toggle,index) => {
    const title = toggle.querySelector('.et_pb_toggle_title'), content = toggle.querySelector('.et_pb_toggle_content');
    if (!title || !content) return;
    const button=create('button','ktk-toggle-button');button.type='button';
    button.append(...title.childNodes);title.append(button);
    if (!button.textContent.trim() && content.querySelector('form')) button.setAttribute('aria-label','Toggle contact form');
    title.removeAttribute('role');title.removeAttribute('tabindex');
    if(!content.id)content.id=`ktk-toggle-panel-${index}`;
    button.setAttribute('aria-controls',content.id);
    const setOpen = open => { toggle.classList.toggle('et_pb_toggle_open', open); toggle.classList.toggle('et_pb_toggle_close', !open); button.setAttribute('aria-expanded', String(open)); content.style.display = open ? 'block' : 'none'; };
    setOpen(toggle.classList.contains('et_pb_toggle_open'));
    const activate = () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      if (open) toggle.closest('.et_pb_accordion')?.querySelectorAll('.et_pb_toggle').forEach(other => { if (other !== toggle) { other.classList.remove('et_pb_toggle_open'); other.classList.add('et_pb_toggle_close'); other.querySelector('.ktk-toggle-button')?.setAttribute('aria-expanded', 'false'); const box = other.querySelector('.et_pb_toggle_content'); if (box) box.style.display = 'none'; } });
      setOpen(open);
    };
    title.addEventListener('click', activate);
  });

  document.querySelectorAll('.et_pb_salvattore_content[data-columns]').forEach(grid => {
    const cards = [...grid.querySelectorAll('article.et_pb_post')].sort((a,b) => Number(a.className.match(/et_pb_blog_item_\d+_(\d+)/)?.[1] || 0) - Number(b.className.match(/et_pb_blog_item_\d+_(\d+)/)?.[1] || 0));
    let columns = 0;
    const layout = () => {
      const count = Number(getComputedStyle(grid, '::before').content.match(/(\d+)\s+\.column/)?.[1]) || (innerWidth <= 767 ? 1 : innerWidth <= 980 ? 2 : 3);
      if (count === columns) return; columns = count;
      const wrappers = Array.from({length:count}, () => create('div', `column size-1of${count}`));
      cards.forEach((card,index) => wrappers[index % count].append(card)); grid.replaceChildren(...wrappers);
    };
    layout(); addEventListener('resize', layout, {passive:true});
  });

  let lightboxOpen = false;
  const refreshAutoplay = [];
  document.querySelectorAll('.et_pb_gallery_fullwidth,.et_pb_slider').forEach((root,index) => {
    const gallery = root.classList.contains('et_pb_gallery_fullwidth');
    const slides = [...root.querySelectorAll(gallery ? '.et_pb_gallery_item' : ':scope > .et_pb_slides > .et_pb_slide')];
    const containers = slides.map(slide => slide.querySelector('.et_pb_container')).filter(Boolean);
    if (containers.some(box => box.classList.contains('et_pb_empty_slide'))) root.querySelectorAll('img').forEach(image => image.loading = 'eager');
    const fit = () => {
      if (!containers.length) return;
      let height = 0;
      for (const slide of slides) {
        const box = slide.querySelector('.et_pb_container'); if (!box) continue;
        const previous = slide.style.cssText;
        slide.style.display = 'block'; slide.style.position = 'absolute'; slide.style.visibility = 'hidden'; slide.style.width = '100%';
        box.style.height = 'auto';
        const style = getComputedStyle(slide);
        height = Math.max(height, slide.getBoundingClientRect().height - parseFloat(style.borderTopWidth || 0) - parseFloat(style.borderBottomWidth || 0));
        slide.style.cssText = previous;
      }
      containers.forEach(box => box.style.height = `${height}px`);
      slides.forEach(slide => {
        if (getComputedStyle(slide).display === 'none' || !slide.classList.contains('et_pb_media_alignment_center')) return;
        const image = slide.querySelector('.et_pb_slide_image');
        if (image) image.style.marginTop = `${-image.getBoundingClientRect().height / 2}px`;
      });
    };
    fit(); document.fonts.ready.then(fit); addEventListener('resize', fit, {passive:true});
    root.querySelectorAll('img').forEach(image => image.addEventListener('load', fit));
    if (slides.length < 2) return;
    root.setAttribute('role', 'region'); root.setAttribute('aria-roledescription', 'carousel'); root.setAttribute('aria-label', (gallery ? 'Photo gallery ' : 'Featured content ') + (index+1));
    let selected = 0, timer, hovering = false, userPaused = false, inView = !('IntersectionObserver' in window);
    const automatic = root.classList.contains('et_slider_auto');
    const delay = Math.max(1000, Number(root.className.match(/et_slider_speed_(\d+)/)?.[1]) || 7000);
    const arrows = root.querySelector('.et-pb-slider-arrows') || create('div', 'et-pb-slider-arrows', root);
    const previous = arrows.querySelector('.et-pb-arrow-prev') || create('a','et-pb-arrow-prev',arrows);
    const next = arrows.querySelector('.et-pb-arrow-next') || create('a','et-pb-arrow-next',arrows);
    const controllers = root.querySelector('.et-pb-controllers') || create('div','et-pb-controllers',root);
    const dots = slides.map((_,i) => controllers.children[i] || create('a','',controllers));
    function refresh() {
      clearTimeout(timer);
      if (automatic && !window.__KTK_FREEZE_CAROUSELS__ && !userPaused && !motion.matches && inView && !hovering && !root.contains(document.activeElement) && !document.hidden && !lightboxOpen) timer = setTimeout(() => show(selected + 1), delay);
    }
    function show(index) {
      selected = (index + slides.length) % slides.length;
      slides.forEach((slide,i) => { const active = i === selected; slide.style.display = active ? 'block' : 'none'; slide.style.opacity = active ? '1' : '0'; slide.classList.toggle('et-pb-active-slide',active); slide.classList.remove('et-pb-moved-slide','et-pb-moved-slide-forward','et-pb-moved-slide-backward'); slide.setAttribute('aria-hidden',String(!active)); dots[i].classList.toggle('et-pb-active-control',active); dots[i].setAttribute('aria-current',String(active)); });
      fit();
      refresh();
    }
    control(previous,'Previous slide',()=>show(selected-1)); control(next,'Next slide',()=>show(selected+1));
    dots.forEach((dot,i) => { dot.textContent=String(i+1); control(dot,`Show slide ${i+1}`,()=>show(i)); });
    if (automatic) { const pause=create('button','ktk-parity-gallery-pause',root); pause.textContent='Pause slideshow'; control(pause,'Pause slideshow',()=>{userPaused=!userPaused;pause.textContent=userPaused?'Play slideshow':'Pause slideshow';pause.setAttribute('aria-label',pause.textContent);pause.setAttribute('aria-pressed',String(userPaused));refresh();}); }
    root.addEventListener('mouseenter',()=>{hovering=true;refresh();}); root.addEventListener('mouseleave',()=>{hovering=false;refresh();}); root.addEventListener('focusin',refresh);root.addEventListener('focusout',()=>requestAnimationFrame(refresh));
    document.addEventListener('visibilitychange',refresh);motion.addEventListener('change',refresh);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;refresh();}).observe(root);
    refreshAutoplay.push(refresh); show(0);
  });

  document.querySelectorAll('.et_pb_gallery_grid').forEach(gallery => {
    const container=gallery.querySelector('.et_pb_gallery_items');
    const slides=[...gallery.querySelectorAll('.et_pb_gallery_item')];
    const perPage=Number(container?.getAttribute('data-per_page')) || Number(gallery.getAttribute('data-per_page')) || 12;
    const pagination=gallery.querySelector('.et_pb_gallery_pagination');
    if (!pagination || slides.length <= perPage) return;
    let page=0;
    const show=index=>{page=Math.max(0,Math.min(Math.ceil(slides.length/perPage)-1,index));slides.forEach((e,i)=>e.style.display=i>=page*perPage&&i<(page+1)*perPage?'block':'none');pagination.querySelectorAll('a').forEach(a=>a.classList.toggle('active',Number(a.dataset.page || a.textContent.trim())===page+1));};
    pagination.querySelectorAll('a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const value=Number(a.dataset.page || a.textContent.trim());if(value)show(value-1);else show(page+(/prev/i.test(a.className)?-1:1));})); show(0);
  });

  if ('HTMLDialogElement' in window) {
    const groups=[...document.querySelectorAll('.et_pb_gallery')].map(e=>[...e.querySelectorAll('.et_pb_gallery_image a[href]')]);
    document.querySelectorAll('a.et_pb_lightbox_image[href]').forEach(e=>groups.push([e]));
    if (groups.flat().length) {
      const dialog=create('dialog','ktk-parity-lightbox mfp-wrap mfp-gallery mfp-auto-cursor mfp-image-holder',document.body);dialog.setAttribute('aria-label','Photo gallery');
      const container=create('div','mfp-container',dialog),content=create('div','mfp-content',container),figure=create('div','mfp-figure',content),close=create('button','mfp-close',figure),image=create('img','mfp-img',figure),bottom=create('div','mfp-bottom-bar',figure),title=create('div','mfp-title',bottom),counter=create('div','mfp-counter',bottom),previous=create('button','mfp-arrow mfp-arrow-left',container),next=create('button','mfp-arrow mfp-arrow-right',container);
      close.textContent='\u00d7';let group=[],selected=0,opener;
      const show=index=>{selected=(index+group.length)%group.length;const a=group[selected];image.src=a.href;image.alt=a.querySelector('img')?.alt||'';title.textContent=a.title||'';counter.textContent=`${selected+1} of ${group.length}`;previous.hidden=next.hidden=group.length<2;};
      groups.forEach(items=>items.forEach((a,i)=>a.addEventListener('click',e=>{if(!plainClick(e))return;e.preventDefault();opener=a;group=items;show(i);dialog.showModal();lightboxOpen=true;document.documentElement.classList.add('ktk-parity-lightbox-open');refreshAutoplay.forEach(f=>f());close.focus();})));
      control(close,'Close photo gallery',()=>dialog.close());control(previous,'Previous photo',()=>show(selected-1));control(next,'Next photo',()=>show(selected+1));
      dialog.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();show(selected+(e.key==='ArrowLeft'?-1:1));}});
      dialog.addEventListener('click',e=>{if(e.target===dialog||e.target===container)dialog.close();});dialog.addEventListener('close',()=>{lightboxOpen=false;document.documentElement.classList.remove('ktk-parity-lightbox-open');refreshAutoplay.forEach(f=>f());opener?.focus({preventScroll:true});});
    }
  }

  document.querySelectorAll('.et_pb_video_overlay').forEach(overlay=>{
    overlay.setAttribute('role','button');overlay.setAttribute('aria-label','Play video');overlay.tabIndex=0;
    const play=()=>{let consent=false;try{consent=window._iub?.cs?.api?.getPreferences?.()?.purposes?.[3]===true;}catch(_){}const box=overlay.closest('.et_pb_video');const video=box?.querySelector('video');if(video){overlay.style.display='none';video.controls=true;video.play().catch(()=>{});}else if(consent){overlay.style.display='none';const frame=box?.querySelector('iframe[data-ktk-embed-src]');if(frame)frame.src=frame.dataset.ktkEmbedSrc;}else window._iub?.cs?.api?.openPreferences?.();};
    overlay.addEventListener('click',e=>{e.preventDefault();play();});overlay.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();play();}});
  });

  document.querySelectorAll('.et_pb_countdown_timer[data-end-timestamp]').forEach(timer=>{
    const end=Number(timer.dataset.endTimestamp)*1000;
    if(!Number.isFinite(end))return;
    const update=()=>{let remaining=Math.max(0,Math.floor((end-Date.now())/1000));for(const [unit,size]of[['days',86400],['hours',3600],['minutes',60],['seconds',1]]){const count=Math.floor(remaining/size);remaining%=size;const value=timer.querySelector(`.${unit} .value`);if(value)value.textContent=String(count).padStart(2,'0');}};
    update();const interval=setInterval(()=>{if(!timer.isConnected){clearInterval(interval);return;}update();},1000);
  });

  document.querySelectorAll('form[data-ktk-form]').forEach((form,formIndex)=>{
    const endpoint=document.body.dataset.ktkFormTokenUrl;
    let tokenReady=false,tokenTime=0,pendingToken=null;
    const refreshToken=()=>{
      if(pendingToken)return pendingToken;
      const url=new URL(endpoint,location.href);url.searchParams.set('action','ktk_pages_form_token');url.searchParams.set('route_key',form.dataset.routeKey);url.searchParams.set('form_index',form.dataset.formIndex);
      pendingToken=fetch(url,{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(result=>{
        if(!result.success||!result.data.requestId)throw new Error(result.data?.message||'Unable to prepare this form.');
        form.elements._ktk_nonce.value=result.data.nonce;form.elements._ktk_challenge.value=result.data.challenge.token;form.elements._ktk_request_id.value=result.data.requestId;
        const question=form.querySelector('.et_pb_contact_captcha_question');if(question)question.textContent=`${result.data.challenge.first} + ${result.data.challenge.second}`;
        tokenReady=true;tokenTime=Date.now();
      }).finally(()=>{pendingToken=null;});return pendingToken;
    };
    const honey=create('input','ktk-contact-honeypot',form);honey.type='text';honey.name='_ktk_website';honey.tabIndex=-1;honey.autocomplete='off';honey.setAttribute('aria-hidden','true');
    form.addEventListener('focusin',()=>{if(!tokenReady&&form.dataset.deliveryUnconfirmed!=='true')refreshToken().catch(()=>{});});
    const message=()=>form.closest('.et_pb_contact')?.querySelector('.et-pb-contact-message')||form.parentElement.querySelector('.wpcf7-response-output,.et-pb-contact-message')||create('div','et-pb-contact-message',form.parentElement);
    const output=message();
    // Keep one status region in the accessibility tree before any message arrives.
    // CF7's captured region is already outside the busy form; Divi needs one.
    const announcement=form.closest('.wpcf7')?.querySelector('.screen-reader-response [role="status"]')||create('div','ktk-form-status',form.parentElement);
    announcement.style.cssText='position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    announcement.setAttribute('role','status');announcement.setAttribute('aria-live','polite');announcement.setAttribute('aria-atomic','true');announcement.setAttribute('data-ktk-form-status','');
    // The visible response remains readable; only the persistent region announces it.
    output.setAttribute('aria-live','off');
    let announcementVersion=0;
    const announce=text=>{
      const version=++announcementVersion;announcement.textContent='';
      setTimeout(()=>{if(version===announcementVersion&&announcement.isConnected)announcement.textContent=text;},100);
    };
    const display=(text,success)=>{
      const state=success?'sent':'invalid';
      // Preserve captured feedback styling while the backend is entirely code-owned.
      if(form.classList.contains('wpcf7-form')){form.classList.remove('init','resetting','submitting','sent','invalid','unaccepted','spam','aborted','failed');form.classList.add(state);}
      output.textContent=text;output.setAttribute('aria-hidden','false');form.dataset.status=state;announce(text);
    };
    const unconfirmed=()=>`Delivery could not be confirmed. Please do not submit again; contact the team with this reference: ${form.elements._ktk_request_id.value}`;
    const nativeErrorMessage=control=>{
      const validity=control.validity;
      // Browser messages can quote entered values. Keep page text value-free.
      if(validity.badInput)return control.type==='number'?'Please enter a number.':'Please enter a valid value.';
      if(validity.valueMissing)return 'Please complete this field.';
      if(validity.typeMismatch)return control.type==='email'?'Please enter a valid email address.':control.type==='url'?'Please enter a valid web address.':'Please enter a valid value.';
      if(validity.patternMismatch)return 'Please use the requested format.';
      if(validity.tooShort)return `Please use at least ${control.minLength} characters.`;
      if(validity.tooLong)return `Please use no more than ${control.maxLength} characters.`;
      if(validity.rangeUnderflow)return `Please enter a value of ${control.min} or more.`;
      if(validity.rangeOverflow)return `Please enter a value of ${control.max} or less.`;
      if(validity.stepMismatch)return 'Please use the requested increments.';
      return 'Please check this field.';
    };
    const fieldErrors=errors=>{
      form.querySelectorAll('.ktk-form-field-error').forEach(hint=>{
        form.querySelectorAll('[aria-describedby]').forEach(control=>{
          const ids=control.getAttribute('aria-describedby').split(/\s+/).filter(id=>id&&id!==hint.id);
          if(ids.length)control.setAttribute('aria-describedby',ids.join(' '));else control.removeAttribute('aria-describedby');
        });hint.remove();
      });
      form.querySelectorAll('[data-ktk-field-invalid]').forEach(control=>{control.setAttribute('aria-invalid','false');control.removeAttribute('data-ktk-field-invalid');});
      let firstInvalid=null;
      for(const[index,error]of errors.entries()){
        const fields=[...form.elements].filter(control=>control.name===error.field),field=fields[0];
        const wrap=field?.closest('.et_pb_contact_field,.wpcf7-form-control-wrap')||field?.parentElement;if(!wrap)continue;
        const controls=field?.type==='hidden'?[...wrap.querySelectorAll('input:not([type="hidden"]),textarea,select')]:fields;
        if(!controls.length)continue;
        const hint=create('span','ktk-form-field-error',wrap);hint.id=`ktk-field-error-${formIndex}-${index}`;hint.textContent=error.message;
        if(error.native)hint.setAttribute('data-ktk-native-error','');
        for(const control of controls){const ids=new Set((control.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));ids.add(hint.id);control.setAttribute('aria-describedby',[...ids].join(' '));control.setAttribute('aria-invalid','true');control.setAttribute('data-ktk-field-invalid','');if(!firstInvalid&&control.getClientRects().length)firstInvalid=control;}
      }return firstInvalid;
    };
    let invalidCycle=false;
    form.addEventListener('invalid',()=>{
      if(invalidCycle||form.dataset.submitting==='true'||form.dataset.deliveryUnconfirmed==='true')return;
      invalidCycle=true;queueMicrotask(()=>{invalidCycle=false;});
      const errors=[...form.elements].filter(control=>control.name&&control.willValidate&&!control.validity.valid).map(control=>({field:control.name,message:nativeErrorMessage(control),native:true}));
      fieldErrors(errors);display('Please check the highlighted fields.',false);
    },true);
    const clearCorrectedError=event=>{
      const control=event.target;if(!control.hasAttribute?.('data-ktk-field-invalid'))return;
      if(!control.validity?.valid){
        const ids=(control.getAttribute('aria-describedby')||'').split(/\s+/);
        for(const hint of form.querySelectorAll('.ktk-form-field-error[data-ktk-native-error]'))if(ids.includes(hint.id))hint.textContent=nativeErrorMessage(control);
        return;
      }
      const wrap=control.closest('.et_pb_contact_field,.wpcf7-form-control-wrap'),proxy=wrap?.querySelector('.et_pb_checkbox_handle[data-required_mark="required"]');
      if(proxy&&![...wrap.querySelectorAll('input[type="checkbox"]')].some(option=>option.checked))return;
      const ids=(control.getAttribute('aria-describedby')||'').split(/\s+/);
      for(const hint of form.querySelectorAll('.ktk-form-field-error'))if(ids.includes(hint.id)){
        const remainingHints=new Set([...form.querySelectorAll('.ktk-form-field-error')].filter(other=>other!==hint).map(other=>other.id));
        for(const field of form.querySelectorAll('[data-ktk-field-invalid]')){
          const previous=(field.getAttribute('aria-describedby')||'').split(/\s+/);if(!previous.includes(hint.id))continue;
          const descriptions=previous.filter(id=>id&&id!==hint.id);
          if(descriptions.length)field.setAttribute('aria-describedby',descriptions.join(' '));else field.removeAttribute('aria-describedby');
          if(!descriptions.some(id=>remainingHints.has(id))){field.setAttribute('aria-invalid','false');field.removeAttribute('data-ktk-field-invalid');}
        }
        hint.remove();
      }
    };
    form.addEventListener('input',clearCorrectedError);form.addEventListener('change',clearCorrectedError);
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(form.dataset.submitting==='true')return;
      if(form.dataset.deliveryUnconfirmed==='true'){display(unconfirmed(),false);return;}
      form.querySelectorAll('.et_pb_checkbox_handle').forEach(hidden=>{hidden.value=JSON.stringify([...hidden.closest('.et_pb_contact_field').querySelectorAll('input[type="checkbox"]:checked')].map(e=>e.value));});
      if(!form.checkValidity()){form.reportValidity();return;}
      const requiredProxy=[...form.querySelectorAll('.et_pb_checkbox_handle[data-required_mark="required"]')].find(e=>!JSON.parse(e.value||'[]').length);
      if(requiredProxy){const invalid=fieldErrors([{field:requiredProxy.name,message:'Please select at least one option.'}]);display('Please complete all required fields.',false);invalid?.focus();return;}
      if(!tokenReady||Date.now()-tokenTime>20*60*1000){try{await refreshToken();display('Please check the form and arithmetic answer before sending.',false);}catch(error){display(error.message,false);}return;}
      const button=form.querySelector('[type="submit"]');form.dataset.submitting='true';form.setAttribute('aria-busy','true');if(button)button.disabled=true;
      announce('Sending your message. Please wait.');
      try{
        const response=await fetch(form.getAttribute('action'),{method:'POST',credentials:'same-origin',body:new FormData(form)});
        if(!/application\/json/i.test(response.headers.get('content-type')||''))throw Error('Unknown response');
        const result=await response.json(),success=result.success===true;
        const invalid=fieldErrors(!success&&result.data?.field?[{field:result.data.field,message:result.data.message}]:[]);
        if(!success&&result.data?.delivery_state==='unconfirmed')form.dataset.deliveryUnconfirmed='true';
        display(result.data?.message||'Unable to send your message.',success);invalid?.focus();
        if(success){form.reset();tokenReady=false;}else if(response.status===403){tokenReady=false;}
      }catch{form.dataset.deliveryUnconfirmed='true';display(unconfirmed(),false);}finally{form.dataset.submitting='false';form.removeAttribute('aria-busy');if(button)button.disabled=false;}
    });
  });
})();

/* BEGIN shared event promotion runtime */
(function initializeEventPromotions(){
 if(window.__KTK_EVENT_PROMOTIONS_INITIALIZED__)return;
 const roots=[...document.querySelectorAll('[data-ktk-event-promotion="nye"][data-ktk-promotion-ends]')];
 if(!roots.length)return;
 window.__KTK_EVENT_PROMOTIONS_INITIALIZED__=true;
 let timer;
 const select=(root,selector)=>[...(root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)];
 const refresh=()=>{
  clearTimeout(timer);let next=Infinity;
  for(const root of roots){
   const raw=root.dataset.ktkPromotionEnds;if(!/^\d{10}$/.test(raw||''))continue;
   const remaining=Number(raw)*1000-Date.now();
   if(remaining>0&&root.dataset.ktkPromotionState!=='expired'){next=Math.min(next,remaining,60000);continue;}
   if(root.dataset.ktkPromotionState==='expired'&&root.dataset.ktkPromotionApplied==='true')continue;
   for(const template of root.querySelectorAll('template[data-ktk-promotion-replaces]')){
    const selector=template.dataset.ktkPromotionReplaces;
    if(selector!=='.et_pb_countdown_timer')continue;
    const targets=root.querySelectorAll(selector);
    if(targets.length===1){
     const content=template.content.cloneNode(true),primary=content.querySelector('[data-ktk-promotion-primary]');
     if(primary){const heading=document.createElement('h1');for(const attribute of primary.attributes)heading.setAttribute(attribute.name,attribute.value);heading.append(...primary.childNodes);primary.replaceWith(heading);}
     targets[0].replaceWith(content);template.remove();
    }
   }
   for(const node of select(root,'[data-ktk-expired-text]'))node.textContent=node.dataset.ktkExpiredText;
   for(const node of select(root,'a[data-ktk-expired-href]')){
    let url;try{url=new URL(node.dataset.ktkExpiredHref,location.href);}catch{continue;}
    if(url.origin!==location.origin||!/^\/(?:staging\/)?new-years-eve\/$/.test(url.pathname)||url.search)continue;
    node.href=url.href;node.removeAttribute('data-product-id');
    if(node.dataset.ktkExpiredLabel)(node.querySelector('[data-ktk-promotion-label]')||node).textContent=node.dataset.ktkExpiredLabel;
    if(node.dataset.ktkExpiredAriaLabel)node.setAttribute('aria-label',node.dataset.ktkExpiredAriaLabel);
    if(node.dataset.book)node.dataset.book='nye-updates';
   }
   for(const node of root.querySelectorAll('[data-ktk-promotion-remove]'))node.remove();
   if(root.dataset.ktkExpiredDescription){
    const description=root.dataset.ktkExpiredDescription,headline=root.dataset.ktkExpiredHeadline;
    for(const meta of document.querySelectorAll('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]'))meta.content=description;
    for(const script of document.querySelectorAll('script[type="application/ld+json"][data-ktk-event-schema]')){
     try{const data=JSON.parse(script.textContent),entities=data['@graph']||[data];
      for(const entity of entities){
       if(entity['@type']==='WebPage'){entity.description=description;if(headline)entity.name=headline;}
       if(entity['@type']==='BreadcrumbList'&&headline)for(const item of entity.itemListElement||[])if(item.position===2)item.name=headline;
      }
      script.textContent=JSON.stringify(data);
     }catch(_){/* Preserve an unrecognized schema rather than inventing it. */}
    }
   }
   root.dataset.ktkPromotionState='expired';root.dataset.ktkPromotionApplied='true';
  }
  if(Number.isFinite(next))timer=setTimeout(refresh,Math.max(1,next));
 };
 refresh();
 addEventListener('pageshow',refresh);
 document.addEventListener('visibilitychange',refresh);
})();
/* END shared event promotion runtime */
