import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadNightlifeComparisonEditorial() {
  const specs = [['post-best-pub-crawls-in-europe', 'european-pub-crawl-review', '1bcc12e6835ad72fcaf7bfc253da48fc4ba248c149e84f0628322d5ab8369872'], ['post-budapest-or-krakow-nightlife', 'budapest-krakow-comparison-review', 'c5feb54a7aa39c81a78d0f948507ba55a2085a94a0db80e6bea99b6b5ad470e3']], rows = [], images = JSON.parse(await readFile(new URL('./content-image-descriptions.json', import.meta.url), 'utf8'));
  if (images.status !== 'visually-reviewed' || images.assetManifestSha256 !== 'f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691') throw Error('Reviewed comparison image policy required');
  for (const [key, file, sourceSha256] of specs) {
    const sourceHtml = await readFile(new URL('../docs/code-pages/full-migration/captures/' + key + '/production-1920.html', import.meta.url), 'utf8'), markup = await readFile(new URL('./content/' + file + '.html', import.meta.url), 'utf8');
    if (createHash('sha256').update(sourceHtml).digest('hex') !== sourceSha256 || /[{}]/.test(markup)) throw Error('Original comparison capture and resolved draft required');
    rows.push({key, sourceSha256, sourceHtml, markup, imageDescriptions: images.descriptions, reviewedOn: '2026-11-15', version: '2026-11-15.nightlife-comparison-1'});
  }
  return rows;
}

