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
const only = option('--only', '');
const reportName = option('--report', 'interaction-audit.json');
const expectedCssHash = createHash('sha256').update(await readFile('staging/wp-content/mu-plugins/ktk-homepage-assets/site.css')).digest('hex').slice(0, 12);
const expectedJsHash = createHash('sha256').update(await readFile('staging/wp-content/mu-plugins/ktk-homepage-assets/site.js')).digest('hex').slice(0, 12);
const out = path.resolve('docs/homepage-redesign');
const expectedBook = new URL('store2/pub-crawl-28/#book', url);
const expectedCanonical = new URL(url);
expectedCanonical.search = '';
expectedCanonical.hash = '';
const report = { url, time: new Date().toISOString(), conditions: 'Installed Chrome headless; Android Pixel 7 UA for mobile cases; fresh contexts; no network/CPU throttling; real consent buttons; no checkout submission or guest data entry.', expectedCssHash, expectedJsHash, builds: [], checks: [], observations: {}, screenshots: [], pageErrors: [] };
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const check = (name, pass, detail = null) => report.checks.push({ name, status: pass ? 'pass' : 'fail', detail });
const blocked = (name, detail) => report.checks.push({ name, status: 'blocked', detail });
const screenshot = async (page, name) => {
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  report.screenshots.push(`${name}.png`);
};
const contextFor = async (options = {}) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: options.isMobile === false ? undefined : 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36', ...options });
  context.on('page', page => page.on('pageerror', error => report.pageErrors.push({ url: page.url(), message: error.message })));
  return context;
};
async function loadHomepage(page, target = url) {
  const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const css = await page.locator('link[rel="stylesheet"][href*="ktk-homepage-assets/site.css"]').getAttribute('href', { timeout: 5000 });
  const js = await page.locator('script[src*="ktk-homepage-assets/site.js"]').getAttribute('src', { timeout: 5000 });
  const build = { url: target, css, js, cfCache: response.headers()['cf-cache-status'], age: response.headers().age, robots: response.headers()['x-robots-tag'] };
  report.builds.push(build);
  if (!await page.locator('#hero-title').count() || new URL(css).searchParams.get('v') !== expectedCssHash || new URL(js).searchParams.get('v') !== expectedJsHash) throw new Error(`Stale or unexpected homepage build: ${JSON.stringify(build)}; expected CSS ${expectedCssHash} / JS ${expectedJsHash}`);
  return response;
}
const consentSnapshot = page => page.evaluate(() => {
  const sticky = document.querySelector('.mobile-booking');
  const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
  const consentRules = [];
  const visitRules = rules => { for (const rule of rules) { if (rule.selectorText?.includes('iubenda-tp-btn') && (rule.style?.bottom || rule.style?.inset)) consentRules.push(rule.cssText); if (rule.cssRules) visitRules(rule.cssRules); } };
  for (const sheet of document.styleSheets) { try { visitRules(sheet.cssRules); } catch (_) { /* Cross-origin sheets cannot be inspected. */ } }
  return {
    analytics: window.KTK_ANALYTICS_CONSENT,
    commands: (window.dataLayer || []).filter(item => item && item[0] === 'consent').map(item => Array.from(item)),
    events: (window.dataLayer || []).map(item => item?.event).filter(event => event?.startsWith('iubenda_')),
    bannerVisible: [...document.querySelectorAll('#iubenda-cs-banner, .iubenda-cs-container, #iubenda-iframe.iubenda-iframe-visible')].some(item => item.getClientRects().length > 0),
    stickyHidden: sticky?.hidden,
    stickyRect: sticky && !sticky.hidden ? rect(sticky) : null,
    floatingConsentControls: [...document.querySelectorAll('.iubenda-tp-btn')].filter(element => element.getClientRects().length > 0).map(element => ({ ...rect(element), markup: element.outerHTML, inlineStyle: element.getAttribute('style'), computedBottom: getComputedStyle(element).bottom, bodyClass: document.body.className, parent: element.parentElement?.tagName })),
    consentRules,
    visibleConsentContainers: [...document.querySelectorAll('[id*="iubenda"],iframe')].filter(element => element.getClientRects().length > 0).map(element => ({ tag: element.tagName, id: element.getAttribute('id'), class: element.getAttribute('class'), title: element.getAttribute('title'), role: element.getAttribute('role'), src: element.getAttribute('src'), ...rect(element) })),
  };
});
async function chooseConsent(page, choice) {
  const button = page.getByRole('button', { name: new RegExp(`^${choice}(?: all)?$`, 'i') }).first();
  try { await button.waitFor({ state: 'visible', timeout: 20000 }); }
  catch { blocked(`Consent ${choice} UI available`, await consentSnapshot(page)); return false; }
  await button.click();
  await page.waitForTimeout(1200);
  return true;
}
async function scenario(name, run) {
  if (only && !name.toLowerCase().includes(only.toLowerCase())) return;
  try { await run(); } catch (error) {
    check(name, false, error.message);
  }
}

