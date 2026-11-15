import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadActivityBookingEditorial, reviseActivityBookingEditorial, reviseActivityBookingFeatures, buildActivityBookingStyles} from '../activity-booking-editorial.mjs';

test('two activity drafts bind original source,19 topics and11 photo slots', async () => {
  const rows = await loadActivityBookingEditorial(); assert.equal(rows.length, 2);
  for (const [i, r] of rows.entries()) {
    assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'), r.sourceSha256); assert.equal(r.version, '2026-11-15.activity-booking-1');
    assert.equal((r.markup.match(/<h[23] /g) || []).length, [12, 7][i]); assert.equal((r.markup.match(/data-ktk-activity-photo=/g) || []).length, [6, 5][i]);
    assert.equal((r.markup.match(/data-ktk-activity-contents/g) || []).length, 1); assert.doesNotMatch(r.markup, /[{}]|<(?:img|script|style|iframe|form)\b/);
  }
});

test('escape choices distinguish horror, variable formats and separately booked KTK tickets', async () => {
  const [r] = await loadActivityBookingEditorial();
  for (const text of ['horror attraction', 'different', 'current', 'separate arrangement', 'https://gamescape.pl/', 'https://en.exitroom.pl/', 'store2/pub-crawl-28/#book']) assert.ok(r.markup.includes(text) || text === 'different' && r.markup.includes('differing'));
  assert.doesNotMatch(r.markup, /gclid|utm_|gbraid|wbraid|\$20|\$30|Nazi|guaranteed|top-rated/);
  assert.match(r.markup, /We have not confirmed the old Exit Games Bunker description/);
});

test('shooting guide uses only owned links without identifying fulfilment or inventing inclusions', async () => {
  const [, r] = await loadActivityBookingEditorial();
  assert.equal((r.markup.match(/store2\/shooting-range-34\/#book/g) || []).length, 2);
  assert.match(r.markup, /not a firearms lesson/); assert.match(r.markup, /confirmed individually in each quote/); assert.match(r.markup, /do not infer eligibility for a minor/);
  assert.doesNotMatch(r.markup, /https?:|Shooting Academy|Strzelnica|Strelnica|70 different|two to three|hotel pickup and drop-off services|point a firearm|John Wick/);
});

test('two group follow-ups point directly to product34 without naming a shooting operator', async () => {
  for (const file of ['group-organiser-choices', 'group-stag-choices']) {
    const s = await readFile(new URL('../content/' + file + '.html', import.meta.url), 'utf8');
    assert.equal((s.match(/store2\/shooting-range-34\/#book/g) || []).length, 1); assert.doesNotMatch(s, /shootingcracow|Cracow Shooting Academy/);
  }
});

test('catalog expansion preserves every prior42 identity and160 summary binding', async () => {
  const d = JSON.parse(await readFile(new URL('../reviewed-article-presentation.json', import.meta.url), 'utf8')), keys = ['post-escape-rooms-for-a-stag-do-in-krakow', 'post-krakow-shooting-range'];
  const old = {...d, articles: d.articles.filter(a => !keys.includes(a.key)), containers: d.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !keys.includes(k))}))};
  assert.equal(old.articles.length, 42); assert.equal(old.containers.reduce((n, c) => n + c.cardKeys.length, 0), 160); assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'), 'a77f172b79dc3da799e6ab031888d16aa170e82572e5e7a9142601754424f90e');
  assert.equal(d.articles.length, 44); assert.equal(d.containers.reduce((n, c) => n + c.cardKeys.length, 0), 166); assert.equal(d.containers.filter(c => c.cardKeys.some(k => keys.includes(k))).length, 5);
});

test('unrelated, inherited, held and active-competition keys return before DOM access', () => {
  for (const key of ['unknown', 'constructor', '__proto__', 'toString', 'post-hostel-hangover-cure', 'post-welcome-to-alcohol']) {
    assert.deepEqual(reviseActivityBookingEditorial({key}), []); assert.deepEqual(reviseActivityBookingFeatures({key}), []);
  }
});

test('missing or stale activity identity rejects before DOM access', async () => {
  for (const r of await loadActivityBookingEditorial()) for (const revision of [null, {...r, key: 'unknown'}, {...r, version: 'other'}, {...r, sourceSha256: '0'.repeat(64)}, {...r, reviewedOn: '2027-01-01'}]) {
    assert.throws(() => reviseActivityBookingEditorial({key: r.key, revision}), /identity/); assert.throws(() => reviseActivityBookingFeatures({key: r.key, revision}), /identity/);
  }
});

test('runtime change is exactly one product lookup, preserving consent and attribution code', async () => {
  const file = 'staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.js', old = execFileSync('git', ['show', '401ce91133069af0193114384965b759d5b7b0c7:' + file], {encoding: 'utf8'}), current = await readFile(file, 'utf8');
  assert.equal(current.split("'shooting-range-34': 34").length, 2); assert.equal(current.replace(", 'shooting-range-34': 34", ''), old);
});

test('activity CSS is bounded, additive, idempotent and rejects drift', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-activity-booking-css-'));
  try {
    const f = path.join(dir, 'runtime.css'), old = 'unchanged\n/* BEGIN Group choice guides */\nrest\n'; await writeFile(f, old); await buildActivityBookingStyles(f); const css = await readFile(f, 'utf8');
    assert.equal(css.replace(/\/\* BEGIN Activity booking guides \*\/[\s\S]*?\/\* END Activity booking guides \*\/\n\n/, ''), old); assert.match(css, /font-size: 16px; line-height: 1\.65/); assert.match(css, /outline: 2px solid currentColor/); assert.equal((css.match(/padding-right: 24px/g) || []).length, 1);
    await buildActivityBookingStyles(f); assert.equal(await readFile(f, 'utf8'), css);
    for (const corrupt of [css.replace('16px', '99px'), css + css, old.replace('Group choice guides', 'Other')]) {await writeFile(f, corrupt); await assert.rejects(() => buildActivityBookingStyles(f)); assert.equal(await readFile(f, 'utf8'), corrupt);}
  } finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-activity-booking-css-')); await rm(dir, {recursive: true, force: true});}
});
