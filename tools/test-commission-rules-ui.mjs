import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ui = path.resolve(process.env.OMNILODGE_ROOT || '../omni-lodge', 'ui');
const { build } = require(path.join(ui, 'node_modules/esbuild'));
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output = `docs/commission-stripe-fees/${process.env.COMMISSION_UI_PHASE || 'browser-final'}`;
await mkdir(output, { recursive: true });
const bundle = await build({ absWorkingDir: ui, bundle: true, write: false, outfile: 'fixture.js', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  stdin: { loader: 'tsx', resolveDir: ui, contents: `
    import {createRoot} from 'react-dom/client';
    import {MantineProvider,Group,Text} from '@mantine/core';
    import '@mantine/core/styles.css';
    import {AffiliateCommissionRules} from './src/components/affiliates/AffiliateCommissionRules';
    import {AFFILIATE_COMMISSION_RULES,getAffiliateCommissionEligibility} from '../be/src/services/affiliateCommissionPolicy';
    const eligibility=getAffiliateCommissionEligibility('2030-12-01T17:00:00Z','2030-12-02',false,false,10,'EXAMPLE10');
    createRoot(document.getElementById('root')).render(<MantineProvider><main style={{maxWidth:900,margin:'24px auto',padding:20}}>
      <Group justify="space-between"><h2>Bookings</h2><AffiliateCommissionRules rules={AFFILIATE_COMMISSION_RULES}/></Group>
      <Text>{eligibility.eligible?'Commission earned':eligibility.reason}</Text>
    </main></MantineProvider>);
  ` } });
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).contents;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).contents;
const server = createServer((request, response) => {
  response.setHeader('Content-Type', request.url === '/fixture.js' ? 'application/javascript' : request.url === '/fixture.css' ? 'text/css' : 'text/html');
  response.end(request.url === '/fixture.js' ? js : request.url === '/fixture.css' ? css
    : '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Commission rules fixture</title><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checks: [], errors: [], screenshots: [], geometry: [], scope: 'Isolated actual UI control and backend policy; no real records, backend APIs or financial writes.' };
const check = (name, pass) => report.checks.push({ name, pass: !!pass });
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText('Discount applied: EXAMPLE10', { exact: true }).waitFor();
    const info = page.getByRole('button', { name: 'Commission eligibility rules', exact: true });
    check(`${width}: accessible icon button`, await info.count() === 1 && await info.locator('svg').count() === 1);
    await info.focus(); await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog'); await dialog.waitFor();
    await page.waitForFunction(() => {
      const element = document.querySelector('[role="dialog"]');
      return element && getComputedStyle(element).opacity === '1'
        && element.getAnimations({ subtree: true }).every(animation => animation.playState === 'finished');
    });
    check(`${width}: backend rules render`, await dialog.getByRole('listitem').count() === 6);
    check(`${width}: correct cutoff and timezone`, (await dialog.textContent()).includes('20:45 (Europe/Warsaw)'));
    check(`${width}: discount and paid-history rules visible`, (await dialog.textContent()).includes('applied discount') && (await dialog.textContent()).includes('historical amounts'));
    const geometry = await dialog.evaluate(element => {
      const box = element.getBoundingClientRect(); return { left: box.left, right: box.right,
        scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, viewportWidth: innerWidth,
        overflow: [...element.querySelectorAll('*')].map(child => {
          const bounds = child.getBoundingClientRect();
          return { tag: child.tagName, className: child.className, text: child.textContent.slice(0, 50),
            left: bounds.left, right: bounds.right, width: bounds.width, position: getComputedStyle(child).position,
            opacity: getComputedStyle(child).opacity, ariaHidden: child.getAttribute('aria-hidden') };
        }).filter(child => child.left < box.left || child.right > box.right) };
    });
    report.geometry.push({ width, ...geometry });
    check(`${width}: modal horizontal bounds`, geometry.left >= 0 && geometry.right <= width && geometry.scrollWidth <= geometry.clientWidth + 1);
    check(`${width}: no page-wide horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const filename = `commission-rules-${width}.png`;
    await page.screenshot({ path: `${output}/${filename}`, fullPage: true }); report.screenshots.push(filename);
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    check(`${width}: keyboard closes modal`, await dialog.count() === 0);
    await context.close();
  }
  const source = await readFile(path.join(ui, 'src/pages/AffiliatesPage.tsx'), 'utf8');
  check('Affiliates table uses backend-supplied rules', source.includes('<AffiliateCommissionRules rules={data.commissionRules ?? []}'));
  check('No browser errors', report.errors.length === 0);
  report.passed = report.checks.every(item => item.pass);
  await writeFile(`${output}/ui-browser.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
