import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadOfferFacts, offerTemplateValues} from './site-offer-facts.mjs';

export function validateSiteOperatorFacts(data) {
  const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === keys.split(',').sort().join('|');
  if (!exact(data, 'schemaVersion,reviewedOn,legalName,krs,nip,regonFromKrs,registeredOn,registeredOffice,publicRegisterUrl,evidence') || data.schemaVersion !== 1 || data.reviewedOn !== '2026-11-15' || data.legalName !== 'KRAKTIVITY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ' || data.krs !== '0001084157' || data.nip !== '6762661275' || data.regonFromKrs !== '52758053500000' || data.registeredOn !== '2024-01-26' || data.publicRegisterUrl !== 'https://rejestr.io/krs/1084157/kraktivity') throw Error('Reviewed KTK operator identity required');
  const a = data.registeredOffice, e = data.evidence;
  if (!exact(a, 'street,postalCode,city,country') || a.street !== 'ul. Cegielniana 4A/27' || a.postalCode !== '30-404' || a.city !== 'Kraków' || a.country !== 'Poland') throw Error('Exact registered office required; do not replace the meeting point');
  if (!exact(e, 'ownerConfirmation,officialUrl,checkedAt,httpStatus,responseSha256,recordStateOn,lastEntryOn') || e.ownerConfirmation !== 'Owner supplied this company\'s registry entry for the KTK operator-identity review on 15 November 2026.' || e.officialUrl !== 'https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/0001084157?rejestr=P&format=json' || e.checkedAt !== '2026-11-15T08:59:51.108318+00:00' || e.httpStatus !== 200 || e.responseSha256 !== '22a0e6b738a1b7a3e44cafc45f7cc541c6b879d637f028d63dc2a3286ef697c6' || e.recordStateOn !== '2025-12-03' || e.lastEntryOn !== '2025-05-12') throw Error('Owner and official KRS evidence required');
  const digits = [...data.nip].map(Number), checksum = [6, 5, 7, 2, 3, 4, 5, 6, 7].reduce((sum, w, i) => sum + w * digits[i], 0) % 11;
  if (checksum !== digits[9] || JSON.stringify(data).includes('@')) throw Error('Public business fields only');
  return data;
}

export async function loadSiteOperatorFacts({file = new URL('./site-operator-facts.json', import.meta.url)} = {}) {return validateSiteOperatorFacts(JSON.parse(await readFile(file, 'utf8')));}

