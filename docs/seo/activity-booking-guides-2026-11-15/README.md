# Escape-Room And Shooting Booking Guides

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
