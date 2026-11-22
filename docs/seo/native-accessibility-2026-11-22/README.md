# Keyboard and native zoom review on staging

Delivery83 is staging verified. It restores link, gallery, menu-toggle and form-control keyboard focus; adds a product map-link outline; and keeps the primary booking tab available on short screens. The native Chrome sample covers eight templates at 200% and 400%, at the scopes below. This does not close the wider D03/H03 accessibility requirements. Real screen-reader review stays assigned.

The same batch has no source commit, push or PR yet. One consolidated publication follows this verified staging work; current candidate and actual-main CI must then pass. Production and D08 are excluded.

## Installed changes

Five source files change: the shared CSS definition, two generated classic-page stylesheets, storefront CSS source and its compiled stylesheet. All JavaScript, PHP, fonts, copy, destinations, images, form recipients/validation/submission, commerce and functional consent code remain exact. The form follow-up changes only three of the current3,983 tracked files; all3,980 others are byte-identical to its pre-edit snapshot. The generated styles reconstruct their exact predecessors when the new form rule is removed, including retained Halloween additions.

| CSS | Original main SHA prefix | Current staging SHA prefix |
| --- | --- | --- |
| Homepage parity runtime | c49dedd14c42 | de405b3a4fe5 |
| Code-page runtime | 57b9001853ed | 816208bacc9a |
| Storefront | 9050f5eb7699 | ba5dab47a62b |

Owned links use a white/black marker, gallery links contain their image-bound inset frame, the compact menu toggle has a white inset outline, and contact-form controls have a black/white marker. The short code-page header leaves44px clear of the primary booking tab. The duplicate legacy left strip is hidden only at heights<=450px; the main BOOK NOW tab and ordinary booking links remain. Product map links use a yellow outline.

## Current staging verification

The final fresh two-CSS transaction retains all2,395 protected file hashes and selected WordPress options/published-content state through final verification. This is a finite selected-state comparison, not whole-host/all-database proof. Its six-member originals/candidate/snapshot archive reopens with matching bytes and CRCs: SHA256 `8095854a583eac4bd101b66b49253d7467e9f7c2b901bbc68852de308976ef3c`. Own helpers and temporary uploads are removed and parent listings verified; transport automatic retries and uncertain operations are zero. The earlier original archives a23c0fb0 and af5cdc69 remain retained. No expired B03 engine or retained recovery data was touched.

After one fresh staging-only native origin-cache refresh, two exact-file Cloudflare requests cover117 affected classic HTML URLs and6 old/current/bare CSS identities. No store/production URL or configuration change is included. All142 normal HTML responses pass200/title/noindex/self-canonical/current-version checks:116 MISS/26 HIT, then all142 warmed HIT. Seven sampled runtime assets are exact and warmed HITs.

Current browser checks use actual staging assets without overrides:24 views at768x350,384x175 and1440x900 CSS pixels,896 Tab observations,13 menu checks and48 exact form-focus frames. Axe violations, horizontal overflow, browser errors and completed non-read requests are zero. All51 runtime asset responses are exact HITs; HTML is DYNAMIC in all24 intercepted browser contexts. Normal HTTP cache proof is separate. Prior36 product open/dismiss/focus-return checks retain their unchanged-JavaScript scope. No form values, dates, quantities or times were selected; no booking/order/message was submitted.

Local shared-style generation/idempotence checks pass7 cases. The fresh guarded transport/complete prepare-publish tests pass17 cases; actual-PHP native-cache guards pass7. Earlier69 frontend tests/build and exact unchanged JS/font outputs remain scoped evidence for the unchanged storefront map rule. Source/publication CI is still pending.

## Native Windows Chrome sample

These are visible keyboard and screenshot observations, not headless viewport emulation or a screen-reader pass. Samples before the form-only follow-up retain their exact unchanged link/menu/storefront rule scope. Current Contact/Jobs form focus was then verified after that follow-up.

| Template | Observed sample |
| --- | --- |
| Home | Menu ArrowDown/Escape and visible toggle focus; complete focused BOOK NOW label at200%/400%; hero booking-link focus at200%. |
| How to Join | Menu entry/return, floating booking-tab focus and wrapping ordinary booking-link focus at both zooms. |
| Meeting Point | Menu entry/return and floating booking-tab focus at both zooms; joining-information link focus at400%. Embedded map controls excluded. |
| NYE guide | Menu entry/return, floating booking-tab focus and main booking-link focus at both zooms. No booking link activated. |
| Contact | Menu/booking-tab sample at both zooms. Current empty Name/Email/Message/arithmetic focus at400%; repaired Submit frame visible at both zooms. No answer or submission. |
| Jobs | Menu/booking-tab sample at both zooms; gallery and guide-blog focus at both. Current nine empty fields/arithmetic/Submit traversed at400%; Name/Submit sampled at200%. |
| Regular product | Calendar opens; Tab reaches Next month; Escape returns date focus at both zooms. Zero-men list and Polaroid information dismissal/focus return at400%; cancellation/map-link yellow focus at200%. |
| NYE product | Start-time list opens/dismisses without selection at both zooms; zero-men trigger opens/dismisses. Configured fixed date observed at200%; no editable date/add-ons claimed. |

Chrome's original67% zoom is restored. Only owned task tab67761 was closed once; all five original tabs remain, with Page indexing active. No further native cleanup remains for this task.

## Limits and retained failures

The existing privacy widget partly overlaps some lower content/focus corners at400%; the owned BOOK NOW tab partly overlaps some form edges. Focus labels in the accepted samples remain readable. Jobs' long phone placeholder ends are clipped at400%, so the full instruction is not visually accepted there. Tall gallery photos, calendar and option lists do not fit wholly in the short viewport; complete traversal/whole-page acceptance is not claimed. Zooming Jobs moved the viewport away from focus; subsequent Tab navigation scrolled focus into view. These limits and wider device/AT review remain under D03/H03; functional consent was not changed.

Axe manual incompletes remain for contrast, embedded frames and regular-product ARIA/name checks. Native focused_element metadata can remain at the address bar, and immediate captures can omit paint; accepted results use actual keyboard behavior and settled visible captures. Neither AX/axe nor this sample certifies whole-site WCAG conformance.

Retained failures include the original native gray menu marker and absent form marker, the failed two-file preparation's fixed eight-member assumption (zero CSS writes), two contrast probes that misread RGB alpha, and the first form probe sampled during an existing button transition. Corrected probes wait for actual transition completion and retain exact colour/width requirements. A combined unittest discovery treated a successful entry script's SystemExit as an import error; separate appropriate17/7 invocations pass. Earlier blocked-provider/React-state/control assumptions, Windows ESM path, anonymous-UA403 and the failed232-capture local run without its required preview remain unaccepted evidence, not replaced by success claims.

Screen-reader and broader device/human review remain assigned. Production/D08, commerce/Ecwid, forms and functional consent boundaries, medical hold, owner business decisions, recovery retention and expired-engine no-replay remain intact. D03/H03 stay open; counts remain83 staging deliveries/87 records/eight original batches.
