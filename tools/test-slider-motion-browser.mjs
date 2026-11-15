import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';

const [base, output] = process.argv.slice(2);
if (!['http://127.0.0.1:5185/', 'https://krawlthroughkrakow.com/staging/'].includes(base) || !output) throw Error('Explicit local/staging base and fresh motion report required');
try {await readFile(path.join(output, 'report.json')); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
await mkdir(output, {recursive: true});
const keys = ['post-krawl-through-krakow-winter-newsletter', 'blog', 'krakow-hen-do', 'krakow-stag-do', 'other-tours', 'pub-crawl-jobs', 'stagshens'], counts = [2, 2, 6, 16, 1, 4, 1], manifest = JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json', 'utf8')), routes = keys.map(key => manifest.routes.find(r => r.key === key)), root = 'staging/wp-content/mu-plugins/ktk-code-pages-assets/', parts = '.et_pb_slide_description,.et_pb_slide_image,.et_pb_slide_image img,.et_pb_slide_video', files = ['tools/test-slider-motion-browser.mjs', 'tools/content-accessibility.css', root + 'runtime.css', root + 'runtime.js', ...keys.map(k => root + 'content/' + k + '.html')], sha = b => createHash('sha256').update(b).digest('hex');
files.splice(files.indexOf('tools/content-accessibility.css'), 1, 'tools/slider-motion.css', 'tools/slider-motion-styles.mjs');
const hashes = async () => {const result = {}; for (const file of files) result[file] = sha(await readFile(file)); return result;}, sourceHashes = await hashes(), checks = [], errors = [], writes = [], axeViews = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), frontend = createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json')); if (frontend('axe-core/package.json').version !== '4.14.0') throw Error('Pinned axe version required');
const axe = await readFile(frontend.resolve('axe-core/axe.min.js'), 'utf8'), browser = await chromium.launch({channel: 'chrome', headless: true}); let views = 0;
async function bounded(promise, name) {let timer; try {return await Promise.race([promise, new Promise((_, reject) => {timer = setTimeout(() => reject(Error(name + ' exceeded30s')), 30000);})]);} finally {clearTimeout(timer);}}
async function open(row, width, motion, js, freeze = true) {
  const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: motion, javaScriptEnabled: js, serviceWorkers: 'block'}), name = row.key + ' ' + width + ' ' + motion + ' ' + (js ? 'JS' : 'no-JS');
  await context.route('**/*', route => {const r = route.request(), u = new URL(r.url()); if (!['GET', 'HEAD'].includes(r.method())) {writes.push({name, method: r.method(), path: u.pathname}); return route.abort();} return u.origin === new URL(base).origin && (u.hostname === '127.0.0.1' || u.pathname.startsWith('/staging/') || u.pathname === '/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js') ? route.continue() : route.abort();});
  const page = await context.newPage(); page.on('pageerror', e => errors.push({name, message: e.message})); if (freeze) await page.addInitScript(() => {window.__KTK_FREEZE_CAROUSELS__ = true;});
  const url = new URL(row.route.slice(1), base); if (process.argv.includes('--cache-bust')) url.searchParams.set('ktk_motion_check', Date.now().toString()); const response = await page.goto(url.href, {waitUntil: 'load', timeout: 60000});
  return {context, page, name, response};
}
async function snapshot(page) {
  return page.evaluate(parts => ({reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, roots: [...document.querySelectorAll('.et_pb_slider')].map(root => {const gallery = root.classList.contains('et_pb_gallery_fullwidth'), slides = [...root.querySelectorAll(gallery ? '.et_pb_gallery_item' : ':scope > .et_pb_slides > .et_pb_slide')]; return {gallery, display: getComputedStyle(root).display, slides: slides.length, visible: slides.map((n, i) => getComputedStyle(n).display !== 'none' ? i : -1).filter(i => i >= 0), parts: [...root.querySelectorAll(parts)].map(n => {const s = getComputedStyle(n), r = n.getBoundingClientRect(); return {animation: s.animationName, opacity: s.opacity, display: s.display, width: r.width, height: r.height, hidden: getComputedStyle(n.closest('.et_pb_slide')).display === 'none'};})};})}), parts);
}
async function reducedParts(page) {return page.locator('.et_pb_slider .et_pb_slide').evaluateAll((nodes, parts) => nodes.flatMap(n => [...n.querySelectorAll(parts)]).every(n => {const s = getComputedStyle(n); return s.animationName === 'none' && s.opacity === '1';}), parts);}
try {
  for (const [i, row] of routes.entries()) for (const width of [320, 390, 768, 1440]) for (const [motion, js] of [['reduce', true], ['reduce', false], ['no-preference', true]]) {
    const {context, page, name, response} = await open(row, width, motion, js);
    try {
      const initial = await snapshot(page); check(name + ' initial preference and exact component inventory', response.status() === 200 && initial.reduced === (motion === 'reduce') && initial.roots.length === counts[i], initial);
      check(name + ' original responsive module hiding retained', initial.roots.every((r, index) => r.display !== 'none' || row.key === 'other-tours' && width <= 980 && index === 0) && (row.key !== 'other-tours' || (initial.roots[0].display === 'none') === (width <= 980)), initial.roots.map(r => r.display));
      check(name + ' inactive slides stay hidden', initial.roots.every(r => r.visible.length === 1), initial.roots.map(r => ({gallery: r.gallery, count: r.slides, visible: r.visible})));
      if (motion === 'reduce') check(name + ' text content has no animation and full opacity', await reducedParts(page), initial);
      await bounded(page.evaluate(() => document.fonts.ready), 'Motion fonts');
      if (motion === 'no-preference') {
        await bounded(page.locator('.et_pb_slider').evaluateAll(async nodes => {await Promise.allSettled(nodes.flatMap(n => n.getAnimations({subtree: true})).map(a => a.finished));}), 'Normal slider animations');
        const before = await snapshot(page), changed = await page.evaluate(() => {let found = 0; for (const sheet of document.styleSheets) {try {for (const outer of sheet.cssRules) if (outer.type === CSSRule.MEDIA_RULE && outer.cssText.includes('body.ktk-code-page #main-content .et_pb_slider .et_pb_slide :is(')) {if (outer.media.mediaText !== '(prefers-reduced-motion: reduce)') throw Error('Unexpected motion media'); outer.media.mediaText = 'not all'; found++;}} catch (e) {if (e.name !== 'SecurityError') throw e;}} return found;});
        const after = await snapshot(page); check(name + ' reduced-motion rule has zero normal-mode effect', changed === 1 && JSON.stringify(before) === JSON.stringify(after), {changed});
        await page.evaluate(() => {for (const sheet of document.styleSheets) {try {for (const outer of sheet.cssRules) if (outer.type === CSSRule.MEDIA_RULE && outer.cssText.includes('body.ktk-code-page #main-content .et_pb_slider .et_pb_slide :is(')) outer.media.mediaText = '(prefers-reduced-motion: reduce)';} catch (e) {if (e.name !== 'SecurityError') throw e;}}});
      }
      if (js) {
        for (const [index, carousel] of (await page.locator('.et_pb_slider').all()).entries()) {
          const count = initial.roots[index].slides; if (count < 2) continue;
          if (initial.roots[index].display === 'none') {check(name + ' original hidden Other Tours module stays non-interactive', row.key === 'other-tours' && width <= 980 && index === 0 && !await carousel.isVisible()); continue;}
          const current = async () => carousel.locator('.et-pb-active-slide').evaluateAll(nodes => nodes.length === 1 ? [...nodes[0].parentElement.children].indexOf(nodes[0]) : -1);
          const next = carousel.getByRole('button', {name: 'Next slide', exact: true}), previous = carousel.getByRole('button', {name: 'Previous slide', exact: true}), dots = carousel.locator('.et-pb-controllers > a');
          await next.focus(); await page.keyboard.press('Enter'); check(name + ' carousel' + index + ' Next Enter', await current() === 1);
          if (motion === 'reduce') check(name + ' carousel' + index + ' newly selected content stays still', await reducedParts(page));
          await previous.focus(); await page.keyboard.press('Space'); check(name + ' carousel' + index + ' Previous Space', await current() === 0);
          await dots.last().focus(); await page.keyboard.press('Enter'); check(name + ' carousel' + index + ' last dot Enter', await current() === count - 1 && await dots.last().getAttribute('aria-current') === 'true');
          await dots.first().focus(); await page.keyboard.press('Space'); check(name + ' carousel' + index + ' first dot Space', await current() === 0 && await dots.first().getAttribute('aria-current') === 'true');
        }
        const final = await snapshot(page); check(name + ' controls never reveal multiple slides', final.roots.every(r => r.visible.length === 1), final);
        await page.emulateMedia({reducedMotion: motion === 'reduce' ? 'no-preference' : 'reduce'}); await page.emulateMedia({reducedMotion: 'reduce'}); check(name + ' changed preference immediately stops content animations', await reducedParts(page)); await page.emulateMedia({reducedMotion: motion});
      }
      if (width === 390 && js && motion === 'reduce') {await page.addScriptTag({content: axe}); const a = await bounded(page.evaluate(() => axe.run(document.querySelector('#main-content'), {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})), 'Motion axe'); axeViews.push({name, violations: a.violations, incomplete: a.incomplete.map(x => ({id: x.id, nodes: x.nodes.length}))}); check(name + ' zero automated axe violations', !a.violations.length, a.violations);}
      if (width === 390 && js) {
        await bounded(page.locator('.et_pb_slider').evaluateAll(async nodes => {await Promise.allSettled(nodes.flatMap(n => n.getAnimations({subtree: true})).map(a => a.finished));}), 'Screenshot animation completion');
        const first = page.locator('.et_pb_slider:visible').first(), target = await first.count() ? first : page.locator('#main-content h1').first(); await target.evaluate(n => n.scrollIntoView({block: 'start'}));
        await bounded(page.waitForFunction(() => [...document.querySelectorAll('#main-content img')].filter(n => {const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0;}).every(n => n.complete && n.naturalWidth > 0)), 'Visible screenshot photos');
        const photos = await page.locator('#main-content img').evaluateAll(async nodes => {const visible = nodes.filter(n => {const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0;}); await Promise.all(visible.map(n => n.decode())); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); return visible.map(n => ({src: n.currentSrc, loaded: n.complete && n.naturalWidth > 0}));});
        check(name + ' visible screenshot photos decode before capture', photos.every(n => n.loaded), photos);
        await page.screenshot({path: path.join(output, row.key + '-' + motion + '.png')});
      }
      views++; console.log(name + ' complete (' + views + '/84)');
    } finally {await context.close();}
  }
  for (const row of routes.filter(r => ['post-krawl-through-krakow-winter-newsletter', 'krakow-stag-do', 'stagshens'].includes(r.key))) {
    const {context, page, name} = await open(row, 390, 'reduce', true, false);
    try {
      const automatic = page.locator('.et_pb_slider.et_slider_auto').first(), delay = await automatic.evaluate(n => Math.max(1000, Number(n.className.match(/et_slider_speed_(\d+)/)?.[1]) || 7000)), selected = () => automatic.locator('.et-pb-active-slide').evaluate(n => [...n.parentElement.children].indexOf(n));
      const count = await automatic.evaluate(n => n.querySelectorAll(n.classList.contains('et_pb_gallery_fullwidth') ? '.et_pb_gallery_item' : ':scope > .et_pb_slides > .et_pb_slide').length);
      if (row.key === 'krakow-stag-do') {const first = await selected(); check(name + ' original single-photo gallery has no autoplay controls', count === 1 && await automatic.locator('.ktk-parity-gallery-pause,.et-pb-slider-arrows').count() === 0); await page.emulateMedia({reducedMotion: 'no-preference'}); await page.waitForTimeout(delay + 500); check(name + ' single-photo gallery stays static after preference change', await selected() === first && await automatic.locator('.ktk-parity-gallery-pause,.et-pb-slider-arrows').count() === 0); continue;}
      check(name + ' genuine multi-slide autoplay inventory', count === (row.key === 'stagshens' ? 3 : 8));
      await automatic.evaluate(n => n.scrollIntoView({block: 'center'})); await page.mouse.move(-10, -10); const first = await selected(); await page.waitForTimeout(delay + 500); check(name + ' real autoplay stays stopped under reduce', await selected() === first);
      await page.emulateMedia({reducedMotion: 'no-preference'}); await page.waitForTimeout(delay + 500); const advanced = await selected(); check(name + ' autoplay resumes after preference change', advanced !== first, {first, advanced, delay});
      await page.emulateMedia({reducedMotion: 'reduce'}); await page.waitForTimeout(delay + 500); check(name + ' returning to reduce cancels autoplay', await selected() === advanced && await reducedParts(page));
      const pause = automatic.getByRole('button', {name: 'Pause slideshow', exact: true}); await pause.focus(); await page.keyboard.press('Enter'); await page.emulateMedia({reducedMotion: 'no-preference'}); await page.evaluate(() => document.activeElement.blur()); await page.mouse.move(-10, -10); await page.waitForTimeout(delay + 500); check(name + ' user pause survives preference change', await selected() === advanced && await automatic.getByRole('button', {name: 'Play slideshow', exact: true}).getAttribute('aria-pressed') === 'true');
    } finally {await context.close();}
  }
} catch (e) {errors.push(e.stack);} finally {await browser.close();}
check('All84 responsive JS/no-JS/preference views complete', views === 84); check('All owned source hashes remain exact', JSON.stringify(sourceHashes) === JSON.stringify(await hashes())); check('No browser/harness errors', !errors.length, errors); check('No non-read/provider writes sent', !writes.length, writes);
const report = {checkedAt: new Date().toISOString(), base, scope: '84 responsive reduced/no-preference JS/no-JS views over7 routes/32 roots, real keyboard controls, immediate/dynamic preference visibility, normal-mode CSSOM zero-effect comparisons,2 un-frozen multi-slide autoplay preference/pause checks plus the original single-photo fallback,7 JS axe views. Providers/writes blocked; no forms/orders/settings changed.', sourceHashes, passed: checks.filter(c => c.pass).length, total: checks.length, checks, errors, writes, axe: axeViews}; await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, views, axe: axeViews.map(v => ({name: v.name, violations: v.violations.length, incomplete: v.incomplete.length})), failed: checks.filter(c => !c.pass), errors}, null, 2)); if (report.passed !== report.total) process.exitCode = 1;
