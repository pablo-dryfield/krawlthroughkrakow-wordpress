import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, access, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {buildPageIntegrations} from './code-pages-integrations.mjs';
import {rewriteBookingLinks} from './booking-destinations.mjs';
import {reviseCodePageContent} from './code-pages-content-revisions.mjs';
import {codePageDescription, seoMetadata, validateSeoRoutes} from './code-pages-seo.mjs';
import {preserveHeadingCss,reviseSemanticHeadings} from './semantic-headings.mjs';
import {canonicalLinkPolicy,rewriteCanonicalLinks} from './canonical-links.mjs';
import {buildCodePageSchema,codePageSchemaFacts} from './code-pages-schema.mjs';
import {reviseAccessibilitySemantics} from './accessibility-semantics.mjs';
import {buildContentAccessibilityStyles} from './content-accessibility-styles.mjs';
import {loadReviewedImageDescriptions} from './content-image-descriptions.mjs';
import {reviseContextualLinks} from './contextual-links.mjs';
import {loadNightlifeEditorial,reviseNightlifeEditorial} from './nightlife-editorial.mjs';
import {loadBudgetEditorial,reviseBudgetEditorial} from './budget-editorial.mjs';
import {loadJazzEditorial,reviseJazzEditorial} from './jazz-editorial.mjs';
import {loadMusicEditorial,reviseMusicEditorial} from './music-editorial.mjs';
import {loadVenueEditorial,reviseVenueEditorial} from './venue-editorial.mjs';
import {loadMemorialEditorial,reviseMemorialEditorial,buildMemorialStyles} from './memorial-editorial.mjs';
import {loadContactDetails,reviseContactDetails,buildContactDetailsStyles} from './contact-details-editorial.mjs';
import {loadEstablishedNyeEditorial,reviseEstablishedNyeEditorial,buildEstablishedNyeStyles} from './established-nye-editorial.mjs';
import {loadGroupPlanningEditorial,reviseGroupPlanningEditorial,buildGroupPlanningStyles} from './group-planning-editorial.mjs';
import {loadGroupActivitiesEditorial,reviseGroupActivitiesEditorial,buildGroupActivityStyles} from './group-activities-editorial.mjs';
import {loadStagCostumeEditorial,reviseStagCostumeEditorial,buildStagCostumeStyles} from './stag-costume-editorial.mjs';
import {loadPracticalGuidesEditorial,revisePracticalGuidesEditorial,buildPracticalGuideStyles} from './practical-guides-editorial.mjs';
import {loadNightOutEditorial,reviseNightOutEditorial,buildNightOutStyles} from './night-out-editorial.mjs';
import {loadReviewedArticlePresentation,reviseReviewedArticlePresentation,buildReviewedArticlePresentationStyles} from './reviewed-article-presentation.mjs';
import {loadSafetyGuidesEditorial,reviseSafetyGuidesEditorial,buildSafetyGuidesStyles} from './safety-guides-editorial.mjs';
import {loadPartyGuideEditorial,revisePartyGuideEditorial,buildPartyGuideStyles} from './party-guide-editorial.mjs';
import {loadGamesResourceEditorial,reviseGamesResourceEditorial,buildGamesResourceStyles} from './games-resource-editorial.mjs';
import {loadBudgetTravelEditorial,reviseBudgetTravelEditorial,buildBudgetTravelStyles} from './budget-travel-editorial.mjs';
import {loadCityTripEditorial,reviseCityTripEditorial,buildCityTripStyles} from './city-trip-editorial.mjs';
import {loadKartingGuidesEditorial,reviseKartingGuidesEditorial,buildKartingGuideStyles} from './karting-guides-editorial.mjs';
import {loadOwnedVodkaLinks,reviseOwnedVodkaLinks} from './owned-vodka-links.mjs';
import {loadWeatherWinterEditorial,reviseWeatherWinterEditorial,reviseWeatherFeaturedDescription,buildWeatherWinterStyles} from './weather-winter-editorial.mjs';
import {loadFoodGuideEditorial,reviseFoodGuideEditorial,reviseFoodFeaturedDescriptions,buildFoodGuideStyles} from './food-guide-editorial.mjs';
import {loadNightlifeChoiceEditorial,reviseNightlifeChoiceEditorial,reviseNightlifeChoiceFeatures,buildNightlifeChoiceStyles} from './nightlife-choice-editorial.mjs';
import {loadGroupChoiceEditorial,reviseGroupChoiceEditorial,reviseGroupChoiceFeatures,buildGroupChoiceStyles} from './group-choice-editorial.mjs';
import {loadActivityBookingEditorial,reviseActivityBookingEditorial,reviseActivityBookingFeatures,buildActivityBookingStyles} from './activity-booking-editorial.mjs';
import {loadCompetitionNewsletterEditorial,reviseCompetitionNewsletterEditorial,buildCompetitionNewsletterStyles} from './competition-newsletter-editorial.mjs';
import {codePageTitle,codePageHeadDescription,loadSharingImagePolicy,buildCodePageSharing} from './code-page-sharing.mjs';
import {loadOfferPageRevisions,reviseOfferPages} from './offer-pages-editorial.mjs';
import {loadOfferFacts,campaignTemplateValues} from './site-offer-facts.mjs';
import {buildEventPromotionRuntime} from './event-promotion-runtime.mjs';
import {prepareNyePromotion} from './nye-promotion.mjs';
import {buildNyePromotionStyles} from './nye-promotion-styles.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve('.');
const assets = path.join(root, 'staging/wp-content/mu-plugins/ktk-code-pages-assets');
await buildMemorialStyles(path.join(assets,'runtime.css'));
await buildContactDetailsStyles(path.join(assets,'runtime.css'));
await buildEstablishedNyeStyles(path.join(assets,'runtime.css'));
await buildGroupPlanningStyles(path.join(assets,'runtime.css'));
await buildGroupActivityStyles(path.join(assets,'runtime.css'));
await buildStagCostumeStyles(path.join(assets,'runtime.css'));
await buildPracticalGuideStyles(path.join(assets,'runtime.css'));
await buildNightOutStyles(path.join(assets,'runtime.css'));
await buildReviewedArticlePresentationStyles(path.join(assets,'runtime.css'));
await buildSafetyGuidesStyles(path.join(assets,'runtime.css'));
await buildPartyGuideStyles(path.join(assets,'runtime.css'));
await buildGamesResourceStyles(path.join(assets,'runtime.css'));
await buildBudgetTravelStyles(path.join(assets,'runtime.css'));
await buildCityTripStyles(path.join(assets,'runtime.css'));
await buildKartingGuideStyles(path.join(assets,'runtime.css'));
await buildWeatherWinterStyles(path.join(assets,'runtime.css'));
await buildFoodGuideStyles(path.join(assets,'runtime.css'));
await buildNightlifeChoiceStyles(path.join(assets,'runtime.css'));
await buildGroupChoiceStyles(path.join(assets,'runtime.css'));
await buildActivityBookingStyles(path.join(assets,'runtime.css'));
await buildCompetitionNewsletterStyles(path.join(assets,'runtime.css'));
await buildEventPromotionRuntime(path.join(assets,'runtime.js'));
await buildContentAccessibilityStyles(path.join(assets,'runtime.css'));
await buildNyePromotionStyles(path.join(assets,'runtime.css'));
const manifestPath = 'docs/code-pages/full-migration/manifest.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const imageDescriptions=await loadReviewedImageDescriptions();
const sharingImage=await loadSharingImagePolicy({expectedManifestSha256:imageDescriptions.assetManifestSha256});
const nightlifeRevision=await loadNightlifeEditorial();
const budgetRevision=await loadBudgetEditorial();
const jazzRevision=await loadJazzEditorial();
const musicRevisions=await loadMusicEditorial();
const venueRevisions=await loadVenueEditorial();
const memorialRevision=await loadMemorialEditorial();
const offerPageRevisions=await loadOfferPageRevisions();
const contactDetails=await loadContactDetails();
const establishedNye=await loadEstablishedNyeEditorial();
const groupPlanning=await loadGroupPlanningEditorial();
const groupActivities=await loadGroupActivitiesEditorial();
const stagCostume=await loadStagCostumeEditorial();
const practicalGuides=await loadPracticalGuidesEditorial();
const nightOutGuides=await loadNightOutEditorial();
const articlePresentations=await loadReviewedArticlePresentation();
const safetyGuides=await loadSafetyGuidesEditorial();
const partyGuides=await loadPartyGuideEditorial();
const gamesGuides=await loadGamesResourceEditorial();
const budgetTravelGuides=await loadBudgetTravelEditorial();
const cityTripGuides=await loadCityTripEditorial();
const kartingGuides=await loadKartingGuidesEditorial();
const ownedVodkaLinks=await loadOwnedVodkaLinks();
const weatherWinterGuides=await loadWeatherWinterEditorial();
const foodGuides=await loadFoodGuideEditorial();
const nightlifeChoices=await loadNightlifeChoiceEditorial();
const groupChoices=await loadGroupChoiceEditorial();
const activityBookings=await loadActivityBookingEditorial();
const competitionNewsletter=await loadCompetitionNewsletterEditorial();
const campaignFacts=campaignTemplateValues(await loadOfferFacts());
validateSeoRoutes(manifest.routes.map(row => row.route));
const reviewCounts=JSON.parse(execFileSync('php',['-r',"define('ABSPATH', __DIR__); require $argv[1]; echo json_encode(array_column(ktk_homepage_review_sources(), 'count', 'name'));",path.join(root,'staging/wp-content/mu-plugins/ktk-homepage-assets/reviews.php')],{encoding:'utf8'}));
const seoBaseline=JSON.parse(await readFile('docs/code-pages/production-readiness/production-seo-baseline.json','utf8'));
if(seoBaseline.errors.length||seoBaseline.routes.length!==manifest.routes.length)throw new Error('Complete read-only production SEO baseline required');
const productionSeo=new Map(seoBaseline.routes.map(row=>[row.key,row]));
const partial = process.argv.includes('--partial');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const php = value => `'${String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
for (const directory of ['media', 'content', 'shells', 'styles', 'pages']) await mkdir(path.join(assets, directory), { recursive: true });
await buildPageIntegrations(path.join(root,'staging/wp-content/mu-plugins/ktk-homepage-assets'),assets);
const existing = new Map();
for (const [file, base] of [['docs/homepage-parity/parity-build.json', 'staging/wp-content/mu-plugins/ktk-homepage-assets'], ['docs/code-pages/how-to-join/build.json', 'staging/wp-content/mu-plugins/ktk-code-pages-assets']]) {
  const data = JSON.parse(await readFile(file, 'utf8'));
  for (const [url, item] of Object.entries(data.files || data.assets || {})) existing.set(url, path.join(base, item.file));
}
try { const prior = JSON.parse(await readFile('docs/code-pages/full-migration/assets.json', 'utf8')); for (const [url, item] of Object.entries(prior)) existing.set(url, path.join(assets, item.file)); } catch {}
const files = new Map();
const reviewedHosts = new Set(['krawlthroughkrakow.com', 'www.krawlthroughkrakow.com', 'fonts.gstatic.com', 'secure.gravatar.com', 'www.gravatar.com', 'i0.wp.com', 'i1.wp.com', 'i2.wp.com', 'cdn.iubenda.com', 'app.contentatscale.ai', 'ec-icons.shopsettings.com', 'd34ikvsdm2rlij.cloudfront.net', 'assets.editorial.aetnd.com', 's.inyourpocket.com', 'i.ytimg.com']);
async function localize(value, base) {
  value = value?.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&').replace(/^["']|["']$/g, '');
  if (!value || /^(data:|blob:|#)/i.test(value)) return value;
  const url = new URL(value, base); url.hash = '';
  if (!reviewedHosts.has(url.hostname) || !['https:', 'http:'].includes(url.protocol)) throw new Error(`Unreviewed asset host: ${url.href}`);
  if (files.has(url.href)) return files.get(url.href).file;
  const filename = path.posix.basename(url.pathname).replace(/[^a-zA-Z0-9._-]/g, '_') || 'asset';
  const file = `media/${digest(url.href).slice(0, 12)}-${filename}`;
  const destination = path.join(assets, file);
  try { await access(destination); } catch {
    if (existing.has(url.href)) await copyFile(existing.get(url.href), destination);
    else {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000), headers: { 'User-Agent': 'Mozilla/5.0' } });
      const originalMissingThumbnail = url.href === 'https://i.ytimg.com/vi/ST01LDOOI-4/hqdefault.jpg' && response.status === 404 && /image\/jpeg/.test(response.headers.get('content-type') || '');
      if ((!response.ok && !originalMissingThumbnail) || /text\/html/i.test(response.headers.get('content-type') || '')) throw new Error(`Asset ${response.status} invalid response: ${url.href}`);
      await writeFile(destination, Buffer.from(await response.arrayBuffer()));
    }
  }
  const bytes = await readFile(destination);
  if (/\.woff2?$/.test(file) && !['wOFF', 'wOF2'].includes(bytes.subarray(0,4).toString())) throw new Error(`Invalid font: ${url.href}`);
  const item = { file, bytes: bytes.length, sha256: digest(bytes) }; files.set(url.href, item); existing.set(url.href, destination);
  return file;
}
async function cssAssets(css, base, prefix = '') {
  for (const match of [...css.matchAll(/url\(\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^\s)]+))\s*\)/g)].reverse()) {
    const value = match[1] ?? match[2] ?? match[3]; if (/^(data:|#)/i.test(value)) continue;
    const file = await localize(value, base);
    css = css.slice(0, match.index) + `url('${prefix}${file}')` + css.slice(match.index + match[0].length);
  }
  return css;
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ javaScriptEnabled: false }); await page.route('**/*', route => route.abort());
const entries = {}, report = { startedAt: new Date().toISOString(), built: [], errors: [], missing: [],revisions:{},
  imageDescriptions:{reviewedOn:imageDescriptions.reviewedOn,sourceSha256:imageDescriptions.sourceSha256,assetManifestSha256:imageDescriptions.assetManifestSha256,counts:imageDescriptions.counts},
  seoMetadata: {reviewedOn:seoMetadata.reviewedOn, routes:Object.keys(seoMetadata.pages),
    sourceSha256:digest(await readFile(new URL('./code-pages-seo.json', import.meta.url)))} };
try {
  for (const route of manifest.routes) {
    let source, capture;
    try { source = await readFile(path.join(route.source, 'production-1920.html'), 'utf8'); capture = JSON.parse(await readFile(path.join(route.source, 'production-1920.json'), 'utf8')); }
    catch { report.missing.push(route.key); continue; }
    try {
      if (!capture.complete) throw new Error('Incomplete source');
      const phoneCapture = JSON.parse(await readFile(path.join(route.source, 'production-390.json'), 'utf8'));
      let css = '';
      for (const sheet of capture.cssom) {
        if (/^ecwid-static-page-/.test(sheet.id) || /https:\/\/d34ikvsdm2rlij\.cloudfront\.net\//.test(sheet.href || '') || sheet.text?.startsWith('@import url("https://d1oxsl77a1kjht.cloudfront.net/')) continue;
        if (sheet.error) {
          if (sheet.href?.startsWith('https://d1oxsl77a1kjht.cloudfront.net/css/new?')) continue; // Live Ecwid owns its injected stylesheet.
          if (sheet.href !== 'https://cdn.iubenda.com/iubenda_badge.css') throw new Error(`Unreadable stylesheet: ${sheet.href}`);
          const response = await fetch(sheet.href);
          if (!response.ok) throw new Error('Cannot retrieve public consent-badge CSS');
          const raw = await response.text();
          sheet.text = await page.evaluate(text => { const sheet = new CSSStyleSheet(); sheet.replaceSync(text); return [...sheet.cssRules].map(r => r.cssText).join('\n'); }, raw);
        }
        if (!sheet.text || /^(rocket-|ktk-capture-)/.test(sheet.id) || /^(?:#iubenda|\.iubenda-alert)/.test(sheet.text) || sheet.text.includes('body[data-scroll-step=')) continue;
        const text = await cssAssets(sheet.text, sheet.href || route.sourceUrl, '../');
        css += sheet.media && sheet.media !== 'all' ? `\n@media ${sheet.media}{${text}}\n` : `\n${text}\n`;
      }
      css = css.replace(/(@font-face\s*\{[^{}]*font-family:\s*)"Passion One"/g, '$1"Passion One Origin"');
      for (const frame of phoneCapture.groups.frames.filter(frame => /^instagram-embed-\d+$/.test(frame.id))) {
        css += `\n@media(max-width:767px){iframe#${frame.id}{height:${frame.box.height}px;min-width:min(326px,100%)!important;}}\n`;
      }
      await page.setContent(source);
      const data = await page.evaluate(({ expectedSections, key, kind }) => {
        const pageRoot = document.querySelector('#page-container');
        if (!pageRoot || pageRoot.querySelectorAll('#main-content .et_pb_section').length !== expectedSections) throw new Error('Source section contract changed');
        const sourceScripts = [...document.scripts].map(s => s.textContent).join('\n');
        const linkOptions = sourceScripts.match(/var et_link_options_data\s*=\s*(\[[^\n]*\]);/);
        const container = document.createElement('div'); container.append(pageRoot);
        const floating = document.querySelector('#ktk-cta'); if (floating) container.append(floating);
        const ecwid = [];
        container.querySelectorAll('[data-single-product-id]').forEach(widget => {
          const id = widget.dataset.singleProductId;
          if(id!=='637056338')throw new Error('Review unmapped original Ecwid widget: '+id);
          const placeholder=document.createElement('span');placeholder.dataset.ktkLegacyBooking=id;widget.replaceWith(placeholder);
        });
        if (linkOptions) for (const link of JSON.parse(linkOptions[1])) for (const module of pageRoot.querySelectorAll(`.${CSS.escape(link.class)}`)) {
          if (module.querySelector('iframe,form')) { module.classList.remove('et_clickable'); continue; }
          if (module.querySelector('a,button,input,select,textarea')) { module.dataset.parityHref = link.url; module.dataset.parityTarget = link.target; continue; }
          const anchor = document.createElement('a'); anchor.href = link.url; anchor.target = link.target; anchor.className = 'ktk-parity-module-link';
          const label=module.cloneNode(true);label.querySelectorAll('script,style,noscript').forEach(e=>e.remove());
          anchor.setAttribute('aria-label', label.textContent.trim().replace(/\s+/g, ' ')); anchor.style.cssText = 'position:absolute;inset:0;z-index:1;'; module.append(anchor);
        }
        container.querySelectorAll('script,style,noscript,.et_pb_sticky_placeholder').forEach(e => e.remove());
        container.querySelectorAll('*').forEach(e => {
          if (e.tagName === 'IFRAME') e.dataset.ktkSource = e.dataset.lazySrc || e.dataset.suppressedsrc || e.dataset.cmpSrc || e.getAttribute('src') || '';
          for (const attr of [...e.attributes]) if (/^on/i.test(attr.name) || /^data-(wpr-|rocket-|cmp-|suppressedsrc|iub-)/.test(attr.name)) e.removeAttribute(attr.name);
          e.classList.remove('_iub_cs_activate','cmplazyload','et-waypoint','entered','exited','lazyloading');
          if (e.classList.contains('et_pb_animation')) e.classList.add('et-animated');
        });
        container.querySelectorAll('img').forEach(e => {
          if (e.dataset.lazySrc) e.src = e.dataset.lazySrc;
          if (e.dataset.lazySrcset) e.srcset = e.dataset.lazySrcset;
          if (e.dataset.lazySizes) e.sizes = e.dataset.lazySizes;
          ['data-lazy-src','data-lazy-srcset','data-lazy-sizes','data-ll-status'].forEach(a => e.removeAttribute(a));
          e.decoding = 'async'; if (e.id !== 'logo' && e.getAttribute('fetchpriority') !== 'high') e.loading = 'lazy';
        });
        container.querySelectorAll('iframe').forEach((e, index) => {
          const src = e.dataset.ktkSource || e.getAttribute('src');
          if (!src || src === 'about:blank') throw new Error('Frame source not recoverable');
          const url = new URL(src, 'https://krawlthroughkrakow.com/');
          if (!['http:','https:'].includes(url.protocol)) throw new Error('Invalid frame URL');
          if (url.hostname === 'www.instagram.com') { url.search = ''; url.hash = ''; }
          if (url.hostname === 'app.shapo.io') { e.id = 'ktk-shapo-widget-' + url.pathname.split('/').filter(Boolean).at(-1); e.classList.add('ktk-shapo-widget'); }
          e.dataset.ktkEmbedSrc = url.href; e.src = 'about:blank'; e.title = e.title || `Embedded ${/google.*maps/.test(src) ? 'map' : /youtube|vimeo/.test(src) ? 'video' : 'content'} ${index + 1}`;
          e.removeAttribute('data-ktk-source');
          e.removeAttribute('data-lazy-src'); e.removeAttribute('data-ll-status'); e.loading = 'lazy';
        });
        container.querySelectorAll('a[target="_blank"]').forEach(a => a.rel = 'noopener noreferrer');
        container.querySelectorAll('.mobile_nav').forEach(e => { e.classList.remove('opened'); e.classList.add('closed'); });
        container.querySelectorAll('#mobile_menu').forEach(e => e.removeAttribute('style'));
        container.querySelector('#et-top-navigation')?.style.removeProperty('padding-left');
        container.querySelectorAll('.et_pb_slider .et_pb_container').forEach(e => e.style.removeProperty('height'));
        container.querySelectorAll('.mejs-container video').forEach(video => {
          const wrapper = video.closest('.mejs-container');
          video.controls = true; video.style.cssText = 'width:100%;height:auto;display:block;';
          wrapper.replaceWith(video);
        });
        const forms = [];
        container.querySelectorAll('form.et_pb_contact_form').forEach((form, index) => {
          const fields = [...form.querySelectorAll('[data-original_id]')].map(e => ({ name: e.getAttribute('name'), id: e.dataset.original_id, label: e.getAttribute('placeholder') || e.closest('.et_pb_contact_field')?.querySelector('label')?.textContent || e.dataset.original_id,
            type: e.dataset.field_type, required: e.dataset.required_mark === 'required' }));
          forms.push({ index, fields, captcha: !!form.querySelector('.et_pb_contact_captcha') });
          form.dataset.ktkForm = 'contact'; form.dataset.formIndex = String(index); form.dataset.routeKey = key; form.action = '__KTK_CONTACT_ACTION__';
          form.querySelectorAll('input[name^="_wpnonce"],input[name="_wp_http_referer"],input[name^="et_pb_contactform_submit_"]').forEach(e => e.remove());
          for (const [name, value] of Object.entries({ action:'ktk_pages_contact', route_key:key, form_index:String(index), _ktk_nonce:`__KTK_FORM_NONCE_${index}__`, _ktk_challenge:`__KTK_FORM_CHALLENGE_${index}__` })) {
            const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.append(input);
          }
          form.querySelectorAll('[data-required_mark="required"]').forEach(e => { if (e.type !== 'hidden') e.required = true; });
          form.querySelectorAll('[data-field_type="email"]').forEach(e => e.type = 'email');
          form.querySelectorAll('.et_pb_contact_captcha').forEach(e => { e.name = 'captcha'; e.inputMode = 'numeric'; });
        });
        container.querySelectorAll('form.wpcf7-form').forEach(form => { form.dataset.ktkForm = 'cf7'; form.dataset.feedbackEndpoint = '__KTK_CF7_API__' + form.querySelector('[name="_wpcf7"]').value + '/feedback'; });
        const main = container.querySelector('#main-content');
        const mainHtml = main.outerHTML;
        main.replaceWith(document.createTextNode('__KTK_PAGE_MAIN_CONTENT__'));
        return { shell: container.innerHTML, main: mainHtml, forms, ecwid,
          bodyClass: [...document.body.classList].filter(n => !['chrome','safari','firefox','opera','osx','linux','et_mobile_device','et_mobile_device_not_ipad'].includes(n)).join(' '),
          images: [...container.querySelectorAll('img,source')].map(e => ({ src:e.getAttribute('src'),srcset:e.getAttribute('srcset') })),
          mainImages: [...new DOMParser().parseFromString(mainHtml, 'text/html').querySelectorAll('img,source')].map(e => ({src:e.getAttribute('src'),srcset:e.getAttribute('srcset')})) };
      }, { expectedSections: route.expectedSections, key: route.key, kind: route.kind });
      let combined = data.shell + '\n__KTK_SPLIT_MAIN__\n' + data.main;
      const refs = new Map();
      for (const image of [...data.images, ...data.mainImages]) {
        if (image.src && !image.src.startsWith('data:')) refs.set(image.src, await localize(image.src, route.sourceUrl));
        if (image.srcset && !image.srcset.startsWith('data:')) for (const candidate of image.srcset.split(',')) { const src = candidate.trim().split(/\s+/)[0]; if (src) refs.set(src, await localize(src, route.sourceUrl)); }
      }
      for (const [remote,file] of [...refs].sort((a,b) => b[0].length - a[0].length)) combined = combined.replaceAll(remote.replaceAll('&','&amp;'), '__KTK_PAGE_ASSETS__' + file);
      combined = await cssAssets(combined, route.sourceUrl, '__KTK_PAGE_ASSETS__');
      await page.setContent(combined);
      await page.evaluate(() => {
        document.querySelectorAll('a[href],form[action],[data-parity-href]').forEach(e => {
          for (const attr of ['href','action','data-parity-href']) {
            const value = e.getAttribute(attr); if (!value || value.includes('__KTK_') || value.startsWith('#')) continue;
            let url; try { url = new URL(value, 'https://krawlthroughkrakow.com/'); } catch { continue; }
            if (['http:','https:'].includes(url.protocol) && !url.port && ['krawlthroughkrakow.com','www.krawlthroughkrakow.com'].includes(url.hostname)) e.setAttribute(attr, '__KTK_HOME_URL__' + url.pathname.replace(/^\/staging(?=\/|$)/,'').replace(/^\//,'') + url.search + url.hash);
          }
        });
      });
      const contentRevisions=await page.evaluate(reviseCodePageContent,{key:route.key,reviewCounts,campaignFacts});
      contentRevisions.push(...await page.evaluate(reviseEstablishedNyeEditorial,{key:route.key,revision:establishedNye}));
      contentRevisions.push(...await page.evaluate(reviseNightlifeEditorial,{key:route.key,revision:nightlifeRevision}));
      contentRevisions.push(...await page.evaluate(reviseBudgetEditorial,{key:route.key,revision:budgetRevision}));
      contentRevisions.push(...await page.evaluate(reviseJazzEditorial,{key:route.key,revision:jazzRevision}));
      contentRevisions.push(...await page.evaluate(reviseMusicEditorial,{key:route.key,revision:musicRevisions.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseVenueEditorial,{key:route.key,revision:venueRevisions.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseMemorialEditorial,{key:route.key,revision:memorialRevision}));
      contentRevisions.push(...await page.evaluate(reviseContextualLinks,{key:route.key}));
      contentRevisions.push(...await page.evaluate(reviseSemanticHeadings,{key:route.key,kind:route.kind,title:capture.title,route:route.route}));
      contentRevisions.push(...await page.evaluate(reviseOfferPages,{key:route.key,revision:offerPageRevisions.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseContactDetails,{key:route.key,revision:contactDetails}));
      contentRevisions.push(...await page.evaluate(reviseGroupPlanningEditorial,{key:route.key,revision:groupPlanning.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseGroupActivitiesEditorial,{key:route.key,revision:groupActivities.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseStagCostumeEditorial,{key:route.key,revision:stagCostume}));
      contentRevisions.push(...await page.evaluate(revisePracticalGuidesEditorial,{key:route.key,revision:practicalGuides.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseNightOutEditorial,{key:route.key,revision:nightOutGuides.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseSafetyGuidesEditorial,{key:route.key,revision:safetyGuides.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(revisePartyGuideEditorial,{key:route.key,revision:partyGuides.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseGamesResourceEditorial,{key:route.key,revision:gamesGuides.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseBudgetTravelEditorial,{key:route.key,revision:budgetTravelGuides.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseCityTripEditorial,{key:route.key,revision:cityTripGuides.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseKartingGuidesEditorial,{key:route.key,revision:kartingGuides.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseReviewedArticlePresentation,{key:route.key,revision:articlePresentations.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseAccessibilitySemantics,{key:route.key,imageDescriptions}));
      css=preserveHeadingCss(css);
      const bookingRevisions=await rewriteBookingLinks(page);
      bookingRevisions.push(...await rewriteCanonicalLinks(page));
      contentRevisions.push(...await page.evaluate(reviseOwnedVodkaLinks,{key:route.key,revision:ownedVodkaLinks.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseWeatherWinterEditorial,{key:route.key,revision:weatherWinterGuides.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseWeatherFeaturedDescription,{key:route.key,revision:weatherWinterGuides.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseFoodGuideEditorial,{key:route.key,revision:foodGuides.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseFoodFeaturedDescriptions,{key:route.key,revision:foodGuides.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseNightlifeChoiceEditorial,{key:route.key,revision:nightlifeChoices.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseNightlifeChoiceFeatures,{key:route.key,revision:nightlifeChoices.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseGroupChoiceEditorial,{key:route.key,revision:groupChoices.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseGroupChoiceFeatures,{key:route.key,revision:groupChoices.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseActivityBookingEditorial,{key:route.key,revision:activityBookings.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseActivityBookingFeatures,{key:route.key,revision:activityBookings.find(row=>row.key===route.key)}));
      contentRevisions.push(...await page.evaluate(reviseCompetitionNewsletterEditorial,{key:route.key,revision:competitionNewsletter.find(row=>row.key===route.key)}));
      const eventPromotion=await page.evaluate(prepareNyePromotion,{key:route.key,campaignFacts});
      if(contentRevisions.length||bookingRevisions.length)report.revisions[route.key]={content:contentRevisions,bookings:bookingRevisions};
      const schemaFacts=await page.evaluate(codePageSchemaFacts);
      const title=codePageTitle(route.route,capture.title),description=codePageHeadDescription(route.route,codePageDescription(route.route,capture.metadata.description));
      const schema=buildCodePageSchema({route:route.route,kind:route.kind,
        description,facts:schemaFacts,
        routes:manifest.routes,inherited:capture.metadata.schema});
      const hasFeaturedSchemaImage=schema.some(item=>(item['@graph']||[item]).some(entity=>entity['@type']==='BlogPosting'&&entity.image));
      const metadata=buildCodePageSharing({route:route.route,kind:route.kind,title,description,inherited:capture.metadata.extra,
        image:hasFeaturedSchemaImage?await sharingImage(schemaFacts.image):null});
      const portable=await page.evaluate(()=>document.body.innerHTML);
      const [shell, main] = portable.split('\n__KTK_SPLIT_MAIN__\n');
      if (!main || !shell.includes('__KTK_PAGE_MAIN_CONTENT__')) throw new Error('Template split failed');
      const shellFile = `shells/${digest(shell).slice(0,20)}.html`;
      const mainFile = `content/${route.key}.html`;
      const cssFile = `styles/${digest(css).slice(0,20)}.css`;
      await writeFile(path.join(assets, shellFile), shell); await writeFile(path.join(assets, mainFile), main); await writeFile(path.join(assets, cssFile), css);
      const definition = { key: route.key, route: route.route, kind: route.kind, post_id: route.postId, title,
        description, metadata, schema,
        body_class: data.bodyClass, shell_file: shellFile, main_file: mainFile, css: cssFile, forms: data.forms, ecwid: data.ecwid,
        source_sha256: digest(source), expected_sections: route.expectedSections };
      if(eventPromotion){
       if(eventPromotion.expired_description){
        const expiredFacts={...schemaFacts,headline:"New Year's Eve in Krakow"};
        const expiredDescription=eventPromotion.expired_description;
        eventPromotion.expired_head={description:expiredDescription,
          metadata:buildCodePageSharing({route:route.route,kind:route.kind,title,description:expiredDescription,inherited:capture.metadata.extra,image:null}),
          schema:buildCodePageSchema({route:route.route,kind:route.kind,description:expiredDescription,facts:expiredFacts,routes:manifest.routes,inherited:capture.metadata.schema})};
       }
        definition.event_promotion=eventPromotion;
      }
      const seo=productionSeo.get(route.key);
      if(!seo||seo.status!==200||seo.url!==route.sourceUrl||seo.title!==capture.title)throw new Error('Production SEO source identity/title mismatch');
      definition.production_seo={source_url:seo.url,checked_at:seoBaseline.checkedAt,
        robots:seo.robots.map(row=>({name:row.name,content:row.content})),x_robots_tag:seo.xRobotsTag,canonical:seo.canonical};
      const definitionFile = `pages/${route.key}.php`;
      const json = JSON.stringify(definition);
      await writeFile(path.join(assets, definitionFile), `<?php\n/** Generated code-owned page data; edit capture/generator, not this file. */\nif (!defined('ABSPATH')) { exit; }\nreturn json_decode(${php(json)}, true);\n`);
      entries[route.route] = { key: route.key, file: definitionFile, kind: route.kind, post_id: route.postId };
      report.built.push(route.key); console.log(`Built ${report.built.length}/${manifest.routes.length}: ${route.key}`);
      await writeFile('docs/code-pages/full-migration/assets.json', JSON.stringify(Object.fromEntries(files), null, 2));
    } catch (error) { report.errors.push({ key: route.key, error: error.message }); console.error(`${route.key}: ${error.message}`); }
  }
  if ((!report.errors.length && !report.missing.length) || partial) {
    const redirects = {};
    for (const alias of manifest.aliases) {
      if (alias.status === 'existing-homepage-canonical-alias') continue;
      const response = await fetch(alias.sourceUrl, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
      if (![301,302,307,308].includes(response.status)) throw new Error(`Expected observed redirect for ${alias.route}: ${response.status}`);
      redirects[alias.route] = { status: response.status, target: alias.target };
    }
    report.reviewedRedirects=[];
    for(const alias of canonicalLinkPolicy.redirects){
      const response=await fetch('https://krawlthroughkrakow.com'+alias.from,{redirect:'manual',signal:AbortSignal.timeout(30000)});
      if(response.status!==alias.sourceStatus)throw new Error('Review changed broken alias source: '+alias.from);
      const target=await fetch('https://krawlthroughkrakow.com'+alias.target,{redirect:'manual',signal:AbortSignal.timeout(30000)});
      if(target.status!==200)throw new Error('Reviewed alias target must be a current direct page: '+alias.target);
      redirects[alias.from]={status:alias.status,target:alias.target};
      report.reviewedRedirects.push({from:alias.from,target:alias.target,sourceStatus:response.status,targetStatus:target.status});
    }
    await writeFile(path.join(assets, 'registry.php'), `<?php\n/** Generated staging-only explicit route registry. */\nif (!defined('ABSPATH')) { exit; }\nreturn json_decode(${php(JSON.stringify({version:1, complete:report.built.length === manifest.routes.length, routes:entries, redirects}))}, true);\n`);
  }
} catch (error) {
  report.errors.push({ key: 'build-finalization', error: error.message });
  throw error;
} finally {
  await browser.close(); report.finishedAt = new Date().toISOString();
  await writeFile('docs/code-pages/full-migration/build-report.json', JSON.stringify(report,null,2));
  console.log(JSON.stringify({ built:report.built.length, missing:report.missing.length, errors:report.errors },null,2));
  if (report.errors.length || (!partial && report.missing.length)) process.exitCode = 1;
}
