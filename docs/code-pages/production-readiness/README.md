# Production Readiness Review

This is the historical staging-readiness phase. The owner subsequently approved its documented visual differences and authorized production. The [production cutover](../production-release/README.md) is now deployed and verified; the staging-only boundary below records the earlier phase, not a prohibition on that later authorized release.

Scope: resolve migration issues on staging before a separately authorized production cutover. Do not deploy production, storefront, OmniLodge or Ecwid. Keep existing form backends and external services.

## Recovery

Before application edits: `deploy-backups/code-pages-before-readiness-fixes-20261105-170313.zip`, SHA-256 `39a33ea77fc3ff5e65c8da280c654b74eb3f2788961ad8093563ce711799ef9b`. All 1,971 archived entries were independently checksum-verified. Archive paths are repository-relative; source captures remain unchanged in their original directories. The archive excludes credentials and dependency directories. Reproduce checkpoints with `tools/checkpoint-code-pages.ps1`.

Before homepage booking-link edits, the scope-expanded checkpoint includes homepage files: `deploy-backups/code-pages-before-booking-link-revisions-20261105-172108.zip`, SHA-256 `b8856bf06a8b43027fa160935d9d3261daefb2cbc642ba0b76a5237b80743f58`; all 2,239 archived entries verified. The owner subsequently approved all incoming Ecwid/FareHarbor booking links going to the storefront, while the legacy store, emergency fallback, storefront plugin and OmniLodge remain untouched.

## Issues

- [x] Fix the mid-width navigation/booking-button wrap and logo crowding. Hamburger below 1380px; a compact single-line desktop menu at 1380-1499px; original desktop appearance from 1500px. Keyboard/Escape and all links remain reachable. Wide 1920px header PNGs are identical to the checkpoint. Smaller/200%-zoom logical widths use the same compact flow.
- [x] Update the NYE year/countdown, confirmed 17:00/19:30 starts, 250 PLN price and TBA meeting information. Countdown targets Warsaw midnight starting 2027. Unconfirmed named itineraries are TBA; existing venue photos are explicitly historical. Remove unsupported fixed EUR conversion and stale scarcity/contact-form claims; link the actual contact page. No policy/legal copy changed.
- [x] Replace incoming KTK FareHarbor and Ecwid website links with the code-managed storefront. Known products retain identity; unknown/category calendars use the catalog. NYE content/floating buttons select product 32. Brewery's existing button selects product 40 instead of adding a duplicate widget/control. Preserve genuine UTM/click IDs, drop legacy FareHarbor visitor payload. Legacy store/fallback untouched.
- [x] Repair one malformed article contents anchor and remove seven contents entries whose sections do not exist, leaving article body text unchanged. Remove the empty About Us video module; update its review snapshots to existing homepage figures; remove captured CSS from accessible module-link labels.
- [x] Fix About Us review overflow at 320px without hiding content or shrinking fonts. The scoped <=600px override removes the inherited 1.25 scale and allows review headings to wrap. Both review photos and all review text fit their own modules.
- [x] Review real defects separately from approved photo restoration, source fallback fonts/animations and external-provider states. `revision-scope-audit.json` verifies all 1,633 original page styles/media/font assets unchanged. The original strict 464-comparison report remains preserved and is not a full pass. Homepage DOM comparison proves only approved booking destination attributes changed.
- [x] Capture production-specific indexing/canonical evidence and define disabled-by-default production activation, rollback and cutover checks. Read-only preflight made zero production writes. Actual cutover backup/activation is not performed or authorized.
- [x] Build, test, back up and deploy the approved fixes to staging; verify exact files and live behavior.
- [x] Verify final clean device caches and HIT responses after the owner-confirmed staging-prefix purge.
- [ ] Owner visual review/sign-off before production promotion. Intentional differences above are not mathematical pixel identity.

## Confirmed NYE Source

Read-only public product endpoint: `https://krawlthroughkrakow.com/wp-json/ktk-storefront/v1/products/nye-pub-crawl-32`. The owner confirmed the starts/price and meeting-point TBA, and selected the code-managed checkout in response to the readiness questions. Existing club names and detailed travel times are not confirmed by the current product, which has meeting point TBA. Existing photos/video may depict past events; do not relabel historical media as current footage.

## Release Evidence

