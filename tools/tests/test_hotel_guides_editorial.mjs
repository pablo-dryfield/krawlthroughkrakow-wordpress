import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadHotelGuidesEditorial, reviseHotelGuidesEditorial, buildHotelGuidesStyles} from '../hotel-guides-editorial.mjs';

test('two hotel drafts bind exact original captures,41 topics and83 reviewed photos', async () => {
  const rows = await loadHotelGuidesEditorial(); assert.equal(rows.length, 2);
  for (const [i, r] of rows.entries()) {
    assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'), r.sourceSha256); assert.equal(r.version, '2026-11-15.hotel-guides-1'); assert.equal(r.reviewedOn, '2026-11-15'); assert.equal((r.markup.match(/<h[23] /g) || []).length, [31, 10][i]); assert.equal((r.markup.match(/data-ktk-hotel-module=/g) || []).length, [31, 0][i]); assert.equal((r.markup.match(/data-ktk-hotel-photo=/g) || []).length, [0, 3][i]); assert.equal((r.markup.match(/data-ktk-hotel-contents/g) || []).length, 1); assert.equal(Object.keys(r.images).length, 83); assert.doesNotMatch(r.markup, /[{}]|<(?:img|script|style|video|iframe|form)\b|utm_|gclid|gbraid|wbraid|\$\$/);
  }
});

test('hotel shortlist separates current address identities from historical names and scores', async () => {
  const [r] = await loadHotelGuidesEditorial();
  for (const phrase of ['original 2019 hotel selection', 'not today\'s room prices or a new ranking', 'Slawkowska 13', 'Florianska 28', 'Swietej Gertrudy 12', 'Nobilton: current details unconfirmed', 'Ogrodowa 10', 'Halicka 14a', 'Aparthotel Old Town contact page', 'store2/pub-crawl-28/#book']) assert.ok(r.markup.includes(phrase), phrase);
  assert.doesNotMatch(r.markup, /rated on a|review scale of 1-10|9\.7|8\.7|free before 17:00|drop you off.*5minutes|amazing hotel\. Amazing features|best hotels in 2026/i);
});

