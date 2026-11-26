# Current verified delivery — revision113,26November2026

The owner-published new-tag corrections and all nine installed scenarios now pass. Delivery86 is staging-verified, with2399protected files/selected WordPress state exact and37normal HTTP checks passing. The new destination is enabled only on staging. One consolidated source push/PR and candidate/main CI remain; real Google receipt and production are not claimed. See [verified delivery](../ga4-purchase-staging-2026-11-25/VERIFIED-STAGING-DELIVERY.md). Earlier snapshots below are historical, including retained failures.

# Latest status — revision112,26November2026

The owner-published user-data opt-out is independently verified and removes the known synthetic-email hash in the fresh paid case. An automatic page-view still fails the contract. Four false parameters are prepared but unsaved only in the new staging tag; owner publication and full new-target/staging verification remain pending. Candidate stays disabled. See [current initialization review](../ga4-purchase-staging-2026-11-25/INITIALIZATION-REVIEW-2026-11-26.md). Earlier snapshots below retain dated scopes.

# Latest status — 26 November 2026

The owner-created staging stream is verified, but its real-library privacy check fails on an automatic synthetic-email hash and extra page-view. The candidate remains disabled. The precise manual new-tag-only correction is pending; see [current verification](../ga4-purchase-staging-2026-11-25/STREAM-VERIFICATION-2026-11-26.md). The25November snapshot below remains historical evidence.

# GA4 purchase staging follow-up — local checkpoint, 25 November 2026

## Status

The owner explicitly says “ok do it and make sure it works” after the verified M03 comparison and proposed staging scope. This authorises the staging source implementation and intercepted verification. The [historical audit](../booking-analytics-reconciliation-2026-11-25/README.md) remains13matched Ecwid purchases and231positive custom-checkout database-paid records with no exact GA transaction IDs for22October–18November2026.

**Implemented locally; not deployed.** There is no new staging delivery, source push, PR, CI dispatch, Google stream or real conversion. The candidate's staging destination is empty/disabled, and the PHP guard explicitly rejects both existing live main and NYE measurement IDs. This checkpoint does not claim that a new staging destination or actual Google ingestion works.

## Implemented source

- A separate GA4 reporter handles backend-confirmed paid/confirmed orders with a valid public UUID, currency, positive revenue and whitelisted product IDs/quantities/prices. Experience add-ons are rolled into item prices once; order discounts are allocated in exact cents. Zero-total confirmed bookings use a separate free-booking event.
- The existing Google Ads orderComplete helper, payment confirmation requests, commerce, forms, Clarity/Iubenda bridge and legacy consent code stay byte-exact. The new effect skips the local preview and cleans up on unmount.
- Current bridge consent and an explicit current Iubenda purpose4 decision are required. Unknown/denied decisions cause no new tag load. A cookie fallback is tied to the current CMP policy and explicit purpose4; generic consent and old data-layer grants do not suffice. Consent is rechecked after tag loading, with a bounded observer for late consent and cleanup.
- Concurrent calls, reloads and uncertain dispatch attempts have separate target/order guards. Unavailable session storage fails closed. Customer fields, free-text options, booking references, raw payment references and query/referrer secrets are not copied. An explicit user_data null/disabled-enhanced-conversions opt-out prevents the tested automatic synthetic-email hash.
- A dedicated data-layer name preserves the site's existing global dataLayer/gtag queue and consent commands. Per-target configuration is queued before the tag library; no page_view is requested, and advertising-personalization/Google-signals parameters are false for the new target.

## Verification and retained failures

All84frontend tests pass, including15new GA4 cases and the existing Ads cases. Public PHP checks77/77 and361/361missing-product requests pass, as do23existing publisher/cache tests,10booking measurement parser cases,8proxy and105Meta-order contracts. Npm audit reports0vulnerabilities. No full new source CI or staging-runtime acceptance is claimed.

The real Google tag library is executed only in fresh isolated browser contexts with exact synthetic confirmation responses. All collection requests receive a local stubbed204 and are never forwarded; all genuine order/payment/message writes are blocked. The control deliberately uses the separate existing NYE tag as an isolated tag-runtime comparison, with no request sent to its collection service and no NYE setting changed. **It is not the candidate deployment destination.** Nine scenarios pass: paid, reload, denied, late consent, withdrawn during loading, free, unpaid, confirmation error and missing destination. Standard GA collection has exactly one synthetic purchase, correct transaction ID/value/currency/item quantities, safe page context, no extra page-view, no AW/CCM destination initialization and no raw or known-hashed synthetic customer email in the passing control. GA companion requests are recorded separately from the standard GA collection hit.

The existing main tag still initializes an AW-956184209 advertising destination, despite explicit GA routing, per-stream advertising-signal settings and a separate layer. Those main-tag experiments remain failed. An initial text observer also timed out on uppercase-rendered fixture text; the raw failed body and screenshot are retained, and the observer was corrected without relaxing measurement assertions. Aborting collection initially made the vendor retry; subsequent local204 responses distinguish one logical GA collection from vendor fallback/companion transport. The test does not claim real Google receipt, account attribution or consent-eligible performance.

The first real-library control additionally detected the known hash of a synthetic email displayed in the confirmation UI. The implementation's explicit user_data opt-out and disabled enhanced conversions remove it in the passing control. No real customer information or event was sent. All failed and corrected receipts remain private and unchanged.

## Required next decision and access

The [exact staging-stream proposal](../booking-analytics-reconciliation-2026-11-25/STAGING-STREAM-PROPOSAL.md) adds one web stream to property371949862, named “KTK staging — custom checkout”, default URL https://krawlthroughkrakow.com/staging/. It changes no existing stream, Google Ads destination, GTM or site-consent setting. The approved scope reserves such account changes for a separate decision. Current OAuth has analytics.readonly and lacks analytics.edit; no write was attempted with that token. The approval question is pending.

After approval and authorised account access: create once/read back the new stream, inspect its actual tag and intercepted runtime, configure only that verified ID, restore the active-staging positive PHP case, rerun affected checks, back up and publish only the class/compiled-JS pair through the prepared bounded guards, verify protected state and cache/installed-browser behavior, then make one consolidated source push/PR. The publisher refuses a plan without a newly approved verified destination. Production/D08, real order/payment/message/event creation, old worktrees and retained recovery data remain protected. Discarded provider-contract/hosting-account checks are not reopened.

## Source checkpoint

The fresh worktree is based on main8ab47319a542c63e08f7c741e2fe60fa80ce758a. All4021tracked source blobs were archived and independently verified before edits. The historical root application and unrelated worktrees were not built, reset or deployed. Imported root files are current operational documentation only; its modified historical tests were not imported. Source and private staging publication tools remain unpublished while the account decision is pending.
