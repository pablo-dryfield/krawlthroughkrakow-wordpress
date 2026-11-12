import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const manifestFile = 'docs/code-pages/full-migration/manifest.json';
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
const target = option('--target', 'production');
const prefix = option('--label', target);
const widths = option('--widths', '1920,390').split(',').map(Number);
const keys = option('--keys', '').split(',').filter(Boolean);
const force = process.argv.includes('--force');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { target, startedAt: new Date().toISOString(), entries: [], errors: [] };
const contexts = new Map();
for (const width of widths) {
  contexts.set(width, await browser.newContext({ viewport: { width, height: width === 390 ? 844 : width === 768 ? 1024 : width === 1440 ? 900 : 1080 },
    deviceScaleFactor: 1, isMobile: width < 1000, hasTouch: width < 1000,
    ...(width === 390 ? { userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36' } : width === 768 ? { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' } : {}) }));
}
async function facts(page) {
  return page.evaluate(() => {
    const visible = e => e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
    const text = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
    const item = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return { tag: e.tagName, id: e.id, class: e.className,
      text: text(e).slice(0, 600), box: { x: r.x, y: r.y + scrollY, width: r.width, height: r.height },
      style: Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','textAlign','color','backgroundColor','display','position','paddingTop','paddingBottom'].map(k => [k, s[k]])) }; };
    const groups = Object.fromEntries(Object.entries({ header: '#main-header', footer: '#main-footer', sections: '#main-content .et_pb_section', modules: '#main-content .et_pb_module',
      headings: '#main-content h1,#main-content h2,#main-content h3,#main-content h4,#main-content h5,#main-content h6',
      paragraphs: '#main-content p', images: '#page-container img', frames: '#page-container iframe' }).map(([key, selector]) => [key, [...document.querySelectorAll(selector)].filter(visible).map(item)]));
    const root = document.querySelector('#page-container');
    const rect = root.getBoundingClientRect();
    return { title: document.title, viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
      contentBottom: Math.ceil(rect.bottom + scrollY), bodyClass: document.body.className, groups,
      masks: [...document.querySelectorAll('iframe,.iubenda-tp-btn,#iubenda-cs-banner,.iubenda-uspr-btn,.iub__us-widget')].filter(visible).map(e => ({...item(e).box, reason: e.tagName === 'IFRAME' ? 'external frame' : 'consent control'})),
      coreText: text(document.querySelector('#main-content')), images: [...document.images].map(e => ({ src: e.currentSrc || e.src, naturalWidth: e.naturalWidth, visible: !!visible(e) })),
      links: [...root.querySelectorAll('a[href]')].map(e => ({ text: text(e), href: e.getAttribute('href') })),
      metadata: { description: document.querySelector('meta[name="description"]')?.content || '', canonical: document.querySelector('link[rel="canonical"]')?.href || '',
        extra: [...document.head.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"],link[rel="prev"],link[rel="next"]')].map(e => e.outerHTML).join('\n'),
        schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map(e => { try { return JSON.parse(e.textContent); } catch { return null; } }).filter(Boolean) },
      cssom: [...document.styleSheets].map((s, index) => { const row = { index, id: s.ownerNode?.id || '', href: s.href, media: s.media.mediaText }; try { row.text = [...s.cssRules].map(r => r.cssText).join('\n'); } catch(error) { row.error = error.message; } return row; }),
    };
  });
}
try {
  for (const [index, route] of manifest.routes.filter(row => !keys.length || keys.includes(row.key)).entries()) {
    await mkdir(route.source, { recursive: true });
    for (const width of widths) {
      const file = path.join(route.source, `${prefix}-${width}.json`);
      if (!force) { try { const old = JSON.parse(await readFile(file, 'utf8')); if (old.complete) { report.entries.push({ key: route.key, width, cached: true }); continue; } } catch {} }
      const page = await contexts.get(width).newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        window.__ktkCaptureTimers = [];
        window.__KTK_FREEZE_CAROUSELS__ = true;
        for (const method of ['setTimeout', 'setInterval']) {
          const original = window[method];
          window[method] = function(callback, delay, ...args) { const id = original.call(window, callback, delay, ...args); if (delay >= 3000 && delay <= 12000) window.__ktkCaptureTimers.push({ method, id }); return id; };
        }
      });
      try {
        const url = target === 'production' ? route.sourceUrl : target === 'staging' ? 'https://krawlthroughkrakow.com/staging' + route.route + '?ktk_full_release=20261105' : 'http://127.0.0.1:5185' + route.route;
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        if (response.status() !== 200) throw new Error(`HTTP ${response.status()}`);
        // Full-page screenshots must paint the same offscreen content a scrolling visitor sees.
        // This removes only a rendering optimization, not content or layout styling.
        await page.addStyleTag({content:'[data-wpr-lazyrender] { content-visibility: visible !important; }'}).then(e=>e.evaluate(e=>e.id='ktk-capture-rendering'));
        await page.mouse.wheel(0, 1);
        const reject = page.getByRole('button', { name: /^Reject(?: all)?$/i }).first();
        for (let n = 0; n < 4; n++) { if (await reject.isVisible()) { await reject.click(); break; } await page.waitForTimeout(250); }
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(600, innerHeight)) { scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 150)); }
          for (const image of document.images) {
            if (!image.dataset.lazySrc || !image.getAttribute('src')?.startsWith('data:') || !image.getClientRects().length) continue;
            image.scrollIntoView({block:'center'});
            for (let n=0;n<7 && image.getAttribute('src')?.startsWith('data:');n++) await new Promise(resolve=>setTimeout(resolve,100));
          }
          await Promise.all([...document.images].filter(e => e.getClientRects().length).map(e => Promise.race([e.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 2500))])));
          await document.fonts.ready;
          scrollTo(0, 0);
        });
        await page.waitForTimeout(650);
        if (await reject.isVisible()) await reject.click();
        await page.evaluate(() => {
          for (const timer of window.__ktkCaptureTimers || []) (timer.method === 'setInterval' ? clearInterval : clearTimeout)(timer.id);
          document.querySelectorAll('.et_pb_gallery_fullwidth,.et_pb_slider').forEach(e => e.querySelector('.et-pb-controllers a,.et-pb-controllers button')?.click());
        });
        await page.waitForTimeout(650);
        if (await page.locator('#iubenda-cs-banner').isVisible()) { await reject.click(); await page.waitForTimeout(250); }
        const result = await facts(page);
        if (!result.groups.header.length || !result.coreText) throw new Error('Incomplete captured page');
        const sourceHtml = await page.content();
        if (target === 'production' && !sourceHtml.includes('et_divi_theme')) throw new Error('Unexpected source renderer');
        await writeFile(path.join(route.source, `${prefix}-${width}.html`), sourceHtml);
        await page.screenshot({ path: path.join(route.source, `${prefix}-${width}.png`), fullPage: true, animations: 'disabled', timeout: 60000 });
        const row = { complete: true, key: route.key, width, url, capturedAt: new Date().toISOString(), status: response.status(), errors, ...result };
        await writeFile(file, JSON.stringify(row, null, 2));
        report.entries.push({ key: route.key, width, complete: true, height: result.contentBottom, errors: errors.length });
        console.log(`${prefix}: ${index + 1}/${manifest.routes.length} ${route.key} ${width}px captured`);
      } catch (error) {
        report.errors.push({ key: route.key, width, message: error.message });
        console.error(`${prefix}: ${route.key} ${width}px FAILED: ${error.message}`);
      } finally { await page.close(); }
    }
    await writeFile(`docs/code-pages/full-migration/${prefix}-capture-report.json`, JSON.stringify(report, null, 2));
  }
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(`docs/code-pages/full-migration/${prefix}-capture-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ target, entries: report.entries.length, errors: report.errors }, null, 2));
  if (report.errors.length) process.exitCode = 1;
}