export function reviseNightlifeComparisonEditorial({key, revision}) {
  const definitions = {
    'post-best-pub-crawls-in-europe': {sha: '1bcc12e6835ad72fcaf7bfc253da48fc4ba248c149e84f0628322d5ab8369872', title: 'Best Pub Crawls in Europe', module: true, files: ['8d3c960fd0ce-FB_IMG_1556108539136.jpg', 'b749bb1fb74f-alternatiwy-pub-krawl-krakow.jpg']},
    'post-budapest-or-krakow-nightlife': {sha: 'c5feb54a7aa39c81a78d0f948507ba55a2085a94a0db80e6bea99b6b5ad470e3', title: 'Budapest or Krakow Nightlife: A Tourist\u2019s Ultimate Guide', module: false, files: ['73ef8679f99c-1693294719_ervin-lukacs-sMyQb3i9bNA-unsplash.jpg', '5a7595132e79-1693295099_bence-balla-schottner-VPETME4zVWM-unsplash.jpg', '72f5ff2c6a8f-1693298437_severinus-dewantara-0fl-WGMuNPA-unsplash_20_1_.jpg', 'a375df81d2bf-1693299066_anshu-a-DfOSCJcmvEU-unsplash.jpg', '6eb6e982f6ee-1693299932_1693299925699.png', '4fc7fbf3be81-1693300086_1693300083797.png', '1412ec7ee881-1693300555_redd-f-nE1K_qO2z38-unsplash.jpg']}
  };
  if (!Object.hasOwn(definitions, key)) return [];
  const conf = definitions[key], clean = s => (s || '').replace(/\s+/g, ' ').trim(), active = (n, selector) => [...n.querySelectorAll(selector)].filter(n => !n.closest('noscript')), ids = n => active(n, '[id]').map(n => n.id), localHref = href => href?.replace(/^https?:\/\/(?:www\.)?krawlthroughkrakow\.com(?:\/|$)/, '__KTK_HOME_URL__');
  if (revision?.key !== key || revision.sourceSha256 !== conf.sha || revision.version !== '2026-11-15.nightlife-comparison-1' || revision.reviewedOn !== '2026-11-15' || typeof revision.sourceHtml !== 'string' || typeof revision.markup !== 'string' || !revision.imageDescriptions) throw Error('Reviewed comparison identity required');
  const original = new DOMParser().parseFromString(revision.sourceHtml, 'text/html').querySelector('#main-content'), main = document.querySelector('#main-content'), source = original?.querySelector('.entry-content'), body = main?.querySelector('.entry-content'), forbidden = 'form,iframe,video,script,style,input,button';
  if (!source || !body || document.querySelectorAll('#main-content').length !== 1 || main.querySelectorAll('.entry-content').length !== 1 || clean(original.querySelector('h1.entry-title')?.textContent) !== conf.title || clean(main.querySelector('h1.entry-title')?.textContent) !== conf.title || source.querySelector(forbidden) || body.querySelector(forbidden) || [body, ...body.querySelectorAll('*')].some(n => [...n.attributes].some(a => a.name.startsWith('on')))) throw Error('Original comparison title and safe body required');
  const marker = body.getAttribute('data-ktk-comparison-review'), interiors = [...body.querySelectorAll('.et_pb_text_inner')], rawInteriors = [...source.querySelectorAll('.et_pb_text_inner')], current = conf.module ? interiors[0] : body, before = conf.module ? rawInteriors[0] : source;
  if (interiors.length !== (conf.module ? 1 : 0) || rawInteriors.length !== interiors.length || conf.module && (!current || !before || current.querySelector('img') || before.querySelector('img,[id]'))) throw Error('Exact comparison text-interior boundary required');
  const t = document.createElement('template'); t.innerHTML = revision.markup;
  const all = [...t.content.querySelectorAll('*')], allowed = new Set(['__KTK_HOME_URL__otherbarcrawls/', '__KTK_HOME_URL__store2/pub-crawl-28/#book', '__KTK_HOME_URL__about-us/how-to-join/', '__KTK_HOME_URL__contact/', '__KTK_HOME_URL__krakow-nightlife/', '__KTK_HOME_URL__krakow-weather-guide/', '__KTK_HOME_URL__best-places-to-eat/', '__KTK_HOME_URL__krakow-bars-jewish-quarter/', '__KTK_HOME_URL__krakow-nightclubs/', 'https://pubcrawlmalta.com/', 'https://european-union.europa.eu/principles-countries-history/eu-countries/poland_en', 'https://european-union.europa.eu/principles-countries-history/eu-countries/hungary_en', 'https://alchemia.com.pl/', 'https://www.prozakclub.com/', 'https://szimpla.hu/', 'https://bkk.hu/en/travel-information/night-transport/', 'https://mpk.krakow.pl/rozklady-jazdy']);
  const europeanLinks = new Set(['__KTK_HOME_URL__otherbarcrawls/', '__KTK_HOME_URL__store2/pub-crawl-28/#book', '__KTK_HOME_URL__about-us/how-to-join/', '__KTK_HOME_URL__contact/', 'https://pubcrawlmalta.com/']);
  for (const n of all) {
    const attrs = n.tagName === 'A' ? ['href'] : ['H2', 'H3'].includes(n.tagName) ? ['id'] : n.tagName === 'P' ? ['data-ktk-contextual-links'] : n.tagName === 'TIME' ? ['datetime'] : n.tagName === 'TEMPLATE' ? ['data-ktk-comparison-contents', 'data-ktk-comparison-photo'] : [];
    if (!['P', 'SMALL', 'TIME', 'H2', 'H3', 'A', 'STRONG', 'UL', 'LI', 'TEMPLATE'].includes(n.tagName) || [...n.attributes].some(a => !attrs.includes(a.name))) throw Error('Unreviewed comparison markup');
    if (n.tagName === 'A' && (!allowed.has(n.getAttribute('href')) || conf.module && !europeanLinks.has(n.getAttribute('href')) || !clean(n.textContent))) throw Error('Unreviewed comparison destination');
    if (n.tagName === 'TIME' && (n.getAttribute('datetime') !== revision.reviewedOn || n.textContent !== '15 November 2026')) throw Error('Comparison review date changed');
  }
  const heads = all.filter(n => ['H2', 'H3'].includes(n.tagName)), sourceHeads = active(source, 'h2,h3').filter(n => n.id !== 'main-toc'), expectedHeads = conf.module ? ['europe-choosing', 'europe-krakow', 'europe-malta', 'europe-other-events', 'europe-checklist', 'europe-more'].map(id => ['H3', id]) : sourceHeads.map(n => [n.tagName, n.id]), contents = all.filter(n => n.matches('template[data-ktk-comparison-contents]')), slots = all.filter(n => n.matches('template[data-ktk-comparison-photo]'));
  if (heads.length !== (conf.module ? 6 : 22) || JSON.stringify(heads.map(n => [n.tagName, n.id])) !== JSON.stringify(expectedHeads) || heads.some(n => !clean(n.textContent)) || all.filter(n => n.tagName === 'TIME').length !== 1 || contents.length !== 1 || contents[0].attributes.length !== 1 || contents[0].getAttribute('data-ktk-comparison-contents') !== '' || contents[0].innerHTML.trim() || slots.length !== (conf.module ? 0 : 7) || slots.some((n, i) => n.attributes.length !== 1 || n.getAttribute('data-ktk-comparison-photo') !== String(i) || n.innerHTML.trim()) || all.filter(n => n.tagName === 'TEMPLATE').length !== slots.length + 1) throw Error('Complete comparison topics and image slots required');
  const exactContext = '<p data-ktk-contextual-links="post-best-pub-crawls-in-europe">See our <a href="__KTK_HOME_URL__otherbarcrawls/">directory of other pub crawls</a> for operator links.</p>', contextual = all.filter(n => n.hasAttribute('data-ktk-contextual-links'));
  if (contextual.length !== (conf.module ? 1 : 0) || contextual.some(n => n.outerHTML !== exactContext)) throw Error('Exact existing European directory paragraph required');
  const nav = document.createElement('nav'), details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('ul');
  nav.setAttribute('aria-label', conf.module ? 'European pub-crawl comparison contents' : 'Budapest and Krakow nightlife contents'); summary.id = conf.module ? 'comparison-contents' : 'main-toc'; summary.textContent = 'Contents'; details.append(summary, list); nav.append(details);
  let section, usedNestedId = false;
  if (!conf.module) list.id = '64ed9da16e772_105928';
  for (const h of heads) {
    const li = document.createElement('li'), a = document.createElement('a'); a.setAttribute('href', '#' + h.id); a.textContent = clean(h.textContent); if (!conf.module) a.id = h.id + '-toc'; li.append(a);
    if (!conf.module && h.tagName === 'H3') {if (!section) throw Error('Comparison child topic needs parent'); let nested = section.querySelector('ul'); if (!nested) {nested = document.createElement('ul'); if (!usedNestedId) {nested.id = '64ed9da16e775_105928'; usedNestedId = true;} section.append(nested);} nested.append(li);} else {list.append(li); section = li;}
  }
  contents[0].replaceWith(nav);
  const originals = active(source, 'img'), images = active(body, 'img');
  if (originals.length !== conf.files.length || images.length !== originals.length || source.querySelectorAll('noscript').length !== conf.files.length || ![0, conf.files.length].includes(body.querySelectorAll('noscript').length)) throw Error('Original comparison image count required');
  for (let i = 0; i < images.length; i++) {
    const n = images[i], old = originals[i], origin = old.dataset.lazySrc || old.getAttribute('src'), src = n.dataset.lazySrc || n.getAttribute('src'), cls = old.getAttribute('class'), prepared = cls?.split(/\s+/).filter(v => !['entered', 'exited', 'lazyloading'].includes(v)).join(' '), attrs = new Set([...old.attributes].map(a => a.name).concat(['loading', 'decoding', 'alt']));
    const originalName = !conf.module && i === 2 ? '1693298437_severinus-dewantara-0fl-WGMuNPA-unsplash%20(1).jpg' : conf.files[i].slice(13);
    if (!origin.endsWith('/' + originalName) || ![origin, '__KTK_PAGE_ASSETS__media/' + conf.files[i]].includes(src) || ['id', 'width', 'height', 'style'].some(a => n.getAttribute(a) !== old.getAttribute(a)) || ![cls, prepared].includes(n.getAttribute('class')) || ![old.getAttribute('alt'), revision.imageDescriptions[conf.files[i].slice(0, 12)]].includes(n.getAttribute('alt')) || [...n.attributes].some(a => !attrs.has(a.name) || a.name.startsWith('on')) || n.closest('a')) throw Error('Original comparison photo identity required');
    if (!marker) {const p = n.parentElement.cloneNode(true), q = old.parentElement.cloneNode(true); p.querySelectorAll('noscript').forEach(n => n.remove()); q.querySelectorAll('noscript').forEach(n => n.remove()); p.querySelector('img').replaceWith(old.cloneNode(true)); if (conf.module && i === 0 && q.getAttribute('class') === 'et_pb_image_wrap ' && p.getAttribute('class') === 'et_pb_image_wrap') q.setAttribute('class', 'et_pb_image_wrap'); if (p.outerHTML !== q.outerHTML) throw Error('Original comparison photo parent required');}
    if (!conf.module) {const p = document.createElement('p'); p.append(n.cloneNode(true)); slots[i].replaceWith(p);}
  }
  const oldFallbacks = [...source.querySelectorAll('noscript')]; if ([...body.querySelectorAll('noscript')].some((n, i) => n.outerHTML !== oldFallbacks[i]?.outerHTML)) throw Error('Original comparison fallback required');
  const nextIds = ids(t.content), oldIds = [...new Set(ids(source))];
  if (nextIds.length !== (conf.module ? 7 : 47) || new Set(nextIds).size !== nextIds.length || oldIds.some(id => !nextIds.includes(id)) || oldIds.length !== (conf.module ? 0 : 47)) throw Error('Every unique comparison destination must remain');
  const replacement = t.innerHTML;
  if (conf.module) {
    const outside = n => {const c = n.cloneNode(true); c.querySelectorAll('.et_pb_text_inner,noscript').forEach(n => n.remove()); return c;}, a = outside(body), b = outside(source), links = n => [...n.querySelectorAll('a[href]')].map(n => [localHref(n.getAttribute('href')), n.innerHTML]);
    if (clean(a.textContent) !== clean(b.textContent) || JSON.stringify(links(a)) !== JSON.stringify(links(b))) throw Error('Original copy/links outside European interior changed');
  }
  if (marker) {if (marker !== revision.version || current.innerHTML !== replacement) throw Error('Changed reviewed comparison copy'); return [];}
  const clone = current.cloneNode(true), copy = before.cloneNode(true), context = [...clone.querySelectorAll('[data-ktk-contextual-links]')];
  if (context.length > (conf.module ? 1 : 0) || context.some(n => n.outerHTML !== exactContext)) throw Error('Original comparison contextual boundary changed'); context.forEach(n => n.remove());
  const a = [...clone.querySelectorAll('a[href]')], b = [...copy.querySelectorAll('a[href]')];
  if (a.length !== b.length || a.some((n, i) => ![b[i].getAttribute('href'), localHref(b[i].getAttribute('href'))].includes(n.getAttribute('href')) || n.innerHTML !== b[i].innerHTML)) throw Error('Original comparison links changed');
  if (conf.module) {a.forEach((n, i) => n.setAttribute('href', b[i].getAttribute('href'))); if (clone.innerHTML !== copy.innerHTML) throw Error('Original European interior changed');}
  else {clone.querySelectorAll('noscript').forEach(n => n.remove()); copy.querySelectorAll('noscript').forEach(n => n.remove()); if (clean(clone.textContent) !== clean(copy.textContent) || JSON.stringify(ids(clone)) !== JSON.stringify(ids(copy))) throw Error('Original Budapest copy or destinations changed');}
  // Validate the entire body, late image and legacy TOC before any live replacement.
  current.innerHTML = replacement; body.dataset.ktkComparisonReview = revision.version;
  return [{type: 'nightlife-comparison-review', key, reviewedOn: revision.reviewedOn, textInteriors: conf.module ? 1 : 0, retainedInlinePhotos: images.length, nativeContentsTargets: heads.length}];
}

