# Booking Measurement: Source And Published-Container Audit

Status: read-only M03 investigation, started14 November2026. This is not a
website deployment, production change, provider-receipt check or completed
booking/revenue reconciliation. M03 remains partial.

## Checkpoint And Scope

Previous games release is closed: application739ea88, final23e1d3e,
CI43598953077 both pass, PR52 merged as3c4a6227ce320ecba71062a578e53985b3dc431f.
The merge's exact tree3303fdb9fb91286b3a568aa9b244ecc0f6e53301 matches the
reviewed final tree; main CI43599082347 passes. Completed branches were removed;
only the root worktree remains. No new games upload or cache purge is required.

Before audit edits, all3280 tracked blobs were archived and independently
verified against Git object identities, exact file set and ZIP CRC:
`deploy-backups/seo-funnel-audit-before-20261114.zip`, SHA256
`3276a619de13f849b40e94a4a84677f29c4474bfd088d5cee45a18ffe54af69b`.
This preserves tracked code, not the hosting filesystem or database.

New tools inspect local source and optionally GET the public GTM definition.
The downloaded script is parsed with the existing locked Babel parser and its
literal JSON resource, never evaluated or installed. Unexpected executable,
ambiguous or invalid-reference shapes fail closed. Synthetic tests import the
real conversion helper into isolated module instances with fake storage and
network disabled. No real customer/order/recording data, provider events,
emails, booking writes, account settings or consent controls are touched.

## Findings

### 1. Google Ads Has An Explicit Confirmed-Order Mapping

The public `GTM-PHXGRZ` definition currently reports version41. Its three
configured tags are Google tag39 (`AW-956184209`), linker40 and conversion42.
Conversion42 has the direct `orderComplete` event predicate, reads `orderId`
and `orderTotalValue` from the data layer and explicitly sets currency to PLN.
Therefore the absence of a `currency` field on the site's custom event is
**not evidence that this Google Ads mapping lacks currency**.

The frontend calls its conversion helper only inside the confirmed-result
branch after its backend confirmation response. The branch accepts
`paymentStatus === 'paid'` or a numeric zero total. Product views, booking clicks,
checkout initialization, payment attempts and errors do not call that helper.
This source audit is not proof of every backend transition or actual Google
receipt. Valid free bookings must be separated from positive paid revenue in
reconciliation; zero total is not proof of a failed payment being counted.

The helper supplies the public order identity and numeric value. In-memory and
session-storage guards prevent repeat queueing in one module and after reload
when session storage remains available. A blocked-storage reload or another
device is outside that browser guard. The configured provider transaction ID
is a separate deduplication layer, not proof that a particular conversion was
received or deduplicated by Google.

### 2. Journey History Is Not The Same As Analytics Ingestion

| Step | Current source behavior | Coverage limit |
| --- | --- | --- |
| Homepage landing | `homepage_viewed` enters the bounded journey queue after analytics consent | Not a separate request or GA4 page-view proof; only later qualified-cart history is persisted |
| Homepage control | `homepage_button_clicked` records a named control/placement and query-free destination; booking controls also push `ktk_homepage_booking_click` | Local queue and data layer are distinct; a push alone is not provider receipt |
| Content-page booking control | `ktk_page_booking_click` pushes page/product/placement after analytics consent | Current runtime maps only products28/30/32/51; it does not load the homepage journey collector or attach article clicks to cart history |
| Product and booking builder | `product_viewed` and `booking_builder_reached` are operational journey events | Do not label operational history as a GA4 ecommerce event or complete all-visitor census |
| Cart changes | Add/update/remove/edit, discount and cart events go through the existing journey queue | Different event purpose and retention from web analytics |
| Checkout and payment | Checkout-open, form-ready/completed, payment-attempt/error/cancel/resume events describe progress | Neither a click nor a payment attempt is a purchase |
| Confirmed order | Backend confirmation result can queue `orderComplete` with order ID/value | Google receipt, attribution windows, refunds and completed-revenue totals still need independent reconciliation |

The main React source has19 literal operational event types. The queue retains
at most200 events for24 hours and uses a30-minute idle visit boundary. A cart
must qualify before activity flushes to its existing endpoint; unsuccessful
landing-only visitors are not a complete persisted cart-history denominator.
Consent/environment filtering of homepage and Clarity-reference events remains
in place. No consent correctness claim is made for the wider tracking stack.

### 3. A Complete GA4 Funnel Is Not Established By This Evidence

The downloaded resource has no explicit GA4 configuration/event tag or direct
trigger mapping for the two named website-booking-click events. Its unused
Universal Analytics macro is not an active reporting tag. Do not interpret
that as proof that no Analytics destination exists anywhere: linked Google-tag
destinations, account settings and provider receipt are not public here.

