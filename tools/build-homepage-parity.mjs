import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {rewriteBookingLinks} from './booking-destinations.mjs';

// Build a local, code-owned snapshot from the read-only production capture.
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));
}
const root = path.resolve('.');
const sourceDir = path.join(root, 'docs/homepage-parity');
const assets = path.join(root, 'staging/wp-content/mu-plugins/ktk-homepage-assets');
const origin = 'https://krawlthroughkrakow.com/';
const html = await readFile(path.join(sourceDir, 'production-source-rendered-1920.html'), 'utf8');
const styles = JSON.parse(await readFile(path.join(sourceDir, 'production-source-styles-1920.json'), 'utf8'));
const sheets = styles.cssom;
if (!Array.isArray(sheets) || sheets.some(sheet => sheet.error)) throw new Error('A complete CSSOM snapshot is required.');
await mkdir(path.join(assets, 'parity'), { recursive: true });
const files = new Map();
async function localize(value, base = origin) {
  if (!value || /^(?:data:|blob:|#)/i.test(value)) return value;
  const url = new URL(value, base);
  if (!['krawlthroughkrakow.com', 'www.krawlthroughkrakow.com', 'fonts.gstatic.com'].includes(url.hostname)) return url.href;
  url.hash = '';
  if (files.has(url.href)) return files.get(url.href).file;
  const name = path.posix.basename(url.pathname).replace(/[^a-zA-Z0-9._-]/g, '_') || 'asset';
  const file = `parity/${createHash('sha256').update(url.href).digest('hex').slice(0, 12)}-${name}`;
  const destination = path.join(assets, file);
  try { await access(destination); } catch {
    const response = await fetch(url, { headers: { 'User-Agent': 'KTK owned-homepage asset snapshot/1.0' }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Asset ${response.status}: ${url.href}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(destination, bytes);
  }
  const bytes = await readFile(destination);
  files.set(url.href, { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  return file;
}

async function cssAssets(css, base, prefix = '') {
  // CSSOM has already parsed/serialized the stylesheet; preserve its cascade order.
  const urls = [...css.matchAll(/url\(\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^\s)]+))\s*\)/g)];
  for (const match of urls.reverse()) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value.startsWith('data:') || value.startsWith('#')) continue;
    const file = await localize(value, base);
    const replacement = `url("${file.startsWith('parity/') ? prefix + file : file}")`;
    css = css.slice(0, match.index) + replacement + css.slice(match.index + match[0].length);
  }
  return css;
}

