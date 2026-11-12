# Homepage redesign review

Staging review location: <https://krawlthroughkrakow.com/staging/>. Production cutover is a separate task and was not performed. This document records the audit, implemented direction, measured verification and launch requirements.

## Implemented direction and scope

A KTK travel-editorial design: authentic Krakow/guest photography, oversized Oswald display type, pink booking actions, black evening sections and light practical-information sections. The first view now names the product in HTML, shows 120 PLN and the 9 PM start, and links directly to the real booking form. The pink umbrella connects the emotional story with concrete meeting instructions.

The inclusion lists were consolidated; stale counts and #1 claims were removed. One traceable Tripadvisor excerpt replaces unverifiable numerical proof. Maps, video and social integrations are now deliberate external links rather than automatic offscreen embeds. Private crawl, students, NYE and brunch remain secondary journeys. A source-backed FAQ and useful phone/directions links reduce uncertainty without inventing operating policy.

This is still a WordPress-served PHP page, not an independent hosting migration. Divi does not render it. Homepage-only asset cleanup removes unused form/store/block helpers while preserving legitimate consent, Google, Clarity and Meta integrations. The normal storefront plugin, checkout and OmniLodge were not deployed or modified.

### Preview and release

- Review the clean staging URL above on desktop and mobile. Staging page ID remains 278 with `[ktk_homepage]`; no production shortcode page was created.
- Source: `tools/homepage-shortcode-plugin-template.php` plus `staging/wp-content/mu-plugins/ktk-homepage-assets/`. The historical Divi content remains a reference, not a render dependency.
- Offline build: `tools/publish-homepage-shortcode.ps1 --build-only`. Staging release: `tools/publish-homepage-shortcode.ps1 --local-source`. This mode never exports or writes production.
- All 26 deployment files were backed up and SHA-256 verified; renderer was replaced last. Final backup: `deploy-backups/ktk-homepage-shortcode-staging-20261006-104948.zip`.
- Cloudflare APO had separate stale device variants. Only the `krawlthroughkrakow.com/staging/` cache prefix was purged, then desktop/mobile/tablet responses were checked against current asset hashes. Production was verified to still serve the original Divi page with HTTP 200.
- There is no `.git` repository in this workspace. The local pre-change checkpoint is `deploy-backups/homepage-redesign-local-before-20261006.zip`; no feature branch or worktree was created.

### Booking and measurement

All six primary positions (header, hero, inclusions, final band, footer, mobile sticky) use `/staging/store2/pub-crawl-28/#book`. The PHP helper will use `/store2/pub-crawl-28/#book` when genuinely deployed under the production WordPress home URL. These are normal links, not mock booking controls.

Attribution retains the existing `trk_utm_*`, `trk_gclid`, `trk_gbraid` and `trk_wbraid` storage contract and decorates only same-origin store links, without an extra backend request. URL values still work when storage is unavailable. The consent-gated `ktk_homepage_booking_click` dataLayer event identifies CTA position/product, not a booking or purchase; existing checkout conversion logic is untouched.

Repeated body offer facts come from `ktk_homepage_offer()`, a product-28 snapshot verified on 6 October 2026. No new runtime API dependency was added. Recheck that snapshot and metadata when operating details/prices change.

### Screenshots

| Actual browser render | Before | After |
| --- | --- | --- |
| Mobile hero, 390px | [Before](homepage-redesign/before-390-hero.png) | [After](homepage-redesign/after-390-hero.png) |
| Desktop hero, 1440px | [Before](homepage-redesign/before-1440-hero.png) | [After](homepage-redesign/after-1440-hero.png) |
| Complete mobile page | [Before](homepage-redesign/before-390-full.png) | [After](homepage-redesign/after-390-full.png) |
| Complete desktop page | [Before](homepage-redesign/before-1440-full.png) | [After](homepage-redesign/after-1440-full.png) |

