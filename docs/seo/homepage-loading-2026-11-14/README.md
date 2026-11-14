# Homepage Loading: Exact Social-Font Delivery

Status: local candidate under verification, not deployed. Scope is one homepage
font-face addition and one derivative WOFF2. No statue SVG, photo, text, layout,
provider, consent, commerce or content-page change is proposed.

## Checkpoint

The prior read-only M03 audit is merged as PR53/49148160a9c937151525bfe0a787376c984a033a.
Its reviewed2867131 tree71352f086c697ef3ddc636f44a25fad542168558 matches the merge;
PR CI43600214786 and main43600358735 both pass. Completed branches are removed.

Before any application edit, all3284 tracked blobs were archived and checked
against Git object identities, exact file set and ZIP CRC:
`deploy-backups/seo-homepage-loading-before-20261114.zip`, SHA256
`d9ed48cc371bdfdd6ee4b5011ac7ebb9f9be9c7ae4781ab4a7d82c18e4debb68`.
This is tracked-code preservation, not a database/full-host backup.

## Fresh Read-only Trace

A task-owned isolated DevTools context on page2 used the normal staging URL,
390x844/DPR3, Slow4G and CPU4x, with cold browser-cache reload. Other tabs were
untouched and no Accept/Reject choice or account setting was changed. The tool
successfully stopped its automatic trace: LCP11542ms, CLS0.01, TTFB565ms, load
delay206ms, resource duration10272ms and render delay499ms. The regular original
statue remains LCP; actual encoded/decoded bytes are279474/669694. The seasonal
statue transfers118846 encoded bytes. Both original images remain eager/high.
There is no field CrUX result or controlled before/after speed claim.

The tool refused the requested raw-trace output path because its configured
roots do not include this repository. The subsequent trace without that path
completed; no raw trace artifact is claimed. Returned summaries/insights and
sanitized Resource Timing observations are the evidence. The read-only runtime
observation was retained in the functions store as homepagePriorityBaseline1Runtime.
That observer reports LCP11544ms; do not silently replace the trace's11542ms.

The trace also observes78,460 bytes for the original social brands font during
initial loading. Actual computed pseudo-elements use only U+F262 (Tripadvisor)
and U+E07B (TikTok), in four social controls. A source-bound derivative is932
bytes: a77,528-byte font-body reduction when it is the selected resource, not a
measured total-page/LCP percentage or evidence that the SVG bottleneck is fixed.

The Resource Timing list includes a same-origin `/9z78/` script,203077 encoded
bytes, and external provider traffic. Its ownership/purpose was not established;
no script or account setting is removed or deferred. A same-origin URL is not
proof of code-owned application logic. Existing consent deferral remains.

## Candidate

- Keep the original457-character brands WOFF2 unchanged as a native fallback.
- Add one FontAwesome400 face for exactly U+E07B/U+F262, after captured styles.
  Preserve normal style and the original font-display:block behavior.
- Generate using the already reviewed FontTools4.66.1/Brotli1.2.0 toolchain;
  no production dependency or new package is installed.
- Independently compare decoded outlines, advance widths/bearings, line metrics
  and all original naming/copyright records. The selected two glyphs are exact.
- Preserve unsupported-character coverage through the unchanged original face,
  and use the original font when the derivative request fails.
- Wire the canonical homepage builder; do not patch captured CSS or old fonts.

Original font SHA256:
`71b3ce72680f4183d28db86b184542051fd533bb1146933233e4f6a20cf98cba`.
Derivative SHA256:
`3044507fd7367ca59d4a95308e0cadd3d151032a335d2774f7871beeb2dda65a`.
Full ETmodules, original fallback fonts, Passion One and all other fonts remain
unchanged. The historical full-ETmodules conversion is not being subsetted.

## Required Verification

Four new source/style units pass and the932-byte font reproduces exactly. The
homepage builder succeeds with unchanged78,855-byte body/352,718-byte captured
CSS/178 source assets. A source guard must prove all existing staging blobs
unchanged except the literal homepage-only font face and one added derivative.

The browser harness compares original/candidate CSS for both campaigns at
320/390/768/1440 with JS/no-JS, real selected-font bytes, glyph geometry/style,
headings, original SVG decoding and overflow. Twelve real canvas atlas variants
must have exact nonblank RGBA and text metrics; fallback/unknown-character tests
must retain the original. Providers and all non-read requests are blocked; this
is not a consent or provider-ingestion test. Node deadlines bound font/image
promises even with page JavaScript disabled.

Need completed browser/source/shared/Python/PHP/attribution and roadmap checks,
required CI, guarded staging233-file release, origin/normal/cache verification
and final records before counting a new staging delivery. No production release
is authorized. No measured LCP gain will be claimed without comparable evidence.

## Primary References

Checked14 November2026:
[FontTools subset documentation](https://fonttools.readthedocs.io/en/latest/subset/index.html),
[CSS Fonts character-range/composite-font draft](https://drafts.csswg.org/css-fonts/#descdef-font-face-unicode-range),
[LCP breakdown](https://developer.chrome.com/docs/performance/insights/lcp-breakdown),
[fetch priority](https://web.dev/articles/fetch-priority).
These support the implementation/measurement distinction, not an already
achieved score, field-CWV result, legal review or third-party removal.

## Local Progress

Initial full browser matrix122/122 and source2376/2376 pass. The12 atlas
variants have exact nonblank pixels/metrics. All16 campaign/width/JS states
retain the four social controls, original geometry/headings and both SVGs.
The unknown-glyph case initially followed the atlas, which had already fetched
the original under a separate FontFace name. That was insufficient independent
network evidence, despite correct source coverage. A fresh-context probe now
requires the full original absent before inserting the unknown character,
then verifies its exact fetched hash. Keyboard menu/gallery checks are also
added; final rerun is required. Initial evidence is retained, not relabelled.

The final rerun closes127/127, including the independent unknown-character
request/hash and JS/no-JS missing-derivative fallbacks. Source2376/sharedJS240/
Python214/roadmap317 and homepage PHP integration checks pass. Both actual390px
campaign screenshots and the nonblank social atlas were visually inspected.
No original whole-page screenshot identity or accessibility conformance claim
is made. Guarded assets-only dry run contains233 files. Application source is
still exactly one CSS declaration plus one new font; no staging upload yet.

A further read-only runtime observation shows Analytics collect requests and
only AW/GTM identifiers in the visible Google runtime. This supports M03's
explicit caveat: absence of a public GA4 tag is not proof of no Analytics
destination elsewhere. It does not establish a complete GA4 purchase funnel,
provider receipt, request consent compliance or the purpose of `/9z78/`.
