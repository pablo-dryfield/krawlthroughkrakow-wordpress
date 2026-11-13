# Staging Cache Verification

Owner confirmed both outstanding staging-prefix purges on13 November2026.
All checks below use normal URLs, without cache-busting parameters. Website
production, stored settings, commerce configuration and OmniLodge are unchanged.
This closes the pending cache gate for the accessibility and confirmed-offer
batches, not the full SEO plan or a production release.

## Results

| Check | Result | Cache Evidence |
| --- | --- | --- |
|All116 content routes plus homepage, first scan|4,320/4,320|348 MISS, three warmed homepage HIT|
|Same content, repeat scan|4,320/4,320|All351 page/device responses HIT|
|All24 products plus catalogue, first scan|692/692|56 MISS,19 already warmed HIT|
|Same storefront, repeat scan|692/692|All75 page/device responses HIT|
|Content keyboard, landmarks, labels and reflow|324/324|Normal URLs;320/390/768/1440 widths|
|Storefront initial/client keyboard and accessibility|176/176|Normal URLs; same four widths|
|Food Tour/Halloween initial/client facts and metadata|144/144|Normal URLs; same four widths|
|Discovery/indexing preview and protected controls|216/216 twice|Repeat24 HIT, three intentionally DYNAMIC utility responses|
|Booking-link attribution|31/31|Isolated storage; no navigation, orders or form submission|
|Homepage booking destinations|18/18|All three device variants HIT|
|Homepage active assets|10/10 exact hashes|All three homepage variants HIT; all version tokens match|
|Short-window cart/focus guard|104/104 after diagnostic correction|See the retained failure and exact blocked-feedback exception below|

Content/storefront HTTP scans cover desktop, Android and iPad user agents.
The content repeat has zero transport errors/retries. Exact reviewed text,
headings, images/sections, form contracts, canonical/noindex policy and stylesheet
references remain valid. Storefront checks also verify current renderer2026.11.13.3,
compiled assets/fonts, initial HTML and protected original production assets.
The preview retains the same123 canonical proposals; no production sitemap or
Search Console account setting was changed.

The expanded homepage verifier checks parity CSS/runtime/JS, journey JS, hero CSS,
both original statue vectors and all three review logos. Six offline scenarios
require correct references and bytes and reject stale tokens, missing assets,
tampered responses, wrong indexing tags and wrong canonicals. These are transport
fixtures, not a public screenshot/pixel-identity certificate.

Actual normal-URL mobile homepage and Halloween screenshots were inspected.
The homepage displays NYE, while Halloween retains its separate past-event URL,
historical2026 labels and TBA message. Lazy out-of-view thumbnails need not load
when a full-page screenshot is requested; no all-gallery-image claim is made.

## Preserved Short-Window Failure

`short-window-browser`, `short-window-diagnostic` and
`short-window-multipart-diagnostic` each retain101/104. All86 geometry/focus
assertions pass; the three failures are the original overly broad requirement
that no first-party POST may even be attempted. Three Pub Crawl views attempted
multipart POSTs to staging `wp-admin/admin-ajax.php` with action `rocket_beacon`.
All were intercepted and aborted before transmission, not customer mutations.

Only sanitized method/origin/path/content-type/action metadata is retained.
No nonce, payload, cookie, personal data or credential is logged. Structured
FormData parsing identifies the action; the initial URL-encoded/JSON parser
correctly had no action for these multipart bodies.

WP Rocket documents this feedback as part of its asynchronous
[Priority Elements optimization](https://docs.wp-rocket.me/article/1841-priority-elements).
No plugin feature/settings were disabled or feedback requests allowed through.
The corrected guard still aborts **every** non-read request first, acknowledges
that abort, then classifies only this exact blocked signature on the owned staging
or explicit loopback site. Unknown actions, forms, checkout/cart endpoints,
foreign/production contexts, unblocked records and other content types fail its
negative unit cases. A request-finished listener additionally requires zero
completed non-read requests.

`short-window-guarded` passes104/104 with `realMutations:0`. It retains all three
blocked feedback records and three false strict-zero-attempt observations, rather
than erasing them. This is not a claim that WP Rocket never writes optimization
data during an ordinary non-isolated visit, or that its installed version/patch
status has been audited. Public plugin readmes return404 and establish no version.

## Remaining Limits

- Storefront isolated browser runs retain blocked-provider `fbq` and, in this
  cached run, `FacebookSignal` script errors. The own UI assertions pass, but this
  is not a clean third-party integration or consent certificate. Tracking/settings
  were not changed to suppress the observations.
- Remaining content contrast/target findings and manual screen-reader/mobile
  pinch-zoom work stay open. No full WCAG or good-mobile-performance claim.
- The Food Tour's unused upstream10-tasting card stat remains a documented
  configuration hold; this website renders the confirmed13-14 summary/highlights.
- No application files were changed or deployed during this verification.
  Only read-only tooling, tests and documentation change. Production promotion
  still needs separate approval.

## Evidence And Source

Local reports/screenshots under this directory remain ignored by Git. The
homepage18-check report is
`docs/code-pages/production-readiness/accessibility-offers-cache-20261113-clean.json`.
Full Python159/159 passes, including the offline transport and blocked-request
negative fixtures. Previous failed reports/checkpoints are retained.

Before tooling/docs edits, seven existing tracked files were independently
archived and verified in `deploy-backups/seo-cache-verification-before-20261113.zip`,
SHA-256 `17005fa71180b035ce94c11521cbb4b94f75d5ce1b7ae4446c652d6360cda855`.
The unchanged main source baseline is
`beca27b4f9525f4530c1e282214da41a16088a4d`; Git also preserves the original
three-asset homepage verifier before its additional checks.

Verification-tool source and required checks are reviewed in
[PR15](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/pull/15).
Initial source93e46fd passed both required gates in CI43404559274; the PR records
the final documentation checks and merge identity. GitHub performs checks only,
not deployment. The task-owned preview and all browser/scan processes are closed.
