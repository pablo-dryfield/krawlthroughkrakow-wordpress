import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));
}
const destination = 'https://krawlthroughkrakow.com/staging/store2/halloween-pub-crawl-51/#book';
const output = 'docs/homepage-seasonal-hero';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checkedAt: new Date().toISOString(), destination, readOnly: true, views: [] };
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const productResponses = [];
    const pageErrors = [];
    const failedFirstPartyRequests = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => {
      if (/krawlthroughkrakow\.com|omni-lodge\.com/.test(new URL(request.url()).hostname)) {
        failedFirstPartyRequests.push({ url: request.url(), failure: request.failure()?.errorText });
      }
    });
    page.on('response', response => {
      if (response.url().includes('/products/halloween-pub-crawl-51')) productResponses.push({ url: response.url(), status: response.status() });
    });
    const response = await page.goto(destination, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('heading', { name: 'Halloween Pub Crawl', exact: true }).first().waitFor({ state: 'visible', timeout: 45000 });
    await page.getByRole('button', { name: /add to cart/i }).waitFor({ state: 'visible', timeout: 30000 });
    await page.locator('#build-your-booking').waitFor({ state: 'attached', timeout: 15000 });
    await page.locator('#build-your-booking').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/halloweekend-product-check-${name}.png`, fullPage: false });
    const state = await page.evaluate(() => {
      const booking = document.querySelector('#build-your-booking');
      const root = document.querySelector('#ktk-storefront-root');
      const scope = booking || root;
      return {
        title: document.title,
        headingTexts: Array.from(document.querySelectorAll('h1,h2,h3')).map(node => node.textContent.trim()),
        bookingAnchorPresent: Boolean(booking),
        bookingAnchor: booking?.id,
        bookHashAlias: location.hash === '#book',
        bookingText: scope?.innerText,
        fields: Array.from(scope?.querySelectorAll('input,select,textarea') || []).map(node => ({ tag: node.tagName, type: node.getAttribute('type'), name: node.getAttribute('name'), placeholder: node.getAttribute('placeholder'), required: node.required, disabled: node.disabled, optionLabels: node.tagName === 'SELECT' ? Array.from(node.options).map(option => option.textContent.trim()).slice(0,8) : undefined })),
        buttons: Array.from(scope?.querySelectorAll('button') || []).map(node => ({ text: node.textContent.trim(), disabled: node.disabled })),
        hasExperienceError: /this experience link is invalid|experiences are taking a breather|catalog is temporarily unavailable/i.test(root?.innerText || ''),
      };
    });
    report.views.push({ name, viewport, documentStatus: response.status(), finalUrl: page.url(), productResponses, pageErrors, failedFirstPartyRequests, ...state });
    await context.close();
  }
  await writeFile(`${output}/halloweekend-product-check.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
