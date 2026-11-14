import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadOfferFacts} from './site-offer-facts.mjs';

export async function loadKartingGuidesEditorial() {
  const definitions = [['post-go-karting-krakow', 'planning', 'f02ac0745c1e5dff060e3c6a188718fb90d06e7500195a4981b88ae3eb9b6daf'], ['post-krakow-go-karting', 'first-visit', 'f949bac521d355525eeae892acf0f226d109cc48ba398b990c1ca97ccbc5321d']];
  const facts = await loadOfferFacts(), imageReview = JSON.parse(await readFile(new URL('./content-image-descriptions.json', import.meta.url), 'utf8')), rows = [];
  if (imageReview.status !== 'visually-reviewed' || imageReview.assetManifestSha256 !== 'f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691') throw Error('Reviewed karting image descriptions required');
  for (const [key, file, sourceSha256] of definitions) {
    const sourceHtml = await readFile(new URL('../docs/code-pages/full-migration/captures/' + key + '/production-1920.html', import.meta.url), 'utf8');
    if (createHash('sha256').update(sourceHtml).digest('hex') !== sourceSha256) throw Error('Original karting capture changed');
    const markup = (await readFile(new URL('./content/karting-' + file + '.html', import.meta.url), 'utf8')).replaceAll('{{minimumAge}}', String(facts.regular.minimumAge));
    if (/[{}]/.test(markup)) throw Error('Unresolved karting guide fact');
    rows.push({key, sourceSha256, sourceHtml, markup, imageDescriptions: imageReview.descriptions, version: '2026-11-14.karting-guides-1', reviewedOn: '2026-11-14'});
  }
  return rows;
}

