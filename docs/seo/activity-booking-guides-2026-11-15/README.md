# Escape-Room And Shooting Booking Guides

Current status: staging cache-verified. Application remains exactly5cf1cc4;
final documentation CI/PR63 merge and completed-branch cleanup remain. No
production promotion or further upload/purge is implied.

## Scope And Backup

Staging-only review of the existing escape-room and shooting-range articles.
Preserve original URLs, H1s, publication/byline history, unique fragments and
photo files. The shooting copy must link to KTK's product without publishing
the fulfilment venue, as the owner confirmed on15 November. Do not invent
package inclusions, age rules, transport, instruction languages or ammunition.
Keep the competition and form active, the medical hold exact, and production,
commerce/Ecwid, functional consent and OmniLodge unchanged.

Branch `codex/staging-escape-shooting-guides` begins at PR62 merge
`401ce91133069af0193114384965b759d5b7b0c7`, exact final3592dd4 tree
`6078fd6be6a179ec67f608db2d66a1964a4fb9f8`. Final CI43657242373 passed
both jobs; completed branches were removed with only the root worktree.

Before edits,3,373 tracked files were archived in
`deploy-backups/seo-escape-shooting-before-20261115.zip`. Exact Git file set,
every Git blob and ZIP CRC independently pass. SHA256:
`0b20e9464a942ee07b5656f1c807b5c3fc6f2779922eab70916d35cbb6d62bc6`.
The first verifier compared Git files with ZIP directory entries as well and
stopped. Filtering directory entries correctly verified the original archive;
no archive overwrite or application edit preceded successful verification.

## Source Review

Both original texts have been read in full. Escape-room copy generalises
duration and dollar prices, misclassifies a horror attraction, includes an
unverified old room story and an external hardcoded click ID, and invents a
KTK bundled escape package. Shooting copy generalises transport, equipment,
instructor language, eligibility and package inclusions and gives handling
advice. Replace these with useful booking choices and owned product links,
not a firearms lesson, safety guarantee or undisclosed operator assignment.

Primary pages checked on15 November:

- https://en.exitroom.pl/ : its own2-5-player/60-minute format, not every room.
- https://gamescape.pl/ : different scenario capacities/durations and group
  enquiries; use the clean homepage, not its old attributed link.
- https://fearfactory.com.pl/pl/ : a horror attraction, not proof of a standard
  escape-room format or universal suitability.
- https://lockedup.pl/ : earlier primary page inspection retained in prior
  task context; today's reader timed out twice. Do not infer closure or make
  new time/price/location claims from that failure.
- http://exitgame.pl/en/what-is-exitgame : not accessible; do not assert closure
  or retain the old unsupported Bunker story as current fact.

The owner confirms existing competition prizes and no deadline. No additional
rules or selection timetable were supplied; do not invent them or publish a
misleading legal assurance that there are no rules.

## Progress

The read-only inventory passes:2 original articles/40 containers,11 inline and
2 featured photos,6 new summaries in5 containers. Both H1s, dates and all
original unique fragment targets are retained. The11-photo contact sheet and
both full-size features were visually inspected. Existing files are unchanged;
neutral feature ALTs describe a bridge at night and a paper target rather than
claiming that a generic image proves the activity or current venue. The first
contact-sheet attempt used the Windows default text codec and stopped before
writing; explicit UTF-8 succeeded, with no source-image changes.

Drafts and a source-bound recipe are now implemented. The escape article moves
three original IMG elements out of headings/styled spans into plain paragraphs;
all11 original IMG elements remain exact. The two existing group-guide shooting
paragraphs now link to product34 without naming an operator. No build, upload
or purge yet. Fixtures, source preservation, responsive/keyboard/media checks,
CI and guarded staging/cache verification remain.
The roadmap stays at48 verified staging deliveries; this batch is not verified.

## Local Fixture Diagnostics

Initial body fixtures129/131 rejected prepared images because their existing
reviewed ALT attribute was absent in the raw capture. An independent attribute
comparison confirmed ALT was the only extra attribute; the recipe now allows
that attribute only with the pinned existing description. Unknown attributes
and handlers still reject. Final137/137 raw/prepared/no-op/atomic negatives pass
with all network aborted; nine new units and all328 JavaScript units pass.

