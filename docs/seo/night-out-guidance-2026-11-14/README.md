# Practical Night-Out Guidance

## Scope And Checkpoint

Staging-only, source-bound revision of the single text module in each existing
`/survive-pub-crawl/` and `/stages-of-drunkenness/` article. Preserve URLs, H1,
metadata, original artwork/backgrounds and every surrounding layout node. Neither
captured text module has original fragment IDs or inline images. Do not invent
a visible publication date, author, medical review or qualification where the
original module does not supply one. The original historical data stays intact.

Pre-edit main is PR47 merge `deee76416f8ba833588c2858d2636e0d5450af96`, exact tree
`b17ed21227d77ed2291a96c137823424728579b5`. Its source-equivalent reviewed head
`5a061b794cc2e726d6e503ffe0b345900215cd44` passed both required jobs in
`43570760273`; the completed branch is removed, with only the root worktree.

Fresh tracked-source backup:
`deploy-backups/seo-night-out-guides-before-20261114.zip`, SHA256
`4174171d3362ba0bbbbd09b155400754acbc6d27d3217ac5c32b9b37a298ee94`.
All3,233 Git blobs, exact file set and ZIP CRC independently verified after the
archive writer exited successfully and before edits. This is not a full server
or database backup. Current immutable capture identities:

- Survive: `3c034ef5559b8ae34f0a902accd264b668e56e48d5bf6e031e4a9c25626401b0`.
- Stages: `50a460acbc7a9ba69692f4a17c97397eb284834ad67b5883b0e1d0a06f3c6bc0`.

## Decisions And Sources

The old copy encourages drinking escalation, objectifies other guests and
normalises putting severely impaired people to bed. Replace that material with
optional participation, considerate group plans and clear emergency signposting.
The existing "Eleven Stages" H1 is retained for historical/search continuity;
the opening explicitly says it is not a clinical scale or a drinking target.
Do not republish numeric BAC thresholds, dose schedules, treatment instructions,
diagnoses, a safe-drinking guarantee or UK/US emergency numbers for Krakow.

Primary pages checked14 November2026:

- [NHS alcohol-poisoning guidance](https://www.nhs.uk/conditions/alcohol-poisoning/),
  displayed review4 June2026 and next review4 June2029. Limited urgent-help
  signposting, not a new clinical article or substitute for a dispatcher.
- [NIAAA alcohol-overdose facts](https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/understanding-dangers-of-alcohol-overdose):
  impairment varies; apparent sleep is not a reliable assurance. This is a US
  source; do not import its emergency number or US drink-unit definitions.
- [Polish Ministry's112 page](https://www.gov.pl/web/mswia-en/emergency-number-112)
  and [what/how to report](https://www.gov.pl/web/mswia-en/what-and-how-to-report):
  use Poland's actual emergency service and give a clear location. No calls or
  real emergency-service tests are made.

The separate alcohol-health article remains on specialist hold, byte-for-byte.
No meeting, price, availability, consent, form backend, commerce, plugin,
production or OmniLodge change. Actual inbox/operational/product questions stay
separate. No scheduled automation is installed.

## Local Development Record

Source/structure and primary guidance reviewed. The116-page build and2,320/2,320
build verification pass. Source2,381/2,381 proves exactly two bodies and one
bounded CSS block differ: all114 other bodies, metadata, original artwork and
every other application Git blob remain exact. The immutable asset-manifest hash
is unchanged. Five units and47 raw/prepared preservation/idempotence/atomic
negative fixtures pass with all fixture network aborted.

Initial browser191/203 retained12 image-representation failures on the Stages
page. Inspection found the same original image, alt, dimensions, class and
candidate list; the local PHP preview emits root-relative asset paths, while the
new test had constructed absolute URLs. H1, copy, keyboard and layout checks
already passed. The local expected prefix is corrected to the preview's exact
root-relative contract, not a media replacement or relaxed image comparison.
No application change was made for that correction. The initial report remains
under `local/report.json`. Corrected and final browser results are recorded below.

The prefix-corrected run subsequently passed203/203, but actual mobile PNG
inspection found inherited justified text on Survive, with conspicuous word
gaps. This is a genuine readability issue, not an image-test failure. The new
two-route/marker style now sets left alignment, and the browser suite explicitly
checks all paragraphs/headings. Only the exact unreleased prototype style can
migrate to the new block; an additional unit rejects unrelated style drift.
Both earlier reports and screenshots are retained; final rebuild/QA results follow.

Eight local axe views have zero violations and4 incomplete groups. Read-only
link graph:142 pages/24 public products/6,262 edges, no unknown paths and the same
six held tags unreachable. These are not Google indexing or booking results.
At this pre-publication checkpoint the roadmaps retained34 verified staging
deliveries. The subsequent staging release is documented below.

## Final Local Verification

The final rebuild passes116/116 and full build verification2,320/2,320. Source
2,381/2,381 again proves the exact three-file application scope and unchanged
asset manifest. Browser227/227 covers24 JS/no-JS views, all14 native contents
targets at390/1440 on both scripting modes, local112 link identity, readable
16px/22px type, explicit left alignment and floating-tab clearance. Four final
390px screenshots were inspected, including both urgent-help sections. These
are not original whole-page pixel-identity or medical-review claims.

Final fixtures47/47, six source/style units, JavaScript192/192, Python214/214,
PHP integration763/763, forms31/31 with mail stubbed, NYE143/143 and forms501/501
with all submissions intercepted pass. Eight final axe views report zero
violations and4 incomplete groups; manual accessibility remains. The guarded
2,073-file packaging dry run passes. These local checks preceded the separately
documented staging publication below. No automatic emails, calls, orders or
payments were made.

## Staging Publication

Application `d7521012ee50cfeffe670adbc0c9b952431c549a`, PR48, passed both required
jobs in `43571984443`. Guarded manual publication completed at
07:39:13.123340UTC: all2,073 independent hashes match, saved WordPress records,
homepage and storefront remain unchanged, and the temporary helper is removed.
The six-entry scoped rollback is
`deploy-backups/ktk-code-pages-staging-20261114-073853.zip`, CRC-clean, SHA256
`fd22ccc79aa50262a0f6cf71ad7eed01a79f76556839105364b7ec9fde6bc9ca`.
It is separate from the full tracked-source pre-edit archive.

Origin article227/227, forms501/501, attribution143/143, discovery243/243 and
unchanged homepage10 assets/image21/font20 checks pass. The full origin scan
completed at07:46:18.109511UTC with6,193/6,193 checks across116 routes/119 assets,
348 DYNAMIC responses and zero HTTP retries. The exact API permission and
zone/account were checked before purging only the staging prefix at
07:46:47.610UTC. Receipt: `cache-purge.json`; acceptance is not cache proof.

Normal article227, forms501, attribution143, discovery216, homepage10 assets,
image21/font20 and eight axe views0 violations/4 incomplete groups pass. All
four normal390px viewport PNGs are byte-identical to the inspected current
local-final PNGs, not the old production page or an original whole-page pixel
comparison.

| Full release scan | Completed UTC | Assertions | Device/page cache results |
| --- | --- | ---: | --- |
| Origin | 07:46:18.109511 | 6,193/6,193 | 348 DYNAMIC |
| Normal URLs | 07:52:05.626403 | 6,193/6,193 | 348 MISS |
| Warmed repeat | 07:54:04.251312 | 6,193/6,193 | 348 HIT |

Each verifies116 routes and119 asset hashes/version tokens with zero HTTP
retries. Full reports are `night-out-guidance-{origin,normal,repeat}-20261114.json`
under `docs/code-pages/full-migration/`. Discovery repeat216/216 also passes.
The application remains exact `d752101...`; all later edits are documentation.
Both roadmaps now record35 staging-verified website batches, not35 completed
workstreams or production SEO releases. No real messages, calls or orders were
sent; consent and commerce behavior remain unchanged.

## Remaining Review

The complete56-article inventory now has17 major revisions on staging, two
targeted corrections/notices, one explicit specialist hold and36 articles still
needing substantive fact review. A source-checked revision is not owner approval,
completed manual accessibility or a current fact check of every other page.

A read-only follow-up found the old Survive/Stages excerpts in the blog and five
author/category archive routes, despite their new standalone bodies. Fix those
summaries next without changing original publication/byline or URL identity.
The Stages featured-image alt also retains its earlier speculative intoxication
wording; a neutral visible-description follow-up is needed, not a diagnosis of
the pictured person. Original media/alt bytes were deliberately outside this
two-module release. These findings and broader production approval remain open.
