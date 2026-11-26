# Current verified delivery — revision113,26November2026

The owner-published new-tag corrections and all nine installed scenarios now pass. Delivery86 is staging-verified, with2399protected files/selected WordPress state exact and37normal HTTP checks passing. The new destination is enabled only on staging. One consolidated source push/PR and candidate/main CI remain; real Google receipt and production are not claimed. See [verified delivery](../ga4-purchase-staging-2026-11-25/VERIFIED-STAGING-DELIVERY.md). Earlier snapshots below are historical, including retained failures.

# Latest status — revision112,26November2026

The owner-published user-data opt-out is independently verified and removes the known synthetic-email hash in the fresh paid case. An automatic page-view still fails the contract. Four false parameters are prepared but unsaved only in the new staging tag; owner publication and full new-target/staging verification remain pending. Candidate stays disabled. See [current initialization review](../ga4-purchase-staging-2026-11-25/INITIALIZATION-REVIEW-2026-11-26.md). Earlier snapshots below retain dated scopes.

# Separate staging stream verification — 26 November 2026

## Verified account addition

The owner completed the prepared stream creation and reported “done”. Native Analytics UI and independent read-only Admin API calls agree on:

- Property: `371949862`; web stream: `16421008771`.
- Name: **KTK staging — custom checkout**.
- Default URI: `https://krawlthroughkrakow.com/staging/`.
- Measurement ID: `G-83YXQK49KB`.
- Created/updated: `2026-11-26T10:42:05.279Z`.
- Enhanced measurement master switch is off in the UI; the API omits its false `streamEnabled` scalar. Individual sub-options remain stored but the master is disabled.

The property lists the existing main stream and this one new stream, with no duplicate staging name. The main stream metadata retains its2023creation/update timestamps. This is not a complete audit of all main-tag settings. Current API access remains read-only; no API write or OAuth-scope change was attempted.

The new Google-managed tag UI identifies a separate **GTM-T3XXMDQL** container, account `6408246919`, container `288925955`, workspace `2`, and only one destination: this staging measurement ID. The new workspace shows0changes before intervention. The agent did not choose Google's offered reuse of the existing Ads-linked main tag or publish any container change.

## Actual new-destination runtime: failed

The unchanged local reporter was tested with this exact new ID using an isolated response override and the real public Google tag library. A synthetic paid confirmation was intercepted before any order endpoint could receive it. All collection endpoints were locally answered204;0collection events, orders, payments or messages were forwarded.

The first paid scenario produced one standard GA purchase, one extra standard GA `page_view`, one GA measurement companion request and one GA transport companion request. The extra page-view contains the known hash of the synthetic email displayed in the confirmation UI. The strict no-customer-hash assertion failed. No explicit AW/CCM initialization was observed in this one new-tag case; this does not convert the failed privacy result into a pass. The other eight new-destination scenarios were not run after the failure. The earlier nine-case NYE-library control remains dated, isolated evidence only.

Native read-only inspection confirms the new tag's **Allow user-provided data capabilities** master is on and automatic detection of email, phone, name/address is selected. The panel's affected-tags list contains only `G-83YXQK49KB`. Google documents that this feature can inspect and hash page data separately from enhanced measurement. Disabling enhanced measurement alone did not satisfy this runtime contract.

The first API observer also initially required a literal false field and failed on the omitted scalar. The original response and failed observations are retained. A corrected observer follows ProtoJSON default-value semantics and agrees with the independently observed off switch; no account data was normalised or changed.

## Exact next action and protected scope

The owner is asked to turn **Allow user-provided data capabilities OFF**, Save, and Submit/Publish **only this one change in the new staging container GTM-T3XXMDQL**. This is a requested manual action, not an already verified or published correction. The new panel remains open. The computer-use skill forbids changing in-app privacy settings; the collection toggle is treated as covered. Existing main/NYE/Ads tags, existing containers, property-wide collection settings and functional consent remain protected.

After owner completion, read back the exact new-container setting and freshly inspect the real new tag. All nine scenarios must pass with collection intercepted before configuring the PHP constant, running affected local checks, preparing fresh originals/protected-state witnesses, publishing the two staging runtime files and verifying normal-cache/installed behavior. Only then update delivery counts and make one consolidated source push/PR.

## No website delivery

The candidate's PHP destination remains empty/disabled; application source and compiled bytes are unchanged from revision110. No hosting helper, upload, cache purge, source push, PR or CI dispatch occurred in this account-verification step. All85verified staging website deliveries/89records, eight original finite batches and40original statuses/criteria remain exact. Website production/D08, commerce/forms, existing consent and retained B03 recovery data remain protected. Owner-discarded hosting/provider checks stay omitted and closed.

References: [Admin API read of enhanced measurement](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.dataStreams/getEnhancedMeasurementSettings), [ProtoJSON omitted default values](https://protobuf.dev/programming-guides/json/#presence-and-default-values), [Google tag user-provided-data configuration](https://support.google.com/analytics/answer/12131703?hl=en).
