import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));
}
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const url = option('--url', 'https://krawlthroughkrakow.com/staging/');
const base = new URL(url);
if (!base.pathname.startsWith('/staging/') && !['localhost', '127.0.0.1'].includes(base.hostname)) {
  throw new Error('Restoration verification is limited to staging or local preview.');
}
base.search = '';
base.hash = '';
const out = path.resolve('docs/homepage-redesign');
const sections = ['our-story', 'gallery', 'private-groups', 'student-trips', 'brunch', 'new-year'];
const mobileAgent = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36';
const expectedBook = new URL('store2/pub-crawl-28/#book', base);
const expectedVideo = 'https://vimeo.com/892352668/df4cdc75d0';
const hash = async name => createHash('sha256').update(await readFile(`staging/wp-content/mu-plugins/ktk-homepage-assets/${name}`)).digest('hex').slice(0, 12);
const expected = { css: await hash('site.css'), js: await hash('site.js') };
const report = {
  url, time: new Date().toISOString(), expected,
  conditions: 'Installed headless Chrome; fresh contexts; real mobile UA for mobile widths; no throttling. Run separately from performance audits. No checkout, contact submission, or media autoplay. Deliberate external video navigation is intercepted after activation.',
  checks: [], builds: [], viewports: [], screenshots: [], pageErrors: [],
};
const check = (name, passed, detail = null) => report.checks.push({ name, status: passed ? 'pass' : 'fail', detail });
const isVimeo = value => { const host = new URL(value).hostname; return host === 'vimeo.com' || host.endsWith('.vimeo.com') || host === 'vimeocdn.com' || host.endsWith('.vimeocdn.com'); };
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function newContext(width, extra = {}) {
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 1000 }, deviceScaleFactor: 1,
    isMobile: width < 768, hasTouch: width < 768, userAgent: width < 768 ? mobileAgent : undefined,
    reducedMotion: 'reduce', ...extra,
  });
  context.on('page', page => page.on('pageerror', error => report.pageErrors.push({ url: page.url(), message: error.message })));
  return context;
}

async function load(page, target = url) {
  const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const css = await page.locator('link[rel="stylesheet"][href*="ktk-homepage-assets/site.css"]').getAttribute('href', { timeout: 10000 });
  const js = await page.locator('script[src*="ktk-homepage-assets/site.js"]').getAttribute('src', { timeout: 10000 });
  report.builds.push({ url: target, status: response.status(), cache: response.headers()['cf-cache-status'], css, js });
  if (response.status() !== 200 || new URL(css).searchParams.get('v') !== expected.css || new URL(js).searchParams.get('v') !== expected.js) {
    throw new Error(`Unexpected or stale build: ${css} / ${js}; expected ${JSON.stringify(expected)}`);
  }
}

