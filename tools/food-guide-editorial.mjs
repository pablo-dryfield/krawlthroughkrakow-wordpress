import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadFoodGuideEditorial() {
  const images = JSON.parse(await readFile(new URL('./content-image-descriptions.json', import.meta.url), 'utf8'));
  if (images.status !== 'visually-reviewed' || images.assetManifestSha256 !== 'f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691') throw Error('Reviewed food-guide image policy required');
  const rows = [];
  for (const [key, file, sourceSha256] of [['post-best-places-to-eat', 'food-places', '3880b2b2307fbbe83073c3076c82f4983a36b387d2d7d1146b59ecfb851769af'], ['post-krakow-food-truck-parks', 'food-truck-markets', '612c035259606976f23da1eeee13d5bca33beba18c1141e0d0278fba36d8de2e'], ['post-krakow-milkbars', 'milkbar-choices', 'ed866223f014b68d11128bf5e50341eaa1610960ec7742fee016cc431d36d52c']]) {
    const sourceHtml = await readFile(new URL('../docs/code-pages/full-migration/captures/' + key + '/production-1920.html', import.meta.url), 'utf8');
    if (createHash('sha256').update(sourceHtml).digest('hex') !== sourceSha256) throw Error('Original food-guide capture changed');
    const markup = await readFile(new URL('./content/' + file + '.html', import.meta.url), 'utf8');
    if (/[{}]/.test(markup)) throw Error('Unresolved food-guide fact');
    rows.push({key, sourceSha256, sourceHtml, markup, imageDescriptions: images.descriptions, reviewedOn: '2026-11-14', version: '2026-11-14.food-guides-1'});
  }
  return rows;
}

