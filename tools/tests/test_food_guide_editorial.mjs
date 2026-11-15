import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadFoodGuideEditorial, reviseFoodGuideEditorial, reviseFoodFeaturedDescriptions, buildFoodGuideStyles} from '../food-guide-editorial.mjs';

test('three food drafts bind their exact original captures,43 modules and12 photo slots', async () => {
  const rows = await loadFoodGuideEditorial(); assert.equal(rows.length, 3);
  for (const [i, r] of rows.entries()) {assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'), r.sourceSha256); assert.equal(r.version, '2026-11-14.food-guides-1'); assert.equal((r.markup.match(/data-ktk-food-module=/g) || []).length, i ? 0 : 43); assert.equal((r.markup.match(/data-ktk-food-photo=/g) || []).length, [0, 8, 4][i]); assert.equal((r.markup.match(/data-ktk-food-contents/g) || []).length, 1); assert.doesNotMatch(r.markup, /[{}]|<(?:img|script|style|iframe|form)\b/);}
});

test('food choices retain both exact owned vodka labels without old cure or fixed-price claims', async () => {
  const [r] = await loadFoodGuideEditorial(); assert.equal((r.markup.match(/__KTK_HOME_URL__store2\/polish-vodka-tasting-44\/#book/g) || []).length, 2);
  assert.match(r.markup, />the Polish vodka</); assert.match(r.markup, />Polish vodka</); assert.match(r.markup, /store2\/food-tour-krakow-48\/#book/);
  assert.doesNotMatch(r.markup, /cure|soak up|16 zloty|all day venue|newest \(and best\)|boost the mood/i);
  assert.match(r.markup, /https:\/\/bistrocharlotte.com\/pl\/lokale\/charlotte-plac-szczepanski-krakow\//); assert.doesNotMatch(r.markup, /https:\/\/(?:www\.)?bordo.com.pl/);
});

test('street-food draft distinguishes operator event dates, indoor dining and market counters', async () => {
  const [, r] = await loadFoodGuideEditorial(); assert.match(r.markup, /15 November 2026 Art &amp; Food Bazar entry is cancelled/); assert.match(r.markup, /not a permanent grassy food-truck park/); assert.match(r.markup, /not evidence of an outside truck park/); assert.match(r.markup, /not one restaurant or one shared menu/);
  assert.doesNotMatch(r.markup, /gclid=|utm_|viator.com|facebook.com\/bobbyburgerkrakowhttps/); assert.match(r.markup, /store2\/food-tour-krakow-48\/#book/);
});

test('milk-bar history predates communism and Anny5 uncertainty is not a closure assertion', async () => {
  const [, , r] = await loadFoodGuideEditorial(); assert.match(r.markup, /1896/); assert.match(r.markup, /not invented then/); assert.match(r.markup, /not mean today's menus are all meat-free/); assert.match(r.markup, /not confirmed its current opening status/); assert.match(r.markup, /not a claim that the venue has permanently closed/);
  assert.match(r.markup, /https:\/\/www.barykrakow.pl\/bary\/krakus/); assert.match(r.markup, /Limanowskiego 16/);
});

test('unknown, prototype, specialist-held and active-competition routes are untouched before DOM access', () => {
  for (const key of ['unknown', 'constructor', '__proto__', 'toString', 'post-hostel-hangover-cure', 'post-welcome-to-alcohol']) {assert.deepEqual(reviseFoodGuideEditorial({key}), []); assert.deepEqual(reviseFoodFeaturedDescriptions({key}), []);}
});

test('unreviewed food-guide and featured identities reject before DOM access', async () => {
  for (const r of await loadFoodGuideEditorial()) for (const revision of [null, {...r, key: 'unknown'}, {...r, version: 'other'}, {...r, sourceSha256: '0'.repeat(64)}, {...r, reviewedOn: '2027-01-01'}]) {assert.throws(() => reviseFoodGuideEditorial({key: r.key, revision}), /identity/); if (r.key !== 'post-best-places-to-eat') assert.throws(() => reviseFoodFeaturedDescriptions({key: r.key, revision}), /identity/);}
});

test('the previous33 article identities and128 summaries remain frozen', async () => {
  const raw = JSON.parse(await readFile(new URL('../reviewed-article-presentation.json', import.meta.url), 'utf8')), later = ['post-sports-bar-krakow','post-krakow-wine-bars','post-karaoke-bars-in-krakow','post-bachelor-party-organisers-krakow','post-krakow-stag-activities','post-krakow-team-building-activities','post-escape-rooms-for-a-stag-do-in-krakow','post-krakow-shooting-range','post-welcome-to-alcohol','post-krawl-through-krakow-winter-newsletter','post-life-professional-drunk','post-hen-do-ideas-abroad','post-best-pub-crawls-in-europe','post-budapest-or-krakow-nightlife','post-krakow-hen-party-reviews','post-the-ultimate-guide-to-the-best-bars-and-clubs-in-krakow'], d = {...raw, articles: raw.articles.filter(a => !later.includes(a.key)), containers: raw.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !later.includes(k))}))}, keys = ['post-best-places-to-eat', 'post-krakow-food-truck-parks', 'post-krakow-milkbars'];
  const inverse = {...d, articles: d.articles.filter(a => !keys.includes(a.key)), containers: d.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !keys.includes(k))}))};
  assert.equal(inverse.articles.length, 33); assert.equal(inverse.containers.reduce((n, c) => n + c.cardKeys.length, 0), 128); assert.equal(createHash('sha256').update(JSON.stringify(inverse)).digest('hex'), 'f67fdd5d887635bcf5f73f086d77f7a1638ff0c7d41825b40c978e42cf0876d8');
  assert.equal(d.articles.length, 36); assert.equal(d.containers.reduce((n, c) => n + c.cardKeys.length, 0), 140); assert.equal(d.containers.filter(c => c.cardKeys.some(k => keys.includes(k))).length, 10);
});

test('food-guide styles are bounded, additive, fixed-size and idempotent', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-food-css-'));
  try {const file = path.join(dir, 'runtime.css'), old = 'unchanged\n/* BEGIN Weather and winter guides */\nrest\n'; await writeFile(file, old); await buildFoodGuideStyles(file); const css = await readFile(file, 'utf8'); assert.equal(css.replace(/\/\* BEGIN Practical food guides \*\/[\s\S]*?\/\* END Practical food guides \*\/\n\n/, ''), old); assert.match(css, /font-size: 16px; line-height: 1\.65/); assert.match(css, /outline: 2px solid currentColor/); assert.equal((css.match(/padding-right: 24px/g) || []).length, 2); assert.equal((css.match(/!important/g) || []).length, 1); await buildFoodGuideStyles(file); assert.equal(await readFile(file, 'utf8'), css); for (const changed of [css.replace('16px', '99px'), css + css, old.replace('winter guides', 'unknown guides')]) {await writeFile(file, changed); await assert.rejects(() => buildFoodGuideStyles(file)); assert.equal(await readFile(file, 'utf8'), changed);}}
  finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-food-css-')); await rm(dir, {recursive: true, force: true});}
});
