# Staging Catalog Discovery Review

## Owner Clarifications, November 13

Food Tour has **13-14 tastings**, not10. Keep Halloween's established URL as a
past-event page, with **next dates to be announced**; do not invent the next year
or dates. These are confirmed editorial instructions, not proof that the product
configuration, booking availability or storefront have already been changed.
Apply and verify a separate staging-only content update; no OmniLodge product
configuration or production-commerce changes are authorized by this clarification.

Date: November 12, 2026. Scope: T03/T06/T10 investigation and a data-only
staging sitemap-preview update. Production, storefront application code,
WordPress settings, legacy Ecwid routes/feeds, consent, prices, availability,
orders and carts are unchanged. This is not a completed SEO roadmap or a
production sitemap submission.

## What Was Verified

`tools/audit-seo-catalog.py` read the complete public catalog and initial HTML
for all 24 products on production and staging, plus the team-building article.
No website JavaScript, quotes, cart writes, payments or account changes ran.

- All 24 product URLs return final HTTP 200 with their own clean canonical.
- All 24 staging responses are noindex; production indexing is unchanged.
- All 24 initial product responses lack H1. This is source evidence, not proof
  that Google cannot render the existing React interface. T02 remains a priority.
- Sixteen products lack configured summary, description and highlights in the
  public API. Bubble Football is an important exception to a visual-empty-page
  conclusion: it has separate frontend fallback copy and photos. That source
  needs unifying before server HTML/metadata can reliably share it.
- Five products have no public API image/imageUrl: 36, 39, 42, 44 and 45.
- Regular and Private Pub Crawl share their configured description. Their
  distinct names, booking contexts and slots do not justify canonicalizing one
  to the other without a proper intent/offer review. Improve distinct copy later.
- Halloween's allowed dates are only October 29/30/31, 2026, all past at the
  review date. No future year/date was invented and the page was not removed.
- Food Tour's card advertises 10 food tastings but its highlights say 13-14.
  This requires owner confirmation, not guessing which public value is correct.

These findings supplement, rather than overwrite, the earlier eight-description
pilot and discovery checkpoint. Original reports remain in their own directory.

## Complete Product Decisions

"Hold" means do not expand the preview to that product yet. It does **not**
change its current public URL, robots, canonical, booking form or existing
search eligibility. This is a staged quality review, not a claim that Google
requires a specific description length or number of images for sitemap entries.

