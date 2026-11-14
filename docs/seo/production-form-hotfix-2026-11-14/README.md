# Production Form Endpoint Hotfix

## Authorization And Boundary

On 14 November the owner separately approved only the tested production form
hotfix. All other SEO changes remain on staging. This does not authorize copying
the current staged runtime, CSS, content, definitions or renderer to production.

Fresh seven-page production audit confirms all five native forms have the
shadowed property. Existing production runtime SHA-256:
`38cdaa565d7fabc7f58e05cd8697dd79996c9c755d0beca9fda9e2503b2fc9e3`.
Only the native endpoint expression changes from `form.action` to
`form.getAttribute('action')`. The hidden WordPress routing field remains.
Both CF7 forms retain their exact existing endpoint branch and backend.

The updater rejects any other baseline and checks the inverse transformation.
The separately generated candidate is not the staged bundle. Preparation uses
an expiring authenticated MU helper, removes it afterward and creates a verified
local rollback ZIP. It does not modify application files or saved settings.
Publication requires fresh candidate-bound intercepted browser checks, a new
pre-write snapshot, unchanged protected production/staging files and WordPress
posts/options/meta, and another verified rollback archive. Only the single JS
file can be replaced; the original production activation guard is untouched.
On failure, restore only that file if it still has this transaction's bytes.
Never overwrite concurrent changes or restore global database state.

## Verification And Cache Plan

Before publication, test the production DOM with only the candidate JS fulfilled
in an isolated browser. Intercept every submission and token response; block
all other non-read requests and external providers. Check five native and two
CF7 forms at390/1440px, exact routing/payloads, failures, retries and duplicate
submission suppression. Also retain a counterfactual using the unchanged old
script to prove native requests reach the incorrect path, without forwarding
them or sending any enquiry.

Scoped origin cache clearing includes only the116 managed content URLs because
all their HTML references the shared script hash. External cache purging must
exclude the homepage, both stores, staging and unrelated assets. Verify actual
normal desktop/mobile/tablet pages and script bytes afterward. No production
SEO/content release is implied by this isolated functional repair.

Actual SMTP delivery is not certified by intercepted tests. Owner-confirmed
handling is email review, not a fixed SLA; group terms are quoted individually.
No real messages, customers, carts, payments or consent choices are test data.

## Preserved Preparation Diagnostic

The first preparation created and verified the rollback ZIP and generated
candidate, then stopped while making a relative report path repository-relative.
No application file was uploaded; the expiring helper was removed in finally.
Keep `prepared.json` as a failed preflight, not release evidence. Normalize the
report path before work, then repeat into a fresh report without weakening any
production baseline or protected-state guard.

The first generated-helper unit check linted successfully but found the shared
helper's statically disabled domain-purge branch. It was never executable with
the false argument. The scoped updater now removes only that exact known dead
branch, failing closed if the upstream helper changes; it retains only the
116-route cache operation. No live domain purge was made.

Initial browser baseline48/49 and candidate384/385 preserve one harness
classification failure: external Google measurement requests were correctly
aborted, but counted with unexpected same-origin form writes. The candidate's
118 intercepted form payloads and recovery assertions already passed; ten old
native requests demonstrate the incorrect destination. The final harness aborts
and separately records every external request before form matching, still fails
on any unexpected same-origin write, and never forwards a POST. No consent or
production application change was made to resolve this fixture distinction.

A second48/49 and384/385 pair identifies the same requests under the observed
same-origin `/9z78/` gateway prefix. They also were aborted, never forwarded.
The final test denylist blocks that exact observed prefix for both script and
measurement requests, in addition to external hosts. Unknown same-origin writes
still fail. First-party measurement is a supported deployment pattern, not a
new form endpoint ([Google setup](https://developers.google.com/tag-platform/tag-manager/gateway/setup-guide?setup=manual),
[Cloudflare overview](https://developers.cloudflare.com/google-tag-gateway/)).
No gateway/GTM account setting or production consent behavior was changed.

## Prior Batch Closure

Stag costume PR43 final860ab9ef93985f73d66098fa9c96d3eeb47cbc6d passed both
required jobs in43556023975, merged asfefc4c2 with exact reviewed tree
ff38ceff9c2d5cff61bb29a6e13f5865af4f4369. Completed local/remote branch removed;
only the root worktree remains. No additional app release was needed for its
final QA/docs commit.31 staging deliveries remain verified.
