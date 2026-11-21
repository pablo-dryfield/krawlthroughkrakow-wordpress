# Native dated SEO baseline - M02 acceptance

The existing live Google connection works for Search Console and GA4. No OAuth
scope, API setting, container, website or account setting was changed. Search
Console URL-prefix `https://krawlthroughkrakow.com/` is siteOwner. GA4 property
371949862 uses Europe/Warsaw and PLN; the Search Console reports use Pacific
date labels. Equal date labels are not treated as identical UTC instants.

Latest final Search Console day:18November2026. All queries explicitly request
final web-search data. Results retain provider privacy/top-row limitations,
even when every returned API page is downloaded. Anonymized queries are not
invented, and the remainder is not automatically classified as nonbrand.

| Window | Current dates | Search Console comparable prior year | GA4 prior year |
| --- | --- | --- | --- |
|28days|22October-18November2026|22October-18November2025, complete|Complete28days|
|90days|21August-18November2026|21August-18November2025, complete|Complete90days|
|180days|23May-18November2026|Only20July-18November2025 remains available|Complete180days|
|365days|19November2025-18November2026|Only20July-18November2025 remains available|Complete365days|

Search Console's rolling16-month history leaves the same122-day prior tail for
the two longer requests. Both requested and effective dates are retained. The
current122-day tail is derived from the independently verified daily property
series for a matched comparison; it is not labelled a full180/365-day YoY.

## Independent verification and analysis

Search Console: seven datasets, six reports each: independent property totals,
dates, queries, pages, query/page pairs and country/device. Every exact dimension
key is unique across contiguous5,000-row pagination. All responses are200 and
all final pages are below the local cap. Expected daily dates, summed clicks/
impressions, CTR and impression-weighted position agree at full precision.

GA4: eight windows, five reports each: property totals, dates, events,
device/country and main-host landing-page/source-medium. All40reports return200
without a pagination cap. All expected date labels are present; additive event,
key-event and purchase counts agree across independent totals/date/event reports;
revenue agrees within one PLN minor unit. Users and sessions are not summed
across non-additive dimensions. Returned quality metadata is retained privately.

The existing tested query/landing analysis processes all returned pair pages,
from2,923current28-day pairs to19,768current365-day pairs. It retains9intent
cohorts, explicit-brand versus brand-variant review, and13selected query forms
where present. Exact URLs are deduplicated before controlled-path rollup; raw
unknown queries and parameter values are not emitted by the summary. Independent
byProperty summaries are never subtracted from byPage pair totals to infer
anonymous or nonbrand shares.

UK, Poland and other returned markets; mobile/desktop/tablet; editorial guides,
archives, commercial/business, PDF, legacy store and unreviewed pages are
separated. Article roles come from the controlled registry, not URL guesses.
The dated private exports retain exact quantities; this public source handoff
does not expose financial, customer or raw query/landing data.

Matched28/90-day and122-day-tail property clicks and impressions are lower than
the prior year. This is an observation, not migration causation. Separate
homepage/content release dates remain in the existing delivery ledger; no new
website production release is recorded. Query overlap is a review lead, not
proof of harmful cannibalization or permission for consolidation.

Decisions supported now: retain homepage/main-crawl versus product-detail roles,
retain distinct NYE sales/guide purposes, and measure PDF/editorial reach
separately from completed bookings. Do not merge useful pages merely because
they share queries. The medical hold remains unchanged. Country is not language
or nationality: existing evidence does not establish supported translated
operations or a translation business case, so no translated doorway rollout or
hreflang change is made.

## Index snapshot and investigation limits

Seven native indexed-version inspections return200. Homepage and Blog are
indexed with matching clean canonicals. The regular product's8November crawl
has a clean Google canonical and an older legacy user-declared canonical; newer
anonymous HTML checks show the clean user canonical. The indexed snapshot is
older evidence, not a fresh live URL test or an instruction to change production.
The NYE product, staging root and two historical broken targets are unknown in
that sample. No indexing request is sent.

Submitted-sitemap metadata still records the historical sitemap_index.xml
submission, last downloaded5March2026, with1error/2warnings. A404 at that old
endpoint is not by itself a site fault; the established valid endpoint is
wp-sitemap.xml. Production submission/discovery changes are excluded. Fresh
Manual Actions, Security Issues, Page Indexing and Crawl Stats UI observations
remain a separate M04 owner check; no current clean status is assumed.

## Durable private retention

The complete selected reports, reader/auditor source, original date limits,
cohort analysis and public CrUX observations are retained locally in ignored
`deploy-backups/nonproduction-native-account-evidence-20261121.zip`:
2,940,435bytes,34members, SHA-256
`abe2232d896e6e6427084e5b0e01cc326fe5d13b65a000bbedf82bd8ab1897c2`.
Every member is reopened and checked against its manifest SHA-256; ZIP CRCs pass.
It contains no credential files, raw email bodies or individual review comments.
It is private business evidence, not a public artifact, source or hosting backup.

M02's original dated-baseline criterion is met. Future comparable reviews remain
R02; M03 provider reconciliation, M04 native UI and production outcomes retain
their own criteria and are not completed by these reports.
