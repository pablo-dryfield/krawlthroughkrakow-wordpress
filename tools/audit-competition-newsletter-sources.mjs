import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const output = process.argv[2]; if (!output) throw Error('Fresh competition/newsletter inventory required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const keys = ['post-welcome-to-alcohol', 'post-krawl-through-krakow-winter-newsletter'], manifest = JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json', 'utf8')), previous = await loadReviewedArticlePresentation();
const targets = keys.map(key => {const r = manifest.routes.find(r => r.key === key); if (!r || r.kind !== 'blog post' || previous.some(p => p.kind === 'cards' && p.articles.some(a => a.key === key))) throw Error('Two new original article identities required'); return {key, postId: r.postId, route: r.route, source: r.source};});
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel: 'chrome', headless: true});
const report = {checkedAt: new Date().toISOString(), scope: 'Read-only original two-article/40-container inventory. All browser network aborted; active form and application unchanged.', articles: [], containers: [], errors: []};
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const [i, t] of targets.entries()) {
    const raw = await readFile(t.source + '/production-1920.html', 'utf8'), current = await readFile('staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + t.key + '.html', 'utf8');
    const facts = await page.evaluate(({t, raw, current, sha}) => {
      const clean = s => (s || '').replace(/\s+/g, ' ').trim(), inspect = html => {
        const d = new DOMParser().parseFromString(html, 'text/html'), main = d.querySelector('#main-content'), body = main?.querySelector('.entry-content');
        if (!body || main.querySelectorAll('.entry-content').length !== 1) throw Error('One original article body required');
        const active = selector => [...body.querySelectorAll(selector)].filter(n => !n.closest('noscript'));
        return {modules: [...body.querySelectorAll('.et_pb_text_inner')].map((n, index) => ({index, html: n.innerHTML, text: clean(n.textContent), ids: [...n.querySelectorAll('[id]')].map(n => n.id), protected: n.querySelectorAll('img,form,iframe,video,script,style,input,button').length, links: [...n.querySelectorAll('a[href]')].map(a => ({text: clean(a.textContent), href: a.getAttribute('href')}))})), heads: [...main.querySelectorAll('h1,h2,h3')].map(n => ({tag: n.tagName, text: clean(n.textContent)})), photos: active('img').map(n => ({html: n.outerHTML, src: n.dataset.lazySrc || n.getAttribute('src'), inText: !!n.closest('.et_pb_text_inner')})), forms: active('form').map(n => ({html: n.outerHTML, inText: !!n.closest('.et_pb_text_inner')})), frames: active('iframe').map(n => ({inText: !!n.closest('.et_pb_text_inner')})), moduleIds: [...body.querySelectorAll('.et_pb_text_inner [id]')].map(n => n.id)};
      };
      const source = inspect(raw), prepared = inspect(current);
      return {...t, sourceSha256: sha, source, prepared, textExact: JSON.stringify(source.modules.map(n => n.text)) === JSON.stringify(prepared.modules.map(n => n.text))};
    }, {t, raw, current, sha: createHash('sha256').update(raw).digest('hex')});
    report.articles.push(facts);
    if (!facts.textExact || facts.source.modules.length !== [3, 12][i] || facts.prepared.modules.length !== [3, 12][i] || facts.prepared.modules.some(n => n.protected || n.ids.length) || facts.prepared.photos.length !== [0, 10][i] || facts.prepared.photos.some(n => n.inText) || facts.prepared.forms.length !== [1, 0][i] || facts.prepared.forms.some(n => n.inText)) report.errors.push('Exact text-only interior boundary changed: ' + t.key);
  }
  for (const r of previous.filter(r => r.kind === 'cards')) report.containers.push(await page.evaluate(({r, targets}) => {
    const d = new DOMParser().parseFromString(r.sourceHtml, 'text/html'), all = [...r.articles, ...targets], cards = [...d.querySelectorAll('#main-content article.et_pb_post')];
    const source = cards.flatMap(n => {const t = targets.find(t => n.classList.contains('post-' + t.postId)); if (!t) return []; const p = n.querySelector('.post-content-inner > p'), raw = [...n.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()); if (!p && raw.length !== 1) throw Error('One original article excerpt required'); return [{key: t.key, summary: (p || raw[0]).textContent.replace(/\s+/g, ' ').trim()}];});
    return {key: r.key, source, nextCardKeys: cards.map(n => all.find(a => n.classList.contains('post-' + a.postId))?.key).filter(Boolean)};
  }, {r, targets}));
} catch (e) {report.errors.push(e.stack);} finally {await browser.close();}
report.summary = {articles: report.articles.length, containers: report.containers.length, textInteriors: report.articles.reduce((n, a) => n + a.prepared.modules.length, 0), photos: report.articles.reduce((n, a) => n + a.prepared.photos.length, 0), forms: report.articles.reduce((n, a) => n + a.prepared.forms.length, 0), newCards: report.containers.reduce((n, c) => n + c.source.length, 0), affectedContainers: report.containers.filter(c => c.source.length).length, nextCards: report.containers.reduce((n, c) => n + c.nextCardKeys.length, 0), nextActive: report.containers.filter(c => c.nextCardKeys.length).length};
await mkdir(path.dirname(output), {recursive: true}); await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({summary: report.summary, errors: report.errors}, null, 2)); if (report.errors.length) process.exitCode = 1;
