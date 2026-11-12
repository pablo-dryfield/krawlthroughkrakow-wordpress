# How to Join: Code-managed Staging Pilot

## Scope

This is a visual replica of `https://krawlthroughkrakow.com/about-us/how-to-join/`, not a redesign. The new renderer is restricted to `https://krawlthroughkrakow.com/staging/about-us/how-to-join/`. Production is not authorized for this pilot. The original WordPress post is never edited; disabling/removing the pilot renderer restores Divi rendering on the staging route.

WordPress still serves the request and existing integrations. The page body, header, footer, CSS, local images/fonts and interaction JavaScript are code-managed. Divi-origin classes and compiled CSS are retained for visual fidelity, but Divi does not render this page and its JavaScript runtime is not required. Other routes keep their current behavior. No storefront or OmniLodge deployment is included.

## Sources and Build

- Public production captures, taken read-only on 2026-11-05, are in this directory. `production-rendered-1920.html` and `production-styles-1920.json` are generator inputs. `production-settled-*` is the comparison baseline with delayed consent UI settled.
- `tools/build-code-pages.mjs` localizes CSS/image/font resources, sanitizes captured scripts/handlers and visitor-specific state, preserves all four page sections, and emits `how-to-join.php` and `how-to-join.css` under `staging/wp-content/mu-plugins/ktk-code-pages-assets/`. Do not manually edit those generated files.
- The generator snapshots the existing, tested homepage integration logic under an independent `ktk_pages_*` namespace. It copies the existing embedded Passion One resilience stylesheet. Changes to the shared homepage integration source or font stylesheet need a deliberate rebuild/retest of the pilot, not an implicit runtime dependency.
- `ktk-code-pages.php` owns the staging-only route and page metadata. `runtime.js` owns native menus, UTM/click-ID handoff and consent-controlled maps. It does not extend qualified-cart journey collection. Its consented `ktk_page_booking_click` event is not a purchase or conversion event.
- Both map URLs and frame dimensions are preserved. Both maps withhold vendor requests until Iubenda purpose 3 is explicitly granted, and reset on withdrawal. This is stricter than the legacy second embed, which loaded after consent rejection in the reference. The direct external location link remains available in the Adam Statue text. No captured consent preference is baked into the page.
- Header logo/menu fit is expressed in CSS using measured production breakpoints; the page remains usable without Divi JavaScript. A narrow-desktop Store submenu alignment prevents the same hidden-flyout horizontal overflow previously addressed on the homepage. It does not hide or clip page content.

Build: `node tools/build-code-pages.mjs`.

Local preview: `php -S 127.0.0.1:5185 -t staging/wp-content/mu-plugins tools/preview-code-pages.php`. Preview omits live consent/tracking output.

## Backup and Release

Before application edits: `deploy-backups/before-code-pages-how-to-join-20261105-120621.zip`, SHA-256 `E4FE00BD8A579E3A238CDF358486C442FECBF0673DF0AB51F824DE795AAF18EA`. It contains the existing MU-plugin source/assets, tools and root project context; no deployment credential is included.

Local payload inspection: `tools/publish-code-pages.ps1 --dry-run` (no network or credential decryption).

Staging deployment: `tools/publish-code-pages.ps1 --report docs/code-pages/how-to-join/staging-publish.json`. This publisher is staging-only, backs up previous owned files and existing page/settings hashes, uploads dependencies before the renderer, atomically replaces PHP through checksum-verified temporary files, verifies all 115 payload files, clears only this page's origin cache and removes its expiring probe helper. It never edits a post, a global setting, homepage files or production files. The DPAPI-protected credential is handled only by the existing wrapper pattern.

Rollback of this initial pilot: remove only `staging/wp-content/mu-plugins/ktk-code-pages.php` from the server and clear this staging page's caches. The original Divi post and all global settings remain intact. Preserve the remote backup/report before any subsequent release.

## Verification

