# Reduced-motion Sliders: Staging Only

## Starting Point

Hotel release PR68 is merged as `ccbd19686e2104409f7a9c399239bacfcea1b630`,
exact reviewed tree `cb799f508b152ca4ecb8c8ddbcd3259e7e10ed7e` from final
`33d3827d4d1717c1bb69e27890e0d840ed7f8fb7`. Final CI43686312421 and main
CI43686412191 pass both jobs. Completed local/remote branch removed; root only.
Release comments6890459403/6890477692 retain its54th staging delivery.
No further hotel upload or purge is required.

Current branch `codex/staging-reduced-motion-sliders` starts at that exact merge.
Before edits, source backup `seo-reduced-motion-before-20261115.zip` closed
successfully and passes CRC, complete3,428-Git-blob/local byte verification and
all3,653 ZIP entries. SHA256
`c19f205664a789eef77928fc0909ab0e6b95a0c3ab4b6f90aa1ea16ded4305d2`.

## Intent And Boundary

Current autoplay already honours the visitor's reduced-motion preference, but
inherited CSS still animates slider descriptions and images. Cancelling those
animations must also address separate opacity0 rules, without exposing inactive
slides. Normal-motion appearance, arrows, keyboard, dots, pause state and
dynamic preference changes must remain functional. No blanket animation reset,
content rewrite, photo change, commerce/consent behavior or production release.
The active competition/form, specialist hold and pending Halloween evidence are
unchanged. Both roadmaps count54 verified staging deliveries.

