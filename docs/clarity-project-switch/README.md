# Clarity Project Ownership Switch

The owner supplied a new manually installed project, `z9d5iuilvn`, on 2026-11-06. It replaces `ufswk29c79`; no old recordings are migrated. This authorizes the Clarity-specific integration change, not an OmniLodge deployment or unrelated global tracking changes.

## Implementation

- `staging/wp-content/mu-plugins/ktk-clarity.php` owns the website project ID and environment policy. Only the canonical HTTPS production root enables the loader. Staging loads no Clarity library and returns replay disabled.
- The shared `wp_head` hook supplies one production loader after the existing site-wide priority-0 consent bridge. The existing Iubenda purpose-4 / Clarity ConsentV2 bridge and privacy masks are unchanged. Denied consent retains the existing limited/no-storage Clarity mode, not a claim that the production library is absent before consent.
- The exact standard standalone Clarity snippets in Divi/WPCode saved integration output are suppressed in memory. Other scripts and mixed script blocks are retained. Saved settings are NOT rewritten; the old Divi snippet remains stored but must not execute. Admin views/settings are not filtered. A future nonstandard loader must be reviewed explicitly, not removed with a broad text replacement.
- The WordPress `rest_post_dispatch` filter changes only `journeyReplay.projectId` on successful storefront config/product reads and quote responses, including the nested product `storefrontConfig`. Staging additionally sets replay `enabled=false`. Pricing, identity, payments, errors, consent requirements and sampling settings are unchanged. OmniLodge's saved default is not modified or deployed; this is a website-side override for all website replay entry points, including cached upstream config.
- Homepage and page-renderer fallback project constants use the new ID. Their fallback loader respects the shared staging policy. The homepage renderer is rebuilt from its template; content-page integrations are regenerated from homepage integrations. Layout/content/style/media files are unchanged.
- Google Tag Manager, Google Ads, real attribution local-storage keys and link decoration are unchanged. Test attribution uses isolated contexts, blocked navigation and no collection.

## Publishing

`tools/publish-clarity.ps1` supplies the DPAPI credential only to its child process. It never prints the password. The default is a dry run:

```powershell
.\tools\publish-clarity.ps1 --environment staging
.\tools\publish-clarity.ps1 --environment staging --publish
node tools/test-clarity-release.mjs
.\tools\publish-clarity.ps1 --environment production
.\tools\publish-clarity.ps1 --environment production --publish
node tools/test-clarity-release.mjs --production
```

Exactly five files are allowed: the two renderers, the two integration PHP dependencies and the new Clarity policy. Production requires a complete matching staging deployment and independently rereads the staging bytes. This incremental publisher does not bypass or remove the original content-cutover activation guard.

Each environment backs up the existing five paths before replacement, verifies atomic temporary uploads and final checksums, compares 2,153 protected file hashes and raw database state hashes, and removes authenticated expiring snapshot helpers. Raw settings/post hashes bypass runtime filters so comparison proves stored WordPress state was not rewritten. The scope includes the storefront's unchanged ten-file payload, content/homepage assets and the production content activation file. Origin page caches are cleared for the current WordPress instance because the integration is site-wide; Cloudflare device variants still require a separate domain purge.

On a deployment error the publisher restores only its existing owned files, removes newly added owned paths and verifies rollback. Do not restore global database settings. A rollback deliberately resumes the previous analytics configuration, including the previous owner's project, so use it only as an intentional recovery step.

Historical homepage/content snapshots also contain old fallback project constants. Preserve the current analytics policy/integration constants when restoring unrelated layout/content; do not blindly mix pre-switch renderers with the new policy. New Clarity-account settings and historical project-specific configuration are not transferred from the previous owner's account; code-level masking and consent signals remain in place.

## Verification And Evidence

