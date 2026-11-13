import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const url = 'https://krawlthroughkrakow.com/staging/';
const output=process.argv.includes('--output')?process.argv[process.argv.indexOf('--output')+1]:'docs/homepage-parity/staging-clean-cache-verification.json';
try{await readFile(output);throw new Error('Preserve earlier evidence; provide --output');}catch(error){if(error.code!=='ENOENT')throw error;}
const requestUrl=url+(process.argv.includes('--cache-bust')?'?ktk_media_check='+Date.now():'');
const files = ['parity.css', 'parity-runtime.css', 'parity.js', 'journey.js', 'hero.css',
  'hero-statue-regular.svg', 'hero-statue-seasonal.svg',
  'review-google.svg', 'review-tripadvisor.png', 'review-getyourguide.svg'];
const expected = {};
for (const file of files) expected[file] = createHash('sha256').update(await readFile(`staging/wp-content/mu-plugins/ktk-homepage-assets/${file}`)).digest('hex');
const agents = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};
const report = { url, requestUrl, cacheBusted: requestUrl !== url, checkedAt: new Date().toISOString(), expected, devices: [], assets: [], passed: true };
const assetUrls = new Map();
for (const [device, userAgent] of Object.entries(agents)) {
  const response = await fetch(requestUrl, { headers: { 'User-Agent': userAgent }, signal:AbortSignal.timeout(60000) });
  const html = await response.text();
  const assets = Object.fromEntries(files.map(file => {
    const match = html.match(new RegExp(`(?:href|src)=["']([^"']*/ktk-homepage-assets/${file.replace('.', '\\.')}(?:\\?[^"']*)?)["']`));
    const href = match ? new URL(match[1].replaceAll('&amp;', '&'), url).href : null;
    if (href) assetUrls.set(file, href);
    return [file, { href, matches: href && new URL(href).searchParams.get('v') === expected[file].slice(0, 12) }];
  }));
  const robotsTag = html.match(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i)?.[0] || '';
  const canonicalTag = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i)?.[0] || '';
  const result = { device, status: response.status, cache: response.headers.get('cf-cache-status'), age: response.headers.get('age'), apo: response.headers.get('cf-apo-via'), assets, replica: html.includes('parity-runtime.css') && html.includes('et_pb_section_0'), responseNoindex: /noindex/i.test(response.headers.get('x-robots-tag') || ''), htmlNoindex: /noindex/i.test(robotsTag), canonicalMatches: canonicalTag.includes(url), robotsTag, canonicalTag };
  result.passed = result.status === 200 && result.replica && result.htmlNoindex && result.canonicalMatches && Object.values(assets).every(asset => asset.matches);
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
await writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
