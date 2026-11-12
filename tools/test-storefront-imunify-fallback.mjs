import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));
}

const origin = 'http://127.0.0.1:5173';
const legacyPath = '/store/Krakow-Pub-Crawl-with-Krawl-Through-Krakow-p637047413';
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function verify(search, expectedSearch, apiResponse = {
  status: 403,
  contentType: 'application/json',
  body: JSON.stringify({ message: 'Access denied by Imunify360 bot-protection. IPs used for automation should be whitelisted' }),
}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route('**/ktk-api/**', route => route.fulfill(apiResponse));
  await page.route(`https://krawlthroughkrakow.com${legacyPath}*`, route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><title>Legacy product reached</title>',
  }));

  await page.goto(`${origin}/pub-crawl-28/${search}#book`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(url => url.hostname === 'krawlthroughkrakow.com' && url.pathname === legacyPath);
  const destination = new URL(page.url());
  assert.equal(destination.search, expectedSearch);
  assert.equal(destination.hash, '');
  await context.close();
}

try {
  await verify('', '');
  await verify('?utm_source=qa&utm_medium=incident-test', '?utm_source=qa&utm_medium=incident-test');
  await verify('', '', {
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><title>One moment, please...</title>',
  });
  console.log(JSON.stringify({ pass: 3, fail: 0, checks: ['clean URL stays clean', 'visitor attribution is preserved', 'HTTP 200 HTML challenge redirects'] }, null, 2));
} finally {
  await browser.close();
}
