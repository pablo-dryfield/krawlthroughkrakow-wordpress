import test from 'node:test';
import assert from 'node:assert/strict';
import {loadOwnedVodkaLinks, reviseOwnedVodkaLinks} from '../owned-vodka-links.mjs';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

test('four vodka-link captures have exact immutable identities', async () => {
  const rows = await loadOwnedVodkaLinks();
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map(r => r.key)).size, 4);
  for (const r of rows) assert.equal(createHash('sha256').update(r.sourceHtml).digest('hex'), r.sourceSha256);
});

test('unrelated, prototype, medical and active competition routes remain untouched without DOM access', () => {
  for (const key of ['other', 'constructor', 'toString', '__proto__', 'post-hostel-hangover-cure', 'post-welcome-to-alcohol']) assert.deepEqual(reviseOwnedVodkaLinks({key}), []);
});

test('wrong source identity fails before DOM access', async () => {
  for (const r of await loadOwnedVodkaLinks()) for (const revision of [null, {...r, key: 'other'}, {...r, sourceSha256: '0'.repeat(64)}]) assert.throws(() => reviseOwnedVodkaLinks({key: r.key, revision}), /identity/);
});

test('canonical source and independent reference both apply the same link-only recipe', async () => {
  for (const file of ['build-code-pages-all.mjs', 'verify-code-pages-build.mjs']) {
    const source = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    assert.match(source, /await loadOwnedVodkaLinks\(\)/);
    assert.match(source, /page\.evaluate\(reviseOwnedVodkaLinks,/);
  }
});
