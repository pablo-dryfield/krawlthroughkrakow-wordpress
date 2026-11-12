import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { discoverCommissionAssets } from './discover-commission-ui-assets.mjs';

function fixture(run) {
  const tempRoot = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(tempRoot, 'ktk-commission-ui-'));
  const file = 'static/js/7521.changed-id.chunk.js';
  const source = 'const title="Commission eligibility rules";const data={commissionRules:[]};';
  const write = (name, value) => fs.writeFileSync(path.join(root, name), JSON.stringify(value));
  fs.mkdirSync(path.join(root, 'static/js'), { recursive: true });
  write('release-metadata.json', { gitSha: 'sha', releaseId: 'release' });
  write('asset-manifest.json', { files: { script: '/' + file, map: '/' + file + '.map' } });
  write(file + '.map', { file, sources: ['pages/AffiliatesPage.tsx', 'components/affiliates/AffiliateCommissionRules.tsx'] });
  fs.writeFileSync(path.join(root, file), source);
  try { run({ root, file, source, write }); }
  finally {
    const resolved = fs.realpathSync(root);
    assert.equal(path.dirname(resolved), tempRoot);
    assert.ok(path.basename(resolved).startsWith('ktk-commission-ui-'));
    fs.rmSync(resolved, { recursive: true });
  }
}

test('discovers changed chunk IDs by actual module sources and hashes exact bytes', () => fixture(({ root, file, source }) => {
  const result = discoverCommissionAssets(root, 'sha', 'release');
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].path, '/' + file);
  assert.equal(result.assets[0].sha256, crypto.createHash('sha256').update(source).digest('hex'));
  assert.equal(result.assets[0].isPage, true);
  assert.equal(result.assets[0].isControl, true);
}));

test('rejects a stale artifact identity', () => fixture(({ root }) => {
  assert.throws(() => discoverCommissionAssets(root, 'wrong', 'release'), /identity mismatch/);
}));

test('rejects missing control source rather than loosening the check', () => fixture(({ root, file, write }) => {
  write(file + '.map', { file, sources: ['pages/AffiliatesPage.tsx'] });
  assert.throws(() => discoverCommissionAssets(root, 'sha', 'release'), /sources are absent/);
}));

test('rejects mapped path traversal before reading outside the build', () => fixture(({ root, file, write }) => {
  write(file + '.map', { file: '../outside.js', sources: ['pages/AffiliatesPage.tsx', 'components/affiliates/AffiliateCommissionRules.tsx'] });
  assert.throws(() => discoverCommissionAssets(root, 'sha', 'release'), /not registered/);
}));
