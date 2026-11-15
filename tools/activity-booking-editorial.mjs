import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadActivityBookingEditorial() {
  const specs = [
    ['post-escape-rooms-for-a-stag-do-in-krakow', 'escape', 'fa5086422ac7affea14a130e59ad713ca90027754fbda52e4cfae37f86964c8b'],
    ['post-krakow-shooting-range', 'shooting', 'fd4bb18aae63502b7d00f9f85ad75eb723612d490cf1ba8c7957d8a68f1562cc']
  ], rows = [], images = JSON.parse(await readFile(new URL('./content-image-descriptions.json', import.meta.url), 'utf8'));
  if (images.status !== 'visually-reviewed' || images.assetManifestSha256 !== 'f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691') throw Error('Reviewed activity image policy required');
  for (const [key, file, sourceSha256] of specs) {
    const sourceHtml = await readFile(new URL('../docs/code-pages/full-migration/captures/' + key + '/production-1920.html', import.meta.url), 'utf8');
    if (createHash('sha256').update(sourceHtml).digest('hex') !== sourceSha256) throw Error('Original activity-booking capture changed');
    const markup = await readFile(new URL('./content/activity-' + file + '-booking.html', import.meta.url), 'utf8');
    if (/[{}]/.test(markup)) throw Error('Unresolved activity-booking fact');
    rows.push({key, sourceSha256, sourceHtml, markup, imageDescriptions: images.descriptions, reviewedOn: '2026-11-15', version: '2026-11-15.activity-booking-1'});
  }
  return rows;
}