Google Ads conversion tracking, Clarity replay, operational cart history and
GA4 ecommerce reports are different systems. The current findings support the
Ads mapping and source-side events, not a claim that a full GA4 landing-to-paid
funnel is already installed or that its numbers reconcile.

### 4. Attribution Works As A Handoff, Not An Organic/Direct Census

The existing nine campaign/click keys are captured and handed to same-origin
store links and checkout. Existing isolated143-check attribution verification
passes for the latest staging release. Stored campaign values can survive a
later visit until the code's purchase cleanup; blank incoming parameters do not
establish direct traffic. Do not compare Search Console clicks, Ads-attributed
conversions, Clarity sessions and qualified carts as if their populations,
consent choices, time zones and attribution windows were identical.

## Next Work And Boundaries

1. Document the agreed event dictionary and denominators before adding trackers.
   Keep visits, named clicks, qualified carts, confirmed free bookings and paid
   revenue distinct. Retain order identity as the reconciliation key.
2. Use approved aggregate paid-order/revenue totals for matching periods,
   currency and reporting time zone. Account for refunds, cancellations,
   provider delays, consent/ad blockers and source-attribution windows. No
   private customer rows or live test purchases are needed for the first pass.
3. Decide whether article-to-store named controls should also enter cart
   history. This is not covered by the homepage-only collector. Backend/UI
   expansion requires separate OmniLodge approval; this audit does not grant it.
4. Treat any GA4 implementation/account change and new conversion dispatch as a
   separately reviewed scope. Do not add a duplicate `purchase`/Ads event merely
   because the current custom event has a different name.
5. Preserve the explicitly deferred consent work. The saved-Reject cookie race
   in the shared-integration evidence is unresolved; no fake Reject, forced
   grant, provider replacement or renewed GTM-access request is part of M03.

## Reproduction

```powershell
node --test tools/tests/test_booking_measurement.mjs
node tools/audit-booking-measurement.mjs docs/seo/booking-measurement-2026-11-14/offline-source-audit.json
node tools/audit-booking-measurement.mjs --public-container docs/seo/booking-measurement-2026-11-14/public-source-audit-final.json
```

Public reports bind all10 local input hashes, publication version, downloaded
body hash and parsed-resource hash. The report counts actual GET attempts,
including bounded read retries. Remote runtime bytes may differ between GETs;
compare the parsed resource separately instead of assuming the entire vendor
bundle is immutable. No vendor JavaScript is executed. JSON evidence remains
local under the existing ignore policy; no customer data or credentials are
committed.

## Primary Guidance

Checked14 November2026. These explain the measurement contracts, not the site's
private account configuration or legal compliance:

- [GA4 ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce):
  ecommerce event/value/currency/item contracts are distinct from an arbitrary
  custom data-layer event.
- [Google Ads transaction IDs](https://support.google.com/google-ads/answer/6386790?hl=en):
  unique order identity supports duplicate-conversion handling.
- [Google consent implementation](https://developers.google.com/tag-platform/security/guides/consent):
  tag loading and consent state are separate concerns; no deferred fix is
  implemented by this audit.

## Verification

Ten focused offline contracts pass, including unguarded-call reporting and
blocked-storage behavior. The offline audit reads10 sources with0 GETs; two
final public audits each use1 GET, preserve all source hashes and agree on
parsed container version41 and resource identity. Initial reports are retained
separately. The public bundle is not executed and no provider event is sent.
CI runs the offline contracts only, never the optional public GET.

All staging application files are byte-identical to the previous release;
there is no new application build, publisher or cache purge. Both roadmap views
keep39 verified staging deliveries and show M03 as partial investigation, not
an extra verified release or an installed analytics funnel. Required CI and
exact-tree merge remain the final repository checks for this audit batch.

The initial Python run214 had one fixture error: it simulated M03 becoming
complete but left M03 in the newly updated active-focus list. The generator
correctly rejected that invalid state. The fixture now first asserts that
rejection, then removes the completed item from focus before checking dynamic
counts. The application/data validator and all other assertions are unchanged.
An attempted combined documentation patch did not match its context and was
rejected before editing; the exact separate updates were then applied.

Final local verification: focused10/shared JavaScript236/Python214/roadmap317
pass. The source-preservation guard2391 also passes, and Git confirms zero
application-file changes against the completed games merge. Final public
version41 parsed resource SHA256 is
`ee669c54406dac0a14e1a3498a0cca11f7864894552e9234d8c6fa8d440839eb`.
The final parser also rejects duplicate resource properties and distinguishes
the paid condition's positive branch from an else branch; these are audit
guards, not changes to booking or tracking behavior. Current phone roadmap
screenshot was inspected; no overflow or invented verified-release increment.
