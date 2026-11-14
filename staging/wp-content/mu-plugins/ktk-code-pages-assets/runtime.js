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
    const products = { 'pub-crawl-28': 28, 'nye-pub-crawl-32': 32, 'halloween-pub-crawl-51': 51, 'go-karting-30': 30, 'polish-vodka-tasting-44': 44, 'food-tour-krakow-48': 48 };
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
    const cf7=form.dataset.ktkForm==='cf7',endpoint=document.body.dataset.ktkFormTokenUrl;
    let tokenReady=false,tokenTime=0,pendingToken=null;
    const refreshToken=()=>{
      if(cf7)return Promise.resolve();
      if(pendingToken)return pendingToken;
      const url=new URL(endpoint,location.href);url.searchParams.set('action','ktk_pages_form_token');url.searchParams.set('route_key',form.dataset.routeKey);url.searchParams.set('form_index',form.dataset.formIndex);
      pendingToken=fetch(url,{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(result=>{
        if(!result.success)throw new Error(result.data?.message||'Unable to prepare this form.');
        form.elements._ktk_nonce.value=result.data.nonce;form.elements._ktk_challenge.value=result.data.challenge.token;
        const question=form.querySelector('.et_pb_contact_captcha_question');if(question)question.textContent=`${result.data.challenge.first} + ${result.data.challenge.second}`;
        tokenReady=true;tokenTime=Date.now();
      }).finally(()=>{pendingToken=null;});return pendingToken;
    };
    if(!cf7){const honey=create('input','ktk-contact-honeypot',form);honey.type='text';honey.name='_ktk_website';honey.tabIndex=-1;honey.autocomplete='off';honey.setAttribute('aria-hidden','true');}
    form.addEventListener('focusin',()=>{if(!cf7&&!tokenReady)refreshToken().catch(()=>{});});
    form.querySelectorAll('.wpcf7-validates-as-required').forEach(e=>{if(e.matches('input,textarea,select'))e.required=true;});
    const message=()=>{if(cf7)return form.querySelector('.wpcf7-response-output');return form.closest('.et_pb_contact')?.querySelector('.et-pb-contact-message')||form.parentElement.querySelector('.et-pb-contact-message')||create('div','et-pb-contact-message',form.parentElement);};
    const display=(text,success,status)=>{
      const state=cf7?({mail_sent:'sent',validation_failed:'invalid',acceptance_missing:'unaccepted',spam:'spam',aborted:'aborted',mail_failed:'failed'}[status]||(success?'sent':'invalid')):(success?'sent':'invalid');
      if(cf7){form.classList.remove('init','resetting','submitting','sent','invalid','unaccepted','spam','aborted','failed');form.classList.add(state);}
      const output=message();if(output){output.textContent=text;output.setAttribute('aria-live','polite');output.setAttribute('aria-hidden','false');}form.dataset.status=state;
    };
    const fieldErrors=errors=>{
      form.querySelectorAll('.ktk-form-field-error').forEach(hint=>{
        form.querySelectorAll('[aria-describedby]').forEach(control=>{
          const ids=control.getAttribute('aria-describedby').split(/\s+/).filter(id=>id&&id!==hint.id);
          if(ids.length)control.setAttribute('aria-describedby',ids.join(' '));else control.removeAttribute('aria-describedby');
        });
        hint.remove();
      });
      form.querySelectorAll('.wpcf7-not-valid-tip').forEach(hint=>hint.remove());
      form.querySelectorAll('[data-ktk-field-invalid]').forEach(control=>{control.setAttribute('aria-invalid','false');control.removeAttribute('data-ktk-field-invalid');});
      let firstInvalid=null;
      for(const [index,error]of errors.entries()){
        const field=[...form.elements].find(control=>control.name===error.field);
        const wrap=cf7?form.querySelector(`[data-name="${CSS.escape(error.field)}"]`):field?.closest('.et_pb_contact_field')||field?.parentElement;
        if(!wrap)continue;
        const controls=cf7||field?.type==='hidden'?[...wrap.querySelectorAll('input:not([type="hidden"]),textarea,select')]:field?[field]:[];
        if(!controls.length)continue;
        const hint=create('span','ktk-form-field-error'+(cf7?' wpcf7-not-valid-tip':''),wrap);
        hint.id=`ktk-field-error-${formIndex}-${index}`;hint.textContent=error.message;
        for(const control of controls){
          const ids=new Set((control.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));ids.add(hint.id);
          control.setAttribute('aria-describedby',[...ids].join(' '));control.setAttribute('aria-invalid','true');control.setAttribute('data-ktk-field-invalid','');
          if(!firstInvalid&&control.getClientRects().length)firstInvalid=control;
        }
      }
      return firstInvalid;
    };
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(form.dataset.submitting==='true')return;
      form.querySelectorAll('.et_pb_checkbox_handle').forEach(hidden=>{hidden.value=[...hidden.closest('.et_pb_contact_field').querySelectorAll('input[type="checkbox"]:checked')].map(e=>e.value).join(', ');});
      if(!form.checkValidity()){form.reportValidity();return;}
      const requiredProxy=[...form.querySelectorAll('.et_pb_checkbox_handle[data-required_mark="required"]')].find(e=>!e.value);
      if(requiredProxy){const invalid=fieldErrors([{field:requiredProxy.name,message:'Please select at least one option.'}]);display('Please complete all required fields.',false);invalid?.focus();return;}
      if(!cf7&&(!tokenReady||Date.now()-tokenTime>20*60*1000)){try{await refreshToken();display('Please check the arithmetic answer and submit again.',false);}catch(error){display(error.message,false);}return;}
      const button=form.querySelector('[type="submit"]');form.dataset.submitting='true';form.setAttribute('aria-busy','true');if(button)button.disabled=true;
      if(cf7)form.classList.add('submitting');
      try{
        const response=await fetch(cf7?form.dataset.feedbackEndpoint:form.getAttribute('action'),{method:'POST',credentials:'same-origin',body:new FormData(form)});
        if(!/application\/json/i.test(response.headers.get('content-type')||''))throw new Error('Unable to send right now. Please try again.');
        const result=await response.json();const success=cf7?result.status==='mail_sent':result.success===true;
        const invalid=fieldErrors(cf7?(result.invalid_fields||[]):(!success&&result.data?.field?[{field:result.data.field,message:result.data.message}]:[]));
        display(cf7?result.message:result.data?.message||'Unable to send your message.',success,result.status);
        invalid?.focus();
        if(success){form.reset();tokenReady=false;}else if(response.status===403){tokenReady=false;}
      }catch{display('Unable to confirm delivery. Please check your connection and try again.',false);}finally{form.dataset.submitting='false';form.classList.remove('submitting');form.removeAttribute('aria-busy');if(button)button.disabled=false;}
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
