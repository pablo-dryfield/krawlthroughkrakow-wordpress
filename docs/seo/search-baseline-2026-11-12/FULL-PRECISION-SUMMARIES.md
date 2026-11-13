# Full-Precision Search Summaries

Read-only retrieval on13 November2026,18:01-18:03 UTC, from the existing
signed-in OmniLodge Search Console reporting session. No reporting settings,
Google account configuration, website files or bookings were changed.

Property: `https://krawlthroughkrakow.com/`; search type:web; aggregation:byProperty.
Dates are inclusive Pacific days (`America/Los_Angeles`). Values below are the
independent summary response, not sums or averages of the detail table.

| Window | Dates | Clicks | Impressions | CTR (fraction) | Position |
| --- | --- | ---: | ---: | ---: | ---: |
| Current28 |2026-10-14 to2026-11-10|958|45215|0.021187658962733606|9.41455269269048|
| Current90 |2026-08-13 to2026-11-10|2787|134456|0.02072797048848694|10.407322841673112|
| Current180 |2026-05-15 to2026-11-10|5760|315895|0.01823390683613226|11.134149005207426|
| Current365 |2025-11-11 to2026-11-10|13174|835831|0.015761559454004457|10.754907391565999|
| Prior-year28 |2025-10-14 to2025-11-10|1217|61902|0.019660107912506865|9.974233465800783|
| Prior-year90 |2025-08-13 to2025-11-10|4368|227339|0.01921359731502294|14.302878080751652|

All six responses report `historyBoundaryDate:2025-07-13`,
`startsBeforeHistoryBoundary:false`, `endsInFuture:false`. The corresponding
prior-year180/365 windows start before that boundary; no complete comparison or
zero-filled historical result is manufactured.

## Retrieval And Limits

Only same-origin GET `/api/search-console/performance` was used, with explicit
property/dates, `dimensions=date`, `rowLimit=1`, `startRow=0`, `type=web`.
The one-row limit bounds unused detail; it does not truncate the independent
property summary. Normal same-origin cookie authentication succeeded200.
No credential values, private visitor URLs or attribution tokens were returned
to documentation. An earlier legacy-token guard stopped before any request;
it was not evidence of a signed-out reporting session.

Current clicks/impressions agree exactly with the retained four baseline
exports. Full-precision summary values supersede only their rounded display
CTR/position, not the retained original evidence. Detail-level full-precision
exports, intent pairs, geographic/device cohorts and future retention still
need work; M02 remains partial.

These are descriptive comparisons, not a migration-impact experiment. Most of
the current windows predate the5 November content cutover. Neither a decline
nor an improvement can be attributed to that migration from these totals.

Provider semantics: [Google Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).
