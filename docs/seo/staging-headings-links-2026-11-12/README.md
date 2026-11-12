# Heading And Link Corrections

## Scope And Status

Website changes are staging-only. The owner approved the exact legacy brunch
redirect below, not a general Ecwid migration. Production website pages, stores,
saved WordPress data and tracking/consent settings remain unchanged. OmniLodge
M01 reporting has separate implementation/deployment authorization and evidence.

The content, homepage assets and sitemap source bindings are deployed and
checksum-verified. Corrected origin verification passes4320/4320 across117 routes
and three device agents, including exact CSS bytes, full text/heading/form
contracts, redirects and production controls. Following the owner's staging-prefix
purge, normal/repeat each pass4320/4320, all351 HTML variants MISS then HIT.
Responsive/keyboard/real-image checks849/849 (64 views), focused component checks
292/292 (30 views) and isolated booking attribution24/24 pass. Metadata origin and
normal URLs each pass2216/2216; discovery243/243 origin and216/216 normal. No real
orders or emails were submitted. Do not equate this with the whole40-workstream
plan being finished.

## Changes

- Parsed DOM heading corrections across116 content routes and the homepage:
  one meaningful primary heading, ordered lower levels, sensible footer headings,
  and visible titles for39 archive/pagination routes. Existing titles are promoted
  where appropriate; no hidden keyword heading is added.
- PostCSS/selector-parser changes preserve original tag-selector specificity and
  visual styling after semantic tags change. Declarations, fonts, images, media
  conditions, body copy and forms remain. Archive titles intentionally add height.
- Reviewed aliases now link directly to their canonical destination. Added301s:
  `/student-trips-and-parties/` -> `/student-trips-poland/`, and the old dated
  post2681 URL -> its current Auschwitz article. Both source404/target200 and
  original post identity were reviewed before mapping.
- Owner-approved exact staging-only301:
  `/staging/store/Bottomless-Brunch-p661114244` ->
  `/staging/store2/bottomless-brunch-29/#book`. Incoming query parameters survive.
  Production, other products, trailing-slash variants, non-GET/HEAD methods and
  unrelated hosts/site configurations do not match.
- Refreshed sitemap source hashes, keeping the same123 intended canonical URLs.
- Patched development dependencies: Vite7.3.8, PostCSS8.5.32 and selector-parser7.2.1.
  npm audit reports zero vulnerabilities. Rebuilt storefront JS/CSS are byte-identical;
  there is no storefront payload release in this batch. CI remains checks-only.

Generators and reviewed policies own the changes. Do not edit source captures,
generated content/PHP, hashed CSS or sitemap bindings manually.

## Evidence And Preserved Failures

- Build2088/2088; PHP routing760/760; shared JS21/21 before the two additional
  literal-template tests; Python139/139 before the additional probe-cleanup test.
- The full staged whitespace scan flags inherited whitespace in the newly hashed
  original CSS copies. These bytes are deliberately retained to preserve source;
  manual-source whitespace is checked separately. Do not mass-format captured CSS
  or rewrite hashes after a verified deployment merely to remove those warnings.
- Original-node/content restoration plus CSS and computed heading styles/geometry:
  `local-matrix-qualified.json`,1516/1516,117 routes at390/1440. The render checks
  use isolated local assets/image stubs, not full real-photo pixel identity or CWV.
  Literal-dollar source repeat580/580 follows the comparator correction below.
- Preserve initial build/author-route classification failures and the real legal
  title weight regression. Zero-specificity inherited paragraph weight fixed the
  latter; assertions/tolerances were not relaxed.
- Initial live `origin.json` passed4303/4320. Eleven failures were the verifier
  incorrectly expecting redirects to discard its cache-busting query; application
  redirects correctly preserved it. Six hotel-page failures came from JavaScript
  replacement-string expansion of literal `$$` in expected markup. A callback-based
  exact-one-slot composer and regression tests fix the harness. Deployed hotel
  labels were correct and were not rewritten. Preserve the original evidence.
- Initial redirected PowerShell publisher launches treated native progress stderr
  as fatal. The first pages attempt partially uploaded; the homepage attempt stopped
  before its backup. Guarded reruns recovered the staging payload. The new native
  launcher retains progress and true exit status, with both success/failure tests;
  DPAPI cleanup is unchanged. This is not a claim of an initial automatic rollback.
- One expired abandoned task probe was recognized byte-for-byte, privately backed
  up and removed. Cleanup requires the staging path, filename, task-day expiry,
  exact generated-source fingerprint and unchanged pre-delete bytes; unknown/future
  probes are untouched. `expired-probe-cleanup.json` records zero unknown probes.

## Checkpoints

| Checkpoint | SHA256 |
| --- | --- |
| Pre-edit tracked source `seo-headings-links-before-20261112.zip` | `d001a3f90342599838cdf262d770235228dc7f302d7742a9b893a3445f3d17e7` |
|2031-file content retry `ktk-code-pages-staging-20261112-211531.zip`|`572f9eb88ccf4293c44e634161d49fddbddf5dc3768a7ec6e807c1d05c39f9f4`|
|Exact-alias follow-up `ktk-code-pages-staging-20261112-212306.zip`|`ffecd72eb254da0ec99f8848ac9f5a2d234abefe8da163f3b36278d905ceaaa3`|
|232-file homepage assets `ktk-homepage-shortcode-staging-20261112-212740.zip`|`24f802e2361037ebb59e398d1ad8961eb15aab41b2ad7b4db4ea51055fff3e66`|
|Discovery `seo-discovery-staging-20261112-212944-544909.zip`|`75fe271967c9884d860648ee53d5856f5c59ef56cfab2b0458496041f83e80f9`|

Publishers must run sequentially because they protect each other's payload hashes.
Both content transactions preserve saved WordPress state/homepage/storefront, and
remove their probes. Homepage publishing uses local-source/assets-only mode.
Discovery preserves production and protected staging hashes, with no cache purge.
Rollback restores only the relevant owned checkpoint; never restore the full DB.

Source PR7 passed both initial required gates43313499920; the final test-harness
and verification documentation follow-up still needs its own current CI/merge.
Owner production approval is still required separately. SEO results require later real Search Console observation;
these checks do not promise ranking improvements.
