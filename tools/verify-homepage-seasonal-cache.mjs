import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const url = 'https://krawlthroughkrakow.com/staging/';
const labelIndex = process.argv.indexOf('--label');
const label = labelIndex >= 0 ? process.argv[labelIndex + 1] : 'staging-clean-cache-verification';
if (!/^[a-z0-9-]+$/.test(label || '')) throw new Error('Use a simple report label.');
const files = ['parity.css', 'parity-runtime.css', 'parity.js', 'journey.js', 'hero.css', 'hero-statue-regular.svg', 'hero-statue-seasonal.svg', 'review-google.svg', 'review-tripadvisor.png', 'review-getyourguide.svg'];
const expected = {};
for (const file of files) expected[file] = createHash('sha256').update(await readFile(`staging/wp-content/mu-plugins/ktk-homepage-assets/${file}`)).digest('hex');
const agents = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};
const report = { url, checkedAt: new Date().toISOString(), expected, devices: [], assets: [], passed: true };
const assetUrls = new Map();
for (const [device, userAgent] of Object.entries(agents)) {
  const response = await fetch(url, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(60000) });
  const html = await response.text();
  const assets = Object.fromEntries(files.map(file => {
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = html.match(new RegExp(`(?:href|src)=["']([^"']*/ktk-homepage-assets/${escaped}(?:\\?[^"']*)?)["']`));
    const href = match ? new URL(match[1].replaceAll('&amp;', '&'), url).href : null;
    if (href) assetUrls.set(file, href);
    return [file, { href, matches: href !== null && new URL(href).searchParams.get('v') === expected[file].slice(0, 12) }];
  }));
  const robotsTag = html.match(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i)?.[0] || '';
  const canonicalTag = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i)?.[0] || '';
  const seasonalAnchor = html.match(/<a\b(?=[^>]*\bdata-product-id=["']51["'])[^>]*>/i)?.[0] || '';
  const reviewRow = html.match(/<nav\b(?=[^>]*\bclass=["']ktk-hero-reviews["'])[^>]*>[\s\S]*?<\/nav>/i)?.[0] || '';
  const lowerReviewCounts = [...html.matchAll(/<p\b[^>]*\bclass=["']rev["'][^>]*>([^<]*)<\/p>/g)].map(match => match[1].trim());
  const result = { device, status: response.status, cache: response.headers.get('cf-cache-status'), age: response.headers.get('age'), apo: response.headers.get('cf-apo-via'), assets,
    hero: html.includes('id="ktk-seasonal-hero"') && html.includes('data-campaign="halloween"'),
    seasonalProductMatches: seasonalAnchor.includes('/staging/store2/halloween-pub-crawl-51/#book') && html.includes('Halloweekend') && html.includes('Book Halloween') && html.includes('Best costumes win prizes.'),
    reviewRowMatches: (reviewRow.match(/<a\b/g) || []).length === 3 && !/Ratings checked|ktk-hero-review-date|5\.0\/5/.test(reviewRow) && ['Google', 'Tripadvisor', 'GetYourGuide', '2,400+ reviews', '3,000+ reviews', '100+ reviews', '5/5', '4.9/5', '4.6/5'].every(text => reviewRow.includes(text)),
    lowerReviewCounts, lowerReviewsMatch: JSON.stringify(lowerReviewCounts) === JSON.stringify(['3,000+ reviews', '2,400+ reviews']) && html.includes('Not convinced yet? Take a look at 3,000+ reviews from our krawlers on TripAdvisor.') && !/__KTK_REVIEW_COUNT_|\b(?:2297|582) reviews|more than 900 positive reviews/.test(html),
    responseNoindex: /noindex/i.test(response.headers.get('x-robots-tag') || ''), htmlNoindex: /noindex/i.test(robotsTag), canonicalMatches: canonicalTag.includes(url), robotsTag, canonicalTag };
  result.passed = result.status === 200 && result.hero && result.seasonalProductMatches && result.reviewRowMatches && result.lowerReviewsMatch && result.htmlNoindex && result.canonicalMatches && Object.values(assets).every(asset => asset.matches);
  report.passed &&= result.passed;
  report.devices.push(result);
}
for (const [file, href] of assetUrls) {
  const response = await fetch(href, { signal: AbortSignal.timeout(60000) });
  const hash = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
  const result = { file, href, status: response.status, hash, passed: response.status === 200 && hash === expected[file] };
  report.passed &&= result.passed;
  report.assets.push(result);
}
report.passed &&= report.assets.length === files.length;
await mkdir('docs/homepage-seasonal-hero', { recursive: true });
await writeFile(`docs/homepage-seasonal-hero/${label}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
