# Budget Drinks Guide Refresh

## Scope And Progress

Staging-only C04/D01/D05 continuation on the existing
`/wheres-the-cheap-places-to-drink-in-krakow/` URL. No production, commerce,
prices charged by KTK, OmniLodge, plugin, consent or account changes.

- [x] Before application edits, tracked1bdd49a source archived in
  `deploy-backups/seo-budget-drinks-before-20261113.zip`, SHA256
  `b3f7118fd3356cc5af5f99d4a7e69674f422ce1ac211f0840cc04fbf2cbb3d6d`.
  Separate1bdd49a reference worktree retained until verified delivery/merge.
- [x] Read primary Banialuka menu/branch pages and visually inspect Oldsmobil's
  own linked cocktail panel. Named examples include serving size, PLN price,
  check date and current-menu caveat. No citywide cheapest ranking or invented
  promotions, student offers, visits, opening hours or menu effective dates.
- [x] Replace one article text module; keep original URL, H1/title, publication
  history, byline, canonical/indexing policy, shell and115 other page bodies.
  Update only its reviewed description and two generated schema descriptions.
- [x] Preserve16 meaningful original heading fragments in context plus3 explicit
  new anchors. Old Pub Propaganda fragment still names that historical venue,
  not a different business. Replace known invalid paste/generated navigation IDs.
- [x] Retain the exact original identifiable Banialuka image and all original
  asset files/public URLs. Remove8 unrelated inline illustrations from the body.
  Module references9 to1; referenced original bytes3,924,406 to424,275. This is
  a file-reference comparison, not measured transfer, field speed or sitewide CWV.
- [x] Local build2320/source392/native browser78, Python177/shared JS73,
  PHP760/forms31 stubbed pass. Four320/390/768/1440 automated views have0
  violations and4 incomplete groups; screenshots inspected, not full conformance.
- [x] Scope a16px mobile header/body inset to this article only, keeping the
  floating tab visible while title/category and price/copy ranges stay clear.
  No global layout/font/CTA change.
- [x] Required CI43443754402 passed both jobs for source d68f2e5 / PR24.
- [x] Guarded content2072/discovery3 staging hashes verified; protected saved
  WordPress state, homepage, storefront and production guards pass; helpers removed.
- [x] Scoped Cloudflare staging-prefix purge accepted at14:35:45.926UTC.
- [x] Actual origin/normal browser78 each; isolated pre/post-purge native booking
  attribution45 each, graph142/6213/no unknowns/same6 held tags; discovery243
  origin/216 normal; homepage10 assets pass. Four normal axe views0 violations/
  4 incomplete groups, no page errors. Live mobile screenshot inspected.
- [x] Full content origin/normal/repeat5848 each pass,119 current asset hashes/
  version tokens; warmed348/348 content responses HIT across desktop/Android/
  iPad. Normal first pass209 MISS/139 HIT was fresh, not misreported all-HIT.
- [x] Repeat discovery216 and homepage10 assets/all3 device HIT pass. All finite
  tests/publishers and both task preview servers are closed.
