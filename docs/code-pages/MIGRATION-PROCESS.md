# WordPress/Divi Page-to-Code Migration Process

## Goal and Boundaries

Reproduce an existing production page accurately using its rendered HTML and parsed CSS, then serve that snapshot through code without Divi rendering or Divi JavaScript. This is a migration, not a redesign or content rewrite.

WordPress still serves the URL and retained integrations. Never describe this as removing WordPress. Divi-origin classes/CSS may remain as static styling; this does not mean Divi still renders the migrated page.

**Default for this initiative: staging only.** A working staging replica does not authorize production promotion, global theme/integration changes, plugin deletion, storefront deployment or OmniLodge deployment.

Read root `AGENTS.md` first. The completed pilot's exact sources, commands, checkpoints and reports are in [how-to-join/README.md](how-to-join/README.md).

## Current Full-Site Workflow

The pilot has been expanded to all 116 audited non-Ecwid content routes. Use [full-migration/README.md](full-migration/README.md) for the active build, test, release, cache and recovery commands. `full-migration/manifest.json` is the explicit route allowlist, not a live WordPress query. New articles, archive pages and deliberate copy changes require refreshing that manifest/capture/build and verifying the affected routes.

The pilot commands below are historical implementation examples. Do not use the pilot generator or its publisher mode to maintain the full release. The active generator is `tools/build-code-pages-all.mjs`; publish only with `tools/publish-code-pages.ps1 --full` (add `--incremental` for a verified follow-up). Do not rerun the initial planning tool over the populated manifest: it initializes progress and would overwrite release evidence.

## 1. Inventory and Back Up

Read the latest public inventory before selecting routes. The first complete audit is [site-inventory-2026-11-05/PAGE-INVENTORY.md](site-inventory-2026-11-05/PAGE-INVENTORY.md), with sortable CSV and machine-readable JSON alongside it. Refresh read-only with `python tools/inventory-site-pages.py --output docs/code-pages/site-inventory-YYYY-MM-DD`. It reads REST collections/sitemaps, follows public anchor links and records actual renderer markers, redirects and broken URLs; it does not deploy anything. Public API absence does not establish that draft/private content is absent from the database.

1. Record the source production URL, target staging URL, WordPress page ID, current post/content hash, title, description, canonical, robots policy and current renderer.
2. Back up the existing source/assets/tools before editing. Record archive SHA-256. Before remote replacement, back up the complete owned remote payload, page/settings snapshot and a manifest identifying newly introduced files.
3. Identify dynamic behavior: menus, forms, maps, galleries, sliders, accordions, countdowns, sticky/scroll effects, lazy loading, third-party widgets and booking destinations. Do not substitute inert markup for a working feature.
4. Preserve the original Divi post and global settings. The initial rollback should require disabling the route-specific renderer and clearing only that page's caches.

## 2. Capture Production Read-Only

Capture fresh installed-Chrome contexts at desktop, laptop, tablet and phone sizes. Capture the response HTML, settled rendered DOM, stylesheet CSSOM in cascade order, inline styles, font facts, image URLs/srcsets, frame boxes, section/module geometry, typography, full page/viewport tiles, menu states and scroll behavior.

The capture tool is `tools/capture-homepage-parity.mjs`; despite its historical name, `--url` and `--output` support other pages. A representative command is:

```powershell
node tools/capture-homepage-parity.mjs --url https://krawlthroughkrakow.com/about-us/how-to-join/ --label production --output docs/code-pages/how-to-join --viewport-tiles --skip-section-images --settle-consent --widths 1920,1440,768,390 --consent-timeout 12000
```

- Scroll to load lazy images and settle animations; wait for fonts.
- Reject consent consistently and settle late banners. Never compare a banner-covered screenshot against an uncovered one.
- Never submit forms/orders, alter production settings or purge production to capture a page.
- Require a complete readable CSSOM. Fail on missing/blocked font or image resources; never store a bot challenge as an asset.
- Preserve the original capture inputs. Use a separate label for subsequent comparison captures.
- Record production's existing errors/transient states rather than silently treating them as new migration failures.

## 3. Generate Owned Content and Assets

Use DOM/CSS parsing, not wholesale regular-expression HTML rewriting. The pilot generator is `tools/build-code-pages.mjs`.

1. Select the complete page container, including header/footer and floating booking control. Assert expected section counts and essential content before writing output.
2. Retain semantic visible text, original section order, typography, spacing, dividers, backgrounds, responsive styles and imagery. Do not replace text with a screenshot.
3. Localize fonts/images/background assets and responsive image candidates. Validate font signatures and file content; keep an asset URL-to-local-path/SHA-256 manifest. Do not introduce a runtime dependency on production Divi cache files.
4. Remove captured scripts, inline handlers, plugin/admin artifacts, visitor-specific consent state and lazy-loader-only state. Preserve needed visual state deliberately.
5. Convert Divi clickable modules into real accessible anchors where possible. Never overlay an iframe/form with a full-size anchor that disables its controls.
6. Resolve internal URLs through `home_url()` or equivalent portable tokens. Staging navigation and all booking handoffs must remain in staging. Preserve external destination URLs. Never bake QA UTM/click IDs into links.
7. Preserve map/video/widget dimensions and URLs while honoring current consent. Do not copy a visitor's accepted/denied state from the captured DOM. Grant and withdrawal must both work.
8. Build generated HTML/CSS from immutable captures. Edit the generator or deliberately update the capture; never hand-edit generated output.

