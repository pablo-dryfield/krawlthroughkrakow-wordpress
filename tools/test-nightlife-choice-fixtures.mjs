import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadNightlifeChoiceEditorial, reviseNightlifeChoiceEditorial, reviseNightlifeChoiceFeatures} from './nightlife-choice-editorial.mjs';

const output = process.argv[2]; if (!output) throw Error('Fresh nightlife-choice fixture report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const rows = await loadNightlifeChoiceEditorial(), checks = [], errors = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const [index, r] of rows.entries()) for (const [version, html] of [['raw', r.sourceHtml], ['prepared', await readFile('staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + r.key + '.html', 'utf8')]]) {
    const name = r.key + ' ' + version; await page.setContent(html); const before = await page.locator('#main-content').innerHTML();
    try {
      const result = await page.evaluate(reviseNightlifeChoiceEditorial, {key: r.key, revision: r});
      const state = await page.evaluate(({before, index}) => {
        const d = new DOMParser().parseFromString('<main id="main-content">' + before + '</main>', 'text/html'), main = document.querySelector('#main-content'), body = main.querySelector('.entry-content'), original = d.querySelector('.entry-content'), active = n => [...n.querySelectorAll('[id]')].filter(n => !n.closest('noscript')).map(n => n.id), ids = active(body), oldIds = [...new Set(active(original))], photos = n => [...n.querySelectorAll('img')].filter(n => !n.closest('noscript')).map(n => n.outerHTML), oldPhotos = photos(d), currentPhotos = photos(main), toc = [...body.querySelectorAll('nav a')];
        const summary = {photos: JSON.stringify(oldPhotos) === JSON.stringify(currentPhotos), photoCount: currentPhotos.length, targets: toc.length === [13, 19, 9][index] && toc.every(n => ids.filter(id => '#' + id === n.getAttribute('href')).length === 1), unique: ids.length === [30, 42, 22][index] && ids.length === new Set(ids).size && oldIds.every(id => ids.includes(id)), marker: body.dataset.ktkNightlifeChoiceReview === '2026-11-14.nightlife-choices-1', paragraphs: [...body.querySelectorAll('img')].every(n => n.parentElement.tagName === 'P' && !n.parentElement.attributes.length)};
        const restored = main.cloneNode(true), current = restored.querySelector('.entry-content'); current.innerHTML = original.innerHTML; current.removeAttribute('data-ktk-nightlife-choice-review'); summary.outside = restored.innerHTML === before; return summary;
      }, {before, index});
      check(name + ' complete source-bound body/native targets/publication inverse', result.length === 1 && state.targets && state.unique && state.marker && state.outside, state);
      check(name + ' all original photo elements retained with explicit safe parents', state.photos && state.paragraphs && state.photoCount === [9, 3, 6][index], state);
      const after = await page.locator('#main-content').innerHTML(); check(name + ' exact body no-op', !(await page.evaluate(reviseNightlifeChoiceEditorial, {key: r.key, revision: r})).length && await page.locator('#main-content').innerHTML() === after);
    } catch (e) {check(name + ' positive fixture completes', false, e.message);}
    for (const mutation of ['copy', 'publication', 'target', 'photo-src', 'photo-alt', 'photo-style', 'photo-id', 'photo-count', 'photo-parent', 'version', 'date', 'source', 'key', 'script', 'foreign-link', 'missing-slot', 'duplicate-target', 'heading-tag']) {
      await page.setContent(html); const revision = structuredClone(r);
      if (mutation === 'version') revision.version = 'other'; if (mutation === 'date') revision.reviewedOn = '2027-01-01'; if (mutation === 'source') revision.sourceSha256 = '0'.repeat(64); if (mutation === 'key') revision.key = 'unknown';
      if (mutation === 'script') revision.markup += '<script>forbidden()</script>'; if (mutation === 'foreign-link') revision.markup = revision.markup.replace(/href="[^"]+"/, 'href="https://example.invalid/"'); if (mutation === 'missing-slot') revision.markup = revision.markup.replace('<template data-ktk-choice-photo="0"></template>', ''); if (mutation === 'duplicate-target') revision.markup += '<p id="conclusion">Duplicate</p>'; if (mutation === 'heading-tag') revision.markup = revision.markup.replace('<h2 ', '<h3 ').replace('</h2>', '</h3>');
      await page.evaluate(mutation => {const b = document.querySelector('#main-content .entry-content'), image = [...b.querySelectorAll('img')].find(n => !n.closest('noscript')); if (mutation === 'copy') b.append('Unreviewed copy'); if (mutation === 'publication') document.querySelector('#main-content .published').textContent = 'Other'; if (mutation === 'target') b.querySelector('[id]').id = 'changed'; if (mutation === 'photo-src') {image.removeAttribute('data-lazy-src'); image.src = 'https://example.invalid/photo.png';} if (mutation === 'photo-alt') image.alt = 'Unreviewed photo'; if (mutation === 'photo-style') image.style.width = '99px'; if (mutation === 'photo-id') image.id = 'changed-photo'; if (mutation === 'photo-count') image.remove(); if (mutation === 'photo-parent') image.parentElement.setAttribute('title', 'Unreviewed parent');}, mutation);
      const snapshot = await page.locator('#main-content').innerHTML(); let message; try {await page.evaluate(reviseNightlifeChoiceEditorial, {key: r.key, revision});} catch (e) {message = e.message;}
      check(name + ' rejects ' + mutation + ' atomically', !!message && await page.locator('#main-content').innerHTML() === snapshot, message);
    }
    await page.setContent(html); const featureBefore = await page.locator('#main-content').innerHTML();
    try {
      const result = await page.evaluate(reviseNightlifeChoiceFeatures, {key: r.key, revision: r}), after = await page.locator('#main-content').innerHTML();
      const state = await page.evaluate(({before, index}) => {const d = new DOMParser().parseFromString('<main id="main-content">' + before + '</main>', 'text/html'), old = d.querySelector('.et_post_meta_wrapper img'), main = document.querySelector('#main-content').cloneNode(true), image = main.querySelector('.et_post_meta_wrapper img'), alt = ['Four people seated at a bar beneath screens showing sports.', 'A pile of wine corks.', 'A microphone with coloured lights in the background.'][index], exact = image.alt === alt; image.alt = old.alt; return {exact, outside: main.innerHTML === before};}, {before: featureBefore, index});
      check(name + ' only exact neutral featured ALT changes', result.length === 1 && state.exact && state.outside, state); check(name + ' exact feature no-op', !(await page.evaluate(reviseNightlifeChoiceFeatures, {key: r.key, revision: r})).length && await page.locator('#main-content').innerHTML() === after);
    } catch (e) {check(name + ' featured positive completes', false, e.message);}
    for (const mutation of ['src', 'alt', 'style', 'class', 'count']) {
      await page.setContent(html); await page.evaluate(mutation => {const image = document.querySelector('#main-content .et_post_meta_wrapper img'); if (mutation === 'src') {image.removeAttribute('data-lazy-src'); image.src = 'https://example.invalid/photo.png';} if (mutation === 'alt') image.alt = 'Unreviewed feature'; if (mutation === 'style') image.style.width = '99px'; if (mutation === 'class') image.classList.add('unknown'); if (mutation === 'count') image.after(image.cloneNode(true));}, mutation);
      const snapshot = await page.locator('#main-content').innerHTML(); let message; try {await page.evaluate(reviseNightlifeChoiceFeatures, {key: r.key, revision: r});} catch (e) {message = e.message;}
      check(name + ' rejects featured ' + mutation + ' atomically', !!message && await page.locator('#main-content').innerHTML() === snapshot, message);
    }
  }
} catch (e) {errors.push(e.stack);} finally {await browser.close();}
check('No fixture harness errors', !errors.length, errors); await mkdir(path.dirname(output), {recursive: true}); const report = {checkedAt: new Date().toISOString(), scope: 'All network aborted; three raw/prepared bodies,18 original photos,41 native topics, exact outside inverse, separate neutral featured ALTs and atomic negatives. No app build/deployment.', passed: checks.filter(c => c.pass).length, total: checks.length, checks, errors}; await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass), errors}, null, 2)); if (report.passed !== report.total) process.exitCode = 1;