- Code pages: latest `staging-pages-publish.json` completed 17:26:44 UTC, with 1,915 independent remote SHA-256 matches. Backup `ktk-code-pages-staging-20261105-172627.zip`, SHA-256 `055b729a942b26da0257068f841badf436d8e6beb6f68780e825628c8ca0106f`. This final follow-up changes only the scoped About Us review CSS; WordPress/homepage/storefront remain unchanged and the helper was removed. The initial readiness deployment is preserved in `staging-pages-publish-before-review-wrap.json`.
- Homepage: `staging-homepage-publish.json`, 232 local/remote SHA matches. Backup `ktk-homepage-shortcode-staging-20261105-165841.zip`. The `--assets-only` publisher path never rewrites posts/settings. Only the owned parity body changed; no hero/style/integration changes.
- Build 1,856/1,856; PHP 746/746; forms 31/31 (mail stubbed); booking mapping 8/8; page publisher 6/6; homepage publisher 20/20; production-preparation guard tests 3/3; homepage integration passed; homepage journey 64/64; homepage DOM/header revision checks 7/7.
- Local and live readiness checks: 849/849 each across four pages and 16 widths, including loaded review photos and review-module bounds at 320/375/390/600px. The original 756/757 regression is preserved in `about-us-320-regression-before-fix.json`. The post-fix desktop all-route check passed 1,994/1,994 (`../full-migration/readiness-review-fit-pre-release.json`); the three-device full report passed 5,500/5,500 across all 116 routes and 119 assets (`../full-migration/readiness-staging-release.json`).
- Unchanged behavior checks: live components 884/884 (`../full-migration/components-report.json`), attribution 24/24 (`staging-attribution-tests.json`), actual form contracts 7/7 without mail, homepage consent 26/26 (`../../homepage-parity/readiness-staging-release-smoke.json`). Attribution browser contexts were isolated, navigation prevented, and writes blocked; no orders/messages were created.
- The owner's first staging-prefix purge was verified successfully before the additional 320px review fix. Those checks are historical, not proof of the final CSS release: `clean-cache-before-about-us-fit.json` retains the prior all-route result.

## Final Cache Verification

The owner confirmed the second purge of only `krawlthroughkrakow.com/staging/`. No application files or production settings were changed during verification.

- Homepage: `homepage-clean-cache.json` passed 18/18, with desktop/Android/iPad MISS; `homepage-cache-hit.json` passed 18/18, with all three HIT.
- The first content scan received 115 desktop MISS, 116 Android MISS and 116 iPad MISS responses. One desktop request to `/krakow-go-karting/` was reset by the remote server (WinError 10054). The failed 5,485/5,486 report remains in `clean-cache-transient-connection-reset.json`; it was not ignored or treated as a passing release.
- A complete ordinary-URL rerun passed 5,500/5,500 at 17:54:24 UTC in `../full-migration/readiness-staging-clean-cache.json`, including the interrupted route (MISS on retry) and all 119 public asset hashes/version tokens. No further purge was needed.
- The final repeat passed 5,500/5,500 at 17:56:24 UTC in `../full-migration/readiness-staging-cache-hit.json`: all 116 routes returned HIT on each of desktop, Android and iPad. All responses retain staging canonical/noindex and current owned assets; incoming booking links target the storefront and integration loaders are not duplicated.
- `tools/update-code-migration-status.mjs` now reports deployed/release/cache verification true. All 116 route statuses are `staging-verified-visual-exceptions-documented`. The strict historical screenshot suite remains false, not silently waived. Owner visual review and a separately authorized production cutover remain outstanding.

## Repeatable Edits

Keep original captures immutable. `tools/code-pages-content-revisions.mjs` applies the approved DOM changes with source-contract assertions; `tools/booking-destinations.mjs` is shared by page and homepage generators. Rebuild with `node tools/build-code-pages-all.mjs` and `node tools/build-homepage-parity.mjs`. Revisions deliberately fail when a replaced source contract has changed; review/update that revision rather than silently applying it twice to a recaptured, already-correct production page. Do not manually edit generated HTML/PHP/CSS.

Page build verification now compares source content after explicit approved revisions and independently validates production SEO policy. New readiness tests separately assert the actual dates, price, TBA text, review counts, mapped products, absence of legacy links/widgets and working header bounds. Original screenshot failures are not erased by those content approvals.

## Production Boundary

`production-seo-baseline.json` records fresh production responses for all 116 routes: all have `max-image-preview:large`, none has noindex. The Team Building article omits a canonical in production; preserve that absence during this parity cutover rather than silently introducing an SEO change. Other canonicals match their existing URLs. Policies are generated into page definitions, with source identity checks before opted-in production rendering. Staging always emits noindex and a staging canonical.

`tools/prepare-code-pages-production.ps1` only reads owned production paths through an FTP proxy that rejects mutation commands. `production-dry-run.json` confirms local/staging parity, zero existing production code-page payload files and zero remote writes. It cannot publish, upload helpers, enable production or purge caches. The actual production release still requires separate authorization, original owned-file/posts/settings backups, dependency verification, activation last, production smoke/indexing/integration checks, and scoped cache MISS/HIT validation. Disable activation first for rollback so original WordPress/Divi routing resumes.

Indexing semantics reference: [Google robots meta/header rules](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag). Staging testing/cutover principles: [Google migration testing guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes). This migration changes rendering, not hosting/DNS; DNS changes are not part of the release.
