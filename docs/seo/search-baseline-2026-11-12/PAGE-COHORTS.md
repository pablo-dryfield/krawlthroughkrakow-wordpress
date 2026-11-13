# Page-Role Baseline

Read-only analysis13 November2026. Same retained finalized Google-backed UI
exports as the main baseline, all ending10 November, Pacific dates. No new
account/API configuration, website deployment or customer-data export.

## Method And Limits

`tools/summarize-seo-page-cohorts.py` uses the116-route migration manifest,
known aliases and retained24-product public catalogue. Roles describe destinations,
not a visitor's inferred search intent. Six explicit commercial content paths are
Hen Do, Stag Do, NYE, Other Tours, Stags/Hens and Student Trips. How to Join and
Meeting Point are booking guidance; Nightlife is its own editorial hub. Articles,
archives, PDFs, catalogue, products and protected Ecwid URLs remain separate.

Each exact full URL is counted once. Query strings, fragment identifiers,
protocol and trailing-slash variants are not stripped or used to overwrite an
existing metric row. Unknown paths remain unreviewed; a `/store2/` prefix alone
does not prove an actual product. Outputs contain aggregate counts and source
hashes, not raw URLs or advertising/customer tokens. All1687 rows across the four
overlapping periods are classified independently; do not add those windows.

These are **page-grouped returned rows**, not whole-property totals, sales or
conversions. For example,28-day page rows total958 clicks/51,207 impressions,
whereas the independently returned property summary is958/45,215. The differing
impression denominators are not a new reporting bug: Google can count multiple
page results separately but one property result in its chart. Likewise,90-day
page clicks2,789 are not the property figure2,787. No average of rounded positions,
whole-property cohort share or inferred complete nonbrand total is calculated.
[Google explains the aggregation difference](https://support.google.com/webmasters/answer/7576553?hl=en).

## Returned Clicks By Role

| Role |28 Days|90 Days|180 Days|365 Days|
| --- | ---: | ---: | ---: | ---: |
|Homepage|369|942|1,699|3,333|
|Editorial articles, including fragment rows|256|1,041|2,157|5,128|
|PDF documents|230|551|1,456|3,725|
|Six commercial content destinations|25|63|75|147|
|Code-managed product destinations|26|35|35|35|
|Protected legacy Ecwid destinations|28|80|168|467|
|Other known information/operator pages|21|61|106|217|
|Drinking-games HTML resource|2|13|65|119|
|Booking guidance|1|3|3|5|
|Nightlife hub|0|0|1|9|
|Archives|0|0|0|1|
|Code catalogue|0|0|0|0|
|Unreviewed content/storefront URLs|0|0|0|0|
|**Returned by-page sum, not property total**|**958**|**2,789**|**5,765**|**13,186**|

No observed staging, other-host or non-HTTPS rows occur in these four retained
exports. This is bounded reporting evidence, not proof that none exists in Google.

## Variants And Interpretation

| Window |Clean Rows|Query-Only Rows / Clicks|Fragment-Only Rows / Clicks|Returned Page Impressions|
| --- | ---: | ---: | ---: | ---: |
|28 days|99|169 /11|94 /0|51,207|
|90 days|126|171 /17|121 /0|151,149|
|180 days|130|171 /17|136 /0|353,213|
|365 days|155|171 /17|144 /0|985,013|

No combined-query-and-fragment rows occur in these exports. The28-day article
group's148 rows are54 clean canonical observations plus94 fragment observations,
not148 different published articles. The product group's172 rows are169 query
variants plus three clean observations, not172 products. Preserve legitimate
Google booking/UTM attribution; these tables do not justify removing parameters
or changing canonical URLs. A historical observation is not proof a URL is
currently indexable, live or receiving the same traffic today.

This supports preserving the existing games PDF and refreshing proven articles
alongside commercial pages. It does not establish which visitor booked, whether
the PDF converts, or that the migration caused any difference. These periods
straddle/pre-date the November cutover; a controlled post-release cohort remains.
The unknown URL rows stay a review queue, not automatic redirect candidates.

## Reproduction And Verification

```powershell
python tools/summarize-seo-page-cohorts.py --catalog docs/seo/staging-public-html-2026-11-12/public-inputs.json --output docs/seo/search-baseline-2026-11-12/NEW-page-cohorts.json docs/seo/staging-schema-2026-11-12/provider-pages-28.json docs/seo/staging-schema-2026-11-12/provider-pages-90.json docs/seo/staging-schema-2026-11-12/provider-pages-180.json docs/seo/staging-schema-2026-11-12/provider-pages-365.json
```

Existing generated report `page-role-cohorts-20261113.json` is retained locally
and ignored by Git. It binds all four original export SHA-256 values, the manifest
`02ff69958485bf7d09b39409d4d9f5708a2ee25ba4e162de1008dc2477027824`,
catalogue `e426bb29911e6ee9d5537889cbc47edb08a63bf18a26a449c6b979f76ac5c83b`
and role registry `e01a8cda4a9e0861ce3704c5d86eceebc2e12f006f0e5a736ae6f491bcc6f286`.
Source hashes are not a claim that all provider rows were available.

Six focused unit tests cover exact variants, role boundaries, unknown URLs,
private-token non-disclosure, invalid/duplicate/incomplete/wrong-aggregation data
and non-averaging. Full Python suite158/158 passes. M02 remains partial:
full-precision API, query/page intent pairs, supported prior-year windows and
future retention policy still need work. No production or account change is made.