Primary references read15 November:
[MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
and [W3C animation-from-interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
The W3C page describes an AAA criterion; automated AA checks alone cannot certify
it or complete manual accessibility.

The initial read-only census covers all116 current bodies plus21 real local
preference/JS views of the seven slider routes. Only QA/documentation has been
written; no CSS/application change, build, upload or purge yet. Finish the census
before choosing the smallest style/source boundary and independent tests.

## Census And Candidate

The census closes successfully:116 bodies/21 preference-JS views,32 roots with
the shared slider class. Six are text sliders with19 slides;26 are full-width
photo galleries and have no text-slide content. Ten reduced-motion views across
five routes still report inherited fadeBottom/fadeLeft, including opacity0 at
the captured initial moment. No observed page/provider/write errors or source
changes. No clinical or full-accessibility conclusion is inferred.

The candidate uses the existing final accessibility-style generator. Exactly one
application file changes, `runtime.css`, plus its maintained CSS input and QA.
One reduced-motion-only rule sets `animation:none !important` and
`opacity:1 !important` on four text-slide content selectors. It does not change
display, visibility, transitions, transforms, gallery selectors or JavaScript.
Every other application Git blob is exact, including all116 article/page bodies,
history/metadata/photos/forms/competition/medical content and discovery policy.
Independent source2,377 and seven style/idempotence units pass; the repeated
21-view census now has zero reduced-motion animations on these parts. All
observed part transition durations were already0s, so no broader transition
override is added. Responsive/normal/dynamic/keyboard/visual proof and guarded
staging release remain; no upload or purge yet.

## Ownership And Responsive Diagnostics

Initial browser865/867 reached48/84 views before timing out on Other Tours320px
Next. Direct DOM/CSS inspection confirms the original `.et_pb_slider_0` has
`display:none !important` at max767 and768-980px; the module is intentionally
hidden below981px, not a missing runtime control. All original styles remain
exact. The harness now pins this exact route/module/breakpoint exception, asserts
all other modules remain shown and exercises its controls at1440px. It does not
force hidden mobile content visible or skip an unknown missing control.

The first Python run also correctly failed one shared-style equality check:
`content-accessibility.css` belongs to both homepage and code pages. Rather than
regenerating or altering the protected homepage bundle, this batch's own eight
lines were removed from that shared input/compiled block and isolated in
`slider-motion.css` with a code-page-only generator. The shared source, generator
and original style tests are exactly restored. The new prefix is before all old
CSS, preserving existing adjacent builder anchors and every original CSS byte.
The independent allowlist still has only the same two declarations. New style
units include idempotence and atomic rejection of changed/duplicate/moved/partial
markers; the main builder and CI are wired. Independent source2,378 passes.
These diagnostics supersede the initial shared-input recipe, not its evidence.
No application upload or purge has occurred.

The isolated84-view matrix subsequently completed but report1,163/1,165 stopped
in the separate autoplay tests. The stag page's auto-class gallery has exactly
one photo: unchanged runtime intentionally returns before creating controls or
a timer. Newsletter has eight photos and stag/hen has three slides; those are
the genuine auto-rotating components. The census now also records gallery-slide
counts. The harness pins the one-photo stag fallback and tests it stays static
after preference changes; only the two multi-slide components are expected to
resume/pause. No runtime/application change or longer timeout resolves this
diagnostic. All seven completed axe views had zero violations/ten incomplete
groups; all14 normal/reduced phone captures were actually inspected. Final
responsive/dynamic proof must still close successfully before release.

Read-only presentation leads for later work: the Blog's ten-slide teaser content
is separate from the197 reviewed archive cards and may still contain old
summaries. Stag/hen's older paragraphs also still contain undated package and
intoxication promises outside earlier targeted planning modules. Neither is
silently counted as reviewed or edited in this style-only batch. Inventory and
source-bound follow-up are required after this release; do not modify held
medical/competition/testimonial material incidentally.

Final interaction report1,170/1,170 completes all84 views and both genuine
autoplay/pause preference changes plus the single-photo fallback. However visual
review caught one blank jobs normal-motion screenshot; it is not accepted as a
visual pass. An initial ad-hoc diagnostic incorrectly tried Next on that page's
single-photo gallery and timed out without changing anything. The corrected
read-only probe proves the paint boundary: immediately after scroll its image
has empty currentSrc/completefalse/naturalWidth0, while750ms later the original
`61f5b2154efa-Kirsty.jpg` is complete at367px natural width. No opacity/animation
ancestor caused that observation. The harness now waits for in-view images to
load/decode and two paint frames before capture, with an explicit assertion;
no application change, mask, image replacement or timeout relaxation. Other
local-raster differences remain recorded in `local-screenshot-diagnostics.json`.
The full builder and a fresh final visual/functional run are next, not deployed.

The first full builder stopped before the page loop: the older Memorial helper
requires its existing block at byte0. This caught the initial motion-prefix
placement; no body/media regeneration or remote operation occurred. The new
generator now inserts immediately after that unchanged leading block and runs
after the Memorial helper. Its idempotence and independent source guards pin
this exact position; a new negative fixture rejects a missing leading anchor.
No older guard, CSS rule/declaration or original byte is weakened or changed.
The full build must close before immutable/source/browser audits resume.

## Final Local Release Candidate

Full116 builder46146 closes successfully, zero missing/errors; immutable
1,389-media ledger remains exact SHA256
`f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691`.
Independent source2,378/reference2,320/final browser1,184 over84 views/forms501/
JavaScript378/Python215/PHP763+31+143/roadmap317 and guarded2,073-file dry run pass.
Normal-mode comparisons show zero effect when this media rule is disabled;
two real autoplay timers and pause preferences plus the single-photo fallback
are verified without freezing those dedicated cases. Seven axe views have zero
violations/ten incomplete groups, not a full manual accessibility certification.

Fourteen final390px images are accepted only after in-view photo load/decode
and two paint frames. Eleven exactly match the previously inspected candidate;
the other three were separately inspected. Strict differences are confined to
existing photo bands: Blog normal60,909 pixels `[0,0,390,267]`, hen normal25,390
`[39,30,351,238]`, stag/hen reduced17,101 `[39,0,351,83]`. No masks, tolerance,
cause inference or original/full-page pixel claim. The formerly white jobs
normal view now shows its original decoded photograph. Comparisons remain in
`painted-screenshot-comparison.json`; historical failures are not overwritten.

Exactly one application file changes by eight inserted lines. All other
application Git blobs, shared homepage source/generator, runtime.js,116 bodies,
publication/metadata/photo files, discovery, commerce, consent, active competition
and medical hold remain exact. No deployment/purge/commit yet. CI and guarded
staging/origin/normal/warmed proof remain; roadmaps stay at54 verified deliveries.

Required CI43688578203 passes both jobs for application
`2cb1dd5463061a5340ec248143d10c51f701fcce`, PR69. Guarded incremental staging
publication is now running; do not edit/rebuild the application or purge until
the publisher and all origin checks close successfully. No discovery publication
is required: its data/definition bindings remain exact.

The read-only Blog teaser inventory has exactly ten slides, with two original
title/Read More links each, no inline image elements and unchanged background
style bindings. Eight destinations already have canonical reviewed summaries:
team building, costumes, pranks, first karting guide, established NYE guide,
nightlife dating, Jewish Quarter bars and spa hotels. The other two are the
homepage and pending Halloween article. A later source-bound excerpt pass can
reuse only those eight reviewed identities while preserving original titles,
links/backgrounds and both other slides. No teaser/body edit has been made.

## Staging Publication Under Verification

Guarded2,073-file publication closes at07:10:31.687993UTC on15 November, application
`2cb1dd5463061a5340ec248143d10c51f701fcce` unchanged. Every local/Git/remote SHA
matches; saved WordPress state, homepage and storefront stay exact, helper removed.
The four-entry rollback `ktk-code-pages-staging-20261115-071013.zip` independently
passes CRC, exact manifest/entry set and all per-entry SHA values. Archive SHA256
`cbfc35816f98b98d653af94913c03cd4a988968ed2fa3bc9b266ca1858d27b48`.

Release source2,378 and origin homepage10/icon21/ET20/social15 pass. Complete
origin,84-view motion, forms, attribution and discovery verification are running;
no edge purge yet. Only after every origin process closes green may the approved
staging-prefix purge and normal/warmed checks proceed. No discovery upload,
application rebuild or production/OmniLodge/commerce/consent change is needed.

The separate read-only stag/hen inventory finds12 text interiors. Interior0 is
the original two headings;1-3 contain the old group experience, guaranteed
entry/queue and broad arrangement claims. Interior4 contains the active enquiry
form, and5-11 are the social/contact/legal/booking footer. None of1-3 contains a
form or image element. A later review can stay within those three text-only
interiors, with original headings, media, enquiry form/options/recipients and
footer exact. No next-batch draft or body edit is included here.

All origin jobs then closed green: full6,193 at07:18:55.965227UTC with348 DYNAMIC/
119 assets/zero retries, browser1,184/forms501/attribution493/discovery243/source
2,378 and homepage10/icon21/ET20/social15. Only the staging prefix was purged
through MCP at07:19:44.889UTC after a fresh POST schema and exact active zone/
account validation. `staging-purge.json` retains acceptance; normal/warmed proof
is separate and still running. No host/domain/production purge was submitted.

## Verified Staging Delivery 55

All remaining processes are terminal and their reports pass. Full normal6,193
closes at07:26:12.685960UTC (336 MISS/12 HIT); warmed6,193 closes at
07:28:24.462603UTC with348 HIT. Each covers116 routes/119 assets/zero retries.
Normal browser1,184 over84 views, forms501, attribution493, discovery216 plus
repeat216 and homepage10/icon21/ET20/social15 pass. Application remains
`2cb1dd5463061a5340ec248143d10c51f701fcce`; no rebuild/reupload/second purge.

All14 actual cached390px normal/reduced captures were inspected in four
unmasked contact sheets. Five match the previous local captures exactly; other
strict differences remain in `normal-screenshot-comparison.json`, including
Blog97,795/97,857 and jobs169,242 pixels. These are not all photo-only differences:
the earlier local Blog captures contain a black teaser area and missing fixed
button lettering, so their earlier visual acceptance cannot prove this region.
Fresh four-view read-only Blog diagnostics capture visible text and original
magenta styling locally and on staging; reduced-mode DOM text/computed styles/
geometry are exactly equal. Raster differences still exist, and their cause is
not established. Earlier captures/reports remain unchanged. This supersedes any
earlier claim that those local Blog rasters were a complete visual control.
All cached staging views show the expected content, controls and original photos;
no masks, tolerance or whole-page pixel-equivalence claim is used.

Seven cached axe views retain zero violations/ten incomplete groups. Real-device,
assistive-technology and provider checks remain open. Both roadmaps now count55
verified staging deliveries; article-review and197-summary counts do not change.
Production, all116 bodies, runtime JavaScript, homepage styles, commerce,
functional consent, active competition and specialist hold remain exact. Final
documentation CI/merge and completed-branch cleanup are next.
