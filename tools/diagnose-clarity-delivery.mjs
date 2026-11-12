import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const label = process.argv[2] || 'baseline';
const report = { label, checkedAt: new Date().toISOString(), requests: [], responses: [], failures: [], errors: [], states: [], blockedCommerce: 0 };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const clarityUrl = value => new URL(value).hostname.endsWith('.clarity.ms');
try {
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== 'GET' && !clarityUrl(url.href)) {
      report.blockedCommerce += 1;
      return route.fulfill({ status: 403, body: 'Diagnostic: unrelated writes disabled' });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('request', request => {
    if (!clarityUrl(request.url())) return;
    const result = { url: request.url(), method: request.method(), bytes: request.postDataBuffer()?.length || 0 };
    const buffer = request.postDataBuffer();
    if (buffer) {
      try {
        const payload = JSON.parse((buffer[0] === 31 && buffer[1] === 139 ? gunzipSync(buffer) : buffer).toString());
        result.envelope = payload.e;
        result.playbackEvents = payload.p?.length || 0;
      } catch { result.payloadUnreadable = true; }
    }
    report.requests.push(result);
  });
  page.on('requestfailed', request => {
    if (clarityUrl(request.url())) report.failures.push({ url: request.url(), error: request.failure()?.errorText });
  });
  page.on('response', async response => {
    if (!clarityUrl(response.url())) return;
    const result = { url: response.url(), status: response.status() };
    if (new URL(response.url()).pathname === '/collect') result.body = await response.text().catch(() => 'unavailable');
    report.responses.push(result);
  });
  await page.goto('https://krawlthroughkrakow.com/store2/pub-crawl-28/', { waitUntil: 'domcontentloaded' });
  await page.mouse.wheel(0, 2);
  const accept = page.getByRole('button', { name: /^Accept(?: all)?$/i }).first();
  await accept.click({ timeout: 30000 });
  await page.waitForFunction(() => window.KTK_ANALYTICS_CONSENT === true, { timeout: 15000 });
  await page.evaluate(label => {
    window.__diagnosticMetadata = [];
    window.clarity('set', 'integration_test', `clarity_delivery_${label}`);
    window.clarity('metadata', (metadata, playback, consent) => window.__diagnosticMetadata.push({ metadata, playback, consent }), true, true, true);
  }, label);
  for (let step = 0; step < 4; step += 1) {
    await page.mouse.wheel(0, step % 2 ? -200 : 200);
    await page.waitForTimeout(6000);
    report.states.push(await page.evaluate(() => ({
      consent: window.KTK_ANALYTICS_CONSENT,
      metadata: window.__diagnosticMetadata,
      scripts: [...document.scripts].filter(s => /clarity|iubenda/.test(s.src)).map(s => ({ src: s.src, type: s.type })),
      cookies: document.cookie.split(';').map(x => x.trim().split('=')[0]).filter(x => /^(?:_clck|_clsk|_iub)/.test(x)),
      queue: JSON.parse(localStorage.getItem('ktk-storefront-journey-events-v1') || '[]'),
      preferences: window._iub?.cs?.api?.getPreferences?.(),
    })));
  }
} catch (error) {
  report.error = error.stack;
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
  await mkdir('docs/clarity-journey-links/delivery', { recursive: true });
  await writeFile(`docs/clarity-journey-links/delivery/${label}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
