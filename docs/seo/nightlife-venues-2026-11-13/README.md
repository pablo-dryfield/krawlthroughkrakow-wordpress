# Nightlife Overview Refresh

## Scope And Progress

Staging-only C03 continuation using the owner's sixteen venue recommendations.
No production, commerce, pricing, OmniLodge, plugin, consent or account changes.
The budget and club/music guides are researched, not refreshed by this batch.
The2020 guide receives only a historical notice and link to the current overview;
its original article, media, byline and publication day remain exact.

- [x] Before application edits, tracked source602d058 archived in
  `deploy-backups/seo-nightlife-before-20261113.zip`, SHA256
  `4c83734be17061ea62b920102ce44ddc7e3bb1da66a6fe3eb72747a627acbfb8`.
  Its application bytes are identical to the subsequently merged1104f58 baseline;
  only final link-release documentation differed. Separate1104f58 comparison
  worktree retained until verified delivery/merge.
- [x] Owner-selected Frantic at Slawkowska6a and Aura on Szpitalna, not the
  conflicting old Frantic address or the unrelated Aura. Owner supplies curation;
  primary venue pages supply only the published details actually read.
- [x] Nine text modules refreshed on the existing `/krakow-nightlife/` route.
  All sixteen names, dated review note, useful programme/menu links, practical
  payment/transport/entry guidance and native relevant booking/group links.
- [x] Remove unsupported Europe-wide density claims, old award guarantees,
  universal walking times, bartender accusations and legal absolutes. No invented
  prices, hours, personal visits, partnerships or specific crawl itinerary.
- [x] Keep original three photos/embeds, forms, shell, captured CSS, URL/title/
  description/canonical/robots and all114 other content pages unchanged. The2020
  guide gets a native notice inside its existing introduction, not a dated rewrite.
  Only the
  hub's generated schema name and final breadcrumb name follow its new H1.
- [x] Final build2320/2320, exact source/fixture395/395 and focused native
  browser104/104 pass locally. Eight320/390/768/1440 automated views have0
  violations and12 incomplete groups; no full conformance claim. Screenshots
  inspected. Python177, shared JS69 and roadmap231 pass before release review.
- [ ] Required CI, guarded staging deployment and actual origin/cache checks.
- [ ] Final roadmap/delivery update, merge and own temporary reference cleanup.

## Maintainable Source

`tools/content/nightlife-hub.html` is the reviewed editorial source, not generated
markup to edit by hand. `tools/nightlife-editorial.mjs` binds the exact immutable
original capture and replaces only nine known text modules at build time. It
validates the complete revision before mutation, rejects unknown destinations,
script/event attributes, unexpected original media, missing/duplicate modules and
changed source prefixes, and leaves unrelated/medical keys untouched. Reapplying
the exact revision is idempotent; changed existing review content fails closed.

Body text is explicitly left-aligned in those eight refreshed body modules only;
the existing centered H1, original font assets and responsive CSS remain. The
first screenshot preserved inherited justification, which was readable but had
awkward word gaps. The improved local screenshots and earlier diagnostic are
retained, not a pixel-identity assertion for intentionally rewritten content.

Adding the archive to narrow QA exposed a pre-existing359px page width at a320px
viewport, also reproduced on the untouched1104f58 reference. Native Instagram
fallback blockquotes forced326px minimums. Four page-scoped rules at<=600px now
let their containers/text wrap instead of clipping or hiding them. Both registered
and not-yet-registered fallback classes are covered; provider loading and consent
are unchanged. Original article HTML remains exact after removing the one notice.
Retain the initial103/104 runs (including the first registered-only CSS attempt).
The final two-state browser run passes104/104. Captured CSS remains unchanged;
this deliberate responsive override is in the code-owned runtime sheet.

`RESEARCH.md` separates owner curation, successfully read primary facts and
inaccessible/ambiguous sources. It records current Banialuka menu examples for
the next budget-guide phase; no prices were inserted into this overview.
KTK team confirms business facts and updates continue in this codebase. No named
individual reviewer or recurring cadence has been invented or scheduled.

## Discovery Dependency

The H1 changes the existing WebPage/breadcrumb names, so its page-definition hash
changes. Initial Python run correctly stopped at176/177 because discovery's old
source binding was stale. Preserve this diagnostic; don't weaken the guard.
Refreshed public catalog review covers all24 products and the same6 selected
editorial products. The fresh123-URL discovery build retains the exact content/
product entries, exclusions, robots preview and policy; only the hub definition's
source hash changes. Publish its three owned staging files after the content
release, with independent production/saved-state protection. No Google submission
or production feed/account change is part of this batch.

The first roadmap update attempted to focus a not-started workstream; the existing
validator rejected it. Corrected progress data keeps focus on genuinely active
work, without weakening that guard. A source audit also correctly aborted when
started during an in-progress full build's temporary asset manifest; rerun only
after the final complete manifest returns. Neither diagnostic is application or
edge-cache verification.

Initial source d721da5 passed required CI43436021739, both jobs. It precedes the
archive notice/responsive follow-up; fresh required CI is needed for that final
payload before deployment. No earlier green run is treated as approval of later
uncommitted bytes.

## Prior Release

Internal-link PR22 finalcb9796b passed CI43434325501, both required jobs. Merged
1104f58245c8c5f39019220076622b00bbb4470e with exact source/merge tree
`a8a725d5bf0fb0a3b0c1434fb37f8d7666f92996`. Its detached reference was removed
before completed local/remote feature branches. Final origin/normal/repeat5848,
all348 content variants HIT, focused browser304, attribution38 and graph142 pass.
This is source history, not an additional production release.
