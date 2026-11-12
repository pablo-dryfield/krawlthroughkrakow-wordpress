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
const requestedHeight = option('--height', null);
if (requestedHeight !== null && (!/^\d+$/.test(requestedHeight) || Number(requestedHeight) < 200)) {
  throw new Error('--height must be an integer of at least 200 pixels.');
}
const url = option('--url', 'https://krawlthroughkrakow.com/staging/');
const base = new URL(url);
if (!base.pathname.startsWith('/staging/') && !['localhost', '127.0.0.1'].includes(base.hostname)) {
  throw new Error('Hero verification is limited to staging or local preview.');
}
base.search = '';
base.hash = '';
const expectedBook = new URL('store2/pub-crawl-28/#book', base).href;
const reviewSnapshot = [
  { name: 'Google', count: null, url: 'https://www.google.com/maps/place/Krawl+Through+Krakow+-+Pub+crawl/@50.0614569,19.9380167,17z/data=!3m1!4b1!4m6!3m5!1s0x47165bf213d4292f:0xb4d3277c5ab6ea20!8m2!3d50.0614569!4d19.9380167!16s%2Fg%2F11t9kqj0yw' },
  { name: 'Tripadvisor', count: '3000+', url: 'https://www.tripadvisor.com/Attraction_Review-g274772-d2725527-Reviews-Krawl_Through_Krakow_Pub_Crawl-Krakow_Lesser_Poland_Province_Southern_Poland.html' },
  { name: 'GetYourGuide', count: '100+', url: 'https://www.getyourguide.com/krakow-l40/krakow-pub-crawl-1h-open-bar-vip-entry-welcome-shots-t443425/' },
];
const out = path.resolve('docs/homepage-redesign');
const hash = async name => createHash('sha256').update(await readFile(`staging/wp-content/mu-plugins/ktk-homepage-assets/${name}`)).digest('hex').slice(0, 12);
const expected = { css: await hash('site.css'), js: await hash('site.js') };
const report = {
  url, time: new Date().toISOString(), expected,
  conditions: 'Installed headless Chrome; fresh contexts; Android UA for mobile widths; no CPU/network throttling. Run separately from performance audits. Native link inspection only: no booking submission or external review navigation. CSS zoom checks are not browser pinch-zoom simulation.',
  checks: [], builds: [], layouts: [], screenshots: [], pageErrors: [],
};
const check = (name, passed, detail = null) => report.checks.push({ name, status: passed ? 'pass' : 'fail', detail });
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function scenario(name, width, run, options = {}) {
  const mobile = width < 768;
  const context = await browser.newContext({
    viewport: { width, height: requestedHeight ? Number(requestedHeight) : mobile ? 844 : 1000 }, deviceScaleFactor: 1,
    isMobile: mobile, hasTouch: mobile,
    userAgent: mobile ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36' : undefined,
    reducedMotion: 'reduce', ...options,
  });
  context.on('page', page => page.on('pageerror', error => report.pageErrors.push({ url: page.url(), message: error.message })));
  try { await run(await context.newPage()); }
  catch (error) { check(name, false, error.message); }
  finally { await context.close(); }
}

async function load(page) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const css = await page.locator('link[rel="stylesheet"][href*="ktk-homepage-assets/site.css"]').getAttribute('href', { timeout: 10000 });
  const js = await page.locator('script[src*="ktk-homepage-assets/site.js"]').getAttribute('src', { timeout: 10000 });
  const fontPreloads = await page.locator('head link[rel="preload"][as="font"]').evaluateAll(links => links.map(link => link.href));
  report.builds.push({ status: response.status(), cache: response.headers()['cf-cache-status'], css, js, fontPreloads });
  if (response.status() !== 200 || new URL(css).searchParams.get('v') !== expected.css || new URL(js).searchParams.get('v') !== expected.js) {
    throw new Error(`Unexpected or stale build: ${css} / ${js}; expected ${JSON.stringify(expected)}`);
  }
  if (!fontPreloads.some(href => new URL(href).pathname.endsWith('/storefront-montserrat-latin.woff2'))) {
    throw new Error(`Hero font preload is missing: ${JSON.stringify(fontPreloads)}`);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.hero-photo img').evaluate(image => image.decode());
}

