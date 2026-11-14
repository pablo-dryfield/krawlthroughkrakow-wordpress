import {createRequire} from 'node:module';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {isBlockedMetaPageView} from './blocked-meta-pageview.mjs';

const output = process.argv[2];
const normal = process.argv.includes('--normal');
if (!output) throw Error('Explicit fresh report required');
try { await readFile(output); throw Error('Preserve earlier evidence'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const require = createRequire(import.meta.url);
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({channel: 'chrome', headless: true}), views = [], mutations = [];
try {
  for (const prefix of ['/staging/store2/', '/store2/']) {
    const context = await browser.newContext({serviceWorkers: 'block'});
    try {
      await context.route('**/*', route => {
        const request = route.request();
        if (!['GET', 'HEAD'].includes(request.method()) || new URL(request.url()).origin !== 'https://krawlthroughkrakow.com') return route.abort();
        return route.continue();
      });
      context.on('requestfinished', r => { if (!['GET', 'HEAD'].includes(r.method())) mutations.push(r.method()); });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push({message: e.message, stack: e.stack}));
      const response = await page.goto('https://krawlthroughkrakow.com' + prefix + 'pub-crawl-28/' + (normal ? '' : '?ktk_meta_diagnostic=' + Date.now()), {waitUntil: 'load', timeout: 60000});
      if (normal) {
        await page.mouse.move(20, 20);
        await page.waitForFunction(() => document.getElementById('ktk-storefront-root')?.hidden === false && !document.getElementById('ktk-storefront-public-content'), {}, {timeout: 30000});
        await page.locator('.ktk-date-picker__trigger').click();
        await page.getByRole('dialog', {name: 'Choose an activity date'}).waitFor({state: 'visible', timeout: 5000});
      }
      const html = await response.text();
      const scripts = await page.evaluate(source => [...new DOMParser().parseFromString(source, 'text/html').scripts].filter(s => !s.hasAttribute('src')).map(s => s.textContent), html);
      views.push({url: response.url(), status: response.status(), documentSha256: createHash('sha256').update(html).digest('hex'), errors, classified: errors.map(error => isBlockedMetaPageView(error, response.url(), html)), pageViewScripts: scripts.filter(s => s.includes("fbq('track', 'PageView', [])"))});
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
const pass = views.length === 2 && views.every(v => v.status === 200 && v.errors.length >= 1 && v.classified.every(Boolean) && v.pageViewScripts.length === 1) && views[0].pageViewScripts[0] === views[1].pageViewScripts[0] && !mutations.length;
await writeFile(output, JSON.stringify({checkedAt: new Date().toISOString(), normal, scope: 'Read-only source/stack comparison of the pre-existing Meta dependency exceptions with all external and non-read requests blocked; not a production mutation or tracking correctness claim.', pass, views, realMutations: mutations.length}, null, 2) + '\n');
console.log(JSON.stringify({pass, views: views.map(v => ({url: v.url, errors: v.errors.length, classified: v.classified})), realMutations: mutations.length}, null, 2));
if (!pass) process.exitCode = 1;
