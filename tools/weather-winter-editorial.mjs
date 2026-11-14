import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadOfferFacts} from './site-offer-facts.mjs';

export async function loadWeatherClimateFacts({file = new URL('./weather-climate-facts.json', import.meta.url)} = {}) {
  const data = JSON.parse(await readFile(file, 'utf8'));
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const means = ['-1.6', '-0.2', '3.5', '9.3', '14.0', '17.6', '19.3', '18.9', '13.9', '8.8', '3.8', '-0.5'];
  if (JSON.stringify(Object.keys(data)) !== JSON.stringify(['schemaVersion', 'status', 'checkedOn', 'source', 'provider', 'station', 'period', 'parameter', 'meaning', 'unit', 'monthlyMeans']) || data.schemaVersion !== 1 || data.status !== 'source-checked' || data.checkedOn !== '2026-11-14' || data.source !== 'https://klimat.imgw.pl/pl/climate-normals/' || data.provider !== 'IMGW-PIB' || JSON.stringify(data.station) !== '{"name":"KRAKOW","code":"12566"}' || data.period !== '1991-2020' || data.parameter !== 'TSR_AVE' || data.unit !== 'Celsius' || data.meaning !== 'Mean daily air temperature averaged over each calendar month in the normal period; not a daytime maximum or a travel-date forecast' || JSON.stringify(Object.keys(data.monthlyMeans || {})) !== JSON.stringify(months) || JSON.stringify(Object.values(data.monthlyMeans)) !== JSON.stringify(means)) throw Error('Exact source-checked IMGW monthly means required');
  return data;
}

export async function loadWeatherWinterEditorial() {
  const climate = await loadWeatherClimateFacts(), offers = await loadOfferFacts(), imageReview = JSON.parse(await readFile(new URL('./content-image-descriptions.json', import.meta.url), 'utf8'));
  if (imageReview.status !== 'visually-reviewed' || imageReview.assetManifestSha256 !== 'f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691') throw Error('Reviewed weather/winter image descriptions required');
  const values = {...Object.fromEntries(Object.entries(climate.monthlyMeans).map(([month, value]) => [month + 'Mean', value])), minimumAge: String(offers.regular.minimumAge)}, rows = [];
  for (const [key, file, sourceSha256] of [['post-krakow-weather-guide', 'weather-seasonal', '6eda29f8487edab9fe2fd1c9277eb05a63495cf74c0178703014859fece81334'], ['post-krakow-winter-activities', 'winter-activities', 'db89098ebfb096e8196de08fbf8b475c07e0410c955197287583550bb265d367']]) {
    const sourceHtml = await readFile(new URL('../docs/code-pages/full-migration/captures/' + key + '/production-1920.html', import.meta.url), 'utf8');
    if (createHash('sha256').update(sourceHtml).digest('hex') !== sourceSha256) throw Error('Original weather/winter capture changed');
    const markup = (await readFile(new URL('./content/' + file + '.html', import.meta.url), 'utf8')).replace(/\{\{([A-Za-z]+)\}\}/g, (_, name) => {if (!Object.hasOwn(values, name)) throw Error('Unreviewed weather/winter fact'); return values[name];});
    if (/[{}]/.test(markup)) throw Error('Unresolved weather/winter fact');
    rows.push({key, sourceSha256, sourceHtml, markup, imageDescriptions: imageReview.descriptions, reviewedOn: '2026-11-14', version: '2026-11-14.weather-winter-1'});
  }
  return rows;
}

