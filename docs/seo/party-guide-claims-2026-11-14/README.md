# Practical Party Advice And Offer Claims

**Current status:** published to staging; origin/cache verification is underway.
Earlier checkpoints and failures below are retained as the work sequence.

## Current Scope

Staging-only continuation of C08/C01/D03/D05/T08. No production, commerce,
consent, medical-hold or OmniLodge changes. No actual test messages or orders.

The branch `codex/staging-party-guide-claims` starts at PR50 merge
`d01db784adecd4656fe0bd3ba9a6ce3acc355eb0`, exact tree
`43f9aac89eb7e5d9f41a3eab50e2a64eab4e55b3`, matching reviewed final
`66f6415dce847effdf800d3201e893b4504788b0`. Final CI43588491373 passed both
jobs; PR50 comment6876375220 records the verified staging release. Completed
local/remote branches were removed; root worktree only.

Before any edits, `git archive` exited successfully and all 3,261 archived Git
blobs, the exact file set and ZIP CRC were independently verified. Backup:
`deploy-backups/seo-party-guides-before-20261114.zip`, SHA256
`527edfcc51bf0a29d2fa8fe4527425e08a410ca257f6da1880c4b143a940fb63`.
This is a tracked-source backup, not a database/hosting backup.

## Original Article Identities

| Key | Publication | Immutable capture SHA256 |
| --- | --- | --- |
| `post-party-krakow` | 5 May 2020 | `e82095c29e2e475901f9843abff4ad213117ff8b3edc73de9a2dddce7aefb693` |
| `post-six-reasons-you-need-to-party-with-the-krawl-through-krakow` | 25 May 2017 | `5bf1b65ce053e250b6be1b267d2517206691eee62bf9a4104de690bbd883e998` |

Keep original URLs, H1s, publication/byline history, metadata and all photos.
The 2020 guide has 33 Divi-derived text modules and 6 inline image modules;
the 2017 article has a plain rich-text body, 6 inline images, one caption and
its 2 legacy IDs. The rewrite must not remove image-module wrappers or the
caption's incoming fragments. Preserve the existing 71 revised summaries and
held cards while identifying this pair's additional archive instances.

## Findings And Research

The 2020 guide promotes a 96%-strength shot challenge and intoxication games,
claims a tour prevents scams/admission problems, lists an old 60 PLN/five-venue
offer, and gives obsolete or unverified venue, price and meeting-time advice.
The 2017 article includes demographic/superlative claims, stereotypes, drinking
pressure and operational guarantees. Neither has been substantively revised by
the earlier safety-guide release.

Primary sources checked on 14 November 2026:

