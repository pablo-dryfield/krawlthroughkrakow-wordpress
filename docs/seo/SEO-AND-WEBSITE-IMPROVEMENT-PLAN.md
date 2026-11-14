# Krawl Through Krakow: SEO and Website Improvement Plan

Created: 2026-11-07, Europe/Warsaw  
Status: SEO implementation remains staging-only; one separately approved production form endpoint hotfix is verified live. See the roadmap for current release scopes.

**Progress dashboard:** [Visual roadmap](ROADMAP.html) shows the status graphics, delivery path, remaining work and searchable task details. The [Markdown roadmap](ROADMAP.md) remains available. Both are generated from the same maintained source; the detailed acceptance criteria below remain authoritative. An unchecked ticket can have partial staging work completed.

Evidence tables and reporting limitations below describe the original7 November
baseline, not the latest delivery state. M01 reporting has since been completed;
the dated evidence and roadmap record subsequent staging changes and remaining
gates. Preserve the original baseline when comparing later measurements.

Goal: More qualified organic visitors, more completed direct bookings, and a clearer, faster, reliable website.

## 1. Decisions in Plain English

The largest opportunity is not publishing dozens of new articles or changing URLs. It is improving the pages already connected to our business: the main pub crawl, NYE, nightlife, bars/clubs and group trips, supported by reliable reporting and a better booking journey.

Start in this order:

1. Correct the Search Console reporting limitations so we can measure improvement honestly.
2. Fix discovery and page fundamentals: sitemap, server-delivered booking-page content, metadata and relevant internal links.
3. Improve the main pub-crawl and NYE experiences without discarding existing ranking URLs.
4. Refresh the nightlife hub and the strongest existing local guides with firsthand information.
5. Measure and improve mobile performance, accessibility and booking friction.
6. Strengthen Google Business Profile, authentic reviews and relevant local partnerships.

Code ownership makes these changes easier to test and maintain. It does not itself improve rankings, and no plan can guarantee position 1. WordPress still supplies parts of the serving/backend infrastructure; this is not a platform-removal project.

**The SEO batches remain on staging.** On November 12 the owner authorized staging improvements and private GitHub version control. On November 14 the owner separately approved only the tested production form endpoint repair; that one-expression update is verified live, including device caches. It does not promote the staged content, CSS, renderer or wider form UI changes. The backlog is not complete. The original database audit was read-only; no customer records, orders, payments, real emails or commerce settings are changed by these website releases. OmniLodge development/deployment requires separate explicit approval. The legacy Ecwid store remains protected.

## 2. Evidence and Confidence

### Sources Reviewed

- Ahrefs HTML report, evidence JSON and six CSV exports in `C:\Users\pjcam\Documents\Reports\KTK-Ahrefs-2026-11-04`.
- OmniLodge production database: read-only connector health, SEO action-log schema and bounded action-log read. There are **zero saved SEO actions**. Recommendations are calculated in the browser from Google's live data, not stored as database rows.
- Authenticated OmniLodge Search Console page: all displayed recommendations/opportunities for **28, 90, 180 and 365 days**, ending November 5, plus keyword/landing-page tables and four URL inspections.
- Fresh production HTTP/HTML audit: **128 URLs, 128 responses, zero transport errors**, including all 116 migrated content routes, homepage, selected storefront URLs, aliases and known broken destinations. Six WordPress child sitemaps and robots.txt were also read.
- Existing migration/release documentation and current generators/renderers. Original migration preserved deficiencies deliberately; the current audit does not attribute every old issue to the migration.
- Current primary Google guidance, linked in section 11. No fresh Ahrefs crawl, full backlink investigation, live competitor SERP study, field-speed audit or conversion experiment was performed in this research task.

Supporting evidence:

- [Search Console periods, database method, 57 deduplicated findings and indexing observations](audit-2026-11-07/SEARCH-CONSOLE-AND-DATABASE-EVIDENCE.md).
- [Current production URL/metadata/link/sitemap observations](audit-2026-11-07/production-baseline.json).
- Repeat the bounded public audit from the repository root: `node tools/audit-seo-baseline.mjs docs/seo/audit-YYYY-MM-DD/production-baseline.json`. It uses an isolated DOM parser and GET requests; it does not execute website scripts or submit anything.

### What We Can Say Now

| Observation | Evidence / confidence | Meaning |
| --- | --- | --- |
| Core booking demand already exists | Live GSC exact query rows; high confidence | Protect current pub-crawl visibility before experimenting. |
| Nightlife/local-guide opportunity repeats over time | GSC four-window review plus Ahrefs competitor gap; high confidence in opportunity, not forecast uplift | Improve existing local content rather than unrelated traffic topics. |
| Search Console dashboard understates/limits its own coverage | Source inspection: every request asks for 100 rows; UI sums those rows; confirmed | Its cards are not dependable sitewide totals. Fix before declaring growth, decline or missing demand. |
| Content pages need descriptions | All 56 article and 21 standalone migrated-page responses omit meta descriptions; confirmed | 77 inherited content-page metadata gaps, not 77 indexing failures. Prioritize commercial/high-impression pages. |
| Heading structure needs cleanup | Homepage has 13 H1 elements including lower/footer headings; all 39 archives and one article lack H1 in source; confirmed | Improve semantics/accessibility while preserving visual appearance. Multiple H1s are not an automatic penalty. |
| Storefront content depends on rendering | Selected store2 raw responses have metadata/Product markup but no main text or H1; confirmed in source only | Add resilient server-delivered public content. This does not prove Google cannot render/index the current product. |
| Storefront discovery is incomplete in the current sitemap | `/wp-sitemap.xml` works, but its six children contain no store2 URLs; confirmed | Add intended indexable storefront destinations, not cart/session URLs. |
| Old sitemap inconsistencies remain | Activities and Life Drawing redirects and homepage-canonical `/krakow-pub-crawl/` remain listed; confirmed | List final preferred URLs, preserving existing correct redirects. |
| Three old destinations still return 404 | Old brunch product, old student-trip URL and old dated article URL; confirmed | Map only genuine replacements; do not redirect every 404 to the homepage. |
| Some commercial pages have weak internal discovery | No incoming anchor from the sampled successful pages to stag/hen pages; sample-bounded | Verify full rendered link graph, then add relevant navigation/contextual links. Not a proven whole-web orphan count. |
| Current clean product canonical is already correct | Pub-crawl UTM variant canonicalizes to clean store2 URL; confirmed | Do not remove legitimate attribution parameters to solve an already-correct canonical. |
| Important migration safeguards remain | All 116 content routes returned 200; no production noindex or staging anchors in audited successful nonredirect responses | Positive technical sample, not proof all URLs are indexed or rankings unchanged. |
| Some indexed content has been recrawled after cutover | How to Join inspection: indexed, matching Google canonical, crawl November 6 | Positive one-page evidence, not whole-site migration-impact proof. |

