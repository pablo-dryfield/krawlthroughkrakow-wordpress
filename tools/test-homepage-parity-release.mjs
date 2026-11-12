import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));
}
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const url = option('--url', 'https://krawlthroughkrakow.com/staging/');
const label = option('--label', 'staging-release');
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a simple report label.');
const canonical = new URL(url);
canonical.search = '';
canonical.hash = '';
const book = new URL('store2/pub-crawl-28/', canonical);
const seasonalProduct = new URL(url).searchParams.get('ktk_hero') === 'nye'
  ? { id: '32', slug: 'nye-pub-crawl-32' } : { id: '51', slug: 'halloween-pub-crawl-51' };
const seasonalBook = new URL(`store2/${seasonalProduct.slug}/`, canonical);
const hashes = {};
for (const file of ['parity.css', 'parity-runtime.css', 'parity.js']) {
  hashes[file] = createHash('sha256').update(await readFile(`staging/wp-content/mu-plugins/ktk-homepage-assets/${file}`)).digest('hex').slice(0, 12);
}
const report = { url, capturedAt: new Date().toISOString(), conditions: 'Fresh installed Chrome contexts. Actual consent buttons. No booking or form submission, no customer details. Booking links inspected without navigation.', checks: [], observations: {}, pageErrors: [] };
const check = (name, pass, detail) => report.checks.push({ name, pass: Boolean(pass), detail });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const createContext = options => browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36', ...options });
const consent = page => page.evaluate(() => ({
  analytics: window.KTK_ANALYTICS_CONSENT,
  commands: (window.dataLayer || []).filter(item => item && item[0] === 'consent').map(item => Array.from(item)),
  visible: [...document.querySelectorAll('#iubenda-cs-banner,#iubenda-iframe.iubenda-iframe-visible')].some(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden'),
}));

try {
  for (const choice of ['Reject', 'Accept']) {
    const context = await createContext();
    try {
      const page = await context.newPage();
      page.on('pageerror', error => report.pageErrors.push({ choice, message: error.message }));
      const target = new URL(url);
      target.searchParams.set('utm_source', 'parity-regression');
      target.searchParams.set('utm_campaign', 'homepage-validation');
      const response = await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.mouse.wheel(0, 10);
      const button = page.getByRole('button', { name: new RegExp(`^${choice}(?: all)?$`, 'i') }).first();
      await button.waitFor({ state: 'visible', timeout: 25000 });
      const before = await consent(page);
      check(`${choice}: fresh banner appears before consent`, before.visible && before.analytics === false, before);
      await button.click();
      await page.waitForFunction(expected => window.KTK_ANALYTICS_CONSENT === expected, choice === 'Accept', { timeout: 10000 });
      await page.waitForTimeout(1400);
      const after = await consent(page);
      const last = [...after.commands].reverse().find(command => command[2]?.analytics_storage)?.[2];
      check(`${choice}: consent bridge matches choice`, after.analytics === (choice === 'Accept'), after.analytics);
      check(`${choice}: Google analytics consent matches choice`, last?.analytics_storage === (choice === 'Accept' ? 'granted' : 'denied'), last);
      check(`${choice}: banner dismisses`, !after.visible, after.visible);
      report.observations[choice] = { before, after };

      if (choice === 'Reject') {
        const metadata = await page.evaluate(() => ({
          titleCount: document.querySelectorAll('title').length,
          descriptionCount: document.querySelectorAll('meta[name="description"]').length,
          viewportCount: document.querySelectorAll('meta[name="viewport"]').length,
          canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map(element => element.href),
          robots: [...document.querySelectorAll('meta[name="robots"]')].map(element => element.content),
          sections: document.querySelectorAll('#main-content .et_pb_section').length,
          assets: [...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(element => element.src || element.href),
          booking: [...document.querySelectorAll('a[href*="store2/pub-crawl-28"]')].map(element => ({ href: element.href, label: element.innerText || element.getAttribute('aria-label') || '' })),
          seasonalBooking: [...document.querySelectorAll('.ktk-hero-panel--seasonal .ktk-hero-cta')].map(element => ({ href: element.href, product: element.dataset.productId })),
        }));
        report.observations.metadata = metadata;
        check('One title, description, viewport and canonical', metadata.titleCount === 1 && metadata.descriptionCount === 1 && metadata.viewportCount === 1 && metadata.canonicals.length === 1, metadata);
        check('Canonical stays on staging homepage', metadata.canonicals[0] === canonical.href, metadata.canonicals);
        check('Staging is noindex in HTML and response', metadata.robots.some(value => value.includes('noindex')) && (response.headers()['x-robots-tag'] || '').includes('noindex'), response.headers()['x-robots-tag']);
        check('All 13 production sections are present', metadata.sections === 13, metadata.sections);
        for (const [file, expected] of Object.entries(hashes)) {
          check(`Current ${file} is loaded`, metadata.assets.some(asset => asset.includes(`/ktk-homepage-assets/${file}?`) && new URL(asset).searchParams.get('v') === expected), expected);
        }
        check('No Divi runtime or external Divi stylesheet', !metadata.assets.some(asset => /\/themes\/Divi\/|\/et-cache\//.test(asset)), metadata.assets.filter(asset => /\/themes\/Divi\/|\/et-cache\//.test(asset)));
        check('Primary booking links stay staging and retain attribution', metadata.booking.length >= 3 && metadata.booking.every(link => {
          const target = new URL(link.href);
          return target.origin === book.origin && target.pathname.replace(/\/$/, '') === book.pathname.replace(/\/$/, '') && target.searchParams.get('utm_source') === 'parity-regression' && target.searchParams.get('utm_campaign') === 'homepage-validation';
        }), metadata.booking);
        check('Seasonal booking link identifies its product and retains attribution', metadata.seasonalBooking.length === 1 && metadata.seasonalBooking.every(link => {
          const target = new URL(link.href);
          return link.product === seasonalProduct.id && target.origin === seasonalBook.origin && target.pathname === seasonalBook.pathname && target.hash === '#book'
            && target.searchParams.get('utm_source') === 'parity-regression' && target.searchParams.get('utm_campaign') === 'homepage-validation';
        }), metadata.seasonalBooking);
        const toggle = page.locator('.mobile_menu_bar:visible');
        await toggle.click();
        check('Mobile menu opens accessibly', await toggle.getAttribute('aria-expanded') === 'true' && await page.locator('#mobile_menu').isVisible());
        await page.keyboard.press('Escape');
        check('Escape closes mobile menu', await toggle.getAttribute('aria-expanded') === 'false');
        await page.evaluate(() => scrollTo(0, 600));
        await page.waitForTimeout(400);
        const header = await page.locator('#main-header').evaluate(element => ({ bottom: element.getBoundingClientRect().bottom, position: getComputedStyle(element).position }));
        check('Header scrolls away rather than staying fixed', header.bottom <= 0 && !['fixed', 'sticky'].includes(header.position), header);
      }
      const preferences = page.locator('.iubenda-tp-btn:visible').first();
      await preferences.click();
      await page.waitForFunction(() => [...document.querySelectorAll('#iubenda-cs-banner,#iubenda-iframe.iubenda-iframe-visible')].some(element => element.getClientRects().length), undefined, { timeout: 10000 });
      check(`${choice}: privacy preferences reopen`, (await consent(page)).visible);
      await page.screenshot({ path: `docs/homepage-parity/${label}-consent-${choice.toLowerCase()}.png` });
    } catch (error) { check(`${choice}: scenario completed`, false, error.message); }
    finally { await context.close(); }
  }
  const context = await createContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const links = await page.locator('a[href*="store2/pub-crawl-28"]').evaluateAll(elements => elements.map(element => element.href));
    check('Native booking links exist without JavaScript', links.length >= 3 && links.every(href => new URL(href).pathname.startsWith(book.pathname.replace(/\/$/, ''))), links);
    const seasonalLinks = await page.locator('.ktk-hero-panel--seasonal .ktk-hero-cta').evaluateAll(elements => elements.map(element => ({ href: element.href, product: element.dataset.productId })));
    check('Native seasonal booking link has the correct product without JavaScript', seasonalLinks.length === 1 && seasonalLinks.every(link => link.product === seasonalProduct.id && link.href === seasonalBook.href + '#book'), seasonalLinks);
  } finally { await context.close(); }
  check('No browser JavaScript errors', report.pageErrors.length === 0, report.pageErrors);
} finally {
  await browser.close();
  report.summary = { passed: report.checks.filter(item => item.pass).length, total: report.checks.length };
  await writeFile(`docs/homepage-parity/${label}-smoke.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary));
  if (report.checks.some(item => !item.pass)) process.exitCode = 1;
}
