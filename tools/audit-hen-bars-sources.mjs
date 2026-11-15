import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const output = process.argv[2]; if (!output) throw Error('Fresh hen/bars source inventory required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const keys = ['post-krakow-hen-party-reviews', 'post-the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow'], manifest = JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json', 'utf8')), previous = await loadReviewedArticlePresentation();
const targets = keys.map(key => {const r = manifest.routes.find(r => r.key === key); if (!r || r.kind !== 'blog post' || previous.some(p => p.kind === 'cards' && p.articles.some(a => a.key === key))) throw Error('Two new original hen/bars identities required'); return {key, postId: r.postId, route: r.route, source: r.source};});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel: 'chrome', headless: true});
const report = {checkedAt: new Date().toISOString(), scope: 'Read-only original two-article/40-container inventory. All browser network aborted. No application/production/commerce/consent/active competition changes.', articles: [], containers: [], errors: []};
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const [index, target] of targets.entries()) {
    const raw = await readFile(target.source + '/production-1920.html', 'utf8'), current = await readFile('staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + target.key + '.html', 'utf8');
    const row = await page.evaluate(({target, raw, current, sha}) => {
      const clean = s => (s || '').replace(/\s+/g, ' ').trim(), inspect = html => {
        const d = new DOMParser().parseFromString(html, 'text/html'), main = d.querySelector('#main-content'), body = main?.querySelector('.entry-content');
        if (!body || main.querySelectorAll('.entry-content').length !== 1) throw Error('One original hen/bars body required');
        const active = selector => [...body.querySelectorAll(selector)].filter(n => !n.closest('noscript')), ids = active('[id]').map(n => ({tag: n.tagName, id: n.id})), photos = [...main.querySelectorAll('img')].filter(n => !n.closest('noscript'));
        return {text: clean(body.textContent), modules: [...body.querySelectorAll('.et_pb_text_inner')].map((n, i) => ({index: i, html: n.innerHTML, heads: [...n.querySelectorAll('h1,h2,h3')].map(n => [n.tagName, n.id, clean(n.textContent)]), protected: n.querySelectorAll('img,form,iframe,video,script,style,input,button').length})), heads: active('h1,h2,h3,h4').map(n => ({tag: n.tagName, id: n.id, text: clean(n.textContent)})), links: active('a[href]').map(n => ({href: n.getAttribute('href'), html: n.innerHTML})), photos: photos.map(n => ({html: n.outerHTML, src: n.dataset.lazySrc || n.getAttribute('src'), alt: n.getAttribute('alt'), parent: n.parentElement.outerHTML, inText: !!n.closest('.et_pb_text_inner'), inBody: !!n.closest('.entry-content')})), ids, uniqueIds: [...new Set(ids.map(n => n.id))], duplicateIds: ids.filter((n, i) => ids.findIndex(x => x.id === n.id) !== i), noscript: body.querySelectorAll('noscript').length, protected: body.querySelectorAll('form,iframe,video,script,style,input,button').length};
      };
      const source = inspect(raw), prepared = inspect(current), exact = '<p data-ktk-contextual-links="post-krakow-hen-party-reviews">For group planning, see our <a href="__KTK_HOME_URL__krakow-hen-do/">Krakow hen party page</a>.</p>', clone = new DOMParser().parseFromString(current, 'text/html').querySelector('#main-content .entry-content'), context = [...clone.querySelectorAll('[data-ktk-contextual-links]')];
      if (context.length !== (target.key === 'post-krakow-hen-party-reviews' ? 1 : 0) || context.some(n => n.outerHTML !== exact)) throw Error('Exact existing hen planning paragraph required');
      context.forEach(n => n.remove()); return {...target, sourceSha256: sha, source, prepared, contextualCount: context.length, sourceCopyBound: source.text === clean(clone.textContent)};
    }, {target, raw, current, sha: createHash('sha256').update(raw).digest('hex')}); report.articles.push(row);
    if (!row.sourceCopyBound || row.prepared.modules.length !== [0, 12][index] || row.prepared.photos.length !== [8, 9][index] || row.prepared.protected || row.source.protected || row.prepared.modules.some(n => n.protected) || row.prepared.uniqueIds.length !== [16, 0][index]) report.errors.push('Original hen/bars source boundary mismatch: ' + target.key);
  }
  for (const r of previous.filter(r => r.kind === 'cards')) report.containers.push(await page.evaluate(({r, targets}) => {
    const d = new DOMParser().parseFromString(r.sourceHtml, 'text/html'), all = [...r.articles, ...targets], cards = [...d.querySelectorAll('#main-content article.et_pb_post')];
    const source = cards.flatMap(n => {const t = targets.find(t => n.classList.contains('post-' + t.postId)); if (!t) return []; const p = n.querySelector('.post-content-inner > p'), raw = [...n.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()); if (!p && raw.length !== 1) throw Error('One original hen/bars excerpt required'); return [{key: t.key, summary: (p || raw[0]).textContent.replace(/\s+/g, ' ').trim()}];});
    return {key: r.key, source, nextCardKeys: cards.map(n => all.find(a => n.classList.contains('post-' + a.postId))?.key).filter(Boolean)};
  }, {r, targets}));
} catch (e) {report.errors.push(e.stack);} finally {await browser.close();}
report.summary = {articles: report.articles.length, containers: report.containers.length, photos: report.articles.reduce((n, a) => n + a.prepared.photos.length, 0), newCards: report.containers.reduce((n, c) => n + c.source.length, 0), affectedContainers: report.containers.filter(c => c.source.length).length, nextCards: report.containers.reduce((n, c) => n + c.nextCardKeys.length, 0), nextActive: report.containers.filter(c => c.nextCardKeys.length).length};
await mkdir(path.dirname(output), {recursive: true}); await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({summary: report.summary, errors: report.errors}, null, 2)); if (report.errors.length) process.exitCode = 1;
