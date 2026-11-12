# Production Homepage Replica

## Scope

The owner requested replacing the staging redesign with a faithful copy of the current production homepage. Production remains unchanged. The entire redesign was preserved before editing; restoration instructions are in `homepage-redesign-restore.md` and its immutable archive is `deploy-backups/homepage-redesign-preserved-20261006.zip`.

## Implementation

- The standalone WordPress route remains code-managed. It does not invoke the Divi renderer or load Divi's JavaScript runtime.
- The original production-rendered HTML and CSS are captured, not visually reinterpreted. All 13 sections, original copy, fonts, hero artwork, responsive rules, navigation and footer are retained. Divi-origin class names and compiled style rules remain because they describe the original design; this is not a claim that the page has no WordPress/Divi-derived markup.
- `tools/build-homepage-parity.mjs` transforms the read-only captures into `ktk-homepage-assets/parity-content.php`, `parity.css` and 178 local font/image assets under `parity/`. The source URLs, file sizes and SHA-256 checksums are in `homepage-parity/parity-build.json`.
- Localized asset bytes are unchanged. Internal navigation uses `home_url()` so staging bookings remain on `/staging/store2/`. Original third-party destinations remain links; Vimeo and Maps retain their original lazy iframe embeds.
- Captured executable scripts, inline handlers and visitor-specific consent activation state are removed. Existing code-owned GTM, Google Ads, Clarity, Iubenda, attribution and consent bridges remain responsible for their integrations.
- `parity.js` and `parity-runtime.css` supply native menus, gallery, lightbox, scroll effects and accessibility without adding a tracking endpoint. Clickable production modules retain their exact layout with real accessible link overlays.
- The old redesign assets remain inert in the directory for recovery; only the parity content, styles and runtime are loaded by the active template. Do not confuse the preserved `content.php`/`site.css`/`site.js` with the active page.
- Review figures and claims are copied from the production design, not newly verified platform totals. This replica intentionally does not apply the redesigned hero's independently researched count display.

## Reference And Verification

Reference captures and computed layout are in `homepage-parity/production-ready-baseline.json`, `production-ready-*`, and the later aligned/controlled captures. `tools/capture-homepage-parity.mjs` and `tools/test-homepage-parity.mjs` record the production reference and compare the candidate at desktop, tablet and phone sizes. Read the actual report conditions before interpreting pixel ratios.

Third-party iframe contents and the floating consent widget can vary between requests. Their rectangles are still compared; their external pixels may be excluded from image differences. Gallery frame and scrolling must be synchronized, not hidden, when comparing animated page content.

The final visual method uses ordinary viewport screenshots in overlapping scroll steps, without resizing the viewport for tall element captures. The production reference is `homepage-parity/production-tiles-baseline.json`. It covers 37 scroll tiles at 1920x1080 and 390x844, plus initial views and menu captures. Gallery frame is controlled; no page text, photos, navigation or fixed booking controls are masked.

The mobile production Divi runtime retains pre-lazy-load offsets, so its feature-image effects have completed by the time those images enter the viewport. The native runtime uses that completed visible state at phone/tablet sizes instead of reproducing the offset-cache bug. Consequently, an at-top geometry inventory reports 48 offscreen transform differences (six wrappers and six child images, each with x/y/width/height); these are not static layout differences. Their actual visible scroll tiles match. Desktop motion remains active and reduced-motion preferences are respected.

The local preview runs with:

```powershell
php -S 127.0.0.1:5184 -t staging/wp-content/mu-plugins tools/preview-homepage-parity.php
```

The preview intentionally excludes live tracking/consent integrations. Final checks must also run against staging with fresh browser consent state. Preserve staging noindex. Use only `publish-homepage-shortcode.ps1 --local-source`; never use the historical no-flag production-export workflow for this release.

## Release

