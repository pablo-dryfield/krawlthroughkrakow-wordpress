import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { homepageSocialFontStyles, buildHomepageSocialFontStyles, socialFontFiles } from '../homepage-social-font.mjs';
const root = new URL('../../staging/wp-content/mu-plugins/ktk-homepage-assets/', import.meta.url);
const files = {};
for (const name of Object.keys(socialFontFiles)) files[name] = await readFile(new URL(name, root));
const source = '/* intact */\n/* BEGIN homepage full icon font delivery */\nfull font\n/* END homepage full icon font delivery */\n';

test('only two social glyphs prefer the exact derivative; original fallback/display remain', () => {
  const css = homepageSocialFontStyles(source, files);
  assert.match(css, /unicode-range: U\+E07B, U\+F262;/);
  assert.match(css, /font-display: block;/);
  assert.ok(css.indexOf('social-icons-homepage.woff2') < css.indexOf('parity/114236a5fb48-fa-brands-400.woff2'));
  assert.equal(css.replace(/\/\* BEGIN homepage social glyph delivery \*\/[\s\S]*?\/\* END homepage social glyph delivery \*\/\n\n/, ''), source);
  assert.equal(homepageSocialFontStyles(css, files), css);
  assert.equal(files['social-icons-homepage.woff2'].length, 932);
});

test('missing/changed source and derivative reject before stylesheet output', () => {
  for (const name of Object.keys(files)) {
    const missing = { ...files }; delete missing[name];
    assert.throws(() => homepageSocialFontStyles(source, missing), /Review changed/);
    const bad = { ...files, [name]: Buffer.from(files[name]) }; bad[name][0] ^= 1;
    assert.throws(() => homepageSocialFontStyles(source, bad), /Review changed/);
  }
});

test('unknown, duplicate and stale markers/anchors are rejected', () => {
  const css = homepageSocialFontStyles(source, files);
  for (const bad of ['', source + source, css + css, css.replace('U+E07B', 'U+0000'),
    source + '/* END homepage social glyph delivery */', source + '/* BEGIN homepage social glyph delivery */']) {
    assert.throws(() => homepageSocialFontStyles(bad, files));
  }
});

test('content pages cannot receive the homepage-only font declaration', async () => {
  await assert.rejects(() => buildHomepageSocialFontStyles('staging/wp-content/mu-plugins/ktk-code-pages-assets'), /Homepage-only/);
  assert.doesNotMatch(await readFile(new URL('../../staging/wp-content/mu-plugins/ktk-code-pages-assets/runtime.css', import.meta.url), 'utf8'), /social-icons-homepage/);
});