The raw audit's 122 successful nonredirect HTML responses include a query variant and the existing homepage alias. They are not 122 independent preferred pages. Missing H1 counts also include JavaScript storefront shells. The 117 Open Graph gaps are social-sharing opportunities, not 117 ranking emergencies.

### Measurement Windows

Use these windows as different lenses, not additive totals:

| Window | Reviewed dates | Use |
| --- | --- | --- |
| 28 days | 2026-10-09 to 2026-11-05 | Current intent, snippets and immediate seasonal opportunities. |
| 90 days | 2026-08-08 to 2026-11-05 | Primary prioritization window; less sensitive to a few days. |
| 180 days | 2026-05-10 to 2026-11-05 | Check recurring topics and business seasonality. |
| 365 days | 2025-11-06 to 2026-11-05 | Long-run discovery, legacy assets and seasonal demand. |

All overview totals are currently top-100 partial sums. Do not compare their annual previous-period card as a complete prior year: available historical coverage has not been established. Retrieve comparable same-date prior-year slices where available, with country/device/brand/page-cluster segmentation, before making conclusions.

The full content cutover was November 5, 2026; the homepage was already code-managed earlier. A report ending on November 5 cannot establish full-cutover ranking impact. Establish post-cutover 7/28/90-day cohorts once those days are available; distinguish a technical incident from expected seasonal change. Google's stored homepage/product/NYE inspections predate the full content cutover, whereas the How to Join sample postdates it.

## 3. Prioritized Backlog

Priority: P0 = prerequisite or high-risk correctness; P1 = first growth/experience work; P2 = supporting improvement; P3 = conditional expansion. Effort S/M/L is relative engineering/editorial size, not a delivery estimate. Every unchecked item remains proposed. Acceptance criteria are completion gates, not ranking guarantees.

### Measurement and Migration Protection

| ID / status | Priority / effort | Work | Done when |
| --- | --- | --- | --- |
| M01 [x] | P0 / M | Fix OmniLodge Search Console reporting: independent whole-property/date totals; paginated detailed rows with explicit coverage; exact-query vs substring groups; metrics aligned to the displayed page; separate query/page aggregation; filters by country/device/search type; no-data vs truncated flags. Label heuristic recommendations. | Delivered13 November2026: separate approval, required CI, immutable releases/actual managed deployment, exact public artifact verification and native Google agreement. See dated reporting evidence; no traffic-uplift or complete-query-coverage claim. |
| M02 [ ] | P0 / S | Establish dated SEO baseline and annotate homepage/content releases separately. Export complete available 28/90/180/365-day data and comparable prior-year periods; split brand/nonbrand, UK/Poland/other markets, mobile/desktop, commercial/editorial/PDF/legacy pages. | Comparable exports and assumptions are retained; indexed/canonical/traffic changes can be investigated without guessing. |
| M03 [ ] | P1 / M | Verify the full measurement funnel: landing -> named booking CTA -> product -> booking start -> payment completion -> revenue. Keep journey history and UTM handoff; distinguish direct/organic/paid/Google booking integrations. Avoid counting button clicks or failed payments as purchases. | Events are documented, consent-aware, deduplicated using transaction identity, and reconciled against aggregated paid bookings without exposing personal data. No live test purchases without approval. |
| M04 [ ] | P1 / S | Check native GSC Page Indexing, Crawl Stats, submitted sitemaps, Manual Actions and Security Issues; inspect representative page types after Google's next crawl. Configure meaningful failure alerts/weekly review, not a noisy total-keyword scoreboard. | Coverage is recorded by page type; actual exclusions and availability problems have owners. Manual actions/security status is verified, not assumed clean. |

### Technical SEO and Discovery

| ID / status | Priority / effort | Work | Done when |
| --- | --- | --- | --- |
| T01 [ ] | P0 / M | Write an intent-to-URL map: homepage = brand/main Krakow pub crawl; store2 product = details/booking; nightlife hub = advice; NYE sales page = current event; guides = informational. Review real overlaps before consolidation. Preserve clean canonicals for attribution/query variants and normal www/HTTPS redirects. | Each intent has an explicit primary landing page and supporting pages. Distinct useful pages are not canonicalized to each other merely for sharing keywords. Legacy fallback store remains working. |
| T02 [ ] | P1 / L | Deliver useful storefront title, H1, description, inclusions, images and indexable product links in initial HTML, using the same public product source as hydration/metadata/schema. Start with pub crawl and NYE, then the active catalog. No crawler-only content. | No-JS/public source contains meaningful product information; rendering does not duplicate content; prices/availability stay accurate; Google live inspection can see the same offer users see. Existing indexed product remains accessible. |
| T03 [ ] | P0 / M | Make a code-owned sitemap layer consistent with the explicit content registry and intended catalog: final HTTPS canonical 200 URLs only, accurate change dates, no UTM/cart/staging/aliases. Remove redirect/noncanonical entries from owned feeds. Add sitemap discovery in robots.txt. | Correct content and store2 destinations are discoverable and submitted in GSC. Do not delete the legacy Ecwid sitemap or index policy without an approved equivalence plan. `/sitemap_index.xml` being 404 is not itself a fault: the current valid endpoint is `/wp-sitemap.xml`. |
| T04 [ ] | P1 / M | Normalize heading hierarchy without redesign: one clear primary page heading as a project convention; lower/footer headings become appropriate H2/H3 or nonheading text; give archives useful descriptive H1s and fix the newsletter article. | All intended indexable templates have a meaningful hierarchy; screenshots, TOC anchors, keyboard reading and mobile layout regressions pass. No invisible keyword headings. |
| T05 [ ] | P1 / M | Add reviewed per-page SEO overrides: distinct descriptive titles, missing descriptions, canonical/robots policy, Open Graph/social cards and images. Start with core/NYE/local guides, then remaining content. Preview real snippets, not fixed character-count targets. | 77 content description gaps are resolved or explicitly justified; important pages match their actual offer; no duplicated metadata/contradictory canonical; visual/commerce behavior unchanged. Google may still rewrite title/snippet. |
| T06 [ ] | P2 / M | Decide archive indexing case by case. Enrich useful categories; review thin tag/author/Uncategorized pages; differentiate paginated titles and retain crawlable pagination. Review the missing canonical on `/krakow-team-building-activities/`. | Every archive group has keep/improve/noindex/merge rationale based on traffic, value and links. No blanket archive deletion or canonicalizing all pagination to page 1. |
| T07 [ ] | P1 / S-M | Recover genuine broken destinations; remove avoidable redirect chains and stale image/external URLs. Check `/student-trips-and-parties/` -> `/student-trips-poland/`, `/2019/09/05/2681/` -> current Auschwitz article, and old brunch URL -> current brunch offer for equivalence. | Approved equivalent routes return one-hop permanent redirects; retired non-equivalents retain honest 404/410; links point straight to final URLs. Specific legacy-store-route work needs approval, not a blanket `/store/` rewrite. |
| T08 [ ] | P1 / M | Improve meaningful internal links and navigation for stag, hen, student, nightlife guides and related products. Use clear anchors, breadcrumbs and relevant related articles. Validate the apparent isolated Terms page as part of trust/checkout links. | Commercial pages can be reached naturally from relevant hubs and content without JS-only navigation; complete rendered crawl confirms no unintended commercial orphans. Avoid repeated keyword-heavy footer links. |
| T09 [ ] | P1 / M | Validate structured data: consistent Organization/WebSite identity, Article/BlogPosting + author/date/image for articles, BreadcrumbList, and accurate applicable offer/event data. Recheck the three old schema validation warnings. | Markup represents visible verified facts, passes applicable validation and is generated from shared data. No copied platform review totals injected as self-serving rich-review markup. Product/Event eligibility reviewed rather than assumed. |
| T10 [ ] | P1 / M | Add SEO regression checks for HTTP status, canonical, robots, initial content, metadata, schema, internal destinations, sitemap and desktop/mobile cache variants. Include meaningful 404s and guarded routing. | Changes fail CI/release checks when they leak staging, lose content, misindex private/cart pages or break URLs. Existing publisher safeguards remain intact. |

