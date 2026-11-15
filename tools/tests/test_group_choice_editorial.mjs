import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadGroupChoiceEditorial, reviseGroupChoiceEditorial, reviseGroupChoiceFeatures, buildGroupChoiceStyles} from '../group-choice-editorial.mjs';

test('three group drafts bind original captures,45 topics and20 ordered photo slots', async () => {
  const rows = await loadGroupChoiceEditorial(); assert.equal(rows.length, 3);
  for (const [i, r] of rows.entries()) {
    assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'), r.sourceSha256); assert.equal(r.version, '2026-11-15.group-choices-1');
    assert.equal((r.markup.match(/<h[234] /g) || []).length, [18, 15, 12][i]); assert.equal((r.markup.match(/data-ktk-group-photo=/g) || []).length, [10, 5, 5][i]);
    assert.equal((r.markup.match(/data-ktk-group-contents/g) || []).length, 1); assert.equal((r.markup.match(/data-ktk-group-context/g) || []).length, i ? 0 : 1);
    assert.doesNotMatch(r.markup, /[{}]|<(?:img|script|style|iframe|form)\b/);
  }
});

test('organiser guidance distinguishes real quotes from blanket inclusion claims', async () => {
  const [r] = await loadGroupChoiceEditorial();
  assert.match(r.markup, /confirmed individually in each quote/); assert.match(r.markup, /Do not assume accommodation, transport or a free place/);
  assert.match(r.markup, /store2\/shooting-range-34\/#book/); assert.match(r.markup, /sobriety requirements/);
  assert.doesNotMatch(r.markup, /shootingcracow|Cracow Shooting Academy/);
  for (const url of ['https://axenation.com.pl/en/faq-en/', 'https://fearfactory.com.pl/pl/', 'store2/pub-crawl-28/#book']) assert.ok(r.markup.includes(url));
  assert.doesNotMatch(r.markup, /Barrett|M4A1|Glock|Beretta|unlimited samples of our|take care of all logistical/);
});

test('stag activity copy uses real KTK destinations without invented package perks', async () => {
  const [, r] = await loadGroupChoiceEditorial(); assert.match(r.markup, /Do not assume a free groom place/); assert.match(r.markup, /confirmed individually in your quote/);
  assert.match(r.markup, /store2\/go-karting-30\/#book/); assert.match(r.markup, /store2\/pub-crawl-28\/#book/);
  assert.match(r.markup, /do not build the day around a fake arrest or kidnapping/); assert.match(r.markup, /gov.uk\/foreign-travel-advice\/poland\/safety-and-security/);
  assert.doesNotMatch(r.markup, /originated in ancient Greece|10 to 20 times|John Wick|join for free|ensure everyone gets back safely/);
});

test('team guide distinguishes separate operators and rejects guaranteed training outcomes', async () => {
  const [, , r] = await loadGroupChoiceEditorial(); assert.match(r.markup, /separate operator example/); assert.match(r.markup, /not a claim that every successful team/);
  assert.match(r.markup, /does not include an obstacle course, scavenger hunt/); assert.match(r.markup, /store2\/polish-vodka-tasting-44\/#book/);
  for (const url of ['https://laserpark.pl/', 'https://exitroom.pl/', 'https://www.thecityhunt.com/teambuilding-locations/teambuilding-krakow/']) assert.ok(r.markup.includes(url));
  assert.doesNotMatch(r.markup, /jsessionid|\/info\/praca|guaranteed to|our obstacle course|our scavenger hunt|Forbes|Fisherman/);
  assert.match(r.markup, /Eight formats to compare/); assert.equal((r.markup.match(/<li><strong>/g) || []).length, 8);
});

test('unrelated, inherited, medically held and active-competition identities return before DOM access', () => {
  for (const key of ['unknown', 'constructor', '__proto__', 'toString', 'post-hostel-hangover-cure', 'post-welcome-to-alcohol']) {
    assert.deepEqual(reviseGroupChoiceEditorial({key}), []); assert.deepEqual(reviseGroupChoiceFeatures({key}), []);
  }
});

test('missing or stale group identities reject before DOM access', async () => {
  for (const r of await loadGroupChoiceEditorial()) for (const revision of [null, {...r, key: 'unknown'}, {...r, version: 'other'}, {...r, sourceSha256: '0'.repeat(64)}, {...r, reviewedOn: '2027-01-01'}]) {
    assert.throws(() => reviseGroupChoiceEditorial({key: r.key, revision}), /identity/); assert.throws(() => reviseGroupChoiceFeatures({key: r.key, revision}), /identity/);
  }
});

test('previous39 identities and150 summaries retain their exact normalized source binding', async () => {
  const full = JSON.parse(await readFile(new URL('../reviewed-article-presentation.json', import.meta.url), 'utf8')), later = ['post-escape-rooms-for-a-stag-do-in-krakow','post-krakow-shooting-range','post-welcome-to-alcohol','post-krawl-through-krakow-winter-newsletter','post-life-professional-drunk','post-hen-do-ideas-abroad','post-best-pub-crawls-in-europe','post-budapest-or-krakow-nightlife'], raw = {...full, articles: full.articles.filter(a => !later.includes(a.key)), containers: full.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !later.includes(k))}))}, keys = ['post-bachelor-party-organisers-krakow', 'post-krakow-stag-activities', 'post-krakow-team-building-activities'];
  const inverse = {...raw, articles: raw.articles.filter(a => !keys.includes(a.key)), containers: raw.containers.map(c => ({...c, cardKeys: c.cardKeys.filter(k => !keys.includes(k))}))};
  assert.equal(inverse.articles.length, 39); assert.equal(inverse.containers.reduce((n, c) => n + c.cardKeys.length, 0), 150);
  assert.equal(createHash('sha256').update(JSON.stringify(inverse)).digest('hex'), 'a0ade523186dbab3efcf5e04560083eb5c483612decaf42ec00c74b1df456eb6');
  assert.equal(raw.articles.length, 42); assert.equal(raw.containers.reduce((n, c) => n + c.cardKeys.length, 0), 160);
  assert.equal(raw.containers.filter(c => c.cardKeys.some(k => keys.includes(k))).length, 7); assert.equal(raw.containers.reduce((n, c) => n + c.cardKeys.filter(k => keys.includes(k)).length, 0), 10);
});

test('group styles are additive, bounded, fixed-size, idempotent and drift guarded', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-group-choice-css-'));
  try {
    const file = path.join(dir, 'runtime.css'), old = 'unchanged\n/* BEGIN Nightlife choice guides */\nrest\n'; await writeFile(file, old); await buildGroupChoiceStyles(file); const css = await readFile(file, 'utf8');
    assert.equal(css.replace(/\/\* BEGIN Group choice guides \*\/[\s\S]*?\/\* END Group choice guides \*\/\n\n/, ''), old);
    assert.match(css, /font-size: 16px; line-height: 1\.65/); assert.match(css, /outline: 2px solid currentColor/); assert.equal((css.match(/padding-right: 24px/g) || []).length, 1); assert.equal((css.match(/!important/g) || []).length, 1);
    await buildGroupChoiceStyles(file); assert.equal(await readFile(file, 'utf8'), css);
    for (const changed of [css.replace('16px', '99px'), css + css, old.replace('Nightlife choice guides', 'Other guides')]) {await writeFile(file, changed); await assert.rejects(() => buildGroupChoiceStyles(file)); assert.equal(await readFile(file, 'utf8'), changed);}
  } finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-group-choice-css-')); await rm(dir, {recursive: true, force: true});}
});
