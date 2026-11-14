import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadKartingGuidesEditorial, reviseKartingGuidesEditorial, buildKartingGuideStyles} from '../karting-guides-editorial.mjs';

test('karting templates bind two immutable captures and exact media slots', async () => {
  const rows = await loadKartingGuidesEditorial(); assert.equal(rows.length, 2);
  for (const [i, row] of rows.entries()) {
    assert.equal(createHash('sha256').update(row.sourceHtml).digest('hex'), row.sourceSha256);
    assert.equal(row.version, '2026-11-14.karting-guides-1'); assert.equal(row.reviewedOn, '2026-11-14');
    assert.equal((row.markup.match(/data-ktk-karting-photo=/g) || []).length, [6, 5][i]);
    assert.equal((row.markup.match(/data-ktk-karting-contents/g) || []).length, 1);
    assert.doesNotMatch(row.markup, /[{}]|<(?:img|script|style|iframe|form)\b/);
  }
});
test('group planning distinguishes the public KTK offer from unconfirmed private formats', async () => {
  const [r] = await loadKartingGuidesEditorial();
  assert.match(r.markup, /three eight-minute races with breaks/); assert.match(r.markup, /minimum is eight participants/);
  assert.match(r.markup, /does not promise private track hire/); assert.match(r.markup, /confirm.*quote|confirmed in your quote/);
  assert.match(r.markup, /__KTK_HOME_URL__store2\/go-karting-30\/#book/); assert.match(r.markup, /__KTK_HOME_URL__krakow-go-karting\//);
  assert.doesNotMatch(r.markup, /180 PLN|two exhilarating 8-minute|groups five people|safety rules ensure everyone|countryside/i);
});
test('first-visit information uses operator sources instead of universal age and fleet promises', async () => {
  const [, r] = await loadKartingGuidesEditorial();
  assert.match(r.markup, /https:\/\/gokarting.com.pl\/regulamin-toru.pdf/); assert.match(r.markup, /LPG-powered karts/);
  assert.match(r.markup, /different vehicle categories/); assert.match(r.markup, /not make an underage guest eligible/);
  assert.match(r.markup, /ages 18 and over/); assert.match(r.markup, /valid ID is recommended/);
  assert.match(r.markup, /WRT Karting/); assert.match(r.markup, /__KTK_HOME_URL__go-karting-krakow\//);
  assert.doesNotMatch(r.markup, /at least 12 years|aged 6.?11|zero emissions|eco-friendly|Macuszy|Makuszy|parental consent forms signed/i);
});
test('unknown/prototype/medical/active competition routes remain untouched without DOM access', () => {
  for (const key of ['other', 'constructor', '__proto__', 'toString', 'post-hostel-hangover-cure', 'post-welcome-to-alcohol']) assert.deepEqual(reviseKartingGuidesEditorial({key}), []);
});
test('unknown karting identities fail before DOM access', async () => {
  for (const r of await loadKartingGuidesEditorial()) for (const revision of [null, {...r, key: 'other'}, {...r, version: 'unknown'}, {...r, sourceSha256: '0'.repeat(64)}, {...r, reviewedOn: '2027-01-01'}]) assert.throws(() => reviseKartingGuidesEditorial({key: r.key, revision}), /identity/);
});
test('original29 identities and114 summaries stay exactly frozen', async () => {
  const raw = JSON.parse(await readFile(new URL('../reviewed-article-presentation.json', import.meta.url), 'utf8')), later = ['post-krakow-weather-guide', 'post-krakow-winter-activities'];
  const data = {...raw, articles: raw.articles.filter(r => !later.includes(r.key)), containers: raw.containers.map(r => ({...r, cardKeys: r.cardKeys.filter(k => !later.includes(k))}))}, keys = ['post-go-karting-krakow', 'post-krakow-go-karting'];
  const inverse = {...data, articles: data.articles.filter(r => !keys.includes(r.key)), containers: data.containers.map(r => ({...r, cardKeys: r.cardKeys.filter(k => !keys.includes(k))}))};
  assert.equal(inverse.articles.length, 29); assert.equal(inverse.containers.reduce((n, c) => n + c.cardKeys.length, 0), 114);
  assert.equal(data.articles.length, 31); assert.equal(data.containers.reduce((n, c) => n + c.cardKeys.length, 0), 120);
  assert.equal(data.containers.reduce((n, c) => n + c.cardKeys.filter(k => keys.includes(k)).length, 0), 6);
  assert.equal(createHash('sha256').update(JSON.stringify(inverse)).digest('hex'), '614c501c361d8cd5e8a8774992c0fc5075f507dbdeac4fa77e9601e01374270e');
});
test('karting CSS is narrowly marked, additive, readable and idempotent', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-karting-css-'));
  try {
    const file = path.join(dir, 'runtime.css'), before = 'unchanged\n/* BEGIN Practical city trip guides */\nrest\n'; await writeFile(file, before); await buildKartingGuideStyles(file);
    const css = await readFile(file, 'utf8'); assert.equal(css.replace(/\/\* BEGIN Practical karting guides \*\/[\s\S]*?\/\* END Practical karting guides \*\/\n\n/, ''), before);
    assert.match(css, /font-size: 16px; line-height: 1\.65/); assert.match(css, /padding-right: 24px/); assert.match(css, /outline: 2px solid currentColor/);
    assert.equal((css.match(/!important/g) || []).length, 1); await buildKartingGuideStyles(file); assert.equal(await readFile(file, 'utf8'), css);
    for (const changed of [css.replace('16px', '99px'), css + css, before.replace('city trip', 'unreviewed trip')]) {await writeFile(file, changed); await assert.rejects(() => buildKartingGuideStyles(file)); assert.equal(await readFile(file, 'utf8'), changed);}
  } finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-karting-css-')); await rm(dir, {recursive: true, force: true});}
});
