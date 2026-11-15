import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadHotelGuidesEditorial() {
  const assetsBytes = await readFile(new URL('../docs/code-pages/full-migration/assets.json', import.meta.url)), assetManifestSha256 = createHash('sha256').update(assetsBytes).digest('hex'), assets = JSON.parse(assetsBytes);
  const images = JSON.parse(await readFile(new URL('./hotel-guide-images.json', import.meta.url), 'utf8')), legacy = JSON.parse(await readFile(new URL('./content-image-descriptions.json', import.meta.url), 'utf8')), rows = [];
  if (assetManifestSha256 !== 'f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691' || images.schemaVersion !== 1 || images.status !== 'visually-reviewed' || images.reviewedOn !== '2026-11-15' || images.assetManifestSha256 !== assetManifestSha256 || !images.descriptions || Object.keys(images.descriptions).length !== 83 || Object.entries(images.descriptions).some(([id, alt]) => !/^[a-f0-9]{12}$/.test(id) || typeof alt !== 'string' || alt.length < 20 || alt.length > 180 || /[<>\u0000-\u001f]/.test(alt))) throw Error('Reviewed unchanged hotel photo policy required');
  for (const [key, draft, sha] of [['post-best-hotels-in-krakow-2019-2020', 'historical-hotel-shortlist', 'db7aae8b8c6e13e409264a6a68f1129a635572c6bac45da7f67853195e8cfda2'], ['post-spa-hotels-krakow', 'spa-hotel-planning', '6217c5000a14f8a710712458d1318888f260735172cc5eae1f10691a28c0cca2']]) {
    const sourceHtml = await readFile(new URL('../docs/code-pages/full-migration/captures/' + key + '/production-1920.html', import.meta.url), 'utf8'), markup = await readFile(new URL('./content/' + draft + '.html', import.meta.url), 'utf8');
    if (createHash('sha256').update(sourceHtml).digest('hex') !== sha || /[{}]/.test(markup)) throw Error('Exact original hotel capture and resolved draft required');
    rows.push({key, sourceHtml, sourceSha256: sha, markup, images: images.descriptions, legacyImages: legacy.descriptions, assets, reviewedOn: '2026-11-15', version: '2026-11-15.hotel-guides-1'});
  }
  return rows;
}

