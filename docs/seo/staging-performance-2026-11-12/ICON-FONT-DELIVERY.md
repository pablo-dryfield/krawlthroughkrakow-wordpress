# Homepage Full Icon Font Delivery

Started13 November2026; local verification completed14 November. Staging-only
D02 work. Deployed and font/cache/browser/regression verified on staging.
No measured LCP improvement claim. The original
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

## Initial Origin Diagnostics

Application336e529 / PR36 passed both required CI jobs43523867162. Homepage
publisher completed23:04:52UTC13 November (00:04:52Warsaw14 November),233 hashes
verified, assets-only/no saved post/settings rewrite, origin cache cleared200.
Backup232 original files: `ktk-homepage-shortcode-staging-20261113-230335.zip`,
CRC/all manifest hashes verified, SHA-256
`7e61075d59da921811f37f30797da969032cff30f27868febe0dc99a8b715f84`.
This publisher does not claim a full-database/protected-production snapshot.
No content/discovery/storefront/OmniLodge publisher was run for this batch.

Origin HTTP20/20 and10 active homepage asset hashes pass; source after publisher
2374/2374 still exact. Initial origin browser25/30 retained: its4 snapshot
comparisons incorrectly mixed the lightweight local preview's SVG/helper markup
with real WordPress markup (e.g. `ktk-hero-cta-icon` versus `icon
ktk-hero-cta-icon`), and a later load hit the30-second navigation timeout. All409
atlas glyphs/metrics and first4 active WOFF2 downloads passed,3/4 viewport PNGs
were exact;320 has a retained small raster difference. This is not a passing
live suite or an established application regression.

For the live controlled reference, both sides now request the same real staging
HTML. Only baseline runtime CSS is fulfilled with exact clean pre-release bytes
inside the isolated browser. No server files/settings, DOM, glyphs, screenshots
or tolerances are altered. Local comparison still uses the untouched reference
preview. Navigation uses the repository's normal60-second live timeout; HTTP
errors fail explicitly. The first diagnostic remains intact; no successful
cached delivery claim or edge purge yet.

## Staging Delivery And Cache Checks

The232 backed-up remote files also match every clean local pre-release byte.
This binds the controlled reference CSS to the actual old deployment, SHA-256
`76c6d95970a6a227c6585179a8b4232c26727a9b038ad7b82851ff530dcd4404`.

`icon-font-browser-origin-controlled/report.json`:54/54, all4 visible
geometry/text/styles/pseudo snapshots exact and glyph atlas exact; strict PNGs
2/4.320 differs1561 pixels (bbox36,18..178,900),1440 differs1041
(589,838..653,879). The unchanged-current-CSS control also54/54 has exactly the
same320/1440 pixel counts/bounds, plus1399 pixels in the unchanged768 logo.
This corroborates paint variability, not an excuse to hide the differences;
neither live run is a complete strict pixel pass. Both320 images were inspected.

The expanded atlas tests all409 characters at16/20/24/32/56/96px, each at integer
and half-pixel offsets:12 variants have zero differing RGBA pixels and exact
metrics. Normal cached browser54/54 ALSO has4/4 exact viewport PNGs and all12
atlas variants exact. Original typography/artwork and WOFF/TTF fallbacks retained.
Modern Chrome actually downloads just29392 encoded/decoded body bytes for the
full module font,29692 reported transfer bytes, with no initial original-module
WOFF request. This is an observed font-body reduction, not whole-page savings.

After successful origin checks, current Cloudflare API spec and exact zone/account
were validated; MCP purge accepted23:09:38.263UTC13 November, success:true,
result ID4303f6a45f815c5570bb4bba5f86a423, ONLY prefix
`krawlthroughkrakow.com/staging/`. The homepage-root prefix necessarily refreshes
staging device variants and cached staging store responses, not their content,
settings, orders or carts. No production/host/whole-domain purge or settings write.

Font HTTP20/20 origin,20/20 normal (all3 MISS) and20/20 repeat (all3 HIT), current
CSS/version/full-font hashes and both old fallbacks exact. All10 active homepage
asset hashes pass origin/normal; all3 normal HTML variants HIT. Existing image
size hints21/21 origin/normal, attribution136/136 before/after, discovery216/216
normal pass. Four-view local/normal axe audits each0 violations/10 incomplete
rule groups, no errors; not a full accessibility or consent certificate.

Full unrelated-content regression6193/6193 completed23:15:36.899236UTC,116
routes/119 current assets/all348 responses MISS,zero retries. This verifies the
unchanged content after the staging-prefix purge, not a content redeployment.
The warmed repeat also passes6193/6193, all348 responses HIT/119 current assets,
zero retries, completed23:18:40.084794UTC; evidence is retained in
`docs/code-pages/full-migration/homepage-icon-font-repeat.json`. Production, storefront commerce, original
saved WordPress content/settings and functional consent were not changed by this
transaction. No false claim of a full protected-database audit is made.

Additional real-mobile emulation390x844DPR3/touch:36/36, including all12 atlas
variants, controls and all JS/no-JS fallbacks, no overflow/errors. Actual PNG
visually inspected. Strict1170x2532 screenshot differs75 pixels,
bbox106,521..482,2063; the unchanged-CSS control36/36 produces the EXACT SAME
pair of PNG hashes and75-pixel difference. No masking/tolerance/image/font
change was used. This is not a complete live strict raster certificate.

Both generated roadmaps now show25 verified staging batches,1 separate live
OmniLodge batch,0 website SEO production releases. The original40 workstream
states remain1 complete/30 partial/8 not-started/1 deferred; this font batch is
not all of D02 or the entire plan. Roadmap browser regression317/317 passes.
Application bytes remain those of336e529; later QA/documentation changes need
final repository CI/merge but no second website deployment.

## Follow-up Performance Observation

After network test sessions closed, the same owned DevTools tab/profile settings
were reapplied:390x844DPR3,Slow4G,CPU4x,cold browser cache. One subsequent trace
reports LCP11712ms (TTFB564,delay202,load10153,render793),CLS0, no field data;
baseline was11934ms/CLS0. A single222ms difference is not a controlled multi-run
uplift or proof of real-user gains. The vector statue still dominates LCP.

Only the new full WOFF2 is listed among module-font requests,200; no duplicate
old WOFF. The dependency insight also contains an unrelated authenticated
OmniLodge required-actions URL absent from the target page's fetch/XHR list.
Do not attribute that chain to anonymous site users or call these MCP traces
fully uncontaminated. Third-party analytics requests occur under the unchanged
integration baseline; this is not consent verification. No controls were forced,
provider configuration changed or conversion submitted. Task tab13 closed;
original tabs8/10 were not navigated/changed. Raw traces were not saved.

Remaining D02 work includes repeatable isolated multi-template profiling and
real-user evidence where available; no blanket font-display swap, artwork
alteration or tracking change was used to improve a score. Production approval
is still separate.

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
