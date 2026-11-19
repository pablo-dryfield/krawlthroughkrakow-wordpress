import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Full-size encoding of the existing photograph; the original remains the fallback.
export const nyeBackgroundImage = Object.freeze({
  original: 'media/c3ba6f2526c9-edited-header.jpg',
  originalSHA256: '31e758d55951fbb0cfb0921af2730249b904e2eb9c46228a860acfeab67c7c82',
  file: 'media/ada148a3afee-nye-fireworks-full.webp',
  sha256: 'ada148a3afeeab406120b9d4c8797140151a3077fb067860cb8405c5e6fca60b',
  bytes: 366772,
  width: 1916,
  height: 1027,
});
const property = '--wpr-bg-35ed9c78-3178-4004-afb5-5d0e2dec9dbc';
const selector = 'div.et_pb_section.et_pb_section_0';
export const nyeBackgroundOriginalRule = `${selector} { ${property}: url('../${nyeBackgroundImage.original}'); }`;
export const nyeBackgroundModernRule = `\n@supports (background-image: image-set(url('../${nyeBackgroundImage.file}') type('image/webp'))) {\n  ${selector} { ${property}: image-set(url('../${nyeBackgroundImage.file}') type('image/webp'), url('../${nyeBackgroundImage.original}') type('image/jpeg')); }\n}`;

export async function verifyNyeBackgroundImage() {
  const base = new URL('../staging/wp-content/mu-plugins/ktk-code-pages-assets/', import.meta.url);
  const original = await readFile(new URL(nyeBackgroundImage.original, base));
  const encoded = await readFile(new URL(nyeBackgroundImage.file, base));
  const sha = raw => createHash('sha256').update(raw).digest('hex');
  if (sha(original) !== nyeBackgroundImage.originalSHA256 || sha(encoded) !== nyeBackgroundImage.sha256 || encoded.length !== nyeBackgroundImage.bytes) throw Error('Reviewed NYE background source or encoding changed');
  if (encoded.toString('ascii', 0, 4) !== 'RIFF' || encoded.toString('ascii', 8, 16) !== 'WEBPVP8X' || encoded.readUIntLE(24, 3) + 1 !== nyeBackgroundImage.width || encoded.readUIntLE(27, 3) + 1 !== nyeBackgroundImage.height) throw Error('Preserve full NYE photograph dimensions');
}

export function optimizeNyeBackgroundCss(key, css) {
  if (key !== 'new-years-eve') return css;
  if (css.split(nyeBackgroundOriginalRule).length !== 2 || css.includes(nyeBackgroundModernRule) || !css.includes(`background-image: var(${property}) !important;`)) throw Error('Review changed NYE background declaration before optimization');
  return css.replace(nyeBackgroundOriginalRule, nyeBackgroundOriginalRule + nyeBackgroundModernRule);
}
