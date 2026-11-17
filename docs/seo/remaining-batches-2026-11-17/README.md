# Visible remaining batch list — 17 November 2026

The owner could see active deliveries in the HTML roadmap but could not see a finite list of the work still planned. The Overview now starts with all eight numbered implementation batches: two in verification and six planned. Each title, status and scope is visible without expanding delivery history. Native details expose the next step, completion criteria, related workstreams and dependencies.

The same maintained inventory generates both roadmap views. Seven owner/account/manual gates, two recurring responsibilities and the explicit consent deferral are separate from the implementation count. All 39 open workstreams remain covered; all 40 ticket statuses, the previous delivery history and 68 verified website staging deliveries remain unchanged. These are current work packages, not equal effort estimates or a promised completion date. Batch regrouping requires a recorded reason.

## Verification

- All 17 roadmap model/generator tests pass. New checks reject omitted workstreams, invalid references, cycles, invented states, unsafe evidence links and undated completion claims. Completing a batch changes the remaining count without completing its workstreams.
- The existing browser matrix plus the new remaining-list checks passes 395/395 across 320, 390, 768, 1024, 1440 and 1920 pixels; no-JavaScript views pass at 390 and 1440 pixels. Keyboard criteria and dependency panels work. There are no script errors, HTTP requests or page overflows.
- Six axe views have zero automated violations. Incomplete findings remain recorded; this is not a whole-site accessibility claim.
- Four fresh viewport images at 390/1440 pixels were individually inspected. The first tall element capture at 390 contained an offscreen skip-link capture artifact and is retained without acceptance as visual proof. Separate viewport captures verify the actual layout with the skip link unfocused at top -80px; no hiding, masks or tolerance were introduced.
- All 2,373 staging application blobs and all other tracked source outside the stated presentation scope are independently checked against the pre-edit source. No application build, website upload, purge, account change or production release is part of this delivery.

Local evidence: `browser-local.json`, `source-audit.json`, `visual-facts.json`, the fresh `viewport-*-top/bottom.png` images and `source-backup.json`. These generated/private QA files remain outside Git.

## Recovery and source review

Pre-edit source: `04c38d55863cca8f256dfe52f2e73a0c3790a78b`. The complete source backup requires the common archive `seo-guarded-release-controller-before-20261115.zip` (SHA-256 `50a70f592f68d4f427aa0bbfbfb20ce206562bfc34340a62f17ef3b6f61b4bd2`) plus `seo-roadmap-remaining-batches-before-20261117.zip` (SHA-256 `07b6760e5c57705d6559590a4d959ef1109d2b1b3382fbc9d1591c563551204f`). Both ZIP CRCs and every one of the 3,702 Git/local/reconstructed files were verified before edits.

This is an offline roadmap presentation delivery. Source PR/main CI closure is separately recorded; local acceptance does not assert that these source changes are merged or that recovery-tooling batches B01/B02 are complete. Full staged recovery acceptance, remaining technical work and owner gates remain open. All six existing previews are retained. The native UI stop and protected production, commerce, forms, functional consent, medical hold, active competition and OmniLodge boundaries remain binding.

The final cleanup review PR102 incorporates this UI sourcec0bb7c1 with its current verified recovery evidence. The combined tree needs its own source/main CI and exact-source proof; standalone PR103 is not claimed merged. All eight batches remain visible and in their original two-verification/six-planned states until authoritative closure.
