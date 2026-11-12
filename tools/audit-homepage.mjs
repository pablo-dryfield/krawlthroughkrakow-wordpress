import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));
}
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const phase = option('--phase', 'after');
const url = option('--url', 'https://krawlthroughkrakow.com/staging/');
const out = path.resolve('docs/homepage-redesign');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { phase, url, time: new Date().toISOString(), viewports: [], measurements: [] };
try {
  if (process.argv.includes('--performance-only')) {
    try {
      const previous = JSON.parse(await readFile(path.join(out, `${phase}-audit.json`), 'utf8'));
      report.viewports = previous.viewports;
      report.visualAuditTime = previous.visualAuditTime || previous.time;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  for (const width of process.argv.includes('--performance-only') ? [] : [360, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(out, `${phase}-${width}-initial.png`) });
    const reject = page.getByRole('button', { name: /^Reject$/i });
    if (await reject.count()) await reject.first().click();
    await page.waitForTimeout(800);
    // Scroll the actual page so lazy media is represented in the full-page evidence.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 250)); }
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, `${phase}-${width}-full.png`), fullPage: true });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: path.join(out, `${phase}-${width}-hero.png`) });
    const dom = await page.evaluate(() => ({
      title: document.title, h1: [...document.querySelectorAll('h1')].map(e => e.textContent),
      descriptions: [...document.querySelectorAll('meta[name="description"]')].map(e => e.content),
      canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map(e => e.href),
      robots: [...document.querySelectorAll('meta[name="robots"]')].map(e => e.content),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      headings: [...document.querySelectorAll('h1,h2,h3')].map(e => ({ tag: e.tagName, text: e.textContent })),
      brokenImages: [...document.images].filter(e => e.getAttribute('src') && (!e.complete || e.naturalWidth === 0)).map(e => e.currentSrc),
      links: [...document.querySelectorAll('a[href]')].map(e => ({ text: e.textContent.trim(), href: e.href })),
      scripts: [...document.scripts].map(e => ({ id: e.id, src: e.src, type: e.type })),
    }));
    report.viewports.push({ width, errors, ...dom });
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1600000 / 8, uploadThroughput: 750000 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const requests = new Map();
  cdp.on('Network.requestWillBeSent', p => requests.set(p.requestId, { url: p.request.url, type: p.type, start: p.timestamp }));
  cdp.on('Network.responseReceived', p => { const r = requests.get(p.requestId); if (r) Object.assign(r, { status: p.response.status, mime: p.response.mimeType, fromDisk: p.response.fromDiskCache }); });
  cdp.on('Network.loadingFinished', p => { const r = requests.get(p.requestId); if (r) Object.assign(r, { bytes: p.encodedDataLength, end: p.timestamp }); });
  await page.addInitScript(() => {
    window.__audit = { lcp: 0, cls: 0, longTasks: 0, lcpElement: '' };
    new PerformanceObserver(list => { for (const e of list.getEntries()) { window.__audit.lcp = e.startTime; window.__audit.lcpElement = e.element?.outerHTML?.slice(0, 300); } }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__audit.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__audit.longTasks += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true });
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(12000);
  const metrics = await page.evaluate(() => ({ ...window.__audit, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime, ttfb: performance.getEntriesByType('navigation')[0].responseStart, domContentLoaded: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd }));
  report.measurements.push({ conditions: 'Fresh browser context; cache disabled; 390x844 DPR2 mobile; 1.6 Mbps down / 750 Kbps up / 150ms latency; 4x CPU; no consent choice; observe 12s after DOMContentLoaded', metrics, requests: [...requests.values()] });
  await writeFile(path.join(out, `${phase}-audit.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ phase, widths: report.viewports.map(v => ({ width: v.width, overflow: v.horizontalOverflow, errors: v.errors, brokenImages: v.brokenImages })), metrics, requests: requests.size, bytes: [...requests.values()].reduce((s,r) => s+(r.bytes||0),0) }, null, 2));
} finally { await browser.close(); }
