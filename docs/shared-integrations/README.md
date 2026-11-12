# Shared Website Integrations

Current status: **owner-authorized consent follow-up reverted and ownership/attribution verified; exact legacy entries can be removed**. Local/staging match production's original `.1` shared integration files exactly. The owner explicitly requested reverting the extra consent changes, not the shared replacements for Divi/WPCode. Production application files/settings remain unchanged. Normal-URL ownership/attribution checks pass 745/745 on each environment after the owner's staging-prefix purge. Keep Iubenda and its Accept/Reject controls functional. No fake control or forced-granted code was implemented; the separate saved-rejection cookie issue remains unresolved.

The Chrome DevTools MCP connection test was explicitly authorized and succeeded, but used a separate signed-out browser profile. The new GTM tab reached Google sign-in only. No authenticated GTM container was inspected, edited or published, and no persistent browser/MCP configuration was changed. The subsequent manual instructions were not implemented by this agent. No application rollback or additional deployment was performed when this step was skipped.

Revision `2026.11.06.3` adds an early denied-only Google Consent Mode v2 safety default, before all vendor scripts. This does not gate GTM/UTM capture or grant storage; Iubenda continues to own subsequent consent updates. It fixes WP Rocket's external-minification exclusion hook and covers the widget's locally rewritten cache URL as well as its original URL. Only the shared integration PHP changes; homepage/content/storefront payloads and saved WordPress settings remain unchanged. Staging deployment verified three owned files and 2,158 protected files. Production is still initial `.1`; normal cached URL verification is not complete.

The preceding `.3` description is historical: the owner has now authorized restoring `.1` on staging. No `.3` consent hooks/optimizer additions remain in the restored deployable source; the experiment and its failed evidence are preserved in the checkpoints below.

Historical failures remain preserved: initial production's additional cached runtime repeat caught a Google cookie race (135/137) in `production-cached-consent-race.json`. Staging `.2` full tests passed 857/857 but optimized cached smoke was 53/59 (`staging-cached-missing-cmp.json`). Inspection now identifies the missing direct CMP URL as a locally minified and delayed `/cache/min/1/widgets/...js` script, not proof of complete absence. The harness now recognizes both original and rewritten script locations and still fails if either is delayed. Do not erase or reinterpret those failures as passing evidence.

The owner plans to manually replace Iubenda later. That replacement is not part of the current release: retain the working provider/fallback and Clarity/journey consent bridge now. Before removing Iubenda in a future task, replace its banner, homepage/page fallback and consent signals together; don't assume installing an unrelated snippet automatically reconnects every integration.

The owner authorized moving the supplied Divi head/body blocks and two WPCode snippets into shared code on 2026-11-06, so they can remove those legacy injections without losing functionality. This is an integration-only release, not an OmniLodge/storefront payload release or a content redesign.

## Ownership

- `staging/wp-content/mu-plugins/ktk-site-integrations.php` owns site-wide Google verification and production GTM `GTM-PHXGRZ`, including one noscript body iframe. The guarded head bootstrap is printed after Iubenda's configuration. Iubenda remains the consent owner; no GTM container, Google Ads destination, cookie-policy configuration or Clarity project is changed.
- Production's homepage, content pages, new storefront, legacy Ecwid fallback and WordPress error/other public pages no longer depend on the Divi GTM snippet. Staging retains the previous tracking scope: migrated pages keep their existing code fallback GTM, while staging storefront/legacy pages do not gain production Google tracking. Clarity remains excluded from staging.
- Exact standard old GTM/meta blocks and the two audited menu/countdown helpers are filtered only from runtime Divi integration output. Unrelated/mixed scripts are preserved. Admin settings and saved database values remain unchanged.
- WPCode snippets **9132 (UTM Tags)** and **8798 (Floating Right CTA – Book Now)** are suppressed by ID plus audited code fingerprint through `wpcode_load_snippet`, before PHP evaluation can register the old footer callback. Both cached arrays and uncached/post-object loads are covered. Admin editing is untouched. Modified or unrelated snippets are not silently disabled.
- The existing code-managed homepage/pages/storefront keep their own attribution, native menus and CTAs. New `ktk-site-integrations-assets/site.js` is loaded only on legacy/unmanaged public routes. It captures the same nine `trk_*` keys, decorates only same-origin `/store` and `/store2` links (including staging), preserves authored query values and supports dynamic/context-menu links, blocked storage and history navigation.
- Legacy menu controls use native clicks plus `touch-action: manipulation`, avoiding the original forced-touch-click double toggle. Legacy countdown days are normalized on initialization and subsequent timer updates.
- The legacy-only CTA is code-managed, never emitted on store routes, and changes NYE destinations to `/store2/nye-pub-crawl-32/#book`. It uses environment-aware URLs and a fully visible vertical tab rather than the old clipped rotated positioning. Migrated page/hero/CTA styles are unchanged.
- No new analytics/conversion event or booking API request is introduced by attribution/CTA helpers. New script/GTM markers are excluded from WP Rocket delay/defer processing. Legacy Ecwid widget/cart logic is not replaced or modified.

