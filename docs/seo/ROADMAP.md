# SEO Roadmap And Progress

Updated: 2026-11-12 (Europe/Warsaw). Generated from `tools/seo-roadmap.json`; edit that source, not this page.

## Where We Are

**Current work:** T02/T05/T08: public storefront HTML, native links and 76 reviewed descriptions deployed to staging; final cache checks pending.

**Verified foundation milestones:** 2. **New SEO production releases:** 0. The original website migration is a separate completed project, not counted as SEO implementation.

| Full-Plan Status | Workstreams |
| --- | --- |
| In progress / partial staging | 10 |
| Not started | 29 |
| Deferred | 1 |
| Total | 40 |

These are unequal-sized workstreams, not a time-based percentage. Partial work is not counted as finished. A ticket remains open until its full acceptance criteria, approvals, deployment and applicable verification are complete. Recurring reviews continue after launch.

## Delivery Milestones

| Milestone | Status |
| --- | --- |
| Private GitHub source control and checks; manual deployments retained | Verified in repository |
| 76 reviewed page descriptions and maintainable metadata source; one health-content hold | Deployed on staging; cache checks pending |
| Sitemap preview, staging indexing guard and complete catalog review | Verified on staging |
| Public HTML for all 24 products and catalog; shared content and native links | Deployed on staging; cache checks pending |
| Remaining metadata, semantic headings, internal links and broken destinations | Not started |
| Verified content refreshes, performance, accessibility and measurement | Not started |
| Owner approval, guarded production promotion and Search Console follow-up | Not started |

## What Still Needs To Happen

1. Finish cache verification for the deployed public HTML and 76 descriptions; continue headings, contextual links, structured data, media, accessibility and performance. Preserve established URLs and commerce.
2. Confirm missing operational facts, refresh useful existing guides and secondary offers, and complete measurement/account investigations.
3. Obtain owner sign-off and separate production approval, use a guarded updater, verify device/cache variants, then inspect and submit approved discovery changes in Search Console.
4. Measure qualified visits and completed bookings over comparable periods; maintain seasonal content, reviews, security and monitoring.

**Dependencies:** OmniLodge changes require separate approval; Google/Search Console/Business Profile work needs the correct account access; missing offer facts need confirmation; consent work stays deferred. No calendar finish date or ranking uplift is promised.

## Every Workstream

Acceptance criteria and research: [full improvement plan](SEO-AND-WEBSITE-IMPROVEMENT-PLAN.md).

