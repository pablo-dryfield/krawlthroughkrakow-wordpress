import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const root = fileURLToPath(new URL('..', import.meta.url)), output = process.argv[2];
if (!output) throw Error('Fresh group-choice inventory required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const hash = b => createHash('sha256').update(b).digest('hex');
const manifest = JSON.parse(await readFile(path.join(root, 'docs/code-pages/full-migration/manifest.json'), 'utf8'));
const assets = JSON.parse(await readFile(path.join(root, 'docs/code-pages/full-migration/assets.json'), 'utf8'));
const previous = await loadReviewedArticlePresentation();
const keys = ['post-bachelor-party-organisers-krakow', 'post-krakow-stag-activities', 'post-krakow-team-building-activities'];
const targets = keys.map(key => {
  const r = manifest.routes.find(r => r.key === key);
  if (!r || r.kind !== 'blog post' || previous.some(p => p.kind === 'cards' && p.articles.some(a => a.key === key))) throw Error('Three new original group-choice identities required');
  return {key, postId: r.postId, route: r.route, source: r.source};
});
const report = {checkedAt: new Date().toISOString(), scope: 'Read-only three-article/40-container inventory. Every browser request aborted; no application, capture, commerce or provider changes.', articles: [], containers: [], errors: []};
const require = createRequire(import.meta.url);
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const t of targets) {
    const raw = await readFile(path.join(root, t.source, 'production-1920.html'), 'utf8');
    const current = await readFile(path.join(root, 'staging/wp-content/mu-plugins/ktk-code-pages-assets/content', t.key + '.html'), 'utf8');
    report.articles.push(await page.evaluate(({t, raw, current, assets, sha}) => {
      const clean = s => (s || '').replace(/\s+/g, ' ').trim(), inspect = html => {
        const d = new DOMParser().parseFromString(html, 'text/html'), main = d.querySelector('#main-content'), body = main?.querySelector('.entry-content');
        if (!body || main.querySelectorAll('.entry-content').length !== 1) throw Error('One original group-choice body required');
        const copy = body.cloneNode(true); copy.querySelectorAll('script,style,noscript').forEach(n => n.remove());
        const idNodes = [...body.querySelectorAll('[id]')], ids = idNodes.map(n => n.id), activeIds = idNodes.filter(n => !n.closest('noscript')).map(n => n.id);
        return {title: clean(main.querySelector('h1.entry-title')?.textContent), publication: main.querySelector('.post-meta')?.outerHTML, text: clean(copy.textContent), ids, activeIds, fallbackIds: idNodes.filter(n => n.closest('noscript')).map(n => ({id: n.id, html: n.outerHTML})), uniqueIds: [...new Set(activeIds)], modules: [...body.querySelectorAll('.et_pb_text_inner')].map(n => ({text: clean(n.textContent), photos: n.querySelectorAll('img:not(noscript img)').length})), photos: [...body.querySelectorAll('img')].filter(n => !n.closest('noscript')).map(n => {const src = n.dataset.lazySrc || n.getAttribute('src'); return {file: assets[src]?.file || src.replace('__KTK_PAGE_ASSETS__', ''), html: n.outerHTML, parent: n.parentElement.outerHTML};}), heads: [...body.querySelectorAll('h2,h3,h4')].map(n => ({tag: n.tagName, id: n.id, text: clean(n.textContent)})), links: [...body.querySelectorAll('a[href]')].map(n => ({text: clean(n.textContent), href: n.getAttribute('href'), photo: !!n.querySelector('img')})), protected: body.querySelectorAll('form,iframe,video,script,style,input,button').length, totalPhotos: [...main.querySelectorAll('img')].filter(n => !n.closest('noscript')).length};
      };
      const source = inspect(raw), prepared = inspect(current), normalized = new DOMParser().parseFromString(raw, 'text/html'), compared = new DOMParser().parseFromString(current, 'text/html');
      const removed = t.key === 'post-bachelor-party-organisers-krakow' ? ['houseoffearcitygames', 'differentgamemodesavailable'] : t.key === 'post-krakow-team-building-activities' ? ['krakowteambuildingactivities'] : [];
      for (const id of removed) {
        const anchors = [...normalized.querySelectorAll('.entry-content a[href]')].filter(n => n.getAttribute('href') === '#' + id), item = anchors[0]?.closest('li');
        if (normalized.getElementById(id) || anchors.length !== 1 || !item || item.children.length !== 1 || item.firstElementChild !== anchors[0]) throw Error('Exact previously removed broken group contents required');
        item.remove();
      }
      if (t.key === 'post-bachelor-party-organisers-krakow') {
        const nodes = compared.querySelectorAll('[data-ktk-contextual-links]');
        if (nodes.length !== 1 || nodes[0].outerHTML !== '<p data-ktk-contextual-links="post-bachelor-party-organisers-krakow">Planning a group trip? See our <a href="__KTK_HOME_URL__krakow-stag-do/">Krakow stag do options</a>.</p>') throw Error('Exact existing group planning paragraph required');
        nodes[0].remove();
      } else if (compared.querySelector('[data-ktk-contextual-links]')) throw Error('Unexpected planning paragraph');
      const normalizedSource = inspect(normalized.documentElement.outerHTML), normalizedCurrent = inspect(compared.documentElement.outerHTML);
      return {key: t.key, sourceSha256: sha, source, prepared, priorRemovedContents: removed, rawTextExact: source.text === prepared.text, textExact: normalizedSource.text === normalizedCurrent.text, idsExact: JSON.stringify(source.activeIds) === JSON.stringify(prepared.activeIds), photoFilesExact: JSON.stringify(source.photos.map(n => n.file)) === JSON.stringify(prepared.photos.map(n => n.file))};
    }, {t, raw, current, assets, sha: hash(raw)}));
  }
  for (const row of previous.filter(r => r.kind === 'cards')) {
    const current = await readFile(path.join(root, 'staging/wp-content/mu-plugins/ktk-code-pages-assets/content', row.key + '.html'), 'utf8');
    report.containers.push(await page.evaluate(({row, current, targets}) => {
      const parse = h => new DOMParser().parseFromString(h, 'text/html'), clean = s => (s || '').replace(/\s+/g, ' ').trim();
      const inspect = html => [...parse(html).querySelectorAll('#main-content article.et_pb_post')].flatMap(n => {
        const t = targets.find(t => n.classList.contains('post-' + t.postId)); if (!t) return [];
        const p = n.querySelector('.post-content-inner > p'), raw = [...n.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && clean(n.textContent));
        if (!p && raw.length !== 1) throw Error('One original group-choice excerpt required');
        return [{key: t.key, title: clean(n.querySelector('.entry-title')?.textContent), summary: clean((p || raw[0]).textContent)}];
      });
      const source = inspect(row.sourceHtml), prepared = inspect(current), all = [...row.articles, ...targets];
      const nextCardKeys = [...parse(row.sourceHtml).querySelectorAll('#main-content article.et_pb_post')].map(n => all.find(a => n.classList.contains('post-' + a.postId))?.key).filter(Boolean);
      return {key: row.key, source, prepared, nextCardKeys, exact: JSON.stringify(source) === JSON.stringify(prepared)};
    }, {row, current, targets}));
  }
  for (const a of report.articles) if (!a.textExact || !a.idsExact || !a.photoFilesExact || a.prepared.protected || a.source.modules.length !== a.prepared.modules.length || a.source.totalPhotos !== a.prepared.totalPhotos) report.errors.push('Group-choice source mismatch: ' + a.key);
  for (const c of report.containers) if (!c.exact) report.errors.push('Original group-choice card mismatch: ' + c.key);
} catch (e) {report.errors.push(e.stack);} finally {await browser.close();}
report.summary = {articles: report.articles.length, containers: report.containers.length, inlinePhotos: report.articles.reduce((n, a) => n + a.prepared.photos.length, 0), totalPhotos: report.articles.reduce((n, a) => n + a.prepared.totalPhotos, 0), newCards: report.containers.reduce((n, c) => n + c.source.length, 0), affectedContainers: report.containers.filter(c => c.source.length).length, nextCards: report.containers.reduce((n, c) => n + c.nextCardKeys.length, 0), nextActive: report.containers.filter(c => c.nextCardKeys.length).length};
await mkdir(path.dirname(output), {recursive: true}); await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({summary: report.summary, errors: report.errors}, null, 2)); if (report.errors.length) process.exitCode = 1;
