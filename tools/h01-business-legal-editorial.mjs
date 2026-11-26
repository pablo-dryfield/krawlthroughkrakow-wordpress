import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export const h01CompetitionFormScope='body.ktk-code-page[data-ktk-page="post-welcome-to-alcohol"] #main-content form.wpcf7-form[data-route-key="post-welcome-to-alcohol"][data-ktk-owned-enquiry="true"]';
const legacyCompetitionFormStyles='\n/* BEGIN H01 competition field fit */\n'+h01CompetitionFormScope+' :is(label,.wpcf7-form-control-wrap) { display: block; max-width: 100%; min-width: 0; }\n'+h01CompetitionFormScope+' .wpcf7-form-control:is(.wpcf7-text,.wpcf7-email,.wpcf7-textarea) { box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; }\n/* END H01 competition field fit */\n';
const groupFormScope='body.ktk-code-page[data-ktk-page="stagshens"] #main-content form.wpcf7-form[data-route-key="stagshens"][data-ktk-owned-enquiry="true"]';
export const enquiryGroupFormFitStyles='\n/* BEGIN Stagshens enquiry field containment */\n'+groupFormScope+' .wpcf7-form-control-wrap { display: block; max-width: 100%; min-width: 0; }\n'+groupFormScope+' .wpcf7-form-control:is(.wpcf7-text,.wpcf7-email,.wpcf7-textarea,.wpcf7-number,.wpcf7-date) { box-sizing: border-box; max-width: 100%; min-width: 0; }\n/* END Stagshens enquiry field containment */\n';
export const h01CompetitionFormStyles=legacyCompetitionFormStyles+enquiryGroupFormFitStyles;

export async function buildH01CompetitionFormStyles(file){
  const source=await readFile(file,'utf8'),originalSHA256='46fa696e314f789a757d4a6c748ae22089e7d3f88ecf18be06a32b09126199ab',sha=s=>createHash('sha256').update(s).digest('hex');
  const marked=source.includes('/* BEGIN H01 competition field fit */')||source.includes('/* END H01 competition field fit */');
  if(marked){if(source.split('/* BEGIN H01 competition field fit */').length!==2||source.split('/* END H01 competition field fit */').length!==2||!source.endsWith(h01CompetitionFormStyles)||sha(source.slice(0,-h01CompetitionFormStyles.length))!==originalSHA256)throw Error('H01 field-fit source drift');return;}
  if(sha(source)!==originalSHA256)throw Error('Exact unchanged shared stylesheet required for H01 field fit');
  await writeFile(file,source+h01CompetitionFormStyles);
}

// Original stylesheet builders require their shared block to be last. Prepare
// only our exact postlude before that pipeline, then append it after the final
// original builder. Any prior-CSS or postlude drift refuses before a write.
export async function prepareH01CompetitionFormBuild(file){
  const source=await readFile(file,'utf8'),originalSHA256='46fa696e314f789a757d4a6c748ae22089e7d3f88ecf18be06a32b09126199ab',sha=s=>createHash('sha256').update(s).digest('hex');
  if(sha(source)===originalSHA256)return;
  const postlude=source.endsWith(h01CompetitionFormStyles)?h01CompetitionFormStyles:source.endsWith(legacyCompetitionFormStyles)?legacyCompetitionFormStyles:null;
  if(source.split('/* BEGIN H01 competition field fit */').length!==2||source.split('/* END H01 competition field fit */').length!==2||!postlude)throw Error('Exact H01 field-fit postlude required before rebuild');
  const base=source.slice(0,-postlude.length);
  if(sha(base)!==originalSHA256)throw Error('Exact unchanged shared stylesheet required before H01 rebuild');
  await writeFile(file,base);
}

export async function loadH01BusinessLegalEditorial() {
  const originalBytes = await readFile(new URL('./content/h01-legal-originals.json', import.meta.url));
  if (createHash('sha256').update(originalBytes).digest('hex') !== '30a60720af443da815f2035b1e6f845568afc8331832bad17e2e94c512839f99') throw Error('Frozen H01 original text boundaries required');
  const originals = JSON.parse(originalBytes), keys = ['terms-and-conditions', 'privacy-policy', 'tour-service-disclaimer', 'post-welcome-to-alcohol'];
  if (originals.version !== '2026-11-24.h01-business-legal-1' || originals.source !== '6ac86777f48397e981a90cc7ed8667db6ab91675' || JSON.stringify(Object.keys(originals.pages)) !== JSON.stringify(keys)) throw Error('Reviewed H01 source identity required');
  const rows = [];
  for (const key of keys) rows.push({key, version: originals.version, original: originals.pages[key], markup: await readFile(new URL('./content/h01-' + key + '.html', import.meta.url), 'utf8')});
  return rows;
}

