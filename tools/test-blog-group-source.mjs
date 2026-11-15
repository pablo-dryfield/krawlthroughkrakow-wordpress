import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';

const [baseline, output] = process.argv.slice(2); if (baseline !== '1fe6385130abb8755fae84c7a15b03e28791294c' || !output) throw Error('Exact Blog/group baseline and fresh report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const root = 'staging/wp-content/mu-plugins/ktk-code-pages-assets/', files = [root + 'content/blog.html', root + 'content/stagshens.html', root + 'runtime.css'].sort(), checks = [], changed = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail}), sha = b => createHash('sha256').update(b).digest('hex'), original = file => execFileSync('git', ['show', baseline + ':' + file], {maxBuffer: 15e6});
for (const line of execFileSync('git', ['ls-tree', '-r', baseline, '--', 'staging'], {encoding: 'utf8'}).trim().split('\n')) {
  const [entry, name] = line.split('\t'), b = await readFile(name), equal = createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex') === entry.split(' ')[2];
  if (equal) check(name + ' Git blob exact', true); else changed.push(name);
}
check('Exactly three application files change', JSON.stringify(changed.sort()) === JSON.stringify(files), changed);
check('No new application files', !execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'staging'], {encoding: 'utf8'}).trim());
const css = await readFile(root + 'runtime.css', 'utf8'), blocks = css.match(/\/\* BEGIN Group enquiry overview \*\/[\s\S]*?\/\* END Group enquiry overview \*\/\n/g) || [], oldCss = original(root + 'runtime.css').toString();
check('Every old CSS byte and exact insertion position retained', blocks.length === 1 && css.replace(blocks[0], '') === oldCss && css === oldCss.replace('/* END reduced-motion slide content */\n', '/* END reduced-motion slide content */\n' + blocks[0]));
const require = createRequire(import.meta.url), frontend = createRequire(path.resolve('staging/wp-content/plugins/ktk-storefront/frontend/package.json')), ast = frontend('postcss').parse(blocks[0] || ''), media = [], rules = [], scope = 'body.ktk-code-page[data-ktk-page="stagshens"] #main-content [data-ktk-group-overview-review="2026-11-15.blog-group-1"]';
ast.walkAtRules(n => media.push([n.name, n.params])); ast.walkRules(n => rules.push([n.selector, n.nodes.map(d => [d.prop, d.value, !!d.important])]));
const expected = [[scope, [['font-size', '16px', false], ['line-height', '1.65', false], ['text-align', 'left', false]]], [scope + ' p', [['font-size', '16px', false], ['line-height', '1.65', false]]], [scope + ' a', [['color', 'inherit', false], ['text-decoration', 'underline', false], ['text-underline-offset', '.15em', false]]], [scope + ' a:focus-visible', [['outline', '2px solid currentColor', false], ['outline-offset', '3px', false]]], [scope, [['padding-right', '24px', false]]]];
check('Independent five-rule/eleven-declaration/one-breakpoint CSS allowlist', JSON.stringify(rules) === JSON.stringify(expected) && JSON.stringify(media) === JSON.stringify([['media', '(max-width: 600px)']]), {rules, media});
const catalog = JSON.parse(await readFile('tools/reviewed-article-presentation.json', 'utf8')), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const context = await browser.newContext({javaScriptEnabled: false}); await context.route('**/*', r => r.abort()); const page = await context.newPage();
  for (const key of ['blog', 'stagshens']) {
    const html = await readFile(root + 'content/' + key + '.html', 'utf8'), before = original(root + 'content/' + key + '.html').toString(); await page.setContent(html);
    const result = await page.evaluate(({key, before, catalog}) => {
      const old = new DOMParser().parseFromString(before, 'text/html'), clone = document.documentElement.cloneNode(true), main = clone.querySelector('#main-content'), previous = old.querySelector('#main-content'), clean = s => (s || '').replace(/\s+/g, ' ').trim(); let exact;
      if (key === 'blog') {
        const ids = [6396, 6376, 6387, 6678, 7506, 7492, 6394, 6534]; exact = main.querySelectorAll('[data-ktk-blog-teaser-review]').length === 8 && ids.every(id => {const node = main.querySelector('.et_pb_post_slide-' + id + ' [data-ktk-blog-teaser-review]'); return node?.dataset.ktkBlogTeaserReview === '2026-11-15.blog-group-1' && node.textContent === catalog.articles.find(a => a.postId === id).summary;});
        for (const id of ids) {const s = '.et_pb_post_slide-' + id + ' .et_pb_slide_content'; main.querySelector(s).innerHTML = previous.querySelector(s).innerHTML;}
      } else {
        const a = main.querySelector('[data-ktk-contextual-links="stagshens"]'), b = previous.querySelector('[data-ktk-contextual-links="stagshens"]'); exact = a?.outerHTML === b?.outerHTML && main.querySelectorAll('[data-ktk-group-overview-review]').length === 3;
        for (let i = 1; i <= 3; i++) {const s = '.et_pb_text_' + i + ' .et_pb_text_inner', n = main.querySelector(s); exact = exact && n.dataset.ktkGroupOverviewReview === '2026-11-15.blog-group-1'; n.innerHTML = previous.querySelector(s).innerHTML; n.removeAttribute('data-ktk-group-overview-review');}
      }
      return {exact, inverse: clone.outerHTML === old.documentElement.outerHTML, forms: document.querySelectorAll('#main-content form').length, heldCopy: key === 'stagshens' && /absolutely legless|professional drunk guides|hundreds of other local companies/.test(document.querySelector('#main-content').textContent), h1: document.querySelectorAll('#main-content h1').length};
    }, {key, before, catalog});
    check(key + ' exact revised scope/current summaries/context', result.exact, result); check(key + ' complete inverse retains every other DOM byte', result.inverse, result); check(key + ' headings and protected forms retained', result.h1 === 1 && result.forms === (key === 'blog' ? 0 : 1), result); if (key === 'stagshens') check('Old intoxication/blanket supplier claims removed', !result.heldCopy);
  }
  await context.close();
} finally {await browser.close();}
check('Original captures/catalog/assets ledger untouched', !execFileSync('git', ['diff', '--name-only', baseline, '--', 'docs/code-pages/full-migration/captures', 'docs/code-pages/full-migration/assets.json', 'tools/reviewed-article-presentation.json'], {encoding: 'utf8'}).trim());
const sourceHashes = {}; for (const file of [...files, 'tools/blog-group-editorial.mjs', 'tools/content/group-enquiry-overview.html', 'tools/test-blog-group-source.mjs']) sourceHashes[file] = sha(await readFile(file));
const report = {checkedAt: new Date().toISOString(), baseline, scope: 'Independent three-file application/CSS scope and complete inverse of eight Blog excerpts/three group interiors; all other content, headings,20 teaser anchors,media,forms/footer,history,metadata,discovery,commerce,consent and held material exact. No network or application writes.', sourceHashes, passed: checks.filter(c => c.pass).length, total: checks.length, checks}; await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass)}, null, 2)); if (report.passed !== report.total) process.exitCode = 1;