export function reviseHotelGuidesEditorial({key, revision}) {
  const photoIds = ["67050c6e93f1","18c345e6c6d4","f0da9da2c67d","9272e1328d73","6b8b9a986105","a48f995cf7a4","a182c1838034","c3e6130d54b3","ad1c6055a313","128e4d9a86af","56204ce8cefa","4b0f5fdc9a82","d3c5baeac947","03b2f69e3972","24065b39a308","5daab9b288c1","aa294f5f737b","6aa9c90ea21b","292e522959d6","55765d2c6c35","b4d28d74ef5d","71d1d2e700f4","a74b1da20d83","5f7f6ca0c5a1","dd642cfc5388","660cec285650","e8a9a70ffad4","e8ba478abb82","1007a90a3fe3","f6978c13ca9f","d96bd30353b4","0b1073e9e84d","8bce622dae2f","d8b40598cb27","075ec425898f","690c0efcdf29","554e9704eff9","1d4af80deabe","b208aaa86498","686719f744f8","c2cca4a4006e","5a47dea8aea8","2fc70da73d34","5f924eaafbf3","50873950d1d6","2831cb744871","5bed7393b2f0","dd12fafc9621","1d0911a0f16e","374cba245502","ded09a1e57ed","f2bd9ca853c5","ef20835aadb6","99553e9bc6af","e02a450e2485","7c101eea8f8a","69d05835cec0","513593caf564","2a47bcd01dfc","5ea42adc619c","9e8348d25648","f5afbfedee33","c03c7d2061df","ef1e14c227f7","d73975619f42","39b6f8b71863","a2fdca20b091","0fcba043be69","cc45279a5771","9480922f4517","209565189c06","ec283dbe2a89","f3d7775d6b6b","b3f171b8f564","a3be12a783b3","31b931f82064","9e3f1ccd4212","c2bce2a08549","345991ed4eff","c867222506b2","0d391f651622","b8ba4e984d4c","737e19b7bc31"], definitions = {
    'post-best-hotels-in-krakow-2019-2020': {sha: 'db7aae8b8c6e13e409264a6a68f1129a635572c6bac45da7f67853195e8cfda2', title: 'Best Hotels in Krakow in 2019', modules: 31, photos: photoIds.slice(0, 79)},
    'post-spa-hotels-krakow': {sha: '6217c5000a14f8a710712458d1318888f260735172cc5eae1f10691a28c0cca2', title: 'Unwind in Style: A Tour of Spa Hotels Krakow', modules: 0, photos: photoIds.slice(79)}
  };
  if (!Object.hasOwn(definitions, key)) return [];
  const conf = definitions[key], clean = s => (s || '').replace(/\s+/g, ' ').trim(), active = (n, s) => [...n.querySelectorAll(s)].filter(n => !n.closest('noscript')), ids = n => active(n, '[id]').map(n => n.id);
  if (revision?.key !== key || revision.sourceSha256 !== conf.sha || revision.version !== '2026-11-15.hotel-guides-1' || revision.reviewedOn !== '2026-11-15' || typeof revision.sourceHtml !== 'string' || typeof revision.markup !== 'string' || !revision.images || !revision.legacyImages || !revision.assets) throw Error('Reviewed hotel identity required');
  const original = new DOMParser().parseFromString(revision.sourceHtml, 'text/html').querySelector('#main-content'), main = document.querySelector('#main-content'), source = original?.querySelector('.entry-content'), body = main?.querySelector('.entry-content'), forbidden = 'form,iframe,video,script,style,input,button';
  if (!source || !body || document.querySelectorAll('#main-content').length !== 1 || main.querySelectorAll('.entry-content').length !== 1 || clean(original.querySelector('h1')?.textContent) !== conf.title || clean(main.querySelector('h1')?.textContent) !== conf.title || source.querySelector(forbidden) || body.querySelector(forbidden) || [body, ...body.querySelectorAll('*')].some(n => [...n.attributes].some(a => a.name.startsWith('on')))) throw Error('Original hotel headline and safe body required');
  const marker = body.getAttribute('data-ktk-hotel-guides-review'), modules = conf.modules ? [...body.querySelectorAll('.et_pb_text_inner')] : [body], sources = conf.modules ? [...source.querySelectorAll('.et_pb_text_inner')] : [source], sourceIds = ids(source);
  if (body.getAttribute('id') !== source.getAttribute('id') || !marker && JSON.stringify(ids(body)) !== JSON.stringify(sourceIds) || conf.modules && (modules.length !== 31 || sources.length !== 31 || [...modules, ...sources].some(n => n.querySelector(forbidden + ',img'))) || !conf.modules && (source.querySelector('.et_pb_text_inner') || body.querySelector('.et_pb_text_inner'))) throw Error('Exact original hotel body and interiors required');
  const t = document.createElement('template'); t.innerHTML = revision.markup; let plans;
  if (conf.modules) {
    const slots = [...t.content.children];
    if (slots.length !== 31 || slots.some((n, i) => n.tagName !== 'TEMPLATE' || n.attributes.length !== 1 || n.getAttribute('data-ktk-hotel-module') !== String(i)) || [...t.content.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())) throw Error('Exact ordered thirty-one hotel module slots required');
    plans = slots.map(n => n.content);
  } else plans = [t.content];
  const all = plans.flatMap(n => [...n.querySelectorAll('*')]), allowed = new Set([
    '__KTK_HOME_URL__travel-krakow-your-comprehensive-city-guide/', '__KTK_HOME_URL__store2/pub-crawl-28/#book', '__KTK_HOME_URL__spa-hotels-krakow/', '__KTK_HOME_URL__best-hotels-in-krakow-2019-2020/', '__KTK_HOME_URL__best-places-to-eat/', '__KTK_HOME_URL__krakow-nightlife/', '__KTK_HOME_URL__store2/',
    'https://artgardenresidence.pl/kontakt', 'https://www.lwowska1.pl/en', 'https://jan-krakow.pl/public/en/about', 'https://www.hoteleden.pl/en/', 'https://www.queenhotel.pl/en', 'https://metropolitanboutiquehotel.pl/', 'https://www.leonardo-hotels.com/krakow/leonardo-boutique-hotel-krakow-old-town', 'https://www.donimirski.com/hotel-polski', 'https://www.hotelwawel.pl/en/location', 'https://www.ahsm-krakow.com/', 'https://aparthoteloldtown.pl/en/contact', 'https://balthazarhotel.com/en/', 'https://bachledaluxuryhotel.pl/en/hotel/about-us', 'https://bachledaluxuryhotel.pl/en/spa-page-186531', 'https://www.hotelunicuspalace.pl/en/contact', 'https://www.hotelunicuspalace.pl/en/wellness', 'https://www.wyndhamhotels.com/wyndham-grand/cracow-poland/wyndham-grand-krakow-old-town', 'https://copernicus.hotel.com.pl/hotel-copernicus', 'https://www.donimirski.com/hotel-grodek', 'https://stary.hotel.com.pl/hotel-stary/', 'https://stary.hotel.com.pl/hotel-stary/wellness-i-spa', 'https://www.larishotels.com/en/hotel-santi', 'https://www.wyndhamhotels.com/vienna-house/cracow-poland/vienna-house-andels-cracow', 'https://www.radissonhotels.com/en-us/hotels/radisson-blu-krakow', 'https://www.hilton.com/en/hotels/krkhxhx-hampton-krakow/hotel-location/', 'https://www.wyndhamhotels.com/en-uk/vienna-house/cracow-poland/vienna-house-easy-cracow/local-area', 'https://all.accor.com/hotel/9627/index.en.shtml', 'https://purohotels.com/en/cracow/cracow-old-town/contact/', 'https://purohotels.com/en/cracow/cracow-kazimierz/', 'https://www.chocholowskietermy.pl/en/', 'https://www.chocholowskietermy.pl/en/regulamin/'
  ]);
  for (const n of all) {
    const attrs = n.tagName === 'A' ? ['href'] : ['H2', 'H3'].includes(n.tagName) ? ['id'] : n.tagName === 'TIME' ? ['datetime'] : n.tagName === 'TEMPLATE' ? ['data-ktk-hotel-contents', 'data-ktk-hotel-photo'] : [];
    if (!['P', 'H2', 'H3', 'A', 'STRONG', 'TIME', 'TEMPLATE'].includes(n.tagName) || [...n.attributes].some(a => !attrs.includes(a.name))) throw Error('Unreviewed hotel markup');
    if (n.tagName === 'A' && (!allowed.has(n.getAttribute('href')) || !clean(n.textContent))) throw Error('Unreviewed hotel destination');
    if (n.tagName === 'TIME' && (n.getAttribute('datetime') !== revision.reviewedOn || n.textContent !== '15 November 2026')) throw Error('Hotel review date changed');
  }
  const contents = all.filter(n => n.matches('template[data-ktk-hotel-contents]')), photoSlots = all.filter(n => n.matches('template[data-ktk-hotel-photo]')), heads = all.filter(n => ['H2', 'H3'].includes(n.tagName)), oldHeads = active(source, 'h2,h3').filter(n => n.id && n.id !== 'main-toc');
  const hotelIds = ['hotel-guide-planning', 'hotel-original-budget', 'hotel-art-garden', 'hotel-lwowska', 'hotel-jan', 'hotel-eden', 'hotel-original-midrange', 'hotel-queen', 'hotel-metropolitan', 'hotel-legend-history', 'hotel-polski', 'hotel-wawel', 'hotel-nobilton-unconfirmed', 'hotel-stare-miasto', 'hotel-pergamin-history', 'hotel-original-luxury', 'hotel-balthazar', 'hotel-bachleda', 'hotel-unicus-address', 'hotel-copernicus', 'hotel-grodek', 'hotel-stary', 'hotel-santi', 'hotel-original-business', 'hotel-andels', 'hotel-radisson', 'hotel-hampton', 'hotel-vienna-easy', 'hotel-mercure', 'hotel-puro-oldtown', 'hotel-puro-kazimierz'];
  if (contents.length !== 1 || contents[0].attributes.length !== 1 || contents[0].getAttribute('data-ktk-hotel-contents') !== '' || contents[0].innerHTML.trim() || all.filter(n => n.tagName === 'TIME').length !== 1 || photoSlots.length !== (conf.modules ? 0 : 3) || photoSlots.some((n, i) => n.attributes.length !== 1 || n.getAttribute('data-ktk-hotel-photo') !== String(i) || n.innerHTML.trim()) || all.filter(n => n.tagName === 'TEMPLATE').length !== 1 + photoSlots.length) throw Error('Complete hotel contents and photo slots required');
  if (heads.length !== (conf.modules ? 31 : 10) || heads.some((n, i) => !clean(n.textContent) || n.id !== (conf.modules ? hotelIds[i] : oldHeads[i]?.id) || n.tagName !== (conf.modules ? [0, 1, 6, 15, 23].includes(i) ? 'H2' : 'H3' : oldHeads[i]?.tagName))) throw Error('Exact hotel topic destinations required');
  const nav = document.createElement('nav'), details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('ul');
  nav.setAttribute('aria-label', conf.modules ? 'Historical hotel shortlist contents' : 'Krakow spa planning contents'); summary.id = conf.modules ? 'hotel-guide-contents' : 'main-toc'; summary.textContent = 'Contents'; details.append(summary, list); nav.append(details);
  if (!conf.modules) list.id = '64eb1bb88be95_105862'; let section, firstNested = true;
  for (const h of heads) {
    const li = document.createElement('li'), a = document.createElement('a'); a.setAttribute('href', '#' + h.id); a.textContent = clean(h.textContent); li.append(a); if (!conf.modules) li.id = h.id + '-toc';
    if (h.tagName === 'H3') {if (!section) throw Error('Hotel child topic needs a parent'); let nested = section.querySelector('ul'); if (!nested) {nested = document.createElement('ul'); if (!conf.modules && firstNested) {nested.id = '64eb1bb88be99_105862'; firstNested = false;} section.append(nested);} nested.append(li);} else {list.append(li); section = li;}
  }
  contents[0].replaceWith(nav);
  const rewrite = value => typeof value === 'string' ? Object.entries(revision.assets).sort((a, b) => b[0].length - a[0].length).reduce((s, [url, row]) => s.split(url).join('__KTK_PAGE_ASSETS__' + row.file), value) : value;
  const oldPhotos = active(original, 'img'), photos = active(main, 'img'), altPlans = [];
  if (oldPhotos.length !== conf.photos.length || photos.length !== oldPhotos.length || source.querySelectorAll('noscript').length !== (conf.modules ? 78 : 3) || ![0, conf.modules ? 78 : 3].includes(body.querySelectorAll('noscript').length)) throw Error('Every original hotel photo and fallback required');
  for (let i = 0; i < photos.length; i++) {
    const n = photos[i], old = oldPhotos[i], origin = old.dataset.lazySrc || old.getAttribute('src'), next = rewrite(origin), file = next?.replace('__KTK_PAGE_ASSETS__media/', ''), id = conf.photos[i], alt = revision.images[id], classes = old.getAttribute('class'), preparedClasses = classes?.split(/\s+/).filter(v => !['entered', 'exited', 'lazyloading'].includes(v)).join(' ');
    if (!file?.startsWith(id + '-') || !alt || ![origin, next].includes(n.dataset.lazySrc || n.getAttribute('src')) || ![old.getAttribute('src'), origin, next].includes(n.getAttribute('src')) || ![old.getAttribute('srcset'), rewrite(old.getAttribute('srcset') || old.dataset.lazySrcset || null)].includes(n.getAttribute('srcset')) || ![classes, preparedClasses].includes(n.getAttribute('class')) || ['id', 'width', 'height', 'style'].some(a => n.getAttribute(a) !== old.getAttribute(a)) || ![old.getAttribute('alt'), revision.legacyImages[id], alt].includes(n.getAttribute('alt')) || marker && n.getAttribute('alt') !== alt || [...n.attributes].some(a => a.name.startsWith('on')) || ![old.closest('a')?.getAttribute('href') || null, rewrite(old.closest('a')?.getAttribute('href')) || null].includes(n.closest('a')?.getAttribute('href') || null)) throw Error('Exact original hotel photo identity required: ' + i);
    altPlans.push({node: n, alt});
    if (!conf.modules && i) {const p = document.createElement('p'), image = n.cloneNode(true); image.setAttribute('alt', alt); p.append(image); photoSlots[i - 1].replaceWith(p);}
  }
  const fallbacks = [...source.querySelectorAll('noscript')]; if ([...body.querySelectorAll('noscript')].some((n, i) => n.outerHTML !== fallbacks[i]?.outerHTML)) throw Error('Original hotel fallback changed');
  const nextIds = plans.flatMap(ids), oldIds = [...new Set(sourceIds)]; if (nextIds.length !== (conf.modules ? 32 : 23) || new Set(nextIds).size !== nextIds.length || oldIds.length !== (conf.modules ? 0 : 23) || oldIds.some(id => !nextIds.includes(id))) throw Error('All unique hotel destinations required');
  const serialize = n => {const t = document.createElement('template'); t.content.append(n.cloneNode(true)); return t.innerHTML;}, replacements = plans.map(serialize);
  if (marker) {if (marker !== revision.version || JSON.stringify(ids(body)) !== JSON.stringify(nextIds) || modules.some((n, i) => n.innerHTML !== replacements[i])) throw Error('Changed reviewed hotel copy'); return [];}
  if (conf.modules) {
    const outside = n => {const c = n.cloneNode(true); c.querySelectorAll('.et_pb_text_inner,noscript').forEach(n => n.remove()); return clean(c.textContent);}; if (outside(body) !== outside(source)) throw Error('Hotel copy outside text interiors changed');
    for (let i = 0; i < modules.length; i++) {
      const a = modules[i].cloneNode(true), b = sources[i].cloneNode(true);
      if (i === 6) for (const clone of [a, b]) {
        const first = clone.firstElementChild;
        if (first?.outerHTML === '<h2><b></b></h2>') {const p = document.createElement('p'); p.dataset.ktkHeadingOrigin = 'h2'; p.innerHTML = first.innerHTML; first.replaceWith(p);}
        else if (first?.outerHTML !== '<p data-ktk-heading-origin="h2"><b></b></p>') throw Error('Exact existing empty hotel heading repair required');
      }
      const ah = [...a.querySelectorAll('h1,h2,h3,h4,h5,h6')], bh = [...b.querySelectorAll('h1,h2,h3,h4,h5,h6')], al = [...a.querySelectorAll('a')], bl = [...b.querySelectorAll('a')];
      if (clean(a.textContent) !== clean(b.textContent) || ah.length !== bh.length || al.length !== bl.length || al.some((n, j) => n.getAttribute('href') !== bl[j].getAttribute('href') || n.innerHTML !== bl[j].innerHTML)) throw Error('Original hotel text or links changed');
      ah.forEach((n, j) => n.replaceWith(bh[j].cloneNode(true))); al.forEach((n, j) => n.replaceWith(bl[j].cloneNode(true))); if (a.innerHTML !== b.innerHTML) throw Error('Original hotel text interior changed');
    }
  } else {
    const a = body.cloneNode(true), b = source.cloneNode(true); a.querySelectorAll('noscript').forEach(n => n.remove()); b.querySelectorAll('noscript').forEach(n => n.remove());
    if (clean(a.textContent) !== clean(b.textContent) || JSON.stringify(ids(a)) !== JSON.stringify(ids(b))) throw Error('Original spa copy or destinations changed');
  }
  // All source, late interior and photo guards close before any live mutation.
  for (const plan of altPlans) plan.node.setAttribute('alt', plan.alt);
  for (let i = 0; i < modules.length; i++) modules[i].innerHTML = replacements[i]; body.dataset.ktkHotelGuidesReview = revision.version;
  return [{type: 'hotel-guides-review', key, reviewedOn: revision.reviewedOn, textInteriors: conf.modules, retainedPhotos: photos.length, nativeContentsTargets: heads.length, reviewedImageDescriptions: altPlans.length}];
}

