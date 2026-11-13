# M01 Date-Coverage Follow-up

The first M01 release remains genuinely deployed and independently verified. A
later live365-day review found that its previous period reached2024-11-11, outside
Google's approximate16-month history, but still displayed a full-period delta.
This follow-up is within the explicitly approved reporting-only M01 scope.

## Source And Checks

- Source4c577de5b81e1a11c95dfcd4b2a1c730cea5e7cd, PR254, all required
  CI43323790209 passed; both PostgreSQL16/17, full hosted UI/build, isolated actual
  runtime, release tooling and migrations. Redundant same-source push CI43323737598
  was deliberately cancelled after the real PR run existed, not an application failure.
- Merged951ec3227a8d0923ab229dfcbf35f6f1253e5da8 at23:04:40UTC. Immutable
  Release43325692291 and actual managed deployment43327415186 succeeded; host
  terminal23:24:43UTC. Exact healthy-primary backend/UI/reporting bundle3/3 pass
  against provenance-checked artifact13993387336. See `date-delivery-final.json`;
  the earlier0/3 old-release report is retained. Real365-day report warns about
  the approximate2025-07-12 boundary and suppresses all four comparison deltas.
- Pre-edit tracked-source ZIP `omni-search-date-before-20261112.zip`, SHA256
  `7401520d7fd6fe28528692ffc845ebbe6e63ff29a6fa18f6d8734838aac075cf`,
  integrity verified. Backend typecheck/UI typecheck+lint pass, full backend350
  suites/3573 tests with one existing skip; focused reporting UI10/10.
- Full local serial UI1264/1265, one unchanged OngoingCartsPanel pagination timing
  failure; full log retained. Standalone original suite7/7 passes and its component/
  tests are byte-unchanged versus master. Hosted full UI passes. Do not claim a
  clean local whole-UI run or weaken the unrelated assertion.
- A direct Jest invocation without CRACO failed before executing UI tests because
  it lacked the existing TypeScript transform. Correct configured CRACO runs pass.
- Actual-page synthetic browser33/33 at320/390/768/1440: warnings, no false delta,
  keyboard filters, pagination, empty data, no overflow/errors/mutations.390px
  history notice screenshot inspected. Fixtures are not native-GSC comparison proof.

## Contract

API date coverage is separate from row coverage. It reports a conservative Pacific
history-boundary estimate and future-date flag without silently rewriting dates or
inventing missing metrics. The UI warns and suppresses deltas when either period
is limited/future/errored. Default dates also use Pacific days at the UTC-midnight
boundary. The16-month history is an external provider contract, not an arbitrary
administrator setting or a guarantee that every retained day has observations.

No booking, price, payment, consent, account setting or database migration changes.
Native Google UI agreement is complete for the explicit28-day baseline. Existing
saved exports are needed for otherwise unavailable older comparisons.

## Browser Preset Follow-up

After Warsaw midnight, live review found that UI presets still used local days,
overriding the corrected backend fallback with explicit dates. UI-only PR255 fixes
all preset calendar calculations using America/Los_Angeles; explicit custom dates
are retained. Sourceab19a827 passed typecheck/lint, focused24 tests, full serial
UI183 suites/1279 tests, synthetic actual-page49 checks across four widths/four
timezones, and all required CI43329774277. Initial runner/locator failures remain.
Merged20f0366712b40486925aa8c3229aff26aceb47e8. Immutable Release43331452337
attempt1 and managed deployment43333310604 succeeded; host terminal
13 November00:06:25.519UTC. Trusted artifact13995757715 inner SHA256
`65ffc620bb6d0049d8cc78fe95e5802d7bbe8193890bb523c3d52fb90e360d29` verified
all2804 files. Exact public3/3 proves healthy-primary backend, UI metadata and
reporting bundle `5542.914bc8a4.chunk.js` match the new release. The first0/3
pre-activation check remains preserved, not overwritten.

Actual signed-in Europe/Warsaw UI after local midnight defaults14Oct..10Nov:
958/45,215/2.12%/9.41.365-day preset11Nov2025..10Nov2026 returns
13,174/835,831/1.58%/10.75, and its previous11Nov2024..10Nov2025 period shows
the approximate2025-07-12 boundary warning with four No comparison labels. Default
unfiltered28-day view restored. Read-only Google/account/commerce state unchanged.
Docs-only PR256 mergedcb6ecc48 with required CI; no additional application Release.
Feature/merge tree equality verified before own branch cleanup, primary OmniLodge
checkout clean and synchronized to master.

Primary sources: [Google Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
and [Google's history announcement](https://developers.google.com/search/blog/2018/01/introducing-new-search-console).
