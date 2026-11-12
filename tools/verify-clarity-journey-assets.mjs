import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const parserRoot = path.resolve(process.env.OMNILODGE_ROOT || '../omni-lodge', 'ui/node_modules');
const cssRules = (text, baseUrl) => {
  const postcss = require(path.join(parserRoot, 'postcss'));
  const valueParser = require(path.join(parserRoot, 'postcss-value-parser'));
  const value = input => {
    const parsed = valueParser(input);
    parsed.walk(node => {
      if (node.type === 'function' && node.value.toLowerCase() === 'url' && node.nodes.length === 1
        && ['word', 'string'].includes(node.nodes[0].type)) {
        node.nodes = [{ type: 'string', quote: '"', value: new URL(node.nodes[0].value, baseUrl).href }];
      }
    });
    return parsed.toString();
  };
  const visit = node => {
    if (node.type === 'comment') return null;
    if (node.type === 'decl') return ['decl', node.prop, value(node.value), !!node.important];
    const children = node.nodes?.map(visit).filter(entry => entry !== null) ?? null;
    return [node.type, node.selector ?? null, node.name ?? null, node.params ?? null, children];
  };
  return JSON.stringify(visit(postcss.parse(text)));
};

const root = process.argv[2] || 'https://krawlthroughkrakow.com/store2/';
const label = process.argv[3] || 'production';
const cacheToken = process.argv[4] || '';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid report label');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const expected = {};
for (const ext of ['js', 'css']) expected[ext] = hash(await readFile(`staging/wp-content/plugins/ktk-storefront/assets/storefront.${ext}`));
const report = { root, cacheToken, checkedAt: new Date().toISOString(), expected, variants: [], passed: true };
for (const [device, ua] of [
  ['desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'],
  ['android', 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'],
  ['ipad', 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'],
]) {
  const variant = { device, assets: [], passed: true };
  try {
    const pageUrl = new URL('pub-crawl-28/', root);
    if (cacheToken) pageUrl.searchParams.set('ktk_smoke', cacheToken);
    const response = await fetch(pageUrl, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(45000) });
    const html = await response.text();
    variant.status = response.status;
    variant.cache = response.headers.get('cf-cache-status');
    variant.age = response.headers.get('age');
    if (response.status !== 200) throw new Error('Page status ' + response.status);
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']*\/assets\/storefront\.(js|css)\?[^"']+)["']/g)];
    for (const ext of ['js', 'css']) {
      const entry = assets.find(match => match[2] === ext);
      if (!entry) throw new Error('Missing owned ' + ext + ' reference');
      const url = new URL(entry[1].replaceAll('&amp;', '&'), root);
      const optimizedCss = ext === 'css' && url.pathname.includes('/cache/min/');
      const versionMatches = optimizedCss ? null : url.searchParams.get('ver') === expected[ext].slice(0, 12);
      const owned = new URL((root.includes('/staging/') ? '/staging' : '') + '/wp-content/plugins/ktk-storefront/assets/storefront.' + ext, root);
      owned.search = '?ver=' + expected[ext].slice(0, 12);
      const result = await fetch(owned, { signal: AbortSignal.timeout(45000) });
      const bytes = Buffer.from(await result.arrayBuffer());
      const actual = hash(bytes);
      let rendered = null;
      if (optimizedCss) {
        const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
        const css = await response.text();
        // Keep every ordered selector/declaration. Only comments/formatting and equivalent URL rebasing differ.
        const sourceRules = cssRules(bytes.toString('utf8'), owned);
        const renderedRules = cssRules(css, url);
        rendered = { status: response.status, sha256: hash(css), sourceRulesHash: hash(sourceRules), renderedRulesHash: hash(renderedRules), matchesSourceRules: sourceRules === renderedRules };
      }
      const matches = result.status === 200 && actual === expected[ext]
        && (optimizedCss ? rendered.status === 200 && rendered.matchesSourceRules : versionMatches);
      variant.assets.push({ type: ext, reference: url.href, versionMatches, versionPolicy: optimizedCss ? 'Optimizer timestamp; ordered CSS rules and owned source verified independently' : 'Owned content hash', status: result.status, sha256: actual, rendered, matches });
      variant.passed &&= matches;
    }
  } catch (error) {
    variant.error = error.message;
    variant.passed = false;
  }
  report.variants.push(variant);
  report.passed &&= variant.passed;
}
await mkdir('docs/clarity-journey-links', { recursive: true });
await writeFile(`docs/clarity-journey-links/${label}-assets.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;