async function dismissConsent(page) {
  const reject = page.getByRole('button', { name: /^Reject(?: all)?$/i }).first();
  await reject.waitFor({ state: 'visible', timeout: 20000 });
  await reject.click();
  await page.waitForFunction(() => ![...document.querySelectorAll('#iubenda-cs-banner, .iubenda-cs-container')].some(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden'), undefined, { timeout: 10000 });
}

const facts = page => page.locator('.hero').evaluate(hero => {
  const text = element => (element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim();
  return {
    text: text(hero),
    titleCount: hero.querySelectorAll('#hero-title').length,
    brand: text(hero.querySelector('.hero-brand')),
    left: text(hero.querySelector('.hero-schedule-left')),
    right: text(hero.querySelector('.hero-schedule-right')),
    reviews: [...hero.querySelectorAll('.hero-reviews a')].map(anchor => ({
      text: text(anchor), href: anchor.href, target: anchor.target, rel: anchor.rel,
      name: text(anchor.querySelector('.hero-review-name')),
      count: anchor.dataset.reviewCount || anchor.querySelector('[data-review-count]')?.dataset.reviewCount || anchor.querySelector('.hero-review-count strong')?.textContent.replace(/[,\s]/g, '') || null,
    })),
    bookingLinks: [...hero.querySelectorAll('a[data-book]')].map(anchor => anchor.href),
    image: (() => { const image = hero.querySelector('.hero-photo img'); return { src: image.currentSrc, decoded: image.complete && image.naturalWidth > 0, alt: image.alt }; })(),
  };
});

const geometry = page => page.evaluate(() => {
  const hero = document.querySelector('.hero');
  const rect = element => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
  };
  const heroRect = rect(hero);
  const selectors = ['.hero-brand', '#hero-title', '.hero-schedule-left', '.hero-schedule-right', '.hero-intro', '.hero-detail', '[data-book="hero"]', '.hero-reviews a', '.hero-caption'];
  const blocks = selectors.flatMap(selector => [...hero.querySelectorAll(selector)].filter(element => element.getClientRects().length).map((element, index) => {
    const nodes = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
    const lines = nodes.flatMap(node => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return [...range.getClientRects()].filter(box => box.width && box.height).map(box => ({ left: box.left, right: box.right, top: box.top, bottom: box.bottom }));
    });
    return { selector: `${selector}:${index}`, text: element.textContent.replace(/\s+/g, ' ').trim(), rect: rect(element), lines };
  }));
  const collisions = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (blocks[i].lines.some(a => blocks[j].lines.some(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1))) {
        collisions.push([blocks[i].selector, blocks[j].selector]);
      }
    }
  }
  const overflow = blocks.filter(block => block.lines.some(box => box.left < heroRect.left - 1 || box.right > heroRect.right + 1 || box.top < heroRect.top - 1 || box.bottom > heroRect.bottom + 1));
  const brand = hero.querySelector('.hero-brand');
  const title = hero.querySelector('#hero-title');
  const reviews = hero.querySelector('.hero-reviews');
  const action = hero.querySelector('[data-book="hero"]');
  const nextSection = hero.nextElementSibling;
  const pageOverflow = document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 ? [] : [...document.querySelectorAll('body *')]
    .filter(element => element.getClientRects().length)
    .flatMap(element => {
      const boxes = [{ kind: 'element', ...rect(element) }];
      for (const node of element.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const box = range.getBoundingClientRect();
        boxes.push({ kind: 'text', left: box.left, right: box.right, top: box.top, bottom: box.bottom });
      }
      return boxes.filter(box => box.right > document.documentElement.clientWidth + 1).map(box => ({ tag: element.tagName, id: element.id, class: element.getAttribute('class'), text: element.textContent.trim().slice(0, 70), ...box }));
    }).slice(0, 30);
  return {
    hero: heroRect, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, viewportHeight: innerHeight,
    nextSectionTop: nextSection && nextSection.getBoundingClientRect().top + scrollY,
    brand: brand && rect(brand), title: title && rect(title), reviews: reviews && rect(reviews), action: action && rect(action),
    brandAlignment: brand && getComputedStyle(brand).textAlign,
    titleAlignment: title && getComputedStyle(title).textAlign,
    collisions, overflow, pageOverflow, blocks,
  };
});

function reviewChecks(label, reviews) {
  check(`${label}: three distinct native review-source links`, reviews.length === 3 && new Set(reviews.map(review => new URL(review.href).hostname.replace(/^www\./, ''))).size === 3 && reviews.every(review => new URL(review.href).protocol === 'https:' && review.text.trim()), reviews);
  check(`${label}: review links opening new tabs use noopener`, reviews.every(review => review.target !== '_blank' || /\bnoopener\b/.test(review.rel)), reviews);
  const counts = reviews.filter(review => review.count !== null);
  check(`${label}: two published review-count floors are positive integers`, counts.length === 2 && counts.every(review => /^\d+\+?$/.test(review.count) && Number.isSafeInteger(Number(review.count.replace(/\+$/, ''))) && Number(review.count.replace(/\+$/, '')) > 0), counts);
  check(`${label}: review links and counts match the verified snapshot`, reviewSnapshot.every(source => reviews.some(review => review.name === source.name && review.count === source.count && review.href === new URL(source.url).href)), reviews);
  check(`${label}: Google uses the honest uncounted fallback`, reviews.some(review => review.name === 'Google' && review.count === null && /Read reviews/i.test(review.text)), reviews);
}

