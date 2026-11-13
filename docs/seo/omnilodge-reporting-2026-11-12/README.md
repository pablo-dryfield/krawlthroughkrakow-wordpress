# M01 Reporting Delivery

The owner explicitly approved OmniLodge implementation and production deployment,
separately from the staging-only website program. Reporting only: no prices,
booking/payment records, customer transactions, consent or account settings change.

## Source And Checks

- PR252 source `36853d4a3e14db408eda86c5312b2925609b7edc` passed all required
  prospective-merge CI43313743742, including PostgreSQL16/17, UI tests/build,
  actual isolated runtime, release tooling and migrations. Auto-merged as
  `c4007f7d84a93976b5564478427a2172d07b3312` at2026-11-12T22:00:39Z.
- Immutable Release43315813139 attempt1 succeeded. Artifact
  `omnilodge-r43315813139-a1-c4007f7d84a9`, inner tar SHA256
  `651c83839ec7e912b4b6af0114613aca767ffbadf0f9390998b0fa92e5da9ae0`.
  Actual managed deploy43317776455 succeeded. Host terminal success was
  2026-11-12T22:22:37.317Z (`REQUEST_SUCCEEDED`); sanitized host polling proof is
  privately retained under `deploy-backups/search-console-deploy-response-43317776455/`.
- Independent trusted-artifact bundle discovery tests3/3 pass. Expected reporting
  bundle `/static/js/2095.ad0ad48d.chunk.js` SHA256
  `e15e2bb6684b82ea92131450b6ddef2e234b071ea8a2cd38e942c8131db79427`.
  Final independent public verification3/3 at22:23UTC matches healthy primary
  backend identity, UI metadata and actual bundle bytes to the immutable artifact.
  `delivery-final.json` is the delivery proof. The first live check0/3 correctly
  found the old release/UI and is retained as `delivery-first-check.json`.
- Local backend350 suites/3570 passed/one existing skip. Focused reporting27 backend
  and7 UI tests pass. Actual-page synthetic browser21/21 at320/390/768/1440,
  keyboard filters/load-more/no-data, zero errors/mutations. Screenshots inspected.
- Local first concurrent whole UI run:7 failures in5 unchanged suites. Serial
  repeat:1261/1262 passed, one OngoingCartsPanel timing failure; mixed focused
  repeat hit a different timing failure in that unchanged suite, but standalone
  original suite7/7 passes. Preserve every log. Hosted current full UI passed;
  do not rewrite the local full run as clean. Final UI typecheck/lint pass.
- Redundant same-source push CI43313690592 was deliberately cancelled only after
  the real PR run existed. Its cancelled/failing Branch check is not the protected
  successful `CI / required` PR gate. No gates/workflows were weakened.

## Real Account Baseline

The owner signed into task Chrome page3. Read-only inspection confirms the old
production report is still active before deployment, on property
`https://krawlthroughkrakow.com/`,28days2026-10-14..2026-11-10, Query view:

| Old top100-derived KPI | Value |
| --- | --- |
| Clicks |427|
| Impressions |7315|
| CTR |5.84%|
| Average position |6.97|

The visible table contains100 rows. These are NOT verified complete property
totals; retain solely as the old-implementation baseline. No report action was
saved and no paid SERP sample was run. After actual deployment, reload and compare
the independent Google summary, coverage, page/query modes and matching filters.
Native Search Console account/UI comparison is still distinct from this OmniLodge
account observation.

## Authenticated Live Checks

After deployment, the same28-day range reports the independent Google summary:

| Corrected metric | Value |
| --- | --- |
| Clicks |958|
| Impressions |45,215|
| CTR |2.12%|
| Average position |9.41|

This is corrected reporting, not traffic gained by the release. Actual pagination
loads1000 then2000 unique queries with native offset1000 and honest remaining-row
coverage. Exact query `krakow pub crawl`:49 clicks/528 impressions/9.28%/3.23;
both current and previous periods carry that same filter. Exact homepage filter:
369 clicks/10,279 impressions/3.59%/5.65, matching the direct-page diagnosis and
switching summary aggregation to byPage. No fake totals reconstructed from query
details. The view was restored to unfiltered defaults.

No paid SERP call, URL inspection request, action save or account/commerce change.
The attempted live screenshot timed out in Chrome DevTools after120s; it is NOT
claimed as inspected visual evidence. Targeted DOM and outgoing report-query
checks succeeded. Earlier synthetic responsive screenshots remain separate.

Source/merge trees matched before task branch cleanup. Follow-up documentation
PR253 passed required CI43320207297 and merged as
`121755b3e018d6af63940b829d060e810a5548b6`; Markdown/docs are excluded from Release,
so this did not require another application deployment. Primary OmniLodge checkout
is clean on synchronized master; own completed local/remote branches are removed.
Native Google review is now complete for the matching28-day window: totals and
leading query rows agree. Manual Actions/Security Issues show none; indexing,
crawl and sitemap findings are in the [native review](../indexing-review-2026-11-13/README.md).
The subsequent date-coverage and browser-Pacific preset fixes have distinct source,
release and deployment identities; see [the follow-up](DATE-COVERAGE.md).

## Implementation Contract

Separate ungrouped summary, identical native filters/dates, lookahead pagination,
explicit aggregation/provider limits, direct page/query metrics and native exact
drill-downs. Missing observations are verification prompts, not Create page or
merge/canonical instructions. Configurable page size is refreshed per request.
See the application runbook `omni-lodge/docs/search-console-reporting.md`.

Source: [Google Search Analytics query contract](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).
