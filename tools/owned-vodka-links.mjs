import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const sources = [
  ['post-2020-krakow-nightlife-guide', '426b51183b13cac4b0bf69933e6f9fd70cd3c0e8eea5fa6e0ae665de27faed84'],
  ['post-best-places-to-eat', '3880b2b2307fbbe83073c3076c82f4983a36b387d2d7d1146b59ecfb851769af'],
  ['post-krakow-hen-party-reviews', '8b3004f9bc9252e56bfdda5ec8bda9e2e932917cab645f5944cd218ca22026b5'],
  ['post-krakow-weather-guide', '6eda29f8487edab9fe2fd1c9277eb05a63495cf74c0178703014859fece81334']
];

export async function loadOwnedVodkaLinks() {
  const rows = [];
  for (const [key, sourceSha256] of sources) {
    const sourceHtml = await readFile(new URL('../docs/code-pages/full-migration/captures/' + key + '/production-1920.html', import.meta.url), 'utf8');
    if (createHash('sha256').update(sourceHtml).digest('hex') !== sourceSha256) throw Error('Original vodka-link capture changed');
    rows.push({key, sourceSha256, sourceHtml});
  }
  return rows;
}

export function reviseOwnedVodkaLinks({key, revision}) {
  const definitions = {
    'post-2020-krakow-nightlife-guide': {sha: '426b51183b13cac4b0bf69933e6f9fd70cd3c0e8eea5fa6e0ae665de27faed84', labels: ['joining the vodka tour'], from: 'https://krawlthroughkrakow.com/project/vodka-tasting-tour/'},
    'post-best-places-to-eat': {sha: '3880b2b2307fbbe83073c3076c82f4983a36b387d2d7d1146b59ecfb851769af', labels: ['the Polish vodka', 'Polish vodka'], from: 'https://krawlthroughkrakow.com/project/vodka-tasting-tour/'},
    'post-krakow-hen-party-reviews': {sha: '8b3004f9bc9252e56bfdda5ec8bda9e2e932917cab645f5944cd218ca22026b5', labels: ['vodka tasting experience'], from: 'https://krawlthroughkrakow.com/krakow-activities'},
    'post-krakow-weather-guide': {sha: '6eda29f8487edab9fe2fd1c9277eb05a63495cf74c0178703014859fece81334', labels: ['vodka tasting group'], from: 'https://tastevodka.pl/'}
  };
  if (!Object.hasOwn(definitions, key)) return [];
  const conf = definitions[key];
  if (revision?.key !== key || revision.sourceSha256 !== conf.sha || typeof revision.sourceHtml !== 'string') throw Error('Original vodka-link identity required');
  const source = new DOMParser().parseFromString(revision.sourceHtml, 'text/html').querySelector('#main-content');
  const main = document.querySelector('#main-content');
  if (!source || !main || document.querySelectorAll('#main-content').length !== 1) throw Error('One original vodka-link body required');
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const destination = '__KTK_HOME_URL__store2/polish-vodka-tasting-44/#book';
  const prepared = key === 'post-krakow-weather-guide' ? conf.from : '__KTK_HOME_URL__other-tours/';
  const allowed = new Set([conf.from, conf.from.replace('https://krawlthroughkrakow.com/', '__KTK_HOME_URL__'), prepared, destination]);
  const plans = conf.labels.map(label => {
    const find = root => [...root.querySelectorAll('a[href]')].filter(a => clean(a.textContent) === label && !a.querySelector('img'));
    const old = find(source), current = find(main);
    if (old.length !== 1 || current.length !== 1 || old[0].getAttribute('href') !== conf.from || old[0].innerHTML !== current[0].innerHTML || !allowed.has(current[0].getAttribute('href'))) throw Error('Exact original vodka service anchor required: ' + label);
    return current[0];
  });
  // Validate every anchor first so a later mismatch cannot partially change a page.
  const changed = plans.filter(a => a.getAttribute('href') !== destination);
  for (const anchor of changed) anchor.setAttribute('href', destination);
  return changed.map(a => ({type: 'owned-vodka-product-link', key, label: clean(a.textContent), productId: 44}));
}
