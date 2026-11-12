import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));
}
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const source = option('--svg', 'staging/wp-content/mu-plugins/ktk-homepage-assets/hero-statue.svg');
const output = option('--output', 'staging/tmp-screenshots/hero-statue-review.png');
const svg = await readFile(source, 'utf8');
if (/<image\b|data:image\/(?:png|jpe?g|webp)|<script\b/i.test(svg)) throw new Error('Unexpected bitmap or script in vector asset');
await mkdir(path.dirname(output), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 960 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0}body{display:grid;grid-template-columns:450px 450px;font:16px Arial}section{height:960px;display:flex;align-items:center;flex-direction:column;background:#0c1012;color:#fff}section+section{background:#ec3986;color:#101010}p{margin:16px 0}img{width:400px;height:auto;display:block;filter:drop-shadow(8px 4px 0 #ec3986)}section+section img{filter:drop-shadow(8px 4px 0 #101010)}</style><section><p>400px vector / black</p><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" alt="Statue vector preview"></section><section><p>400px vector / pink</p><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" alt="Statue vector preview"></section>`);
  await page.locator('img').first().evaluate(image => image.decode());
  await page.screenshot({ path: output, fullPage: true });
  console.log(JSON.stringify({ source, output, paths: (svg.match(/<path\b/g) || []).length, bytes: Buffer.byteLength(svg), renderedWidth: await page.locator('img').first().evaluate(image => image.getBoundingClientRect().width) }));
} finally {
  await browser.close();
}
