import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadKartingGuidesEditorial, reviseKartingGuidesEditorial} from './karting-guides-editorial.mjs';

const output = process.argv[2]; if (!output) throw Error('Fresh karting fixture report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const rows = await loadKartingGuidesEditorial(), checks = [], errors = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const r of rows) {
    const prepared = execFileSync('git', ['show', '58b902e9fddbbec13fdf44bd8844657d61612b08:staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + r.key + '.html'], {encoding: 'utf8', maxBuffer: 10 * 1024 * 1024});
    for (const [label, html] of [['raw', r.sourceHtml], ['prepared', prepared]]) {
      await page.setContent(html, {waitUntil: 'domcontentloaded'});
      const before = await page.locator('#main-content').innerHTML(), changes = await page.evaluate(reviseKartingGuidesEditorial, {key: r.key, revision: r});
      check(r.key + ' ' + label + ' exact bounded recipe', changes.length === 1, changes);
      const result = await page.evaluate(({before, r}) => {
        const old = new DOMParser().parseFromString('<main id="previous">' + before + '</main>', 'text/html'), main = document.querySelector('#main-content'), previous = old.querySelector('#previous'), selector = r.key === 'post-go-karting-krakow' ? '.et_pb_text_0 > .et_pb_text_inner' : '.entry-content', body = main.querySelector(selector), previousBody = previous.querySelector(selector), copy = body.innerHTML;
        const photos = root => [...root.querySelectorAll('img')].filter(n => !n.closest('noscript')).map(n => n.outerHTML);
        const samePhotos = JSON.stringify(photos(main)) === JSON.stringify(photos(previous)), ids = [...body.querySelectorAll('[id]')].map(n => n.id), toc = [...body.querySelectorAll('nav a')], expected = r.key === 'post-go-karting-krakow' ? 17 : 9;
        const targets = toc.length === expected && toc.every(n => ids.filter(id => '#' + id === n.getAttribute('href')).length === 1) && new Set(ids).size === ids.length;
        body.innerHTML = previousBody.innerHTML; body.removeAttribute('data-ktk-karting-review');
        const outside = main.innerHTML === before; body.innerHTML = copy; body.dataset.ktkKartingReview = r.version;
        return {samePhotos, targets, outside, photoCount: photos(main).length, ids: ids.length};
      }, {before, r});
      check(r.key + ' ' + label + ' all original inline and featured image elements exact', result.samePhotos && result.photoCount === (r.key === 'post-go-karting-krakow' ? 7 : 6), result);
      check(r.key + ' ' + label + ' all native contents and unique fragments', result.targets && result.ids === (r.key === 'post-go-karting-krakow' ? 37 : 10), result);
      check(r.key + ' ' + label + ' full outside-body publication/layout inverse exact', result.outside, result);
      const after = await page.locator('#main-content').innerHTML();
      check(r.key + ' ' + label + ' idempotent no-op', (await page.evaluate(reviseKartingGuidesEditorial, {key: r.key, revision: r})).length === 0 && await page.locator('#main-content').innerHTML() === after);
    }
    for (const mutation of ['late-copy', 'late-id', 'late-photo', 'late-alt', 'late-style', 'photo-order', 'missing-photo', 'duplicate-photo', 'publication', 'unsafe-link', 'unsafe-node', 'unsafe-attribute', 'missing-target', 'missing-slot', 'duplicate-slot', 'wrong-version', 'reviewed-copy']) {
      await page.setContent(prepared, {waitUntil: 'domcontentloaded'}); const revision = structuredClone(r);
      if (mutation === 'wrong-version') revision.version = 'unreviewed';
      else if (mutation === 'unsafe-link') revision.markup = revision.markup.replace('href="__KTK_HOME_URL__store2/go-karting-30/#book"', 'href="https://unreviewed.example/"');
      else if (mutation === 'unsafe-node') revision.markup += '<iframe src="https://unreviewed.example/"></iframe>';
      else if (mutation === 'unsafe-attribute') revision.markup = revision.markup.replace('<p>', '<p onclick="unreviewed()">');
      else if (mutation === 'missing-target') revision.markup = revision.markup.replace('id="conclusion"', 'id="unknown"');
      else if (mutation === 'missing-slot') revision.markup = revision.markup.replace(/<template data-ktk-karting-photo="0"><\/template>/, '');
      else if (mutation === 'duplicate-slot') revision.markup += '<template data-ktk-karting-photo="0"></template>';
      else {
        if (mutation === 'reviewed-copy') await page.evaluate(reviseKartingGuidesEditorial, {key: r.key, revision: r});
        await page.evaluate(({mutation, key}) => {
          const body = document.querySelector(key === 'post-go-karting-krakow' ? '.et_pb_text_0 > .et_pb_text_inner' : '.entry-content'), photos = [...body.querySelectorAll('img')], last = photos.at(-1);
          if (mutation === 'late-copy' || mutation === 'reviewed-copy') body.append('Changed last paragraph');
          if (mutation === 'late-id') body.querySelector('[id="electricvsgasolinepoweredkarts"], [id="conclusion"]').id = 'unknown';
          if (mutation === 'late-photo') last.src = 'https://unreviewed.example/photo.jpg';
          if (mutation === 'late-alt') last.alt = 'Unknown photo';
          if (mutation === 'late-style') last.style.width = '4px';
          if (mutation === 'missing-photo') last.remove();
          if (mutation === 'duplicate-photo') last.after(last.cloneNode(true));
          if (mutation === 'photo-order') photos[0].parentElement.before(last);
          if (mutation === 'publication') document.querySelector('.published').append(' changed');
        }, {mutation, key: r.key});
      }
      const before = await page.locator('#main-content').innerHTML(); let message = '';
      try {await page.evaluate(reviseKartingGuidesEditorial, {key: r.key, revision});} catch (e) {message = e.message;}
      check(r.key + ' rejects ' + mutation + ' atomically', !!message && await page.locator('#main-content').innerHTML() === before, message);
    }
  }
} catch (e) {errors.push(e.stack);} finally {await browser.close();}
check('No harness errors', !errors.length, errors);
await mkdir(path.dirname(output), {recursive: true}); const report = {checkedAt: new Date().toISOString(), scope: 'Two immutable/raw/prepared article fixtures, complete media/publication/native fragments, idempotence and late atomic negatives. All network aborted, no live writes.', passed: checks.filter(c => c.pass).length, total: checks.length, checks, errors};
await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass), errors}, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
