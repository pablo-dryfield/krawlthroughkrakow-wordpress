# Search Baseline: Provider-Backed Reports

## Scope And Limits

Read-only authenticated OmniLodge reporting after verified M01 release
`omnilodge-r43315813139-a1-c4007f7d84a9`. Property
`https://krawlthroughkrakow.com/`, Web Search, all countries/devices, no query/page
filter, finalized data and Pacific dates. Independent Google summary totals, not
sums of a top-row table. No paid SERP sample, saved action or account change.

These are corrected API-backed reports viewed in OmniLodge, NOT a completed native
Google Search Console UI comparison. Raw full available page rows are privately
retained in the dated schema evidence directory; they are not committed because
some URLs contain Google booking/attribution tokens. Reaching the provider's end
of returned rows is not a guarantee of every possible detail observation.

## Comparable Current Windows

| Window | Dates Inclusive | Clicks | Impressions | CTR | Avg Position | Returned Page Rows |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
|28 days|2026-10-14..2026-11-10|958|45,215|2.12%|9.41|362|
|90 days|2026-08-13..2026-11-10|2,787|134,456|2.07%|10.41|418|
|180 days|2026-05-15..2026-11-10|5,760|315,895|1.82%|11.13|437|
|365 days|2025-11-11..2026-11-10|13,174|835,831|1.58%|10.75|470|

All four page tables reached End of returned rows. Current windows overlap; do
not add them together or attribute their differences to the November migration.
These aggregate reports alone cannot establish migration harm or benefit.

The365-day previous period reaches2024-11-11, before Google's rolling history.
Its displayed delta is not a valid complete-year comparison. This uncovered a
date-coverage follow-up within the approved M01 reporting scope: warn explicitly
and suppress a delta when either period exceeds available history. It is currently
in development/testing, separate from the genuinely completed first release.
Do not use that old long-range comparison for an SEO success/decline claim.

## Priority Inputs, Not Automatic Decisions

Canonical URL metrics in the28-day page table support reviewing the existing
pages below. Matching uses exact URLs, NOT pathname-only maps that accidentally
overwrite canonical rows with attribution variants. CTR/position are native page
metrics; query evidence and intent/operations checks are still needed.

| Existing Page | Clicks | Impressions | CTR | Avg Position | Review |
| --- | ---: | ---: | ---: | ---: | --- |
|[NYE guide](https://krawlthroughkrakow.com/krakow-new-years-eve/)|27|2,991|0.90%|6.49|Clarify guide vs current sales page; verified2026 offer and TBA only|
|[Budget drinks](https://krawlthroughkrakow.com/wheres-the-cheap-places-to-drink-in-krakow/)|71|2,594|2.74%|7.05|Verify current venues/prices, then improve the existing useful guide|
|[Techno guide](https://krawlthroughkrakow.com/krakow-techno-clubs/)|33|2,292|1.44%|9.75|Verify venues and compare intent with the second techno guide before consolidation|
|[Shooting guide](https://krawlthroughkrakow.com/krakow-shooting-range/)|1|2,155|0.05%|18.21|Check actual search intent and current offer facts; no automatic new page|
|[Auschwitz guide](https://krawlthroughkrakow.com/all-you-need-to-know-about-visiting-auschwitz/)|10|1,622|0.62%|8.13|Verify visitor logistics with official sources and preserve useful destination|
|[Jazz guide](https://krawlthroughkrakow.com/jazz-bars-in-krakow/)|6|1,384|0.43%|9.99|Locally verify venue/music information|
|[Irish bars](https://krawlthroughkrakow.com/irish-bars-krakow/)|2|1,236|0.16%|10.78|Check current venues, intent and snippets|

54 of56 canonical article URLs are observed in the28-day table; two are not
observed. That is NOT zero traffic, an indexing verdict or deletion evidence.
169 of362 returned URLs have query parameters, primarily Google booking and UTM
parameters. Preserve legitimate handoff/attribution; investigate representative
canonical/indexing behavior before proposing any URL changes. No live token values
are copied into this document.

## Evidence Binding And Remaining Work

Private raw report SHA256 values:

- 28-day `b30f71431dc2fd2b9d6ccea50cea43f803f3436cbe02bc518e09716099970a99`.
- 90-day `2d8717fa38579f1b12a554e6b10aaedd39b48333ccc640cda7972db747796770`.
- 180-day `f2549e32e5d8383969d76e4c42631913ca08b6d9c8a93fd81e1492aef6306878`.
- 365-day `9c35695edfa216d5c0fdb359a5289b26e67ace656d0afa8e3a6659cb0f2791f4`.

M02 remains partial: native account comparison, complete available query exports,
brand/nonbrand and country/device/intent cohorts, supported prior-year matching
windows and future retained-history policy remain. No BigQuery/account storage
configuration was created. The browser was restored to28-day unfiltered Queries.

[Google's performance report](https://support.google.com/webmasters/answer/7576553?hl=en)
and [Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
explain grouping and detail limitations.
