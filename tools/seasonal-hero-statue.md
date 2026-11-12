# Seasonal Hero Statue

`staging/wp-content/mu-plugins/ktk-homepage-assets/hero-statue.svg` is a true path-based illustration traced from KTK's existing transparent statue cutout. It contains no embedded PNG/JPG/WebP, external image, script, font or filter. The background is transparent; apply an offset pink/black CSS `drop-shadow()` to the `<img>` when composing the hero.

The illustration depicts Adam Mickiewicz and the upper pedestal. It is not the complete multi-figure monument used in the older flattened poster, nor an original editable vector recovered from that poster.

## Source and Build

- Source archive: `Backup/backup_2026-05-15-1131_krawlthroughkrakowcom_39d8d99900a4-uploads3.zip`
- Source entry: `uploads/2023/09/statue_new.png` (566 x 1247, transparent RGBA)
- Original public URL: `https://krawlthroughkrakow.com/wp-content/uploads/2023/09/statue_new.png`
- Required source SHA-256: `b1a9a15437557c35ca8ba329eb9893d06ce4df6b564139b9fd3234473f0a67d0`
- Build dependencies tested: Python 3.13, Pillow 12.3.0, VTracer 0.6.15, Node.js/npx and SVGO 4.1.0.

```powershell
python -m pip install Pillow==12.3.0 vtracer==0.6.15
python tools/seasonal-hero-statue.py
node tools/seasonal-hero-statue-review.mjs
```

The generator reads the archived cutout directly, validates its checksum, converts luminance to six neutral tones without dithering, traces contiguous regions using VTracer's spline mode, and optimizes the real path geometry with pinned SVGO. It checks the resulting viewBox, allowed element types, palette, lack of external resources and 100,000-byte budget. An unchanged extracted cutout can be supplied with `--source` instead of the archive.

The build invokes `npx --yes svgo@4.1.0`; npm access is needed on first use unless that package is already cached. This is build-time tooling only. The deployed browser receives just the SVG.

## Verified Output

- `viewBox="0 0 566 1247"`; preserve its approximately 0.454 aspect ratio.
- 86 paths, six fill colors, 91,022 bytes uncompressed.
- SHA-256: `2c1522739fdf32fbebdcdbaf92f60a3741ce009a18d23298e920917fc9825c37`
- Review image: `staging/tmp-screenshots/hero-statue-review.png`, rendered at 400 CSS pixels wide on black and pink backgrounds with example offset shadows.

Use an empty `alt` when the statue is decorative beside a meaningful HTML heading, or a concise monument description when it is informative. Keep all booking text and controls outside the SVG. This tooling does not deploy any page.
