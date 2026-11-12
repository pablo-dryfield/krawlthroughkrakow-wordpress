import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const frontend = path.resolve('staging/wp-content/plugins/ktk-storefront/frontend');
const { build } = createRequire(path.join(frontend, 'package.json'))('esbuild');
const bridge = await build({ stdin: { contents: `import * as tracking from './src/journey-tracking.js'; window.testTracking = tracking;`, resolveDir: frontend }, bundle: true, write: false, format: 'iife' });
const collector = await readFile('staging/wp-content/mu-plugins/ktk-homepage-assets/journey.js', 'utf8');
const origin = 'https://krawlthroughkrakow.com';
const key = 'ktk-storefront-journey-events-v1';
const checks = [];
const check = (name, actual, expected = true) => { assert.deepEqual(actual, expected, name); checks.push(name); };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const campaign of ['halloween', 'nye']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    const network = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === origin && (url.pathname === '/staging/' || url.pathname.startsWith('/ktk-homepage-assets/'))) {
        const response = await fetch(`http://127.0.0.1:5184${url.pathname}${url.search}`);
        await route.fulfill({ status: response.status, contentType: response.headers.get('content-type'), body: Buffer.from(await response.arrayBuffer()) });
      } else if (url.origin === origin && url.pathname.startsWith('/store2/')) {
        await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Isolated store handoff</title>' });
      } else {
        network.push(url.href);
        await route.abort();
      }
    });
    await page.goto(`${origin}/staging/?ktk_hero=${campaign}`, { waitUntil: 'load' });
    await page.evaluate(() => document.addEventListener('click', event => event.preventDefault()));
    const events = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), key);
    const consent = allowed => page.evaluate(allowed => {
      window.KTK_ANALYTICS_CONSENT = allowed;
      window.dispatchEvent(new CustomEvent('ktk:analytics-consent', { detail: { analytics: allowed } }));
    }, allowed);
    const click = selector => page.locator(selector).first().evaluate(el => el.click());
    await click('[data-book="hero-regular"]');
    check(`${campaign}: no storage before consent`, await events(), []);
    await consent(false);
    await click('#ktk-cta');
    check(`${campaign}: rejected clicks ignored`, await events(), []);
    await consent(true);
    await consent(true);
    await page.addScriptTag({ content: collector });
    check(`${campaign}: one consented view and idempotent initialization`, (await events()).map(e => e.type), ['homepage_viewed']);
    const targets = [
      ['[data-book="hero-regular"]', 'Hero: regular pub crawl', 'hero-regular'],
      [`[data-book="hero-${campaign}"]`, campaign === 'nye' ? "Hero: New Year's Eve" : 'Hero: Halloweekend', `hero-${campaign}`],
      ['#ktk-cta', 'Floating booking button', 'ktk-cta'],
      ['#top-menu a', 'Header', null],
      ['.ktk-hero-reviews a', 'Hero reviews', null],
      ['#main-footer a', 'Footer', null],
    ];
    for (const [selector, placement, id] of targets) {
      await click(selector);
      const last = (await events()).at(-1);
      check(`${campaign}: ${placement}`, last.details.placement, placement);
      check(`${campaign}: ${placement} label`, Boolean(last.details.buttonLabel));
      if (id) check(`${campaign}: ${placement} id`, last.details.buttonId, id);
    }
    await page.locator('[data-book="hero-regular"]').evaluate(el => el.href += '?email=private%40example.com&utm_source=test');
    await click('[data-book="hero-regular"]');
    check(`${campaign}: query values excluded`, !JSON.stringify((await events()).at(-1)).includes('private'));
    const beforeKeyboard = (await events()).length;
    await page.locator('[data-book="hero-regular"]').focus();
    await page.keyboard.press('Enter');
    check(`${campaign}: native keyboard click recorded once`, (await events()).length, beforeKeyboard + 1);
    await page.evaluate(() => {
      const node = document.createElement('div');
      node.innerHTML = '<a href="/store2/pub-crawl-28/?email=private" data-parity-href="/store2/pub-crawl-28/">Fallback booking</a><form><button>Private form</button></form><a href="mailto:private@example.com">Email us</a>';
      node.id = 'journey-fixture';
      document.querySelector('#page-container').append(node);
      node.querySelector('a').removeAttribute('href');
      node.querySelector('a').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    check(`${campaign}: non-anchor keyboard booking`, (await events()).at(-1).details.buttonLabel, 'Fallback booking');
    const beforeForm = (await events()).length;
    await click('#journey-fixture form button');
    check(`${campaign}: form controls excluded`, (await events()).length, beforeForm);
    await click('#journey-fixture a[href^="mailto:"]');
    check(`${campaign}: contact destination redacted`, (await events()).at(-1).details.destination, 'contact:email');
    await page.addScriptTag({ content: bridge.outputFiles[0].text });
    await page.evaluate(() => {
      window.testTracking.initializeJourneyTracking({ pageId: crypto.randomUUID() });
      window.testTracking.trackJourney('add_to_cart', { productName: 'Pub Crawl' });
    });
    const captured = await events();
    check(`${campaign}: shared visit`, new Set(captured.map(e => e.visitId)).size, 1);
    check(`${campaign}: ordered sequence`, captured.map(e => e.sequence), captured.map((_, index) => index + 1));
    check(`${campaign}: store request carries all events`, await page.evaluate(() => window.testTracking.pendingJourneyEvents().length), captured.length);
    await consent(false);
    check(`${campaign}: withdrawal preserves cart only`, (await events()).map(e => e.type), ['add_to_cart']);
    await consent(true);
    await click('[data-book="hero-regular"]');
    const handoff = await events();
    await page.goto(`${origin}/store2/pub-crawl-28/`);
    await page.addScriptTag({ content: bridge.outputFiles[0].text });
    await page.evaluate(() => { window.KTK_ANALYTICS_CONSENT = true; });
    check(`${campaign}: staging events excluded from production handoff`, (await page.evaluate(() => window.testTracking.pendingJourneyEvents())).map(e => e.type), ['add_to_cart']);
    await page.evaluate(() => history.replaceState(null, '', '/staging/store2/pub-crawl-28/'));
    const pending = await page.evaluate(() => window.testTracking.pendingJourneyEvents());
    check(`${campaign}: same-environment navigation retains events`, pending, handoff);
    await page.evaluate(ids => window.testTracking.acknowledgeJourneyEvents(ids), pending.map(e => e.eventId));
    check(`${campaign}: acknowledged events removed`, await events(), []);
    check(`${campaign}: no journey API requests`, !network.some(url => /journey|ongoing-cart|quote|checkout/.test(url)));
    check(`${campaign}: no JavaScript errors`, errors, []);
    await context.close();
  }
  await mkdir('docs/homepage-journey', { recursive: true });
  await writeFile('docs/homepage-journey/browser-local.json', JSON.stringify({ checkedAt: new Date().toISOString(), checks, count: checks.length, liveCartCreated: false }, null, 2));
  console.log(`${checks.length}/${checks.length} homepage journey browser checks passed`);
} finally { await browser.close(); }