- Published to staging on 2026-10-07 (Europe/Warsaw), using `--local-source`. Production was neither exported nor deployed during this release.
- All 220 payload files were read back and SHA-256 verified. Initial backup: `deploy-backups/ktk-homepage-shortcode-staging-20261006-221925.zip`; final footer-spacing release backup: `deploy-backups/ktk-homepage-shortcode-staging-20261006-223110.zip` (UTC filenames). Results: `homepage-parity/staging-publish.json` and `staging-publish-final.json`.
- Staging front page ID 278 still contains `[ktk_homepage]`. The origin homepage cache was cleared and the published page returned HTTP 200.
- Renderer SHA-256: `82eea2abf0b97f1a7a77675f7f3ba5ebe03d03adb190be15c316fd4b4e53c50e`.
- Active CSS SHA-256: `24a0014988f1d3df69f5bdd30bff24ace6efd43bbf7efeb6dfbb4300bf5bb5d2`; JavaScript: `296ab3f9014bd2944dfc116a7d35eba754b07c4b3ec7f5b6d8f72b8b79e6fe13`.
- PHP homepage integration and JavaScript consent regression tests pass. All 11 publisher tests pass, including retry correctness, unchanged-file verification, path validation, and preventing renderer replacement after an asset checksum failure.
- The host resets long FTPS sessions. The homepage publisher now renews sessions after 32 transfers and retries interrupted transfers at most twice. Downloads discard partial bytes and uploads rewind before retrying. Missing remote assets are discovered through one directory listing per parent, instead of repeated failing downloads. Dependencies are still verified before replacing the renderer. The separate storefront publisher is unchanged.

The first live release check passed 24/24 assertions, including fresh Accept/Reject, preference reopening, Google consent commands, staging metadata/noindex, asset versions, all 13 sections, native booking without JavaScript, attribution, mobile menu/Escape and a nonfixed header. No browser JavaScript errors were recorded (`homepage-parity/staging-release-smoke.json`). The first live tile comparison found one mobile footer social-spacing difference; the focused local correction then produced zero changed footer pixels (`local-footer-final-comparison.json`).

Final runtime CSS SHA-256 is `2c78baafb95f4fa63b6d464e8e49fa85387f5330a486829aedc2e31bc92d028c`, verified on staging. The full live comparison passed its configured 0.5% pixel threshold for 39/39 images (`homepage-parity/staging-final-tiles-comparison.json`). The desktop first view and both footers have zero changed pixels. Content, typography, and static layout have zero differences; the raw geometry report retains the 48 offscreen motion-state differences explained above. Document heights match exactly: 11,176px desktop and 14,736px phone.

This is not a claim of mathematical pixel identity in every interaction state. The worst tested residual is 0.1504% changed pixels, limited to inclusion checkmarks and native gallery controls. The production checkmarks remained transparent after five seconds in view, and its gallery controls were absent even after hover/keyboard interaction, alongside production JavaScript errors. Staging intentionally retains working native controls and visible checkmarks rather than copying those failures. Details: `homepage-parity/visibility-state-inspection.json`. No content or image regions were additionally masked to achieve the comparison result.

Additional 1440px desktop and 768px tablet captures have zero copy, typography, or static layout differences, all 13 sections, and exact document heights (10,323px and 14,559px respectively). Their raw geometry report has the same offscreen transform differences at tablet width. See `homepage-parity/staging-final-breakpoints-comparison.json`.

The final fresh-consent/live behavior rerun passed 24/24 with the released runtime CSS (`homepage-parity/staging-final-release-smoke.json`). No browser JavaScript errors were recorded. The local preview was stopped after verification.

Cloudflare Custom Purge was applied only to prefix `krawlthroughkrakow.com/staging/`, never the whole zone or production root. Clean desktop, Android and iPad requests returned the current replica and all three current asset versions, first on cache MISS and then HIT. Downloaded CSS/runtime CSS/JavaScript SHA-256 values match the release. All three variants contain the staging canonical and HTML `noindex, nofollow`. The cached iPad response omits the PHP X-Robots-Tag response header, but retains the equivalent HTML robots directive. Evidence: `homepage-parity/staging-clean-cache-verification.json`.

Release is complete on staging. Production remains unchanged; no production homepage promotion is authorized. No Git branch/worktree was created because this workspace has no `.git` directory.
