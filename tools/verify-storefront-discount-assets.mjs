import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = process.argv[2] || 'https://krawlthroughkrakow.com/store2/';
const label = process.argv[3] || 'production';
const hash = data => createHash('sha256').update(data).digest('hex');
const expected = Object.fromEntries(await Promise.all(['js', 'css'].map(async ext => [ext, hash(await readFile(`staging/wp-content/plugins/ktk-storefront/assets/storefront.${ext}`))])));
const report = { root, checkedAt: new Date().toISOString(), checks: [] };
for (const [device, ua] of [
  ['desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'],
  ['android', 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'],
  ['ipad', 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'],
]) {
  const response = await fetch(new URL('pub-crawl-28/', root), { headers: { 'User-Agent': ua } });
  assert.equal(response.status, 200);
  const html = await response.text();
  report.checks.push({ device, asset: 'page', url: response.url, status: response.status, cache: response.headers.get('cf-cache-status'), apo: response.headers.get('cf-apo-via') });
  const assets = [...html.matchAll(/(?:src|href)=["']([^"']*\/assets\/storefront\.(js|css)\?[^"']+)["']/g)];
  for (const ext of ['js', 'css']) {
    const match = assets.find(entry => entry[2] === ext);
    assert.ok(match, `${device}: ${ext} asset in HTML`);
    const url = new URL(match[1].replaceAll('&amp;', '&'), root);
    if (ext === 'js') assert.equal(url.searchParams.get('ver'), expected.js.slice(0, 12), `${device}: current JavaScript URL in HTML`);
    // WP Rocket may serve a minified CSS copy. Compare the owned source bytes separately.
    if (ext === 'css' && url.pathname.includes('/cache/min/')) {
      const rendered = await fetch(url);
      assert.equal(rendered.status, 200);
      assert.match(await rendered.text(), /ktk-coupon/);
      report.checks.push({ device, asset: 'rendered-minified-css', url: url.href, status: rendered.status });
      url.pathname = root.includes('/staging/') ? '/staging/wp-content/plugins/ktk-storefront/assets/storefront.css' : '/wp-content/plugins/ktk-storefront/assets/storefront.css';
      url.search = `?ver=${expected.css.slice(0, 12)}`;
    }
    const asset = await fetch(url);
    assert.equal(asset.status, 200);
    const actual = hash(Buffer.from(await asset.arrayBuffer()));
    assert.equal(actual, expected[ext], `${device}: current ${ext} checksum`);
    report.checks.push({ device, asset: ext, url: url.href, hash: actual, cache: asset.headers.get('cf-cache-status') });
  }
}
await writeFile(`docs/storefront-discounts/${label}-assets.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
