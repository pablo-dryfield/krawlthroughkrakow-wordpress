# Homepage Events in Cart History

The owner requested extending the existing cart history, not a separate database
of homepage visitors, and explicitly approved the coordinated OmniLodge release.

## Data Flow

- After analytics consent, the homepage records `homepage_viewed` and
  `homepage_button_clicked` into the existing bounded local browser queue.
- Clicks identify the visible control, its stable ID, placement and destination.
  Destinations omit query parameters; contact links use generic contact labels.
  Form controls, consent UI and WordPress administration are excluded.
- The storefront uses the same queue and visit ID. Events are sent in the existing
  cart/quote/checkout requests, then removed when the server acknowledges them.
  There is no new homepage API request, conversion event or replay loader.
- Homepage events require current analytics consent at collection and submission;
  staging events are not submitted from production. Withdrawal on the homepage
  removes pending homepage events without deleting existing cart events.
- The queue retains up to 200 events for 24 hours. Visits rotate after 30 minutes
  idle. Blocking browser storage must not interrupt booking.
- OmniLodge attaches accepted events to the existing qualified cart and displays
  the clicked button, location and destination in its activity timeline. Existing
  cart events and server retention policies remain unchanged. No DB migration.

## Source and Build

Shared queue: `staging/wp-content/plugins/ktk-storefront/frontend/src/journey-queue.js`.
Homepage collector: `tools/homepage-journey-entry.mjs`.
Generated asset: `staging/wp-content/mu-plugins/ktk-homepage-assets/journey.js`.

After changing either queue or collector, run `node tools/build-homepage-journey.mjs`.
Build the storefront with `npm.cmd run build` in its frontend directory. Build the
homepage renderer with `tools/publish-homepage-shortcode.ps1 --build-only`.

Release order: verify the compatible OmniLodge backend/UI release first; then
publish and verify storefront staging/production; publish homepage staging and
production last. Follow the normal backup, SHA verification and cache procedures.

## Recovery and Verification

Pre-edit backup: `deploy-backups/homepage-storefront-before-journey-20261008-184312.zip`.
264 entries independently verified; SHA-256:
`98225c4fd8d8ff31a87d3b28731a371f20fdb9c5c5c7f37ff7d9bd87681811be`.

OmniLodge PR: https://github.com/pablo-dryfield/omni-lodge/pull/179.
Only backend ingestion, timeline formatting and focused tests are included.
The separate main OmniLodge worktree's unrelated changes are not deployed.

`tools/test-homepage-journey.mjs` checks the real homepage markup in an isolated
browser, both campaigns, consent/withdrawal, control placement, keyboard entry,
shared visit sequencing, navigation, environment separation and acknowledgments.
`tools/test-homepage-journey-live.mjs` checks actual published consent controls and
navigation to the store, blocking cart write requests. No live cart/order is made.

## Verified Release, 2026-10-08

- OmniLodge PR 179 merged as `e2cec87a01a419357fcb1cd1c76ffc06de8c7395`.
  CI run `37815232380` passed: 258 backend suites (2,185 passed, one skipped),
  112 UI suites (757 tests), UI-server, release tooling and migration checks.
  Release run `37815254531` built the immutable package. Production deploy run
  `37817045729` succeeded. Public backend readiness and UI health both report
  `omnilodge-r37815254531-a1-e2cec87a01a4`; database readiness is healthy.
- Storefront staging and production each verified all 10 payload files. Only
  `assets/storefront.js` differs from the staging pre-release backup; CSS and
  fonts are unchanged. New JS SHA-256:
  `a25f9683828099a489f18f65541d1527ce853832aba36c1ce6071def9576ab24`.
  Production backup: `ktk-storefront-production-20261008-174141.zip`.
- Homepage staging and production each verified all 231 payload files. Production
  promotion completed at 17:53:53 UTC with WordPress settings unchanged.
  Renderer SHA-256:
  `68fca1f369bb73a416406d5d308606bc33ebd645cc696fafffbdb16f9185ce71`.
  Collector SHA-256:
  `039d09e679eeff5ca7dc2fdffe6d75a961274cf49ffeafc1da780473023dc635`.
  Production backup: `ktk-homepage-production-20261008-175203-778683.zip`, SHA-256
  `e9487a5b77caf621b5b6b012f9f4207ddbbf27f8e733f3017c9683adb7904d04`.
  Staging backup: `ktk-homepage-shortcode-staging-20261008-174303.zip`.
- Local checks: 27 storefront tests, 64 isolated real-markup browser checks,
  homepage PHP/consent tests and 44 publisher tests passed. The full local UI
  run stopped making progress and was interrupted; the complete pinned-toolchain
  UI suite passed in both CI and Release. Focused local timeline tests passed.
- Actual published homepage-to-store navigation passed 21/21 checks on staging
  and 21/21 on production, using desktop/mobile and actual consent controls.
  No cart or order was created. Staging integration checks passed 26/26;
  production homepage release checks passed 80/80 with zero page errors,
  unchanged UTM handling and single primary GTM/Ads/Clarity loaders.
- Cloudflare hostname-only purge for `krawlthroughkrakow.com` completed before
  17:56:29 UTC through the connected Krawl browser. It changed no settings and
  did not purge other hostnames. Both homepage roots then passed desktop,
  Android and iPad MISS followed by HIT checks with all 10 asset hashes/versions
  current. Production cache suites passed 19/19 twice; staging noindex remains.
  The earlier `journey-staging-clean-cache` failure documents the old edge cache
  before this purge; the subsequent MISS/HIT reports supersede it.
- The completed task worktree and local feature branch were removed after merge
  and production verification. Unrelated OmniLodge worktrees/branches were kept.
  Task-owned local preview and test processes were closed; user tabs/storage
  were not cleared. Cloudflare's user-owned settings tab remains open.

Publisher and handoff reports are in this directory. Homepage integration/cache
evidence is in `docs/homepage-production-launch/journey-*.json`,
`docs/homepage-parity/journey-staging-smoke.json`, and
`docs/homepage-seasonal-hero/journey-staging-cache-{miss,hit}.json`.