| ID | Priority / Effort | Work | Status | Progress / Next Step |
| --- | --- | --- | --- | --- |
| M01 | P0 / M | Fix OmniLodge Search Console reporting: independent whole-property/date totals; paginated detailed rows with explicit coverage; exact-query vs substring groups; metrics aligned to the displayed page; separate query/page aggregation; filters by country/device/search type; no-data vs truncated flags. Label heuristic recommendations. | Not started | Requires separately authorized OmniLodge reporting work. |
| M02 | P0 / S | Establish dated SEO baseline and annotate homepage/content releases separately. Export complete available 28/90/180/365-day data and comparable prior-year periods; split brand/nonbrand, UK/Poland/other markets, mobile/desktop, commercial/editorial/PDF/legacy pages. | Not started | Read-only baseline exists; complete comparable native GSC exports remain. |
| M03 | P1 / M | Verify the full measurement funnel: landing -> named booking CTA -> product -> booking start -> payment completion -> revenue. Keep journey history and UTM handoff; distinguish direct/organic/paid/Google booking integrations. Avoid counting button clicks or failed payments as purchases. | Not started | Full funnel reconciliation and consent-aware measurement review remain. |
| M04 | P1 / S | Check native GSC Page Indexing, Crawl Stats, submitted sitemaps, Manual Actions and Security Issues; inspect representative page types after Google's next crawl. Configure meaningful failure alerts/weekly review, not a noisy total-keyword scoreboard. | Not started | Native GSC coverage, actions and monitoring still need account review. |
| T01 | P0 / M | Write an intent-to-URL map: homepage = brand/main Krakow pub crawl; store2 product = details/booking; nightlife hub = advice; NYE sales page = current event; guides = informational. Review real overlaps before consolidation. Preserve clean canonicals for attribution/query variants and normal www/HTTPS redirects. | In progress / partial staging | Core URL roles and catalog decisions recorded; overlap investigation remains. |
| T02 | P1 / L | Deliver useful storefront title, H1, description, inclusions, images and indexable product links in initial HTML, using the same public product source as hydration/metadata/schema. Start with pub crawl and NYE, then the active catalog. No crawler-only content. | In progress / partial staging | All 24 products and catalog have initial public HTML on staging; final cache checks and production approval remain. |
| T03 | P0 / M | Make a code-owned sitemap layer consistent with the explicit content registry and intended catalog: final HTTPS canonical 200 URLs only, accurate change dates, no UTM/cart/staging/aliases. Remove redirect/noncanonical entries from owned feeds. Add sitemap discovery in robots.txt. | In progress / partial staging | 123-URL no-store staging preview; production/legacy-feed cutover and submission remain. |
| T04 | P1 / M | Normalize heading hierarchy without redesign: one clear primary page heading as a project convention; lower/footer headings become appropriate H2/H3 or nonheading text; give archives useful descriptive H1s and fix the newsletter article. | Not started | Sitewide homepage/footer/archive heading cleanup remains. |
| T05 | P1 / M | Add reviewed per-page SEO overrides: distinct descriptive titles, missing descriptions, canonical/robots policy, Open Graph/social cards and images. Start with core/NYE/local guides, then remaining content. Preview real snippets, not fixed character-count targets. | In progress / partial staging | 76 of 77 description gaps addressed on staging; one health-claims article held. Final cache checks, titles/social cards and production remain. |
| T06 | P2 / M | Decide archive indexing case by case. Enrich useful categories; review thin tag/author/Uncategorized pages; differentiate paginated titles and retain crawlable pagination. Review the missing canonical on `/krakow-team-building-activities/`. | In progress / partial staging | Missing-canonical article investigated; archive indexing decisions remain. |
| T07 | P1 / S-M | Recover genuine broken destinations; remove avoidable redirect chains and stale image/external URLs. Check `/student-trips-and-parties/` -> `/student-trips-poland/`, `/2019/09/05/2681/` -> current Auschwitz article, and old brunch URL -> current brunch offer for equivalence. | Not started | Three historical destination mappings need equivalence review. |
| T08 | P1 / M | Improve meaningful internal links and navigation for stag, hen, student, nightlife guides and related products. Use clear anchors, breadcrumbs and relevant related articles. Validate the apparent isolated Terms page as part of trust/checkout links. | In progress / partial staging | All 24 catalog products now have native links in initial/client HTML. Broader contextual links and the full rendered graph remain. |
| T09 | P1 / M | Validate structured data: consistent Organization/WebSite identity, Article/BlogPosting + author/date/image for articles, BreadcrumbList, and accurate applicable offer/event data. Recheck the three old schema validation warnings. | Not started | Sitewide structured-data identity and accuracy audit remains. |
| T10 | P1 / M | Add SEO regression checks for HTTP status, canonical, robots, initial content, metadata, schema, internal destinations, sitemap and desktop/mobile cache variants. Include meaningful 404s and guarded routing. | In progress / partial staging | Metadata/discovery/indexing/source guards exist; broader regression coverage remains. |
| C01 | P1 / M | Strengthen homepage and main product for pub/bar crawl in Krakow using natural language, actual inclusions, meeting details, guide credentials, original photos, FAQs and clearly placed booking controls. Keep brand visible and preserve the owner's no-price-in-hero instruction; show accurate prices where customers compare/book. | Not started | Main-offer editorial improvements beyond technical rendering remain. |
| C02 | P1 / M | Prioritize NYE now: align `/new-years-eve/`, NYE guide articles and product 32. Confirm December 31, 2026 / welcome 2027, 5:00 PM and 7:30 PM, 250 PLN, meeting points TBA. Distinguish old-event gallery labels from confirmed venues. Test countdown/expiry/next-campaign behavior. | Not started | Full NYE sales/guide consistency and campaign lifecycle audit remain. |
| C03 | P1 / M-L | Refresh the existing `/krakow-nightlife/` hub with a useful, locally verified overview: districts, types of venues, costs with checked dates, opening patterns, practical transport/safety and choices for different visitors. Review existing 2020 guide, `/party-krakow/`, clubs and dating/singles articles before creating anything new. | Not started | Nightlife hub needs current locally verified facts. |
| C04 | P1 / M | Refresh `/wheres-the-cheap-places-to-drink-in-krakow/`, a repeated near-top opportunity: verified venues, current sample PLN prices, districts, happy-hour conditions and dates, original photos and context. | Not started | Budget-drinks guide needs verified current venues and prices. |
| C05 | P1 / M-L | Update techno, jazz, Irish bars, live music, nightclubs, Kazimierz and shot-bar guides. Verify venues still operate and match claimed music/hours/admission; add concise comparison tables/maps and original local recommendations. Review duplicate techno articles first. | Not started | Music and venue guides need source verification and duplicate review. |
| C06 | P1 / M | Improve stag/hen/student-trip pages around actual group questions: group size, private vs public, lead times, confirmed inclusions, coordination, terms and enquiry path. Connect existing stag-prank/costume/safety articles. | Not started | Group planning pages need confirmed operational detail. |
| C07 | P2 / M-L | Build/refresh crawlable offer information for vodka tasting, boat party, brunch, shooting range, food/brewery tours and other genuinely available products; connect related articles to current store2 destinations. Rank by business margin, availability and evidenced demand. | Not started | Catalog audited; 18 preview holds and missing offer facts are documented. |
| C08 | P2 / M | Audit all 56 articles: keep, refresh, differentiate, consolidate or retire with a recorded reason. First compare duplicate games, NYE, techno and dated 2019/2020 topics. Verify medical/safety-like claims and remove dangerous or misleading advice. | Not started | 56-article editorial keep/refresh/consolidate review remains. |
| C09 | P2 / M | Preserve `/wp-content/uploads/2020/04/Jenga.pdf` and its useful backlinks. Evaluate a complementary accessible HTML games guide, PDF attribution and relevant internal CTA. Differentiate `/best-drinking-games/` and `/pub-crawl-drinking-games/` only where their intents justify it. | Not started | Preserve games PDF and review related HTML intents before changes. |
| C10 | P1 / S-M | Strengthen trust: clear operator identity, team expertise, since-2008 history, real photos, contact and meeting-point information, accurate terms/cancellation policies, visible platform-linked reviews. | Not started | Full trust/operator/terms/review-source consistency review remains. |
| D01 | P1 / M | Measure images actually downloaded on mobile/desktop; generate appropriately sized WebP/AVIF where useful, correct srcset/sizes, dimensions and meaningful alt text. Keep above-fold content eager and below-fold media lazy. Include CSS backgrounds and large statue SVG complexity in profiling. | Not started | Responsive media transfer and format measurements remain. |
| D02 | P1 / M-L | Profile current homepage/product/NYE/article templates with isolated Lighthouse/DevTools and real CWV where available. Reduce unused captured CSS, duplicate font work, long tasks and unnecessary third-party execution carefully. Evaluate cache/API response reliability separately. | Not started | Comparable lab and available field-performance baselines remain. |
| D03 | P1 / M | Run keyboard, screen-reader and mobile/zoom audits: headings, focus, menu/FAQ/gallery semantics, labels, form errors, touch targets and contrast. Review the 212 missing-alt image occurrences in article source; keep intentionally decorative alt empty. | Not started | Full keyboard, screen-reader, zoom and image-alt audit remains. |
| D04 | P1 / M | Inspect real booking friction: date/slot selection, guest counts, add-ons, discount replacement, total transparency, cart editing/Undo and payment errors. Use existing journey data/consented Clarity, plus isolated test fixtures. | Not started | Full booking-friction review; no unapproved live purchases. |
| D05 | P1 / S-M | Make meeting/how-to-join information easy to act on: exact regular meeting instructions, current time, accessible directions and fallback textual address when embeds are blocked. Keep NYE TBA distinct. Check floating CTA visibility and overlap on key scroll/zoom states. | Not started | Meeting/CTA/blocked-embed usability across page types remains. |
| D06 | P2 / M | Audit lead/contact paths and response expectations for group enquiries/jobs/contact. Keep existing form backends for now, test validation/feedback without sending real messages, and assess spam/accessibility needs. | Not started | Form usability/spam/response review remains; keep current backends. |
| D07 | P1 / M | Monitor availability and access: bot protection on pages/fonts/APIs, API fallback, broken assets, useful errors, security updates, backups and tested rollback. Retain WordPress/plugin maintenance while those components remain. | In progress / partial staging | Staging indexing guard and protected rollback checks exist; monitoring remains. |
| D08 | Deferred / M | Record consent and tracking readiness as a separate dependency, not an SEO growth shortcut. Existing saved-rejection cookie timing issue is documented in shared-integrations evidence. Keep functional Accept/Reject and existing bridge; owner previously declined GTM work. | Deferred | Consent work explicitly deferred; preserve functional controls. |
| L01 | P1 / S-M | Audit owner-controlled Google Business Profile: category/identity, service/contact details, hours, booking URL, photos and consistency with website. Identify where the Google/Booking/Search UTM product URL in GSC originates; preserve legitimate attribution. | Not started | Google Business Profile requires owner-controlled account review. |
| L02 | P1 / S | Use a consistent authentic post-experience review process across Google/Tripadvisor/GetYourGuide; respond usefully and refresh website snapshots through one source. | Not started | Authentic ongoing review process and snapshot ownership remain. |
| L03 | P2 / M | Pursue useful hostel/hotel/university/travel/venue partnerships and original local resources worth citing. Audit existing useful wikiHow/Culture Trip/KrakowBuzz/Stoke Travel/Seeker destinations for preservation. | Not started | Partnership/outreach work requires owner coordination. |
| L04 | P2 / M | Review suspicious historical backlinks and source context; check native GSC Manual Actions before considering disavow. Recover the two specific broken-linked destinations where equivalent. | Not started | Backlink context and native Manual Actions review remain. |
| G01 | P1 / M | Create a reviewed code-owned SEO/content data layer for overrides and shared facts: offer identity, times, meeting points, canonical/robots, descriptions, review snapshots and editorial review dates. Do not hand-edit generated capture output. | In progress / partial staging | Reviewed metadata/discovery sources exist; shared facts/editorial data remain. |
| G02 | P1 / M | Establish a safe live-update release procedure: pre-edit backup, small scoped source change, local QA, staging, owner sign-off, reviewed production updater and device-aware cache verification. | In progress / partial staging | Guarded staging releases exist; current production updater/sign-off remain. |
| G03 | P3 / L | Evaluate translations only after real country/language/booking evidence. Use genuinely translated useful pages, supported customer operations and correct hreflang if approved. | Not started | Translations need a demand/operations case before implementation. |
| G04 | P2 / S recurring | Assign content/campaign owners and a monthly review cadence; verify seasonal facts before launch, after expiry and before rollover. Maintain a small measured query set in Ahrefs Rank Tracker if desired; it was empty on November 4. | Not started | Assign owners and recurring review cadence; ongoing after launch. |

## Evidence

- [Eight-page metadata pilot](staging-metadata-pilot-2026-11-12/README.md).
- [Expanded descriptions: 76 covered, one hold](staging-descriptions-2026-11-12/README.md).
- [Public storefront HTML and progressive handoff](staging-public-html-2026-11-12/README.md).
- [Discovery and staging indexing guard](staging-discovery-2026-11-12/README.md).
- [All 24 catalog decisions and preview expansion](staging-catalog-review-2026-11-12/README.md).

Production is unchanged by this staging SEO program. GitHub stores reviewed source and runs checks; deployment remains manual.