- PHP integration: 33/33 checks, covering production/unrelated-route isolation, complete content, portable staging links, integration cleanup and initially blocked map requests.
- Publisher tests: 4/4, including path traversal/unowned-path rejection and staging-only/read-only helper scope. The reused atomic FTPS helpers remain covered by 18 passing homepage publisher tests.
- Homepage PHP integration and JS consent/booking-attribution suites still pass.
- Local interaction report `local-behavior-final.json`: 106/106 across 320/390/768/1024/1100/1440/1920, including menus, keyboard focus/Escape, scrolling header, persistent floating CTA, no overflow, loaded images, map grant/withdrawal, isolated UTM handoff, consented booking events and no-JavaScript content/links.
- `local-verified-comparison.json`: zero content, typography or geometry differences at 390/768/1440/1920, with 24/24 screenshot comparisons within the existing 0.5% changed-pixel threshold. Maximum changed ratio was approximately 0.037%. Geometry tolerance is one CSS pixel; pixelmatch threshold is 0.1 with anti-alias differences excluded.
- Only external iframe pixels and the floating Iubenda control are masked in the pixel comparison. Their frame geometry is still checked. No page section, heading, photo or layout gap is masked. External map tiles and consent widgets are not mathematically pixel-identical or controlled by this code.
- Production reference captures contain the pre-existing `FacebookSignal is not defined` and `fbq is not defined` errors. This pilot does not modify global Meta settings or unrelated routes to address those errors.

## Staging Release (2026-11-05)

- Published all 115 owned files with matching local/remote SHA-256 values. Report: `staging-publish.json`. Remote rollback manifest: `deploy-backups/ktk-code-pages-staging-20261105-112933.zip`, SHA-256 `a479b57a3d284ed565e7cf36231b6f110ad8a33292cd4976630168813a8300d2`. This was a first install, so the archive records the new files and unchanged original page/settings snapshot rather than an earlier code-renderer payload.
- Existing staging page ID 231 remains published with content SHA-256 `00845b8fd5adab8de1f1171eb9f618fef90a882f2edda95aac988a36a57de314` and original modified timestamp `2026-04-06 16:51:22`. All sampled global settings and protected homepage files remained unchanged. The expiring helper was removed and its absence verified.
- Live cache-busted comparison: `staging-live-comparison.json` passes with zero content, typography and geometry differences and 24/24 screenshots with zero unmasked changed pixels at 390/768/1440/1920. Live interaction tests: `staging-behavior.json`, 106/106. No uncaught page errors were recorded.
- Final normal-URL comparison after the prefix purge: `staging-final-clean-comparison.json`, zero content/typography/geometry differences and 24/24 screenshot comparisons within tolerance. This verifies the URL visitors use, not only a diagnostic query string.
- Live release checks: `staging-release-checks.json`, 66/66 across desktop/Android/iPad. Each variant has a single correct title, description/canonical/robots set, unique owned GTM/Ads/Clarity loaders, one Iubenda widget, consent-blocked initial maps, staging navigation, and all four public CSS/JS versions and byte hashes matching local.
- A production read-only smoke confirms the original Divi page remains active; the staging homepage still uses its existing NYE standalone renderer. No production files/cache/settings, storefront or OmniLodge changes were made by this deployment.
- Clean-URL edge-cache verification completed after the user's second exact-prefix purge. `staging-post-prefix-purge.json` passed 66/66 with desktop/Android/iPad all returning the new renderer as MISS; `staging-final-cache-hit.json` then passed 66/66 with all three as HIT and current CSS/JS hashes. Earlier failed `staging-clean-cache.json` and `staging-clean-cache-second-check.json` are retained: the first purge left Android on approximately 16-hour-old legacy HTML. No production/global cache purge was performed by the publisher.
- The task-owned local preview on port 5185 was stopped after verification. There is no Git repository/worktree in this workspace to clean. No user browser storage or tabs were changed.

Cache-busted URLs are release diagnostics; the review URL remains the normal staging route. The reusable migration checklist is [../MIGRATION-PROCESS.md](../MIGRATION-PROCESS.md).
