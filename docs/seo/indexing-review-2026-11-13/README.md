# Google Indexing Review

Read-only Google-backed URL Inspection through authenticated OmniLodge, checked
on13 November2026 Europe/Warsaw. These are stored indexed-version results, not
live Google tests, indexing requests or a full property health audit. No Google
account settings or production website files were changed.

## Representative Stored Results

Every sampled URL returned PASS / SUBMITTED AND INDEXED. Crawl timestamps are UTC.

| Path | Last Crawl | Google Canonical | Declared Canonical In Stored Result |
| --- | --- | --- | --- |
|`/`|2026-11-08 12:36:17|Self|Self|
|`/store2/pub-crawl-28/`|2026-11-08 23:49:33|Self|Self|
|`/new-years-eve/`|2026-11-05 17:50:19|Self|Self|
|`/krakow-new-years-eve/`|2026-10-30 12:46:59|Self|Self|
|`/category/krakow-guides/`|2026-09-21 09:18:24|Clean category URL|Same path with advertising parameters|
|`/krakow-team-building-activities/`|2026-10-17 13:11:32|Self|Unknown|
|`/new-years-eve-in-krakow/`|2026-11-06 04:32:34|Self|Self|

The content migration activated on5 November at18:43UTC. The NYE sales-page crawl
therefore predates activation, as do the evergreen guide/category/team-building
crawls. The newer NYE article result is post-migration indexing evidence, not proof
that every field or ranking is unchanged. Homepage/storefront have their own
release histories and must not be dated using the content cutover alone.

## Follow-up Decisions

- Current public category HTML returns200 and a clean self-canonical. Google's
  older stored advertising-parameter declaration is not evidence that the current
  page still emits it. Preserve legitimate ad/booking handoff; monitor after a new
  crawl instead of stripping attribution or blanket-blocking parameter URLs.
- Current production team-building HTML returns200 with no canonical, matching the
  known source omission. Staging returns200, a self-canonical and noindex/nofollow.
  Its existing guarded correction awaits website production approval; do not push
  an unrelated production fix during this staging program.
- Stored indexed status is useful evidence but does not guarantee rankings, all
  search eligibility conditions, or absence of migration impact.
- The owner subsequently signed into the native Google account. The read-only
  native review below supersedes the earlier login dependency. No indexing request,
  validation, sitemap submission, account or production setting was changed.

## Native Property Review

Manual Actions and Security Issues both say **No issues detected** at this check.
These are Google's point-in-time reports, not an independent security certificate.

Page Indexing, last updated9 November, shows133 indexed and39 not indexed across
eight reasons. Reviewed examples are not39 missing commercial landing pages:

| Reason | Count | Reviewed Context / Follow-up |
| --- | ---: | --- |
|Alternative with proper canonical|14|Expected consolidation can be correct; do not force every variant into the index.|
|Redirect|5|Review destinations, not blanket removal of useful redirects.|
|Not found|3|`/home/`, `/amp/` with an advertising query, `/apply/`; current bounded GETs still404. Review historical intent/backlinks before choosing destinations.|
|Forbidden403|2|Two old Divi asset directories, not public landing pages. Do not enable directory listings.|
|Other4xx|1|`/wp-admin/admin-ajax.php`, an endpoint rather than a search landing page.|
|Excluded by noindex|1|Literal `/store2/*`, not evidence that all products are noindex. Current literal-star response is a200 catalog fallback with catalog canonical/noindex; meaningful unknown-route handling needs separate review. The actual Pub Crawl product is indexed.|
|Crawled, not indexed|12|Eight feeds plus author pagination, privacy policy, hen archive and Ecwid account favorites. Preserve utility/account boundaries; assess useful public archives individually.|
|Google chose another canonical|1|Older advertising-parameter variant of `/category/krakow-guides/`; current clean URL canonical is correct.|

The submitted sitemap is **`/sitemap_index.xml`: Couldn't fetch**, submitted
10 September2021, last read5 March2026, zero discovered pages/videos. Current GET
confirms404; `/wp-sitemap.xml` responds200 XML. This predates the November migration
and is not proof the migration caused it. The staged123-URL replacement remains
subject to production approval, feed validation and an authorized native submission.

Crawl Stats, last updated11 November, reports approximately8.12k requests and913m
downloaded bytes over its90-day window, average response time507ms. **Host had no
problems in the last90 days.** Visible response shares are200:88%,304:5%,404:4%,
301:3%,302:<1%; three further response rows were not expanded in this bounded
review. Refresh accounts for92%, discovery8%. Rounded native totals/shares are not
exact exported counts or proof that no isolated HTTP error ever occurred.

Native28-day performance, explicitly set to14 October..10 November/Web(all
countries/devices), matches OmniLodge's958 clicks, rounded45.2k impressions/2.1%
CTR/9.4 position and leading query rows. The improvement in reported totals is a
reporting correction, not new traffic generated by these staging changes.

Private native reports are retained beside this README and ignored by Git because
some examples contain live advertising tokens. Public summaries omit those values.
Representative stored inspections and crawl-date caveats above still apply.

Private raw inspection evidence SHA256, retained outside tracked source because
the category result includes live advertising-token values:

- Homepage: `60ccbfd7454f59331be43faf620db805962d7fdb04af5cb8064d6b344bc2c11b`.
- Commercial set: `25bc105d2047ccc165d98aa0cfc6f0c872438cd8488e140bf0be8f8c85944256`.
- Editorial set: `1f7072c85d38dca7c4ed3963f6aca6494d2d78650c4fd962c1c177d134cccb89`.

The public HTML spot check is bounded to the category, production team-building
and staging team-building pages. The separate refreshed staging regression now
passes4320/4320 twice and schema3221/3221. Neither is a native Google live test.

Primary references checked: [URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)
and [Google's URL Inspection explanation](https://support.google.com/webmasters/answer/9012289?hl=en).
