# Contact Form Validation And Recovery

## Scope And Checkpoint

D06 staging-only work. Preserve the existing native/CF7 backends, recipients,
field names/values, form tokens, spam checks, consent, prices, orders and all
unrelated page content. No real enquiries or emails are sent by this audit.

Memorial PR37 application015aad2/final6cc4f21 passed both required jobs in
CI43532628271 and merged as `e9a7f96c971637d04c3bfb5080bb415fb487ad87`; exact
feature/merge tree `0f606269ec0a195cc54d880e6d02d69b3059bcfa`. Its scoped reference
server/worktree and completed branches were removed after verification; ongoing
root preview servers remain. No production website change.

Fresh pre-edit archive:
`deploy-backups/seo-contact-form-recovery-before-20261114.zip`, SHA-256
`c0c4f082ba08c613a32be75a540818301dbd5e64b6de8051cacd812c496a1855`.
All3168 tracked source files match archived bytes; CRC clean. The3364 ZIP entries
include196 directories. An initial file-count assertion mistakenly counted those
directories; corrected structured file-set verification passes3168/3168. This
is a tracked-source checkpoint, not a full server/database backup. The new audit
harness was untracked preparation outside PR37 and is not in that archive.

## Confirmed Finding

The native forms retain a hidden `name="action"` input for the WordPress AJAX
handler. Browser named-property access means `form.action` returns that input,
not the action URL. The runtime passed it to `fetch`, producing a path ending in
`[object HTMLInputElement]` rather than the intended endpoint.

A read-only live staging Contact DOM check confirms:

| Value | Result |
| --- | --- |
| Action attribute | `https://krawlthroughkrakow.com/staging/wp-admin/admin-ajax.php` |
| Action property type | `[object HTMLInputElement]` |
| Hidden action value | `ktk_pages_contact` |

No submission was used for that check. The first repair reads the attribute,
leaving the required hidden field and the backend contract unchanged.

## Stronger Safe Tests

`tools/test-contact-form-recovery.mjs` visits the seven existing form pages at
390/1440px. Exact known token/submission endpoints are intercepted; providers
and other non-read requests are blocked. All filled data is explicit fixture
data. It checks required/email validation, server errors, HTML/network failures,
expired/unavailable tokens, duplicate submissions, retry state, preservation of
entered values, CF7 rejection states and associated field errors. Reports are
fresh-path only and bind to the runtime source hash.

The old broad component baseline passes554/554, but its simulator accepts any
POST URL. It therefore did not verify correct endpoint selection. Keep that
limitation explicit; simulated success is not real email-delivery assurance.

Initial3/4 exposed a harness-origin mismatch: local previews deliberately retain
staging endpoint URLs. The corrected interceptor permits only those exact known
endpoints for fulfillment, never forwarding them. Next12/22 exposed the actual
wrong native request path and missing error associations. The expected endpoint
also now reads the literal action attribute, independently of the clobbered
property. Visible-message checks select the live feedback container rather than
the captured unused empty sibling. No application source was changed for those
harness corrections; original failing reports are retained.

## Current Status

Local repair in progress: native endpoint access plus linked, text-only field
errors and first-invalid-field focus. Existing helper descriptions must survive
error updates; generated error IDs must be unique and removed when cleared.
Field-array/checkbox groups need explicit coverage. Initial layout and original
form payloads must remain unchanged outside the visible error state.

Stable local basic suite passes431/431, source boundary5/5, offline form contracts
6/6, full Python190/190 and existing PHP form-security31/31 (mail stubbed). The
first120/134 run is retained: a CF7-group line changed during that run, so its
source-stability failure invalidates it as release evidence. Its fixture also
skipped anonymous Divi checkboxes, and a Locator.evaluate callback treated the
element argument as a field name. Those harness-only problems are corrected
without relaxing required selections or field-error association checks. The
expanded audit now checks exact hidden routing/token payloads, aged tokens,
existing help descriptions, successful cleanup and real checkbox proxies.

