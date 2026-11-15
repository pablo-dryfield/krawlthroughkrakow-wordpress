import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadPartyTripEditorial, revisePartyTripEditorial, revisePartyTripFeature, buildPartyTripStyles} from '../party-trip-editorial.mjs';

test('two party-trip drafts bind exact captures and26 reviewed topics', async () => {
  const rows = await loadPartyTripEditorial(); assert.equal(rows.length, 2);
  for (const [i, r] of rows.entries()) {
    assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'), r.sourceSha256); assert.equal(r.version, '2026-11-15.party-trip-1');
    assert.equal((r.markup.match(/<h[23] /g) || []).length, [6, 20][i]); assert.equal((r.markup.match(/data-ktk-party-trip-photo=/g) || []).length, [0, 3][i]);
    assert.equal((r.markup.match(/data-ktk-party-trip-contents/g) || []).length, 1); assert.doesNotMatch(r.markup, /[{}]|<(?:img|script|style|video|iframe|form)\b/);
  }
});

test('guide-life preserves historical context without drinking or hiring guarantees', async () => {
  const [r] = await loadPartyTripEditorial();
  for (const phrase of ['earlier chapter', 'not a description of today', 'not a qualification', '18 and over', 'valid ID is recommended', 'pub-crawl-jobs/', 'does not promise a vacancy', 'store2/pub-crawl-28/#book']) assert.ok(r.markup.includes(phrase), phrase);
  assert.doesNotMatch(r.markup, /cure|breakfast vodka|power hour|make sure all our guests get home safely|Graeme|Osh|guaranteed|utm_|gclid|gbraid|wbraid/i);
});

test('life search policy reflects practical text rather than the obsolete image-led label', async () => {
  const d = JSON.parse(await readFile(new URL('../code-pages-seo.json', import.meta.url), 'utf8')).pages['/life-professional-drunk/'];
  assert.equal(d.description, "A fresh look at KTK's old guide-life nickname, with practical pub-crawl guest questions, current joining links and information about guide roles."); assert.doesNotMatch(d.description, /image-led|guaranteed/); assert.match(d.role, /Historical guide-life title/);
});

test('hen guide distinguishes actual operators from old pool and bundle claims', async () => {
  const [, r] = await loadPartyTripEditorial();
  for (const phrase of ['2013-2023', 'https://www.forumprzestrzenie.com/', 'https://www.prozakclub.com/', 'https://alchemia.com.pl/', 'individually in each KTK quote', 'private hen arrangement is a separate enquiry', 'store2/food-tour-krakow-48/', 'data-ktk-contextual-links="post-hen-do-ideas-abroad"']) assert.ok(r.markup.includes(phrase), phrase);
  assert.match(r.markup, /not a guaranteed stop on a pub crawl/);
  assert.doesNotMatch(r.markup, /forumdesignu|SafeAround|guaranteed entry|we guarantee|free organiser|lowest price|utm_|gclid|gbraid|wbraid/);
  assert.equal((r.markup.match(/id="isPasted"/g) || []).length, 1); assert.equal((r.markup.match(/data-ktk-contextual-links/g) || []).length, 1);
});

test('catalog adds exactly2 identities and6 bindings with prior46/172 frozen', async () => {
  const full = JSON.parse(await readFile(new URL('../reviewed-article-presentation.json', import.meta.url), 'utf8')), later = ['post-best-pub-crawls-in-europe', 'post-budapest-or-krakow-nightlife','post-krakow-hen-party-reviews','post-the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow','post-best-hotels-in-krakow-2019-2020','post-spa-hotels-krakow'], d = {...full, articles: full.articles.filter(a => !later.includes(a.key)), containers: full.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !later.includes(k))}))}, keys = ['post-life-professional-drunk', 'post-hen-do-ideas-abroad'];
  const old = {...d, articles: d.articles.filter(a => !keys.includes(a.key)), containers: d.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !keys.includes(k))}))};
  assert.equal(old.articles.length, 46); assert.equal(old.containers.reduce((n, c) => n + c.cardKeys.length, 0), 172); assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'), '626244a64e756334a4f279e343b6360ed4c55d979df49aaf7b3570c90d5e4634');
  assert.equal(d.articles.length, 48); assert.equal(d.containers.reduce((n, c) => n + c.cardKeys.length, 0), 178); assert.equal(d.containers.filter(c => c.cardKeys.some(k => keys.includes(k))).length, 5);
});

test('hen food information link has an explicit empty-hash attribution case only', async () => {
  const [, row] = await loadPartyTripEditorial(), harness = await readFile(new URL('../test-code-page-booking-attribution.mjs', import.meta.url), 'utf8');
  assert.ok(row.markup.includes('href="__KTK_HOME_URL__store2/food-tour-krakow-48/"'));
  assert.ok(harness.includes("destination:'/staging/store2/food-tour-krakow-48/',hash:'',product:48"));
  assert.equal((harness.match(/hash:''/g) || []).length, 1);
  assert.ok(harness.includes("href.hash===(item.hash??'#book')"));
});

test('held, active competition and prototype routes return before DOM access', () => {
  for (const key of ['other', 'constructor', '__proto__', 'toString', 'post-hostel-hangover-cure', 'post-welcome-to-alcohol', 'post-krawl-through-krakow-winter-newsletter']) {assert.deepEqual(revisePartyTripEditorial({key}), []); assert.deepEqual(revisePartyTripFeature({key}), []);}
});

test('missing and stale party-trip identities reject before DOM access', async () => {
  for (const r of await loadPartyTripEditorial()) for (const revision of [null, {...r, key: 'other'}, {...r, version: 'other'}, {...r, sourceSha256: '0'.repeat(64)}, {...r, reviewedOn: '2027-01-01'}]) {assert.throws(() => revisePartyTripEditorial({key: r.key, revision}), /identity/); if (r.key === 'post-hen-do-ideas-abroad') assert.throws(() => revisePartyTripFeature({key: r.key, revision}), /identity/);}
});

test('party-trip CSS is additive, scoped away from the original life H1 and drift guarded', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-party-trip-css-'));
  try {
    const f = path.join(dir, 'runtime.css'), old = 'unchanged\n/* BEGIN Competition newsletter guidance */\nrest\n'; await writeFile(f, old); await buildPartyTripStyles(f); const css = await readFile(f, 'utf8');
    assert.equal(css.replace(/\/\* BEGIN Party trip planning guidance \*\/[\s\S]*?\/\* END Party trip planning guidance \*\/\n\n/, ''), old); assert.match(css, /font-size: 16px; line-height: 1\.65/); assert.match(css, /outline: 2px solid currentColor/); assert.equal((css.match(/padding-right: 24px/g) || []).length, 1);
    assert.ok(css.includes('post-life-professional-drunk"] #main-content .entry-content[data-ktk-party-trip-review] .et_pb_text_inner')); assert.doesNotMatch(css, / h1\b/);
    await buildPartyTripStyles(f); assert.equal(await readFile(f, 'utf8'), css);
    for (const corrupt of [css.replace('16px', '99px'), css + css, old.replace('Competition newsletter guidance', 'Other')]) {await writeFile(f, corrupt); await assert.rejects(() => buildPartyTripStyles(f)); assert.equal(await readFile(f, 'utf8'), corrupt);}
  } finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-party-trip-css-')); await rm(dir, {recursive: true, force: true});}
});