export function reviseWeatherWinterEditorial({key, revision}) {
  const definitions = {
    'post-krakow-weather-guide': {sha: '6eda29f8487edab9fe2fd1c9277eb05a63495cf74c0178703014859fece81334', modules: 25, label: 'Krakow seasonal and monthly weather contents', oldIds: [], targets: ['spring-in-krakow', 'march-weather', 'april-weather', 'may-weather', 'summer-in-krakow', 'june-weather', 'july-weather', 'august-weather', 'autumn-in-krakow', 'september-weather', 'october-weather', 'november-weather', 'winter-in-krakow', 'december-weather', 'january-weather', 'february-weather'], files: ['eaa70a4badfe-masaaki-komori-NoXUQ54pDac-unsplash.jpg', '24b21b46ab9e-angelo-pantazis-h0AnGGgseio-unsplash.jpg', '12af982026cb-autumn-mott-rodeheaver-SPd9CSoWCkY-unsplash.jpg', 'e102bb1e9f13-madara-parma-He_SWKwtfrQ-unsplash.jpg']},
    'post-krakow-winter-activities': {sha: 'db89098ebfb096e8196de08fbf8b475c07e0410c955197287583550bb265d367', modules: 0, label: 'Krakow winter activities contents', oldIds: ['main-toc', 'exploringkrakowsoldtowninwinter', 'strollingaroundmainmarketsquare', 'visitingstmarysbasilica', 'exploringwawelcastle', 'shoppingforuniquewintersouvenirs', 'buyinghandmadewoolenscarvesandsweaters', 'findingtraditionalpolishwoodenhandicrafts', 'experiencingchristmasmarketsindecember', 'iceskatingatjordanpark', 'indulginginauthenticpolishcuisineonafoodtour', 'cozyupinsomeofkrakowsbestbars', 'adventureawaitsinthetatramountains', 'morskieokolakeawinterwonderland', 'skiingatzakopaneresorttown', 'snowshoeingthroughpicturesquelandscapes', 'faqsinrelationtokrakowwinteractivities', 'iskrakowworthvisitinginwinter', 'iskrakowworthvisitingindecember', 'iskrakowworthvisitingatchristmas', 'whatmakeskrakowspecial', 'conclusion'], files: ['75b6e25e459f-1685019607_1685019602846.png', '0dc7f217710a-1685020132_1685020128243.png', '6dfd2af737e8-1685020349_1685020344787.png', '4d02b3003631-1685020442_1685020437338.png', 'c0cebecae16f-1685022519_1685022515179.png', '92dcbd0b3df0-1685022348_1685022345151.png', '21b1acf2614c-1685021238_1685021235823.png', '4713a6171e8b-1685021308_1685021304953.png', 'ad04f848409b-1685021406_1685021402782.png', '8280eb4f6bdb-1685022300_1685022294893.jpeg']}
  };
  if (!Object.hasOwn(definitions, key)) return [];
  const conf = definitions[key], clean = s => (s || '').replace(/\s+/g, ' ').trim();
  if (revision?.key !== key || revision.sourceSha256 !== conf.sha || revision.version !== '2026-11-14.weather-winter-1' || revision.reviewedOn !== '2026-11-14' || typeof revision.sourceHtml !== 'string' || typeof revision.markup !== 'string' || !revision.imageDescriptions) throw Error('Reviewed weather/winter identity required');
  const doc = new DOMParser().parseFromString(revision.sourceHtml, 'text/html'), main = document.querySelector('#main-content'), original = doc.querySelector('#main-content'), body = main?.querySelector('.entry-content'), source = original?.querySelector('.entry-content');
  if (!body || !source || main.querySelectorAll('.entry-content').length !== 1 || original.querySelectorAll('.entry-content').length !== 1 || !clean(original.querySelector('h1.entry-title')?.textContent) || clean(main.querySelector('h1.entry-title')?.textContent) !== clean(original.querySelector('h1.entry-title')?.textContent) || !clean(original.querySelector('.published')?.textContent) || clean(main.querySelector('.published')?.textContent) !== clean(original.querySelector('.published')?.textContent)) throw Error('Original weather/winter publication required');
  const nodes = [...body.querySelectorAll('.et_pb_text_inner')], oldNodes = [...source.querySelectorAll('.et_pb_text_inner')], marker = body.getAttribute('data-ktk-weather-review');
  if (nodes.length !== conf.modules || oldNodes.length !== conf.modules || nodes.some(n => n.querySelector('img,form,iframe,video,script,style,input,button')) || body.querySelector('form,iframe,video,script,style,input,button') || JSON.stringify([...source.querySelectorAll('[id]')].map(n => n.id)) !== JSON.stringify(conf.oldIds)) throw Error('Exact weather/winter source structure required');
  if (conf.modules) {
    const outsideCopy = n => {const c = n.cloneNode(true); c.querySelectorAll('.et_pb_text_inner,script,style,noscript').forEach(n => n.remove()); return clean(c.textContent);};
    if (outsideCopy(body) !== outsideCopy(source)) throw Error('Original weather copy outside text interiors required');
  }
  const template = document.createElement('template'); template.innerHTML = revision.markup;
  const slots = [...template.content.children], plans = conf.modules ? slots.map(n => n.content) : [template.content];
  if (conf.modules && (slots.length !== conf.modules || slots.some((n, i) => n.tagName !== 'TEMPLATE' || n.attributes.length !== 1 || n.getAttribute('data-ktk-weather-module') !== String(i)) || [...template.content.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()))) throw Error('Exact ordered weather text interiors required');
  const all = plans.flatMap(p => [...p.querySelectorAll('*')]), allowed = new Set(['__KTK_HOME_URL__', '__KTK_HOME_URL__krakow-weather-guide/', '__KTK_HOME_URL__krakow-winter-activities/', '__KTK_HOME_URL__weekend-in-krakow/', '__KTK_HOME_URL__travel-krakow-your-comprehensive-city-guide/', '__KTK_HOME_URL__all-you-need-to-know-about-visiting-auschwitz/', '__KTK_HOME_URL__store2/pub-crawl-28/#book', '__KTK_HOME_URL__store2/polish-vodka-tasting-44/#book', '__KTK_HOME_URL__store2/food-tour-krakow-48/#book', '__KTK_HOME_URL__about-us/how-to-join/', '__KTK_HOME_URL__krakow-nightlife/', '__KTK_HOME_URL__new-years-eve/', '__KTK_HOME_URL__best-places-to-eat/', 'https://klimat.imgw.pl/pl/climate-normals/', 'https://meteo.imgw.pl/', 'https://turystykakrakow.pl/276421,artykul,kalendarz-wydarzen.html', 'https://turystykakrakow.pl/kalendarium/276421,object,0,40033,,event.html', 'https://wawel.krakow.pl/en/explore', 'https://mariacki.com/en/tours-of-the-basilica/', 'https://www.wieliczka-saltmine.com/', 'https://energylandia.pl/en/', 'https://www.muzeumkrakowa.pl/en/branches/rynek-underground', 'https://tpn.gov.pl/komunikat-turystyczny', 'https://tpn.gov.pl/tatry-zima', 'https://tpn.gov.pl/przewodnicy', 'https://tpn.gov.pl/morskie-oko-w-pigulce', 'https://topr.pl/', 'https://ice-park.pl/en/home-2/']);
  for (const n of all) {
    const attrs = n.tagName === 'A' ? ['href'] : ['H2', 'H3'].includes(n.tagName) ? ['id'] : n.tagName === 'TIME' ? ['datetime'] : n.tagName === 'TEMPLATE' ? ['data-ktk-weather-contents', 'data-ktk-winter-photo'] : [];
    if (!['P', 'SMALL', 'TIME', 'H2', 'H3', 'A', 'STRONG', 'UL', 'LI', 'TEMPLATE'].includes(n.tagName) || [...n.attributes].some(a => !attrs.includes(a.name))) throw Error('Unreviewed weather/winter markup');
    if (n.tagName === 'A' && (!allowed.has(n.getAttribute('href')) || !clean(n.textContent))) throw Error('Unreviewed weather/winter destination');
    if (n.tagName === 'TIME' && (n.getAttribute('datetime') !== revision.reviewedOn || n.textContent !== '14 November 2026')) throw Error('Weather/winter review date changed');
  }
  const heads = all.filter(n => ['H2', 'H3'].includes(n.tagName)), expected = conf.modules ? conf.targets : conf.oldIds.slice(1).flatMap(id => id === 'iceskatingatjordanpark' ? [id, 'winter-pub-crawl'] : [id]);
  const contents = all.filter(n => n.tagName === 'TEMPLATE' && n.hasAttribute('data-ktk-weather-contents')), photoSlots = all.filter(n => n.tagName === 'TEMPLATE' && n.hasAttribute('data-ktk-winter-photo'));
  if (JSON.stringify(heads.map(n => n.id)) !== JSON.stringify(expected) || heads.some(n => !clean(n.textContent)) || all.filter(n => n.tagName === 'TIME').length !== 1 || contents.length !== 1 || contents[0].attributes.length !== 1 || contents[0].getAttribute('data-ktk-weather-contents') !== '' || contents[0].innerHTML.trim() || photoSlots.length !== (conf.modules ? 0 : conf.files.length) || photoSlots.some((n, i) => n.attributes.length !== 1 || n.getAttribute('data-ktk-winter-photo') !== String(i) || n.innerHTML.trim()) || all.filter(n => n.tagName === 'TEMPLATE').length !== contents.length + photoSlots.length) throw Error('Complete weather/winter topics and exact media slots required');
  const nav = document.createElement('nav'), details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('ul');
  nav.setAttribute('aria-label', conf.label); summary.id = conf.modules ? 'weather-contents' : 'main-toc'; summary.textContent = 'Contents'; details.append(summary, list); nav.append(details);
  for (const h of heads) {const li = document.createElement('li'), a = document.createElement('a'); a.setAttribute('href', '#' + h.id); a.textContent = clean(h.textContent); li.append(a); list.append(li);} contents[0].replaceWith(nav);
  const photos = [...body.querySelectorAll('img')].filter(n => !n.closest('noscript')), originals = [...source.querySelectorAll('img')].filter(n => !n.closest('noscript'));
  if (photos.length !== conf.files.length || originals.length !== photos.length) throw Error('Original weather/winter photo count changed');
  for (let i = 0; i < photos.length; i++) {
    const n = photos[i], before = originals[i], src = n.dataset.lazySrc || n.getAttribute('src'), old = before.dataset.lazySrc || before.getAttribute('src'), alt = revision.imageDescriptions[conf.files[i].slice(0, 12)];
    if (![old, '__KTK_PAGE_ASSETS__media/' + conf.files[i]].includes(src) || ['width', 'height', 'style'].some(a => n.getAttribute(a) !== before.getAttribute(a)) || ![before.getAttribute('alt'), alt].includes(n.getAttribute('alt'))) throw Error('Original weather/winter photo identity changed');
    if (!conf.modules) {
      const p = n.parentElement, oldP = before.parentElement;
      const photoOnly = paragraph => {
        const c = paragraph.cloneNode(true), fallbacks = [...c.querySelectorAll('noscript')];
        if (fallbacks.length > 1) return false;
        for (const fallback of fallbacks) {
          const parsed = new DOMParser().parseFromString(fallback.innerHTML, 'text/html'), image = parsed.body.querySelector('img');
          if (fallback.parentElement !== c || fallback.attributes.length || parsed.body.children.length !== 1 || !image || image.getAttribute('src') !== old || clean(parsed.body.textContent)) return false;
          fallback.remove();
        }
        return c.tagName === 'P' && !c.attributes.length && c.children.length === 1 && c.children[0].tagName === 'IMG' && !clean(c.textContent);
      };
      if (n.closest('a') || !photoOnly(p) || !photoOnly(oldP)) throw Error('Original image-only winter paragraph and exact optional captured fallback required');
      photoSlots[i].replaceWith(p.cloneNode(true));
    }
  }
  const html = fragment => {const t = document.createElement('template'); t.content.append(fragment.cloneNode(true)); return t.innerHTML;}, replacements = plans.map(html), ids = plans.flatMap(p => [...p.querySelectorAll('[id]')].map(n => n.id));
  if (ids.length !== expected.length + 1 || new Set(ids).size !== ids.length || conf.oldIds.some(id => !ids.includes(id))) throw Error('Complete unique weather/winter fragments required');
  if (marker) {if (marker !== revision.version || (conf.modules ? nodes.some((n, i) => n.innerHTML !== replacements[i]) : body.innerHTML !== replacements[0])) throw Error('Changed reviewed weather/winter copy'); return [];}
  const text = n => {const c = n.cloneNode(true); c.querySelectorAll('script,style,noscript').forEach(n => n.remove()); return clean(c.textContent);};
  if (text(body) !== text(source) || JSON.stringify([...body.querySelectorAll('[id]')].map(n => n.id)) !== JSON.stringify(conf.oldIds) || nodes.some((n, i) => text(n) !== text(oldNodes[i]))) throw Error('Original weather/winter copy or fragments changed');
  // Resolve every module, photo and late-page target before the first source swap.
  if (conf.modules) for (let i = 0; i < nodes.length; i++) nodes[i].innerHTML = replacements[i]; else body.innerHTML = replacements[0];
  body.dataset.ktkWeatherReview = revision.version;
  return [{type: 'weather-winter-guide-review', key, reviewedOn: revision.reviewedOn, textInteriors: conf.modules || 1, retainedInlinePhotos: photos.length, retainedOriginalFragments: conf.oldIds.length, nativeContentsTargets: expected.length}];
}

