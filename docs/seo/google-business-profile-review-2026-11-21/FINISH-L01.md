## Current L01 status: complete within owner-approved scope

The owner instructs retaining location and hours exactly as configured and excluding them from active L01 work. The verified audit, description, services and booking destination satisfy the remaining agreed work. H04 is closed; policy caveats remain recorded without claiming Google certification. No further Google field change or support contact is authorized. See [the closure record](L01-CLOSURE.md). Earlier dated blockers below are historical and must not be reopened automatically.

## Owner clarification: established meeting point

The owner confirms the Adam Mickiewicz Monument meeting point has remained fixed for 18 years. It is KTK's long-established tour meeting location and is retained. The unresolved assessment concerns Google's business-location/hours representation; the meeting point's identity or permanence is not in doubt. See [the owner clarification](MEETING-POINT-OWNER-CLARIFICATION.md). No Google field was changed, no contact was made, and no completion criterion or roadmap status changed. Earlier dated records follow.

## Current completion position - revision 61

The owner approved the keep-Free-Walking-Tours service-only cleanup and explicitly declined contacting Google. One serviceItems update returned HTTP 200: the three obsolete 110 PLN price fields are removed, the three descriptions use the approved factual wording, all 11 service entries remain, and Free Walking Tours is retained exactly. Merchant and Google consumer-facing services now match the approved array, with no service review pending. Other profile fields, the accepted main description and booking attribution remain unchanged; photos were not written. No support case or message was sent. L01 remains in progress because accurate Google location/service-area and primary-hours representation for the confirmed no-customer-premises operation is unresolved. D08 stays deferred; all eight finite batches, 78 website deliveries, 82 records and 40 original criteria/statuses remain.

### Remaining original-criterion gap

The remaining gap is an accurate supported Google location/service-area and primary-hours representation, including the existing parent-place association, for a business with no customer-facing premises. The square is a meeting point, enquiries are available 24 hours and the regular crawl starts at 21:00. Those facts are established and must not be asked again. The owner declined contacting Google; no support request will be sent. Retain the unresolved dependency honestly, and do not certify the existing location/hours, invent a staffed address or closing time, or convert the service-area model automatically.

The service publication gate is fulfilled; no further service update is needed. The description and current booking link remain verified. Future photo/seasonal maintenance is a recurring responsibility. L01 cannot be marked complete solely by accepting the remaining representation uncertainty. No new push/PR is made while this workstream remains incomplete.

### Earlier prepared checklist and evidence

## Current completion position - revision 60

The owner approved the keep-Free-Walking-Tours service-only cleanup and explicitly declined contacting Google. One serviceItems update returned HTTP 200: the three obsolete 110 PLN price fields are removed, the three descriptions use the approved factual wording, all 11 service entries remain, and Free Walking Tours is retained exactly. The merchant record matches; Google consumer-facing acceptance is not yet confirmed. Current pending mask: metadata,serviceItems. No publication retry is authorized or needed. Other profile fields, the accepted main description and booking attribution remain unchanged; photos were not written. No support case or message was sent. L01 remains in progress because accurate Google location/service-area and primary-hours representation for the confirmed no-customer-premises operation is unresolved. D08 stays deferred; all eight finite batches, 78 website deliveries, 82 records and 40 original criteria/statuses remain.

### Remaining original-criterion gap

The remaining gap is an accurate supported Google location/service-area and primary-hours representation, including the existing parent-place association, for a business with no customer-facing premises. The square is a meeting point, enquiries are available 24 hours and the regular crawl starts at 21:00. Those facts are established and must not be asked again. The owner declined contacting Google; no support request will be sent. Retain the unresolved dependency honestly, and do not certify the existing location/hours, invent a staffed address or closing time, or convert the service-area model automatically.

Consumer-facing review of the accepted service update remains pending; use read-only checks and never replay the approved write. The description and current booking link remain verified. Future photo/seasonal maintenance is a recurring responsibility. L01 cannot be marked complete solely by accepting the remaining representation uncertainty. No new push/PR is made while this workstream remains incomplete.

### Earlier prepared checklist and evidence

# L01 completion checklist - 21 November 2026

L01's original completion criterion is **an accurate profile and a working current booking destination, with no keyword-stuffed business name or fake address**. The booking part and the approved description are verified. L01 cannot yet be marked complete while the services publish an obsolete price and the location/hours model remains unresolved.

## Verified work and exact remaining actions

