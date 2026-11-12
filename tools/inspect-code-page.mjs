import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const result = [];
try {
  for (const width of [1920, 1440, 1100, 1024, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto('https://krawlthroughkrakow.com/about-us/how-to-join/', { waitUntil: 'domcontentloaded' });
    await page.mouse.wheel(0, 10);
    await page.waitForTimeout(5000);
    result.push(await page.evaluate(() => ({ width: innerWidth,
      nodes: ['#main-header', '#main-header > .container', '#et-top-navigation', '#et-top-navigation nav', '#top-menu', '#logo', '#page-container', '#main-footer', '#footer-info'].map(selector => {
        const e = document.querySelector(selector), s = getComputedStyle(e), r = e.getBoundingClientRect();
        return { selector, inline: e.getAttribute('style'), x: r.x, y: r.y, w: r.width, h: r.height, padding: s.padding, width: s.width, height: s.height, maxHeight: s.maxHeight, minHeight: s.minHeight, font: s.font, float: s.float };
      })
    })));
    await page.close();
  }
} finally { await browser.close(); }
await writeFile('docs/code-pages/how-to-join/header-diagnostic.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
