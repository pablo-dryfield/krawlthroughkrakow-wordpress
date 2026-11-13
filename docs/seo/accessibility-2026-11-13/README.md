# Accessibility And Native Controls

Staging-only D03/T10 follow-up. Production, commerce, consent and account settings
are unchanged. This is a bounded markup/keyboard improvement, not WCAG certification.

## Checkpoint

Before edits: `deploy-backups/seo-accessibility-before-20261113.zip`, all 2,956
tracked entries independently verified, SHA-256
`dcc899eb30b971e6cf0da877c273ca8abc78d5d657056d8d7103f23175aaa6ec`.
Baseline Git tree: `a1a2f6b89f1bd516172a31642afcd78266df42c3`.

## Findings And Fixes

Pinned dev-only axe-core 4.14.0 initially scanned 13 route types at 390/1440px:
26 views, 680 violation-node instances, zero scan errors. These are not 680 unique
bugs. The archive also throws an inherited late-Divi-CSS error in both views;
the diagnostic and initial failed reports are preserved privately.

- Build-time `accessibility-semantics.mjs` adds main landmarks/focusable skip
  destinations, source-derived footer social names, purpose-labelled otherwise
  unnamed About Us Instagram links, decorative alt only for the two repeated
  review thumbnails, the existing meeting-map frame title and a captcha label
  bound to its live question. No answer or form/backend is changed.
- Archive title wrappers are explicitly presentational, retaining their H1,
  instead of creating a second page banner.
- FAQ headings now contain real buttons. Native Enter/Space click once; panel IDs,
  expanded state and accordion sibling closure stay synchronized. Existing heading
  and pseudo-icon pointer activation remain. Scoped CSS inherits the typography.
- Hero review links derive their names from actual visible platform/rating/count
  text; a shared accessible description explains opening a new tab. This avoids
  overriding visible labels with a mismatched constructed string.
- The existing complete-script fingerprint now also recognizes the **observed**
  `et-cache/taxonomy/category/<id>/et-divi-dynamic-late.css` loader. Mixed scripts
  and unrecognized paths remain untouched. This removes only a loader referring
  to a deliberately absent Divi style handle, not other integrations.

The held health article's body, shell and definition remain byte-identical. Other
115 bodies/shells differ only by the reviewed semantic attributes. All original
URLs, titles, descriptions, schema, dates/bylines, text, links, media and captured
page CSS remain unchanged. Do not manually edit the generated files.

## Local Verification

- Complete generation 116/116; build verification 2,204/2,204.
- Strict baseline DOM/metadata/CSS plus native-control fixtures: 360/360.
- Browser keyboard/reflow/targeted semantic checks: 288/288 over nine routes at
  320/390/768/1440px. This is responsive reflow, not an actual browser-zoom test.
- Existing component suite: 336/336, including locally stubbed form responses.
  No email, real cart, quote, order or payment was submitted.
- FAQ visual comparison: 12/12; all 12 headings' original labels/computed styles
  and exact geometry retained at four widths; first-panel screenshot bytes equal
  at each width. The 390px FAQ/contact screenshots were visually inspected.
- PHP page integration: 760/760; homepage integration plus additional strict
  loader-preservation tests pass; shared JavaScript 35/35.

Preserve `browser-local-first` 280/288: it caught the remaining Instagram and hero
name issues. `browser-local-second` and `browser-local-final` each pass 288/288.
An initial Python run failed because sitemap source hashes correctly rejected
new page definitions. The unchanged 123-URL discovery selection was rebuilt from
a fresh 24-product public audit; do not weaken that binding guard.

The old PHP review test required an overriding aria-label even when that label
caused the observed visible-name mismatch. It now requires natural visible names
without an override plus the real, unique new-tab description; browser axe checks
independently verify the accessible result. Newly hashed shell files retain the
captured whitespace; Git's trailing-whitespace warnings on those new paths are
not a reason to bulk-format immutable source markup. Handwritten-code diff checks
are clean, and the strict DOM comparison still passes.

## Delivery And Remaining Work

Guarded staging deployment is complete. Content publisher independently verifies
all 2,051 hashes and unchanged saved WP/homepage/storefront state; its helper is
removed. Completed 00:57:59 UTC. Backup
`ktk-code-pages-staging-20261113-005341.zip`, SHA-256
`d6ac8f70eacc5caf51997d55481adff65ab33121ad7d8b33d3034fbeae09978f`.
Homepage assets-only verifies all232 hashes without rewriting saved posts/settings;
backup `ktk-homepage-shortcode-staging-20261113-005948.zip`, SHA-256
`e63f5cf5de63e8125ea628043c0d4eb8005d668da9e5734322fcb248c26ffaf3`.
Discovery verifies all three hashes, protected staging/production and saved state;
backup `seo-discovery-staging-20261113-010209-714677.zip`, SHA-256
`606e883c115122b301cf3130a3fcfa9aba8e1783ebfec5bb5deb860bb1fc41c5`.
It changes source bindings, not the123 selected URLs or any production endpoint.

Live origin keyboard/reflow/semantic checks pass324/324 and discovery243/243.
Final broad content and normal cached-URL verification remain pending the scoped
Cloudflare refresh requested from the owner. Website production is unchanged.

Preserve `browser-content-origin`276/288: it started before the separate homepage
publisher finished and therefore correctly rejected the old homepage. The later
`browser-origin-final` has288/288 semantic checks but exit1 because a harness
counter mislabelled145 **blocked** external collection POST attempts as actual
mutations. A bounded diagnostic identifies Google /ccm/collect, /ccm/s/collect and
/g/collect paths. All were aborted before transmission. The corrected harness
retains sanitized blocked attempts separately, rejects any attempted first-party
commerce/form writes, and passes324/324 (`browser-origin-guarded`). No tracking,
provider or consent code was modified to make that test pass.

The initial storefront scans did not wait for client handoff, so are not a full
interactive-product audit. A separate explicit handoff-ready six-view baseline
finds61 violation nodes on the **unchanged** storefront and six inherited fbq
errors with the provider blocked. Catalogue landmarks/stamp semantics, select
visible-name matching, zoom and contrast need their own staging follow-up.
Do not compare its count directly with the public-initial scan or call it a
regression caused by these content-page changes.

Contrast, small targets, the duplicate zoom-restricting storefront viewport,
manual screen-reader/zoom checks and other incompletes remain. Third-party frames
are blocked in isolated tests; their accessibility and functional CMP/payment
flows are not certified by these reports. Do not suppress failing axe rules or
claim full accessibility because the narrower semantic regression passes.

References: [axe API](https://github.com/dequelabs/axe-core/blob/v4.14.0/doc/API.md),
[WAI preliminary evaluation](https://www.w3.org/WAI/test-evaluate/preliminary/).