### Content and Commercial Intent

| ID / status | Priority / effort | Work | Done when |
| --- | --- | --- | --- |
| C01 [ ] | P1 / M | Strengthen homepage and main product for pub/bar crawl in Krakow using natural language, actual inclusions, meeting details, guide credentials, original photos, FAQs and clearly placed booking controls. Keep brand visible and preserve the owner's no-price-in-hero instruction; show accurate prices where customers compare/book. | Search promise, landing content and checkout agree. Core queries retain their established destinations; a small metadata/copy pilot is measured before sitewide rewrites. |
| C02 [ ] | P1 / M | Prioritize NYE now: align `/new-years-eve/`, NYE guide articles and product 32. Confirm December 31, 2026 / welcome 2027, 5:00 PM and 7:30 PM, 250 PLN, meeting points TBA. Distinguish old-event gallery labels from confirmed venues. Test countdown/expiry/next-campaign behavior. | No contradictory year/offer/venue promise; current CTA reaches NYE checkout; TBA is clear and updateable; guide supports rather than duplicates sales intent. Year is not rolled automatically without owner confirmation. |
| C03 [ ] | P1 / M-L | Refresh the existing `/krakow-nightlife/` hub with a useful, locally verified overview: districts, types of venues, costs with checked dates, opening patterns, practical transport/safety and choices for different visitors. Review existing 2020 guide, `/party-krakow/`, clubs and dating/singles articles before creating anything new. | One strong current hub answers nightlife/night activities/party intent and links to distinct useful guides and the crawl. Sources, original experience and update ownership are recorded. |
| C04 [ ] | P1 / M | Refresh `/wheres-the-cheap-places-to-drink-in-krakow/`, a repeated near-top opportunity: verified venues, current sample PLN prices, districts, happy-hour conditions and dates, original photos and context. | Cheap bars/drinks/cocktails variants are served by one useful guide, not many thin exact-match pages. No unsupported cheapest/best claims or stale price promises. |
| C05 [ ] | P1 / M-L | Update techno, jazz, Irish bars, live music, nightclubs, Kazimierz and shot-bar guides. Verify venues still operate and match claimed music/hours/admission; add concise comparison tables/maps and original local recommendations. Review duplicate techno articles first. | Existing successful URLs improve materially; customers can choose a real venue; links to relevant booking options feel appropriate. No copied competitor lists. |
| C06 [ ] | P1 / M | Improve stag/hen/student-trip pages around actual group questions: group size, private vs public, lead times, confirmed inclusions, coordination, terms and enquiry path. Connect existing stag-prank/costume/safety articles. | Main group pages are reachable and useful, enquiry/booking destination is clear, and facts are consistent with operational offers. Review tone and inclusion for the intended audience. |
| C07 [ ] | P2 / M-L | Build/refresh crawlable offer information for vodka tasting, boat party, brunch, shooting range, food/brewery tours and other genuinely available products; connect related articles to current store2 destinations. Rank by business margin, availability and evidenced demand. | Current pages address the query and actual booking offer. Inactive/unconfirmed experiences are not advertised as available. Legacy store remains a tested fallback, not silently disabled. |
| C08 [ ] | P2 / M | Audit all 56 articles: keep, refresh, differentiate, consolidate or retire with a recorded reason. First compare duplicate games, NYE, techno and dated 2019/2020 topics. Verify medical/safety-like claims and remove dangerous or misleading advice. | Each article has owner, intent, evidence, last substantive review and next action. Preserve URLs/backlinks where possible; no mass deletion/noindex based only on low traffic or word count. |
| C09 [ ] | P2 / M | Preserve `/wp-content/uploads/2020/04/Jenga.pdf` and its useful backlinks. Evaluate a complementary accessible HTML games guide, PDF attribution and relevant internal CTA. Differentiate `/best-drinking-games/` and `/pub-crawl-drinking-games/` only where their intents justify it. | Existing PDF remains reachable; new content adds real value; informational reach and booking contribution are measured separately. Do not apply HTML title/meta advice mechanically to a PDF or redirect it without evidence. |
| C10 [ ] | P1 / S-M | Strengthen trust: clear operator identity, team expertise, since-2008 history, real photos, contact and meeting-point information, accurate terms/cancellation policies, visible platform-linked reviews. | All claims/review snapshots are supportable; updates have dates internally; price/inclusions/terms match the source of truth. Do not call owner-approved rounded review counts live verified totals. |

### Experience, Performance and Reliability

