import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));
}
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const target = new URL(option('--url', 'http://127.0.0.1:5184/'));
const local = ['localhost', '127.0.0.1'].includes(target.hostname);
if (!local && !(target.hostname === 'krawlthroughkrakow.com' && target.pathname.startsWith('/staging/'))) throw new Error('Only local preview or staging may be tested.');
const capture = process.argv.includes('--capture-baseline');
const heroOnly = process.argv.includes('--hero-only');
const approvedReviewRefresh = process.argv.includes('--approved-review-refresh');
const label = option('--label', capture ? 'before' : 'local');
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a simple report label.');
const out = path.resolve('docs/homepage-seasonal-hero');
const baselineFile = path.resolve(option('--baseline', path.join(out, 'before-baseline.json')));
const widths = option('--widths', '320,390,768,1024,1440,1920').split(',').map(Number);
if (widths.some(width => !Number.isInteger(width) || width < 320)) throw new Error('Invalid viewport width.');
const variants = capture ? ['baseline'] : option('--variants', 'default,halloween').split(',');
const campaignFor = variant => variant === 'halloween' ? 'halloween' : 'nye';
const baseline = capture ? null : JSON.parse(await readFile(baselineFile, 'utf8'));
const report = { url: target.href, capturedAt: new Date().toISOString(), conditions: 'Fresh installed Chrome contexts; source DOM hashes normalize environment URL prefixes and decode Cloudflare email protection. Lower geometry is relative to each section and permits changed hero height. Native scroll-effect nodes are excluded from static geometry, not screenshots. Gallery autoplay is paused at first slide. Text collisions use font ink ascent/descent, not overlapping typographic em boxes. Existing lower-page horizontal overflow is recorded and must not increase. No purchases or external navigation. CSS zoom is not pinch zoom.', checks: [], captures: [], screenshots: [], pageErrors: [] };
const check = (name, pass, detail = null) => report.checks.push({ name, pass: Boolean(pass), detail });
const sha = value => createHash('sha256').update(value).digest('hex');
const rgba = value => (value.match(/[\d.]+/g) || []).map(Number);
const rgb = value => rgba(value).slice(0, 3);
const composite = (foreground, background) => { const a = rgba(foreground); const alpha = a[3] ?? 1; return a.slice(0, 3).map((channel, index) => channel * alpha + rgb(background)[index] * (1 - alpha)); };
const luminance = value => (Array.isArray(value) ? value : rgb(value)).map(channel => { const n = channel / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }).reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (foreground, background) => (Math.max(luminance(foreground), luminance(background)) + 0.05) / (Math.min(luminance(foreground), luminance(background)) + 0.05);
function textContrast(row, backgrounds) {
  const required = row.fontSize >= 24 || (row.fontSize >= 18.666 && row.fontWeight >= 700) ? 3 : 4.5;
  const fillRatios = backgrounds.map(background => contrast(row.color, background));
  const shadows = [...row.textShadow.matchAll(/(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+([\d.]+)px)?/g)].map(([, color, x, y, blur]) => ({ color, x: Number(x), y: Number(y), blur: Number(blur || 0), ratio: contrast(row.color, color) }));
  const solid = shadows.filter(shadow => (rgba(shadow.color)[3] ?? 1) === 1 && shadow.blur === 0 && shadow.ratio >= required);
  const halo = solid.some(shadow => shadow.x <= -1) && solid.some(shadow => shadow.x >= 1) && solid.some(shadow => shadow.y <= -1) && solid.some(shadow => shadow.y >= 1);
  const stroke = row.strokeWidth >= 1 && (rgba(row.strokeColor)[3] ?? 1) === 1 && contrast(row.color, row.strokeColor) >= required;
  const fillPass = fillRatios.every(ratio => ratio >= required);
  return { text: row.text, required, fillRatios, fillPass, shadows, halo, stroke, pass: fillPass || halo || stroke, method: fillPass ? 'fill/background' : halo || stroke ? 'fill/opaque surrounding outline' : 'insufficient contrast' };
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir(out, { recursive: true });

function viewport(width) { return { width, height: Number(option('--height', String(({ 320: 800, 390: 844, 768: 1024, 1024: 900, 1440: 900, 1920: 1080 })[width] || 900))) }; }
async function contextFor(width, extra = {}) {
  return browser.newContext({ viewport: viewport(width), deviceScaleFactor: 1, isMobile: width <= 768, hasTouch: width <= 768,
    userAgent: width < 768 ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36' : width === 768 ? 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : undefined, ...extra });
}
function variantUrl(variant) {
  const url = new URL(target);
  if (variant === 'default' || variant === 'baseline') url.searchParams.delete('ktk_hero');
  else url.searchParams.set('ktk_hero', variant);
  return url.href;
}
async function load(page, variant) {
  await page.addInitScript(() => {
    window.__heroTimers = [];
    for (const method of ['setTimeout', 'setInterval']) {
      const original = window[method];
      window[method] = function(callback, delay, ...args) {
        if (window.__heroFreeze && Number(delay) === 3500) return 0;
        const id = original.call(window, callback, delay, ...args);
        if (Number(delay) === 3500) window.__heroTimers.push({ method, id });
        return id;
      };
    }
  });
  const response = await page.goto(variantUrl(variant), { waitUntil: 'domcontentloaded', timeout: 60000 });
  const source = await response.text();
  if (response.status() !== 200) throw new Error(`HTTP ${response.status()}`);
  await page.mouse.wheel(0, 10);
  if (!local) {
    const reject = page.getByRole('button', { name: /^Reject(?: all)?$/i }).first();
    await reject.waitFor({ state: 'visible', timeout: 25000 });
    try { await reject.click({ timeout: 4000 }); }
    catch {
      // The existing 320px Iubenda banner can cover its own pointer target.
      await reject.focus();
      await page.keyboard.press('Enter');
      report.checks.push({ name: `${variant}-${page.viewportSize().width}: consent keyboard fallback`, pass: true, detail: 'Existing narrow Iubenda banner intercepts pointer; native keyboard activation used.' });
    }
    await page.waitForFunction(() => !document.querySelector('#iubenda-cs-banner')?.getClientRects().length, undefined, { timeout: 10000 });
  }
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(400, innerHeight * 0.8)) {
      scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => Promise.race([image.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))])));
    window.__heroFreeze = true;
    for (const timer of window.__heroTimers) (timer.method === 'setInterval' ? clearInterval : clearTimeout)(timer.id);
    document.querySelectorAll('.et_pb_gallery_fullwidth').forEach(gallery => gallery.querySelector('.et-pb-controllers a,.et-pb-controllers button')?.click());
    scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
  return source;
}

