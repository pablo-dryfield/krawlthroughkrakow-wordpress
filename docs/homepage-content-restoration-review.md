# Homepage content restoration

Staging-only follow-up on 6 October 2026. The user approved restoring the content depth that was compressed during the redesign, while retaining the new booking flow and art direction. Production was not deployed.

## Restored content

- Brand story: the business's published history since 2008, who joins the crawl, the local hosts, and links to About KTK and Krakow nightlife.
- Film: the original 31-second KTK Vimeo film, using its verified local poster and full unlisted sharing URL. A deliberate click opens Vimeo in a new tab. There is no embedded player, video SDK, runtime oEmbed call or automatic Vimeo request.
- Gallery: four authentic past-night photos, captions and an accessible native-dialog viewer. Previous/next buttons, arrow keys, wrapping, Escape, focus containment and focus return work without a library. Real image links remain usable without JavaScript. Mobile sticky booking hides while the dialog is open.
- Private groups and student trips: substantive copy and separate booking/enquiry routes, instead of one-line links.
- New Year's Eve and brunch: authentic photographs, richer verified descriptions and current product links. The NYE photograph is explicitly a past event; the offer uses 31 December 2026 rather than the stale legacy year.

Repeated inclusion lists, unsupported ranking/review counts and obsolete prices were not restored. Verified facts, sources and limitations are in [the factual review](homepage-content-restoration-facts.md). In particular, brunch's new product configuration is empty, so the modest meal/drink copy relies on the current official legacy listing and homepage, not fabricated product data.

## Implementation and release

- Source: `ktk-homepage-assets/content.php`, `site.css`, `site.js`, and the image helper in `tools/homepage-shortcode-plugin-template.php`.
- All added photos/poster are local responsive WebP files with dimensions and lazy loading. The hero, fonts, consent setup and checkout APIs are unchanged.
- Four additional Lucide symbols are built into the existing SVG sprite, with no runtime dependency.
- Asset preparation/provenance: `tools/prepare-homepage-images.py`, `tools/homepage-image-sources.md`.
- Rollback checkpoint: `deploy-backups/homepage-restoration-local-before-20261006.zip` (before markup changes, with the first new image files already prepared).
- Published using `tools/publish-homepage-shortcode.ps1 --local-source`, never the production-export path. Final staging backup: `deploy-backups/ktk-homepage-shortcode-staging-20261006-114533.zip`.
- All 38 deployable files were checksum-verified. Renderer SHA-256: `bd766b02b31a06bbad979a45a7b927bd40b328eb69384d3b60aebacbb8bab517`.
- CSS version: `bf15ac7a8e10`; JavaScript version: `8bf4f10c4db8`.
- Staging origin cache cleared, followed by Cloudflare prefix purge of only `krawlthroughkrakow.com/staging/`. Clean-URL desktop, Android and iPad requests returned HTTP 200 with the current hashes.
- No temporary feature branches/worktrees were created; this workspace has no Git repository.

## Local verification

- PHP syntax and homepage integration tests passed.
- Consent tests passed: initial denial, grant, withdrawal, stored preference, API preference and duplicate guard.
- All five publisher unit tests passed, including checksum failure handling and offline build isolation.
- First browser pass found two issues: missing spaces where mobile hid story line breaks, and the existing tablet layout overflowing at 200% CSS zoom. The final release fixes both, plus the footer's missing Vimeo sharing hash.

## Final browser verification

- `node tools/test-homepage-restoration.mjs`: 124 passed, 0 failed on the final clean staging URL. Covers 360/390/768/1440px, 200% CSS zoom, image decoding, story spacing, gallery controls/focus return, sticky suppression, attribution, and JavaScript-disabled native links.
- `node tools/test-homepage.mjs --report restoration-regression-audit.json`: 54 passed, 0 failed, 0 blocked. Consent grant/reject/reopen, menu, attribution, FAQ, metadata and the real product handoff passed. Product form became visible in 1.539s in that ordinary-connection lab run; no cart/order/payment action was performed. This suite preceded the final meeting-column-only CSS fix.
- After that last CSS fix, the existing zoom/reduced-motion regression subset was repeated: 5 passed, 0 failed, 0 blocked.
- No uncaught JavaScript errors in these runs. No automatic Vimeo requests, including after scrolling through the gallery. A keyboard click opens the exact full unlisted link in a new tab; the test intercepted that deliberate navigation rather than streaming the remote film.
- Final screenshots were inspected for gallery, lightbox, story, secondary experiences, and the tablet zoom layout. Reports/screenshots are under `docs/homepage-redesign/restoration-*`.
- Production read-only smoke test returned HTTP 200 with the original Divi markup and without the new homepage/story markers. Production was not written or purged.

## Load cost

`node tools/audit-homepage.mjs --phase restored --performance-only` ran in isolation after the other browser tests closed. Fresh context, cache disabled, 390x844 DPR2 mobile, 1.6 Mbps download, 750 Kbps upload, 150ms latency, 4x CPU slowdown, no consent choice, 12 seconds observed after DOMContentLoaded.

| Measurement | Restored page |
| --- | --- |
| Initial requests | 25 |
| Initial transfer including retained third parties | 922,288 bytes |
| Direct LCP | 2.060s |
| FCP | 1.844s |
| TTFB | 230.9ms |
| CLS | 0.00084 |
| New gallery/secondary photos or poster requested before scrolling | 0 |
| Vimeo requests before deliberate activation | 0 |

The previous isolated direct run recorded 25 requests and 918,185 bytes, so the observed initial payload increase was 4,103 bytes (about 0.45%). This is a single-run comparison, not proof of identical timing or field performance. Added images incur transfer when visitors scroll to them; opening a full photo may fetch its larger variant. The JavaScript file is 8,148 bytes raw / 2,581 gzip, and CSS is 25,104 raw / 5,863 gzip. Hero assets and fonts are unchanged.

The trace still contains 1,902ms of long-task excess over 50ms during the observation window. This is neither Lighthouse TBT nor field INP. The retained consent/Google integrations remain a performance consideration; this restoration does not resolve the earlier Lighthouse 95+ target. No new Lighthouse score, conversion uplift or field CWV result is claimed. Historical redesign measurements remain in [the previous review](homepage-redesign-review.md).