// The November-15 presentation catalogue remains the immutable base. This
// owner-confirmed successor updates its competition card in exactly three views.
export const h01CompetitionSummary = Object.freeze({
  version: '2026-11-24.h01-business-legal-1',
  keys: Object.freeze(['archive-author-thirsty', 'archive-category-uncategorized-page-5', 'blog']),
  original: 'Send your best night-out story to Krawl Through Krakow\'s active Big Prize Competition. See the confirmed prizes and entry form; there is no entry deadline currently set.',
  replacement: 'Enter Krawl Through Krakow\'s monthly story competition. The KTK team judges entries at month-end; the winner must use the prize in the following month. See prizes and entry details.'
});

export function reviseH01CompetitionSummary({key, revision, sourceReference = false}) {
  if (!['archive-author-thirsty', 'archive-category-uncategorized-page-5', 'blog'].includes(key)) return [];
  if (revision?.version !== '2026-11-24.h01-business-legal-1' || !revision.keys?.includes(key) || typeof revision.original !== 'string' || typeof revision.replacement !== 'string' || /[<>\r\n]/.test(revision.replacement)) throw Error('Confirmed monthly competition summary required');
  const clean = s => s.replace(/\s+/g, ' ').trim(), main = document.querySelector('#main-content');
  if (!main || document.querySelectorAll('#main-content').length !== 1) throw Error('Original competition summary container required');
  const nodes = [...main.querySelectorAll('p[data-ktk-reviewed-summary]')].filter(n => [revision.original, revision.replacement].includes(clean(n.textContent)));
  if (nodes.length !== 1 || nodes[0].children.length) throw Error('Single original text-only competition summary required');
  const node = nodes[0], marker = node.getAttribute('data-ktk-h01-summary');
  const card = node.closest('article');
  const destination = card && [...card.querySelectorAll('a[href]')].some(a => a.getAttribute('href') === '__KTK_HOME_URL__welcome-to-alcohol/' || sourceReference && a.getAttribute('href') === 'https://krawlthroughkrakow.com/welcome-to-alcohol/');
  if (node.getAttribute('data-ktk-reviewed-summary') !== '2026-11-14.article-presentation-2' || !destination) throw Error('Original competition card destination required');
  if (marker ? marker !== revision.version || clean(node.textContent) !== revision.replacement : clean(node.textContent) !== revision.original) throw Error('Original/reviewed competition summary changed');
  if (marker) return [];
  node.textContent = revision.replacement; node.setAttribute('data-ktk-h01-summary', revision.version);
  return [{type: 'h01-monthly-competition-summary', version: revision.version, summaries: 1}];
}

