import { createRequire } from 'node:module';
import { readFile, writeFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const dependencies = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const resolve = name => { try { return require.resolve(name); } catch { return require.resolve(path.join(dependencies, name)); } };
const sharp = require(resolve('sharp'));
const { default: pixelmatch } = await import(pathToFileURL(resolve('pixelmatch')));
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const url = option('--url', 'http://127.0.0.1:5184/');
const label = option('--label', 'parity-candidate');
const referenceLabel = option('--reference', 'production-ready');
if (![label, referenceLabel].every(value => /^[a-z0-9-]+$/.test(value))) throw new Error('Labels must be lowercase names.');
const out = path.resolve(option('--output', 'docs/homepage-parity'));
const geometryTolerance = Number(option('--tolerance', '1'));
const pixelTolerance = Number(option('--pixel-ratio', '0.005'));
const widths = option('--widths', '1920,1440,768,390');

if (!process.argv.includes('--compare-only')) {
  const capture = spawnSync(process.execPath, [
    'tools/capture-homepage-parity.mjs', '--url', url, '--label', label,
    '--widths', widths, '--consent-timeout', '6000',
    '--output', out,
    ...(process.argv.includes('--settle-consent') ? ['--settle-consent'] : []),
    ...(process.argv.includes('--controlled-gallery') ? ['--controlled-gallery'] : []),
    ...(process.argv.includes('--tiles') ? ['--viewport-tiles', '--skip-section-images'] : []),
    ...(process.argv.includes('--last-tile-only') ? ['--last-tile-only'] : []),
    ...(process.argv.includes('--layout-only') ? ['--layout-only'] : []),
  ], { stdio: 'inherit' });
  if (capture.status !== 0) throw new Error(`Capture failed (${capture.status}).`);
}
const reference = JSON.parse(await readFile(path.join(out, `${referenceLabel}-baseline.json`), 'utf8'));
const candidate = JSON.parse(await readFile(path.join(out, `${label}-baseline.json`), 'utf8'));
const report = {
  reference: reference.url, candidate: candidate.url, capturedAt: new Date().toISOString(),
  tolerances: { geometryPixels: geometryTolerance, changedPixelRatio: pixelTolerance, pixelmatchThreshold: 0.1 },
  masks: 'Only third-party iframe rectangles and the Iubenda floating consent control are masked in pixels. Their document boxes still participate in geometry checks. No page content, navigation, text, photos, animation slides or section spacing is masked.',
  geometry: [], typography: [], content: [], screenshots: [], errors: [],
};

const normalized = text => (text || '').replace(/\s+/g, ' ').trim();
function compareGroup(width, group, expected, actual, { text = true } = {}) {
  if (expected.length !== actual.length) report.content.push({ width, group, expectedCount: expected.length, actualCount: actual.length });
  for (let i = 0; i < Math.min(expected.length, actual.length); i++) {
    const left = expected[i];
    const right = actual[i];
    const identity = `${group}[${i}] ${left.id || left.class || left.tag || ''}`;
    if (text && normalized(left.text) !== normalized(right.text)) report.content.push({ width, identity, expected: left.text, actual: right.text });
    for (const key of ['x', 'y', 'width', 'height']) {
      if (!left.box || !right.box) continue;
      const delta = right.box[key] - left.box[key];
      if (Math.abs(delta) > geometryTolerance) report.geometry.push({ width, identity, property: key, expected: left.box[key], actual: right.box[key], delta });
    }
    if (left.style && right.style) {
      for (const key of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign', 'color', 'backgroundColor']) {
        if (left.style[key] !== right.style[key]) report.typography.push({ width, identity, property: key, expected: left.style[key], actual: right.style[key] });
      }
    }
  }
}

function masksFor(document, sectionIndex) {
  const originY = sectionIndex === undefined ? 0 : document.sections[sectionIndex].box.y;
  return [
    ...document.frames.filter(frame => frame.visible && frame.src && /^https?:/i.test(frame.src)),
    ...document.floating.filter(element => (element.class || '').includes('iubenda')),
  ].map(element => ({ ...element.box, y: element.box.y - originY }));
}

async function imageDiff(fileSuffix, expectedDocument, actualDocument, sectionIndex, maskOverride) {
  const before = path.join(out, `${referenceLabel}-${fileSuffix}.png`);
  const after = path.join(out, `${label}-${fileSuffix}.png`);
  try { await access(before); await access(after); } catch { return; }
  const a = await sharp(before).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(after).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = Math.max(a.info.width, b.info.width);
  const height = Math.max(a.info.height, b.info.height);
  const padded = (source, info) => {
    const result = Buffer.alloc(width * height * 4, 255);
    for (let y = 0; y < info.height; y++) source.copy(result, y * width * 4, y * info.width * 4, (y + 1) * info.width * 4);
    return result;
  };
  const left = padded(a.data, a.info);
  const right = padded(b.data, b.info);
  const masks = maskOverride || [...masksFor(expectedDocument, sectionIndex), ...masksFor(actualDocument, sectionIndex)];
  let maskedPixels = 0;
  const marked = new Uint8Array(width * height);
  for (const rectangle of masks) {
    const x1 = Math.max(0, Math.floor(rectangle.x));
    const y1 = Math.max(0, Math.floor(rectangle.y));
    const x2 = Math.min(width, Math.ceil(rectangle.x + rectangle.width));
    const y2 = Math.min(height, Math.ceil(rectangle.y + rectangle.height));
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const pixel = y * width + x;
        if (!marked[pixel]) maskedPixels++;
        marked[pixel] = 1;
        left.fill(255, pixel * 4, pixel * 4 + 4);
        right.fill(255, pixel * 4, pixel * 4 + 4);
      }
    }
  }
  const diff = Buffer.alloc(width * height * 4);
  const changedPixels = pixelmatch(left, right, diff, width, height, { threshold: 0.1, includeAA: false });
  const changedRatio = changedPixels / Math.max(1, width * height - maskedPixels);
  const diffName = `${label}-diff-${fileSuffix}.png`;
  await sharp(diff, { raw: { width, height, channels: 4 } }).png().toFile(path.join(out, diffName));
  report.screenshots.push({ file: fileSuffix, expected: [a.info.width, a.info.height], actual: [b.info.width, b.info.height], changedPixels, maskedPixels, changedRatio, withinTolerance: changedRatio <= pixelTolerance, diff: diffName });
}

