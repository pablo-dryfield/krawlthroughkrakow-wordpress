import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadCompetitionNewsletterEditorial() {
  const specs = [
    ['post-welcome-to-alcohol', 'competition-entry-review', 'c8c83f5ed83be1fa1c6996cbe6d9786350626b58814119c7653190239fa51085'],
    ['post-krawl-through-krakow-winter-newsletter', 'newsletter-context-review', '547a842f11b72f0ce0883df5f6437657228a96c8a4d48df0f1e45a23b5dc62fc']
  ], rows = [], images = JSON.parse(await readFile(new URL('./content-image-descriptions.json', import.meta.url), 'utf8'));
  if (images.status !== 'visually-reviewed' || images.assetManifestSha256 !== 'f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691') throw Error('Reviewed newsletter image policy required');
  for (const [key, file, sourceSha256] of specs) {
    const sourceHtml = await readFile(new URL('../docs/code-pages/full-migration/captures/' + key + '/production-1920.html', import.meta.url), 'utf8');
    if (createHash('sha256').update(sourceHtml).digest('hex') !== sourceSha256) throw Error('Original competition/newsletter capture changed');
    const markup = await readFile(new URL('./content/' + file + '.html', import.meta.url), 'utf8');
    if (/[{}]/.test(markup)) throw Error('Unresolved competition/newsletter fact');
    rows.push({key, sourceSha256, sourceHtml, markup, imageDescriptions: images.descriptions, reviewedOn: '2026-11-15', version: '2026-11-15.competition-newsletter-1'});
  }
  return rows;
}