export function reviseActivityBookingEditorial({key, revision}) {
  const definitions = {
    'post-escape-rooms-for-a-stag-do-in-krakow': {sha: 'fa5086422ac7affea14a130e59ad713ca90027754fbda52e4cfae37f86964c8b', unique: 12, duplicates: 7, label: 'Krakow escape-room booking contents', removed: ['wheretoeatanddrinkafteryouradventure', 'suggesteditinerariesforafunweekendaway'], heads: [['H2', '1overviewofescaperoomsinkrakow'], ['H2', 'whatisanescaperoom'], ['H2', 'typesofescaperoomsavailableinkrakow'], ['H2', '3popularescaperoomsinkrakow'], ['H3', 'thebunkeratexitgameskrakow'], ['H3', 'thesecretlabatmissionbreakoutkrakow'], ['H3', 'locked-up-options'], ['H2', '4costandbookinginformationforescaperoomsinkrakow'], ['H3', 'averagecostofanescaperoominkrakow'], ['H2', '5tipsforenjoyingyourstagdoinkrakow'], ['H2', 'ktk-evening-plan'], ['H2', 'conclusion']], files: ['25cc3356b339-1681980374_zachary-keimig-OmaFZNYOy6E-unsplash.jpg', '35a1685a806b-1682506471_1682506469459.png', '93fc918e9184-1682506635_Screenshot_202023-04-26_20at_2012.55.42.png', '6a579641d500-1681981139_joshua-coleman-uB16HY_ah4o-unsplash.jpg', 'd70a2d1b965b-1681971163_1681971162576.png', 'a91a6b8934a5-1686234686_1686234683483.png']},
    'post-krakow-shooting-range': {sha: 'fd4bb18aae63502b7d00f9f85ad75eb723612d490cf1ba8c7957d8a68f1562cc', unique: 7, duplicates: 3, label: 'Krakow shooting-range booking contents', removed: [], heads: [['H2', 'premiershootingrangesinkrakow'], ['H2', 'isPasted'], ['H2', 'current-booking-details'], ['H2', 'whattoexpectatakrakowshootingrange'], ['H3', 'safetymeasuresamprequirements'], ['H2', 'bookingyourexperienceampinclusions'], ['H2', 'conclusion']], files: ['a29fb7fa1906-1683823729_1683823724122.png', 'a0322cffaf49-1683824094_1683824090890.png', 'ef03cc7e23df-1683826464_1683826459239.png', 'a30921e813f9-1683826150_1683826144689.png', '2a80d014835b-1683826311_1683826306483.png']}
  };
  if (!Object.hasOwn(definitions, key)) return [];
  const conf = definitions[key], clean = s => (s || '').replace(/\s+/g, ' ').trim();
  if (revision?.key !== key || revision.sourceSha256 !== conf.sha || revision.version !== '2026-11-15.activity-booking-1' || revision.reviewedOn !== '2026-11-15' || typeof revision.sourceHtml !== 'string' || typeof revision.markup !== 'string' || !revision.imageDescriptions) throw Error('Reviewed activity-booking identity required');
  const original = new DOMParser().parseFromString(revision.sourceHtml, 'text/html').querySelector('#main-content'), main = document.querySelector('#main-content'), source = original?.querySelector('.entry-content'), body = main?.querySelector('.entry-content');
  if (!source || !body || document.querySelectorAll('#main-content').length !== 1 || main.querySelectorAll('.entry-content').length !== 1 || !clean(original.querySelector('h1.entry-title')?.textContent) || clean(main.querySelector('h1.entry-title')?.textContent) !== clean(original.querySelector('h1.entry-title')?.textContent) || !clean(original.querySelector('.published')?.textContent) || clean(main.querySelector('.published')?.textContent) !== clean(original.querySelector('.published')?.textContent)) throw Error('Original activity publication required');
  const ids = n => [...n.querySelectorAll('[id]')].filter(n => !n.closest('noscript')).map(n => n.id), oldIds = ids(source), unique = [...new Set(oldIds)], marker = body.getAttribute('data-ktk-activity-booking-review');
  if (unique.length !== conf.unique || oldIds.length - unique.length !== conf.duplicates || source.querySelector('.et_pb_text_inner') || body.querySelector('.et_pb_text_inner,form,iframe,video,script,style,input,button') || source.querySelectorAll('noscript').length !== conf.files.length) throw Error('Exact original activity structure required');
  const t = document.createElement('template'); t.innerHTML = revision.markup;
  const allowed = new Set(['__KTK_HOME_URL__store2/', '__KTK_HOME_URL__store2/shooting-range-34/#book', '__KTK_HOME_URL__store2/pub-crawl-28/#book', '__KTK_HOME_URL__about-us/how-to-join/', '__KTK_HOME_URL__krakow-stag-do/', '__KTK_HOME_URL__krakow-stag-activities/', '__KTK_HOME_URL__contact/', 'https://fearfactory.com.pl/pl/', 'https://en.exitroom.pl/', 'https://lockedup.pl/', 'https://gamescape.pl/']);
  for (const n of t.content.querySelectorAll('*')) {
    const attrs = n.tagName === 'A' ? ['href'] : ['H2', 'H3', 'P'].includes(n.tagName) ? ['id'] : n.tagName === 'TIME' ? ['datetime'] : n.tagName === 'TEMPLATE' ? ['data-ktk-activity-contents', 'data-ktk-activity-photo'] : [];
    if (!['P', 'SMALL', 'TIME', 'H2', 'H3', 'A', 'STRONG', 'UL', 'LI', 'TEMPLATE'].includes(n.tagName) || [...n.attributes].some(a => !attrs.includes(a.name)) || n.tagName === 'P' && n.hasAttribute('id') && (key !== 'post-escape-rooms-for-a-stag-do-in-krakow' || n.id !== 'isPasted')) throw Error('Unreviewed activity-booking markup');
    if (n.tagName === 'A' && (!allowed.has(n.getAttribute('href')) || !clean(n.textContent) || key === 'post-krakow-shooting-range' && !n.getAttribute('href').startsWith('__KTK_HOME_URL__'))) throw Error('Unreviewed activity-booking destination');
    if (n.tagName === 'TIME' && (n.getAttribute('datetime') !== revision.reviewedOn || n.textContent !== '15 November 2026')) throw Error('Activity review date changed');
  }
  const topics = [...t.content.querySelectorAll('h2,h3')], contents = [...t.content.querySelectorAll('template[data-ktk-activity-contents]')], slots = [...t.content.querySelectorAll('template[data-ktk-activity-photo]')];
  if (JSON.stringify(topics.map(n => [n.tagName, n.id])) !== JSON.stringify(conf.heads) || topics.some(n => !clean(n.textContent)) || t.content.querySelectorAll('time').length !== 1 || contents.length !== 1 || contents[0].attributes.length !== 1 || contents[0].getAttribute('data-ktk-activity-contents') !== '' || contents[0].innerHTML.trim() || slots.length !== conf.files.length || slots.some((n, i) => n.attributes.length !== 1 || n.getAttribute('data-ktk-activity-photo') !== String(i) || n.innerHTML.trim()) || t.content.querySelectorAll('template').length !== slots.length + 1) throw Error('Complete activity-booking topics and photo slots required');
  const nav = document.createElement('nav'), details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('ul');
  nav.setAttribute('aria-label', conf.label); summary.id = 'main-toc'; summary.textContent = 'Contents'; details.append(summary, list); nav.append(details);
  for (const h of topics) {const li = document.createElement('li'), a = document.createElement('a'); a.setAttribute('href', '#' + h.id); a.textContent = clean(h.textContent); li.append(a); list.append(li);} contents[0].replaceWith(nav);
  const activePhotos = n => [...n.querySelectorAll('img')].filter(n => !n.closest('noscript')), photos = activePhotos(body), originals = activePhotos(source);
  if (photos.length !== conf.files.length || originals.length !== photos.length || ![0, conf.files.length].includes(body.querySelectorAll('noscript').length)) throw Error('Original activity photo count changed');
  for (let i = 0; i < photos.length; i++) {
    const n = photos[i], old = originals[i], origin = old.dataset.lazySrc || old.getAttribute('src'), src = n.dataset.lazySrc || n.getAttribute('src'), cls = old.getAttribute('class'), preparedClass = cls?.split(/\s+/).filter(v => !['entered', 'exited'].includes(v)).join(' ');
    const attrs = new Set([...old.attributes].map(a => a.name).concat(['loading', 'decoding', 'alt']));
    if (![origin, '__KTK_PAGE_ASSETS__media/' + conf.files[i]].includes(src) || ['id', 'width', 'height', 'style'].some(a => n.getAttribute(a) !== old.getAttribute(a)) || ![cls, preparedClass].includes(n.getAttribute('class')) || ![old.getAttribute('alt'), revision.imageDescriptions[conf.files[i].slice(0, 12)]].includes(n.getAttribute('alt')) || [...n.attributes].some(a => !attrs.has(a.name) || a.name.startsWith('on')) || n.closest('a')) throw Error('Original activity photo identity changed');
    if (!marker) {
      const parent = n.parentElement.cloneNode(true), previous = old.parentElement.cloneNode(true);
      parent.querySelectorAll('noscript').forEach(n => n.remove()); previous.querySelectorAll('noscript').forEach(n => n.remove());
      parent.querySelector('img').replaceWith(old.cloneNode(true));
      if (parent.outerHTML !== previous.outerHTML) throw Error('Exact original activity photo parent required');
    }
    const p = document.createElement('p'); p.append(n.cloneNode(true)); slots[i].replaceWith(p);
  }
  const nextIds = ids(t.content);
  if (nextIds.length !== conf.unique + (key === 'post-krakow-shooting-range' ? 1 : 2) || nextIds.length !== new Set(nextIds).size || unique.some(id => !nextIds.includes(id))) throw Error('Complete unique activity legacy targets required');
  const text = (node, current) => {
    const c = node.cloneNode(true); c.querySelectorAll('script,style,noscript').forEach(n => n.remove());
    for (const id of conf.removed) {const a = [...c.querySelectorAll('a[href]')].filter(n => n.getAttribute('href') === '#' + id); if (!current && a.length !== 1 || a.length > 1 || c.querySelector('[id="' + id + '"]')) throw Error('Exact previous missing activity topic required'); if (a.length) {const li = a[0].closest('li'); if (!li || li.children.length !== 1 || li.firstElementChild !== a[0]) throw Error('Exact previous activity contents item required'); li.remove();}}
    return clean(c.textContent);
  };
  const fallbacks = [...body.querySelectorAll('noscript')], oldFallbacks = [...source.querySelectorAll('noscript')];
  if (fallbacks.some((n, i) => n.outerHTML !== oldFallbacks[i]?.outerHTML)) throw Error('Exact original activity fallback required');
  if (marker) {if (marker !== revision.version || body.innerHTML !== t.innerHTML) throw Error('Changed reviewed activity copy'); return [];}
  if (text(body, true) !== text(source, false) || JSON.stringify(ids(body)) !== JSON.stringify(oldIds)) throw Error('Original activity copy or fragments changed');
  // Validate the full body, media and late-page topics before the first mutation.
  body.innerHTML = t.innerHTML; body.dataset.ktkActivityBookingReview = revision.version;
  return [{type: 'activity-booking-review', key, reviewedOn: revision.reviewedOn, retainedInlinePhotos: photos.length, nativeContentsTargets: topics.length, removedDuplicateIds: conf.duplicates}];
}

