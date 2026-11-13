import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base = process.argv[2] || 'http://127.0.0.1:5173/';
const label = process.argv[3] || 'local';
const blockClarity = process.env.KTK_TEST_BLOCK_CLARITY === '1';
const cacheToken = process.env.KTK_TEST_CACHE_TOKEN || '';
const navigationUrl = route => {
  const url = new URL(route, base);
  if (cacheToken) url.searchParams.set('ktk_smoke', cacheToken);
  return url.href;
};
const product = { id: 28, slug: 'pub-crawl-28', name: 'Pub Crawl', images: [], imageUrl: '',
  price: { amount: 120, currency: 'PLN' }, config: { participantMode: 'gender_split', minParticipants: 0,
    maxParticipants: 300, dateRequired: true, timeMode: 'fixed', defaultStartTime: '21:00',
    fullNameRequired: true, emailRequired: true, phoneRequired: true },
  addons: [{ id: 2, name: 'T-Shirts', price: { amount: 44, currency: 'PLN' },
    config: { minQuantity: 1, maxQuantity: 10, selectionMode: 'range' },
    inventory: { tracked: true, availableQuantity: 10, inStock: true, variantSelectionRequired: true,
      variants: [{ value: 'XL', label: 'XL', availableQuantity: 10, inStock: true }] } }],
};
const initial = { key: 'original-ticket', cartItemNumber: 1, productId: 28, productName: product.name,
  productSlug: product.slug, product, quantity: 1, estimatedTotal: 120, experienceDate: '2030-12-14',
  experienceTime: '21:00', addons: [], options: { participants: { men: 1, women: 0 } } };
