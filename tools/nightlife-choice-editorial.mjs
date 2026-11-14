import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadNightlifeChoiceEditorial() {
  const images = JSON.parse(await readFile(new URL('./content-image-descriptions.json', import.meta.url), 'utf8'));
  if (images.status !== 'visually-reviewed' || images.assetManifestSha256 !== 'f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691') throw Error('Reviewed nightlife-choice image policy required');
  const rows = [];
  for (const [key, file, sourceSha256] of [['post-sports-bar-krakow', 'sports-night-choices', 'a6e61994db9cf1524fcd6fbba88fd81c292d1cd92528f9196eb59508f448b44f'], ['post-krakow-wine-bars', 'wine-evening-choices', '5174a63fb7ffb176340d0bf9a2bad35876999b542fabaa3767af5795b262e85e'], ['post-karaoke-bars-in-krakow', 'karaoke-night-choices', '7cabffba59ed9276229b513912cd6188b7bfb7fbe547c8221ed5fb13f87c8371']]) {
    const sourceHtml = await readFile(new URL('../docs/code-pages/full-migration/captures/' + key + '/production-1920.html', import.meta.url), 'utf8');
    if (createHash('sha256').update(sourceHtml).digest('hex') !== sourceSha256) throw Error('Original nightlife-choice capture changed');
    const markup = await readFile(new URL('./content/' + file + '.html', import.meta.url), 'utf8');
    if (/[{}]/.test(markup)) throw Error('Unresolved nightlife-choice fact');
    rows.push({key, sourceSha256, sourceHtml, markup, imageDescriptions: images.descriptions, reviewedOn: '2026-11-14', version: '2026-11-14.nightlife-choices-1'});
  }
  return rows;
}