for (const current of candidate.viewports) {
  const width = current.viewport.width;
  const source = reference.viewports.find(viewport => viewport.viewport.width === width);
  if (!source || !current.document) { report.errors.push(`Missing document snapshot for${width}`); continue; }
  const left = source.document;
  const right = current.document;
  for (const group of ['headers', 'headerLinks', 'headerImages', 'textSamples', 'images', 'footers']) {
    compareGroup(width, group, left[group], right[group], { text: ['headers', 'headerLinks', 'textSamples'].includes(group) });
  }
  compareGroup(width, 'sections', left.sections, right.sections);
  for (let i = 0; i < Math.min(left.sections.length, right.sections.length); i++) {
    compareGroup(width, `section${i}.rows`, left.sections[i].rows, right.sections[i].rows, { text: false });
    compareGroup(width, `section${i}.modules`, left.sections[i].modules, right.sections[i].modules, { text: false });
    const meaningfulLinks = links => links.filter(link => normalized(link.text) && !normalized(link.text).startsWith('<img') && !/^\d+$/.test(normalized(link.text)));
    compareGroup(width, `section${i}.links`, meaningfulLinks(left.sections[i].links), meaningfulLinks(right.sections[i].links));
  }
  compareGroup(width, 'frames', left.frames.filter(frame => frame.visible), right.frames.filter(frame => frame.visible), { text: false });
  if (right.viewport.scrollWidth > current.viewport.width) report.errors.push(`${width}: document overflows horizontally by${right.viewport.scrollWidth - width}px`);
  await imageDiff(`viewport-${width}`, left, right);
  for (const tile of current.tiles || []) {
    const expectedTile = source.tiles?.find(item => item.name === tile.name);
    if (!expectedTile) { report.errors.push(`Missing reference tile${tile.name}`); continue; }
    if (Math.abs(tile.scrollY - expectedTile.scrollY) > 1 || tile.innerHeight !== expectedTile.innerHeight) {
      report.errors.push(`Mismatched capture viewport or scroll position for${tile.name}`);
    }
    await imageDiff(tile.name, left, right, undefined, [...expectedTile.masks, ...tile.masks]);
  }
  if (process.argv.includes('--full')) await imageDiff(`full-${width}`, left, right);
  for (const section of left.sections) await imageDiff(`section-${width}-${String(section.index).padStart(2, '0')}`, left, right, section.index);
}

report.summary = {
  viewports: candidate.viewports.length, contentDifferences: report.content.length,
  geometryDifferences: report.geometry.length, typographyDifferences: report.typography.length,
  screenshotComparisons: report.screenshots.length,
  screenshotsWithinTolerance: report.screenshots.filter(screenshot => screenshot.withinTolerance).length,
  errors: report.errors.length,
};
const jsonPath = path.join(out, `${label}-comparison.json`);
await writeFile(jsonPath, JSON.stringify(report, null, 2));
const lines = [
  `# Homepage Parity Comparison: ${label}`, '',
  `Reference: ${reference.url}`, `Candidate: ${candidate.url}`, '',
  `Geometry tolerance: ${geometryTolerance}px. Pixel threshold: ${(pixelTolerance * 100).toFixed(2)}% changed pixels.`,
  report.masks, '', '## Summary', '',
  '```json', JSON.stringify(report.summary, null, 2), '```', '',
  '## Screenshot Differences', '', '| Image | Changed pixels | Ratio | Dimensions |', '| --- | ---: | ---: | --- |',
  ...report.screenshots.map(item => `| ${item.file} | ${item.changedPixels} | ${(item.changedRatio * 100).toFixed(3)}% | ${item.expected.join('x')} / ${item.actual.join('x')} |`), '',
  '## First Geometry Differences', '', '```json', JSON.stringify(report.geometry.slice(0, 30), null, 2), '```', '',
  'All content, typography, geometry and pixel details are in the matching comparison JSON. Differences are reported, not automatically corrected.',
];
await writeFile(path.join(out, `${label}-comparison.md`), lines.join('\n'));
console.log(JSON.stringify({ report: jsonPath, ...report.summary }, null, 2));
if (report.errors.length || report.content.length || report.geometry.length || report.typography.length || report.screenshots.some(item => !item.withinTolerance)) process.exitCode = 1;
