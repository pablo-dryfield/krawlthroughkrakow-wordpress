# Booking Friction And Keyboard Recovery

Staging-only D04/D03 review of date/slot selection, guests, add-ons, discount
replacement, total transparency, cart editing/Undo and error recovery. This is
not permission to change prices, availability, payment logic, provider accounts,
consent, production, protected Ecwid or OmniLodge. Real test purchases, emails,
cart writes and provider measurement requests are not allowed in these checks.

## Starting State And Backup

Previous PR56 is merged as `e1c491915f07305d7150994e0dc89f052dfd34a4`, exact
tree `a0a79f6ca8def66635c7e2c16fa3eb9fb7fb1503` matching final04884a5.
Final CI43622667578 and main43622807260 pass both jobs. Completed feature
branches were removed; only the clean root worktree remained. The city/vodka
application stays staging-verified; no extra upload/purge is needed for it.

Current branch is `codex/staging-booking-friction-audit`. Before edits,
`deploy-backups/seo-booking-friction-before-20261114.zip` passed exact3,315
Git-blob/file-set and ZIP CRC verification, SHA256
`ee79d902dbd5d55b250ad119aaa148fdd9dc2517ee3a530ae1261700e90d8793`.
This is tracked-code backup, not a hosting filesystem/database snapshot.

The read-only public catalog capture contains24 products and cancellation
text, with response SHA256s. No private customer, cart, order, payment or
Clarity recording was read. Browser tests use isolated contexts, synthetic
fixtures and strict request interception; a fulfilled fake API response is not
proof of the live backend's monetary calculation or provider receipt.

## Reproduced Finding

Fresh live staging probes at390 and1440 show `BODY` receives focus after both
Escape from the date picker's month navigation and selection of an available
date. Both lose the trigger's focus, despite closing the popup. Neither probe
attempted a first-party write. Custom quantity selectors already restore their
trigger, so this is inconsistent keyboard recovery rather than an intentional
navigation rule. The planned fix is only a date-trigger ref and focus return on
Escape/selection; outside-pointer dismissal must not steal focus from the
customer's next control. Prices, dates, availability and submit handlers stay
exact. The full D04 review is not complete merely by fixing this finding.

The initial calendar harness22/35 is retained, not a valid pass: it attempted
to click a guest selector physically beneath the open calendar, and compared
CSS-uppercase innerText against mixed-case date labels. An independent probe
confirmed the popup legitimately covers that underlying control while open.
The corrected outside-pointer check uses the accessible gallery button above
the picker, and exact textContent verifies the selected date. With unchanged
application code, the corrected harness39/47 reproduces exactly eight genuine
focus failures at320/390/768/1440, with no page/harness errors or transmissions.
No application layout or assertion tolerance was changed to fix the harness.

The first attempted previous-release comparison used the older accessibility
checkpoint and correctly rejected five drifted files. The subsequent confirmed-
offer release at01:53:49UTC on13 November is the latest matching baseline:
`docs/seo/confirmed-offers-2026-11-13/staging-publish.json` matches all12 current
pre-edit payload hashes. Use that explicit verified report, not a relaxed
publication guard. No remote write occurred during these local comparisons.

## Guest-Count Validation Finding

A second isolated probe, with synthetic contact details already complete,
reproduces a zero-guest local cart:quantity0, estimate0 and men0/women0. Its
quote POST was intercepted and never transmitted. The earlier contact-empty
probe did not reach this path, so it was not proof of guest-count validation.
The public regular-product config has minParticipants0, while the existing
OmniLodge `normalizeParticipantCount` source requires at least1. This is source
evidence, not a new live backend write or proof of deployed backend arithmetic.

