import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadReviewedArticlePresentation} from './reviewed-article-presentation.mjs';
import {loadOfferFacts, offerTemplateValues} from './site-offer-facts.mjs';

export async function loadBlogGroupEditorial() {
  const sourceIds = {blog: '938e5e17b59d1d22ad375e9dd90f817dc42e32c1004a54bb2806961a87bb7576', stagshens: 'b8eb71a0192a5f763b4985580fce3a0186a0144973376222d656b456f09d4f3e'}, reviewed = await loadReviewedArticlePresentation(), articles = reviewed.find(r => r.key === 'blog').articles;
  const ids = [6396, 6376, 6387, 6678, 7506, 7492, 6394, 6534], summaries = ids.map(id => articles.find(a => a.postId === id));
  if (summaries.some(a => !a) || new Set(summaries.map(a => a.key)).size !== 8) throw Error('Eight existing reviewed teaser identities required');
  const values = offerTemplateValues(await loadOfferFacts());
  let markup = await readFile(new URL('./content/group-enquiry-overview.html', import.meta.url), 'utf8');
  markup = markup.replace(/\{\{([A-Za-z]+)\}\}/g, (_, name) => {if (!['minimumAge', 'regularTime'].includes(name)) throw Error('Unreviewed group overview fact'); return values[name];});
  if (/[{}]/.test(markup)) throw Error('Unresolved group overview fact');
  const result = [];
  for (const [key, sourceSha256] of Object.entries(sourceIds)) {
    const sourceHtml = await readFile(new URL('../docs/code-pages/full-migration/captures/' + key + '/production-1920.html', import.meta.url), 'utf8');
    if (createHash('sha256').update(sourceHtml).digest('hex') !== sourceSha256) throw Error('Original Blog/group source changed');
    result.push({key, sourceSha256, sourceHtml, version: '2026-11-15.blog-group-1', reviewedOn: '2026-11-15', ...(key === 'blog' ? {summaries} : {markup})});
  }
  return result;
}