function layoutChecks(label, layout) {
  check(`${label}: brand is centered above the hero title`, !!layout.brand && !!layout.title && layout.brand.bottom <= layout.title.top + 1 && Math.abs((layout.brand.left + layout.brand.right) / 2 - (layout.hero.left + layout.hero.right) / 2) <= 2 && layout.brandAlignment === 'center', { brand: layout.brand, title: layout.title, hero: layout.hero, alignment: layout.brandAlignment });
  check(`${label}: hero title is centered`, !!layout.title && Math.abs((layout.title.left + layout.title.right) / 2 - (layout.hero.left + layout.hero.right) / 2) <= 2 && layout.titleAlignment === 'center', { title: layout.title, hero: layout.hero, alignment: layout.titleAlignment });
  check(`${label}: reviews sit below the primary hero content`, !!layout.reviews && !!layout.title && !!layout.action && layout.reviews.top >= Math.max(layout.title.bottom, layout.action.bottom) - 1 && layout.reviews.bottom <= layout.hero.bottom + 1, { reviews: layout.reviews, title: layout.title, action: layout.action, hero: layout.hero });
  check(`${label}: hero text does not overlap`, layout.collisions.length === 0, layout.collisions);
  check(`${label}: hero content fits without horizontal overflow`, layout.scrollWidth <= layout.clientWidth + 1 && layout.overflow.length === 0, { scrollWidth: layout.scrollWidth, clientWidth: layout.clientWidth, overflow: layout.overflow, pageOverflow: layout.pageOverflow });
}

async function screenshot(page, filename, heroOnly = true) {
  if (heroOnly) await page.locator('.hero').screenshot({ path: path.join(out, filename) });
  else await page.screenshot({ path: path.join(out, filename) });
  report.screenshots.push(filename);
}

try {
  for (const width of option('--widths', '360,390,768,1440').split(',').map(Number)) {
    await scenario(`Hero at ${width}`, width, async page => {
      await load(page);
      await dismissConsent(page);
      const hero = await facts(page);
      check(`${width}: hero price is removed`, !/\bPLN\b|\bz[l\u0142]\b|[\u20ac\u00a3$]/i.test(hero.text) && await page.locator('.hero .hero-price').count() === 0, hero.text);
      check(`${width}: hero brand and single title are present`, hero.brand.toUpperCase() === 'KRAWL THROUGH KRAKOW' && hero.titleCount === 1, hero.brand);
      check(`${width}: schedule identifies every night at 9 PM Adam Statue`, /EVERY\s+NIGHT/i.test(hero.left) && /9\s*P\.?\s*M\.?/i.test(hero.right) && /ADAM\s+STATUE/i.test(hero.right), { left: hero.left, right: hero.right });
      check(`${width}: hero photograph is decoded and described`, hero.image.decoded && !!hero.image.alt.trim(), hero.image);
      check(`${width}: hero primary CTA uses the expected booking URL`, hero.bookingLinks.length === 1 && hero.bookingLinks[0] === expectedBook, hero.bookingLinks);
      const allBookingLinks = await page.locator('a[data-book]').evaluateAll(anchors => anchors.map(anchor => anchor.href));
      check(`${width}: all primary CTAs share the hero booking URL`, allBookingLinks.length >= 5 && allBookingLinks.every(href => href === expectedBook), allBookingLinks);
      reviewChecks(`${width}`, hero.reviews);
      const normal = await geometry(page);
      layoutChecks(`${width}`, normal);
      check(`${width}: next section is visible in the first viewport`, normal.nextSectionTop !== null && normal.nextSectionTop <= normal.viewportHeight - 20, { nextSectionTop: normal.nextSectionTop, viewportHeight: normal.viewportHeight });
      report.layouts.push({ width, zoom: 1, ...normal });
      const dimensions = requestedHeight ? `${width}x${requestedHeight}` : `${width}`;
      await screenshot(page, `hero-${dimensions}.png`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await screenshot(page, `hero-viewport-${dimensions}.png`, false);

      await page.evaluate(() => { document.documentElement.style.zoom = '2'; window.scrollTo(0, 0); });
      const zoomed = await geometry(page);
      layoutChecks(`${width} at 200% CSS zoom`, zoomed);
      report.layouts.push({ width, zoom: 2, ...zoomed });
      await screenshot(page, `hero-zoom-${dimensions}.png`);
    });
  }
  await scenario('Hero without JavaScript', 390, async page => {
    await load(page);
    const hero = await facts(page);
    check('No-JS: hero primary booking remains a native link', hero.bookingLinks.length === 1 && hero.bookingLinks[0] === expectedBook, hero.bookingLinks);
    reviewChecks('No-JS', hero.reviews);
    check('No-JS: hero text and photograph remain visible', hero.brand === 'KRAWL THROUGH KRAKOW' && hero.image.decoded && await page.locator('#hero-title').isVisible());
  }, { javaScriptEnabled: false });
} finally {
  await browser.close();
  check('No uncaught JavaScript errors', report.pageErrors.length === 0, report.pageErrors);
  report.summary = { pass: report.checks.filter(item => item.status === 'pass').length, fail: report.checks.filter(item => item.status === 'fail').length };
  const reportFile = path.join(out, option('--report', 'hero-audit.json'));
  await writeFile(reportFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report.summary, reportFile, failures: report.checks.filter(item => item.status !== 'pass') }, null, 2));
  if (report.summary.fail) process.exitCode = 1;
}