export function reviseNightlifeChoiceEditorial({key, revision}) {
  const definitions = {"post-sports-bar-krakow":{"sha":"a6e61994db9cf1524fcd6fbba88fd81c292d1cd92528f9196eb59508f448b44f","unique":29,"duplicates":2,"label":"Krakow sports-bar contents","generated":["64959735d4eea_85419","64959735d4eec_85419"],"heads":["bestsportsbarsinkrakowsoldtown","442","banialuka","englishfootballclub","topsportsbarsinjewishquarter","bropubahiddengemservingcraftbeersalongwithlivescreeningsoffootballgames","starazajezdniamicrobrewerywithinanoldtramdepotboastingthelongestbarintown","getinvolvedwithlocalfans","friendlyrivalriesheateddebates","celebratingvictoriestogether","makingnewfriendsoversharedinterests","iskrakowgoodforclubbing","conclusion"],"files":["0996f80dc985-1687527146_1687527141785.png","bd65fae2cf70-1687527198_1687527194979.png","1bfbc2b717f0-1687527922_1687527918965.png","e45f939b7492-1687531455_1687529675542.jpeg","73934d6654d3-1687528572_1687528565031.png","b68db26880b0-1687528806_1687528803158.png","5bb099023356-1687528925_1687528922802.png","d44273a6d3e7-1687529038_1687529035071.png"]},"post-krakow-wine-bars":{"sha":"5174a63fb7ffb176340d0bf9a2bad35876999b542fabaa3767af5795b262e85e","unique":42,"duplicates":4,"label":"Krakow wine-evening contents","generated":["64944a99f120a_61267","64944a99f120c_61267"],"heads":["topwinebarsinkrakow","barawinoaquiethavenwithover500winesavailablebythebottle","czarnasstoccaggiowinebarimpressiveglobalwineselectiontosuiteverypalate","sababa","klimatypoludniahotelwinebarqualityoriginalwinesdeliciousfoodandlocalbeers","uniquefeaturesofkrakowsbestwinebars","atmosphereandambiancetailoredforrelaxationandenjoyment","exclusivetastingeventsshowcasingrarevintages","foodpairingsatkrakowsfinestwinebars","appetizersthatenhanceyourchosenvintage","entreescraftedtopairbeautifullywithspecificvarietals","dessertsspecificallyselectedforoptimalpairingpossibilities","exploringlocalwinesinkrakowstopvenues","wineriesproducingexceptionalqualitybottles","opportunitiesforguidedtastingsfeaturinglocalselections","wineeducationandeventsatkrakowwinebars","masterclassesledbyexperiencedsommeliers","themedtastingeveningsexploringspecificregionsorstyles","conclusion"],"files":["9c58c18f515b-1682580009_Screenshot_202023-04-27_20at_2009.17.44.png","e73ce4dcb86a-1682584158_Screenshot_202023-04-27_20at_2010.28.27.png"]},"post-karaoke-bars-in-krakow":{"sha":"7cabffba59ed9276229b513912cd6188b7bfb7fbe547c8221ed5fb13f87c8371","unique":22,"duplicates":2,"label":"Krakow karaoke contents","generated":["64944c11d4f9f_64105","64944c11d4fa2_64105"],"heads":["unleashyourinnerstaratthebestkaraokebarsinkrakow","karaokebox","pubukacpra","karaokeetiquette","faqsinrelationtokaraokebarsinkrakow","whatmakeskaraokespecial","doeskrakowhavegoodnightlife","whydopeoplelikekaraoke","conclusion"],"files":["ce5471f64d33-1683804810_1683804808705.png","176a294efe79-1683804276_1683804273473.png","8e0578970f4c-1683805103_1683805101633.png","eee35f648d2d-1683805441_1683805439007.jpeg","a7716c26ed64-1683805722_1683805719663.jpeg"]}};
  if (!Object.hasOwn(definitions, key)) return [];
  const conf = definitions[key], clean = s => (s || '').replace(/\s+/g, ' ').trim();
  if (revision?.key !== key || revision.sourceSha256 !== conf.sha || revision.version !== '2026-11-14.nightlife-choices-1' || revision.reviewedOn !== '2026-11-14' || typeof revision.sourceHtml !== 'string' || typeof revision.markup !== 'string' || !revision.imageDescriptions) throw Error('Reviewed nightlife-choice identity required');
  const original = new DOMParser().parseFromString(revision.sourceHtml, 'text/html').querySelector('#main-content'), main = document.querySelector('#main-content'), oldBody = original?.querySelector('.entry-content'), body = main?.querySelector('.entry-content');
  if (!oldBody || !body || document.querySelectorAll('#main-content').length !== 1 || main.querySelectorAll('.entry-content').length !== 1 || !clean(original.querySelector('h1.entry-title')?.textContent) || clean(main.querySelector('h1.entry-title')?.textContent) !== clean(original.querySelector('h1.entry-title')?.textContent) || !clean(original.querySelector('.published')?.textContent) || clean(main.querySelector('.published')?.textContent) !== clean(original.querySelector('.published')?.textContent)) throw Error('Original nightlife-choice publication required');
  const ids = n => [...n.querySelectorAll('[id]')].filter(n => !n.closest('noscript')).map(n => n.id), oldIds = ids(oldBody), oldUnique = [...new Set(oldIds)], marker = body.getAttribute('data-ktk-nightlife-choice-review'), oldHeads = [...new Set([...oldBody.querySelectorAll('h2,h3')].map(n => n.id).filter(id => id && id !== 'main-toc'))];
  if (oldUnique.length !== conf.unique || oldIds.length - oldUnique.length !== conf.duplicates || JSON.stringify(oldHeads) !== JSON.stringify(conf.heads) || body.querySelector('form,iframe,video,script,style,input,button,.et_pb_text_inner')) throw Error('Exact original nightlife-choice structure required');
  const t = document.createElement('template'); t.innerHTML = revision.markup;
  const allowed = new Set(['__KTK_HOME_URL__', '__KTK_HOME_URL__krakow-nightlife/', '__KTK_HOME_URL__best-places-to-eat/', '__KTK_HOME_URL__about-us/how-to-join/', '__KTK_HOME_URL__store2/pub-crawl-28/#book', '__KTK_HOME_URL__store2/polish-vodka-tasting-44/#book', 'https://pub442.eatbu.com/?lang=en', 'https://efckrakow.pl/', 'https://bropub.pl/', 'https://starazajezdniakrakow.pl/en/', 'https://www.barawino.pl/krakow', 'https://stoccaggio.pl/', 'https://convention.krakow.pl/getHtml?dok_id=308172', 'https://klimatypoludnia.pl/', 'https://www.karaokespot.pl/', 'https://www.facebook.com/ukacpra']);
  for (const n of t.content.querySelectorAll('*')) {
    const attrs = n.tagName === 'A' ? ['href'] : ['H2', 'H3', 'P'].includes(n.tagName) ? ['id'] : n.tagName === 'TIME' ? ['datetime'] : n.tagName === 'TEMPLATE' ? ['data-ktk-choice-contents', 'data-ktk-choice-photo'] : [];
    if (!['P', 'SMALL', 'TIME', 'H2', 'H3', 'A', 'STRONG', 'UL', 'LI', 'TEMPLATE'].includes(n.tagName) || [...n.attributes].some(a => !attrs.includes(a.name)) || (n.tagName === 'P' && n.hasAttribute('id') && n.id !== 'isPasted')) throw Error('Unreviewed nightlife-choice markup');
    if (n.tagName === 'A' && (!allowed.has(n.getAttribute('href')) || !clean(n.textContent))) throw Error('Unreviewed nightlife-choice destination');
    if (n.tagName === 'TIME' && (n.getAttribute('datetime') !== revision.reviewedOn || n.textContent !== '14 November 2026')) throw Error('Nightlife-choice review date changed');
  }
  const heads = [...t.content.querySelectorAll('h2,h3')], contents = [...t.content.querySelectorAll('template[data-ktk-choice-contents]')], slots = [...t.content.querySelectorAll('template[data-ktk-choice-photo]')];
  if (JSON.stringify(heads.map(n => n.id)) !== JSON.stringify(conf.heads) || heads.some(n => !clean(n.textContent) || n.tagName !== [...oldBody.querySelectorAll('h2,h3')].find(old => old.id === n.id)?.tagName) || t.content.querySelectorAll('time').length !== 1 || contents.length !== 1 || contents[0].attributes.length !== 1 || contents[0].getAttribute('data-ktk-choice-contents') !== '' || contents[0].innerHTML.trim() || slots.length !== conf.files.length || slots.some((n, i) => n.attributes.length !== 1 || n.getAttribute('data-ktk-choice-photo') !== String(i) || n.innerHTML.trim()) || t.content.querySelectorAll('template').length !== slots.length + 1) throw Error('Complete nightlife-choice topics/media slots required');
  const nav = document.createElement('nav'), details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('ul');
  nav.id = conf.generated[0]; nav.setAttribute('aria-label', conf.label); details.id = conf.generated[1]; summary.id = 'main-toc'; summary.textContent = 'Contents'; details.append(summary, list); nav.append(details);
  for (const h of heads) {const li = document.createElement('li'), a = document.createElement('a'); li.id = h.id + '-toc'; a.setAttribute('href', '#' + h.id); a.textContent = clean(h.textContent); li.append(a); list.append(li);} contents[0].replaceWith(nav);
  const photos = [...body.querySelectorAll('img')].filter(n => !n.closest('noscript')), originals = [...oldBody.querySelectorAll('img')].filter(n => !n.closest('noscript'));
  if (photos.length !== conf.files.length || originals.length !== photos.length) throw Error('Original nightlife-choice photo count changed');
  for (let i = 0; i < photos.length; i++) {
    const n = photos[i], old = originals[i], oldSrc = old.dataset.lazySrc || old.getAttribute('src'), src = n.dataset.lazySrc || n.getAttribute('src'), cls = old.getAttribute('class'), preparedClass = cls?.split(/\s+/).filter(v => !['entered', 'exited'].includes(v)).join(' ');
    if (![oldSrc, '__KTK_PAGE_ASSETS__media/' + conf.files[i]].includes(src) || ['id', 'width', 'height', 'style'].some(a => n.getAttribute(a) !== old.getAttribute(a)) || ![cls, preparedClass].includes(n.getAttribute('class')) || ![old.getAttribute('alt'), revision.imageDescriptions[conf.files[i].slice(0, 12)]].includes(n.getAttribute('alt'))) throw Error('Original nightlife-choice photo identity changed');
    const p = n.parentElement, oldP = old.parentElement, wine = key === 'post-krakow-wine-bars';
    const validParent = (parent, image, prepared) => {
      const copy = parent.cloneNode(true), fallbacks = [...copy.querySelectorAll('noscript')]; if (fallbacks.length > 1 || image.closest('a')) return false;
      for (const f of fallbacks) {const d = new DOMParser().parseFromString(f.innerHTML, 'text/html'), img = d.body.querySelector('img'); if (f.attributes.length || d.body.children.length !== 1 || !img || img.getAttribute('src') !== oldSrc || clean(d.body.textContent) || f.parentElement !== copy) return false; f.remove();}
      if (copy.querySelectorAll('img').length !== 1 || [...copy.children].some(n => n.tagName !== 'IMG')) return false;
      if (prepared && marker) return copy.tagName === 'P' && !copy.attributes.length && !clean(copy.textContent);
      if (!wine) return copy.tagName === 'P' && !copy.attributes.length && !clean(copy.textContent);
      const expectedId = i ? 'exploringlocalwinesinkrakowstopvenues' : 'barawinoaquiethavenwithover500winesavailablebythebottle';
      const tag = copy.tagName === 'H2' && copy.attributes.length === 1 || !i && copy.tagName === 'P' && copy.attributes.length === 2 && copy.getAttribute('data-ktk-heading-origin') === 'h2';
      const sourceText = oldP.cloneNode(true); sourceText.querySelectorAll('noscript').forEach(n => n.remove());
      return tag && copy.id === expectedId && clean(copy.textContent) === clean(sourceText.textContent);
    };
    if (!validParent(oldP, old, false) || !validParent(p, n, true)) throw Error('Exact original nightlife-choice photo parent/fallback required');
    const paragraph = document.createElement('p'); paragraph.append(n.cloneNode(true)); slots[i].replaceWith(paragraph);
  }
  const nextIds = ids(t.content), count = conf.unique + (key === 'post-sports-bar-krakow' ? 1 : 0);
  if (nextIds.length !== count || nextIds.length !== new Set(nextIds).size || oldUnique.some(id => !nextIds.includes(id))) throw Error('Complete unique nightlife-choice legacy targets required');
  const html = document.createElement('template'); html.content.append(t.content.cloneNode(true)); const replacement = html.innerHTML;
  if (marker) {if (marker !== revision.version || body.innerHTML !== replacement) throw Error('Changed reviewed nightlife-choice copy'); return [];}
  const text = n => {const copy = n.cloneNode(true); copy.querySelectorAll('script,style,noscript').forEach(n => n.remove()); return clean(copy.textContent);};
  if (text(body) !== text(oldBody) || JSON.stringify(ids(body)) !== JSON.stringify(oldIds)) throw Error('Original nightlife-choice copy/fragments changed');
  // Validate complete copy, targets and original media before the source swap.
  body.innerHTML = replacement; body.dataset.ktkNightlifeChoiceReview = revision.version;
  return [{type: 'nightlife-choice-review', key, reviewedOn: revision.reviewedOn, retainedInlinePhotos: photos.length, retainedUniqueFragments: oldUnique.length, removedDuplicateIds: conf.duplicates, nativeContentsTargets: heads.length}];
}

