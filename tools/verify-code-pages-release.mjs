import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const label = option('--label', 'staging-clean-cache');
const cacheBust = process.argv.includes('--cache-bust');
const base = 'https://krawlthroughkrakow.com/staging/about-us/how-to-join/';
const url = base + (cacheBust ? '?ktk_release=' + Date.now() : '');
const agents = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 Chrome/141.0.0.0 Mobile Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1'
};
const checks = [], devices = [];
const check = (name, passed, details) => checks.push({ name, passed: !!passed, details });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.route('**/*', route => route.abort());
  for (const [device, agent] of Object.entries(agents)) {
    const response = await fetch(url, { headers: { 'User-Agent': agent }, signal: AbortSignal.timeout(60000) });
    const html = await response.text();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const facts = await page.evaluate(() => ({
      renderer: document.body.classList.contains('ktk-code-page'),
      titles: [...document.querySelectorAll('title')].map(e => e.textContent),
      canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map(e => e.getAttribute('href')),
      robots: [...document.querySelectorAll('meta[name="robots"]')].map(e => e.content),
      descriptions: document.querySelectorAll('meta[name="description"]').length,
      sections: document.querySelectorAll('#main-content .et_pb_section').length,
      scriptSources: [...document.scripts].map(e => e.getAttribute('src')).filter(Boolean),
      loaders: Object.fromEntries(['ktk-gtm-loader', 'ktk-google-ads-loader', 'ktk-google-ads-config', 'ktk-clarity-loader', 'ktk-clarity-consent-bridge', 'ktk-gtm-noscript'].map(id => [id, document.querySelectorAll(`[id="${id}"]`).length])),
      links: [...document.querySelectorAll('a[href]')].map(e => e.getAttribute('href')),
      assets: [...document.querySelectorAll('link[rel="stylesheet"],script[src]')].map(e => e.getAttribute('href') || e.getAttribute('src')).filter(value => value.includes('/ktk-code-pages-assets/')),
      mapFrames: [...document.querySelectorAll('iframe[data-ktk-map-src]')].map(e => ({ src: e.getAttribute('src'), map: e.dataset.ktkMapSrc })),
    }));
    devices.push({ device, status: response.status, cache: response.headers.get('cf-cache-status'), age: response.headers.get('age'), responseRobots: response.headers.get('x-robots-tag'), htmlSha256: sha(html), facts });
    check(`${device}: HTTP 200`, response.status === 200);
    check(`${device}: code renderer`, facts.renderer);
    check(`${device}: one correct title`, facts.titles.length === 1 && facts.titles[0] === 'How to Join! | Krawl Through Krakow', facts.titles);
    check(`${device}: staging canonical`, facts.canonicals.length === 1 && facts.canonicals[0] === base, facts.canonicals);
    check(`${device}: HTML noindex`, facts.robots.length === 1 && facts.robots[0].includes('noindex'), facts.robots);
    check(`${device}: one description`, facts.descriptions === 1);
    check(`${device}: complete four sections`, facts.sections === 4);
    check(`${device}: no Divi runtime`, !facts.scriptSources.some(src => /themes\/Divi|et-cache|jquery/.test(src)), facts.scriptSources);
    check(`${device}: unique integration loaders`, Object.values(facts.loaders).every(count => count === 1), facts.loaders);
    check(`${device}: one Iubenda widget`, facts.scriptSources.filter(src => src.includes('92c90d2a-9d50-4f09-9c21-bcb72ccc2897')).length === 1);
    check(`${device}: initial map consent blocking`, facts.mapFrames.length === 2 && facts.mapFrames.every(f => f.src === 'about:blank'));
    check(`${device}: no baked QA attribution`, facts.links.every(href => !/codex-test|test-click-id|page-qa|[?&](utm_|gclid=|gbraid=|wbraid=)/.test(href)));
    check(`${device}: internal links stay staging`, !facts.links.some(href => href.startsWith('https://krawlthroughkrakow.com/') && !href.startsWith('https://krawlthroughkrakow.com/staging/')));
    check(`${device}: four owned CSS/JS references`, facts.assets.length === 4, facts.assets);
    for (const asset of facts.assets) {
      const remote = new URL(asset, base);
      const file = remote.pathname.split('/ktk-code-pages-assets/')[1];
      if (!['how-to-join.css', 'font-resilience.css', 'runtime.css', 'runtime.js'].includes(file)) throw new Error(`Unexpected public asset ${file}`);
      const expected = sha(await readFile(path.join('staging/wp-content/mu-plugins/ktk-code-pages-assets', file)));
      const assetResponse = await fetch(remote, { headers: { 'User-Agent': agent }, signal: AbortSignal.timeout(60000) });
      const actual = sha(Buffer.from(await assetResponse.arrayBuffer()));
      check(`${device}: ${file} current version`, remote.searchParams.get('v') === expected.slice(0, 12));
      check(`${device}: ${file} bytes match`, assetResponse.status === 200 && actual === expected, { expected, actual });
    }
  }
} finally { await browser.close(); }
const report = { checkedAt: new Date().toISOString(), url, cacheBust, summary: { passed: checks.filter(c => c.passed).length, total: checks.length }, devices, checks };
await writeFile(`docs/code-pages/how-to-join/${label}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ summary: report.summary, devices: devices.map(({ device, status, cache, age, facts }) => ({ device, status, cache, age, renderer: facts.renderer })), failed: checks.filter(c => !c.passed) }, null, 2));
if (checks.some(c => !c.passed)) process.exitCode = 1;