async function unchangedInventory(page, source) {
  const data = await page.evaluate(({ source, approvedReviewRefresh }) => {
    const parsed = new DOMParser().parseFromString(source, 'text/html');
    const decodeEmail = value => {
      const key = parseInt(value.slice(0, 2), 16);
      return (value.slice(2).match(/.{2}/g) || []).map(pair => String.fromCharCode(parseInt(pair, 16) ^ key)).join('');
    };
    parsed.querySelectorAll('[data-cfemail]').forEach(element => element.replaceWith(parsed.createTextNode(decodeEmail(element.dataset.cfemail))));
    parsed.querySelectorAll('a[href*="/cdn-cgi/l/email-protection#"]').forEach(anchor => anchor.setAttribute('href', 'mailto:' + decodeEmail(anchor.getAttribute('href').split('#')[1])));
    const normalize = value => value
      .replace(/(?:https?:\/\/[^/"'\s]+)?(?:\/staging)?\/wp-content\/mu-plugins\/ktk-homepage-assets/g, '/ktk-homepage-assets')
      .replace(/https?:\/\/(?:krawlthroughkrakow\.com|127\.0\.0\.1:5184|localhost:5184)(?:\/staging)?/g, '')
      .replace(/\s+/g, ' ').trim();
    const serialize = element => normalize(element?.outerHTML || '');
    const sections = [...document.querySelectorAll('#main-content .et_pb_section')];
    const sourceSections = [...parsed.querySelectorAll('#main-content .et_pb_section')];
    const publishedLower = sourceSections.slice(1).map(serialize);
    const reviewRefresh = [];
    if (approvedReviewRefresh) {
      // Reverse only the owner-approved copy edits for the immutable source comparison.
      for (const [name, current, previous] of [['Tripadvisor', '3,000+ reviews', '2297 reviews'], ['Google', '2,400+ reviews', ' 582 reviews']]) {
        const widget = [...parsed.querySelectorAll('.cont_TA')].find(element => element.querySelector('.TA_H')?.textContent.includes(name));
        const count = widget?.querySelector('.rev');
        reviewRefresh.push({ name, text: count?.textContent.trim(), expected: current });
        if (count?.textContent.trim() === current) {
          count.textContent = previous;
          const module = widget.closest('.et_pb_module');
          module?.querySelectorAll('a[aria-label]').forEach(anchor => anchor.setAttribute('aria-label', anchor.getAttribute('aria-label').replace(current, previous.trim())));
        }
      }
      const paragraph = parsed.querySelector('.et_pb_text_25 p');
      const current = 'Not convinced yet? Take a look at 3,000+ reviews from our krawlers on TripAdvisor.';
      reviewRefresh.push({ name: 'story', text: paragraph?.textContent, expected: current });
      if (paragraph?.textContent === current) paragraph.textContent = 'Not convinced yet? Take a look at our more than 900 positive reviews from our krawlers on TripAdvisor.';
    }
    const facts = (element, origin) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { tag: element.tagName, id: element.id, class: element.getAttribute('class'), text: element.textContent.replace(/\s+/g, ' ').trim().slice(0, 120), box: { x: box.x - origin.x, y: box.y - origin.y, width: box.width, height: box.height }, style: Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'display', 'position', 'marginTop', 'marginBottom', 'paddingTop', 'paddingBottom'].map(key => [key, style[key]])) };
    };
    const staticNodes = section => [...section.querySelectorAll('.et_pb_row,.et_pb_module,h1,h2,h3,h4,p')].filter(element => element.getClientRects().length && !element.closest('[style*="transform"],.et_pb_image_3,.et_pb_image_4,.et_pb_image_5,.et_pb_image_6,.et_pb_image_7,.et_pb_image_8,.et_pb_column_27,.et_pb_gallery'));
    const header = document.querySelector('#main-header');
    return { sourceHeader: serialize(parsed.querySelector('#main-header')), sourceLower: sourceSections.slice(1).map(serialize), publishedLower, reviewRefresh, viewportWidth:innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyClass: document.body.className, header: [header, ...header.querySelectorAll('#logo,#top-menu > li,#et_top_search,.mobile_menu_bar')].filter(element => element.getClientRects().length).map(element => facts(element, { x: 0, y: 0 })), lower: sections.slice(1).map((section, index) => {
      const box = section.getBoundingClientRect();
      const previous = sections[index].getBoundingClientRect();
      return { index: index + 1, id: section.id, class: section.className, text: section.textContent.replace(/\s+/g, ' ').trim(), box: { x: box.x, width: box.width, height: box.height }, gapBefore: box.top - previous.bottom, nodes: staticNodes(section).map(element => facts(element, box)) };
    }) };
  }, { source, approvedReviewRefresh });
  data.headerHash = sha(data.sourceHeader);
  data.lowerHashes = data.sourceLower.map(sha);
  data.lowerBodyHash = sha(data.sourceLower.join('\n'));
  data.publishedLowerHashes = data.publishedLower.map(sha);
  delete data.sourceHeader;
  delete data.sourceLower;
  delete data.publishedLower;
  return data;
}

function compareUnchanged(label, actual, expected, compareGeometry = true) {
  check(`${label}: header source unchanged`, actual.headerHash === expected.headerHash, { actual: actual.headerHash, expected: expected.headerHash });
  check(`${label}: all 12 lower-section source hashes unchanged${approvedReviewRefresh ? ' except exact approved review copy' : ''}`, actual.lowerHashes.length === 12 && actual.lowerBodyHash === expected.lowerBodyHash, { actual: actual.lowerHashes, expected: expected.lowerHashes, published:actual.publishedLowerHashes });
  if (approvedReviewRefresh) check(`${label}: lower review counts and story exactly match approved shared values`, actual.reviewRefresh.length === 3 && actual.reviewRefresh.every(item => item.text === item.expected), actual.reviewRefresh);
  if (!compareGeometry) return;
  const differences = [];
  function compare(a, b, location) {
    if (approvedReviewRefresh && location.startsWith('lower.5.') && typeof a === 'string' && typeof b === 'string' && location.endsWith('.text')) a = a.replace('Not convinced yet? Take a look at 3,000+ reviews from our krawlers on TripAdvisor.', 'Not convinced yet? Take a look at our more than 900 positive reviews from our krawlers on TripAdvisor.').replace('3,000+ reviews', '2297 reviews').replace('2,400+ reviews', '582 reviews');
    if (typeof a === 'number' && typeof b === 'number') { if (Math.abs(a - b) > 1) differences.push({ location, actual: a, expected: b }); return; }
    if (a && b && typeof a === 'object' && typeof b === 'object') { for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) compare(a[key], b[key], `${location}.${key}`); return; }
    if (a !== b) differences.push({ location, actual: a, expected: b });
  }
  compare(actual.header, expected.header, 'header');
  compare(actual.lower, expected.lower, 'lower');
  const authorized = approvedReviewRefresh ? differences.filter(item => {
    const allowedLocation = /^(?:lower\.5\.box\.height|lower\.5\.nodes\.(?:3|9|10)\.box\.height)$/.test(item.location);
    const expectedClass = expected.lower[5]?.nodes[3]?.class?.includes('et_pb_row_17') && expected.lower[5]?.nodes[9]?.class?.includes('et_pb_text_25');
    const limit = actual.viewportWidth <= 600 ? 150 : 50;
    return allowedLocation && expectedClass && Math.abs(item.actual - item.expected) <= limit;
  }) : [];
  const unexpected = differences.filter(item => !authorized.includes(item));
  check(`${label}: header and lower-section relative geometry/styles unchanged except documented review flow`, unexpected.length === 0, { unexpected, authorizedReviewFlow:authorized });
}

