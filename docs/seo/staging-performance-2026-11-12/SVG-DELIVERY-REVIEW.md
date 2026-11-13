# SVG Delivery: Read-only Follow-up

13 November 2026, 19:28 UTC. No image, server setting, cache rule or application
change was made for this check.

Explicit staging HEAD requests offering gzip, Brotli and Zstandard return200,
`image/svg+xml`, `Content-Encoding: br`, `Vary: Accept-Encoding` and a one-year
`Cache-Control` lifetime for both current statue files:

| Asset | Original source bytes | HEAD advertised Brotli length |
| --- | ---: | ---: |
| `hero-statue-regular.svg` | 669694 | 279474 |
| `hero-statue-seasonal.svg` | 286738 | 118846 |

These are response-header declarations, not an actual-body transfer capture or a
new performance gain. The requests were MISS after the earlier staging-prefix
purge. They do establish that a claim of universally absent SVG compression is
incorrect for these requests. Do not add server compression settings merely from
the raw source sizes or the earlier offline gzip/Brotli experiment.

The earlier offline Brotli11 sizes250136/107682 are theoretical outputs, not
deployed bytes. A future comparable cold-browser trace must distinguish actual
encoded transfer, queue/load delay, SVG rendering, font work and third-party work.
Do not promise this alone fixes the retained slow mobile LCP. Preserve the exact
original vector artwork; no rasterisation, path rounding or statue approximation
is authorised by this investigation.

## Actual Browser Transfer Follow-up

13 November2026,20:25UTC: a new task-owned isolated Chrome tab,390x844/DPR3,
Slow4G/CPU4x, normal staging URL, cold browser-cache reload. Existing tabs8/10
and their settings were untouched; the task tab12 is now closed. No consent
choice or site/account setting was changed. Trace tools were available and the
trace completed, but this is one descriptive lab sample, not a controlled uplift
test, median, field CWV result or proof of a privacy-clean browser environment.

LCP12245ms is the regular statue, with CLS0: TTFB564ms, load delay204ms, resource
duration10292ms and render delay1184ms. It was discovered directly in initial
HTML at768ms, so a missing preload is not established as the bottleneck.
Resource Timing reports actual encoded/decoded body sizes:

| Resource | Encoded bytes | Decoded bytes | Start/end ms |
| --- | ---: | ---: | --- |
| Regular statue |279474|669694|768/11061|
| Seasonal statue |118846|286738|770/5252|
| Parity CSS |37534|352718|761/2670|
| Embedded font resilience CSS |28173|39923|762/2469|
| Original modules font |92084|92084|3462/8978|
| Original social brands font |78460|78460|6516/10001|

Both statues are in/partly in the844px viewport, both have High fetch priority.
Nine external first-party font requests also occur. A trace dependency includes
an unrelated OmniLodge required-actions request; its initiator/extension role is
not established, so do not call this a completely uncontaminated benchmark.
Provider calls were present without a test choice; no consent certification is
inferred and the owner's deferred consent boundary remains unchanged.

The trace's render-blocking estimate is FCP1094ms/LCP0ms; image-delivery suggests
19.8KB but LCP0ms. FontDisplay flags block on the two icon fonts, but simply
swapping icon fonts could display wrong glyphs; verify actual controls before
changing them. No zero-estimate recommendation is represented as a proven LCP
fix. A structured source check finds2329 distinct regular-statue paths with zero
exact duplicate path strings, so simple path deduplication has no demonstrated
saving. No SVG/font/CSS/application bytes were changed by this review.