test('spa draft distinguishes hotel guests, paid non-guests and the out-of-town trip', async () => {
  const [, r] = await loadHotelGuidesEditorial();
  for (const phrase of ['hotel guests only', 'paid entry for non-guests', 'Chocholow 400, outside Krakow', 'pool ticket, sauna access, treatment and transport can be separate', 'These are separate bookings', 'do not promise healing, detoxification', 'https://www.chocholowskietermy.pl/en/regulamin/', 'id="conclusion"']) assert.ok(r.markup.includes(phrase), phrase);
  assert.doesNotMatch(r.markup, /– Diane|just what the doctor ordered|provide a host of health benefits|Most allow non-guests|we combine the relaxation of spa hotels with exciting pub crawls|store2\/(?:[^/]*-38|[^/]*-39)\//);
});

test('hotel photo ledger is complete, neutral and bound to unchanged media', async () => {
  const rows = await loadHotelGuidesEditorial(), images = rows[0].images, assets = rows[0].assets;
  assert.equal(images['67050c6e93f1'], 'An indoor atrium with lounge seating, trees and a patterned floor.'); assert.equal(images['c867222506b2'], 'A person resting at the edge of an indoor swimming pool.');
  for (const [id, alt] of Object.entries(images)) {assert.ok(Object.values(assets).some(a => path.basename(a.file).startsWith(id + '-'))); assert.doesNotMatch(alt, /nightclub|pub crawl|Kyiv|Kiev|London|best hotels|budget hotels/i); assert.equal(alt, alt.trim());}
  assert.equal(images['0d391f651622'], "A therapist pouring oil onto a person's back during a massage."); assert.equal(images['737e19b7bc31'], 'A freestanding bathtub beside a potted plant in a tiled bathroom.');
});

test('hotel source guards complete before live mutations and retain the exact inherited empty-heading repair', async () => {
  const s = await readFile(new URL('../hotel-guides-editorial.mjs', import.meta.url), 'utf8');
  for (const phrase of ["Object.hasOwn(definitions, key)", "old.getAttribute('srcset') || old.dataset.lazySrcset", "body.getAttribute('id') !== source.getAttribute('id')", "if (i === 6)", '<p data-ktk-heading-origin="h2"><b></b></p>', 'All unique hotel destinations required']) assert.ok(s.includes(phrase), phrase);
  assert.ok(s.indexOf('Original hotel text interior changed') < s.indexOf('for (const plan of altPlans)')); assert.ok(s.indexOf('Original spa copy or destinations changed') < s.indexOf('for (const plan of altPlans)')); assert.ok(s.includes("a.name.startsWith('on')"));
});

test('small historical-hotel grids have a route-and-marker-only non-important visibility fallback', async () => {
  const s = await readFile(new URL('../hotel-guides-editorial.mjs', import.meta.url), 'utf8');
  assert.ok(s.includes('body.ktk-code-page[data-ktk-page="post-best-hotels-in-krakow-2019-2020"] #main-content .entry-content[data-ktk-hotel-guides-review] .et_pb_gallery_grid .et_pb_gallery_item')); assert.ok(s.includes("galleryScope + ' { display: block; }")); assert.doesNotMatch(s, /display: block !important/);
});

test('hotel catalog adds exactly2 identities and7 cards while freezing prior52/190', async () => {
  const d = JSON.parse(await readFile(new URL('../reviewed-article-presentation.json', import.meta.url), 'utf8')), keys = ['post-best-hotels-in-krakow-2019-2020', 'post-spa-hotels-krakow'], old = {...d, articles: d.articles.filter(a => !keys.includes(a.key)), containers: d.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !keys.includes(k))}))};
  assert.equal(d.articles.length, 54); assert.equal(d.containers.reduce((n, c) => n + c.cardKeys.length, 0), 197); assert.equal(d.containers.filter(c => c.cardKeys.some(k => keys.includes(k))).length, 6); assert.equal(old.articles.length, 52); assert.equal(old.containers.reduce((n, c) => n + c.cardKeys.length, 0), 190); assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'), 'e13a53a354ddf3a6a34b5899e7ff9b965250294c1b9a6de68e42d6f275f98469');
});

test('unknown, prototype, medical and active competition routes return without DOM access', () => {
  for (const key of ['other', 'constructor', '__proto__', 'toString', 'post-hostel-hangover-cure', 'post-welcome-to-alcohol']) assert.deepEqual(reviseHotelGuidesEditorial({key}), []);
});

test('missing or stale hotel identity rejects before DOM access', async () => {
  for (const r of await loadHotelGuidesEditorial()) for (const revision of [null, {...r, key: 'other'}, {...r, version: 'other'}, {...r, sourceSha256: '0'.repeat(64)}, {...r, reviewedOn: '2030-01-01'}]) assert.throws(() => reviseHotelGuidesEditorial({key: r.key, revision}), /identity/);
});

test('hotel CSS remains scoped, additive, idempotent and drift guarded', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-hotel-guides-css-'));
  try {
    const file = path.join(dir, 'runtime.css'), before = 'unchanged\n/* BEGIN Hen and historical bars guidance */\nrest\n'; await writeFile(file, before); await buildHotelGuidesStyles(file); const css = await readFile(file, 'utf8'); assert.equal(css.replace(/\/\* BEGIN Hotel guide planning \*\/[\s\S]*?\/\* END Hotel guide planning \*\/\n\n/, ''), before); assert.match(css, /font-size: 16px; line-height: 1\.65/); assert.match(css, /outline: 2px solid currentColor/); assert.equal((css.match(/padding-right: 24px/g) || []).length, 1); assert.doesNotMatch(css, / h1\b/); await buildHotelGuidesStyles(file); assert.equal(await readFile(file, 'utf8'), css);
    for (const corrupt of [css.replace('16px', '99px'), css + css, before.replace('Hen and historical bars guidance', 'Other')]) {await writeFile(file, corrupt); await assert.rejects(() => buildHotelGuidesStyles(file)); assert.equal(await readFile(file, 'utf8'), corrupt);}
  } finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-hotel-guides-css-')); await rm(dir, {recursive: true, force: true});}
});