Additional 360px/768px captures, fresh-consent views and interaction evidence are in the same artifact folder.

## Complete initial section inventory

Read from `ktk_homepage_static_body()` and its header/footer output before replacement on 6 October 2026. The prior content is still available in the deployment backup and exported MU content file.

| Existing section / component | Useful content and conversion role | Disposition in the redesign |
| --- | --- | --- |
| Header, logo, desktop dropdowns and mobile menu | Brand recognition, joining/help links, secondary journeys and booking | Keep identity and destinations; simplify primary navigation and give booking a predictable place. Relocate lower-priority editorial/job links to footer. |
| Poster hero (`ktk-hero`) | Authentic crowd image and immediate emotional cue | Replace poster-led composition with real event photography plus an HTML product H1, verified offer essentials and primary booking action. |
| Hero floating Book Now | Persistent conversion shortcut | Replace with coherent responsive booking control; account for consent widget and phone safe areas. Remove the conflicting legacy WPCode CTA from this template only. |
| Intro eyebrow, H1, lead and Book ticket | Explains pub crawl, guides, drinks and social benefit | Merge core offer into hero; rewrite superlatives into a clear promise. |
| Intro inclusions panel and Reserve your spots | Open bar, shots, venues, guides/photographer, games | Keep one authoritative inclusion section with actual product facts. Avoid repeating the entire list later. |
| Intro three-photo gallery | Visual proof of guests and atmosphere | Redistribute selected authentic photos into the hero, evening sequence and social story. Use responsive images and meaningful crops. |
| Gallery mini facts (nightly / price) | Schedule and affordability | Elevate verified price and time into first-screen facts shared with later booking copy. |
| Pink strip: time/place, #1, late-arrival phone | Meeting reminder, claimed authority and support | Keep time/place and phone in practical meeting content; remove unverified ranking. |
| Six-item feature grid | Venues, open bar, shots, entry fees, games and guides | Merge with inclusions and the evening sequence. Remove six decorative bitmap icons and duplicated copy. Keep 4-5 venues consistent with active configuration. |
| Story text, image, booking CTA | Brand/history and emotional appeal | Rewrite around hosted social experience and real pictures. Remove unverified #1/best claims and excessive-drinking pressure. |
| Tripadvisor/Google proof cards | Reassurance before purchase | Bring credible platform evidence nearer the decision. Remove inconsistent stale counts; retain traceable links and only sourced excerpts. |
| Experience heading and four-photo social grid | Shows what joining feels like | Keep curated real photography, avoid an auto-loading social widget. Preserve Instagram destination. |
| Krawl with us text + Vimeo iframe | Explains hosts and atmosphere | Merge useful reassurance into the guest/guide story. Replace automatic iframe loading with a deliberate useful link/preview, or omit embed if not needed. Do not promise absolute guest safety. |
| Student trip banner | Secondary group enquiry | Move into concise secondary journeys after the main product story; preserve student-trip page. |
| Google map + Ready to party / price / booking | Practical location and final conversion | Make verified landmark/time/pink umbrella explicit, give directions and support. Use a lightweight location image or link; avoid requiring an iframe to find the meeting point. |
| Brunch image/text/booking | Cross-sell | Keep secondary discovery, link to current brunch product; do not reuse legacy description details unless verified. |
| Footer social column | Instagram/Facebook/TikTok/YouTube proof and follow-up | Retain useful official profiles as simple links. |
| Footer contact column | Phone and email support | Keep tap-to-call and email. |
| Footer information/legal column and copyright | Terms, privacy, disclaimer, FAQ and ownership | Retain links and add displaced useful navigation destinations without overcrowding the header. |
| Consent UI and site integrations | Consent, legitimate measurement and attribution | Preserve actual integrations and consent states; remove unrelated homepage assets only after dependencies are checked. |

## Important existing destinations