| ID / status | Priority / effort | Work | Done when |
| --- | --- | --- | --- |
| D01 [ ] | P1 / M | Measure images actually downloaded on mobile/desktop; generate appropriately sized WebP/AVIF where useful, correct srcset/sizes, dimensions and meaningful alt text. Keep above-fold content eager and below-fold media lazy. Include CSS backgrounds and large statue SVG complexity in profiling. | Important pages use proportionate transfers without degrading artwork/detail or lazy-loading the LCP asset. Large originals in Ahrefs are not assumed to be every browser's selected download. |
| D02 [ ] | P1 / M-L | Profile current homepage/product/NYE/article templates with isolated Lighthouse/DevTools and real CWV where available. Reduce unused captured CSS, duplicate font work, long tasks and unnecessary third-party execution carefully. Evaluate cache/API response reliability separately. | Baselines and changes are comparable. Aim for field p75 LCP <=2.5s, INP <=200ms and CLS <=0.1 where enough data exists; no fabricated field claims from a lab score. No consent/tracking breakage to improve a score. |
| D03 [ ] | P1 / M | Run keyboard, screen-reader and mobile/zoom audits: headings, focus, menu/FAQ/gallery semantics, labels, form errors, touch targets and contrast. Review the 212 missing-alt image occurrences in article source; keep intentionally decorative alt empty. | WCAG-oriented checks and human keyboard/zoom tasks pass on key templates; no content clipping or overlays block controls. Do not fill all alt text with keywords. |
| D04 [ ] | P1 / M | Inspect real booking friction: date/slot selection, guest counts, add-ons, discount replacement, total transparency, cart editing/Undo and payment errors. Use existing journey data/consented Clarity, plus isolated test fixtures. | Clear path on phone/laptop; no surprise charges; no duplicate discounts/carts/conversion events; recovery and paid-order protections still pass. Payment work requires separate scope and explicit release approval. |
| D05 [ ] | P1 / S-M | Make meeting/how-to-join information easy to act on: exact regular meeting instructions, current time, accessible directions and fallback textual address when embeds are blocked. Keep NYE TBA distinct. Check floating CTA visibility and overlap on key scroll/zoom states. | Visitors can find the group without enabling optional embeds; no CTA covers schedule/text/buttons; all booking links preserve real incoming UTM tags without adding QA tags. |
| D06 [ ] | P2 / M | Audit lead/contact paths and response expectations for group enquiries/jobs/contact. Keep existing form backends for now, test validation/feedback without sending real messages, and assess spam/accessibility needs. | Enquiries have clear next steps and ownership; no silent failure or inaccessible feedback. Backend replacement is not required for this plan. |
| D07 [ ] | P1 / M | Monitor availability and access: bot protection on pages/fonts/APIs, API fallback, broken assets, useful errors, security updates, backups and tested rollback. Retain WordPress/plugin maintenance while those components remain. | Real customers and verified crawlers can access intended content; no blanket WAF disable/allowlist; outages alert an owner; Ecwid fallback and private order/confirmation data stay protected. |
| D08 [ ] | Deferred / M | Record consent and tracking readiness as a separate dependency, not an SEO growth shortcut. Existing saved-rejection cookie timing issue is documented in shared-integrations evidence. Keep functional Accept/Reject and existing bridge; owner previously declined GTM work. | Reopen only with owner direction and an actually ready replacement/fix; no fake Reject, forced consent or claim of verified cookieless behavior. No consent/container changes authorized by this planning request. |

### Local Visibility, Authority and Maintenance

| ID / status | Priority / effort | Work | Done when |
| --- | --- | --- | --- |
| L01 [ ] | P1 / S-M | Audit owner-controlled Google Business Profile: category/identity, service/contact details, hours, booking URL, photos and consistency with website. Identify where the Google/Booking/Search UTM product URL in GSC originates; preserve legitimate attribution. | Accurate profile and a working current booking destination; no keyword-stuffed business name or fake address. Local ranking also depends on distance and prominence, not website work alone. |
| L02 [ ] | P1 / S | Use a consistent authentic post-experience review process across Google/Tripadvisor/GetYourGuide; respond usefully and refresh website snapshots through one source. | Neutral review requests, no purchased/incentivized positives or selective review gating; counts and links stay accurate. |
| L03 [ ] | P2 / M | Pursue useful hostel/hotel/university/travel/venue partnerships and original local resources worth citing. Audit existing useful wikiHow/Culture Trip/KrakowBuzz/Stoke Travel/Seeker destinations for preservation. | Relevant referrals/editorial mentions and referral bookings grow; outreach is owner-approved. No bulk link buying or DR targets as the success metric. |
| L04 [ ] | P2 / M | Review suspicious historical backlinks and source context; check native GSC Manual Actions before considering disavow. Recover the two specific broken-linked destinations where equivalent. | Documented evidence and appropriate action; no accusation about who placed links and no automatic disavow based on TLD, DR or tool labels. |
| G01 [ ] | P1 / M | Create a reviewed code-owned SEO/content data layer for overrides and shared facts: offer identity, times, meeting points, canonical/robots, descriptions, review snapshots and editorial review dates. Do not hand-edit generated capture output. | One authoritative maintained value feeds relevant visible text/metadata/schema/sitemap. Source changes survive rebuilds. Later visual editing can be added deliberately without restoring Divi rendering. |
| G02 [ ] | P1 / M | Establish a safe live-update release procedure: pre-edit backup, small scoped source change, local QA, staging, owner sign-off, reviewed production updater and device-aware cache verification. | Rollback is proven and original WP data retained. Do not blindly rerun the initial production-cutover publisher or weaken its activation guards. |
| G03 [ ] | P3 / L | Evaluate translations only after real country/language/booking evidence. Use genuinely translated useful pages, supported customer operations and correct hreflang if approved. | A measurable market/business case exists; no mass machine-translated doorway pages. Search country is not nationality. |
| G04 [ ] | P2 / S recurring | Assign content/campaign owners and a monthly review cadence; verify seasonal facts before launch, after expiry and before rollover. Maintain a small measured query set in Ahrefs Rank Tracker if desired; it was empty on November 4. | No forgotten years/prices/closed venues; editorial/change log retained; recurring reports focus on qualified visibility and completed bookings. This plan does not create an automation or change Ahrefs settings. |

## 4. First Delivery Batches

These are sequencing suggestions, not a request to deploy everything at once.

### Batch A: Reliable Baseline and Low-Risk Foundations

- M01/M02: repair reporting first, or obtain equivalent native GSC exports while OmniLodge work awaits approval.
- T01: agree URL roles before changing canonical/redirect/index policy.
- T03: add intended code-page/storefront discovery and remove known noncanonical sitemap entries within an approved boundary.
- T05/G01: introduce the maintainable metadata override source, then pilot descriptions on homepage-adjacent commercial pages, NYE and the two strongest local guides.
- T07/T08: review three broken mappings and add useful links to stag/hen/student routes.
- M04/T10: monitor technical safeguards, not just ranks.

### Batch B: Main Booking Journey and NYE

- T02: server-delivered public content for pub crawl/NYE.
- C01/C02/D05: consistent offer, meeting information, event dates and booking path.
- D01/D02/D03: measure then fix the largest mobile/template bottlenecks.
- M03/D04: verify meaningful events and booking usability without production test payments.

### Batch C: Local Content and Authority

- C03/C04/C05: nightlife hub, cheap bars, techno, jazz and Irish-bar refreshes.
- C06/C07: commercially relevant group and secondary-product improvements.
- C08/C09: deliberate duplicate-topic/PDF strategy, not mass pruning.
- L01/L02/L03: profile/reviews/partnerships, with separate owner access/approvals where needed.

### Batch D: Ongoing Improvement

- Use corrected 28/90-day cohorts and available year-on-year comparisons to reprioritize.
- Expand only into topics/products where KTK has expertise, genuine customer demand and an available service.
- Consider G03 localization only after the baseline and main experience work.