export function reviseFoodGuideEditorial({key, revision}) {
  const definitions = {
    'post-best-places-to-eat': {sha: '3880b2b2307fbbe83073c3076c82f4983a36b387d2d7d1146b59ecfb851769af', modules: 43, unique: 1, duplicates: 0, label: 'Krakow food guide contents', generated: [], heads: ['food-in-krakow', 'krakow-breakfast', 'milkbar-tomasza-breakfast', 'charlotte-breakfast', 'tamam-breakfast', 'krakow-lunch', 'koko-bordo-lunch', 'krakowiacy-pierogi', 'dinner-before-night-out', 'am-nam-dinner', 'warsztat-dinner', 'okraglak-food', 'krakow-street-food', 'food-and-bars', 'sport-pub-442', 'la-bodega-evening', 'late-night-food', 'przypiecek-pierogi', 'late-zapiekanka', 'krakow-sweet-stops', 'paczki', 'chimney-cake', 'more-food-and-evening-plans'], files: ['41db384bd679-image2.jpg', '8add58e70d7b-image1.jpg']},
    'post-krakow-food-truck-parks': {sha: '612c035259606976f23da1eeee13d5bca33beba18c1141e0d0278fba36d8de2e', modules: 0, unique: 28, duplicates: 3, label: 'Krakow street food and market contents', generated: ['6494464813365_58154', '6494464813367_58154'], heads: ['starykleparzfoodtruckpark', 'diversecuisineoptionsfromaroundtheworld', 'familyfriendlyatmospherewithampleseating', 'krakowstreetfoodmarket', 'convenientlocationnearpublictransportationhubs', 'quickbitesperfectforbusytravelers', 'placnowyfoodtruckpark', 'uniquetwostorypatiobarsetting', 'kazimierzjewishquarterisaacsynagoguestreetfoodspot', 'historicallocationwithinkrakowsjewishquarter', 'authenticpolishstreetfoodofferings', 'conclusion'], files: ['0089fb77a7fe-1684909557_1684909551716.png', '557e629c7a42-1684910632_1684910627896.png', '19f78a1f232d-1684913408_1684913404675.png', 'a92ede4c1d63-1684910638_1684910626684.png', '404bee1edea2-1684911902_1684911897941.png', '7df243d82bb3-1684913959_1684913944019.png', '6ad0dae0eb9e-1684912914_1684912910815.png', 'a7183b0d16bb-1684913963_1684913955752.png']},
    'post-krakow-milkbars': {sha: 'ed866223f014b68d11128bf5e50341eaa1610960ec7742fee016cc431d36d52c', modules: 0, unique: 32, duplicates: 2, label: 'Krakow milk bar contents', generated: ['649429f2f3075_58151', '649429f2f3079_58151'], heads: ['therevivalofkrakowmilkbars', 'historicalsignificanceofmilkbarsinpoland', 'milkbartomaszaamixoftraditionalandwesterncuisine', 'menuhighlightsatmilkbartomasza', 'milkbaranny5', 'pierogiparadiseexploringcheapeatsinkrakow', 'toplocationstofindbudgetfriendlypierogi', 'otheraffordablelocalspecialtiesworthtrying', 'authenticityaboundsatkrakusmilkbar', 'whatsetskrakusapartfromothermilkbars', 'faqsinrelationtokrakowmilkbars', 'whyisamilkbarcalledamilkbar', 'whyaremilkbarsfamous', 'conclusion'], files: ['0c529a1cfd5e-1683876087_1683876084316.png', 'e03eeb03b6f2-1683876263_1683876261684.png', '66f6810600e5-1683879158_1683879155071.png', 'e3e552d96c43-1683879357_1683879355128.png']}
  };
  if (!Object.hasOwn(definitions, key)) return [];
  const conf = definitions[key], clean = s => (s || '').replace(/\s+/g, ' ').trim();
  if (revision?.key !== key || revision.sourceSha256 !== conf.sha || revision.version !== '2026-11-14.food-guides-1' || revision.reviewedOn !== '2026-11-14' || typeof revision.sourceHtml !== 'string' || typeof revision.markup !== 'string' || !revision.imageDescriptions) throw Error('Reviewed food-guide identity required');
  const original = new DOMParser().parseFromString(revision.sourceHtml, 'text/html').querySelector('#main-content'), main = document.querySelector('#main-content'), body = main?.querySelector('.entry-content'), source = original?.querySelector('.entry-content');
  if (!body || !source || document.querySelectorAll('#main-content').length !== 1 || main.querySelectorAll('.entry-content').length !== 1 || !clean(original.querySelector('h1.entry-title')?.textContent) || clean(main.querySelector('h1.entry-title')?.textContent) !== clean(original.querySelector('h1.entry-title')?.textContent) || !clean(original.querySelector('.published')?.textContent) || clean(main.querySelector('.published')?.textContent) !== clean(original.querySelector('.published')?.textContent)) throw Error('Original food-guide publication required');
  const ids = n => [...n.querySelectorAll('[id]')].map(n => n.id), oldIds = ids(source), oldUnique = [...new Set(oldIds)], nodes = [...body.querySelectorAll('.et_pb_text_inner')], oldNodes = [...source.querySelectorAll('.et_pb_text_inner')], marker = body.getAttribute('data-ktk-food-review');
  if (oldUnique.length !== conf.unique || oldIds.length - oldUnique.length !== conf.duplicates || nodes.length !== conf.modules || oldNodes.length !== conf.modules || body.querySelector('form,iframe,video,script,style,input,button') || nodes.some(n => n.querySelector('img')) || (conf.modules ? JSON.stringify(oldUnique) !== '["gtx-trans"]' : JSON.stringify([...source.querySelectorAll('h2,h3')].filter(n => n.id !== 'main-toc').map(n => n.id)) !== JSON.stringify(conf.heads))) throw Error('Exact original food-guide structure required');
  if (conf.modules) {const outside = n => {const copy = n.cloneNode(true); copy.querySelectorAll('.et_pb_text_inner,script,style,noscript').forEach(n => n.remove()); return clean(copy.textContent);}; if (outside(body) !== outside(source)) throw Error('Original food copy outside interiors required');}
  const template = document.createElement('template'); template.innerHTML = revision.markup; const slots = [...template.content.children], plans = conf.modules ? slots.map(n => n.content) : [template.content];
  if (conf.modules && (slots.length !== conf.modules || slots.some((n, i) => n.tagName !== 'TEMPLATE' || n.attributes.length !== 1 || n.getAttribute('data-ktk-food-module') !== String(i)) || [...template.content.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()))) throw Error('Exact ordered food-guide interiors required');
  const all = plans.flatMap(p => [...p.querySelectorAll('*')]), allowed = new Set(['__KTK_HOME_URL__', '__KTK_HOME_URL__travel-krakow-your-comprehensive-city-guide/', '__KTK_HOME_URL__best-hotels-in-krakow-2019-2020/', '__KTK_HOME_URL__krakow-milkbars/', '__KTK_HOME_URL__krakow-weather-guide/', '__KTK_HOME_URL__krakow-food-truck-parks/', '__KTK_HOME_URL__krakow-nightlife/', '__KTK_HOME_URL__2020-krakow-nightlife-guide/', '__KTK_HOME_URL__best-places-to-eat/', '__KTK_HOME_URL__store2/polish-vodka-tasting-44/#book', '__KTK_HOME_URL__store2/food-tour-krakow-48/#book', '__KTK_HOME_URL__store2/pub-crawl-28/#book', '__KTK_HOME_URL__about-us/how-to-join/', '__KTK_HOME_URL__blog/', 'https://bistrocharlotte.com/pl/lokale/charlotte-plac-szczepanski-krakow/', 'https://www.restauracjawarsztat.pl/restauracje', 'https://krakow.pl/getHtml?dok_id=196608', 'https://www.galeriakrakowska.pl/en/shops/restaurants,18,cat,9', 'https://pub442.eatbu.com/?lang=en', 'https://przypiecek.pl/', 'https://www.starykleparz.com/nasze-wydarzenia,vdngc.html', 'https://rewitalizacja.krakow.pl/getHtml?dok_id=340549', 'https://culture.pl/en/article/milk-bars-a-taste-of-poland', 'https://podwawelem.eu/', 'https://www.barykrakow.pl/bary/krakus']);
  for (const n of all) {
    const attrs = n.tagName === 'A' ? ['href'] : ['H2', 'H3', 'P'].includes(n.tagName) ? ['id'] : n.tagName === 'TIME' ? ['datetime'] : n.tagName === 'TEMPLATE' ? ['data-ktk-food-contents', 'data-ktk-food-photo'] : [];
    if (!['P', 'SMALL', 'TIME', 'H2', 'H3', 'A', 'STRONG', 'UL', 'LI', 'TEMPLATE'].includes(n.tagName) || [...n.attributes].some(a => !attrs.includes(a.name)) || (n.tagName === 'P' && n.hasAttribute('id') && n.id !== (conf.modules ? 'gtx-trans' : 'isPasted'))) throw Error('Unreviewed food-guide markup');
    if (n.tagName === 'A' && (!allowed.has(n.getAttribute('href')) || !clean(n.textContent))) throw Error('Unreviewed food-guide destination');
    if (n.tagName === 'TIME' && (n.getAttribute('datetime') !== revision.reviewedOn || n.textContent !== '14 November 2026')) throw Error('Food-guide review date changed');
  }
  const heads = all.filter(n => ['H2', 'H3'].includes(n.tagName)), contents = all.filter(n => n.tagName === 'TEMPLATE' && n.hasAttribute('data-ktk-food-contents')), photoSlots = all.filter(n => n.tagName === 'TEMPLATE' && n.hasAttribute('data-ktk-food-photo'));
  if (JSON.stringify(heads.map(n => n.id)) !== JSON.stringify(conf.heads) || heads.some(n => !clean(n.textContent)) || all.filter(n => n.tagName === 'TIME').length !== 1 || contents.length !== 1 || contents[0].attributes.length !== 1 || contents[0].getAttribute('data-ktk-food-contents') !== '' || contents[0].innerHTML.trim() || photoSlots.length !== (conf.modules ? 0 : conf.files.length) || photoSlots.some((n, i) => n.attributes.length !== 1 || n.getAttribute('data-ktk-food-photo') !== String(i) || n.innerHTML.trim()) || all.filter(n => n.tagName === 'TEMPLATE').length !== contents.length + photoSlots.length) throw Error('Complete food-guide topics and media slots required');
  const nav = document.createElement('nav'), details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('ul'); nav.setAttribute('aria-label', conf.label); summary.id = conf.modules ? 'food-contents' : 'main-toc'; summary.textContent = 'Contents'; details.append(summary, list); nav.append(details);
  if (!conf.modules) {nav.id = conf.generated[0]; details.id = conf.generated[1];}
  for (const h of heads) {const li = document.createElement('li'), a = document.createElement('a'); if (!conf.modules) li.id = h.id + '-toc'; a.setAttribute('href', '#' + h.id); a.textContent = clean(h.textContent); li.append(a); list.append(li);} contents[0].replaceWith(nav);
  const photos = [...body.querySelectorAll('img')].filter(n => !n.closest('noscript')), originals = [...source.querySelectorAll('img')].filter(n => !n.closest('noscript'));
  if (photos.length !== conf.files.length || originals.length !== photos.length) throw Error('Original food-guide photo count changed');
  for (let i = 0; i < photos.length; i++) {
    const n = photos[i], before = originals[i], src = n.dataset.lazySrc || n.getAttribute('src'), old = before.dataset.lazySrc || before.getAttribute('src'), alt = revision.imageDescriptions[conf.files[i].slice(0, 12)];
    const originalClass = before.getAttribute('class'), preparedClass = originalClass?.split(/\s+/).filter(c => !['entered', 'exited'].includes(c)).join(' ');
    if (![old, '__KTK_PAGE_ASSETS__media/' + conf.files[i]].includes(src) || ['width', 'height', 'style'].some(a => n.getAttribute(a) !== before.getAttribute(a)) || ![originalClass, preparedClass].includes(n.getAttribute('class')) || ![before.getAttribute('alt'), alt].includes(n.getAttribute('alt'))) throw Error('Original food-guide photo identity changed');
    if (!conf.modules) {
      const p = n.closest('p'), oldP = before.closest('p'), wrapped = key === 'post-krakow-milkbars' && i === 2;
      const photoOnly = paragraph => {
        if (!paragraph || paragraph.tagName !== 'P' || paragraph.attributes.length) return false;
        const copy = paragraph.cloneNode(true), fallbacks = [...copy.querySelectorAll('noscript')]; if (fallbacks.length > 1) return false;
        for (const fallback of fallbacks) {const parsed = new DOMParser().parseFromString(fallback.innerHTML, 'text/html'), image = parsed.body.querySelector('img'); if (fallback.attributes.length || parsed.body.children.length !== 1 || !image || image.getAttribute('src') !== old || clean(parsed.body.textContent) || fallback.parentElement !== (wrapped ? copy.firstElementChild : copy)) return false; fallback.remove();}
        if (copy.children.length !== 1 || clean(copy.textContent)) return false;
        if (!wrapped) return copy.children[0].tagName === 'IMG';
        const span = copy.children[0]; return span.tagName === 'SPAN' && span.attributes.length === 1 && span.getAttribute('style') === 'color: rgb(0, 0, 0);' && span.children.length === 1 && span.children[0].tagName === 'IMG';
      };
      if (n.closest('a') || !photoOnly(p) || !photoOnly(oldP)) throw Error('Exact image-only food paragraph and known optional span/fallback required');
      photoSlots[i].replaceWith(p.cloneNode(true));
    }
  }
  const html = fragment => {const t = document.createElement('template'); t.content.append(fragment.cloneNode(true)); return t.innerHTML;}, replacements = plans.map(html), newIds = plans.flatMap(p => ids(p)), expectedIds = conf.modules ? [...conf.heads, 'food-contents', ...oldUnique] : oldUnique;
  if (newIds.length !== expectedIds.length || new Set(newIds).size !== newIds.length || expectedIds.some(id => !newIds.includes(id))) throw Error('Complete unique food-guide legacy fragments required');
  if (marker) {if (marker !== revision.version || (conf.modules ? nodes.some((n, i) => n.innerHTML !== replacements[i]) : body.innerHTML !== replacements[0])) throw Error('Changed reviewed food-guide copy'); return [];}
  const text = n => {const c = n.cloneNode(true); c.querySelectorAll('script,style,noscript').forEach(n => n.remove()); return clean(c.textContent);};
  if (text(body) !== text(source) || JSON.stringify(ids(body)) !== JSON.stringify(oldIds) || nodes.some((n, i) => text(n) !== text(oldNodes[i]))) throw Error('Original food-guide copy or fragments changed');
  // All copy, legacy targets and media must validate before the first source swap.
  if (conf.modules) for (let i = 0; i < nodes.length; i++) nodes[i].innerHTML = replacements[i]; else body.innerHTML = replacements[0];
  body.dataset.ktkFoodReview = revision.version;
  return [{type: 'food-guide-review', key, reviewedOn: revision.reviewedOn, textInteriors: conf.modules || 1, retainedInlinePhotos: photos.length, retainedUniqueFragments: oldUnique.length, removedDuplicateIds: conf.duplicates, nativeContentsTargets: heads.length}];
}