export function reviseNightlifeComparisonFeature({key, revision}) {
  if (key !== 'post-budapest-or-krakow-nightlife') return [];
  if (revision?.key !== key || revision.sourceSha256 !== 'c5feb54a7aa39c81a78d0f948507ba55a2085a94a0db80e6bea99b6b5ad470e3' || revision.version !== '2026-11-15.nightlife-comparison-1' || revision.reviewedOn !== '2026-11-15' || typeof revision.sourceHtml !== 'string') throw Error('Reviewed comparison feature identity required');
  const file = '3f1d6d7b2118-fioamgdxj141693300706-1080x675.jpg', oldAlt = 'budapest or krakow nightlife', alt = 'A concert audience holding phones toward a stage beneath hanging decorations.', find = d => [...d.querySelectorAll('#main-content .et_post_meta_wrapper img')].filter(n => !n.closest('noscript')), original = find(new DOMParser().parseFromString(revision.sourceHtml, 'text/html')), current = find(document);
  if (original.length !== 1 || current.length !== 1) throw Error('One original Budapest feature required');
  const before = original[0], n = current[0], origin = before.dataset.lazySrc || before.getAttribute('src'), src = n.dataset.lazySrc || n.getAttribute('src'), cls = before.getAttribute('class'), prepared = cls?.split(/\s+/).filter(v => !['entered', 'exited'].includes(v)).join(' ');
  if (!origin.endsWith('/' + file.slice(13)) || ![origin, '__KTK_PAGE_ASSETS__media/' + file].includes(src) || before.getAttribute('alt') !== oldAlt || ![oldAlt, alt].includes(n.getAttribute('alt')) || ['id', 'width', 'height', 'style'].some(a => n.getAttribute(a) !== before.getAttribute(a)) || ![cls, prepared].includes(n.getAttribute('class')) || [...n.attributes].some(a => a.name.startsWith('on'))) throw Error('Exact comparison feature identity required');
  if (n.getAttribute('alt') === alt) return []; n.setAttribute('alt', alt); return [{type: 'neutral-comparison-feature', key, file, alt}];
}

