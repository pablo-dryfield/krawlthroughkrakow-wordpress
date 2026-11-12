import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const report = { checkedAt: new Date().toISOString(), cases: [] };
for (const scrollbarMode of ['default', 'visible']) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, ...(scrollbarMode === 'visible' ? { ignoreDefaultArgs: ['--hide-scrollbars'] } : {}) });
  try {
    for (const isMobile of [true, false]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile, hasTouch: isMobile,
        ...(isMobile ? { userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36' } : {}) });
      try {
        const page = await context.newPage();
        await page.goto('https://krawlthroughkrakow.com/staging/?ktk_release=halloweekend-logos-final', { waitUntil: 'load', timeout: 60000 });
        const capture = async () => page.evaluate(() => {
          const item = element => {
            const r = element.getBoundingClientRect(); const c = getComputedStyle(element);
            return { node: element.tagName + (element.id ? '#' + element.id : '') + '.' + element.className, x: r.x, right: r.right, width: r.width,
              clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, offsetWidth: element.offsetWidth,
              css: Object.fromEntries(['width','max-width','min-width','overflow','overflow-x','overflow-y','scrollbar-gutter','scrollbar-width','padding-left','padding-right','margin-left','margin-right','position','box-sizing','transform'].map(key => [key,c.getPropertyValue(key)])),
              webkitScrollbarWidth: getComputedStyle(element, '::-webkit-scrollbar').width };
          };
          const hero = document.querySelector('#ktk-seasonal-hero'); const ancestors = [];
          for (let node = hero; node; node = node.parentElement) ancestors.push(item(node));
          return { innerWidth, outerWidth, scrollX, visualViewport: { width: visualViewport.width, scale: visualViewport.scale, offsetLeft: visualViewport.offsetLeft }, scrollbarGap: innerWidth - document.documentElement.clientWidth,
            header: item(document.querySelector('#main-header')), ancestors,
            rightEdge: [0,50,150,350].map(y => ({ y, elements: document.elementsFromPoint(innerWidth - 2,y).map(el => el.tagName + '#' + el.id + '.' + el.className).slice(0,5) })) };
        });
        const before = await capture();
        const reject = page.getByRole('button', { name: /^Reject(?: all)?$/i }).first();
        await reject.waitFor({ state: 'visible', timeout: 25000 }); await reject.focus(); await page.keyboard.press('Enter');
        await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
        const after = await capture();
        await page.screenshot({ path: `docs/homepage-seasonal-hero/gutter-${scrollbarMode}-${isMobile ? 'mobile' : 'desktop'}-390.png` });
        report.cases.push({ scrollbarMode, isMobile, before, after });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
await writeFile('docs/homepage-seasonal-hero/gutter-diagnostic.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.cases.map(c => ({ mode: c.scrollbarMode, isMobile: c.isMobile, gap: c.after.scrollbarGap, viewport: c.after.visualViewport, header: c.after.header.width, ancestors: c.after.ancestors.map(e => ({ node:e.node,width:e.width,scroll:e.scrollWidth,gutter:e.css['scrollbar-gutter'],scrollbar:e.webkitScrollbarWidth })) })), null, 2));
