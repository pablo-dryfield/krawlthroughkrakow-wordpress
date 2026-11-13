# Homepage Full Icon Font Delivery

Started13 November2026; local verification completed14 November. Staging-only
D02 work. Not deployed or a measured LCP improvement yet. The original
captured CSS/artwork and every content-page asset remain unchanged.

Pre-edit Git archive3153 files: CRC and every tracked source byte verified.
`deploy-backups/seo-homepage-icon-font-before-20261113.zip`, SHA-256
`5faf3c4d820748450556e3f54d0f2e8ac24d6e33abb9580efabba4ef2019c7e3`.
Own clean comparison worktree is `deploy-backups/seo-homepage-icon-font-baseline`.

## Scope And Reproduction

The measured homepage uses the original full ETmodules WOFF,92084 bytes.
Content pages can use a different6152-byte31-glyph subset with the same family
name. Do not replace those faces. `font-resilience.css` is copied to content
pages, so it is deliberately NOT used for this homepage-only override. Its
existing embedded Passion One fallback stays exact.

`python tools/build-homepage-icon-font.py` verifies the committed binary;
`--write` mechanically reproduces it with FontTools4.66.1/Brotli1.2.0 and timestamp
recalculation disabled. It fails on changed source/version/table coverage.
Full output29392 bytes, SHA-256
`492ad8fed6d9b9c10e8e2f4c0f669c4930e807082594460a05ded9662eeecc2d`.
All10 non-head semantic table XML representations match, including glyf/hints,
names, cmap and metrics.409 mapped characters/410 glyphs retained. Head differs
only in recomputed checksum and required bit11 (flags11 to2059); every other
head field is exact after normalizing those two fields. This is not a subset.

`tools/homepage-icon-font.mjs` validates all3 exact source/output hashes before
inserting one owned face into homepage `parity-runtime.css`. It keeps weight400,
normal style and display:block, with original WOFF then TTF fallbacks. Original
`parity.css` is untouched. The existing homepage builder regenerates this block;
normal builds/CI verify committed bytes, with no font-converter dependency.

The62692-byte/68.08% body difference is a format comparison until actual active
browser downloads are verified. Local Chrome now confirms29392 decoded/body
bytes for its sole initial full-module font request at all4 widths. It is not a
promised whole-page saving or LCP gain. The regular statue remains measured LCP.

## Local Verification

`icon-font-source.json`:2374/2374, all tracked staging application bytes exact
except the one precise CSS block; exactly one added binary. All code-page
subsets, medical article, original artwork, consent, forms and commerce exact.
The homepage build succeeds and its capture/build report differs only in time.

`icon-font-local-final/report.json`:50/50; expanded actual browser delivery
`icon-font-local-delivery/report.json`:54/54. Both runs have4/4 exact viewport
PNGs at320/390/768/1440 and identical visible geometry/typography/pseudo glyphs.
Full409-character1536x2496 atlas:zero differing RGBA pixels, all measured text
metrics exact. Actual atlas and390px screenshot visually inspected. Keyboard
menu open/Escape and gallery dialog open/Escape pass. JS-enabled AND disabled
contexts load WOFF2 normally, original WOFF when WOFF2 is blocked, and original
TTF when both modern sources are blocked. No horizontal overflow/page errors.
Providers/non-read/commerce requests blocked; no submissions or orders created.

Font contracts5/5, shared JS123/123, Python184/184, existing page PHP763/763,
stubbed forms31/31, expiry PHP143/143 and homepage integration pass. New font
contracts run in CI without introducing the converter into normal builds.
Homepage assets-only dry run includes233 files; no saved post/settings rewrite.
Required CI and guarded staging/browser/cache verification remain.

## Baseline Observation

One fresh isolated DevTools trace before edits:390x844DPR3,Slow4G,CPU4x,
cold browser cache. LCP11934ms (TTFB565,load delay189,load duration10432,
render delay749),CLS0; no CrUX data returned. Original full WOFF requested200;
FontDisplay insight flags block/3000ms for it and the separate brands face.
That suggestion is not applied blindly to an icon font. Provider-returned
summary/insights only; no saved raw trace or controlled uplift claim. Original
user tabs8/10 untouched; task tab13 only. Functional consent unchanged.

Initial local build stopped at the existing offer-CSS adjacency guard: the new
font block was placed between offer clearance and shared accessibility. No
deployment occurred. The generator now puts its block before both, retaining the
existing adjacency guard; a regression test covers order and idempotence.

The initial browser harness reached its no-JS context but waited forever for
requestAnimationFrame callbacks that disabled scripting cannot run. Its partial
eight viewport PNGs/all-glyph atlas remain in `icon-font-local-initial`; it was
stopped, not reported as a passing run. Settlement via JS callbacks is now only
used in JS-enabled contexts; no application change or no-JS assertion removed.

Primary sources: [W3C WOFF2](https://www.w3.org/TR/2024/REC-WOFF2-20240808/),
[FontTools TTFont](https://fonttools.readthedocs.io/en/latest/ttLib/ttFont.html),
[WOFF2 writer](https://fonttools.readthedocs.io/en/stable/ttLib/woff2.html).