const scope = ':is(body.ktk-code-page[data-ktk-page="post-best-pub-crawls-in-europe"] #main-content .entry-content[data-ktk-comparison-review] .et_pb_text_inner,body.ktk-code-page[data-ktk-page="post-budapest-or-krakow-nightlife"] #main-content .entry-content[data-ktk-comparison-review])';
const styles = '/* BEGIN Nightlife comparison guidance */\n' + scope + ' { font-size: 16px; line-height: 1.65; letter-spacing: 0; text-align: left; }\n' + scope + ' p { font-size: 16px; line-height: 1.65; }\n' + scope + ' :is(h2,h3) { font-family: inherit; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\n' + scope + ' h2 { font-size: 22px; }\n' + scope + ' h3 { font-size: 18px; }\n' + scope + ' nav { margin: 1em 0; }\n' + scope + ' summary { cursor: pointer; min-height: 44px; padding: 8px 0; font-weight: 700; }\n' + scope + ' a { color: #c8006c !important; text-decoration: underline; text-underline-offset: .15em; }\n' + scope + ' :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  ' + scope + ' { padding-right: 24px; }\n}\n/* END Nightlife comparison guidance */\n';
export async function buildNightlifeComparisonStyles(file) {
  const css = await readFile(file, 'utf8'), anchor = '/* BEGIN Party trip planning guidance */';
  if (css.split(anchor).length !== 2) throw Error('Stable comparison style anchor required');
  if (css.includes('/* BEGIN Nightlife comparison guidance */') || css.includes('/* END Nightlife comparison guidance */')) {if (css.split('/* BEGIN Nightlife comparison guidance */').length !== 2 || css.split('/* END Nightlife comparison guidance */').length !== 2 || !css.includes(styles + '\n' + anchor)) throw Error('Comparison style drift'); return;}
  await writeFile(file, css.replace(anchor, styles + '\n' + anchor));
}
