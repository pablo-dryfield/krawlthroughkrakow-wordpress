import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));
}

const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const url = option('--url', 'http://127.0.0.1:5184/');
const width = Number(option('--width', '1024'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
      scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    scrollTo(0, 0);
    await document.fonts.ready;
  });
  const result = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll('body *')].map(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id,
        class: typeof element.className === 'string' ? element.className : '',
        parent: element.parentElement ? {
          tag: element.parentElement.tagName.toLowerCase(),
          id: element.parentElement.id,
          class: typeof element.parentElement.className === 'string' ? element.parentElement.className : '',
          text: element.parentElement.childElementCount ? element.parentElement.firstChild?.textContent?.trim().slice(0, 80) || '' : element.parentElement.textContent.trim().slice(0, 80),
        } : null,
        text: element.childElementCount ? '' : element.textContent.trim().slice(0, 80),
        left: Math.round(rect.left * 100) / 100,
        right: Math.round(rect.right * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        position: style.position,
        transform: style.transform,
      };
    }).filter(item => item.width > 0 && (item.left < -1 || item.right > document.documentElement.clientWidth + 1)),
  }));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
