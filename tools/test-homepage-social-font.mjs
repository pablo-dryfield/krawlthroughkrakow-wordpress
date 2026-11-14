import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { socialFontFiles, socialFontCodepoints } from './homepage-social-font.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const [base, baseline, output] = process.argv.slice(2);
const cacheBusted = process.argv.includes('--cache-bust');
if (!['http://127.0.0.1:5184/', 'https://krawlthroughkrakow.com/staging/'].includes(base)
    || !/^[a-f0-9]{40}$/.test(baseline || '') || !output) throw new Error('Explicit preview/staging URL, Git baseline and fresh output directory required');
try { await readFile(path.join(output, 'report.json')); throw new Error('Preserve previous evidence'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(output, { recursive: true });
const root = 'staging/wp-content/mu-plugins/ktk-homepage-assets/';
const oldCss = execFileSync('git', ['show', `${baseline}:${root}parity-runtime.css`]);
const inputs = [root + 'parity-runtime.css', ...Object.keys(socialFontFiles).map(file => root + file),
  'tools/test-homepage-social-font.mjs', 'tools/homepage-social-font.mjs', 'tools/build-homepage-social-font.py'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHashes = {};
for (const file of inputs) sourceHashes[file] = hash(await readFile(file));
const report = { checkedAt: new Date().toISOString(), base, baseline, sourceHashes,
  cacheBusted,
  scope: 'Original/candidate homepage CSS, both campaigns, four widths, JS/no-JS; exact social glyph pixels and fallback. Providers and all non-read requests aborted.',
  checks: [], errors: [], screenshots: [], blockedNonReadRequests: 0, blockedOutsideScopeRequests: 0 };
const check = (name, pass, detail) => report.checks.push({ name, pass: Boolean(pass), detail });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const prefix = base.startsWith('http://127.') ? '/ktk-homepage-assets/' : '/staging/wp-content/mu-plugins/ktk-homepage-assets/';
async function deadline(promise, description) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(description + ' exceeded20 seconds')), 20000); })]); }
  finally { clearTimeout(timer); }
}
async function visit(width, campaign, javascript, reference, fallback = false) {
  const context = await browser.newContext({ viewport: { width, height: 900 },
    javaScriptEnabled: javascript, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const fonts = [];
  await context.addInitScript(() => { Date.now = () => 1794657600000; window.__KTK_FREEZE_CAROUSELS__ = true; });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) { report.blockedNonReadRequests++; return route.abort(); }
    if (url.origin !== new URL(base).origin || base.startsWith('https:')
        && !url.pathname.startsWith('/staging/')
        && url.pathname !== '/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js') {
      report.blockedOutsideScopeRequests++;
      return route.abort();
    }
    if (reference && url.pathname === prefix + 'parity-runtime.css') {
      return route.fulfill({ status: 200, contentType: 'text/css', body: oldCss });
    }
    if (fallback && url.pathname === prefix + 'social-icons-homepage.woff2') return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.on('response', response => {
    if (/social-icons-homepage\.woff2|114236a5fb48-fa-brands-400\.woff2/.test(response.url())) fonts.push(response);
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const url = new URL(base);
    if (campaign === 'halloween') url.searchParams.set('ktk_hero', campaign);
    if (cacheBusted) url.searchParams.set('ktk_social_font_check', String(Date.now()));
    const response = await page.goto(url.href, { waitUntil: 'load', timeout: 60000 });
    if (response.status() !== 200) throw new Error('Homepage HTTP' + response.status());
    await deadline(page.evaluate(() => document.fonts.ready.then(() => true)), 'Native font loading');
    await deadline(page.evaluate(async () => {
      for (const image of document.images) if (image.complete && image.naturalWidth) await image.decode();
    }), 'Visible image decoding');
    return { context, page, fonts, errors };
  } catch (error) { await context.close(); throw error; }
}
async function state(page) {
  return page.evaluate(() => {
    const glyphs = [];
    for (const element of document.querySelectorAll('.et_pb_social_media_follow a')) {
      const style = getComputedStyle(element, '::before'), box = element.getBoundingClientRect();
      if (!/FontAwesome/.test(style.fontFamily)) continue;
      glyphs.push({ content: style.content, family: style.fontFamily, size: style.fontSize,
        color: style.color, weight: style.fontWeight, bounds: [box.x, box.y, box.width, box.height] });
    }
    return { glyphs, headings: [...document.querySelectorAll('h1,h2,h3')].map(element => {
      const box = element.getBoundingClientRect(), style = getComputedStyle(element);
      return { text: element.textContent, bounds: [box.x, box.y, box.width, box.height],
        family: style.fontFamily, size: style.fontSize, weight: style.fontWeight };
    }), statues: [...document.querySelectorAll('.ktk-hero-statue')].map(image => ({
      src: image.getAttribute('src'), width: image.getAttribute('width'), height: image.getAttribute('height'),
      complete: image.complete && image.naturalWidth > 0,
    })), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
}
try {
  for (const campaign of ['nye', 'halloween']) for (const width of [320, 390, 768, 1440]) for (const javascript of [true, false]) {
    const label = `${campaign} ${width} JS${javascript}`;
    const states = [];
    for (const reference of [true, false]) {
      const visitState = await visit(width, campaign, javascript, reference);
      try {
        const current = await state(visitState.page); states.push(current);
        check(label + (reference ? ' reference' : ' candidate') + ' original glyphs/artwork/no overflow',
          current.glyphs.length === 4 && current.statues.length === 2 && current.statues.every(image => image.complete) && !current.overflow, current);
        check(label + ' page errors ' + reference, !visitState.errors.length, visitState.errors);
        const fonts = [];
        for (const response of visitState.fonts) {
          const bytes = await response.body();
          fonts.push({ file: new URL(response.url()).pathname.split('/').at(-1), status: response.status(), bytes: bytes.length, sha256: hash(bytes) });
        }
        const file = reference ? 'parity/114236a5fb48-fa-brands-400.woff2' : 'social-icons-homepage.woff2';
        check(label + ' exact active font ' + reference,
          fonts.length === 1 && fonts[0].status === 200 && fonts[0].sha256 === socialFontFiles[file], fonts);
        if (width === 390 && javascript) {
          const filename = `${campaign}-${reference ? 'before' : 'after'}-390.png`;
          await visitState.page.screenshot({ path: path.join(output, filename), animations: 'disabled' });
          report.screenshots.push(filename);
        }
      } finally { await visitState.context.close(); }
    }
    check(label + ' exact glyph geometry/style/headings/artwork', JSON.stringify(states[0]) === JSON.stringify(states[1]));
    console.log(label + ' complete');
  }
  const { context, page } = await visit(390, 'nye', true, false);
  try {
    const atlas = await deadline(page.evaluate(async ({ prefix, codepoints }) => {
      const families = ['SocialOriginal', 'SocialDerivative'];
      for (const [index, file] of ['parity/114236a5fb48-fa-brands-400.woff2', 'social-icons-homepage.woff2'].entries()) {
        const face = new FontFace(families[index], `url("${prefix + file}")`, { weight: '400' });
        await face.load(); document.fonts.add(face);
      }
      const variants = []; let png;
      for (const size of [16, 20, 24, 32, 56, 96]) for (const offset of [0, 0.5]) {
        const images = [], metrics = [];
        for (const family of families) {
          const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 128;
          const paint = canvas.getContext('2d', { willReadFrequently: true });
          paint.fillStyle = '#fff'; paint.fillRect(0, 0, 320, 128);
          paint.fillStyle = '#000'; paint.font = `${size}px ${family}`;
          metrics.push(codepoints.map((point, index) => {
            const text = String.fromCodePoint(point), m = paint.measureText(text);
            paint.fillText(text, 16 + index * 144 + offset, 104 + offset);
            return [m.width, m.actualBoundingBoxLeft, m.actualBoundingBoxRight, m.actualBoundingBoxAscent, m.actualBoundingBoxDescent];
          }));
          images.push(paint.getImageData(0, 0, 320, 128).data);
          if (size === 56 && offset === 0 && family === families[1]) png = canvas.toDataURL();
        }
        let different = 0, ink = 0;
        for (let index = 0; index < images[0].length; index += 4) {
          if (images[0][index] < 255) ink++;
          if ([0, 1, 2, 3].some(channel => images[0][index + channel] !== images[1][index + channel])) different++;
        }
        variants.push({ size, offset, different, ink, metricsExact: JSON.stringify(metrics[0]) === JSON.stringify(metrics[1]) });
      }
      return { variants, png };
    }, { prefix, codepoints: socialFontCodepoints }), 'Exact original/derivative glyph atlas');
    await writeFile(path.join(output, 'social-glyphs.png'), Buffer.from(atlas.png.split(',')[1], 'base64'));
    delete atlas.png;
    check('twelve real glyph atlas variants have exact nonblank RGBA/metrics',
      atlas.variants.length === 12 && atlas.variants.every(row => row.different === 0 && row.metricsExact && row.ink > 10), atlas);
    const menu = page.locator('#et_mobile_nav_menu .mobile_menu_bar');
    await menu.focus(); await page.keyboard.press('Enter');
    check('original keyboard menu still opens', await menu.getAttribute('aria-expanded') === 'true');
    await page.keyboard.press('Escape');
    check('original keyboard menu still closes', await menu.getAttribute('aria-expanded') === 'false');
    await page.locator('.et_pb_gallery_image a').first().click();
    check('original gallery dialog still opens', await page.locator('dialog[open]').count() === 1);
    await page.keyboard.press('Escape');
    check('original gallery dialog still closes', await page.locator('dialog[open]').count() === 0);
  } finally { await context.close(); }
  const unknownVisit = await visit(390, 'nye', true, false);
  try {
    check('unknown-character probe starts without the full social font',
      unknownVisit.fonts.length === 1 && new URL(unknownVisit.fonts[0].url()).pathname.endsWith('/social-icons-homepage.woff2'));
    await unknownVisit.page.evaluate(() => {
      const unknown = document.createElement('span'); unknown.id = 'social-fallback-probe';
      unknown.style.font = '400 32px FontAwesome'; unknown.textContent = String.fromCodePoint(0xf09a);
      document.body.append(unknown);
    });
    await deadline(unknownVisit.page.evaluate(() => document.fonts.load('400 32px FontAwesome', String.fromCodePoint(0xf09a))), 'Uncovered original glyph fallback');
    const originals = [];
    for (const response of unknownVisit.fonts.filter(row => row.url().includes('114236a5fb48-fa-brands-400.woff2'))) {
      originals.push(hash(await response.body()));
    }
    check('uncovered Facebook glyph independently loads the exact original full font', originals.length === 1
      && originals[0] === socialFontFiles['parity/114236a5fb48-fa-brands-400.woff2']);
  } finally { await unknownVisit.context.close(); }
  for (const javascript of [true, false]) {
    const visitState = await visit(390, 'nye', javascript, false, true);
    try {
      const fonts = [];
      for (const response of visitState.fonts) fonts.push(hash(await response.body()));
      check(`JS${javascript} missing derivative retains exact original fallback`,
        fonts.length === 1 && fonts[0] === socialFontFiles['parity/114236a5fb48-fa-brands-400.woff2']);
      check(`JS${javascript} fallback retains four actual glyphs`, (await state(visitState.page)).glyphs.length === 4);
    } finally { await visitState.context.close(); }
  }
} catch (error) { report.errors.push(error.stack); }
finally { await browser.close(); }
for (const file of inputs) check(file + ' stable during browser audit', hash(await readFile(file)) === sourceHashes[file]);
check('no harness errors', !report.errors.length, report.errors);
report.passed = report.checks.filter(row => row.pass).length; report.total = report.checks.length;
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, total: report.total,
  failed: report.checks.filter(row => !row.pass).map(row => row.name), errors: report.errors }, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