async function heroInventory(page) {
  return page.locator('#ktk-seasonal-hero').evaluate(hero => {
    const box = element => { const rect = element.getBoundingClientRect(); return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }; };
    const visible = element => element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden' && getComputedStyle(element).opacity !== '0';
    const panels = [...hero.querySelectorAll('.ktk-hero-panel--regular,.ktk-hero-panel--seasonal')];
    const rayColors = panel => [...new Set([...panel.querySelectorAll('.ktk-hero-rays path')].map(path => {
      const fill = getComputedStyle(path).fill.match(/[\d.]+/g).map(Number);
      let opacity = (fill[3] ?? 1) * Number(getComputedStyle(path).fillOpacity);
      for (let node = path; node !== panel; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
      return `rgba(${fill.slice(0, 3).join(',')},${opacity})`;
    }))];
    const ranges = [];
    const canvas = document.createElement('canvas').getContext('2d');
    const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || !visible(node.parentElement) || node.parentElement.closest('svg,script,style')) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      const style = getComputedStyle(node.parentElement);
      canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const renderedText = style.textTransform === 'uppercase' ? node.textContent.toUpperCase() : node.textContent;
      const metrics = canvas.measureText(renderedText);
      ranges.push({ text: node.textContent.trim(), parent: node.parentElement.tagName + '.' + node.parentElement.className, panel: panels.findIndex(panel => panel.contains(node)), lines: [...range.getClientRects()].filter(rect => rect.width && rect.height).map(rect => {
        const scale = rect.height / (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent);
        return { x: rect.x, y: rect.y + (metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent) * scale, right: rect.right, bottom: rect.bottom - (metrics.fontBoundingBoxDescent - metrics.actualBoundingBoxDescent) * scale };
      }) });
    }
    const collisions = [];
    for (let i = 0; i < ranges.length; i++) for (let j = i + 1; j < ranges.length; j++) {
      if (ranges[i].lines.some(a => ranges[j].lines.some(b => Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1))) collisions.push([ranges[i].text, ranges[j].text]);
    }
    const decorationCollisions = [...hero.querySelectorAll('.ktk-hero-halloween-art g[fill="currentColor"] > path')]
      .filter(visible).flatMap(path => {
        const art = box(path);
        return ranges.filter(item => item.lines.some(text => Math.min(art.right, text.right) - Math.max(art.x, text.x) > 1 && Math.min(art.bottom, text.bottom) - Math.max(art.y, text.y) > 1)).map(item => ({ decoration: 'Halloween bat', art, text: item.text }));
      });
    const bounds = box(hero);
    const overflow = ranges.filter(item => item.lines.some(rect => rect.x < bounds.x - 1 || rect.right > bounds.right + 1 || rect.y < bounds.y - 1 || rect.bottom > bounds.bottom + 1));
    const panelOverflow = ranges.filter(item => {
      const panel = panels[item.panel] && box(panels[item.panel]);
      return panel && item.lines.some(rect => rect.x < panel.x - 1 || rect.right > panel.right + 1 || rect.y < panel.y - 1 || rect.bottom > panel.bottom + 1);
    });
    const regular = hero.querySelector('.ktk-hero-panel--regular');
    const textInk = element => {
      const style = getComputedStyle(element);
      canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const lines = element.innerText.split(/\n/).map(text => text.trim()).filter(Boolean);
      const measured = lines.map(text => canvas.measureText(style.textTransform === 'uppercase' ? text.toUpperCase() : text));
      const range = document.createRange(); range.selectNodeContents(element);
      const rects = [...range.getClientRects()].filter(rect => rect.width && rect.height).sort((a, b) => a.y - b.y);
      const first = rects[0]; const last = rects.at(-1);
      const fm = measured[0]; const lm = measured.at(-1);
      const scale = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
      return { text: lines.join(' / '), lineCount: lines.length, fontSize: parseFloat(style.fontSize), color: style.color, fontWeight: Number(style.fontWeight), textShadow: style.textShadow, strokeWidth: parseFloat(style.webkitTextStrokeWidth), strokeColor: style.webkitTextStrokeColor,
        inkWidth: Math.max(...measured.map(metric => metric.actualBoundingBoxLeft + metric.actualBoundingBoxRight)) * scale,
        inkTop: first.y + (fm.fontBoundingBoxAscent - fm.actualBoundingBoxAscent) * first.height / (fm.fontBoundingBoxAscent + fm.fontBoundingBoxDescent),
        inkBottom: last.bottom - (lm.fontBoundingBoxDescent - lm.actualBoundingBoxDescent) * last.height / (lm.fontBoundingBoxAscent + lm.fontBoundingBoxDescent) };
    };
    const schedule = [...regular.querySelector('.ktk-hero-schedule').children].map(textInk);
    const nyeHeading = hero.querySelector('.ktk-hero-panel--nye .ktk-hero-heading');
    const nyeTitle = nyeHeading ? ['occasion', 'brand', 'city'].map(name => ({ name, ...textInk(nyeHeading.querySelector(`.ktk-hero-${name}`)) })) : null;
    const halloweenPanel = hero.querySelector('.ktk-hero-panel--halloween');
    const halloweenTitle = halloweenPanel ? ['occasion', 'brand', 'city', 'season-pub', 'season-crawl'].map(name => ({ name, ...textInk(halloweenPanel.querySelector(`.ktk-hero-${name}`)) })) : null;
    const halloweenTime = halloweenPanel ? textInk(halloweenPanel.querySelector('.ktk-hero-halloween-detail strong')) : null;
    const halloweenDateRange = document.createRange();
    if (halloweenPanel) halloweenDateRange.selectNodeContents(halloweenPanel.querySelector('.ktk-hero-season-line'));
    const halloweenDateLines = halloweenPanel ? [...halloweenDateRange.getClientRects()].filter(rect => rect.width > 1 && rect.height > 0).length : null;
    const words = ['city', 'pub', 'crawl'].map(name => {
      const element = regular.querySelector(`.ktk-hero-${name}`);
      const range = document.createRange(); range.selectNodeContents(element);
      const rect = range.getBoundingClientRect();
      const style = getComputedStyle(element);
      canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const text = style.textTransform === 'uppercase' ? element.textContent.toUpperCase() : element.textContent;
      const metrics = canvas.measureText(text);
      const xScale = rect.width / metrics.width;
      const yScale = rect.height / (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent);
      return { name, text, color: style.color, fontSize: style.fontSize, inkWidth: (metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) * xScale,
        inkTop: rect.y + (metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent) * yScale,
        inkBottom: rect.bottom - (metrics.fontBoundingBoxDescent - metrics.actualBoundingBoxDescent) * yScale };
    });
    const brand = regular.querySelector('.ktk-hero-brand');
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const regularDesign = { words, zoom, brandInk: textInk(brand), brandGap: (box(regular.querySelector('.ktk-hero-heading')).y - box(brand).bottom) / zoom,
      panelColor: getComputedStyle(regular).backgroundColor, rayColors: rayColors(regular), brandColor: getComputedStyle(brand).color, schedule, nyeTitle, halloweenTitle, halloweenTime, halloweenDateLines, shortSchedule: matchMedia('(min-width: 1100px) and (max-height: 800px)').matches };
    const composition = panels.map(panel => {
      const copy = panel.querySelector('.ktk-hero-copy');
      const copyBox = box(copy);
      const style = getComputedStyle(copy);
      const left = copyBox.x + parseFloat(style.paddingLeft) * zoom;
      const right = copyBox.right - parseFloat(style.paddingRight) * zoom;
      const times = panel.querySelector('.ktk-hero-times');
      const banner = panel.querySelector('.ktk-hero-banner');
      const bannerRange = document.createRange();
      if (banner) bannerRange.selectNodeContents(banner);
      const bannerRect = banner && bannerRange.getBoundingClientRect();
      return { campaign: panel.dataset.campaign || 'regular', copy: copyBox, center: (left + right) / 2,
        background: getComputedStyle(panel).backgroundColor, rayColors: rayColors(panel),
        statue: box(panel.querySelector('.ktk-hero-statue-scene')), flags: panel.querySelectorAll('.ktk-hero-flag').length,
        banner: banner ? { text: banner.innerText, ink: { x: bannerRect.x, y: bannerRect.y, right: bannerRect.right, bottom: bannerRect.bottom }, align: getComputedStyle(banner).textAlign, font: getComputedStyle(banner).font } : null,
        times: times ? { box: box(times), position: getComputedStyle(times).position, values: [...times.querySelectorAll('dd')].map(textInk), labels: [...times.querySelectorAll('dt')].map(textInk) } : null,
        blocks: [...copy.children].filter(element => !element.matches('.ktk-hero-times')).map(element => ({ class: element.className, box: box(element), align: getComputedStyle(element).textAlign })) };
    });
    const reviewNav = hero.querySelector('.ktk-hero-reviews');
    const logoData = link => {
      const logo = link.querySelector('.ktk-hero-review-logo img');
      if (!logo) return null;
      const data = { src: logo.currentSrc || logo.src, complete: logo.complete && logo.naturalWidth > 0, box: box(logo), alt: logo.alt, hidden: logo.closest('[aria-hidden="true"]') !== null, paintedPixels: 0 };
      if (data.complete) {
        try {
          const surface = document.createElement('canvas'); surface.width = 24; surface.height = 24;
          const ctx = surface.getContext('2d'); ctx.drawImage(logo, 0, 0, 24, 24);
          data.paintedPixels = [...ctx.getImageData(0, 0, 24, 24).data].filter((value, index) => index % 4 === 3 && value > 0).length;
        } catch (error) { data.error = error.message; }
      }
      return data;
    };
    const reviews = reviewNav ? { box: box(reviewNav), label: reviewNav.getAttribute('aria-label'), datedNotice: reviewNav.querySelectorAll('.ktk-hero-review-date').length > 0 || /Ratings checked/i.test(reviewNav.textContent), widgets: reviewNav.querySelectorAll('iframe,script,video,audio').length,
      links: [...reviewNav.querySelectorAll('a')].map(link => ({ href: link.href, target: link.target, rel: link.rel, label: link.getAttribute('aria-label'), tabIndex: link.tabIndex, visible: !!visible(link), box: box(link),
        logo: logoData(link), name: link.querySelector('.ktk-hero-review-name').textContent.trim(), count: link.querySelector('.ktk-hero-review-count').innerText, rating: link.querySelector('.ktk-hero-review-rating')?.innerText || '',
        textBounds: [...link.querySelectorAll('.ktk-hero-review-name,.ktk-hero-review-count,.ktk-hero-review-rating')].flatMap(element => { const range = document.createRange(); range.selectNodeContents(element); return [...range.getClientRects()].map(rect => ({ x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom })); }) })) } : null;
    return { text: hero.innerText, box: bounds, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, panels: panels.map(panel => ({ box: box(panel), campaign: panel.dataset.campaign, class: panel.className })), heading: [...hero.querySelectorAll('h1')].map(element => ({ text: element.innerText, visible: !!visible(element), box: box(element) })), brands: [...hero.querySelectorAll('.ktk-hero-brand')].map(element => ({ text: element.innerText, visible: !!visible(element) })), links: [...hero.querySelectorAll('.ktk-hero-cta')].map(anchor => ({ href: anchor.href, product: anchor.dataset.productId, text: anchor.innerText })), statues: [...hero.querySelectorAll('img.ktk-hero-statue,.ktk-hero-statue img')].map(image => ({ src: image.currentSrc || image.src, complete: image.complete && image.naturalWidth > 0, visible: !!visible(image) })), regularDesign, reviews, composition, collisions, decorationCollisions, panelOverflow, overflow };
  });
}

