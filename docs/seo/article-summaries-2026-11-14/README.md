# Reviewed Article Summaries

Status: staging cache-verified. Application `f0a05d10b9c167a2134f2c03798b1f2837513f09`
is unchanged after its one guarded upload. Required-check and exact-tree merge
records are tracked in PR49; no further application upload or purge is needed.

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

## Staging Publication And Network Diagnostics

Application `f0a05d10b9c167a2134f2c03798b1f2837513f09`, PR49, required CI
`43577836949`: both jobs passed. Manual guarded staging publication completed
`2026-11-14T08:58:32.287539+00:00`,2,073 independent owned hashes verified.
Raw WordPress state, homepage and storefront are unchanged; the helper was
removed. Rollback `deploy-backups/ktk-code-pages-staging-20261114-085439.zip`
has28 entries, independent CRC and manifest hashes verified, SHA256
`df91dd8a37783c6938fb3e7597980bacb05387ccae27bc09b83c296cc4acdec0`.

Initial origin reads then hit workstation DNS/connection failures: browser
`origin-v2` completed only2/192 views before a60s navigation timeout; forms also
timed out before submission tests. Attribution reported ERR_NAME_NOT_RESOLVED,
home icon fetch reported ENOTFOUND, discovery timed out, and homepage fetch
reported connect timeout. These are preserved, not green checks or proof that
the website was unavailable to everyone. No app, DNS, firewall, retry tolerance
or account change was made. Windows resolution subsequently returned the normal
Cloudflare addresses; a normal curl request returned200. At09:07:40.724UTC a
fresh Node GET returned200/DYNAMIC with the exact version2 marker. The unchanged
full browser suite is repeating into `origin-v2-recovered`. The initial full
origin scanner subsequently exited failed at09:16:42.861312UTC:5,802/5,825 checks,
exactly23 failed `request completed` checks and49 bounded transport retries.
The missing page reads reduced the assertion count below6,193; it is not a full
pass. All119 assets and every completed page's content checks passed. Preserve
`docs/code-pages/full-migration/article-summaries-origin-20261114.json`.
No edge purge has been sent; roadmaps still count35 verified staging deliveries.

The unchanged browser retry completed74/192 views, with726/728 assertions,
before a native article navigation reached the correct URL and DOMContentLoaded
but waited beyond15s for its complete asset load. That report is retained in
`origin-v2-recovered`. The QA-only native navigation check now waits for
DOMContentLoaded at the same15s limit and explicitly requires exact page identity,
a visible original article H1 and populated main content. It does not need to
wait for every image after proving navigation. Initial page loads,192-view gate,
layout/typography/CTA assertions and the application remain unchanged.
`origin-v2-navigation` is running; the forms retry is also still running.
Recovered attribution143 and homepage10/icon21/font20 checks pass. A discovery
retry again timed out on an unchanged protected production read; retain it, do
not alter production or call that verification green. Remaining checks should
repeat sequentially after the active browser/form suites finish.

Fresh full origin verification subsequently passes6,193/6,193 at
`2026-11-14T09:35:03.777580+00:00`, all116 routes and119 assets, zero transport
retries. The independent post-publication source guard again passes2,473/2,473;
the application remains exactly the reviewed/published commit. The final bounded
browser audit is now `origin-v2-node-deadline`, and the form audit uses the same
Node-side30s font deadline plus per-loaded-scenario progress. Criteria, endpoints,
timeouts for initial navigation, interception and source guards are otherwise
unchanged. Neither partial progress file is a passing final report. See
`INTERRUPTED-BROWSER.md` for the deliberately stopped, unclaimed QA drafts.

## Cache And Final QA Follow-up

The complete bounded origin192-view run finished2,041/2,049: its only8 differences
were the same existing Blog contact email transformed by Cloudflare. A precise
read-only diagnostic showed identical159-link counts and exactly one mailto
replacement. Cloudflare independently salts the href and visible-label payloads;
the old href also contains a leading ASCII space. The QA helper decodes both
payloads separately, requires their normalized addresses and visible text to agree,
rejects malformed bytes/changed addresses/query strings/other origins, and then
compares against the exact original link. Four positive/negative source units
pass. Only the already-observed first-party decoder script is allowed in the
browser harness, matching the existing Contact audit policy. No Cloudflare,
consent, security or email settings changed. No-JS protected-email behavior remains
the existing documented limitation, not a newly claimed working mailto.
The corrected Blog8-view origin follow-up passes353/353, including visible JS
decoding; the complete cached192-view audit passes2,053/2,053.

Forms501 origin and501 normal pass with all submissions intercepted, as do
attribution143 origin/normal, discovery243 origin/216 normal/216 repeat,
homepage10/icon21/font20 origin/normal, and16 normal axe views with0 violations/
12 incomplete groups. Final shared JavaScript203 and Python214 pass. Controlled
fixtures607/607 include four actual30s pending-font rejections in JS/no-JS contexts
for both audit tools; all fixture network is aborted. Source2,473 and reference
build2,320 remain passing. No additional application upload was needed.

| Complete full release check | Time UTC | Content responses | Result |
| --- | --- | --- | --- |
| Recovered origin |09:35:03.777580|348 DYNAMIC|6,193/6,193;119 assets;0 retries|
| Normal clean URLs |09:52:43.825355|348 MISS|6,193/6,193;119 assets;0 retries|
| Warmed repeat |09:56:06.615823|348 HIT|6,193/6,193;119 assets;0 retries|

Only the approved staging prefix was purged through authenticated MCP at
09:47:03.579UTC, after fresh API-spec and exact zone/account validation.
`cache-purge.json` retains the accepted body/result; cache proof is the independent
normal/repeat checks above, not API acceptance alone.

The first cached Blog screenshot had a blank native-lazy image area. Keep it;
do not call it a pixel pass. A subsequent same-page diagnostic confirmed the
original localized image/source-set, natural width2560, successful decode,
visible paint and zero failed image requests. The QA now explicitly scrolls,
decodes and checks visibility/source scope for all65 selected card images at all
8 JS/no-JS widths, and waits for decoded images before screenshots. Application
images, lazy policy and all artwork remain unchanged. The expanded full local
and normal media matrices are still running; do not count delivery36 until
their final reports and actual screenshots are inspected.

Final expanded matrices are now complete: local2,523/2,523 and normal2,573/2,573,
each192 JS/no-JS views across all23 containers and the photo. The normal report
at10:00:30.198UTC includes520 decoded-card-image assertions, plus the unchanged
featured photo. All actual images loaded from the expected localized source
scope and were visible. Four final cached390px screenshots were inspected after
decode; no original whole-page or pre-edit pixel identity is claimed. Unreviewed
cards elsewhere can retain older small typography/CTA behavior; this release
does not claim to fix all40 archives or finish the56-article review.

Both roadmaps now count36 verified staging deliveries, with the same40-workstream
states. C08 remains17 major revisions,2 narrower corrections/notices,1 held and
36 awaiting substantive review; summaries do not add19 completed fact audits.
The specialist hold, functional consent, commerce, production and OmniLodge are
unchanged. All finite publishers/builders/verifiers/browser suites are closed;
the two local root previews remain available for continuing work. Final Git/CI
records may change, but the deployed application must remain byte-exact to the
reviewed application commit. Do not reupload or repurge for documentation.

The final QA source commit `28dfc7439064860b9949144087eeb3e03f7d11be` passed both
required jobs in CI `43583536397`. Subsequent documentation-only checks and the
exact-tree merge record are retained on PR49; they are not another deployment.
