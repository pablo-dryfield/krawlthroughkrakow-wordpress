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
- [ ] Final stable-source full audit, staging release, normal-URL cache checks.
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
image sources, including the held article. Content/health holds remain explicit.

## Preserved Failures

- `local-first`68 and `local-second`54 exposed incomplete selectors and the need
  to distinguish darker inline links with underlines. Both retained.
- `local-expanded-final`52 and `contrast-confirmed-final`3 exposed inline styles
  inside copied Instagram fallbacks; provider requests remain blocked/consent
  controlled. This fixes our static fallback, not Instagram's remote UI.
- Earlier controls70/72 retain logo screenshot mismatches in hidden tabs during
  the existing400ms size transition. Foreground/wait and decoded pixel comparison
  are being checked without raising tolerances or changing application animation.
- Old seasonal harness472/498 assumes pre-accessibility review markup and mistakes
  the offscreen new-tab label for visible hero overflow, then dereferences removed
  aria-labels. Retained; not treated as passing release evidence. Dedicated current
  header/artwork/control checks replace those stale assumptions, not artwork.
- Initial Python176/177 correctly rejected stale sitemap source bindings; rebuild
  from the fresh complete catalogue review restored177/177. No guard weakened.

No forms, quotes, carts, orders, payments or emails are submitted by this QA.
