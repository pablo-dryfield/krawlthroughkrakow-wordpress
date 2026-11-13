# Storefront Accessibility Follow-up

Staging only, separate from the content-page release. No OmniLodge, production,
prices, availability, discount/payment logic, consent or account settings change.

## Checkpoint And Scope

Source base `b821829dbe7a2137932b4f9450cd8c28f7209c47` (content PR10).
Fresh archive `deploy-backups/storefront-accessibility-before-20261113.zip`,
60 independently verified tracked entries, SHA-256
`01ff1779949253b0757b8af6dfac28603dfc1f19cee67ebb04f34b22110c1cff`.

- Remove only `et_add_viewport_meta` at priority10, and only for an owned staging
  storefront request. The standalone template already provides a valid unrestricted
  viewport. No Divi theme or saved WordPress settings are edited.
- Give the enhanced catalogue one main landmark. Product main landmarks encompass
  their original heading/navigation/booking information, without nesting a main.
  PHP initial HTML and the client use matching structure.
- Expose the SVG activity-count badge as an image with its existing correct name.
- Custom-select names include their actual visible selection. Escape/selection
  restore trigger focus; values, limits, pricing and cart behavior are unchanged.
- Dark text corrects measured insufficient contrast on pink Cart/booking/primary
  controls and the pink featured ticket. Ticket indexes no longer reduce opacity
  enough to fail contrast. Background colours and normal geometry are unchanged.
- At viewport heights up to450 CSS pixels, Cart flows above main content instead
  of covering it. Normal-height windows retain the existing fixed cart.

## Verification

Final public render/handoff matrix811/811 covers all24 products and catalogue,
four no-JS/two JS widths, native SPA links and actual photo samples. Eight sampled
geometry comparisons remain identical at normal900px height. Screenshot bytes
are intentionally different because the contrast colours change; no claim of
whole-pixel identity is made. Selected390px product/catalogue screenshots inspected.

Native-control/initial/enhanced regression176/176 covers three routes/four widths;
cart/payment-lock regression18/18 uses exclusively stubbed commerce responses.
PHP public contracts46/46 include exact staging/foreign/production/mixed-context
viewport boundaries and non-nested product main; proxy8/8, frontend54/54,
Python152/152 pass. No customer data or real order/payment/cart was submitted.

The original enhanced six-view audit found61 nodes. The first local correction
left three desktop ticket-index contrast failures, retained in
`storefront-enhanced-local-first`; restoring index opacity fixes them. The next
six-view local audit has zero automated violations and retains incomplete checks.
Zero automated violations is not full WCAG, screen-reader or mobile-pinch proof.

Short-viewport regression104/104 covers catalogue/Pub/NYE,381x167,390x320,768x360,
1440x450, the451px boundary and normal1440x900, including scrolling and keyboard
focus visibility. This dimension emulation is separate from native zoom below.

## Actual Native Chrome Zoom

Used a task-owned, isolated Chrome window and Windows Sky's native keyboard/scroll
input, not CSS zoom or DevTools device emulation. At baseline Windows DPR1.25,
Chrome's actual toolbar reported200% then400%; matching DPR becomes2.5 and5.

| Actual Zoom | CSS Viewport | Document Width | Cart After Correction |
| --- | --- | --- | --- |
|200%|763x335|756|static; bottom58px, main starts58px; no overlap|
|400%|381x167|378|static; bottom58px, main starts58px; no overlap|

Before the correction,400% had no horizontal overflow but its fixed Cart visibly
covered content. This was a real residual defect, not a passing full zoom check.
After correction, native wheel scrolling at400% reaches scrollY167.8 and Cart's
bottom is-109.8px: it scrolls away instead of obscuring the content. Chrome reset
to100%/DPR1.25 and only the task-owned tab/window closed. Original user tabs and
authentication remain untouched. Native screenshot results were inspected from
Sky's returned images; no saved screenshot artifact is claimed for those captures.

This is a sampled desktop zoom/reflow observation, not a real mobile pinch-zoom
or full screen-reader audit. The viewport HTML check verifies removal of the
actual mobile zoom restriction separately.

## Staging Delivery

Initial semantic/contrast version2026.11.13.1 is deployed and independently verified
through the12-file publisher, with protected staging, production and saved state
unchanged. Backup `storefront-public-staging-20261113-012258-313001.zip`, SHA-256
`08e6339afc737c0e70adc70a6d41d20663fe865e889c504c259c0ea1a4230a2d`.
The native short-window defect was found afterward, so this initial release is
not labelled the final zoom fix. Version2026.11.13.2 follow-up is now deployed
with fresh payload-bound811/811 proof and the explicit verified previous release.
All12 owned hashes and runtime checks pass; protected staging, production and
saved state are unchanged. Backup
`storefront-public-staging-20261113-013140-865876.zip`, SHA-256
`225a8127c334cb117783e298b35ab239f67a832bf873115e6986067b803072f5`.
Live origin keyboard/initial/enhanced176/176 and short-window104/104 pass.
The explicit six-view enhanced origin audit has zero automated violations;
incomplete checks and the six inherited blocked-provider fbq errors remain.

Preserve the initial HTTP617/692 report: all75 failures were the verifier's stale
hardcoded renderer version2026.11.12.2, not missing deployed bytes. The verifier
now reads exactly one explicit local PHP version and still rejects a stale remote
version or missing optimizer exclusion; two additional unit tests cover this.
The corrected origin HTTP run passes692/692 (`storefront-origin-current.json`),
covering all25 routes on three user agents, asset bytes and protected production
controls. Normal edge-cache verification still awaits the scoped owner purge.

The old blocked-provider `fbq is not defined` errors remain a separate inherited
integration issue. No provider or consent code is changed in this batch. Content
semantics await the previously requested staging-prefix purge; no production
improvement deployment is authorized by this work.
