# Readiness Execution Checkpoint: Staging Verified

Historical staging checkpoint only. The owner later approved staging and authorized production; the completed production release is documented in `../production-release/README.md`. Do not mistake this older phase's production boundary for current deployment status.

Latest owner response: "done", confirming the second staging-prefix purge. Final clean/HIT verification is complete. Work remains staging-only; do not publish production. Forms/backends retained. The owner approved NYE 2026-12-31, 17:00/19:30, 250 PLN, meeting TBA; own NYE checkout; responsive hamburger when menu cannot fit; removing About Us broken media; homepage review snapshots on About Us; **all** incoming KTK FareHarbor and Ecwid website booking links to storefront. The legacy store/fallback and storefront/OmniLodge themselves remain untouched.

## Deployed And Verified

- Latest `staging-pages-publish.json`: completed 17:26:44 UTC, all 1,915 files independently SHA-256 verified, WordPress/homepage/storefront unchanged by that transaction, helper removed. Backup `ktk-code-pages-staging-20261105-172627.zip`, SHA `055b729a942b26da0257068f841badf436d8e6beb6f68780e825628c8ca0106f`. Final follow-up changes only scoped About Us review CSS <=600px. Initial deployment retained as `staging-pages-publish-before-review-wrap.json`.
- `staging-homepage-publish.json`: separate link-only deployment, all 232 local/remote hashes match. Backup `ktk-homepage-shortcode-staging-20261105-165841.zip`. `--local-source --assets-only --report` deliberately skips post/settings rewriting. Only `parity-seasonal-content.php` changed; homepage DOM proof allows exactly four unique incoming destination changes, with everything else unchanged.
- All-route query-busted release `../full-migration/readiness-staging-release.json`: 5,500/5,500, 116 routes/three devices, 119 public asset hashes/version tokens, metadata/robots, integration uniqueness, internal/staged navigation, no Ecwid/FareHarbor booking links, aliases, protected routes and raw-template denial.
- Live components 884/884; local and live readiness 849/849 each across four pages/16 widths, including loaded review photos and review-module bounds at 320px; attribution 24/24; actual form contracts 7/7 without mail; homepage consent release 26/26 (`docs/homepage-parity/readiness-staging-release-smoke.json`). Tests use isolated browser storage and block writes/navigation; no orders/emails. Post-fix desktop all-route check passed 1,994/1,994; final full query-busted release passed 5,500/5,500 across all 116 routes and 119 assets. The manifest binds that current release and final clean/HIT evidence.
- Local build verifier 1,856/1,856, routing/production-opt-in/SEO PHP tests 746/746, forms 31/31 stubbed, booking mappings 8/8, page publisher 6/6, homepage publisher 20/20, production-read-only guard tests 3/3, homepage integration passed, journey 64/64, homepage DOM/header tests 7/7.
- `revision-scope-audit.json`: all 1,633 original styles/media/fonts unchanged; wide 1920px header PNGs exact. Historical strict visual matrix is not a full pass; do not erase or overstate it. Current owner-approved body/booking/header corrections deliberately differ from source. Source captures remain immutable.
- Fresh production SEO baseline: all 116 routes, no errors/noindex; `max-image-preview:large`. Team Building source has no canonical; preserve that absence for parity. New per-page `production_seo` data is generated/verified. `KTK_CODE_PAGES_PRODUCTION_ENABLED` remains undefined/OFF in deployed files; no activation file has been created. Staging always noindex.
- `production-dry-run.json`: read-only FTPS inventory, zero remote writes, local equals verified staging, zero existing production code-page files (all 1,915 would be new). Tool cannot publish/upload helpers/purge. Actual production posts/settings backup, activation and post-cutover checks remain unperformed and require separate authorization.

## Final Cache Verification Complete

The owner confirmed the first staging-prefix purge and checks passed. An extra 320px About Us test then found inherited review-widget overflow (756/757 checks); that failure is retained in `about-us-320-regression-before-fix.json`, and the prior clean report in `clean-cache-before-about-us-fit.json`. The fix removes inherited 1.25 scale and allows headings to wrap without hiding content or shrinking fonts. The local CSS checkpoint is `deploy-backups/code-pages-runtime-before-about-us-wrap-20261105.zip` (SHA `f9f3da49db46a7d46c49f947b00bced06a6bc6aa5ebb8ea7e048a54953ac2c53`).

