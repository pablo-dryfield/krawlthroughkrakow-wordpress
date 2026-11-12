import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const report = { checkedAt: new Date().toISOString(), note: 'Isolated temporary Chrome contexts only. No user-profile storage changed, no cart or conversion submitted.', sites: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
const inspect = page => page.evaluate(keys => ({ stored: Object.fromEntries(keys.map(key => [key, localStorage.getItem('trk_' + key)])), links: [...document.querySelectorAll('.ktk-hero-cta')].map(el => el.href) }), keys);
try {
  for (const base of ['https://krawlthroughkrakow.com/', 'https://krawlthroughkrakow.com/staging/']) {
    const response = await fetch(`${base}?ktk_attribution_audit=${Date.now()}`);
    const html = await response.text();
    const site = { base, rawSourceHasQaValues: /codex-test|homepage-integrations|test-click-id|release-test-utm/.test(html), rawHeroLinks: [...html.matchAll(/<a\b(?=[^>]*class="ktk-hero-cta")[^>]*>/g)].map(match => match[0]) };
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${base}?ktk_attribution_audit=${Date.now()}`, { waitUntil: 'load', timeout: 60000 });
    site.freshVisitor = await inspect(page);
    await page.goto(`${base}?utm_source=codex-test&utm_medium=qa&utm_campaign=homepage-integrations&gclid=test-click-id`, { waitUntil: 'load', timeout: 60000 });
    site.seededVisitor = await inspect(page);
    await page.goto(`${base}?ktk_attribution_audit=${Date.now()}`, { waitUntil: 'load', timeout: 60000 });
    site.returningVisitor = await inspect(page);
    site.passed = !site.rawSourceHasQaValues && Object.values(site.freshVisitor.stored).every(value => value === null) && site.freshVisitor.links.every(url => !new URL(url).search) && site.seededVisitor.stored.utm_source === 'codex-test' && site.returningVisitor.stored.utm_source === 'codex-test';
    report.sites.push(site);
    await context.close();
  }
} finally {
  await browser.close();
  report.passed = report.sites.length === 2 && report.sites.every(site => site.passed);
  await writeFile('docs/homepage-production-launch/attribution-clean-visitor-diagnostic.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}
