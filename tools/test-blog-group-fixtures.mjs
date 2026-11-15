import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadBlogGroupEditorial, reviseBlogGroupEditorial} from './blog-group-editorial.mjs';

const output = process.argv[2]; if (!output) throw Error('Fresh Blog/group fixture report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const rows = await loadBlogGroupEditorial(), baseline = '1fe6385130abb8755fae84c7a15b03e28791294c', require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser = await chromium.launch({channel: 'chrome', headless: true}), checks = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
try {
  const context = await browser.newContext({javaScriptEnabled: false}); await context.route('**/*', r => r.abort()); const page = await context.newPage();
  for (const row of rows) for (const phase of ['raw', 'prepared']) {
    const html = phase === 'raw' ? row.sourceHtml : execFileSync('git', ['show', baseline + ':staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + row.key + '.html'], {encoding: 'utf8', maxBuffer: 15e6});
    await page.setContent(html);
    let result;
    try {result = await page.evaluate(({fn, row}) => {
      const run = (0, eval)('(' + fn + ')'), main = document.querySelector('#main-content'), before = main.cloneNode(true), evidence = run({key: row.key, revision: row}), after = main.cloneNode(true), copy = after.cloneNode(true);
      if (row.key === 'blog') {
        const a = before.querySelectorAll('.et_pb_post_slider_0 .et_pb_slide_content'), b = copy.querySelectorAll('.et_pb_post_slider_0 .et_pb_slide_content'); b.forEach((n, i) => n.innerHTML = a[i].innerHTML);
      } else for (let i = 1; i <= 3; i++) {const s = '.et_pb_text_' + i + ' .et_pb_text_inner', n = copy.querySelector(s); n.innerHTML = before.querySelector(s).innerHTML; n.removeAttribute('data-ktk-group-overview-review');}
      const full = document.documentElement.outerHTML, second = run({key: row.key, revision: row}), marker = row.key === 'blog' ? '[data-ktk-blog-teaser-review]' : '[data-ktk-group-overview-review]';
      return {evidence, markers: main.querySelectorAll(marker).length, inverse: copy.outerHTML === before.outerHTML, repeat: second.length === 0 && document.documentElement.outerHTML === full, links: [...after.querySelectorAll('a')].map(n => [n.getAttribute('href'), n.textContent]), headings: [...after.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(n => n.outerHTML).join('') === [...before.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(n => n.outerHTML).join(''), forms: [...after.querySelectorAll('form')].map(n => n.outerHTML).join('') === [...before.querySelectorAll('form')].map(n => n.outerHTML).join(''), media: [...after.querySelectorAll('img,iframe,svg')].map(n => n.outerHTML).join('') === [...before.querySelectorAll('img,iframe,svg')].map(n => n.outerHTML).join(''), summaries: [...after.querySelectorAll('[data-ktk-blog-teaser-review]')].map(n => n.textContent)};
    }, {fn: reviseBlogGroupEditorial.toString(), row});} catch (e) {result = {error: e.message};}
    check(row.key + ' ' + phase + ' applies', !result.error, result.error);
    if (result.error) continue;
    check(row.key + ' ' + phase + ' exact bounded edit count', result.evidence.length === (row.key === 'blog' ? 8 : 3) && result.markers === result.evidence.length, result);
    for (const name of ['inverse', 'repeat', 'headings', 'forms', 'media']) check(row.key + ' ' + phase + ' ' + name, result[name]);
    if (row.key === 'blog') check(phase + ' exact shared summaries', JSON.stringify(result.summaries) === JSON.stringify(row.summaries.map(a => a.summary)));
    const cases = row.key === 'blog' ? ['identity', 'last-text', 'last-link', 'missing', 'duplicate', 'protected-home', 'protected-halloween', 'nested-image', 'partial', 'marker'] : ['identity', 'last-text', 'missing', 'duplicate', 'nested-form', 'context', 'missing-form', 'template-target', 'template-link', 'partial', 'marker'];
    for (const test of cases) {
      await page.setContent(html);
      const negative = await page.evaluate(({fn, row, test}) => {
        const run = (0, eval)('(' + fn + ')'), revision = structuredClone(row), main = document.querySelector('#main-content'), blog = row.key === 'blog', last = main.querySelector(blog ? '.et_pb_post_slide-6534 .et_pb_slide_content' : '.et_pb_text_3 .et_pb_text_inner');
        if (test === 'identity') revision.version = 'unreviewed';
        if (test === 'last-text') last.append('changed source');
        if (test === 'last-link') main.querySelector('.et_pb_post_slide-6534 a').setAttribute('href', '__KTK_HOME_URL__other/');
        if (test === 'missing') last.remove();
        if (test === 'duplicate') last.after(last.cloneNode(true));
        if (test === 'protected-home') main.querySelector('.et_pb_post_slide-6403 .et_pb_slide_content').textContent = 'changed';
        if (test === 'protected-halloween') main.querySelector('.et_pb_post_slide-7472 .et_pb_slide_content').textContent = 'changed';
        if (test === 'nested-image') last.append(document.createElement('img'));
        if (test === 'nested-form') last.append(document.createElement('form'));
        if (test === 'context') main.querySelector('.et_pb_text_1 .et_pb_text_inner').insertAdjacentHTML('beforeend', '<p data-ktk-contextual-links="wrong">wrong</p>');
        if (test === 'missing-form') main.querySelector('form.wpcf7-form').remove();
        if (test === 'template-target') revision.markup = revision.markup.replace('.et_pb_text_3', '.et_pb_text_5');
        if (test === 'template-link') revision.markup = revision.markup.replace('__KTK_HOME_URL__about-us/how-to-join/', 'https://example.invalid/');
        if (test === 'partial' || test === 'marker') {
          run({key: row.key, revision: row});
          const nodes = [...main.querySelectorAll(blog ? '[data-ktk-blog-teaser-review]' : '[data-ktk-group-overview-review]')], attr = blog ? 'data-ktk-blog-teaser-review' : 'data-ktk-group-overview-review';
          if (test === 'partial') nodes.at(-1).removeAttribute(attr); else nodes.at(-1).setAttribute(attr, 'changed');
        }
        const before = document.documentElement.outerHTML; let rejected = false, message;
        try {run({key: row.key, revision});} catch (e) {rejected = true; message = e.message;}
        return {rejected, atomic: before === document.documentElement.outerHTML, message};
      }, {fn: reviseBlogGroupEditorial.toString(), row, test});
      check(row.key + ' ' + phase + ' rejects ' + test + ' atomically', negative.rejected && negative.atomic, negative);
    }
  }
  await context.close();
} finally {await browser.close();}
const report = {checkedAt: new Date().toISOString(), baseline, passed: checks.filter(c => c.pass).length, total: checks.length, checks}; await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass)}, null, 2)); if (report.passed !== report.total) process.exitCode = 1;
