# Reconciliation method and limits

Evidence date25 November2026. Period2026-10-22 through2026-11-18 inclusive, Europe/Warsaw. Ecwid creation bounds are2026-10-21T22:00:00Z through2026-11-18T22:59:59Z; both endpoints and the following second are checked against Warsaw dates. The GA property's actual timezone/currency are independently read. Google and Ecwid authentication reuse existing configured credentials in memory; no scopes, credentials or account settings are changed. Only purpose-scoped Google/Ecwid configuration keys are resolved; secrets/ciphertext are excluded from reports.

## Independent assertions

- Ecwid total/count/offset, unique identities, date bounds, paid positive status, zero refunds and complete page coverage.
- Exact SHA-256 association of all13 GA transaction IDs to all13 Ecwid public IDs, one purchase/event each, matching Warsaw date and order amount within PLN0.01. No case-folding, truncation, identity rewriting or fuzzy matching.
- Thirteen separate exact-order-ID lookups each return one paid Ecwid booking in OmniLodge, with matching platform order ID and PLN currency.
- Separate GA total, transaction-only and daily reports agree with the enriched date/ID/stream/hostname report. Returned row counts and metadata are checked. There are no orderComplete or refund rows in the two specifically filtered queries; absence is not proof of all-time absence.
- The two100-row paid-storefront ID edges and737 exact-ID gap lookups cover the observed paid-order ID interval. Returned identities are distinct; all gap responses are HTTP200 with limit1. The paid-date cohort contains231 positive and0 zero-total records. Matching against all three known ID fields finds zero exact GA transactions.
- The actual public checkout asset is hashed and compared with existing Git blobs. Only its matching committed source is used for the production source trace. The public GTM response is parsed as data; no downloaded script is executed.

## Qualifications retained

The connector's source-defined100-row cap and equality-only filters explain the earlier limited sample. Its observed response cap is not reinterpreted as provider support for offset/ranges. No connector feature, setting or limit is changed. The documented trusted-local tunnel fallback's three expected credential files are absent; no SSH connection or replacement access was attempted.

The reads are individual transactions at recorded times. They are not a repeatable-read snapshot of the complete live database. Captured creation dates and paid-at dates describe different cohorts and are labelled accordingly. Database paid flags are not Stripe settlement receipts; existing customer consent/ad-blocking states are not known from these rows. No test purchase is used to fill those gaps.

The first private baseline receipt incorrectly labels rawIdentifiersPersisted as false while retaining internal numeric order IDs for edge coverage. Its original bytes are retained, the error is disclosed, and the source annotation is corrected for future use. External/public/payment identities are hashed, and no raw IDs are copied to public docs. The first live-asset comparison correctly fails equality against staging; a subsequent existing-Git comparison finds the exact production artifact. The failed staging-equality result remains retained.

The private independent receipt SHA-256 is `9e860a43f16a937fa60fd29db45b5c554a8217103a23ea88365fe25de2027f2d`. Public source maps no customer or financial quantities. No complete legal/privacy review, hosting/account recovery or discarded provider check is claimed or reopened.