## 5. Suggested Page-to-Intent Map

Proposed, requiring review against complete query/page data before canonical or consolidation changes.

| Intent | Existing primary candidate | Supporting roles |
| --- | --- | --- |
| Brand / Krakow pub crawl / bar crawl | `/` | `/store2/pub-crawl-28/` for detailed booking; How to Join/meeting point/FAQ for practical questions. |
| NYE pub crawl / current NYE party | `/new-years-eve/` | Product 32 booking; `/krakow-new-years-eve/` as useful city/event guide if differentiated; review `/new-years-eve-in-krakow/` overlap. |
| Krakow nightlife / things to do at night | `/krakow-nightlife/` | Specific venue/music/district guides, dating/singles page and current pub-crawl offer. |
| Cheap bars/drinks/cocktails | `/wheres-the-cheap-places-to-drink-in-krakow/` | Neighborhood or music guides only when genuinely distinct. |
| Techno clubs | `/krakow-techno-clubs/` | Review `/krakow-techno-clubs-2/` and old club guides before merging. |
| Jazz / Irish bars / live music | Existing separate relevant guide per intent | Interlink through nightlife hub, with confirmed facts. |
| Stag / hen / student groups | `/krakow-stag-do/`, `/krakow-hen-do/`, `/student-trips-poland/` | Related group advice and current private-tour/product destinations. |
| Drinking games / printable Jenga | Existing PDF plus selected games HTML guide | Clarify games-page overlap without sacrificing the PDF's links or traffic. |
| Secondary tour/product | Matching current store2 product | Helpful existing article -> relevant available offer; preserve legacy fallback. |

No new page is proposed solely to target a spelling variant such as `krawlthroughkrakow`. Do not copy the same page for every word-order variation.

## 6. Ahrefs Findings Reconciled With Today

The November 4 crawl had health score 92 across 754 resources/URLs, including 63 with errors, and 48 nonzero issue definitions. Those are Ahrefs classifications, not Google's quality score or 63 broken sales pages. Current production samples have a different scope, so old/new totals are not a valid before/after comparison.

| Original warning group | Current disposition |
| --- | --- |
| Old NYE year / old booking links | Main NYE page now says 2026/2027, TBA and confirmed groups. Migrated content has no old FareHarbor/Ecwid booking anchors in this raw-source sample. Recheck old guide copy and keep C02; do not repeat the completed migration fixes. |
| 81 indexable missing descriptions, long/short descriptions and long titles | 77 migrated content responses still have no description. T05 addresses priority/uniqueness; exact warning thresholds are not Google ranking rules. |
| Missing/multiple H1, low word count | T04/C08; footer/template semantics matter. Do not pad articles to hit an arbitrary length. |
| 20 oversized images, 212 image redirects, 35 slow URLs, 5 oversized CSS files | D01/D02. Current localized large-original image references remain; browser-selected sizes and real CWV still need measurement. A 1,875ms crawler response is not an LCP result. |
| Missing alt / image pages | D03/D01. Fresh source confirms many missing attributes, but empty decorative alt is not automatically an error. |
| 8 orphans, single-inbound/no-outgoing pages | T08/T06. Focus commercially useful pages, not linking every thin archive merely to satisfy the crawler. |
| 3 404 findings / 30 broken-link source pages | T07. Much of the count concerns `/cdn-cgi/l/email-protection`: 31 such anchors still appear in this sample. Verify actual email behavior before treating Cloudflare obfuscation artifacts as broken customer contact. Three separate historical destination 404s are real. |
| HTTP links, redirects, chains, redirected images, external 3XX/4XX | T07/D01. No internal HTTP anchors in current audited successful pages, so that old observation is not a fresh confirmed defect. Normal HTTPS redirects are intentional. Review failed external links with browser/provider context. |
| Sitemap redirects/noncanonicals and missing indexable pages | T03; confirmed remaining aliases and missing store2 coverage. |
| Article/ItemList/FAQ schema, 3 validation notices | T09. Article markup is useful; ItemList is semantic hygiene where suitable. FAQ rich results have been retired by Google in 2026: do not prioritize FAQPage just to clear Ahrefs' AI-discoverability notice. Useful visible FAQs still matter to users. |
| Noindex warnings | Review intended policy, do not strip noindex indiscriminately. Production successful HTML sample has none; staging/private/cart/utility policies need deliberate protection. |
| SERP title differs from page title | Often Google's normal rewriting; investigate mismatches, not force exact identity. T05. |
| Open Graph / social-card gaps | T05, helpful for shared-link presentation and conversion, not a direct ranking emergency. |
| Suspicious backlinks / broken backlinks / low DR | L03/L04. Preserve relevant links and repair genuine destinations. DR is not a Google score; no automatic disavow. |
| Ahrefs GSC import empty / Web Analytics zero | OmniLodge does have live GSC access. The separate Ahrefs import/analytics setup remains unverified; zero recorded data is not zero visitors. M01/M02/M03 before buying more analytics tooling. |
| Competitor content gap | C03/C05 are supported priorities: Ahrefs estimated UK nightlife volume 800 and Irish-bar volume 250. Those are modeled searches, not available bookings. Avoid copying unrelated markets/thermal-baths topics simply because a competitor ranks. |

## 7. Success Measures

Primary business measures, once measurement is verified:

- Completed paid direct bookings and net revenue attributable to organic landing cohorts, with refunds/cancellations treated consistently.
- Product/booking starts per relevant organic landing visit and checkout completion rate by device.
- Qualified nonbrand clicks for actual available tours and relevant local guides, with brand/informational PDF traffic reported separately.
- Index/canonical health of intended primary pages, and no regression in existing useful ranking pages.

Supporting measures:

- CTR by exact query, rank band, country, device and landing page, not one universal 2% target.
- Field CWV where there is enough data, plus repeatable lab measurements and mobile task completion.
- Broken important links, incorrect prices/dates, inaccessible controls, API failures and customer-contact dead ends.
- Authentic reviews, relevant referring traffic/links and assisted bookings, not raw backlink/word/page counts.

Set numeric uplift targets only after M01/M02. Review technical outcomes immediately; assess search outcomes over several weeks and longer seasonal windows. Do not claim causation from an aggregate ranking/traffic movement alone.

## 8. Release and Verification Checklist

For each implementation batch:

1. Choose ticket IDs and exact ownership boundaries. Read root `AGENTS.md` and current release docs; obtain separate approval for OmniLodge, external account changes or protected legacy-store work.
2. Back up relevant source and owned remote files; record source/metadata baseline, expected differences and rollback. Preserve original WP data and historical reports.
3. Edit source generators/data/templates, not generated captures/output. Add focused tests for new behavior and existing integration/attribution contracts.
4. Verify locally and on staging: public content with/without JS, HTTP/canonical/robots/schema, sitemap, responsive screenshots, keyboard/zoom, live links, forms without messages, consent/UTM behavior without real orders.
5. Obtain content/visual sign-off for visible changes and approval for production promotion. Use a reviewed current live-update publisher, not the initial-cutover script blindly.
6. Verify exact deployed hashes and desktop/Android/iPad clean/HIT cache variants after the appropriately scoped purge. Do not relax failing tests or hide content to meet a visual score.
7. Log the actual change and date in the plan and OmniLodge action log once separately authorized. Record baseline and follow-up cohorts. A logged action is not proof of ranking uplift.

## 9. Decisions Needed Before Related Tickets

| Decision | Tickets | Recommendation |
| --- | --- | --- |
| May the Search Console reporting fixes be implemented/deployed in OmniLodge? | M01/M03 | Separate explicit approval; no OmniLodge release is authorized by this audit. |
| Which services and venues are actually available now? | C02/C05/C07 | Owner/operations confirms facts; keep NYE meeting points TBA until confirmed. |
| Can exact dead legacy URLs be redirected, while leaving functioning Ecwid fallback alone? | T07 | Review a small URL-to-equivalent mapping; no store-wide migration. |
| Which archives have editorial/business value? | T06 | Decide using complete traffic/link evidence, not a blanket index/noindex switch. |
| Who maintains dates, venues, prices, reviews and editorial updates? | C08/C10/G01/G04 | Resolved14 November: KTK team confirms business facts; code maintainer implements reviewed changes. Monthly plus pre/post seasonal checks agreed; [process and remaining review evidence](CONTENT-REVIEW-POLICY.md). |
| Is the owner reopening consent-provider/GTM work? | D08 | Currently deferred; preserve functional controls and documented limitations. |
| Which new markets/languages are supportable? | G03 | Decide only after reliable country/language and booking evidence. |

## 10. Explicit Non-Goals and Cautions

- No guarantee of rankings, traffic or conversion uplift; no assertion the migration had zero SEO effect.
- No mass URL renaming, automatic article deletion, blanket redirects or blanket archive noindex.
- No deletion of the successful Jenga PDF, removal of functional Ecwid fallback or changes to payment/order data.
- No stuffing keywords, generating thin location/keyword variants, bulk AI articles, paid link schemes or review manipulation.
- No unverified self-serving AggregateRating based on copied Google/Tripadvisor/GetYourGuide business totals. Visible platform-linked social proof and Google review-rich-result eligibility are different things.
- No promises that FAQ schema, llms.txt, IndexNow, an SEO plugin, a new framework or a perfect Lighthouse score automatically improves Google rank. Current Google guidance says no special AI-only markup/file is needed for its AI features.
- No unmeasured speed claims. Earlier Lighthouse reports are historical and are not a current field benchmark.
- No secret consent bypass. GSC access and UTM handoff are not permission to ignore privacy choices. The previously declined GTM task is not reopened by this document.

## 11. Primary Guidance Checked for This Plan

