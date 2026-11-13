# Original Icon Font Delivery Review

Later homepage-only implementation and actual staging evidence are recorded in
[ICON-FONT-DELIVERY.md](ICON-FONT-DELIVERY.md). The read-only preparation below
describes the earlier checkpoint, not the current deployable asset inventory.

Read-only preparation13 November2026. No font, CSS, application file, server/cache
configuration, consent setting or production change in this investigation.

The fresh mobile trace documented in [SVG-DELIVERY-REVIEW.md](SVG-DELIVERY-REVIEW.md)
loads the original modules icon font:92084 encoded/body bytes, discovered3462ms,
complete8978ms. Original parity CSS declares `ETmodules`, weight400, normal,
font-displayblock, with WOFF then TTF fallbacks. It is distinct from the reviewed
Passion One embedded text-font resilience code. Do not remove that fallback or
blindly replace icon font-display with swap/optional, which could show bad glyphs.

An in-memory FontTools4.66.1 transcode of the original
`parity/e5109a227107-modules.woff`, with `recalcTimestamp=False`, produces29392
WOFF2 bytes, compared with92084 source bytes. The first exploratory transcode
left the default timestamp recalculation enabled and produced29404 bytes; it is
not the deterministic candidate. Neither output was written to disk or deployed.

Structured round-trip checks preserve all409 mapped characters,410 glyphs,
glyph order, horizontal metrics and every glyph's coordinates/contour endpoints/
flags. This is not a subset, an icon redesign or proof of matching all rendering
engines. Hints, names, other metrics and actual interactive glyph rendering still
need complete checks before a release. The original fonts/assets stay intact.

Candidate next batch: prefer a reproducibly generated WOFF2 face in an owned
override, keeping exact original display/metrics/weight/style and the original
WOFF/TTF fallbacks. Captured parity CSS remains byte-identical. Verify active font
selection and actual transfer, all menus/gallery/FAQ controls and social glyphs,
no-JS, source/geometry/pixel evidence, rebuild/negative contracts, required CI,
guarded staging release and cached device variants. Review the complete active
face before changing any CSS; do not assume every similarly named font is used.

The62692 source-byte difference is only an in-memory format comparison, not
whole-page savings, observed transfer reduction, LCP improvement or field CWV.
The regular statue remains the measured LCP resource. No duplicate SVG paths
were found, and the exact statue paths/artwork must remain unchanged.

Primary implementation references checked during preparation:
[FontTools TTFont](https://fonttools.readthedocs.io/en/latest/ttLib/ttFont.html),
[WOFF2 writer](https://fonttools.readthedocs.io/en/stable/ttLib/woff2.html),
[font-source descriptors](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40font-face/src)
and [font display](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40font-face/font-display).
Keep the installed converter/version and local round-trip evidence distinct from
documentation for newer releases; format support alone is not a pixel guarantee.