export function reviseH01BusinessLegalEditorial({key, revision, sourceReference = false}) {
  const counts = {'terms-and-conditions': 1, 'privacy-policy': 1, 'tour-service-disclaimer': 1, 'post-welcome-to-alcohol': 3};
  if (!Object.hasOwn(counts, key)) return [];
  if (revision?.key !== key || revision.version !== '2026-11-24.h01-business-legal-1' || !Array.isArray(revision.original) || revision.original.length !== counts[key] || typeof revision.markup !== 'string') throw Error('Reviewed H01 editorial identity required');
  const main = document.querySelector('#main-content');
  if (!main || document.querySelectorAll('#main-content').length !== 1) throw Error('Single original H01 page required');
  const template = document.createElement('template'); template.innerHTML = revision.markup;
  const parts = [...template.content.children];
  if (parts.length !== counts[key] || [...template.content.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()) || parts.some((p, i) => p.tagName !== 'TEMPLATE' || p.attributes.length !== 1 || p.getAttribute('data-h01-module') !== String(i))) throw Error('Complete ordered H01 text replacements required');
  const forbidden = 'form,input,textarea,select,button,img,picture,source,iframe,video,audio,script,style,svg,object,embed';
  const allowedTags = new Set(['P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'A', 'STRONG', 'EM', 'BR', 'SMALL', 'TIME', 'SPAN']);
  const allowedLinks = new Set(['mailto:pubthroughkrakow@gmail.com', '__KTK_HOME_URL__privacy-policy/', '__KTK_HOME_URL__welcome-to-alcohol/', '__KTK_HOME_URL__contact/', '__KTK_HOME_URL__tour-service-disclaimer/']);
  const plans = [];
  for (let i = 0; i < parts.length; i++) {
    const original = revision.original[i], selector = key === 'post-welcome-to-alcohol' ? '.et_pb_text_' + i + ' > .et_pb_text_inner' : '.et_pb_text_1 > .et_pb_text_inner';
    if (original.selector !== selector || typeof original.html !== 'string') throw Error('Exact H01 text-only selector required');
    const nodes = main.querySelectorAll(selector);
    if (nodes.length !== 1 || nodes[0].querySelector(forbidden)) throw Error('Original H01 text-only module required');
    const node = nodes[0], holder = document.createElement('div'); holder.innerHTML = parts[i].innerHTML.trim();
    const originalNode = document.createElement('div'); originalNode.innerHTML = original.html;
    const originalStyles = new Set([...originalNode.querySelectorAll('[style]')].map(n => n.getAttribute('style')));
    const originalAttrs = new Map();
    for (const n of originalNode.querySelectorAll('*')) for (const a of n.attributes) {
      if (!originalAttrs.has(a.name)) originalAttrs.set(a.name, new Set()); originalAttrs.get(a.name).add(a.value);
    }
    if (!holder.textContent.trim() || holder.querySelector(forbidden)) throw Error('H01 replacement must remain text only');
    for (const n of holder.querySelectorAll('*')) {
      if (!allowedTags.has(n.tagName)) throw Error('Unreviewed H01 replacement element');
      for (const a of n.attributes) {
        if (/^on/i.test(a.name)) throw Error('Active H01 replacement attribute refused');
        if (a.name === 'href' && n.tagName === 'A') {
          if (!allowedLinks.has(a.value) && ![...originalNode.querySelectorAll('a[href]')].some(old => old.getAttribute('href') === a.value)) throw Error('Unreviewed H01 link destination');
        } else if (a.name === 'style') {
          if (!originalStyles.has(a.value) || /url\s*\(|expression\s*\(|binding/i.test(a.value)) throw Error('Unreviewed H01 style');
        } else if (!originalAttrs.get(a.name)?.has(a.value)) throw Error('Unreviewed H01 replacement attribute');
      }
    }
    const markup = holder.innerHTML, marker = node.getAttribute('data-ktk-h01-review');
    const clean = s => s.replace(/\s+/g, ' ').trim(), headings = n => [...n.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => [h.tagName, clean(h.textContent)]);
    const links = n => [...n.querySelectorAll('a[href]')].map(a => [a.getAttribute('href').replace(/^https?:\/\/(?:www\.)?krawlthroughkrakow\.com\//, '__KTK_HOME_URL__'), clean(a.textContent)]);
    const sourceMatches = sourceReference ? clean(node.textContent) === clean(originalNode.textContent) && JSON.stringify(headings(node)) === JSON.stringify(headings(originalNode)) && JSON.stringify(links(node)) === JSON.stringify(links(originalNode)) : node.innerHTML === original.html;
    if (marker ? marker !== revision.version || node.innerHTML !== markup : !sourceMatches) throw Error('Original/reviewed H01 copy changed');
    plans.push({node, markup, reviewed: !!marker});
  }
  if (plans.some(p => p.reviewed) && !plans.every(p => p.reviewed)) throw Error('Partially applied H01 copy refused');
  if (plans.every(p => p.reviewed)) return [];
  const outside = () => {
    const copy = main.cloneNode(true);
    for (const row of revision.original) copy.querySelector(row.selector).replaceWith(document.createComment('H01 unchanged text boundary'));
    return copy.outerHTML;
  };
  const boundary = outside();
  // All source, markup and late-module guards pass before the first mutation.
  for (const plan of plans) {plan.node.innerHTML = plan.markup; plan.node.setAttribute('data-ktk-h01-review', revision.version);}
  if (outside() !== boundary) throw Error('H01 outside-text boundary changed');
  return [{type: 'h01-confirmed-business-legal-copy', version: revision.version, textModules: plans.length, complianceCertification: false}];
}