The candidate now retains zero as the initial gender-counter display but
requires at least1 total guest on submission, respecting any higher configured
minimum. It adds a visible linked field error, focuses the existing participant
control and clears that error when counts change. The same submit guard covers
quantity-mode products; their original defaults/options and add-on zero/No-
thanks choices remain unchanged. All pricing arithmetic, availability, discounts, cart and payment
handlers stay outside the source edit. This expands the candidate beyond the
first date-focus-only fix and needs fresh full QA/build evidence; the earlier
811 focus-only matrix cannot certify the newer source.

The first focus-only candidate passed calendar47/47, frontend60, cart/payment-
lock18 and discount-replacement8. The fresh public24-product matrix811 also
passed using the explicit current public capture: eight geometry pairs match;
only two catalogue PNG pairs are byte-identical, not all eight. Those reports
are retained as intermediate evidence, not relabelled as final guest-validation
verification. The previous fixed-input public harness now accepts an explicit
`--input` without relaxing its checks or the publisher's >=800-check gate.

The first combined selection harness85/88 and old-source69/80 are retained.
They sampled the guest-dependent add-on clamp before its existing React effect
settled, and Playwright correctly refused a click on an aria-disabled date.
The harness now waits up to5seconds for the same exact expected quantity/total,
and uses real focus+Enter on the natively enabled explanatory date control;
it separately asserts that control remains aria-disabled/unavailable. There is
no forced click, removed assertion, pricing tolerance or application workaround.
The independent rebuild's first npm CLI invocation misparsed --outDir as an
npm option and failed before transforming modules. Retry uses Vite's actual
local CLI directly, retaining the failed invocation as diagnostic evidence.

The corrected combined local harness passes94/94; the unchanged original
bundle76/86 reproduces eight zero-guest/error failures and two unavailable-date
focus failures, with no harness errors. Those differing totals include extra
error-recovery assertions only when an error element exists. Calendar47,
whole-source2372 and a fresh811 public matrix also pass for that candidate.
The independent Vite build matches all six asset hashes exactly; the initial
npm parsing failure did not modify application output. Final source review
retains the original generic quantity dropdown/defaults, rather than changing
its options independently of legacy selections. The shared minimum is enforced
on submit only, so this last scope tightening requires another final build/QA
and must not reuse the prior candidate's asset-bound results.

## Open Calendar Readability Finding

The added open-calendar axe checks expose a real existing contrast issue:
seven weekday labels per view use8px and rendered#736d6c on#171015,
contrast3.68:1. The calendar report47/49 is retained; the zero-guest state96/96
passes its two axe views with zero violations/four incomplete groups. Earlier
closed-state audits did not test this popup and must not certify it.

Three source CSS declarations now improve only that calendar: weekday12px at
0.72 alpha of the existing foreground, and date numbers14px. The original grid,
buttons, popover width, backdrop and all other CSS remain exact. This explicitly
expands the source scope to JSX/CSS and their two compiled assets; no font,
price, availability, cart, payment or provider change is included. The source
guard now reconstructs every original byte except these named replacements.

The first readability report49/53 correctly rejects computed12px date numbers:
the later `.ktk-app button {font:inherit}` reset defeats the early14px rule.
The assertion stays14px. The original early11px declaration is retained, and
one two-class calendar-only font-size rule now wins that shorthand without
changing the date buttons' other properties or adding important. Weekday
contrast already passes. This is a genuine cascade repair, not a relaxed QA
expectation; another final build and full payload-bound verification follow.

Manual390px inspection then found the shared configurator field error was only
9px. Its existing scoped font-size becomes14px (same colour, weight and1.35
leading), improving participant/contact/size errors without changing their
logic or any pristine-form layout. The final source scope is four declarations:
weekday colour/size, scoped day size and scoped field-error size. No other CSS
byte is allowed to drift. The selection harness asserts14px/18.9px and bounds;
earlier source2371/calendar53/selection96/public811 reports remain intermediate
evidence until the final error-type build and asset-bound checks pass.

## Final Local Candidate

