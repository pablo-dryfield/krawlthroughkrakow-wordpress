import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadFoodGuideEditorial, reviseFoodGuideEditorial, reviseFoodFeaturedDescriptions} from './food-guide-editorial.mjs';

const output = process.argv[2]; if (!output) throw Error('Fresh food-guide fixture report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const rows = await loadFoodGuideEditorial(), checks = [], errors = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const [index, r] of rows.entries()) {
    const modular = index === 0, prepared = execFileSync('git', ['show', 'e08b2fa339160471e9049ce856210a759f97086d:staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + r.key + '.html'], {encoding: 'utf8', maxBuffer: 10 * 1024 * 1024});
    for (const [label, html] of [['raw', r.sourceHtml], ['prepared', prepared]]) {
      await page.setContent(html, {waitUntil: 'domcontentloaded'}); const before = await page.locator('#main-content').innerHTML(), changes = await page.evaluate(reviseFoodGuideEditorial, {key: r.key, revision: r});
      check(r.key + ' ' + label + ' exact bounded recipe', changes.length === 1 && changes[0].removedDuplicateIds === [0, 3, 2][index], changes);
      const result = await page.evaluate(({before, r, index}) => {
        const old = new DOMParser().parseFromString('<main id="previous">' + before + '</main>', 'text/html').querySelector('#previous'), main = document.querySelector('#main-content'), body = main.querySelector('.entry-content'), previousBody = old.querySelector('.entry-content'), saved = body.innerHTML;
        const photos = n => [...n.querySelectorAll('img')].filter(n => !n.closest('noscript')).map(n => n.outerHTML), ids = [...body.querySelectorAll('[id]')].map(n => n.id), oldIds = [...new Set([...previousBody.querySelectorAll('[id]')].map(n => n.id))], toc = [...body.querySelectorAll('nav a')];
        const samePhotos = JSON.stringify(photos(main)) === JSON.stringify(photos(old)), targets = toc.length === [23, 12, 14][index] && toc.every(a => ids.filter(id => '#' + id === a.getAttribute('href')).length === 1) && new Set(ids).size === ids.length && oldIds.every(id => ids.includes(id));
        if (!index) [...body.querySelectorAll('.et_pb_text_inner')].forEach((n, i) => n.innerHTML = previousBody.querySelectorAll('.et_pb_text_inner')[i].innerHTML); else body.innerHTML = previousBody.innerHTML;
        body.removeAttribute('data-ktk-food-review'); const outside = main.innerHTML === before; body.innerHTML = saved; body.dataset.ktkFoodReview = r.version;
        return {samePhotos, targets, outside, photos: photos(main).length, ids: ids.length};
      }, {before, r, index});
      check(r.key + ' ' + label + ' every original photo element exact', result.samePhotos && result.photos === [3, 9, 5][index], result);
      check(r.key + ' ' + label + ' native topics/all unique legacy IDs retained', result.targets && result.ids === [25, 28, 32][index], result);
      check(r.key + ' ' + label + ' full outside/layout/publication inverse exact', result.outside, result);
      const after = await page.locator('#main-content').innerHTML(); check(r.key + ' ' + label + ' exact idempotent no-op', (await page.evaluate(reviseFoodGuideEditorial, {key: r.key, revision: r})).length === 0 && await page.locator('#main-content').innerHTML() === after);
    }
    const negatives = ['late-copy', 'late-id', 'late-photo', 'late-alt', 'late-style', 'late-class', 'photo-order', 'missing-photo', 'duplicate-photo', 'publication', 'unsafe-link', 'unsafe-node', 'unsafe-attribute', 'missing-target', 'missing-slot', 'duplicate-slot', 'wrong-version', 'wrong-date', 'reviewed-copy', 'late-module', ...(!modular ? ['fallback-source', 'fallback-content', 'fallback-duplicate', 'fallback-attribute', 'photo-caption'] : []), ...(index === 2 ? ['span-color', 'span-wrapper'] : [])];
    for (const mutation of negatives) {
      await page.setContent(prepared, {waitUntil: 'domcontentloaded'}); const revision = structuredClone(r);
      if (mutation === 'wrong-version') revision.version = 'unreviewed';
      else if (mutation === 'wrong-date') revision.reviewedOn = '2027-01-01';
      else if (mutation === 'unsafe-link') revision.markup = revision.markup.replace('href="https://', 'href="https://unreviewed.example/');
      else if (mutation === 'unsafe-node') revision.markup += '<iframe></iframe>';
      else if (mutation === 'unsafe-attribute') revision.markup = revision.markup.replace('<p', '<p onclick="unreviewed()"');
      else if (mutation === 'missing-target') revision.markup = revision.markup.replace(modular ? 'id="more-food-and-evening-plans"' : 'id="conclusion"', 'id="unreviewed"');
      else if (mutation === 'missing-slot') revision.markup = revision.markup.replace('<template data-ktk-food-contents></template>', '');
      else if (mutation === 'duplicate-slot') revision.markup += '<template data-ktk-food-contents></template>';
      else {
        if (mutation === 'reviewed-copy') await page.evaluate(reviseFoodGuideEditorial, {key: r.key, revision: r});
        await page.evaluate(({mutation, modular, sourceHtml}) => {
          const body = document.querySelector('.entry-content'), photos = [...body.querySelectorAll('img')], last = photos.at(-1);
          if (['late-copy', 'reviewed-copy'].includes(mutation)) body.append('Changed final copy');
          if (mutation === 'late-id') (modular ? body.querySelectorAll('.et_pb_text_inner')[42] : body.querySelector('#conclusion')).id = 'unreviewed';
          if (mutation === 'late-photo') last.src = 'https://unreviewed.example/photo.jpg';
          if (mutation === 'late-alt') last.alt = 'Unknown image';
          if (mutation === 'late-style') last.style.width = '4px';
          if (mutation === 'late-class') last.className += ' unreviewed';
          if (mutation === 'missing-photo') last.remove();
          if (mutation === 'duplicate-photo') last.after(last.cloneNode(true));
          if (mutation === 'photo-order') photos[0].parentElement.before(last);
          if (mutation === 'publication') document.querySelector('.published').append(' changed');
          if (mutation === 'late-module') {if (modular) body.querySelectorAll('.et_pb_text_inner')[42].remove(); else last.closest('p').append(' changed caption');}
          if (mutation === 'photo-caption') last.closest('p').append(' changed caption');
          if (mutation === 'span-color') photos[2].parentElement.style.color = 'red';
          if (mutation === 'span-wrapper') photos[2].parentElement.replaceWith(photos[2]);
          if (mutation.startsWith('fallback-')) {
            const d = new DOMParser().parseFromString(sourceHtml, 'text/html'), ns = d.querySelector('.entry-content noscript').cloneNode(true);
            if (mutation === 'fallback-source') ns.innerHTML = '<img src="https://unreviewed.example/">';
            if (mutation === 'fallback-content') ns.innerHTML = '<span>Unreviewed fallback</span>';
            if (mutation === 'fallback-attribute') ns.setAttribute('data-unreviewed', '1');
            photos[0].parentElement.append(ns); if (mutation === 'fallback-duplicate') ns.after(ns.cloneNode(true));
          }
        }, {mutation, modular, sourceHtml: r.sourceHtml});
      }
      const before = await page.locator('#main-content').innerHTML(); let message = ''; try {await page.evaluate(reviseFoodGuideEditorial, {key: r.key, revision});} catch (e) {message = e.message;}
      check(r.key + ' rejects ' + mutation + ' atomically', !!message && await page.locator('#main-content').innerHTML() === before, message);
    }
    if (!modular) {
      for (const [label, html] of [['raw', r.sourceHtml], ['prepared', prepared]]) {
        await page.setContent(html, {waitUntil: 'domcontentloaded'}); const before = await page.locator('#main-content').innerHTML();
        check(r.key + ' ' + label + ' one neutral featured description', (await page.evaluate(reviseFoodFeaturedDescriptions, {key: r.key, revision: r})).length === 1);
        check(r.key + ' ' + label + ' exact one-ALT inverse', await page.evaluate(({before, index}) => {const image = [...document.querySelectorAll('#main-content .et_post_meta_wrapper img')].filter(n => !n.closest('noscript'))[0], alt = image.alt; image.alt = index === 1 ? 'Krakow Food Truck Parks' : 'Krakow Milkbars'; const exact = document.querySelector('#main-content').innerHTML === before; image.alt = alt; return exact && alt === (index === 1 ? 'Food trucks and picnic tables beneath autumn trees.' : 'A tray holding dumplings, soup and bread.');}, {before, index}));
        const after = await page.locator('#main-content').innerHTML(); check(r.key + ' ' + label + ' singular featured no-op', (await page.evaluate(reviseFoodFeaturedDescriptions, {key: r.key, revision: r})).length === 0 && await page.locator('#main-content').innerHTML() === after);
      }
      for (const mutation of ['alt', 'src', 'width', 'class', 'duplicate']) {
        await page.setContent(prepared, {waitUntil: 'domcontentloaded'}); await page.evaluate(mutation => {const n = document.querySelector('#main-content .et_post_meta_wrapper img'); if (mutation === 'duplicate') n.after(n.cloneNode(true)); else n.setAttribute(mutation, 'unreviewed');}, mutation);
        const before = await page.locator('#main-content').innerHTML(); let message = ''; try {await page.evaluate(reviseFoodFeaturedDescriptions, {key: r.key, revision: r});} catch (e) {message = e.message;}
        check(r.key + ' rejects featured ' + mutation + ' without mutation', !!message && await page.locator('#main-content').innerHTML() === before, message);
      }
    }
  }
} catch (e) {errors.push(e.stack);} finally {await browser.close();}
check('No harness errors', !errors.length, errors); await mkdir(path.dirname(output), {recursive: true});
const report = {checkedAt: new Date().toISOString(), scope: 'Network-aborted raw/prepared three-guide fixtures;43 interiors,17 original photos,49 native topics, all unique legacy IDs, two separate neutral featured ALTs and atomic negative cases. Not a build or deployment.', passed: checks.filter(c => c.pass).length, total: checks.length, checks, errors};
await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass), errors}, null, 2)); if (report.passed !== report.total) process.exitCode = 1;
