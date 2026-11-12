# Customer cart experience updates

Customer-owned unpaid carts keep one complete selection per product/date/start time. Editing guests or extras replaces that selection; different dates and start times remain distinct. Staff-prepared links preserve their authored lines. Paid order snapshots remain intact.

The product form prefills the existing selection and offers Update booking and Undo. Same-browser writes preserve newer unrelated selections and reject stale Undo. Server revisions require explicit review of an outdated device draft. The customer keeps the displayed selections rather than downloading another device's private cart. Payment confirmation locks editing; the backend blocks processing payments and retains the old order snapshot if payment wins a cancellation/edit race.

Backend implementation and tests are in OmniLodge PR [238](https://github.com/pablo-dryfield/omni-lodge/pull/238). The backend must deploy successfully before this frontend is promoted.

## Validation and release evidence

- Frontend `npm.cmd run test`: 42 passing tests; `npm.cmd run build`: passed.
- `php tools/tests/test_storefront_proxy.php`: eight passing contract checks. Nested OmniLodge error messages and HTTP statuses are preserved by the WordPress proxy, so revision/payment warnings reach the actual customer UI. Version fields pass through unchanged.
- `node tools/test-cart-experience-updates.mjs http://127.0.0.1:5173/ local`: 18 passing checks at 390 and 1440 pixels, no JavaScript errors.
- The same suite on staging: 18 passing checks. Eight existing WordPress Facebook reference errors (`FacebookSignal`/`fbq`) are recorded separately; no new application errors were observed.
- The browser suite intercepts quote, checkout, activity and payment requests. Stripe is simulated locally to hold payment confirmation and inspect disabled controls. No live orders, payments, recovery emails or customer data changes are made.
- Backend full suite: 340 passing suites / 3,421 passing tests / one skipped. Final focused rerun: six suites / 85 passing tests. Backend type check passed.
- `staging-publish.json`: ten SHA-256 matches and only staging storefront origin-cache invalidation.
- `production-dry-run.json`: ten files and `local_matches_staging: true`.
- `release-manifest.json`: hashes for the exact payload and the reproducible source/payload archive. Preserve the before-change archive and the publisher's remote rollback archives in `deploy-backups`.

## Production release completed

OmniLodge PR 238 merged as `d5c41687e3cce5f59f8942057a5329bc87fe91b2`. CI run `42088128196`, release `42090567211` and production deployment `42092713057` succeeded. Backend readiness and UI artifact validation both identify `omnilodge-r42090567211-a1-d5c41687e3cc`. `backend-production-verification.json` records live quote-only replacement and distinct NYE time checks; no carts, orders, payments or emails were created.

`production-publish.json` records ten verified production files and unchanged plugin activation. Rollback backup: `deploy-backups/ktk-storefront-production-20261105-192803.zip`. The storefront origin cache was cleared. The configured WordPress Cloudflare integration was unavailable, and an Android cached HTML variant initially retained old asset references; that evidence is preserved in `production-assets-before-cache-purge.json`.

The owner performed the Cloudflare purge. `production-cache-first-pass.json` verifies current HTML asset-version references and exact JS/CSS hashes for desktop, Android and iPad as MISS; `production-cache-final.json` verifies all three again as HIT. Current JS SHA-256: `d5ed4141f794dcde19a8691c2ee57513df3b034a45f1af4e9973b070d4b93c55`; CSS: `e1265119094141579fa8302b1104b81377a31a0fa97e580f12e6387d65e56e21`.

`production-browser.json` passed all 18 isolated mobile/desktop checks, including server conflict review and pending-payment UI locks. Existing Facebook reference errors are recorded separately, matching staging; no new application errors were observed. `production-proxy-contract.json` verifies a real non-mutating request preserves the backend error message through WordPress.

No homepage, content-page migration or Food Tour frontend files were deployed by this release. Browser tests used isolated contexts and simulated payments. The owner’s ordinary browser storage was not changed.
