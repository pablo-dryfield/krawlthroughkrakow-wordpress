import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checkedAt: new Date().toISOString(), scenarios: [] };
try {
  for (const url of ['https://krawlthroughkrakow.com/', 'https://krawlthroughkrakow.com/staging/']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const scenario = { url, errors: [], requests: [], scripts: [] };
    page.on('pageerror', error => scenario.errors.push({ message: error.message, stack: error.stack }));
    page.on('request', request => { if (/googletagmanager|clarity|gtg_health/.test(request.url())) scenario.requests.push(request.url()); });
    await page.goto(`${url}?ktk_tracker_diagnostic=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.mouse.wheel(0, 10);
    const reject = page.getByRole('button', { name: /^Reject(?: all)?$/i }).first();
    await reject.waitFor({ state: 'visible', timeout: 30000 }); await reject.click();
    await page.waitForTimeout(2000);
    scenario.scripts = await page.locator('script').evaluateAll(scripts => scripts.filter(script => /googletagmanager|clarity|parentNode/.test(script.outerHTML)).map(script => script.outerHTML));
    report.scenarios.push(scenario);
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile('docs/homepage-production-launch/tracker-diagnostic.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