export function reviseWeatherFeaturedDescription({key, revision}) {
  if (key !== 'post-krakow-weather-guide') return [];
  if (revision?.key !== key || revision.sourceSha256 !== '6eda29f8487edab9fe2fd1c9277eb05a63495cf74c0178703014859fece81334' || revision.version !== '2026-11-14.weather-winter-1' || typeof revision.sourceHtml !== 'string') throw Error('Reviewed weather photo identity required');
  const oldAlt = 'Two people on a pub crawl in Krak\u00f3w.', alt = 'Pedestrians crossing a street beside historic buildings.', portable = '__KTK_PAGE_ASSETS__media/18aacfa6c777-ostap-senyuk-7rCdqEuQ1rg-unsplash-1080x675.jpg';
  const original = new DOMParser().parseFromString(revision.sourceHtml, 'text/html'), find = d => [...d.querySelectorAll('#main-content .et_post_meta_wrapper img')].filter(n => !n.closest('noscript')), old = find(original), current = find(document);
  if (old.length !== 1 || current.length !== 1) throw Error('One exact weather featured photo required');
  const before = old[0], image = current[0], source = before.dataset.lazySrc || before.getAttribute('src'), src = image.dataset.lazySrc || image.getAttribute('src');
  if (!source.endsWith('/ostap-senyuk-7rCdqEuQ1rg-unsplash-1080x675.jpg') || ![source, portable].includes(src) || before.getAttribute('alt') !== oldAlt || ![oldAlt, alt].includes(image.getAttribute('alt')) || ['width', 'height', 'style'].some(a => image.getAttribute(a) !== before.getAttribute(a))) throw Error('Exact weather photo and known old ALT required');
  if (image.getAttribute('alt') === alt) return [];
  image.setAttribute('alt', alt); return [{type: 'neutral-weather-featured-description', key, file: 'media/18aacfa6c777-ostap-senyuk-7rCdqEuQ1rg-unsplash-1080x675.jpg', alt}];
}