The error-type-final build is complete. Source2371 proves exactly four changed
application files: configurator JSX, the four named CSS declarations and their
two compiled assets. All other staging Git blobs, including monetary,
availability, discount, cart, payment, provider/consent, PHP, fonts, metadata,
homepage/content and protected medical/competition files are exact. A second
Vite output directory reproduces all six final asset hashes independently.
Final JS SHA256 `1b462cfa30aa18047cd97f6073fe6c4e55b9579f6ea442af7d7e0ce91d8849e1`;
CSS `81c2df6d468dabfb99731e508b57bc40425e4b2275ac62a2a93847ed8dc4a2b4`.

| Review Area | Current Evidence | Still Not Proven |
| --- | --- | --- |
| Dates and keyboard | Final53 checks, four widths, native Enter/Space/Escape, month navigation, source date values, pointer dismissal and no date-only cart creation | Native assistive-technology/physical-device certification |
| Guests, slots and extras | Final100 public-config-bound isolated checks: zero rejected with linked14px error, error clears, three/two-guest estimates and per-person clamp, required shirt sizes/removal, both fixed NYE slots, unavailable-date explanation/focus | Actual backend quote arithmetic and add-on eligibility on every weekday |
| Cart edit, Undo and recovery |18 existing isolated checks: identity replacement, selected sizes/totals, cross-tab preservation, stale Undo, conflict review, pending-payment locks and a simulated SDK error | Completed-payment lifecycle, actual Stripe failure/retry and live processor behavior |
| Discount replacement |8 existing isolated checks: latest stored code, replacement, repeated-code deduplication and removal | Live discount applicability, quoted prices or backend discount reconciliation |
| Public rendering and layout | Final811 payload-bound checks with fresh24-product capture; eight geometry pairs unchanged and two catalogue PNG pairs exact; actual first photos visible | All-eight/old whole-page pixel equality; remaining raster differences are retained |
| Accessibility and short viewports | General176, short104, four focused axe views0 violations/8 incomplete groups; actual390px calendar/error/pub/NYE screenshots inspected | Complete WCAG, screen-reader, native keyboard or mobile-zoom certification |
| Source and units |2371 exact source checks; frontend60/shared JavaScript274; eight new tests execute real validator/date handlers extracted from JSX AST, not substitute functions | Provider receipt or backend deployment correctness |

All local finite checks are closed; read-only5190/5191 previews and existing
5184/5185 root previews remain. The12-file publisher's dry run accepts the
fresh811 report and verified previous checkpoint. Required CI, guarded staging
publication, protected-state/rollback checks, origin and normal/warmed-cache
proof remain. Roadmaps still show42 verified website batches plus this underway
batch. No production or remote application write/purge has happened yet.

The remaining D04 review must test invalid/expired-code recovery, add-on weekday
eligibility, broader payment/cancel/paid-state recovery and appropriately
consented real journey evidence. The current Monday add-on fixture does not
certify other days. Neither synthetic estimates nor isolated data-layer checks
can certify real charges, paid-order protection or provider receipt. No new
payment/OmniLodge deployment is authorized here.

## Verification Still Required

- Source-bound before/after calendar tests, including unavailable dates and
  pointer dismissal, narrow/desktop viewports and fixed NYE slots.
- Guest/add-on limits and variants, single-code replacement, exact displayed
  fixture totals, cart editing/Undo, stale-tab protections and pending-payment
  recovery using existing isolated fixtures. No actual Stripe/payment requests.
- Exact source inverse and unchanged non-focus application files, build/unit/
  public-content regressions, snapshots and manual keyboard inspection.
- Required CI, guarded staging-only12-file publication using its exact verified
  previous-release baseline, protected state/production checks, rollback and
  scoped cache verification. Do not weaken existing publication requirements.
- Consented-recording/account-side evidence, live fee/revenue reconciliation,
  real assistive-technology/manual checks and production approval remain
  separate requirements; do not infer these from synthetic fixtures.
