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
  Release43325692291 is running; this follow-up is NOT yet deployed/verified.
  It must have its own exact artifact and actual managed-deployment proof.
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
Native Google UI agreement still awaits the owner's account login. Existing saved
exports are needed for otherwise unavailable older comparisons.

Primary sources: [Google Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
and [Google's history announcement](https://developers.google.com/search/blog/2018/01/introducing-new-search-console).