export async function loadOperatorTrustEditorial() {
  const facts = await loadSiteOperatorFacts(), offers = await loadOfferFacts(), values = offerTemplateValues(offers), office = facts.registeredOffice;
  const sources = {
    'about-us': '6e4b9608d8b811e49086800a04f1d72b282d67c4670a13210ba09cf00995c8a6',
    contact: 'c0f6e6e1025cff0ac10331bc3a81568e13822f082093d1af825ccde71b1c2903',
    'terms-and-conditions': '9590fa5379aa298b2be887690e0daeb7a793e55eb2861ba7bbfd8eedf65c8eb8',
    'privacy-policy': '830b9e58a7df67ebb09fc97583c6ea0b9704315bfe64ef90cf368afa7655461d',
    'tour-service-disclaimer': 'b129cdd50231008968eb882142e783274f3763c20fa892839a7e54a36575dbe7',
    testimonials: '1f229391a4f6936d57402dcc491ccf60e262f2d94f1bb5adf573f251bbfc376a'
  };
  const platforms = JSON.parse(execFileSync('php', ['-r', "define('ABSPATH', '.');require $argv[1];echo json_encode(array_map(fn($r)=>array('name'=>$r['name'],'url'=>$r['url']),ktk_homepage_review_sources()));", 'staging/wp-content/mu-plugins/ktk-homepage-assets/reviews.php'], {encoding: 'utf8'}));
  if (JSON.stringify(platforms.map(p => p.name)) !== JSON.stringify(['Google', 'Tripadvisor', 'GetYourGuide'])) throw Error('Three existing review sources required');
  for (const [i, p] of platforms.entries()) {const u = new URL(p.url); if (u.protocol !== 'https:' || u.username || u.password || u.hash || /utm_|gclid|gbraid|wbraid/i.test(p.url) || ![['www.google.com', 'b4d3277c5ab6ea20'], ['www.tripadvisor.com', 'd2725527'], ['www.getyourguide.com', 't443425']][i].every((v, j) => j ? p.url.includes(v) : u.hostname === v)) throw Error('Reviewed platform identity changed');}
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[ch])), expand = (markup, map) => {
    const result = markup.replace(/\{\{([A-Za-z]+)\}\}/g, (_, name) => {if (!Object.hasOwn(map, name)) throw Error('Unknown operator/trust fact: ' + name); return escape(map[name]);});
    if (/[{}]/.test(result)) throw Error('Unresolved operator/trust facts'); return result;
  };
  const operatorValues = {legalName: facts.legalName, registeredOffice: office.street + ', ' + office.postalCode + ' ' + office.city + ', ' + office.country, krs: facts.krs, nip: facts.nip, publicRegisterUrl: facts.publicRegisterUrl};
  const operatorMarkup = expand(await readFile(new URL('./content/operator-identity.html', import.meta.url), 'utf8'), operatorValues);
  const aboutMarkup = expand(await readFile(new URL('./content/about-operator-trust.html', import.meta.url), 'utf8'), {...values, brandSince: String(offers.operator.since)});
  const reviewMarkup = expand(await readFile(new URL('./content/testimonial-platform-links.html', import.meta.url), 'utf8'), Object.fromEntries(platforms.map(p => [p.name, p.url])));
  const disclaimerMarkup = expand(await readFile(new URL('./content/disclaimer-current-booking.html', import.meta.url), 'utf8'), {minimumAge: values.minimumAge});
  const rows = [];
  for (const [key, sourceSha256] of Object.entries(sources)) {
    const sourceHtml = await readFile(new URL('../docs/code-pages/full-migration/captures/' + key + '/production-1920.html', import.meta.url), 'utf8');
    if (createHash('sha256').update(sourceHtml).digest('hex') !== sourceSha256) throw Error('Original operator/trust capture changed: ' + key);
    rows.push({key, sourceSha256, sourceHtml, version: '2026-11-15.operator-trust-1', reviewedOn: '2026-11-15', operatorValues, operatorMarkup, platforms, ...(key === 'about-us' ? {copyMarkup: aboutMarkup} : key === 'testimonials' ? {reviewMarkup} : key === 'tour-service-disclaimer' ? {copyMarkup: disclaimerMarkup} : {})});
  }
  return rows;
}