The first large generated catalog patch was truncated in a tool response and
the JSON unit test stopped before any build. The catalog was reconstructed from
the exact pre-edit Git blob plus the six inventory-derived card additions,
through a complete guarded patch. All prior42 identities/160 summaries retain
normalized SHA`a77f172b79dc3da799e6ab031888d16aa170e82572e5e7a9142601754424f90e`.
The new44/166 catalog parses and its source-binding unit passes. No broken
catalog reached an application build or deployment. Earlier diagnostics remain.

## Initial Local Build And Browser Checks

The full116 builder closed with zero missing routes/errors and immutable
manifest`f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691`
still exact. Reference2320/body216 over16 JS/no-JS views/cards1763 over40 views/
forms501/summary757/group fixtures199 pass. Six actual390px article PNGs were
inspected; four axe views have0 automated violations and4 incomplete contrast
groups, not a whole-site conformance claim. All19 real Enter topic destinations
and13 decoded source photos pass. The complete graph covers142 pages/24 products/
6349 edges with no unknown paths and the same six held tag routes.

The first independent source audit2384/2387 ran before the separate discovery
builder closed; its only failures were the expected missing discovery-data
change and two stale ALT definition hashes. No guard or application change was
made for that timing diagnostic. Discovery has now closed with the same123 URL
policy and two source-checksum-only changes. A final source audit must pass.

The first group follow-up browser run314/322 retained the existing catalogue
link but its expected list accidentally replaced it. The exact expected list
now includes catalogue, product34 and pub crawl in their actual order. All
other314 assertions passed; no application change or loosened comparison.
Final repeat remains required. No upload/purge has occurred.

Final local source2386/reference2320/body216/cards1763/forms501/group follow-up322/
roadmap317/JavaScript328/Python215/PHP763+31+143 pass. Source guards enforce the
exact14-file application boundary, both one-paragraph group inverses, all prior
160 summaries, all image bytes, dates/H1/bylines and consent/UTM/provider code.
Six article phone screenshots were inspected. Full2073 content and discovery3
dry runs pass. The24-product read-only catalogue confirms product34's exact
slug/200 responses but no detailed inclusions; none were invented. The same six
thin-product holds remain. The final summary-fixture repeat is still running;
wait for its exit and required CI before any guarded staging publication.

Final summary fixtures closed757/757; all finite local jobs are closed. The
runtime inverse unit now uses the independently computed exact pre-edit SHA
`6f7ab8695c8b8c45835f7d80f51c8309192785fd4d37a1c0dd4177da2c033278`
instead of requiring old Git objects in CI's shallow checkout. The local
independent source audit still compares the complete Git blob. This changes
only the test's baseline delivery, not its byte-level assertion or application.

## Staging Publication

Application5cf1cc4e8234d4629891da68c45d30e4c899f258 is unchanged in the
QA-only7daed17ab1a7189971d4a3f906683760c5d154a4 release. PR63 required
CI43659259573 passed both jobs. Prior CI43659142758 failed only that unavailable
historical-object lookup in shallow CI; its log is retained. A separate ad-hoc
Git-show comparison hit its20MB buffer on an unchanged video. The corrected
independent Git-object hash comparison verifies all2371 application blobs,
without reading large videos through child-process output buffers.

Manual2073 publication finished15 November00:42:05.424302UTC. Every Git/local/
remote SHA independently matches, raw saved posts/options/Ecwid page are exact,
homepage/storefront unchanged and helper removed. The16-entry rollback archive
`deploy-backups/ktk-code-pages-staging-20261115-004131.zip` passes exact file set,
each saved SHA, ZIP CRC and SHA256:
`d71c033bb94e430cc7962a78f193e51389cd39ed67135ee7b29488c22f8505b2`.

Discovery3 publication finished00:43:11.539495UTC. All Git/local/remote hashes,
2324 protected staging files,2158 production mappings and saved WordPress state
are exact; both helpers removed, no origin paths cleared by this updater.
The4-entry rollback archive
`deploy-backups/seo-discovery-staging-20261115-004245-684171.zip` passes independent
file set/per-SHA/CRC/archive SHA:
`2257f226917f8796aaf578e6b9f9cd30e78eecb024dcb2bb68c7e692f5650c7e`.

