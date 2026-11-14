import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadWeatherWinterEditorial, reviseWeatherWinterEditorial, reviseWeatherFeaturedDescription} from './weather-winter-editorial.mjs';

const output = process.argv[2]; if (!output) throw Error('Fresh weather/winter fixture report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const rows = await loadWeatherWinterEditorial(), checks = [], errors = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const r of rows) {
    const weather = r.key === 'post-krakow-weather-guide', prepared = execFileSync('git', ['show', 'e77d282214b3292dfb89bc0b3e18bfe65db66daf:staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + r.key + '.html'], {encoding: 'utf8', maxBuffer: 10 * 1024 * 1024});
    for (const [label, html] of [['raw', r.sourceHtml], ['prepared', prepared]]) {
      await page.setContent(html, {waitUntil: 'domcontentloaded'});
      const before = await page.locator('#main-content').innerHTML(), changes = await page.evaluate(reviseWeatherWinterEditorial, {key: r.key, revision: r});
      check(r.key + ' ' + label + ' exact bounded recipe', changes.length === 1, changes);
      const result = await page.evaluate(({before, r, weather}) => {
        const old = new DOMParser().parseFromString('<main id="previous">' + before + '</main>', 'text/html'), previous = old.querySelector('#previous'), main = document.querySelector('#main-content'), body = main.querySelector('.entry-content'), previousBody = previous.querySelector('.entry-content'), saved = body.innerHTML;
        const photos = root => [...root.querySelectorAll('img')].filter(n => !n.closest('noscript')).map(n => n.outerHTML), ids = [...body.querySelectorAll('[id]')].map(n => n.id), toc = [...body.querySelectorAll('nav a')];
        const samePhotos = JSON.stringify(photos(main)) === JSON.stringify(photos(previous)), targets = toc.length === (weather ? 16 : 22) && toc.every(a => ids.filter(id => '#' + id === a.getAttribute('href')).length === 1) && new Set(ids).size === ids.length;
        if (weather) [...body.querySelectorAll('.et_pb_text_inner')].forEach((n, i) => n.innerHTML = previousBody.querySelectorAll('.et_pb_text_inner')[i].innerHTML); else body.innerHTML = previousBody.innerHTML;
        body.removeAttribute('data-ktk-weather-review'); const outside = main.innerHTML === before;
        body.innerHTML = saved; body.dataset.ktkWeatherReview = r.version;
        return {samePhotos, targets, outside, photoCount: photos(main).length, ids: ids.length};
      }, {before, r, weather});
      check(r.key + ' ' + label + ' every original photo element exact', result.samePhotos && result.photoCount === (weather ? 5 : 11), result);
      check(r.key + ' ' + label + ' native topics and old fragments retained', result.targets && result.ids === (weather ? 17 : 23), result);
      check(r.key + ' ' + label + ' exact full source-interior inverse including layout and publication', result.outside, result);
      const after = await page.locator('#main-content').innerHTML(); check(r.key + ' ' + label + ' idempotent no-op', (await page.evaluate(reviseWeatherWinterEditorial, {key: r.key, revision: r})).length === 0 && await page.locator('#main-content').innerHTML() === after);
    }
    for (const mutation of ['late-copy', 'late-id', 'late-photo', 'late-alt', 'late-style', 'photo-order', 'missing-photo', 'duplicate-photo', 'publication', 'unsafe-link', 'unsafe-node', 'unsafe-attribute', 'missing-target', 'missing-slot', 'duplicate-slot', 'wrong-version', 'reviewed-copy', 'late-module', ...(!weather ? ['fallback-source', 'fallback-content', 'fallback-duplicate', 'fallback-attribute'] : [])]) {
      await page.setContent(prepared, {waitUntil: 'domcontentloaded'}); const revision = structuredClone(r);
      if (mutation === 'wrong-version') revision.version = 'unreviewed';
      else if (mutation === 'unsafe-link') revision.markup = revision.markup.replace('href="https://', 'href="https://unreviewed.example/');
      else if (mutation === 'unsafe-node') revision.markup += '<iframe></iframe>';
      else if (mutation === 'unsafe-attribute') revision.markup = revision.markup.replace('<p>', '<p onclick="unreviewed()">');
      else if (mutation === 'missing-target') revision.markup = revision.markup.replace(weather ? 'id="february-weather"' : 'id="conclusion"', 'id="unreviewed"');
      else if (mutation === 'missing-slot') revision.markup = revision.markup.replace('<template data-ktk-weather-contents></template>', '');
      else if (mutation === 'duplicate-slot') revision.markup += '<template data-ktk-weather-contents></template>';
      else {
        if (mutation === 'reviewed-copy') await page.evaluate(reviseWeatherWinterEditorial, {key: r.key, revision: r});
        await page.evaluate(({mutation, weather, sourceHtml}) => {
          const body = document.querySelector('.entry-content'), photos = [...body.querySelectorAll('img')], last = photos.at(-1);
          if (mutation === 'late-copy' || mutation === 'reviewed-copy') body.append('Changed final copy');
          if (mutation === 'late-id') {const n = weather ? body.querySelectorAll('.et_pb_text_inner')[24] : body.querySelector('#conclusion'); n.id = 'unreviewed';}
          if (mutation === 'late-photo') last.src = 'https://unreviewed.example/photo.jpg';
          if (mutation === 'late-alt') last.alt = 'Unknown image';
          if (mutation === 'late-style') last.style.width = '4px';
          if (mutation === 'missing-photo') last.remove();
          if (mutation === 'duplicate-photo') last.after(last.cloneNode(true));
          if (mutation === 'photo-order') photos[0].parentElement.before(last);
          if (mutation === 'publication') document.querySelector('.published').append(' changed');
          if (mutation === 'late-module') {if (weather) body.querySelectorAll('.et_pb_text_inner')[24].remove(); else last.parentElement.append(' changed caption');}
          if (mutation.startsWith('fallback-')) {
            const d = new DOMParser().parseFromString(sourceHtml, 'text/html'), ns = d.querySelector('.entry-content noscript').cloneNode(true);
            if (mutation === 'fallback-source') ns.innerHTML = '<img src="https://unreviewed.example/">';
            if (mutation === 'fallback-content') ns.innerHTML = '<span>Unreviewed fallback</span>';
            if (mutation === 'fallback-attribute') ns.setAttribute('data-unreviewed', '1');
            photos[0].parentElement.append(ns); if (mutation === 'fallback-duplicate') ns.after(ns.cloneNode(true));
          }
        }, {mutation, weather, sourceHtml: r.sourceHtml});
      }
      const before = await page.locator('#main-content').innerHTML(); let message = '';
      try {await page.evaluate(reviseWeatherWinterEditorial, {key: r.key, revision});} catch (e) {message = e.message;}
      check(r.key + ' rejects ' + mutation + ' atomically', !!message && await page.locator('#main-content').innerHTML() === before, message);
    }
    if (weather) {
      for (const [label, html] of [['raw', r.sourceHtml], ['prepared', prepared]]) {
        await page.setContent(html, {waitUntil: 'domcontentloaded'}); const before = await page.locator('#main-content').innerHTML();
        check('Weather photo ' + label + ' one neutral description correction', (await page.evaluate(reviseWeatherFeaturedDescription, {key: r.key, revision: r})).length === 1);
        check('Weather photo ' + label + ' every byte outside the one ALT exact', await page.evaluate(before => {const image = [...document.querySelectorAll('#main-content .et_post_meta_wrapper img')].filter(n => !n.closest('noscript'))[0], alt = image.alt; image.alt = 'Two people on a pub crawl in Krak\u00f3w.'; const exact = document.querySelector('#main-content').innerHTML === before; image.alt = alt; return exact && alt === 'Pedestrians crossing a street beside historic buildings.';}, before));
        const after = await page.locator('#main-content').innerHTML(); check('Weather photo ' + label + ' singular idempotent no-op', (await page.evaluate(reviseWeatherFeaturedDescription, {key: r.key, revision: r})).length === 0 && await page.locator('#main-content').innerHTML() === after);
      }
      for (const mutation of ['alt', 'src', 'width', 'duplicate']) {
        await page.setContent(prepared, {waitUntil: 'domcontentloaded'}); await page.evaluate(mutation => {const image = document.querySelector('#main-content .et_post_meta_wrapper img'); if (mutation === 'duplicate') image.after(image.cloneNode(true)); else image.setAttribute(mutation, 'unreviewed');}, mutation);
        const before = await page.locator('#main-content').innerHTML(); let message = ''; try {await page.evaluate(reviseWeatherFeaturedDescription, {key: r.key, revision: r});} catch (e) {message = e.message;}
        check('Weather photo rejects changed ' + mutation + ' without mutation', !!message && await page.locator('#main-content').innerHTML() === before, message);
      }
    }
  }
} catch (e) {errors.push(e.stack);} finally {await browser.close();}
check('No harness errors', !errors.length, errors);
await mkdir(path.dirname(output), {recursive: true}); const report = {checkedAt: new Date().toISOString(), scope: 'Raw and prepared two-guide fixtures,25 weather interiors,16 photo elements,38 native topics and atomic negative mutations. All network aborted; not a deployment.', passed: checks.filter(c => c.pass).length, total: checks.length, checks, errors};
await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass), errors}, null, 2)); if (report.passed !== report.total) process.exitCode = 1;