export function reviseActivityBookingFeatures({key, revision}) {
  const specs = {
    'post-escape-rooms-for-a-stag-do-in-krakow': ['fa5086422ac7affea14a130e59ad713ca90027754fbda52e4cfae37f86964c8b', '5d8abd5fd6d8-ec0rsipny9q1682507217-1080x675.jpg', 'Escape rooms for a stag do in Krakow', 'The underside of an illuminated bridge reflected in a river at night.'],
    'post-krakow-shooting-range': ['fd4bb18aae63502b7d00f9f85ad75eb723612d490cf1ba8c7957d8a68f1562cc', '74997ed92e01-iuf2yvrqqtm1683823261-1080x675.jpg', 'krakow shooting range', 'A paper shooting target with numbered rings and holes.']
  };
  if (!Object.hasOwn(specs, key)) return [];
  const [sha, file, oldAlt, alt] = specs[key];
  if (revision?.key !== key || revision.sourceSha256 !== sha || revision.version !== '2026-11-15.activity-booking-1' || revision.reviewedOn !== '2026-11-15' || typeof revision.sourceHtml !== 'string') throw Error('Reviewed activity feature identity required');
  const find = d => [...d.querySelectorAll('#main-content .et_post_meta_wrapper img')].filter(n => !n.closest('noscript')), old = find(new DOMParser().parseFromString(revision.sourceHtml, 'text/html')), current = find(document);
  if (old.length !== 1 || current.length !== 1) throw Error('One original activity feature required');
  const n = current[0], before = old[0], origin = before.dataset.lazySrc || before.getAttribute('src'), src = n.dataset.lazySrc || n.getAttribute('src'), cls = before.getAttribute('class'), preparedClass = cls?.split(/\s+/).filter(v => !['entered', 'exited'].includes(v)).join(' ');
  if (!origin.endsWith('/' + file.slice(13)) || ![origin, '__KTK_PAGE_ASSETS__media/' + file].includes(src) || before.getAttribute('alt') !== oldAlt || ![oldAlt, alt].includes(n.getAttribute('alt')) || ['id', 'width', 'height', 'style'].some(a => n.getAttribute(a) !== before.getAttribute(a)) || ![cls, preparedClass].includes(n.getAttribute('class'))) throw Error('Exact activity feature identity required');
  if (n.getAttribute('alt') === alt) return [];
  n.setAttribute('alt', alt); return [{type: 'neutral-activity-feature', key, file, alt}];
}

