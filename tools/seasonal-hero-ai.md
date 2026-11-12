# Original Illustrator Statue Assets

## Preserved Source

- User-supplied original: `C:\Users\pjcam\Downloads\Full Statue Final.ai`.
- Hash-verified, unchanged project copy: `docs/homepage-seasonal-hero/source/Full Statue Final.ai`.
- SHA-256: `cccfe297b02511e2493748d3f5a792ca410b5eb709c6cc5cbf398c0920721e99`.
- Size: 4,405,790 bytes. PDF-compatible Illustrator 28.1 document, two 1600x750 artboards.
- The source is outside the recursive deployable MU-plugin asset directory.

## Extraction

`seasonal-hero-ai-extract.py` reads artboard 2 and exports the original cubic curves and fill colors. It does not retrace, posterize, recolor, or reconstruct either statue body. The original Illustrator file remains unchanged.

| Asset | Original Objects | Source Drawing Indices | ViewBox | Optimized Size |
| --- | ---: | --- | --- | ---: |
| `hero-statue-regular.svg` | 2,380 | 184-2563 | `0 0 490 613` | 669,694 bytes |
| `hero-statue-seasonal.svg` | 845 plus glasses trace | 2564-3408 | `0 0 296 617` | 286,738 bytes |

Regular includes its two original offset silhouettes, with their original clipping and 60% opacity. Do not add a duplicate CSS shadow. Its source crop is `(301,137)-(791,750)`. Seasonal includes its original black silhouette; its source crop is `(1094,133)-(1390,750)`. Both retain the original artboard clipping at y=750.

The flag starts at drawing 3409, after the statue. Omitting the flag reveals the intact original hand and torso. No inpainting or invented stone detail is used. Halloween and NYE should use the same seasonal SVG; NYE adds a separate editable flag.

The aviator sunglasses are the only bitmap component in the original statue art: 293x172 PNG, PDF image xref 103 with alpha xref 120, positioned at `(1244.00696,147.29276)-(1278.71985,167.67029)`. That small component is converted to source-colored vector paths with VTracer. It is not claimed to be an original vector or a literal pixel-identical reproduction of its bitmap gradient.

Both deployed SVGs are validated to contain only SVG, groups, paths, descriptions, and necessary clipping definitions. They have no image element, embedded bitmap, external reference, script, or event handler.

## Reproduction And Review

Dependencies used: Python, PyMuPDF 1.28.2, Pillow 12.3.0, VTracer 0.6.15, NumPy 2.5.3, OpenCV headless 5.0.0.93, and SVGO 4.1.0 through `npx`.

```powershell
python tools/seasonal-hero-ai-extract.py
python tools/seasonal-hero-ai-review.py
```

All review files are written to `staging/tmp-screenshots/ai-statue-source/`, outside the deployable directory. The extraction manifest records hashes, object counts, and source crops. `regular-source-vs-vector.png` and `seasonal-source-vs-vector.png` compare original Illustrator crops with SVGs on dark and pink backgrounds.

At 2x original-coordinate rendering, the complete regular foreground including antialiased edges and transparent shadows has mean absolute RGB error 0.562 on a 0-255 scale; 99.782% of covered pixels differ by at most 3 levels in every channel. The full seasonal foreground error is 1.239, including the intentionally removed original flagpole. Visible seasonal foreground away from that pole has error 0.605 and 99.598% within 3 levels. These measurements include the traced glasses. They demonstrate close reproduction, not literal pixel identity. `pixel-comparison.json` retains all metrics and counts.

Approximate gzip sizes are 276,705 bytes regular and 118,385 bytes seasonal. Fidelity was favored over aggressive geometry simplification.

## Flag Placement

Coordinates relative to the seasonal SVG origin `(1094,133)`:

- Pole hand/base: approximately `(102,204)`, normalized `(0.3446,0.3306)`.
- Pole top: approximately `(345.5,-83)`, normalized `(1.1672,-0.1345)`.
- Original flag's upper-left attachment is near `(343.5,-80)`, left/lower attachment near `(249.5,34)`, outer right near `(494.5,99)`, and lower tip near `(399,202)`.
- These extend beyond the statue's viewBox; the composed hero scene must provide space and allow the flag to overflow its statue positioning wrapper.

The source flag's year is 2024. It must not be reused as current event copy; the hero's separate flag/year remains editable.

## Superseded Experiments

`seasonal-hero-statue.py` and `seasonal-hero-poster-statues.py` are earlier raster-source experiments. Neither generates these final original-AI assets. The older `hero-statue.svg` is not the chosen artwork and can remain unused for backward-safe deployment. No original or intermediate bitmap belongs in the deployable homepage asset directory.