Keep established pages accessible: `/about-us/how-to-join/`, `/about-us/`, `/gallery/`, `/testimonials/`, `/faqs/`, `/blog/`, `/krakow-nightlife/`, `/pub-crawl-drinking-games/`, `/student-trips-poland/`, `/stagshens/`, `/other-tours/`, `/contact/`, `/meeting-point/`, `/pub-crawl-jobs/`, `/new-years-eve/`, `/terms-and-conditions`, `/privacy-policy/`, and `/tour-service-disclaimer/`.

Current product destinations are documented in [the fact register](homepage-redesign-facts.md). The initial page mixed `/store2/pub-crawl-28/#book` booking links with a legacy floating `/staging/store/Krakow-Pub-Crawl-with-Krawl-Through-Krakow-p637047413` link; brunch also pointed into legacy `/store/`. New primary CTAs should use one environment-aware current product path, preserve `#book` and attribution, and work without JavaScript. Do not redirect old established URLs as a side effect of a homepage redesign.

## Initial rendered audit

Evidence: [before-audit.json](homepage-redesign/before-audit.json), generated by `tools/audit-homepage.mjs` at 12:04 Warsaw time on 6 October 2026. Screenshots cover actual rendered widths of 360, 390, 768 and 1440 pixels, with both initial consent and dismissed-consent states. Full-page captures scroll the page to load lazy media. Visual screenshots use DPR 1; performance uses the separate DPR 2 context described below.

The initial page had one H1, one staging self-canonical, `noindex, nofollow`, no meta description, no recorded page JavaScript errors, no broken loaded images and no horizontal overflow at those four widths. Those observations are limited to this run; they are not full accessibility certification.

Representative evidence: [mobile before](homepage-redesign/before-390-full.png), [desktop before](homepage-redesign/before-1440-full.png), [mobile initial consent](homepage-redesign/before-390-initial.png).

### Comparable navigation baseline

Headless installed Chrome via Playwright; fresh browser context; cache disabled; 390x844 viewport, DPR 2, mobile/touch; 1.6 Mbps download, 750 Kbps upload, 150 ms latency, 4x CPU slowdown. No consent choice, no scroll or interaction in the performance context. Observe until 12 seconds after DOMContentLoaded. Origin/CDN cache is not controlled, so server response can vary between runs.

| Measurement | Before | After |
| --- | ---: | --- |
| TTFB | 638 ms | 232 ms |
| FCP | 3,260 ms | 1,916 ms |
| LCP | 8,040 ms | 1,916 ms |
| Observed layout-shift sum | 0.00735 | 0.00084 |
| Long-task excess above 50 ms, summed | 1,626 ms | 2,267 ms |
| Requests observed | 51 | 25 |
| Completed encoded response bytes recorded | 1,543,556 B | 918,185 B |
| Same-origin response bytes | 987,362 B | 421,752 B |
| Other-origin response bytes | 556,194 B | 496,433 B |
| Same-origin external JS bytes | 326,325 B | 215,871 B |
| Other-origin external JS bytes | 505,642 B | 495,859 B |
| Font response bytes | 45,483 B | 60,688 B |
| Hero response bytes | 91,494 B | 65,080 B |

These are CDP encoded transfer observations, including headers where reported. Three collection fetches did not have recorded completion bytes. Inline JS/CSS are part of the HTML response; external-CSS response bytes alone are not the total homepage CSS budget. Same-origin `/9z78/` is a 202,617-byte Google-tag serving resource, so origin is not equivalent to code ownership. Treat transferred totals as lower bounds within this observation window, not all-session totals. This script's long-task sum is not Lighthouse TBT and is not INP. Its CLS observer sums layout shifts rather than calculating the formal maximum session window, so report it as the script's lab observation.

The hero was the observed LCP element. Seventeen image requests (631,656 B), including numerous offscreen images/icons, competed with scripts during the initial run. Contact Form 7, Ecwid, jQuery/Migrate, WordPress hooks/i18n, Iubenda form handling and WP Rocket helpers appeared despite no homepage form or embedded store. Those are candidates for scoped dependency review. Consent/Google/Clarity/Meta costs must stay visible in reporting, including denied-consent behavior.