function checkReviews(label, data) {
  const row = data.reviews;
  const names = ['Google', 'Tripadvisor', 'GetYourGuide'];
  const counts = ['2,400+ reviews', '3,000+ reviews', '100+ reviews'];
  const ratings = ['5.0', '4.9', '4.6'].map(rating => `${Number(rating)}/5`);
  const hosts = ['www.google.com', 'www.tripadvisor.com', 'www.getyourguide.com'];
  const paths = ['/maps/place/Krawl+Through+Krakow+-+Pub+crawl/', '-d2725527-', '-t443425/'];
  check(`${label}: three accessible native review sources with verified ratings and counts`, row?.links.length === 3 && /reviews/i.test(row.label) && row.links.every((link, index) => {
    const url = new URL(link.href);
    return link.name === names[index] && link.count === counts[index] && link.rating === ratings[index] && url.protocol === 'https:' && url.hostname === hosts[index] && url.pathname.includes(paths[index])
      && link.visible && link.tabIndex === 0 && link.label.includes(names[index]) && link.label.includes(`rated ${ratings[index].split('/')[0]} out of 5`) && link.label.includes('new tab') && link.target === '_blank' && link.rel.includes('noopener');
  }), row);
  if (!row) return;
  check(`${label}: review row omits the removed checked-date notice`, !row.datedNotice, row.datedNotice);
  check(`${label}: reviews form a full-width row after both hero panels`, Math.abs(row.box.x - data.box.x) <= 1 && Math.abs(row.box.width - data.box.width) <= 1
    && row.box.y >= Math.max(...data.panels.map(panel => panel.box.bottom)) - 1 && row.box.bottom <= data.box.bottom + 1, row.box);
  check(`${label}: review link text fits its own row and link bounds`, row.links.every(link => link.box.x >= row.box.x - 1 && link.box.right <= row.box.right + 1
    && link.box.y >= row.box.y - 1 && link.box.bottom <= row.box.bottom + 1 && link.textBounds.every(rect => rect.x >= link.box.x - 1 && rect.right <= link.box.right + 1 && rect.y >= link.box.y - 1 && rect.bottom <= link.box.bottom + 1)), row.links);
  const logicalWidth = data.box.width / data.regularDesign.zoom;
  const stacked = logicalWidth <= 280;
  check(`${label}: review links ${stacked ? 'stack' : 'share one row'} without overlap`, row.links.slice(1).every((link, index) => stacked
    ? link.box.y >= row.links[index].box.bottom - 1 : link.box.x >= row.links[index].box.right - 1 && Math.abs(link.box.y - row.links[index].box.y) <= 1), row.links.map(link => link.box));
  check(`${label}: review row contains links, not third-party widgets`, row.widgets === 0, row.widgets);
  const logoFiles = ['review-google.svg', 'review-tripadvisor.png', 'review-getyourguide.svg'];
  check(`${label}: three local platform logos decode and paint nonblank pixels`, row.links.every((link, index) => link.logo?.complete && link.logo.paintedPixels > 12
    && new URL(link.logo.src).origin === target.origin && new URL(link.logo.src).pathname.endsWith('/ktk-homepage-assets/' + logoFiles[index])
    && link.logo.alt === '' && link.logo.hidden && link.logo.box.width > 0 && link.logo.box.height > 0), row.links.map(link => link.logo));
  check(`${label}: platform logos stay inside their links`, row.links.every(link => link.logo && link.logo.box.x >= link.box.x - 1 && link.logo.box.right <= link.box.right + 1
    && link.logo.box.y >= link.box.y - 1 && link.logo.box.bottom <= link.box.bottom + 1), row.links.map(link => ({ link: link.box, logo: link.logo?.box })));
  if (logicalWidth > 280 && logicalWidth <= 767) check(`${label}: mobile review row stays compact`, row.box.height / data.regularDesign.zoom <= 125, row.box.height / data.regularDesign.zoom);
}

