# Structured Data: Staging

## Scope And Source

Website only, staging only. This batch adds JSON-LD from the existing captured
public content, not a database rewrite or a visible redesign. Pre-edit tracked
source backup `seo-schema-media-before-20261112.zip`, SHA256
`1769709108f8fc03a95234e7f00b97522fa966911c486e224d57d54cda7054cc`.

`tools/code-pages-schema.mjs` owns the policy; `build-code-pages-all.mjs` generates
the definitions. Exact existing Organization/WebSite IDs are reused.115 pages get
WebPage/AboutPage/ContactPage/CollectionPage and registered navigation breadcrumbs.
55 articles get BlogPosting;45 retain actual captured person display bylines,
48 original visible publication dates and48 real featured-image URLs. No arbitrary
inline icon becomes the featured image.

Seven articles have no visible byline/date. Three use the ambiguous shared handle
pubthroughkrakow, so authorship is omitted rather than declaring a made-up person
or organization. The health-claims article remains wholly unchanged on hold.
The dating article's captured title differs in whitespace/capitalization from the
public post-title API; its real visible H1 supplies the schema headline. No source
body/title rewrite, new migration date, ratings, medical authority, FAQ eligibility,
Event venues/times or invented offer facts are added.

The homepage's existing Organization/WebSite/WebPage remain unchanged. Storefront
Product availability/physical-condition assertions were identified but are not
changed in this content-only release. Their applicability and the old validation
warnings remain open T09 work, not certified rich results.

## Verification

- Full source build116/116, verification2204/2204, PHP routing760/760.
- Pure schema policy5/5 covers original dates, holds, missing authors, image bounds,
  registered breadcrumb paths, inherited-data retention and entity collision guards.
- Local actual PHP HTML across116 routes/three device agents3221/3221. Exact JSON,
  one graph, staging noindex/canonical, byline/date/headline correspondence and no
  invented claims. Every page definition differs only in schema; every body/shell/
  stylesheet is byte-identical to the a9cf168 baseline. One held route has no new graph.
- Discovery source hashes regenerated, same123 intended targets; no new URLs,
  dates, index policy or production sitemap submission.

The staging incremental publisher completed22:34:09UTC, all2031 owned hashes
verified, saved WordPress state/homepage/storefront unchanged and helper removed.
Backup `ktk-code-pages-staging-20261112-223209.zip`, SHA256
`ca47daaeae20ab42badf8902d86303ba68beb9816645ba4ad0db9d17f2f98ce2`.
The discovery data-only follow-up also completed, preserving production and all
protected files/settings. Backup `seo-discovery-staging-20261112-223505-313579.zip`,
SHA256 `9e561459a6bdf603947ad50a3719fc1006394fe7b3119b9cc3cba5a2b9fdb0af`;
data SHA256 `2e8962a6befbe3b401ba6aa080f8ae77cbf3acacee1cadf83e4a7a0a22f41ebf`.
Actual origin JSON-LD checks pass3221/3221 and discovery243/243. Broader regression
history is preserved below; there is not yet a complete passing final broad run.

| Report | Outcome |
| --- | --- |
|`headings-origin.json`|4264/4320, eight502 gateway responses on three routes|
|`headings-origin-sequential-repeat.json`|1616 checks passed before a response-body connection reset; incomplete|
|`headings-origin-buffered-repeat.json`|4292 checks/all348 content variants passed; remaining checks stopped because the agent closed its local homepage reference too early; incomplete|
|`headings-origin-final-reference.json`|3861/4320;76 responses were503 scheduled-maintenance pages, not code-page content|

The read-only transport now reads bodies inside its bounded retry boundary and
records transport retries; it deliberately never retries HTTP502 into success.
Its3/3 tests cover this distinction. No application assertions were weakened.
Broad origin scans are paused after the maintenance response. A bounded6-request
recovery sample at23:06UTC is healthy, including one staging origin response and
production page/storefront controls. This is recovery evidence, NOT a passing
all-route regression or attribution of who initiated maintenance. No host/plugin/
maintenance settings were changed.

After the owner confirmed the staging-prefix purge, the normal heading/content
regression passes4320/4320:348 content responses MISS and three warmed homepage
variants HIT. The repeat passes4320/4320 with all351 responses HIT. Both have zero
errors/transport retries. Normal actual schema passes3221/3221 with all348 responses
HIT; discovery216/216 passes. No application changes or production promotion were
needed for these read-only checks. Preserve every earlier failed/incomplete report.

This is verified on staging, not production-delivered or Google Rich Results
Test-certified. Staging remains noindex; owner review and separate production
promotion remain. PR8 source1e63037 passed CI43326170853; new evidence updates must
pass their own current CI. Preserve the a9cf168 comparator until this batch closes.
Old PHP previews are stopped; task5184 reference session33117 was used successfully
for the final complete scans and can close after remaining browser checks.

Original Ahrefs CSV reports three schema.org notices and zero Google-rich-results
errors, but does not contain their affected URLs or field details. A fresh detailed
crawl/validator report is needed before claiming those three historical notices
fixed. Category ItemList and old FAQ AI-discoverability notices are not grounds for
inventing rich-result eligibility or adding invisible content.

Policy references: [Google Article guidance](https://developers.google.com/search/docs/appearance/structured-data/article),
[Google breadcrumb guidance](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb).
