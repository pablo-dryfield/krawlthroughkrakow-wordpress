import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const root = fileURLToPath(new URL('..', import.meta.url)), output = process.argv[2];
if (!output) throw Error('Fresh nightlife-choice inventory required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const hash = b => createHash('sha256').update(b).digest('hex'), manifest = JSON.parse(await readFile(path.join(root, 'docs/code-pages/full-migration/manifest.json'), 'utf8')), assets = JSON.parse(await readFile(path.join(root, 'docs/code-pages/full-migration/assets.json'), 'utf8')), previous = await loadReviewedArticlePresentation();
const definitions = [['post-sports-bar-krakow', 'a6e61994db9cf1524fcd6fbba88fd81c292d1cd92528f9196eb59508f448b44f'], ['post-krakow-wine-bars', '5174a63fb7ffb176340d0bf9a2bad35876999b542fabaa3767af5795b262e85e'], ['post-karaoke-bars-in-krakow', '7cabffba59ed9276229b513912cd6188b7bfb7fbe547c8221ed5fb13f87c8371']];
const targets = definitions.map(([key, sha]) => {const r = manifest.routes.find(r => r.key === key); if (!r || r.kind !== 'blog post' || previous.some(p => p.kind === 'cards' && p.articles.some(a => a.key === key))) throw Error('Three new original nightlife-choice identities required'); return {key, sha, postId: r.postId, route: r.route, source: r.source};});
const report = {checkedAt: new Date().toISOString(), scope: 'Read-only three-article/40-container inventory. Every browser request aborted; no application, source capture, commerce or provider changes.', articles: [], containers: [], errors: []};
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const t of targets) {
    const raw = await readFile(path.join(root, t.source, 'production-1920.html'), 'utf8'), current = await readFile(path.join(root, 'staging/wp-content/mu-plugins/ktk-code-pages-assets/content', t.key + '.html'), 'utf8');
    if (hash(raw) !== t.sha) throw Error('Immutable nightlife-choice capture changed');
    report.articles.push(await page.evaluate(({t, raw, current, assets}) => {
      const clean = s => (s || '').replace(/\s+/g, ' ').trim(), inspect = (html, captured = false) => {
        const d = new DOMParser().parseFromString(html, 'text/html'), main = d.querySelector('#main-content'), body = main?.querySelector('.entry-content'); if (!body || main.querySelectorAll('.entry-content').length !== 1) throw Error('One original nightlife-choice body required');
        const copy = body.cloneNode(true); copy.querySelectorAll('script,style,noscript').forEach(n => n.remove()); const idNodes = [...body.querySelectorAll('[id]')], ids = idNodes.map(n => n.id), fallbackIds = idNodes.filter(n => n.closest('noscript'));
        if (captured && t.key === 'post-sports-bar-krakow') {
          const n = fallbackIds[0], src = 'https://app.contentatscale.ai/uploader/uploads/2023/06/1687527198_1687527194979.png', visible = idNodes.filter(n => !n.closest('noscript') && n.id === 'isPasted');
          if (fallbackIds.length !== 1 || n.tagName !== 'IMG' || n.id !== 'isPasted' || n.getAttribute('src') !== src || visible.length !== 1 || visible[0].getAttribute('data-lazy-src') !== src) throw Error('Exact captured duplicate fallback identity required');
        } else if (fallbackIds.length) throw Error('Unexpected fallback fragment');
        const activeIds = idNodes.filter(n => !n.closest('noscript')).map(n => n.id);
        return {title: clean(main.querySelector('h1.entry-title')?.textContent), publication: main.querySelector('.post-meta')?.outerHTML, text: clean(copy.textContent), ids, activeIds, normalizedFallbackIds: fallbackIds.map(n => ({id: n.id, src: n.getAttribute('src')})), uniqueIds: [...new Set(ids)], modules: [...body.querySelectorAll('.et_pb_text_inner')].map(n => ({text: clean(n.textContent), photos: n.querySelectorAll('img').length})), photos: [...body.querySelectorAll('img')].filter(n => !n.closest('noscript')).map(n => {const src = n.dataset.lazySrc || n.getAttribute('src'); return {file: assets[src]?.file || src.replace('__KTK_PAGE_ASSETS__', ''), html: n.outerHTML, parent: n.parentElement.outerHTML};}), heads: [...body.querySelectorAll('h2,h3,h4')].map(n => ({tag: n.tagName, id: n.id, text: clean(n.textContent)})), links: [...body.querySelectorAll('a[href]')].map(n => ({text: clean(n.textContent), href: n.getAttribute('href'), photo: !!n.querySelector('img')})), protected: body.querySelectorAll('form,iframe,video,script,style,input,button').length, totalPhotos: [...main.querySelectorAll('img')].filter(n => !n.closest('noscript')).length};
      };
      const source = inspect(raw, true), prepared = inspect(current); return {key: t.key, sourceSha256: t.sha, source, prepared, textExact: source.text === prepared.text, idsExact: JSON.stringify(source.activeIds) === JSON.stringify(prepared.activeIds), photoFilesExact: JSON.stringify(source.photos.map(n => n.file)) === JSON.stringify(prepared.photos.map(n => n.file))};
    }, {t, raw, current, assets}));
  }
  for (const row of previous.filter(r => r.kind === 'cards')) {
    const current = await readFile(path.join(root, 'staging/wp-content/mu-plugins/ktk-code-pages-assets/content', row.key + '.html'), 'utf8');
    report.containers.push(await page.evaluate(({row, current, targets}) => {
      const parse = h => new DOMParser().parseFromString(h, 'text/html'), clean = s => (s || '').replace(/\s+/g, ' ').trim(), inspect = html => [...parse(html).querySelectorAll('#main-content article.et_pb_post')].flatMap(n => {const t = targets.find(t => n.classList.contains('post-' + t.postId)); if (!t) return []; const p = n.querySelector('.post-content-inner > p'), raw = [...n.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && clean(n.textContent)); if (!p && raw.length !== 1) throw Error('One original nightlife-choice excerpt required'); return [{key: t.key, title: clean(n.querySelector('.entry-title')?.textContent), summary: clean((p || raw[0]).textContent)}];});
      const source = inspect(row.sourceHtml), prepared = inspect(current), all = [...row.articles, ...targets], nextCardKeys = [...parse(row.sourceHtml).querySelectorAll('#main-content article.et_pb_post')].map(n => all.find(a => n.classList.contains('post-' + a.postId))?.key).filter(Boolean); return {key: row.key, source, prepared, nextCardKeys, exact: JSON.stringify(source) === JSON.stringify(prepared)};
    }, {row, current, targets}));
  }
  for (const a of report.articles) if (!a.textExact || !a.idsExact || !a.photoFilesExact || a.prepared.protected || a.source.modules.length !== a.prepared.modules.length || a.source.totalPhotos !== a.prepared.totalPhotos) report.errors.push('Nightlife-choice source mismatch: ' + a.key);
  for (const c of report.containers) if (!c.exact) report.errors.push('Original nightlife-choice card mismatch: ' + c.key);
} catch (e) {report.errors.push(e.stack);} finally {await browser.close();}
report.summary = {articles: report.articles.length, containers: report.containers.length, inlinePhotos: report.articles.reduce((n, a) => n + a.prepared.photos.length, 0), totalPhotos: report.articles.reduce((n, a) => n + a.prepared.totalPhotos, 0), newCards: report.containers.reduce((n, c) => n + c.source.length, 0), affectedContainers: report.containers.filter(c => c.source.length).length, nextCards: report.containers.reduce((n, c) => n + c.nextCardKeys.length, 0), nextActive: report.containers.filter(c => c.nextCardKeys.length).length};
await mkdir(path.dirname(output), {recursive: true}); await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({summary: report.summary, errors: report.errors}, null, 2)); if (report.errors.length) process.exitCode = 1;