function checkHero(label, data, width, variant, reference) {
  const campaign = campaignFor(variant);
  check(`${label}: semantic visible Krakow Pub Crawl H1`, data.heading.length === 1 && data.heading[0].visible && /Krak[o\u00f3]w\s+Pub\s+Crawl/i.test(data.heading[0].text), data.heading);
  check(`${label}: visible brand is real HTML`, data.brands.some(brand => brand.visible && /Krawl\s+Through\s+Krak[o\u00f3]w/i.test(brand.text)), data.brands);
  check(`${label}: no hero price`, !/\bPLN\b|\bz[l\u0142]\b|[\u20ac\u00a3$]/i.test(data.text), data.text);
  check(`${label}: regular and expected seasonal panels`, data.panels.length === 2 && data.panels[1].campaign === campaign, data.panels);
  if (campaign === 'nye') check(`${label}: NYE date is 31 December 2026`, /31\s+DECEMBER\s+2026/i.test(data.text), data.text);
  else check(`${label}: Halloweekend heading, three dates, prize copy and CTA remain visible`, /HALLOWEEKEND/i.test(data.text)
    && /THURSDAY\s+29\s+FRIDAY\s+30\s+&\s+SATURDAY\s+31/i.test(data.text)
    && /BEST COSTUMES WIN PRIZES\./i.test(data.text)
    && /BOOK\s+HALLOWEEN\b/i.test(data.links[1]?.text || ''), data.text);
  if (data.panels.length === 2) {
    const [a, b] = data.panels.map(panel => panel.box);
    const stacked = width < 1100;
    check(`${label}: panels use ${stacked ? 'stacked' : 'side-by-side'} layout`, stacked ? b.y >= a.bottom - 1 && Math.abs(a.x - b.x) <= 1 : b.x >= a.right - 1 && Math.abs(a.y - b.y) <= 1, { a, b });
  }
  check(`${label}: no text collisions`, data.collisions.length === 0, data.collisions);
  check(`${label}: Halloween decorations do not intersect text`, data.decorationCollisions.length === 0, data.decorationCollisions);
  check(`${label}: hero text stays in bounds`, data.overflow.length === 0, data.overflow);
  if (reference) check(`${label}: no new horizontal page overflow`, data.scrollWidth <= Math.max(data.clientWidth, reference.inventory.scrollWidth) + 1, { scrollWidth: data.scrollWidth, clientWidth: data.clientWidth, baseline: reference.inventory.scrollWidth });
  check(`${label}: original regular and shared seasonal SVGs decode`, data.statues.length === 2 && data.statues.every((image, index) => image.complete && image.visible && new URL(image.src).pathname.endsWith(index === 0 ? '/hero-statue-regular.svg' : '/hero-statue-seasonal.svg')), data.statues);
  checkProductLinks(label, data, variant);
}

function checkProductLinks(label, data, variant) {
  const expected = [['28', 'pub-crawl-28'], campaignFor(variant) === 'nye' ? ['32', 'nye-pub-crawl-32'] : ['51', 'halloween-pub-crawl-51']];
  check(`${label}: native CTAs identify correct products`, data.links.length === 2 && data.links.every((link, index) => {
    const url = new URL(link.href);
    return url.origin === 'https://krawlthroughkrakow.com' && url.pathname === `/staging/store2/${expected[index][1]}/` && url.hash === '#book' && link.product === expected[index][0];
  }), data.links);
}

