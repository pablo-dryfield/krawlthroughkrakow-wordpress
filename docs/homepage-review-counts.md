# Homepage review-count evidence

Initially checked 6 October 2026, around 12:00 UTC; updated 8 October after the owner supplied the Google count. Values below distinguish a live browser observation, an owner screenshot and indexed/cached primary-platform content. Counts can change after these checks.

## Findings

Update, 8 October 2026: the owner supplied a Google business screenshot showing **5.0/5 and 2.4K reviews** for Krawl Through Krakow - Pub crawl, then explicitly requested the display **2,400+ reviews**. That display is owner-directed; the screenshot does not independently verify an exact count or lower bound. Tripadvisor remains **4.9/5 with 3,000+ reviews**, and GetYourGuide **4.6/5 with 100+ reviews**, supported by dated primary-platform snapshots. See `homepage-seasonal-hero/review-row-source-evidence.json` for the new evidence and access limitations. These are configured snapshots, not live widgets. Shared configuration now lives in `staging/wp-content/mu-plugins/ktk-homepage-assets/reviews.php`, reused by the renderer and local preview.

| Platform and scope | Observed value | Evidence quality | Recommended treatment |
| --- | --- | --- | --- |
| Google: Krawl Through Krakow - Pub crawl business profile | Rating 5.0 visible; review count unavailable | Fresh Chrome visit to Google Maps reached the exact profile. Website `krawlthroughkrakow.com` and phone `791 847 981` match KTK. Google's limited Maps view omitted the review count. A separate Google Search attempt showed a CAPTCHA; no attempt was made to bypass it. | Do not invent a count or reuse the old 582. Use a review link without a count until the owner confirms the current displayed total. |
| Tripadvisor: Krawl Through Krakow - Pub Crawl operator/business, location ID `d2725527` | Latest primary search-index result: 4.9/5 and 3,092 in the header; 3,091 in its review section | Search result marked crawled last week. Opening the same URL through the web reader returned an older snapshot marked eight months old with 2,979. Direct Chrome access returned HTTP 403. | **3,000+ reviews** is supported by the latest indexed primary evidence; it is not a newly verified live exact count. Do not publish 3,092 as a freshly confirmed exact total. |
| GetYourGuide: regular KTK pub crawl, product `t443425` | 4.6/5; 113 reviews | Product and supplier pages read through the web tool both show 113; final reads were labelled crawled today. Product names the provider Krawl Through krakow PubCrawl. Direct local Chrome access returned HTTP 403. | **100+ reviews** is a conservative supported display. Exact **113 reviews** was observed in the primary page content today, but is still a checked snapshot rather than a live widget. |

## Exact destinations

- [Google business profile](https://www.google.com/maps/place/Krawl+Through+Krakow+-+Pub+crawl/@50.0614569,19.9380167,17z/data=!3m1!4b1!4m6!3m5!1s0x47165bf213d4292f:0xb4d3277c5ab6ea20!8m2!3d50.0614569!4d19.9380167!16s%2Fg%2F11t9kqj0yw). The Maps search resolved to this profile during the live browser check; it is not the Adam Mickiewicz Monument's own review listing.
- [Tripadvisor business reviews](https://www.tripadvisor.com/Attraction_Review-g274772-d2725527-Reviews-Krawl_Through_Krakow_Pub_Crawl-Krakow_Lesser_Poland_Province_Southern_Poland.html). This is the operator profile linked from the existing KTK website.
- [GetYourGuide regular pub-crawl reviews](https://www.getyourguide.com/krakow-l40/krakow-pub-crawl-1h-open-bar-vip-entry-welcome-shots-t443425/). Provider corroboration: [KTK supplier profile, ID s264786](https://www.getyourguide.com/krawl-through-krakow-pubcrawl-s264786/).

The GetYourGuide product headline is "Krakow: Pub Crawl 1H Open Bar, VIP Entry & Welcome Shots". Both its top summary and customer-review section displayed 113. The supplier profile links the same product with 113, rather than a combined supplier-wide total.

## Scope and stale-source safeguards

- Tripadvisor also has an individual regular-crawl product, `d13998447`, with a different and smaller count. Do not attach its count to the operator URL, or add operator and product counts together.
- GetYourGuide's 113 belongs to the regular crawl, not brunch, food tours or all KTK products combined.
- These are total reviews, not verified totals of positive reviews. Do not label them "positive reviews" or imply every reviewer gave five stars.
- Do not combine the three platforms into a purported unique-customer total; reviewer overlap is unknown.
- The existing WordPress values of 582 Google and 2,297 Tripadvisor are not current platform verification. The prior eight-month-old Tripadvisor snapshot of 2,979 is also not a current exact total.
- Third-party search results reported varying Google totals. They were not accepted as evidence because the task requires primary-platform confirmation.
- Plain source links and locally configured checked counts require no new review-service request on homepage load. Recheck counts periodically; never show a missing value as zero.

## Historical owner confirmation request (6 October)

Resolved on 8 October: the owner's screenshot confirms the rounded Google count of **2.4K**. The request below and the old implementation notes are retained as release history, not current instructions.

Ask for the current total displayed on the exact Google business profile above, ideally with a screenshot including the business name and count. If all three badges must show exact live totals, request current Tripadvisor and GetYourGuide screenshots too. Until then, the defensible choices are Google **Read reviews**, Tripadvisor **3,000+ reviews**, and GetYourGuide **100+ reviews**, with the evidence dates retained in configuration/documentation.

## Historical staging implementation (6 October)

The owner-directed hero revision uses the defensible display above. An asynchronous question requested the current Google count from the owner; no answer had been received during implementation. All source links and values are centralized in `ktk_homepage_review_sources()` in `tools/homepage-shortcode-plugin-template.php`. These are configured snapshots, not live totals, and add no review widget, API dependency or automatic third-party request.

The hero now removes its ticket price, centers the Krawl Through Krakow brand above the Krakow Pub Crawl heading, places Every Night and 9 PM / Adam Statue on the sides, and places the review links at the bottom center. Mobile moves the side labels above the main heading. The existing authentic hero photograph and font files are reused; the priority font preload now matches Montserrat. Content below the hero, checkout behavior, attribution and consent integrations are unchanged.

Local rollback checkpoint: `deploy-backups/homepage-hero-local-before-20261006.zip`. Final staging publish used `--local-source`, verified all 38 deployable files and backed up staging to `deploy-backups/ktk-homepage-shortcode-staging-20261006-122619.zip`. Renderer SHA-256: `dfbf499f4bd181a98f1f4112316c2b915e7ffcd7b69ef8ac805bb2bb6794e022`; CSS version `ab7acfbdf977`; JavaScript version `8bf4f10c4db8`. Production was not deployed.

PHP integration tests include no-price hero, branding, three source links and valid optional count formatting. PHP integration, consent and all five publisher tests passed. Browser evidence is produced by `tools/test-homepage-hero.mjs` under `docs/homepage-redesign/hero-*`.

Final browser verification passed 96/96 checks at 360, 390, 768 and 1440 pixels, including zoom and no-JavaScript links. Short viewport checks passed 30/30 each at 320x568, 375x667 and 1440x768; a narrow-container heading adjustment also prevents existing meeting-point headings overflowing at 200% zoom. The existing booking/regression suite passed 54/54 without creating a cart or order. Only the Cloudflare `krawlthroughkrakow.com/staging/` prefix was purged; clean desktop, Android and iPad requests then returned HTTP 200 with the current CSS/JS versions and Montserrat preload. No new review-widget scripts, image files or runtime requests were introduced. These are functional/layout checks, not a new performance benchmark.