export function reviseOperatorTrustEditorial({key, revision}) {
  const identities = {'about-us': '6e4b9608d8b811e49086800a04f1d72b282d67c4670a13210ba09cf00995c8a6', contact: 'c0f6e6e1025cff0ac10331bc3a81568e13822f082093d1af825ccde71b1c2903', 'terms-and-conditions': '9590fa5379aa298b2be887690e0daeb7a793e55eb2861ba7bbfd8eedf65c8eb8', 'privacy-policy': '830b9e58a7df67ebb09fc97583c6ea0b9704315bfe64ef90cf368afa7655461d', 'tour-service-disclaimer': 'b129cdd50231008968eb882142e783274f3763c20fa892839a7e54a36575dbe7', testimonials: '1f229391a4f6936d57402dcc491ccf60e262f2d94f1bb5adf573f251bbfc376a'};
  if (!Object.hasOwn(identities, key)) return [];
  if (revision?.key !== key || revision.sourceSha256 !== identities[key] || revision.version !== '2026-11-15.operator-trust-1' || revision.reviewedOn !== '2026-11-15' || typeof revision.sourceHtml !== 'string') throw Error('Reviewed operator/trust identity required');
  const source = new DOMParser().parseFromString(revision.sourceHtml, 'text/html'), main = document.querySelector('#main-content'), original = source.querySelector('#main-content'), clean = s => (s || '').replace(/\s+/g, ' ').trim(), plans = [], states = [];
  if (!main || !original) throw Error('Original operator/trust main required');
  const parseSection = (html, type) => {
    if (typeof html !== 'string') throw Error('Reviewed trust section required');
    const d = new DOMParser().parseFromString(html, 'text/html'), nodes = [...d.head.children, ...d.body.children];
    if (nodes.length !== 1 || nodes[0].tagName !== 'SECTION' || [...d.body.childNodes].some(n => n.nodeType === 3 && clean(n.textContent))) throw Error('One trust section required');
    const n = nodes[0], attr = type === 'operator' ? 'data-ktk-operator-details' : 'data-ktk-review-platform-links', id = type === 'operator' ? 'ktk-operator-title' : 'ktk-review-platform-title';
    if (n.attributes.length !== 2 || n.getAttribute(attr) !== revision.version || n.getAttribute('aria-labelledby') !== id || n.querySelectorAll('h2').length !== 1 || n.querySelector('h2').id !== id || !clean(n.textContent)) throw Error('Exact trust section identity required');
    for (const child of n.querySelectorAll('*')) if (!['H2', 'P', 'DL', 'DT', 'DD', 'UL', 'LI', 'A', 'STRONG'].includes(child.tagName) || [...child.attributes].some(a => child.tagName === 'H2' ? a.name !== 'id' || a.value !== id : child.tagName === 'A' ? a.name !== 'href' : true)) throw Error('Unreviewed trust element or attribute');
    return n;
  };
  if (key === 'testimonials') {
    const selector = '.et_pb_code_1 .et_pb_code_inner', a = original.querySelectorAll(selector), b = main.querySelectorAll(selector), section = parseSection(revision.reviewMarkup, 'reviews');
    if (a.length !== 1 || b.length !== 1 || clean(a[0].textContent) !== '[wptripadvisor_usetemplate tid="1"]' || a[0].children.length || b[0].querySelector('iframe,script,style,form,img')) throw Error('Original shortcode-only review slot required');
    const links = [...section.querySelectorAll('a')];
    if (!Array.isArray(revision.platforms) || JSON.stringify(revision.platforms.map(p => p.name)) !== JSON.stringify(['Google', 'Tripadvisor', 'GetYourGuide']) || links.length !== 3 || links.some((a, i) => a.getAttribute('href') !== revision.platforms[i].url || !a.textContent.includes(revision.platforms[i].name)) || /\d+\s*(?:reviews|stars)/i.test(section.textContent)) throw Error('Original three platform destinations required; no invented totals');
    for (const [i, p] of revision.platforms.entries()) {const u = new URL(p.url), expected = [['www.google.com', 'b4d3277c5ab6ea20'], ['www.tripadvisor.com', 'd2725527'], ['www.getyourguide.com', 't443425']][i]; if (u.protocol !== 'https:' || u.hostname !== expected[0] || !p.url.includes(expected[1]) || u.username || u.password || u.hash || /utm_|gclid|gbraid|wbraid/i.test(p.url)) throw Error('Changed review-platform identity');}
    const marker = b[0].querySelector('[data-ktk-review-platform-links]');
    if (marker) {if (b[0].children.length !== 1 || b[0].innerHTML.trim() !== section.outerHTML) throw Error('Reviewed platform fallback changed'); return [];}
    if (b[0].innerHTML.trim() !== a[0].innerHTML.trim() || main.querySelector('#ktk-review-platform-title')) throw Error('Original shortcode slot changed');
    b[0].innerHTML = section.outerHTML; return [{type: 'native-review-platform-fallback', reviewedOn: revision.reviewedOn}];
  }
  const section = parseSection(revision.operatorMarkup, 'operator'), v = revision.operatorValues, links = [...section.querySelectorAll('a')];
  if (!v || v.legalName !== 'KRAKTIVITY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ' || v.krs !== '0001084157' || v.nip !== '6762661275' || v.registeredOffice !== 'ul. Cegielniana 4A/27, 30-404 Kraków, Poland' || v.publicRegisterUrl !== 'https://rejestr.io/krs/1084157/kraktivity' || section.querySelector('strong')?.textContent !== v.legalName || JSON.stringify([...section.querySelectorAll('dd')].map(n => n.textContent)) !== JSON.stringify([v.registeredOffice, v.krs, v.nip]) || links.length !== 2 || links[0].getAttribute('href') !== v.publicRegisterUrl || links[1].getAttribute('href') !== '__KTK_HOME_URL__meeting-point/' || section.textContent.includes('@')) throw Error('Exact public operator facts/meeting distinction required');
  const anchorSelector = ['about-us', 'contact'].includes(key) ? '.et_pb_text_2' : '.et_pb_text_1', direction = ['about-us', 'contact'].includes(key) ? 'afterend' : 'beforebegin', a = original.querySelectorAll(anchorSelector), b = main.querySelectorAll(anchorSelector), existing = main.querySelectorAll('[data-ktk-operator-details]');
  if (a.length !== 1 || b.length !== 1 || a[0].tagName !== b[0].tagName || clean(a[0].className) !== clean(b[0].className) || b[0].querySelector('form,input,select,textarea,iframe,img,script,style') || existing.length > 1) throw Error('Original text-only operator insertion anchor required');
  const anchor = b[0], done = existing.length === 1;
  if (done ? existing[0].outerHTML !== section.outerHTML || (direction === 'afterend' ? existing[0].previousElementSibling !== anchor : existing[0].nextElementSibling !== anchor) || main.querySelectorAll('#ktk-operator-title').length !== 1 : main.querySelector('#ktk-operator-title')) throw Error('Operator section position/identity changed');
  states.push(done); if (!done) plans.push({apply: () => anchor.insertAdjacentElement(direction, section), type: 'public-operator-identity', selector: anchorSelector});
  const normalized = node => {const copy = node.cloneNode(true); for (const link of copy.querySelectorAll('a[href]')) {let href = link.getAttribute('href').replace(/^https?:\/\/(?:www\.)?krawlthroughkrakow\.com\//, '__KTK_HOME_URL__'); if (href === '__KTK_HOME_URL__how-to-join/') href = '__KTK_HOME_URL__about-us/how-to-join/'; if (href === 'https://fareharbor.com/embeds/book/krawlthroughkrakow/items/calendar/?full-items=yes&flow=660691') href = '__KTK_HOME_URL__store2/'; link.setAttribute('href', href);} return copy.innerHTML.trim();};
  if (key === 'privacy-policy') {
    const find = root => [...root.querySelectorAll('.et_pb_text_1 .et_pb_text_inner p')].filter(p => clean(p.querySelector('strong')?.textContent) === 'SERVICE'), old = find(original), current = find(main), bad = 'krawlthoughkrakow.com', correct = 'krawlthroughkrakow.com';
    if (old.length !== 1 || current.length !== 1 || old[0].textContent.split(bad).length !== 2) throw Error('Original service-domain definition required');
    const p = current[0], marker = p.getAttribute('data-ktk-operator-domain-review'), reviewed = !!marker, expected = normalized(old[0]);
    if (reviewed ? marker !== revision.version || normalized(p) !== expected.replace(bad, correct) : normalized(p) !== expected) throw Error('Original/reviewed privacy service domain changed');
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), hits = []; let n; while ((n = walker.nextNode())) if (n.textContent.includes(bad)) hits.push(n);
    if (!reviewed && hits.length !== 1 || reviewed && hits.length) throw Error('Exact single service-domain text required');
    states.push(reviewed); if (!reviewed) plans.push({apply: () => {hits[0].textContent = hits[0].textContent.replace(bad, correct); p.dataset.ktkOperatorDomainReview = revision.version;}, type: 'correct-owned-service-domain', selector: '.et_pb_text_1 .et_pb_text_inner SERVICE definition'});
  }
  if (key === 'about-us' || key === 'tour-service-disclaimer') {
    if (typeof revision.copyMarkup !== 'string') throw Error('Reviewed trust copy templates required');
    const d = new DOMParser().parseFromString(revision.copyMarkup, 'text/html'), parts = [...d.querySelectorAll('template')], selectors = key === 'about-us' ? ['.et_pb_text_2 .et_pb_text_inner', '.et_pb_text_4 .et_pb_text_inner > :is(h3,h5)', '.et_pb_text_5 .et_pb_text_inner', '.et_pb_text_12 .et_pb_text_inner > p:nth-of-type(2)'] : ['.et_pb_text_4 .et_pb_text_inner', 'id-guidance'];
    if (parts.length !== selectors.length || new Set(parts.map(p => p.dataset.target)).size !== parts.length || clean(d.body.textContent) || [...d.head.children, ...d.body.children].some(n => n.tagName !== 'TEMPLATE')) throw Error('Complete exact trust copy templates required');
    for (const part of parts) {
      const selector = part.dataset.target;
      if (part.attributes.length !== 1 || !selectors.includes(selector) || !clean(part.content.textContent)) throw Error('Reviewed trust target required');
      for (const n of part.content.querySelectorAll('*')) if (!['P', 'A'].includes(n.tagName) || [...n.attributes].some(a => n.tagName !== 'A' || a.name !== 'href') || n.tagName === 'A' && (!['__KTK_HOME_URL__about-us/how-to-join/', '__KTK_HOME_URL__store2/pub-crawl-28/#book'].includes(n.getAttribute('href')) || !clean(n.textContent))) throw Error('Plain reviewed trust copy/links required');
      if (selector === 'id-guidance') {
        const oldText = 'Customer must be at least 18 years old and have valid identification in order to participate in this event.', text = clean(part.content.textContent), roots = main.querySelectorAll('.et_pb_text_1 .et_pb_text_inner');
        if (part.content.children.length || text !== 'Customers must be at least 18 years old. Bringing valid identification is recommended for this event.' || roots.length !== 1) throw Error('Confirmed18+/recommended-ID wording required');
        const walker = document.createTreeWalker(roots[0], NodeFilter.SHOW_TEXT), nodes = []; let n; while ((n = walker.nextNode())) if (n.textContent.includes(oldText) || n.textContent.includes(text)) nodes.push(n);
        if (nodes.length !== 1 || nodes[0].parentElement.tagName !== 'P') throw Error('Original first disclaimer sentence required');
        const node = nodes[0], marker = node.parentElement.getAttribute('data-ktk-id-guidance-review'), reviewed = !!marker;
        if (reviewed ? marker !== revision.version || !node.textContent.includes(text) || node.textContent.includes(oldText) : !node.textContent.includes(oldText)) throw Error('Original/reviewed participation sentence changed');
        states.push(reviewed); if (!reviewed) plans.push({apply: () => {node.textContent = node.textContent.replace(oldText, text); node.parentElement.dataset.ktkIdGuidanceReview = revision.version;}, type: 'confirmed-participation-id-guidance', selector});
        continue;
      }
      const old = original.querySelectorAll(selector), current = main.querySelectorAll(selector);
      if (old.length !== 1 || current.length !== 1 || current[0].querySelector('img,svg,iframe,script,style,form,input,textarea,button,select,[id]')) throw Error('Original text-only trust module required');
      const target = current[0], markup = part.innerHTML.trim(), marker = target.getAttribute('data-ktk-operator-copy'), reviewed = !!marker;
      if (['P', 'H3', 'H5'].includes(target.tagName) && part.content.children.length) throw Error('Plain trust heading/paragraph text required');
      if (reviewed ? marker !== revision.version || target.innerHTML !== markup : normalized(target) !== normalized(old[0])) throw Error('Original/reviewed trust copy changed');
      states.push(reviewed); if (!reviewed) plans.push({apply: () => {target.innerHTML = markup; target.dataset.ktkOperatorCopy = revision.version;}, type: 'reviewed-trust-copy', selector});
    }
  }
  if (states.some(Boolean) && !states.every(Boolean)) throw Error('Partially reviewed operator/trust state');
  // Every source, fact, template and late disclaimer guard has passed before the first edit.
  for (const plan of plans) plan.apply();
  return plans.map(({type, selector}) => ({type, selector, reviewedOn: revision.reviewedOn}));
}

const all = 'body.ktk-code-page #main-content :is([data-ktk-operator-details="2026-11-15.operator-trust-1"],[data-ktk-review-platform-links="2026-11-15.operator-trust-1"])', copy = 'body.ktk-code-page #main-content [data-ktk-operator-copy="2026-11-15.operator-trust-1"]:not(h3):not(h5)';
const styles = '/* BEGIN Operator identity and trust */\n' + all + ' { font-size: 16px; line-height: 1.65; text-align: left; margin: 24px 0; }\n' + all + ' h2 { font-family: inherit; font-size: 22px; font-weight: 700; line-height: 1.35; margin: 0 0 12px; }\n' + all + ' p { font-size: 16px; line-height: 1.65; }\n' + all + ' dl { margin: 12px 0; }\n' + all + ' dt { font-weight: 700; }\n' + all + ' dd { margin: 0 0 10px; overflow-wrap: anywhere; }\n' + all + ' a { color: inherit; text-decoration: underline; text-underline-offset: .15em; }\n' + all + ' a:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\nbody.ktk-code-page #main-content [data-ktk-review-platform-links="2026-11-15.operator-trust-1"] li a { display: inline-block; min-height: 44px; padding: 8px 0; box-sizing: border-box; }\n' + copy + ', ' + copy + ' p { font-size: 16px; line-height: 1.65; text-align: left !important; }\n@media (max-width: 600px) {\n  ' + all + ', ' + copy + ' { padding-right: 24px; box-sizing: border-box; }\n}\n/* END Operator identity and trust */\n';
export async function buildOperatorTrustStyles(file) {
  const css = await readFile(file, 'utf8'), anchor = '/* END Group enquiry overview */\n';
  if (css.split(anchor).length !== 2) throw Error('Stable group-overview style boundary required');
  if (css.includes('/* BEGIN Operator identity and trust */') || css.includes('/* END Operator identity and trust */')) {if (css.split('/* BEGIN Operator identity and trust */').length !== 2 || css.split('/* END Operator identity and trust */').length !== 2 || !css.includes(anchor + styles)) throw Error('Operator/trust stylesheet drift'); return;}
  await writeFile(file, css.replace(anchor, anchor + styles));
}