function checkRegularDesign(label, data, variant) {
  const campaign = campaignFor(variant);
  const design = data.regularDesign;
  const widths = design.words.map(word => word.inkWidth);
  const widthRatio = Math.min(...widths) / Math.max(...widths);
  check(`${label}: KRAKOW, PUB and CRAWL have near-equal ink widths`, widthRatio >= 0.96, { widthRatio, words: design.words });
  const gaps = design.words.slice(1).map((word, index) => ({ gap: (word.inkTop - design.words[index].inkBottom) / design.zoom,
    nextHeight: (word.inkBottom - word.inkTop) / design.zoom }));
  check(`${label}: heading word spacing is compact without ink overlap`, gaps.every(item => item.gap >= -1 && item.gap <= Math.max(8, item.nextHeight * 0.24)), gaps);
  check(`${label}: regular brand keeps a two-pixel heading gap`, Math.abs(design.brandGap - 2) <= 0.5, design.brandGap);
  const brandInkGap = (design.words[0].inkTop - design.brandInk.inkBottom) / design.zoom;
  check(`${label}: regular brand and Krakow ink stay close without overlap`, brandInkGap >= 0 && brandInkGap <= 6.5, brandInkGap);
  const rays = design.rayColors.map(color => composite(color, design.panelColor));
  const pink = value => { const [r, g, b] = Array.isArray(value) ? value : rgb(value); return r > g + 8 && b > g + 3 && r > b; };
  const dark = value => (Array.isArray(value) ? value : rgb(value)).every(channel => channel < 50);
  check(`${label}: regular panel uses the correct campaign theme`, campaign === 'nye'
    ? dark(design.panelColor) && rays.every(dark)
    : pink(design.panelColor) && rays.every(pink), { panel: design.panelColor, rays: design.rayColors, compositedRays: rays });
  check(`${label}: regular brand uses the requested campaign color`, campaign === 'nye'
    ? rgb(design.brandColor).every(channel => channel >= 220)
    : pink(design.brandColor), design.brandColor);
  const contrasts = [design.panelColor, ...rays].map(color => contrast(design.brandColor, color));
  check(`${label}: small brand text remains readable on all ray colors`, contrasts.every(ratio => ratio >= 4.5), { brand: design.brandColor, backgrounds: [design.panelColor, ...rays], contrasts });
  const scheduleWidths = design.schedule.map(row => row.inkWidth);
  const scheduleRatio = Math.min(...scheduleWidths) / Math.max(...scheduleWidths);
  const logicalWidth = data.box.width / design.zoom;
  const expectedAdam = design.shortSchedule ? 22 : logicalWidth >= 1700 ? 36 : logicalWidth >= 600 ? 32 : logicalWidth >= 360 ? 21 : 19;
  check(`${label}: Adam Statue keeps its existing responsive font size`, Math.abs(design.schedule[2].fontSize - expectedAdam) < 0.1, { expectedAdam, actual: design.schedule[2].fontSize });
  check(`${label}: three schedule rows have equal visual widths`, scheduleRatio >= 0.97, { scheduleRatio, rows: design.schedule });
  const scheduleGaps = design.schedule.slice(1).map((row, index) => (row.inkTop - design.schedule[index].inkBottom) / design.zoom);
  check(`${label}: schedule row gaps are tight and positive`, scheduleGaps.every(gap => gap >= 1 && gap <= 6.5), scheduleGaps);
  if (campaign !== 'nye') check(`${label}: pink-panel Krakow and 9 PM use white text`, [design.words[0].color, design.schedule[1].color].every(color => rgb(color).every(channel => channel >= 250)), { city: design.words[0].color, time: design.schedule[1].color });
  if (design.nyeTitle) {
    const titleGaps = design.nyeTitle.slice(1).map((row, index) => (row.inkTop - design.nyeTitle[index].inkBottom) / design.zoom);
    check(`${label}: NYE brand and Krakow use white text`, design.nyeTitle.slice(1).every(row => rgb(row.color).every(channel => channel >= 250)), design.nyeTitle);
    check(`${label}: NYE heading gaps stay minimal with halo clearance`, titleGaps.every(gap => gap >= 1 && gap <= 6.5), titleGaps);
  }
  if (design.halloweenTitle) {
    const title = design.halloweenTitle;
    check(`${label}: Halloweekend dates occupy exactly three rendered lines`, design.halloweenDateLines === 3, design.halloweenDateLines);
    const expectedCity = design.shortSchedule ? 42 : logicalWidth >= 1700 ? 52 : logicalWidth >= 1100 && logicalWidth < 1300 ? 34 : logicalWidth > 599 ? 42 : logicalWidth > 359 ? 28 : logicalWidth > 280 ? 24 : 20;
    check(`${label}: Halloween Krakow keeps its existing responsive font size`, Math.abs(title[2].fontSize - expectedCity) < 0.1, { expectedCity, actual: title[2].fontSize });
    const inkWidths = [...title.slice(1), design.halloweenTime].map(row => row.inkWidth);
    const ratio = Math.min(...inkWidths) / Math.max(...inkWidths);
    check(`${label}: Halloween brand, Krakow, Pub, Crawl and 9 PM have equal ink widths`, ratio >= 0.97, { ratio, rows: [...title.slice(1), design.halloweenTime] });
    check(`${label}: Halloween brand and Pub use source pink`, [title[1], title[3]].every(row => rgb(row.color).every((channel, index) => channel === [217, 53, 116][index])), [title[1], title[3]]);
    check(`${label}: Halloween explainer is replaced by large pink 9 PM`, design.halloweenTime.text === '9 PM' && rgb(design.halloweenTime.color).every((channel, index) => channel === [217, 53, 116][index]) && !/Join the regular crawl|Every night at 9 PM/i.test(data.text), design.halloweenTime);
    const titleGaps = title.slice(1).map((row, index) => (row.inkTop - title[index].inkBottom) / design.zoom);
    check(`${label}: Halloween, brand and Krakow gaps stay tight with halo clearance`, titleGaps.slice(0, 2).every(gap => gap >= 1 && gap <= 6.5), titleGaps.slice(0, 2));
    check(`${label}: Halloween Pub and Crawl retain compact non-overlapping spacing`, titleGaps.slice(2).every((gap, index) => gap >= 0 && gap <= Math.max(8, (title[index + 3].inkBottom - title[index + 3].inkTop) / design.zoom * 0.12)), titleGaps.slice(2));
    const panel = data.composition[1];
    const backgrounds = [panel.background, ...panel.rayColors.map(color => composite(color, panel.background))];
    const titleContrast = [title[1], title[3]].map(row => textContrast(row, backgrounds));
    check(`${label}: Halloween pink text has verified fill or halo contrast`, titleContrast.every(value => value.pass), titleContrast);
  }
}

function checkComposition(label, data, variant) {
  const campaign = campaignFor(variant);
  const zoom = data.regularDesign.zoom;
  const logicalWidth = data.box.width / zoom;
  const outsidePanels = data.composition.flatMap((panel, index) => [...panel.blocks, ...(panel.times ? [{ class: 'ktk-hero-times', box: panel.times.box }] : [])].filter(block => {
    const own = data.panels[index].box;
    return block.box.x < own.x - 1 || block.box.right > own.right + 1 || block.box.y < own.y - 1 || block.box.bottom > own.bottom + 1;
  }).map(block => ({ campaign: panel.campaign, panel: data.panels[index].box, ...block })));
  check(`${label}: all copy blocks, CTA and text stay inside their own panel`, outsidePanels.length === 0 && data.panelOverflow.length === 0, { blocks: outsidePanels, text: data.panelOverflow });
  const offCenter = data.composition.flatMap(panel => panel.blocks.filter(block => Math.abs((block.box.x + block.box.right) / 2 - panel.center) > zoom * 2 || block.align !== 'center').map(block => ({ campaign: panel.campaign, center: panel.center, ...block })));
  check(`${label}: text and CTA blocks are centered in their copy columns`, offCenter.length === 0, offCenter);
  check(`${label}: copy columns stay left of statues or reflow above them`, data.composition.every(panel => logicalWidth > 280 ? panel.center < (panel.statue.x + panel.statue.right) / 2 : panel.statue.y >= panel.copy.bottom - 1), data.composition);
  check(`${label}: only the NYE statue carries a flag`, data.composition[0].flags === 0 && data.composition[1].flags === (campaign === 'nye' ? 1 : 0), data.composition.map(panel => ({ campaign: panel.campaign, flags: panel.flags })));
  const banners = data.composition.map(panel => panel.banner);
  check(`${label}: two captions form the spanning poster title`, banners.every(Boolean) && banners.map(banner => banner.text).join(' ').replace(/\s+/g, ' ').trim().toLowerCase() === 'the original & best pubcrawl in krakow', banners);
  if (banners.every(Boolean)) {
    const [first, last] = banners;
    const boundary = data.panels[1].box.x;
    check(`${label}: poster title aligns across the seam or centers on mobile`, logicalWidth >= 1100
      ? Math.abs(first.ink.y - last.ink.y) <= zoom && Math.abs(first.ink.right - boundary) <= 12 * zoom && Math.abs(last.ink.x - boundary) <= 12 * zoom && first.font === last.font
      : banners.every((banner, index) => banner.align === 'center' && Math.abs((banner.ink.x + banner.ink.right) / 2 - (data.panels[index].box.x + data.panels[index].box.right) / 2) <= zoom * 2), banners);
    check(`${label}: poster title stays above the main text`, banners.every((banner, index) => banner.ink.bottom <= data.composition[index].blocks[0].box.y + zoom), banners);
  }
  if (campaign === 'nye') {
    const panel = data.composition[1];
    const backgrounds = [panel.background, ...panel.rayColors.map(color => composite(color, panel.background))];
    const timeContrast = [...panel.times.values, ...panel.times.labels].map(row => textContrast(row, backgrounds));
    check(`${label}: NYE timing text is readable through fill or a solid surrounding halo`, timeContrast.every(value => value.pass), timeContrast);
    const titleContrast = data.regularDesign.nyeTitle.slice(1).map(row => textContrast(row, backgrounds));
    check(`${label}: NYE white brand and city have verified fill or halo contrast`, titleContrast.every(value => value.pass), titleContrast);
    if (logicalWidth < 600) check(`${label}: mobile NYE has black labels and white time values`, panel.times.values.every(row => rgb(row.color).every(channel => channel >= 250)) && panel.times.labels.every(row => rgb(row.color).every(channel => channel === 0)), panel.times);
    if (logicalWidth > 280 && logicalWidth < 600) {
      check(`${label}: mobile NYE times occupy the right column`, panel.times.position === 'absolute' && panel.times.box.x >= panel.statue.right - 2 * zoom && panel.times.box.right <= data.box.right + 1, panel);
    } else if (logicalWidth <= 280) {
      check(`${label}: narrow zoom returns NYE times to reading order`, panel.times.position === 'static' && panel.times.box.x >= panel.copy.x - 1 && panel.times.box.right <= panel.copy.right + 1 && panel.times.box.bottom <= panel.statue.y + 1, panel);
    }
  }
}

