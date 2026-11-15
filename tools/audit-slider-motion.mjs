import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';

const [base, output] = process.argv.slice(2);
if (base !== 'http://127.0.0.1:5185/' || !output) throw Error('Explicit loopback base and fresh motion inventory required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const assets = 'staging/wp-content/mu-plugins/ktk-code-pages-assets/', manifest = JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json', 'utf8')), sha = b => createHash('sha256').update(b).digest('hex'), sourceHashes = {}, inventory = [], views = [], errors = [], writes = [];
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const parser = await browser.newPage({javaScriptEnabled: false}); await parser.route('**/*', r => r.abort());
  for (const row of manifest.routes) {
    const file = assets + 'content/' + row.key + '.html', bytes = await readFile(file); sourceHashes[file] = sha(bytes);
    const sliders = await parser.evaluate(html => {const d = new DOMParser().parseFromString(html, 'text/html'); return [...d.querySelectorAll('.et_pb_slider')].map(n => ({classes: n.className, slides: n.querySelectorAll(':scope > .et_pb_slides > .et_pb_slide').length, gallerySlides: n.querySelectorAll('.et_pb_gallery_item').length, descriptions: n.querySelectorAll('.et_pb_slide_description').length, imageBoxes: n.querySelectorAll('.et_pb_slide_image').length, images: n.querySelectorAll('.et_pb_slide_image img').length, videos: n.querySelectorAll('.et_pb_slide_video').length, automatic: n.classList.contains('et_slider_auto')}));}, bytes.toString('utf8'));
    if (sliders.length) inventory.push({key: row.key, route: row.route, sliders});
  }
  await parser.close();
  for (const file of [assets + 'runtime.css', assets + 'runtime.js', 'tools/slider-motion.css', 'tools/audit-slider-motion.mjs']) sourceHashes[file] = sha(await readFile(file));
  for (const row of inventory) for (const [motion, js] of [['reduce', true], ['no-preference', true], ['reduce', false]]) {
    const name = row.key + ' ' + motion + ' ' + (js ? 'JS' : 'no-JS'), context = await browser.newContext({viewport: {width: 390, height: 900}, reducedMotion: motion, javaScriptEnabled: js, serviceWorkers: 'block'});
    try {
      await context.route('**/*', r => {const u = new URL(r.request().url()); if (!['GET', 'HEAD'].includes(r.request().method())) {writes.push({name, method: r.request().method(), path: u.pathname}); return r.abort();} return u.origin === new URL(base).origin ? r.continue() : r.abort();});
      const page = await context.newPage(); page.on('pageerror', e => errors.push({name, message: e.message}));
      const response = await page.goto(new URL(row.route.slice(1), base).href, {waitUntil: 'load', timeout: 60000});
      const facts = await page.evaluate(() => ({reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, initialized: !!window.__ktkCodeComponentsInitialized, sliders: [...document.querySelectorAll('.et_pb_slider')].map(root => ({slides: root.querySelectorAll(':scope > .et_pb_slides > .et_pb_slide').length, parts: [...root.querySelectorAll('.et_pb_slide_description,.et_pb_slide_image,.et_pb_slide_image img,.et_pb_slide_video')].map(n => {const s = getComputedStyle(n); return {tag: n.tagName, classes: n.className, animation: s.animationName, duration: s.animationDuration, delay: s.animationDelay, transition: s.transitionDuration, opacity: s.opacity, active: n.closest('.et_pb_slide')?.classList.contains('et-pb-active-slide'), hiddenSlide: getComputedStyle(n.closest('.et_pb_slide')).display === 'none'};})}))}));
      if (response.status() !== 200 || facts.reduced !== (motion === 'reduce') || facts.initialized !== js || facts.sliders.length !== row.sliders.length) throw Error('Motion inventory view mismatch: ' + name);
      views.push({name, status: response.status(), ...facts}); console.log(name + ' inventoried');
    } finally {await context.close();}
  }
} catch (e) {errors.push(e.stack);} finally {await browser.close();}
const changed = []; for (const [file, hash] of Object.entries(sourceHashes)) if (sha(await readFile(file)) !== hash) changed.push(file);
const expectedKeys = ['blog', 'krakow-hen-do', 'krakow-stag-do', 'other-tours', 'post-krawl-through-krakow-winter-newsletter', 'pub-crawl-jobs', 'stagshens'];
const complete = JSON.stringify(inventory.map(r => r.key).sort()) === JSON.stringify(expectedKeys) && views.length === 21 && !errors.length && !writes.length && !changed.length;
const report = {checkedAt: new Date().toISOString(), scope: 'Read-only inventory of all116 bodies and21 local motion/preference/JS views. Existing animations are observed, not certified. No application edits, messages/orders or provider writes.', complete, sourceHashes, inventory, views, errors, writes, changed};
await mkdir(path.dirname(output), {recursive: true}); await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({complete, pages: inventory.length, sliders: inventory.reduce((n, r) => n + r.sliders.length, 0), views: views.length, reducedViewsWithAnimations: views.filter(v => v.reduced && v.sliders.some(s => s.parts.some(p => p.animation !== 'none'))).length, errors, writes, changed}, null, 2));
if (!complete) process.exitCode = 1;