Expanded469/474 is retained. Four failures identify real inaccessible checkbox
focus: the original hen/stag checkbox inputs are `display:none`, so neither
keyboard users nor error-focus handling can reach them. Scoped24px invisible
native controls now retain the existing label artwork and gain a visible label
focus ring; required-group feedback is linked too. The remaining payload failure
was a fixture incorrectly requiring a captcha on Student Trips, whose existing
server definition deliberately has none. The corrected contract still checks all
routing/nonces/challenges and requires a captcha exactly where configured.
Corrected expanded486/486 passes, including actual Space selection and a single
resulting intercepted submission. Absent-checkbox lookups now check count before
reading attributes, rather than waiting30seconds. New report-specific screenshot
directories avoid overwriting earlier images; the earliest reports shared image
names, so do not claim every early screenshot was retained independently.

Fresh116-page build and2320/2320 verification pass; immutable asset-manifest SHA
`f5ad7b270678fedff20eef108fb5dc6372d540fbaef2a3181cb2748435ede691` unchanged.
Source guard still permits only the form block and scoped form CSS, leaving every
article/body/definition/media/homepage/backend unchanged. Full Python191/191,
shared JavaScript123/123, PHP form-security31/31 and live read-only token/CF7
method contracts7/7 pass. Initial28-view accessibility0 violations/50 incomplete
rule groups is not full conformance; final checkbox/error-state audits follow.

Read-only production audit covers all seven pages: five native endpoint
properties are shadowed, and the actual production runtime SHA-256
`38cdaa565d7fabc7f58e05cd8697dd79996c9c755d0beca9fda9e2503b2fc9e3`
uses the affected property rather than the attribute. No production POST, file,
cache or settings change. Owner was separately asked about a tested form-only
production hotfix, explicitly excluding promotion of staging SEO changes; do not
interpret that pending question as authorization. Staging work continues. Team
inbox ownership/response-time confirmation is also pending; no new SLA is claimed.

Required before staging delivery: stable local/browser/source/security checks,
required CI, guarded content-only publisher, normal cached device checks and
roadmap update. No deployment has run for this feature. Response ownership/SLA,
mail transport delivery and production approval remain separate; do not invent
a public response-time promise or claim end-to-end delivery without evidence.

## Filled-State And Visual Review

The error-state audit491/501 is retained: ten native-form views reveal genuine
typed-text contrast failures, not error-message or label problems. Read-only
computed styles confirm entered text `rgb(153,153,153)` on `rgb(238,238,238)`.
One native-form-only `:not(:placeholder-shown)` rule gives entered values dark
text without recoloring empty placeholders. Current501/501 passes, including
14 error-state axe views0 violations/17 incomplete rule groups,114 intercepted
payloads with correct routing/token contracts and source/harness stability.
No real enquiries, provider calls or delivery verification are inferred.

Initial visual43/43 passes before that contrast rule. The next31/43 retains
12 strict computed-color differences for empty captcha controls (no placeholder)
while all21 full, unmasked form PNG pairs still match exactly. The refined model
keeps strict geometry/typography, separately requires precisely the intended
empty-captcha grey-to-dark change, and accepts no other color exception. It
retains every difference and all PNG hashes; no raster masking or tolerance
increase. Its64/64 repeat overlapped an idempotent build and is not the final
stable-source evidence; a fresh post-build visual run is required. The rebuild
still leaves all original source/captures/media/metadata and other CSS intact.

Scoped helpers link server/client errors to the correct fields, preserve existing
descriptions, support hidden checkbox proxies, focus the first invalid control
and clear only their generated references after success. Network/HTML failures
now give a clear confirmation/retry message without claiming delivery occurred.
No response SLA, recipient or backend behavior was changed.

Final stable-source visual64/64 passes after the rebuild: all21 unmasked PNG
pairs match exactly, visible geometry/typography unchanged, and the only computed
initial-color differences are the12 explicitly checked empty captcha controls.
Final116 build/2320 verification, source5, Python192, shared JavaScript123,
PHP763/forms31, attribution136 and2073-file publisher dry run pass. Native and
CF7 form screenshots were visually inspected at390px. No staging publisher has
run yet; required CI and origin/normal cached verification still gate delivery.

The Contact page also retains old120zl/guaranteed-place promotional copy and an
empty map gap. Those are separate C01/D05 review items, not changed incidentally
by this form-endpoint repair. The health article remains held for specialist
review, and the entire homepage/commerce payload is outside this change.
