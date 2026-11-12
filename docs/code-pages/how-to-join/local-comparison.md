# Homepage Parity Comparison: local

Reference: https://krawlthroughkrakow.com/about-us/how-to-join/
Candidate: http://127.0.0.1:5185/

Geometry tolerance: 1px. Pixel threshold: 0.50% changed pixels.
Only third-party iframe rectangles and the Iubenda floating consent control are masked in pixels. Their document boxes still participate in geometry checks. No page content, navigation, text, photos, animation slides or section spacing is masked.

## Summary

```json
{
  "viewports": 4,
  "contentDifferences": 0,
  "geometryDifferences": 80,
  "typographyDifferences": 0,
  "screenshotComparisons": 24,
  "screenshotsWithinTolerance": 20,
  "errors": 1
}
```

## Screenshot Differences

| Image | Changed pixels | Ratio | Dimensions |
| --- | ---: | ---: | --- |
| viewport-1920 | 120 | 0.006% | 1920x1080 / 1920x1080 |
| tile-1920-00 | 120 | 0.006% | 1920x1080 / 1920x1080 |
| tile-1920-01 | 0 | 0.000% | 1920x1080 / 1920x1080 |
| tile-1920-02 | 0 | 0.000% | 1920x1080 / 1920x1080 |
| tile-1920-03 | 13 | 0.001% | 1920x1080 / 1920x1080 |
| viewport-1440 | 1043221 | 80.495% | 1440x900 / 1440x900 |
| tile-1440-00 | 0 | 0.000% | 1440x900 / 1440x900 |
| tile-1440-01 | 0 | 0.000% | 1440x900 / 1440x900 |
| tile-1440-02 | 0 | 0.000% | 1440x900 / 1440x900 |
| tile-1440-03 | 0 | 0.000% | 1440x900 / 1440x900 |
| tile-1440-04 | 0 | 0.000% | 1440x900 / 1440x900 |
| viewport-768 | 680113 | 86.481% | 768x1024 / 768x1024 |
| tile-768-00 | 0 | 0.000% | 768x1024 / 768x1024 |
| tile-768-01 | 0 | 0.000% | 768x1024 / 768x1024 |
| tile-768-02 | 0 | 0.000% | 768x1024 / 768x1024 |
| tile-768-03 | 0 | 0.000% | 768x1024 / 768x1024 |
| tile-768-04 | 0 | 0.000% | 768x1024 / 768x1024 |
| viewport-390 | 120 | 0.037% | 390x844 / 390x844 |
| tile-390-00 | 120 | 0.037% | 390x844 / 390x844 |
| tile-390-01 | 74 | 0.031% | 390x844 / 390x844 |
| tile-390-02 | 0 | 0.000% | 390x844 / 390x844 |
| tile-390-03 | 0 | 0.000% | 390x844 / 390x844 |
| tile-390-04 | 1289 | 1.007% | 390x844 / 390x844 |
| tile-390-05 | 1697 | 0.690% | 390x844 / 390x844 |

## First Geometry Differences