Origin body216/discovery243/homepage10/icons21/ET20/social15 pass. Full6193,
cards/forms/attribution and clean/warmed-cache verification are still underway.
No edge purge has been sent yet; do not advance48 verified deliveries until all
required origin, clean and warmed checks close successfully. App is frozen.

All focused origin checks are now closed and passing: body216, cards1777 over40
views, group follow-up322 over24 views, forms501, attribution416, discovery243,
source2386 and homepage10/icon21/ET20/social15. The full origin scan is still
running on its final device, then assets; no purge or verification-count advance.

Read-only next-batch review has now read all competition/newsletter text and
the Halloween guide, including its previously truncated middle. Old Halloween
copy reverses31 October/1 November chronology, repeats unconfirmed historical
prices and promises ghost-story guiding/safety/venue counts. Its named review
quotes lack source links; an owner question is pending. No next-batch application
edit or backup yet. The active competition remains unchanged.

## Clean Cache Verification In Progress

Full origin6193 closed at00:53:09.408948UTC with348 DYNAMIC responses,
116 routes/119 assets and zero retries. After the fresh purge-spec check and
exact active zone/account validation, MCP accepted only the staging prefix at
00:53:53.898UTC. Scope/result retained in `staging-purge.json`; no production,
host/domain-wide purge or account/cache-setting change.

Normal article216/discovery216/homepage10/icon21/ET20/social15 pass. All six
actual cached390px article PNGs were inspected: five exactly match inspected
local RGBA pixels;32,159 pixels in the shooting header differ only within its
original featured-photo rectangle`[39,141,351,349]`. No masks, tolerance, cause
assumption or original whole-page pixel claim. Four normal article axe views
have0 automated violations/4 incomplete contrast groups.

The first normal group follow-up retained13 passing assertions, then hit the
unchanged30-second photo-decode deadline before finishing its first view.
Failure remains in `group-followup-normal/report.json`; no application or test
guard change. An unchanged full repeat is running. Normal full/cards/forms/
attribution and warmed proof remain required; do not advance the roadmap yet.

Full normal6193 and the unchanged group repeat322 are now closed and passing.
The original13/15 timeout remains retained, not hidden, and no application or
deadline change was needed. Normal body216/cards1777/forms501/attribution416/
discovery216/homepage/font guards pass. Warmed full and discovery repeats are
running. Both roadmaps must stay48 verified until those jobs close; no further
upload/purge is needed. Every application byte still matches the reviewed app.

## Final Cache Verification

All release and browser jobs are now closed and passing:

- Full6193 origin00:53:09.408948UTC:348 DYNAMIC responses.
- Full6193 normal01:01:48.502217UTC:348 MISS responses.
- Full6193 repeat01:05:31.785488UTC:348 HIT responses.
- Every full scan covers116 routes/119 assets with zero transport retries.
- Source2386/reference2320/body216 local+origin+normal; cards1763 local and1777
  live over40 views; forms501 and group follow-up322 local+origin+normal.
- Attribution416 origin+normal; discovery243 origin/216 normal/216 repeat;
  homepage10/icon21/ET20/social15 origin+normal.
- Final JavaScript328/Python215, repository policy3382 tracked files/358 required
  inputs/no errors and clean whitespace checks pass. Final roadmap test remains.

Both roadmaps now record49 verified staging deliveries. C08 remains partial:
42 major revisions,2 targeted changes/notices,1 medical hold and11 articles
awaiting substantive review. The44-identity/166-card catalog is not44 full fact
audits. Two exact shooting-paragraph follow-ups are not extra article reviews.
The first normal image-decode timeout and all earlier preflights are retained;
the unchanged complete follow-up passes without new application bytes, masks
or relaxed deadlines. All13 original article photo files/history/unique targets,
prior160 summaries and consent/UTM/provider behavior remain preserved.

Final generated roadmap317/317 passes at all six widths, with both views at49
staging-verified deliveries. The application diff against7daed17 remains empty;
only the seven final documentation/roadmap paths change. No rebuild, upload or
extra purge is needed to close this release.
