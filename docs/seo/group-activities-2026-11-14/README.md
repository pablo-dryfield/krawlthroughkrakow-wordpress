# Group Activity Claims Review

## Scope And Authority

Staging only. The owner confirmed that group sizes, private arrangements,
lead times, deposits and cancellation terms belong in each individual quote.
This batch reviews seven inner text modules on the stag and hen pages, not
the entire activity catalog. No production SEO promotion, commerce, form
backend, plugin, consent or OmniLodge change is authorized here.

Pre-edit full tracked-source archive at main `b2475ab`:
`deploy-backups/seo-group-activities-before-20261114.zip`, SHA256
`14df4c0db3da90782cbccc44af062d6839f606b330ea85be0fb5b1de53cbb478`.
All3217 Git blobs/file set and ZIP CRC were independently verified. This is
a tracked-source checkpoint, not a full server/database backup.

## Editorial Decisions

- Qualify brewery private-room/TV/capacity promises with the actual quote.
- Distinguish a football enquiry from confirmed exclusive pitch hire.
- Distinguish shared boat parties from private charters and confirmed extras.
- Remove the absolute strip-club safety guarantee; add current official advice.
- Replace unsupported kart specifications, group minimum, race format and free
  beer promises with questions for the actual quote. Remove the unrelated
  restaurant text accidentally copied into that same go-karting section.
- Describe life drawing as an enquiry option, not an automatically private
  two-hour workshop with food and unlimited drinks. Retain useful inclusion
  questions without inventing a new package or rate.

Existing activity headings/options remain, including the private-boat
enquiry choice. No new admission, availability, price or safety guarantee.
Photos, forms, recipients, buttons, original IDs, metadata, intro policy, styles
and runtime must remain exact outside those seven module bodies. A scoped
text-alignment/mobile-clearance stylesheet is the only style exception.

Sources checked14November2026:

- [FCDO Poland safety advice](https://www.gov.uk/foreign-travel-advice/poland/safety-and-security):
  drink spiking and overcharging warnings. This supports practical precautions,
  not a judgment about any named venue or a promise that KTK removes all risk.
- The owner's individual-quote decision in this conversation supplies business
  policy; specific historic capacities/durations/extras have not been reverified.

Current operational information is separately pending: the city and FCDO report
the7November Main Square incident. The owner was asked whether existing9PM/Adam
Statue instructions remain unchanged. No operational detail or incident notice
is changed in this batch, and no assumption about disruption is published.
[Official city report](https://krakow.pl/aktualnosci/345151,29,komunikat,strzaly_na_rynku_glownym__na_miejscu_sa_sluzby.html).

## Implementation And Evidence

`tools/group-activities-editorial.mjs` validates immutable source captures,
allowlisted templates, every original target and the existing enquiry form
before changing the first module. Repeated builds are idempotent; unknown
source/markup/identity drift fails closed. Generated bodies are never manually
edited. Build, exact-source, responsive/keyboard, intercepted-form and cached
release verification are pending. The specialist medical hold is untouched.

Initial local browser152/160 retains eight genuine320/390px text-column failures
under the floating CTA, with no browser errors. The follow-up adds only24px
right padding to the seven reviewed modules at600px and below, plus left text
alignment. No clipping, content hiding or relaxed collision assertion.
The next local8-view axe run found one real768px target-size failure: the
karting row's800px maximum height was smaller than its939px content, so the
following transparent Airsoft row intercepted most of the booking button.
The scoped marked karting row now uses intrinsic height. All three vertical
button hit points are added to every tested JS/no-JS width, not just a visual
check or a stacking-index workaround. Other sections' styles remain exact.
A height-auto-only attempt retained the same axe failure and failed all12
new button-hit checks (local160/172). Computed-style/CSSOM diagnosis identified
the actual `max-height:800px` cap. The final rule removes only that cap on the
marked karting row; it does not add a competing fixed height or global override.
The failed reports remain separate and the hit assertions are unchanged.
Initial build2317/2320 retained three expected-copy failures because its reference
DOM did not yet execute the new recipe. The verifier now executes that same
source-bound recipe before comparison; all existing full-text/heading assertions
remain, not a general normalization or removed content check.
An initial style insertion between two previously adjacent guarded blocks was
correctly rejected by the costume-style generator before page rebuilding.
Only the new local block was removed and its insertion anchor moved before
the costume block; the pre-existing adjacency guard was not weakened.

## Local Release Checks

Final full116-page build passes2320/2320. Source2377/2377 proves exactly two
bodies and the bounded new CSS block differ; all other application Git blobs
and the original media/style manifest `f5ad7b27...` are exact. Final browser
172/172 covers raw/prepared/idempotent recipes,13 atomic-negative fixtures,
24 JS/no-JS responsive views and12 complete karting-button hit areas.
Eight final axe views report zero violations and18 incomplete rule groups;
these are not manual accessibility certification. The7 actual390px module
viewports were visually inspected: readable, no reviewed text under the CTA.
Surrounding older sections are not thereby certified or pixel-identical.

Python214, JavaScript181, new source units6, PHP integration763, forms31
(mail stubbed) and NYE143 pass. Final guarded2073-file staging dry run passes.
An earlier dry run correctly stopped before connection because the fresh full
build-verification process had not finished updating its payload binding.
That guard remains; no upload occurred on the failed attempt.
Final group-introduction354/354 and intercepted-form501/501 regressions also
pass.

## Staging Publication And Cache Verification

Application `47c9b54b6b1680ec4758a6f15a6094fc0f091cac`, PR46, passed both
required jobs in run43564776821. Guarded manual staging publication completed
at2026-11-14T06:09:16.250588UTC: all2,073 owned hashes match, saved WordPress
state, homepage and storefront unchanged, temporary helper removed.
Six-entry rollback ZIP CRC independently verified:
`deploy-backups/ktk-code-pages-staging-20261114-060856.zip`, SHA256
`54eee3012492414129015ca616ad9e099ead7da15a50d8956649ab6a77d37a62`.

Focused local/origin/normal browser172/172, group354/354 and intercepted
forms501/501 pass. Attribution143/143 origin/normal, discovery243 origin and
216 normal/repeat, unchanged homepage10 assets, image21 and font20 checks also
pass. The repeat homepage check has all three device variants HIT.
Fresh API permission and exact zone/account checks preceded only the staging
prefix purge at06:17:30.899UTC. No production or account-setting change.

Each full report covers116 routes on desktop/Android/iPad plus119 public assets,
passes6,193/6,193 and has zero HTTP retries:

| Report suffix | Completion UTC | Device/page cache responses |
| --- | --- | --- |
| `origin-20261114.json` |06:17:05.976412 |348 DYNAMIC |
| `normal-20261114.json` |06:22:27.246135 |302 MISS /46 HIT |
| `repeat-20261114.json` |06:24:17.537905 |348 HIT |

Full report prefix: `docs/code-pages/full-migration/group-activities-`.
Both roadmaps now count33 staging-verified website deliveries. Remaining
activity/article review, actual inbox assurance, operational confirmation,
manual accessibility and production approval remain distinct work.
No application byte changed after the CI-tested commit. No production,
commerce, consent or OmniLodge deployment is part of this release.

Initial local/cached390px screenshots are only3/7 byte-identical; the other four
remain as evidence, not a pixel-pass claim. A separate decoded-image diagnostic
confirms the strip-section JPEG is sharp after decoding: both local and cached
browsers select the same480px candidate for312px display width. Its first cached
screenshot caught a progressive image mid-decode. This diagnoses that example,
not every difference. The test-only screenshot follow-up now explicitly waits
for visible images to complete and decode, using fresh evidence directories.
No application bytes, image files, masks or tolerances are changed.

Fresh decoded-image browser runs also pass172/172 locally and on normal cached
URLs. Their full-viewport PNGs are only2/7 byte-identical (`pixel-decoded.json`);
five strict differences remain, including image regions above/below the text.
This is not a whole-page pixel-parity pass. All eight normal axe views have
zero violations/18 incomplete rule groups; the earlier real target-size failure
and all preceding screenshot reports remain. Source2377/2377 after publication
again confirms all application bytes outside the reviewed scope are exact.

The final changes after47c9b54 are QA/docs/roadmap only. No additional website
upload or cache purge is required for final CI, merge and branch cleanup.
