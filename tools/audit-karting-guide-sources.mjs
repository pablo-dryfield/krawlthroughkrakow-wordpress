import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const root = fileURLToPath(new URL('..', import.meta.url)), output = process.argv[2];
if (!output) throw Error('Fresh inventory output required');
try { await readFile(output); throw Error('Preserve earlier evidence'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile(path.join(root, 'docs/code-pages/full-migration/manifest.json'), 'utf8'));
const assets = JSON.parse(await readFile(path.join(root, 'docs/code-pages/full-migration/assets.json'), 'utf8')), previous = await loadReviewedArticlePresentation();
const definitions = [['post-go-karting-krakow', 'f02ac0745c1e5dff060e3c6a188718fb90d06e7500195a4981b88ae3eb9b6daf'], ['post-krakow-go-karting', 'f949bac521d355525eeae892acf0f226d109cc48ba398b990c1ca97ccbc5321d']];
const targets = definitions.map(([key, sha]) => {
  const row = manifest.routes.find(r => r.key === key);
  if (!row || row.kind !== 'blog post') throw Error('Original karting article required');
  return {key, sha, postId: row.postId, route: row.route, source: row.source};
});
const report = {checkedAt: new Date().toISOString(), scope: 'Read-only two-article/40-container source inventory. Known earlier contents repairs are applied only to parsed reference DOMs; captures are not edited. All browser requests aborted.', articles: [], containers: [], errors: []};
const require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({javaScriptEnabled: false});
  await page.route('**/*', r => r.abort());
  for (const target of targets) {
    const raw = await readFile(path.join(root, target.source, 'production-1920.html'), 'utf8');
    if (hash(raw) !== target.sha) throw Error('Immutable karting capture changed');
    const current = await readFile(path.join(root, 'staging/wp-content/mu-plugins/ktk-code-pages-assets/content', target.key + '.html'), 'utf8');
    report.articles.push(await page.evaluate(({target, raw, current, assets}) => {
      const clean = s => (s || '').replace(/\s+/g, ' ').trim();
      const inspect = (html, prepare) => {
        const doc = new DOMParser().parseFromString(html, 'text/html'), main = doc.querySelector('#main-content');
        const selector = target.key === 'post-go-karting-krakow' ? '.et_pb_text_0 > .et_pb_text_inner' : '.entry-content';
        if (main.querySelectorAll(selector).length !== 1) throw Error('Exactly one original karting body required');
        const body = main.querySelector(selector), repairs = [];
        if (prepare) {
          if (target.key === 'post-go-karting-krakow') {
            const headings = [...body.querySelectorAll('h2,h3')].filter(n => clean(n.textContent) === 'Making Memories at Go Karting Krakow');
            if (headings.length !== 1 || headings[0].id) throw Error('Exact previous karting fragment repair required');
            headings[0].id = 'makingmemoriesatgokartingkrakow'; repairs.push('repair-contents-link');
          } else {
            const links = body.querySelectorAll('a[href="#conclusion"]');
            if (links.length !== 1 || body.querySelector('[id="conclusion"]') || !links[0].closest('li')) throw Error('Exact previous missing-conclusion entry required');
            links[0].closest('li').remove(); repairs.push('remove-missing-contents-entry');
          }
        }
        const copy = body.cloneNode(true); copy.querySelectorAll('script,style,noscript').forEach(n => n.remove());
        const ids = [...body.querySelectorAll('[id]')].map(n => n.id);
        return {selector, repairs, title: clean(main.querySelector('h1.entry-title')?.textContent), publication: main.querySelector('.post-meta')?.outerHTML, text: clean(copy.textContent), ids, uniqueIds: [...new Set(ids)], headings: [...body.querySelectorAll('h2,h3,h4')].map(n => ({id: n.id, tag: n.tagName, text: clean(n.textContent)})), links: [...body.querySelectorAll('a[href]')].map(n => ({href: n.getAttribute('href'), text: clean(n.textContent), photo: !!n.querySelector('img')})), protected: body.querySelectorAll('form,iframe,video,script,style,input,button').length, photos: [...body.querySelectorAll('img')].filter(n => !n.closest('noscript')).map(n => {const src = n.dataset.lazySrc || n.getAttribute('src'), p = n.closest('p'); return {file: assets[src]?.file || src.replace('__KTK_PAGE_ASSETS__', ''), html: n.outerHTML, wrapper: p?.outerHTML, wrapperText: clean(p?.textContent), wrapperIds: p ? [...p.querySelectorAll('[id]')].map(n => n.id) : []};}), totalPhotos: main.querySelectorAll('img').length};
      };
      const source = inspect(raw, true), prepared = inspect(current, false);
      return {key: target.key, sourceSha256: target.sha, source, prepared, textExact: source.text === prepared.text, idsExact: JSON.stringify(source.ids) === JSON.stringify(prepared.ids), photoFilesExact: JSON.stringify(source.photos.map(n => n.file)) === JSON.stringify(prepared.photos.map(n => n.file))};
    }, {target, raw, current, assets}));
  }
  for (const row of previous.filter(r => r.kind === 'cards')) {
    const current = await readFile(path.join(root, 'staging/wp-content/mu-plugins/ktk-code-pages-assets/content', row.key + '.html'), 'utf8');
    report.containers.push(await page.evaluate(({row, current, targets}) => {
      const parse = h => new DOMParser().parseFromString(h, 'text/html'), clean = s => (s || '').replace(/\s+/g, ' ').trim();
      const inspect = html => [...parse(html).querySelectorAll('#main-content article.et_pb_post')].flatMap(n => {
        const target = targets.find(t => n.classList.contains('post-' + t.postId)); if (!target) return [];
        const paragraph = n.querySelector('.post-content-inner > p'), raw = [...n.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && clean(n.textContent));
        if (!paragraph && raw.length !== 1) throw Error('Exact original karting card required');
        return [{key: target.key, title: clean(n.querySelector('.entry-title')?.textContent), summary: clean((paragraph || raw[0]).textContent)}];
      });
      const source = inspect(row.sourceHtml), prepared = inspect(current), all = [...row.articles, ...targets];
      const nextCardKeys = [...parse(row.sourceHtml).querySelectorAll('#main-content article.et_pb_post')].map(n => all.find(a => n.classList.contains('post-' + a.postId))?.key).filter(Boolean);
      return {key: row.key, source, prepared, nextCardKeys, exact: JSON.stringify(source) === JSON.stringify(prepared)};
    }, {row, current, targets}));
  }
  for (const a of report.articles) if (!a.textExact || !a.idsExact || !a.photoFilesExact || a.prepared.protected) report.errors.push('Original/prepared karting source mismatch: ' + a.key);
  for (const c of report.containers) if (!c.exact) report.errors.push('Original karting excerpt mismatch: ' + c.key);
} catch (e) { report.errors.push(e.stack); } finally { await browser.close(); }
report.summary = {articles: report.articles.length, containers: report.containers.length, inlinePhotos: report.articles.reduce((n, a) => n + a.prepared.photos.length, 0), newCards: report.containers.reduce((n, c) => n + c.source.length, 0), affectedContainers: report.containers.filter(c => c.source.length).length, nextCards: report.containers.reduce((n, c) => n + c.nextCardKeys.length, 0), nextActive: report.containers.filter(c => c.nextCardKeys.length).length};
await mkdir(path.dirname(output), {recursive: true}); await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({summary: report.summary, errors: report.errors}, null, 2));
if (report.errors.length) process.exitCode = 1;
