import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const socialFontFiles = {
  'parity/114236a5fb48-fa-brands-400.woff2': '71b3ce72680f4183d28db86b184542051fd533bb1146933233e4f6a20cf98cba',
  'social-icons-homepage.woff2': '3044507fd7367ca59d4a95308e0cadd3d151032a335d2774f7871beeb2dda65a',
};
export const socialFontCodepoints = [0xe07b, 0xf262];
const start = '/* BEGIN homepage social glyph delivery */';
const end = '/* END homepage social glyph delivery */';
const anchor = '/* BEGIN homepage full icon font delivery */';

export function homepageSocialFontStyles(source, files) {
  for (const [name, hash] of Object.entries(socialFontFiles)) {
    if (!files[name] || createHash('sha256').update(files[name]).digest('hex') !== hash) {
      throw new Error('Review changed homepage social font: ' + name);
    }
  }
  const block = `${start}\n@font-face {\n  font-family: "FontAwesome";\n  font-style: normal;\n  font-weight: 400;\n  font-display: block;\n  src: url("social-icons-homepage.woff2") format("woff2"),\n    url("parity/114236a5fb48-fa-brands-400.woff2") format("woff2");\n  unicode-range: U+E07B, U+F262;\n}\n${end}\n\n`;
  const first = source.indexOf(start);
  if (first >= 0) {
    if (source.indexOf(start, first + 1) >= 0 || source.indexOf(end, first + block.length) >= 0
        || source.slice(first, first + block.length) !== block) {
      throw new Error('Homepage social font marker drift');
    }
    source = source.slice(0, first) + source.slice(first + block.length);
  }
  if (source.includes(end)) throw new Error('Unpaired homepage social font marker');
  const index = source.indexOf(anchor);
  if (index < 0 || source.indexOf(anchor, index + 1) >= 0) {
    throw new Error('One homepage full-font anchor is required');
  }
  return source.slice(0, index) + block + source.slice(index);
}

export async function buildHomepageSocialFontStyles(assets) {
  if (path.basename(assets) !== 'ktk-homepage-assets') throw new Error('Homepage-only social font scope required');
  const files = {};
  for (const name of Object.keys(socialFontFiles)) files[name] = await readFile(path.join(assets, name));
  const file = path.join(assets, 'parity-runtime.css');
  const source = await readFile(file, 'utf8');
  await writeFile(file, homepageSocialFontStyles(source, files));
}
