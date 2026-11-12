import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { build } = require(path.resolve('../omni-lodge/ui/node_modules/esbuild'));
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const label = process.argv[2] || 'before';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a simple report label.');
const sdkUrl = 'https://scripts.clarity.ms/0.8.77/clarity.js';
const sdkResponse = await fetch(sdkUrl);
if (!sdkResponse.ok) throw new Error(`SDK download failed: ${sdkResponse.status}`);
const sdk = await sdkResponse.text();
const frontend = path.resolve('staging/wp-content/plugins/ktk-storefront/frontend');
const bundle = await build({ bundle: true, write: false, stdin: { resolveDir: frontend, contents: `
  import { createClarityRecordingBridge } from './src/clarity-recording.js';
  window.references = [];
  window.KTK_ANALYTICS_CONSENT = false;
  window.bridge = createClarityRecordingBridge({
    queue: {
      currentVisit: () => ({ id: 'fixture-visit' }),
      record: (type, details, pageId) => window.references.push({ type, details, pageId }),
    },
    consentGranted: () => window.KTK_ANALYTICS_CONSENT === true,
    pageId: () => 'fixture-page',
  });
  window.clarity('start', {
    projectId: 'fixtureproject', upload: location.origin + '/collect',
    track: false, content: true, lean: false,
  });
  window.providerState = () => new Promise(resolve => {
    window.clarity('metadata', (metadata, playback, consent) => {
      resolve({ metadata: { ...metadata }, playback, consent: consent && { ...consent } });
    }, false, false, true);
  });
  window.setConsent = granted => {
    window.KTK_ANALYTICS_CONSENT = granted;
    window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: granted ? 'granted' : 'denied' });
  };
` } });
const report = {
  checkedAt: new Date().toISOString(), label, sdkUrl,
  sdkSha256: createHash('sha256').update(sdk).digest('hex'),
  scope: 'Actual SDK and actual bundled recording bridge; synthetic localhost DOM/IDs only. All collect calls terminate at the local fixture, all external browser requests blocked. No private browser, Clarity recording, cart, order or consent settings modified.',
  checks: [], scenarios: [], errors: [], collectorEvents: [], localCollectCount: 0, blockedExternal: [],
};
const check = (name, pass) => report.checks.push({ name, pass: Boolean(pass) });
const html = '<!doctype html><title>Consent transition fixture</title><h1>Local test</h1><p>Synthetic content only.</p><script src="/sdk.js"></script><script src="/fixture.js"></script>';
const server = createServer((req, res) => {
  if (req.url === '/collect' && req.method === 'POST') {
    report.localCollectCount += 1;
    req.resume();
    res.writeHead(204);
    res.end();
    return;
  }
  res.setHeader('Content-Type', req.url.endsWith('.js') ? 'application/javascript' : 'text/html');
  res.end(req.url === '/sdk.js' ? sdk : req.url === '/fixture.js' ? bundle.outputFiles[0].contents : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const createPage = async (scenario) => {
  const context = await browser.newContext();
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === base) return route.continue();
    report.blockedExternal.push(route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  const lifecycle = { phase: 'loading' };
  page.on('pageerror', error => report.errors.push({
    scenario, phase: lifecycle.phase, at: new Date().toISOString(), message: error.message, stack: error.stack,
  }));
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/collect') report.collectorEvents.push({ scenario, phase: lifecycle.phase, event: 'request', at: new Date().toISOString() });
  });
  page.on('requestfinished', request => {
    if (new URL(request.url()).pathname === '/collect') report.collectorEvents.push({ scenario, phase: lifecycle.phase, event: 'finished', at: new Date().toISOString() });
  });
  await page.goto(base + '/store2/fixture/');
  await page.waitForFunction(() => window.clarity?.v === '0.8.77' && window.bridge);
  lifecycle.phase = 'ready';
  return { context, page, lifecycle };
};
const finishPage = async ({ context, page, lifecycle }) => {
  lifecycle.phase = 'teardown-settle';
  // Allow already-scheduled SDK uploads to finish before the fixture closes its document.
  await page.waitForTimeout(1200);
  await page.waitForLoadState('networkidle');
  lifecycle.phase = 'context-close';
  await context.close();
};
try {
  {
    const fixture = await createPage('grant-denied-restart-grant');
    const { page, lifecycle } = fixture;
    try {
      lifecycle.phase = 'initial-grant';
      const initial = await page.evaluate(async () => {
        window.setConsent(true);
        window.bridge.attach('fixtureproject');
        window.initialRuntime = window.clarity;
        return { provider: await window.providerState(), references: [...window.references] };
      });
      check('Initial actual provider consent is granted', initial.provider.consent?.analytics_Storage === 'granted');
      check('Initial granted recording is captured once', initial.references.length === 1);
      lifecycle.phase = 'denial-restart';
      await page.evaluate(() => window.setConsent(false));
      await page.waitForFunction(() => window.clarity?.v === '0.8.77' && window.clarity !== window.initialRuntime);
      await page.waitForTimeout(600);
      const denied = await page.evaluate(async () => ({ provider: await window.providerState(), references: [...window.references] }));
      check('Actual SDK denied restart rotates native session', denied.provider.metadata.sessionId !== initial.provider.metadata.sessionId);
      check('Restarted provider remains denied', denied.provider.consent?.analytics_Storage === 'denied');
      check('Local denial adds no reference', denied.references.length === initial.references.length);
      lifecycle.phase = 're-grant';
      await page.evaluate(() => window.setConsent(true));
      await page.waitForTimeout(250);
      const regranted = await page.evaluate(async () => ({ provider: await window.providerState(), references: [...window.references] }));
      check('Actual provider reports re-granted consent', regranted.provider.consent?.analytics_Storage === 'granted');
      check('Re-grant alone captures the new native session', regranted.references.some(event => event.details.sessionId === regranted.provider.metadata.sessionId));
      lifecycle.phase = 'explicit-reattach';
      const reattached = await page.evaluate(async () => {
        const attached = window.bridge.attach('fixtureproject');
        return { attached, provider: await window.providerState(), references: [...window.references] };
      });
      check('Explicit reattachment also captures current native session', reattached.references.some(event => event.details.sessionId === reattached.provider.metadata.sessionId));
      report.scenarios.push({ name: 'grant-denied-restart-grant', initial, denied, regranted, reattached });
    } finally { await finishPage(fixture); }
  }
  {
    const fixture = await createPage('local-granted-provider-denied');
    const { page, lifecycle } = fixture;
    try {
      lifecycle.phase = 'mismatched-consent';
      const state = await page.evaluate(async () => {
        window.KTK_ANALYTICS_CONSENT = true;
        window.bridge.attach('fixtureproject');
        return { provider: await window.providerState(), references: [...window.references] };
      });
      check('Mismatched fixture has actual provider denial', state.provider.consent?.analytics_Storage === 'denied');
      check('Local grant alone does not capture provider-denied recording', state.references.length === 0);
      report.scenarios.push({ name: 'local-granted-provider-denied', ...state });
    } finally { await finishPage(fixture); }
  }
  {
    const fixture = await createPage('sdk-only-consent-transitions');
    const { page, lifecycle } = fixture;
    try {
      lifecycle.phase = 'initial-grant';
      const initial = await page.evaluate(async () => {
        window.setConsent(true);
        window.initialRuntime = window.clarity;
        return window.providerState();
      });
      lifecycle.phase = 'denial-restart';
      await page.evaluate(() => window.setConsent(false));
      await page.waitForFunction(() => window.clarity?.v === '0.8.77' && window.clarity !== window.initialRuntime);
      await page.waitForTimeout(600);
      const denied = await page.evaluate(() => window.providerState());
      lifecycle.phase = 're-grant';
      await page.evaluate(() => window.setConsent(true));
      await page.waitForTimeout(250);
      const regranted = await page.evaluate(() => window.providerState());
      check('SDK-only control rotates session and restores granted consent', initial.metadata.sessionId !== denied.metadata.sessionId
        && denied.consent?.analytics_Storage === 'denied' && regranted.consent?.analytics_Storage === 'granted');
      check('SDK-only control never attaches application bridge', await page.evaluate(() => window.references.length === 0));
      report.scenarios.push({ name: 'sdk-only-consent-transitions', initial, denied, regranted });
    } finally { await finishPage(fixture); }
  }
  check('Actual SDK sent synthetic data only to local collector', report.localCollectCount > 0);
  check('No browser errors', report.errors.length === 0);
} catch (error) {
  report.error = error.stack;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  report.passed = !report.error && report.checks.every(item => item.pass);
  await mkdir('docs/clarity-journey-links/delivery', { recursive: true });
  const file = `docs/clarity-journey-links/delivery/consent-transitions-${label}.json`;
  await writeFile(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks, error: report.error }));
  if (!report.passed) process.exitCode = 1;
}