## Historical Initial Release Procedure

```powershell
.\tools\publish-site-integrations.ps1 --environment staging --audit
.\tools\publish-site-integrations.ps1 --environment production --audit
php tools/tests/test_site_integrations.php
node tools/test-site-integrations-fixture.mjs
.\tools\publish-site-integrations.ps1 --environment staging --publish
node tools/test-site-integrations-release.mjs
.\tools\publish-site-integrations.ps1 --environment production --publish
node tools/test-site-integrations-release.mjs --production
```

The publisher defaults to a dry run unless `--audit` or `--publish` is supplied. Exactly three files are allowed; assets are uploaded/checksummed before atomically activating the MU plugin. The shared authenticated FTPS/DPAPI helpers are reused. Production requires independently matching staging bytes plus a complete passing browser report bound to those three local hashes. Initial content-cutover activation guards remain intact.

Audit and deployment checkpoints contain the original Divi integrations, the two original WPCode posts/meta and cached snippet data, plus owned-file inventory and protected-state hashes. Raw backup content is retained only in private `deploy-backups/*.zip`, not copied into public release reports. Four exact public legacy snippets are test fixtures, not new live integrations.

Each deployment verifies the three files, all 2,158 protected file hashes (including Clarity, both page renderers and the unchanged storefront payload), raw saved WordPress state, empty effective retired snippet code and no effective old Divi injections. No database write is used for this migration. New asset directory paths and symlinks are checked. Temporary authenticated helpers expire and their removal is verified. Origin cache clearing is limited to the current WordPress instance; Cloudflare still needs a separately confirmed domain purge.

Rollback disables the shared MU plugin first and restores only owned files if present, then clears caches. Saved legacy settings are preserved during deployment. **After the owner removes the legacy settings/snippets, do not simply disable the shared plugin**: restore the specific retired integrations from the private checkpoint first, or repair the shared implementation. Do not restore unrelated global database settings or roll back Clarity's ownership switch.

## Evidence

- Local pre-edit checkpoint: `deploy-backups/before-shared-integrations-20261106-120945.zip`, SHA-256 `05a4ddacc07347239963b9de0aef969042a3f50f5c2881228c67bb332b82a102`.
- Production read-only audit checkpoint: `shared-integrations-production-20261106-111153-681930.zip`, SHA-256 `7fe3a4c7bc82b44c01d99ea0d15540d5aff2a518a51092c2953ef7937bbb907c`.
- Staging read-only audit checkpoint: `shared-integrations-staging-20261106-111216-089578.zip`, SHA-256 `49606ac8bd84a8939c1688529e8320fdb8fc82554e89e473985bdeb967e3043d`.
- Staging deployment: `staging-publish.json`, three hashes verified and all protected files/raw saved state unchanged. Checkpoint: `shared-integrations-staging-20261106-112346-163169.zip`, SHA-256 `5731e67cf2e64ad4ab4e7088d1c91e28c12f7b270a1b31c08bf3f6add8b68169`. Effective retired snippet code is zero bytes for both IDs; saved source remains intact.
- PHP integration tests now 66/66, including the actual installed WPCode constructor, exact source fixtures, shared-loader capture and critical optimizer exclusions; publisher unit tests 2/2 plus reused Clarity publisher 4/4. Existing homepage integration, content routing/indexing 746/746, Clarity policy 26/26, storefront proxy 8/8 and consent/product-attribution regressions pass.
- `local-browser-checks.json`: 51/51 fully intercepted fixture checks, with no public traffic or external writes. Initial 35/51 failures that exposed real forced-touch double toggles and CTA clipping are preserved in `local-before-touch-position-fixes.json`. The next 45/51 run is preserved in `local-before-viewport-fixture-correction.json`; its remaining mobile fit failures were due to the fixture lacking the viewport meta present on actual pages. The application fixes and the fixture correction are documented rather than erasing failed evidence.

The initial production three-file deployment verified all protected files/settings; its checkpoint is `shared-integrations-production-20261106-113643-747033.zip`, SHA-256 `e615f09f42578a966e803de145259ee5d304fd78e08df02d19f014c8587013b6`. Passing initial reports are preserved as `production-initial-*` and `production-before-consent-fix-*`. Do not interpret their passing source/bootstrap checks as proof that the subsequently observed cached runtime race is resolved.

