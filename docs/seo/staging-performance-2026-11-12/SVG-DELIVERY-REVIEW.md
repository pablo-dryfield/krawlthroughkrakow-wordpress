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