- [x] Roadmaps reflect verified staging delivery, not whole-plan completion.
  [PR24](https://github.com/pablo-dryfield/krawlthroughkrakow-wordpress/pull/24)
  records final documentation CI, merge and task-reference cleanup status.

## Maintainable Source

`tools/content/budget-drinks.html` owns the reviewed copy; `budget-editorial.mjs`
binds the immutable captured article and performs one guarded build-time revision.
It validates allowed native markup, exact known destinations, original source
shape/auxiliary-ID multiset, unique meaningful fragments and the sole reviewed
photo slot before mutating. Scripts/handlers/new remote images, missing or
duplicate fragments, changed photo identities and unrelated keys fail closed.
All original asset bytes and the canonical image-review manifest remain exact.

Only16 meaningful heading fragments are promised preserved. The old body also
had seven duplicate `isPasted` IDs, a triplicated generated list ID and its old
TOC-anchor IDs; those known editor artifacts are deliberately replaced, not
presented as valid unique navigation. Three new topical anchors identify the new
Oldsmobil/Chicas sections and comparison guidance. The four new contents links
are native, resolve and respond to Enter.

`RESEARCH.md` separates operator-published snapshots and owner recommendations.
The original2023 byline/day remain, with a distinct visible KTK price-check note
dated13 November2026. No fake individual author, publication refresh or personal
venue visit. These are informational third-party menu examples, not KTK offers;
no Product/Offer schema or checkout amounts are generated from them.

## Preserved Diagnostics

- The first isolated draft guard assumed every original ID was a meaningful
  heading. It correctly stopped on the known paste/TOC artifacts. The actual
  original multiset is now checked explicitly, not ignored generically.
- First browser50/54 retained four missing-TOC failures/timeouts. Existing native
  attribution code makes same-document hrefs absolute; matching only `href^=#`
  was a harness mistake. Structured URL matching now requires same origin/path/
  search and a real fragment target; native Enter is tested. No application
  workaround or lost hash assertion. Corrected initial browser70/70 passes.
- Existing metadata test fixed the old review-set date at12 November. Updated
  the expected date to the actual13 November revision; all77 coverage/hold and
  invalid-metadata safeguards remain. Initial9/10 retained as a test-contract
  mismatch, not a successful suite.
- Real text-range clearance checks then found price/branch copy behind the fixed
  tab at320/390 (72/74). One page-scoped mobile inset fixes that overlap while
  preserving the control. Landing checks then found the title/category at risk;
  the same narrow inset now includes the header. Final78/78 checks landing and
  scrolled body ranges, without hiding content or relaxing bounds.

## Discovery Dependency

Fresh complete public catalog review24/same6 selected and123-URL canonical build
retain exact content/storefront entries, exclusions, robots preview and policy.
Only this article's definition hash changes in source bindings. Publish the
three owned staging discovery files after the content release; no production
feed/account change or Search Console submission is authorized.

## Deployment Checkpoints

- Content backup `ktk-code-pages-staging-20261113-143418.zip`, SHA256
  `8b7f16c2a092dc745620eaf8907655d3095db03bb82795956530b12a7b130ebf`.
- Discovery backup `seo-discovery-staging-20261113-143458-457846.zip`, SHA256
  `f692d5f7d8faa9eed6f17bcd5442af687012a7b6b40820fbb4d19e76dfb2b645`.
- Reports `pages-publish.json`, `discovery-publish.json`, `cloudflare-purge.json`.
  API acceptance is not proof of cache eviction; the full clean/repeat reports
  independently establish current hashes and warmed content HIT responses.
- `attribution-origin.json` is the isolated clean-URL handoff check immediately
  after publishing, not a cache-busting origin test despite its retained filename.
  `attribution-clean.json` is the post-purge repeat. Neither submits a booking.

Full evidence is retained under `docs/code-pages/full-migration/`:
`budget-origin-20261113.json`, `budget-clean-20261113.json` and
`budget-repeat-20261113.json`. Final repeat completed14:43:52UTC. Focused browser/
axe/attribution/graph/discovery/home reports remain in this dated directory.
No actual-transfer, field-CWV, full accessibility-conformance, improved-ranking
or production-release claim follows from these staging checks.

The [music-guide review](../music-guides-2026-11-13/REVIEW.md) records the next
C05/C08 read-only work: two techno captures compared, all six other guide heading
structures triaged, primary venue/artist/festival facts checked and unresolved
sources separated. No music body, redirect or canonical changed in this batch.

## Previous Batch

Nightlife PR23 final8756e2d passed CI43439672357, both required jobs. Merge
1bdd49ae487db4f7fde898fcb14c860e09141f3f has identical tree
`45c578cc56f345014c1eb48936e2c84d9d6503bc`. Its stopped reference was removed
before deleting completed local/remote branches. Staging content5848 origin/
normal/repeat, all348 HIT, browser104, attribution38, graph142/6212/no unknowns,
discovery243/216/216 and homepage10 assets/all3 HIT pass. Production unchanged.
