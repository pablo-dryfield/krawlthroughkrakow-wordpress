import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import { socialFontFiles } from './homepage-social-font.mjs';
import { fetchCompleteResponse } from './read-only-http.mjs';
const require = createRequire(new URL('../staging/wp-content/plugins/ktk-storefront/frontend/package.json', import.meta.url));
const { parse } = require('postcss');
const output = process.argv[2], cacheBusted = process.argv.includes('--cache-bust');
if (!output) throw new Error('A fresh output report is required');
try { await readFile(output); throw new Error('Preserve earlier evidence'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const base = 'https://krawlthroughkrakow.com/staging/';
const root = 'staging/wp-content/mu-plugins/ktk-homepage-assets/';
const css = await readFile(root + 'parity-runtime.css');
const hash = value => createHash('sha256').update(value).digest('hex');
const agents = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
};
const checks = [], responses = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });
for (const [device, agent] of Object.entries(agents)) {
  const url = new URL(base);
  if (cacheBusted) url.searchParams.set('ktk_social_font_check', String(Date.now()));
  const response = await fetchCompleteResponse(url, { headers: { 'User-Agent': agent } });
  const html = await response.text();
  responses.push({ device, status: response.status, cache: response.headers.get('cf-cache-status') });
  check(device + ' staging homepage200/noindex', response.status === 200 && /noindex/.test(html));
  const match = html.match(/href=["']([^"']*\/ktk-homepage-assets\/parity-runtime\.css(?:\?[^"']*)?)["']/);
  if (!match) throw new Error('Homepage runtime CSS is missing');
  const cssUrl = new URL(match[1].replaceAll('&amp;', '&'), base);
  if (cssUrl.origin !== new URL(base).origin || !cssUrl.pathname.startsWith('/staging/wp-content/mu-plugins/ktk-homepage-assets/')) throw new Error('Unexpected stylesheet scope');
  const sheet = await fetchCompleteResponse(cssUrl, { headers: { 'User-Agent': agent } });
  const bytes = Buffer.from(await sheet.arrayBuffer());
  check(device + ' current CSS token/hash', cssUrl.searchParams.get('v') === hash(css).slice(0, 12)
    && sheet.status === 200 && hash(bytes) === hash(css));
  const faces = [];
  parse(bytes.toString('utf8')).walkAtRules('font-face', rule => {
    const declarations = Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
    if (declarations['unicode-range'] === 'U+E07B, U+F262') faces.push(declarations);
  });
  check(device + ' exact derivative range/original fallback', faces.length === 1 && faces[0]['font-family'] === '"FontAwesome"'
    && faces[0]['font-weight'] === '400' && faces[0]['font-display'] === 'block'
    && faces[0].src === 'url("social-icons-homepage.woff2") format("woff2"),\n    url("parity/114236a5fb48-fa-brands-400.woff2") format("woff2")');
  for (const [file, expected] of Object.entries(socialFontFiles)) {
    const font = await fetchCompleteResponse(new URL(file, cssUrl), { headers: { 'User-Agent': agent } });
    const body = Buffer.from(await font.arrayBuffer());
    check(device + ' exact font ' + file, font.status === 200 && hash(body) === expected,
      { bytes: body.length, sha256: hash(body), cache: font.headers.get('cf-cache-status') });
  }
}
const report = { checkedAt: new Date().toISOString(), base, cacheBusted,
  scope: 'Three normal staging device variants, exact CSS/font bytes and native fallback; no runtime provider or consent claim.',
  passed: checks.filter(row => row.pass).length, total: checks.length, checks, responses };
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, total: report.total, failed: checks.filter(row => !row.pass), responses }, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