const report = { label, base, checkedAt: new Date().toISOString(), checks: [], errors: [], realMutations: 0, clarityRequestsBlocked: blockClarity, cacheToken };
const out = 'docs/cart-experience-updates';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    let conflictNextQuote = false, allowCheckout = false;
    const quotes = [];
    page.on('pageerror', error => report.errors.push(error.message));
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (blockClarity && (url.hostname === 'clarity.ms' || url.hostname.endsWith('.clarity.ms'))) return route.abort();
      if (/\/(?:ktk-api|wp-json\/ktk-storefront\/v1)\/products(?:\/|$)/.test(url.pathname)) {
        return route.fulfill({ json: { product, products: [product], storefrontConfig: {} } });
      }
      if (url.pathname.endsWith('/cart/quote')) {
        const body = request.postDataJSON();
        quotes.push(body);
        if (conflictNextQuote) {
          conflictNextQuote = false;
          return route.fulfill({ status: 409, json: { message: 'This cart changed on another device. Review your selections before continuing.' } });
        }
        const items = body.items.map(item => {
          const addons = item.addons.map(addon => ({ ...addon, name: 'T-Shirts', unitPrice: 44, total: 44 * addon.quantity }));
          const addonTotal = addons.reduce((sum, addon) => sum + addon.total, 0);
          return { ...item, productName: product.name, productSlug: product.slug, unitPrice: 120,
            baseTotal: 120 * item.quantity, addonTotal, total: 120 * item.quantity + addonTotal, addons };
        });
        return route.fulfill({ json: { currency: 'PLN', items, total: items.reduce((n, i) => n + i.total, 0),
          subtotal: items.reduce((n, i) => n + i.baseTotal, 0), addonTotal: items.reduce((n, i) => n + i.addonTotal, 0),
          discountTotal: 0, discountCodes: [], ongoingCart: {
            publicId: body.ongoingCartPublicId || '25ae7a5a-1dc8-4ef0-a404-5b0e1bf6af8d',
            sessionId: body.cartSessionId, cartVersion: 'b'.repeat(64), status: 'active',
          } } });
      }
      if (url.pathname.endsWith('/checkout') && allowCheckout) return route.fulfill({ json: {
        publicId: 'isolated-order', confirmationToken: 'isolated-token', paymentMode: 'payment_element',
        paymentIntentId: 'pi_isolated', clientSecret: 'isolated-secret', publishableKey: 'pk_test_isolated',
      } });
      // Never send an order, payment, cart activity or email to a live backend.
      if (request.method() !== 'GET' || url.hostname === 'js.stripe.com') {
        return route.fulfill({ status: 400, json: { message: 'Isolated test: checkout disabled.' } });
      }
      return route.continue();
    });
    await page.addInitScript(seed => {
      if (window.top !== window) return;
      // No Stripe network/payment calls: hold confirmation locally to inspect the UI lock.
      window.Stripe = () => ({ elements: () => ({ create: () => {
        const events = {};
        return { on: (name, callback) => { events[name] = callback; },
          mount: () => setTimeout(() => events.ready?.(), 0), destroy: () => {} };
      } }), confirmPayment: () => new Promise(resolve => {
        window.__resolveTestPayment = () => resolve({ error: { message: 'Isolated test payment not submitted.' } });
      }) });
      if (!sessionStorage.getItem('cart-test-seeded') && !localStorage.getItem('ktk-storefront-cart-v1')) {
        localStorage.clear();
        localStorage.setItem('ktk-storefront-cart-v1', JSON.stringify([seed]));
        localStorage.setItem('ktk-storefront-contact-v1', JSON.stringify({ fullName: 'Booking Test', email: 'booking@example.invalid', phone: '+48500100200', phoneCountry: 'PL' }));
        sessionStorage.setItem('cart-test-seeded', '1');
      }
    }, initial);
    await page.goto(navigationUrl('pub-crawl-28'), { waitUntil: 'domcontentloaded' });
    if (base.startsWith('https:')) {
      await page.mouse.wheel(0, 5);
      const reject = page.getByRole('button', { name: /^Reject(?: all)?$/i }).first();
      await reject.click({ timeout: 30000 });
    }
    const update = page.getByRole('button', { name: /^Update booking/ });
    await update.waitFor();
    assert.equal((await page.getByRole('button', { name: 'Number of men: 1', exact: true }).innerText()).trim(), '1');
    report.checks.push(`${width}: returned product form prefills existing guests and shows Update booking`);
    await page.getByRole('button', { name: /^T-Shirts: / }).click();
    await page.getByRole('option', { name: /^1 / }).click();
    await page.getByRole('button', { name: /^XL T-shirt quantity: / }).click();
    await page.getByRole('option', { name: '1', exact: true }).click();
    await update.click();
    await page.waitForURL('**/cart');
    await page.waitForFunction(() => {
      const c = JSON.parse(localStorage.getItem('ktk-storefront-cart-v1'));
      return c.length === 1 && c[0].addons.length === 1;
    });
    const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('ktk-storefront-cart-v1')));
    assert.equal(cart[0].key, initial.key);
    assert.equal(cart[0].quantity, 1);
    assert.equal(cart[0].estimatedTotal, 164);
    assert.deepEqual(cart[0].addons[0].variants, [{ value: 'XL', quantity: 1 }]);
    assert.equal(await page.locator('.ktk-cart-line').count(), 1);
    report.checks.push(`${width}: shirt selection replaces one ticket, preserves its identity and totals 164 PLN`);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('ktk-storefront-cart-v1'))[0].addons.length === 0);
    report.checks.push(`${width}: Undo restores original one-ticket selection`);
    await page.goto(navigationUrl('pub-crawl-28'), { waitUntil: 'domcontentloaded' });
    await update.waitFor();
    const other = await context.newPage();
    await other.goto(navigationUrl('cart'), { waitUntil: 'domcontentloaded' });
    await other.locator('.ktk-cart-line').waitFor();
    await other.evaluate(() => {
      const items = JSON.parse(localStorage.getItem('ktk-storefront-cart-v1'));
      items.push({ ...items[0], key: 'other-date', cartItemNumber: 2, experienceDate: '2030-12-15' });
      localStorage.setItem('ktk-storefront-cart-v1', JSON.stringify(items));
    });
    await page.getByRole('button', { name: /^T-Shirts: / }).click();
    await page.getByRole('option', { name: /^1 / }).click();
    await page.getByRole('button', { name: /^XL T-shirt quantity: / }).click();
    await page.getByRole('option', { name: '1', exact: true }).click();
    await update.click();
    await page.waitForURL('**/cart');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('ktk-storefront-cart-v1')).length === 2);
    assert.equal(await page.locator('.ktk-cart-line').count(), 2);
    report.checks.push(`${width}: updating from a stale tab preserves another tab's additional date`);
    await other.evaluate(() => {
      const items = JSON.parse(localStorage.getItem('ktk-storefront-cart-v1'));
      items[0].quantity = 3;
      items[0].options.participants = { men: 3, women: 0 };
      localStorage.setItem('ktk-storefront-cart-v1', JSON.stringify(items));
    });
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByText('Your cart changed in another tab. The latest selections are shown.').waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ktk-storefront-cart-v1'))[0].quantity), 3);
    report.checks.push(`${width}: stale Undo loads newer selections instead of overwriting them`);
    await other.close();
    await page.waitForFunction(() => !document.querySelector('[aria-label="Discount code"]')?.disabled);
    conflictNextQuote = true;
    await page.getByRole('textbox', { name: 'Discount code', exact: true }).fill('TEST');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    const review = page.getByRole('button', { name: 'Review and use these selections', exact: true });
    await review.waitFor();
    assert.equal(await page.getByRole('button', { name: 'Edit', exact: true }).first().isDisabled(), true);
    assert.equal(quotes.at(-1).cartVersion, 'b'.repeat(64));
    assert.equal(quotes.at(-1).cartVersionProtocol, 1);
    report.checks.push(`${width}: outdated server revision displays review warning and blocks stale editing`);
    allowCheckout = true;
    const reviewedQuote = page.waitForResponse(response => response.url().endsWith('/cart/quote')
      && !response.request().postDataJSON().ongoingCartPublicId);
    await review.click();
    await reviewedQuote;
    await page.waitForFunction(() => !document.querySelector('[aria-label="Discount code"]')?.disabled);
    assert.equal(quotes.at(-1).ongoingCartPublicId, undefined);
    assert.equal(quotes.at(-1).items[0].quantity, 3);
    assert.equal(quotes.at(-1).items.length, 2);
    report.checks.push(`${width}: explicit review keeps current selections and starts a new opaque draft identity`);
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const pay = page.locator('.ktk-payment-element').getByRole('button', { name: /^Pay / });
    await pay.waitFor();
    await pay.click();
    await page.waitForFunction(() => typeof window.__resolveTestPayment === 'function');
    assert.equal(await page.getByRole('button', { name: 'Remove Pub Crawl', exact: true }).first().isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: /^Update booking/ }).isDisabled(), true);
    assert.equal(await page.getByRole('textbox', { name: 'Discount code', exact: true }).isDisabled(), true);
    report.checks.push(`${width}: pending payment locks removal, full selection editor and discounts`);
    await page.evaluate(() => window.__resolveTestPayment());
    await page.getByText('Isolated test payment not submitted.', { exact: true }).waitFor();
    await page.screenshot({ path: `${out}/${label}-${width}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    report.checks.push(`${width}: no horizontal overflow`);
    await context.close();
  }
  report.legacyIntegrationErrors = report.errors.filter(error => /^(FacebookSignal|fbq) is not defined$/.test(error));
  assert.deepEqual(report.errors.filter(error => !report.legacyIntegrationErrors.includes(error)), []);
} catch (error) {
  report.failure = error.stack;
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${out}/${label}-browser.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