const scope = ':is(body.ktk-code-page[data-ktk-page="post-best-hotels-in-krakow-2019-2020"] #main-content .entry-content[data-ktk-hotel-guides-review] .et_pb_text_inner,body.ktk-code-page[data-ktk-page="post-spa-hotels-krakow"] #main-content .entry-content[data-ktk-hotel-guides-review])';
const galleryScope = 'body.ktk-code-page[data-ktk-page="post-best-hotels-in-krakow-2019-2020"] #main-content .entry-content[data-ktk-hotel-guides-review] .et_pb_gallery_grid .et_pb_gallery_item';
const styles = '/* BEGIN Hotel guide planning */\n' + scope + ' { font-size: 16px; line-height: 1.65; letter-spacing: 0; text-align: left; }\n' + scope + ' p { font-size: 16px; line-height: 1.65; }\n' + scope + ' :is(h2,h3) { font-family: inherit; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\n' + scope + ' h2 { font-size: 22px; }\n' + scope + ' h3 { font-size: 18px; }\n' + scope + ' nav { margin: 1em 0; }\n' + scope + ' summary { cursor: pointer; min-height: 44px; padding: 8px 0; font-weight: 700; }\n' + scope + ' a { color: #c8006c !important; text-decoration: underline; text-underline-offset: .15em; }\n' + scope + ' :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  ' + scope + ' { padding-right: 24px; }\n}\n' + galleryScope + ' { display: block; }\n/* END Hotel guide planning */\n';
export async function buildHotelGuidesStyles(file) {
  const css = await readFile(file, 'utf8'), anchor = '/* BEGIN Hen and historical bars guidance */';
  if (css.split(anchor).length !== 2) throw Error('Stable hotel style anchor required');
  if (css.includes('/* BEGIN Hotel guide planning */') || css.includes('/* END Hotel guide planning */')) {if (css.split('/* BEGIN Hotel guide planning */').length !== 2 || css.split('/* END Hotel guide planning */').length !== 2 || !css.includes(styles + '\n' + anchor)) throw Error('Hotel style drift'); return;}
  await writeFile(file, css.replace(anchor, styles + '\n' + anchor));
}