async function checkTimingOcclusion(page, label) {
  for (const viewportPosition of [0.05, 0.2, 0.35, 0.55, 0.8]) {
    await page.locator('.ktk-hero-times').evaluate((element, position) => scrollTo(0, element.getBoundingClientRect().top + scrollY - innerHeight * position), viewportPosition);
    await page.waitForTimeout(200);
    const visible = await page.evaluate(() => {
    const hero = document.querySelector('#ktk-seasonal-hero');
    const cta = document.querySelector('#ktk-cta');
    const ctaVisible = cta.getClientRects().length > 0 && getComputedStyle(cta).visibility !== 'hidden';
    const rect = cta.getBoundingClientRect();
    const collisions = [...document.querySelectorAll('.ktk-hero-times dt,.ktk-hero-times dd')].flatMap(element => {
      const text = element.getBoundingClientRect();
      const width = Math.min(rect.right, text.right) - Math.max(rect.x, text.x);
      const height = Math.min(rect.bottom, text.bottom) - Math.max(rect.y, text.y);
      return ctaVisible && width > 1 && height > 1 ? [{ text: element.textContent, width, height }] : [];
    });
    const reviews = hero.querySelector('.ktk-hero-reviews').getBoundingClientRect();
    return { ctaVisible, containerWidth: hero.clientWidth, reviewsVisible: reviews.top < innerHeight && reviews.bottom > 0, collisions };
    });
    check(`${label}: floating booking CTA stays visible without obscuring NYE timings at ${viewportPosition}`, visible.collisions.length === 0 && visible.ctaVisible, visible);
  }
  await page.locator('#ktk-seasonal-hero').evaluate(element => scrollTo(0, element.getBoundingClientRect().bottom + scrollY + 50));
  await page.waitForTimeout(200);
  check(`${label}: floating booking CTA stays visible below the hero`, await page.locator('#ktk-cta').isVisible());
  await page.evaluate(() => scrollTo(0, 0));
}

async function checkBookingLabelAlignment(page, label) {
  const buttons = await page.locator('.ktk-hero-cta').evaluateAll(elements => elements.map(element => {
    const button = element.getBoundingClientRect();
    const text = element.querySelector('span').getBoundingClientRect();
    const icon = element.querySelector('svg').getBoundingClientRect();
    return { label: element.textContent.trim(), justifyContent: getComputedStyle(element).justifyContent, offset: Math.abs((text.left + icon.right) / 2 - (button.left + button.right) / 2), fits: text.left >= button.left && icon.right <= button.right };
  }));
  check(`${label}: booking labels and arrows form a centered group`, buttons.every(button => button.justifyContent === 'center' && button.offset <= 1 && button.fits), buttons);
}