| ID | Product / Clean Slug | Preview Decision And Follow-up |
| --- | --- | --- |
| 28 | Pub Crawl, `pub-crawl-28` | Retain. Core nightly booking intent; configured description/highlights and photos. Deliver initial HTML and improve shared copy in T02. |
| 29 | Bottomless Brunch, `bottomless-brunch-29` | Hold. Image exists, but no configured offer summary/description/highlights. Confirm current inclusions/timing before writing copy. |
| 30 | Go-Karting, `go-karting-30` | Add. Four product-specific inclusions and a photo; live canonical/indexing contracts pass. Summary/description still need editorial improvement. |
| 31 | Private Pub Crawl, `private-pub-crawl-31` | Add. Distinct private booking URL and slots with configured inclusions/photos. Shared regular-crawl description needs differentiation, not an automatic merge. |
| 32 | NYE Pub Crawl, `nye-pub-crawl-32` | Retain. Confirmed current NYE offer; keep 17:00/19:30 groups and TBA meeting points separate from regular crawl. |
| 33 | Kazimierz Pub Crawl, `kazimierz-pub-crawl-33` | Hold. Meeting instructions and photos exist, but no configured story/inclusions. Confirm how this differs from regular/private crawls. |
| 34 | Shooting Range, `shooting-range-34` | Hold. Photos exist, but offer text/inclusions need confirming. |
| 35 | Paintball, `paintball-35` | Hold. Photo exists, but offer text/inclusions need confirming. |
| 36 | Strip Club, `strip-club-36` | Hold. Missing configured copy and photo; confirm actual offer and presentation. |
| 37 | Life Drawing Session, `life-drawing-session-37` | Add. Product-specific summary, description, six inclusions and photo; distinct group activity. |
| 38 | Dwarf Arrest, `dwarf-arrest-38` | Hold. Photo exists, but offer text/inclusions need confirming. |
| 39 | Kidnapping Stag Prank, `kidnapping-stag-prank-39` | Hold. Missing configured copy and photo; do not invent details. |
| 40 | Brewery Tour, `brewery-tour-40` | Hold. Photo exists, but no configured story/inclusions; confirm current details. Existing website booking links remain working. |
| 41 | Boat Party, `boat-party-41` | Add. Product-specific summary, description, seven inclusions and photo. No allowed-dates-only expiry observed; this is not a guarantee of every slot's availability. |
| 42 | Airport Transfer, `airport-transfer-42` | Hold. Missing configured copy and photo; confirm vehicle/capacity/meeting details. |
| 43 | Bubble Football, `bubble-football-43` | Hold. Frontend-only mapped copy/gallery exists; API configuration is empty. Unify the source before extending metadata/server rendering. |
| 44 | Polish Vodka Tasting, `polish-vodka-tasting-44` | Hold. Missing configured copy and photo; confirm tasting/inclusion details. |
| 45 | Beauty & the Beast Stag, `beauty-the-beast-stag-45` | Hold. Missing configured copy and photo; confirm actual offer. |
| 46 | Party Bus, `party-bus-46` | Hold. Photos exist, but offer text/inclusions need confirming. |
| 47 | Morning Wake Up, `morning-wake-up-47` | Hold. Photo exists, but offer text/inclusions need confirming. |
| 48 | Food Tour Krakow, `food-tour-krakow-48` | Hold. Resolve 10 versus 13-14 tastings before expanding promotion; do not rewrite either value without confirmation. |
| 49 | Late Night Bites, `krakow-late-night-bites-polish-street-food-and-drinks-tour-49` | Hold. Photo/duration exist, but no configured story/inclusions. Distinguish it from Food Tour rather than assuming duplicate/replacement. |
| 50 | Cycle Tour, `cycle-tour-50` | Hold. Photo exists, but offer text/inclusions need confirming. |
| 51 | Halloween Pub Crawl, `halloween-pub-crawl-51` | Hold. Supplied dates have expired; obtain next campaign facts or a useful past-event/next-announcement treatment. Keep existing URL and indexing untouched. |

