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
const mode = option('--mode', 'preflight');
const label = option('--label', `production-${mode}`);
if (!['preflight', 'release', 'cache'].includes(mode) || !/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid mode or label.');
const out = 'docs/homepage-production-launch';
await mkdir(out, { recursive: true });
const home = 'https://krawlthroughkrakow.com/';
const staging = `${home}staging/`;
const agents = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};
const files = ['parity.css', 'parity-runtime.css', 'parity.js', 'journey.js', 'hero.css', 'hero-statue-regular.svg', 'hero-statue-seasonal.svg', 'review-google.svg', 'review-tripadvisor.png', 'review-getyourguide.svg'];
const report = { checkedAt: new Date().toISOString(), mode, conditions: 'Installed Chrome, isolated contexts. No cart, order, contact submission or actual conversion. Homepage source and layout compared with staging; public campaign preview disabled in production.', checks: [], observations: {}, pageErrors: [] };
const check = (name, pass, detail) => report.checks.push({ name, pass: !!pass, detail });
const sha = text => createHash('sha256').update(text).digest('hex');
const sourceScripts = html => [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(match => match[0]);
const tracking = html => {
  const scripts = sourceScripts(html);
  const relevant = scripts.filter(script => /GTM-PHXGRZ|AW-956184209|ufswk29c79|trk_utm_|trk_'/.test(script));
  return { gtmBootstraps: scripts.filter(script => /GTM-PHXGRZ/.test(script) && /gtm\.js|gtm\.start/.test(script)).length,
    adsConfigs: scripts.filter(script => /gtag\(\s*['"]config['"]\s*,\s*['"]AW-956184209/.test(script)).length,
    clarityBootstraps: scripts.filter(script => /ufswk29c79/.test(script) && /clarity/.test(script)).length,
    utmCapture: scripts.some(script => /trk_|utm_source/.test(script)), signatures: relevant.map(sha).sort() };
};
async function request(url, ua = agents.desktop) {
  const response = await fetch(url, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(60000) });
  return { status: response.status, url: response.url, headers: Object.fromEntries(response.headers), html: await response.text() };
}
async function ancillary() {
  const result = {};
  for (const route of ['contact/', 'store2/pub-crawl-28/', 'store2/nye-pub-crawl-32/']) {
    const response = await request(`${home}${route}?ktk_release_check=${Date.now()}`);
    result[route] = { status: response.status, tracking: tracking(response.html), codePage: response.html.includes('data-ktk-page="contact"'), storeMount: response.html.includes('ktk-storefront'), title: response.html.match(/<title>(.*?)<\/title>/s)?.[1] };
    check(`${route} returns HTTP 200`, response.status === 200, response.status);
  }
  return result;
}
async function consent(page, choice = 'Reject') {
  await page.mouse.wheel(0, 10);
  const button = page.getByRole('button', { name: new RegExp(`^${choice}(?: all)?$`, 'i') }).first();
  await button.waitFor({ state: 'visible', timeout: 25000 });
  try { await button.click({ timeout: 4000 }); } catch { await button.focus(); await page.keyboard.press('Enter'); }
  await page.waitForFunction(() => !document.querySelector('#iubenda-cs-banner')?.getClientRects().length);
}
async function ready(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
      scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 80));
    }
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
}
async function inspect(page, html) {
  return page.evaluate(source => {
    const parsed = new DOMParser().parseFromString(source, 'text/html');
    const decode = value => { const key = parseInt(value.slice(0, 2), 16); return (value.slice(2).match(/.{2}/g) || []).map(pair => String.fromCharCode(parseInt(pair, 16) ^ key)).join(''); };
    parsed.querySelectorAll('[data-cfemail]').forEach(el => el.replaceWith(parsed.createTextNode(decode(el.dataset.cfemail))));
    parsed.querySelectorAll('a[href*="/cdn-cgi/l/email-protection#"]').forEach(el => el.setAttribute('href', 'mailto:' + decode(el.getAttribute('href').split('#')[1])));
    const normalize = value => value.replace(/https?:\/\/krawlthroughkrakow\.com(?:\/staging)?/g, '').replace(/\/staging\//g, '/').replace(/\s+/g, ' ').trim();
    const bounds = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height }; };
    const sections = [...document.querySelectorAll('#main-content .et_pb_section')];
    const panels = [...document.querySelectorAll('.ktk-hero-panel')].map(panel => ({ box: bounds(panel), texts: [...panel.querySelectorAll('.ktk-hero-copy *')].filter(el => el.childElementCount === 0 && el.textContent.trim()).map(el => ({ text: el.textContent.trim(), box: bounds(el) })) }));
    return {
      titleCount: document.querySelectorAll('title').length, descriptionCount: document.querySelectorAll('meta[name="description"]').length,
      viewportCount: document.querySelectorAll('meta[name="viewport"]').length, canonical: [...document.querySelectorAll('link[rel="canonical"]')].map(el => el.href),
      robots: [...document.querySelectorAll('meta[name="robots"]')].map(el => el.content), width: innerWidth, documentWidth: document.documentElement.scrollWidth,
      source: [...parsed.querySelectorAll('#main-header,#main-content .et_pb_section,#main-footer')].map(el => normalize(el.outerHTML)),
      geometry: sections.map(bounds), panels, campaign: document.querySelector('#ktk-seasonal-hero')?.dataset.campaign,
      reviews: document.querySelector('.ktk-hero-reviews')?.innerText, logos: [...document.querySelectorAll('.ktk-hero-review-logo img')].map(el => ({ complete: el.complete, width: el.naturalWidth })),
      assets: [...document.querySelectorAll('link[rel="stylesheet"],script[src]')].map(el => el.href || el.src),
      booking: [...document.querySelectorAll('.ktk-hero-cta')].map(el => ({ href: el.href, product: el.dataset.productId })),
      buttonAlignment: [...document.querySelectorAll('.ktk-hero-cta')].map(el => {
        const range = document.createRange(); range.selectNodeContents(el.querySelector('span'));
        const text = range.getBoundingClientRect(); const label = el.querySelector('span').getBoundingClientRect(); const icon = el.querySelector('svg').getBoundingClientRect(); const button = el.getBoundingClientRect();
        // A wrapped centered label's line ink can be narrower than its flex box.
        return { label: el.textContent.trim(), textAlign: getComputedStyle(el.querySelector('span')).textAlign,
          centerDifference: (Math.min(label.left, icon.left) + Math.max(label.right, icon.right)) / 2 - (button.left + button.right) / 2,
          inkCenterDifference: (Math.min(text.left, icon.left) + Math.max(text.right, icon.right)) / 2 - (button.left + button.right) / 2 };
      }),
      productionStagingLinks: [...document.querySelectorAll('a[href]')].map(el => el.href).filter(href => href.startsWith('https://krawlthroughkrakow.com/staging/')),
    };
  }, html);
}
let browser;
try {
  if (mode === 'cache') {
    const expected = Object.fromEntries(await Promise.all(files.map(async file => [file, sha(await readFile(`staging/wp-content/mu-plugins/ktk-homepage-assets/${file}`))])));
    const assetUrls = new Map();
    report.observations.devices = [];
    for (const [device, ua] of Object.entries(agents)) {
      const response = await request(home, ua);
      const html = response.html;
      const robots = html.match(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i)?.[0] || '';
      const canonical = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i)?.[0] || '';
      const assets = files.map(file => {
        const href = html.match(new RegExp(`(?:href|src)=["']([^"']*/ktk-homepage-assets/${file.replace('.', '\\.')}(?:\\?[^"']*)?)["']`))?.[1]?.replaceAll('&amp;', '&');
        if (href) assetUrls.set(file, href);
        return { file, href, versionMatches: href && new URL(href).searchParams.get('v') === expected[file].slice(0, 12) };
      });
      const observation = { device, status: response.status, cache: response.headers['cf-cache-status'], age: response.headers.age, apo: response.headers['cf-apo-via'], robots, canonical, assets, tracking: tracking(html) };
      report.observations.devices.push(observation);
      check(`${device}: production release HTML`, response.status === 200 && html.includes('id="ktk-seasonal-hero"') && html.includes('data-campaign="nye"') && html.includes('31 December 2026') && html.includes('>2027</text>') && html.includes('2,400+ reviews') && html.includes('5/5'), observation);
      check(`${device}: production canonical and indexable`, canonical.includes(`href="${home}"`) && !/noindex/i.test(robots + (response.headers['x-robots-tag'] || '')), { robots, canonical });
      check(`${device}: all nine current asset URLs`, assets.every(asset => asset.versionMatches), assets);
    }
    for (const [file, url] of assetUrls) {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      check(`Public ${file} checksum`, response.status === 200 && sha(Buffer.from(await response.arrayBuffer())) === expected[file]);
    }
  } else {
    report.observations.ancillary = await ancillary();
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    if (mode === 'preflight') {
      const response = await request(`${home}?ktk_release_check=${Date.now()}`);
      report.observations.home = { status: response.status, tracking: tracking(response.html), oldDivi: response.html.includes('/themes/Divi/') };
      await writeFile(`${out}/production-before-home.html`, response.html);
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${home}store2/nye-pub-crawl-32/?ktk_release_check=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: /NYE Pub Crawl|New Year(?:'s)? Eve/i }).first().waitFor({ timeout: 60000 });
      report.observations.nyeProduct = await page.locator('body').innerText();
      check('Production NYE product 32 renders its live catalog', /NYE Pub Crawl|New Year(?:'s)? Eve/i.test(report.observations.nyeProduct) && !/Product not found/i.test(report.observations.nyeProduct));
      await page.screenshot({ path: `${out}/production-before-nye-product.png` });
      await context.close();
    } else {
      const baseline = JSON.parse(await readFile(`${out}/production-preflight.json`, 'utf8'));
      for (const [route, observation] of Object.entries(report.observations.ancillary)) {
        if (route === 'contact/' && process.argv.includes('--content-migration')) {
          check('contact/: owner-approved code-managed integration contract', observation.codePage && observation.tracking.gtmBootstraps === 1 && observation.tracking.adsConfigs === 1 && observation.tracking.clarityBootstraps === 1, observation.tracking);
        } else check(`${route}: original integration output unchanged`, JSON.stringify(observation.tracking) === JSON.stringify(baseline.observations.ancillary[route].tracking), observation.tracking);
      }
      for (const width of [320, 390, 768, 1440, 1920]) {
        const contexts = [];
        const values = [];
        for (const [name, base] of [['staging', staging], ['production', home]]) {
          const context = await browser.newContext({ viewport: { width, height: width === 1920 ? 805 : 900 }, isMobile: width <= 768, hasTouch: width <= 768, userAgent: width < 768 ? agents.android : width === 768 ? agents.ipad : agents.desktop });
          contexts.push(context);
          const page = await context.newPage();
          page.on('pageerror', error => report.pageErrors.push({ name, width, message: error.message, stack: error.stack }));
          const response = await page.goto(`${base}?ktk_release_check=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
          const html = await response.text();
          await consent(page); await ready(page);
          const value = await inspect(page, html); values.push(value);
          if (name === 'production') {
            check(`${width}: metadata unique, production canonical, indexable`, value.titleCount === 1 && value.descriptionCount === 1 && value.viewportCount === 1 && JSON.stringify(value.canonical) === JSON.stringify([home]) && !/noindex/i.test(value.robots.join(' ') + (response.headers()['x-robots-tag'] || '')), value.robots);
            check(`${width}: 13 sections and no horizontal overflow`, value.geometry.length === 13 && value.documentWidth === width, { sections: value.geometry.length, width: value.documentWidth });
            check(`${width}: no Divi runtime or staging links`, !value.assets.some(url => /\/themes\/Divi\/|\/et-cache\//.test(url)) && !value.productionStagingLinks.length, value.productionStagingLinks);
            check(`${width}: correct product links`, value.booking.some(link => link.product === '32' && link.href === `${home}store2/nye-pub-crawl-32/#book`) && value.booking.some(link => link.product === '28' && link.href === `${home}store2/pub-crawl-28/#book`), value.booking);
            check(`${width}: all review logos loaded`, value.logos.length === 3 && value.logos.every(logo => logo.complete && logo.width > 0), value.logos);
            check(`${width}: hero button labels and arrows centered as a group`, value.buttonAlignment.length === 2 && value.buttonAlignment.every(button => Math.abs(button.centerDifference) <= 1 && button.textAlign === 'center'), value.buttonAlignment);
            const panelText = value.panels.flatMap(panel => panel.texts.map(text => ({ text: text.text, fits: text.box.y + text.box.height <= panel.box.y + panel.box.height + 1 })));
            check(`${width}: hero bottom text fits`, panelText.every(text => text.fits), panelText);
            await page.screenshot({ path: `${out}/${label}-${width}-viewport.png` });
            await page.locator('#ktk-seasonal-hero').screenshot({ path: `${out}/${label}-${width}-hero.png` });
            if (width === 390) {
              const toggle = page.locator('.mobile_menu_bar:visible'); await toggle.click();
              check('Mobile menu opens', await toggle.getAttribute('aria-expanded') === 'true');
              await page.keyboard.press('Escape'); check('Escape closes menu', await toggle.getAttribute('aria-expanded') === 'false');
            }
            if (width === 390 || width === 1440) {
              await page.locator('.ktk-hero-reviews').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
              check(`${width}: floating Book Now remains visible at reviews`, await page.locator('#ktk-cta').isVisible());
              await page.locator('#main-content .et_pb_section').last().scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
              check(`${width}: floating Book Now remains visible below hero`, await page.locator('#ktk-cta').isVisible());
              await page.evaluate(() => scrollTo(0, 0));
            }
            report.observations[`production-${width}`] = { ...value, source: value.source.map(sha) };
          }
          if (width === 390 || width === 1440) {
            await page.evaluate(() => { document.body.style.zoom = '2'; scrollTo(0, 0); });
            await page.waitForTimeout(500);
            value.zoom = await inspect(page, html);
            if (name === 'production') await page.screenshot({ path: `${out}/${label}-${width}-zoom.png` });
          }
        }
        check(`${width}: all production body source matches staging`, JSON.stringify(values[0].source) === JSON.stringify(values[1].source), values.map(value => value.source.map(sha)));
        const differences = values[0].geometry.map((box, i) => Object.keys(box).filter(key => Math.abs(box[key] - values[1].geometry[i]?.[key]) > 1).map(key => ({ section: i, key, staging: box[key], production: values[1].geometry[i]?.[key] }))).flat();
        check(`${width}: staging and production section geometry matches`, !differences.length, differences);
        if (values[0].zoom) {
          const left = values[0].zoom; const right = values[1].zoom;
          check(`${width}: 200 percent zoom matches staging geometry`, left.documentWidth === right.documentWidth && left.geometry.every((box, i) => Object.keys(box).every(key => Math.abs(box[key] - right.geometry[i]?.[key]) <= 1)), { stagingWidth: left.documentWidth, productionWidth: right.documentWidth });
          const panelText = right.panels.flatMap(panel => panel.texts.map(text => ({ text: text.text, fits: text.box.y + text.box.height <= panel.box.y + panel.box.height + 1 })));
          check(`${width}: zoom hero text fits own panel`, panelText.every(text => text.fits), panelText);
          check(`${width}: zoom hero button groups stay centered`, right.buttonAlignment.every(button => Math.abs(button.centerDifference) <= 1 && button.textAlign === 'center'), right.buttonAlignment);
        }
        for (const context of contexts) await context.close();
      }
      for (const choice of ['Reject', 'Accept']) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: agents.android, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
        const target = new URL(home); for (const key of keys) target.searchParams.set(key, `release-test-${key}`);
        const response = await page.goto(target.href, { waitUntil: 'domcontentloaded' });
        const html = await response.text(); await consent(page, choice); await page.waitForTimeout(1600);
        const observation = await page.evaluate(keys => ({ analytics: window.KTK_ANALYTICS_CONSENT,
          commands: (window.dataLayer || []).filter(item => item && item[0] === 'consent').map(item => Array.from(item)),
          attribution: Object.fromEntries(keys.map(key => [key, localStorage.getItem('trk_' + key)])),
          links: [...document.querySelectorAll('.ktk-hero-cta')].map(el => el.href),
          gtm: [...document.scripts].filter(el => el.src.includes('/gtm.js?id=GTM-PHXGRZ')).length,
          ads: [...document.scripts].filter(el => el.src.includes('/gtag/js?id=AW-956184209') && !new URL(el.src).searchParams.has('gtg_health')).length,
          adsHealth: [...document.scripts].filter(el => el.src.includes('/gtag/js?id=AW-956184209') && new URL(el.src).searchParams.has('gtg_health')).map(el => el.src),
          clarity: [...document.scripts].filter(el => el.src.includes('clarity.ms/tag/ufswk29c79')).length,
        }), keys);
        report.observations[choice] = { ...observation, sourceTracking: tracking(html) };
        const last = [...observation.commands].reverse().find(command => command[2]?.analytics_storage)?.[2];
        check(`${choice}: consent bridge and Google signals`, observation.analytics === (choice === 'Accept') && last?.analytics_storage === (choice === 'Accept' ? 'granted' : 'denied'), last);
        check(`${choice}: all attribution captured`, keys.every(key => observation.attribution[key] === `release-test-${key}`), observation.attribution);
        check(`${choice}: all attribution on both booking destinations`, observation.links.length === 2 && observation.links.every(link => keys.every(key => new URL(link).searchParams.get(key) === `release-test-${key}`)), observation.links);
        check(`${choice}: single source GTM, Ads, Clarity config`, tracking(html).gtmBootstraps === 1 && tracking(html).adsConfigs === 1 && tracking(html).clarityBootstraps === 1, tracking(html));
        check(`${choice}: single primary tracker loaders (Google health probe recorded separately)`, observation.gtm === 1 && observation.ads === 1 && observation.clarity === 1, observation);
        await context.close();
      }
      const preview = await request(`${home}?ktk_hero=halloween&ktk_release_check=${Date.now()}`);
      check('Production ignores seasonal preview query', preview.html.includes('data-campaign="nye"'));
      for (const width of [390, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await context.newPage();
        const response = await page.goto(`${staging}?ktk_hero=nye&ktk_release_check=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await consent(page); await ready(page);
        const value = await inspect(page, await response.text());
        check(`${width}: staging NYE and regular button groups centered`, value.booking.some(link => link.product === '32') && value.buttonAlignment.every(button => Math.abs(button.centerDifference) <= 1 && button.textAlign === 'center'), value.buttonAlignment);
        await page.locator('.ktk-hero-panel--seasonal').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
        check(`${width}: staging NYE floating booking remains visible`, await page.locator('#ktk-cta').isVisible());
        await page.screenshot({ path: `${out}/${label}-${width}-staging-nye.png` });
        await context.close();
      }
      const noJsContext = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
      const noJsPage = await noJsContext.newPage();
      await noJsPage.goto(`${home}?ktk_release_check=${Date.now()}`, { waitUntil: 'load', timeout: 60000 });
      const noJsLinks = await noJsPage.locator('.ktk-hero-cta').evaluateAll(elements => elements.map(el => el.href));
      check('Without JavaScript native production booking links and full content remain', JSON.stringify(noJsLinks) === JSON.stringify([`${home}store2/pub-crawl-28/#book`, `${home}store2/nye-pub-crawl-32/#book`]) && await noJsPage.locator('#main-content .et_pb_section').count() === 13, noJsLinks);
      await noJsPage.screenshot({ path: `${out}/${label}-390-nojs.png` });
      await noJsContext.close();
      check('No page JavaScript errors', report.pageErrors.length === 0, report.pageErrors);
    }
  }
} catch (error) { check('Suite completes', false, error.stack); }
finally {
  if (browser) await browser.close();
  report.summary = { passed: report.checks.filter(item => item.pass).length, total: report.checks.length };
  await writeFile(`${out}/${label}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ summary: report.summary, failed: report.checks.filter(item => !item.pass) }, null, 2));
  if (report.checks.some(item => !item.pass)) process.exitCode = 1;
}
