import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {validateSiteOperatorFacts, loadSiteOperatorFacts, loadOperatorTrustEditorial, buildOperatorTrustStyles} from '../operator-trust-editorial.mjs';

test('owner-confirmed company identity stays distinct from brand history and customer meeting directions', async () => {
  const f = await loadSiteOperatorFacts(); assert.equal(f.legalName, 'KRAKTIVITY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ'); assert.equal(f.registeredOn, '2024-01-26'); assert.equal(f.krs, '0001084157'); assert.equal(f.nip, '6762661275'); assert.equal(f.registeredOffice.street, 'ul. Cegielniana 4A/27'); assert.equal(f.evidence.httpStatus, 200);
  const rows = await loadOperatorTrustEditorial(); assert.equal(rows.length, 6); const about = rows.find(r => r.key === 'about-us'); assert.match(about.copyMarkup, /since 2008/); assert.match(about.copyMarkup, /9 PM/); assert.match(about.copyMarkup, /Adam Mickiewicz Monument/); assert.match(about.operatorMarkup, /Registered office/); assert.match(about.operatorMarkup, /__KTK_HOME_URL__meeting-point\//); assert.doesNotMatch(about.operatorMarkup, /registered in 2008|founded in 2008|@|REGON/);
});
test('unknown, personal, stale and ambiguous operator fields fail closed', async () => {
  const source = await loadSiteOperatorFacts();
  for (const mutate of [d => d.email = 'person@example.invalid', d => d.officers = [], d => d.registeredOffice.email = 'person@example.invalid', d => d.evidence.token = 'not-allowed', d => d.krs = '1084157', d => d.nip = '6762661276', d => d.registeredOn = '2008-01-01', d => d.registeredOffice.street = 'Adam Mickiewicz Monument', d => d.publicRegisterUrl = 'https://example.invalid/', d => d.evidence.httpStatus = 403, d => d.evidence.responseSha256 = '0'.repeat(64), d => d.evidence.ownerConfirmation = 'unconfirmed', d => d.regonFromKrs = '527580535', d => d.reviewedOn = '2027-01-01']) {const d = structuredClone(source); mutate(d); assert.throws(() => validateSiteOperatorFacts(d));}
});
test('six original sources and limited copy use existing review sources and confirmed participation facts', async () => {
  const rows = await loadOperatorTrustEditorial();
  for (const row of rows) {assert.equal(row.version, '2026-11-15.operator-trust-1'); assert.match(row.sourceSha256, /^[a-f0-9]{64}$/); assert.ok(row.sourceHtml.includes('main-content')); assert.doesNotMatch(row.operatorMarkup + (row.copyMarkup || '') + (row.reviewMarkup || ''), /[{}]|<(?:img|iframe|script|style|form|input|textarea|select)\b/);}
  const about = rows.find(r => r.key === 'about-us'), disclaimer = rows.find(r => r.key === 'tour-service-disclaimer'), reviews = rows.find(r => r.key === 'testimonials');
  assert.equal((about.copyMarkup.match(/<template /g) || []).length, 4); assert.doesNotMatch(about.copyMarkup, /14 years|highest rated|biggest|kept safe/i); assert.match(disclaimer.copyMarkup, /18 years old/); assert.match(disclaimer.copyMarkup, /identification is recommended/); assert.match(disclaimer.copyMarkup, /store2\/pub-crawl-28\/#book/); assert.doesNotMatch(disclaimer.copyMarkup, /85|90zl|guarantee|pro drunk/); assert.deepEqual(reviews.platforms.map(p => p.name), ['Google', 'Tripadvisor', 'GetYourGuide']); assert.equal((reviews.reviewMarkup.match(/<li>/g) || []).length, 3); assert.doesNotMatch(reviews.reviewMarkup, /\d+\s*(?:stars|reviews)|wptripadvisor|shapo\.io/i);
});
test('operator styles preserve every old byte, remain idempotent and reject malformed blocks atomically', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ktk-operator-trust-'));
  try {
    const file = path.join(dir, 'runtime.css'), source = await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css', import.meta.url), 'utf8'), regex = /\/\* BEGIN Operator identity and trust \*\/[\s\S]*?\/\* END Operator identity and trust \*\/\n/g, base = source.replace(regex, '');
    await writeFile(file, base); await buildOperatorTrustStyles(file); const once = await readFile(file, 'utf8'); assert.equal(once.replace(regex, ''), base); await buildOperatorTrustStyles(file); assert.equal(await readFile(file, 'utf8'), once);
    for (const bad of [once.replace('/* END Operator identity and trust */', ''), once + '/* BEGIN Operator identity and trust */', once.replace(regex, block => block.replace('font-size: 16px', 'font-size: 17px')), base.replace('/* END Group enquiry overview */', 'missing')]) {await writeFile(file, bad); await assert.rejects(() => buildOperatorTrustStyles(file)); assert.equal(await readFile(file, 'utf8'), bad);}
  } finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep + 'ktk-operator-trust-')); await rm(dir, {recursive: true, force: true});}
});