Before the consent-order follow-up: `shared-integrations-before-consent-order-20261106-125516.zip`, SHA-256 `bdad049c8211285eaccd1ae635b26fba5c098ba1368348d41d5bcc1f502355eb`. Latest staging follow-up changes only the shared PHP; all other app files and saved state remain unchanged. Its checkpoint is `shared-integrations-staging-20261106-115530-856922.zip`, SHA-256 `4de2564d7f56d437284419da1b2c6c80624b72a76556ca175a50fcc90acd9c10`.

References for the load-order follow-up: [iubenda consent troubleshooting](https://www.iubenda.com/en/help/185529-google-consent-mode-troubleshooting-guide-2/) and [Google consent debugging](https://developers.google.com/tag-platform/security/guides/consent-debugging). The fix preserves provider-owned consent defaults/updates and prevents optimizer delay; it does not change account privacy settings or configure a second CMP.

## Advanced Consent Follow-up

- Pre-edit checkpoint: `shared-integrations-before-advanced-consent-20261106-135125.zip`, SHA-256 `33369466af1b3f246c3b653d7d51118c9311079b3940a4e9d7d4081929107313`.
- Staging `.3` checkpoint: `shared-integrations-staging-20261106-125437-428321.zip`, SHA-256 `6eb20e0cdaf34d6a9054c66860eff876a9820884018a0ed9057cb54344907c27`.
- Local PHP 73/73; JS safety-default tests 16/16 verify all four denied defaults, preserving existing dataLayer/gtag, repeated initialization and subsequent real provider accept/reject updates. Legacy helper fixture 51/51 and publisher 2/2 pass.
- The live harness records only non-identifying Google request metadata (destination, measurement ID, event, `gcs`/`gcd`) before aborting collection. It checks actual GTM initialization before a choice, no fresh Google/Clarity cookies before/after rejection, denied cookieless measurement, granted measurement/cookies after acceptance and saved rejection on reload. It does not deliver pageviews/conversions or create orders, messages, payments or emails.
- Browser controls, extensions and Google/account eligibility can independently affect delivery/modeling. An attempted network request with denied consent is not proof of private dashboard ingestion or model eligibility. Consent Mode also does not guarantee deletion of cookies written during an earlier accepted visit; reject tests use clean contexts and verify saved rejection on reload.
- [Google's setup guide](https://developers.google.com/tag-platform/security/guides/consent) and [advanced-mode behavior](https://developers.google.com/tag-platform/security/concepts/consent-mode) distinguish immediate tag loading from cookie-storage permission. The fallback default never fabricates consent or rewrites a visitor preference.
- First `.3` live runtime result: **147/149**, preserved in `staging-advanced-v3-reload-cookie-failure.json`. All fresh-choice and measurement checks pass, but saved-rejection reloads on homepage and How to Join create `_gcl_au`. Do not treat this as a completed solution. The detailed diagnostic (`staging-consent-diagnostic.json`, produced by `tools/diagnose-site-consent.mjs`) captures only isolated-test cookie names/write stacks and consent states, not cookie values/customer data. The write is from GTM's Google tag while its consent runtime still reports `active=false, usedDefault=false`; later its states and requests correctly show denied consent. Thus a `G100` request alone is insufficient proof of no cookie write.
- Read-only inspection of public container `GTM-PHXGRZ` version 41 identifies Google tag 39 (`AW-956184209`) firing on `gtm.init`, before queued consent defaults are processed in the failing reloads. Google's documentation recommends synchronous `setDefaultConsentState` in GTM Consent Initialization, rather than queued gtag consent commands inside GTM. Need inspect/configure the container with account access and retest before production. The owner was asked whether they have publish access. No container edits/account settings or production `.3` deployment have been made. Never work around this by fabricating consent, deleting the failed assertions or monkey-patching browser cookie writes/private Google internals.
- Full staging HTTP-only source checks: `staging-browser-checks.json`, 1,094/1,094 across all 121 routes on desktop/Android/iPad plus asset hashes and NYE destinations. This proves source/order contracts, not runtime/reload safety or clean cached HTML; the production gate correctly rejects it as HTTP-only. All task test/publisher processes are closed.
- The owner confirmed publish access. Browser automation is currently unavailable: both CUA tab creation and browser inventory returned `The browser access host is unavailable`. No GTM tab/container was opened or changed. The next step is owner-supplied current published JSON via **Admin -> Export Container**, or restoring browser access. Do not publish an unreviewed workspace, overwrite unrelated GTM changes, or promote `.3` while its reload-cookie checks fail. [Google's export instructions](https://support.google.com/tagmanager/answer/6106997).

## Authorized Consent Revert

The owner declined the GTM tag, then explicitly requested reverting the extra staging consent changes. No further GTM access/export is requested. These instructions supersede the earlier pending browser/consent follow-up, not the history/evidence above.

- Pre-edit experiment/source/evidence archive: `shared-integrations-before-authorized-consent-revert-20261106-144844.zip`, SHA-256 `503d991199bca3fe184ebb101c595c25848047d0cb889fd81b5ccb315cc27725`.
- Restored baseline is independently matched to `production-initial-publish.json` and the verified old `.1` entry in `shared-integrations-staging-20261106-115530-856922.zip`. Shared PHP SHA-256 `f4b47a6f7fe2411b865f8ff4e38c0e74e410dee01e55ceada0a9053cd77ff23e`; both helper assets unchanged.
- Successful staging revert: `staging-publish.json`; checkpoint `shared-integrations-staging-20261106-135441-800535.zip`, SHA-256 `f8e02fa4ad9403833ad3c30685d239e05a2947761ee28770400b77b37d75d23d`. All three hashes/runtime `.1`, 2,158 protected hashes and saved WordPress state verified. Origin cache cleared, helper removed. Owner confirmed purging the staging Cloudflare prefix.
- The first attempt was safely aborted/restored because its full saved-state hash changed despite matching payload/runtime/protected files. Retained as `staging-consent-revert-first-attempt.json`; its checkpoint is `shared-integrations-staging-20261106-135144-844011.zip`, SHA-256 `0fac113e5a43b4b399fb727ecd45c733e2f30355b269ac9f4618bef43b191d0a`. The specific changed row was not recorded then. Added per-row checksum diagnostics, retained the strict aggregate-state guard, and the fresh retry passed unchanged-state checks. No database restoration or exception to the guard was used.
- Fresh production audit only: `production-audit.json`; checkpoint `shared-integrations-production-20261106-135600-012124.zip`, SHA-256 `7ff8a43a596a4377229096f841896e812f353b4a757db3378358a5664c9e141a`. Production owned bytes equal the original release. The known retired Divi blocks are absent from effective output; IDs 8798 and 9132 return zero code bytes. Saved raw head contains the supplied verification/menu blocks, body the supplied GTM/countdown blocks, with no standalone Ads/Clarity loader. Original saved entries were not deleted or edited by this work.
- Local rollback regression 6/6, PHP integration/removal-equivalence 69/69. The standalone experimental-default test was retired after its source was archived; failed runtime reports and the strict consent harness remain, not relabelled as passing.
- `tools/verify-site-integration-ownership.mjs` is a separate source/booking-attribution check for the restored baseline and exact legacy-removal equivalence. Its reports explicitly say `notConsentVerification=true`; they do not replace the failed privacy tests or the production release gate. `staging-ownership-clean.json` and `production-ownership-clean.json` each pass **745/745**, covering all 121 routes on desktop/Android/iPad, original asset hashes and isolated nine-field attribution capture/booking handoff after Reject. Staging source requests returned 344 MISS, 16 HIT and three 404 BYPASS after the confirmed prefix purge. Production cached/source behavior was checked without a production deployment or cache purge. All browser/test/publisher processes owned by this task are closed. Local shared PHP/removal-equivalence 69/69, exact-byte rollback 6/6, helper browser fixture 51/51 and publisher 2/2 pass.

### Exact Legacy Entries That Can Be Removed

This is functional source-removal approval, not a claim of verified consent correctness. These entries already produce no effective frontend output through the shared filters, and removal-equivalence tests confirm removing their exact known source leaves that output unchanged:

- Divi head: supplied Google verification meta and Divi mobile-menu touch helper.
- Divi body: supplied GTM script/noscript and countdown-days helper.
- WPCode: deactivate **UTM Tags**, ID **9132**.
- WPCode: deactivate **Floating Right CTA - Book Now**, ID **8798**.

Do not delete all integrations, uninstall WPCode/Divi, disable Iubenda, remove the shared MU plugins or alter unrelated scripts. The current audit finds no standalone Google Ads/Clarity script in those Divi fields. The owner will perform saved-entry cleanup; the agent has not done it. Refresh WP Rocket/Cloudflare caches after cleanup and verify the code-owned loaders/CTA. If the shared replacement ever needs rollback after cleanup, first restore only these original sources from the private checkpoint, not unrelated database state. The old consent-timing issue is unchanged by removing already-suppressed duplicates.

Current verification commands (no production promotion):

```powershell
php tools/tests/test_site_integrations.php
node tools/tests/test_site_consent_revert.mjs
node tools/test-site-integrations-fixture.mjs
node tools/verify-site-integration-ownership.mjs --clean
node tools/verify-site-integration-ownership.mjs --production --clean
```
