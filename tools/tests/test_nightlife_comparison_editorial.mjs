import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadNightlifeComparisonEditorial, reviseNightlifeComparisonEditorial, reviseNightlifeComparisonFeature, buildNightlifeComparisonStyles} from '../nightlife-comparison-editorial.mjs';

test('two comparison drafts pin original sources and28 ordered topics', async () => {
  const rows = await loadNightlifeComparisonEditorial(); assert.equal(rows.length, 2);
  for (const [i, r] of rows.entries()) {
    assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'), r.sourceSha256); assert.equal(r.version, '2026-11-15.nightlife-comparison-1'); assert.equal(r.reviewedOn, '2026-11-15');
    assert.equal((r.markup.match(/<h[23] /g) || []).length, [6, 22][i]); assert.equal((r.markup.match(/data-ktk-comparison-photo=/g) || []).length, [0, 7][i]); assert.equal((r.markup.match(/data-ktk-comparison-contents/g) || []).length, 1);
    assert.doesNotMatch(r.markup, /[{}]|<(?:img|script|style|video|iframe|form)\b|utm_|gclid|gbraid|wbraid/);
  }
});

test('European guide separates KTK and Malta without carrying forward old packages', async () => {
  const [r] = await loadNightlifeComparisonEditorial();
  for (const phrase of ['https://pubcrawlmalta.com/', 'separate operator', 'aged 18 and over', 'valid ID is recommended', 'individually in each quote', 'store2/pub-crawl-28/#book', 'data-ktk-contextual-links="post-best-pub-crawls-in-europe"']) assert.ok(r.markup.includes(phrase), phrase);
  assert.equal((r.markup.match(/data-ktk-contextual-links/g) || []).length, 1);
  assert.doesNotMatch(r.markup, /30 minutes|17-21|hugo|Footloose|blue lagoon|unlimited drinks|Paceville Piazza|\/boat-parties|\/private-events|www.pubcrawlmalta/i);
});

test('Budapest comparison corrects geography and currencies without unsupported rankings', async () => {
  const [, r] = await loadNightlifeComparisonEditorial();
  for (const phrase of ['capital of Hungary', 'Poland uses PLN', 'Hungary uses HUF', 'https://bkk.hu/en/travel-information/night-transport/', 'https://mpk.krakow.pl/rozklady-jazdy', 'https://szimpla.hu/', 'actual operator and ticket', 'store2/pub-crawl-28/#book']) assert.ok(r.markup.includes(phrase), phrase);
  assert.doesNotMatch(r.markup, /Czech Republic capital|\b(?:Lavender|Mosquito|Schindler|Prague)\b|bad luck|all-year-round|slightly more affordable|safely as possible|2004|1\.7 million/i);
  assert.ok(r.markup.includes('id="krakowacitythatneversleepsinkrakowsummermonthsjuneaugustaresynonymouswithbustlingparksfilledwithpicnicgoersenjoyingauthenticpolishpierogiwhilestreetperformersaddcolortoanalreadylivelyatmospherethisperiodalsowitnessesasurgeintouristnumbersmakingitidealforthosewhoenjoyminglingatpopularnightspotsnearoskarschindlerfactorymuseumormosquitohostel"'));
});

test('comparison catalog adds exactly2 identities/6 bindings with prior48/178 frozen', async () => {
  const full = JSON.parse(await readFile(new URL('../reviewed-article-presentation.json', import.meta.url), 'utf8')), later = ['post-krakow-hen-party-reviews', 'post-the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow','post-best-hotels-in-krakow-2019-2020','post-spa-hotels-krakow'], d = {...full, articles: full.articles.filter(a => !later.includes(a.key)), containers: full.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !later.includes(k))}))}, keys = ['post-best-pub-crawls-in-europe', 'post-budapest-or-krakow-nightlife'], old = {...d, articles: d.articles.filter(a => !keys.includes(a.key)), containers: d.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !keys.includes(k))}))};
  assert.equal(old.articles.length, 48); assert.equal(old.containers.reduce((n, c) => n + c.cardKeys.length, 0), 178); assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'), 'e05a9ffc9521edeba19fb890255ce6ba228ecd4c61b4e3356d7f12f1cdd16f5c');
  assert.equal(d.articles.length, 50); assert.equal(d.containers.reduce((n, c) => n + c.cardKeys.length, 0), 184); assert.equal(d.containers.filter(c => c.cardKeys.some(k => keys.includes(k))).length, 5);
});

test('comparison asset exceptions are exact source-bound cases, not general normalization', async () => {
  const s = await readFile(new URL('../nightlife-comparison-editorial.mjs', import.meta.url), 'utf8');
  assert.ok(s.includes("!conf.module && i === 2 ? '1693298437_severinus-dewantara-0fl-WGMuNPA-unsplash%20(1).jpg'"));
  assert.ok(s.includes("conf.module && i === 0 && q.getAttribute('class') === 'et_pb_image_wrap ' && p.getAttribute('class') === 'et_pb_image_wrap'"));
  assert.ok(s.includes('A concert audience holding phones toward a stage beneath hanging decorations.')); assert.ok(s.includes("a.name.startsWith('on')"));
});

test('held, active competition and prototype routes return before DOM access', () => {
  for (const key of ['other', 'constructor', '__proto__', 'toString', 'post-hostel-hangover-cure', 'post-welcome-to-alcohol']) {assert.deepEqual(reviseNightlifeComparisonEditorial({key}), []); assert.deepEqual(reviseNightlifeComparisonFeature({key}), []);}
});

test('missing/stale comparison identity rejects before DOM access', async () => {
  for (const r of await loadNightlifeComparisonEditorial()) for (const revision of [null, {...r, key: 'other'}, {...r, version: 'other'}, {...r, sourceSha256: '0'.repeat(64)}, {...r, reviewedOn: '2027-01-01'}]) {assert.throws(() => reviseNightlifeComparisonEditorial({key: r.key, revision}), /identity/); if (r.key === 'post-budapest-or-krakow-nightlife') assert.throws(() => reviseNightlifeComparisonFeature({key: r.key, revision}), /identity/);}
});

test('comparison CSS is bounded, additive, idempotent and drift guarded', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-comparison-css-'));
  try {
    const f = path.join(dir, 'runtime.css'), before = 'unchanged\n/* BEGIN Party trip planning guidance */\nrest\n'; await writeFile(f, before); await buildNightlifeComparisonStyles(f); const css = await readFile(f, 'utf8');
    assert.equal(css.replace(/\/\* BEGIN Nightlife comparison guidance \*\/[\s\S]*?\/\* END Nightlife comparison guidance \*\/\n\n/, ''), before); assert.match(css, /font-size: 16px; line-height: 1\.65/); assert.match(css, /outline: 2px solid currentColor/); assert.equal((css.match(/padding-right: 24px/g) || []).length, 1); assert.doesNotMatch(css, / h1\b/);
    assert.ok(css.includes('post-best-pub-crawls-in-europe"] #main-content .entry-content[data-ktk-comparison-review] .et_pb_text_inner')); await buildNightlifeComparisonStyles(f); assert.equal(await readFile(f, 'utf8'), css);
    for (const corrupt of [css.replace('16px', '99px'), css + css, before.replace('Party trip planning guidance', 'Other')]) {await writeFile(f, corrupt); await assert.rejects(() => buildNightlifeComparisonStyles(f)); assert.equal(await readFile(f, 'utf8'), corrupt);}
  } finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-comparison-css-')); await rm(dir, {recursive: true, force: true});}
});
