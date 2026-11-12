import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));
}
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const url = option('--url', 'https://krawlthroughkrakow.com/');
const label = option('--label', 'production');
const snapshotsOnly = process.argv.includes('--snapshots-only');
const layoutOnly = process.argv.includes('--layout-only');
const controlledGallery = process.argv.includes('--controlled-gallery');
const viewportScrolls = process.argv.includes('--viewport-scrolls');
const viewportTiles = process.argv.includes('--viewport-tiles');
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a simple lowercase report label.');
const out = path.resolve(option('--output', 'docs/homepage-parity'));
await mkdir(out, { recursive: true });
const report = {
  url, capturedAt: new Date().toISOString(),
  conditions: 'Read-only public-page capture in fresh installed Chrome contexts. Consent rejected when available. No link navigation, form submission, purchase, admin action, deployment or cache purge. Default motion preference; page scrolled to load lazy images and settle entrance animations.',
  controlledGallery,
  viewports: [], screenshots: [], errors: [],
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const requestedWidths = option('--widths', '1920,1440,768,390').split(',').map(Number);
const viewports = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }].filter(viewport => requestedWidths.includes(viewport.width));

async function screenshot(target, name, options = {}) {
  if (snapshotsOnly) return null;
  const file = `${label}-${name}.png`;
  await target.screenshot({ path: path.join(out, file), ...options });
  report.screenshots.push(file);
  return file;
}

async function inventory(page) {
  return page.evaluate(() => {
    const visible = element => element.getClientRects().length && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden';
    const text = element => (typeof element.innerText === 'string' ? element.innerText : element.textContent || '').replace(/\s+/g, ' ').trim();
    const styleKeys = ['display', 'position', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'color', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderBottomWidth', 'borderColor', 'borderRadius', 'gap', 'gridTemplateColumns', 'flexDirection', 'alignItems', 'justifyContent', 'maxWidth', 'minHeight', 'opacity', 'transform', 'zIndex'];
    const facts = element => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName, id: element.id, class: element.getAttribute('class'),
        text: text(element).slice(0, 220),
        box: { x: box.x, y: box.y + scrollY, width: box.width, height: box.height },
        style: Object.fromEntries(styleKeys.map(key => [key, style[key]])),
      };
    };
    const sections = [...document.querySelectorAll('#main-content .et_pb_section')].map((section, index) => ({
      index, visible: !!visible(section), ...facts(section),
      headings: [...section.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map(facts),
      rows: [...section.querySelectorAll('.et_pb_row')].filter(visible).map(facts),
      modules: [...section.querySelectorAll('.et_pb_module')].filter(visible).map(facts),
      links: [...section.querySelectorAll('a[href]')].filter(visible).map(anchor => ({ text: text(anchor), href: anchor.href, class: anchor.className })),
    }));
    return {
      title: document.title, bodyClass: document.body.className,
      viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
      body: facts(document.body),
      headers: [...document.querySelectorAll('header,#main-header,.et-l--header,.et_pb_menu')].filter(visible).map(facts),
      headerLinks: [...document.querySelectorAll('header a,#main-header a,.et-l--header a')].filter(visible).map(anchor => ({ ...facts(anchor), href: anchor.href })),
      headerImages: [...document.querySelectorAll('header img,#main-header img,.et-l--header img')].filter(visible).map(image => ({ ...facts(image), src: image.currentSrc || image.src, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight })),
      sections,
      textSamples: [...document.querySelectorAll('#main-content p,#main-content h1,#main-content h2,#main-content h3,#main-content h4')].filter(visible).map(facts),
      images: [...document.images].filter(visible).map(image => ({ ...facts(image), src: image.currentSrc || image.src, srcset: image.srcset, alt: image.alt, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, complete: image.complete })),
      frames: [...document.querySelectorAll('iframe')].map(frame => ({ ...facts(frame), src: frame.src, title: frame.title, loading: frame.loading, visible: !!visible(frame) })),
      stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => ({ id: link.id, href: link.href, media: link.media })),
      inlineStyles: [...document.querySelectorAll('style')].map(style => ({ id: style.id, media: style.media, text: style.textContent })),
      cssom: [...document.styleSheets].map((sheet, index) => {
        const data = { index, id: sheet.ownerNode?.id || '', href: sheet.href, media: sheet.media.mediaText, ownerTag: sheet.ownerNode?.tagName, text: '', error: null };
        try { data.text = [...sheet.cssRules].map(rule => rule.cssText).join('\n'); }
        catch (error) { data.error = error.message; }
        return data;
      }),
      bodyAttributes: Object.fromEntries([...document.body.attributes].map(attribute => [attribute.name, attribute.value])),
      animationState: [...document.querySelectorAll('.et_animated,[class*="et-waypoint"],[style*="opacity"],[style*="transform"]')].map(element => ({ ...facts(element), inlineStyle: element.getAttribute('style') })),
      backgroundLayers: [...document.querySelectorAll('.et_parallax_bg,.et_pb_section_video_bg,[data-bg],[data-bg-multi]')].map(element => ({ ...facts(element), visible: !!visible(element), inlineStyle: element.getAttribute('style') })),
      fonts: [...document.fonts].map(font => ({ family: font.family, weight: font.weight, style: font.style, status: font.status })),
      floating: [...document.querySelectorAll('#ktk-cta,.iubenda-tp-btn')].filter(visible).map(facts),
      footers: [...document.querySelectorAll('footer,#main-footer,.et-l--footer')].filter(visible).map(facts),
    };
  });
}

