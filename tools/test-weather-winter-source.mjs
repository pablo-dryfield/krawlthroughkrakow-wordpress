import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadWeatherWinterEditorial, loadWeatherClimateFacts} from './weather-winter-editorial.mjs';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';

const [baseline, output] = process.argv.slice(2);
if (baseline !== 'e77d282214b3292dfb89bc0b3e18bfe65db66daf' || !output) throw Error('Exact weather/winter baseline and fresh report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const root = 'staging/wp-content/mu-plugins/ktk-code-pages-assets/', guides = await loadWeatherWinterEditorial(), keys = guides.map(r => r.key), rows = await loadReviewedArticlePresentation();
const discovery = 'staging/wp-content/mu-plugins/ktk-seo-sitemap-assets/data.json';
const containers = rows.filter(r => r.kind === 'cards' && r.cardKeys.some(k => keys.includes(k))), expected = [...keys, ...containers.map(r => r.key)].map(k => root + 'content/' + k + '.html').concat(root + 'runtime.css', root + 'runtime.js', root + 'pages/post-krakow-weather-guide.php', discovery).sort();
const checks = [], changed = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail}), original = file => execFileSync('git', ['show', baseline + ':' + file], {encoding: 'utf8', maxBuffer: 10 * 1024 * 1024});
for (const line of execFileSync('git', ['ls-tree', '-r', baseline, '--', 'staging'], {encoding: 'utf8'}).trim().split('\n')) {
  const [entry, file] = line.split('\t'), bytes = await readFile(file), sha = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
  if (sha === entry.split(' ')[2]) check(file + ' original Git blob retained', true); else changed.push(file);
}
check('Exactly two bodies, seven containers, one photo-ALT-only definition, its discovery source binding and bounded CSS/booking-map entry changed', expected.length === 13 && JSON.stringify(changed.sort()) === JSON.stringify(expected), changed);
check('No new application files', !execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'staging'], {encoding: 'utf8'}).trim());
check('Immutable captures retained', !execFileSync('git', ['diff', '--name-only', baseline, '--', 'docs/code-pages/full-migration/captures'], {encoding: 'utf8'}).trim());
check('Immutable media manifest exact', createHash('sha256').update(await readFile('docs/code-pages/full-migration/assets.json')).digest('hex') === 'f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691');
const catalog = JSON.parse(await readFile('tools/reviewed-article-presentation.json', 'utf8')), inverse = {...catalog, articles: catalog.articles.filter(a => !keys.includes(a.key)), containers: catalog.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !keys.includes(k))}))};
check('All previous31 identities/120 summaries and complete bindings exact', JSON.stringify(inverse) === JSON.stringify(JSON.parse(original('tools/reviewed-article-presentation.json'))));
check('Source-checked climate data retains mean/period/station semantics', (await loadWeatherClimateFacts()).parameter === 'TSR_AVE');
const definition = root + 'pages/post-krakow-weather-guide.php', pageData = await readFile(definition, 'utf8'), previousData = original(definition), oldAlt = 'Two people on a pub crawl in Krak\u00f3w.', neutralAlt = 'Pedestrians crossing a street beside historic buildings.';
check('Only the two generated sharing image-ALT values change; every other definition byte exact', pageData.split(neutralAlt).length === 3 && previousData.split(oldAlt).length === 3 && pageData.replaceAll(neutralAlt, oldAlt) === previousData);
const discoveryData = await readFile(discovery, 'utf8'), previousDiscovery = original(discovery), bindingKey = 'ktk-code-pages-assets/pages/post-krakow-weather-guide.php', digest = value => createHash('sha256').update(value).digest('hex'), oldDigest = digest(previousData), currentDigest = digest(pageData);
check('Only the exact weather definition SHA changes in discovery; all123 URLs, robots, products and other bindings exact', JSON.parse(discoveryData).sourceHashes[bindingKey] === currentDigest && JSON.parse(previousDiscovery).sourceHashes[bindingKey] === oldDigest && discoveryData.split(currentDigest).length === 2 && discoveryData.replace(currentDigest, oldDigest) === previousDiscovery);
const runtime = await readFile(root + 'runtime.js', 'utf8'), added = ", 'food-tour-krakow-48': 48";
check('Only the public48 event identity is added; all UTM/consent/event code exact', runtime.split(added).length === 2 && runtime.replace(added, '') === original(root + 'runtime.js'));
const css = await readFile(root + 'runtime.css', 'utf8'), blocks = css.match(/\/\* BEGIN Weather and winter guides \*\/[\s\S]*?\/\* END Weather and winter guides \*\/\n\n/g) || [];
check('Every original CSS byte exact outside new block', blocks.length === 1 && css.replace(blocks[0], '') === original(root + 'runtime.css'));
const require = createRequire(import.meta.url), frontend = createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json')), {parse} = frontend('postcss');
const scope = 'body.ktk-code-page:is([data-ktk-page="post-krakow-weather-guide"],[data-ktk-page="post-krakow-winter-activities"]) #main-content .entry-content[data-ktk-weather-review]';
const expectedRules = [[scope + ', ' + scope + ' .et_pb_text_inner', {'font-size': '16px', 'line-height': '1.65', 'letter-spacing': '0', 'text-align': 'left'}], [scope + ' p', {'font-size': '16px', 'line-height': '1.65'}], [scope + ' :is(h2,h3)', {'font-family': 'inherit', 'font-weight': '700', 'line-height': '1.35', 'letter-spacing': '0', margin: '24px 0 12px'}], [scope + ' h2', {'font-size': '22px'}], [scope + ' h3', {'font-size': '18px'}], [scope + ' nav', {margin: '1em 0'}], [scope + ' summary', {cursor: 'pointer', 'min-height': '44px', padding: '8px 0', 'font-weight': '700'}], [scope + ' a', {color: '#c8006c !important', 'text-decoration': 'underline', 'text-underline-offset': '.15em'}], [scope + ' :is(summary,a):focus-visible', {outline: '2px solid currentColor', 'outline-offset': '3px'}], ['body.ktk-code-page[data-ktk-page="post-krakow-weather-guide"] #main-content .entry-content[data-ktk-weather-review] .et_pb_text_inner', {'padding-right': '24px'}], ['body.ktk-code-page[data-ktk-page="post-krakow-winter-activities"] #main-content .entry-content[data-ktk-weather-review]', {'padding-right': '24px'}]];
const rules = [], media = []; if (blocks.length === 1) {const ast = parse(blocks[0]); ast.walkRules(r => rules.push([r.selector, Object.fromEntries(r.nodes.map(d => [d.prop, d.value + (d.important ? ' !important' : '')]))])); ast.walkAtRules(r => media.push([r.name, r.params]));}
check('Independent exact11-rule/one-breakpoint CSS allowlist', JSON.stringify(rules) === JSON.stringify(expectedRules) && JSON.stringify(media) === JSON.stringify([['media', '(max-width: 600px)']]), {rules, media});
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel: 'chrome', headless: true}); let photos = 0, cards = 0;
try {
  const page = await browser.newPage({javaScriptEnabled: false}); await page.route('**/*', r => r.abort());
  for (const r of guides) {
    const file = root + 'content/' + r.key + '.html', before = original(file), after = await readFile(file, 'utf8');
    const state = await page.evaluate(({before, after, r}) => {
      const a = new DOMParser().parseFromString(before, 'text/html'), b = new DOMParser().parseFromString(after, 'text/html'), old = a.querySelector('.entry-content'), body = b.querySelector('.entry-content'), template = document.createElement('template'); template.innerHTML = r.markup;
      const weather = r.key === 'post-krakow-weather-guide', photoElements = d => [...d.querySelectorAll('img')].map(n => n.outerHTML);
      let neutralFeatureAlt = !weather;
      if (weather) {
        const old = a.querySelectorAll('.et_post_meta_wrapper img'), current = b.querySelectorAll('.et_post_meta_wrapper img');
        neutralFeatureAlt = old.length === 1 && current.length === 1 && old[0].getAttribute('alt') === 'Two people on a pub crawl in Krak\u00f3w.' && current[0].getAttribute('alt') === 'Pedestrians crossing a street beside historic buildings.' && current[0].getAttribute('src') === '__KTK_PAGE_ASSETS__media/18aacfa6c777-ostap-senyuk-7rCdqEuQ1rg-unsplash-1080x675.jpg';
        if (neutralFeatureAlt) current[0].setAttribute('alt', old[0].getAttribute('alt'));
      }
      const samePhotos = JSON.stringify(photoElements(a)) === JSON.stringify(photoElements(b));
      const ids = [...body.querySelectorAll('[id]')].map(n => n.id), oldIds = [...old.querySelectorAll('[id]')].map(n => n.id), nav = body.querySelector('nav'), toc = [...nav.querySelectorAll('a')], fragment = body.cloneNode(true); fragment.querySelector('nav').remove();
      const exactPhotoParents = weather || JSON.stringify([...body.querySelectorAll('img')].map(n => n.parentElement.outerHTML)) === JSON.stringify([...old.querySelectorAll('img')].map(n => n.parentElement.outerHTML));
      let canonical;
      if (weather) {
        const plans = [...template.content.children].map(n => n.content), nodes = [...fragment.querySelectorAll('.et_pb_text_inner')]; plans[0].querySelector('template[data-ktk-weather-contents]').remove();
        canonical = nodes.length === 25 && nodes.every((n, i) => {const t = document.createElement('template'); t.content.append(plans[i].cloneNode(true)); return n.innerHTML === t.innerHTML;});
        [...body.querySelectorAll('.et_pb_text_inner')].forEach((n, i) => n.innerHTML = old.querySelectorAll('.et_pb_text_inner')[i].innerHTML);
      } else {
        [...fragment.querySelectorAll('img')].forEach((n, i) => {const slot = document.createElement('template'); slot.setAttribute('data-ktk-winter-photo', String(i)); n.parentElement.replaceWith(slot);});
        template.content.querySelector('template[data-ktk-weather-contents]').remove(); canonical = fragment.innerHTML === template.innerHTML; body.innerHTML = old.innerHTML;
      }
      const marker = body.getAttribute('data-ktk-weather-review'); body.removeAttribute('data-ktk-weather-review');
      return {canonical, samePhotos, exactPhotoParents, neutralFeatureAlt, marker: marker === r.version, outside: a.body.innerHTML === b.body.innerHTML, photos: photoElements(a).length, unique: new Set(ids).size === ids.length && oldIds.every(id => ids.includes(id)), ids: ids.length, native: nav.children.length === 1 && nav.firstElementChild.tagName === 'DETAILS' && nav.querySelectorAll('summary').length === 1 && nav.querySelector('summary').textContent === 'Contents' && toc.every(n => ids.filter(id => '#' + id === n.getAttribute('href')).length === 1), targets: toc.length};
    }, {before, after, r}); photos += state.photos;
    check(r.key + ' exact canonical module HTML and complete outside/publication inverse', state.canonical && state.marker && state.outside, state);
    check(r.key + ' all photo elements/winter paragraphs exact except one pinned neutral feature ALT', state.samePhotos && state.exactPhotoParents && state.neutralFeatureAlt, state);
    check(r.key + ' all unique old fragments and exact native contents', state.unique && state.native && state.ids === (r.key === keys[0] ? 17 : 23) && state.targets === (r.key === keys[0] ? 16 : 22), state);
  }
  for (const r of containers) {
    const file = root + 'content/' + r.key + '.html', before = original(file), after = await readFile(file, 'utf8'), selected = r.articles.filter(a => keys.includes(a.key) && r.cardKeys.includes(a.key));
    const state = await page.evaluate(({before, after, r, selected}) => {
      const a = new DOMParser().parseFromString(before, 'text/html'), b = new DOMParser().parseFromString(after, 'text/html'), old = a.querySelector('#main-content'), main = b.querySelector('#main-content'); let exact = true;
      for (const conf of selected) {
        const p = main.querySelector('article.post-' + conf.postId + ' p[data-ktk-reviewed-summary]'), previous = old.querySelector('article.post-' + conf.postId), q = previous?.querySelector('.post-content-inner > p');
        exact &&= !!p && p.textContent === conf.summary && p.getAttribute('data-ktk-reviewed-summary') === r.version;
        if (p && q) p.replaceWith(q.cloneNode(true)); else if (p && previous) {const raw = [...previous.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()); if (raw.length !== 1) throw Error('One original weather/winter excerpt required'); p.replaceWith(raw[0].cloneNode(true));}
      }
      if (old.hasAttribute('data-ktk-reviewed-excerpts')) main.setAttribute('data-ktk-reviewed-excerpts', old.getAttribute('data-ktk-reviewed-excerpts')); else main.removeAttribute('data-ktk-reviewed-excerpts');
      return {exact, outside: a.body.innerHTML === b.body.innerHTML};
    }, {before, after, r, selected}); cards += selected.length; check(r.key + ' exact eight-summary scope and full previous120/outside inverse', state.exact && state.outside, state);
  }
} finally {await browser.close();}
check('Exactly16 original photos and8 summaries in7 existing containers', photos === 16 && cards === 8 && containers.length === 7, {photos, cards, containers: containers.length});
await mkdir(path.dirname(output), {recursive: true}); const report = {checkedAt: new Date().toISOString(), baseline, scope: 'Exact13-file application boundary including one weather-only discovery SHA refresh; all discovery URLs/robots/products exact. Every other Git blob, publication/title/canonical/robots/schema metadata,16 photo files/elements except one exact neutral featured ALT and its two sharing ALT values, original winter fragments, prior120 summaries, captures and immutable media manifest preserved. Only one product identity added to unchanged UTM/consent/event code.', passed: checks.filter(c => c.pass).length, total: checks.length, checks};
await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass)}, null, 2)); if (report.passed !== report.total) process.exitCode = 1;
