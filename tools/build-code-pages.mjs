import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, access, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {buildPageIntegrations} from './code-pages-integrations.mjs';

const require = createRequire(import.meta.url);
const dependencies = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = require(require.resolve('playwright', { paths: [dependencies] }));
const root = path.resolve('.');
const source = path.join(root, 'docs/code-pages/how-to-join');
const assets = path.join(root, 'staging/wp-content/mu-plugins/ktk-code-pages-assets');
const homepage = path.join(root, 'staging/wp-content/mu-plugins/ktk-homepage-assets');
const origin = 'https://krawlthroughkrakow.com/about-us/how-to-join/';
const html = await readFile(path.join(source, 'production-rendered-1920.html'), 'utf8');
const snapshot = JSON.parse(await readFile(path.join(source, 'production-styles-1920.json'), 'utf8'));
if (!snapshot.cssom?.length || snapshot.cssom.some(sheet => sheet.error)) throw new Error('Complete captured CSSOM required.');
await mkdir(path.join(assets, 'media'), { recursive: true });
const previousAssets = JSON.parse(await readFile(path.join(root, 'docs/homepage-parity/parity-build.json'), 'utf8')).files;
const files = new Map();
async function localize(value, base = origin) {
  if (!value || /^(data:|blob:|#)/i.test(value)) return value;
  const url = new URL(value, base);
  if (!['krawlthroughkrakow.com', 'www.krawlthroughkrakow.com', 'fonts.gstatic.com'].includes(url.hostname)) throw new Error(`Unreviewed asset host: ${url.href}`);
  url.hash = '';
  if (files.has(url.href)) return files.get(url.href).file;
  const filename = path.posix.basename(url.pathname).replace(/[^a-zA-Z0-9._-]/g, '_');
  const file = `media/${createHash('sha256').update(url.href).digest('hex').slice(0, 12)}-${filename}`;
  const destination = path.join(assets, file);
  try { await access(destination); } catch {
    const previous = previousAssets[url.href];
    if (previous) await copyFile(path.join(homepage, previous.file), destination);
    else {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`Asset ${response.status}: ${url.href}`);
      if (/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error(`Non-asset response: ${url.href}`);
      await writeFile(destination, Buffer.from(await response.arrayBuffer()));
    }
  }
  const bytes = await readFile(destination);
  if (/\.woff2?$/.test(file) && !['wOFF', 'wOF2'].includes(bytes.subarray(0, 4).toString())) throw new Error(`Invalid font: ${file}`);
  files.set(url.href, { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  return file;
}
async function localizeCss(css, base, prefix = '') {
  const urls = [...css.matchAll(/url\(\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^\s)]+))\s*\)/g)];
  for (const match of urls.reverse()) {
    const value = match[1] ?? match[2] ?? match[3];
    if (/^(data:|#)/i.test(value)) continue;
    const file = await localize(value, base);
    css = css.slice(0, match.index) + `url("${prefix}${file}")` + css.slice(match.index + match[0].length);
  }
  return css;
}
let css = '';
for (const sheet of snapshot.cssom) {
  if (!sheet.text || /^(rocket-|wpr-)/.test(sheet.id) || /^(?:#iubenda|\.iubenda-alert)/.test(sheet.text) || sheet.text.includes('body[data-scroll-step=')) continue;
  const text = await localizeCss(sheet.text, sheet.href || origin);
  css += `\n/* Captured stylesheet ${sheet.index}: ${sheet.id || 'inline'} */\n`;
  css += sheet.media && sheet.media !== 'all' ? `@media ${sheet.media}{${text}}\n` : `${text}\n`;
}
css = css.replace(/(@font-face\s*\{[^{}]*font-family:\s*)"Passion One"/g, '$1"Passion One Origin"');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let data;
try {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.route('**/*', route => route.abort());
  await page.setContent(html);
  data = await page.evaluate(() => {
    const pageRoot = document.querySelector('#page-container');
    if (!pageRoot || pageRoot.querySelectorAll('#main-content .et_pb_section').length !== 4) throw new Error('Expected complete four-section page.');
    const container = document.createElement('div');
    container.append(pageRoot);
    const floating = document.querySelector('#ktk-cta');
    if (floating) container.append(floating);
    const options = [...document.scripts].map(script => script.textContent).join('\n').match(/var et_link_options_data\s*=\s*(\[[^\n]*\]);/);
    if (options) for (const link of JSON.parse(options[1])) {
      for (const module of pageRoot.querySelectorAll(`.${CSS.escape(link.class)}`)) {
        // An iframe cannot be wrapped by an overlay without breaking its controls.
        if (module.querySelector('iframe')) { module.classList.remove('et_clickable'); continue; }
        if (module.querySelector('a,button,input,select,textarea')) throw new Error(`Unexpected nested link in ${link.class}`);
        const anchor = document.createElement('a');
        anchor.href = link.url; anchor.target = link.target;
        anchor.className = 'ktk-parity-module-link';
        anchor.setAttribute('aria-label', module.textContent.trim().replace(/\s+/g, ' '));
        anchor.style.cssText = 'position:absolute;inset:0;z-index:1;';
        module.append(anchor);
      }
    }
    container.querySelectorAll('script,style,noscript').forEach(element => element.remove());
    container.querySelectorAll('*').forEach(element => {
      for (const attr of [...element.attributes]) {
        if (/^on/i.test(attr.name) || /^data-(wpr-|rocket-|cmp-|suppressedsrc|iub-)/.test(attr.name)) element.removeAttribute(attr.name);
      }
      element.classList.remove('_iub_cs_activate', 'cmplazyload', 'et-waypoint', 'entered', 'exited', 'lazyloading');
      if (element.classList.contains('et_pb_animation')) element.classList.add('et-animated');
    });
    container.querySelectorAll('img').forEach(image => {
      if (image.dataset.lazySrc) image.src = image.dataset.lazySrc;
      if (image.dataset.lazySrcset) image.srcset = image.dataset.lazySrcset;
      if (image.dataset.lazySizes) image.sizes = image.dataset.lazySizes;
      ['data-lazy-src', 'data-lazy-srcset', 'data-lazy-sizes', 'data-ll-status'].forEach(attr => image.removeAttribute(attr));
      image.decoding = 'async';
    });
    container.querySelectorAll('iframe').forEach((frame, index) => {
      const src = frame.dataset.lazySrc || frame.getAttribute('src');
      if (!src?.startsWith('https://www.google.com/maps/')) throw new Error(`Unexpected frame ${src}`);
      frame.dataset.ktkMapSrc = src;
      frame.src = 'about:blank';
      frame.title = index === 0 ? 'Krawl Through Krakow location on Google Maps' : 'Adam Statue meeting point on Google Maps';
      ['data-lazy-src', 'data-ll-status'].forEach(attr => frame.removeAttribute(attr));
      frame.loading = 'lazy';
    });
    container.querySelectorAll('a[target="_blank"]').forEach(anchor => anchor.rel = 'noopener noreferrer');
    container.querySelectorAll('.mobile_nav').forEach(nav => { nav.classList.remove('opened'); nav.classList.add('closed'); });
    container.querySelectorAll('#mobile_menu').forEach(menu => menu.removeAttribute('style'));
    container.querySelector('#et-top-navigation')?.style.removeProperty('padding-left');
    return {
      html: container.innerHTML,
      bodyClass: [...document.body.classList].filter(name => !['chrome', 'safari', 'firefox', 'opera', 'osx', 'linux', 'et_mobile_device', 'et_mobile_device_not_ipad'].includes(name)).join(' '),
      images: [...container.querySelectorAll('img,source')].map(image => ({ src: image.getAttribute('src'), srcset: image.getAttribute('srcset') })),
      links: [...container.querySelectorAll('a[href]')].map(anchor => anchor.getAttribute('href')),
      title: document.title, description: document.querySelector('meta[name="description"]')?.content || '',
    };
  });
} finally { await browser.close(); }

const replacements = new Map();
for (const image of data.images) {
  if (image.src && !image.src.startsWith('data:')) replacements.set(image.src, await localize(image.src));
  if (image.srcset) for (const candidate of image.srcset.split(',')) {
    const value = candidate.trim().split(/\s+/)[0];
    if (value) replacements.set(value, await localize(value));
  }
}
for (const [remote, file] of [...replacements].sort((a, b) => b[0].length - a[0].length)) data.html = data.html.replaceAll(remote.replaceAll('&', '&amp;'), '__KTK_PAGE_ASSETS__' + file);
data.html = await localizeCss(data.html, origin, '__KTK_PAGE_ASSETS__');
for (const href of data.links) {
  let url; try { url = new URL(href, origin); } catch { continue; }
  if (url.origin !== new URL(origin).origin) continue;
  const portable = '__KTK_HOME_URL__' + url.pathname.replace(/^\/staging(?=\/|$)/, '').replace(/^\//, '') + url.search + url.hash;
  data.html = data.html.replaceAll(`href="${href.replaceAll('&', '&amp;')}"`, `href="${portable.replaceAll('&', '&amp;')}"`);
}
const phpString = value => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
const marker = 'KTK_PAGE_HOW_TO_JOIN_20261105';
if (data.html.includes(marker)) throw new Error('Marker collision');
await writeFile(path.join(assets, 'how-to-join.php'), `<?php\n/** Generated by tools/build-code-pages.mjs; edit the capture or generator. */\nif (!defined('ABSPATH')) { exit; }\nreturn array('title' => ${phpString(data.title)}, 'description' => ${phpString(data.description)}, 'body_class' => ${phpString(data.bodyClass)}, 'html' => <<<'${marker}'\n${data.html}\n${marker}\n);\n`);
await writeFile(path.join(assets, 'how-to-join.css'), css);
// Snapshot the proven integrations under an isolated namespace; homepage files stay unchanged.
await buildPageIntegrations(homepage,assets);
await copyFile(path.join(homepage, 'font-resilience.css'), path.join(assets, 'font-resilience.css'));
await writeFile(path.join(source, 'build.json'), JSON.stringify({ builtAt: new Date().toISOString(), source: 'production-rendered-1920.html', sourceSha256: createHash('sha256').update(html).digest('hex'), title: data.title, assets: Object.fromEntries(files), htmlBytes: Buffer.byteLength(data.html), cssBytes: Buffer.byteLength(css) }, null, 2));
console.log(JSON.stringify({ title: data.title, assetCount: files.size, htmlBytes: Buffer.byteLength(data.html), cssBytes: Buffer.byteLength(css) }));
