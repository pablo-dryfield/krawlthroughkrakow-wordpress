# Single-Code Discounts and Calculation Settings

Owner authorized OmniLodge and storefront deployment on 2026-10-08 and selected
configurable tour-only versus tour-plus-add-ons scope per code.

## Scope

- One discount code at a time. Applying another replaces the browser selection;
  the server rejects multiple distinct codes, including legacy API fields.
- Discount configuration: fixed or percentage, per booking or per person,
  tour-only or tour-plus-add-ons, and existing product eligibility.
- Existing code amounts/default behavior and historical orders are unchanged.
- Per-person fixed discounts count ticket participants, not cocktail quantities.
  Percentages are never multiplied by participant count.
- Unsupported Ecwid rules cannot be exported or overwritten by coupon imports.
- No homepage, attribution or unrelated OmniLodge changes.

OmniLodge source branch: `codex/storefront-discount-basis`, PR
<https://github.com/pablo-dryfield/omni-lodge/pull/180>.
Calculation and compatibility details: OmniLodge
`docs/storefront-discount-rules.md`.

## Recovery

Pre-edit frontend source archive:
`deploy-backups/storefront-before-discount-basis-20261008-202242.zip`, SHA-256
`CEDBA95788F6FC193D8E77E90A8D586977F3735D84B59B5511177F44D8365A85`.
Staging pre-publish payload:
`deploy-backups/ktk-storefront-staging-20261008-183904.zip`.
No database migration or live coupon modification is included.

## Validation

- Backend typecheck passed; 259 suites / 2,207 tests passed, one skipped.
- Admin UI typecheck/lint passed; 113 suites / 759 tests passed with two workers.
  Initial in-band Windows full-suite run stalled and was stopped; its log remains.
- Storefront build and all 29 unit tests passed.
- Isolated Playwright cart replacement/removal and legacy-storage checks passed
  at 390 and 1440 widths. Actual admin form dropdowns/save payloads and responsive
  checks passed at both widths. All writes were intercepted or mocked.
- Staging published 10/10 SHA matches; production dry run confirms local/staging
  parity. `staging-verified-browser.json` passes all eight cart checks.
- Live staging retains unrelated legacy `FacebookSignal`/`fbq` reference errors.
  These are recorded separately, not suppressed from evidence. Local cart and
  admin component runs have no JavaScript errors. No global integrations changed.
- Earlier live test failures were the consent banner blocking interaction and a
  fixture being re-seeded inside same-origin frames. The final harness rejects
  consent using the real control and seeds only the top-level frame.

## Verified Production Release

- OmniLodge PR 180 merged as `e88d47ff1d218414d0ca8dc9f5454f4f52e84b29`.
  Release `37826332063` and production deployment `37828063452` succeeded.
  Backend readiness and UI artifact health both identify
  `omnilodge-r37826332063-a1-e88d47ff1d21`; see `production-health.json`.
- Storefront staging and production each contain 10 checksum-verified files.
  Final dry run confirmed `local_matches_staging: true` before promotion.
  Production backup: `deploy-backups/ktk-storefront-production-20261008-190608.zip`,
  SHA-256 `47B0AD655288B9BB3BDF1B7B32F37F5BCEC2C75E9E405AFDAD452AC6611D2A55`.
- Deployed JavaScript SHA-256:
  `c170af852577cc0d35a9d228efd2bfdde1f9112d1c4fc31bb73be8cf73bbdc9e`.
  CSS remains `e1fbfded953c58363d406380faa5da855e01ba19fa6c47a1118d2755e5168517`.
- Origin cache was cleared only for storefront paths. Cloudflare Custom Purge
  used only `krawlthroughkrakow.com/staging/store2`,
  `krawlthroughkrakow.com/staging/wp-content/plugins/ktk-storefront/assets/`,
  `krawlthroughkrakow.com/store2`, and
  `krawlthroughkrakow.com/wp-content/plugins/ktk-storefront/assets/`.
  No cache settings or homepage files changed. Staging was verified current by
  18:53:42 UTC; production by 19:07:43 UTC on 2026-10-08.
- `production-clean-assets.json` confirms desktop/Android/iPad HTML MISS with
  current asset references and byte hashes. `production-cached-assets.json`
  confirms all three HTML and asset variants HIT with the same release.
  Staging evidence: `staging-clean-assets.json`, `staging-cached-assets.json`.
- `production-final-browser.json` and `staging-final-browser.json` each pass
  eight responsive replacement/duplicate/removal/legacy-storage checks. Those
  browser quote requests were intercepted; no real cart/order was submitted.
- `production-api.json` independently verifies the real OmniLodge API and the
  WordPress proxy reject two codes with HTTP 400. One existing 8.33% code on a
  240 PLN subtotal deducts 19.99 PLN, total 220.01 PLN. These requests omitted
  cart/session identifiers and returned `ongoingCart: null`.
- The first API fixture omitted the product's required participant breakdown;
  it was corrected to one man/one woman. The WordPress proxy currently replaces
  nested backend validation text with its existing generic catalog error; the
  report retains that response. This unrelated message handling is unchanged.
- New per-person/scope persistence and pricing combinations are covered by local
  backend/admin tests; no test promotion or historical paid order was modified
  in production. Existing legacy Facebook reference errors remain documented.
- After merge and live verification, the clean task worktree
  `omni-lodge-discount-basis` and local `codex/storefront-discount-basis` branch
  were removed. Its tree matched `origin/master`. The unrelated main worktree
  changes and Tripadvisor worktree were left intact. All task test/deploy
  processes completed and isolated browser contexts were closed.
