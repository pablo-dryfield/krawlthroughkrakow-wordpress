import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const output = process.argv[2];
if (!output) throw Error('Fresh activity-booking inventory required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const keys = ['post-escape-rooms-for-a-stag-do-in-krakow', 'post-krakow-shooting-range'];
const manifest = JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json', 'utf8'));
const assets = JSON.parse(await readFile('docs/code-pages/full-migration/assets.json', 'utf8'));
const previous = await loadReviewedArticlePresentation();
const targets = keys.map(key => {
  const r = manifest.routes.find(r => r.key === key);
  if (!r || r.kind !== 'blog post' || previous.some(p => p.kind === 'cards' && p.articles.some(a => a.key === key))) throw Error('Two new original activity identities required');
  return {key, postId: r.postId, route: r.route, source: r.source};
});
const require = createRequire(import.meta.url);
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({channel: 'chrome', headless: true});
const report = {checkedAt: new Date().toISOString(), scope: 'Read-only original two-article/40-container inventory. All browser network aborted.', articles: [], containers: [], errors: []};
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const t of targets) {
    const raw = await readFile(t.source + '/production-1920.html', 'utf8');
    const current = await readFile('staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + t.key + '.html', 'utf8');
    report.articles.push(await page.evaluate(({t, raw, current, assets, sha}) => {
      const clean = s => (s || '').replace(/\s+/g, ' ').trim(), inspect = html => {
        const d = new DOMParser().parseFromString(html, 'text/html'), main = d.querySelector('#main-content'), body = main?.querySelector('.entry-content');
        if (!body || main.querySelectorAll('.entry-content').length !== 1) throw Error('One original activity body required');
        const copy = body.cloneNode(true); copy.querySelectorAll('script,style,noscript').forEach(n => n.remove());
        const ids = [...body.querySelectorAll('[id]')].filter(n => !n.closest('noscript')).map(n => n.id);
        const image = n => {const src = n.dataset.lazySrc || n.getAttribute('src'); return {file: assets[src]?.file || src.replace('__KTK_PAGE_ASSETS__', ''), html: n.outerHTML, parent: n.parentElement.outerHTML};};
        return {title: clean(main.querySelector('h1.entry-title')?.textContent), publication: main.querySelector('.post-meta')?.outerHTML, text: clean(copy.textContent), ids, uniqueIds: [...new Set(ids)], modules: body.querySelectorAll('.et_pb_text_inner').length, photos: [...body.querySelectorAll('img')].filter(n => !n.closest('noscript')).map(image), feature: [...main.querySelectorAll('.et_post_meta_wrapper img')].filter(n => !n.closest('noscript')).map(image), heads: [...body.querySelectorAll('h2,h3,h4')].map(n => [n.tagName, n.id, clean(n.textContent)]), links: [...body.querySelectorAll('a[href]')].map(n => ({text: clean(n.textContent), href: n.getAttribute('href')})), protected: body.querySelectorAll('form,iframe,video,script,style,input,button').length};
      };
      const source = inspect(raw), prepared = inspect(current), d = new DOMParser().parseFromString(raw, 'text/html');
      const removed = t.key === 'post-escape-rooms-for-a-stag-do-in-krakow' ? ['wheretoeatanddrinkafteryouradventure', 'suggesteditinerariesforafunweekendaway'] : [];
      for (const id of removed) {
        const anchors = [...d.querySelectorAll('.entry-content a[href]')].filter(n => n.getAttribute('href') === '#' + id), li = anchors[0]?.closest('li');
        if (d.getElementById(id) || anchors.length !== 1 || !li || li.children.length !== 1 || li.firstElementChild !== anchors[0]) throw Error('Exact previous missing activity topic required');
        li.remove();
      }
      return {key: t.key, postId: t.postId, route: t.route, sourceSha256: sha, source, prepared, priorRemovedContents: removed, textExact: inspect(d.documentElement.outerHTML).text === prepared.text, idsExact: JSON.stringify(source.ids) === JSON.stringify(prepared.ids), photoFilesExact: JSON.stringify(source.photos.map(n => n.file)) === JSON.stringify(prepared.photos.map(n => n.file))};
    }, {t, raw, current, assets, sha: createHash('sha256').update(raw).digest('hex')}));
  }
  for (const r of previous.filter(r => r.kind === 'cards')) report.containers.push(await page.evaluate(({r, targets}) => {
    const d = new DOMParser().parseFromString(r.sourceHtml, 'text/html');
    const all = [...r.articles, ...targets], nextCardKeys = [...d.querySelectorAll('#main-content article.et_pb_post')].map(n => all.find(a => n.classList.contains('post-' + a.postId))?.key).filter(Boolean);
    const source = [...d.querySelectorAll('#main-content article.et_pb_post')].flatMap(n => {const t = targets.find(t => n.classList.contains('post-' + t.postId)); if (!t) return []; const p = n.querySelector('.post-content-inner > p'), raw = [...n.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()); if (!p && raw.length !== 1) throw Error('One activity card excerpt required'); return [{key: t.key, summary: (p || raw[0]).textContent.replace(/\s+/g, ' ').trim()}];});
    return {key: r.key, source, nextCardKeys};
  }, {r, targets}));
  for (const r of report.articles) if (!r.textExact || !r.idsExact || !r.photoFilesExact || r.prepared.protected || r.source.modules !== r.prepared.modules) report.errors.push('Activity source mismatch: ' + r.key);
} catch (e) {report.errors.push(e.stack);} finally {await browser.close();}
report.summary = {articles: report.articles.length, containers: report.containers.length, inlinePhotos: report.articles.reduce((n, a) => n + a.prepared.photos.length, 0), featurePhotos: report.articles.reduce((n, a) => n + a.prepared.feature.length, 0), newCards: report.containers.reduce((n, c) => n + c.source.length, 0), affectedContainers: report.containers.filter(c => c.source.length).length, nextCards: report.containers.reduce((n, c) => n + c.nextCardKeys.length, 0), nextActive: report.containers.filter(c => c.nextCardKeys.length).length};
await mkdir(path.dirname(output), {recursive: true}); await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({summary: report.summary, errors: report.errors}, null, 2)); if (report.errors.length) process.exitCode = 1;