export function reviseCompetitionNewsletterEditorial({key, revision}) {
  const definitions = {
    'post-welcome-to-alcohol': {sha: 'c8c83f5ed83be1fa1c6996cbe6d9786350626b58814119c7653190239fa51085', count: 3, title: 'The Big Prize Competition', forms: 1, ids: ['competition-how-to-enter', 'competition-prizes', 'competition-questions'], files: []},
    'post-krawl-through-krakow-winter-newsletter': {sha: '547a842f11b72f0ce0883df5f6437657228a96c8a4d48df0f1e45a23b5dc62fc', count: 12, title: 'KTK Winter Newsletter', forms: 0, ids: ['newsletter-nye-info', 'newsletter-competition', 'newsletter-halloween', 'newsletter-student-trips', 'newsletter-jobs'], files: ['1c26000316b5-memebetter.com-20161019123328.jpg', '7c805bae7adb-12191798_713207255479797_6557212624818766323_n-2.jpg', '2ce44fac400f-12187739_713210215479501_6586859707945115233_n.jpg', 'c145f8a0013c-12049734_713206212146568_5585426542408956231_n.jpg', 'de13d750e794-12195898_713205125480010_766969940516896378_n.jpg', 'cd9b8f773669-11220472_713205888813267_5829048885137787723_n.jpg', '2d884d717fda-11216568_713204532146736_1245023445288909097_n.jpg', '4c627f6b8446-12190860_713211875479335_7527477793688563588_n.jpg', '4051654ab750-11254053_713212002145989_2768246229302733710_n.jpg', '83d3b650823d-staff2016.jpg']}
  };
  if (!Object.hasOwn(definitions, key)) return [];
  const conf = definitions[key], clean = s => (s || '').replace(/\s+/g, ' ').trim();
  if (revision?.key !== key || revision.sourceSha256 !== conf.sha || revision.version !== '2026-11-15.competition-newsletter-1' || revision.reviewedOn !== '2026-11-15' || typeof revision.sourceHtml !== 'string' || typeof revision.markup !== 'string' || !revision.imageDescriptions) throw Error('Reviewed competition/newsletter identity required');
  const original = new DOMParser().parseFromString(revision.sourceHtml, 'text/html').querySelector('#main-content'), main = document.querySelector('#main-content'), source = original?.querySelector('.entry-content'), body = main?.querySelector('.entry-content');
  const title = n => [...n.querySelectorAll('h1,h2')].filter(n => clean(n.textContent) === conf.title);
  if (!source || !body || document.querySelectorAll('#main-content').length !== 1 || main.querySelectorAll('.entry-content').length !== 1 || title(original).length !== 1 || title(main).length !== 1 || key === 'post-welcome-to-alcohol' && title(main)[0].tagName !== 'H1') throw Error('Original competition/newsletter headline required');
  const modules = [...body.querySelectorAll('.et_pb_text_inner')], sources = [...source.querySelectorAll('.et_pb_text_inner')], marker = body.getAttribute('data-ktk-story-review');
  const forbidden = 'img,form,iframe,video,script,style,input,button';
  if (modules.length !== conf.count || sources.length !== conf.count || modules.some(n => n.querySelector(forbidden)) || sources.some(n => n.querySelector(forbidden + ',[id]')) || source.querySelectorAll('form').length !== conf.forms || body.querySelectorAll('form').length !== conf.forms || [...body.querySelectorAll('*')].some(n => [...n.attributes].some(a => a.name.startsWith('on')))) throw Error('Exact text-only interiors and active form boundary required');
  if (conf.forms) {
    const old = source.querySelector('form'), current = body.querySelector('form');
    if (old.getAttribute('method') !== 'post' || current.getAttribute('method') !== 'post' || ![old.getAttribute('action'), '__KTK_HOME_URL__welcome-to-alcohol/#wpcf7-f1675-p1271-o1'].includes(current.getAttribute('action')) || current.hasAttribute('data-feedback-endpoint') && current.getAttribute('data-feedback-endpoint') !== '__KTK_CF7_API__1675/feedback') throw Error('Original active competition form destination required');
  }
  const photos = n => [...n.querySelectorAll('img')].filter(n => !n.closest('noscript')), oldImages = photos(source), images = photos(body);
  if (images.length !== conf.files.length || oldImages.length !== images.length || images.some(n => n.closest('.et_pb_text_inner'))) throw Error('All original newsletter photos must remain outside text interiors');
  for (let i = 0; i < images.length; i++) {
    const n = images[i], old = oldImages[i], origin = old.dataset.lazySrc || old.getAttribute('src'), src = n.dataset.lazySrc || n.getAttribute('src'), cls = old.getAttribute('class'), prepared = cls?.split(/\s+/).filter(v => !['entered', 'exited'].includes(v)).join(' ');
    if (![origin, '__KTK_PAGE_ASSETS__media/' + conf.files[i]].includes(src) || ['id', 'width', 'height', 'style'].some(a => n.getAttribute(a) !== old.getAttribute(a)) || ![cls, prepared].includes(n.getAttribute('class')) || ![old.getAttribute('alt'), revision.imageDescriptions[conf.files[i].slice(0, 12)]].includes(n.getAttribute('alt'))) throw Error('Original newsletter photo identity changed');
  }
  const t = document.createElement('template'); t.innerHTML = revision.markup;
  const slots = [...t.content.children];
  if (slots.length !== conf.count || slots.some((n, i) => n.tagName !== 'TEMPLATE' || n.attributes.length !== 1 || n.getAttribute('data-ktk-story-module') !== String(i)) || [...t.content.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())) throw Error('Exact ordered story module slots required');
  const plans = slots.map(n => n.content), all = plans.flatMap(n => [...n.querySelectorAll('*')]), allowed = new Set(['#competition-how-to-enter', '__KTK_HOME_URL__contact/', '__KTK_HOME_URL__store2/pub-crawl-28/#book', '__KTK_HOME_URL__about-us/how-to-join/', '__KTK_HOME_URL__new-years-eve/', '__KTK_HOME_URL__welcome-to-alcohol/', '__KTK_HOME_URL__store2/halloween-pub-crawl-51/', '__KTK_HOME_URL__student-trips-poland/', '__KTK_HOME_URL__pub-crawl-jobs/']);
  for (const n of all) {
    const attrs = n.tagName === 'A' ? ['href'] : n.tagName === 'H2' ? ['id'] : n.tagName === 'TIME' ? ['datetime'] : n.tagName === 'TEMPLATE' ? ['data-ktk-story-contents'] : [];
    if (!['P', 'SMALL', 'TIME', 'H2', 'A', 'STRONG', 'UL', 'LI', 'TEMPLATE'].includes(n.tagName) || [...n.attributes].some(a => !attrs.includes(a.name))) throw Error('Unreviewed competition/newsletter markup');
    if (n.tagName === 'A' && (!allowed.has(n.getAttribute('href')) || !clean(n.textContent) || key === 'post-welcome-to-alcohol' && !['#competition-how-to-enter', '__KTK_HOME_URL__contact/'].includes(n.getAttribute('href')))) throw Error('Unreviewed story destination');
    if (n.tagName === 'TIME' && (n.getAttribute('datetime') !== revision.reviewedOn || n.textContent !== '15 November 2026')) throw Error('Story review date changed');
  }
  const heads = all.filter(n => n.tagName === 'H2'), contents = all.filter(n => n.tagName === 'TEMPLATE'), newsletter = key === 'post-krawl-through-krakow-winter-newsletter';
  if (JSON.stringify(heads.map(n => n.id)) !== JSON.stringify(conf.ids) || heads.some(n => !clean(n.textContent)) || all.filter(n => n.tagName === 'TIME').length !== 1 || contents.length !== (newsletter ? 1 : 0) || contents.some(n => n.attributes.length !== 1 || n.getAttribute('data-ktk-story-contents') !== '' || n.innerHTML.trim())) throw Error('Complete ordered story topics and review time required');
  if (newsletter) {
    const nav = document.createElement('nav'), details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('ul');
    nav.setAttribute('aria-label', 'KTK newsletter contents'); summary.id = 'newsletter-contents'; summary.textContent = 'Contents'; details.append(summary, list); nav.append(details);
    for (const h of heads) {const li = document.createElement('li'), a = document.createElement('a'); a.setAttribute('href', '#' + h.id); a.textContent = clean(h.textContent); li.append(a); list.append(li);} contents[0].replaceWith(nav);
  }
  const html = n => {const t = document.createElement('template'); t.content.append(n.cloneNode(true)); return t.innerHTML;}, replacements = plans.map(html);
  const outside = n => {const c = n.cloneNode(true); c.querySelectorAll('.et_pb_text_inner,form,script,style,noscript,iframe').forEach(n => n.remove()); return clean(c.textContent);};
  if (outside(body) !== outside(source)) throw Error('Original story copy outside text interiors changed');
  if (marker) {if (marker !== revision.version || modules.some((n, i) => n.innerHTML !== replacements[i])) throw Error('Changed reviewed story copy'); return [];}
  const originalInterior = (node, old) => {
    const c = node.cloneNode(true), links = [...c.querySelectorAll('a')], before = [...old.querySelectorAll('a')];
    if (links.length !== before.length) return false;
    for (let i = 0; i < links.length; i++) {
      const a = links[i], b = before[i], href = b.getAttribute('href');
      if (![href, href?.replace('https://krawlthroughkrakow.com/', '__KTK_HOME_URL__')].includes(a.getAttribute('href')) || a.innerHTML !== b.innerHTML || ![b.getAttribute('rel'), b.target === '_blank' ? 'noopener noreferrer' : null].includes(a.getAttribute('rel'))) return false;
      a.setAttribute('href', href); if (b.hasAttribute('rel')) a.setAttribute('rel', b.getAttribute('rel')); else a.removeAttribute('rel');
    }
    return c.innerHTML === old.innerHTML;
  };
  if (modules.some((n, i) => !originalInterior(n, sources[i]) || n.querySelector('[id]')) || [...conf.ids, ...(newsletter ? ['newsletter-contents'] : [])].some(id => document.getElementById(id))) throw Error('Original story module copy, markup or targets changed');
  // Validate every interior and unchanged form/media boundary before swapping any copy.
  for (let i = 0; i < modules.length; i++) modules[i].innerHTML = replacements[i]; body.dataset.ktkStoryReview = revision.version;
  return [{type: 'competition-newsletter-review', key, reviewedOn: revision.reviewedOn, textInteriors: conf.count, retainedPhotos: images.length, retainedForms: conf.forms, nativeContentsTargets: newsletter ? heads.length : 0}];
}