Supplementary evidence: [before Lighthouse report](homepage-redesign/before-lighthouse.report.html), JSON in the same directory, Lighthouse 12.8.2 at 12:21 Warsaw time. Simulated mobile 412x823 DPR 1.75, RTT 150 ms, throughput 1638.4 Kbps, CPU multiplier 4, fresh browser storage/consent. Corrected CLI quoting produced all four categories: Performance 53, Accessibility 91, Best Practices 79, SEO 61. This is a different measurement setup from the CDP table above.

No field Core Web Vitals, conversion baseline, rankings or Search Console traffic are established by these artifacts.

### Final Lighthouse results

Three consecutive quiet runs used the same Lighthouse 12.8.2 mobile configuration as the baseline: 412x823, DPR 1.75, simulated 150 ms RTT / 1638.4 Kbps / 4x CPU, fresh browser storage and no consent choice. Other browser automation was stopped. The clean staging URL was warm in Cloudflare for the final actual mobile User-Agent. All final responses had CSS `61770a3287da` and JS `509c61fb9c41`.

| Lighthouse measurement | Before, one run | After, median of three |
| --- | ---: | ---: |
| Performance score | 53 | 48 |
| Accessibility score | 91 | 100 |
| Best Practices score | 79 | 100 |
| SEO score | 61 | 69 |
| FCP | 3.3 s | 2.19 s |
| Simulated LCP | 9.4 s | 9.35 s |
| Total Blocking Time | 500 ms | 1,234 ms |
| CLS | 0 | 0.00016 |
| Speed Index | 5.2 s | 3.28 s |
| Requests | 46 | 28 |
| Recorded transfer | 1,192,618 B | 1,123,432 B |

The three performance scores were **48, 46, 52**, not a cherry-picked best run. [Aggregate and exact conditions](homepage-redesign/lighthouse-quiet-summary.json), [run 1](homepage-redesign/after-lighthouse-quiet-1.report.html), [run 2](homepage-redesign/after-lighthouse-quiet-2.report.html), [run 3](homepage-redesign/after-lighthouse-quiet-3.report.html). Earlier concurrent-run and draft reports are retained as diagnostic evidence, not used for the final median.

**The 95+ performance target is not achieved.** The page's own assets are lean, but Iubenda and Google execution dominate main-thread blocking. In quiet run 1, Iubenda accounted for about 859 ms of attributed blocking and external GTM for about 178 ms; the same-origin Google gateway additionally transfers about 203 KB of compressed JavaScript. The old cached baseline loaded substantially less Google runtime, despite the same fresh-consent test setting. Host benchmark also varied (baseline 2152.5 vs after median 1958.5). These are honest observations of the delivered pages, not a controlled claim that the visual redesign caused every timing difference.

The direct CDP and Lighthouse simulated results answer different questions: the direct run observed the image rendering in 1.92 seconds; Lighthouse's simulated constrained-device model penalizes the heavier script execution. Do not substitute the better number for the simulated LCP, claim real-user INP, or declare the site faster than competitors. Required functionality was not disabled to improve the score. Before production, a focused consent/tag-runtime review with the analytics owner is the highest-value remaining performance task: verify the Google gateway/GTM/direct-tag responsibilities and the consent loader's execution cost before changing timing or removing tags.

### Budget results

| Provisional budget | Final result | Status |
| --- | --- | --- |
| Initial first-party JS <=100 KB compressed | Own homepage JS 1.92 KB gzip; about 2.4 KB transferred with headers. All same-origin JS about 216 KB, mainly Google's gateway | Own code passes; strict origin-based budget exceeds target |
| Homepage CSS <=50 KB compressed | 4.68 KB gzip, about 5.1 KB transferred | Pass |
| Initial fonts <=100 KB | Two local WOFF2 fonts, 59.4 KB raw / about 60.7 KB transferred, no duplicate preload | Pass |
| Mobile hero <=200-250 KB | 848px crop 64.4 KB raw / about 65.1 KB transferred | Pass |
| Initial mobile transfer <=1 MB, including required third parties | 0.918 MB direct CDP observation; 1.123 MB median Lighthouse | Not consistently met; Lighthouse exceeds by about 12% |

