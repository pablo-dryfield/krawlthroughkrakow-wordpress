# Fresh Homepage Performance Baseline

Read-only D02 continuation while the embed release completes. No homepage,
vector, CSS, font, consent, provider, production or server configuration change.
The owner requires the original vector artwork: do not rasterize or approximate
either statue. These observations are not another staging delivery.

## Current Browser And Conditions

The Chrome DevTools MCP becomes available with a new background page in isolated
context `ktk-seo-readonly-20261115` (page2). The existing about:blank page1 is
untouched. Only the task's normal staging homepage is opened. Navigate succeeds
before tracing. All desired emulation settings are applied together:
390x844, DPR3, mobile/touch, CPU4x and Slow4G; browser HTTP cache bypass is enabled
for each reload. Chrome reports157 on Windows. No consent control is clicked or
preference altered; purpose3 is observed false.

The first request to save a raw trace into this repository is rejected because
the MCP's configured workspace roots exclude this project. The supported default
trace succeeds. **No raw trace export is claimed.** Returned summaries, details
and the exact export error are retained locally instead; no unrelated project
directory is used as a workaround.

## Three Current Lab Observations

| Run | LCP ms | TTFB ms | Load delay ms | Load duration ms | Render delay ms | CLS |
| --- | --- | --- | --- | --- | --- | --- |
|1|11056|565|201|9773|518|0.01|
|2|10984|564|206|9799|415|0.01|
|3|11038|564|227|9788|459|0.01|

Median LCP is**11038ms**. This is a descriptive current staging lab baseline,
not field CWV, an INP result, a production score or a causal comparison with the
older Chrome/profile/day. No CrUX data is available for this page. It does not
show a performance improvement from the unrelated embed delivery.

`baseline-summary.json` parses only the navigation block containing LCP, never
the preceding `NO_NAVIGATION` block's0.00 CLS. Per-run summary/details files are
retained. The second insight follow-up initially reused the old `NAVIGATION_0`
ID and returned no insights; the actual current `NAVIGATION_1` is then used and
saved in `baseline-run2-insight-corrected.json`. No failed result is substituted
for a measurement. Run3's insight ID is selected from its actual returned block.

## Verified Current Findings

All three LCP details identify the unchanged regular statue:
`hero-statue-regular.svg?v=95ae7ee6a4c5`, SHA256
`95ae7ee6a4c5fc951a20493c159427598d3f28b810a95191ca846f72548e4c7c`.
Run1 has669694 decoded/279474 encoded bytes and9773ms resource load duration,
88.4% of LCP. The insight reports HTTP3, SVG MIME, High request priority,
`content-encoding: br` and one-year cache control. Do not infer missing server
compression or propose a cache-policy change from compressed size alone.

Actual DOM/timing facts at390x844 show both original statues requested with
`fetchpriority=high` and loading auto. Regular spans viewport y140..509;
seasonal spans570..940 and is partly visible. **The seasonal artwork is not
proven unused or below the initial viewport.** Do not hide/lazy-remove it on
that assumption. Source `hero.php` currently gives both variants high priority.

FontDisplay identifies the owned full ET modules font (`block`, estimated2850ms
FCP cost) and932-byte social font (`block`, estimated795ms). These are diagnostic
estimates, not measured gains. The resources are icon fonts: do not blindly show
fallback glyphs, remove icons or change all font display behavior. Inspect actual
usage, request ordering, glyph fidelity and layouts before selecting a change.

Network dependency details retain the current CSS/font chains. Render-blocking,
ordinary-image and legacy-JS insights estimate0ms LCP savings in these runs;
they do not justify unrelated refactors or third-party/consent changes. The
run3 CLS insight attributes a small cluster (0.0054) mainly to font arrival
around the seasonal heading/floating CTA, plus a smaller navigation shift.
It does not prove a general CLS regression or identify all field behavior.

## Original Vector Inventory

`source-inventory.json` inspects exact original XML and in-memory compression:

| Original | Raw bytes | Paths | Path-data bytes | gzip9 | In-memory Brotli11 |
| --- | --- | --- | --- | --- | --- |
|Regular|669694|2329|606727|276705|250136|
|Seasonal|286738|649|268866|118385|107682|

No path-data duplicates are found; metadata/title/description total only256 and
294 serialized bytes. Brotli round trips reproduce each complete original byte
stream exactly, but these sizes are local compression estimates, not deployed
delivery savings. The live response already reports Brotli. No source geometry,
path precision, asset URL, response encoding or application file is modified.

Next work must preserve the exact artwork and establish a controlled current
before/after comparison for any delivery/priority/font candidate. No new source
edit, backup or implementation is started during this read-only baseline.