export function reviseKartingGuidesEditorial({key, revision}) {
  const definitions = {
    'post-go-karting-krakow': {sha: 'f02ac0745c1e5dff060e3c6a188718fb90d06e7500195a4981b88ae3eb9b6daf', selector: '.et_pb_text_0 > .et_pb_text_inner', ids: 41, unique: 37, targets: 17, label: 'Karting group planning contents', technical: ['64f34efa77b45_103604', '64f34efa77b48_103604'], files: ['292d4dec5dd1-1693667519_alex-bagirov-aTArer_fWk8-unsplash.jpg', '5814941fa5fc-1693668370_david-armstrong-srpE-a5W418-unsplash.jpg', 'f03ea244a927-1693669764_nicolas-peyrol-mO58hp4XDp8-unsplash.jpg', 'bee884199e15-1693669877_sorin-dandu-_tc9-uWxCgo-unsplash.jpg', 'f8a1848d2216-1693670314_john-torcasio-SdNimAHY1Gw-unsplash.jpg', '2dcbc56d7f03-1693669970_appic-jRwJ4zlUkRc-unsplash.jpg']},
    'post-krakow-go-karting': {sha: 'f949bac521d355525eeae892acf0f226d109cc48ba398b990c1ca97ccbc5321d', selector: '.entry-content', ids: 9, unique: 9, targets: 8, label: 'Karting tracks and first-visit contents', technical: [], files: ['8006b01f6292-1683478515_1683478511167.jpeg', 'f24befdadc6a-1683478614_1683478607116.jpeg', '24c4fa827c82-1683480612_1683480608573.jpeg', '295290d94826-1683478683_1683478681302.jpeg', '44b04858f49c-1683478796_1683478790017.jpeg']}
  };
  if (!Object.hasOwn(definitions, key)) return [];
  const conf = definitions[key], clean = s => (s || '').replace(/\s+/g, ' ').trim();
  if (revision?.key !== key || revision.sourceSha256 !== conf.sha || revision.version !== '2026-11-14.karting-guides-1' || revision.reviewedOn !== '2026-11-14' || typeof revision.sourceHtml !== 'string' || typeof revision.markup !== 'string' || !revision.imageDescriptions) throw Error('Reviewed karting guide identity required');
  const doc = new DOMParser().parseFromString(revision.sourceHtml, 'text/html'), main = document.querySelector('#main-content'), original = doc.querySelector('#main-content');
  if (main?.querySelectorAll(conf.selector).length !== 1 || original?.querySelectorAll(conf.selector).length !== 1 || !clean(original.querySelector('h1.entry-title')?.textContent) || clean(main.querySelector('h1.entry-title')?.textContent) !== clean(original.querySelector('h1.entry-title')?.textContent) || !clean(original.querySelector('.published')?.textContent) || clean(main.querySelector('.published')?.textContent) !== clean(original.querySelector('.published')?.textContent)) throw Error('Original karting publication/body required');
  const body = main.querySelector(conf.selector), source = original.querySelector(conf.selector), marker = body.getAttribute('data-ktk-karting-review');
  const prepare = node => {
    if (key === 'post-go-karting-krakow') {
      const headings = [...node.querySelectorAll('h2,h3')].filter(n => clean(n.textContent) === 'Making Memories at Go Karting Krakow');
      if (headings.length !== 1 || headings[0].id && headings[0].id !== 'makingmemoriesatgokartingkrakow') throw Error('Known original karting heading repair required');
      headings[0].id = 'makingmemoriesatgokartingkrakow';
    } else {
      const links = node.querySelectorAll('a[href="#conclusion"]');
      if (links.length > 1 || node.querySelector('[id="conclusion"]') || links.length && !links[0].closest('li')) throw Error('Known original karting contents repair required');
      links[0]?.closest('li').remove();
    }
  };
  prepare(source);
  const originalIds = [...source.querySelectorAll('[id]')].map(n => n.id), unique = new Set(originalIds), oldTargets = [...source.querySelectorAll('h2[id],h3[id]')].filter(n => n.id !== 'main-toc');
  if (originalIds.length !== conf.ids || unique.size !== conf.unique || oldTargets.length !== conf.targets || body.querySelector('form,iframe,video,script,style,input,button')) throw Error('Original karting structure changed');
  if (!conf.technical.length) unique.add('conclusion');
  const template = document.createElement('template'); template.innerHTML = revision.markup;
  const links = new Set(['__KTK_HOME_URL__krakow-go-karting/', '__KTK_HOME_URL__go-karting-krakow/', '__KTK_HOME_URL__store2/go-karting-30/#book', '__KTK_HOME_URL__krakow-stag-do/', '__KTK_HOME_URL__krakow-hen-do/', '__KTK_HOME_URL__contact/', '__KTK_HOME_URL__krakow-nightlife/', 'https://gokarty.pl/', 'https://gokarty.pl/regulamin/', 'https://gokarting.com.pl/kontakt/', 'https://gokarting.com.pl/tor-gokartowy/', 'https://gokarting.com.pl/regulamin-toru.pdf']);
  for (const n of template.content.querySelectorAll('*')) {
    const attrs = n.tagName === 'A' ? ['href'] : ['H2', 'H3'].includes(n.tagName) ? ['id'] : n.tagName === 'TIME' ? ['datetime'] : n.tagName === 'TEMPLATE' ? ['data-ktk-karting-photo', 'data-ktk-karting-contents'] : [];
    if (!['P', 'SMALL', 'TIME', 'H2', 'H3', 'A', 'UL', 'LI', 'TEMPLATE'].includes(n.tagName) || [...n.attributes].some(a => !attrs.includes(a.name))) throw Error('Unreviewed karting markup');
    if (n.tagName === 'A' && (!links.has(n.getAttribute('href')) || !clean(n.textContent))) throw Error('Unreviewed karting destination');
    if (n.tagName === 'TIME' && (n.getAttribute('datetime') !== revision.reviewedOn || n.textContent !== '14 November 2026')) throw Error('Karting review date changed');
  }
  const heads = [...template.content.querySelectorAll('h2,h3')], slots = [...template.content.querySelectorAll('template[data-ktk-karting-photo]')], contents = template.content.querySelectorAll('template[data-ktk-karting-contents]');
  if (template.content.querySelectorAll('time').length !== 1 || contents.length !== 1 || contents[0].attributes.length !== 1 || contents[0].getAttribute('data-ktk-karting-contents') !== '' || contents[0].innerHTML.trim() || slots.length !== conf.files.length || slots.some((n, i) => n.attributes.length !== 1 || n.getAttribute('data-ktk-karting-photo') !== String(i) || n.innerHTML.trim()) || template.content.querySelectorAll('template').length !== slots.length + 1) throw Error('Ordered karting media and native contents slots required');
  const expectedTargets = oldTargets.map(n => n.id).concat(conf.technical.length ? [] : ['conclusion']);
  if (JSON.stringify(heads.map(n => n.id)) !== JSON.stringify(expectedTargets) || heads.some(n => !clean(n.textContent))) throw Error('Every original karting topic must remain a native target');
  const nav = document.createElement('nav'), details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('ul');
  nav.setAttribute('aria-label', conf.label); if (conf.technical.length) {nav.id = conf.technical[0]; details.id = conf.technical[1];}
  summary.id = 'main-toc'; summary.textContent = 'Contents'; details.append(summary, list); nav.append(details);
  for (const h of heads) {const li = document.createElement('li'), a = document.createElement('a'); a.setAttribute('href', '#' + h.id); a.textContent = clean(h.textContent); if (conf.technical.length) a.id = h.id + '-toc'; li.append(a); list.append(li);}
  contents[0].replaceWith(nav);
  const ids = [...template.content.querySelectorAll('[id]')].map(n => n.id);
  if (ids.length !== unique.size || new Set(ids).size !== unique.size || ids.some(id => !unique.has(id))) throw Error('Every unique original karting fragment must remain once');
  const photos = [...body.querySelectorAll('img')].filter(n => !n.closest('noscript')), originals = [...source.querySelectorAll('img')].filter(n => !n.closest('noscript'));
  if (photos.length !== conf.files.length || originals.length !== photos.length) throw Error('Original karting photo count changed');
  for (let i = 0; i < photos.length; i++) {
    const image = photos[i], before = originals[i], src = image.dataset.lazySrc || image.getAttribute('src'), old = before.dataset.lazySrc || before.getAttribute('src'), portable = '__KTK_PAGE_ASSETS__media/' + conf.files[i], parent = image.parentElement, expectedParent = key === 'post-go-karting-krakow' && i === 2 ? 'H3' : 'P';
    const reviewedAlt = revision.imageDescriptions[conf.files[i].slice(0, 12)];
    if (![old, portable].includes(src) || ['width', 'height', 'style'].some(a => image.getAttribute(a) !== before.getAttribute(a)) || ![before.getAttribute('alt'), reviewedAlt].includes(image.getAttribute('alt')) || image.closest('a') || parent.tagName !== (marker ? 'P' : expectedParent) || parent.tagName === 'P' && parent.attributes.length) throw Error('Original karting photo identity/attributes changed');
    const paragraph = document.createElement('p'); paragraph.append(image.cloneNode(true)); slots[i].replaceWith(paragraph);
  }
  if (marker) {if (marker !== revision.version || body.innerHTML !== template.innerHTML) throw Error('Changed reviewed karting copy'); return [];}
  const working = body.cloneNode(true); prepare(working);
  const text = node => {const c = node.cloneNode(true); c.querySelectorAll('script,style,noscript').forEach(n => n.remove()); return clean(c.textContent);};
  if (text(working) !== text(source) || JSON.stringify([...working.querySelectorAll('[id]')].map(n => n.id)) !== JSON.stringify(originalIds)) throw Error('Original karting copy or fragments changed');
  // Validate the final topic, photo and all destinations before changing the module.
  body.innerHTML = template.innerHTML; body.dataset.ktkKartingReview = revision.version;
  return [{type: 'karting-guide-review', key, reviewedOn: revision.reviewedOn, retainedInlinePhotos: photos.length, retainedOriginalUniqueFragments: conf.unique, nativeContentsTargets: heads.length, removedDuplicateIds: conf.ids - conf.unique}];
}

