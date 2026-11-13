# Content Accessibility Follow-up

## Scope And Progress

Website staging only. Production, storefront commerce, OmniLodge, plugin settings,
consent and the held health article body are unchanged. D03 remains partial;
passing a sampled automated audit is not full accessibility conformance.

- [x] Backup: full clean source `0f8fee5` archived before edits in
  `deploy-backups/seo-content-accessibility-before-20261113.zip`, SHA256
  `87f402e2d0baf9ed4528dcf6d3ebb368a1deb70608997fc50018adc5a3bd6c11`.
- [x] Original matched20 content views:182 remaining axe node instances to0 in
  `local-third/report.json`; incomplete/manual checks retained.
- [x] Expanded234-view discovery audit across every homepage/content route:
  `local-all-routes/report.json`,821 repeated node instances, not unique bugs.
  This is new coverage, not evidence that the first sampled fixes regressed.
- [x] Shared contrast, underlined inline links,24px gallery targets,32px module
  targets and named floating-booking landmark implemented in source.
- [x] Existing enquiry field labels associated without changing submitted names,
  values, choices, endpoints or form backends. Empty contact-form toggle named;
  carousel landmarks uniquely named; empty external module links named by host.
- [x] Source-preservation363/363, build2204/2204, keyboard324/324, FAQ exact
  panel screenshots12/12, Python177/177, shared JS40/40, PHP routing760/760 and
  stubbed forms31/31 pass. Later source/release checks must use final hashes.
- [x] Final stable-source234-view audit:485 repeated nodes,151 clear views,
  zero page/scan errors. Breakdown424 missing-alt,32 link-name,13 contrast,
  10 inline-link cues,2 each main/region/presentation rules. This is not a clean
  whole-site audit; medical hold and remaining editorial review stay open.
- [x] Content2072 independent staging hashes verified; WordPress state, homepage
  and storefront protected by that transaction, temporary helper removed.
- [x] Homepage232 hashes and discovery3 hashes verified on staging, saved state
  preserved, production protected. Origin content5848/5848, keyboard324/324,
  36-view automated sample0 violations/62 incomplete rule groups; discovery243/243.
- [x] Approved Cloudflare staging-only prefix purge through the authenticated MCP,
  accepted12:00:05.494UTC. Normal content5848/5848 (348 MISS), repeat5848/5848
  (348 HIT); homepage3 MISS then3 HIT with all10 active asset hashes current.
  Normal keyboard324/324, attribution31/31, discovery216/216 twice and36-view
  automated sample0 violations with62 incomplete rule groups retained.
- [ ] Review informative article photos individually, plus manual assistive
  technology, real mobile zoom and third-party states.

## Maintenance

`tools/content-accessibility.css` is the one shared style source. Both builders
call `content-accessibility-styles.mjs` to append an exact, idempotent block to
their owned runtime sheets. Captured styles, original photos and SVGs remain
unchanged. Do not edit the generated shared block independently.

The first broader follow-up (`local-all-final`,532 instances) ran while the last
Instagram fallback contrast changes were being finalized. Keep it as diagnostic
evidence, not final payload-bound proof. The audit now records source fingerprints,
per-view HTML hashes and fails if styles/runtime change during a scan.

Missing informative alt descriptions must not be replaced with blanket empty
alts or guesses from filenames. The expansion found212 distinct missing-alt
image sources, including the held article. `review-content-images.mjs` creates
offline contact sheets bound to original files/hashes. All9 sheets were visually
reviewed;209 descriptions are drafted in the private review directory, not yet
applied to the website. The3 held medical-article images are excluded. Several
photos do not match their old heading literally; descriptions follow the actual
photo rather than inventing a winter scene, venue identity or service claim.

## Preserved Failures

- `local-first`68 and `local-second`54 exposed incomplete selectors and the need
  to distinguish darker inline links with underlines. Both retained.
- `local-expanded-final`52 and `contrast-confirmed-final`3 exposed inline styles
  inside copied Instagram fallbacks; provider requests remain blocked/consent
  controlled. This fixes our static fallback, not Instagram's remote UI.
- Controls70/72 retain two strict logo raster mismatches at1024/1440, confined to
  the unchanged logo. All66 non-pixel assertions pass, including unchanged six-width
  statue framing, actual dot-corner/Space activation, named controls and exact form
  payloads. Logo geometry is also exactly equal after the existing400ms transition;
  a separate single-width sequential capture matches exactly. Foreground/wait and
  decoded pixels did not reliably eliminate the raster differences. A software
  rendering diagnostic71/72 is retained, not substituted as a green default run.
  No tolerance increase, logo/artwork edit or mathematical pixel-identity claim.
- Old seasonal harness472/498 assumes pre-accessibility review markup and mistakes
  the offscreen new-tab label for visible hero overflow, then dereferences removed
  aria-labels. Retained; not treated as passing release evidence. Dedicated current
  header/artwork/control checks replace those stale assumptions, not artwork.
- Initial Python176/177 correctly rejected stale sitemap source bindings; rebuild
  from the fresh complete catalogue review restored177/177. No guard weakened.

No forms, quotes, carts, orders, payments or emails are submitted by this QA.

## Release Checkpoint

Source2806096, PR20 required CI43419852036 passed both gates. Content backup
`ktk-code-pages-staging-20261113-114844.zip`, SHA256
`18e111c157e29a2ede007cb7e7fc076e1e1c4e295a2a5a26b7e13bda43882e36`.
`pages-publish.json` verifies all2072 owned hashes plus protected state. Homepage
backup `ktk-homepage-shortcode-staging-20261113-115239.zip`, SHA256
`411bbb05fe5559c5e3104746ebfc1bcb707b8c1ae2da78351ea44b75230c8bc4`.
Discovery backup `seo-discovery-staging-20261113-115442-215888.zip`, SHA256
`ed11468fbdd91e3c7677c51f4b06d14a8635e275b8a7805c6dbee980c89b6c9a`.
Origin/normal/repeat content reports are retained under `docs/code-pages/full-migration/`
as `content-accessibility-{origin,clean,repeat}-20261113.json`. Homepage, native
browser, accessibility, discovery and sanitized API purge reports are here.
No website production, commerce, account, plugin or consent settings changed.
