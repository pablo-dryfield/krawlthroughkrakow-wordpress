import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {loadPartyTripEditorial, revisePartyTripEditorial, revisePartyTripFeature} from './party-trip-editorial.mjs';

const output = process.argv[2]; if (!output) throw Error('Fresh party-trip fixture report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const rows = await loadPartyTripEditorial(), checks = [], errors = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const [index, r] of rows.entries()) for (const [version, html] of [['raw', r.sourceHtml], ['prepared', execFileSync('git', ['show', 'd9e021da60fcb9047d3ae8c8feee791d8307da47:staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + r.key + '.html'], {encoding: 'utf8', maxBuffer: 10 * 1024 * 1024})]]) {
    const name = r.key + ' ' + version; await page.setContent(html); const before = await page.locator('#main-content').innerHTML();
    try {
      const result = await page.evaluate(revisePartyTripEditorial, {key: r.key, revision: r});
      const state = await page.evaluate(({before, index}) => {
        const d = new DOMParser().parseFromString('<main id="main-content">' + before + '</main>', 'text/html'), main = document.querySelector('#main-content'), body = main.querySelector('.entry-content'), old = d.querySelector('.entry-content'), modules = [...body.querySelectorAll('.et_pb_text_inner')], originals = [...old.querySelectorAll('.et_pb_text_inner')], active = (n, s) => [...n.querySelectorAll(s)].filter(n => !n.closest('noscript')).map(n => n.outerHTML);
        const images = JSON.stringify(active(d, 'img')) === JSON.stringify(active(main, 'img')), ids = [...body.querySelectorAll('[id]')].map(n => n.id), oldIds = [...old.querySelectorAll('[id]')].filter(n => !n.closest('noscript')).map(n => n.id), toc = [...body.querySelectorAll('nav a')], context = body.querySelector('[data-ktk-contextual-links]');
        const state = {photos: images, photoCount: active(main, 'img').length, marker: body.dataset.ktkPartyTripReview === '2026-11-15.party-trip-1', unique: ids.length === new Set(ids).size && ids.length === [7, 22][index] && oldIds.every(id => ids.includes(id)), native: toc.length === [6, 20][index] && toc.every(a => ids.filter(id => '#' + id === a.getAttribute('href')).length === 1) && body.querySelectorAll('nav details summary').length === 1, context: !index ? !context : context?.outerHTML === '<p data-ktk-contextual-links="post-hen-do-ideas-abroad">Organising a trip to Krakow? Browse our <a href="__KTK_HOME_URL__krakow-hen-do/">hen party options</a>.</p>'};
        const inverse = main.cloneNode(true), inverseBody = inverse.querySelector('.entry-content'); if (index) inverseBody.innerHTML = old.innerHTML; else [...inverseBody.querySelectorAll('.et_pb_text_inner')].forEach((n, i) => n.innerHTML = originals[i].innerHTML); inverseBody.removeAttribute('data-ktk-party-trip-review'); state.outside = inverse.innerHTML === before; return state;
      }, {before, index});
      check(name + ' bounded complete source revision/native targets/outside inverse', result.length === 1 && state.outside && state.marker && state.unique && state.native && state.context, state);
      check(name + ' every original non-fallback image and feature remain exact', state.photos && state.photoCount === [0, 4][index], state);
      const after = await page.locator('#main-content').innerHTML(); check(name + ' exact reviewed no-op', !(await page.evaluate(revisePartyTripEditorial, {key: r.key, revision: r})).length && await page.locator('#main-content').innerHTML() === after);
      for (const mutation of ['inside', 'outside']) {
        await page.locator('#main-content').evaluate((n, h) => n.innerHTML = h, after); await page.evaluate(m => document.querySelector(m === 'inside' ? '[data-ktk-party-trip-review] p' : '.entry-content').append('Unreviewed text'), mutation);
        const snapshot = await page.locator('#main-content').innerHTML(); let message; try {await page.evaluate(revisePartyTripEditorial, {key: r.key, revision: r});} catch (e) {message = e.message;}
        check(name + ' no-op rejects ' + mutation + ' drift atomically', !!message && await page.locator('#main-content').innerHTML() === snapshot, message);
      }
    } catch (e) {check(name + ' positive completes', false, e.message);}
    const mutations = ['copy', 'headline', 'source-href', 'handler', 'version', 'date', 'source', 'key', 'script', 'foreign-link', 'missing-contents', 'duplicate-target', 'heading-tag', ...(index ? ['photo-src', 'photo-alt', 'photo-style', 'photo-class', 'photo-count', 'photo-parent', 'legacy-id', 'context-link', 'context-copy', 'missing-slot', 'slot-order', 'fallback'] : ['missing-module', 'extra-module', 'outside-copy', 'module-order'])];
    for (const mutation of mutations) {
      await page.setContent(html); const revision = structuredClone(r);
      if (mutation === 'version') revision.version = 'other'; if (mutation === 'date') revision.reviewedOn = '2027-01-01'; if (mutation === 'source') revision.sourceSha256 = '0'.repeat(64); if (mutation === 'key') revision.key = 'unknown';
      if (mutation === 'script') revision.markup = revision.markup.replace('<p>', '<p><script>forbidden()</script>'); if (mutation === 'foreign-link') revision.markup = revision.markup.replace(/href="[^"]+"/, 'href="https://example.invalid/"'); if (mutation === 'missing-contents') revision.markup = revision.markup.replace('data-ktk-party-trip-contents', 'data-ktk-other'); if (mutation === 'duplicate-target') revision.markup = revision.markup.replace('</p>', '</p><h2 id="conclusion">Duplicate</h2>'); if (mutation === 'heading-tag') revision.markup = revision.markup.replace('<h2 ', '<h3 ').replace('</h2>', '</h3>'); if (mutation === 'missing-slot') revision.markup = revision.markup.replace('data-ktk-party-trip-photo="0"', 'data-ktk-party-trip-photo="99"'); if (mutation === 'slot-order') revision.markup = revision.markup.replace('data-ktk-party-trip-photo="1"', 'data-ktk-party-trip-photo="0"'); if (mutation === 'module-order') revision.markup = revision.markup.replace('data-ktk-party-trip-module="1"', 'data-ktk-party-trip-module="0"');
      await page.evaluate(({mutation: m, index}) => {
        const body = document.querySelector('.entry-content'), module = body.querySelector('.et_pb_text_inner'), target = index ? body : module, image = [...body.querySelectorAll('img')].find(n => !n.closest('noscript'));
        if (m === 'copy') target.append('Unreviewed'); if (m === 'outside-copy') body.append('Unreviewed'); if (m === 'headline') document.querySelector('#main-content h1.entry-title').textContent = 'Other'; if (m === 'source-href') body.querySelector('a[href]').href = 'https://example.invalid/'; if (m === 'handler') target.setAttribute('onclick', 'forbidden()'); if (m === 'missing-module') module.remove(); if (m === 'extra-module') module.after(module.cloneNode(true)); if (m === 'legacy-id') body.querySelector('[id]').id = 'other';
        if (m === 'photo-src') {image.removeAttribute('data-lazy-src'); image.src = 'https://example.invalid/photo.png';} if (m === 'photo-alt') image.alt = 'Unreviewed'; if (m === 'photo-style') image.style.width = '99px'; if (m === 'photo-class') image.classList.add('unreviewed'); if (m === 'photo-count') image.remove(); if (m === 'photo-parent') image.parentElement.append('Unreviewed caption');
        if (m === 'context-link' || m === 'context-copy') {const c = body.querySelector('[data-ktk-contextual-links]'); if (c) m === 'context-link' ? c.querySelector('a').href = 'https://example.invalid/' : c.append('Other'); else body.append('Unreviewed contextual copy');}
        if (m === 'fallback') {const f = body.querySelector('noscript'); if (f) f.textContent += 'Unreviewed'; else {const n = document.createElement('noscript'); n.textContent = 'Unreviewed'; body.append(n);}}
      }, {mutation, index});
      const snapshot = await page.locator('#main-content').innerHTML(); let message; try {await page.evaluate(revisePartyTripEditorial, {key: r.key, revision});} catch (e) {message = e.message;}
      check(name + ' rejects ' + mutation + ' atomically', !!message && await page.locator('#main-content').innerHTML() === snapshot, message);
    }
    if (index) {
      await page.setContent(html); const old = await page.locator('#main-content').innerHTML(); const result = await page.evaluate(revisePartyTripFeature, {key: r.key, revision: r}), changed = await page.locator('#main-content').innerHTML();
      check(name + ' feature changes exactly one ALT string', result.length === 1 && changed.replace('People holding stemmed glasses together outdoors beneath a blue sky.', 'A group of people toasting with wine glasses under a blue sky, celebrating hen do ideas abroad.') === old);
      check(name + ' feature no-op exact', !(await page.evaluate(revisePartyTripFeature, {key: r.key, revision: r})).length && await page.locator('#main-content').innerHTML() === changed);
      for (const attr of ['src', 'alt', 'class', 'width', 'style']) {await page.setContent(html); await page.locator('.et_post_meta_wrapper img').evaluateAll((nodes, attr) => {const active = nodes.filter(n => !n.closest('noscript')); if (active.length !== 1) throw Error('One actual feature required'); active[0].removeAttribute('data-lazy-src'); active[0].setAttribute(attr, 'Unreviewed');}, attr); const snapshot = await page.locator('#main-content').innerHTML(); let message; try {await page.evaluate(revisePartyTripFeature, {key: r.key, revision: r});} catch (e) {message = e.message;} check(name + ' feature rejects ' + attr + ' atomically', !!message && await page.locator('#main-content').innerHTML() === snapshot, message);}
    }
  }
} catch (e) {errors.push(e.stack);} finally {await browser.close();}
check('No fixture harness errors', !errors.length, errors); await mkdir(path.dirname(output), {recursive: true}); const report = {checkedAt: new Date().toISOString(), scope: 'All network aborted. Two raw/exact prepared bodies,3 interiors/3 inline photos,20 legacy IDs and exact contextual paragraph. Whole outside inverse/no-op/atomic negatives and one separate neutral feature ALT; no app build/deployment.', passed: checks.filter(c => c.pass).length, total: checks.length, checks, errors};
await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass), errors}, null, 2)); if (report.passed !== report.total) process.exitCode = 1;