The full migration now uses an explicit allowlisted registry shared by the generator, renderer, preview and publisher, retaining How to Join as a regression case. Registry entries include key, production/staging path, post identity where applicable, capture directory, output files and expected sections. Expand the route-isolation tests for every new entry. Category/tag IDs are taxonomy identities, not post IDs.

## 4. Render Without Divi

The pilot renderer is `staging/wp-content/mu-plugins/ktk-code-pages.php` and its owned assets are in `ktk-code-pages-assets/`.

- Gate the renderer to the exact allowlisted staging path and existing page identity. Exclude production, unrelated routes, feeds and embeds. Do not use a loose substring match.
- Render one title/description/viewport/robots/canonical set. Keep staging `noindex, nofollow` in HTML and response headers where origin caching permits.
- Load only owned page CSS/JS plus necessary consent/tracking dependencies. Keep Divi runtime, Divi late-CSS loaders and unused plugins off this route only.
- Reuse the proven integration cleanup/consent logic under an isolated namespace. Do not change global Divi/WPCode/Iubenda settings, since non-migrated routes still depend on them.
- Implement menus/focus/Escape/touch behavior natively; reproduce required slider, sticky, gallery or scroll behaviors from measured evidence. Support reduced motion and usable no-JavaScript content/links.
- Preserve the existing `trk_utm_*`, `trk_gclid`, `trk_gbraid`, `trk_wbraid` handoff contract. New analytics events must be consent-gated and must not masquerade as purchases/conversions. Do not extend OmniLodge journey APIs without separate scope/approval.
- If a correction to an existing defect is necessary (for example a hidden dropdown creating horizontal overflow), keep it narrow and document the authorized visual/behavioral difference. Do not hide content or scrollbars to improve comparison scores.

## 5. Verify Locally

Pilot commands:

```powershell
node tools/build-code-pages.mjs
php -S 127.0.0.1:5185 -t staging/wp-content/mu-plugins tools/preview-code-pages.php
php tools/tests/test_code_pages_integration.php
python -m unittest discover -s tools/tests -p test_code_pages_publisher.py -v
node tools/test-code-pages.mjs --label local-behavior
node tools/test-homepage-parity.mjs --url http://127.0.0.1:5185/ --label local --reference production-settled --output docs/code-pages/how-to-join --tiles --settle-consent --widths 1920,1440,768,390
```

Use an available preview port. Keep it running only for active QA; stop it before handoff. The preview deliberately omits live tracking/consent, so a local pass alone is not a release pass.

Required checks:

- Complete content/sections and exact visible wording, loaded images/fonts, no broken local assets.
- Computed typography, section/module/header/footer/frame geometry and aligned-scroll screenshot tiles across desktop/tablet/mobile.
- Default comparison limits: one CSS pixel geometry tolerance, 0.5% changed-pixel ratio, pixelmatch threshold 0.1 excluding anti-alias differences. Record actual ratios; do not imply mathematical pixel identity.
- Mask only truly external iframe pixels and floating consent controls. Still compare their boxes. Never mask page headings, photos, sections or gaps.
- No horizontal overflow, keyboard/touch menus, focus and Escape, booking links/CTA visibility, no-JavaScript content, and zoom/reflow relevant to the page.
- Consent initially denied, purpose grant, withdrawal, no duplicated integrations, UTM persistence and handoff. Use isolated browser storage; never clear the user's own storage or create real orders.
- PHP syntax/unit/integration checks, staging path guard tests, traversal rejection, publisher checksum/atomic-upload behavior, and unchanged homepage regression suites where shared tooling changed.

## 6. Publish to Staging Only

Pilot commands:

```powershell
.\tools\publish-code-pages.ps1 --dry-run
.\tools\publish-code-pages.ps1 --report docs/code-pages/how-to-join/staging-publish.json
```

The publisher is deliberately staging-only. Use the DPAPI wrapper; never print, put in arguments, persist, document or commit the decrypted FTPS password. Extend only explicit owned-file allowlists for additional pages.

1. Confirm all local checks pass.
2. Snapshot original post/settings hashes and protected existing files.
3. Create and hash the remote backup before replacement; include absent/new file information.
4. Upload dependencies before the active renderer. Use checksum-verified temporary siblings plus atomic rename for PHP. Never delete an active renderer before replacement is verified.
5. SHA-256 verify every deployed file, not just the renderer or filenames.
6. Confirm post/settings/protected-file snapshots are unchanged and remove all temporary helpers. Helpers must be expiring, token-guarded and staging-only.
7. Clear only the target page's origin cache, then smoke-test the cache-busted page and current public CSS/JS.

