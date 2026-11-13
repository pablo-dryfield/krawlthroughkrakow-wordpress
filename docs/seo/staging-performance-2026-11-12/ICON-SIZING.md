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
- [ ] Finish unchanged-control diagnosis and inspect lower icons/screenshots.
- [ ] Required GitHub checks, manual backed-up assets-only staging release.
- [ ] Exact232 owned hashes, protected saved state and current homepage assets.
- [ ] Scoped Cloudflare purge and normal/repeat desktop/Android/iPad checks.
- [ ] Live viewport candidate/byte verification and update both roadmaps.

This changes below-fold delivery. It does not solve the separately measured
mobile SVG LCP bottleneck, improve field CWV by itself, or authorise rasterising
the owner's exact vector artwork. Report response body bytes separately from
wire headers, cache effects and page-load timings.

Primary behavior reference: [HTML image size lists](https://html.spec.whatwg.org/dev/images.html).