## Browser-Only Priority Experiment: No Application Change

The prior embed batch is merged as PR74 / `467d49e0f4515d33dba392d9cfdef5d7b16581a4`,
exact tree `42b5f50331634e2b82f8705e53c77abb354ed037`. Final PR CI43714260072
and main43714382387 pass both jobs. The completed branch is removed. The next
source-only branch is `codex/staging-homepage-priority`.

Before adding the probe, the complete tracked-source archive verifies3,470
Git/local/ZIP blobs,3,702 ZIP entries and CRC. Archive
`deploy-backups/seo-homepage-priority-before-20261115.zip` is499,974,532 bytes,
SHA256 `d34a9b8780e5f9b300efe94e00ec23febe5c92f9550c9aa35f96e1807c4dfd00`.
This preserves tracked code; it is not a database or whole-host backup.

[Current primary Fetch Priority guidance](https://web.dev/articles/fetch-priority)
describes browser hints rather than guaranteed scheduling. A measured prototype
therefore precedes any proposed application change. The maintained read-only
`tools/probe-homepage-hero-priority.mjs` intercepts only the normal staging main
document in a fresh browser context. Both arms fetch/fulfil that document in
the same way. The candidate changes one seasonal image hint from high to low;
an exact inverse must reproduce the original HTML SHA. It never modifies a
server, source SVG, consent preference, application file or account setting.

The six-run order is control/low/low/control/control/low. Chrome157 headless,
390x844/DPR3/mobile-touch, CPU4x and explicit CDP1.6Mbps down/750Kbps up/150ms
latency are applied to both arms. Browser HTTP cache is disabled. Main-document
fetch/fulfilment bypasses browser throttling in both arms, so these observations
must **not** be compared numerically with the earlier native DevTools baseline.
Live GET providers remain variable. All30 non-read attempts are intercepted;
there is no form, order, account action or consent click. Query strings are
omitted from non-asset request records in the reviewed probe.

The first control stops8/9 because the probe calls an unavailable consent-reading
method and gets null. Its report and initial script are retained under
`priority-prototype-1`; no application is changed. The current preferences API
is inspected directly and the read corrected to
`getPreferences().purposes[3]`. A separate new evidence directory preserves the
reviewed six-run result; purpose3 is actually false in every run. A failed
patch-context check and a quoting syntax error also stop before source writes.

The reviewed probe closes12:37:45.969UTC on15Nov with61/61 checks and frozen
probe SHA256 `044c1400e17bd88631803204ef36ae3d7270ad651bc31717d0ccebdae785606d`.
Raw reports, document captures and request priority events are retained under
`priority-prototype-reviewed`. The browser observes initial High/High for every
control and High/Low for every candidate, without subsequent priority changes.
Both SVGs decode, retain their original resource sizes and have identical DOM
geometry across the six contexts.

| Observation | High/high control | High/low prototype |
| --- | --- | --- |
|LCP ms, three runs|8524 /8128 /8692|8632 /8212 /8436|
|Median LCP ms|8524|8436|
|Median regular-SVG load ms|7422.4|7433.1|
|Median seasonal-SVG load ms|4539.4|6373.8|
|CLS, every run|0.0021608|0.0021608|

The88ms median LCP difference is small relative to observed variation, and the
regular resource load is effectively unchanged. The visible seasonal resource
finishes about1,834ms later. **Do not implement this candidate:** the experiment
does not establish a useful speed improvement and worsens seasonal delivery.
All application bytes, original vector files and high/high hints remain exact.
No build, upload, purge or extra staging delivery occurs; both roadmaps stay58.

Both captured phone PNGs are actually inspected. The control shows the native
consent overlay; the low-arm PNG omits much text and artwork despite the decoded
DOM measurements. Its paint/capture cause is unestablished. That PNG is rejected
as visual-parity evidence. The61 checks certify only their named document,
source, resource, priority and preference observations, not complete visual or
functional equivalence. No accessibility conformance or field-CWV claim follows.

D02 remains open. Other delivery/font candidates need separate controlled
measurements and exact artwork/glyph checks. The authenticated protected-state
release wrapper and its staging rehearsal also remain feasible G02 work; no
production update or owner approval is implied by this source-only experiment.

Final source-only checks pass: roadmap317/317 after the last plan update,
Python264 with4 local Windows-symlink skips, probe syntax, repository policy
and diff whitespace. The actual1440px task-details render is inspected.
Independent receipt rechecks the frozen probe, every document inverse, both
exact original SVG Git/local bytes and empty application diff. CI/merge remain.