const scope = 'body.ktk-code-page:is([data-ktk-page="post-krakow-weather-guide"],[data-ktk-page="post-krakow-winter-activities"]) #main-content .entry-content[data-ktk-weather-review]';
const styles = '/* BEGIN Weather and winter guides */\n' + scope + ', ' + scope + ' .et_pb_text_inner { font-size: 16px; line-height: 1.65; letter-spacing: 0; text-align: left; }\n' + scope + ' p { font-size: 16px; line-height: 1.65; }\n' + scope + ' :is(h2,h3) { font-family: inherit; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\n' + scope + ' h2 { font-size: 22px; }\n' + scope + ' h3 { font-size: 18px; }\n' + scope + ' nav { margin: 1em 0; }\n' + scope + ' summary { cursor: pointer; min-height: 44px; padding: 8px 0; font-weight: 700; }\n' + scope + ' a { color: #c8006c !important; text-decoration: underline; text-underline-offset: .15em; }\n' + scope + ' :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  body.ktk-code-page[data-ktk-page="post-krakow-weather-guide"] #main-content .entry-content[data-ktk-weather-review] .et_pb_text_inner { padding-right: 24px; }\n  body.ktk-code-page[data-ktk-page="post-krakow-winter-activities"] #main-content .entry-content[data-ktk-weather-review] { padding-right: 24px; }\n}\n/* END Weather and winter guides */\n';
export async function buildWeatherWinterStyles(file) {
  const css = await readFile(file, 'utf8'), anchor = '/* BEGIN Practical karting guides */';
  if (css.split(anchor).length !== 2) throw Error('Stable weather/winter style anchor required');
  if (css.includes('/* BEGIN Weather and winter guides */') || css.includes('/* END Weather and winter guides */')) {if (css.split('/* BEGIN Weather and winter guides */').length !== 2 || css.split('/* END Weather and winter guides */').length !== 2 || !css.includes(styles + '\n' + anchor)) throw Error('Weather/winter style drift'); return;}
  await writeFile(file, css.replace(anchor, styles + '\n' + anchor));
}
