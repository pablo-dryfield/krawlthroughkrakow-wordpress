# Homepage Icon Sizing

## Scope And Rollback

Staging-only D01/D02 batch from merged5ea7492. Pre-edit Git archive
`seo-icon-sizing-before-20261113.zip`, SHA256
`ce4833bec1cdfdd3e2e6f9677865e11fe744d6aca070a0f61ea2ae9cd3db277e`.
Own detached comparison: `deploy-backups/seo-icon-sizing-baseline`.

Only six `sizes` attributes in generated `parity-seasonal-content.php` change.
No image files, src/srcset, alt text, links, dimensions, visible copy, styles,
hero SVGs, logo, metadata, providers or consent logic change. Existing thumbnails
and full originals remain available. Source policy and complete-set atomic guards
live in `tools/homepage-media-policy.mjs`; the original capture is not edited.

The explicit list `(max-width: 980px) 40vw, 12vw` conservatively covers the
measured slots, including no-JavaScript mobile views. It requires no JavaScript
or browser auto-sizing support. All other images retain their exact size hints.

## Rejected Candidate And Diagnostics

First `auto, 12vw` trial:174/193 browser checks, no page errors/writes. Actual
mobile icons gained intrinsic size and became visible, changing lower geometry;
this was a real application side effect, so the candidate was rejected. Two
fallback-fixture expectations also incorrectly compared rewritten response hints
with unmodified source. Preserve `icons-local/report.json`; it is not a pass.

The earlier read-only preparation described mobile icons as hidden by responsive
CSS. More precise diagnosis: their existing lazy/intrinsic-size state leaves
zero-sized image boxes with JavaScript, whereas no-JavaScript eager loading can
show them. A zero-sized rect can still exist in `getClientRects()`. Final tests
use positive width/height and actual Playwright visibility. No mobile CSS was
changed, and that existing behavior is not claimed fixed by this sizing batch.

Revised explicit list:152/158 initial browser checks pass. All non-raster checks
pass across11 viewport/DPR/JavaScript cases: exact normalized HTML and image/
heading geometry, decode/resolution, gallery keyboard use, no overflow, mobile
requests and smaller desktop response bodies. Six strict top-raster mismatches
remain; tiny differences are in unchanged artwork/text, not the lower icons.
No screenshot masks or tolerances were added. An unchanged-baseline repeat is
running to diagnose paint stability before release. Do not call this a fully
passing strict pixel suite or a performance uplift.

## Verification And Release

- [x] Source-bound policy10 positive/negative/idempotency tests.
- [x] Full shared JavaScript94 and Python180 pass; PHP homepage integration pass.
- [x] Builder reproducible; captured styles/original assets unchanged; exactly
  one application file differs by the six reviewed attributes.
- [x] Unchanged-control116/121: five strict raster mismatches even between two
  untouched baseline views (36-968 pixels of3.2-15.6 million). Final candidate
 153/158 retains five strict raster failures; all source/layout/function checks
  pass. No masks/tolerances or artwork edits. All six lower icons inspected.
- [x] Application8c9e0ed / PR29 required CI43480899255 both jobs pass. Manual
  assets-only staging publisher verifies232/232 independent hashes; no homepage
  post/settings rewrite. Only the six intended attributes differ from the source
  checkpoint. This publisher is not claimed to snapshot the whole database.
- [x] Remote backup `ktk-homepage-shortcode-staging-20261113-181816.zip`, SHA256
  `02173201fa3601f7268fc6a1921800f73f0c9d4041ebe0b4fcf4e1474c0185f0`.
  Origin homepage/current10 asset hashes pass; origin cache cleared by publisher.
- [x] Staging-only Cloudflare purge accepted18:20:27.438UTC. Normal three-device
  home responses MISS, repeat all3 HIT; all10 assets/tokens current. Independent
  source-hint checks21 origin/21 normal/21 repeat, all3 normal/repeat HIT.
- [x] Actual cached live browser88/88 across11 width/DPR/JS views, no page errors
  or allowed non-read requests; gallery keyboard, decoded resolution and no
  overflow pass. Attribution101/101, no orders or navigation. Roadmap advanced.

The first live sizing report had all88 assertions passing but exit1 because it
treated36 intercepted Google/DoubleClick telemetry POSTs as actual writes. The
corrected harness still aborts EVERY non-read request, reports counts/origins,
and fails any commerce write attempt. Final report:36 blocked telemetry writes,
0 commerce attempts,0 allowed writes; guard fixture added, shared JS95 pass.
No provider, consent choice or application byte changed for this correction.
This is not a consent audit; retain the initial report.

The roadmap generator correctly rejected a focus on not-started C01. Its initial
285/317 browser and Python failures are retained; source focus was corrected to
active T05/M02/D02 before regenerating both outputs. No status was inflated and
no generator/test guard weakened.

## Measured Delivery

Local cold contexts and cached live responses agree on candidate bodies:

| Conditions | Before Bodies | After Bodies | Selected After |
| --- | ---: | ---: | --- |
|981/1024 DPR1 JS|286922 bytes|87066 bytes|Six480-square|
|1440/1920 DPR1 JS|215276 bytes|87066 bytes|Six480-square|
|1440/1920 DPR3,2560 DPR2 JS|215276 bytes|209788 bytes|Six980-square|
|390/768 JS|No icon requests|No icon requests|Existing collapsed state retained|
|390 DPR3 /1440 DPR1 no-JS|215276 bytes|87066 bytes|Six480-square|

These are observed WebP response-body bytes, excluding wire headers and other
resources, not whole-page savings or field timings. Ordinary desktop saves
128210 bytes; high-density savings are much smaller and preserve resolution.
At1440 DPR1, six decoded physical sources fall24 million to1.38 million pixels;
this is not a measured browser-memory or LCP result. Original files remain.

This changes below-fold delivery. It does not solve the separately measured
mobile SVG LCP bottleneck, improve field CWV by itself, or authorise rasterising
the owner's exact vector artwork. Report response body bytes separately from
wire headers, cache effects and page-load timings.

Primary behavior reference: [HTML image size lists](https://html.spec.whatwg.org/dev/images.html).
