import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadHenBarsEditorial, reviseHenBarsEditorial, buildHenBarsStyles} from '../hen-bars-editorial.mjs';

test('two hen/bars drafts pin the original captures, interiors and26 topics', async () => {
  const rows = await loadHenBarsEditorial(); assert.equal(rows.length, 2);
  for (const [i, r] of rows.entries()) {assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'), r.sourceSha256); assert.equal(r.version, '2026-11-15.hen-bars-1'); assert.equal(r.reviewedOn, '2026-11-15'); assert.equal((r.markup.match(/<h[23] /g) || []).length, [15, 0][i]); assert.equal((r.markup.match(/data-ktk-hen-bars-photo=/g) || []).length, [7, 0][i]); assert.equal((r.markup.match(/data-ktk-hen-bars-heading=/g) || []).length, [0, 12][i]); assert.equal((r.markup.match(/data-ktk-hen-bars-contents/g) || []).length, 1); assert.doesNotMatch(r.markup, /[{}]|<(?:img|script|style|video|iframe|form)\b|utm_|gclid|gbraid|wbraid|\[\/et_pb_/);}
});

test('hen guide retains owned services and exact existing group paragraph without invented reviews', async () => {
  const [r] = await loadHenBarsEditorial();
  for (const phrase of ['data-ktk-contextual-links="post-krakow-hen-party-reviews"', 'store2/pub-crawl-28/#book', 'store2/shooting-range-34/#book', 'store2/polish-vodka-tasting-44/#book">vodka tasting experience</a>', 'aged 18 and over', 'valid ID is recommended', 'individually in each quote', '__KTK_HOME_URL__testimonials/', 'id="whitewaterraftingadventures"']) assert.ok(r.markup.includes(phrase), phrase);
  assert.equal((r.markup.match(/data-ktk-contextual-links=/g) || []).length, 1); assert.doesNotMatch(r.markup, /1 hour of unlimited|five distinct types|Nuat Boran|VIP club entry|Skip the queues|shots at every stop|secure environment|guided tours and is truly one-of-a-kind|professional instructors/);
});

test('bars guide differentiates historical venues and current operator information', async () => {
  const [, r] = await loadHenBarsEditorial();
  for (const phrase of ['original 2017-2018 shortlist', 'Dajwor 16', 'Starowislna 16', 'as 2013-2023', 'https://klubre.pl/', 'https://wezze-krafta.localo.site/', 'https://www.forumprzestrzenie.com/', 'have not verified a current public operator programme', 'store2/pub-crawl-28/#book']) assert.ok(r.markup.includes(phrase), phrase);
  assert.doesNotMatch(r.markup, /bad reputation|zero control|drink many shots|world.class sound|compulsory for foreigners|few more shots.*cure|20-25|2019|2027|hushlive\.(?:com|pl)/i);
});

test('hen/bars catalog adds exactly2 identities/6 cards with prior50/184 frozen', async () => {
  const full = JSON.parse(await readFile(new URL('../reviewed-article-presentation.json', import.meta.url), 'utf8')), later = ['post-best-hotels-in-krakow-2019-2020', 'post-spa-hotels-krakow'], d = {...full, articles: full.articles.filter(a => !later.includes(a.key)), containers: full.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !later.includes(k))}))}, keys = ['post-krakow-hen-party-reviews', 'post-the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow'], old = {...d, articles: d.articles.filter(a => !keys.includes(a.key)), containers: d.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !keys.includes(k))}))};
  assert.equal(old.articles.length, 50); assert.equal(old.containers.reduce((n, c) => n + c.cardKeys.length, 0), 184); assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'), '4df04f886bdc07ed8cc1a8d1453d4eb312c91fab8de1cf8223f7998bd03eb81b'); assert.equal(d.articles.length, 52); assert.equal(d.containers.reduce((n, c) => n + c.cardKeys.length, 0), 190); assert.equal(d.containers.filter(c => c.cardKeys.some(k => keys.includes(k))).length, 5);
});

test('hen/bars photo corrections remain bounded and all late guards precede mutations', async () => {
  const s = await readFile(new URL('../hen-bars-editorial.mjs', import.meta.url), 'utf8');
  for (const phrase of ['People raising wine glasses together indoors.', 'A cocktail with a fresh citrus slice and splashing liquid.', 'Two DJs behind equipment under green lighting.', "body.getAttribute('id') !== source.getAttribute('id')", "old.getAttribute('src'), origin, '__KTK_PAGE_ASSETS__media/' + file", 'Reviewed hen/bars destinations changed']) assert.ok(s.includes(phrase), phrase);
  assert.ok(s.indexOf('Original hen/bars source links changed') < s.indexOf('for (const plan of altPlans)')); assert.ok(s.indexOf('Original bars text interior changed') < s.indexOf('for (const plan of altPlans)')); assert.ok(s.includes("a.name.startsWith('on')"));
});

test('unknown, prototype, held and competition routes return before DOM access', () => {
  for (const key of ['other', 'constructor', '__proto__', 'toString', 'post-hostel-hangover-cure', 'post-welcome-to-alcohol']) assert.deepEqual(reviseHenBarsEditorial({key}), []);
});

test('missing or stale hen/bars identity rejects before DOM access', async () => {
  for (const r of await loadHenBarsEditorial()) for (const revision of [null, {...r, key: 'other'}, {...r, version: 'other'}, {...r, sourceSha256: '0'.repeat(64)}, {...r, reviewedOn: '2027-01-01'}]) assert.throws(() => reviseHenBarsEditorial({key: r.key, revision}), /identity/);
});

test('hen/bars CSS is bounded, additive, idempotent and drift guarded', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-hen-bars-css-'));
  try {const f = path.join(dir, 'runtime.css'), before = 'unchanged\n/* BEGIN Nightlife comparison guidance */\nrest\n'; await writeFile(f, before); await buildHenBarsStyles(f); const css = await readFile(f, 'utf8'); assert.equal(css.replace(/\/\* BEGIN Hen and historical bars guidance \*\/[\s\S]*?\/\* END Hen and historical bars guidance \*\/\n\n/, ''), before); assert.match(css, /font-size: 16px; line-height: 1\.65/); assert.match(css, /outline: 2px solid currentColor/); assert.equal((css.match(/padding-right: 24px/g) || []).length, 1); assert.doesNotMatch(css, / h1\b/); await buildHenBarsStyles(f); assert.equal(await readFile(f, 'utf8'), css); for (const corrupt of [css.replace('16px', '99px'), css + css, before.replace('Nightlife comparison guidance', 'Other')]) {await writeFile(f, corrupt); await assert.rejects(() => buildHenBarsStyles(f)); assert.equal(await readFile(f, 'utf8'), corrupt);}}
  finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-hen-bars-css-')); await rm(dir, {recursive: true, force: true});}
});
