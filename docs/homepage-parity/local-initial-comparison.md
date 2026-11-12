# Homepage Parity Comparison: local-initial

Reference: https://krawlthroughkrakow.com/
Candidate: http://127.0.0.1:5184/

Geometry tolerance: 1px. Pixel threshold: 0.50% changed pixels.
Only third-party iframe rectangles and the Iubenda floating consent control are masked in pixels. Their document boxes still participate in geometry checks. No page content, navigation, text, photos, animation slides or section spacing is masked.

## Summary

```json
{
  "viewports": 4,
  "contentDifferences": 78,
  "geometryDifferences": 1124,
  "typographyDifferences": 0,
  "screenshotComparisons": 30,
  "screenshotsWithinTolerance": 9,
  "errors": 0
}
```

## Screenshot Differences

| Image | Changed pixels | Ratio | Dimensions |
| --- | ---: | ---: | --- |
| viewport-1920 | 684991 | 33.057% | 1920x1080 / 1920x1080 |
| section-1920-00 | 1153 | 0.052% | 1920x1145 / 1920x1145 |
| section-1920-01 | 3967 | 0.133% | 1920x1554 / 1920x1554 |
| section-1920-02 | 4518 | 0.504% | 1920x467 / 1920x467 |
| section-1920-03 | 44984 | 0.846% | 1920x2769 / 1920x2770 |
| section-1920-04 | 5641 | 1.588% | 1920x185 / 1920x184 |
| section-1920-05 | 189725 | 8.417% | 1920x1173 / 1920x1174 |
| section-1920-06 | 54091 | 3.985% | 1920x707 / 1920x706 |
| section-1920-07 | 1282 | 0.431% | 1920x155 / 1920x155 |
| section-1920-08 | 43912 | 2.763% | 1920x943 / 1920x1000 |
| section-1920-09 | 0 | 0.000% | 1920x233 / 1920x232 |
| section-1920-10 | 860 | 0.098% | 1920x619 / 1920x619 |
| section-1920-11 | 6414 | 0.512% | 1920x653 / 1920x653 |
| section-1920-12 | 1363 | 0.210% | 1920x338 / 1920x338 |
| viewport-1440 | 442735 | 34.200% | 1440x900 / 1440x900 |
| viewport-768 | 210472 | 26.812% | 768x1024 / 768x1024 |
| viewport-390 | 86600 | 26.425% | 390x844 / 390x844 |
| section-390-00 | 7692 | 8.465% | 390x233 / 390x233 |
| section-390-01 | 20079 | 2.250% | 390x2292 / 390x2292 |
| section-390-02 | 6641 | 3.710% | 390x459 / 390x459 |
| section-390-03 | 19644 | 1.323% | 390x3806 / 390x3806 |
| section-390-04 | 666 | 0.867% | 390x197 / 390x197 |
| section-390-05 | 0 | 0.000% | 390x2031 / 390x2031 |
| section-390-06 | 1006 | 0.202% | 390x1276 / 390x1277 |
| section-390-07 | 1065 | 3.175% | 390x86 / 390x85 |
| section-390-08 | 16362 | 2.633% | 390x1717 / 390x1717 |
| section-390-09 | 9448 | 8.022% | 390x302 / 390x302 |
| section-390-10 | 1152 | 0.483% | 390x995 / 390x996 |
| section-390-11 | 23222 | 7.876% | 390x756 / 390x755 |
| section-390-12 | 2808 | 2.022% | 390x356 / 390x356 |

## First Geometry Differences

```json
[
  {
    "width": 1920,
    "identity": "headers[0] main-header",
    "property": "y",
    "expected": 0,
    "actual": 27.203125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "headerLinks[0] A",
    "property": "y",
    "expected": 59.234375,
    "actual": 86.4375,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "headerLinks[1] A",
    "property": "y",
    "expected": 74,
    "actual": 101.203125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "headerLinks[2] A",
    "property": "y",
    "expected": 74,
    "actual": 101.203125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "headerLinks[3] A",
    "property": "y",
    "expected": 74,
    "actual": 101.203125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "headerLinks[4] A",
    "property": "y",
    "expected": 74,
    "actual": 101.203125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "headerLinks[5] A",
    "property": "y",
    "expected": 74,
    "actual": 101.203125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "headerLinks[6] A",
    "property": "y",
    "expected": 74,
    "actual": 101.203125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "headerLinks[7] A",
    "property": "y",
    "expected": 74,
    "actual": 101.203125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "headerLinks[8] A",
    "property": "y",
    "expected": 74,
    "actual": 101.203125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "headerLinks[9] A",
    "property": "y",
    "expected": 33,
    "actual": 60.203125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "headerImages[0] logo",
    "property": "y",
    "expected": 38.5,
    "actual": 65.703125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[0] et_pb_module_heading",
    "property": "y",
    "expected": 1356.5,
    "actual": 1383.703125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[1] H2",
    "property": "y",
    "expected": 1401.5,
    "actual": 1428.703125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[2] et_pb_module_header",
    "property": "y",
    "expected": 1716.671875,
    "actual": 1743.875,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[3] et_pb_module_header",
    "property": "y",
    "expected": 1785.671875,
    "actual": 1812.875,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[4] P",
    "property": "y",
    "expected": 1811.671875,
    "actual": 1838.875,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[5] et_pb_module_header",
    "property": "y",
    "expected": 1889.90625,
    "actual": 1917.109375,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[6] P",
    "property": "y",
    "expected": 1915.90625,
    "actual": 1943.109375,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[7] et_pb_module_header",
    "property": "y",
    "expected": 1976.140625,
    "actual": 2003.34375,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[8] P",
    "property": "y",
    "expected": 2002.140625,
    "actual": 2029.34375,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[9] et_pb_module_header",
    "property": "y",
    "expected": 2062.375,
    "actual": 2089.578125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[10] P",
    "property": "y",
    "expected": 2088.375,
    "actual": 2115.578125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[11] et_pb_module_header",
    "property": "y",
    "expected": 2148.609375,
    "actual": 2175.8125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[12] P",
    "property": "y",
    "expected": 2174.609375,
    "actual": 2201.8125,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[13] et_pb_module_header",
    "property": "y",
    "expected": 2139.546875,
    "actual": 2166.75,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[14] et_pb_module_header",
    "property": "y",
    "expected": 2296.78125,
    "actual": 2323.984375,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[15] P",
    "property": "y",
    "expected": 2249.78125,
    "actual": 2276.984375,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[16] H1",
    "property": "y",
    "expected": 2369.78125,
    "actual": 2396.984375,
    "delta": 27.203125
  },
  {
    "width": 1920,
    "identity": "textSamples[17] H2",
    "property": "y",
    "expected": 2404.78125,
    "actual": 2431.984375,
    "delta": 27.203125
  }
]
```

All content, typography, geometry and pixel details are in the matching comparison JSON. Differences are reported, not automatically corrected.