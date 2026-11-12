# Search Console and Production Database Evidence

Reviewed: 2026-11-07, Europe/Warsaw. Research only; no application release or production settings changes.

## Sources and Method

- Read the Ahrefs report and its JSON/CSV evidence in `C:\Users\pjcam\Documents\Reports\KTK-Ahrefs-2026-11-04`.
- Successfully connected to OmniLodge's production HTTPS read connector. Its health response identified `omni_lodge_db`, role `codex_cloud_reader`, and `transaction_read_only=on`.
- Described and read only the SEO action log table, `public.seo_action_logs`, using a bounded 100-row read ordered by `created_at DESC`. It returned **zero rows**. The dashboard also showed zero saved actions. No customer, payment, staff, session or credential records were read.
- Read the implementation of OmniLodge's Search Console page, API wrapper and backend service. Performance is fetched live from Google, not stored in this table. Recommendations are computed in the UI, not a backlog saved to the database.
- Opened the authenticated production page at `https://omni-lodge.com/search-console`. Property: `https://krawlthroughkrakow.com/`. Read all displayed Recommended SEO Actions and SEO Opportunities for four date ranges, plus keyword/landing-page tables and selected URL inspections. Did not click Use/Save action, Analyze SERP, or any publish/configuration control.
- The initial 28-day view's keyword tracker was independently set to 90 days. Do not mistake that tracker for 28-day data. For the three longer captures, all five range controls were verified to match the selected period.
- Read 32 recommended-action rows and 68 opportunity rows. Deduplicating by category/title/query/URL leaves **57 distinct findings** below. This is complete coverage of the displayed capped panels, not every possible GSC query or SEO issue.

## Important Reporting Limitations

1. `ui/src/api/searchConsole.ts` hardcodes `rowLimit: 100` for every request. The overview sums those top 100 rows. Therefore its cards are **partial table totals**, not reliable whole-property totals. Its previous-period deltas compare independently truncated result sets.
2. Query-only metrics and query/page metrics have different aggregation semantics. Do not add them together or expect them to reconcile. Query anonymization and Google's API limits also matter.
3. The keyword tracker uses substring matching and aggregates matching queries/pages. Its Best page is chosen by the best individual position, whereas the displayed metrics aggregate the matches. A URL shown beside a rollup does **not** own all its displayed impressions/clicks. For example, the 90-day core-keyword tracker points to a UTM product URL; that is not evidence that this URL alone received all 1,923 impressions.
4. Low CTR is a heuristic flag, not a diagnosis. Device, country, intent, rank and SERP features need checking. Several similar queries on a useful page are normal, not automatically mixed intent. Two ranking URLs are not by themselves harmful cannibalization.
5. Missing from the top 100 rows does not mean a keyword has no impressions, no page, or needs a new landing page.
6. The API service has no pagination/startRow, filter, search-type or whole-property-total interface today. The UI's annual previous-period range is 2024-11-06 to 2025-11-05; do not accept that as a complete year-on-year comparison without confirming historical data coverage.
7. End date is November 5. These ranges cannot establish the effect of the full content cutover on November 5. The earlier homepage release also needs its own annotation. Historical Ahrefs estimates are not measured sessions or revenue.

## Dashboard Overview, As Displayed

These are query-view top-100 partial totals. Preserve as diagnostic observations, not the business traffic baseline.

| Window | Inclusive dates | Partial clicks | Partial impressions | Partial CTR | Partial average position |
| --- | --- | ---: | ---: | ---: | ---: |
| 28 days | 2026-10-09 to 2026-11-05 | 393 | 7,248 | 5.42% | 7.10 |
| 90 days | 2026-08-08 to 2026-11-05 | 965 | 20,355 | 4.74% | 7.56 |
| 180 days | 2026-05-10 to 2026-11-05 | 2,089 | 49,659 | 4.21% | 7.36 |
| 365 days | 2025-11-06 to 2026-11-05 | 4,762 | 124,109 | 3.84% | 7.53 |

The displayed prior-period click differences were +22, -211, -570 and +1,794 respectively. They are not trustworthy sitewide growth/decline percentages; no migration-impact conclusion is drawn from them.

### Selected Exact Query Rows

Unlike the substring tracker, these are the visible query-only performance rows for the stated exact query. They are still aggregate across countries/devices and must not be treated as a country-specific rank tracker.

| Query | Window | Clicks | Impressions | CTR | Position |
| --- | --- | ---: | ---: | ---: | ---: |
| pub crawl krakow | 28d | 48 | 561 | 8.56% | 4.52 |
| krakow pub crawl | 28d | 39 | 506 | 7.71% | 3.55 |
| krawl through krakow | 28d | 42 | 320 | 13.13% | 8.90 |
| pub crawl krakow | 90d | 130 | 1,974 | 6.59% | 4.80 |
| krakow pub crawl | 90d | 134 | 1,580 | 8.48% | 3.64 |
| krawl through krakow | 90d | 82 | 1,144 | 7.17% | 11.78 |
| pub crawl krakow | 365d | 558 | 8,838 | 6.31% | 4.35 |
| krakow pub crawl | 365d | 553 | 6,714 | 8.24% | 3.97 |

