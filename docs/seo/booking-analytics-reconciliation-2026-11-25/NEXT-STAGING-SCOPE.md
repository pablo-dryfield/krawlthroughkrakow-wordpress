# Proposed next staging scope — not implemented

The read-only audit is complete at its recorded historical scope. The next useful implementation is a distinct GA4 purchase path for the custom checkout. This file is a reviewable proposal; no application, destination, Google account, GTM/container or consent setting has changed.

1. Preserve existing order/payment confirmation and Google Ads orderComplete behavior. Define a separate GA4 purchase contract using the confirmed public order UUID, actual order currency/value and confirmed item data. Separate valid zero-total bookings from positive paid-revenue reporting.
2. Respect the existing analytics-consent boundary and duplicate-event guard. Inspect how the current analytics destination is supplied before selecting an integration. Do not infer a GA4 destination from the Ads ID, or add/change provider consent rules under the excluded D08 scope.
3. Verify isolated synthetic scenarios locally and on staging with external conversion requests intercepted: paid, unpaid/error, zero total, reload/duplicate, missing destination and denied analytics consent. Send no real purchase, replay or historical backfill to the live property.
4. If a functional consent/provider or account/container change is needed, present its exact scope as a separate decision. Website production remains excluded. Any authorised source implementation follows staging verification and the owner's one consolidated push/PR preference.

The historical data alone cannot diagnose every missing conversion or establish a consent-eligible denominator. This proposal addresses the observed custom-checkout measurement path without changing orders or relabelling the verified Ecwid cohort.

Reference: [Google's ecommerce event contract](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce), including event-level currency with value and confirmed item data.
