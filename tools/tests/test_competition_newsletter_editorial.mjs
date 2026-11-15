import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadCompetitionNewsletterEditorial, reviseCompetitionNewsletterEditorial, buildCompetitionNewsletterStyles} from '../competition-newsletter-editorial.mjs';

test('two story drafts bind exact captures and15 text-only slots', async () => {
  const rows = await loadCompetitionNewsletterEditorial(); assert.equal(rows.length, 2);
  for (const [i, r] of rows.entries()) {
    assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'), r.sourceSha256);
    assert.equal(r.version, '2026-11-15.competition-newsletter-1');
    assert.equal((r.markup.match(/<template data-ktk-story-module=/g) || []).length, [3, 12][i]);
    assert.equal((r.markup.match(/<h2 /g) || []).length, [3, 5][i]);
    assert.doesNotMatch(r.markup, /[{}]|<(?:img|video|script|style|iframe|form|input)\b/);
  }
});

test('competition remains active with confirmed prizes and no invented timetable', async () => {
  const [r] = await loadCompetitionNewsletterEditorial();
  for (const phrase of ['competition is active', 'no entry deadline', 'EUR50 flight voucher', 'Three nights in a hostel', 'winner and a guest', 'KTK T-shirts', 'Our favourite story wins', 'published anonymously', 'entry form above is open']) assert.ok(r.markup.includes(phrase), phrase);
  assert.doesNotMatch(r.markup, /competition (?:ended|has ended)|archived competition|no rules|guaranteed|utm_|gclid|expires|draw date/i);
  const seo = JSON.parse(await readFile(new URL('../code-pages-seo.json', import.meta.url), 'utf8'));
  const row = JSON.stringify(seo).match(/Active night-out story competition/); assert.ok(row);
});

test('newsletter keeps historical context and clean owned information links', async () => {
  const [, r] = await loadCompetitionNewsletterEditorial();
  for (const phrase of ['earlier winter update', 'not a current offer', 'competition has ended', '__KTK_HOME_URL__new-years-eve/', '__KTK_HOME_URL__student-trips-poland/', 'individually in each quote', '__KTK_HOME_URL__pub-crawl-jobs/']) assert.ok(r.markup.includes(phrase), phrase);
  assert.doesNotMatch(r.markup, /https?:|goo\.gl|utm_|gclid|69\s*(?:EUR|euro)|champagne|vacancies in/i);
  assert.equal((r.markup.match(/#book/g) || []).length, 1);
  assert.match(r.markup, /halloween-pub-crawl-51\//);
  assert.doesNotMatch(r.markup, /halloween-pub-crawl-51\/#book/);
});

test('catalog adds exactly2 identities and6 bindings while prior44/166 stay exact', async () => {
  const d = JSON.parse(await readFile(new URL('../reviewed-article-presentation.json', import.meta.url), 'utf8')), keys = ['post-welcome-to-alcohol', 'post-krawl-through-krakow-winter-newsletter'];
  const old = {...d, articles: d.articles.filter(a => !keys.includes(a.key)), containers: d.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !keys.includes(k))}))};
  assert.equal(old.articles.length, 44); assert.equal(old.containers.reduce((n, c) => n + c.cardKeys.length, 0), 166);
  assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'), 'f15db515e828abb689b47f22b7bcefaacbcc7744527609cc688d32094c8abfd0');
  assert.equal(d.articles.length, 46); assert.equal(d.containers.reduce((n, c) => n + c.cardKeys.length, 0), 172);
  assert.equal(d.containers.filter(c => c.cardKeys.some(k => keys.includes(k))).length, 4);
});

test('unrelated, prototype and held identities return before touching DOM', () => {
  for (const key of ['unknown', 'constructor', '__proto__', 'toString', 'post-hostel-hangover-cure', 'post-krakow-shooting-range']) assert.deepEqual(reviseCompetitionNewsletterEditorial({key}), []);
});

test('missing or stale story identities reject before touching DOM', async () => {
  for (const r of await loadCompetitionNewsletterEditorial()) for (const revision of [null, {...r, key: 'unknown'}, {...r, version: 'other'}, {...r, sourceSha256: '0'.repeat(64)}, {...r, reviewedOn: '2027-01-01'}]) assert.throws(() => reviseCompetitionNewsletterEditorial({key: r.key, revision}), /identity/);
});

test('archive navigation recognizes only the exact newsletter primary-heading variant', async () => {
  const s = await readFile(new URL('../test-reviewed-article-presentation.mjs', import.meta.url), 'utf8');
  assert.ok(s.includes("a.key==='post-krawl-through-krakow-winter-newsletter'?'#main-content h1.et_pb_slide_title[data-ktk-heading-origin=\"h2\"]':'#main-content h1.entry-title'"));
  for (const guard of ['state.key===a.key', 'state.h1===1', 'state.count===1', 'state.visible', 'state.contentLength>100', "state.text.trim()==='KTK Winter Newsletter'"]) assert.ok(s.includes(guard));
});

test('story CSS is additive, bounded, idempotent and drift guarded', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-story-css-'));
  try {
    const f = path.join(dir, 'runtime.css'), old = 'unchanged\n/* BEGIN Activity booking guides */\nrest\n'; await writeFile(f, old); await buildCompetitionNewsletterStyles(f); const css = await readFile(f, 'utf8');
    assert.equal(css.replace(/\/\* BEGIN Competition newsletter guidance \*\/[\s\S]*?\/\* END Competition newsletter guidance \*\/\n\n/, ''), old);
    assert.match(css, /font-size: 16px; line-height: 1\.65/); assert.match(css, /outline: 2px solid currentColor/);
    assert.equal((css.match(/padding-right: 24px/g) || []).length, 1); assert.ok(css.includes(' .et_pb_text_inner'));
    await buildCompetitionNewsletterStyles(f); assert.equal(await readFile(f, 'utf8'), css);
    for (const corrupt of [css.replace('16px', '99px'), css + css, old.replace('Activity booking guides', 'Other')]) {await writeFile(f, corrupt); await assert.rejects(() => buildCompetitionNewsletterStyles(f)); assert.equal(await readFile(f, 'utf8'), corrupt);}
  } finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-story-css-')); await rm(dir, {recursive: true, force: true});}
});
