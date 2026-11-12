import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const url = option('--url', 'http://127.0.0.1:5185/');
const label = option('--label', 'local-behavior');
const checks = [];
function check(name, passed, details) { checks.push({ name, passed: !!passed, details }); }
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [320, 390, 768, 1024, 1100, 1440, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [], mapRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://www.google.com/maps/**', route => { mapRequests.push(route.request().url()); return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Controlled map response</title>' }); });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.waitForTimeout(500);
    const facts = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      sections: document.querySelectorAll('#main-content .et_pb_section').length,
      scripts: [...document.scripts].map(script => script.src).filter(Boolean),
      broken: [...document.images].filter(image => image.getClientRects().length && (!image.complete || !image.naturalWidth)).map(image => image.src),
      unported: [...document.querySelectorAll('a[href]')].filter(a => a.href.startsWith('https://krawlthroughkrakow.com/') && !a.href.startsWith('https://krawlthroughkrakow.com/staging/')).map(a => a.href),
      headerTop: document.querySelector('#main-header').getBoundingClientRect().top,
      cleanLinks: [...document.querySelectorAll('a[href]')].every(a => !/codex-test|test-click-id/.test(a.href))
    }));
    check(`${width}: four sections`, facts.sections === 4);
    check(`${width}: no horizontal overflow`, facts.scrollWidth === facts.width, facts);
    check(`${width}: images rendered`, facts.broken.length === 0, facts.broken);
    check(`${width}: no Divi runtime`, !facts.scripts.some(src => /themes\/Divi|et-cache|jquery/.test(src)), facts.scripts);
    check(`${width}: portable staging links`, !facts.unported.length, facts.unported);
    check(`${width}: no baked test attribution`, facts.cleanLinks);
    await page.evaluate(() => scrollTo(0, 600));
    check(`${width}: header scrolls away`, await page.locator('#main-header').evaluate(e => e.getBoundingClientRect().bottom < 0));
    check(`${width}: floating booking remains visible`, await page.locator('#ktk-cta').evaluate(e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.top < innerHeight && r.bottom > 0; }));
    await page.evaluate(() => scrollTo(0, 0));
    if (width <= 980) {
      const toggle = page.locator('.mobile_menu_bar');
      await toggle.focus(); await page.keyboard.press('Enter');
      check(`${width}: keyboard opens mobile menu`, await toggle.getAttribute('aria-expanded') === 'true');
      await page.keyboard.press('Escape');
      check(`${width}: Escape closes mobile menu`, await toggle.getAttribute('aria-expanded') === 'false');
    } else {
      const trigger = page.locator('#top-menu > .menu-item-has-children > a').first();
      await trigger.focus(); await page.keyboard.press('ArrowDown');
      check(`${width}: keyboard opens desktop submenu`, await trigger.getAttribute('aria-expanded') === 'true');
      await page.keyboard.press('Escape');
      check(`${width}: Escape closes desktop submenu`, await trigger.getAttribute('aria-expanded') === 'false');
    }
    check(`${width}: map requests blocked without consent`, mapRequests.length === 0, mapRequests);
    await page.evaluate(() => { window._iub = window._iub || {}; window._iub.cs = window._iub.cs || {}; window._iub.cs.api = { getPreferences: () => ({ purposes: { 3: true } }) }; window.dispatchEvent(new Event('iubenda_consent_given_purpose_3')); });
    await page.waitForTimeout(100);
    check(`${width}: map sources restored with consent`, await page.locator('iframe[data-ktk-map-src]').evaluateAll(frames => frames.length === 2 && frames.every(f => f.getAttribute('src') === f.dataset.ktkMapSrc)));
    await page.evaluate(() => { window._iub.cs.api = { getPreferences: () => ({ purposes: { 3: false } }) }; window.dispatchEvent(new Event('iubenda_consent_rejected')); });
    check(`${width}: map consent withdrawal`, await page.locator('iframe[data-ktk-map-src]').evaluateAll(frames => frames.every(f => f.getAttribute('src') === 'about:blank')));
    check(`${width}: no page errors`, errors.length === 0, errors);
    await context.close();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  // Landing parameters are exercised only in a fresh isolated context, never user storage.
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'utm_source=page-qa&utm_medium=test&gclid=page-qa-click', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  const tracking = await page.evaluate(() => {
    const anchor = document.querySelector('#ktk-cta');
    anchor.href = location.origin + '/staging/store2/pub-crawl-28/#book';
    anchor.addEventListener('click', e => e.preventDefault());
    window.KTK_ANALYTICS_CONSENT = false; window.dataLayer = [];
    anchor.click();
    const withoutConsent = window.dataLayer.length;
    window.KTK_ANALYTICS_CONSENT = true; anchor.click();
    return { stored: localStorage.getItem('trk_utm_source'), href: anchor.href, withoutConsent, events: window.dataLayer.filter(e => e.event === 'ktk_page_booking_click') };
  });
  check('UTM landing captured', tracking.stored === 'page-qa');
  check('UTM and click ID handed to store', tracking.href.includes('utm_source=page-qa') && tracking.href.includes('gclid=page-qa-click'));
  check('Booking event withheld before consent', tracking.withoutConsent === 0);
  check('One consented non-conversion booking event', tracking.events.length === 1 && tracking.events[0].product_id === 28);
  await context.close();
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });
    check(`${width}: no-JavaScript content and booking`, await page.locator('#main-content').innerText().then(t => t.includes('RESERVE YOUR SPOT!')) && (await page.locator('#ktk-cta').getAttribute('href')).includes('/staging/store2/pub-crawl-28/'));
    check(`${width}: no-JavaScript page fits`, await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
    await page.close();
  }
} finally { await browser.close(); }
const report = { url, checkedAt: new Date().toISOString(), summary: { passed: checks.filter(c => c.passed).length, total: checks.length }, checks };
await writeFile(`docs/code-pages/how-to-join/${label}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ summary: report.summary, failed: checks.filter(c => !c.passed) }, null, 2));
if (checks.some(c => !c.passed)) process.exitCode = 1;
