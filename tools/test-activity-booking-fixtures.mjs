import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {loadActivityBookingEditorial, reviseActivityBookingEditorial, reviseActivityBookingFeatures} from './activity-booking-editorial.mjs';

const output = process.argv[2]; if (!output) throw Error('Fresh activity-booking fixture report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const rows = await loadActivityBookingEditorial(), checks = [], errors = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const [index, r] of rows.entries()) for (const [version, html] of [['raw', r.sourceHtml], ['prepared', execFileSync('git', ['show', '401ce91133069af0193114384965b759d5b7b0c7:staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + r.key + '.html'], {encoding: 'utf8', maxBuffer: 10 * 1024 * 1024})]]) {
    const name = r.key + ' ' + version;
    await page.setContent(html); const before = await page.locator('#main-content').innerHTML();
    try {
      const result = await page.evaluate(reviseActivityBookingEditorial, {key: r.key, revision: r});
      const state = await page.evaluate(({before, index}) => {
        const d = new DOMParser().parseFromString('<main id="main-content">' + before + '</main>', 'text/html'), main = document.querySelector('#main-content'), body = main.querySelector('.entry-content'), old = d.querySelector('.entry-content'), ids = [...body.querySelectorAll('[id]')].map(n => n.id), previous = [...new Set([...old.querySelectorAll('[id]')].map(n => n.id))], photos = n => [...n.querySelectorAll('img')].filter(n => !n.closest('noscript')).map(n => n.outerHTML), toc = [...body.querySelectorAll('nav a')];
        const state = {photos: JSON.stringify(photos(d)) === JSON.stringify(photos(main)), photoCount: photos(main).length, parents: [...body.querySelectorAll('img')].every(n => n.parentElement.tagName === 'P' && !n.parentElement.attributes.length), unique: ids.length === [14, 8][index] && ids.length === new Set(ids).size && previous.every(id => ids.includes(id)), targets: toc.length === [12, 7][index] && toc.every(n => ids.filter(id => '#' + id === n.getAttribute('href')).length === 1), marker: body.dataset.ktkActivityBookingReview === '2026-11-15.activity-booking-1'};
        const inverse = main.cloneNode(true), b = inverse.querySelector('.entry-content'); b.innerHTML = old.innerHTML; b.removeAttribute('data-ktk-activity-booking-review'); state.outside = inverse.innerHTML === before; return state;
      }, {before, index});
      check(name + ' complete canonical body/native topics and exact outside inverse', result.length === 1 && state.unique && state.targets && state.marker && state.outside, state);
      check(name + ' exact original IMG elements and explicit paragraph parents', state.photos && state.parents && state.photoCount === [7, 6][index], state);
      const after = await page.locator('#main-content').innerHTML(); check(name + ' exact reviewed no-op', !(await page.evaluate(reviseActivityBookingEditorial, {key: r.key, revision: r})).length && await page.locator('#main-content').innerHTML() === after);
      await page.evaluate(() => document.querySelector('.entry-content').append('Outside unreviewed copy'));
      const snapshot = await page.locator('#main-content').innerHTML(); let message; try {await page.evaluate(reviseActivityBookingEditorial, {key: r.key, revision: r});} catch (e) {message = e.message;}
      check(name + ' reviewed no-op rejects added copy atomically', !!message && await page.locator('#main-content').innerHTML() === snapshot, message);
    } catch (e) {check(name + ' positive completes', false, e.message);}
    for (const mutation of ['copy', 'publication', 'target', 'photo-src', 'photo-alt', 'photo-style', 'photo-id', 'photo-count', 'photo-parent', 'photo-handler', 'version', 'date', 'source', 'key', 'script', 'foreign-link', 'missing-slot', 'duplicate-target', 'heading-tag', 'fallback-src', 'fallback-count', 'fallback-text', 'fallback-handler']) {
      await page.setContent(html); const revision = structuredClone(r);
      if (mutation === 'version') revision.version = 'other'; if (mutation === 'date') revision.reviewedOn = '2027-01-01'; if (mutation === 'source') revision.sourceSha256 = '0'.repeat(64); if (mutation === 'key') revision.key = 'unknown';
      if (mutation === 'script') revision.markup += '<script>forbidden()</script>'; if (mutation === 'foreign-link') revision.markup = revision.markup.replace(/href="[^"]+"/, 'href="https://example.invalid/"'); if (mutation === 'missing-slot') revision.markup = revision.markup.replace('<template data-ktk-activity-photo="0"></template>', ''); if (mutation === 'duplicate-target') revision.markup += '<h2 id="conclusion">Duplicate</h2>'; if (mutation === 'heading-tag') revision.markup = revision.markup.replace('<h2 ', '<h3 ').replace('</h2>', '</h3>');
      await page.evaluate(mutation => {const b = document.querySelector('.entry-content'), image = [...b.querySelectorAll('img')].find(n => !n.closest('noscript')); if (mutation === 'copy') b.append('Unreviewed copy'); if (mutation === 'publication') document.querySelector('.published').textContent = 'Other'; if (mutation === 'target') b.querySelector('[id]').id = 'changed'; if (mutation === 'photo-src') {image.removeAttribute('data-lazy-src'); image.src = 'https://example.invalid/photo.png';} if (mutation === 'photo-alt') image.alt = 'Unreviewed'; if (mutation === 'photo-style') image.style.width = '99px'; if (mutation === 'photo-id') image.id = 'changed'; if (mutation === 'photo-count') image.remove(); if (mutation === 'photo-parent') image.parentElement.title = 'Unreviewed'; if (mutation === 'photo-handler') image.setAttribute('onload', 'forbidden()'); if (mutation.startsWith('fallback-')) {let ns = b.querySelector('noscript'); if (!ns) {ns = document.createElement('noscript'); ns.innerHTML = '<img src="https://example.invalid/">'; image.after(ns);} if (mutation === 'fallback-src') ns.innerHTML = ns.innerHTML.replace(/src="[^"]+"/, 'src="https://example.invalid/"'); if (mutation === 'fallback-count') ns.after(ns.cloneNode(true)); if (mutation === 'fallback-text') ns.innerHTML += 'Unreviewed'; if (mutation === 'fallback-handler') ns.innerHTML = ns.innerHTML.replace('<img ', '<img onload="forbidden()" ');}}, mutation);
      const snapshot = await page.locator('#main-content').innerHTML(); let message; try {await page.evaluate(reviseActivityBookingEditorial, {key: r.key, revision});} catch (e) {message = e.message;}
      check(name + ' rejects ' + mutation + ' atomically', !!message && await page.locator('#main-content').innerHTML() === snapshot, message);
    }
    await page.setContent(html); const featureBefore = await page.locator('#main-content').innerHTML();
    try {
      const result = await page.evaluate(reviseActivityBookingFeatures, {key: r.key, revision: r});
      const state = await page.evaluate(({before, index}) => {const d = new DOMParser().parseFromString('<main id="main-content">' + before + '</main>', 'text/html'), main = document.querySelector('#main-content').cloneNode(true), a = d.querySelector('.et_post_meta_wrapper img'), b = main.querySelector('.et_post_meta_wrapper img'), exact = b.alt === ['The underside of an illuminated bridge reflected in a river at night.', 'A paper shooting target with numbered rings and holes.'][index]; b.alt = a.alt; return {exact, outside: main.innerHTML === before};}, {before: featureBefore, index});
      check(name + ' only neutral feature ALT changes', result.length === 1 && state.exact && state.outside, state); const after = await page.locator('#main-content').innerHTML(); check(name + ' exact feature no-op', !(await page.evaluate(reviseActivityBookingFeatures, {key: r.key, revision: r})).length && await page.locator('#main-content').innerHTML() === after);
    } catch (e) {check(name + ' featured positive completes', false, e.message);}
    for (const mutation of ['src', 'alt', 'style', 'class', 'count']) {
      await page.setContent(html); await page.evaluate(m => {const n = document.querySelector('.et_post_meta_wrapper img'); if (m === 'src') {n.removeAttribute('data-lazy-src'); n.src = 'https://example.invalid/';} if (m === 'alt') n.alt = 'Other'; if (m === 'style') n.style.width = '99px'; if (m === 'class') n.classList.add('unknown'); if (m === 'count') n.after(n.cloneNode(true));}, mutation);
      const snapshot = await page.locator('#main-content').innerHTML(); let message; try {await page.evaluate(reviseActivityBookingFeatures, {key: r.key, revision: r});} catch (e) {message = e.message;}
      check(name + ' rejects featured ' + mutation + ' atomically', !!message && await page.locator('#main-content').innerHTML() === snapshot, message);
    }
  }
} catch (e) {errors.push(e.stack);} finally {await browser.close();}
check('No fixture harness errors', !errors.length, errors); await mkdir(path.dirname(output), {recursive: true}); const report = {checkedAt: new Date().toISOString(), scope: 'All network aborted; two raw/prepared bodies,13 original photos,19 native topics, outside inverse, neutral feature ALTs and atomic negatives. No application build/deployment.', passed: checks.filter(c => c.pass).length, total: checks.length, checks, errors};
await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass), errors}, null, 2)); if (report.passed !== report.total) process.exitCode = 1;
