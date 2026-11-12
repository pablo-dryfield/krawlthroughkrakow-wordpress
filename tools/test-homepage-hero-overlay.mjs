import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));
}
const option = (key, fallback) => process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : fallback;
const target = new URL(option('--url', 'http://127.0.0.1:5184/'));
const label = option('--label', 'halloweekend-overlay-local');
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a simple report label.');
const local = ['127.0.0.1', 'localhost'].includes(target.hostname);
if (!local && !(target.origin === 'https://krawlthroughkrakow.com' && target.pathname === '/staging/')) throw new Error('Only local or staging tests allowed.');
const report = { url: target.href, checkedAt: new Date().toISOString(), checks: [], errors: [] };
const check = (name, pass, detail) => report.checks.push({ name, pass: Boolean(pass), detail });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function align(page, selector) {
  await page.locator(selector).evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY - innerHeight * 0.25));
  await page.waitForTimeout(200);
}
async function inventory(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('#ktk-seasonal-hero');
    const cta = document.querySelector('#ktk-cta');
    const visible = element => element && getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0;
    const inView = element => { if (!element) return false; const r = element.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
    const reviews = document.querySelector('.ktk-hero-reviews');
    const times = document.querySelector('.ktk-hero-panel--nye .ktk-hero-times');
    const rect = cta.getBoundingClientRect();
    const ctaVisible = !!visible(cta);
    const collisions = [...document.querySelectorAll('.ktk-hero-review-name,.ktk-hero-review-count,.ktk-hero-review-rating,.ktk-hero-review-icon,.ktk-hero-times dt,.ktk-hero-times dd')].filter(visible).flatMap(element => {
      const r = element.getBoundingClientRect();
      const width = Math.min(rect.right, r.right) - Math.max(rect.left, r.left);
      const height = Math.min(rect.bottom, r.bottom) - Math.max(rect.top, r.top);
      return ctaVisible && width > 1 && height > 1 ? [{ text: element.textContent || element.getAttribute('class'), width, height }] : [];
    });
    return { width: hero.clientWidth, ctaVisible, reviewsVisible: inView(reviews), timesVisible: inView(times), collisions };
  });
}
function checkState(name, state) {
  const hidden = (state.width <= 1099 && state.reviewsVisible) || (state.width <= 599 && state.timesVisible);
  check(name, state.ctaVisible !== hidden && state.collisions.length === 0, state);
}
try {
  for (const width of [320, 390, 768, 1440]) for (const variant of ['default', 'nye']) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage();
      const name = `${variant}-${width}`;
      page.on('pageerror', error => report.errors.push({ name, message: error.message }));
      const url = new URL(target); if (variant === 'nye') url.searchParams.set('ktk_hero', 'nye');
      await page.goto(url.href, { waitUntil: 'load', timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      if (!local) {
        const reject = page.getByRole('button', { name: /^Reject(?: all)?$/i }).first();
        await reject.waitFor({ state: 'visible', timeout: 25000 });
        await reject.focus(); await page.keyboard.press('Enter');
      }
      await align(page, '.ktk-hero-reviews');
      const row = await inventory(page);
      check(`${name}: reviews are visible for the overlay test`, row.reviewsVisible, row);
      checkState(`${name}: reviews and arrows are unobstructed`, row);
      await page.screenshot({ path: `docs/homepage-seasonal-hero/${label}-${name}-reviews.png` });
      await page.setViewportSize({ width: width < 1100 ? 1440 : 390, height: 844 });
      await align(page, '.ktk-hero-reviews');
      checkState(`${name}: resize updates floating visibility`, await inventory(page));
      await page.setViewportSize({ width, height: 844 });
      await align(page, '.ktk-hero-reviews');
      checkState(`${name}: original viewport visibility restores`, await inventory(page));
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
      await align(page, '.ktk-hero-reviews');
      checkState(`${name}: CSS zoom updates container visibility`, await inventory(page));
      await page.evaluate(() => { document.documentElement.style.zoom = ''; });
      if (variant === 'nye') {
        await align(page, '.ktk-hero-times');
        checkState(`${name}: NYE timing protection remains correct`, await inventory(page));
      }
      await page.locator('#ktk-seasonal-hero').evaluate(element => scrollTo(0, element.getBoundingClientRect().bottom + scrollY + 50));
      await page.waitForTimeout(200);
      const below = await inventory(page);
      check(`${name}: floating booking returns below hero`, below.ctaVisible && !below.reviewsVisible && !below.timesVisible, below);
    } catch (error) { check(`${variant}-${width}: scenario completed`, false, error.message); }
    finally { await context.close(); }
  }
} finally {
  await browser.close();
  check('No uncaught JavaScript errors', report.errors.length === 0, report.errors);
  report.summary = { pass: report.checks.filter(item => item.pass).length, fail: report.checks.filter(item => !item.pass).length };
  await writeFile(`docs/homepage-seasonal-hero/${label}-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report.summary, failures: report.checks.filter(item => !item.pass) }, null, 2));
  if (report.summary.fail) process.exitCode = 1;
}
