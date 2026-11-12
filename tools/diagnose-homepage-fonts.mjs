import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
try {
  for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36' });
    try {
      const page = await context.newPage();
      const fonts = [];
      page.on('response', response => { if (/\.woff2?(?:\?|$)/.test(response.url())) fonts.push({ url: response.url(), status: response.status() }); });
      await page.goto('https://krawlthroughkrakow.com/staging/?ktk_release=schedule-colors-20261008', { waitUntil: 'domcontentloaded' });
      await page.evaluate(async () => {
        const heading = document.querySelector('.ktk-hero-heading');
        heading.getBoundingClientRect();
        const style = getComputedStyle(heading);
        await document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, 'EVERY NIGHT 9 PM ADAM STATUE KRAWL THROUGH KRAKOW');
        await document.fonts.ready;
      });
      const samples = [];
      for (const delay of [0, 250, 2000]) {
        await page.waitForTimeout(delay);
        samples.push(await page.evaluate(() => {
          const canvas = document.createElement('canvas').getContext('2d');
          const values = [...document.querySelectorAll('.ktk-hero-panel--regular .ktk-hero-schedule > *, .ktk-hero-panel--halloween .ktk-hero-brand,.ktk-hero-panel--halloween .ktk-hero-city')].map(element => {
            const style = getComputedStyle(element);
            const range = document.createRange(); range.selectNodeContents(element);
            const text = element.innerText.toUpperCase().split('\n').filter(Boolean);
            const measurements = size => {
              canvas.font = `${style.fontStyle} ${style.fontWeight} ${size} ${style.fontFamily}`;
              return text.map(line => { const m = canvas.measureText(line); return { line, width: m.width, ink: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, ascent: m.fontBoundingBoxAscent, descent: m.fontBoundingBoxDescent }; });
            };
            return { selector: element.tagName + '.' + element.className, family: style.fontFamily, weight: style.fontWeight, size: style.fontSize,
              range: [...range.getClientRects()].map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height })), actual: measurements(style.fontSize), at100: measurements('100px') };
          });
          return { status: document.fonts.status, faces: [...document.fonts].map(f => ({ family: f.family, weight: f.weight, style: f.style, status: f.status, unicodeRange: f.unicodeRange })), values };
        }));
      }
      const cdp = await context.newCDPSession(page);
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument');
      const platformFonts = [];
      for (const selector of ['.ktk-hero-panel--regular .ktk-hero-schedule > span:first-child','.ktk-hero-panel--regular .ktk-hero-schedule > strong','.ktk-hero-panel--regular .ktk-hero-schedule > span:last-child','.ktk-hero-panel--halloween .ktk-hero-brand']) {
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
        platformFonts.push({ selector, ...await cdp.send('CSS.getPlatformFontsForNode', { nodeId }) });
      }
      if (javaScriptEnabled) {
        const reject = page.getByRole('button', { name: 'Reject', exact: true });
        if (await reject.count()) { await reject.focus(); await page.keyboard.press('Enter'); }
      }
      await page.screenshot({ path: `docs/homepage-seasonal-hero/schedule-font-${javaScriptEnabled ? 'js' : 'no-js'}-390.png` });
      report.push({ javaScriptEnabled, fonts, platformFonts, samples });
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
await writeFile('docs/homepage-seasonal-hero/schedule-font-diagnostic.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.map(item => ({ javaScriptEnabled: item.javaScriptEnabled, fonts: item.fonts, platformFonts: item.platformFonts, first: item.samples[0].values, last: item.samples.at(-1).values })), null, 2));
