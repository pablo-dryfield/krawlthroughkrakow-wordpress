# Responsive Image Sizing Follow-up

## Read-only Preparation, 13 November 2026

No image, layout, homepage file or provider setting changed in this review. The
earlier report's six 2000-square items are pictogram bitmaps, not portraits.
Original observations are preserved; this clarifies the actual next target.

A fresh isolated local Chrome context at each width, DPR1 except390/DPR3,
blocks external and non-read requests, loads the unchanged homepage preview and
scrolls only visible images into view before awaiting decode:

| Viewport | Actual CSS Widths | Browser-selected Source |
| --- | --- | --- |
|390/DPR3|All six hidden by existing responsive CSS|No candidate/request observed|
|768/DPR1|All six hidden by existing responsive CSS|No candidate/request observed|
|1024/DPR1|First row101px, second88px|1280-square variants|
|1440/DPR1|First row142px, second122px|2000-square originals|
|1920/DPR1|First row189px, second159px|2000-square originals|

All six `sizes` strings currently describe480/980/1280/2000px viewport-sized
slots rather than these icon widths. Existing square480 candidates are already
available. The six2000 source files sum215276 bytes; six480 files sum87066 bytes.
This is a static file-byte comparison, NOT measured saved network bytes, an LCP
improvement or a mobile saving.1280 versions can be larger than the2000 originals,
so do not assume a monotonic byte saving from dimensions alone.

The earlier exploratory DevTools page changed desktop to mobile mid-session;
its zero mobile boxes/cached requests are deliberately not cold-mobile evidence.
The fresh per-context observations above resolve that. The task-owned DevTools
tab was closed; no existing tab was changed or closed. No performance trace ran.

## Candidate And Required Proof

Use a source-bound sizing-only change for these six known images first. The
[HTML standard](https://html.spec.whatwg.org/dev/images.html) supports `sizes=auto`
for lazy images, with a fallback size list; do not apply it indiscriminately to
eager hero images or gallery images. The existing gallery warming switches
neighbouring DOM images to eager, so auto-sizing would no longer be applicable
there without a separate change. All six icons have explicit width/height, are
already lazy and are outside that gallery behavior.

Before implementing: new source checkpoint after the venue-guide release. Keep
original full-size media, URLs, links, alt text, square dimensions, captured CSS,
SVG paths, logo, hero, reviews, consent and providers unchanged. Verify template
rebuild reproducibility, source guards and real candidate selection at multiple
widths/DPRs, including unsupported-auto fallback/no-JS and hidden mobile views.
Check geometry before/after decode, real scrolling, all first-viewport pixels and
lower-icon appearance separately; changed encoding is not mathematical pixel
identity. Do not mask failures or relax tolerances to manufacture a pass.

Only after a tested staging release/cache purge should we report actual bytes
and decoded-pixel reductions. This target is below-fold/desktop sizing, not a fix
for mobile LCP: the original regular SVG remains the separately measured mobile
bottleneck. No rasterised replacement or approximate statue artwork authorised.