const root = 'body.ktk-code-page:is([data-ktk-page="post-welcome-to-alcohol"],[data-ktk-page="post-krawl-through-krakow-winter-newsletter"]) #main-content .entry-content[data-ktk-story-review]', copy = root + ' .et_pb_text_inner';
const styles = '/* BEGIN Competition newsletter guidance */\n' + copy + ' { font-size: 16px; line-height: 1.65; letter-spacing: 0; text-align: left; }\n' + copy + ' p { font-size: 16px; line-height: 1.65; }\n' + copy + ' :is(h2,h3) { font-family: inherit; font-weight: 700; line-height: 1.35; letter-spacing: 0; margin: 24px 0 12px; }\n' + copy + ' h2 { font-size: 22px; }\n' + copy + ' h3 { font-size: 18px; }\n' + copy + ' nav { margin: 1em 0; }\n' + copy + ' summary { cursor: pointer; min-height: 44px; padding: 8px 0; font-weight: 700; }\n' + copy + ' a { color: #c8006c !important; text-decoration: underline; text-underline-offset: .15em; }\n' + copy + ' :is(summary,a):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  ' + copy + ' { padding-right: 24px; }\n}\n/* END Competition newsletter guidance */\n';
export async function buildCompetitionNewsletterStyles(file) {
  const css = await readFile(file, 'utf8'), anchor = '/* BEGIN Activity booking guides */';
  if (css.split(anchor).length !== 2) throw Error('Stable story style anchor required');
  if (css.includes('/* BEGIN Competition newsletter guidance */') || css.includes('/* END Competition newsletter guidance */')) {if (css.split('/* BEGIN Competition newsletter guidance */').length !== 2 || css.split('/* END Competition newsletter guidance */').length !== 2 || !css.includes(styles + '\n' + anchor)) throw Error('Competition/newsletter style drift'); return;}
  await writeFile(file, css.replace(anchor, styles + '\n' + anchor));
}