Neither origin nor host name proves code ownership: `/9z78/` is Google functionality served under the site host. Remaining cached-page helpers include Meta's signal script, Cloudflare email decoding and WP Rocket's lazy-load post-processing; those are reported, not claimed to be the new homepage bundle. Third-party costs remain included in both audit totals.

## Final verification

- Actual renders inspected at 360, 390, 768 and 1440px, including hero crops, below-fold images, headings, meeting section and footer. No recorded missing images, horizontal overflow or uncaught page errors in the final visual run. [Final audit](homepage-redesign/after-audit.json).
- Native FAQ disclosure controls, reduced motion, visible keyboard focus, menu first-link focus, Tab progression, Escape restoration and closing on focus departure were exercised. 200% CSS zoom passed at 390px and 1440px. This is targeted WCAG 2.2 AA work, not a claim of formal accessibility certification.
- Real Iubenda Reject/Accept choices updated the observed Google consent state and Clarity bridge correctly. Reopening preferences hides the sticky bar; the floating consent control is positioned clear of it. The SVG-node mutation error found during this test was corrected.
- All primary CTA paths and fragments match the intended product. Existing query attribution, including Google's legitimate `_gl` linker parameter, is permitted and preserved. Blocked localStorage and JavaScript-disabled direct booking navigation were verified. Secondary product destinations were checked against the active catalogue.
- The real booking page displayed 14 form controls in **1,651 ms** in the unthrottled final interaction run. No customer details were entered, no order/cart/payment mutation was sent, and no API error was observed. This handoff timing is a single lab observation, not a production percentile.
- [Full interaction run](homepage-redesign/interaction-audit.json): 53 passes plus one overstrict test that rejected a valid Google linker query parameter. After correcting the assertion, [focused navigation rerun](homepage-redesign/interaction-navigation-final.json) passed 24/24. No unresolved application failure remains from these tests.
- PHP renderer/content/integration syntax, JavaScript syntax, five publisher regression tests, PHP integration tests and the actual consent bridge's VM tests passed. The tests cover route-only cleanup, dependency preservation, metadata uniqueness and default-deny/grant/withdrawal behavior.
- One H1, title, description, absolute self-canonical, viewport and three-node JSON-LD graph are delivered in initial HTML. No review aggregate or invented business address. JSON parses and local structural assertions pass; this is not a claim that an external rich-result validator awarded eligibility.
- Staging has `noindex, nofollow` in both HTML and `X-Robots-Tag`. The only failing final Lighthouse SEO audit is deliberate non-indexability. Root `robots.txt` permits crawling (only `Crawl-Delay: 20`), so it does not prevent discovery of this noindex directive. Production's current page sitemap contains the homepage and no `/staging/` URLs among its 24 page entries. Recheck at cutover.

## Unresolved owner facts

The homepage does not invent these missing details: regular-crawl minimum age/required ID, total hosted duration, or a stronger rescheduling promise. Confirm them before adding such copy. Current review totals remain inconsistent, so no numerical rating/count is shown. Existing legacy FAQ pages still contain conflicting older prices and should be reviewed as a separate content task. No additional photo is required for this implemented design; all imagery is authentic KTK material with [provenance](../tools/homepage-image-sources.md).

## Structured data decision and official references

An `Organization`, `WebSite` and `WebPage` graph is a modest, accurate foundation here. Link nodes with stable IDs, make the homepage part of the website, and use verified organization name, canonical URL, logo, contact details and official social profiles. Keep any visible offer facts consistent with the page. Do not label the meeting monument as the company's address.

