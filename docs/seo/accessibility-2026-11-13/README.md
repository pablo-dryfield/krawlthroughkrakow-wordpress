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

## Delivery And Remaining Work

Guarded staging content/homepage/discovery publication and final live/cache checks
are pending. No claim that Cloudflare serves this batch yet.

Contrast, small targets, the duplicate zoom-restricting storefront viewport,
manual screen-reader/zoom checks and other incompletes remain. Third-party frames
are blocked in isolated tests; their accessibility and functional CMP/payment
flows are not certified by these reports. Do not suppress failing axe rules or
claim full accessibility because the narrower semantic regression passes.

References: [axe API](https://github.com/dequelabs/axe-core/blob/v4.14.0/doc/API.md),
[WAI preliminary evaluation](https://www.w3.org/WAI/test-evaluate/preliminary/).
