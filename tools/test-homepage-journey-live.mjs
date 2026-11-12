import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base = process.argv[2] || 'https://krawlthroughkrakow.com/staging/';
const label = process.argv[3] || 'staging';
if (!/^https:\/\/krawlthroughkrakow\.com\/(?:staging\/)?$/.test(base) || !/^[a-z-]+$/.test(label)) throw new Error('Invalid target');
const report = { checkedAt: new Date().toISOString(), url: base, conditions: 'Fresh Chrome contexts, actual consent controls and homepage-to-store navigation. Store write requests intercepted; no live cart or order created.', checks: [], errors: [], blockedWrites: [] };
const check = (name, passed, detail) => report.checks.push({ name, passed: Boolean(passed), detail });
const key = 'ktk-storefront-journey-events-v1';
const hash = value => createHash('sha256').update(value).digest('hex');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await context.route('**/*', route => {
      const request = route.request();
      if (request.method() !== 'GET' && /\/wp-json\/ktk-storefront\/|\/api\/storefront\//.test(request.url())) {
        report.blockedWrites.push({ method: request.method(), url: request.url().split('?')[0] });
        return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Isolated release verification does not submit carts"}' });
      }
      return route.continue();
    });
    await page.goto(`${base}?ktk_journey_release=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ktkHomepageJourney === true);
    const pending = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), key);
    check(`${mobile}: no events before consent`, (await pending()).length === 0);
    await page.mouse.wheel(0, 10);
    const accept = page.getByRole('button', { name: /^Accept(?: all)?$/i }).first();
    await accept.waitFor({ state: 'visible', timeout: 30000 });
    await accept.click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || '[]').some(event => event.type === 'homepage_viewed'), key);
    const view = (await pending()).find(event => event.type === 'homepage_viewed');
    check(`${mobile}: consented homepage view`, Boolean(view));
    check(`${mobile}: environment`, view.details.environment === (base.includes('/staging/') ? 'staging' : 'production'));
    const scriptUrl = await page.locator('script[src*="/journey.js"]').getAttribute('src');
    const response = await context.request.get(scriptUrl);
    check(`${mobile}: published collector checksum`, hash(await response.body()) === hash(await readFile('staging/wp-content/mu-plugins/ktk-homepage-assets/journey.js')));
    const book = page.locator('[data-book="hero-regular"]');
    const href = await book.getAttribute('href');
    check(`${mobile}: clean booking destination`, !/[?&](?:utm_|gclid|gbraid|wbraid)/i.test(href));
    await book.click();
    await page.waitForURL(/\/store2\/pub-crawl-28\//);
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || '[]').some(event => event.type === 'product_viewed'), key, { timeout: 45000 });
    const events = await pending();
    const click = events.find(event => event.type === 'homepage_button_clicked');
    const product = events.find(event => event.type === 'product_viewed');
    check(`${mobile}: click label and placement survived navigation`, click?.details.buttonLabel === 'Book now' && click?.details.placement === 'Hero: regular pub crawl', click?.details);
    check(`${mobile}: homepage and product share visit`, view.visitId === click?.visitId && click.visitId === product?.visitId);
    check(`${mobile}: chronological sequence`, view.sequence < click?.sequence && click.sequence < product?.sequence);
    check(`${mobile}: separate page identities`, view.pageId === click?.pageId && view.pageId !== product?.pageId);
    check(`${mobile}: no personal/query details`, !events.filter(e => e.type.startsWith('homepage_')).some(e => /utm_|gclid|@/.test(JSON.stringify(e.details))));
    await page.screenshot({ path: `docs/homepage-journey/${label}-${mobile ? 'mobile' : 'desktop'}-store.png` });
    await context.close();
  }
  check('No JavaScript errors', report.errors.length === 0, report.errors);
} catch (error) { check('Suite completes', false, error.stack); }
finally { await browser.close(); }
await mkdir('docs/homepage-journey', { recursive: true });
await writeFile(`docs/homepage-journey/${label}-live.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.checks.filter(c => c.passed).length, total: report.checks.length, failures: report.checks.filter(c => !c.passed), blockedWrites: report.blockedWrites }));
if (report.checks.some(c => !c.passed)) process.exitCode = 1;