These references support the recommendations and limitations; local/site-specific counts come from the evidence files, not these documents. Guidance was checked on November 7, 2026.

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): discovery, useful content, no ranking guarantees and time to assess changes.
- [Google Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query): grouping, row limits, top-row limitations and pagination.
- [Google Search Console Performance report](https://support.google.com/webmasters/answer/7576553?hl=en): metric/grouping interpretation.
- [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): consistent preferred URLs and signals.
- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics): crawling/rendering/indexable content.
- [Google title links](https://developers.google.com/search/docs/appearance/title-link) and [snippets/descriptions](https://developers.google.com/search/docs/appearance/snippet): clear metadata, not exact SERP-output guarantees.
- [Google Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article) and [review-snippet rules](https://developers.google.com/search/docs/appearance/structured-data/review-snippet): accurate eligible markup, no self-serving review shortcut.
- [Google Search data anomalies](https://support.google.com/webmasters/answer/6211453): FAQ rich results stopped appearing May 7, 2026; [documentation changelog](https://developers.google.com/search/updates) records removal of that feature's documentation.
- [Google Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals): real-user loading, responsiveness and visual stability.
- [Google Business Profile local ranking](https://support.google.com/business/answer/7091/?hl=en): relevance, distance and prominence; accurate profile details.
- [Google link-disavow guidance](https://support.google.com/webmasters/answer/2648487): not a routine response to suspicious-link tool labels.
- [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies) and [AI features guidance](https://developers.google.com/search/docs/appearance/ai-features): useful content, no manipulative scaling or special AI-ranking shortcut.

## 12. Progress Log

| Date | Work | Result |
| --- | --- | --- |
| 2026-11-14 | C06/D06, enquiry and individual-quote policy on staging | Owner-confirmed group terms are quoted individually; email replies follow team review, with no fixed SLA. Exactly seven text locations/four bodies change; source2377/build2320/browser354+190/form501 local+origin+normal/Python214/JS175/PHP763+31+NYE143 pass. Full6193 origin/normal/repeat,348 warmed HIT/current119 assets/0 retries.16 cached axe views0 violations/26 incompletes; four current cached390px PNGs equal inspected local versions, not old whole-page identity. [Release and retained diagnostics](enquiry-policy-2026-11-14/README.md). Roadmaps32 verified staging batches; forms/media/metadata/styles and other112 bodies retained. Older private/safety claims, actual inbox assurance and production review remain; no production/commerce/consent change. |
| 2026-11-14 | D06, separately approved production endpoint-only hotfix | One expression in production's own JS now reads the action attribute instead of the shadowed property. Staged SEO/CSS/content are not promoted. Guarded2154+4478 source hashes and4034 metadata rows unchanged;385 candidate/origin/normal browser checks,118 intercepted payloads and backend7 pass. Full1397 origin/normal/repeat checks pass,348 normal MISS then348 HIT,0 HTTP retries. Only99 managed-content/runtime.js cache prefixes purged, excluding home/stores/staging. [Release, backups and retained diagnostics](production-form-hotfix-2026-11-14/README.md), including metadata drift and explicit email-obfuscation comparison limits. Actual inbox assurance remains manual; broader UI and31 SEO batches stay staged. |
| 2026-11-14 | C06/C08/D03/D05, practical costume guide on staging | Source-bound advice replaces stereotypes and unsupported origin claims; native23-link contents, visible focus and fixed16px body/22-18-16px heading hierarchy are verified. Original URL/H1/publication/metadata,49 unique fragments and all10 photo elements retained. Source2375/browser202 local+origin+normal/Python192/JS165/full6193 origin, normal and repeat pass;348 warmed HIT/current119 assets/0 retries. [Release and retained diagnostics](stag-costume-2026-11-14/README.md), including the initial201/202 immediate-position miss, repeat verification and axe limitations. Roadmaps31 verified staging batches; no production/commerce/consent change, medical hold preserved. |
| 2026-11-14 | C06/D05/D06, group planning on staging | Three useful planning introductions and four student feature headings/descriptions replace vague/unsupported promises, keeping original activity sections, full forms, H1, metadata and photos. Native enquiry/next-field links and shared age/ID/start facts verified; no invented group minima/private/deposit/SLA rules. Source2379/browser354 local+normal/form501 local+origin+normal/Python192/JS160/full6193 origin, normal and repeat pass;348 warmed HIT/current119 assets/0 retries. [Release and retained strict-paint limitations](group-planning-2026-11-14/README.md). Roadmaps30 verified staging batches; remaining activity/safety article review and business facts stay open, medical hold and production boundary preserved. |
| 2026-11-14 | C02/C08/D05, established NYE guide on staging | Refreshed five existing sections using official programme, market, transport and resort sources; no invented events, prices, snow or fixed journey guarantee. Original URL/H1/metadata/photos retained; independent sections become H2 with24 exact original-tag PNG controls in the reviewed layout. Source2376/browser212 origin+normal/native27/Python192/JS155 and full6193 origin/normal/repeat pass;348 warmed responses HIT/current119 assets/0 retries. [Release and retained diagnostics](nye-content-review-2026-11-13/ESTABLISHED-GUIDE.md). Roadmaps29 verified staging batches; no production, commerce, consent or OmniLodge change, medical hold preserved. |
| 2026-11-14 | M02/T01, query and landing-page evidence | Two read-only40-GET passes validate all returned query/page pairs for28/90/180/365-day baselines, preserving independent byProperty totals and byPage detail. Input hashes and sanitized aggregates match;12 source contracts cover pagination/precision/privacy. [Interpretation and limitations](search-baseline-2026-11-12/QUERY-LANDING-COHORTS.md): retain homepage/product separation; prioritize the established NYE guide and group-page clarity; no automatic merger, canonical or noindex action. No raw private rows, credentials, UI/account changes, app deployment or production/ranking-gain claim. M02 remains partial; roadmaps28 verified staging batches, no artificial extra website delivery. |
| 2026-11-14 | C01/D05/T04, Contact offer and native directions | Shared regular-crawl facts replace duplicated price/guarantee copy; Contact Us becomes the literal H1 with exact original title pixels. Native directions remain available beside the unchanged purpose3-gated map; email href trimmed, backends and other115 bodies retained. Source2375/browser190 origin+normal/navigation55/form501 origin+normal and full6193 origin/normal/repeat pass,348 warmed responses HIT/current119 assets. [Release and retained diagnostics](contact-details-2026-11-14/README.md). Roadmaps28 verified staging batches; production unchanged, health specialist hold preserved. Existing no-JS Cloudflare email protection remains a documented limitation; no privacy/mail certification. |
| 2026-11-14 | D06, staging enquiry endpoint and recovery repair | Read-only audit identified hidden action inputs shadowing form.action; native submissions now use the correct attribute, preserving backends/recipients/fields. Linked errors, checkbox keyboard access and entered-value contrast verified. Local/origin/normal501 each, source5, visual64, Python192, PHP31/backend7 and attribution136 pass; full6193 normal/repeat, all348 warmed responses HIT/current119 assets. All21 initial form PNGpairs exact; intentional empty-captcha computed-color change separately asserted. [Release and retained diagnostics](contact-recovery-2026-11-14/README.md). Roadmaps27 verified staging batches. No real messages sent; actual mail assurance/inbox ownership and separately requested form-only production decision remain. Production unchanged. |
| 2026-11-14 | C08, current Memorial visitor information on staging | Official-source12-section revision, native contents, neutral photo description and usable directions replace old price/entry assumptions and an inert empty map. Original URL/H1/byline/publication/media and other115 bodies remain exact. Source2376/browser114 twice and full6193 origin/normal/repeat pass;348 warmed responses HIT/current119 assets. Origin2 transport retries retained; normal/repeat0. Staging-only MCP purge, no production/commerce/consent change. [Release evidence](memorial-guide-2026-11-14/RESEARCH.md). Roadmaps26 verified staging batches; held health article unchanged. Separate D06 strict audit now identifies native form.action shadowing; repair and error/recovery verification are next, not certified by broad simulated POST success. |
| 2026-11-14 | G04, owner-confirmed monthly and seasonal review policy | KTK team owns operational facts and recommendations; code maintainer records evidence and implements staging updates. Monthly and pre/post seasonal checks agreed, with the [review checklist and change process](CONTENT-REVIEW-POLICY.md) documented. No automation, reminder, external account or production change. G04 is partial: first recurring review, ongoing evidence and specialist/production approvals remain. |
| 2026-11-13 | C02/G01/D05, remaining guide cutoff; specialist hold confirmed | The guide's single checkout CTA now shares the approved noon cutoff, leaving its current copy/history/metadata exact. PHP143 explicitly inventories all116 content definitions: all9 incoming NYE checkout controls covered and zero after expiry, alongside the separately tested hero. Source2309/local260/live98 twice and full6193 origin/normal/repeat pass;348 warmed responses HIT, all119 assets current. Only the affected staging guide prefix purged. [Release and retained strict-raster differences](nye-content-review-2026-11-13/GUIDE-CUTOFF.md). Owner explicitly keeps the alcohol-health article on [specialist review hold](article-triage-2026-11-13/MEDICAL-HOLD.md); no rewrite/delete/redirect/noindex approval. Roadmaps24 verified staging deliveries; production remains unchanged. |
| 2026-11-13 | C02/G01/D05, approved NYE promotion cutoff on staging | The hero and all eight NYE-page controls switch to next dates TBA / information at 1 January 2027 noon Warsaw. Fresh PHP/no-JS, cached/open-page JS and browser-clock rollback tested without changing availability/bookings. Local lifecycle728, origin325, normal328, source2311 and PHP74 pass; full6193 origin/normal/repeat pass, all348 warmed content responses HIT/current119 assets. Original current geometry/text/styles retained; four strict raster differences documented, not called a pixel pass. Only staging purged through authorized MCP. [Release evidence and stale-no-JS cache boundary](nye-content-review-2026-11-13/PROMOTION-EXPIRY.md). Roadmaps23 verified staging deliveries; wider incoming links, owner review, production/cache planning and the rest of the plan remain. |
| 2026-11-07 | Ahrefs report, read-only production SEO database investigation, live GSC four-window review, URL inspections and 128-URL source audit | Planning/evidence completed. Implementation tickets remain unchecked. No deployment or production state changes. |
| 2026-11-12 | Owner authorized staging-only implementation and requested private GitHub version control before SEO edits | Private source checkpoint uploaded; initial GitHub tests/build and secret scan passed. Source allowlist protects local secrets/backups and preserves exact bytes; no automatic deployment exists. A fresh read-only public baseline received all 128 responses without transport errors; the 77 description gaps and three legacy 404s remain. First website batch will cover URL roles and a small maintainable metadata pilot. M01/M02's full GSC export requirements remain outstanding; no production/OmniLodge changes or search-uplift claim. |
| 2026-11-12 | T05/G01/T10, first staging-only metadata pilot | Eight reviewed descriptions and explicit URL roles now use a validated code-owned data source. All 1,915 staging hashes verified; only eight description fields changed. Local build checks 1,856/1,856 and pilot checks 196/196; live origin and normal MISS/HIT checks 236/236 each across desktop/Android/iPad, with unchanged production controls. Corrected full source/HTTP scan passed 5,848/5,848 across all 116 routes and 119 assets; original email/Clarity harness failures remain preserved. No cache purge needed. See [pilot evidence and remaining work](staging-metadata-pilot-2026-11-12/README.md). These tickets remain unchecked because their full scope is not finished; production still has the original metadata. |
| 2026-11-12 | T03/T10/D07, staging-only discovery preview and indexing guard | Three new staging files preview 119 audited canonical targets (116 homepage/content plus catalog and products28/32), using native XML formatting and no invented dates. One missing-canonical route and 22 catalog products remain for review. Corrected an existing staging storefront index/follow override with staging-only noindex metadata/headers; plugin, production/Ecwid feeds, robots and saved settings unchanged. Local suites112/112 and65/65, final origin171/171 and metadata regression236/236 pass. Original nine stale Cloudflare failures are preserved; after the owner's staging/store2-only prefix purge, normal and repeat checks each pass156/156, with all nine catalog/product device responses MISS then HIT. See [release notes](staging-discovery-2026-11-12/README.md). T03 remains partial: no production discovery cutover or GSC submission. |
| 2026-11-12 | T03/T06/T10, full catalog review and staging preview expansion | All24 public products have final200/self-canonical URLs and staging noindex, but all24 lack initial-HTML H1;16 lack configured copy/inclusions,5 lack API photos. Documented every product decision, shared regular/private copy, expired Halloween dates and conflicting Food Tour tasting counts. Added30/31/37/41 to the no-store preview only:123 targets now verified. Data-only manual update preserves2,162 staging/2,158 production hashes and saved WP state, without cache purges. Python123/123, PHP65/65, origin243/243 and normal/repeat216/216 each pass; all21 reviewed catalog/product variants are HIT on the repeat. Evidence and remaining work are in the [catalog review](staging-catalog-review-2026-11-12/README.md). Team-building self-canonical is already present on staging; production's original missing canonical remains unchanged. Next priority T02; no production discovery/submission, offer rewriting, deindexing or commerce change. |
| 2026-11-12 | Owner-facing roadmap dashboard | [ROADMAP.md](ROADMAP.md) now covers all 40 workstreams with explicit status, next steps, evidence and remaining dependencies. Generated from validated source; no invented time-based completion percentage. Ten workstreams are partial, 29 not started and one consent workstream deferred. No SEO production release has occurred. |
| 2026-11-12 | T02/T08/G01/T10, initial public storefront HTML and native links | All24 products and catalog now have staging-only server-delivered public content and native links, sharing PHP/client fallback data. Local browser matrix811/811, cart regression18/18, frontend54/54, public PHP39/39 and origin contracts692/692 pass. All12 plugin hashes and2,155 protected staging/2,158 production hashes verified; saved WP state unchanged. Scoped optimizer exclusions and a no-JS heading contrast follow-up are included. [Release evidence](staging-public-html-2026-11-12/README.md) preserves original cache/fixture failures, inherited Facebook error and non-identical photo pixels. Final cached verification remains pending; no production, OmniLodge, consent or commerce change. |
| 2026-11-12 | T05/G01/T10, expanded descriptions and discovery bindings | Added68 reviewed descriptions:76 of77 gaps covered on staging; one health-claims article explicitly held. Structured comparison proves68 description-only definitions and unchanged original8/hold/all other page assets. All1,915 deployed hashes and protected state match; origin checks2,208/2,208. Data-only sitemap binding refresh keeps the same123 URLs and preserves2,164 staging/2,158 production hashes; discovery origin243/243. [Expanded description evidence](staging-descriptions-2026-11-12/README.md). Final cache checks remain pending; original page bodies/titles/indexing policies and production remain unchanged. |
| 2026-11-12 | Owner-confirmed staging prefix purge; final public HTML/description/discovery cache verification | Normal/repeat public source692/692 each, with all75 catalog/product device responses HIT on repeat; metadata2216/2216 each, all228 reviewed responses MISS then HIT and8 health-hold controls unchanged; discovery216/216 each, same123 intended targets and21 public variants HIT on repeat. Normal-URL live browser240/240 across32 JS/no-JS views with zero observed errors/mutations; historical failures and third-party caveats retained. The [roadmap](ROADMAP.md) now records four verified foundation milestones; broader tickets remain partial. Source PR5 merged with passing PR/main tests and secret scan. No new application deployment, production/OmniLodge change, saved setting or commerce mutation. |
| 2026-11-13 | T04/T07/T09/D01/M01/M02/M04, larger staging batch and native evidence | Headings/reviewed links verified4320/4320 clean/HIT. Additive115 page/breadcrumb and55 article graphs plus native lazy-photo policy staged; refreshed content4320/4320 twice, actual schema3221/3221 and discovery216/216 pass. Original SVG/photo bytes retained;66 local real-media checks and actual desktop/mobile functional checks pass. Normal mobile lab medianLCP12120ms/CLS0, original vector remains a performance task. Seven foundation milestones verified, no website SEO production release. Separately approved reporting independent totals and date-coverage releases genuinely deployed; browser-Pacific preset follow-up still releasing. Native958-click baseline agrees; Manual Actions/Security none,133 indexed/39 excluded reviewed, no host issues in90 days. Old submitted sitemap404 needs approved production action. All56 articles have explicit preliminary triage, not completed fact checks. No ranking-uplift claim or Google account/submission change. |
| 2026-11-13 | C02/T07/D05 bounded NYE/menu follow-up; M01 complete, M02 expanded | Fresh2405-file checkpoint before changes. Two article bodies repair eight contents links, checkout typo and unsupported event/old-price promises; titles/URLs/publication history/schema/images unchanged. Homepage laptop compact menu/native keyboard/resize/no-JS retention fixed.2031 content and232 homepage file hashes verified on staging, saved WP/storefront unchanged. After owner's staging purge: full origin/normal/repeat4320/4320 each, repeat351 HIT; browser110/110 at14 homepage widths/three routes, handoff31/31, discovery216/216, Python147. M01 latest exact immutable Release43331452337/actual deploy43333310604/public3/3/native agreement completes its acceptance. All returned query rows2211/4368/7836/13807 retained with privacy/display-precision limits and tested brand/variant/other cohorts. Broader content/offer/accessibility/measurement/production work remains; no website production or account/commerce changes. |