export function reviseFoodFeaturedDescriptions({key, revision}) {
  const definitions = {
    'post-krakow-food-truck-parks': {sha: '612c035259606976f23da1eeee13d5bca33beba18c1141e0d0278fba36d8de2e', file: 'd37116ff731d-as26awwvrvm1684922877-1080x675.jpg', original: 'as26awwvrvm1684922877-1080x675.jpg', oldAlt: 'Krakow Food Truck Parks', alt: 'Food trucks and picnic tables beneath autumn trees.'},
    'post-krakow-milkbars': {sha: 'ed866223f014b68d11128bf5e50341eaa1610960ec7742fee016cc431d36d52c', file: 'b767777b3fa6-ysoxjhuwzp01683880218-1080x675.jpg', original: 'ysoxjhuwzp01683880218-1080x675.jpg', oldAlt: 'Krakow Milkbars', alt: 'A tray holding dumplings, soup and bread.'}
  };
  if (!Object.hasOwn(definitions, key)) return [];
  const conf = definitions[key]; if (revision?.key !== key || revision.sourceSha256 !== conf.sha || revision.reviewedOn !== '2026-11-14' || revision.version !== '2026-11-14.food-guides-1' || typeof revision.sourceHtml !== 'string') throw Error('Reviewed food feature identity required');
  const source = new DOMParser().parseFromString(revision.sourceHtml, 'text/html'), find = d => [...d.querySelectorAll('#main-content .et_post_meta_wrapper img')].filter(n => !n.closest('noscript')), old = find(source), current = find(document);
  if (old.length !== 1 || current.length !== 1) throw Error('One original food featured photo required');
  const before = old[0], n = current[0], src = n.dataset.lazySrc || n.getAttribute('src'), origin = before.dataset.lazySrc || before.getAttribute('src');
  const originalClass = before.getAttribute('class'), preparedClass = originalClass?.split(/\s+/).filter(c => !['entered', 'exited'].includes(c)).join(' ');
  if (!origin.endsWith('/' + conf.original) || ![origin, '__KTK_PAGE_ASSETS__media/' + conf.file].includes(src) || before.getAttribute('alt') !== conf.oldAlt || ![conf.oldAlt, conf.alt].includes(n.getAttribute('alt')) || ['width', 'height', 'style'].some(a => n.getAttribute(a) !== before.getAttribute(a)) || ![originalClass, preparedClass].includes(n.getAttribute('class'))) throw Error('Exact food feature and known ALT required');
  if (n.getAttribute('alt') === conf.alt) return [];
  n.setAttribute('alt', conf.alt); return [{type: 'neutral-food-feature-description', key, file: conf.file, alt: conf.alt}];
}

