import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const output = process.argv[2];
if (!output) throw Error('Fresh hotel source-inventory directory required');
try {await readFile(path.join(output, 'report.json')); throw Error('Preserve earlier hotel inventory');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const keys = ['post-best-hotels-in-krakow-2019-2020', 'post-spa-hotels-krakow'];
const manifest = JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json', 'utf8'));
const assetBytes = await readFile('docs/code-pages/full-migration/assets.json'), assets = JSON.parse(assetBytes), hash = b => createHash('sha256').update(b).digest('hex');
if (hash(assetBytes) !== 'f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691') throw Error('Immutable hotel media manifest required');
const previous = await loadReviewedArticlePresentation(), targets = keys.map(key => {
  const r = manifest.routes.find(r => r.key === key);
  if (!r || r.kind !== 'blog post' || previous.some(p => p.kind === 'cards' && p.articles.some(a => a.key === key))) throw Error('Two previously unreviewed hotel identities required');
  return {key, postId: r.postId, route: r.route, source: r.source};
});
const require = createRequire(import.meta.url), dependencies = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium} = require(path.join(dependencies, 'playwright')), sharp = require(path.join(dependencies, 'sharp'));
const browser = await chromium.launch({channel: 'chrome', headless: true}), report = {checkedAt: new Date().toISOString(), scope: 'Read-only original two-hotel/40-container DOM and unchanged-photo inventory. All browser network aborted. No application, production, commerce, consent, medical or active competition changes.', articles: [], containers: [], errors: []}, images = new Map();
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const [i, target] of targets.entries()) {
    const raw = await readFile(target.source + '/production-1920.html', 'utf8'), current = await readFile('staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + target.key + '.html', 'utf8');
    const row = await page.evaluate(({target, raw, current, sha}) => {
      const clean = s => (s || '').replace(/\s+/g, ' ').trim(), inspect = html => {
        const d = new DOMParser().parseFromString(html, 'text/html'), main = d.querySelector('#main-content'), body = main?.querySelector('.entry-content');
        if (!body || main.querySelectorAll('.entry-content').length !== 1) throw Error('One original hotel body required');
        const active = (root, s) => [...root.querySelectorAll(s)].filter(n => !n.closest('noscript')), ids = active(body, '[id]').map(n => ({id: n.id, tag: n.tagName}));
        return {text: clean(body.textContent), modules: active(body, '.et_pb_text_inner').map((n, index) => ({index, html: n.innerHTML, headings: [...n.querySelectorAll('h1,h2,h3,h4')].map(n => [n.tagName, n.id, clean(n.textContent)]), protected: n.querySelectorAll('img,form,iframe,video,script,style,input,button').length})), headings: active(body, 'h1,h2,h3,h4').map(n => ({tag: n.tagName, id: n.id, text: clean(n.textContent)})), photos: active(main, 'img').map(n => ({html: n.outerHTML, src: n.dataset.lazySrc || n.getAttribute('src'), alt: n.getAttribute('alt'), inBody: !!n.closest('.entry-content'), inText: !!n.closest('.et_pb_text_inner'), link: n.closest('a')?.getAttribute('href') || null})), ids, uniqueIds: [...new Set(ids.map(n => n.id))], duplicates: ids.filter((n, index) => ids.findIndex(x => x.id === n.id) !== index), links: active(body, 'a[href]').map(n => ({href: n.getAttribute('href'), text: clean(n.textContent), image: !!n.querySelector('img')})), noscript: body.querySelectorAll('noscript').length, protected: active(body, 'form,iframe,video,script,style,input,button').length};
      };
      const source = inspect(raw), prepared = inspect(current); return {...target, sourceSha256: sha, source, prepared, sourceCopyBound: source.text === prepared.text};
    }, {target, raw, current, sha: hash(raw)});
    report.articles.push(row);
    if (!row.sourceCopyBound || row.prepared.modules.length !== [31, 0][i] || row.prepared.photos.length !== [79, 4][i] || row.source.protected || row.prepared.protected || row.prepared.modules.some(n => n.protected)) report.errors.push('Original hotel source boundary mismatch: ' + target.key);
    for (const photo of row.prepared.photos) {
      const relative = photo.src?.replace(/^__KTK_PAGE_ASSETS__/, ''), record = Object.values(assets).find(a => a.file === relative);
      if (!relative?.startsWith('media/') || relative.includes('..') || relative.includes('\\') || !record) throw Error('Exact owned hotel photo required');
      const bytes = await readFile(path.join('staging/wp-content/mu-plugins/ktk-code-pages-assets', relative));
      if (hash(bytes) !== record.sha256) throw Error('Original hotel photo bytes changed');
      if (!images.has(relative)) images.set(relative, {file: relative, sha256: record.sha256, uses: []});
      images.get(relative).uses.push({key: target.key, index: row.prepared.photos.indexOf(photo), alt: photo.alt});
    }
  }
  for (const r of previous.filter(r => r.kind === 'cards')) report.containers.push(await page.evaluate(({r, targets}) => {
    const d = new DOMParser().parseFromString(r.sourceHtml, 'text/html'), all = [...r.articles, ...targets], cards = [...d.querySelectorAll('#main-content article.et_pb_post')];
    const source = cards.flatMap(n => {const t = targets.find(t => n.classList.contains('post-' + t.postId)); if (!t) return []; const p = n.querySelector('.post-content-inner > p'), raw = [...n.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()); if (!p && raw.length !== 1) throw Error('One original hotel excerpt required'); return [{key: t.key, summary: (p || raw[0]).textContent.replace(/\s+/g, ' ').trim()}];});
    return {key: r.key, source, nextCardKeys: cards.map(n => all.find(a => n.classList.contains('post-' + a.postId))?.key).filter(Boolean)};
  }, {r, targets}));
} catch (e) {report.errors.push(e.stack);} finally {await browser.close();}
report.images = [...images.values()];
report.summary = {articles: report.articles.length, containers: report.containers.length, photos: report.articles.reduce((n, a) => n + a.prepared.photos.length, 0), uniquePhotos: images.size, newCards: report.containers.reduce((n, c) => n + c.source.length, 0), affectedContainers: report.containers.filter(c => c.source.length).length, nextCards: report.containers.reduce((n, c) => n + c.nextCardKeys.length, 0), nextActive: report.containers.filter(c => c.nextCardKeys.length).length};
await mkdir(output, {recursive: true});
if (!report.errors.length) for (let offset = 0; offset < report.images.length; offset += 24) {
  const composite = [];
  for (const [index, row] of report.images.slice(offset, offset + 24).entries()) {
    const x = index % 6 * 240, y = Math.floor(index / 6) * 195, bitmap = await sharp(path.join('staging/wp-content/mu-plugins/ktk-code-pages-assets', row.file)).resize(228, 150, {fit: 'inside'}).png().toBuffer(), info = await sharp(bitmap).metadata();
    composite.push({input: bitmap, left: x + Math.floor((240 - info.width) / 2), top: y + Math.floor((150 - info.height) / 2)});
    const label = `${offset + index + 1}. ${path.basename(row.file).slice(0, 12)}`;
    composite.push({input: Buffer.from(`<svg width="240" height="42"><rect width="240" height="42" fill="white"/><text x="6" y="23" font-family="Arial" font-size="14">${label}</text></svg>`), left: x, top: y + 150});
  }
  await sharp({create: {width: 1440, height: 780, channels: 3, background: '#fff'}}).composite(composite).png().toFile(path.join(output, `sheet-${String(offset / 24 + 1).padStart(2, '0')}.png`));
}
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({summary: report.summary, errors: report.errors}, null, 2)); if (report.errors.length) process.exitCode = 1;