export function reviseNightlifeChoiceFeatures({key, revision}) {
  const definitions = {
    'post-sports-bar-krakow': {sha: 'a6e61994db9cf1524fcd6fbba88fd81c292d1cd92528f9196eb59508f448b44f', file: '2236d48af321-1687529529_1687529525830-1080x675.jpeg', original: '1687529529_1687529525830-1080x675.jpeg', oldAlt: 'Three people seated at a Sports Bar in Krakow, watching multiple sports games on large tv screens.', alt: 'Four people seated at a bar beneath screens showing sports.'},
    'post-krakow-wine-bars': {sha: '5174a63fb7ffb176340d0bf9a2bad35876999b542fabaa3767af5795b262e85e', file: '6f0b54862357-zebtttllsoo1682585105-1080x675.jpg', original: 'zebtttllsoo1682585105-1080x675.jpg', oldAlt: 'Krakow Wine Bars', alt: 'A pile of wine corks.'},
    'post-karaoke-bars-in-krakow': {sha: '7cabffba59ed9276229b513912cd6188b7bfb7fbe547c8221ed5fb13f87c8371', file: '6888766476d5-y20jj-ddy9m1683805335-1080x675.jpg', original: 'y20jj-ddy9m1683805335-1080x675.jpg', oldAlt: 'Karaoke bars in Krakow', alt: 'A microphone with coloured lights in the background.'}
  };
  if (!Object.hasOwn(definitions, key)) return [];
  const conf = definitions[key]; if (revision?.key !== key || revision.sourceSha256 !== conf.sha || revision.version !== '2026-11-14.nightlife-choices-1' || revision.reviewedOn !== '2026-11-14' || typeof revision.sourceHtml !== 'string') throw Error('Reviewed nightlife-choice feature identity required');
  const d = new DOMParser().parseFromString(revision.sourceHtml, 'text/html'), find = d => [...d.querySelectorAll('#main-content .et_post_meta_wrapper img')].filter(n => !n.closest('noscript')), old = find(d), current = find(document);
  if (old.length !== 1 || current.length !== 1) throw Error('One original nightlife-choice feature required');
  const n = current[0], before = old[0], origin = before.dataset.lazySrc || before.getAttribute('src'), src = n.dataset.lazySrc || n.getAttribute('src'), cls = before.getAttribute('class'), preparedClass = cls?.split(/\s+/).filter(v => !['entered', 'exited'].includes(v)).join(' ');
  if (!origin.endsWith('/' + conf.original) || ![origin, '__KTK_PAGE_ASSETS__media/' + conf.file].includes(src) || before.getAttribute('alt') !== conf.oldAlt || ![conf.oldAlt, conf.alt].includes(n.getAttribute('alt')) || ['id', 'width', 'height', 'style'].some(a => n.getAttribute(a) !== before.getAttribute(a)) || ![cls, preparedClass].includes(n.getAttribute('class'))) throw Error('Exact nightlife-choice feature identity required');
  if (n.getAttribute('alt') === conf.alt) return [];
  n.setAttribute('alt', conf.alt); return [{type: 'neutral-nightlife-choice-feature', key, file: conf.file, alt: conf.alt}];
}