The owner confirmed the second purge of **only** Cloudflare prefix `krawlthroughkrakow.com/staging/` for the final stylesheet. It rebuilt staging stores' caches but changed no store content/settings and never production. No further application edits were made.

Homepage clean/HIT reports passed 18/18 each, with all three device variants MISS then HIT. The first content scan had fresh MISS responses but one desktop connection reset for `/krakow-go-karting/`; the 5,485/5,486 failure is preserved in `clean-cache-transient-connection-reset.json`. A complete clean-URL rerun passed 5,500/5,500 at 17:54:24 UTC, including that route. The final repeat passed 5,500/5,500 at 17:56:24 UTC, all 116 routes HIT on each device, and all 119 public asset hashes/version tokens current. See `../full-migration/readiness-staging-clean-cache.json` and `readiness-staging-cache-hit.json`.

The updater reports `deployed`, `releasePassed` and `cachePassed` true; all 116 statuses are `staging-verified-visual-exceptions-documented`. The historical strict visual suite remains false. Owner visual sign-off and separately authorized production release are still required.

To reproduce read-only verification:

```powershell
python tools/verify-homepage-booking-cache.py --label homepage-clean-cache
python tools/verify-code-pages-full-release.py --label readiness-staging-clean-cache
python tools/verify-homepage-booking-cache.py --label homepage-cache-hit
python tools/verify-code-pages-full-release.py --label readiness-staging-cache-hit
node tools/update-code-migration-status.mjs
```

Require all checks/current asset version tokens and actual HIT evidence per device; preserve failures if a cache variant is stale. The updater selects this release, binds local payload fingerprints, compares evidence dates and resets stale cache progress. Never use old clean-cache reports to claim a newer release is current. README/root AGENTS/manifest/plan are updated from the final evidence. Production remains unchanged.

## Processes

All task previews and tests are closed. The review-follow-up PHP command line was verified and only its process 35188 was stopped; exec 91799 closed. Full release exec 47629 completed successfully. Final cache sessions 56861 (preserved transport failure), 53198 (complete rerun) and 56660 (all HIT) are complete. All publishers are complete. No Git repository/worktrees here. Unrelated OmniLodge and browser processes were left alone.

## Key Source Changes

- `tools/booking-destinations.mjs`: shared pure mapping and DOM rewrites for homepage/pages, preserves allowed attribution, drops FareHarbor visitor config, supports the old brunch alias and 22 mapped legacy IDs. Never rewrite other operators or the availability fallback implementation.
- `tools/code-pages-content-revisions.mjs`: guarded DOM revisions for NYE/About Us/Brewery and eight broken contents links (one repair, seven missing entries removed). Built-in source assertions intentionally prevent applying a correction twice to changed captures.
- `tools/build-code-pages-all.mjs`: invokes revisions, fixes CSS-in-aria labels, reads homepage approved review counts, writes verified per-page production SEO policy; original Ecwid widget becomes a temporary build marker then is removed by the revision while the existing Brewery button is repointed to product 40. No duplicate button remains.
- `runtime.css`/`runtime.js`: hamburger <1380px, compact row 1380-1499, original desktop >=1500; accessible scrollable menu; no Ecwid SDK loader. Other lower-page styles preserved.
- `ktk-code-pages.php`/`forms.php`: production opt-in/hostname/route/source guards with per-page SEO policy, staging still noindex. No production activation.
- `publish-homepage-shortcode.py`: new tested `--assets-only` and `--report` flags; old default behavior retained. No globals rewritten for this release.
- `prepare-code-pages-production.py/.ps1`: structurally read-only inventory/plan; mutation commands rejected and credential stays DPAPI/env-only. It is not a production publisher.

Backups before edits: 1,971-entry `code-pages-before-readiness-fixes-20261105-170313.zip`, SHA `39a33ea77fc3ff5e65c8da280c654b74eb3f2788961ad8093563ce711799ef9b`; scope-expanded 2,239-entry `code-pages-before-booking-link-revisions-20261105-172108.zip`, SHA `b8856bf06a8b43027fa160935d9d3261daefb2cbc642ba0b76a5237b80743f58`. Credentials excluded; all entries verified. `original-homepage-content.php` in this docs directory was extracted read-only from the backup for DOM comparison, never deployed.
