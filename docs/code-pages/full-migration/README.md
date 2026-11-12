# Full Non-Ecwid Content Migration

## Scope And Status

The owner subsequently approved staging visually and authorized production. The [production release](../production-release/README.md) is now deployed and verified: both final full scans passed 6,196/6,196, and all 116 routes returned HIT on desktop, Android and iPad in the final repeat at 19:20:50 UTC. The homepage booking-link revision is promoted too. Original WordPress posts/settings, both stores and OmniLodge were not changed by this content release. Earlier staging-only scope statements below are historical, not the current production boundary.

The later [production-readiness follow-up](../production-readiness/README.md) supersedes the original preservation of incoming Ecwid/FareHarbor links and the embedded Brewery Tour widget. The owner approved all normal website booking links using the storefront, a responsive menu fix, NYE corrections, removal of the broken About Us media and updated review snapshots. The legacy store/fallback itself is still untouched. Read that follow-up for current 1,915-file/page and 232-file/homepage releases; the original release evidence below is retained historically. Current clean-cache status comes from the newest manifest reports, not the earlier purge.

The earlier readiness caches were verified: `readiness-staging-clean-cache.json` and `readiness-staging-cache-hit.json` each passed 5,500/5,500; the latter recorded all 116 routes HIT on desktop, Android and iPad at 17:56:24 UTC. Homepage clean/HIT checks each passed 18/18. One initial transport reset and its successful full rerun are documented in the readiness review. Production was unchanged during that staging phase; the owner later approved the documented visual differences and production promotion.

The owner authorized staging-only migration of every audited non-Ecwid public content route on 2026-11-05. The inventory contains 116 content routes: 21 page designs, 56 independently rendered articles and 39 archive/pagination variants. There are nine HTTP redirects and one existing homepage canonical alias. `manifest.json` is the exact allowlist; `MIGRATION-PLAN.md` records progress. Do not equate a generated route with a deployed/verified route.

Production was excluded from the initial staging phase. Both storefront implementations and OmniLodge releases remain excluded from this content release. The original Stag Do Ecwid widget was retained in the initial migration; the later owner-approved readiness follow-up replaces that incoming booking control with our Brewery Tour checkout. No Ecwid product, cart, setting or source file is migrated or modified. Original WordPress posts and settings remain intact for rollback.

The initial complete migration was deployed and cache-verified on staging before the readiness corrections. Its historical follow-up is `staging-form-link-followup-publish.json`: 1,895 owned files independently SHA-256 verified, with WordPress state, homepage and storefront unchanged. Live component checks passed 858/858. The release, clean URLs and cached responses each passed 5,152/5,152 assertions, including 119 public CSS/JS hashes and version tokens. After the owner's 87-prefix purge, all 116 routes returned MISS on desktop, Android and iPad at 15:28:46 UTC, then all returned HIT at 15:31:13 UTC. Historical evidence: `staging-form-link-release.json`, `staging-final-clean-cache.json`, `staging-final-cache-hit.json`. Current staging and production evidence is tracked in the follow-ups linked above and `manifest.json`; strict visual exceptions remain documented below.

## Recovery

- Pre-edit local checkpoint: `deploy-backups/before-full-page-migration-20261105-133409.zip`.
- SHA-256: `0E6EFE81F285678FA76F5561AE6824DD13EB333B13881E8A5043C9DAC21296A6`.
- Initial remote staging checkpoint: `deploy-backups/ktk-code-pages-staging-20261105-134206.zip`.
- Form/link follow-up checkpoint: `deploy-backups/ktk-code-pages-staging-20261105-150939.zip`, SHA-256 `5d74050b428dd2de8a1b7aa5ae8fa34980e0c8d14bb88a97933190af5571570e`.
- The publisher records each backup hash, original post/settings hashes, protected-file checks and new-file information in its release manifest/report. An incremental backup contains changed files only: restore those files over the otherwise complete current payload to undo that follow-up. Never delete unchanged files on the basis that they are absent from an incremental ZIP. The initial remote checkpoint is the pre-migration pilot, not a copy of the newly generated 116-route release; retain the current localized assets and intervening reports/checkpoints for later-release recovery.
- To undo the complete migration, restore the original pilot renderer/dependencies from the initial verified checkpoint and clear only content caches. Original posts/settings were not rewritten, so WordPress/Divi resumes ownership of non-pilot routes; leftover unreferenced owned assets do not require risky recursive deletion. To undo a later follow-up, restore its changed files from that follow-up's verified backup, keeping all unchanged dependencies. Do not reset global WordPress settings, remove plugins, or restore unrelated work. There is no Git repository in this workspace.

