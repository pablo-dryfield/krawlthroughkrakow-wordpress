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
