import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadWeatherClimateFacts, loadWeatherWinterEditorial, reviseWeatherWinterEditorial, reviseWeatherFeaturedDescription, buildWeatherWinterStyles} from '../weather-winter-editorial.mjs';

test('climate source is a pinned monthly mean normal, never a day maximum or forecast', async () => {
  const d = await loadWeatherClimateFacts();
  assert.equal(d.parameter, 'TSR_AVE'); assert.equal(d.station.code, '12566'); assert.equal(d.period, '1991-2020');
  assert.deepEqual(Object.values(d.monthlyMeans), ['-1.6', '-0.2', '3.5', '9.3', '14.0', '17.6', '19.3', '18.9', '13.9', '8.8', '3.8', '-0.5']);
  assert.match(d.meaning, /not a daytime maximum or a travel-date forecast/);
});

test('wrong period, station, parameter, units, forecast semantics or monthly values fail closed', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-weather-facts-'));
  try {
    const original = await loadWeatherClimateFacts(), changes = [d => d.period = '2026', d => d.station.code = '12375', d => d.parameter = 'TMAX_AVE', d => d.unit = 'Fahrenheit', d => d.meaning = 'Travel forecast', d => d.monthlyMeans.may = '22.0', d => delete d.monthlyMeans.december, d => d.extra = true];
    for (const change of changes) {const d = structuredClone(original); change(d); const file = path.join(dir, 'fixture.json'); await writeFile(file, JSON.stringify(d)); await assert.rejects(() => loadWeatherClimateFacts({file}), /Exact source-checked/);}
  } finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-weather-facts-')); await rm(dir, {recursive: true, force: true});}
});

test('two templates bind original captures,25 ordered modules and10 original-photo slots', async () => {
  const rows = await loadWeatherWinterEditorial(); assert.equal(rows.length, 2);
  for (const [i, row] of rows.entries()) {
    assert.equal(createHash('sha256').update(row.sourceHtml).digest('hex'), row.sourceSha256); assert.equal(row.version, '2026-11-14.weather-winter-1');
    assert.equal((row.markup.match(/data-ktk-weather-module=/g) || []).length, i ? 0 : 25);
    assert.equal((row.markup.match(/data-ktk-winter-photo=/g) || []).length, i ? 10 : 0);
    assert.equal((row.markup.match(/data-ktk-weather-contents/g) || []).length, 1);
    assert.doesNotMatch(row.markup, /[{}]|<(?:img|script|style|iframe|form)\b/);
  }
});

