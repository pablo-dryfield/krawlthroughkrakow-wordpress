# Booking and Analytics reconciliation — 25 November 2026

## Result

For **22 October–18 November 2026, Europe/Warsaw**, all **13 Ecwid orders** created in the window match all **13 GA4 purchase identities** exactly. Each has one purchase event, the same Warsaw calendar date and the same order amount within PLN0.01. All 13 are currently paid, positive-value, unrefunded, and independently matched to one paid Ecwid booking in OmniLodge. Ecwid's current store currency and the GA property currency are both PLN. Independent ungrouped, transaction and daily GA reports agree.

The custom checkout is a separate cohort: **231 positive-value database-paid storefront orders** have paid-at dates in the same window, plus **0 zero-total paid records**. **Zero** match GA's reported transaction identities across the internal ID, public UUID or payment-reference fields. All 13 GA identities belong to the Ecwid cohort. This replaces the earlier zero-match investigation, which compared Ecwid-shaped GA IDs against an incomplete sample of custom-checkout records.

| Observed cohort | Orders in the stated window | Exact GA transaction matches | Scope |
| --- | ---: | ---: | --- |
| Ecwid | 13 | 13 | Order creation dates; current paid status; matching day and amount |
| Custom checkout | 231 positive paid records | 0 | Database paid-at dates; no payment-settlement audit |

These are observed historical records. A count comparison is not a consent-eligible conversion rate or an expected100% analytics target. It does not establish why a particular custom-checkout purchase is absent, nor prove future tracking performance.

## Published source trace

The actual public production checkout JavaScript SHA-256 is `7f7f6ea814361d17dfbde1ee3acf52b5c02392578202ad644df53820be5b728c`. It differs from the reviewed staging asset, and matches an existing Git artifact at source `0cec9853877d06eb1ffee21bba296b76553828c2`. The matching committed source queues `orderComplete` with the public order UUID/value after a confirmed paid-or-zero result. Its helper matches the reviewed staging helper.

One current public GET of GTM-PHXGRZ, parsed as data and never executed, reports version41 and the unchanged resource hash `ee669c54406dac0a14e1a3498a0cca11f7864894552e9234d8c6fa8d440839eb`. The public container maps `orderComplete` to Google Ads conversion42 using orderId/orderTotalValue/PLN; it has no explicit GA4 purchase mapping. A queued data-layer event is not proof of actual Ads receipt. Public definitions do not establish every linked destination or account rule.

The GA property has separate main-site and NYE streams. The 13 purchase rows are on main stream5115820259; their reported hostname is `(not set)`. The exact order association and the stream's configured default URI are evidence separate from hostname reporting. No NYE stream purchase row appears in this queried purchase result.

## Coverage and verification

The read connector enforces100 rows per request, supports equality filters and has no offset/range pagination. Both100-row paid-order ID edges were read; they do not overlap. Every one of the737 integer IDs between those edges was then queried with the exact ID, paid status and storefront source, at limit1. All returned paid records are unique. This completes the observed ID-bound coverage without changing the connector, its limits, accounts or database. Each request used its existing read-only transaction; this is not one atomic database snapshot.

The complete Ecwid creation-window response reports total13/count13/offset0. Minimal responseFields exclude customer names, email, addresses and notes. The date filter uses Warsaw midnight bounds across the October daylight-saving transition. The independent GA reports return all stated rows and report no sampling, threshold, other-row loss or truncation flags. [Method and limits](METHOD.md) retain the exact scope.

No raw transaction IDs, payment references, customer details, per-order amounts or revenue totals are published in this packet. Hashed associations, raw read receipts and financial comparison remain private. The baseline observer's incorrect raw-ID flag is explicitly retained and corrected in the method; no result is silently rewritten.

## Disposition

The read-only historical comparison is delivered at this scope. M03's complete consent-aware journey/measurement criterion is not marked complete. The concrete measurement gap is the custom checkout's absence from this GA4 purchase result. A [separate staging proposal](NEXT-STAGING-SCOPE.md) identifies the next implementation scope; no tracking fix, historical backfill or account/container change was made.

Website production, D08, commerce/Ecwid/order behavior, forms, functional consent and retained recovery data remain protected. Provider-contract/hosting-account checks remain **Discarded by owner** and were not reopened. New orders, payments, messages, conversion events, account changes, deployments, cache purges, source pushes and CI dispatches: zero. Counts remain85 verified staging website deliveries/89 records and eight completed original finite batches.

Primary references: [Google report pagination](https://developers.google.com/analytics/devguides/reporting/data/v1/basics#pagination), [Google response metadata](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/ResponseMetaData), [GA transaction/revenue schema](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema), [Ecwid order search](https://docs.ecwid.com/api-reference/rest-api/orders/search-orders), [Ecwid profile currency](https://docs.ecwid.com/api-reference/rest-api/store-profile/get-store-profile).

## Main-stream event observations

Same date window; these are reported event counts, not unique visitors, a joined per-person funnel or consent-eligible denominators. A zero below means the named event was not returned by this filtered report.

| Event | Reported count |
| --- | ---: |
| view_item | 95 |
| add_to_cart | 12 |
| begin_checkout | 18 |
| add_payment_info | 13 |
| purchase | 13 |
| ktk_homepage_booking_click | 0 |
| ktk_page_booking_click | 0 |
| orderComplete | 0 |