const scope = 'body.ktk-code-page:is([data-ktk-page="post-escape-rooms-for-a-stag-do-in-krakow"],[data-ktk-page="post-krakow-shooting-range"]) #main-content .entry-content[data-ktk-activity-booking-review]';
const styles = '/* BEGIN Activity booking guides */\n' + scope + ' { font-size: 16px; line-height: 1.65; letter-spacing: 0; text-align: left; }\n' + scope + ' p { font-size: 16px; line-height: 1.65; }\n' + scope + ' :is(h2,h3) { font-family: inherit; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\n' + scope + ' h2 { font-size: 22px; }\n' + scope + ' h3 { font-size: 18px; }\n' + scope + ' nav { margin: 1em 0; }\n' + scope + ' summary { cursor: pointer; min-height: 44px; padding: 8px 0; font-weight: 700; }\n' + scope + ' a { color: #c8006c !important; text-decoration: underline; text-underline-offset: .15em; }\n' + scope + ' :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  ' + scope + ' { padding-right: 24px; }\n}\n/* END Activity booking guides */\n';
export async function buildActivityBookingStyles(file) {
  const css = await readFile(file, 'utf8'), anchor = '/* BEGIN Group choice guides */';
  if (css.split(anchor).length !== 2) throw Error('Stable activity-booking style anchor required');
  if (css.includes('/* BEGIN Activity booking guides */') || css.includes('/* END Activity booking guides */')) {if (css.split('/* BEGIN Activity booking guides */').length !== 2 || css.split('/* END Activity booking guides */').length !== 2 || !css.includes(styles + '\n' + anchor)) throw Error('Activity-booking style drift'); return;}
  await writeFile(file, css.replace(anchor, styles + '\n' + anchor));
}
