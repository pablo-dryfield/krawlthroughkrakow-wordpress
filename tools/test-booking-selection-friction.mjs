import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';

const [base, output] = process.argv.slice(2), inputFile = 'docs/seo/booking-friction-2026-11-14/public-inputs.json';
if (!base || !output) throw Error('Explicit isolated/staging base and fresh report required');
const address = new URL(base);
if (!(address.protocol === 'http:' && address.hostname === '127.0.0.1' && address.pathname === '/store2/') && !(address.origin === 'https://krawlthroughkrakow.com' && address.pathname === '/staging/store2/')) throw Error('Only loopback/staging storefront');
try { await readFile(path.join(output, 'report.json')); throw Error('Preserve previous evidence'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
await mkdir(output, {recursive: true});
const input = JSON.parse(await readFile(inputFile, 'utf8')), regular = input.products.find(p => p.id === 28), nye = input.products.find(p => p.id === 32);
if (!regular || !nye || regular.price.amount !== 120 || nye.price.amount !== 250 || regular.config.minParticipants !== 0 || nye.config.availability.fixedDate !== '2026-12-31') throw Error('Review changed public booking fixtures before testing');
const files = [inputFile, 'tools/test-booking-selection-friction.mjs', 'staging/wp-content/plugins/ktk-storefront/frontend/src/ProductConfigurator.jsx', 'staging/wp-content/plugins/ktk-storefront/frontend/src/main.jsx', 'staging/wp-content/plugins/ktk-storefront/assets/storefront.js', 'staging/wp-content/plugins/ktk-storefront/assets/storefront.css'];
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async f => [f, createHash('sha256').update(await readFile(f)).digest('hex')])));
const initial = await hashes(), checks = [], errors = [], blocked = [], mutations = [], servedAssets = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const frontendRequire = createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json'));
if (frontendRequire('axe-core/package.json').version !== '4.14.0') throw Error('Pinned axe version required');
const axeSource = await readFile(frontendRequire.resolve('axe-core/axe.min.js'), 'utf8'), axeViews = [];
async function audit(page, name) {
  await page.addScriptTag({content: axeSource});
  let timer;
  try {
    const result = await Promise.race([page.evaluate(() => axe.run(document.querySelector('#build-your-booking'), {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Selection axe exceeded30s')), 30000); })]);
    axeViews.push({name, violations: result.violations, incomplete: result.incomplete.map(r => ({id: r.id, nodes: r.nodes.length}))});
    check(name + ' no automated validation-state violations', !result.violations.length, result.violations);
  } finally { clearTimeout(timer); }
}
const money = new Intl.NumberFormat('en-GB', {style: 'currency', currency: 'PLN', minimumFractionDigits: 2});
const browser = await chromium.launch({channel: 'chrome', headless: true});
async function fixture(width, slug, scenario, run, unavailable = false) {
  const name = width + ' ' + scenario, context = await browser.newContext({viewport: {width, height: 900}, timezoneId: 'Europe/Warsaw', reducedMotion: 'reduce', serviceWorkers: 'block'});
  try {
    await context.addInitScript(() => localStorage.setItem('ktk-storefront-contact-v1', JSON.stringify({fullName: 'Booking Test', email: 'booking@example.invalid', phone: '+48500100200', phoneCountry: 'PL'})));
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (!['GET', 'HEAD'].includes(request.method()) || url.origin !== address.origin) {
        blocked.push({view: name, method: request.method(), host: url.hostname, path: url.pathname});
        return route.abort();
      }
      if (/\/(?:ktk-api|wp-json\/ktk-storefront\/v1)\/products(?:\/|$)/.test(url.pathname)) {
        const key = url.pathname.split('/products/')[1], product = structuredClone(input.products.find(p => p.slug === key) || regular);
        if (unavailable && product.id === 28) {
          const date = new Date();
          date.setDate(date.getDate() + 2);
          const value = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
          product.config.availability.blockedDates.push({date: value, reason: 'Isolated unavailable-date fixture'});
        }
        return route.fulfill({json: key ? {product, storefrontConfig: {cancellationPolicy: input.cancellationPolicy, journeyReplay: {enabled: false}}} : {products: input.products}});
      }
      return route.continue();
    });
    context.on('requestfinished', r => { if (!['GET', 'HEAD'].includes(r.method())) mutations.push({view: name, method: r.method()}); });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push({view: name, message: e.message}));
    const script = page.waitForResponse(r => /\/storefront\.js(?:\?|$)/.test(r.url()));
    const url = new URL(slug + '/', base);
    if (process.argv.includes('--cache-bust')) url.searchParams.set('ktk_selection_check', Date.now().toString());
    const response = await page.goto(url.href, {waitUntil: 'load', timeout: 60000});
    const asset = await script;
    servedAssets.push({view: name, sha256: createHash('sha256').update(await asset.body()).digest('hex')});
    await page.locator('.ktk-configurator').waitFor();
    await page.evaluate(() => document.fonts.ready);
    check(name + ' current product renders', response.status() === 200 && (await page.locator('.ktk-detail h1').textContent()).trim() === (slug === regular.slug ? regular.name : nye.name));
    await run(page, name);
    check(name + ' no horizontal clipping', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  } catch (e) { errors.push({view: name, message: e.stack}); } finally { await context.close(); }
}
async function dateLabel(page, offset = 2, monday = false) {
  return page.evaluate(({offset, monday}) => {
    const d = new Date(); d.setDate(d.getDate() + offset);
    if (monday) while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    return new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}).format(d);
  }, {offset, monday});
}
async function openDate(page, label) {
  await page.locator('.ktk-date-picker__trigger').click();
  const day = page.locator('.ktk-date-picker__days button').filter({hasText: /^\d+$/}).and(page.locator('[aria-label^="' + label + '"]'));
  for (let i = 0; !await day.count() && i < 2; i++) await page.getByRole('button', {name: 'Next month', exact: true}).click();
  if (await day.count() !== 1) throw Error('Exactly one intended calendar date required');
  return day;
}
const cartEmpty = page => page.evaluate(() => { const c = JSON.parse(localStorage.getItem('ktk-storefront-cart-v1') || '[]'); return c.length === 0; });
const total = page => page.locator('.ktk-configurator__total strong').textContent();
try {
  for (const width of [320, 390, 768, 1440]) {
    await fixture(width, regular.slug, 'zero guests', async (page, name) => {
      await (await openDate(page, await dateLabel(page))).click();
      await page.locator('.ktk-configurator .ktk-booking__cta').click();
      await page.waitForFunction(() => location.pathname.endsWith('/cart') || document.querySelector('[id^="ktk-participants-error-"]'));
      check(name + ' invalid selection stays on product without creating a cart', new URL(page.url()).pathname.replace(/\/$/, '').endsWith('/' + regular.slug) && await cartEmpty(page));
      const error = page.locator('#ktk-participants-error-28');
      check(name + ' visible minimum error is announced', await error.count() === 1 && (await error.textContent()).trim() === 'Choose at least 1 participant(s).' && await error.getAttribute('role') === 'alert');
      if (await error.count()) {
        const type = await error.evaluate(n => ({size: getComputedStyle(n).fontSize, line: getComputedStyle(n).lineHeight, bounds: n.getBoundingClientRect().toJSON(), width: innerWidth}));
        check(name + ' error uses readable14px type and fits the form', type.size === '14px' && Math.abs(parseFloat(type.line) - 18.9) < .01 && type.bounds.left >= 0 && type.bounds.right <= type.width + 1, type);
        const men = page.getByRole('button', {name: 'Number of men: 0', exact: true});
        check(name + ' focus and both quantity descriptions identify the error', await men.evaluate(n => document.activeElement === n) && await page.locator('[data-config-field="participants"][aria-invalid="true"][aria-describedby="ktk-participants-error-28"]').count() === 2);
        if ([390, 1440].includes(width)) await audit(page, name + ' visible error');
        if (width === 390) await page.screenshot({path: path.join(output, 'minimum-guests-390.png')});
        await men.press('ArrowDown');
        check(name + ' changing guest count clears stale error', !await error.count() && !await page.locator('[data-config-field="participants"][aria-invalid="true"]').count());
      }
    });
    await fixture(width, regular.slug, 'guests and extras', async (page, name) => {
      await (await openDate(page, await dateLabel(page, 1, true))).click();
      const men = page.getByRole('button', {name: /^Number of men:/}), women = page.getByRole('button', {name: /^Number of women:/});
      await men.press('ArrowDown'); await men.press('ArrowDown'); await women.press('ArrowDown');
      check(name + ' three guests show exact configured base estimate', (await total(page)).trim() === money.format(3 * regular.price.amount));
      const cocktails = page.getByRole('button', {name: /^Cocktails:/});
      await cocktails.press('ArrowDown'); await cocktails.press('ArrowDown'); await cocktails.press('ArrowDown'); await cocktails.press('ArrowDown');
      check(name + ' per-attendee extras cannot exceed guest count', (await cocktails.getAttribute('aria-label')).startsWith('Cocktails: 3 ') && (await total(page)).trim() === money.format(450));
      await women.press('ArrowUp');
      await page.waitForFunction(expected => document.querySelector('[aria-label^="Cocktails:"]')?.getAttribute('aria-label').startsWith('Cocktails: 2 ') && document.querySelector('.ktk-configurator__total strong')?.textContent.trim() === expected, money.format(300), {timeout: 5000});
      check(name + ' reducing guests clamps per-attendee extras and estimate', (await cocktails.getAttribute('aria-label')).startsWith('Cocktails: 2 ') && (await total(page)).trim() === money.format(300));
      const shirts = page.getByRole('button', {name: /^T-Shirts:/}); await shirts.press('ArrowDown');
      await page.locator('.ktk-configurator .ktk-booking__cta').click();
      check(name + ' unassigned shirt size cannot create a cart', await cartEmpty(page) && await page.locator('#addon-variants-error-2').count() === 1);
      const size = page.getByRole('button', {name: /^XL T-shirt quantity:/}); await size.press('ArrowDown');
      check(name + ' shirt size quantity and exact estimate are visible', (await size.getAttribute('aria-label')).endsWith(': 1') && (await total(page)).trim() === money.format(344));
      await shirts.press('ArrowUp');
      check(name + ' removing extra removes its cost', (await total(page)).trim() === money.format(300) && await cartEmpty(page));
    });
    await fixture(width, nye.slug, 'fixed NYE slots', async (page, name) => {
      check(name + ' fixed event date is explicit and cannot be changed', (await page.locator('.ktk-configurator__fixed-date strong').textContent()).trim() === '31 Dec 2026' && !await page.locator('.ktk-date-picker__trigger').count());
      const men = page.getByRole('button', {name: /^Number of men:/}); await men.press('ArrowDown');
      const time = page.getByRole('button', {name: /^Start time:/});
      await page.locator('.ktk-configurator .ktk-booking__cta').click();
      check(name + ' missing slot focuses time without creating a cart', await time.evaluate(n => document.activeElement === n) && await cartEmpty(page));
      await time.press('ArrowDown');
      check(name + ' first confirmed slot available', (await time.getAttribute('aria-label')).endsWith('17:00'));
      await time.press('ArrowDown');
      check(name + ' second confirmed slot available without price change', (await time.getAttribute('aria-label')).endsWith('19:30') && (await total(page)).trim() === money.format(nye.price.amount));
    });
  }
  for (const width of [390, 1440]) await fixture(width, regular.slug, 'unavailable-date fixture', async (page, name) => {
    const trigger = page.locator('.ktk-date-picker__trigger'), day = await openDate(page, await dateLabel(page));
    check(name + ' unavailable date is marked before selection', await day.getAttribute('aria-disabled') === 'true');
    check(name + ' explanatory unavailable control remains natively keyboard focusable', await day.evaluate(n => !n.disabled && n.tabIndex >= 0));
    await day.focus();
    await page.keyboard.press('Enter');
    check(name + ' unavailable date explains itself and restores focus', await trigger.evaluate(n => document.activeElement === n) && (await trigger.textContent()).trim() === 'Pick a date' && await page.getByRole('alert').filter({hasText: 'Isolated unavailable-date fixture'}).count() === 1 && await cartEmpty(page));
  }, true);
} finally { await browser.close(); }
check('Source and fixture inputs unchanged during audit', JSON.stringify(initial) === JSON.stringify(await hashes()));
check('One actual served bundle throughout', servedAssets.length > 0 && new Set(servedAssets.map(a => a.sha256)).size === 1, servedAssets);
check('No non-read transmission', !mutations.length, mutations);
check('No page or harness errors', !errors.length, errors);
const report = {checkedAt: new Date().toISOString(), base, inputFile, sourceHashes: initial, servedAssets, scope: 'Public-config-bound isolated UI fixtures; all product GETs fulfilled from the capture, external and non-read requests aborted. No real carts, customer data, backend quotes, provider events or payments. Automated checks are not full accessibility certification.', passed: checks.filter(c => c.pass).length, total: checks.length, checks, errors, blocked, axeViews, realMutations: mutations.length};
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass), errors}, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