The differing tracker/overview brand positions are a reason to fix reporting before making broad metadata/canonical decisions.

### Selected Query/Page Opportunity Evidence

| Query and destination | Window | Evidence | Interpretation |
| --- | --- | --- | --- |
| krakow nightlife -> homepage | 90d | 577 impressions; 0.52% CTR; position 6.37 | Match a local guide to informational intent; do not rewrite the homepage around nightlife alone. |
| jazz bar krakow -> `/jazz-bars-in-krakow/` | 28d | 209 impressions; 0.48% CTR; position 10.22 | Useful local-refresh candidate, not only a snippet problem. |
| irish bar krakow -> `/irish-bars-krakow/` | 180d | 1,338 impressions; 0.30% CTR; position 11.32 | Check venue freshness, intent and links before title experiments. |
| krakow shooting range -> `/krakow-shooting-range/` | 90d | 418 impressions; position 21.10 | Existing page can be improved; do not create another duplicate. |
| krakow new year's eve 2026 -> `/new-years-eve/` | 90d | 154 impressions; position 4.59 | Time-sensitive commercial opportunity. |
| drinking jenga -> existing PDF | 365d | 9,036 impressions; 1.46% CTR; position 7.30 | Preserve the asset, distinguish informational reach from booking intent. |

The landing diagnosis's annual top-100 query/page sample attributes 51,081 impressions to Jenga PDF rows, 36,509 to homepage rows, 7,000 to cheap-bars rows and 5,428 to techno-club rows. These are partial query/page subtotals, not a complete page-performance export.

## All 57 Distinct Displayed Findings

Periods: 28/90/180/365 mean days ending 2026-11-05. Paths omit the unchanged hostname. R means Recommended action; O means Opportunity flag. Ticket IDs refer to the main plan. Similar flags are deliberately not treated as separate instructions to create duplicate pages.