- Local checkpoint: `deploy-backups/before-clarity-project-switch-20261106-112758.zip`, SHA-256 `cb4b9f3227162b34c76efcddfb7ce6e57822e3e63a1c6f7c57525fc8ab476cde`.
- Local Clarity policy tests: 26/26; publisher tests: 4/4. Unchanged homepage integration/consent, content routing/indexing (746/746) and storefront proxy (8/8) regressions pass.
- `staging-publish.json` verifies all five files and unchanged protected files/settings. Staging backup: `deploy-backups/clarity-staging-20261106-103323-002605.zip`, SHA-256 `c8a71ee77ff18f6c633189c65e1f86f2bf280385466075d2e09b789c9fc63519`.
- `production-dry-run.json` confirms the only saved old-project source is `et_divi`. Dry runs upload only a temporary authenticated read-only helper, then verify its removal; they do not publish application files.
- `production-publish.json` completed at 10:48 UTC with all five expected hashes, 2,153 protected file hashes and raw saved settings/post hashes unchanged. WordPress's actual HTML processor is available; the runtime-filtered Divi/WPCode options contain no old project ID, while the raw Divi setting remains preserved. Backup: `deploy-backups/clarity-production-20261106-104801-487066.zip`, SHA-256 `49a1a87aeab9f4a8a1da2d211a5b7ffee0ffffdb5dfb4d75ac530cc4bf26c619`.
- `staging-origin-checks.json` passes 392/392 after the harness corrections. `production-clean-checks.json` passes 392/392 on normal public URLs after the owner's confirmed domain purge, covering all 116 migrated content routes plus homepage and two product pages on three device variants, successful website config APIs, actual consent interactions, Google baseline and isolated UTM/click-ID handoff.
- `production-cache-hit-http-only-checks.json` passes 359/359: all 119 HTML routes are HIT on each of desktop, Android and iPad, with no old project ID and exactly one new Clarity bootstrap. Both configuration API checks also pass. `staging-clean-http-only-smoke-checks.json` passes 23/23 on normal URLs after the same domain purge, with no Clarity loader and replay disabled. This last staging check is a scoped seven-route smoke check across three devices, not another full-route browser run.
- A read-only fetch of the published Google container `GTM-PHXGRZ` returned HTTP 200 (451,119 characters), with neither Clarity's tag domain nor either project ID present. No GTM container was changed. Tests block collection, so they prove installation/configuration/consent behavior, not receipt of recordings in the owner's private dashboard. New real visitor sessions can be checked there by the owner.
- The task-specific `test-clarity-release.mjs` scans every migrated route plus homepage and both main product routes with desktop/Android/iPad user agents. It also tests config APIs, real consent accept/reject flows, Google loaders and isolated attribution handoff. Collection and non-read requests are blocked in browser tests; no email, order or payment is submitted.
- Production cutover and old homepage verification reports under other documentation directories are historical evidence and must not be overwritten to manufacture a new successful run. Their original old-project/bootstrap assumptions describe their release dates, not this new policy. Use the dedicated Clarity-aware verifier and new evidence directory for this change.
- The first staging run is preserved in `staging-before-harness-corrections.json` (383/392). Its nine failures were test assumptions: six store HTML checks expected migrated-content robots metadata, two expected Google globals that had already been removed on staging, and one seeded storage after the homepage had captured attribution at initialization. The correction keeps migrated content noindex assertions strict, leaves storefront metadata untouched, checks each environment's actual Google baseline, and seeds isolated attribution before page initialization. No application files were changed for these test corrections. Existing storefront `fbq is not defined` / `FacebookSignal is not defined` errors are recorded, not hidden or attributed to this Clarity change.

Status: deployed and verified on staging and production, including normal public URLs and all production device-cache variants. No website content, saved WordPress settings, storefront payload or OmniLodge release was changed. The owner does not need to remove the old Divi snippet for correctness because it is already suppressed; removing only that old Clarity block is optional cleanup, not a requirement to paste the new snippet elsewhere. Task test/publisher processes are closed.