```json
[
  {
    "width": 1440,
    "identity": "headers[0] main-header",
    "property": "height",
    "expected": 140,
    "actual": 187,
    "delta": 47
  },
  {
    "width": 1440,
    "identity": "headerLinks[0] A",
    "property": "y",
    "expected": 59.234375,
    "actual": 82.734375,
    "delta": 23.5
  },
  {
    "width": 1440,
    "identity": "headerLinks[0] A",
    "property": "width",
    "expected": 80.515625,
    "actual": 107.546875,
    "delta": 27.03125
  },
  {
    "width": 1440,
    "identity": "headerLinks[1] A",
    "property": "x",
    "expected": 84.671875,
    "actual": 110,
    "delta": 25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[1] A",
    "property": "y",
    "expected": 74,
    "actual": 33,
    "delta": -41
  },
  {
    "width": 1440,
    "identity": "headerLinks[2] A",
    "property": "x",
    "expected": 226.046875,
    "actual": 251.375,
    "delta": 25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[2] A",
    "property": "y",
    "expected": 74,
    "actual": 33,
    "delta": -41
  },
  {
    "width": 1440,
    "identity": "headerLinks[3] A",
    "property": "x",
    "expected": 358.25,
    "actual": 383.578125,
    "delta": 25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[3] A",
    "property": "y",
    "expected": 74,
    "actual": 33,
    "delta": -41
  },
  {
    "width": 1440,
    "identity": "headerLinks[4] A",
    "property": "x",
    "expected": 559.546875,
    "actual": 584.875,
    "delta": 25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[4] A",
    "property": "y",
    "expected": 74,
    "actual": 33,
    "delta": -41
  },
  {
    "width": 1440,
    "identity": "headerLinks[5] A",
    "property": "x",
    "expected": 718.984375,
    "actual": 744.3125,
    "delta": 25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[5] A",
    "property": "y",
    "expected": 74,
    "actual": 33,
    "delta": -41
  },
  {
    "width": 1440,
    "identity": "headerLinks[6] A",
    "property": "x",
    "expected": 838.375,
    "actual": 863.703125,
    "delta": 25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[6] A",
    "property": "y",
    "expected": 74,
    "actual": 33,
    "delta": -41
  },
  {
    "width": 1440,
    "identity": "headerLinks[7] A",
    "property": "x",
    "expected": 933.625,
    "actual": 958.953125,
    "delta": 25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[7] A",
    "property": "y",
    "expected": 74,
    "actual": 33,
    "delta": -41
  },
  {
    "width": 1440,
    "identity": "headerLinks[8] A",
    "property": "x",
    "expected": 1069.546875,
    "actual": 1094.875,
    "delta": 25.328125
  },
  {
    "width": 1440,
    "identity": "headerLinks[8] A",
    "property": "y",
    "expected": 74,
    "actual": 33,
    "delta": -41
  },
  {
    "width": 1440,
    "identity": "headerLinks[9] A",
    "property": "x",
    "expected": 1230.8125,
    "actual": 110,
    "delta": -1120.8125
  },
  {
    "width": 1440,
    "identity": "headerLinks[9] A",
    "property": "y",
    "expected": 33,
    "actual": 80,
    "delta": 47
  },
  {
    "width": 1440,
    "identity": "headerImages[0] logo",
    "property": "y",
    "expected": 38.5,
    "actual": 51.421875,
    "delta": 12.921875
  },
  {
    "width": 1440,
    "identity": "headerImages[0] logo",
    "property": "width",
    "expected": 80.515625,
    "actual": 107.546875,
    "delta": 27.03125
  },
  {
    "width": 1440,
    "identity": "headerImages[0] logo",
    "property": "height",
    "expected": 63,
    "actual": 84.140625,
    "delta": 21.140625
  },
  {
    "width": 1440,
    "identity": "textSamples[0] H1",
    "property": "y",
    "expected": 240,
    "actual": 287,
    "delta": 47
  },
  {
    "width": 1440,
    "identity": "textSamples[1] P",
    "property": "y",
    "expected": 312.671875,
    "actual": 359.671875,
    "delta": 47
  },
  {
    "width": 1440,
    "identity": "textSamples[2] P",
    "property": "y",
    "expected": 382.078125,
    "actual": 429.078125,
    "delta": 47
  },
  {
    "width": 1440,
    "identity": "textSamples[3] et_pb_module_header",
    "property": "y",
    "expected": 620.078125,
    "actual": 667.078125,
    "delta": 47
  },
  {
    "width": 1440,
    "identity": "textSamples[4] P",
    "property": "y",
    "expected": 651.078125,
    "actual": 698.078125,
    "delta": 47
  },
  {
    "width": 1440,
    "identity": "textSamples[5] et_pb_module_header",
    "property": "y",
    "expected": 620.078125,
    "actual": 667.078125,
    "delta": 47
  }
]
```

All content, typography, geometry and pixel details are in the matching comparison JSON. Differences are reported, not automatically corrected.