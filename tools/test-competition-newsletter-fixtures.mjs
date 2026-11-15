import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {loadCompetitionNewsletterEditorial, reviseCompetitionNewsletterEditorial} from './competition-newsletter-editorial.mjs';

const output = process.argv[2]; if (!output) throw Error('Fresh story fixture report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const rows = await loadCompetitionNewsletterEditorial(), checks = [], errors = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const [index, r] of rows.entries()) for (const [version, html] of [['raw', r.sourceHtml], ['prepared', execFileSync('git', ['show', 'a93f867118b6744fa3389bb705e1a1fa16dc853e:staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + r.key + '.html'], {encoding: 'utf8', maxBuffer: 10 * 1024 * 1024})]]) {
    const name = r.key + ' ' + version;
    await page.setContent(html); const before = await page.locator('#main-content').innerHTML();
    try {
      const result = await page.evaluate(reviseCompetitionNewsletterEditorial, {key: r.key, revision: r});
      const state = await page.evaluate(({before, index}) => {
        const d = new DOMParser().parseFromString('<main id="main-content">' + before + '</main>', 'text/html'), main = document.querySelector('#main-content'), body = main.querySelector('.entry-content'), old = d.querySelector('.entry-content'), modules = [...body.querySelectorAll('.et_pb_text_inner')], originals = [...old.querySelectorAll('.et_pb_text_inner')];
        const inspect = (n, selector) => [...n.querySelectorAll(selector)].map(n => n.outerHTML), same = selector => JSON.stringify(inspect(d, selector)) === JSON.stringify(inspect(main, selector));
        const ids = [...body.querySelectorAll('[id]')].map(n => n.id), oldIds = [...old.querySelectorAll('[id]')].map(n => n.id), toc = [...body.querySelectorAll('nav a')];
        const state = {forms: same('form'), formCount: body.querySelectorAll('form').length, media: same('img,video,iframe,noscript'), photoCount: [...body.querySelectorAll('img')].filter(n => !n.closest('noscript')).length, moduleCount: modules.length, boundaries: modules.every(n => !n.querySelector('img,form,iframe,video,script,style,input,button')), targets: toc.length === [0, 5][index] && toc.every(n => ids.filter(id => '#' + id === n.getAttribute('href')).length === 1), unique: ids.length === new Set(ids).size && oldIds.every(id => ids.includes(id)), marker: body.dataset.ktkStoryReview === '2026-11-15.competition-newsletter-1'};
        const inverse = main.cloneNode(true), copy = inverse.querySelector('.entry-content'), inside = [...copy.querySelectorAll('.et_pb_text_inner')]; inside.forEach((n, i) => n.innerHTML = originals[i].innerHTML); copy.removeAttribute('data-ktk-story-review'); state.outside = inverse.innerHTML === before; return state;
      }, {before, index});
      check(name + ' complete bounded interiors/native topics/outside inverse', result.length === 1 && state.boundaries && state.targets && state.unique && state.marker && state.outside && state.moduleCount === [3, 12][index], state);
      check(name + ' active form and all original media remain exact', state.forms && state.media && state.formCount === [1, 0][index] && state.photoCount === [0, 10][index], state);
      const after = await page.locator('#main-content').innerHTML(); check(name + ' exact reviewed no-op', !(await page.evaluate(reviseCompetitionNewsletterEditorial, {key: r.key, revision: r})).length && await page.locator('#main-content').innerHTML() === after);
      for (const mutation of ['outside', 'inside']) {
        await page.locator('#main-content').evaluate((n, html) => n.innerHTML = html, after);
        await page.evaluate(m => document.querySelector(m === 'outside' ? '.entry-content' : '.et_pb_text_inner').append('Unreviewed copy'), mutation);
        const snapshot = await page.locator('#main-content').innerHTML(); let message; try {await page.evaluate(reviseCompetitionNewsletterEditorial, {key: r.key, revision: r});} catch (e) {message = e.message;}
        check(name + ' reviewed no-op rejects ' + mutation + ' copy atomically', !!message && await page.locator('#main-content').innerHTML() === snapshot, message);
      }
    } catch (e) {check(name + ' positive completes', false, e.message);}
    const mutations = ['copy', 'outside-copy', 'headline', 'missing-module', 'extra-module', 'legacy-href', 'handler', 'version', 'date', 'source', 'key', 'script', 'foreign-link', 'missing-slot', 'duplicate-target', 'heading-tag', 'slot-order'];
    if (index) mutations.push('photo-src', 'photo-alt', 'photo-style', 'photo-class', 'photo-count', 'photo-in-module'); else mutations.push('form-action', 'form-method', 'form-endpoint', 'form-count', 'form-in-module');
    for (const mutation of mutations) {
      await page.setContent(html); const revision = structuredClone(r);
      if (mutation === 'version') revision.version = 'other'; if (mutation === 'date') revision.reviewedOn = '2027-01-01'; if (mutation === 'source') revision.sourceSha256 = '0'.repeat(64); if (mutation === 'key') revision.key = 'unknown';
      if (mutation === 'script') revision.markup = revision.markup.replace('<p>', '<p><script>forbidden()</script>'); if (mutation === 'foreign-link') revision.markup = revision.markup.replace(/href="[^"]+"/, 'href="https://example.invalid/"'); if (mutation === 'missing-slot') revision.markup = revision.markup.replace('data-ktk-story-module="0"', 'data-ktk-story-module="99"'); if (mutation === 'duplicate-target') revision.markup = revision.markup.replace('</p>', '</p><h2 id="competition-prizes">Duplicate</h2>'); if (mutation === 'heading-tag') revision.markup = revision.markup.replace('<h2 ', '<h3 ').replace('</h2>', '</h3>'); if (mutation === 'slot-order') revision.markup = revision.markup.replace('data-ktk-story-module="1"', 'data-ktk-story-module="0"');
      await page.evaluate(m => {
        const b = document.querySelector('.entry-content'), module = b.querySelector('.et_pb_text_inner'), image = [...b.querySelectorAll('img')].find(n => !n.closest('noscript')), form = b.querySelector('form');
        if (m === 'copy') module.append('Unreviewed'); if (m === 'outside-copy') b.append('Unreviewed'); if (m === 'headline') [...document.querySelectorAll('#main-content h1,#main-content h2')].find(n => /^(The Big Prize Competition|KTK Winter Newsletter)$/.test(n.textContent.trim())).textContent = 'Other'; if (m === 'missing-module') module.remove(); if (m === 'extra-module') module.after(module.cloneNode(true)); if (m === 'handler') module.setAttribute('onclick', 'forbidden()'); if (m === 'legacy-href') {const a = b.querySelector('.et_pb_text_inner a'); if (a) a.href = 'https://example.invalid/'; else module.append('Unreviewed href');}
        if (m === 'photo-src') {image.removeAttribute('data-lazy-src'); image.src = 'https://example.invalid/photo.png';} if (m === 'photo-alt') image.alt = 'Unreviewed'; if (m === 'photo-style') image.style.width = '99px'; if (m === 'photo-class') image.classList.add('unreviewed'); if (m === 'photo-count') image.remove(); if (m === 'photo-in-module') module.append(image);
        if (m === 'form-action') form.action = 'https://example.invalid/'; if (m === 'form-method') form.method = 'get'; if (m === 'form-endpoint') form.dataset.feedbackEndpoint = 'https://example.invalid/'; if (m === 'form-count') form.remove(); if (m === 'form-in-module') module.append(form);
      }, mutation);
      const snapshot = await page.locator('#main-content').innerHTML(); let message; try {await page.evaluate(reviseCompetitionNewsletterEditorial, {key: r.key, revision});} catch (e) {message = e.message;}
      check(name + ' rejects ' + mutation + ' atomically', !!message && await page.locator('#main-content').innerHTML() === snapshot, message);
    }
  }
} catch (e) {errors.push(e.stack);} finally {await browser.close();}
check('No fixture harness errors', !errors.length, errors); await mkdir(path.dirname(output), {recursive: true}); const report = {checkedAt: new Date().toISOString(), scope: 'All network aborted. Two raw/prepared bodies,15 text-only interiors,10 exact photos and1 exact active form; complete outside inverse, no-op and atomic negative fixtures. No build/deployment/messages.', passed: checks.filter(c => c.pass).length, total: checks.length, checks, errors};
await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass), errors}, null, 2)); if (report.passed !== report.total) process.exitCode = 1;
