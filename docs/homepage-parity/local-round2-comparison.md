# Homepage Parity Comparison: local-round2

Reference: https://krawlthroughkrakow.com/
Candidate: http://127.0.0.1:5184/

Geometry tolerance: 1px. Pixel threshold: 0.50% changed pixels.
Only third-party iframe rectangles and the Iubenda floating consent control are masked in pixels. Their document boxes still participate in geometry checks. No page content, navigation, text, photos, animation slides or section spacing is masked.

## Summary

```json
{
  "viewports": 4,
  "contentDifferences": 48,
  "geometryDifferences": 189,
  "typographyDifferences": 0,
  "screenshotComparisons": 30,
  "screenshotsWithinTolerance": 17,
  "errors": 0
}
```

## Screenshot Differences

| Image | Changed pixels | Ratio | Dimensions |
| --- | ---: | ---: | --- |
| viewport-1920 | 0 | 0.000% | 1920x1080 / 1920x1080 |
| section-1920-00 | 1153 | 0.052% | 1920x1145 / 1920x1145 |
| section-1920-01 | 592 | 0.020% | 1920x1554 / 1920x1554 |
| section-1920-02 | 3594 | 0.401% | 1920x467 / 1920x467 |
| section-1920-03 | 6305 | 0.119% | 1920x2769 / 1920x2769 |
| section-1920-04 | 0 | 0.000% | 1920x185 / 1920x185 |
| section-1920-05 | 178316 | 7.918% | 1920x1173 / 1920x1173 |
| section-1920-06 | 43343 | 3.193% | 1920x707 / 1920x707 |
| section-1920-07 | 717 | 0.241% | 1920x155 / 1920x155 |
| section-1920-08 | 37209 | 2.341% | 1920x943 / 1920x1000 |
| section-1920-09 | 9153 | 2.046% | 1920x233 / 1920x233 |
| section-1920-10 | 6294 | 0.714% | 1920x619 / 1920x619 |
| section-1920-11 | 10048 | 0.801% | 1920x653 / 1920x652 |
| section-1920-12 | 1474 | 0.227% | 1920x338 / 1920x338 |
| viewport-1440 | 0 | 0.000% | 1440x900 / 1440x900 |
| viewport-768 | 179 | 0.023% | 768x1024 / 768x1024 |
| viewport-390 | 193 | 0.059% | 390x844 / 390x844 |
| section-390-00 | 0 | 0.000% | 390x233 / 390x233 |
| section-390-01 | 11723 | 1.314% | 390x2292 / 390x2292 |
| section-390-02 | 6641 | 3.710% | 390x459 / 390x459 |
| section-390-03 | 6927 | 0.467% | 390x3806 / 390x3806 |
| section-390-04 | 189 | 0.246% | 390x197 / 390x197 |
| section-390-05 | 23786 | 3.003% | 390x2031 / 390x2031 |
| section-390-06 | 0 | 0.000% | 390x1276 / 390x1276 |
| section-390-07 | 34 | 0.101% | 390x86 / 390x86 |
| section-390-08 | 15709 | 2.528% | 390x1717 / 390x1717 |
| section-390-09 | 9448 | 8.022% | 390x302 / 390x302 |
| section-390-10 | 0 | 0.000% | 390x995 / 390x995 |
| section-390-11 | 12168 | 4.127% | 390x756 / 390x756 |
| section-390-12 | 2808 | 2.022% | 390x356 / 390x356 |

## First Geometry Differences

```json
[
  {
    "width": 1920,
    "identity": "textSamples[64] H1",
    "property": "y",
    "expected": 8687.890625,
    "actual": 8675.65625,
    "delta": -12.234375
  },
  {
    "width": 1920,
    "identity": "textSamples[64] H1",
    "property": "width",
    "expected": 197.34375,
    "actual": 1516,
    "delta": 1318.65625
  },
  {
    "width": 1920,
    "identity": "textSamples[65] P",
    "property": "y",
    "expected": 8766.125,
    "actual": 8823.890625,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[66] P",
    "property": "y",
    "expected": 8836.53125,
    "actual": 8894.296875,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[67] P",
    "property": "y",
    "expected": 8934.140625,
    "actual": 8991.90625,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[68] P",
    "property": "y",
    "expected": 8977.34375,
    "actual": 9035.109375,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[69] H1",
    "property": "y",
    "expected": 9288.03125,
    "actual": 9345.796875,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[70] H1",
    "property": "y",
    "expected": 9531.03125,
    "actual": 9588.796875,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[71] P",
    "property": "y",
    "expected": 9613.265625,
    "actual": 9671.03125,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[72] P",
    "property": "y",
    "expected": 9656.46875,
    "actual": 9714.234375,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[73] P",
    "property": "y",
    "expected": 9699.671875,
    "actual": 9757.4375,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[74] H1",
    "property": "y",
    "expected": 10191.234375,
    "actual": 10249,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[75] P",
    "property": "y",
    "expected": 10273.46875,
    "actual": 10331.234375,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[76] H1",
    "property": "y",
    "expected": 10886.03125,
    "actual": 10943.796875,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[77] et_pb_module_heading",
    "property": "y",
    "expected": 10816.03125,
    "actual": 10873.796875,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[78] P",
    "property": "y",
    "expected": 10852.03125,
    "actual": 10909.796875,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[79] P",
    "property": "y",
    "expected": 10884.03125,
    "actual": 10941.796875,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[80] P",
    "property": "y",
    "expected": 10841.03125,
    "actual": 10898.796875,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[81] P",
    "property": "y",
    "expected": 10868.234375,
    "actual": 10926,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[82] P",
    "property": "y",
    "expected": 10895.4375,
    "actual": 10953.203125,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[83] P",
    "property": "y",
    "expected": 10922.640625,
    "actual": 10980.40625,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "textSamples[84] P",
    "property": "y",
    "expected": 10949.84375,
    "actual": 11007.609375,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "images[17] wp-image-8704 entered lazyloaded",
    "property": "y",
    "expected": 10170.234375,
    "actual": 10228,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "footers[0] main-footer",
    "property": "y",
    "expected": 11066.84375,
    "actual": 11124.609375,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "sections[8] et_pb_section et_pb_section_8 et_section_regular",
    "property": "height",
    "expected": 941.96875,
    "actual": 999.734375,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "sections[9] et_pb_section et_pb_section_9 et_pb_with_background et_section_regular",
    "property": "y",
    "expected": 9228.03125,
    "actual": 9285.796875,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "sections[10] et_pb_section et_pb_section_10 et_section_regular section_has_divider et_pb_bottom_divider et_pb_top_divider",
    "property": "y",
    "expected": 9460.03125,
    "actual": 9517.796875,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "sections[11] et_pb_section et_pb_section_11 et_section_regular section_has_divider et_pb_bottom_divider et_pb_top_divider",
    "property": "y",
    "expected": 10078.234375,
    "actual": 10136,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "sections[12] et_pb_section et_pb_section_12 et_pb_with_background et_section_regular",
    "property": "y",
    "expected": 10729.234375,
    "actual": 10787,
    "delta": 57.765625
  },
  {
    "width": 1920,
    "identity": "section8.rows[2] et_pb_row et_pb_row_21",
    "property": "height",
    "expected": 88.46875,
    "actual": 146.234375,
    "delta": 57.765625
  }
]
```

All content, typography, geometry and pixel details are in the matching comparison JSON. Differences are reported, not automatically corrected.