const scope = 'body.ktk-code-page:is([data-ktk-page="post-best-places-to-eat"],[data-ktk-page="post-krakow-food-truck-parks"],[data-ktk-page="post-krakow-milkbars"]) #main-content .entry-content[data-ktk-food-review]';
const styles = '/* BEGIN Practical food guides */\n' + scope + ', ' + scope + ' .et_pb_text_inner { font-size: 16px; line-height: 1.65; letter-spacing: 0; text-align: left; }\n' + scope + ' p { font-size: 16px; line-height: 1.65; }\n' + scope + ' :is(h2,h3) { font-family: inherit; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\n' + scope + ' h2 { font-size: 22px; }\n' + scope + ' h3 { font-size: 18px; }\n' + scope + ' nav { margin: 1em 0; }\n' + scope + ' summary { cursor: pointer; min-height: 44px; padding: 8px 0; font-weight: 700; }\n' + scope + ' a { color: #c8006c !important; text-decoration: underline; text-underline-offset: .15em; }\n' + scope + ' :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  body.ktk-code-page[data-ktk-page="post-best-places-to-eat"] #main-content .entry-content[data-ktk-food-review] .et_pb_text_inner { padding-right: 24px; }\n  body.ktk-code-page:is([data-ktk-page="post-krakow-food-truck-parks"],[data-ktk-page="post-krakow-milkbars"]) #main-content .entry-content[data-ktk-food-review] { padding-right: 24px; }\n}\n/* END Practical food guides */\n';
export async function buildFoodGuideStyles(file) {
  const css = await readFile(file, 'utf8'), anchor = '/* BEGIN Weather and winter guides */'; if (css.split(anchor).length !== 2) throw Error('Stable food-guide style anchor required');
  if (css.includes('/* BEGIN Practical food guides */') || css.includes('/* END Practical food guides */')) {if (css.split('/* BEGIN Practical food guides */').length !== 2 || css.split('/* END Practical food guides */').length !== 2 || !css.includes(styles + '\n' + anchor)) throw Error('Food-guide style drift'); return;}
  await writeFile(file, css.replace(anchor, styles + '\n' + anchor));
}
