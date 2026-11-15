import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {loadOperatorTrustEditorial, reviseOperatorTrustEditorial} from './operator-trust-editorial.mjs';

const output = process.argv[2]; if (!output) throw Error('Fresh operator/trust fixture report required');
try {await readFile(output); throw Error('Preserve earlier evidence');} catch (e) {if (e.code !== 'ENOENT') throw e;}
const baseline = 'c909918238b8d28b9121c8d62701e1266a931c84', rows = await loadOperatorTrustEditorial(), require = createRequire(import.meta.url), {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')), browser = await chromium.launch({channel: 'chrome', headless: true}), checks = [], check = (name, pass, detail) => checks.push({name, pass: !!pass, detail});
try {
  const context = await browser.newContext({javaScriptEnabled: false}); await context.route('**/*', r => r.abort()); const page = await context.newPage();
  for (const [index, row] of rows.entries()) for (const phase of ['raw', 'prepared']) {
    const html = phase === 'raw' ? row.sourceHtml : execFileSync('git', ['show', baseline + ':staging/wp-content/mu-plugins/ktk-code-pages-assets/content/' + row.key + '.html'], {encoding: 'utf8', maxBuffer: 15e6}); await page.setContent(html);
    let result;
    try {result = await page.evaluate(({fn, row}) => {
      const run = (0, eval)('(' + fn + ')'), before = document.documentElement.cloneNode(true), oldMain = before.querySelector('#main-content'), evidence = run({key: row.key, revision: row}), after = document.documentElement.cloneNode(true), clone = after.cloneNode(true), main = clone.querySelector('#main-content'), selectors = ['.et_pb_text_2 .et_pb_text_inner', '.et_pb_text_4 .et_pb_text_inner > :is(h3,h5)', '.et_pb_text_5 .et_pb_text_inner', '.et_pb_text_12 .et_pb_text_inner > p:nth-of-type(2)'];
      main.querySelectorAll('[data-ktk-operator-details]').forEach(n => n.remove());
      if (row.key === 'about-us') for (const s of selectors) {const n = main.querySelector(s); n.innerHTML = oldMain.querySelector(s).innerHTML; n.removeAttribute('data-ktk-operator-copy');}
      if (row.key === 'testimonials') main.querySelector('.et_pb_code_1 .et_pb_code_inner').innerHTML = oldMain.querySelector('.et_pb_code_1 .et_pb_code_inner').innerHTML;
      if (row.key === 'privacy-policy') {const n = main.querySelector('[data-ktk-operator-domain-review]'), old = [...oldMain.querySelectorAll('.et_pb_text_1 .et_pb_text_inner p')].find(p => p.querySelector('strong')?.textContent.trim() === 'SERVICE'); n.replaceWith(old.cloneNode(true));}
      if (row.key === 'tour-service-disclaimer') {
        const s = '.et_pb_text_4 .et_pb_text_inner', n = main.querySelector(s); n.innerHTML = oldMain.querySelector(s).innerHTML; n.removeAttribute('data-ktk-operator-copy');
        const reviewed = main.querySelector('[data-ktk-id-guidance-review]'), source = oldMain.querySelector('.et_pb_text_1 .et_pb_text_inner p'); reviewed.replaceWith(source.cloneNode(true));
      }
      const same = selector => JSON.stringify([...before.querySelectorAll(selector)].map(n => n.outerHTML)) === JSON.stringify([...after.querySelectorAll(selector)].map(n => n.outerHTML)), full = document.documentElement.outerHTML, repeat = run({key: row.key, revision: row});
      return {evidence, inverse: clone.outerHTML === before.outerHTML, repeat: repeat.length === 0 && document.documentElement.outerHTML === full, forms: same('form'), media: same('img,iframe,video,svg'), primary: JSON.stringify([...before.querySelectorAll('h1')].map(n => n.outerHTML)) === JSON.stringify([...after.querySelectorAll('h1')].map(n => n.outerHTML)), operatorCount: after.querySelectorAll('[data-ktk-operator-details]').length, operator: after.querySelector('[data-ktk-operator-details]')?.textContent, reviewLinks: after.querySelectorAll('[data-ktk-review-platform-links] a').length, id: after.querySelector('[data-ktk-id-guidance-review]')?.textContent, promo: after.querySelector('.et_pb_text_4 [data-ktk-operator-copy]')?.textContent};
    }, {fn: reviseOperatorTrustEditorial.toString(), row});} catch (e) {result = {error: e.message};}
    check(row.key + ' ' + phase + ' applies', !result.error, result.error); if (result.error) continue;
    check(row.key + ' ' + phase + ' exact bounded changes', result.evidence.length === [5, 1, 1, 2, 3, 1][index] && result.operatorCount === (row.key === 'testimonials' ? 0 : 1), result);
    for (const field of ['inverse', 'repeat', 'forms', 'media', 'primary']) check(row.key + ' ' + phase + ' ' + field, result[field]);
    if (row.key === 'testimonials') check(phase + ' three native platform links', result.reviewLinks === 3);
    if (row.key === 'tour-service-disclaimer') check(phase + ' confirmed ID advice/current tickets without an invented price', result.id.includes('18 years old') && result.id.includes('identification is recommended') && !/85zl|90zl|guarantee|pro drunk/.test(result.promo));
    const tests = row.key === 'testimonials' ? ['identity', 'missing', 'duplicate', 'slot-text', 'iframe', 'platform', 'total', 'marker', 'partial'] : ['identity', 'missing', 'duplicate', 'anchor-class', 'facts', 'registry', 'email', 'collision', 'form', 'marker', ...(['about-us', 'tour-service-disclaimer'].includes(row.key) ? ['late-copy', 'late-link', 'partial'] : row.key === 'privacy-policy' ? ['late-domain', 'partial'] : [])];
    for (const test of tests) {
      await page.setContent(html);
      const negative = await page.evaluate(({fn, row, test}) => {
        const run = (0, eval)('(' + fn + ')'), revision = structuredClone(row), main = document.querySelector('#main-content'), reviews = row.key === 'testimonials', selector = reviews ? '.et_pb_code_1 .et_pb_code_inner' : ['about-us', 'contact'].includes(row.key) ? '.et_pb_text_2' : '.et_pb_text_1', target = main.querySelector(selector);
        if (test === 'identity') revision.version = 'unreviewed';
        if (test === 'missing') target.remove();
        if (test === 'duplicate') target.after(target.cloneNode(true));
        if (test === 'anchor-class') target.classList.add('unreviewed-anchor-class');
        if (test === 'facts') revision.operatorValues.krs = '0000000000';
        if (test === 'registry') revision.operatorMarkup = revision.operatorMarkup.replace('https://rejestr.io/krs/1084157/kraktivity', 'https://example.invalid/');
        if (test === 'email') revision.operatorMarkup = revision.operatorMarkup.replace('</section>', '<p>person@example.invalid</p></section>');
        if (test === 'collision') main.insertAdjacentHTML('afterbegin', '<h2 id="ktk-operator-title">Unexpected existing title</h2>');
        if (test === 'form') target.append(document.createElement('form'));
        if (test === 'slot-text') target.append('changed source');
        if (test === 'iframe') target.append(document.createElement('iframe'));
        if (test === 'platform') {revision.reviewMarkup = revision.reviewMarkup.replace(revision.platforms[2].url, 'https://example.invalid/t443425/'); revision.platforms[2].url = 'https://example.invalid/t443425/';}
        if (test === 'total') revision.reviewMarkup = revision.reviewMarkup.replace('</section>', '<p>9999 reviews</p></section>');
        if (test === 'late-link') main.querySelector(row.key === 'about-us' ? '.et_pb_text_2 a' : '.et_pb_text_4 a').setAttribute('href', 'https://example.invalid/');
        if (test === 'late-domain') {const p = [...main.querySelectorAll('.et_pb_text_1 .et_pb_text_inner p')].find(p => p.querySelector('strong')?.textContent.trim() === 'SERVICE'); p.innerHTML = p.innerHTML.replace('krawlthoughkrakow.com', 'example.invalid');}
        if (test === 'late-copy') {
          if (row.key === 'about-us') main.querySelector('.et_pb_text_12 .et_pb_text_inner > p:nth-of-type(2)').append('changed source');
          else {const p = main.querySelector('.et_pb_text_1 .et_pb_text_inner p'); p.innerHTML = p.innerHTML.replace('valid identification', 'unreviewed identification');}
        }
        if (test === 'marker' || test === 'partial') {
          run({key: row.key, revision: row});
          const n = main.querySelector(reviews ? '[data-ktk-review-platform-links]' : '[data-ktk-operator-details]'), attr = reviews ? 'data-ktk-review-platform-links' : 'data-ktk-operator-details';
          if (test === 'marker') n.setAttribute(attr, 'changed'); else n.removeAttribute(attr);
        }
        const before = document.documentElement.outerHTML; let rejected = false, message; try {run({key: row.key, revision});} catch (e) {rejected = true; message = e.message;}
        return {rejected, atomic: before === document.documentElement.outerHTML, message};
      }, {fn: reviseOperatorTrustEditorial.toString(), row, test});
      check(row.key + ' ' + phase + ' rejects ' + test + ' atomically', negative.rejected && negative.atomic, negative);
    }
  }
  await context.close();
} finally {await browser.close();}
const report = {checkedAt: new Date().toISOString(), baseline, passed: checks.filter(c => c.pass).length, total: checks.length, checks}; await writeFile(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({passed: report.passed, total: report.total, failed: checks.filter(c => !c.pass)}, null, 2)); if (report.passed !== report.total) process.exitCode = 1;
