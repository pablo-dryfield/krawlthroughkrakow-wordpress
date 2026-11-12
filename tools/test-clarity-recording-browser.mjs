import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { build } = require(path.resolve('../omni-lodge/ui/node_modules/esbuild'));
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const frontend = path.resolve('staging/wp-content/plugins/ktk-storefront/frontend');
const bundle = await build({ bundle: true, write: false, stdin: { resolveDir: frontend, contents: `
  import * as tracking from './src/journey-tracking.js';
  window.tracking = tracking;
  window.KTK_ANALYTICS_CONSENT = true;
  window.calls = [];
  window.callbacks = [];
  window.clarity = (...args) => {
    window.calls.push(args);
    if (args[0] === 'metadata') window.callbacks.push(args[1]);
  };
  tracking.initializeJourneyTracking({browserId:'b054b78a-75cb-44f0-b445-a85b99f98b2b',pageId:'fixture',area:'product',restUrl:location.origin+'/fake-api'});
  window.start = () => tracking.startJourneyReplay({enabled:true,projectId:'project1',samplePercent:location.search.includes('sample=0')?0:100,requireAnalyticsConsent:true});
  window.emit = () => window.callbacks.forEach(cb => cb({projectId:'project1',userId:'nativeuser',sessionId:'nativesession'},true,{analytics_Storage:'granted',ad_Storage:'denied'}));
` } });
const posted = [];
const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/fake-api/ongoing-carts/fixture-cart/activity') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const payload = JSON.parse(body);
      posted.push(payload);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ journey: { acceptedEventIds: payload.journeyEvents.map(e => e.eventId) } }));
    });
    return;
  }
  res.setHeader('Content-Type', req.url === '/fixture.js' ? 'application/javascript' : 'text/html');
  res.end(req.url === '/fixture.js' ? bundle.outputFiles[0].contents : '<!doctype html><script src="/fixture.js"></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checks: [], errors: [], scope: 'Real bundled tracking modules, isolated storage and stub Clarity SDK; no real analytics/cart requests.' };
const check = (name, pass) => report.checks.push({ name, pass: !!pass });
try {
  for (const pathname of ['/store2/pub-crawl-28/', '/staging/store2/pub-crawl-28/', '/store2/pub-crawl-28/?sample=0']) {
    const context = await browser.newContext();
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(base + pathname);
    await page.evaluate(() => window.start());
    await page.waitForTimeout(1700);
    if (pathname.includes('sample=0')) {
      check('outside the sample only a passive metadata callback is registered', await page.evaluate(() => window.callbacks.length === 1 && !window.calls.some(c => c[0] === 'consentv2' || c[0] === 'identify') && !window.tracking.journeyClientContext().claritySampled));
      check('outside the sample no Clarity loader is injected', await page.locator('script[src*="clarity.ms/tag/"]').count() === 0);
      await page.evaluate(() => window.emit());
      check('an already-existing site-wide playback reference can still be linked', await page.evaluate(() => window.tracking.pendingJourneyEvents().filter(e => e.type === 'clarity_recording_linked').length === 1));
    } else if (pathname.startsWith('/staging/')) {
      check('staging cannot subscribe or capture even with replay enabled in a fixture', await page.evaluate(() => window.callbacks.length === 0 && !window.tracking.pendingJourneyEvents().some(e => e.type === 'clarity_recording_linked')));
    } else {
      check('one metadata subscription', await page.evaluate(() => window.callbacks.length === 1));
      await page.evaluate(() => { window.emit(); window.emit(); });
      check('native IDs captured once in the existing visit queue', await page.evaluate(() => {
        const events = window.tracking.pendingJourneyEvents().filter(e => e.type === 'clarity_recording_linked');
        return events.length === 1 && events[0].details.sessionId === 'nativesession' && events[0].details.environment === 'production';
      }));
      check('Clarity custom visit tag matches the event visit', await page.evaluate(() => window.calls.some(c => c[0] === 'set' && c[1] === 'storefront_visit_id' && c[2] === window.tracking.pendingJourneyEvents()[0].visitId)));
      const oldVisit = await page.evaluate(() => window.tracking.pendingJourneyEvents()[0].visitId);
      await page.evaluate(() => window.tracking.flushJourneyActivity('fixture-cart'));
      await page.waitForFunction(() => window.tracking.pendingJourneyEvents().length === 0);
      const payload = posted.at(-1);
      const reference = payload?.journeyEvents?.[0];
      check('native reference reaches the existing cart transport with its own visit', reference?.type === 'clarity_recording_linked'
        && reference.visitId === oldVisit && reference.details.sessionId === 'nativesession'
        && payload.clientContext.claritySessionId === oldVisit && payload.clientContext.claritySessionId !== reference.details.sessionId);
      check('successful acknowledgment removes only the accepted queued reference', await page.evaluate(() => window.tracking.pendingJourneyEvents().length === 0));
      await page.evaluate(() => { window.tracking.clearJourneyAfterPurchase(); window.start(); window.emit(); });
      check('next purchase journey receives its own recording reference', await page.evaluate(old => {
        const events = window.tracking.pendingJourneyEvents();
        return events.length === 1 && events[0].visitId !== old;
      }, oldVisit));
      await page.evaluate(() => { window.KTK_ANALYTICS_CONSENT = false; window.emit(); });
      check('withdrawal blocks callbacks and removes unsent references', await page.evaluate(() => !window.tracking.pendingJourneyEvents().some(e => e.type === 'clarity_recording_linked')));
      check('one logical Clarity script', await page.locator('script[src*="clarity.ms/tag/"]').count() === 1);
    }
    await context.close();
  }
  check('no browser errors', report.errors.length === 0);
  report.passed = report.checks.every(c => c.pass);
  await mkdir('docs/clarity-journey-links/delivery', { recursive: true });
  await writeFile('docs/clarity-journey-links/delivery/capture-browser.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (!report.passed) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
