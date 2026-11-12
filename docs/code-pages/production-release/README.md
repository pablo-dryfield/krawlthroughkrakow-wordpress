# Production Content Release

The owner approved staging visually and explicitly authorized production deployment on 2026-11-05. Scope: 116 content routes, nine redirects, the existing homepage canonical alias, and the approved homepage booking-link-only revision. Preserve current URL identities, original WordPress posts/settings, both stores, storefront plugin, OmniLodge and existing form backends. Do not remove plugins or migrate global integrations.

Status: published and verified. The production cutover completed at 18:43:33 UTC. After the owner confirmed the domain-wide Cloudflare purge, full clean-URL verification passed at 19:17:54 UTC and the all-HIT repeat passed at 19:20:50 UTC. No application bytes changed after the purge. The later user message updating cart-related project context did not authorize or cause any storefront/OmniLodge deployment in this content release.

## Progress

1. [x] Owner visual approval and explicit production authorization.
2. [x] Local recovery checkpoint: `deploy-backups/code-pages-before-production-cutover-20261105-191540.zip`, 2,273 verified entries, SHA-256 `495bf07a9cd057c2ae83b5ba3cbb21fa841bff1606129af3ab10f821a30be7ba`.
3. [x] Production activation/path/state/backup/rollback unit tests: 15/15, including real-file server-copy fixtures, corrupt-source rejection before writes, enabled-production rejection and temporary-file cleanup. Existing PHP production guards: 746/746.
4. [x] Fresh production preflight, complete WordPress source snapshot and owned-file backup.
5. [x] Verify all dependencies, homepage link-only promotion and activation last.
6. [x] Verify production routes, booking destinations, SEO, forms, tracking and responsive layouts.
7. [x] Verify clean and cached device variants after the owner-confirmed domain cache refresh.

## Tools

Dry run: `tools/promote-code-pages-production.ps1 --report docs/code-pages/production-release/dry-run.json`.

Publish: `tools/promote-code-pages-production.ps1 --publish`.

The publisher independently hashes staging and production owned files with an expiring, header-token-authenticated, canonical-host-only temporary helper. Every helper upload/hash/rename/removal is verified. The production backup includes original published posts/meta, CF7 definitions, taxonomy records and protected WordPress/Divi/WPCode/Iubenda/Ecwid settings. The actual backup data is kept in `deploy-backups`, not printed to chat or logs. No database content/settings are mutated.

The initial FTPS transfer was stopped before activation to use same-server copying for the 494.5 MB already present in staging. `initial-transfer-checkpoint.json` preserves the original pre-release backup: `deploy-backups/ktk-code-pages-production-20261105-182531-219218.zip`, SHA-256 `8651efcc4e4f8c44ac4cd1b135e7879f1d167232a65331b0ff25a345cd6d4977`. It predates all content payload writes. The completion run takes another verified backup of the partial, still-inactive payload; do not confuse that later archive with the original baseline. The original WordPress/Divi routes remained active during both transfers.

The partial-payload checkpoint is `deploy-backups/ktk-code-pages-production-20261105-183735-806685.zip`, SHA-256 `63e0e7060a6dfa261f09377902e5b3e76412f072fe9dc01828b3df3d4d197d92`. Server copying then verified all 1,915 content files: 1,638 copied and 277 already equal. Registry/renderer remained disabled until the separately verified homepage promotion completed. Production activation was then installed last and verified with an independent final inventory of all 1,916 content/activation files.

The separate homepage backup is `deploy-backups/ktk-homepage-production-20261105-184115-115287.zip`, SHA-256 `4eaec699e8e5ee17074e8393d3a72f70e7dc6f2234dbae19f446e194d63246c6`. All 232 homepage files matched staging. Comparing that archive's checksums with the deployed manifest confirms exactly one changed file, `ktk-homepage-assets/parity-seasonal-content.php`, and no added homepage files. Original homepage/settings snapshots are unchanged.

The copy helper validates every staging source hash before writing, restricts both roots and every path to the owned namespace, rejects symlinks/traversal and enabled production, copies to verified temporary siblings, atomically renames dependencies before registry/renderer, and rehashes every target. It cannot copy the activation flag. This avoids retransferring existing media through the client without weakening file-integrity checks.

## Runtime Verification Notes

The first production route scan (5,848/6,196) assumed Clarity always had the staging-owned script ID. Production correctly reuses the owner's existing unlabelled Clarity snippet rather than injecting another one. The original report is preserved as `production-before-loader-harness-fix.json`. Production verification now counts logical bootstrap instances from script bodies/URLs, including existing integrations, and still rejects genuinely duplicated bootstraps. Staging's original assertions remain unchanged. No integration PHP or global settings were modified for this correction.

