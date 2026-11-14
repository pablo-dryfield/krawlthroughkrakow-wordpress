import {createRequire} from 'node:module';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const [base, output] = process.argv.slice(2);
if (!base || !output) throw Error('Explicit isolated/staging base and fresh report required');
const address = new URL(base), local = address.protocol === 'http:' && address.hostname === '127.0.0.1';
if (!(local && address.pathname === '/store2/') && !(address.origin === 'https://krawlthroughkrakow.com' && address.pathname === '/staging/store2/')) throw Error('Only isolated loopback or staging storefront');
try { await readFile(path.join(output, 'report.json')); throw Error('Preserve earlier evidence'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
await mkdir(output, {recursive: true});
const files = ['staging/wp-content/plugins/ktk-storefront/frontend/src/ProductConfigurator.jsx', 'staging/wp-content/plugins/ktk-storefront/assets/storefront.js', 'staging/wp-content/plugins/ktk-storefront/assets/storefront.css', 'tools/test-booking-calendar-recovery.mjs'];
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async file => [file, createHash('sha256').update(await readFile(file)).digest('hex')])));
const initial = await hashes(), checks = [], errors = [], blocked = [], transmissions = [];
const check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const frontendRequire = createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json'));
if (frontendRequire('axe-core/package.json').version !== '4.14.0') throw Error('Pinned axe version required');
const axeSource = await readFile(frontendRequire.resolve('axe-core/axe.min.js'), 'utf8'), axeViews = [];
async function audit(page, name) {
  await page.addScriptTag({content: axeSource});
  let timer;
  try {
    const result = await Promise.race([page.evaluate(() => axe.run(document.querySelector('#build-your-booking'), {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Calendar axe exceeded30s')), 30000); })]);
    axeViews.push({name, violations: result.violations, incomplete: result.incomplete.map(r => ({id: r.id, nodes: r.nodes.length}))});
    check(name + ' no automated booking-control violations', !result.violations.length, result.violations);
  } finally { clearTimeout(timer); }
}
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 900}, timezoneId: 'Europe/Warsaw', reducedMotion: 'reduce', serviceWorkers: 'block'});
    try {
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (!['GET', 'HEAD'].includes(request.method()) || url.origin !== address.origin) {
          blocked.push({width, method: request.method(), host: url.hostname, path: url.pathname});
          return route.abort();
        }
        return route.continue();
      });
      context.on('requestfinished', request => { if (!['GET', 'HEAD'].includes(request.method())) transmissions.push({width, method: request.method()}); });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push({width, message: e.message}));
      const url = new URL('pub-crawl-28/', base);
      if (process.argv.includes('--cache-bust')) url.searchParams.set('ktk_calendar_check', Date.now().toString());
      const response = await page.goto(url.href, {waitUntil: 'load', timeout: 60000});
      const trigger = page.locator('.ktk-date-picker__trigger');
      await trigger.waitFor();
      await page.evaluate(() => document.fonts.ready);
      check(width + ' current product and one calendar control ready', response.status() === 200 && await trigger.count() === 1);
      await trigger.focus();
      await page.keyboard.press('Space');
      check(width + ' Space opens named date dialog', await page.getByRole('dialog', {name: 'Choose an activity date'}).isVisible());
      const type = await page.evaluate(() => ({weekdays: [...document.querySelectorAll('.ktk-date-picker__weekdays span')].map(n => ({size: getComputedStyle(n).fontSize, color: getComputedStyle(n).color})), dates: [...document.querySelectorAll('.ktk-date-picker__days button')].map(n => getComputedStyle(n).fontSize), popup: document.querySelector('.ktk-date-picker__popover').getBoundingClientRect().toJSON(), width: innerWidth}));
      check(width + ' calendar labels and dates use readable fixed type without horizontal clipping', type.weekdays.length === 7 && type.weekdays.every(s => s.size === '12px' && s.color === 'rgba(243, 238, 228, 0.72)') && type.dates.length >= 28 && type.dates.every(s => s === '14px') && type.popup.left >= 0 && type.popup.right <= type.width + 1, type);
      if ([390, 1440].includes(width)) await audit(page, width + ' open calendar');
      const next = page.getByRole('button', {name: 'Next month', exact: true});
      await next.focus();
      await page.keyboard.press('Escape');
      check(width + ' Escape closes dialog and returns focus to trigger', !await page.getByRole('dialog', {name: 'Choose an activity date'}).count() && await trigger.evaluate(n => document.activeElement === n));
      await trigger.focus();
      await page.keyboard.press('Enter');
      const oldMonth = await page.locator('.ktk-date-picker__header strong').innerText();
      await next.click();
      check(width + ' month navigation changes visible month', await page.locator('.ktk-date-picker__header strong').innerText() !== oldMonth);
      await page.getByRole('button', {name: 'Previous month', exact: true}).click();
      check(width + ' previous returns to original month', await page.locator('.ktk-date-picker__header strong').innerText() === oldMonth);
      const past = page.locator('.ktk-date-picker__days button[disabled]');
      check(width + ' exactly the past dates are not selectable', await past.count() === await page.evaluate(() => new Date().getDate() - 1) && await past.evaluateAll(nodes => nodes.every(n => n.disabled)));
      const day = page.locator('.ktk-date-picker__days button:not([disabled]):not([aria-disabled="true"])').first();
      const label = await day.getAttribute('aria-label');
      await day.focus();
      await page.keyboard.press('Enter');
      check(width + ' date selection closes dialog and restores trigger focus', !await page.getByRole('dialog', {name: 'Choose an activity date'}).count() && await trigger.evaluate(n => document.activeElement === n));
      check(width + ' selected date matches chosen label', (await trigger.textContent()).trim() === label);
      await trigger.press('Space');
      const outside = page.getByRole('button', {name: 'Show image 1', exact: true});
      await outside.click();
      check(width + ' outside-pointer dismissal does not steal focus from next control', !await page.getByRole('dialog', {name: 'Choose an activity date'}).count() && await outside.evaluate(n => document.activeElement === n));
      const beforeCart = await page.evaluate(() => localStorage.getItem('ktk-storefront-cart-v1'));
      check(width + ' selecting dates alone does not create a cart', beforeCart === null || beforeCart === '[]', beforeCart);
      check(width + ' no horizontal clipping', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (width === 390) {
        await trigger.focus();
        await trigger.press('Space');
        await page.screenshot({path: path.join(output, 'calendar-390.png')});
        await next.focus();
        await page.keyboard.press('Escape');
        await page.screenshot({path: path.join(output, 'recovered-390.png')});
      }
    } catch (e) { errors.push({width, message: e.stack}); } finally { await context.close(); }
  }
} finally { await browser.close(); }
check('Source and candidate assets unchanged during audit', JSON.stringify(initial) === JSON.stringify(await hashes()));
check('No non-read transmission', transmissions.length === 0, transmissions);
check('No page or harness errors', !errors.length, errors);
const report = {checkedAt: new Date().toISOString(), base, scope: 'Date-only keyboard and pointer recovery; all external and non-read requests aborted. No real carts, orders, payments, consent or provider writes. Automated checks are not full accessibility certification.', sourceHashes: initial, passed: checks.filter(c => c.pass).length, total: checks.length, checks, errors, blocked, axeViews, realMutations: transmissions.length};
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass), errors}, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
