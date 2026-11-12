import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
async function state(page) {
  return page.evaluate(() => {
    const facts = element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { class: element.className, text: element.textContent, opacity: style.opacity, visibility: style.visibility, display: style.display, top: rect.top, bottom: rect.bottom, focused: element === document.activeElement };
    };
    return { scrollY, height: innerHeight, icons: [...document.querySelectorAll('.et_pb_blurb .et-waypoint')].map(facts), controls: [...document.querySelectorAll('.et_pb_gallery_fullwidth .et-pb-arrow-prev,.et_pb_gallery_fullwidth .et-pb-arrow-next,.et_pb_gallery_fullwidth .et-pb-controllers a,.et_pb_gallery_fullwidth .et-pb-controllers button')].map(facts) };
  });
}
try {
  for (const width of [390, 1920]) {
    for (const [name, url] of [['production', 'https://krawlthroughkrakow.com/'], ['staging', 'https://krawlthroughkrakow.com/staging/?ktk_parity=visibility']]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1080 }, deviceScaleFactor: 1, isMobile: width === 390, hasTouch: width === 390 });
      try {
        const page = await context.newPage();
        const record = { name, width, errors: [] };
        page.on('pageerror', error => record.errors.push(error.message));
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.mouse.wheel(0, 10);
        await page.getByRole('button', { name: /^Reject$/i }).click({ timeout: 20000 });
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 160)); }
          await document.fonts.ready;
          const icon = document.querySelector('.et_pb_blurb .et_pb_animation_top');
          scrollTo(0, icon.getBoundingClientRect().top + scrollY - 150);
        });
        await page.waitForTimeout(2500);
        record.after2500ms = await state(page);
        await page.waitForTimeout(2500);
        record.after5000ms = await state(page);
        const gallery = page.locator('.et_pb_gallery_fullwidth').first();
        await gallery.scrollIntoViewIfNeeded();
        await page.mouse.move(0, 0);
        await page.waitForTimeout(1500);
        record.galleryRest = await state(page);
        await gallery.hover();
        await page.waitForTimeout(700);
        record.galleryHover = await state(page);
        await page.mouse.move(0, 0);
        await gallery.locator('a').first().focus();
        await page.keyboard.press('Tab');
        await page.waitForTimeout(700);
        record.galleryKeyboard = await state(page);
        report.push(record);
      } finally { await context.close(); }
    }
  }
} finally {
  await browser.close();
  await writeFile('docs/homepage-parity/visibility-state-inspection.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.map(record => ({ name: record.name, width: record.width, icons2500: record.after2500ms.icons.map(icon => icon.opacity), icons5000: record.after5000ms.icons.map(icon => icon.opacity), arrowsRest: record.galleryRest.controls.slice(0, 2).map(control => control.opacity), arrowsHover: record.galleryHover.controls.slice(0, 2).map(control => control.opacity), arrowsKeyboard: record.galleryKeyboard.controls.slice(0, 2).map(control => control.opacity), errors: record.errors })), null, 2));
}