async function rejectConsent(page) {
  const reject = page.getByRole('button', { name: /^Reject(?: all)?$/i }).first();
  await reject.waitFor({ state: 'visible', timeout: 20000 });
  await reject.click();
  await page.waitForFunction(() => ![...document.querySelectorAll('#iubenda-cs-banner, .iubenda-cs-container')].some(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden'), undefined, { timeout: 10000 });
}

async function scenario(name, width, run, options = {}) {
  const context = await newContext(width, options);
  try { await run(context, await context.newPage()); }
  catch (error) { check(name, false, error.message); }
  finally { await context.close(); }
}

const overflow = page => page.evaluate(ids => ({
  scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, innerWidth,
  clipped: [...document.querySelectorAll(ids.map(id => `#${id} h2,#${id} h3,#${id} p,#${id} a,#${id} figcaption`).join(','))]
    .filter(element => element.getClientRects().length)
    .map(element => { const rect = element.getBoundingClientRect(); return { tag: element.tagName, text: element.textContent.trim().slice(0, 70), left: rect.left, right: rect.right }; })
    .filter(rect => rect.left < -1 || rect.right > innerWidth + 1).slice(0, 15),
  oversize: [...document.querySelectorAll('body *')]
    .filter(element => element.getClientRects().length)
    .map(element => { const rect = element.getBoundingClientRect(); return { tag: element.tagName, id: element.id, class: element.getAttribute('class'), text: element.textContent.trim().slice(0, 60), left: rect.left, right: rect.right, width: rect.width }; })
    .filter(rect => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1).slice(0, 30),
  textOverflow: [...document.querySelectorAll('body *')]
    .filter(element => element.getClientRects().length)
    .flatMap(element => [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()).map(node => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      return { tag: element.tagName, class: element.getAttribute('class'), text: node.textContent.trim().slice(0, 60), left: rect.left, right: rect.right };
    }))
    .filter(rect => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1).slice(0, 30),
}), sections);

async function imageFacts(page) {
  const selector = sections.map(id => `#${id} img:not(#gallery-dialog img)`).join(',') + ',#video-preview img,#more img';
  const images = page.locator(selector);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(async element => {
      await Promise.race([
        element.decode(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Image decoding timed out')), 15000)),
      ]);
    });
  }
  return images.evaluateAll(items => items.map(image => ({
    src: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight,
    decoded: image.complete && image.naturalWidth > 0, alt: image.alt,
  })));
}

async function galleryInteractions(page, width) {
  const anchors = page.locator('#gallery a[data-gallery-item]');
  const originals = await anchors.evaluateAll(items => items.map(anchor => anchor.href));
  const captions = await anchors.evaluateAll(items => items.map(anchor => anchor.dataset.caption));
  check(`${width}: gallery offers multiple native image links`, originals.length >= 4 && originals.every(href => {
    const image = new URL(href);
    return image.origin === base.origin && /\/ktk-homepage-assets\/.+\.(?:webp|jpe?g|png)$/i.test(image.pathname);
  }), originals);
  if (originals.length < 2) return;
  const first = anchors.first();
  await first.focus();
  await page.keyboard.press('Enter');
  const dialog = page.locator('#gallery-dialog');
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  await dialog.locator('img').evaluate(image => image.decode());
  check(`${width}: gallery opens by keyboard with first photo`, await dialog.locator('img').evaluate(image => image.currentSrc) === originals[0]);
  check(`${width}: first photo has its caption and index`, await dialog.locator('#gallery-caption').textContent() === captions[0] && await dialog.locator('.gallery-counter').textContent() === `1 / ${originals.length}`);
  check(`${width}: gallery dialog contains keyboard focus`, await dialog.evaluate(element => element.contains(document.activeElement)));
  const controls = dialog.getByRole('button');
  await controls.last().focus();
  await page.keyboard.press('Tab');
  check(`${width}: gallery traps forward keyboard focus`, await dialog.evaluate(element => element.contains(document.activeElement)));
  await controls.first().focus();
  await page.keyboard.press('Shift+Tab');
  check(`${width}: gallery traps backward keyboard focus`, await dialog.evaluate(element => element.contains(document.activeElement)));
  if (width < 768) {
    await page.waitForFunction(() => document.querySelector('.mobile-booking')?.hidden === true, undefined, { timeout: 5000 });
    check(`${width}: sticky booking hides during gallery modal`, await page.locator('.mobile-booking').evaluate(element => element.hidden));
  }
  if ([390, 1440].includes(width)) {
    const screenshot = `restoration-lightbox-${width}.png`;
    await dialog.screenshot({ path: path.join(out, screenshot) });
    report.screenshots.push(screenshot);
  }
  await dialog.getByRole('button', { name: /next/i }).click();
  await page.waitForFunction(src => document.querySelector('#gallery-dialog img')?.src === src, originals[1]);
  await dialog.locator('img').evaluate(image => image.decode());
  check(`${width}: next gallery photo loads`, await dialog.locator('img').evaluate(image => image.currentSrc) === originals[1]);
  check(`${width}: next photo updates the caption and index`, await dialog.locator('#gallery-caption').textContent() === captions[1] && await dialog.locator('.gallery-counter').textContent() === `2 / ${originals.length}`);
  await dialog.getByRole('button', { name: /previous/i }).click();
  await page.waitForFunction(src => document.querySelector('#gallery-dialog img')?.src === src, originals[0]);
  check(`${width}: previous gallery photo works`, await dialog.locator('img').evaluate(image => image.src) === originals[0]);
  await page.keyboard.press('ArrowLeft');
  check(`${width}: keyboard gallery navigation wraps to last photo`, await dialog.locator('img').evaluate(image => image.src) === originals.at(-1) && await dialog.locator('.gallery-counter').textContent() === `${originals.length} / ${originals.length}`);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 5000 });
  check(`${width}: Escape restores the originating gallery link`, await first.evaluate(element => element === document.activeElement));
  await first.click();
  await dialog.getByRole('button', { name: /close/i }).click();
  check(`${width}: gallery close control restores focus`, !(await dialog.isVisible()) && await first.evaluate(element => element === document.activeElement));
}