try {
  for (const choice of ['Reject', 'Accept']) {
    await scenario(`Consent ${choice} scenario`, async () => {
      const context = await contextFor();
      try {
        const page = await context.newPage();
        await loadHomepage(page);
        await page.getByRole('button', { name: /^Reject$/i }).first().waitFor({ state: 'visible', timeout: 20000 });
        await page.evaluate(() => window.scrollTo(0, document.querySelector('#included').offsetTop + 400));
        await page.waitForTimeout(400);
        const before = await consentSnapshot(page);
        check(`${choice}: sticky hidden while banner is open`, before.bannerVisible && before.stickyHidden, before);
        await screenshot(page, `interaction-consent-before-${choice.toLowerCase()}`);
        if (!(await chooseConsent(page, choice))) return;
        await page.waitForFunction(expected => window.KTK_ANALYTICS_CONSENT === expected, choice === 'Accept', { timeout: 10000 }).catch(() => {});
        const after = await consentSnapshot(page);
        report.observations[`consent${choice}`] = { before, after };
        check(`${choice}: Clarity bridge reflects actual choice`, after.analytics === (choice === 'Accept'), after.analytics);
        const latestStorage = [...after.commands].reverse().find(command => command[2]?.analytics_storage)?.[2];
        check(`${choice}: Google consent command reflects actual choice`, latestStorage?.analytics_storage === (choice === 'Accept' ? 'granted' : 'denied'), latestStorage || after.commands);
        check(`${choice}: banner dismissed`, !after.bannerVisible);
        check(`${choice}: mobile booking becomes available beyond hero`, after.stickyHidden === false);
        check(`${choice}: floating consent control does not overlap booking bar`, after.floatingConsentControls.every(control => !after.stickyRect || control.right <= after.stickyRect.left || control.left >= after.stickyRect.right || control.bottom <= after.stickyRect.top || control.top >= after.stickyRect.bottom), { consentControls: after.floatingConsentControls, booking: after.stickyRect });
        await screenshot(page, `interaction-consent-after-${choice.toLowerCase()}`);
        await page.locator('a.iubenda-cs-preferences-link').click();
        await page.waitForFunction(() => [...document.querySelectorAll('#iubenda-cs-banner, .iubenda-cs-container, #iubenda-iframe.iubenda-iframe-visible')].some(element => element.getClientRects().length > 0), undefined, { timeout: 10000 }).catch(() => {});
        await page.evaluate(() => window.scrollTo(0, document.querySelector('#included').offsetTop + 400));
        await page.waitForTimeout(500);
        const reopened = await consentSnapshot(page);
        report.observations[`consent${choice}`].reopened = reopened;
        check(`${choice}: cookie preferences reopen through actual link`, reopened.bannerVisible, reopened);
        check(`${choice}: sticky hidden while reopened preferences are visible`, reopened.bannerVisible && reopened.stickyHidden, reopened);
        await screenshot(page, `interaction-consent-reopened-${choice.toLowerCase()}`);
      } finally { await context.close(); }
    });
  }

  await scenario('Navigation, FAQ and metadata', async () => {
    const context = await contextFor();
    try {
      const page = await context.newPage();
      const response = await loadHomepage(page);
      await chooseConsent(page, 'Reject');
      const toggle = page.locator('.menu-toggle');
      await toggle.click();
      check('Mobile menu opens', await toggle.getAttribute('aria-expanded') === 'true' && await page.locator('#main-nav').isVisible());
      check('Opening mobile menu focuses its first navigation link', await page.locator('#main-nav a').first().evaluate(el => el === document.activeElement));
      await page.keyboard.press('Tab');
      check('Tab progresses through mobile navigation links', await page.locator('#main-nav a').nth(1).evaluate(el => el === document.activeElement));
      await page.keyboard.press('Escape');
      check('Escape closes menu and restores toggle focus', await toggle.getAttribute('aria-expanded') === 'false' && await toggle.evaluate(el => el === document.activeElement));
      await toggle.click();
      for (let i = 0; i < 9 && await page.locator('.site-header').evaluate(el => el.contains(document.activeElement)); i++) await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      check('Keyboard focus can leave header and closes mobile menu', !(await page.locator('.site-header').evaluate(el => el.contains(document.activeElement))) && await toggle.getAttribute('aria-expanded') === 'false');
      const nav = await page.locator('#main-nav a').evaluateAll(anchors => anchors.map(anchor => ({ text: anchor.textContent.trim(), hash: anchor.hash })));
      for (const item of nav) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await toggle.click();
        await page.locator(`#main-nav a[href="${item.hash}"]`).click();
        await page.waitForTimeout(600);
        const destinationExists = await page.locator(item.hash).count();
        check(`Navigation anchor ${item.text}`, new URL(page.url()).hash === item.hash && destinationExists === 1 && await toggle.getAttribute('aria-expanded') === 'false');
      }
      const details = page.locator('.faq-list details');
      for (let i = 0; i < await details.count(); i++) {
        const item = details.nth(i);
        const summary = item.locator('summary');
        await summary.click();
        const opened = await item.evaluate(el => el.open);
        await summary.focus();
        await page.keyboard.press('Enter');
        check(`FAQ ${i + 1} pointer opens and keyboard closes`, opened && !(await item.evaluate(el => el.open)));
      }
      const ctas = await page.locator('a[data-book]').evaluateAll(anchors => anchors.map(anchor => ({ position: anchor.dataset.book, href: anchor.href })));
      check('Every primary CTA uses current staging product and booking fragment', ctas.length >= 5 && ctas.every(cta => {
        const target = new URL(cta.href);
        return target.origin === expectedBook.origin && target.pathname === expectedBook.pathname && target.hash === expectedBook.hash && !target.searchParams.has('order');
      }), ctas);
      const metadata = await page.evaluate(() => {
        const values = selector => [...document.querySelectorAll(selector)].map(el => el.content || el.href || el.textContent.trim());
        const schemas = values('script[type="application/ld+json"]').map(text => { try { return JSON.parse(text); } catch (error) { return { parseError: error.message }; } });
        return { titles: values('title'), h1: values('h1'), descriptions: values('meta[name="description"]'), canonical: values('link[rel="canonical"]'), robots: values('meta[name="robots"]'), ogTitle: values('meta[property="og:title"]'), viewport: values('meta[name="viewport"]'), schemas };
      });
      report.observations.metadata = metadata;
      check('One title, H1, description, canonical and Open Graph title', ['titles', 'h1', 'descriptions', 'canonical', 'ogTitle'].every(key => metadata[key].length === 1));
      check('One viewport definition with user zoom allowed', metadata.viewport.length === 1 && !/user-scalable\s*=\s*(?:no|0)|maximum-scale\s*=\s*1(?:\D|$)/i.test(metadata.viewport[0]), metadata.viewport);
      const graph = metadata.schemas.flatMap(schema => schema['@graph'] || [schema]);
      check('Structured data parses with one organization, website and page', metadata.schemas.length === 1 && ['Organization', 'WebSite', 'WebPage'].every(type => graph.filter(node => node['@type'] === type).length === 1) && !graph.some(node => node.parseError || node.aggregateRating || node.review || node.address));
      check('Staging response and HTML are noindex', response.headers()['x-robots-tag']?.includes('noindex') && metadata.robots.length === 1 && metadata.robots[0].includes('noindex'), { header: response.headers()['x-robots-tag'], meta: metadata.robots });
      check('Staging canonical is self-referential', metadata.canonical[0] === expectedCanonical.href);
      const useful = await page.locator('a[href^="tel:"],a[href^="mailto:"],a[href*="maps.app.goo.gl"]').evaluateAll(anchors => anchors.map(anchor => anchor.href));
      check('Directions, phone and email have verified destinations', useful.includes('https://maps.app.goo.gl/S3kQZC5rdABdpA1G9') && useful.includes('tel:+48791847981') && useful.includes('mailto:pubthroughkrakow@gmail.com'), useful);
    } finally { await context.close(); }
  });

  for (const storageBlocked of [false, true]) {
    await scenario(`Attribution storage ${storageBlocked ? 'blocked' : 'available'}`, async () => {
      const context = await contextFor();
      try {
        if (storageBlocked) await context.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Storage blocked for browser verification', 'SecurityError'); } }));
        const page = await context.newPage();
        const landing = new URL(url);
        landing.searchParams.set('utm_source', 'ktk-homepage-qa');
        landing.searchParams.set('utm_campaign', 'redesign-check');
        await loadHomepage(page, landing.href);
        await chooseConsent(page, 'Reject');
        const actual = await page.locator('[data-book="hero"]').getAttribute('href');
        const book = new URL(actual);
        check(`Landing attribution retained with storage ${storageBlocked ? 'blocked' : 'available'}`, book.searchParams.get('utm_source') === 'ktk-homepage-qa' && book.searchParams.get('utm_campaign') === 'redesign-check' && book.hash === '#book', actual);
        if (!storageBlocked) check('Landing attribution stored under existing trk keys', await page.evaluate(() => localStorage.getItem('trk_utm_source')) === 'ktk-homepage-qa');
        // Alter one real link transiently to exercise existing parameters on a native click.
        await page.locator('[data-book="hero"]').evaluate(anchor => {
          const target = new URL(anchor.href);
          target.search = '?utm_source=existing-source&coupon=existing-value';
          target.hash = '#book';
          anchor.href = target.href;
          anchor.addEventListener('click', event => event.preventDefault(), { once: true });
        });
        await page.locator('[data-book="hero"]').click();
        const amended = new URL(await page.locator('[data-book="hero"]').getAttribute('href'));
        check(`Existing params and fragment preserved with storage ${storageBlocked ? 'blocked' : 'available'}`, amended.searchParams.get('utm_source') === 'existing-source' && amended.searchParams.get('coupon') === 'existing-value' && amended.searchParams.get('utm_campaign') === 'redesign-check' && amended.hash === '#book', amended.href);
        const external = page.locator('a[href*="instagram.com"]').first();
        const externalBefore = await external.getAttribute('href');
        await external.evaluate(anchor => anchor.addEventListener('click', event => event.preventDefault(), { once: true }));
        await external.click();
        check(`External link unchanged with storage ${storageBlocked ? 'blocked' : 'available'}`, await external.getAttribute('href') === externalBefore, externalBefore);
      } finally { await context.close(); }
    });
  }

  await scenario('JavaScript-disabled primary link', async () => {
    const context = await contextFor({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await loadHomepage(page);
      const heroCta = page.locator('[data-book="hero"]');
      const href = await heroCta.getAttribute('href');
      await heroCta.click();
      await page.waitForURL(target => target.pathname === expectedBook.pathname, { timeout: 60000 });
      check('Primary link reaches product document without homepage JavaScript', href === expectedBook.href && new URL(page.url()).pathname === expectedBook.pathname, { destination: page.url(), note: 'The existing product application itself requires JavaScript; no checkout attempted.' });
    } finally { await context.close(); }
  });

  await scenario('Real booking handoff', async () => {
    const context = await contextFor();
    try {
      const page = await context.newPage();
      const apiErrors = [];
      const disallowed = [];
      page.on('response', response => { if (/ktk-storefront|ktk-api/.test(response.url()) && response.status() >= 400) apiErrors.push({ status: response.status(), url: response.url().split('?')[0] }); });
      await page.route('**/*', route => {
        const request = route.request();
        if (request.method() !== 'GET' && /\/(?:cart|checkout)(?:\/|$)/.test(new URL(request.url()).pathname)) { disallowed.push({ method: request.method(), url: request.url().split('?')[0] }); return route.abort(); }
        return route.continue();
      });
      await loadHomepage(page);
      await chooseConsent(page, 'Reject');
      const start = performance.now();
      await page.locator('[data-book="hero"]').click();
      await page.locator('#build-your-booking').waitFor({ state: 'visible', timeout: 60000 });
      const elapsedMs = Math.round(performance.now() - start);
      const controls = await page.locator('#build-your-booking input,#build-your-booking select,#build-your-booking button').count();
      report.observations.bookingHandoff = { elapsedMs, destination: page.url(), controls, apiErrors, blockedMutationRequests: disallowed, conditions: 'Fresh browser, ordinary connection, no throttling; measured native CTA click to visible booking form. No guest data, cart or payment action.' };
      check('Real current product booking form becomes available', new URL(page.url()).pathname === expectedBook.pathname && controls > 0 && apiErrors.length === 0, report.observations.bookingHandoff);
      check('No reservation or checkout mutation requested', disallowed.length === 0, disallowed);
      await screenshot(page, 'interaction-booking-handoff');
    } finally { await context.close(); }
  });

  for (const width of [390, 1440]) {
    await scenario(`CSS zoom and reduced motion ${width}`, async () => {
      const context = await contextFor({ viewport: { width, height: width < 768 ? 844 : 1000 }, isMobile: width < 768, hasTouch: width < 768, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        await loadHomepage(page);
        await chooseConsent(page, 'Reject');
        const reduced = await page.evaluate(() => ({ matches: matchMedia('(prefers-reduced-motion: reduce)').matches, scroll: getComputedStyle(document.documentElement).scrollBehavior, transition: getComputedStyle(document.querySelector('.button')).transitionDuration }));
        check(`Reduced motion is respected at ${width}`, reduced.matches && reduced.scroll === 'auto' && reduced.transition.split(',').every(value => parseFloat(value) === 0), reduced);
        await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
        await page.waitForTimeout(300);
        const zoom = await page.evaluate(() => ({
          viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, zoom: getComputedStyle(document.documentElement).zoom,
          overflowing: [...document.querySelectorAll('.site-header *,main *, .site-footer *, .mobile-booking *')].map(el => ({ tag: el.tagName, class: el.className?.baseVal ?? el.className, text: el.childElementCount ? '' : el.textContent.trim().slice(0, 60), left: Math.round(el.getBoundingClientRect().left), right: Math.round(el.getBoundingClientRect().right) })).filter(el => el.right > innerWidth + 1 || el.left < -1).slice(0, 18),
        }));
        check(`200% CSS zoom does not overflow at ${width}`, zoom.scrollWidth <= zoom.clientWidth + 1, zoom);
        await screenshot(page, `interaction-zoom-${width}`);
      } finally { await context.close(); }
    });
  }
} finally {
  await browser.close();
  check('No uncaught page JavaScript errors', report.pageErrors.length === 0, report.pageErrors);
  report.summary = { pass: report.checks.filter(c => c.status === 'pass').length, fail: report.checks.filter(c => c.status === 'fail').length, blocked: report.checks.filter(c => c.status === 'blocked').length };
  await writeFile(path.join(out, reportName), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report.summary, failures: report.checks.filter(c => c.status !== 'pass'), pageErrors: report.pageErrors, bookingHandoff: report.observations.bookingHandoff }, null, 2));
  if (report.summary.fail || report.summary.blocked) process.exitCode = 1;
}
