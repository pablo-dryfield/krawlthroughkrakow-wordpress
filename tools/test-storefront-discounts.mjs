import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base = process.argv[2] || 'http://127.0.0.1:5187/';
const label = process.argv[3] || 'local';
const report = { base, label, checkedAt: new Date().toISOString(), checks: [], errors: [] };
const dir = 'docs/storefront-discounts';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    const quotes = [];
    await context.route('**/*', async route => {
      const req = route.request();
      if (/\/cart\/quote(?:\?|$)/.test(req.url())) {
        const cart = req.postDataJSON();
        quotes.push(cart.discountCodes);
        return route.fulfill({ json: { subtotal: 240, addonTotal: 0, discountTotal: cart.discountCodes.length ? 10 : 0, total: cart.discountCodes.length ? 230 : 240, currency: 'PLN', items: [], discountCodes: cart.discountCodes } });
      }
      if (req.method() !== 'GET' || /js\.stripe\.com/.test(req.url())) {
        return route.fulfill({ status: 400, json: { message: 'Isolated verification: no checkout or tracking submitted.' } });
      }
      return route.continue();
    });
    await page.addInitScript(() => {
      if (window.top !== window) return;
      localStorage.setItem('ktk-storefront-cart-v1', JSON.stringify([{ key: 'qa-cart', productId: 28, productSlug: 'pub-crawl-28', productName: 'Pub Crawl', quantity: 2, experienceDate: '2027-02-01', experienceTime: '21:00', unitPrice: 120, addons: [], options: {} }]));
      localStorage.setItem('ktk-storefront-contact-v1', JSON.stringify({ fullName: 'Discount Test', email: 'discount-test@example.invalid', phone: '+48500100200', phoneCountry: 'PL' }));
      localStorage.setItem('ktk-storefront-discount-v1', JSON.stringify(['FIRST', 'SECOND']));
    });
    await page.goto(new URL('cart/', base).href, { waitUntil: 'domcontentloaded' });
    if (base.startsWith('https:')) {
      await page.mouse.wheel(0, 5);
      await page.getByRole('button', { name: /^Reject(?: all)?$/i }).first().click({ timeout: 30000 });
    }
    await page.locator('.ktk-discount-code').waitFor();
    assert.equal(await page.locator('.ktk-discount-code').count(), 1);
    assert.match(await page.locator('.ktk-discount-code').innerText(), /SECOND/);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('ktk-storefront-discount-v1'))[0] === 'SECOND');
    report.checks.push(`${width}: legacy multi-code storage reduced to latest code`);
    const input = page.getByRole('textbox', { name: 'Discount code', exact: true });
    await input.fill(' third ');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await page.waitForFunction(() => JSON.stringify(JSON.parse(localStorage.getItem('ktk-storefront-discount-v1'))) === '["THIRD"]');
    assert.equal(await page.locator('.ktk-discount-code').count(), 1);
    assert.match(await page.locator('.ktk-discount-code').innerText(), /THIRD/);
    await page.waitForResponse(response => response.url().includes('/cart/quote') && response.request().postDataJSON().discountCodes[0] === 'THIRD');
    assert.ok(quotes.every(codes => codes.length <= 1));
    report.checks.push(`${width}: replacement displays and submits exactly one code`);
    await input.fill('THIRD');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    assert.equal(await page.locator('.ktk-discount-code').count(), 1);
    await page.locator('.ktk-order-summary').screenshot({ path: `${dir}/${label}-${width}.png` });
    report.checks.push(`${width}: repeated code cannot duplicate`);
    await page.getByRole('button', { name: 'Remove discount code THIRD', exact: true }).click();
    await page.waitForFunction(() => localStorage.getItem('ktk-storefront-discount-v1') === null);
    assert.equal(await page.locator('.ktk-discount-code').count(), 0);
    report.checks.push(`${width}: removing code clears storage and UI`);
    await context.close();
  }
  report.legacyIntegrationErrors = report.errors.filter(error => /^(FacebookSignal|fbq) is not defined$/.test(error));
  assert.deepEqual(report.errors.filter(error => !report.legacyIntegrationErrors.includes(error)), []);
} catch (error) {
  report.failure = error.stack;
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${dir}/${label}-browser.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