let css = '';
for (const sheet of sheets) {
  if (sheet.id === 'rocket-lazyload-nojs-css' || sheet.id === 'rocket-lazyrender-inline-css') continue;
  if (!sheet.text) continue;
  if (/^(?:#iubenda|\.iubenda-alert)/.test(sheet.text) || sheet.text.includes('body[data-scroll-step=')) continue;
  const text = await cssAssets(sheet.text, sheet.href || origin);
  css += `\n/* Production stylesheet ${sheet.index}: ${sheet.id || 'inline'} */\n`;
  css += sheet.media && sheet.media !== 'all' ? `@media ${sheet.media}{${text}}\n` : `${text}\n`;
}

// The inline resilience sheet owns Passion One. Renaming only the captured
// font-face sources prevents an origin challenge response from poisoning the
// family while preserving the original selector cascade and computed styles.
css = css.replace(/(@font-face\s*\{[^{}]*font-family:\s*)"Passion One"/g, '$1"Passion One Origin"');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let data;
try {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.route('**/*', route => route.abort());
  await page.setContent(html);
  data = await page.evaluate(() => {
    const pageRoot = document.querySelector('#page-container');
    if (!pageRoot) throw new Error('Production page container missing');
    const heroes = pageRoot.querySelectorAll('#main-content .et_pb_section_0');
    if (heroes.length !== 1) throw new Error('Exactly one production hero section is required.');
    heroes[0].replaceWith(document.createTextNode('__KTK_HOMEPAGE_SEASONAL_HERO__'));
    for (const [name, token] of [['Tripadvisor', '__KTK_REVIEW_COUNT_TRIPADVISOR__'], ['Google', '__KTK_REVIEW_COUNT_GOOGLE__']]) {
      const widgets = [...pageRoot.querySelectorAll('.cont_TA')].filter(widget => widget.querySelector('.TA_H')?.textContent.toLowerCase().includes(name.toLowerCase()));
      if (widgets.length !== 1 || !widgets[0].querySelector('.rev')) throw new Error(`Exactly one ${name} review count is required.`);
      widgets[0].querySelector('.rev').textContent = `${token} reviews`;
    }
    const reviewStory = [...pageRoot.querySelectorAll('p')].filter(paragraph => paragraph.textContent.includes('more than 900 positive reviews'));
    if (reviewStory.length !== 1) throw new Error('The original Tripadvisor review-count paragraph is required.');
    reviewStory[0].textContent = 'Not convinced yet? Take a look at __KTK_REVIEW_COUNT_TRIPADVISOR__ reviews from our krawlers on TripAdvisor.';
    const source = [...document.scripts].map(script => script.textContent).join('\n');
    const options = source.match(/var et_link_options_data\s*=\s*(\[[^\n]*\]);/);
    if (options) {
      for (const link of JSON.parse(options[1])) {
        pageRoot.querySelectorAll(`.${CSS.escape(link.class)}`).forEach(module => {
          if (!module.querySelector('a,button,input,select,textarea')) {
            const anchor = document.createElement('a');
            anchor.href = link.url;
            anchor.target = link.target;
            anchor.className = 'ktk-parity-module-link';
            const label = module.cloneNode(true);
            label.querySelectorAll('script,style,noscript').forEach(element => element.remove());
            anchor.setAttribute('aria-label', label.textContent.trim().replace(/\s+/g, ' '));
            anchor.style.cssText = 'position:absolute;inset:0;z-index:1;';
            module.append(anchor);
          } else {
            module.dataset.parityHref = link.url;
            module.dataset.parityTarget = link.target;
          }
        });
      }
    }
    const floating = document.querySelector('#ktk-cta');
    if (floating) pageRoot.after(floating);
    const container = document.createElement('div');
    container.append(pageRoot);
    if (floating) container.append(floating);
    container.querySelectorAll('script,style,noscript').forEach(element => element.remove());
    container.querySelectorAll('*').forEach(element => {
      for (const attr of [...element.attributes]) {
        if (/^on/i.test(attr.name) || attr.name.startsWith('data-wpr-') || attr.name.startsWith('data-rocket-')
          || ['data-cmp-info', 'data-suppressedsrc'].includes(attr.name)) element.removeAttribute(attr.name);
      }
      element.classList.remove('_iub_cs_activate');
      element.classList.remove('et-waypoint');
      if (element.classList.contains('et_pb_animation')) element.classList.add('et-animated');
    });
    container.querySelectorAll('img').forEach(img => {
      if (img.dataset.lazySrc) img.src = img.dataset.lazySrc;
      if (img.dataset.lazySrcset) img.srcset = img.dataset.lazySrcset;
      if (img.dataset.lazySizes) img.sizes = img.dataset.lazySizes;
      ['data-lazy-src', 'data-lazy-srcset', 'data-lazy-sizes', 'data-ll-status'].forEach(attr => img.removeAttribute(attr));
      img.decoding = 'async';
    });
    container.querySelectorAll('iframe').forEach(frame => {
      if (frame.dataset.lazySrc) frame.src = frame.dataset.lazySrc;
      frame.removeAttribute('data-lazy-src');
      frame.removeAttribute('data-cmp-info');
      frame.removeAttribute('data-suppressedsrc');
      frame.classList.remove('_iub_cs_activate');
      frame.loading = 'lazy';
    });
    container.querySelectorAll('a[target="_blank"]').forEach(anchor => anchor.rel = 'noopener noreferrer');
    container.querySelectorAll('.mobile_nav').forEach(nav => { nav.classList.remove('opened'); nav.classList.add('closed'); });
    container.querySelectorAll('#mobile_menu').forEach(menu => menu.removeAttribute('style'));
    container.querySelectorAll('.et_pb_gallery_items').forEach(gallery => {
      [...gallery.querySelectorAll('.et_pb_gallery_item')].forEach((item, index) => {
        item.classList.toggle('et-pb-active-slide', index === 0);
        item.style.display = index === 0 ? 'block' : 'none';
      });
    });
    const links = [...container.querySelectorAll('a[href], [data-parity-href]')].map(element => ({
      attribute: element.hasAttribute('href') ? 'href' : 'data-parity-href',
      url: element.getAttribute(element.hasAttribute('href') ? 'href' : 'data-parity-href'),
    }));
    return {
      html: container.innerHTML,
      bodyClass: [...document.body.classList].filter(name => !['chrome', 'safari', 'firefox', 'opera', 'osx', 'et_mobile_device', 'et_mobile_device_not_ipad'].includes(name)).join(' '),
      title: document.title, description: document.querySelector('meta[name="description"]')?.content || '',
      images: [...container.querySelectorAll('img,source')].map(img => ({ src: img.getAttribute('src'), srcset: img.getAttribute('srcset') })),
      links,
    };
  });
  await page.setContent(data.html);
  data.bookingRevisions=await rewriteBookingLinks(page);
  data.html=await page.evaluate(()=>document.body.innerHTML);
  data.links=await page.evaluate(()=>[...document.querySelectorAll('a[href],[data-parity-href]')].flatMap(e=>['href','data-parity-href'].filter(attribute=>e.hasAttribute(attribute)).map(attribute=>({attribute,url:e.getAttribute(attribute)}))));
} finally { await browser.close(); }

const replacements = new Map();
for (const image of data.images) {
  if (image.src && !image.src.startsWith('data:')) replacements.set(image.src, await localize(image.src));
  if (image.srcset) {
    for (const candidate of image.srcset.split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) replacements.set(url, await localize(url));
    }
  }
}
for (const [remote, file] of [...replacements].sort((a, b) => b[0].length - a[0].length)) {
  data.html = data.html.replaceAll(remote.replaceAll('&', '&amp;'), file.startsWith('parity/') ? '__KTK_PARITY_ASSETS__' + file : file);
}
data.html = await cssAssets(data.html, origin, '__KTK_PARITY_ASSETS__');
for (const link of data.links) {
  if(link.url.includes('__KTK_'))continue;
  let url;
  try { url = new URL(link.url, origin); } catch { continue; }
  if (url.origin !== new URL(origin).origin) continue;
  if (/\.(?:webp|png|jpe?g|gif)$/i.test(url.pathname)) {
    const file = await localize(url.href);
    data.html = data.html.replaceAll(`${link.attribute}="${link.url.replaceAll('&', '&amp;')}"`, `${link.attribute}="__KTK_PARITY_ASSETS__${file}"`);
    continue;
  }
  const pathname = url.pathname.replace(/^\/staging(?=\/|$)/, '');
  const portable = '__KTK_HOME_URL__' + pathname.replace(/^\//, '') + url.search + url.hash;
  data.html = data.html.replaceAll(`${link.attribute}="${link.url.replaceAll('&', '&amp;')}"`, `${link.attribute}="${portable.replaceAll('&', '&amp;')}"`);
}
const phpString = value => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
const marker = 'KTK_PRODUCTION_PARITY_BODY_20261006';
if (data.html.includes(marker)) throw new Error('Snapshot marker collision');
const source = `<?php\n/** Generated by tools/build-homepage-parity.mjs from the production rendering. */\nif (!defined('ABSPATH')) { exit; }\nfunction ktk_homepage_parity_body_class() { return ${phpString(data.bodyClass)}; }\nfunction ktk_homepage_static_body() {\n    $html = <<<'${marker}'\n${data.html}\n${marker};\n    $reviews = array_column(ktk_homepage_review_sources(), null, 'name');\n    $html = str_replace(array('__KTK_REVIEW_COUNT_TRIPADVISOR__', '__KTK_REVIEW_COUNT_GOOGLE__'), array(esc_html($reviews['Tripadvisor']['count']), esc_html($reviews['Google']['count'])), $html);\n    $html = str_replace(array('__KTK_PARITY_ASSETS__', '__KTK_HOME_URL__'), array(esc_url(content_url('/mu-plugins/ktk-homepage-assets/')), esc_url(home_url('/'))), $html);\n    return str_replace('__KTK_HOMEPAGE_SEASONAL_HERO__', ktk_homepage_seasonal_hero(), $html);\n}\n`;
await writeFile(path.join(assets, 'parity-seasonal-content.php'), source);
await writeFile(path.join(assets, 'parity.css'), css);
await writeFile(path.join(sourceDir, 'parity-build.json'), JSON.stringify({
  capturedSource: 'production-source-rendered-1920.html', builtAt: new Date().toISOString(),
  bodyClass: data.bodyClass, title: data.title, description: data.description,
  htmlBytes: Buffer.byteLength(data.html), cssBytes: Buffer.byteLength(css),
  files: Object.fromEntries(files),
  bookingRevisions:data.bookingRevisions,
}, null, 2));
console.log(JSON.stringify({ htmlBytes: Buffer.byteLength(data.html), cssBytes: Buffer.byteLength(css), assetCount: files.size, title: data.title }));
