# Original AI Typography And Layout

Measured from artboard 2 of the unchanged `source/Full Statue Final.ai`, SHA-256 `cccfe297b02511e2493748d3f5a792ca410b5eb709c6cc5cbf398c0920721e99`. Coordinates below use the original 1600x750 artboard, origin at top left. They describe the source, not a requirement to preserve obsolete event copy.

## Typeface: Confirmed

- The XMP metadata and embedded font identify **FONTSPRING DEMO - Salvatore Black**, PostScript `FONTSPRINGDEMO-SalvatoreBlackRegular`; the PDF descriptor declares weight **800**, normal stretch, upright, cap height 700/1000 and x-height 498/1000. "Regular" is the face-style name, not a light visual weight.
- This is also the outlined headline typeface, not merely a guess from the live text. Five sampled outlined letters match the embedded font's original control points after scale/translation: regular P, seasonal P, ADAM's A, KRAWL's R, and the spanning headline's T. Largest measured control-point difference: **0.00224 artboard units**.
- Most poster lettering is already vector outlines. Only `200 PLN`, `6PM`, `STARTING AT`, and `SZPITALNA 1` remain live PDF text. No headline typography is a raster image. The flag's stylized 2024 is vector artwork too, not a live year label.
- The embedded font is an incomplete CFF subset with 17 entries including `.notdef` and space, not a usable full webfont. No Salvatore font was found in Windows fonts or the local homepage font assets. Available homepage families include Montserrat variable 100-900, Oswald variable 400-700, and Passion One. Montserrat 900 is a fallback, not an exact match.
- Do not derive/deploy a webfont from the embedded DEMO subset. Fontspring states demo fonts are for mock-ups and require the appropriate license for final work. Obtain the licensed Salvatore Black webfont for exact live HTML typography. [Fontspring demo terms](https://www.fontspring.com/demo-fonts), [official Salvatore family](https://www.wtypefoundry.com/typefaces/salvatore).

## Original Measurements

Outline sizes are recovered from flat-cap geometry and the confirmed font's 700-unit cap height. Ink bounds include overshoots; they are not CSS line boxes. All source lettering is uppercase, heavy, upright, and compact, with normal glyph kerning rather than expanded tracking.

| Text | Nominal Font Size | Ink Left / Top | Ink Width / Height | Color |
| --- | ---: | --- | --- | --- |
| Shared top headline | 30.793 | 439.684 / 35.118 | 760.847 / 22.791 | `#f9f9f9` |
| Regular brand line | 19.286 | 59.326 / 106.115 | 289.009 / 14.234 | `#f9f9f9` |
| Regular PUB | 135.873 | 59.326 / 130.528 | 289.009 / 97.693 | `#d93574` |
| Regular KRAWL | 72.649 | 59.689 / 235.943 | 288.646 / 50.855 | `#ffffff` |
| EVERY / NIGHT | 51.421 / 54.771 | 109.612 / 322.063 and 367.997 | each about 182.437 wide | `#f9f9f9` |
| 9 PM | 74.051 | 109.378 / 420.561 | 182.904 / 54.650 | `#d93574` |
| ADAM / STATUE | 54.840 / 44.237 | 109.612 / 487.719 and 537.791 | about 180-182 wide | `#f9f9f9` |
| Seasonal NYE | 106.857 | 853.611 / 86.990 | 228.042 / 74.800 | `#000000` |
| Seasonal brand line | 15.187 | 854.073 / 171.753 | 227.583 / 11.208 | `#f9f9f9` |
| Seasonal PUB | 106.994 | 854.073 / 190.976 | 227.583 / 76.930 | `#000000` |
| Seasonal KRAWL | 57.209 | 854.359 / 273.987 | 227.297 / 40.046 | `#ffffff` |
| Seasonal benefits | 25.614 | centered around x967.7; y467.9-703.1 | maximum about 220 wide | `#f9f9f9` |

Live historical price/time use 51.5694 nominal units. Location uses 27.4953. These figures identify hierarchy only: **retain current event dates/times and the requested no-price policy; do not restore 200 PLN, 6PM, Szpitalna 1, or 2024 from this historical source.**

## Composition And Color

- The exact split is x799.681: almost two equal 800-unit panels, with no gutter. Overall source aspect ratio is 32:15. Left background is `#000000`; right background is **`#d93574`**, also the regular PUB/time accent. Current `#ff008c` and `#f3418c` are different colors.
- Both panels use the same radial fan construction. Main rays are `#f7f7f0` at **0.149994 opacity**, with one alternate ray `#eaead0` at **0.100006**. Their convergence is near each panel's bottom center, not the statue's head.
- **The original & best** ends at x794.704; **Pubcrawl in Krakow** starts at x804.277. They share a baseline, leaving about 5 units on each side of the split. The complete caption is a single visual line across both backgrounds, not two separately centered captions. Its overall optical center is x820.108, slightly right of the artboard center.
- The regular brand/PUB/KRAWL lines have deliberately equal ink widths, about289 units, centered at x203.83 (25.49% of the regular half). The schedule is narrower, about182 units, centered almost identically. Regular KRAWL's font size is **0.53468 times PUB**, not the same font size.
- Seasonal NYE/brand/PUB/KRAWL are all approximately228 units wide, centered at x967.8 (21.01% into the seasonal half). Seasonal benefits share that axis. The original regular artwork begins near y137 and seasonal near y133; both end at y750.
- The small gaps are intentional: regular brand-to-PUB ink gap10.179, PUB-to-KRAWL7.722; seasonal NYE-to-brand9.963, brand-to-PUB8.015, PUB-to-KRAWL6.081. The larger regular KRAWL-to-EVERY gap is35.265.

## Applying The New Copy

The source main title is **PUB / KRAWL**, with KRAKOW already present in the brand and spanning caption. The new visible **KRAKOW / PUB / CRAWL** title is therefore an intentional adaptation, not a literal replica. Preserve the source's equal-ink-width principle instead of copying its old line sizes onto different words. Measured Salvatore outline widths suggest KRAKOW around **0.425 times PUB** and CRAWL around **0.528 times PUB** for equal-width lines; Montserrat needs its own measured ratios. The extra KRAKOW row adds height, so reserve space for it rather than squeezing the schedule or overlapping the statue. Keep the heading actual HTML text and the shared caption selectable; use the licensed face through a scoped hero-font token when supplied. Stack the shared caption coherently on mobile while keeping both parts on one desktop baseline.

## Reproduce

Run `python tools/seasonal-hero-ai-typography.py`. It reads the preserved AI without modifying it or any application asset and writes `ai-typography-measurements.json`, including all line boxes, original drawing indices, font metadata, live text spans, palette, local font-family inventory, and control-point matching evidence. Dependencies: PyMuPDF, pypdf, fontTools, NumPy, and Brotli for WOFF2 inspection. Full-artboard renders remain under `staging/tmp-screenshots/ai-statue-source/`.