- [FCDO Poland safety and security](https://www.gov.uk/foreign-travel-advice/poland/safety-and-security):
  bounded signposting about bills, drink spiking and transport; no risk-free tour.
- [Respect Krakow municipal guidance](https://respectkrakow.um.krakow.pl/):
  residents, public-space behaviour, scams, licensed transport and emergency 112.
- [Official Polish emergency information](https://www.gov.pl/web/numer-alarmowy-112/numeralarmowy112):
  direct research fetch timed out; use the separately verified municipal/official
  signposting, not an invented clinical protocol.
- Existing owner-confirmed `tools/site-offer-facts.json`, with adult/ID and
  booking guidance. Do not invent prices, current group sizes, venue programmes,
  staff qualifications, prize availability or new meeting arrangements.

The read-only raw/current body and 40-container inventory passes. All original
article copy, identity, bylines, legacy IDs and photo-file bindings are exact.
There are 15 additional card instances in 13 containers, bringing the proposed
catalog to 23 identities / 86 cards / 32 active containers. This is larger than
the previous batch: do not assume the same 23 active-container scope. Preserve
all existing 71 summaries and validate every newly selected card explicitly.
The two articles have 12 inline plus 2 featured images, all to retain.

Planned application scope: 16 files (2 article bodies, 13 archive containers and
one bounded CSS addition). For the 2020 page retain the Divi-derived layout and
all six image-module wrappers, replacing only source-bound text interiors; the
original contributor credit remains. For the 2017 body preserve five image
paragraphs and the final caption wrapper/2 IDs as ordered slots. Do not replace
the layout wholesale or strip historic media to simplify the recipe.

No new
editorial recipe, compiled application edit, rebuild, upload or purge yet.
Both roadmaps retain 37 verified staging deliveries and article counts of
19 major revisions, 2 narrower changes, 1 held and 34 awaiting substantive review.
Specialist, consent, protected products38/39 and unanswered operational/inbox
dependencies remain unchanged; no new owner question or automatic email.

PR50's merged-main CI43588616948 also passes. The new inventory report is
`source-inventory.json`; all browser network was aborted. This is not a new
live website or production audit.

## Draft And Initial Fixture Finding

Canonical copy and an unwired recipe are now drafted. Seven source units pass,
including a frozen SHA for all previous21 summary entries/40 source bindings.
No application builder or catalog extension has run yet.

The first raw/prepared fixture report is retained:12/13 checks, then the
Six Reasons raw-photo preflight rejected the wrappers. Read-only diagnosis shows
each raw photo paragraph contains one original image plus its legacy noscript
fallback. Count the actual image, excluding only the known noscript ancestor,
as the existing builder does; continue rejecting duplicate actual images.

The same inspection found an unsupported old `<strong>` heading inside photo
paragraph1: `We take you to the best bars/clubs`. The new recipe removes only
that exact text-only node from the cloned paragraph while retaining its original
paragraph, full-size anchor, image/attributes and all other wrapper nodes. A
source-bound fixture must prove that precise difference, not mask arbitrary
caption/paragraph changes. The final caption wrapper/2 IDs remain fully exact.
This is a narrowly expanded text change, not permission to flatten media/layout.

## Canonical Draft And Catalog Wiring

The corrected raw/prepared photo-preflight fixture passes64 checks. Expanded
fixtures add nested-template and embedded-heading tamper cases:67/67 pass and
repeat on the final source passes67/67. All browser network is aborted.

The recipe drafts32 source-bound text-interior replacements in the2020 layout,
leaving the original Jonas credit and every other node exact. The2017 body has
six native contents sections and ordered original media slots; its final caption
wrapper and both IDs remain exact. Only the one known obsolete strong heading
inside the second photo paragraph is removed. All14 image elements/full-size
links remain protected. New body copy uses only shared age/ID/open-bar/brand facts
and current information links, without inventing new prices, crowds or bookings.

The explicit catalog is now23 identities/86 cards/32 active containers; the old
21 identities,71 summaries,40 immutable capture bindings and neutral-photo data
are frozen by SHA. Safety's historical19-cohort SHA is also unchanged; its test
explicitly separates these two later identities rather than weakening the old
baseline. Format2 stays the markup contract; partial old-cohort DOM still fails.

All21 focused source units and217 shared JavaScript tests pass. The updated
all-container summary fixtures pass697/697, including four actual30-second
Node-side font-deadline tests with JavaScript enabled/disabled. The builder,
independent reference pipeline and source CI are wired. A separate16-file
preservation guard and native browser harness are drafted and syntax-checked,
not yet run on compiled output.

The first full116-page application build has now started. Wait for successful
exit and restored immutable asset-manifest SHA before any dependent reference,
source, photo or browser audit. No new application commit, upload or purge yet.
Both roadmaps remain37 verified staging deliveries; the new pair must not count
as reviewed/delivered until its own staging/cache checks close.

## Initial Build And Contrast Follow-up

The initial116-page builder exited successfully. Reference2320 and independent
source2409 pass: exactly16 application files, all101 other bodies unchanged,
all14 image elements/full-size links and prior71 summaries retained. Native
browser252 passes across16 JS/no-JS views, including all31 contents targets at
390/1440. The complete archive/photo suite passes3387 assertions across264 views,
with all32 active card containers and the neutral Stages photo. These are initial
candidate checks, not the final contrast-fixed release.

The initial eight-view accessibility report finds21 serious contrast nodes:
seven new links at320/390/768 use inherited `#e61570` on white, ratio4.46 rather
than4.5. Keep that failure; do not lower the threshold. A read-only CSSOM check
confirms captured responsive text-module link rules use `!important`, overriding
the new normal-priority `#c8006c` rule. Only the new two-route/marker link rule
now receives matching priority. Captured CSS and every other route stay exact.
The body harness now asserts actual computed `rgb(200, 0, 108)` for every text
link, and the source unit requires exactly one scoped important declaration.

The initial264-view run was allowed to finish with stable application hashes
before rebuilding; only the new recipe/QA source was edited meanwhile. No
application output changed mid-scan. All four initial mobile screenshots are
retained; the2020 intro and2017 entry-details views have been inspected. No
whole-page/original pixel-identity claim, and no photo/float/layout change is
being introduced for this contrast correction. A fresh full build and final
source/browser/axe/card/form checks are next. No staging upload or purge yet.

The first contrast rebuild correctly stopped before page generation because the
literal old local CSS block no longer matched the new source. An explicit
whole-block migration now accepts only that exact initial block, changing the
one link-color priority; unknown CSS/duplicate markers still reject without
writing. A dedicated positive/atomic-negative unit verifies this, following the
existing night-out style-builder pattern. This is not a general drift bypass.

## Original Topic-Link Preservation

The contrast-fixed build passes reference2320/source2409/body268, eight axe
views with0 violations/8 incompletes, full-card3387 across264 views and501 safe
form assertions. The link graph then exposes a genuine omission: three existing
native topic links inside the rewritten closing paragraphs were missing,
increasing isolated tags from6 to9. Preserve this initial graph as a regression
diagnostic, not a successful discovery result merely because its process exited0.

The original native destinations are `/tag/krakow-nightlife/` and
`/tag/krakow-party/` in Party module31, plus `/tag/why-choose-us/` in Six Reasons.
The initial ad-hoc diagnostic searched for `/tag/` inside portable hrefs and
missed them because `__KTK_HOME_URL__tag/` has no preceding slash. A corrected
exact token-aware inspection and old/new directed-edge comparison confirm all
three original relationships. This does not authorize arbitrary new archive
links or an indexing/noindex decision.

Canonical closing paragraphs now retain those exact destinations with explicit
labels. The recipe requires their original-source and planned order/count;
source guards independently compare the retained native hrefs. Nine source units
and67 current atomic body fixtures pass before rebuilding. No application output
was edited during the completed contrast264-view/form runs. A new full build,
body/source/graph/axe checks remain; card/form evidence may only be reused if
every recorded owned source hash still exactly matches after that build.

## Final Local Candidate

The topic-preserving116-page build exited successfully. The immutable media
manifest remains `f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691`.
Independent source2411 and reference2320 pass: exactly16 application files,
all101 other bodies retained, all14 original image elements/full-size links,
original contributor/caption fragments/history, previous71 summaries and held
content unchanged. All three original topic destinations are independently
asserted in source and the directed graph.

Final local evidence:

- Body268 across16 JS/no-JS views, all31 native contents destinations at390/1440,
  actual contrast colors, original decoded media, readable type and CTA clearance.
- Eight fresh accessibility views:0 automated violations,8 incomplete groups.
  All four current390px screenshots inspected; not original whole-page parity.
- Full card/photo3387 across264 views remains exactly bound to the current39
  recorded owned source hashes after the topic rebuild. `cards-source-current.json`
  verifies every hash, including all33 selected bodies, runtime CSS/JS, catalog,
  recipe and harness. This evidence excludes the separately retested article pair;
  it is not reused on changed inputs. The final article bodies are covered above.
- A fresh final form501 rerun passes with all messages intercepted.
- Body fixtures69 (including missing original-topic atomic failures), summary
  fixtures697, shared JavaScript219, Python214, PHP763/31/143 all pass.
- Graph142 pages/24 products/6264 edges,0 unknowns, same6 held isolated tags;
  exact retained native/main/followable edges to the3 original topic archives.
- Both roadmap views pass317 checks; guarded full incremental staging dry run
  validates2073 owned files. All finite processes are closed; root previews remain.

CI, guarded staging publication, origin and normal/warmed cache verification
remain. Both roadmaps retain37 verified staging deliveries and19 major/2 targeted/
1 held/34 awaiting substantive article reviews. No production, commerce, consent,
specialist-hold or OmniLodge change; no real messages or orders.

## Staging Publication

Application `b57db9181669038955f9dc5e92510d34b396af93`, PR51, required
CI43591911802: both jobs pass. The guarded manual publisher completed2073 owned
file checks on14 November2026 at11:53:00.401484UTC. Independent final hashes
match; saved WordPress posts/options, protected homepage and storefront remain
unchanged. The temporary helper was removed and independently verified.

Rollback archive: `deploy-backups/ktk-code-pages-staging-20261114-115229.zip`,
SHA256 `4af957dc0192720abe42fccd2ad2b15f9d270e9bafce1e82855b26d6ec39b0c0`.
All19 entries, exact manifest set, every archived SHA and ZIP CRC pass. This is
a changed-files application rollback, not a full database/hosting backup.

Post-publication source2411 passes and application bytes still match b57db91.
The following final origin, normal and warmed verification closes publication.

## Final Cache Verification

Full6,193 assertions pass independently at origin12:01:39.499440UTC,
normal12:11:34.182357UTC and repeat12:13:33.293114UTC. Each covers116 routes
and119 current assets, with0 transport retries. All348 responses are DYNAMIC
at origin, MISS in the normal scan and HIT on the warmed repeat.

The authenticated MCP purge was accepted12:06:22.368UTC after fresh endpoint,
exact zone and account validation. Its sole scope was
`krawlthroughkrakow.com/staging/`; no production/host-wide purge was sent.
API acceptance is accompanied by the normal/HIT evidence above.

Origin and normal each pass body268, full-card3455 across264 JS/no-JS views,
safe-form501 and attribution143. Discovery243 origin/216 normal/216 repeat,
unchanged homepage10 asset hashes/icons21/font20, final source2411 and shared
JavaScript219/Python214 pass. The higher live-card count than local3387 consists
of live-origin checks; no failed assertions are discarded. Eight normal axe views
have0 automated violations and8 incomplete groups, not full conformance.

All four actual normal390px screenshots have been inspected. Three PNGs exactly
match the current inspected local views. Six Reasons details differs in50,601
pixels within bounding rectangle(39,189)-(327,900), which includes its original
photos; both retained views show matching copy/layout and visible images. Do not
claim all-four byte identity, assign an unproved decoding cause, mask differences
or call this original whole-page pixel parity. The native/source/type/media and
CTA assertions pass independently; no application patch was made for this PNG.

Exactly16 application files remain bound to b57db91. Original14 photos/full-size
links, publication identities, contributor/caption fragments, previous71 summaries,
all101 other bodies and held content remain protected. No real messages/orders
were sent. Both roadmaps now record38 verified staging deliveries and21 major/
2 targeted/1 held/32 remaining article reviews; not23 completed fact audits.
Production, commerce, consent and OmniLodge remain unchanged. Final documentation
CI, exact-tree merge and completed-branch cleanup remain; no re-upload or purge
is required for those documentation-only changes.