The first browser integration run (49/61) had the same script-ID assumption and counted Google's `gtg_health=1` diagnostic as another Ads loader. A read-only request to Google's own endpoint returned a 216-byte health callback (SHA-256 `e5482421d6b3abd68b9ca563da4e92a2c05663bf9c8cfe0d518218315677c046`), not another Ads configuration. Its original failure is preserved as `integrations-before-loader-harness-fix.json`. The corrected 61/61 browser run requires one logical GTM/Ads/Clarity bootstrap, one real Ads loader and one Ads configuration, one Clarity project loader and one Iubenda bootstrap. It tests actual Accept/Reject controls and reopening preferences on About Us, NYE and Contact. Collection/conversion requests are blocked in these isolated test contexts. Existing first-party Google tag gateway behavior is observed and preserved; no gateway/GTM configuration was changed. Provider reference: https://developers.cloudflare.com/google-tag-gateway/ and Google's endpoint `https://www.googletagmanager.com/gtag/js?id=AW-956184209&gtg_health=1`.

The first reused homepage release suite passed 79/80; its sole failure compared the newly migrated Contact page's script signatures with the old Divi Contact preflight. `homepage-before-contact-contract-update.json` preserves that result. The explicit `--content-migration` test mode checks Contact's approved code-managed renderer and single logical integration contract instead; original signature protection remains strict for both storefront product routes and for the default homepage-only release mode. This is a test-contract update for an explicitly migrated page, not an application change or a waived storefront regression.

Payload dependencies are verified before the registry/renderer. The exact staging homepage payload uses the existing separate homepage publisher with its own backup and WordPress state guard. `ktk-code-pages-production.php` is generated and deployed only to production, last; it is not added to the staging payload. The renderer additionally requires the canonical production hostname/HTTPS/root and matching per-route source identity.

On post-activation failure the publisher first renames the recognized activation file to a non-PHP sibling and clears only affected origin URLs, returning those routes to their untouched original WordPress/Divi implementation. Restore any prior owned files from the verified archive as needed. Homepage rollback uses its separately verified archive. Never restore global settings or delete unrelated files as part of rollback.

## Boundaries

Staging remains noindex. Production retains its original robots/canonical policy, including the Team Building article's existing absence of a canonical. Existing forms still use WordPress/CF7 and configured recipients. Verification must not send real messages, create orders or fire synthetic conversions. The historical strict screenshot suite remains an incomplete pixel pass; owner-approved restored photos/responsive/header/content differences are documented in `../full-migration/VISUAL-REVIEW.md`.

## Final Evidence

- `publish.json`: 1,915 content files plus the production-only activation flag, all final SHA-256 values verified; original WordPress state and protected storefront files unchanged; scoped origin cache cleared. Temporary authenticated helpers are removed and their absence checked within every helper invocation.
- `homepage-publish.json`: separate homepage backup/state guard and 232 matching files; only approved booking destinations changed.
- `production-clean-cache.json`: 6,196/6,196, all 116 routes across desktop/Android/iPad, all 119 public CSS/JS hashes and version tokens, production robots/canonical policy, logical integration uniqueness, no staging destinations/resources, nine redirects and the existing canonical alias, protected homepage/stores and raw-template denial. Checked 19:17:54 UTC. Initial responses included 102 desktop MISS, 115 Android MISS and 116 iPad MISS; the others were already warmed HIT responses, all current.
- `production-cache-hit.json`: independent repeat, 6,196/6,196 at 19:20:50 UTC, all 116 routes HIT on each of the three device variants. No cache-busting query was used in either full final pass.
- The first successful clean-URL scan also supplies live-release proof; the manifest references that actual report for both roles. The interrupted query-busted rerun was not claimed as a success, and `production-release.json` remains a historical pre-harness-correction failure alongside `production-before-loader-harness-fix.json`.
- `production-readiness-tests.json`: 849/849 across four representative pages and 16 widths, including 320px review fit and menu behavior. `attribution-tests.json`: 24/24, isolated browser storage and prevented booking navigation. `form-contracts.json`: 7/7 real configuration/nonce/schema checks, no mail submission. `integrations-tests.json`: 61/61 actual consent/loader checks. `boundaries.json`: 33/33 staging noindex/canonical/staging-link and separate production storefront checks.
- `../../homepage-production-launch/content-migration-production-release.json`: 80/80 homepage source/layout/booking/tracking assertions, including original integration-signature protection for both storefront product routes. `content-migration-production-clean-cache.json` and `content-migration-production-cache-hit.json` in that same directory: 19/19 each, current homepage and ten assets across all three device variants. Those root responses were already warmed HITs; no fresh MISS is invented.
- `../full-migration/manifest.json` and `MIGRATION-PLAN.md`: production is verified for all 116 routes and all ten aliases; current local content hashes match the published release. The historical strict pixel matrix stays false. No task-owned publisher/browser-test/preview process remains running, and unrelated user/OmniLodge processes were not stopped.

Future releases must respect the active-production guard. This initial-cutover publisher intentionally refuses an already enabled production activation file; use a reviewed incremental procedure for later changes. Rollback starts by disabling that activation file, preserving original WordPress data and using the original pre-payload checkpoint above rather than mistaking the partial-transfer backup for the baseline.
