# Staging Performance And Media

## Baseline (Before Changes)

Branch `codex/staging-schema-media`, based on merged heading/link source
`a9cf168`. Pre-edit tracked-source checkpoint
`deploy-backups/seo-schema-media-before-20261112.zip`, SHA256
`1769709108f8fc03a95234e7f00b97522fa966911c486e224d57d54cda7054cc`;
ZIP integrity verified. Native homepage loading policy and in-view adjacent-photo
warming are implemented and deployed to staging only.

Chrome DevTools MCP cold-cache traces on the normal staging homepage, no
consent acceptance or checkout action, fresh isolated task context:

| Conditions | LCP | CLS | TTFB | LCP Load Duration |
| --- | --- | --- | --- | --- |
|1536x674, DPR1.25, CPU1x, unthrottled network|919ms|0.02|176ms|208ms|
|390x844, DPR3, mobile/touch, CPU4x, Slow4G|17020ms|0.00|566ms|15574ms|

These are single local lab observations, NOT field CWV, INP measurements or
production scores. No staging CrUX field data was available. Repeat under matching
conditions after a scoped change; do not claim an improvement from unlike runs.
The MCP refused saving the raw trace to this workspace (its configured roots differ).
The supported default trace ran successfully; figures above are transcribed from
its returned summaries/insights, not a claim of a saved raw-trace artifact.

An updated origin-only query URL (`?ktk_media_lab=20261112`) measured12542ms LCP,
0.00 CLS,1118ms TTFB,175ms load delay,10433ms load duration and816ms render delay
under the same mobile/CPU/network settings. The current bundle and lazy attributes
are confirmed; one9KB body photo loaded and lower images remained deferred. This
is a single origin-only observation with a different cache/TTFB path, NOT the final
normal-URL comparison or a repeat-run median. It still shows substantial remaining
mobile loading cost, led by the exact original SVG. Do not report good field CWV.

## Confirmed Findings

- Mobile LCP is the unchanged regular SVG statue,669694 raw bytes /279474 encoded
  bytes. Its request took15574ms while dozens of below-fold images loaded too.
  Load duration was91.5% of LCP. The seasonal statue adds118846 encoded bytes.
  The owner requires original vector artwork; do not rasterize or approximate it.
- Homepage body photos still have `loading=auto`, including six2000x2000 portraits
  displayed around125..155 CSS pixels. Many photos start at viewport y4700..14300
  yet all are requested during initial load. A legacy photo around y2043 even has
  `fetchpriority=high`, despite the new hero being the actual LCP.
- DevTools estimates269.5kB desktop /476kB mobile image-delivery savings. These
  are estimates, not bytes already saved or guaranteed LCP gains. Preserve full-size
  originals/lightbox destinations; responsive thumbnails/native lazy loading are
  the first bounded candidates.
- Captured modules/FontAwesome icon fonts use font-display:block. Estimated FCP
  cost275ms desktop,3000ms throttled mobile. Do not blindly show fallback glyphs
  or remove icons; investigate actual usage and visual parity first.
- Desktop render-blocking estimates0ms savings. Do not refactor those resources
  just because the audit lists them. Third-party cache/legacy-JS estimates are not
  authorization to change consent, tracking or provider behavior.

## Next Verification

### Post-Purge Verification

The owner confirmed the staging-prefix purge on13 November local time. Normal
homepage asset/token/canonical/noindex checks pass across desktop, Android and iPad;
the repeat is HIT on all three. The original stale-cache reports are retained.
Full content clean/repeat4320/4320 and actual schema3221/3221 also pass, with zero
transport errors. Website production remains unchanged.

Three normal-URL cold-browser-cache mobile lab traces use390x844, DPR3, CPU4x and
Slow4G: LCP12,120 /12,281 /8,182ms (median12,120ms), CLS0.00 each. These descriptive
staging observations are NOT field CWV or a controlled before/after percentage.
The original pre-edit17,020ms observation was a single run, and the earlier12,542ms
follow-up used an origin query URL; neither is silently substituted for a matched
three-run baseline. Raw trace-file saving remains unavailable; summaries/insights
are retained instead.

The original regular SVG is LCP in all three runs; its load/render time remains
the main mobile bottleneck. Preserve exact artwork while separately reviewing
possible delivery options. Native image-delivery estimates now show19.8kB for the
logo/review image, not the previous eager below-fold photo load. Do not claim this
alone guarantees a good mobile score or authorize unrelated third-party changes.

Real normal-URL mobile runtime confirms both hero SVGs decode eagerly,25 body
photos remain lazy and just one9,016-byte body photo initially loads. Gallery
adjacent warming, click/keyboard navigation and scrolling to a lower portrait work.
The actual consent dialog initially contained focus; normal Reject in this isolated
task browser releases it. An interleaved Sky/DevTools keyboard observation did not
advance; explicit foreground plus uninterrupted native Enter does. No application
patch or consent bypass was made to obtain the correct result. Desktop1440x900
repeat advances1 of9 ->2 of9 with native keyboard Enter, decodes the active image,
warms adjacent images and loads the lower portrait without overflow. Desktop and
390px mobile screenshots were visually inspected: original vectors/photos render.
The desktop header's Book Now control wraps below the navigation at1440px. This
is a separate responsive defect, not changed or hidden by the photo policy; retain
it for the next staging batch. Gallery checks do not certify all accessibility.

### Earlier Deployment And Local Evidence

The assets-only staging publisher verified all232 owned files, without rewriting
saved WordPress posts/settings. Backup
`ktk-homepage-shortcode-staging-20261112-221242.zip`, SHA256
`47911f720955bb150fb3e86a4453647fd326b988494b78fa795242f27dfc1356`.
Origin hashes pass. The normal-URL check at22:20UTC still serves the old JavaScript
token/hash on all three device variants, so preserve
`media-normal-before-purge.json` and wait for the requested staging-prefix purge.
Do not claim updated cached measurements yet. Publisher unit140/140 and shared
JavaScript27/27 pass; original consent and PHP homepage integration contracts pass.

Local matched-interaction real-media comparison passes66/66 at320/390/768/1440
with JavaScript and390/1440 without it. Initial body-photo requests drop26 ->1..2
with JavaScript. All six first-viewport screenshots are byte-identical in decoded
pixels; original body nodes/links/image sources/alt/dimensions and image/heading
geometry are identical. Gallery keyboard controls and adjacent prefetch pass.
The header logo, hero images and all SVG paths are unchanged.

Preserve the initial44/56 and follow-up50/56 reports. Their incorrect assumptions
were investigated: nativeWidth is density-corrected with srcset, not necessarily
the physical2000-pixel source width; browsers intentionally load eagerly with JS
disabled; and the two screenshots initially had different gallery/scroll histories.
Applying the same real interactions to both phases produces exact pixels without
masks or tolerance changes. The unnecessary logo loading override was removed.
See the [HTML loading specification](https://html.spec.whatwg.org/dev/urls-and-fetching.html).

Preserve typography, original SVG paths, layout/alt text, navigation and bookings.
Verify native lazy loading on real scrolling, carousel/lightbox behavior and no-JS
views at desktop/mobile widths. Measure actual transferred bytes and repeated
matching cold-cache lab runs before claiming savings. Website deployment remains
staging-only, manually backed up and verified; production remains unchanged.

References: [LCP breakdown](https://developer.chrome.com/docs/performance/insights/lcp-breakdown),
[image delivery](https://developer.chrome.com/docs/performance/insights/image-delivery),
[font display](https://developer.chrome.com/docs/performance/insights/font-display).