export function reviseBlogGroupEditorial({key, revision}) {
  const sources = {blog: '938e5e17b59d1d22ad375e9dd90f817dc42e32c1004a54bb2806961a87bb7576', stagshens: 'b8eb71a0192a5f763b4985580fce3a0186a0144973376222d656b456f09d4f3e'};
  if (!Object.hasOwn(sources, key)) return [];
  if (revision?.key !== key || revision.sourceSha256 !== sources[key] || revision.version !== '2026-11-15.blog-group-1' || revision.reviewedOn !== '2026-11-15' || typeof revision.sourceHtml !== 'string') throw Error('Reviewed Blog/group identity required');
  const original = new DOMParser().parseFromString(revision.sourceHtml, 'text/html'), main = document.querySelector('#main-content'), source = original.querySelector('#main-content'), clean = s => (s || '').replace(/\s+/g, ' ').trim(), pending = [];
  if (!main || !source) throw Error('Original Blog/group main required');
  if (key === 'blog') {
    const ids = [6396, 6376, 6387, 6403, 6678, 7506, 7492, 7472, 6394, 6534], selected = ids.filter(id => ![6403, 7472].includes(id)), normalize = s => s.replace(/^https:\/\/krawlthroughkrakow\.com\//, '__KTK_HOME_URL__').replace(/^__KTK_HOME_URL__krakow-pub-crawl\/$/, '__KTK_HOME_URL__');
    if (!Array.isArray(revision.summaries) || JSON.stringify(revision.summaries.map(a => a.postId)) !== JSON.stringify(selected)) throw Error('Exact eight reviewed teasers required');
    const roots = root => root.querySelectorAll('.et_pb_post_slider_0'), before = roots(source), now = roots(main);
    if (before.length !== 1 || now.length !== 1) throw Error('One original post slider required');
    const slides = root => [...root.querySelectorAll('.et_pb_slide')], oldSlides = slides(before[0]), currentSlides = slides(now[0]);
    if (oldSlides.length !== 10 || currentSlides.length !== 10 || currentSlides.some((n, i) => !n.classList.contains('et_pb_post_slide-' + ids[i])) || oldSlides.some((n, i) => !n.classList.contains('et_pb_post_slide-' + ids[i]))) throw Error('Ten original ordered slides required');
    for (const [i, id] of ids.entries()) {
      const old = oldSlides[i], target = currentSlides[i], conf = revision.summaries.find(a => a.postId === id), links = node => [...node.querySelectorAll('a')].map(a => [normalize(a.getAttribute('href') || ''), a.textContent]);
      if (JSON.stringify(links(old)) !== JSON.stringify(links(target)) || links(target).length !== 2 || target.querySelector('img,form,input,iframe,script,style')) throw Error('Original teaser links/media boundary changed');
      if (!conf) {if (old.querySelector('.et_pb_slide_content').innerHTML !== target.querySelector('.et_pb_slide_content').innerHTML) throw Error('Protected homepage/Halloween teaser changed'); continue;}
      if (conf.route !== '/' + conf.key.replace(/^post-/, '') + '/' || links(target).some(([href]) => href !== '__KTK_HOME_URL__' + conf.route.slice(1)) || typeof conf.summary !== 'string' || conf.summary.length < 80 || conf.summary.length > 250 || /[<>\u0000-\u001f]/.test(conf.summary)) throw Error('Reviewed teaser destination/summary changed');
      const content = node => {const outer = node.querySelectorAll('.et_pb_slide_content'), rows = node.querySelectorAll('.et_pb_slide_content > div'); if (outer.length !== 1 || rows.length !== 1 || outer[0].children.length !== 1 || rows[0].querySelector('a,img,form,iframe,script,style')) throw Error('Original text-only teaser required'); const boundary = outer[0].cloneNode(true); boundary.firstElementChild.remove(); if (clean(boundary.textContent)) throw Error('Unexpected text outside teaser'); const children = rows[0].children; if (children.length && (children.length !== 1 || children[0].tagName !== 'P' || children[0].children.length || [...rows[0].childNodes].some(n => n.nodeType === 3 && clean(n.textContent)))) throw Error('Original teaser paragraph shape changed'); return children.length ? children[0] : rows[0];}, a = content(old), b = content(target), marker = b.getAttribute('data-ktk-blog-teaser-review');
      if (marker ? marker !== revision.version || b.textContent !== conf.summary : b.innerHTML !== a.innerHTML) throw Error('Original/reviewed teaser text changed');
      if (!marker) pending.push({target: b, text: conf.summary, id});
    }
    if (pending.length && pending.length !== 8) throw Error('Partially reviewed teaser set');
    for (const {target, text} of pending) {target.textContent = text; target.dataset.ktkBlogTeaserReview = revision.version;}
    return pending.map(({id}) => ({type: 'reviewed-blog-teaser', postId: id, reviewedOn: revision.reviewedOn}));
  }
  if (typeof revision.markup !== 'string') throw Error('Reviewed group overview markup required');
  const template = new DOMParser().parseFromString(revision.markup, 'text/html'), parts = [...template.querySelectorAll('template')], selectors = [1, 2, 3].map(i => '.et_pb_text_' + i + ' .et_pb_text_inner');
  if (parts.length !== 3 || clean(template.body.textContent) || [...template.head.children, ...template.body.children].some(n => n.tagName !== 'TEMPLATE') || new Set(parts.map(n => n.dataset.target)).size !== 3) throw Error('Exactly three group overview templates required');
  for (const part of parts) {
    const selector = part.dataset.target;
    if (part.attributes.length !== 1 || !selectors.includes(selector) || !clean(part.content.textContent)) throw Error('Original group overview target required');
    for (const n of part.content.querySelectorAll('*')) if (!['P', 'A'].includes(n.tagName) || [...n.attributes].some(a => n.tagName !== 'A' || a.name !== 'href') || n.tagName === 'A' && (n.getAttribute('href') !== '__KTK_HOME_URL__about-us/how-to-join/' || !clean(n.textContent))) throw Error('Plain reviewed group paragraphs required');
    const old = source.querySelectorAll(selector), targets = main.querySelectorAll(selector);
    if (old.length !== 1 || targets.length !== 1 || targets[0].querySelector('img,svg,iframe,script,style,form,input,textarea,button,select,[id]')) throw Error('Protected/missing group module');
    const target = targets[0], copy = target.cloneNode(true), contexts = copy.querySelectorAll('[data-ktk-contextual-links]');
    if (contexts.length > 1 || contexts.length && selector !== selectors[0]) throw Error('Unexpected group contextual links');
    let context = '';
    if (contexts.length) {
      const node = contexts[0], links = [...node.querySelectorAll('a')];
      if (node.tagName !== 'P' || node.attributes.length !== 1 || node.dataset.ktkContextualLinks !== 'stagshens' || links.length !== 2 || links[0].getAttribute('href') !== '__KTK_HOME_URL__krakow-stag-do/' || links[1].getAttribute('href') !== '__KTK_HOME_URL__krakow-hen-do/' || clean(node.textContent) !== 'Plan your stag do in Krakow or hen party in Krakow.') throw Error('Original contextual paragraph changed');
      context = node.outerHTML; node.remove();
    }
    const html = part.innerHTML.trim(), marker = target.getAttribute('data-ktk-group-overview-review');
    if (marker ? marker !== revision.version || copy.innerHTML.trim() !== html : copy.innerHTML.trim() !== old[0].innerHTML.trim()) throw Error('Original/reviewed group overview changed');
    if (!marker) pending.push({target, html: html + context, selector});
  }
  const forms = main.querySelectorAll('form.wpcf7-form'); if (forms.length !== 1) throw Error('Original group enquiry form required');
  if (pending.length && pending.length !== 3) throw Error('Partially reviewed group overview');
  for (const {target, html} of pending) {target.innerHTML = html; target.dataset.ktkGroupOverviewReview = revision.version;}
  return pending.map(({selector}) => ({type: 'reviewed-group-overview', selector, reviewedOn: revision.reviewedOn}));
}

const scope = 'body.ktk-code-page[data-ktk-page="stagshens"] #main-content [data-ktk-group-overview-review="2026-11-15.blog-group-1"]';
const styles = '/* BEGIN Group enquiry overview */\n' + scope + ' { font-size: 16px; line-height: 1.65; text-align: left; }\n' + scope + ' p { font-size: 16px; line-height: 1.65; }\n' + scope + ' a { color: inherit; text-decoration: underline; text-underline-offset: .15em; }\n' + scope + ' a:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n@media (max-width: 600px) {\n  ' + scope + ' { padding-right: 24px; }\n}\n/* END Group enquiry overview */\n';
export async function buildBlogGroupStyles(file) {
  const css = await readFile(file, 'utf8'), anchor = '/* END reduced-motion slide content */\n';
  if (css.split(anchor).length !== 2) throw Error('Stable reduced-motion boundary required');
  if (css.includes('/* BEGIN Group enquiry overview */') || css.includes('/* END Group enquiry overview */')) {
    if (css.split('/* BEGIN Group enquiry overview */').length !== 2 || css.split('/* END Group enquiry overview */').length !== 2 || !css.includes(anchor + styles)) throw Error('Group overview stylesheet drift');
    return;
  }
  await writeFile(file, css.replace(anchor, anchor + styles));
}
