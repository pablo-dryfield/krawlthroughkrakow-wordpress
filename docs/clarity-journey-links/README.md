# Clarity and storefront history

Owner-approved scope: correlate storefront history with the company Clarity project, and deploy the compatible OmniLodge/backend UI plus storefront. No pricing, order/payment, tracking ownership, consent-provider or sampling changes.

## Implementation

- `frontend/src/clarity-recording.js` subscribes to Clarity's exported metadata callback and captures only validated native project/user/session IDs after playback mode and current analytics consent. Production only; staging stays disabled.
- Live configuration checked on 2026-11-11: production replay enabled, company project `z9d5iuilvn`, storefront sample 20%, analytics consent required; staging replay disabled. Non-sampled visits may passively link an already-existing site-wide full-playback recording, but never load a library, grant consent or start/upgrade replay outside the sample.
- Reference events use the existing bounded journey queue and authenticated cart activity endpoints. No database migration or new tracking endpoint.
- OmniLodge PR [246](https://github.com/pablo-dryfield/omni-lodge/pull/246) adds strict event normalization and shared replay controls. Payment Links/ongoing/recovered carts now use the same timeline as booking manifest details and the executive booking dashboard.
- Direct links require Clarity project access. Metadata is not proof of successful upload or retained recording availability. Older histories get a copyable custom-session lookup ID, not a fabricated native URL. Existing retention, consent, sampling and ad-blocking limitations remain.

API evidence: [Microsoft Identify API](https://learn.microsoft.com/en-us/clarity/setup-and-installation/identify-api) supplies custom identities, not native recording IDs. Native metadata uses the [public SDK export](https://github.com/microsoft/clarity/blob/master/packages/clarity-js/src/clarity.ts) and [callback implementation](https://github.com/microsoft/clarity/blob/master/packages/clarity-js/src/data/metadata.ts), checked against the active SDK 0.8.77. If unavailable, capture fails closed. No cookie parsing or private Google/Clarity runtime patching.

## Recovery Checkpoint

Before edits: `deploy-backups/clarity-journey-before-20261111-115903.zip`, SHA-256 `7a69e2e87f49dd658244ae6f91473baeabef19dfe601c66e2af60107c0733cd7`.

Archive paths are relative: `src/` maps to the storefront `frontend/src/`; `assets/` to plugin `assets/`. The three original OmniLodge source files are at the archive root and must be restored only to their original service/timeline/PaymentLinks paths, after inspection. Do not extract over a repository wholesale. Remote publisher backups are separate and will be recorded below.

## Validation

- Backend check passed; full suite: 342 suites / 3,466 passing / one skipped.
- UI check passed; full UI suite: 177 suites / 1,224 passing. Focused timeline/replay/ongoing-carts: 3 suites / 20 passing.
- Storefront: 48 unit tests and production build passed. Proxy contracts: 8 passing.
- `ui-browser.json`: 13 checks, actual shared timeline at 390/1440px, valid native URLs, honest legacy states, copy-ID behavior, no overflow or browser errors. Screenshots retained.
- `capture-browser.json`: 13 checks on actual bundled tracking modules with a stub SDK, including consent withdrawal, deduplication, cart-activity transport/acknowledgment, same-page next-purchase rotation, staging exclusion and passive metadata outside the sample without loading/upgrading replay.
- `../cart-experience-updates/clarity-local-browser.json`: 18 passing responsive cart regression checks. All activity/quote/checkout/payment writes intercepted; zero real mutations.

Initial jsdom runs failed because `matchMedia` was absent, then because Jest reset its mock implementation. The fixture now uses a scoped plain-function implementation and restores the original. Application behavior was not weakened to pass tests. Existing React test-utils/act/router warnings remain in the broader suite.

The first PR-candidate CI run `43010661971` passed all 177 UI suites / 1,224 tests but failed its production build on two unused imports left after replacing Payment Links' old renderer. Commit `546a904d` removes only those obsolete imports. The failure remains in GitHub and is not bypassed. The local `CI=true npm.cmd --prefix ui run build` subsequently passed with warnings treated as errors; generated output is ignored and is not deployed directly. Fresh required CI remains the merge gate.

## Release Status

PR 246 merged as `da85313d99d408a2968523984b3943d0b475c6d1` after required CI `43012245619` passed. Immutable Release `43014192741` and managed production deployment `43016126666` succeeded. Backend readiness and public UI metadata independently identify `omnilodge-r43014192741-a1-da85313d99d4`; the managed host reports terminal success. `omnilodge-production-verification.json` binds these checks. The primary checkout is clean on synchronized master; the completed local feature branch is removed.

`final-payload-manifest.json` records the exact ten-file payload and final source/payload ZIP (`b88d531a94569d88bdbc41c56a94c8d752699fa2c1eb45d04e747aaaf7b5f670`). Current JS SHA-256 is `e647c1b2d454be8862bc6aaad1db437ecdc9c0f170fe7d0530f3f2fe3be2456d`; CSS remains `e1265119094141579fa8302b1104b81377a31a0fa97e580f12e6387d65e56e21`. The earlier `local-asset-diff.json` preserves the initial pre-passive-lookup build; it is not the final JS payload.

Staging and production each verified all ten files. `production-dry-run.json` required local/staging parity before promotion; `staging-payload-diff.json` independently shows only JS changed. Remote rollback checkpoints:

- `deploy-backups/ktk-storefront-staging-20261111-120841.zip`, SHA-256 `496c781ef7930633f7f7ba6671130b119381d2b7a6110eb66df837ca52a04b82`.
- `deploy-backups/ktk-storefront-production-20261111-121116.zip`, SHA-256 `1da24915005c166aafe9f2e0c0c51195a9692b64fb126c82833806a4792ebb95`.

Plugin activation remained enabled. The publisher cleared only each storefront's origin page-cache directory; the WordPress Cloudflare integration was unavailable. The owner subsequently confirmed **Purge Everything**, superseding the requested four scoped prefixes for this purge only.

Production `production-clean-cache-assets.json` passed all three device variants as MISS, and `production-cache-hit-assets.json` passed all three as HIT, with current references and exact owned JS/CSS hashes. The pre-purge stale desktop/Android evidence is retained. Cache-busted origin and normal-URL cart browser tests passed 18/18 in both environments; reports/screenshots are under `../cart-experience-updates/clarity-*`. All activity/quote/checkout/payment writes and Clarity traffic were intercepted in live smoke contexts. Existing `FacebookSignal`/`fbq` errors are retained separately; no new application errors occurred.

Staging has current JS/owned CSS but a **pre-existing optimizer-cache mismatch**, not a fully passing rendered-stylesheet suite. The test now handles optimizer timestamps explicitly and compares complete ordered PostCSS rules after equivalent font-URL rebasing. It does not ignore missing rules. See [the separate warning](STAGING-CSS-CACHE-WARNING.md); no CSS/optimizer setting was changed as part of this analytics release. Production uses the correct owned CSS and is unaffected.

All task-owned test/publisher processes are closed. No real orders, payments, emails or private Clarity recordings were created; no WordPress content/global integration settings were rewritten.

Private Clarity dashboard playback has not been tested: an authenticated browser connection is unavailable. Isolated tests do not create private recordings, orders, payments or recovery emails.
