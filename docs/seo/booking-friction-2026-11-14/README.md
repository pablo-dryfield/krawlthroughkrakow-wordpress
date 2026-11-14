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

## Final Local Candidate Before Publication

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

## Staging Release And Cached Verification

Application `6e484b64d3faa799681fe9895b782834b6b6c886`, PR57, passed required
CI43626880631 (both jobs) before manual staging publication. The guarded12-file
publisher finished at18:32:09.359735UTC on14November. All12 final hashes match;
2,315 protected staging files,2,158 production files and saved WordPress state
are unchanged. Probes were removed and only the staging storefront origin
cache was cleared. Only compiledJS/CSS differed from the previous remote
payload; the four-file source guard still passes2,371 checks after publication.

Remote rollback `deploy-backups/storefront-public-staging-20261114-183135-724081.zip`
has exactly13 entries (manifest+12 originals), independent per-file SHA/entry-set
and ZIP CRC verification, archive SHA256
`52ce6742cd73ef005a1e02e15f38fc5df1ed68f9f9e3cee4bc1452e083bd5077`.
The pre-edit3,315-blob Git backup above remains separate.

After successful origin checks, the authenticated Cloudflare MCP accepted
only these two staging prefixes at18:41:28.844UTC, with the exact active
zone/account validated in the same call:

```text
krawlthroughkrakow.com/staging/store2/
krawlthroughkrakow.com/staging/wp-content/plugins/ktk-storefront/
```

No domain, production or whole-staging purge was sent. API acceptance alone is
not the cache proof; the following clean URL checks provide it:

| Evidence | Origin | Normal URLs | Warm Repeat |
| --- | --- | --- | --- |
| HTTP/public HTML/current asset versions |692/692 at18:34:39.979010UTC;75 DYNAMIC |692/692 at18:43:02.747147UTC;75 MISS |692/692 at18:46:57.746103UTC;75 HIT |
| Four-width calendar recovery |53/53 source-bound run |53/53 `calendar-normal-settled` |Covered by repeat asset/version proof, not a third browser claim |
| Guests, extras and NYE selections |100/100 source-bound run |100/100 `selections-normal-settled` |As above |
| Actual public rendering |240/240 |240/240 |No third browser run claimed |
| General accessibility/short windows |176/176 and104/104 |176/176 and104/104 |No third browser run claimed |

The final390px cached calendar and linked participant-error PNGs were inspected.
The four focused axe views retain zero automated violations/eight incomplete
groups, not full WCAG or assistive-technology certification. No real cart,
quote, order, payment, email, consent change or provider event was transmitted.
Both roadmaps now count43 staging-verified website deliveries. D04 remains
partial; this is not approval to promote website SEO or payment logic.

### Retained Live-Test Diagnostics

The initial origin52/53 and99/100 reports failed only the strict page-error
gate: the existing WordPress Meta Pixel call raised `fbq is not defined` while
external provider scripts were blocked. A separate read-only production/staging
comparison independently reproduces the same exact inline call and stack.
The focused harness now classifies only that exact source/location; modified
code, bundle exceptions, extra frames and unknown errors still fail.

Cached WP Rocket pages transform those two Meta dependency calls to data URLs
and defer/replay the first input. Initial normal6/11 and37/38 reports and the
first readiness-only retries are retained, not relabelled. They read popup
state before the optimizer finished replaying the event. The corrected harness
waits at most5seconds for the same exact expected dialog state after native
input, without forcing clicks, changing expected focus, loosening geometry or
editing application/optimizer code. It also checks the existing public-content
handoff before testing controls. Initial-load latency and provider behavior are
not certified by these post-handoff controls.

The normal source diagnostic confirms both exact Meta exceptions on production
and staging with external/non-read requests blocked; neither is a new storefront
exception. The classifier pins the two literal payloads, source occurrence and
stack position; it never ignores an error by message alone. Four offline tests
include altered-source/location/duplicate/bundle negative cases. The first
normal diagnostic incorrectly inspected the transformed DOM after its inline
scripts had moved to data URLs; its failed report remains. The follow-up parses
the unchanged response HTML through DOMParser and passes. These are QA-only
changes: tracking, consent and application assets are untouched. Normal focused
reports retain8 calendar/28 selection dependency errors separately, not fixed.

## Remaining D04 Verification

- Invalid/expired-code recovery and add-on eligibility on every configured day;
  the current isolated replacement tests and allowed-Monday fixture do not
  certify either population.
- Broader payment/cancel/retry and completed-order safeguards, with separate
  scope/approval before any payment implementation or actual Stripe requests.
- Consented journey/provider receipt and approved aggregate paid-revenue/fee
  reconciliation; isolated estimates/events cannot establish these.
- Physical-device, screen-reader and zoom checks, owner review and separate
  production approval. The held medical article and active competition/form
  remain untouched.

Final QA-only follow-up passes shared JavaScript278, Python215, roadmap317 and
source2371. Both roadmaps are regenerated; required final CI and exact-tree
merge/branch cleanup follow without another application upload or cache purge.