## Repeatable Build

```powershell
node tools/capture-code-pages-batch.mjs --target production --label production-painted --widths 1920,1440,768,390
node tools/build-code-pages-all.mjs
php tools/tests/test_code_pages_integration.php
php tools/tests/test_code_pages_forms.php
node tools/test-code-pages-components.mjs
node tools/verify-code-pages-build.mjs
python -m unittest discover -s tools/tests -p test_code_pages_publisher.py -v
```

Captures are resumable; `--keys key1,key2` selects routes and `--force` refreshes existing captures. Original `production-*` baselines are retained. Painted captures disable only WP Rocket's offscreen `content-visibility` optimization so full-page screenshots paint content that a scrolling visitor sees. They do not replace source images, remove page regions, or inject missing offer content. The capture tool scrolls through lazy images, waits for fonts and freezes carousels at their first slide. External frames and floating consent controls are the only pixel masks; their geometry is still compared.

`tools/build-code-pages-all.mjs` owns generated definitions, shared shells, page HTML, styles, localized media and the explicit route registry. Do not edit generated content/styles by hand. Full-page integrations are generated from the proven homepage integration implementation by `tools/code-pages-integrations.mjs`, under a separate namespace. Homepage files are not changed.

`runtime.js`, `runtime.css`, `forms.php`, the renderer and the template-directory access rules are code-owned sources. PHP remains hosted by WordPress. Divi-origin markup/style rules are retained for fidelity, but Divi does not render these routes or provide their interaction runtime. WordPress still supplies hooks, mail, nonces, original contact recipient configuration, feeds/sitemaps and the existing CF7 backend. Production rendering is now prepared behind an explicit, disabled-by-default opt-in; it has not been activated or deployed to production. Staging remains noindex.

Do not regenerate definitions while a local capture is reading them. The local PHP preview can observe a briefly incomplete generated file. Preserve failed capture evidence, finish the build, retry the affected route and rerun comparisons. Never conceal a failed assertion by relaxing tolerances or hiding content.

## Native Behaviors

- Responsive menus and keyboard/Escape handling; complete server-rendered copy and booking links with JavaScript disabled.
- FAQ toggles, gallery pagination/lightboxes, carousels, responsive blog columns and countdowns.
- Consent-gated maps, video/social embeds and the existing Shapo review widget. Shapo uses its original iframe-resizer library after purpose-3 consent, with origin checking and listener cleanup on withdrawal.
- Native HTML video controls replace the captured JavaScript-dependent player wrapper on the Halloween article. This is a disclosed interaction/appearance difference, not a pixel-identical claim.
- Contact forms preserve their public field contracts and trusted server-side recipients. Nonces, expiring signed arithmetic, required/email validation, honeypot and rate limiting protect the native Divi-form replacement. No form test sends real mail. CF7 retains its existing plugin endpoint, with native frontend handling.
- Existing UTM/click-ID storage and store handoff remain. Booking events remain consent gated. Redirects preserve incoming query parameters; no QA attribution is hardcoded.

## Visual Exceptions And Content Review

The owner explicitly approved displaying actual photos rather than reproducing the production lazy loader's blank placeholders, even where restored image aspect ratios change page height. This approval was received during this migration. Keep photographs/content visible; do not force blank placeholders merely to improve screenshot scores.

The comparison reports record real ratios and failures. Early `local-all` comparisons predate the optimized-background correction and improved painted baselines. `final-representative` also predates the final slider/Shapo fit follow-ups. Do not cite those intermediate reports as a successful final release. The default pixel threshold remains 0.5%, geometry tolerance one CSS pixel and exact computed typography; no tolerance was raised.