| Area | Verified evidence | Remaining action |
| --- | --- | --- |
| Access and identity | Existing live Google grant works; pinned KTK location/place and merchant authority match. | No additional scope, API enablement or website deployment is needed. |
| Description | One approved description update; merchant and consumer-facing text match, no description pending. Fresh read reconfirms it. | Delivered; do not replay. |
| Contact and booking | Phone/website match; exact Google/Booking/Search booking link is unchanged. Fresh anonymous GET returns 200 and preserves attribution. | Retain exact link. This does not certify checkout or payment. |
| Categories and name | Tour operator matches the core guided crawl. Five extra categories and the existing name were reviewed; no keyword additions or unproved renaming are proposed. | Retain while confirming the supported business model; do not add categories as SEO keywords. |
| Actual selected services | Fresh read includes all 11 `serviceItems`, distinct from the category's available `serviceTypes`. Three fixed prices are 110 PLN; the current booking page publishes 120 PLN. Free Walking Tours is also listed. | Approve the precise cleanup below and confirm whether Free Walking Tours is genuinely offered. |
| Premises, model and hours | Owner confirms no customer-facing premises anywhere. Square is meeting point only; enquiries 24 hours; crawl starts 21:00. Profile still shows a customer/business location and all-day primary hours. | Obtain Google's supported treatment for this adults-only no-premises tour, then approve/apply and verify the accurate fields. No invented premises or closing time. |
| Google parent-place relationship | Google consumer data includes the recorded parent-place association; merchant data has none. | Include in the same support clarification; no automatic acceptance or rejection. |
| Photos | All 449 metadata records inventoried; four representative thumbnails inspected. | Recorded sample scope, with no proof of all images' rights/current operations. Future accuracy, permissions and maintenance remain ongoing owner duties. No photo change is proposed. |

## Concrete service-only correction for approval

Apply `updateMask=serviceItems` to the existing 11-item array. For **Pub Crawl**, **Bar Crawl** and **Krakow Nightlife Tour** only:

- Remove the obsolete fixed 110 PLN price fields. Do not substitute another fixed amount; the current tickets/availability remain on the booking website.
- Replace the old three descriptions with this factual 180-character wording:

> Guided pub crawl starting at 21:00, with one hour of open bar followed by visits to bars and clubs. Guests must be 18 or over. See our website for current tickets and availability.

Retain the other structured/free-form entries byte-for-byte. If the owner confirms Free Walking Tours is not offered, remove only that additional item, producing 10 items. If it is offered, retain it and all 11 items. No name, category, phone, address, service-area, hours, description-profile, booking-link or media field is included in this patch.

Both exact variants passed Google's `validateOnly=true` check with HTTP 200. Before/after selected profile data are identical; **zero actual service updates occurred**. Validation proves request validity, not publication or operational accuracy. Fresh identity/current-array and authority checks, explicit variant approval, a one-attempt journal and merchant/consumer-facing verification are required for publication.

Other retained service names for owner review: Private tours, City tours, Group tours, Airport Transfers, Group Tours, Walking Tours and Party Tour. This proposal does not certify services beyond the owner's actual operations.

## Location and hours decision

The owner has now answered the premises question: **there are no customer-facing premises**. It must not be asked again. Google's published policy restricts age-restricted service-area businesses without a storefront and distinguishes customer-facing hours from enquiry availability. A generic instruction to hide the address is not enough to establish a supported setup for this tour.

The [precise Google support request](GOOGLE-SUPPORT-DRAFT.md) is ready and unsent. It asks for eligibility/model, address/meeting-point, primary-hours/enquiry treatment and the Google parent-place association. Submission requires permission to contact Google through the signed-in support flow. Existing API access is sufficient for the verified reads and validations; it does not provide a support-case endpoint or determine Google's policy decision.

## Finish and verification gates

1. Resolve and publish the approved service cleanup; confirm the actual offers, including Free Walking Tours.
2. Establish the supported accurate Google location/hours representation from real operating facts and Google's response; apply only the precise approved correction.
3. Verify the final merchant and consumer-facing values, pending/rejected fields, current booking destination and preserved attribution. Keep recurring photo/seasonal maintenance distinct from this finite correction.
4. Reassess the unchanged original L01 criterion, update both roadmaps with verified evidence, and prepare the single finished source push/PR requested by the owner. Do not mark complete solely because the audit or validation ran.

## Evidence and unchanged boundaries

Native refresh: `2026-11-21T05:00:51.118Z`; product read: `2026-11-21T05:02:17.982909+00:00`; service validation: `2026-11-21T05:02:40.029Z`. Credential-free private receipts remain under the task's existing private evidence directory. Exact current/proposed service-array and body hashes are recorded there. The earlier description receipt remains accepted.

No actual service, address, hours, category, photo, support, OAuth, API configuration, WordPress/Omni deployment, commerce, form, payment, consent or GTM change was made during this follow-up. The initial local reader's duplicate-variable syntax error occurred before execution and made no requests; its source is retained and the corrected reader passed. The official support flow requires sign-in; no alternate identity or native account-UI workaround was attempted.

L01 remains in progress; D08 remains deferred. All original 40 criteria/statuses, eight completed finite batches, 78 website deliveries and 82 records are preserved. This review adds no staging delivery or new batch and has not been pushed or opened as a PR.