test('weather copy separates12 source-labelled means from forecasts and retains our vodka product', async () => {
  const [r] = await loadWeatherWinterEditorial(); assert.equal((r.markup.match(/1991-2020 monthly mean:/g) || []).length, 12);
  assert.match(r.markup, /not daytime highs, overnight lows or a forecast/); assert.match(r.markup, /https:\/\/meteo.imgw.pl\//);
  assert.match(r.markup, /__KTK_HOME_URL__store2\/polish-vodka-tasting-44\/#book/); assert.match(r.markup, />vodka tasting group</);
  assert.match(r.markup, /ages 18 and over/); assert.doesNotMatch(r.markup, /9 million|down their 8th|at 9:30pm|pro drunk guide|https:\/\/tastevodka.pl/i);
});

test('winter copy dates the market, qualifies closed skating and preserves distinct NYE information', async () => {
  const [, r] = await loadWeatherWinterEditorial(); assert.match(r.markup, /27 November 2026 to 6 January 2027/); assert.match(r.markup, /rink is closed/);
  assert.match(r.markup, /expects to return in December 2026/); assert.match(r.markup, /last season's footer hours/);
  assert.match(r.markup, /__KTK_HOME_URL__new-years-eve\//); assert.doesNotMatch(r.markup, /nye-pub-crawl-32|food-tour-31/);
  assert.match(r.markup, /__KTK_HOME_URL__store2\/food-tour-krakow-48\/#book/); assert.match(r.markup, /not a promise that every item is included/);
  assert.match(r.markup, /https:\/\/tpn.gov.pl\/komunikat-turystyczny/); assert.match(r.markup, /qualified Tatra guide/);
  assert.match(r.markup, /not a picture of an operating ice rink/); assert.match(r.markup, /Snowshoeing is not automatically an easy or risk-free substitute/);
});

test('unknown/prototype/medical/active-competition routes remain untouched before DOM access', () => {
  for (const key of ['unknown', 'constructor', '__proto__', 'toString', 'post-hostel-hangover-cure', 'post-welcome-to-alcohol']) {assert.deepEqual(reviseWeatherWinterEditorial({key}), []); assert.deepEqual(reviseWeatherFeaturedDescription({key}), []);}
});

test('unreviewed weather/winter identities are rejected before DOM access', async () => {
  for (const r of await loadWeatherWinterEditorial()) for (const revision of [null, {...r, key: 'unknown'}, {...r, version: 'other'}, {...r, sourceSha256: '0'.repeat(64)}, {...r, reviewedOn: '2027-01-01'}]) {
    assert.throws(() => reviseWeatherWinterEditorial({key: r.key, revision}), /identity/);
    if (r.key === 'post-krakow-weather-guide' && revision?.reviewedOn !== '2027-01-01') assert.throws(() => reviseWeatherFeaturedDescription({key: r.key, revision}), /identity/);
  }
});

test('all previous31 identities and120 summaries remain frozen while eight new cards are explicit', async () => {
  const raw = JSON.parse(await readFile(new URL('../reviewed-article-presentation.json', import.meta.url), 'utf8')), later = ['post-best-places-to-eat', 'post-krakow-food-truck-parks', 'post-krakow-milkbars','post-sports-bar-krakow','post-krakow-wine-bars','post-karaoke-bars-in-krakow','post-bachelor-party-organisers-krakow','post-krakow-stag-activities','post-krakow-team-building-activities','post-escape-rooms-for-a-stag-do-in-krakow','post-krakow-shooting-range','post-welcome-to-alcohol','post-krawl-through-krakow-winter-newsletter'];
  const d = {...raw, articles: raw.articles.filter(a => !later.includes(a.key)), containers: raw.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !later.includes(k))}))}, keys = ['post-krakow-weather-guide', 'post-krakow-winter-activities'];
  const inverse = {...d, articles: d.articles.filter(a => !keys.includes(a.key)), containers: d.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !keys.includes(k))}))};
  assert.equal(inverse.articles.length, 31); assert.equal(inverse.containers.reduce((n, c) => n + c.cardKeys.length, 0), 120);
  assert.equal(createHash('sha256').update(JSON.stringify(inverse)).digest('hex'), '210cb87d87ee93166dc8199566632568f38819282ef28f41c0b0f858251cd3f2');
  assert.equal(d.articles.length, 33); assert.equal(d.containers.reduce((n, c) => n + c.cardKeys.length, 0), 128);
  assert.equal(d.containers.filter(c => c.cardKeys.some(k => keys.includes(k))).length, 7);
});

test('weather/winter CSS is scoped, additive, fixed-size and idempotent', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-weather-css-'));
  try {
    const file = path.join(dir, 'runtime.css'), old = 'unchanged\n/* BEGIN Practical karting guides */\nrest\n'; await writeFile(file, old); await buildWeatherWinterStyles(file);
    const css = await readFile(file, 'utf8'); assert.equal(css.replace(/\/\* BEGIN Weather and winter guides \*\/[\s\S]*?\/\* END Weather and winter guides \*\/\n\n/, ''), old);
    assert.match(css, /font-size: 16px; line-height: 1\.65/); assert.match(css, /outline: 2px solid currentColor/); assert.equal((css.match(/padding-right: 24px/g) || []).length, 2);
    assert.equal((css.match(/!important/g) || []).length, 1); await buildWeatherWinterStyles(file); assert.equal(await readFile(file, 'utf8'), css);
    for (const changed of [css.replace('16px', '99px'), css + css, old.replace('karting guides', 'unknown guides')]) {await writeFile(file, changed); await assert.rejects(() => buildWeatherWinterStyles(file)); assert.equal(await readFile(file, 'utf8'), changed);}
  } finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-weather-css-')); await rm(dir, {recursive: true, force: true});}
});