- [Google Organization guidance](https://developers.google.com/search/docs/appearance/structured-data/organization): organization data may live on the homepage, only applicable properties should be included, and no organization properties are mandatory. An unverified physical address can be omitted. Use the most specific truthful subtype if one is later confirmed.
- [Schema.org Organization](https://schema.org/Organization), [WebSite](https://schema.org/WebSite) and [WebPage](https://schema.org/WebPage): support the organization/site/page distinction and page-to-site relationships. These types do not imply a tour booking or review rich result.
- [Google site names](https://developers.google.com/search/docs/appearance/site-names): use one coherent `WebSite` node with `name` and the canonical domain-root URL at launch. The `/staging/` subdirectory is not independently eligible for Google's site-name feature; staging is for preview/validation. Avoid duplicate plugin and custom website nodes.
- [Google review snippet guidance](https://developers.google.com/search/docs/appearance/structured-data/review-snippet): self-serving Organization/LocalBusiness reviews are ineligible for review stars, including third-party widgets controlled by the reviewed business. Do not manufacture an aggregate across platforms.
- [Schema.org TouristTrip](https://schema.org/TouristTrip): a tour-specific semantic type exists, but adopting it is optional and does not establish a Google rich-result feature. There is no need to force Product or Event markup into this homepage.
- [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): markup should represent visible, accurate content; valid markup does not guarantee search features. Keep the human FAQ without adding FAQPage merely for rich results.

These sources were inspected for the implementation decision; they are not evidence that the eventual generated JSON-LD has already passed a validator.

## Production launch checklist

These are future tasks, not completed actions. No production cutover is authorized by the redesign request.

- Review staging design and verified offer; confirm age/ID, total duration and rescheduling wording if those details are to be added.
- Back up the production homepage/plugin and record the rollback path before promotion. Verify production uses its own correct environment paths and does not depend on staging files.
- Serve the redesigned homepage at `https://krawlthroughkrakow.com/` with HTTP 200, one title, description and absolute self-canonical. Check Open Graph URLs/images and all JSON-LD IDs for consistent production references.
- Remove staging-only noindex from the production response only; retain staging's effective noindex. Check both headers and HTML. Google must be able to crawl a public noindex page to see its directive; [robots.txt blocking alone is not equivalent](https://developers.google.com/search/docs/crawling-indexing/block-indexing). Inspect existing robots rules rather than globally changing WordPress indexing settings.
- Confirm production sitemap contains the production homepage and excludes `/staging/`; preserve established URLs and use an explicit redirect plan for any later URL changes.
- Check every primary CTA reaches production `/store2/pub-crawl-28/#book`; secondary CTAs must retain their specific journeys. Verify a real product form loads and attribution survives without placing an order. Recheck mobile menu, FAQ, directions, phone, email and sticky/consent coexistence.
- Verify consent absent/rejected/accepted states, single initialization of each required integration and no duplicated purchase event. Keep CTA clicks distinct from checkout starts and confirmed purchases.
- Clear only relevant origin/CDN homepage caches, then test cached and uncached responses, actual image variants, compression and content hashes. Never cache personalized checkout responses.
- Repeat documented mobile/desktop lab checks with the same consent and throttling setup; record whether the provisional 100 KB JS, 50 KB CSS, 100 KB fonts, 250 KB hero and 1 MB initial transfer targets are met and identify third-party exceptions.
- Validate JSON-LD syntax and visible facts, inspect indexability in Search Console after launch, and use live URL inspection. Ranking changes, rich results and site-name selection are not guaranteed by these checks.
- Establish production field measurement segmented by mobile/desktop, monitor p75 LCP/INP/CLS over a meaningful observation period, and compare homepage CTA, product-form-ready, checkout and purchase stages. Investigate drop-offs without treating clicks as sales. Keep staging lab observations separate from field data.

