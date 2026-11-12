import {createRequire} from 'node:module';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {seoMetadata} from './code-pages-seo.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const base = option('--base', 'https://krawlthroughkrakow.com/staging');
if (base !== 'https://krawlthroughkrakow.com/staging' && !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('Staging or loopback only');
const local = base.startsWith('http://127.0.0.1:');
const output = option('--output', 'docs/seo/staging-metadata-pilot-2026-11-12/origin.json');
try {await readFile(output); throw new Error('Preserve previous verification; choose a new output filename');}
catch (error) {if (error.code !== 'ENOENT') throw error;}
const bust = process.argv.includes('--cache-bust') ? '?ktk_seo_check=' + Date.now() : '';
const manifest = JSON.parse(await readFile('docs/code-pages/full-migration/manifest.json', 'utf8'));
const rows = new Map(manifest.routes.map(row => [row.route, row]));
const assets = 'staging/wp-content/mu-plugins/ktk-code-pages-assets/';
const agents = {
  desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36',
  android:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/154.0.0.0 Mobile Safari/537.36',
  ipad:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
};
const checks = [], responses = [];
const check = (name, pass, detail) => checks.push({name, pass:!!pass, detail});
const browser = await chromium.launch({channel:'chrome', headless:true});
try {
  const parser = await browser.newPage({javaScriptEnabled:false});
  await parser.route('**/*', route => route.abort());
  const facts = html => parser.evaluate(markup => {
    const doc = new DOMParser().parseFromString(markup, 'text/html');
    const main = doc.querySelector('#main-content');
    const text = main?.cloneNode(true);
    text?.querySelectorAll('script,style,noscript,form').forEach(e => e.remove());
    const protectedEmails = [];
    // Cloudflare rewrites the public footer email in transit; compare its decoded
    // value, not the transport placeholder. Every other text node stays checked.
    text?.querySelectorAll('[data-cfemail]').forEach(element => {
      const hex = element.getAttribute('data-cfemail');
      if (!/^(?:[a-f0-9]{2}){2,}$/i.test(hex || '')) return;
      const key = parseInt(hex.slice(0,2),16);
      const email = hex.slice(2).match(/../g).map(value => String.fromCharCode(parseInt(value,16) ^ key)).join('');
      protectedEmails.push(email);
      element.textContent = email;
    });
    return {
      titles:[...doc.querySelectorAll('title')].map(e => e.textContent),
      descriptions:[...doc.querySelectorAll('meta[name="description"]')].map(e => e.content),
      robots:[...doc.querySelectorAll('meta[name="robots"]')].map(e => e.content),
      canonical:[...doc.querySelectorAll('link[rel="canonical"]')].map(e => e.href),
      text:(text?.textContent || '').replace(/\s+/g,' ').trim(),
      protectedEmails,
      sections:main?.querySelectorAll('.et_pb_section').length,
      links:[...doc.querySelectorAll('a[href]')].map(e => e.getAttribute('href')),
      social:[...doc.querySelectorAll('meta[property="og:description"]')].map(e => e.content),
    };
  }, html);
  for (const [route, entry] of Object.entries(seoMetadata.pages)) {
    const row = rows.get(route);
    const source = JSON.parse(await readFile(row.source + '/production-1920.json', 'utf8'));
    const expectedMain = await facts(await readFile(assets + 'content/' + row.key + '.html', 'utf8'));
    for (const [device, agent] of Object.entries(agents)) {
      const response = await fetch(base + route + bust, {headers:{'User-Agent':agent}, signal:AbortSignal.timeout(60000)});
      const html = await response.text(), actual = await facts(html);
      responses.push({route, device, status:response.status, cache:response.headers.get('cf-cache-status'), age:response.headers.get('age'),
        htmlSha256:createHash('sha256').update(html).digest('hex'), descriptions:actual.descriptions});
      const name = route + ' ' + device;
      check(name + ' HTTP 200', response.status === 200);
      check(name + ' one reviewed server-delivered description', actual.descriptions.length === 1 && actual.descriptions[0] === entry.description, actual.descriptions);
      check(name + ' original title', actual.titles.length === 1 && actual.titles[0] === source.title);
      check(name + ' staging noindex', actual.robots.length === 1 && /noindex/.test(actual.robots[0]));
      check(name + ' clean staging canonical', actual.canonical.length === 1 && actual.canonical[0] === 'https://krawlthroughkrakow.com/staging' + route);
      let difference = 0;
      while (difference < actual.text.length && actual.text[difference] === expectedMain.text[difference]) difference++;
      check(name + ' content preserved including decoded public contact', actual.text === expectedMain.text && actual.sections === row.expectedSections,
        actual.text === expectedMain.text ? undefined : {expectedLength:expectedMain.text.length, actualLength:actual.text.length,
          sections:actual.sections, position:difference, expected:expectedMain.text.slice(Math.max(0,difference-40),difference+100),
          actual:actual.text.slice(Math.max(0,difference-40),difference+100)});
      check(name + ' no baked attribution', !actual.links.some(href => /codex-test|test-click-id|utm_source=codex/.test(href)));
      check(name + ' internal navigation stays staging', !actual.links.some(href => href.startsWith('https://krawlthroughkrakow.com/') && !href.startsWith('https://krawlthroughkrakow.com/staging/')));
      if (!local) check(name + ' social summary consistent', actual.social.length === 1 && actual.social[0] === entry.description);
    }
    if (!local) {
      const response = await fetch('https://krawlthroughkrakow.com' + route, {signal:AbortSignal.timeout(60000)});
      const actual = await facts(await response.text());
      check(route + ' production description untouched', response.status === 200 && actual.descriptions.length === 0, actual.descriptions);
      check(route + ' production title/indexing untouched', actual.titles.length === 1 && actual.titles[0] === source.title && !actual.robots.some(v => /noindex/.test(v)));
    }
  }
  for (const route of Object.keys(seoMetadata.holds || {})) {
    const row = rows.get(route);
    const source = JSON.parse(await readFile(row.source + '/production-1920.json', 'utf8'));
    const descriptions = source.metadata.description ? [source.metadata.description] : [];
    for (const [device, agent] of Object.entries(agents)) {
      const response = await fetch(base + route + bust, {headers:{'User-Agent':agent}, signal:AbortSignal.timeout(60000)});
      const actual = await facts(await response.text());
      check(route + ' ' + device + ' held description unchanged', response.status === 200 && JSON.stringify(actual.descriptions) === JSON.stringify(descriptions));
      check(route + ' ' + device + ' held title/index policy unchanged', actual.titles[0] === source.title && actual.robots.length === 1 && /noindex/.test(actual.robots[0]) && actual.canonical[0] === 'https://krawlthroughkrakow.com/staging' + route);
    }
    if (!local) {
      const response = await fetch('https://krawlthroughkrakow.com' + route, {signal:AbortSignal.timeout(60000)});
      const actual = await facts(await response.text());
      check(route + ' production held description unchanged', response.status === 200 && JSON.stringify(actual.descriptions) === JSON.stringify(descriptions));
      check(route + ' production held title/index policy unchanged', actual.titles[0] === source.title && !actual.robots.some(value => /noindex/.test(value)));
    }
  }
  const visualContext = await browser.newContext({javaScriptEnabled:false});
  const visual = await visualContext.newPage();
  await visual.route('**/*', route => route.request().url().startsWith(base + '/') && ['GET','HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
  const screenshots = path.join(path.dirname(output), 'screenshots');
  await mkdir(screenshots, {recursive:true});
  for (const route of ['/about-us/how-to-join/', '/new-years-eve/']) for (const width of [390,1440]) {
    await visual.setViewportSize({width, height:900});
    await visual.goto(base + route + bust, {waitUntil:'load'});
    await visual.evaluate(() => document.fonts.ready);
    check(route + ' ' + width + ' no horizontal overflow', await visual.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await visual.screenshot({path:path.join(screenshots, route.split('/').filter(Boolean).at(-1) + '-' + width + '.png'), animations:'disabled'});
  }
  await visualContext.close();
} finally {await browser.close();}
const report = {checkedAt:new Date().toISOString(), base, cacheBust:!!bust, noScriptsInSourceChecks:true, noFormsOrdersOrPayments:true,
  passed:checks.filter(row => row.pass).length, total:checks.length, responses, checks};
await mkdir(path.dirname(output), {recursive:true});
await writeFile(output, JSON.stringify(report,null,2) + '\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:checks.filter(row => !row.pass)},null,2));
if (report.passed !== report.total) process.exitCode = 1;