try {
  for (const width of option('--widths', '360,390,768,1440').split(',').map(Number)) {
    await scenario(`Restored content at ${width}`, width, async (context, page) => {
      const videoRequests = [];
      let videoIntent = false;
      context.on('request', request => { if (isVimeo(request.url())) videoRequests.push({ url: request.url(), afterIntent: videoIntent }); });
      await load(page);
      await rejectConsent(page);
      for (const id of sections) {
        check(`${width}: restored ${id} section exists`, await page.locator(`#${id}`).count() === 1 && await page.locator(`#${id}`).isVisible());
      }
      check(`${width}: secondary experiences are grouped together`, await page.locator('#more #private-groups,#more #student-trips,#more #brunch,#more #new-year').count() === 4);
      const lead = await page.locator('.story-lead').evaluate(element => element.textContent.replace(/\s+/g, ' ').trim());
      check(`${width}: story line breaks preserve word spacing`, lead === 'A city is better when you have someone to share it with.', lead);
      const photos = await imageFacts(page);
      check(`${width}: restored images decode with meaningful alt text`, photos.length >= 6 && photos.every(image => image.decoded && image.alt.trim()), photos);
      const layout = await overflow(page);
      check(`${width}: restored sections fit viewport`, layout.scrollWidth <= layout.clientWidth + 1 && layout.clipped.length === 0, layout);
      report.viewports.push({ width, photos, layout });
      const ctas = await page.locator('a[data-book]').evaluateAll(anchors => anchors.map(anchor => ({ position: anchor.dataset.book, href: anchor.href })));
      check(`${width}: every primary booking link has the same destination`, ctas.length >= 5 && ctas.every(anchor => anchor.href === expectedBook.href), ctas);
      const video = page.locator('a#video-preview');
      check(`${width}: video preview is a native external link`, await video.count() === 1 && new URL(await video.getAttribute('href')).href === expectedVideo);
      check(`${width}: video opens safely in a separate tab`, await video.getAttribute('target') === '_blank' && /\bnoopener\b/.test(await video.getAttribute('rel') || ''));
      check(`${width}: no Vimeo embed is present`, await page.locator('iframe[src*="vimeo"],iframe[data-src*="vimeo"]').count() === 0);
      await galleryInteractions(page, width);
      check(`${width}: no Vimeo requests on load, scroll or gallery use`, videoRequests.length === 0, videoRequests);
      await page.locator('#gallery').screenshot({ path: path.join(out, `restoration-gallery-${width}.png`) });
      report.screenshots.push(`restoration-gallery-${width}.png`);
      if ([390, 1440].includes(width)) {
        for (const section of ['our-story', 'more']) {
          const screenshot = `restoration-${section}-${width}.png`;
          await page.locator(`#${section}`).screenshot({ path: path.join(out, screenshot) });
          report.screenshots.push(screenshot);
        }
      }

      if (width === 390) {
        await video.focus();
        check('Video preview accepts keyboard focus', await video.evaluate(element => element === document.activeElement && element.tabIndex >= 0));
        // Intercept only after deliberate activation; no remote video playback is needed to verify the native link.
        await context.route('https://vimeo.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>External navigation verified</title>' }));
        videoIntent = true;
        const opened = context.waitForEvent('page');
        await page.keyboard.press('Enter');
        const videoTab = await opened;
        await videoTab.waitForURL(expectedVideo);
        check('Keyboard activates the exact external video URL', videoTab.url() === expectedVideo);
        await videoTab.close();
      }
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
      const zoomed = await overflow(page);
      check(`${width}: restored content fits at 200% CSS zoom`, zoomed.scrollWidth <= zoomed.clientWidth + 1 && zoomed.clipped.length === 0, zoomed);
      if (width === 768) {
        for (const section of ['meeting', 'our-story']) {
          const screenshot = `restoration-zoom-${section}-${width}.png`;
          await page.locator(`#${section}`).screenshot({ path: path.join(out, screenshot) });
          report.screenshots.push(screenshot);
        }
      }
      if (zoomed.scrollWidth > zoomed.clientWidth + 1) {
        await page.screenshot({ path: path.join(out, `restoration-zoom-overflow-${width}.png`) });
      }
    });
  }

  await scenario('Restored destination and attribution checks', 390, async (context, page) => {
    const landing = new URL(url);
    landing.searchParams.set('utm_source', 'ktk-homepage-restoration-qa');
    landing.searchParams.set('utm_campaign', 'restoration-check');
    await load(page, landing.href);
    await rejectConsent(page);
    const links = await page.locator('#more a[href],#our-story a[href],#gallery a[href]').evaluateAll(anchors => anchors.map(anchor => ({ text: anchor.textContent.trim(), href: anchor.href })));
    const products = await page.locator('#private-groups a[href],#brunch a[href],#new-year a[href]').evaluateAll(anchors => anchors.map(anchor => ({ text: anchor.textContent.trim(), href: anchor.href })));
    check('Restored product links use this environment and carry attribution', products.length >= 3 && products.every(link => {
      const target = new URL(link.href);
      return target.origin === base.origin && target.pathname.startsWith(new URL('store2/', base).pathname)
        && target.hash === '#book' && target.searchParams.get('utm_source') === 'ktk-homepage-restoration-qa'
        && target.searchParams.get('utm_campaign') === 'restoration-check';
    }), products);
    const editorial = await page.locator('#student-trips a[href]').evaluateAll(anchors => anchors.map(anchor => anchor.href));
    check('Student trips retain the existing editorial destination', editorial.includes('https://krawlthroughkrakow.com/student-trips-poland/'), editorial);
    check('Gallery full-image links do not inherit marketing parameters', links.filter(link => /\.(?:webp|jpg|png)$/.test(new URL(link.href).pathname)).every(link => !new URL(link.href).searchParams.has('utm_source')));
    const ctas = await page.locator('a[data-book]').evaluateAll(anchors => anchors.map(anchor => anchor.href));
    check('Primary booking links stay identical after attribution', ctas.length >= 5 && new Set(ctas).size === 1 && new URL(ctas[0]).searchParams.get('utm_campaign') === 'restoration-check', ctas);
  });

  await scenario('JavaScript-free restored links', 390, async (context, page) => {
    await load(page);
    const imageLinks = await page.locator('#gallery a[data-gallery-item]').evaluateAll(anchors => anchors.map(anchor => anchor.href));
    check('Gallery retains real image hrefs without JavaScript', imageLinks.length >= 4 && imageLinks.every(href => /^https?:/.test(href) && /\.(?:webp|jpe?g|png)(?:\?|$)/.test(href)));
    check('Video remains a native external link without JavaScript', await page.locator('a#video-preview').getAttribute('href') === expectedVideo);
    check('Restored product links remain native without JavaScript', await page.locator('#private-groups a[href*="store2"],#brunch a[href*="store2"],#new-year a[href*="store2"]').count() >= 3);
  }, { javaScriptEnabled: false });
} finally {
  await browser.close();
  check('No uncaught JavaScript errors', report.pageErrors.length === 0, report.pageErrors);
  report.summary = { pass: report.checks.filter(item => item.status === 'pass').length, fail: report.checks.filter(item => item.status === 'fail').length };
  const reportFile = path.join(out, option('--report', 'restoration-audit.json'));
  await writeFile(reportFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report.summary, reportFile, failures: report.checks.filter(item => item.status !== 'pass') }, null, 2));
  if (report.summary.fail) process.exitCode = 1;
}
