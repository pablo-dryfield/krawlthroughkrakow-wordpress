import {createRequire} from 'node:module';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output = process.argv[2] || 'docs/seo/audit-2026-11-07/production-baseline.json';
const origin = 'https://krawlthroughkrakow.com';
const manifest = JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json', 'utf8'));
const extra = ['/', '/store2/', '/store2/pub-crawl-28/', '/store2/nye-pub-crawl-32/', '/store/',
  '/store/Bottomless-Brunch-p661114244', '/student-trips-and-parties/', '/2019/09/05/2681/',
  '/krakow-activities/', '/project/life-drawing-session/', '/krakow-pub-crawl/',
  '/store2/pub-crawl-28/?utm_source=Google&utm_medium=Booking&utm_campaign=Search'];
const urls = [...new Set([...extra, ...manifest.routes.map(row => row.route)])];
const report = {startedAt: new Date().toISOString(), scope: 'Read-only normal-URL desktop HTTP/HTML audit. No scripts, forms, orders, settings or database writes. Not a Google index, field-performance or rendered-visual audit.', pages: [], sitemaps: [], robots: null, errors: []};
const browser = await chromium.launch({channel: 'chrome', headless: true});
const parser = await browser.newPage();
const fetchText = async url => {
  const start = performance.now();
  const response = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36'}, signal: AbortSignal.timeout(45000)});
  return {response, text: await response.text(), elapsedMs: Math.round(performance.now() - start)};
};
try {
  for (const route of urls) {
    try {
      const {response, text, elapsedMs} = await fetchText(origin + route);
      const facts = await parser.evaluate(({html, base}) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const content = doc.querySelector('main') || doc.querySelector('#main-content') || doc.body;
        const textClone = content.cloneNode(true);
        textClone.querySelectorAll('script,style,noscript,nav,header,footer').forEach(e => e.remove());
        const clean = value => (value || '').replace(/\s+/g, ' ').trim();
        const types = [], jsonErrors = [];
        const visit = value => {
          if (!value || typeof value !== 'object') return;
          if (value['@type']) types.push(...[value['@type']].flat());
          for (const child of Object.values(value)) if (child && typeof child === 'object') {
            if (Array.isArray(child)) child.forEach(visit); else visit(child);
          }
        };
        for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
          try {visit(JSON.parse(script.textContent));} catch (error) {jsonErrors.push(error.message);}
        }
        const links = [...doc.querySelectorAll('a[href]')].map(e => {
          try {return {url: new URL(e.getAttribute('href'), base).href, text: clean(e.textContent), label: e.getAttribute('aria-label')};} catch {return null;}
        }).filter(Boolean);
        const imgs = [...doc.querySelectorAll('img')].map(e => ({src: e.getAttribute('src'), lazySrc: e.getAttribute('data-src'), alt: e.getAttribute('alt'), width: e.getAttribute('width'), height: e.getAttribute('height'), loading: e.getAttribute('loading'), srcset: !!e.getAttribute('srcset')}));
        return {title: clean(doc.title), descriptions: [...doc.querySelectorAll('meta[name="description"]')].map(e => e.content), canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
          robots: [...doc.querySelectorAll('meta[name="robots"]')].map(e => e.content), h1: [...doc.querySelectorAll('h1')].map(e => clean(e.textContent)), h2: [...doc.querySelectorAll('h2')].map(e => clean(e.textContent)),
          schemaTypes: [...new Set(types)], jsonErrors, wordCount: clean(textClone.textContent).split(/\s+/).filter(Boolean).length,
          og: [...doc.querySelectorAll('meta[property^="og:"]')].map(e => e.getAttribute('property')), twitter: [...doc.querySelectorAll('meta[name^="twitter:"]')].map(e => e.name),
          images: imgs, links, language: doc.documentElement.lang, stagingReferences: links.filter(e => e.url.startsWith('https://krawlthroughkrakow.com/staging/')),
          mainTextSample: clean(textClone.textContent).slice(0, 1400)};
      }, {html: text, base: response.url});
      report.pages.push({route, status: response.status, finalUrl: response.url, redirected: response.redirected, cache: response.headers.get('cf-cache-status'), age: response.headers.get('age'), xRobotsTag: response.headers.get('x-robots-tag'), contentType: response.headers.get('content-type'), htmlBytes: Buffer.byteLength(text), elapsedMs, ...facts});
    } catch (error) {report.errors.push({route, error: error.message});}
    if (report.pages.length % 20 === 0) console.log('Read-only SEO pages: ' + report.pages.length);
  }
  for (const route of ['/robots.txt', '/sitemap_index.xml', '/wp-sitemap.xml']) {
    try {
      const {response, text} = await fetchText(origin + route);
      if (route === '/robots.txt') report.robots = {status: response.status, text};
      else {
        const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
        report.sitemaps.push({url: origin + route, status: response.status, finalUrl: response.url, locs});
        if (text.includes('<sitemapindex')) for (const loc of locs) {
          if (!loc.startsWith(origin + '/') || report.sitemaps.some(s => s.url === loc)) continue;
          const child = await fetchText(loc);
          report.sitemaps.push({url: loc, status: child.response.status, locs: [...child.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])});
        }
      }
    } catch (error) {report.errors.push({route, error: error.message});}
  }
  const canonPages = report.pages.filter(p => p.status === 200 && !p.redirected && !p.route.startsWith('/store/'));
  const titleGroups = Object.groupBy(canonPages, p => p.title);
  const inbound = new Map();
  for (const page of report.pages.filter(p => p.status === 200 && !p.redirected)) {
    for (const link of page.links) {
      const url = new URL(link.url); url.hash = ''; url.search = '';
      if (url.origin !== origin) continue;
      if (!inbound.has(url.pathname)) inbound.set(url.pathname, new Set());
      if (url.pathname !== new URL(page.finalUrl).pathname) inbound.get(url.pathname).add(page.route);
    }
  }
  report.summary = {requested: urls.length, received: report.pages.length, errors: report.errors.length,
    canonicalHtmlSample: canonPages.length,
    non200: report.pages.filter(p => p.status !== 200).map(p => ({route: p.route, status: p.status})),
    missingDescriptions: canonPages.filter(p => !p.descriptions.some(d => d.trim())).map(p => p.route),
    missingH1: canonPages.filter(p => !p.h1.some(Boolean)).map(p => p.route),
    multipleH1: canonPages.filter(p => p.h1.length > 1).map(p => ({route: p.route, count: p.h1.length})),
    missingCanonical: canonPages.filter(p => !p.canonical).map(p => p.route),
    noindex: canonPages.filter(p => /noindex/i.test(p.robots.join(' ') + ' ' + (p.xRobotsTag || ''))).map(p => p.route),
    duplicateTitles: Object.entries(titleGroups).filter(([, rows]) => rows.length > 1).map(([title, rows]) => ({title, routes: rows.map(p => p.route)})),
    missingOg: canonPages.filter(p => !p.og.includes('og:title') || !p.og.includes('og:image')).map(p => p.route),
    stagingLinkPages: report.pages.filter(p => p.stagingReferences.length).map(p => p.route),
    zeroInboundInSample: canonPages.filter(p => p.route !== '/' && !inbound.get(new URL(p.finalUrl).pathname)?.size).map(p => p.route)};
  report.finishedAt = new Date().toISOString();
  await mkdir(path.dirname(output), {recursive: true});
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary, null, 2));
} finally {await browser.close();}
