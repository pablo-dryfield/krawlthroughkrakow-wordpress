# Prepared staging Analytics receipt check — owner decision pending

The installed staging reporter and PR145 source closure are verified. This proposes **one real, non-purchase Analytics test** to check the Google collection-to-reporting path. No collection has been forwarded during preparation. This is not permission to send a purchase, make a booking/payment, change an account setting or promote the website to production.

## Exact proposed event

| Field | Proposed value |
| --- | --- |
| Analytics property | `371949862` — the existing property also contains production streams |
| Dedicated staging stream | `16421008771`, KTK staging — custom checkout |
| Measurement destination | `G-83YXQK49KB` only |
| Event name | `ktk_staging_receipt_261126_a7c29d` |
| `ktk_environment` | `staging` |
| `ktk_receipt_id` | `261126_a7c29d` |
| Page location | `https://krawlthroughkrakow.com/staging/store2/checkout/success/` |
| Page title | `KTK staging analytics receipt check` |
| Page referrer | Empty |
| User-data field | Null/empty; no customer fields |
| Purchase, transaction ID, currency, revenue, item data | Omitted; refused by the outgoing-request guard |
| Explicit event/transmission budget | One explicit event, at most one collector transmission |
| Retry policy | No retry after timeout, uncertain result, process exit or a previous reservation |

This creates **real test traffic in the shared Analytics property**, although its stream is dedicated to staging. The tag's usual browser/client/session metadata and network IP also reach Google. A fresh isolated browser uses new client/session identifiers, not the owner's personal Chrome profile. Google's automatic first-visit/session metadata may also affect ordinary event/user/session counts. No test sale or revenue is intentionally reported. The event is not configured as a key event in the read-only preflight.

## How the controlled test works

The isolated browser reads the installed staging HTML/JavaScript and the actual new Google library. Backend confirmation is supplied by a local synthetic response; the browser never creates or pays for a real order. Its synthetic confirmed-order purchase command is retained **locally**, then a browser-memory test adapter replaces that command with the exact non-purchase event above before the Google library processes it. Transaction ID, currency, revenue, items and the original debug parameter are removed. No hosted file is changed.

The real send would allow only the exact approved event, staging destination, clean page/referrer and reviewed non-commerce parameters through the standard Google collector. Other Google destinations, companion DoubleClick transport, purchase/conversion requests and all other backend writes remain blocked. The actual new-tag definition must still be version3 with all four reviewed settings false and user-provided-data disabled. A changed definition refuses the test.

The original purchase command and the adapter replacement are separate evidence. **Receipt of the custom test event would verify this controlled non-purchase transport/reporting path. It would not prove receipt of an unchanged purchase, real paid revenue, native consent behaviour, a complete booking funnel or production tracking.** A genuine paid-state check retains its separate scope and authorisation requirement.

## Preparation already verified

- Read-only Google API checks verify the property/stream identity, enhanced measurement off, the absence of this event from configured key events and zero existing realtime rows for its unique name and stream. No account setting changed. The staging stream has no returned event-create rules. Data-filter/event-edit inspection is not claimed where the official client lacks that resource.
- Eight private send-guard tests pass: exact destination/event, refusal of purchases/revenue/items/key-event flags, hostile endpoints and unsafe fields, missing approval, durable reservation before network I/O, and refusal to retry after uncertainty or restart.
- The final intercepted rehearsal loads the installed storefront asset with its accepted SHA-256 and the actual version3 library. It observes one locally replaced command and one permitted collector packet, blocks the companion transport, and verifies that reload emits no duplicate. Both synthetic confirmation calls are fulfilled locally. **Zero collection attempts, real orders, payments or messages occur.**
- The first rehearsal's adapter used an Array where the actual library expects a gtag Arguments object. It emitted no collector request, failed, and is retained. The corrected rehearsal and final attempt/response bookkeeping pass; no website application fix or upload was needed.
- Live execution requires an owner decision bound to this exact proposal and the tested private-source manifest. It must refuse before network setup when that decision is absent. The send budget is reserved in an exclusive durable file before transmission; that file is retained after success or uncertainty.

## Acceptance and limits

After approval, refresh the read-only baseline, attempt the event once and read Google's realtime API filtered by **both exact event name and stream ID**. A collector HTTP success alone is not ingestion proof. Accept receipt only when Google reports the exact event/stream and a total event count of one. Empty, filtered, delayed or unavailable reports remain unverified; do not resend to make a report appear. Unexpected counts are recorded rather than normalised.

The existing API supports these realtime dimensions and event count. See [Google's realtime schema](https://developers.google.com/analytics/devguides/reporting/data/v1/realtime-api-schema). Debug-only purchase testing is a different scope: [Google's ecommerce validation guide](https://developers.google.com/analytics/devguides/collection/ga4/validate-ecommerce) describes DebugView, while [developer-traffic filtering](https://support.google.com/analytics/answer/13296662?hl=en) requires an applicable property filter to keep debug traffic out of normal reporting. No such filter change is proposed here.

Production website/D08, existing main/NYE/Ads tags, functional consent, commerce/forms, email, retained recovery data and owner-discarded hosting/provider checks keep their existing boundaries. This is a prepared check, not a new website delivery or a completed M03 workstream. PR145 remains merged and its accepted source frozen; no new source push, PR, CI run, deployment or purge is needed for preparation.