## 7. Verify Live and Refresh Edge Cache

Repeat visual and interaction checks against the deployed staging renderer, not just local preview. Verify one canonical/robots/title set, staging internal links, no Divi runtime, no duplicate analytics loaders, and no new browser errors.

Pilot release/cache verifier:

```powershell
node tools/verify-code-pages-release.mjs --cache-bust --label staging-release-checks
node tools/verify-code-pages-release.mjs --label staging-clean-cache
node tools/verify-code-pages-release.mjs --label staging-final-cache-hit
```

This checks the three device variants, metadata, integration uniqueness, initial map blocking, staging links, QA-tag absence and all four public CSS/JS version tokens and byte hashes. The file payload itself is verified over FTPS during publication. As with the other pilot tools, extend its explicit page/source configuration when adding a second page; do not assume it already selects arbitrary routes.

Cloudflare APO may cache desktop, Android and iPad separately. A query-string diagnostic can be correct while the normal page remains stale.

- Purge only the target staging page prefix (for this pilot: `krawlthroughkrakow.com/staging/about-us/how-to-join/`) and relevant owned staging asset paths if needed.
- Do not purge production, other hostnames or the entire domain for a staging-only migration.
- If no connected purge capability is available, ask the user to perform that narrowly scoped purge. Mark clean-cache verification pending until it is actually checked.
- Check the exact clean URL with all three device User-Agents, first fresh and then cached. Require the code renderer marker, current CSS/JS versions/byte hashes, staging canonical and HTML noindex on each variant.
- Keep reports for both successful and failed attempts. Do not overwrite evidence to conceal a transient source/capture or cache failure.

## 8. Record and Hand Off

Update the page-specific README and root `AGENTS.md` with source/capture date, owned file paths, backups/hashes, actual check totals and limitations, deployment report and cache status. Keep this runbook current when the workflow improves.

Return the normal staging URL and concise verification results. State clearly that production is unchanged and WordPress remains the server while Divi rendering/runtime is removed on this route. Keep the original Divi page for rollback and wait for a separate production authorization.

## 9. Separately Authorized Production Cutover

The owner subsequently approved the complete 116-route staging migration and authorized its production cutover. See [the production release record](production-release/README.md) for actual evidence, backups and caveats. The staging-only handoff above remains the default until explicit production authorization is given.

```powershell
.\tools\promote-code-pages-production.ps1 --report docs/code-pages/production-release/dry-run.json
.\tools\promote-code-pages-production.ps1 --publish
python tools/verify-code-pages-full-release.py --environment production --label production-clean-cache
python tools/verify-code-pages-full-release.py --environment production --label production-cache-hit
node tools/test-code-pages-readiness.mjs --production
node tools/test-code-page-booking-attribution.mjs --production
python tools/verify-code-pages-form-tokens.py --production
node tools/test-code-pages-production-integrations.mjs
node tools/test-homepage-production-release.mjs --mode release --content-migration --label content-migration-production-release
python tools/verify-code-pages-production-boundaries.py
node tools/update-code-migration-status.mjs
```

- This publisher is a guarded initial cutover, not a blind live-update command. It deliberately rejects an already enabled production activation file. Later changes need a reviewed incremental release procedure; do not delete the activation flag just to bypass the guard.
- Require exact local/verified-staging checksums and current SEO evidence. Back up original posts/meta, form definitions, terms, protected settings and prior owned files before any application write. Leave original WordPress data intact.
- On this host, staging and production share a filesystem. The authenticated temporary helper validates every staging source hash, rejects unsafe paths/symlinks, atomically copies verified dependencies and rehashes every target. Registry/renderer precede the separate production-only activation file. WordPress still serves the application and existing forms.
- The homepage booking-link revision has a separate verified backup/publisher. Do not conflate content deployment with a storefront or OmniLodge release; these remain separate ownership boundaries.
- Preserve production's original robots/canonical policy, including an existing missing canonical when parity is required. Staging must remain noindex. Check for production `/staging/` destinations in links and resources, not just the main booking button.
- Existing integrations may correctly be reused without staging-owned script IDs. Count logical bootstrap instances and actual loader/configuration behavior. Preserve failed test evidence when correcting an invalid harness assumption; never remove genuine duplicate checks or change global tracking settings merely to make a test pass.
- Request an explicitly scoped edge-cache purge after application bytes are final. A homepage/root refresh can require a domain-wide purge across device variants; obtain owner confirmation because it also refreshes staging/store caches. Check normal URLs afterward, then repeat for actual HIT responses. Do not equate a query-busted pass with a current public cache.
- A successful full clean-URL scan can be both live-release and clean-cache evidence; the manifest must reference the actual report, not fabricate an extra independent run. Require a separate cached repeat. Keep older failed scans clearly marked as historical.
- Record production results separately from staging. Owner-approved visual differences do not turn the historical strict screenshot matrix into a mathematical pixel pass. Keep credentials out of all reports and close task-owned test/preview processes before handoff.