The final four-width matrix (`local-final-comparison.json`) contains 464 comparisons, no semantic-content or computed-typography differences, no capture/overflow errors, and 286/464 pixel-threshold passes. It records 9,535 geometry differences, including cascading vertical shifts from restored photos. This is **not** a fully passing strict visual suite. See `VISUAL-REVIEW.md` for source fallback-font evidence, video/embed behavior and remaining visual review limitations. Do not describe the release as mathematically pixel-identical.

Review items retained deliberately:

- `/new-years-eve/` contains obsolete 2025/2026 source offer copy. It is cloned for review, not silently rewritten or treated as the current offer authority. The existing code-managed homepage's NYE campaign is separate. Verify product-32 data before an owner-approved copy refresh.
- About Us contains older review counts than the code-managed homepage. Source copy is retained in this parity migration; no new rating claims are invented.
- The dead Bottomless Brunch Ecwid URL is linked from the already code-managed homepage. Do not create/modify an Ecwid product route to conceal the 404. A separate, narrow incoming-link correction can be reviewed without touching Ecwid.
- The source About Us YouTube thumbnail returns an actual JPEG placeholder with HTTP 404. Its existing image bytes are retained; no substitute video/thumbnail is invented.
- `/krakow-pub-crawl/` already serves the code-managed homepage with the root canonical. Preserve that behavior; do not invent a 57th article or change its canonical semantics.
- Public inventory cannot enumerate drafts/private/unpublished content. Do not expose unpublished material or claim an authenticated private-content audit was completed.

## Staging Release

```powershell
node tools/verify-code-pages-build.mjs
.\tools\publish-code-pages.ps1 --full --dry-run --report docs/code-pages/full-migration/staging-dry-run.json
.\tools\publish-code-pages.ps1 --full --preflight --report docs/code-pages/full-migration/staging-preflight.json
.\tools\publish-code-pages.ps1 --full --report docs/code-pages/full-migration/staging-publish.json
```

After a small verified follow-up, use `--full --incremental` with a new report filename. The expiring staging-only probe independently hashes all owned remote files; changed files are backed up and FTPS verified, and unchanged files are verified against the remote hash manifest. The complete route registry is activated only after dependencies, with the renderer last. The publisher refuses incomplete builds or a payload changed since the successful build-verification fingerprint.

Always use the DPAPI PowerShell wrapper. Never print, persist, pass in command arguments or document the decrypted FTPS password. Do not run production/storefront/OmniLodge publishers as part of this release.

```powershell
python tools/verify-code-pages-full-release.py --cache-bust --label staging-full-release
node tools/test-code-pages-components.mjs --staging
node tools/build-code-pages-purge-list.mjs
python tools/verify-code-pages-full-release.py --label staging-clean-cache
```

The release verifier checks all explicit routes/aliases, three device variants, canonical/robots/title/description, integration uniqueness, raw-template denial, protected route families and public CSS/JS hashes. All deployed files receive SHA-256 verification. Raw content/shell/data templates must not be publicly indexable; their directory access rules do not block PHP filesystem includes or public images/fonts/styles.

It also checks legacy HTTP/www internal navigation is mapped to staging, and that every public stylesheet/runtime URL carries the current content-hash version token. Matching asset bytes at a cache-busted URL alone is not enough when cached HTML still names an old version.

`cache-purge-prefixes.txt` contains 87 narrowly scoped staging content/owned-asset prefixes. It excludes the homepage, `/store/`, `/store2/` and all production paths. Use Cloudflare Custom Purge -> Prefix, one entry per line, without a scheme, query or fragment. Do not purge until the final staging release is verified. Browser cache-busting is not proof that clean desktop/Android/iPad cache variants are current.

SEO parity is the migration objective, not a guarantee of unchanged rankings or an automatic improvement. Preserve URLs, content, metadata, canonical/redirect semantics, crawlable links and source structured data; keep staging noindex. Production promotion and any deliberate SEO/content changes require a separate owner instruction and release verification.