async function scrollLoad(page) {
  await page.evaluate(async () => {
    const step = Math.max(400, innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 160));
    }
    await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => Promise.race([
      image.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000)),
    ])));
    await document.fonts.ready;
    scrollTo(0, 0);
  });
  await page.waitForTimeout(1400);
}

try {
  for (const viewport of viewports) {
    const mobile = viewport.width < 1000;
    const context = await browser.newContext({
      viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile,
      userAgent: viewport.width === 390 ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36' : viewport.width === 768 ? 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : undefined,
    });
    const result = { viewport, pageErrors: [] };
    try {
      const page = await context.newPage();
      if (controlledGallery) await page.addInitScript(() => {
        window.__parityGalleryTimers = [];
        for (const method of ['setTimeout', 'setInterval']) {
          const original = window[method];
          window[method] = function(callback, delay, ...args) {
            if (window.__parityFreezeGallery && Number(delay) === 3500) return 0;
            const id = original.call(window, callback, delay, ...args);
            if (Number(delay) === 3500) window.__parityGalleryTimers.push({ method, id });
            return id;
          };
        }
      });
      page.on('pageerror', error => result.pageErrors.push(error.message));
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      result.response = { status: response.status(), cache: response.headers()['cf-cache-status'], age: response.headers().age };
      await writeFile(path.join(out, `${label}-response-${viewport.width}.html`), await response.text());
      await page.mouse.wheel(0, 10);
      const reject = page.getByRole('button', { name: /^Reject(?: all)?$/i }).first();
      try { await reject.waitFor({ state: 'visible', timeout: Number(option('--consent-timeout', '15000')) }); await reject.click(); result.consent = 'rejected'; }
      catch { result.consent = 'no reject button observed'; }
      await scrollLoad(page);
      if (await reject.isVisible()) {
        await reject.click();
        result.consent = 'rejected after lazy-script activation';
      }
      await page.waitForTimeout(500);
      if (process.argv.includes('--settle-consent')) {
        // Some production pages initialize their banner after lazy assets settle.
        for (let attempt = 0; attempt < 12; attempt++) {
          if (await reject.isVisible()) {
            await reject.click();
            result.consent = 'rejected after late initialization';
          }
          await page.waitForTimeout(250);
        }
        if (await page.locator('#iubenda-cs-banner').isVisible()) throw new Error('Consent banner still covers capture.');
      }
      if (controlledGallery) {
        await page.evaluate(() => {
          window.__parityFreezeGallery = true;
          for (const timer of window.__parityGalleryTimers || []) {
            (timer.method === 'setInterval' ? clearInterval : clearTimeout)(timer.id);
          }
          for (const gallery of document.querySelectorAll('.et_pb_gallery_fullwidth')) {
            gallery.querySelector('.et-pb-controllers a,.et-pb-controllers button')?.click();
          }
        });
        await page.waitForTimeout(600);
      }
      result.document = await inventory(page);
      await writeFile(path.join(out, `${label}-rendered-${viewport.width}.html`), await page.content());
      await writeFile(path.join(out, `${label}-styles-${viewport.width}.json`), JSON.stringify({ bodyClass: result.document.bodyClass, bodyAttributes: result.document.bodyAttributes, stylesheets: result.document.stylesheets, inlineStyles: result.document.inlineStyles, cssom: result.document.cssom, animationState: result.document.animationState, backgroundLayers: result.document.backgroundLayers }, null, 2));
      await screenshot(page, `viewport-${viewport.width}`);
      if (!process.argv.includes('--skip-section-images')) await screenshot(page, `full-${viewport.width}`, { fullPage: true });
      if (viewportScrolls) {
        result.scrollViews = [];
        for (const [name, sectionIndex, offset] of [
          ['inclusions', 1, 400], ['features-top', 5, 0], ['features-middle', 5, 600],
          ['features-bottom', 5, 1200], ['review-copy', 6, 0], ['review-badges', 6, 500],
        ]) {
          await page.evaluate(y => scrollTo(0, y), result.document.sections[sectionIndex].box.y + offset);
          await page.waitForTimeout(700);
          result.scrollViews.push(await page.evaluate(name => ({
            name, scrollY, innerHeight, visualViewportHeight: visualViewport?.height,
            targets: [...document.querySelectorAll('.et_pb_image_3,.et_pb_image_4,.et_pb_image_5,.et_pb_image_6,.et_pb_image_7,.et_pb_image_8,.et_pb_column_27')].map(element => ({
              class: element.className, opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform,
              top: element.getBoundingClientRect().top, height: element.getBoundingClientRect().height,
            })),
          }), name));
          await screenshot(page, `scrollview-${viewport.width}-${name}`);
        }
      }
      if (viewportTiles) {
        result.tiles = [];
        const footer = result.document.footers.at(-1);
        const contentBottom = footer ? footer.box.y + footer.box.height : result.document.viewport.scrollHeight;
        const lastY = Math.max(0, Math.floor(contentBottom - viewport.height));
        const positions = [];
        for (let y = 0; y < lastY; y += Math.floor(viewport.height * 0.75)) positions.push(y);
        positions.push(lastY);
        for (const [index, y] of positions.entries()) {
          if (process.argv.includes('--last-tile-only') && index !== positions.length - 1) continue;
          const name = `tile-${viewport.width}-${String(index).padStart(2, '0')}`;
          await page.evaluate(y => scrollTo(0, y), y);
          await page.waitForTimeout(350);
          result.tiles.push(await page.evaluate(name => ({
            name, scrollY, innerWidth, innerHeight,
            masks: [...document.querySelectorAll('iframe[src^="http"],.iubenda-tp-btn,#iubenda-cs-banner,.iubenda-uspr-btn')].filter(element => element.getClientRects().length).map(element => {
              const rect = element.getBoundingClientRect();
              return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
            }),
          }), name));
          await screenshot(page, name);
        }
      }
      if (!process.argv.includes('--skip-section-images') && [1920, 390].includes(viewport.width)) {
        const sections = page.locator('#main-content .et_pb_section');
        for (const section of result.document.sections.filter(item => item.visible && item.box.width > 10 && item.box.height > 10)) {
          await page.evaluate(y => scrollTo(0, y), section.box.y);
          await page.waitForTimeout(350);
          await screenshot(sections.nth(section.index), `section-${viewport.width}-${String(section.index).padStart(2, '0')}`);
        }
      }
      if (viewport.width === 1920) await writeFile(path.join(out, `${label}-rendered.html`), await page.content());

      await page.evaluate(() => scrollTo(0, 0));
      const headerBefore = await page.locator('header,#main-header,.et-l--header,.et_pb_menu').evaluateAll(elements => elements.filter(element => element.getClientRects().length).map(element => ({ tag: element.tagName, class: element.className, top: element.getBoundingClientRect().top, position: getComputedStyle(element).position })));
      await page.evaluate(() => scrollTo(0, 600));
      await page.waitForTimeout(500);
      const headerAfter = await page.locator('header,#main-header,.et-l--header,.et_pb_menu').evaluateAll(elements => elements.filter(element => element.getClientRects().length).map(element => ({ tag: element.tagName, class: element.className, top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom, position: getComputedStyle(element).position })));
      result.headerScroll = { before: headerBefore, after600px: headerAfter };
      await screenshot(page, `scrolled-${viewport.width}`);
      await page.evaluate(() => scrollTo(0, 0));
      if (layoutOnly) {
        report.viewports.push(result);
        await writeFile(path.join(out, `${label}-baseline.json`), JSON.stringify(report, null, 2));
        continue;
      }
      const toggle = page.locator('.mobile_menu_bar:visible').first();
      if (await toggle.count()) {
        await toggle.click();
        await page.waitForTimeout(500);
        result.mobileMenu = await page.locator('.et_mobile_menu:visible').evaluateAll(menus => menus.map(menu => ({ text: menu.innerText, box: { x: menu.getBoundingClientRect().x, y: menu.getBoundingClientRect().y, width: menu.getBoundingClientRect().width, height: menu.getBoundingClientRect().height }, links: [...menu.querySelectorAll('a')].map(anchor => ({ text: anchor.innerText, href: anchor.href, fontSize: getComputedStyle(anchor).fontSize, padding: getComputedStyle(anchor).padding, color: getComputedStyle(anchor).color })) })));
        await screenshot(page, `menu-${viewport.width}`);
        await toggle.click();
      } else {
        const submenu = page.locator('.et-menu > .menu-item-has-children:visible,#top-menu > .menu-item-has-children:visible').first();
        if (await submenu.count()) {
          await submenu.hover();
          await page.waitForTimeout(400);
          result.desktopDropdown = await submenu.locator('.sub-menu').first().evaluate(menu => ({ text: menu.innerText, font: getComputedStyle(menu.querySelector('a')).font, color: getComputedStyle(menu.querySelector('a')).color, background: getComputedStyle(menu).backgroundColor, width: menu.getBoundingClientRect().width, top: menu.getBoundingClientRect().top }));
          await screenshot(page, `dropdown-${viewport.width}`);
        }
      }
    } catch (error) {
      result.error = error.message;
      report.errors.push({ viewport, message: error.message });
    } finally { await context.close(); }
    report.viewports.push(result);
    await writeFile(path.join(out, `${label}-baseline.json`), JSON.stringify(report, null, 2));
  }
} finally {
  await browser.close();
  await writeFile(path.join(out, `${label}-baseline.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ report: path.join(out, `${label}-baseline.json`), screenshots: report.screenshots.length, viewports: report.viewports.map(item => ({ viewport: item.viewport, status: item.response?.status, visibleSections: item.document?.sections.filter(section => section.visible).length, documentHeight: item.document?.viewport.scrollHeight, error: item.error })), errors: report.errors }, null, 2));
  if (report.errors.length) process.exitCode = 1;
}