| # | Panel / finding | Query | Destination | Periods | Plan disposition |
| ---: | --- | --- | --- | --- | --- |
| 1 | R Improve CTR | pub crawl krakow | UTM variant of `/store2/pub-crawl-28/` | 28,90 | M01/T01/T05; validate rollup attribution first. |
| 2 | R Improve CTR | krakow pub crawl | UTM variant of `/store2/pub-crawl-28/` | 28,90 | M01/T01/T05. |
| 3 | R Improve CTR | krawl through krakow | `/` | 28,90,365 | C01/T05; defend brand rather than keyword-stuffing. |
| 4 | R Strengthen rank | krakow nightlife | `/the-ultimate-guide-to-dating-in-nightlife-krakow/` | 28,365 | C03; choose guide roles before editing. |
| 5 | R Create visibility | things to do in krakow at night | Not shown | 28,90,180,365 | M01/C03; absence is unproven. |
| 6 | R Create visibility | krakow party | Not shown | 28,90,180,365 | M01/C03/C08; inspect `/party-krakow/` first. |
| 7 | R Choose ranking page | pub crawl krakow | `/` and product | 28,90 | T01; multiple URLs alone are not a defect. |
| 8 | R Choose ranking page | krakow pub crawl | `/` and product | 28,90 | T01. |
| 9 | O Near-top | crawl through krakow | `/` | 28 | C01; brand variant, no extra page. |
| 10 | O Near-top | krakow pub crawls | `/` | 28 | C01; same commercial cluster. |
| 11 | O Near-top | cheap bars in krakow | `/wheres-the-cheap-places-to-drink-in-krakow/` | 28 | C04. |
| 12 | O Near-top | fun jenga rules | Existing PDF | 28,365 | C09; retain successful URL. |
| 13 | O Near-top | krakow techno club | `/krakow-techno-clubs/` | 28 | C05. |
| 14 | O Missing target | things to do in krakow at night | Not shown | 28,90,180,365 | Same decision as #5. |
| 15 | O Missing target | krakow party | Not shown | 28,90,180,365 | Same decision as #6. |
| 16 | O Missing target | krawlthroughkrakow | Not shown | 28,90,365 | M01; no separate exact-match page. |
| 17 | O Low CTR | drinking jenga | Existing PDF | 28,90,180,365 | C09. |
| 18 | O Low CTR | drunk jenga | Existing PDF | 28,90,180,365 | C09. |
| 19 | O Low CTR | jazz bar krakow | `/jazz-bars-in-krakow/` | 28 | C05/T05. |
| 20 | O Low CTR | pub crawl | `/` | 28,90,180,365 | C01; qualify geographic intent, not a global ranking target. |
| 21 | O Low CTR | drinking jenga game | Existing PDF | 28 | C09. |
| 22 | O Weak rank | krakow shooting range | `/krakow-shooting-range/` | 28,90 | C07. |
| 23 | O Multiple pages | pub crawl krakow | `/` and product | 28,90 | Same decision as #7. |
| 24 | O Multiple pages | krakow pub crawl | `/` and product | 28,90 | Same decision as #8. |
| 25 | O Multiple pages | krakow nightlife for singles | Dating/nightlife article and another URL | 28 | C03/C08; inspect intent, not automatic consolidation. |
| 26 | O Multiple pages | krakow new year's eve | `/krakow-new-years-eve/` and another URL | 28 | C02/C08; separate guide and booking intent. |
| 27 | R Strengthen rank | krakow nightlife | `/` | 90,180 | C03; guide/homepage role separation. |
| 28 | O Near-top | cheap bars krakow | Cheap-bars article | 90 | C04. |
| 29 | O Near-top | krakow new year's eve 2026 | `/new-years-eve/` | 90 | C02. |
| 30 | O Near-top | cheapest bar in krakow | Cheap-bars article | 90 | C04. |
| 31 | O Near-top | how to survive pub golf | `/survive-pub-crawl/` | 90 | C08/C09; useful safe participation advice. |
| 32 | O Near-top | cheap drinks krakow | Cheap-bars article | 90 | C04. |
| 33 | O Low CTR | krakow nightlife | `/` | 90,180,365 | C03/T05. |
| 34 | O Low CTR | stages of drunkenness | `/stages-of-drunkenness/` | 90 | C08; low commercial priority, safety/factual review. |
| 35 | R Improve CTR | pub crawl krakow | `/` | 180,365 | C01/T05; same cluster as #1, different rollup destination. |
| 36 | R Improve CTR | krakow pub crawl | `/` | 180,365 | C01/T05. |
| 37 | R Improve CTR | bar crawl krakow | `/` | 180 | C01/T05. |
| 38 | R Choose ranking page | pub crawl games | `/best-drinking-games/` and `/pub-crawl-drinking-games/` | 180,365 | C08/C09; compare overlap and unique value. |
| 39 | R Low CTR landing | irish bar krakow | `/irish-bars-krakow/` | 180 | C05. |
| 40 | O Near-top | krakow techno clubs | `/krakow-techno-clubs/` | 180 | C05. |
| 41 | O Near-top | drinking jenga questions | Existing PDF | 180 | C09. |
| 42 | O Near-top | jenga drinking dares | Existing PDF | 180 | C09. |
| 43 | O Near-top | cheap bar krakow | Cheap-bars article | 180,365 | C04. |
| 44 | O Near-top | cheap bars in krakow old town | Cheap-bars article | 180 | C04. |
| 45 | O Low CTR | irish bar krakow | `/irish-bars-krakow/` | 180 | Same decision as #39. |
| 46 | O Weak rank | pub crawl games | `/pub-crawl-drinking-games/` | 180,365 | C08/C09. |
| 47 | O Weak rank | pub crawl challenges | `/best-drinking-games/` | 180 | C08/C09. |
| 48 | O Weak rank | pub crawl challenges | `/pub-crawl-drinking-games/` | 180 | C08/C09. |
| 49 | O Weak rank | boat party krakow | Legacy `/store/Boat-Party-Private-Boat-p637239272` | 180 | C07; improve current offer, protect fallback store. |
| 50 | O Weak rank | funny pub crawl challenges | `/pub-crawl-drinking-games/` | 180 | C08/C09. |
| 51 | O Multiple pages | pub crawl games | Two games pages | 180,365 | Same decision as #38. |
| 52 | R Low CTR landing | stages of drunkenness | `/stages-of-drunkenness/` | 365 | Same decision as #34. |
| 53 | O Near-top | cheap cocktails krakow | Cheap-bars article | 365 | C04. |
| 54 | O Near-top | cheapest pint in krakow | Cheap-bars article | 365 | C04. |
| 55 | O Near-top | cheapest bars in krakow | Cheap-bars article | 365 | C04. |
| 56 | O Low CTR | drinking jenga ideas | Existing PDF | 365 | C09. |
| 57 | O Weak rank | vodka tasting krakow | Legacy `/store/Polish-Vodka-Tasting-p637205219` | 365 | C07; improve `/store2/polish-vodka-tasting-44/`, no blanket store redirect. |

## URL Inspection Observations

All four returned PASS / Submitted and indexed, with Google canonical matching the requested clean URL. This is Google's stored index state, not a fresh live-page rendering test.

| URL | Last Google crawl, UTC | Relation to full content release at 2026-11-05 18:43 UTC |
| --- | --- | --- |
| `/` | 2026-11-03 08:02:02 | Before full content cutover; homepage was already code-managed earlier. |
| `/store2/pub-crawl-28/` | 2026-10-24 08:37:45 | Before full content cutover; storefront is separate. |
| `/new-years-eve/` | 2026-11-05 17:50:19 | Before full content cutover. |
| `/about-us/how-to-join/` | 2026-11-06 11:32:56 | After full content cutover; useful positive sample, not all-route indexing proof. |

No indexing submission, sitemap submission, SEO action record, GTM publish or production database write was made.