const scope = 'body.ktk-code-page:is([data-ktk-page="post-sports-bar-krakow"],[data-ktk-page="post-krakow-wine-bars"],[data-ktk-page="post-karaoke-bars-in-krakow"]) #main-content .entry-content[data-ktk-nightlife-choice-review]';
const styles = '/* BEGIN Nightlife choice guides */\n' + scope + ' { font-size: 16px; line-height: 1.65; letter-spacing: 0; text-align: left; }\n' + scope + ' p { font-size: 16px; line-height: 1.65; }\n' + scope + ' :is(h2,h3) { font-family: inherit; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\n' + scope + ' h2 { font-size: 22px; }\n' + scope + ' h3 { font-size: 18px; }\n' + scope + ' nav { margin: 1em 0; }\n' + scope + ' summary { cursor: pointer; min-height: 44px; padding: 8px 0; font-weight: 700; }\n' + scope + ' a { color: #c8006c !important; text-decoration: underline; text-underline-offset: .15em; }\n' + scope + ' :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  ' + scope + ' { padding-right: 24px; }\n}\n/* END Nightlife choice guides */\n';
export async function buildNightlifeChoiceStyles(file) {
  const css = await readFile(file, 'utf8'), anchor = '/* BEGIN Practical food guides */'; if (css.split(anchor).length !== 2) throw Error('Stable nightlife-choice style anchor required');
  if (css.includes('/* BEGIN Nightlife choice guides */') || css.includes('/* END Nightlife choice guides */')) {if (css.split('/* BEGIN Nightlife choice guides */').length !== 2 || css.split('/* END Nightlife choice guides */').length !== 2 || !css.includes(styles + '\n' + anchor)) throw Error('Nightlife-choice style drift'); return;}
  await writeFile(file, css.replace(anchor, styles + '\n' + anchor));
}
