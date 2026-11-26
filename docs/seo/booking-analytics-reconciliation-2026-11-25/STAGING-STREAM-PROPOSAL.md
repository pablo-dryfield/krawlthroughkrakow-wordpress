# Current verified delivery — revision113,26November2026

The owner-published new-tag corrections and all nine installed scenarios now pass. Delivery86 is staging-verified, with2399protected files/selected WordPress state exact and37normal HTTP checks passing. The new destination is enabled only on staging. One consolidated source push/PR and candidate/main CI remain; real Google receipt and production are not claimed. See [verified delivery](../ga4-purchase-staging-2026-11-25/VERIFIED-STAGING-DELIVERY.md). Earlier snapshots below are historical, including retained failures.

# Latest status — revision112,26November2026

The owner-published user-data opt-out is independently verified and removes the known synthetic-email hash in the fresh paid case. An automatic page-view still fails the contract. Four false parameters are prepared but unsaved only in the new staging tag; owner publication and full new-target/staging verification remain pending. Candidate stays disabled. See [current initialization review](../ga4-purchase-staging-2026-11-25/INITIALIZATION-REVIEW-2026-11-26.md). Earlier snapshots below retain dated scopes.

# Latest status — 26 November 2026

The owner-created staging stream is verified, but its real-library privacy check fails on an automatic synthetic-email hash and extra page-view. The candidate remains disabled. The precise manual new-tag-only correction is pending; see [current verification](../ga4-purchase-staging-2026-11-25/STREAM-VERIFICATION-2026-11-26.md). The25November snapshot below remains historical evidence.

# Exact staging account addition for review

Prepared25 November2026. No Google account setting has changed, no new stream exists from this work, no analytics collection was forwarded and no website deployment/push/PR has occurred.

The candidate reuses the existing consent bridge, queues only whitelisted confirmed-order data, separates free bookings, and leaves existing Google Ads orderComplete source unchanged. Fifteen new frontend cases plus the existing frontend suite and seven PHP identity/config cases pass locally. Real-library browser tests intercept all collection traffic. They show that the main site's existing Google tag also initializes an AW-956184209 advertising destination. Stream-scoped advertising-signal flags, explicit send_to and a separate data-layer name do not suppress that AW page-view initialization. Existing settings/container/consent controls are protected; the candidate has not been deployed against that shared tag.

## Requested account change

Add exactly one **WEB_DATA_STREAM** to existing GA4 property **371949862**:

```json
{
  "type": "WEB_DATA_STREAM",
  "displayName": "KTK staging — custom checkout",
  "webStreamData": {
    "defaultUri": "https://krawlthroughkrakow.com/staging/"
  }
}
```

The endpoint is `POST https://analyticsadmin.googleapis.com/v1beta/properties/371949862/dataStreams`. Read back the new stream and its measurement ID, then inspect its actual public tag and intercepted browser traffic. Do not combine it with the existing main/NYE/Ads tags, add an Ads destination, edit an existing stream or change GTM/consent settings. If its actual runtime still initializes an advertising destination, stop before staging publication and record that result.

Use the new measurement ID only in the staging-gated configuration; production paths remain disabled. All synthetic collection endpoints remain intercepted. This addition does not authorise a real purchase/event, account export, order or email, production release, OAuth-scope change, historical backfill or any discarded hosting/provider check.

The current live OAuth grant has analytics.readonly and lacks analytics.edit, independently checked25 November. Creation therefore needs an authorised signed-in Analytics session or a separately authorised connection change. Do not repeatedly attempt an API write with the read-only token. The precise access route is separate from approval of this resource.

The prior [staging proposal](NEXT-STAGING-SCOPE.md), point4, says: “If a functional consent/provider or account/container change is needed, present its exact scope as a separate decision.” This is that account decision. It adds a staging destination and preserves all existing ones.

References: [Google data-stream creation and required scope](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams/create), [explicit routing](https://developers.google.com/tag-platform/gtagjs/routing), [custom data layers](https://developers.google.com/tag-platform/devguides/datalayer).
