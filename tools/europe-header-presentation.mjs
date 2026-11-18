import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export async function loadEuropeHeaderPresentation() {
  const fixture = JSON.parse(await readFile(new URL('./fixtures/europe-header-prepared-baseline.json', import.meta.url), 'utf8'));
  const before = fixture.html;
  if (fixture.schemaVersion !== 1 || fixture.sourceCommit !== 'dc1dbd8ec1e501468488a1b35baf5566fda60ac2' || fixture.key !== 'post-best-pub-crawls-in-europe'
    || fixture.mainSha256 !== '5bb95d9893af114a4f51401f3f4ff50e7fb154019f0a956421d75192728e97c5' || typeof before !== 'string'
    || createHash('sha256').update(before).digest('hex') !== fixture.mainSha256) throw Error('Exact independently inventoried Europe presentation baseline required');
  return {key: 'post-best-pub-crawls-in-europe', version: '2026-11-17.europe-header-1', before};
}

export async function buildEuropeHeaderStyles(file) {
  const source = await readFile(file, 'utf8'), styles = await readFile(new URL('./europe-header-presentation.css', import.meta.url), 'utf8');
  const anchor = '/* END Legal mobile text clearance */\n', start = '/* BEGIN Europe article header clearance */', end = '/* END Europe article header clearance */';
  if (source.split(anchor).length !== 2) throw Error('Exact existing legal style boundary required');
  if (source.includes(start) || source.includes(end)) {
    if (source.split(start).length !== 2 || source.split(end).length !== 2 || !source.includes(anchor + styles)) throw Error('Europe header style drift');
    return;
  }
  await writeFile(file, source.replace(anchor, anchor + styles));
}

// Runs last, after the existing reviewed text/semantic preparations. Never edits a capture.
export function reviseEuropeHeaderPresentation({key, revision}) {
  if (key !== 'post-best-pub-crawls-in-europe') return [];
  if (revision?.key !== key || revision.version !== '2026-11-17.europe-header-1' || typeof revision.before !== 'string') throw Error('Exact Europe presentation revision required');
  const parsed = new DOMParser().parseFromString(revision.before, 'text/html');
  const reference = parsed.querySelector('#main-content'), current = document.querySelector('#main-content');
  if (!reference || !current || parsed.querySelectorAll('#main-content').length !== 1 || document.querySelectorAll('#main-content').length !== 1) throw Error('One Europe main boundary required');
  const candidate = reference.cloneNode(true), entry = candidate.querySelector('.entry-content');
  const duplicate = entry?.querySelector('.et_pb_post_title_0');
  const topics = ['europe-choosing', 'europe-krakow', 'europe-malta', 'europe-other-events', 'europe-checklist', 'europe-more'];
  const ids = node => [node, ...node.querySelectorAll('[id]')].filter(n => n.id).map(n => n.id);
  const unique = (node, selector, attr) => [...new Set([...node.querySelectorAll(selector)].filter(n => !n.closest('noscript')).map(n => n.getAttribute(attr)))].sort();
  if (!entry || entry.hasAttribute('data-ktk-europe-header') || entry.querySelectorAll('.et_pb_post_title_0').length !== 1
    || candidate.querySelectorAll('h1').length !== 1 || candidate.querySelector('h1').textContent !== 'Best Pub Crawls in Europe'
    || duplicate?.querySelectorAll('h2').length !== 1 || duplicate.querySelector('h2').textContent !== 'Best Pub Crawls in Europe'
    || duplicate.querySelectorAll('img').length !== 1 || duplicate.querySelector('[id],form,iframe,video,script,style,input,button')
    || candidate.querySelectorAll('img').length !== 3 || ids(candidate).length !== 13 || new Set(ids(candidate)).size !== 13
    || topics.some(id => entry.querySelectorAll('#' + id).length !== 1 || entry.querySelector('#' + id).tagName !== 'H3')) throw Error('Exact duplicated header, six topics and original photo/destination inventory required');
  duplicate.remove();
  for (const id of topics) {
    const old = entry.querySelector('#' + id), heading = document.createElement('h2');
    for (const attr of old.attributes) heading.setAttribute(attr.name, attr.value);
    heading.innerHTML = old.innerHTML; old.replaceWith(heading);
  }
  entry.setAttribute('data-ktk-europe-header', revision.version);
  if (JSON.stringify(ids(candidate)) !== JSON.stringify(ids(reference)) || JSON.stringify(unique(candidate, 'a[href]', 'href')) !== JSON.stringify(unique(reference, 'a[href]', 'href'))
    || JSON.stringify(unique(candidate, 'img', 'src')) !== JSON.stringify(unique(reference, 'img', 'src')) || candidate.querySelectorAll('img').length !== 2) throw Error('Every original destination and unique photograph must remain');
  if (current.outerHTML === candidate.outerHTML) return [];
  if (current.outerHTML !== reference.outerHTML) throw Error('Prepared Europe body changed; refuse before any mutation');
  current.replaceWith(candidate);
  return ['Europe duplicated header removed; six existing topic headings use H2'];
}

// The read-only source verifier retains remote/lazy image attributes and Rocket markers.
// Bind its complete semantic preimage; the real builder above still requires exact portable HTML.
export function reviseEuropeHeaderSourceReference({key, revision}) {
  if (key !== 'post-best-pub-crawls-in-europe') return [];
  if (revision?.key !== key || revision.version !== '2026-11-17.europe-header-1' || typeof revision.before !== 'string') throw Error('Exact Europe source-reference revision required');
  const baseline = new DOMParser().parseFromString(revision.before, 'text/html').querySelector('#main-content');
  const current = document.querySelector('#main-content');
  const facts = node => ({text: node.textContent.replace(/\s+/g, ' ').trim(),
    ids: [node, ...node.querySelectorAll('[id]')].filter(n => n.id).map(n => n.id),
    headings: [...node.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(n => [n.tagName, n.id, n.textContent]),
    photos: [...node.querySelectorAll('img')].map(n => ['alt','width','height'].map(a => n.getAttribute(a)))});
  if (!baseline || !current || document.querySelectorAll('#main-content').length !== 1 || JSON.stringify(facts(current)) !== JSON.stringify(facts(baseline))) throw Error('Complete original Europe source-reference text, headings, IDs and photo descriptions required');
  const candidate = current.cloneNode(true), entry = candidate.querySelector('.entry-content');
  const duplicate = entry.querySelector('.et_pb_post_title_0');
  if (entry.querySelectorAll('.et_pb_post_title_0').length !== 1 || duplicate.querySelector('[id],form,iframe,video,script,style,input,button') || duplicate.querySelectorAll('img').length !== 1) throw Error('Exact source-reference duplicate required');
  const topics = ['europe-choosing', 'europe-krakow', 'europe-malta', 'europe-other-events', 'europe-checklist', 'europe-more'];
  for (const id of topics) if (entry.querySelectorAll('#' + id).length !== 1 || entry.querySelector('#' + id).tagName !== 'H3') throw Error('Exact source-reference topic required');
  duplicate.remove();
  for (const id of topics) {
    const old = entry.querySelector('#' + id), heading = document.createElement('h2');
    for (const attr of old.attributes) heading.setAttribute(attr.name, attr.value);
    heading.innerHTML = old.innerHTML; old.replaceWith(heading);
  }
  entry.setAttribute('data-ktk-europe-header', revision.version);
  current.replaceWith(candidate);
  return ['Europe source-reference duplicate and heading policy'];
}
