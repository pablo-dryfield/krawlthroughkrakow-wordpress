import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ui = path.resolve(process.env.OMNILODGE_ROOT || '../omni-lodge', 'ui');
const { build } = require(path.join(ui, 'node_modules/esbuild'));
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output = 'docs/clarity-journey-links/delivery';
await mkdir(output, { recursive: true });
const bundle = await build({
  absWorkingDir: ui, bundle: true, write: false, outfile: 'fixture.js', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.woff': 'dataurl', '.woff2': 'dataurl' },
  stdin: { loader: 'tsx', resolveDir: ui, contents: `
    import {createRoot} from 'react-dom/client';
    import {MantineProvider} from '@mantine/core';
    import '@mantine/core/styles.css';
    import {StorefrontActivityTimeline} from './src/components/storefront/StorefrontActivityTimeline';
    const reference={projectId:'project1',userId:'nativeuser',sessionId:'nativesession',environment:'production'};
    const event={id:'event1',type:'clarity_recording_linked',source:'client',severity:'info',sequence:2,occurredAt:'2026-11-11T12:00:02Z',receivedAt:'2026-11-11T12:00:03Z',details:reference};
    const visit={id:'c3c7d60f-b420-4925-892f-00484ce786cd',browserInstanceId:null,startedAt:'2026-11-11T12:00:00Z',lastActivityAt:'2026-11-11T12:00:30Z',qualifiedAt:'2026-11-11T12:00:00Z',claritySampled:true,claritySessionId:'custom-not-native',events:[event,{...event,id:'event2',details:{...reference,sessionId:'secondsession'}},{...event,id:'event3'}]};
    createRoot(document.getElementById('root')).render(<MantineProvider><div style={{maxWidth:1000,margin:'24px auto',padding:16}}><h2>Storefront History</h2><StorefrontActivityTimeline visits={[visit,{...visit,id:'d3c7d60f-b420-4925-892f-00484ce786cd',events:[]},{...visit,id:'e3c7d60f-b420-4925-892f-00484ce786cd',events:[],claritySampled:false}]} /></div></MantineProvider>);
  ` },
});
const js = bundle.outputFiles.find(f => f.path.endsWith('.js')).contents;
const css = bundle.outputFiles.find(f => f.path.endsWith('.css')).contents;
const server = createServer((req, res) => {
  res.setHeader('Content-Type', req.url === '/fixture.js' ? 'application/javascript' : req.url === '/fixture.css' ? 'text/css' : 'text/html');
  res.end(req.url === '/fixture.js' ? js : req.url === '/fixture.css' ? css : '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checks: [], errors: [], scope: 'Isolated real shared timeline, no production records or real clipboard/Clarity traffic.', screenshots: [] };
const check = (name, pass) => report.checks.push({ name, pass: !!pass });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { window.__testCopied = value; } } }));
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(base);
    await page.getByText('Lookup only', { exact: true }).waitFor();
    check(width + ' native links deduplicated, no invented custom-ID player URL', JSON.stringify(await page.locator('a[href*="/player/"]').evaluateAll(links => links.map(a => a.href))) === JSON.stringify([
      'https://clarity.microsoft.com/player/project1/nativeuser/nativesession',
      'https://clarity.microsoft.com/player/project1/nativeuser/secondsession',
    ]));
    const search = page.getByRole('link', { name: 'Find visitor in Clarity', exact: true });
    check(width + ' one visitor search despite multiple native sessions and repeated references', await search.count() === 1 && await page.locator('a').count() === 3);
    check(width + ' exact native-user search destination', await search.getAttribute('href') === 'https://clarity.microsoft.com/projects/view/project1/impressions?date=Last%2030%20days&UserId=is%3Bnativeuser');
    check(width + ' all external links use safe new-tab attributes', await page.locator('a').evaluateAll(links => links.every(link => link.target === '_blank' && link.rel === 'noopener noreferrer' && new URL(link.href).origin === 'https://clarity.microsoft.com')));
    check(width + ' visitor search is a compact icon control', await search.evaluate(element => { const box = element.getBoundingClientRect(); return !!element.querySelector('svg') && !element.textContent.trim() && box.width <= 32 && box.height <= 32 && box.width === box.height; }));
    check(width + ' honest legacy/missing state', await page.getByText('No recording link', { exact: true }).count() === 1 && await page.getByText('Replay available', { exact: true }).count() === 0);
    await page.getByRole('button', { name: 'Copy Clarity custom session ID', exact: true }).nth(1).click();
    check(width + ' copies the visit identity, never the old context custom ID', await page.evaluate(() => window.__testCopied) === 'd3c7d60f-b420-4925-892f-00484ce786cd');
    check(width + ' no page-wide overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check(width + ' all replay controls fit', await page.locator('a,button').evaluateAll(elements => elements.every(e => { const b = e.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth; })));
    await page.mouse.move(0, 0);
    await page.getByRole('tooltip', { name: 'Visit ID copied', exact: true }).waitFor({ state: 'hidden' });
    await page.screenshot({ path: output + '/timeline-' + width + '.png', fullPage: true });
    report.screenshots.push('timeline-' + width + '.png');
    await search.hover();
    const searchTooltip = page.getByRole('tooltip', { name: /^Find visitor in Clarity\./ });
    await searchTooltip.waitFor({ state: 'visible' });
    await page.waitForFunction(() => [...document.querySelectorAll('[role="tooltip"]')].some(element => element.textContent.startsWith('Find visitor in Clarity.') && getComputedStyle(element).opacity === '1'));
    check(width + ' tooltip does not promise uploaded or retained playback', await searchTooltip.textContent() === 'Find visitor in Clarity. A native reference does not confirm recording upload or retention.');
    check(width + ' tooltip stays within the viewport', await searchTooltip.evaluate(element => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; }));
    await page.screenshot({ path: output + '/timeline-' + width + '-search-tooltip.png', fullPage: true });
    report.screenshots.push('timeline-' + width + '-search-tooltip.png');
    await context.close();
  }
  const payment = await readFile(path.join(ui, 'src/pages/PaymentLinksPage.tsx'), 'utf8');
  const booking = await readFile(path.join(ui, 'src/components/bookings/BookingDetailsModal.tsx'), 'utf8');
  const manifest = await readFile(path.join(ui, 'src/pages/BookingsManifestPage.tsx'), 'utf8');
  const dashboard = await readFile(path.join(ui, 'src/components/bookings/BookingsExecutiveDashboard.tsx'), 'utf8');
  check('ongoing carts and payment links use the shared timeline', payment.includes('<StorefrontActivityTimeline visits={activity.visits}') && !payment.includes('Replay sampled'));
  check('manifest and booking dashboard use the shared booking-history modal', manifest.includes('<BookingDetailsModal') && dashboard.includes('<BookingDetailsModal') && booking.includes('<StorefrontActivityTimeline'));
  check('no browser application errors', report.errors.length === 0);
  report.passed = report.checks.every(c => c.pass);
  await writeFile(output + '/ui-browser.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
