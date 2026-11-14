# Reviewed Article Summaries

## Scope And Backup

Staging-only consistency pass after PR48. Nineteen articles have major source-
checked revisions or narrower dated notices; the blog/archive cards still use
their old captured excerpts. Replace only their summaries, preserving original
titles, authors, publication dates, images, links, pagination and card wrappers.
Do not imply all nineteen articles have complete fact audits or owner approval.
The separate alcohol-health article and its archive cards remain unchanged.

Pre-edit main: PR48 merge `d11b536ffc1c33e0a28aa9a6c0df6a8c1c90127c`, exact tree
`30357bb09ca56343d6c455f158b4e799b3a65bf0`, matching reviewed head
`30761959c424657ef23c961176fc5770cd1e02d2`. Both final required checks passed in
`43573628117`; completed local/remote branches were removed, root worktree only.

Tracked-source archive:
`deploy-backups/seo-article-summaries-before-20261114.zip`, SHA256
`fc8f51f663e540766c1c13a2df668de48aaa8757fefa39212046e7e7c2b338df`.
All3,241 Git blobs, exact file set and ZIP CRC independently verified after the
writer exited successfully and before edits. This is not a server/database
backup.

## Read-Only Findings

Initial inventory checks all40 blog/archive containers:19 selected article
identities,65 matching cards in23 containers. The blog has19 wrapped paragraph
excerpts;46 classic archive excerpts are direct text nodes. Current summary text
matches the immutable captures exactly. Unmatched cards must not be rewritten.
The inventory makes no website requests and aborts all fixture network.

The first audit diagnostic used a hardcoded held-post ID only for its informational
`medicalCards` field. The selection already excluded the held key correctly.
That diagnostic is retained; the audit now derives the held ID from the manifest
and records actual image attributes. Do not use the initial diagnostic count as
proof of held-card coverage.

The original Stages featured photograph was visually inspected. It shows police
officers near people on the ground in a city street at night; a photograph alone
does not establish intoxication or a clinical stage. Plan an exact, source-bound
neutral alt correction without changing the image bytes, dimensions or artwork.
Do not label this image as Krakow, a current KTK event or a medical assessment.

## Status

Nineteen plain-text summaries and the exact neutral photo description now have a
canonical catalog. Its loader binds all40 capture hashes, exact article IDs and
routes, the original asset manifest and photo bytes. It rejects held/duplicate
identities, unsafe text, unknown fields and scope drift. Six source-contract
tests pass. The self-contained DOM transform preflights every selected card
before the first mutation, including late-page cards.

The first511 raw/prepared preservation, repeat and atomic negative assertions
passed. The first complete build and independent source checks passed2,320 and
2,473 assertions respectively. No publication or purge has run yet.

The first full192-view browser matrix completed1,719/2,003 assertions. It exposed
real inherited13px summary text and34 floating-CTA collisions. The8 remaining
failures were static-DOM comparisons against normal runtime masonry order,
slider ARIA additions or equivalent resolved fragment URLs. The failed reports
are retained in `local-retry`; no production or staging patch was published.

Version2 wraps the46 classic direct-text excerpts in marked paragraphs and marks
the19 existing blog paragraphs. One exact marker-scoped CSS addition provides
16px text,26.4px leading, left alignment and24px mobile CTA clearance. Nothing
else gains these styles. Source inverses restore the original direct text nodes,
including whitespace, or the original existing paragraph. The scope is now
23 container bodies, one ALT-only body and one bounded CSS addition,25 files.
Seven source-contract tests and603 fixture assertions pass, including repeated
wrapper/marker tamper rejection. All fixture network is aborted. The browser
harness now compares normalized semantic multisets where runtime reordering is
expected; the independent source guard still requires exact original static
headings, link markup and publication metadata. It requires actual16px/26.4px
readable type and geometric CTA clearance, not a lowered threshold.

Version2 is locally ready:116 builder routes,2,320 reference checks and2,473
independent source-preservation assertions pass. The full192-view browser matrix
passes2,003/2,003 at320/390/768/1440px with and without JavaScript. It checks65
summaries, actual16px/26.4px type, visibility, two-dimensional CTA clearance,
keyboard focus, headings/links/history, all card rectangles and source stability.
Four actual390px screenshots were visually inspected. Sixteen JS-enabled axe
views have0 violations/12 incomplete groups; this is not accessibility certification.
No axe analysis runs with JavaScript disabled.

Forms501, shared JavaScript199, Python214, PHP integration763/forms31/NYE143,
roadmap317 and the guarded2,073-file staging dry run pass. The complete local
link graph retains142 pages,24 products,6,262 edges, no unknown paths and the
same6 deliberately held tags. The forms harness intercepts submissions; no real
message, order, payment or consent change occurs. CI and staged cache proof
remain. Roadmaps retain35 verified deliveries; production, consent, commerce,
saved WordPress data and the specialist hold remain unchanged.

Preview sessions from the earlier runtime vanished: a native listener check
confirmed ports5184/5185 were closed before restarting the two root previews.
Current previews are67913 (code pages5185) and39851 (home5184). All finite local
builders, verifiers and browser suites exited successfully; they are not pending.
