import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadOwnedVodkaLinks, reviseOwnedVodkaLinks} from './owned-vodka-links.mjs';

const output = process.argv[2];
if (!output) throw Error('Fresh vodka-link fixture report required');
try { await readFile(output); throw Error('Preserve earlier evidence'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const rows = await loadOwnedVodkaLinks(), checks = [], errors = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({javaScriptEnabled: false});
  await page.route('**/*', r => r.abort());
  for (const r of rows) {
    const prepared = execFileSync('git', ['show', '95d96782608e09f29629d55bb3d6e40db6238358:staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + r.key + '.html'], {encoding: 'utf8', maxBuffer: 10 * 1024 * 1024});
    for (const [label, html] of [['raw', r.sourceHtml], ['prepared', prepared]]) {
      await page.setContent(html, {waitUntil: 'domcontentloaded'});
      const before = await page.locator('#main-content').innerHTML(), changes = await page.evaluate(reviseOwnedVodkaLinks, {key: r.key, revision: r});
      const expectedCount = r.key === 'post-best-places-to-eat' ? 2 : 1;
      check(r.key + ' ' + label + ' exact known service links', changes.length === expectedCount && changes.every(c => c.productId === 44), changes);
      const after = await page.locator('#main-content').innerHTML();
      const state = await page.evaluate(({before, changes}) => {
        const old = new DOMParser().parseFromString('<div id="before">' + before + '</div>', 'text/html').getElementById('before'), main = document.querySelector('#main-content'), clean = s => (s || '').replace(/\s+/g, ' ').trim();
        const original = main.innerHTML;
        for (const c of changes) {
          const find = d => [...d.querySelectorAll('a[href]')].filter(n => clean(n.textContent) === c.label && !n.querySelector('img'));
          const a = find(old), b = find(main);
          if (a.length !== 1 || b.length !== 1 || b[0].getAttribute('href') !== '__KTK_HOME_URL__store2/polish-vodka-tasting-44/#book') throw Error('Exact service anchor required');
          b[0].setAttribute('href', a[0].getAttribute('href'));
        }
        const outside = main.innerHTML === before;
        main.innerHTML = original;
        return outside;
      }, {before, changes});
      check(r.key + ' ' + label + ' every other node including photos, TOC, text and history exact', state);
      check(r.key + ' ' + label + ' canonical repeat no-op', !(await page.evaluate(reviseOwnedVodkaLinks, {key: r.key, revision: r})).length && await page.locator('#main-content').innerHTML() === after);
    }
    for (const kind of ['missing-first', 'missing-last', 'duplicate', 'wrong-href', 'changed-inner', 'source-href', 'wrong-sha']) {
      await page.setContent(prepared, {waitUntil: 'domcontentloaded'});
      const revision = structuredClone(r);
      if (kind === 'wrong-sha') revision.sourceSha256 = '0'.repeat(64);
      else if (kind === 'source-href') revision.sourceHtml = revision.sourceHtml.replaceAll(r.key === 'post-krakow-weather-guide' ? 'https://tastevodka.pl/' : r.key === 'post-krakow-hen-party-reviews' ? 'https://krawlthroughkrakow.com/krakow-activities' : 'https://krawlthroughkrakow.com/project/vodka-tasting-tour/', 'https://example.invalid/');
      else await page.evaluate(({kind, key}) => {
        const labels = {'post-2020-krakow-nightlife-guide': ['joining the vodka tour'], 'post-best-places-to-eat': ['the Polish vodka', 'Polish vodka'], 'post-krakow-hen-party-reviews': ['vodka tasting experience'], 'post-krakow-weather-guide': ['vodka tasting group']}[key];
        const nodes = labels.map(label => [...document.querySelectorAll('#main-content a')].find(n => n.textContent.replace(/\s+/g, ' ').trim() === label));
        if (kind === 'missing-first') nodes[0].remove();
        if (kind === 'missing-last') nodes.at(-1).remove();
        if (kind === 'duplicate') nodes[0].after(nodes[0].cloneNode(true));
        if (kind === 'wrong-href') nodes.at(-1).setAttribute('href', 'https://example.invalid/');
        if (kind === 'changed-inner') nodes.at(-1).innerHTML = '<strong>' + nodes.at(-1).innerHTML + '</strong>';
      }, {kind, key: r.key});
      const before = await page.locator('#main-content').innerHTML();
      let error = '';
      try { await page.evaluate(reviseOwnedVodkaLinks, {key: r.key, revision}); } catch (e) { error = e.message; }
      check(r.key + ' rejects ' + kind + ' atomically', !!error && await page.locator('#main-content').innerHTML() === before, error);
    }
  }
} catch (e) { errors.push(e.stack); } finally { await browser.close(); }
check('No harness errors', !errors.length, errors);
const report = {checkedAt: new Date().toISOString(), scope: 'Five exact service hrefs on four source-bound pages; raw/prepared, complete outside inverse, no-op, atomic negative tests. Network aborted.', passed: checks.filter(c => c.pass).length, total: checks.length, checks};
await mkdir(path.dirname(output), {recursive: true});
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass)}, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