const scope = 'body.ktk-code-page:is([data-ktk-page="post-go-karting-krakow"],[data-ktk-page="post-krakow-go-karting"]) #main-content [data-ktk-karting-review]';
const styles = '/* BEGIN Practical karting guides */\n' + scope + ' { font-size: 16px; line-height: 1.65; letter-spacing: 0; text-align: left; }\n' + scope + ' p { font-size: 16px; line-height: 1.65; }\n' + scope + ' :is(h2,h3) { font-family: inherit; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\n' + scope + ' h2 { font-size: 22px; }\n' + scope + ' h3 { font-size: 18px; }\n' + scope + ' nav { margin: 1em 0; }\n' + scope + ' summary { cursor: pointer; min-height: 44px; padding: 8px 0; font-weight: 700; }\n' + scope + ' a { color: #c8006c !important; text-decoration: underline; text-underline-offset: .15em; }\n' + scope + ' :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  ' + scope + ' { padding-right: 24px; }\n}\n/* END Practical karting guides */\n';
export async function buildKartingGuideStyles(file) {
  const css = await readFile(file, 'utf8'), anchor = '/* BEGIN Practical city trip guides */';
  if (css.split(anchor).length !== 2) throw Error('Stable karting style anchor required');
  if (css.includes('/* BEGIN Practical karting guides */') || css.includes('/* END Practical karting guides */')) {
    if (css.split('/* BEGIN Practical karting guides */').length !== 2 || css.split('/* END Practical karting guides */').length !== 2 || !css.includes(styles + '\n' + anchor)) throw Error('Karting style drift'); return;
  }
  await writeFile(file, css.replace(anchor, styles + '\n' + anchor));
}
