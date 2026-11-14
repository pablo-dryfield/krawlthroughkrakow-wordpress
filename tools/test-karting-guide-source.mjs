import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadKartingGuidesEditorial} from './karting-guides-editorial.mjs';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const [baseline, output] = process.argv.slice(2);
if (baseline !== '58b902e9fddbbec13fdf44bd8844657d61612b08' || !output) throw Error('Exact karting baseline and fresh report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const root = 'staging/wp-content/mu-plugins/ktk-code-pages-assets/', guides = await loadKartingGuidesEditorial(), keys = guides.map(r => r.key), rows = await loadReviewedArticlePresentation();
const containers = rows.filter(r => r.kind === 'cards' && r.cardKeys.some(k => keys.includes(k))), expected = [...keys, ...containers.map(r => r.key)].map(k => root + 'content/' + k + '.html').concat(root + 'runtime.css').sort();
const checks = [], changed = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail}), original = file => execFileSync('git', ['show', baseline + ':' + file], {encoding: 'utf8', maxBuffer: 10 * 1024 * 1024});
for (const line of execFileSync('git', ['ls-tree', '-r', baseline, '--', 'staging'], {encoding: 'utf8'}).trim().split('\n')) {
  const [entry, file] = line.split('\t'), bytes = await readFile(file), sha = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
  if (sha === entry.split(' ')[2]) check(file + ' original Git blob retained', true); else changed.push(file);
}
check('Only two bodies, five containers and bounded CSS changed', expected.length === 8 && JSON.stringify(changed.sort()) === JSON.stringify(expected), changed);
check('No new application files', !execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'staging'], {encoding: 'utf8'}).trim());
check('Immutable original captures retained', !execFileSync('git', ['diff', '--name-only', baseline, '--', 'docs/code-pages/full-migration/captures'], {encoding: 'utf8'}).trim());
check('Immutable media manifest retained', createHash('sha256').update(await readFile('docs/code-pages/full-migration/assets.json')).digest('hex') === 'f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691');
const catalog = JSON.parse(await readFile('tools/reviewed-article-presentation.json', 'utf8')), oldCatalog = JSON.parse(original('tools/reviewed-article-presentation.json'));
const inverseCatalog = {...catalog, articles: catalog.articles.filter(a => !keys.includes(a.key)), containers: catalog.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !keys.includes(k))}))};
check('All previous29 identities/114 summaries/bindings exact', JSON.stringify(inverseCatalog) === JSON.stringify(oldCatalog));
const css = await readFile(root + 'runtime.css', 'utf8'), blocks = css.match(/\/\* BEGIN Practical karting guides \*\/[\s\S]*?\/\* END Practical karting guides \*\/\n\n/g) || [];
check('Every old CSS byte remains exact outside the new block', blocks.length === 1 && css.replace(blocks[0], '') === original(root + 'runtime.css'));
const require = createRequire(import.meta.url), frontend = createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json')), {parse} = frontend('postcss');
const scope = 'body.ktk-code-page:is([data-ktk-page="post-go-karting-krakow"],[data-ktk-page="post-krakow-go-karting"]) #main-content [data-ktk-karting-review]';
const expectedRules = [[scope, {'font-size': '16px', 'line-height': '1.65', 'letter-spacing': '0', 'text-align': 'left'}], [scope + ' p', {'font-size': '16px', 'line-height': '1.65'}], [scope + ' :is(h2,h3)', {'font-family': 'inherit', 'font-weight': '700', 'line-height': '1.35', 'letter-spacing': '0', margin: '24px 0 12px'}], [scope + ' h2', {'font-size': '22px'}], [scope + ' h3', {'font-size': '18px'}], [scope + ' nav', {margin: '1em 0'}], [scope + ' summary', {cursor: 'pointer', 'min-height': '44px', padding: '8px 0', 'font-weight': '700'}], [scope + ' a', {color: '#c8006c !important', 'text-decoration': 'underline', 'text-underline-offset': '.15em'}], [scope + ' :is(summary,a):focus-visible', {outline: '2px solid currentColor', 'outline-offset': '3px'}], [scope, {'padding-right': '24px'}]];
const rules = [], media = []; if (blocks.length === 1) {const ast = parse(blocks[0]); ast.walkRules(r => rules.push([r.selector, Object.fromEntries(r.nodes.map(d => [d.prop, d.value + (d.important ? ' !important' : '')]))])); ast.walkAtRules(r => media.push([r.name, r.params]));}
check('Independent exact10-rule CSS allowlist and one mobile breakpoint', JSON.stringify(rules) === JSON.stringify(expectedRules) && JSON.stringify(media) === JSON.stringify([['media', '(max-width: 600px)']]), {rules, media});
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({channel: 'chrome', headless: true}); let totalPhotos = 0, cards = 0;
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const r of guides) {
    const file = root + 'content/' + r.key + '.html', before = original(file), after = await readFile(file, 'utf8');
    const state = await page.evaluate(({before, after, r}) => {
      const a = new DOMParser().parseFromString(before, 'text/html'), b = new DOMParser().parseFromString(after, 'text/html'), selector = r.key === 'post-go-karting-krakow' ? '.et_pb_text_0 > .et_pb_text_inner' : '.entry-content', old = a.querySelector(selector), body = b.querySelector(selector), t = document.createElement('template'); t.innerHTML = r.markup;
      const clean = s => (s || '').replace(/\s+/g, ' ').trim(), copy = body.cloneNode(true); copy.querySelector('nav').remove();
      const exact = clean(copy.textContent) === clean(t.content.textContent) && body.getAttribute('data-ktk-karting-review') === r.version, photos = doc => [...doc.querySelectorAll('img')].map(n => n.outerHTML);
      const samePhotos = JSON.stringify(photos(a)) === JSON.stringify(photos(b)), oldIds = [...new Set([...old.querySelectorAll('[id]')].map(n => n.id))], ids = [...body.querySelectorAll('[id]')].map(n => n.id), unique = ids.length === new Set(ids).size && oldIds.every(id => ids.includes(id));
      const currentPhotos = [...body.querySelectorAll('img')], photoParagraphs = currentPhotos.every(n => n.parentElement.tagName === 'P' && !n.parentElement.attributes.length && n.parentElement.children.length === 1 && !n.parentElement.textContent.trim());
      const topicLinks = [...body.querySelectorAll('nav a')], topics = topicLinks.every(n => ids.filter(id => '#' + id === n.getAttribute('href')).length === 1);
      body.innerHTML = old.innerHTML; body.removeAttribute('data-ktk-karting-review');
      return {exact, samePhotos, unique, photoParagraphs, topics, targets: topicLinks.length, ids: ids.length, photoCount: photos(a).length, outside: a.body.innerHTML === b.body.innerHTML};
    }, {before, after, r});
    totalPhotos += state.photoCount;
    check(r.key + ' exact canonical copy and original complete publication inverse', state.exact && state.outside, state);
    check(r.key + ' every original photo element exact; explicit photo-only wrappers', state.samePhotos && state.photoParagraphs, state);
    check(r.key + ' every original unique fragment and complete native contents', state.unique && state.topics && state.targets === (r.key === keys[0] ? 17 : 9) && state.ids === (r.key === keys[0] ? 37 : 10), state);
  }
  for (const r of containers) {
    const file = root + 'content/' + r.key + '.html', before = original(file), after = await readFile(file, 'utf8'), selected = r.articles.filter(a => keys.includes(a.key) && r.cardKeys.includes(a.key));
    const state = await page.evaluate(({before, after, r, selected}) => {
      const a = new DOMParser().parseFromString(before, 'text/html'), b = new DOMParser().parseFromString(after, 'text/html'), old = a.querySelector('#main-content'), main = b.querySelector('#main-content'); let exact = true;
      for (const conf of selected) {
        const p = main.querySelector('article.post-' + conf.postId + ' p[data-ktk-reviewed-summary]'), previous = old.querySelector('article.post-' + conf.postId), q = previous?.querySelector('.post-content-inner > p');
        exact &&= !!p && p.textContent === conf.summary && p.getAttribute('data-ktk-reviewed-summary') === r.version;
        if (p && q) p.replaceWith(q.cloneNode(true)); else if (p && previous) {const text = [...previous.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()); if (text.length !== 1) throw Error('Exact old karting excerpt required'); p.replaceWith(text[0].cloneNode(true));}
      }
      if (old.hasAttribute('data-ktk-reviewed-excerpts')) main.setAttribute('data-ktk-reviewed-excerpts', old.getAttribute('data-ktk-reviewed-excerpts')); else main.removeAttribute('data-ktk-reviewed-excerpts');
      return {exact, outside: a.body.innerHTML === b.body.innerHTML};
    }, {before, after, r, selected});
    cards += selected.length; check(r.key + ' exact new karting summaries and full prior114/outside inverse', state.exact && state.outside, state);
  }
} finally {await browser.close();}
check('Exactly13 original photos and6 summaries in5 existing containers', totalPhotos === 13 && cards === 6 && containers.length === 5, {totalPhotos, cards, containers: containers.length});
await mkdir(path.dirname(output), {recursive: true}); const report = {checkedAt: new Date().toISOString(), baseline, scope: 'Exactly two reviewed body interiors, six excerpts in five original containers and one marker-scoped CSS block. Every other application Git blob, capture, image, publication, previous114 summaries and held/active routes exact.', passed: checks.filter(c => c.pass).length, total: checks.length, checks};
await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass)}, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