try {
  for (const width of widths) for (const variant of variants) {
    const context = await contextFor(width);
    const name = `${variant}-${width}`;
    try {
      const page = await context.newPage();
      page.on('pageerror', error => report.pageErrors.push({ name, message: error.message }));
      const source = await load(page, variant);
      const inventory = await unchangedInventory(page, source);
      const result = { variant, viewport: viewport(width), inventory, sourceSha256: sha(source), stylesheets: await page.locator('link[rel="stylesheet"]').evaluateAll(elements => elements.map(element => element.href)) };
      const heroCss = result.stylesheets.find(href => new URL(href).pathname.endsWith('/hero.css'));
      if (heroCss) result.heroCssSha256 = sha(await (await context.request.get(heroCss)).body());
      report.captures.push(result);
      if (capture) {
        await page.evaluate(() => { document.documentElement.style.zoom = '2'; scrollTo(0, 0); });
        result.zoomScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        continue;
      }
      const reference = baseline.captures.find(item => item.viewport.width === width);
      if (!reference && !heroOnly && !approvedReviewRefresh) throw new Error(`Missing ${width}px source baseline`);
      if (!heroOnly) {
        compareUnchanged(name, inventory, (reference || baseline.captures[0]).inventory, Boolean(reference));
        if (!reference) result.baselineComparison = 'Supplemental viewport has no original geometry capture; immutable header/lower source hashes still compared, all hero bounds remain checked.';
      }
      else result.baselineComparison = 'Explicitly omitted for supplemental short-height hero checks; standard-height suite verifies unchanged sections. Page-level overflow comparison is omitted for widths without a source baseline; hero glyph bounds remain checked.';
      const hero = await heroInventory(page);
      if (approvedReviewRefresh) check(`${name}: corrected mobile widgets create no horizontal document overflow`, hero.scrollWidth <= hero.clientWidth, { scrollWidth:hero.scrollWidth, clientWidth:hero.clientWidth });
      result.hero = hero;
      checkHero(name, hero, width, variant, reference);
      checkRegularDesign(name, hero, variant);
      checkComposition(name, hero, variant);
      checkReviews(name, hero);
      await checkBookingLabelAlignment(page, name);
      if (campaignFor(variant) === 'nye') await checkTimingOcclusion(page, name);
      for (const src of new Set(hero.statues.map(image => image.src))) {
        const response = await context.request.get(src);
        const svg = await response.text();
        const expectedViewBox = new URL(src).pathname.endsWith('/hero-statue-regular.svg') ? '0 0 490 613' : '0 0 296 617';
        check(`${name}: statue file contains original vector dimensions without raster backing`, response.ok() && /<svg\b/.test(svg) && /<path\b[^>]*\bd=/.test(svg) && svg.includes(`viewBox="${expectedViewBox}"`) && !/<image\b|<foreignObject\b|<script\b|data:image\/(?:png|jpe?g|webp)|\.(?:png|jpe?g|webp)(?:["'#?])|(?:xlink:)?href=["'](?!#)/i.test(svg), { src, sha256: sha(svg), expectedViewBox });
      }
      for (const [suffix, locator] of [['viewport', page], ['hero', page.locator('#ktk-seasonal-hero')], ['reviews', page.locator('.ktk-hero-reviews')]]) {
        const file = `${label}-${name}-${suffix}.png`;
        if (suffix === 'reviews') {
          await locator.evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY - innerHeight * 0.25));
          await page.waitForTimeout(200);
          const containerWidth = await page.locator('#ktk-seasonal-hero').evaluate(element => element.clientWidth);
          const floatingVisible = await page.locator('#ktk-cta').isVisible();
          const reviewOverlap = await page.evaluate(() => {
            const tab = document.querySelector('#ktk-cta').getBoundingClientRect();
            const reviews = document.querySelector('.ktk-hero-reviews').getBoundingClientRect();
            return Math.min(tab.right, reviews.right) > Math.max(tab.left, reviews.left)
              && Math.min(tab.bottom, reviews.bottom) > Math.max(tab.top, reviews.top);
          });
          check(`${name}: floating booking tab remains visible by the review row`, floatingVisible && (containerWidth > 1099 || !reviewOverlap), { containerWidth, floatingVisible, reviewOverlap });
          const viewportFile = `${label}-${name}-reviews-viewport.png`;
          await page.screenshot({ path: path.join(out, viewportFile) }); report.screenshots.push(viewportFile);
        }
        await locator.screenshot({ path: path.join(out, file) }); report.screenshots.push(file);
      }
      if (width < 600) {
        await page.locator('.ktk-hero-panel--seasonal').evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY));
        await page.waitForTimeout(100);
        const file = `${label}-${name}-seasonal-viewport.png`;
        await page.screenshot({ path: path.join(out, file) }); report.screenshots.push(file);
      }
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; scrollTo(0, 0); });
      const zoomed = await heroInventory(page);
      result.zoomed = zoomed;
      checkRegularDesign(`${name} at 200% CSS zoom`, zoomed, variant);
      checkComposition(`${name} at 200% CSS zoom`, zoomed, variant);
      checkReviews(`${name} at 200% CSS zoom`, zoomed);
      await checkBookingLabelAlignment(page, `${name} at 200% CSS zoom`);
      if (campaignFor(variant) === 'nye') await checkTimingOcclusion(page, `${name} at 200% CSS zoom`);
      check(`${name}: 200% CSS zoom has no hero text collision or clipping`, zoomed.collisions.length === 0 && zoomed.overflow.length === 0, { collisions: zoomed.collisions, overflow: zoomed.overflow });
      check(`${name}: 200% CSS zoom has no Halloween decoration/text intersection`, zoomed.decorationCollisions.length === 0, zoomed.decorationCollisions);
      if (reference) check(`${name}: 200% CSS zoom introduces no horizontal overflow`, zoomed.scrollWidth <= Math.max(zoomed.clientWidth, reference.zoomScrollWidth) + 1, { scrollWidth: zoomed.scrollWidth, clientWidth: zoomed.clientWidth, baseline: reference.zoomScrollWidth });
      const zoomFile = `${label}-${name}-zoom.png`;
      await page.locator('#ktk-seasonal-hero').screenshot({ path: path.join(out, zoomFile) });
      report.screenshots.push(zoomFile);
      await page.evaluate(() => { document.documentElement.style.zoom = ''; scrollTo(0, 0); });
      if (width === 390 || width === 1440) {
        await page.locator('.ktk-hero-cta').first().focus();
        await page.keyboard.press('Tab');
        const focus = await page.locator('.ktk-hero-cta').nth(1).evaluate(element => ({ active: document.activeElement === element, visible: element.matches(':focus-visible'), outline: getComputedStyle(element).outline, shadow: getComputedStyle(element).boxShadow }));
        check(`${name}: seasonal booking CTA is reachable with keyboard focus`, focus.active && focus.visible, focus);
        for (let index = 0; index < 3; index++) {
          await page.keyboard.press('Tab');
          const reviewFocus = await page.locator('.ktk-hero-reviews a').nth(index).evaluate(element => ({ active: document.activeElement === element, visible: element.matches(':focus-visible'), outlineWidth: parseFloat(getComputedStyle(element).outlineWidth) }));
          check(`${name}: review link ${index + 1} has visible keyboard focus`, reviewFocus.active && reviewFocus.visible && reviewFocus.outlineWidth >= 2, reviewFocus);
        }
        await page.evaluate(() => scrollTo(0, 0));
      }
      if (width === 390) {
        const toggle = page.locator('.mobile_menu_bar:visible');
        await toggle.click();
        check(`${name}: mobile navigation still opens`, await toggle.getAttribute('aria-expanded') === 'true' && await page.locator('#mobile_menu').isVisible());
        await page.keyboard.press('Escape');
        check(`${name}: Escape closes navigation`, await toggle.getAttribute('aria-expanded') === 'false');
      }
      await page.evaluate(() => scrollTo(0, 600));
      const header = await page.locator('#main-header').evaluate(element => ({ bottom: element.getBoundingClientRect().bottom, position: getComputedStyle(element).position }));
      check(`${name}: header remains non-fixed`, header.bottom <= 0 && !['fixed', 'sticky'].includes(header.position), header);
    } catch (error) { check(`${name}: scenario completed`, false, error.stack || error.message); }
    finally { await context.close(); }
  }
  if (!capture) for (const variant of variants) {
    const context = await contextFor(390, { javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto(variantUrl(variant), { waitUntil: 'domcontentloaded', timeout: 60000 });
      // Scripting-disabled documents do not wait for CSS at DOMContentLoaded;
      // poll from Node because their animation-frame callbacks may not run.
      const cssDeadline = Date.now() + 30000;
      while (!await page.evaluate(() => ['parity.css', 'parity-runtime.css', 'hero.css'].every(file =>
        [...document.querySelectorAll('link[rel="stylesheet"]')].some(link => new URL(link.href).pathname.endsWith('/' + file) && link.sheet)))) {
        if (Date.now() > cssDeadline) throw new Error('Homepage stylesheets did not load.');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await page.evaluate(async () => {
        const heading = document.querySelector('.ktk-hero-heading');
        heading.getBoundingClientRect();
        const style = getComputedStyle(heading);
        await document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, 'EVERY NIGHT 9 PM ADAM STATUE KRAWL THROUGH KRAKOW');
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('.ktk-hero-review-logo img')].map(image => image.decode().catch(() => {})));
      });
      const data = await heroInventory(page);
      check(`No JS ${variant}: heading and native booking links remain`, data.heading.length === 1 && data.heading[0].visible && data.links.length === 2 && data.links.every(link => /^https:\/\/krawlthroughkrakow.com\/staging\/store2\//.test(link.href)), data.links);
      checkProductLinks(`No JS ${variant}`, data, variant);
      checkRegularDesign(`No JS ${variant}`, data, variant);
      checkComposition(`No JS ${variant}`, data, variant);
      checkReviews(`No JS ${variant}`, data);
    } catch (error) { check(`No JS ${variant}: scenario completed`, false, error.message); }
    finally { await context.close(); }
  }
} finally {
  await browser.close();
  check('No uncaught browser JavaScript errors', report.pageErrors.length === 0, report.pageErrors);
  report.summary = { pass: report.checks.filter(item => item.pass).length, fail: report.checks.filter(item => !item.pass).length, captures: report.captures.length };
  const file = capture ? baselineFile : path.join(out, `${label}-report.json`);
  await writeFile(file, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report.summary, file, failures: report.checks.filter(item => !item.pass).map(item => ({ name: item.name, detail: item.detail })) }, null, 2));
  if (report.summary.fail) process.exitCode = 1;
}
