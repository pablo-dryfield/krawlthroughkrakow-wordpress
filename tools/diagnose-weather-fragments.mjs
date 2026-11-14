import {readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';

const [output] = process.argv.slice(2);
if (!output) throw Error('Fresh diagnostic output required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({channel: 'chrome', headless: true}), runs = [], writes = [];
try {
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce', serviceWorkers: 'block'});
    try {
      await context.route('**/*', route => {const r = route.request(), u = new URL(r.url()); if (!['GET', 'HEAD'].includes(r.method())) {writes.push({method: r.method(), path: u.pathname}); return route.abort();} return u.origin === 'https://krawlthroughkrakow.com' && (u.pathname.startsWith('/staging/') || u.pathname === '/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js') ? route.continue() : route.abort();});
      const page = await context.newPage(), response = await page.goto('https://krawlthroughkrakow.com/staging/krakow-winter-activities/', {waitUntil: 'load', timeout: 60000});
      let fontDeadline; try {await Promise.race([page.evaluate(() => document.fonts.ready), new Promise((_, reject) => {fontDeadline = setTimeout(() => reject(Error('Diagnostic fonts exceeded30s')), 30000);})]);} finally {clearTimeout(fontDeadline);}
      const summary = page.locator('[data-ktk-weather-review] summary'); await summary.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Space'); await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
      const topics = await page.locator('[data-ktk-weather-review] nav a').evaluateAll(nodes => nodes.map(n => new URL(n.href).hash.slice(1))), results = [];
      const state = id => page.evaluate(id => {const n = document.getElementById(id), r = n?.getBoundingClientRect(); return {hash: location.hash, targetCount: document.querySelectorAll('#' + id).length, top: r?.top, bottom: r?.bottom, visible: !!r && r.top < innerHeight && r.bottom > 0, pendingPhotos: [...document.querySelectorAll('#main-content img')].filter(n => !n.complete).length};}, id);
      for (const id of topics) {
        await page.locator('[data-ktk-weather-review] nav a[href$="#' + id + '"]').focus(); await page.keyboard.press('Enter');
        const immediateUrl = page.url(), immediate = await state(id);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); const frames = await state(id);
        await new Promise(resolve => setTimeout(resolve, 150)); const settled = await state(id);
        results.push({id, immediateUrl, immediate, frames, settled});
      }
      runs.push({run, status: response.status(), topics: topics.length, results});
    } finally {await context.close();}
  }
} finally {await browser.close();}
const passed = !writes.length && runs.length === 3 && runs.every(r => r.status === 200 && r.topics === 22 && r.results.every(n => n.settled.hash === '#' + n.id && n.settled.targetCount === 1 && n.settled.visible));
await writeFile(output, JSON.stringify({checkedAt: new Date().toISOString(), scope: 'Read-only native keyboard diagnostic; no application change or simulated navigation', passed, runs, writes}, null, 2) + '\n');
console.log(JSON.stringify({passed, nativeTargets: runs.reduce((n, r) => n + r.topics, 0), immediateMisses: runs.flatMap(r => r.results.filter(n => new URL(n.immediateUrl).hash !== '#' + n.id || !n.immediate.visible).map(n => ({run: r.run, ...n}))), settledMisses: runs.flatMap(r => r.results.filter(n => n.settled.hash !== '#' + n.id || !n.settled.visible))}, null, 2));
if (!passed) process.exitCode = 1;
