# Current verified delivery — revision113,26November2026

The owner-published new-tag corrections and all nine installed scenarios now pass. Delivery86 is staging-verified, with2399protected files/selected WordPress state exact and37normal HTTP checks passing. The new destination is enabled only on staging. One consolidated source push/PR and candidate/main CI remain; real Google receipt and production are not claimed. See [verified delivery](../ga4-purchase-staging-2026-11-25/VERIFIED-STAGING-DELIVERY.md). Earlier snapshots below are historical, including retained failures.

# Staging tag initialization review — 26 November 2026

## Verified owner publication

The owner reported completion of the requested new-tag-only user-provided-data correction. Native signed-in readback independently shows **GTM-T3XXMDQL version2 is Live**, named “Disable user-provided data capabilities setting”, published26November at11:49 as displayed. Its change table has exactly one modified Setting: **Allow user-provided data capabilities**. The version comparison shows the master enabled in version1 and disabled in version2. The sole Analytics tag remains `G-83YXQK49KB`; the existing main/NYE/Ads containers were not edited by the agent.

## Fresh actual-tag result

The unchanged local candidate was freshly tested against the actual published staging tag library. The known synthetic-email hash and raw synthetic customer values are absent from the intercepted collection parameters. The initial user-data privacy failure is therefore resolved at this one paid-scenario scope.

The test still fails its strict no-automatic-page-view contract: one standard purchase and one automatic `page_view` are generated, with GA companion transports recorded separately. All collection is locally stubbed204;0real collection events, orders, payments or messages are forwarded. The other eight scenarios are not accepted or claimed. Both earlier failed reports remain retained.

The new container's default Analytics tag fires on **Initialization - All Pages**, with no configured UI parameters, and ignores duplicate on-page configuration. Google's current documentation explains that standard initialization can fire before applying in-page `gtag('config')` settings, including `send_page_view`. The earlier separate-tag control does not establish compatibility for this new generated container.

The next full browser verification also retains synthetic query and referring-URL secrets in its fixture so an unwanted automatic page-view cannot pass merely because the test starts from a clean URL. All interception and no-send limits remain. This strengthened private verifier has not yet run against the prepared configuration.

## Exact prepared correction: not saved or published

In the new container's workspace3, tag1 **Google Analytics G-83YXQK49KB**, the editor now contains four unsaved configuration parameters:

| Parameter | Value |
| --- | --- |
| `send_page_view` | `false` |
| `allow_google_signals` | `false` |
| `allow_ad_personalization_signals` | `false` |
| `allow_enhanced_conversions` | `false` |

These mirror the reporter's existing intended target settings at the new tag's actual initialization point. No measurement ID, trigger, consent mode, account access, existing main/NYE/Ads tag, property-wide setting or user-data master was changed. Save was not clicked; the new draft is not live. The owner is asked to Save then Submit/Publish only this one modified tag. The computer-use skill's in-app privacy-setting restriction applies to the signal settings and final publication; the manual step is required under that interpretation.

After publication, independently inspect the exact version/parameters and rerun all nine actual-library scenarios with all collection intercepted. Configure the PHP constant only after those pass, then run affected local checks, make fresh protected-state/original backups, publish only the two staging runtime files, verify installed and normal-cache behavior, update delivery counts and make one consolidated source push/PR.

## Delivery boundary

Application source, compiled JS and the empty PHP destination remain unchanged from revision110. No staging upload/helper/cache purge, new source push/PR/CI, real order/payment/message/event or production/D08 change occurred in this review. Counts stay85verified staging website deliveries/89records, eight original finite batches and40original workstream statuses/criteria. Retained recovery data is untouched; owner-discarded hosting/provider checks remain omitted and closed.

References: [Google initialization compatibility and ignored in-page parameters](https://support.google.com/analytics/answer/18411054?hl=en), [Google configuration parameters](https://support.google.com/analytics/answer/13438166?hl=en), [page-view control](https://developers.google.com/analytics/devguides/collection/ga4/views?technology=websites).
