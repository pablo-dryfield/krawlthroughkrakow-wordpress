import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadCategoryNavigation() {
  const raw = await readFile(new URL('./category-navigation-introductions.json', import.meta.url));
  if (createHash('sha256').update(raw).digest('hex') !== 'efdc93702782900808625d2b22851d77be87f64c1f386b84c9033fefbd865cbd') throw Error('Exact reviewed category copy and prepared baselines required');
  const data = JSON.parse(raw.toString('utf8'));
  const keys = ['archive-category-drinking-games','archive-category-hen-do','archive-category-stag-do','archive-category-krakow-guides','archive-category-krakow-nightlife','archive-category-party-tips','archive-category-uncategorized'];
  const manifest = JSON.parse(await readFile(new URL('../docs/code-pages/full-migration/manifest.json', import.meta.url), 'utf8'));
  const routes = new Map(manifest.routes.map(r => [r.route,r.key]));
  if (data.schemaVersion !== 1 || data.status !== 'reviewed-navigation' || data.version !== '2026-11-17.category-navigation-1' || data.reviewedOn !== '2026-11-17'
    || data.sourceCommit !== 'd0ea9dbb4623ff44fd34e69e854f793281cae729' || JSON.stringify(data.categories?.map(r => r.key)) !== JSON.stringify(keys)) throw Error('Exact seven root-category identities required');
  for (const r of data.categories) {
    if (routes.get(r.route) !== r.key || typeof r.preparedHtml !== 'string' || createHash('sha256').update(r.preparedHtml).digest('hex') !== r.preparedSha256
      || typeof r.heading !== 'string' || !r.heading || typeof r.introduction !== 'string' || r.destinations.length !== 2 || r.destinations.some(d => !routes.has(d))) throw Error('Prepared category baseline and existing destinations required');
  }
  return data.categories.map(r => ({...r,version:data.version}));
}

export async function buildCategoryNavigationStyles(file) {
  const source = await readFile(file,'utf8'), styles = await readFile(new URL('./category-navigation.css',import.meta.url),'utf8');
  const anchor = '/* END Europe article header clearance */\n', start = '/* BEGIN Category archive navigation */', end = '/* END Category archive navigation */';
  if (source.split(anchor).length !== 2) throw Error('Exact Europe style boundary required');
  if (source.includes(start) || source.includes(end)) {
    if (source.split(start).length !== 2 || source.split(end).length !== 2 || !source.includes(anchor + styles)) throw Error('Category navigation style drift');
    return;
  }
  await writeFile(file,source.replace(anchor,anchor + styles));
}

export function reviseCategoryNavigation({key,revision}) {
  if (!['archive-category-drinking-games','archive-category-hen-do','archive-category-stag-do','archive-category-krakow-guides','archive-category-krakow-nightlife','archive-category-party-tips','archive-category-uncategorized'].includes(key)) return [];
  if (revision?.key !== key || revision.version !== '2026-11-17.category-navigation-1' || typeof revision.preparedHtml !== 'string' || typeof revision.introduction !== 'string' || revision.destinations?.length !== 2) throw Error('Exact root-category navigation revision required');
  const reference = new DOMParser().parseFromString(revision.preparedHtml,'text/html').querySelector('#main-content'), current = document.querySelector('#main-content');
  if (!reference || !current || document.querySelectorAll('#main-content').length !== 1 || reference.querySelectorAll('h1').length !== 1 || reference.querySelector('h1').textContent.trim() !== revision.heading || reference.querySelector('[data-ktk-archive-intro]')) throw Error('One original category heading and main boundary required');
  const template = document.createElement('template');template.innerHTML = revision.introduction;
  const paragraph = template.content.firstElementChild, all = [...template.content.querySelectorAll('*')], links = [...template.content.querySelectorAll('a')];
  if (template.content.childNodes.length !== 1 || paragraph?.tagName !== 'P' || paragraph.getAttribute('data-ktk-archive-intro') !== revision.version || all.length !== 3 || links.length !== 2
    || all.some(n => !['P','A'].includes(n.tagName) || n.attributes.length !== 1 || n.attributes[0].name !== (n.tagName === 'P' ? 'data-ktk-archive-intro' : 'href'))
    || links.some((n,i) => n.getAttribute('href') !== '__KTK_HOME_URL__' + revision.destinations[i].slice(1) || !n.textContent.trim())) throw Error('One reviewed paragraph and two native destinations required');
  const candidate = reference.cloneNode(true);candidate.querySelector('h1').after(paragraph.cloneNode(true));
  const inverse = candidate.cloneNode(true);inverse.querySelector('[data-ktk-archive-intro]').remove();
  if (inverse.outerHTML !== reference.outerHTML) throw Error('Every original category byte outside the new paragraph must remain');
  if (current.outerHTML === candidate.outerHTML) return [];
  if (current.outerHTML !== reference.outerHTML) throw Error('Prepared category body changed; refuse before mutation');
  current.replaceWith(candidate);
  return [{type:'category-navigation-introduction',key,destinations:revision.destinations,version:revision.version}];
}

// Only the read-only reference projection retains original remote/lazy/Rocket attributes.
// Its complete semantic preimage is checked; real application generation above is byte-bound.
export function reviseCategoryNavigationSourceReference({key,revision}) {
  if (!['archive-category-drinking-games','archive-category-hen-do','archive-category-stag-do','archive-category-krakow-guides','archive-category-krakow-nightlife','archive-category-party-tips','archive-category-uncategorized'].includes(key)) return [];
  if (revision?.key !== key || revision.version !== '2026-11-17.category-navigation-1' || typeof revision.preparedHtml !== 'string' || typeof revision.introduction !== 'string') throw Error('Exact category source-reference revision required');
  const reference = new DOMParser().parseFromString(revision.preparedHtml,'text/html').querySelector('#main-content'), current = document.querySelector('#main-content');
  const facts = n => ({text:n.textContent.replace(/\s+/g,' ').trim(),ids:[n,...n.querySelectorAll('[id]')].filter(n => n.id).map(n => n.id),
    headings:[...n.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(n => [n.tagName,n.id,n.textContent]),photos:[...n.querySelectorAll('img')].map(n => ['alt','width','height'].map(a => n.getAttribute(a)))});
  if (!reference || !current || document.querySelectorAll('#main-content').length !== 1 || JSON.stringify(facts(current)) !== JSON.stringify(facts(reference))) throw Error('Complete original category source-reference semantics required');
  const template = document.createElement('template');template.innerHTML = revision.introduction;
  if (template.content.childNodes.length !== 1 || template.content.firstElementChild?.tagName !== 'P' || template.content.firstElementChild.getAttribute('data-ktk-archive-intro') !== revision.version || template.content.querySelectorAll('a').length !== 2) throw Error('Reviewed source-reference paragraph required');
  const candidate = current.cloneNode(true);candidate.querySelector('h1').after(template.content.firstElementChild.cloneNode(true));current.replaceWith(candidate);
  return [{type:'category-navigation-source-reference',key}];
}
