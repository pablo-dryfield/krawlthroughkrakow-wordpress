import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const root = fileURLToPath(new URL('..', import.meta.url)), output = process.argv[2];
if (!output) throw Error('Fresh weather/winter inventory required');
try {await readFile(output); throw Error('Preserve previous evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const hash = b => createHash('sha256').update(b).digest('hex');
const manifest = JSON.parse(await readFile(path.join(root, 'docs/code-pages/full-migration/manifest.json'), 'utf8'));
const assets = JSON.parse(await readFile(path.join(root, 'docs/code-pages/full-migration/assets.json'), 'utf8')), previous = await loadReviewedArticlePresentation();
const definitions = [['post-krakow-weather-guide', '6eda29f8487edab9fe2fd1c9277eb05a63495cf74c0178703014859fece81334', 25, 4, 0], ['post-krakow-winter-activities', 'db89098ebfb096e8196de08fbf8b475c07e0410c955197287583550bb265d367', 0, 10, 22]];
const targets = definitions.map(([key, sha, modules, photos, ids]) => {
  const r = manifest.routes.find(r => r.key === key);
  if (!r || r.kind !== 'blog post') throw Error('Original weather/winter route required');
  return {key, sha, modules, photos, ids, postId: r.postId, route: r.route, source: r.source};
});
const report = {checkedAt: new Date().toISOString(), scope: 'Read-only two-article/40-container inventory. Immutable captures and all current application files unchanged; every browser request aborted.', articles: [], containers: [], errors: []};
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const t of targets) {
    const raw = await readFile(path.join(root, t.source, 'production-1920.html'), 'utf8'), current = await readFile(path.join(root, 'staging/wp-content/mu-plugins/ktk-code-pages-assets/content', t.key + '.html'), 'utf8');
    if (hash(raw) !== t.sha) throw Error('Immutable weather/winter capture changed');
    report.articles.push(await page.evaluate(({t, raw, current, assets}) => {
      const clean = s => (s || '').replace(/\s+/g, ' ').trim(), inspect = html => {
        const d = new DOMParser().parseFromString(html, 'text/html'), main = d.querySelector('#main-content'), body = main?.querySelector('.entry-content');
        if (!body || main.querySelectorAll('.entry-content').length !== 1) throw Error('One original article body required');
        const copy = body.cloneNode(true); copy.querySelectorAll('script,style,noscript').forEach(n => n.remove());
        const ids = [...body.querySelectorAll('[id]')].map(n => n.id), modules = [...body.querySelectorAll('.et_pb_text_inner')];
        const photos = [...body.querySelectorAll('img')].filter(n => !n.closest('noscript')).map(n => {const src = n.dataset.lazySrc || n.getAttribute('src'); return {file: assets[src]?.file || src.replace('__KTK_PAGE_ASSETS__', ''), html: n.outerHTML, parent: n.parentElement.outerHTML};});
        return {title: clean(main.querySelector('h1.entry-title')?.textContent), publication: main.querySelector('.post-meta')?.outerHTML, text: clean(copy.textContent), ids, modules: modules.map(n => ({text: clean(n.textContent), photos: n.querySelectorAll('img').length})), photos, heads: [...body.querySelectorAll('h2,h3,h4')].map(n => ({tag: n.tagName, id: n.id, text: clean(n.textContent)})), links: [...body.querySelectorAll('a[href]')].map(n => ({text: clean(n.textContent), href: n.getAttribute('href'), photo: !!n.querySelector('img')})), protected: body.querySelectorAll('form,iframe,video,script,style,input,button').length, totalPhotos: [...main.querySelectorAll('img')].filter(n => !n.closest('noscript')).length};
      };
      const source = inspect(raw), prepared = inspect(current);
      return {key: t.key, sourceSha256: t.sha, source, prepared, textExact: source.text === prepared.text, idsExact: JSON.stringify(source.ids) === JSON.stringify(prepared.ids), photoFilesExact: JSON.stringify(source.photos.map(n => n.file)) === JSON.stringify(prepared.photos.map(n => n.file)), expected: {modules: t.modules, photos: t.photos, ids: t.ids}};
    }, {t, raw, current, assets}));
  }
  for (const row of previous.filter(r => r.kind === 'cards')) {
    const current = await readFile(path.join(root, 'staging/wp-content/mu-plugins/ktk-code-pages-assets/content', row.key + '.html'), 'utf8');
    report.containers.push(await page.evaluate(({row, current, targets}) => {
      const parse = h => new DOMParser().parseFromString(h, 'text/html'), clean = s => (s || '').replace(/\s+/g, ' ').trim(), inspect = html => [...parse(html).querySelectorAll('#main-content article.et_pb_post')].flatMap(n => {
        const t = targets.find(t => n.classList.contains('post-' + t.postId)); if (!t) return [];
        const p = n.querySelector('.post-content-inner > p'), raw = [...n.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && clean(n.textContent));
        if (!p && raw.length !== 1) throw Error('One exact weather/winter excerpt required');
        return [{key: t.key, title: clean(n.querySelector('.entry-title')?.textContent), summary: clean((p || raw[0]).textContent)}];
      });
      const source = inspect(row.sourceHtml), prepared = inspect(current), all = [...row.articles, ...targets], nextCardKeys = [...parse(row.sourceHtml).querySelectorAll('#main-content article.et_pb_post')].map(n => all.find(a => n.classList.contains('post-' + a.postId))?.key).filter(Boolean);
      return {key: row.key, source, prepared, nextCardKeys, exact: JSON.stringify(source) === JSON.stringify(prepared)};
    }, {row, current, targets}));
  }
  for (const a of report.articles) if (!a.textExact || !a.idsExact || !a.photoFilesExact || a.prepared.protected || a.prepared.modules.length !== a.expected.modules || a.prepared.photos.length !== a.expected.photos || a.prepared.ids.length !== a.expected.ids) report.errors.push('Weather/winter source mismatch: ' + a.key);
  for (const c of report.containers) if (!c.exact) report.errors.push('Original weather/winter card mismatch: ' + c.key);
} catch (e) {report.errors.push(e.stack);} finally {await browser.close();}
report.summary = {articles: report.articles.length, containers: report.containers.length, inlinePhotos: report.articles.reduce((n, a) => n + a.prepared.photos.length, 0), newCards: report.containers.reduce((n, c) => n + c.source.length, 0), affectedContainers: report.containers.filter(c => c.source.length).length, nextCards: report.containers.reduce((n, c) => n + c.nextCardKeys.length, 0), nextActive: report.containers.filter(c => c.nextCardKeys.length).length};
await mkdir(path.dirname(output), {recursive: true}); await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({summary: report.summary, errors: report.errors}, null, 2)); if (report.errors.length) process.exitCode = 1;