The preview now contains six products plus the catalog, alongside the unchanged
116 homepage/content entries: **123 URLs**. Adding a sitemap entry is a
discovery signal, not a guarantee of indexing or ranking. See
[Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Team-Building Canonical

`/krakow-team-building-activities/` is a final 200 article with a clear matching
title/H1. Its production source still lacks a canonical; staging already has a
self-canonical and noindex under the existing renderer. There is no missing
staging canonical to fix in this batch. Original production-policy captures and
generated page definitions were not altered, and the strict production-verified
preview still holds this route out. A future reviewed production-policy change
can supply its self-canonical and include it after the live canonical check.

A missing canonical is not by itself an indexing failure or automatic penalty.
The recommendation is consistency with the chosen article URL, not merging it
with commercial group pages. See
[Google's canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

## Build And Manual Release

The reviewed product list remains the explicit source in
`tools/seo-discovery-policy.json`; catalog additions do not auto-promote products.
Expanded builds require a fresh complete catalog audit with the same public
catalog hash and selected IDs/slugs. The publisher requires its bound evidence,
all final-canonical checks and the unchanged 117 content-source hashes.

Use new evidence filenames on subsequent runs. Existing reports are rejected,
not overwritten:

```powershell
python tools/audit-seo-catalog.py --review-date 2026-11-12 --output docs/seo/staging-catalog-review-2026-11-12/catalog-audit.json
python tools/build-seo-discovery.py --catalog-review docs/seo/staging-catalog-review-2026-11-12/catalog-audit.json --report docs/seo/staging-catalog-review-2026-11-12/build.json
./tools/publish-seo-discovery.ps1 --build-report docs/seo/staging-catalog-review-2026-11-12/build.json
./tools/publish-seo-discovery.ps1 --publish --build-report docs/seo/staging-catalog-review-2026-11-12/build.json --report docs/seo/staging-catalog-review-2026-11-12/staging-publish.json
```

The publisher keeps its fixed staging-only three-file ownership boundary. Only
`ktk-seo-sitemap-assets/data.json` actually changed. Data-only updates skip
storefront cache deletion because previews already send no-store. Entrypoint
changes still use the original bounded staging cache cleanup; both branches are
unit-tested. FTPS/DPAPI remains manual, with no GitHub deployment credentials.

- Pre-edit Git checkpoint: `4e08ba63e1f82a182d776e5a54cd4bb44517baa2`.
- Pre-edit tracked-source archive: `deploy-backups/seo-catalog-review-before-20261112.zip`,
  SHA-256 `78deb9ec6778152414bf2594fd8052803c2beb2e33c424210b4760edc6f96955`.
- Published at `2026-11-12T17:55:52.755197+00:00`, report `staging-publish.json`.
- Remote checkpoint: `seo-discovery-staging-20261112-175542-164520.zip`,
  SHA-256 `a72c39c895400c01bb765e222afe2c7af2d6597237c9cdd4994cd5f195c60559`.
- New data SHA-256: `f71d3652df95e67d2339e801b4bb584775069681689f3621256c19302e7d24d3`.
- Entrypoint remains `fcc4a25d6841d07476eb0f832411fee7ca304b6002c976706b64d74d321369f5`;
  access protection remains `fa28d421a28ed9b6f4b997d5119c2b8adbacff6e2dd119a179b71230f9664934`.
- All three owned hashes/runtime match; 2,162 protected staging hashes,
  2,158 production hashes and the saved WordPress-state hash are unchanged.
  Temporary probes are removed. No origin/Cloudflare caches were purged.

Rollback only the prior JSON from this checkpoint, retaining the noindex guard
and access protection. Verify the prior 119-entry preview afterward. Never
restore WordPress data or production files for this change. Restoring the full
initial deployment checkpoint would unnecessarily remove the indexing guard.

## Verification And Next Work

- Complete public catalog: 24/24 product identities and both environments' final
  status/canonical policy verified; no request errors.
- Final production canonical targets: 123/123; no fabricated lastmod.
- Python isolated publisher/builder/audit/regression tests: 123/123.
- PHP discovery/indexing contracts: 65/65.
- Live origin source/preview checks: 243/243 (`origin.json`).
- Normal URLs: 216/216 (`clean-urls.json`), across desktop, Android and iPad.
- Repeat: 216/216 at `2026-11-12T17:57:53.053372+00:00`
  (`cache-repeat.json`). All 21 reviewed catalog/product device responses are
  HIT and remain noindex; the preview still serves the exact new entries with
  no-store/noindex headers. No cache purge was needed.

Raw audits and release evidence remain local under the repository evidence
policy. This summary, tool source, tests, explicit policy and runtime data are
tracked. No Clarity recordings, real bookings, messages or payments were created.

Next priority is T02: render useful public product content in initial HTML from
the same public data the client uses, starting with regular pub crawl and NYE.
Keep prices/availability authoritative, avoid duplicate hydrated content, test
without JavaScript and preserve cart/payment/tracking behavior. Separately
collect missing offer facts, confirm Food Tour tastings and plan Halloween's
next campaign. T03 still needs approved production discovery/robots cutover,
legacy-feed equivalence and Search Console submission; none occurs here.
