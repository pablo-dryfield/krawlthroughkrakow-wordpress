import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadNightlifeChoiceEditorial, reviseNightlifeChoiceEditorial, reviseNightlifeChoiceFeatures, buildNightlifeChoiceStyles} from '../nightlife-choice-editorial.mjs';

test('three nightlife-choice drafts bind original captures,41 topics and15 photo slots', async () => {
  const rows = await loadNightlifeChoiceEditorial(); assert.equal(rows.length, 3);
  for (const [i, r] of rows.entries()) {assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'), r.sourceSha256); assert.equal(r.version, '2026-11-14.nightlife-choices-1'); assert.equal((r.markup.match(/<h[23] /g) || []).length, [13, 19, 9][i]); assert.equal((r.markup.match(/data-ktk-choice-photo=/g) || []).length, [8, 2, 5][i]); assert.equal((r.markup.match(/data-ktk-choice-contents/g) || []).length, 1); assert.doesNotMatch(r.markup, /[{}]|<(?:img|script|style|iframe|form)\b/);}
});

test('sports copy links primary operators without promising specific broadcasts or seats', async () => {
  const [r] = await loadNightlifeChoiceEditorial(); for (const url of ['https://pub442.eatbu.com/?lang=en', 'https://efckrakow.pl/', 'https://bropub.pl/', 'https://starazajezdniakrakow.pl/en/']) assert.ok(r.markup.includes(url));
  assert.match(r.markup, /not a live screening schedule/); assert.match(r.markup, /not a reservation for a sports screening/); assert.doesNotMatch(r.markup, /Sky Sports|one of the longest bars|every seat gets|recent addition|cheap prices/);
  assert.match(r.markup, /store2\/pub-crawl-28\/#book/);
});

test('wine copy separates cocktail/restaurant identities and removes unsupported winery claims', async () => {
  const [, r] = await loadNightlifeChoiceEditorial(); assert.match(r.markup, /Sababa.*cocktail alternative/); assert.match(r.markup, /not describe it as a hotel/); assert.match(r.markup, /not a wine-bar tour or sightseeing package/); assert.match(r.markup, /Krupnicza 9\/2/); assert.match(r.markup, /Mostowa 1/);
  assert.doesNotMatch(r.markup, /Marcin Gortat|Jasiel|organic viticulture|award-winning|renovated hotel building|over 500 wines/); assert.match(r.markup, /Winoman and Lustra/); assert.match(r.markup, /store2\/polish-vodka-tasting-44\/#book/);
});

test('karaoke draft distinguishes an unconfirmed legacy listing from a separate operator', async () => {
  const [, , r] = await loadNightlifeChoiceEditorial(); assert.match(r.markup, /not confirmed a current Krakow booking page/); assert.match(r.markup, /separate operator example/); assert.match(r.markup, /not evidence that it is the former Karaoke Box/); assert.match(r.markup, /Pub U Kacpra remains/); assert.match(r.markup, /does not reserve a karaoke room/);
  assert.doesNotMatch(r.markup, /Kitsch Bar|Singing Club|daily promotions|Karaoke Box app/);
});

test('unknown, prototype, specialist-held and active-competition keys are untouched before DOM access', () => {
  for (const key of ['unknown', 'constructor', '__proto__', 'toString', 'post-hostel-hangover-cure', 'post-welcome-to-alcohol']) {assert.deepEqual(reviseNightlifeChoiceEditorial({key}), []); assert.deepEqual(reviseNightlifeChoiceFeatures({key}), []);}
});

test('unreviewed source identities reject before DOM access', async () => {
  for (const r of await loadNightlifeChoiceEditorial()) for (const revision of [null, {...r, key: 'unknown'}, {...r, version: 'other'}, {...r, sourceSha256: '0'.repeat(64)}, {...r, reviewedOn: '2027-01-01'}]) {assert.throws(() => reviseNightlifeChoiceEditorial({key: r.key, revision}), /identity/); assert.throws(() => reviseNightlifeChoiceFeatures({key: r.key, revision}), /identity/);}
});

test('all previous36 identities and140 summaries retain their exact normalized source binding', async () => {
  const full = JSON.parse(await readFile(new URL('../reviewed-article-presentation.json', import.meta.url), 'utf8')), later = ['post-bachelor-party-organisers-krakow','post-krakow-stag-activities','post-krakow-team-building-activities','post-escape-rooms-for-a-stag-do-in-krakow','post-krakow-shooting-range','post-welcome-to-alcohol','post-krawl-through-krakow-winter-newsletter','post-life-professional-drunk','post-hen-do-ideas-abroad','post-best-pub-crawls-in-europe','post-budapest-or-krakow-nightlife','post-krakow-hen-party-reviews','post-the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow'], raw = {...full, articles: full.articles.filter(a => !later.includes(a.key)), containers: full.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !later.includes(k))}))}, keys = ['post-sports-bar-krakow', 'post-krakow-wine-bars', 'post-karaoke-bars-in-krakow'];
  const inverse = {...raw, articles: raw.articles.filter(a => !keys.includes(a.key)), containers: raw.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !keys.includes(k))}))};
  assert.equal(inverse.articles.length, 36); assert.equal(inverse.containers.reduce((n, c) => n + c.cardKeys.length, 0), 140); assert.equal(createHash('sha256').update(JSON.stringify(inverse)).digest('hex'), '553a1f65e9c11c12635c43720b09d292acf736ad0c877e7b87f4233e7afb85c8');
  assert.equal(raw.articles.length, 39); assert.equal(raw.containers.reduce((n, c) => n + c.cardKeys.length, 0), 150); assert.equal(raw.containers.filter(c => c.cardKeys.some(k => keys.includes(k))).length, 7); assert.equal(raw.containers.reduce((n, c) => n + c.cardKeys.filter(k => keys.includes(k)).length, 0), 10);
});

test('choice styles are bounded, additive, fixed-size and idempotent', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-nightlife-choice-css-'));
  try {const file = path.join(dir, 'runtime.css'), old = 'unchanged\n/* BEGIN Practical food guides */\nrest\n'; await writeFile(file, old); await buildNightlifeChoiceStyles(file); const css = await readFile(file, 'utf8'); assert.equal(css.replace(/\/\* BEGIN Nightlife choice guides \*\/[\s\S]*?\/\* END Nightlife choice guides \*\/\n\n/, ''), old); assert.match(css, /font-size: 16px; line-height: 1\.65/); assert.match(css, /outline: 2px solid currentColor/); assert.equal((css.match(/padding-right: 24px/g) || []).length, 1); assert.equal((css.match(/!important/g) || []).length, 1); await buildNightlifeChoiceStyles(file); assert.equal(await readFile(file, 'utf8'), css); for (const changed of [css.replace('16px', '99px'), css + css, old.replace('Practical food guides', 'Other guides')]) {await writeFile(file, changed); await assert.rejects(() => buildNightlifeChoiceStyles(file)); assert.equal(await readFile(file, 'utf8'), changed);}}
  finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-nightlife-choice-css-')); await rm(dir, {recursive: true, force: true});}
});
